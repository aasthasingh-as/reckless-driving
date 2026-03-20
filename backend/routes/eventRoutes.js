const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Trip = require('../models/Trip');
const auth = require('../middleware/auth');
const alertService = require('../services/notificationService');

// POST /api/events
router.post('/', auth, async (req, res) => {
  console.log('--- Events: POST / ---');
  try {
    const { tripId, eventType, magnitude, location, speed } = req.body;

    if (!tripId || !eventType) {
      return res.status(400).json({
        success: false,
        message: 'tripId and eventType are required',
      });
    }

    const trip = await Trip.findOne({
      _id: tripId,
      userId: req.user.userId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
      });
    }

    const newEvent = new Event({
      tripId,
      userId: req.user.userId,
      eventType,
      magnitude,
      location,
      speed,
    });

    const savedEvent = await newEvent.save();

    if (eventType.includes('Braking') || eventType.includes('Acceleration')) {
      if (magnitude && magnitude >= 6) {
        alertService
          .sendAlert(req.user.userId, 'Crash Detected', { location, speed })
          .catch(console.error);
      }
    }

    if (eventType.includes('Geofence')) {
      alertService
        .sendAlert(req.user.userId, 'High Risk Zone', { location, speed })
        .catch(console.error);
    }

    res.status(201).json({ success: true, event: savedEvent });
  } catch (error) {
    console.error('Error logging event:', error);
    res.status(500).json({ success: false, message: 'Error logging event' });
  }
});

// GET /api/events
router.get('/', auth, async (req, res) => {
  try {
    const events = await Event.find({
      userId: req.user.userId,
      eventType: { $ne: 'Safe Driving' },
    }).sort({ timestamp: -1 });

    res.json({ success: true, events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch events' });
  }
});

// Haversine helper for clustering
const haversineDistance = (coords1, coords2) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371e3;
  const dLat = toRad(coords2.latitude - coords1.latitude);
  const dLon = toRad(coords2.longitude - coords1.longitude);
  const lat1 = toRad(coords1.latitude);
  const lat2 = toRad(coords2.latitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// GET /api/events/hotspots
router.get('/hotspots', auth, async (req, res) => {
  try {
    const events = await Event.find({
      userId: req.user.userId,
      eventType: { $ne: 'Safe Driving' },
    }).lean();

    const hotspots = [];
    const processed = new Set();
    const len = events.length;

    for (let i = 0; i < len; i++) {
      if (processed.has(i)) continue;
      if (!events[i].location || !events[i].location.latitude) continue;

      let clusterCount = 1;
      let sumLat = events[i].location.latitude;
      let sumLon = events[i].location.longitude;

      const typeFreq = { [events[i].eventType]: 1 };

      processed.add(i);

      for (let j = i + 1; j < len; j++) {
        if (processed.has(j)) continue;
        if (!events[j].location || !events[j].location.latitude) continue;

        const dist = haversineDistance(events[i].location, events[j].location);
        if (dist < 300) {
          clusterCount++;
          sumLat += events[j].location.latitude;
          sumLon += events[j].location.longitude;
          typeFreq[events[j].eventType] = (typeFreq[events[j].eventType] || 0) + 1;
          processed.add(j);
        }
      }

      if (clusterCount >= 3) {
        const dominantEventType = Object.keys(typeFreq).reduce((a, b) =>
          typeFreq[a] > typeFreq[b] ? a : b
        );

        const severityScore = clusterCount > 5 ? 'Critical Risk' : 'High Risk';

        hotspots.push({
          centerLatitude: sumLat / clusterCount,
          centerLongitude: sumLon / clusterCount,
          eventCount: clusterCount,
          dominantEventType,
          severityScore,
          radius: 300 + clusterCount * 15,
        });
      }
    }

    res.json({ success: true, hotspots });
  } catch (error) {
    console.error('Error computing hotspots:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compute hotspots',
    });
  }
});

module.exports = router;
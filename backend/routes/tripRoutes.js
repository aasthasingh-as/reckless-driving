const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const Event = require('../models/Event');
const auth = require('../middleware/auth');

// POST /api/trips/start
router.post('/start', auth, async (req, res) => {
  try {
    const newTrip = new Trip({
      userId: req.user.userId,
    });

    console.log(`--- Trip Start: User ${req.user.userId} ---`);
    const savedTrip = await newTrip.save();
    console.log(`Trip created: ${savedTrip._id}`);
    res.status(201).json({ success: true, trip: savedTrip });
  } catch (error) {
    console.error('Error starting trip:', error);
    res.status(500).json({ success: false, message: 'Failed to start trip' });
  }
});

// POST /api/trips/end/:tripId
router.post('/end/:tripId', auth, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { topSpeed, finalSafetyScore } = req.body;

    const trip = await Trip.findOne({
      _id: tripId,
      userId: req.user.userId,
    });

    console.log(`--- Trip End: User ${req.user.userId}, Trip ${tripId} ---`);

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    trip.endTime = new Date();
    if (topSpeed !== undefined) trip.topSpeed = topSpeed;
    if (finalSafetyScore !== undefined) trip.finalSafetyScore = finalSafetyScore;

    const updatedTrip = await trip.save();
    res.json({ success: true, trip: updatedTrip });
  } catch (error) {
    console.error('Error ending trip:', error);
    res.status(500).json({ success: false, message: 'Failed to end trip' });
  }
});

// GET /api/trips
router.get('/', auth, async (req, res) => {
  try {
    console.log(`--- Fetching Trips: User ${req.user.userId} ---`);
    const tripsDocs = await Trip.find({ userId: req.user.userId })
      .sort({ startTime: -1 })
      .lean();
    console.log(`Found ${tripsDocs.length} trips`);

    const trips = await Promise.all(
      tripsDocs.map(async (trip) => {
        const count = await Event.countDocuments({
          tripId: trip._id,
          eventType: { $ne: 'Safe Driving' },
        });
        return { ...trip, eventCount: count };
      })
    );

    res.json({ success: true, trips });
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trips' });
  }
});

// GET /api/trips/:tripId/events
router.get('/:tripId/events', auth, async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findOne({
      _id: tripId,
      userId: req.user.userId,
    });

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const events = await Event.find({ tripId }).sort({ timestamp: 1 });
    res.json({ success: true, events });
  } catch (error) {
    console.error('Error fetching events for trip:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch events' });
  }
});

module.exports = router;
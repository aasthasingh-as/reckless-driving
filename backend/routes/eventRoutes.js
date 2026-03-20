const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Trip = require('../models/Trip');

// POST /api/events
router.post('/', async (req, res) => {
  try {
    const { tripId, eventType, magnitude, location, speed } = req.body;

    if (!tripId || !eventType) {
      return res.status(400).json({ success: false, message: 'tripId and eventType are required' });
    }

    // Optional validation to ensure trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const newEvent = new Event({
      tripId,
      eventType,
      magnitude,
      location,
      speed
    });

    const savedEvent = await newEvent.save();
    res.status(201).json({ success: true, event: savedEvent });
  } catch (error) {
    console.error('Error logging event:', error);
    res.status(500).json({ success: false, message: 'Failed to log event' });
  }
});

module.exports = router;

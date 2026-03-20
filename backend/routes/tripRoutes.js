const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const Event = require('../models/Event');

// POST /api/trips/start
router.post('/start', async (req, res) => {
  try {
    const newTrip = new Trip();
    const savedTrip = await newTrip.save();
    res.status(201).json({ success: true, trip: savedTrip });
  } catch (error) {
    console.error('Error starting trip:', error);
    res.status(500).json({ success: false, message: 'Failed to start trip' });
  }
});

// POST /api/trips/end/:tripId
router.post('/end/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;
    const { topSpeed, finalSafetyScore } = req.body;

    const trip = await Trip.findById(tripId);
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
router.get('/', async (req, res) => {
  try {
    const trips = await Trip.find().sort({ startTime: -1 });
    res.json({ success: true, trips });
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trips' });
  }
});

// GET /api/trips/:tripId/events
router.get('/:tripId/events', async (req, res) => {
  try {
    const { tripId } = req.params;
    const events = await Event.find({ tripId }).sort({ timestamp: 1 });
    res.json({ success: true, events });
  } catch (error) {
    console.error('Error fetching events for trip:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch events' });
  }
});

module.exports = router;

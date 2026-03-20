const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const alertService = require('../services/notificationService');
const Event = require('../models/Event');
const Trip = require('../models/Trip');

// POST /api/alerts/sos
router.post('/sos', auth, async (req, res) => {
  try {
    const { location, speed, tripId } = req.body;

    await alertService.sendAlert(req.user.userId, 'Manual SOS', { location, speed });

    let validTripId = null;

    if (tripId) {
      const trip = await Trip.findOne({ _id: tripId, userId: req.user.userId });
      if (trip) validTripId = trip._id;
    }

    if (validTripId) {
      const newEvent = new Event({
        tripId: validTripId,
        userId: req.user.userId,
        eventType: 'Manual SOS',
        location: location || { latitude: 0, longitude: 0 },
        speed: speed || 0,
      });
      await newEvent.save();
    }

    res.json({ success: true, message: 'SOS Dispatched Successfully' });
  } catch (error) {
    console.error('Error broadcasting SOS:', error);
    res.status(500).json({ success: false, message: 'Failed to deploy SOS' });
  }
});

module.exports = router;
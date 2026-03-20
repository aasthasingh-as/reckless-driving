const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  eventType: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  magnitude: { type: Number },
  speed: { type: Number },
  location: {
    latitude: { type: Number },
    longitude: { type: Number }
  }
});

module.exports = mongoose.model('Event', EventSchema);

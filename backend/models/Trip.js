const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  topSpeed: { type: Number, default: 0 },
  finalSafetyScore: { type: Number, default: 100 }
});

module.exports = mongoose.model('Trip', TripSchema);
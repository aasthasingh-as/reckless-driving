const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  triggerType: { type: String, required: true },
  dispatchedTo: [{
    name: String,
    phone: String,
    status: { type: String, default: 'Sent' }
  }],
  payload: {
    location: {
      latitude: Number,
      longitude: Number
    },
    speed: Number
  },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Alert', AlertSchema);

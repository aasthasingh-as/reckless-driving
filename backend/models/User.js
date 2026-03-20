const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  familyContact: { type: String, default: '' },
  emergencyContacts: [{
    name: String,
    phone: String,
    notifyOnCrash: { type: Boolean, default: true },
    notifyOnLowScore: { type: Boolean, default: false },
    notifyOnRiskZone: { type: Boolean, default: false }
  }],
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', UserSchema);
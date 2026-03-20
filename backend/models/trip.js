const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
  {
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    topSpeed: {
      type: Number,
      default: 0,
    },
    finalSafetyScore: {
      type: Number,
      default: 100,
    },
    totalEvents: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["ongoing", "completed"],
      default: "ongoing",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Trip", tripSchema);
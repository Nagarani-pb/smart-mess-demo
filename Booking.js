const mongoose = require('mongoose');

// A booking represents a student's intent to consume a specific meal
// (demand signal). Attendance status will be stored here as well to
// support no-show tracking and waste analytics.

const bookingSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    meal: { type: mongoose.Schema.Types.ObjectId, ref: 'Meal', required: true },
    selectedDishName: { type: String }, // optional if multiple dishes
    status: {
      type: String,
      enum: ['booked', 'cancelled', 'attended', 'no-show'],
      default: 'booked'
    },
    bookedAt: { type: Date, default: Date.now },
    cancelledAt: { type: Date },
    attendedAt: { type: Date },
    noShowReason: { type: String }
  },
  { timestamps: true }
);

bookingSchema.index({ student: 1, meal: 1 }, { unique: true });

module.exports = mongoose.model('Booking', bookingSchema);


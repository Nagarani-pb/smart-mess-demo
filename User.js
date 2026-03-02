const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    studentId: { type: String }, // for students
    cardId: { type: String, required: true, unique: true }, // barcode content
    role: {
      type: String,
      enum: ['student', 'admin'],
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);


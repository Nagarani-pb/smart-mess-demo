const mongoose = require('mongoose');

// Each meal represents breakfast / lunch / dinner for a specific date
// and contains both menu dishes and ingredient planning information.

const ingredientPlanSchema = new mongoose.Schema(
  {
    ingredientName: { type: String, required: true },
    unit: { type: String, default: 'kg' },
    quantityPerServing: { type: Number, required: true } // e.g. 0.15 kg rice per student
  },
  { _id: false }
);

const dishSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    isVegetarian: { type: Boolean, default: false }
  },
  { _id: false }
);

const mealSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    mealType: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner'],
      required: true
    },
    dishes: [dishSchema],
    ingredientPlan: [ingredientPlanSchema]
  },
  { timestamps: true }
);

mealSchema.index({ date: 1, mealType: 1 }, { unique: true });

module.exports = mongoose.model('Meal', mealSchema);


const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
  courtFee: { type: Number, required: true },
  shuttlesUsed: { type: Number, required: true },
  totalShuttleCost: { type: Number, required: true },
  totalCost: { type: Number, required: true },
  costPerPerson: { type: Number, required: true },
});

module.exports = mongoose.model('Match', matchSchema);

const mongoose = require('mongoose');

const shuttleBatchSchema = new mongoose.Schema({
  importDate: { type: Date, default: Date.now },
  totalTubes: { type: Number, required: true },
  pricePerTube: { type: Number, required: true },
  totalShuttles: { type: Number, required: true }, // totalTubes * 12
  remainingShuttles: { type: Number, required: true }, // initially totalShuttles
});

module.exports = mongoose.model('ShuttleBatch', shuttleBatchSchema);

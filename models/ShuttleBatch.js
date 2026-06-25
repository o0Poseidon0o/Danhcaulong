const mongoose = require('mongoose');

const shuttleBatchSchema = new mongoose.Schema({
  importDate: { type: Date, default: Date.now },
  brand: { type: String, default: 'Chưa rõ' },
  totalTubes: { type: Number, required: true },
  pricePerTube: { type: Number, required: true },
  shuttlesPerTube: { type: Number, default: 12 },
  totalShuttles: { type: Number, required: true }, // totalTubes * shuttlesPerTube
  remainingShuttles: { type: Number, required: true }, // initially totalShuttles
});

module.exports = mongoose.model('ShuttleBatch', shuttleBatchSchema);

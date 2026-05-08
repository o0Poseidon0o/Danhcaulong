const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  balance: { type: Number, default: 0 },
});

module.exports = mongoose.model('Member', memberSchema);

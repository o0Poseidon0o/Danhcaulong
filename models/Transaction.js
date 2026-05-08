const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  type: { type: String, enum: ['DEPOSIT', 'MATCH_FEE'], required: true },
  amount: { type: Number, required: true }, // positive for deposit, negative for match fee
  description: { type: String },
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' } // Optional, if related to a match
});

module.exports = mongoose.model('Transaction', transactionSchema);

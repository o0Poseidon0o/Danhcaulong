require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const Member = require('./models/Member');
const ShuttleBatch = require('./models/ShuttleBatch');
const Match = require('./models/Match');
const Transaction = require('./models/Transaction');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Kết nối MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- API ROUTES ---

// 1. Members API
app.get('/api/members', async (req, res) => {
  try {
    const members = await Member.find().sort({ name: 1 });
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/members', async (req, res) => {
  try {
    const member = new Member({ name: req.body.name, balance: 0 });
    await member.save();
    res.status(201).json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Nạp tiền vào quỹ
app.post('/api/members/:id/deposit', async (req, res) => {
  try {
    const { amount } = req.body;
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    member.balance += amount;
    await member.save();

    const tx = new Transaction({
      member: member._id,
      type: 'DEPOSIT',
      amount: amount,
      description: `Nạp quỹ: +${amount.toLocaleString('vi-VN')}đ`
    });
    await tx.save();

    res.json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Shuttlecock Inventory API
app.get('/api/inventory', async (req, res) => {
  try {
    const batches = await ShuttleBatch.find({ remainingShuttles: { $gt: 0 } }).sort({ importDate: 1 });
    let totalShuttles = 0;
    batches.forEach(b => totalShuttles += b.remainingShuttles);
    res.json({ totalShuttles, batches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const { totalTubes, pricePerTube } = req.body;
    const batch = new ShuttleBatch({
      totalTubes,
      pricePerTube,
      totalShuttles: totalTubes * 12,
      remainingShuttles: totalTubes * 12
    });
    await batch.save();
    res.status(201).json(batch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tính toán nháp giá tiền cầu trước khi chốt
app.post('/api/matches/preview', async (req, res) => {
  try {
    const { shuttlesUsed } = req.body;
    const batches = await ShuttleBatch.find({ remainingShuttles: { $gt: 0 } }).sort({ importDate: 1 });
    
    let shuttlesToDeduct = shuttlesUsed;
    let totalShuttleCost = 0;

    for (let batch of batches) {
      if (shuttlesToDeduct <= 0) break;
      const pricePerShuttle = batch.pricePerTube / 12;
      const deductFromThisBatch = Math.min(batch.remainingShuttles, shuttlesToDeduct);
      totalShuttleCost += deductFromThisBatch * pricePerShuttle;
      shuttlesToDeduct -= deductFromThisBatch;
    }

    if (shuttlesToDeduct > 0) {
      return res.status(400).json({ error: 'Không đủ cầu trong kho!' });
    }

    res.json({ totalShuttleCost: Math.round(totalShuttleCost) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Match API (Chốt sổ)
app.post('/api/matches', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { participantIds, courtFee, shuttlesUsed } = req.body;
    
    if (!participantIds || participantIds.length === 0) {
      throw new Error("Phải chọn ít nhất 1 người tham gia.");
    }

    // Tính tiền cầu (FIFO)
    const batches = await ShuttleBatch.find({ remainingShuttles: { $gt: 0 } }).sort({ importDate: 1 }).session(session);
    let shuttlesToDeduct = shuttlesUsed;
    let totalShuttleCost = 0;

    for (let batch of batches) {
      if (shuttlesToDeduct <= 0) break;
      const pricePerShuttle = batch.pricePerTube / 12;
      const deductFromThisBatch = Math.min(batch.remainingShuttles, shuttlesToDeduct);
      
      totalShuttleCost += deductFromThisBatch * pricePerShuttle;
      batch.remainingShuttles -= deductFromThisBatch;
      await batch.save({ session });
      
      shuttlesToDeduct -= deductFromThisBatch;
    }

    if (shuttlesToDeduct > 0) {
      throw new Error('Không đủ cầu trong kho!');
    }

    totalShuttleCost = Math.round(totalShuttleCost);
    const totalCost = courtFee + totalShuttleCost;
    const costPerPerson = Math.round(totalCost / participantIds.length);

    // Tạo Match
    const match = new Match({
      participants: participantIds,
      courtFee,
      shuttlesUsed,
      totalShuttleCost,
      totalCost,
      costPerPerson
    });
    await match.save({ session });

    // Trừ tiền người tham gia và lưu transaction
    for (const memberId of participantIds) {
      const member = await Member.findById(memberId).session(session);
      if(member) {
        member.balance -= costPerPerson;
        await member.save({ session });

        const tx = new Transaction({
          member: memberId,
          type: 'MATCH_FEE',
          amount: -costPerPerson,
          description: `Đánh cầu ngày ${new Date().toLocaleDateString('vi-VN')} (-${costPerPerson.toLocaleString('vi-VN')}đ)`,
          matchId: match._id
        });
        await tx.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();
    
    // Trả về Match cùng danh sách thành viên để sinh báo cáo
    const populatedMatch = await Match.findById(match._id).populate('participants');
    res.status(201).json(populatedMatch);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: err.message });
  }
});

// 4. Transactions API
app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ date: -1 }).populate('member').limit(50);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback to index.html for SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;

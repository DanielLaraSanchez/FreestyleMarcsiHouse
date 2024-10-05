const mongoose = require('mongoose');

const StatsSchema = new mongoose.Schema({
  points: { type: Number, default: 0 },
  votes: { type: Number, default: 0 },
  battles: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
});

module.exports = StatsSchema;
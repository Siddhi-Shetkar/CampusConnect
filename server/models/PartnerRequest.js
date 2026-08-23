const mongoose = require('mongoose');

const partnerRequestSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['Learning', 'Building', 'Sports', 'Other'],
  },
  activity: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  skillLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Any'],
    default: 'Any',
  },
  availability: {
    type: String,
    required: true,
  },
  frequency: {
    type: String,
    enum: ['Once', 'Few times a week', 'Daily', 'Flexible'],
    default: 'Flexible',
  },
  location: {
    type: String,
    default: '',
  },
  peopleNeeded: {
    type: Number,
    default: 1,
  },
  status: {
    type: String,
    enum: ['Open', 'Filled', 'Closed'],
    default: 'Open',
  },
}, {
  timestamps: true,
});

const PartnerRequest = mongoose.model('PartnerRequest', partnerRequestSchema);
module.exports = PartnerRequest;

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  college: {
    type: String,
    default: '',
  },
  year: {
    type: String,
    default: '',
  },
  bio: {
    type: String,
    default: '',
  },
  skills: {
    type: [String],
    default: [],
  },
  interests: {
    type: [String],
    default: [],
  },
  lookingFor: {
    type: [String],
    default: [],
  },
  availability: {
    type: String,
    default: '',
  },
  skillLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', ''],
    default: '',
  },
  profileImage: {
    type: String,
    default: '',
  }
}, {
  timestamps: true,
});

const User = mongoose.model('User', userSchema);
module.exports = User;

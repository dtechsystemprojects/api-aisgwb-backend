const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true,
  },
  name: {
    type: String,
    unique: true,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  badgeVariant: {
    type: String,
    enum: ['primary', 'success', 'info', 'warning', 'danger', 'secondary'],
    default: 'primary',
  },
  memberCount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
  permissionsCount: {
    type: Number,
    default: 0,
  },
  createdDate: {
    type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);

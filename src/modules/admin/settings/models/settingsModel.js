const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    key: { type: String, required: true, unique: true, trim: true },
    type: {
      type: String,
      enum: ['text', 'file', 'textarea', 'switch', 'select'],
      default: 'text',
    },
    group: { type: String, required: true, trim: true, default: 'General' },
    value: { type: mongoose.Schema.Types.Mixed, default: '' },
    previewUrl: { type: String, default: '' },
    optionsData: { type: String, default: '' },
  },
  { timestamps: true }
);

settingsSchema.index({ key: 1 });
settingsSchema.index({ group: 1 });

module.exports = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);

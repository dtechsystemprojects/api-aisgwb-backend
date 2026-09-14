const mongoose = require('mongoose');

const activitiesSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    module_name: { type: String, required: true, trim: true },
    module_id: { type: String, required: true },
    action: { type: String, required: true, trim: true },
    description: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    ip: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

activitiesSchema.index({ module_name: 1 });

module.exports = mongoose.model('Activities', activitiesSchema);

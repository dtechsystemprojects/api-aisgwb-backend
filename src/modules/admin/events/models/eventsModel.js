const mongoose = require('mongoose');

const eventsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    startTime: { type: String, trim: true },
    endTime: { type: String, trim: true },
    timezone: { type: String, trim: true },
    registrationOpen: { type: Date },
    registrationClose: { type: Date },
    eventType: { type: String, enum: ['Offline', 'Online', 'Hybrid'], required: true },
    venueLocation: { type: String, trim: true },
    onlinePlatformUrl: { type: String, trim: true },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    logo: { type: String, trim: true },
    banner: { type: String, trim: true },
    maximumSeats: { type: Number },
    status: { type: String, enum: ['Draft', 'Ongoing', 'Upcoming', 'Expired'], default: 'Draft' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

eventsSchema.index({ slug: 1 });

module.exports = mongoose.model('Events', eventsSchema);

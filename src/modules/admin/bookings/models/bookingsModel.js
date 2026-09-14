const mongoose = require('mongoose');

const attendeeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  age: { type: String, trim: true },
  relation: { type: String, trim: true },
});

const bookingTicketSchema = new mongoose.Schema({
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tickets', required: true },
  ticketName: { type: String, trim: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  attendees: [attendeeSchema] // e.g., if quantity is 2, there should be 2 attendee names
});

const billingInfoSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, trim: true },
  email: { type: String, trim: true },
  phone: { type: String, trim: true }
});

const bookingsSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Events', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' }, // Optional, for logged-in members
    billingInfo: { type: billingInfoSchema, required: true },
    tickets: [bookingTicketSchema],
    totalAmount: { type: Number, required: true, default: 0 },
    paymentMethod: { type: String, default: 'Manual' },
    paymentStatus: { 
      type: String, 
      enum: ['Pending', 'Completed', 'Failed', 'Refunded', 'Free'], 
      default: 'Pending' 
    },
    bookingStatus: { 
      type: String, 
      enum: ['Confirmed', 'Cancelled'], 
      default: 'Confirmed' 
    }
  },
  { timestamps: true }
);

bookingsSchema.index({ eventId: 1 });
bookingsSchema.index({ userId: 1 });

module.exports = mongoose.model('Bookings', bookingsSchema);

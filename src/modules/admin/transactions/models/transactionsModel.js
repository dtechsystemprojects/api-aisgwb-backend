const mongoose = require('mongoose');

const transactionsSchema = new mongoose.Schema(
  {
    transactionRef: { type: String, required: true, unique: true }, // Razorpay Payment ID or Order ID
    dateAndTime: { type: Date, default: Date.now },
    description: { type: String, required: true },
    paymentMethod: { type: String }, // e.g., 'HDFC NetBanking', 'UPI', 'Credit Card'
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Success', 'Pending', 'Failed'],
      default: 'Pending',
    },
    type: { type: String, enum: ['EVENT', 'MEMBERSHIP'] },
    receiptUrl: { type: String }, // Optional link to a receipt/invoice PDF if generated
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bookings' },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Events' },
  },
  { timestamps: true }
);

transactionsSchema.index({ transactionRef: 1 });
transactionsSchema.index({ userId: 1 });
transactionsSchema.index({ bookingId: 1 });

module.exports = mongoose.model('Transactions', transactionsSchema);

const mongoose = require("mongoose");

const attendeeSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bookings', required: true },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Events",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    age: {
      type: String,
    },
    relation: {
      type: String,
    },
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tickets",
      required: true,
    },
    ticketName: {
      type: String,
    },
    ticketPrice: {
      type: Number,
      required: true,
    },
    ticketStatus: {
      type: String,
      enum: ["Unused", "Used", "Cancelled"],
      default: "Unused",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Success", "Failed", "Free"],
      default: "Pending",
    },
    checkInTime: {
      type: Date
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attendee", attendeeSchema);




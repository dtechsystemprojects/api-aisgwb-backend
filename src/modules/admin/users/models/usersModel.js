const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usersSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Full Name is required'] },
  email: { type: String, required: [true, 'Email Address is required'], unique: true },
  mobile: { type: String, required: [true, 'Mobile Number is required'], unique: true },
  username: { type: String, unique: true, sparse: true },
  sex: { type: String, required: [true, 'Sex is required'], enum: ['Male', 'Female'] },
  memberId: { type: String },
  groupId: { type: String },
  group: { type: String },
  password: { type: String },
  isActive: { type: Boolean, default: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  twoFactorEnabled: { type: Boolean, default: false },
  joinedDate: { type: String },
  avatar: { type: String },
  otp: { type: String },
  otpExpiry: { type: Date }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create a virtual 'id' field that maps to '_id'
usersSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

usersSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

usersSchema.methods.comparePassword = function (plain) {
  if (!this.password) return false;
  return bcrypt.compare(plain, this.password);
};

const User = mongoose.model('Users', usersSchema);
module.exports = User;

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const roleSchema = new Schema({
  groupId: { type: String, required: true },
  className: { type: String, required: true }
}, { _id: false });

const permissionSchema = new Schema({
  type: { type: String, enum: ['standard', 'group-access'], default: 'standard' },
  
  // Standard Permission fields
  name: { 
    type: String, 
    required: function() { return this.type === 'standard'; } 
  },
  roles: [roleSchema],
  date: { 
    type: String, 
    required: function() { return this.type === 'standard'; } 
  },
  time: { 
    type: String, 
    required: function() { return this.type === 'standard'; } 
  },
  url: { type: String },
  icon: { type: String },
  users: { type: Number, default: 0 },
  
  // Group Access fields
  groupId: { 
    type: String, 
    required: function() { return this.type === 'group-access'; } 
  },
  moduleName: { 
    type: String, 
    required: function() { return this.type === 'group-access'; } 
  },
  category: { type: String },
  read: { type: Boolean, default: false },
  write: { type: Boolean, default: false },
  delete: { type: Boolean, default: false },
  export: { type: Boolean, default: false },
  order: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'permissions'
});

// Create a virtual 'id' field to match frontend expectations
permissionSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized.
permissionSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  }
});

module.exports = mongoose.model('Permission', permissionSchema);

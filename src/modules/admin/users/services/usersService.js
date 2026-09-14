const Users = require('../models/usersModel');
const { formatPagination } = require('../../../../utils/helpers');
const logger = require('../../../../services/logger');

const stripPassword = (doc) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  const { password, ...rest } = obj;
  return rest;
};

module.exports = {

  /**
   * @description Fetch all users with pagination
   * @param {number} page
   * @param {number} limit
   * @returns {Promise<{data: Array, total: number}>}
   */
  async getAll(page = 1, limit = 10) {
    try {
      const { skip } = formatPagination(page, limit);
      const total = await Users.countDocuments();
      const data = await Users.find().select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit);
      return { data, total };
    } catch (error) {
      logger.error('Error in getAll:', error);
      throw error;
    }
  },

  /**
   * @description Fetch user by ID
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    try {
      return await Users.findById(id).select('-password');
    } catch (error) {
      logger.error('Error in getById:', error);
      throw error;
    }
  },

  /**
   * @description Create new user
   * @param {Object} data
   * @returns {Promise<Object|null>}
   */
  async create(data) {
    try {
      const existing = await Users.findOne({ email: data.email });
      if (existing) throw new Error('Email already exists');
      const user = await Users.create(data);
      return stripPassword(user);
    } catch (error) {
      logger.error('Error in create:', error);
      throw error;
    }
  },

  /**
   * @description Update user
   * @param {string} id
   * @param {Object} data
   * @returns {Promise<Object|null>}
   */
  async update(id, data) {
    try {
      return await Users.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    } catch (error) {
      logger.error('Error in update:', error);
      throw error;
    }
  },

  /**
   * @description Update user status
   * @param {string} id
   * @param {boolean} status
   * @returns {Promise<Object|null>}
   */
  async status(id, status) {
    try {
      return await Users.findByIdAndUpdate(id, { isActive: Boolean(status) }, { new: true, runValidators: true });
    } catch (error) {
      logger.error('Error in status:', error);
      throw error;
    }
  },

  /**
   * @description Delete user
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async delete(id) {
    try {
      return await Users.findByIdAndDelete(id);
    } catch (error) {
      logger.error('Error in delete:', error);
      throw error;
    }
  },
};

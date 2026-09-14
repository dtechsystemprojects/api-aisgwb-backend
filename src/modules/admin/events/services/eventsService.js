const Events = require('../models/eventsModel');
  const { formatPagination } = require('../../../../utils/helpers');
  const logger = require('../../../../services/logger');

module.exports = {
  async getAll(page = 1, limit = 10) {
    try {
      const { skip } = formatPagination(page, limit);
      const total = await Events.countDocuments();
      const data = await Events.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
      return { data, total };
    } catch (error) {
      logger.error('Error in getAll:', error);
      throw error;
    }
  },

  async getById(id) {
    try {
      return await Events.findById(id);
    } catch (error) {
      logger.error('Error in getById:', error);
      throw error;
    }
  },

  async create(data) {
    try {
      const existing = await Events.findOne({ slug: data.slug });
      if (existing) throw new Error('Slug already exists');
      return await Events.create(data);
    } catch (error) {
      logger.error('Error in create:', error);
      throw error;
    }
  },

  async update(id, data) {
    try {
      if (data.slug) {
        const existing = await Events.findOne({ slug: data.slug, _id: { $ne: id } });
        if (existing) throw new Error('Slug already exists for another event');
      }
      return await Events.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    } catch (error) {
      logger.error('Error in update:', error);
      throw error;
    }
  },

  async status(id, status) {
    try {
      const updateData = {};
      if (['Draft', 'Published', 'Cancelled'].includes(status)) {
         updateData.status = status;
      } else if (typeof status === 'boolean' || status === 1 || status === 0) {
         updateData.isActive = Boolean(status);
      } else {
         updateData.status = status; 
      }
      return await Events.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    } catch (error) {
      logger.error('Error in status:', error);
      throw error;
    }
  },

  async delete(id) {
    try {
      return await Events.findByIdAndDelete(id);
    } catch (error) {
      logger.error('Error in delete:', error);
      throw error;
    }
  },
};

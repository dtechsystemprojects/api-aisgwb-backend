const Group = require('../models/groupModel');
const { formatPagination } = require('../../../../utils/helpers');

module.exports = {
  /**
   * @description Fetch all groups
   * @returns {Promise<Array<Object>>}
   */
  async getAll() {
    const User = require('../../users/models/usersModel');
    const Permission = require('../../permissions/models/Permission');
    const groups = await Group.find().sort({ createdAt: -1 }).lean();
    for (const group of groups) {
      const uCount = await User.countDocuments({ group: group.id });
      const pCount = await Permission.countDocuments({ 
        type: 'group-access', 
        groupId: group.id,
        $or: [
          { read: true },
          { write: true },
          { delete: true },
          { export: true }
        ]
      });
      
      let needsUpdate = false;
      const updateData = {};
      if (group.memberCount !== uCount) {
        updateData.memberCount = uCount;
        group.memberCount = uCount;
        needsUpdate = true;
      }
      if (group.permissionsCount !== pCount) {
        updateData.permissionsCount = pCount;
        group.permissionsCount = pCount;
        needsUpdate = true;
      }
      if (needsUpdate) {
        await Group.updateOne({ _id: group._id }, updateData);
      }
      
      // Compute virtual id mapping
      group.id = group.id || group._id.toString();
    }
    return groups;
  },

  /**
   * @description Fetch group by ID
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    return Group.findOne({ id });
  },

  /**
   * @description Create new group
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(data) {
    if (!data.id) {
      const groups = await Group.find({}, 'id');
      let maxIdNum = 0;
      for (const group of groups) {
        if (group.id && group.id.startsWith('GRP-')) {
          const num = parseInt(group.id.split('-')[1], 10);
          if (!isNaN(num) && num > maxIdNum) {
            maxIdNum = num;
          }
        }
      }
      data.id = `GRP-${maxIdNum + 1}`;
    }
    if (!data.createdDate) {
      data.createdDate = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    }
    return Group.create(data);
  },

  /**
   * @description Update group
   * @param {string} id
   * @param {Object} data
   * @returns {Promise<Object|null>}
   */
  async update(id, data) {
    return Group.findOneAndUpdate({ id }, data, { new: true, runValidators: true });
  },

  /**
   * @description Delete group
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async delete(id) {
    const group = await Group.findOne({ id });
    if (!group) return null;
    
    if (group.memberCount && group.memberCount > 0) {
      throw new Error(`Cannot delete group "${group.name}". It still has ${group.memberCount} assigned user(s).`);
    }

    return Group.findOneAndDelete({ id });
  },
};

const Group = require('../modules/admin/groups/models/groupModel');
const Permission = require('../modules/admin/permissions/models/Permission');

module.exports = (config, action) => {
  return async (req, res, next) => {
    try {
      const user = req.user || req.admin;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      /* Super Admin bypass */
      if (user.group === 'GRP-1' || user.group === 'Super Admin') {
        return next();
      }

      const group = await Group.findOne({ $or: [{ id: user.group }, { name: user.group }] });
      if (!group) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied. Invalid group.',
        });
      }

      const moduleName = typeof config === 'string' ? config : config.moduleName;
      const type = typeof config === 'object' && config.type ? config.type : 'group-access';
      const category = typeof config === 'object' && config.category ? config.category : undefined;

      const query = { 
        type, 
        groupId: group.id, 
        moduleName: { $regex: new RegExp(`^${moduleName}$`, 'i') } 
      };

      if (category) {
        query.category = category;
      }

      const rule = await Permission.findOne(query);

      if (!rule) {
        return res.status(403).json({
          success: false,
          message: `Permission denied. Rule for ${moduleName} not found.`,
          requestId: req.id,
        });
      }

      const isAllowed = () => {
        switch (action.toUpperCase()) {
          case 'READ': return rule.read;
          case 'WRITE': return rule.write;
          case 'DELETE': return rule.delete;
          case 'EXPORT': return rule.export;
          default: return false;
        }
      };

      if (!isAllowed()) {
        return res.status(403).json({
          success: false,
          message: `Permission denied. Required: ${moduleName}.${action}`,
          requestId: req.id,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error while verifying permissions',
      });
    }
  };
};

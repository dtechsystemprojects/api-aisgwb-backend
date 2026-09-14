const Permission = require('../models/Permission');
const Group = require('../../groups/models/groupModel');

const updateGroupPermissionsCount = async (groupId) => {
  const activeCount = await Permission.countDocuments({
    type: 'group-access',
    groupId,
    $or: [
      { read: true },
      { write: true },
      { delete: true },
      { export: true }
    ]
  });
  await Group.findOneAndUpdate({ id: groupId }, { permissionsCount: activeCount });
};

exports.getAll = async (req, res) => {
  try {
    const User = require('../../users/models/usersModel');
    const permissions = await Permission.find({ type: 'standard' });
    for (const perm of permissions) {
      let uniqueUserCount = 0;
      if (perm.roles && perm.roles.length > 0) {
        const groupIds = perm.roles.map(r => r.groupId);
        uniqueUserCount = await User.countDocuments({ group: { $in: groupIds } });
      }
      if (perm.users !== uniqueUserCount) {
        perm.users = uniqueUserCount;
        await perm.save();
      }
    }
    res.json({ success: true, data: permissions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch permissions', error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const now = new Date();
    const { id, _id, ...restBody } = req.body;
    const payload = { ...restBody };
    if (!payload.date) payload.date = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!payload.time) payload.time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
    if (!payload.users) payload.users = 0;
    if (!payload.roles) payload.roles = [];

    const newPermission = new Permission(payload);
    await newPermission.save();

    // Auto-create Group Access rules for each selected group
    if (newPermission.type === 'standard' && newPermission.roles && newPermission.roles.length > 0) {
      for (const role of newPermission.roles) {
        const query = { $or: [{ id: role.groupId }, { name: role.groupId }] };
        const group = await Group.findOne(query);
        if (group) {
          const groupRule = new Permission({
            type: 'group-access',
            groupId: group.id,
            moduleName: newPermission.name,
            category: newPermission.category || 'System Permission',
            read: true,
            write: true,
            delete: true,
            export: true
          });
          await groupRule.save();
          await updateGroupPermissionsCount(group.id);
        }
      }
    }

    res.status(201).json({ success: true, data: newPermission });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to create permission', error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id, _id, ...restBody } = req.body;

    const oldPermission = await Permission.findById(req.params.id);
    if (!oldPermission) {
      return res.status(404).json({ success: false, message: 'Permission not found' });
    }

    const updatedPermission = await Permission.findByIdAndUpdate(req.params.id, restBody, { new: true });

    if (updatedPermission.type === 'standard') {
      const oldRoles = oldPermission.roles ? oldPermission.roles.map(r => r.groupId) : [];
      const newRoles = updatedPermission.roles ? updatedPermission.roles.map(r => r.groupId) : [];

      const addedRoles = newRoles.filter(role => !oldRoles.includes(role));
      const removedRoles = oldRoles.filter(role => !newRoles.includes(role));
      const keptRoles = newRoles.filter(role => oldRoles.includes(role));

      // Handle name or category change for existing rules
      if (oldPermission.name !== updatedPermission.name || oldPermission.category !== updatedPermission.category) {
        for (const roleId of keptRoles) {
          const query = { $or: [{ id: roleId }, { name: roleId }] };
          const group = await Group.findOne(query);
          if (group) {
            await Permission.updateMany(
              { type: 'group-access', groupId: group.id, moduleName: oldPermission.name },
              { $set: { moduleName: updatedPermission.name, category: updatedPermission.category || 'System Permission' } }
            );
          }
        }
      }

      // Add new rules
      for (const roleId of addedRoles) {
        const query = { $or: [{ id: roleId }, { name: roleId }] };
        const group = await Group.findOne(query);
        if (group) {
          const groupRule = new Permission({
            type: 'group-access',
            groupId: group.id,
            moduleName: updatedPermission.name,
            category: updatedPermission.category || 'System Permission',
            read: true,
            write: true,
            delete: true,
            export: true
          });
          await groupRule.save();
          await updateGroupPermissionsCount(group.id);
        }
      }

      // Remove deleted rules
      for (const roleId of removedRoles) {
        const query = { $or: [{ id: roleId }, { name: roleId }] };
        const group = await Group.findOne(query);
        if (group) {
          const result = await Permission.deleteMany({
            type: 'group-access',
            groupId: group.id,
            moduleName: oldPermission.name
          });
          if (result.deletedCount > 0) {
            await updateGroupPermissionsCount(group.id);
          }
        }
      }
    }

    res.json({ success: true, data: updatedPermission });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to update permission', error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const oldPermission = await Permission.findById(req.params.id);
    if (!oldPermission) {
      return res.status(404).json({ success: false, message: 'Permission not found' });
    }

    const deletedPermission = await Permission.findByIdAndDelete(req.params.id);

    if (deletedPermission && deletedPermission.type === 'standard') {
      const roles = deletedPermission.roles ? deletedPermission.roles.map(r => r.groupId) : [];
      for (const roleId of roles) {
        const query = { $or: [{ id: roleId }, { name: roleId }] };
        const group = await Group.findOne(query);
        if (group) {
          const result = await Permission.deleteMany({
            type: 'group-access',
            groupId: group.id,
            moduleName: deletedPermission.name
          });
          if (result.deletedCount > 0) {
            await updateGroupPermissionsCount(group.id);
          }
        }
      }
    }

    res.json({ success: true, data: deletedPermission });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete permission', error: error.message });
  }
};

const Permission = require('../../permissions/models/Permission');
const Group = require('../../groups/models/groupModel');
const BaseController = require('../../../../core/BaseController');
const baseController = new BaseController();

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
    const { groupId } = req.params;
    
    // Check if group is Super Admin
    const groupObj = await Group.findOne({ id: groupId });
    const isSuperAdmin = groupObj && (groupObj.id === 'GRP-1' || groupObj.name === 'Super Admin');

    let registry = await Permission.find({ type: 'module-registry' });
    if (!registry || registry.length === 0) {
      const stdPerms = await Permission.find({ type: 'standard' });
      registry = stdPerms.map(p => ({
        moduleName: p.name,
        category: p.category || 'Management'
      }));
    }

    // Automatically insert/upsert full access permissions for Super Admin in MongoDB
    if (isSuperAdmin && registry.length > 0) {
      const bulkOps = registry.map(reg => ({
        updateOne: {
          filter: { moduleName: reg.moduleName, type: 'group-access', groupId },
          update: { 
            $set: { 
              type: 'group-access', 
              groupId, 
              moduleName: reg.moduleName, 
              category: reg.category,
              read: true, write: true, delete: true, export: true
            } 
          },
          upsert: true
        }
      }));
      await Permission.bulkWrite(bulkOps);
    }

    const rules = await Permission.find({ type: 'group-access', groupId });

    // Merge existing rules with the registry so the UI always has a complete matrix
    const mergedRules = registry.map((reg, index) => {
      const existingRule = rules.find(r => r.moduleName === reg.moduleName);
      if (existingRule) {
        return existingRule;
      }
      return {
        id: `MOD-GEN-${index + 1}`,
        type: 'group-access',
        groupId: groupId,
        moduleName: reg.moduleName,
        category: reg.category,
        read: isSuperAdmin,
        write: isSuperAdmin,
        delete: isSuperAdmin,
        export: isSuperAdmin
      };
    });

    // Append any existing rules that might not be in the registry or standard permissions
    rules.forEach(rule => {
      if (!mergedRules.find(m => m.moduleName === rule.moduleName)) {
        mergedRules.push(rule.toObject ? rule.toObject({ virtuals: true, transform: (doc, ret) => { delete ret._id; return ret; } }) : rule);
      }
    });

    // Sort by the newly introduced order property
    mergedRules.sort((a, b) => {
      const orderA = a.order !== undefined && a.order !== null ? a.order : 999;
      const orderB = b.order !== undefined && b.order !== null ? b.order : 999;
      return orderA - orderB;
    });

    res.json({ success: true, data: mergedRules });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch group access rules', error: error.message });
  }
};

exports.bulkSave = async (req, res) => {
  try {
    const { groupId } = req.params;
    const rules = req.body; // Array of rules

    if (!Array.isArray(rules)) {
      return res.status(400).json({ success: false, message: 'Rules must be an array' });
    }

    const bulkOps = rules.map(rule => {
      const { id, _id, ...rest } = rule;
      return {
        updateOne: {
          filter: { moduleName: rule.moduleName, type: 'group-access', groupId },
          update: { $set: { ...rest, type: 'group-access', groupId } },
          upsert: true
        }
      };
    });

    if (bulkOps.length > 0) {
      await Permission.bulkWrite(bulkOps);

      const groupObj = await Group.findOne({ id: groupId });
      if (groupObj) {
        for (const rule of rules) {
          const stdPerm = await Permission.findOne({ type: 'standard', name: rule.moduleName });
          const roleObj = {
            groupId: groupObj.id,
            className: groupObj.badgeVariant ? `bg-${groupObj.badgeVariant}-subtle text-${groupObj.badgeVariant}` : 'bg-primary-subtle text-primary'
          };
          const hasAnyAccess = rule.read || rule.write || rule.delete || rule.export;

          if (stdPerm) {
            const hasRole = stdPerm.roles && stdPerm.roles.some(r => r.groupId === groupObj.id);
            if (hasAnyAccess && !hasRole) {
              await Permission.findByIdAndUpdate(stdPerm._id, { $push: { roles: roleObj } });
            } else if (!hasAnyAccess && hasRole) {
              stdPerm.roles = stdPerm.roles.filter(r => r.groupId !== groupObj.id);
              await stdPerm.save();
            }
          } else if (hasAnyAccess) {
            const now = new Date();
            const newStdPerm = new Permission({
              type: 'standard',
              name: rule.moduleName,
              roles: [roleObj],
              date: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
              time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(),
              users: 0
            });
            await newStdPerm.save();
          }
        }
        await updateGroupPermissionsCount(groupId);
      }
    }

    // Log Activities //
    await baseController.logActivity(req, 'Group Access', groupId, 'UPDATE', req.body);

    res.json({ success: true, message: 'Group access rules updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to bulk save group access rules', error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { id, _id, ...restBody } = req.body;
    const payload = { ...restBody, type: 'group-access', groupId };
    const newRule = new Permission(payload);
    await newRule.save();

    const groupObj = await Group.findOne({ id: groupId });
    if (groupObj) {
      // Update permissionsCount in the associated group
      await updateGroupPermissionsCount(groupId);

      // Sync to standard permissions table
      const stdPerm = await Permission.findOne({ type: 'standard', name: payload.moduleName });
      const roleObj = {
        groupId: groupObj.id,
        className: groupObj.badgeVariant ? `bg-${groupObj.badgeVariant}-subtle text-${groupObj.badgeVariant}` : 'bg-primary-subtle text-primary'
      };

      if (stdPerm) {
        const hasRole = stdPerm.roles && stdPerm.roles.some(r => r.groupId === groupObj.id);
        if (!hasRole) {
          await Permission.findByIdAndUpdate(stdPerm._id, { $push: { roles: roleObj } });
        }
      } else {
        const now = new Date();
        const newStdPerm = new Permission({
          type: 'standard',
          name: payload.moduleName,
          roles: [roleObj],
          date: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(),
          users: 0
        });
        await newStdPerm.save();
      }
    }

    // Log Activities //
    await baseController.logActivity(req, 'Group Access', newRule._id, 'CREATE', req.body);

    res.status(201).json({ success: true, data: newRule });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to create group access rule', error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { groupId, ruleId } = req.params;
    const { id, _id, ...restBody } = req.body;
    
    const mongoose = require('mongoose');
    let query = { type: 'group-access', groupId };
    if (mongoose.Types.ObjectId.isValid(ruleId)) {
      query._id = ruleId;
    } else {
      query.moduleName = restBody.moduleName;
    }

    let oldRule = await Permission.findOne(query);
    let updatedRule;

    if (!oldRule) {
      // Create new if it didn't exist (e.g. MOD-GEN-x)
      const payload = { ...restBody, type: 'group-access', groupId };
      updatedRule = new Permission(payload);
      await updatedRule.save();
      
      const groupObj = await Group.findOne({ id: groupId });
      if (groupObj) {
        await updateGroupPermissionsCount(groupId);
      }
    } else {
      updatedRule = await Permission.findOneAndUpdate(
        query, 
        restBody, 
        { new: true }
      );
    }

    if (updatedRule) {
      const groupObj = await Group.findOne({ id: groupId });
      if (groupObj) {
        // If moduleName changed, remove from old standard permission
        if (oldRule && oldRule.moduleName !== updatedRule.moduleName) {
          const oldStd = await Permission.findOne({ type: 'standard', name: oldRule.moduleName });
          if (oldStd) {
            oldStd.roles = oldStd.roles.filter(r => r.groupId !== groupObj.id);
            await oldStd.save();
          }
        }
        
        // Sync with new/current standard permission
        const newStd = await Permission.findOne({ type: 'standard', name: updatedRule.moduleName });
        const roleObj = {
          groupId: groupObj.id,
          className: groupObj.badgeVariant ? `bg-${groupObj.badgeVariant}-subtle text-${groupObj.badgeVariant}` : 'bg-primary-subtle text-primary'
        };

        const hasAnyAccess = updatedRule.read || updatedRule.write || updatedRule.delete || updatedRule.export;

        if (newStd) {
          const hasRole = newStd.roles && newStd.roles.some(r => r.groupId === groupObj.id);
          if (hasAnyAccess && !hasRole) {
            await Permission.findByIdAndUpdate(newStd._id, { $push: { roles: roleObj } });
          } else if (!hasAnyAccess && hasRole) {
            newStd.roles = newStd.roles.filter(r => r.groupId !== groupObj.id);
            await newStd.save();
          }
        } else if (hasAnyAccess) {
          const now = new Date();
          const newStdPerm = new Permission({
            type: 'standard',
            name: updatedRule.moduleName,
            roles: [roleObj],
            date: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(),
            users: 0
          });
          await newStdPerm.save();
        }
      }
    }

    // Log Activities //
    await baseController.logActivity(req, 'Group Access', updatedRule._id, 'UPDATE', req.body);

    res.json({ success: true, data: updatedRule });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to update group access rule', error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { groupId, ruleId } = req.params;
    const deletedRule = await Permission.findOneAndDelete({ _id: ruleId, type: 'group-access', groupId });
    if (!deletedRule) {
      return res.status(404).json({ success: false, message: 'Group access rule not found' });
    }

    const groupObj = await Group.findOne({ id: groupId });
    if (groupObj) {
      // Update permissionsCount in the associated group
      await updateGroupPermissionsCount(groupId);

      // Remove from standard permissions table
      const stdPerm = await Permission.findOne({ type: 'standard', name: deletedRule.moduleName });
      if (stdPerm) {
        await Permission.findByIdAndUpdate(stdPerm._id, { $pull: { roles: { groupId: groupObj.id } } });
      }
    }

    // Log Activities //
    await baseController.logActivity(req, 'Group Access', deletedRule._id, 'DELETE', deletedRule);

    res.json({ success: true, data: deletedRule });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete group access rule', error: error.message });
  }
};

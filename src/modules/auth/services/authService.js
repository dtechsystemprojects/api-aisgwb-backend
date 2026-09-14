const Auth = require('../../admin/users/models/usersModel');
const tokenService = require('../../../services/tokenService');
const logger = require('../../../services/logger');

module.exports = {
  async register(data) {
    try {
      const existing = await Auth.findOne({ email: data.email });
      if (existing) throw new Error('Email already registered');
      const user = await Auth.create(data);
      const { password, ...userObj } = user.toObject();
      return userObj;
    } catch (error) {
      logger.error('Error in register:', error);
      throw error;
    }
  },

  async login_email(email, password) {
    try {
      const user = await Auth.findOne({ email, isActive: true });
      if (!user) throw new Error('Invalid credentials');

      const match = await user.comparePassword(password);
      if (!match) throw new Error('Invalid credentials');

      const token = tokenService.generateToken({ id: user._id, email: user.email });
      const { password: _pw, ...userObj } = user.toObject();
      return { token, user: userObj };
    } catch (error) {
      logger.error('Error in login:', error);
      throw error;
    }
  },

  async login(username, password) {
    try {
      const query = {
        isActive: true,
      };

      // Email or Mobile
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);

      if (isEmail) {
        query.email = username.toLowerCase().trim();
      } else {
        query.mobile = username.trim();
      }

      const user = await Auth.findOne(query);

      if (!user) {
        throw new Error('Invalid email/mobile or password');
      }

      const match = await user.comparePassword(password);

      if (!match) {
        throw new Error('Invalid Password');
      }

      const token = tokenService.generateToken({
        id: user._id,
        email: user.email,
        mobile: user.mobile,
        isFrontEnd: false,
      });

      const userObj = user.toObject();
      delete userObj.password;

      // Fetch group access rules
      let accessRules = [];
      const Permission = require('../../admin/permissions/models/Permission');
      let registry = await Permission.find({ type: 'module-registry' });
      
      // Fallback: If module-registry is empty, use 'standard' permissions as the source of truth for all available modules
      if (!registry || registry.length === 0) {
        const stdPerms = await Permission.find({ type: 'standard' });
        registry = stdPerms.map(p => ({
          moduleName: p.name,
          category: p.category || 'System',
          url: p.url || '',
          icon: p.icon || ''
        }));
      }

      if (userObj.groupId || userObj.group) {
        const Group = require('../../admin/groups/models/groupModel');
        let group = null;
        if (userObj.groupId || userObj.group) {
          let searchId = userObj.groupId || userObj.group; const mongoose = require('mongoose'); let q = [{ id: searchId }, { name: searchId }]; if(mongoose.Types.ObjectId.isValid(searchId)) { q.push({ _id: searchId }); } group = await Group.findOne({ $or: q });
        }
        if (group) {
          userObj.groupName = group.name;
        }
        const isAdmin = group && (group.id === 'GRP-1' || group.name === 'Super Admin');
        
        let rawRules = [];
        if (group) {
          rawRules = await Permission.find({ type: 'group-access', groupId: group.id });
        }
        
        accessRules = registry.map(reg => {
          const existingRule = rawRules.find(r => r.moduleName === reg.moduleName);
          if (existingRule) {
            return {
              ...existingRule.toObject(),
              url: reg.url,
              icon: reg.icon,
              read: isAdmin ? true : existingRule.read,
              write: isAdmin ? true : existingRule.write,
              delete: isAdmin ? true : existingRule.delete,
              export: isAdmin ? true : existingRule.export
            };
          }
          return {
            moduleName: reg.moduleName,
            category: reg.category,
            url: reg.url,
            icon: reg.icon,
            read: isAdmin ? true : false,
            write: isAdmin ? true : false,
            delete: isAdmin ? true : false,
            export: isAdmin ? true : false,
            order: 999
          };
        });
        
        // Also include any rawRules that are not in the registry
        rawRules.forEach(rule => {
           if (!accessRules.find(r => r.moduleName === rule.moduleName)) {
               const rObj = rule.toObject();
               if (isAdmin) {
                 rObj.read = true;
                 rObj.write = true;
                 rObj.delete = true;
                 rObj.export = true;
               }
               accessRules.push(rObj);
           }
        });

        // Sort accessRules by order
        accessRules.sort((a, b) => {
           const orderA = a.order !== undefined && a.order !== null ? a.order : 999;
           const orderB = b.order !== undefined && b.order !== null ? b.order : 999;
           return orderA - orderB;
        });
      }
      userObj.accessRules = accessRules;

      return {
        token,
        user: userObj,
      };
    } catch (error) {
      logger.error('Error in login:', error);
      throw error;
    }
  },

  async getProfile(userId) {
    try {
      const user = await Auth.findById(userId);
      if (!user) throw new Error('User not found');
      const userObj = user.toObject();
      delete userObj.password;

      let accessRules = [];
      const Permission = require('../../admin/permissions/models/Permission');
      let registry = await Permission.find({ type: 'module-registry' });
      
      if (!registry || registry.length === 0) {
        const stdPerms = await Permission.find({ type: 'standard' });
        registry = stdPerms.map(p => ({
          moduleName: p.name,
          category: p.category || 'Management',
          url: p.url || '',
          icon: p.icon || ''
        }));
      }

      if (userObj.groupId || userObj.group) {
        const Group = require('../../admin/groups/models/groupModel');
        let group = null;
        if (userObj.groupId || userObj.group) {
          let searchId = userObj.groupId || userObj.group; const mongoose = require('mongoose'); let q = [{ id: searchId }, { name: searchId }]; if(mongoose.Types.ObjectId.isValid(searchId)) { q.push({ _id: searchId }); } group = await Group.findOne({ $or: q });
        }
        if (group) {
          userObj.groupName = group.name;
        }
        const isAdmin = group && (group.id === 'GRP-1' || group.name === 'Super Admin');
        
        let rawRules = [];
        if (group) {
          rawRules = await Permission.find({ type: 'group-access', groupId: group.id });
        }
        
        accessRules = registry.map(reg => {
          const existingRule = rawRules.find(r => r.moduleName === reg.moduleName);
          if (existingRule) {
            return {
              ...existingRule.toObject(),
              url: reg.url,
              icon: reg.icon,
              read: isAdmin ? true : existingRule.read,
              write: isAdmin ? true : existingRule.write,
              delete: isAdmin ? true : existingRule.delete,
              export: isAdmin ? true : existingRule.export
            };
          }
          return {
            moduleName: reg.moduleName,
            category: reg.category,
            url: reg.url,
            icon: reg.icon,
            read: isAdmin ? true : false,
            write: isAdmin ? true : false,
            delete: isAdmin ? true : false,
            export: isAdmin ? true : false,
            order: 999
          };
        });
        
        // Also include any rawRules that are not in the registry
        rawRules.forEach(rule => {
           if (!accessRules.find(r => r.moduleName === rule.moduleName)) {
               const rObj = rule.toObject();
               if (isAdmin) {
                 rObj.read = true;
                 rObj.write = true;
                 rObj.delete = true;
                 rObj.export = true;
               }
               accessRules.push(rObj);
           }
        });

        // Sort accessRules by order
        accessRules.sort((a, b) => {
           const orderA = a.order !== undefined && a.order !== null ? a.order : 999;
           const orderB = b.order !== undefined && b.order !== null ? b.order : 999;
           return orderA - orderB;
        });
      }
      userObj.accessRules = accessRules;

      return { user: userObj };
    } catch (error) {
      logger.error('Error in getProfile:', error);
      throw error;
    }
  },
};


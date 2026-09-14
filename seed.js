const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
const Permission = require('./src/modules/admin/permissions/models/Permission');
const Group = require('./src/modules/admin/groups/models/groupModel');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/admin_panel');
  console.log('Connected to DB');

  // 1. Ensure Super Admin group exists
  let superAdmin = await Group.findOne({ name: 'Super Admin' });
  if (!superAdmin) {
    const now = new Date();
    superAdmin = new Group({
      id: 'GRP-1',
      name: 'Super Admin',
      description: 'System Administrator with full access',
      permissionsCount: 0,
      memberCount: 1,
      badgeVariant: 'primary',
      status: 'Active',
      isActive: true,
      createdDate: now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      date: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(),
    });
    await superAdmin.save();
    console.log('Created Super Admin group');
  }

  const coreModules = [
    { name: 'Dashboard', category: 'Main' },
    { name: 'Users', category: 'Management' },
    { name: 'Groups', category: 'Management' },
    { name: 'Permissions', category: 'Management' },
    { name: 'Group Access', category: 'Management' },
    { name: 'Settings', category: 'Management' },
    { name: 'Activities', category: 'Admin' }
  ];

  let permissionsCount = 0;

  for (const mod of coreModules) {
    // 2. Add standard permission for UI
    const existing = await Permission.findOne({ type: 'standard', name: mod.name });
    if (!existing) {
      // (already seeded in last run, but safe check)
    }

    // 3. Add explicit group-access rule for Super Admin
    if (superAdmin) {
       await Permission.updateOne(
         { type: 'group-access', moduleName: mod.name, groupId: superAdmin.id },
         { 
            $set: { 
               type: 'group-access',
               groupId: superAdmin.id,
               moduleName: mod.name,
               category: mod.category,
               read: true,
               write: true,
               delete: true,
               export: true
            } 
         },
         { upsert: true }
       );
       permissionsCount++;
       console.log('Seeded super admin access for:', mod.name);
    }
  }

  // Update permissionsCount in Group
  if (superAdmin) {
     await Group.updateOne({ _id: superAdmin._id }, { $set: { permissionsCount } });
  }

  console.log('Done seeding.');
  process.exit(0);
}
seed().catch(err => { console.error(err); process.exit(1); });

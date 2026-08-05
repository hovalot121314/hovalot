const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  const { username, password } = req.body;

  const admin = await Admin.findOne({ username });
  if (!admin) return res.status(400).json({ error: "Invalid credentials" });

  const match = await admin.comparePassword(password);
  if (!match) return res.status(400).json({ error: "Invalid credentials" });

  const role = admin.role || 'owner';
  const token = jwt.sign({ id: admin._id, role }, process.env.JWT_SECRET || "supersecretkey", { expiresIn: '30d' });

  res.json({ token, role });
};

exports.me = (req, res) => res.json({ success: true, role: req.adminRole || 'owner' });

exports.createAdmin = async () => {
  await Admin.updateMany({ role: { $exists: false } }, { $set: { role: 'owner' } });
  const username = process.env.OWNER_USERNAME || "owner";
  const exists = await Admin.findOne({ username });
  if (!exists) {
    await Admin.create({
      username,
      password: process.env.OWNER_PASSWORD || "123456"
    });
    console.log("✅ Default admin created (owner / 123456)");
  } else if (exists.role !== 'owner') {
    exists.role = 'owner';
    await exists.save();
  }

  const superAdminUsername = process.env.SUPERADMIN_USERNAME || 'marwan';
  const superAdminPassword = process.env.SUPERADMIN_PASSWORD;
  const superAdmin = await Admin.findOne({ username: superAdminUsername });
  if (!superAdmin && superAdminPassword) {
    await Admin.create({ username: superAdminUsername, password: superAdminPassword, role: 'superadmin' });
    console.log(`✅ Super admin created (${superAdminUsername})`);
  } else if (superAdmin && superAdmin.role !== 'superadmin') {
    superAdmin.role = 'superadmin';
    if (superAdminPassword && !(await superAdmin.comparePassword(superAdminPassword))) {
      superAdmin.password = superAdminPassword;
    }
    await superAdmin.save();
  } else if (superAdmin && superAdminPassword && !(await superAdmin.comparePassword(superAdminPassword))) {
    superAdmin.password = superAdminPassword;
    await superAdmin.save();
  } else if (!superAdminPassword && !superAdmin) {
    console.warn('⚠️ SUPERADMIN_PASSWORD is missing; super admin was not created');
  }
};

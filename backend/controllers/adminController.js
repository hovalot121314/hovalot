const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  const { username, password } = req.body;

  const admin = await Admin.findOne({ username });
  if (!admin) return res.status(400).json({ error: "Invalid credentials" });

  const match = await admin.comparePassword(password);
  if (!match) return res.status(400).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET || "supersecretkey", { expiresIn: '30d' });

  res.json({ token });
};

exports.createAdmin = async () => {
  const username = process.env.OWNER_USERNAME || "owner";
  const exists = await Admin.findOne({ username });
  if (!exists) {
    await Admin.create({
      username,
      password: process.env.OWNER_PASSWORD || "123456"
    });
    console.log("✅ Default admin created (owner / 123456)");
  }
};

const jwt = require('jsonwebtoken');

exports.protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Not authorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");
    req.adminId = decoded.id;
    req.adminRole = decoded.role || 'owner';
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

exports.requireSuperAdmin = (req, res, next) => {
  if (req.adminRole !== 'superadmin') return res.status(403).json({ error: 'הפעולה מותרת למנהל המערכת בלבד' });
  next();
};

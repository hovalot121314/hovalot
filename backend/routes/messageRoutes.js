const router = require('express').Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/', async (req, res) => {
  const [data, unreadCount] = await Promise.all([
    Message.find({ admin: req.adminId }).sort({ createdAt: -1 }).limit(100).lean(),
    Message.countDocuments({ admin: req.adminId, readAt: null })
  ]);
  res.json({ success: true, data, unreadCount });
});
router.put('/read-all', async (req, res) => {
  await Message.updateMany({ admin: req.adminId, readAt: null }, { $set: { readAt: new Date() } });
  res.json({ success: true });
});
router.delete('/:id', async (req, res) => {
  const deleted = await Message.findOneAndDelete({ _id: req.params.id, admin: req.adminId });
  if (!deleted) return res.status(404).json({ success: false, error: 'ההודעה לא נמצאה' });
  res.json({ success: true });
});

module.exports = router;

const router = require('express').Router();
const pushService = require('../services/pushService');
const Admin = require('../models/Admin');
const { protect, requireSuperAdmin } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/public-key', async (req, res) => res.json({ publicKey: await pushService.getPublicKey() }));
router.post('/subscribe', async (req, res) => {
  try {
    await pushService.saveSubscription(req.adminId, req.body.subscription, req.headers['user-agent']);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
router.delete('/subscribe', async (req, res) => {
  await pushService.removeSubscription(req.adminId, req.body.endpoint);
  res.json({ success: true });
});
router.post('/test', async (req, res) => {
  const result = await pushService.sendToAdmin(req.adminId, { title: 'התראת בדיקה', body: 'ההתראות פועלות במכשיר הזה.', tag: `test-${Date.now()}` });
  res.json({ success: true, ...result });
});
router.post('/owner-notification', requireSuperAdmin, async (req, res) => {
  const title = String(req.body.title || '').trim();
  const body = String(req.body.body || '').trim();
  if (!title || !body || title.length > 100 || body.length > 800) {
    return res.status(400).json({ success: false, error: 'יש להזין כותרת והודעה תקינות' });
  }
  const owner = await Admin.findOne({ role: 'owner' }).select('_id');
  if (!owner) return res.status(404).json({ success: false, error: 'חשבון בעל העסק לא נמצא' });
  const result = await pushService.sendToAdmin(owner._id, {
    title,
    body,
    url: './dashboard.html',
    tag: `superadmin-message-${Date.now()}`
  });
  res.json({ success: true, ...result });
});

module.exports = router;

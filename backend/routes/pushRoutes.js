const router = require('express').Router();
const pushService = require('../services/pushService');
const { protect } = require('../middleware/authMiddleware');

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

module.exports = router;

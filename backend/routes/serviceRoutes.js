const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const { protect } = require('../middleware/authMiddleware');

/* GET ALL SERVICES */
router.get('/', async (req, res) => {
  const services = await Service.find();
  res.json(services);
});

/* ADD SERVICE */
router.post("/", protect, async (req, res) => {
  const { name, price, duration } = req.body;

  const service = await Service.create({
    name,
    price,
    duration
  });

  res.json(service);
});

/* UPDATE SERVICE */
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, price, duration } = req.body;
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      {
        name: String(name || '').trim(),
        price: Number(price),
        duration: Number(duration)
      },
      { new: true, runValidators: true }
    );

    if (!service) return res.status(404).json({ error: 'השירות לא נמצא' });
    res.json(service);
  } catch (error) {
    res.status(400).json({ error: 'לא ניתן לעדכן את השירות' });
  }
});

/* DELETE SERVICE */
router.delete('/:id', protect, async (req, res) => {
  await Service.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;

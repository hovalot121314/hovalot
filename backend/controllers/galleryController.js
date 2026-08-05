const Gallery = require("../models/Gallery");
const multer = require("multer");

// אחסון בזיכרון (ולא בדיסק)
const storage = multer.memoryStorage();
const upload = multer({ storage });

exports.upload = upload;

// העלאת תמונה ל‑Mongo
exports.addImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const lastImage = await Gallery.findOne().sort({ order: -1 }).select('order').lean();
    const newImage = await Gallery.create({
      image: req.file.buffer,
      contentType: req.file.mimetype,
      order: Number(lastImage?.order || 0) + 1
    });

    res.json({ success: true, id: newImage._id });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// שליפת כל התמונות
exports.getImages = async (req, res) => {
  try {
    const images = await Gallery.find().sort({ order: 1, createdAt: 1 });

    const formatted = images.map(img => ({
      _id: img._id,
      order: img.order,
      image: `data:${img.contentType};base64,${img.image.toString("base64")}`
    }));

    res.json(formatted);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// שמירת הסדר שנבחר בדאשבורד
exports.reorderImages = async (req, res) => {
  try {
    const imageIds = Array.isArray(req.body.imageIds) ? req.body.imageIds : [];
    const existingCount = await Gallery.countDocuments();

    if (imageIds.length !== existingCount || new Set(imageIds).size !== imageIds.length) {
      return res.status(400).json({ error: "Invalid gallery order" });
    }

    const existingIds = await Gallery.find({ _id: { $in: imageIds } }).distinct("_id");
    if (existingIds.length !== existingCount) {
      return res.status(400).json({ error: "Gallery order contains unknown images" });
    }

    await Gallery.bulkWrite(
      imageIds.map((id, index) => ({
        updateOne: {
          filter: { _id: id },
          update: { $set: { order: index + 1 } }
        }
      }))
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// מחיקה
exports.deleteImage = async (req, res) => {
  try {
    await Gallery.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const db = require("../models");
const multer = require("multer");
const path = require("path");

// Multer setup for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`),
});

exports.upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) cb(null, true);
    else cb(new Error("Only images (jpeg, jpg, png) are allowed"));
  },
}).single("image"); // Single image upload for ExternalAd

/**
 *  @method POST
 *  @route  ~/api/external_ad
 *  @desc   Create ExternalAd
 *  @access private only admin 
 */

exports.createExternalAd = async (req, res) => {
  const { content } = req.body;
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    if (userRole !== "admin") {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    if (!content || !req.file) {
      return res.status(400).json({ message: "هناك حقل فارغ" });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const externalAd = await db.ExternalAd.create({
      adminId: userId,
      content,
      imageUrl,
    });

    res.status(201).json({
      message: "تم إضافة الإعلان بنجاح",
      data: externalAd,
    });
  } catch (error) {
    console.error("Error in createExternalAd:", error);
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};

/**
 *  @method GET
 *  @route  ~/api/external_ad
 *  @desc   Read All ExternalAds
 *  @access public anyone
 */

exports.getAllExternalAds = async (req, res) => {

  try {
    const externalAds = await db.ExternalAd.findAll();

    res.status(200).json({
      message: "تم جلب الإعلانات بنجاح",
      data: externalAds,
    });
  } catch (error) {
    console.error("Error in getAllExternalAds:", error);
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};

/**
 *  @method GET
 *  @route  ~/api/external_ad/:id
 *  @desc   Read Single ExternalAd
 *  @access private only admin 
 */
 
exports.getExternalAdById = async (req, res) => {
  const { id } = req.params;
  const userRole = req.user.role;

  try {
    if (userRole !== "admin") {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    const adId = parseInt(id, 10);
    if (isNaN(adId)) {
      return res.status(400).json({ message: "رقم تعريف الإعلان غير صحيح" });
    }

    const externalAd = await db.ExternalAd.findByPk(adId, {
      include: [
        {
          model: db.Account,
          as: "Account",
          attributes: { exclude: ["password"] },
        },
      ],
    });
    if (!externalAd) {
      return res.status(404).json({ message: "هذا الإعلان غير متاح" });
    }

    res.status(200).json({
      message: "تم جلب الإعلان بنجاح",
      data: externalAd,
    });
  } catch (error) {
    console.error("Error in getExternalAdById:", error);
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};

/**
 *  @method PUT
 *  @route  ~/api/external_ad/:id
 *  @desc   Update ExternalAd
 *  @access private only admin 
 */

exports.updateExternalAd = async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const userRole = req.user.role;

  try {
    if (userRole !== "admin") {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    const adId = parseInt(id, 10);
    if (isNaN(adId)) {
      return res.status(400).json({ message: "رقم تعريف الإعلان غير صحيح" });
    }

    const externalAd = await db.ExternalAd.findByPk(adId);
    if (!externalAd) {
      return res.status(404).json({ message: "هذا الإعلان غير متاح" });
    }

    let imageUrl = externalAd.imageUrl;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    await externalAd.update({
        content: content || externalAd.content,
      imageUrl,
    });

    const updatedAd = await db.ExternalAd.findByPk(adId, {
      include: [
        {
          model: db.Account,
          as: "Account",
          attributes: { exclude: ["password"] },
        },
      ],
    });

    res.status(200).json({
      message: "تم تعديل الإعلان بنجاح",
      data: updatedAd,
    });
  } catch (error) {
    console.error("Error in updateExternalAd:", error);
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};

/**
 *  @method DELETE
 *  @route  ~/api/external_ad/:id
 *  @desc   Delete ExternalAd
 *  @access private only admin 
 */

exports.deleteExternalAd = async (req, res) => {
  const { id } = req.params;
  const userRole = req.user.role;

  try {
    if (userRole !== "admin") {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    const adId = parseInt(id, 10);
    if (isNaN(adId)) {
      return res.status(400).json({ message: "رقم تعريف الإعلان غير صحيح" });
    }

    const externalAd = await db.ExternalAd.findByPk(adId);
    if (!externalAd) {
      return res.status(404).json({ message: "هذا الإعلان غير متاح" });
    }

    await externalAd.destroy();

    res.status(200).json({
      message: "تم حذف الإعلان بنجاح",
    });
  } catch (error) {
    console.error("Error in deleteExternalAd:", error);
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};
const express = require("express");
const auth = require("../middleware/auth");
const { upload,createExternalAd, getAllExternalAds, getExternalAdById, updateExternalAd, deleteExternalAd } = require("../controllers/externalAd");

const router = express.Router();
router.post("/", auth(), upload, createExternalAd);
router.get("/", auth(), getAllExternalAds);
router.get("/:id", auth(), getExternalAdById);
router.put("/:id", auth(), upload, updateExternalAd);
router.delete("/:id", auth(), deleteExternalAd);

module.exports = router;
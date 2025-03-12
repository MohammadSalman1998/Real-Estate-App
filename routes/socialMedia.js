const express = require("express");
const { createSocialMedia, getSocialMedia, updateSocialMedia, deleteSocialMedia } = require("../controllers/socialMedia");
const auth = require("../middleware/auth");
const router = express.Router();

router.post("/", auth(), createSocialMedia);
router.get("/:companyId", getSocialMedia); 
router.put("/:companyId", auth(), updateSocialMedia);
router.delete("/:companyId", auth(), deleteSocialMedia);

module.exports = router;
const express = require("express");
const { createAboutUs, getAllAboutUs, getAboutUsById, updateAboutUs, deleteAboutUs } = require("../controllers/aboutUs");
const auth = require("../middleware/auth");
const router = express.Router();

router.post("/", auth(), createAboutUs);
router.get("/", auth(), getAllAboutUs);
router.get("/:companyId", auth(), getAboutUsById);
router.put("/:id", auth(), updateAboutUs);
router.delete("/:id", auth(), deleteAboutUs);

module.exports = router;
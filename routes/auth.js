const express = require("express");
const { register, registerCompany, login, logout } = require("../controllers/auth");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const router = express.Router();

// Register admin or customer
router.post("/register", upload.single("profileImageUrl"), register);

// Register company (admin only)
router.post("/company/register", auth("admin"), upload.single("profileImageUrl"), registerCompany);

// Login for all roles
router.post("/login", login);

router.post("/logout", auth(), logout);

module.exports = router;


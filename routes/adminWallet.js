const express = require("express");
const { getAdminWallet } = require("../controllers/adminWallet");
const auth = require("../middleware/auth");
const router = express.Router();

router.get("/admin", auth(), getAdminWallet);

module.exports = router;
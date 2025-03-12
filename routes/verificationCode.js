const express = require("express");
const auth = require("../middleware/auth");
const { getAllVerificationCodes } = require("../controllers/verificationCode");


const router = express.Router();

router.get("/", auth(), getAllVerificationCodes); 

module.exports = router;
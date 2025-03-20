const express = require("express");
const auth = require("../middleware/auth");
const { getAllTransactions } = require("../controllers/transaction");
const router = express.Router();

router.get("/", auth(), getAllTransactions); 

module.exports = router;
const express = require("express");
const { createComplaint, getAllComplaints, getUserComplaints, deleteComplaint } = require("../controllers/complaint");
const auth = require("../middleware/auth");
const router = express.Router();

router.post("/", auth(), createComplaint);
router.get("/all", auth(), getAllComplaints); 
router.get("/my", auth(), getUserComplaints); 
router.delete("/:id", auth(), deleteComplaint);

module.exports = router;
const express = require("express");
const { createReservation, getUserReservations, getCompanyReservations, deleteReservation, getReservations } = require("../controllers/reservation");
const auth = require("../middleware/auth");
const router = express.Router();

router.post("/", auth(), createReservation);
router.get("/", auth(), getReservations);
router.get("/my", auth(), getUserReservations); // User’s reservations
router.get("/company", auth(), getCompanyReservations); // Company’s reservations
router.delete("/:id", auth(), deleteReservation);

module.exports = router;
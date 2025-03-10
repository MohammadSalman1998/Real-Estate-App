const express = require("express");
const auth = require("../middleware/auth");
const { addToFavorites, getFavorites, removeFromFavorites } = require("../controllers/favorite");



const router = express.Router();

router.post("/", auth(), addToFavorites); 
router.get("/myFavorites", auth(), getFavorites);
router.delete("/removeFavorite", auth(), removeFromFavorites);

module.exports = router;
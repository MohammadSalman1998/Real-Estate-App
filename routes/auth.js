const express = require("express");
const { register, registerCompany, login, logout, editAccount, getAllAccounts, getAccountById, deleteAccount } = require("../controllers/auth");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const router = express.Router();

// Register admin or customer
router.post("/register", upload.single("profileImageUrl"), register);

// Register company (admin only)
router.post("/company/register", auth("admin"), upload.single("profileImageUrl"), registerCompany);

// Login for all roles
router.post("/login", login);

// logout for all roles
router.post("/logout", auth(), logout);

// edit account 
router.put("/editAccount/:id", auth(), upload.single("profileImageUrl"), editAccount); 

// get all accounts (admin only) 
router.get("/accounts", auth(), getAllAccounts);

// get account by id
router.get("/account/:id", auth(), getAccountById);

// delete account by id (admin only)
router.delete("/account/:id", auth(), deleteAccount);
module.exports = router;


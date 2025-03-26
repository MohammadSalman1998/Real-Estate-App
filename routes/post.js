const express = require("express");
const { createPost, acceptPost, rejectPost, getAllPosts, getPostsByStatus, getPostsByType, editPost, deletePost, filterPosts, getPostById, getCompanyPostById } = require("../controllers/post");
const auth = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only images (jpeg, jpg, png) are allowed"));
    }
  },
});

const router = express.Router();

router.post(
  "/",
  auth(),
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "images", maxCount: 10 },
  ]),
  createPost
);
router.get("/filter", auth(), filterPosts);
router.put("/:id/accept", auth(), acceptPost);
router.put("/:id/reject", auth(), rejectPost);
router.get("/", auth(), getAllPosts);              
router.get("/status/:status", auth(), getPostsByStatus); 
router.get("/type/:type", auth(), getPostsByType); 
router.get("/:id", auth(), getPostById); 
router.get("/my/:id", auth(), getCompanyPostById); 
router.put(
  "/:id",
  auth(),
  upload.fields([{ name: "mainImage", maxCount: 1 }, { name: "images", maxCount: 10 }]), 
  editPost
);
router.delete("/:id", auth(), deletePost);

module.exports = router;
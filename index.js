require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const db = require("./models");
const fs = require("fs");
const path = require("path");

// Create uploads folder if it doesn't exist
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const app = express();

// Enable CORS for all origins
app.use(cors({
  origin: "*", // Allow all origins
  methods: ["GET", "POST", "PUT", "DELETE"], // Allowed methods
  allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
}));

app.use(cors());
app.use(express.json()); 
app.use("/uploads", express.static("uploads")); // Serve uploaded images

app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// db.sequelize.sync({ alter: true }).then(() => {
//   console.log("Database synced");
// }).catch((error) => {
//   console.error("Error syncing database:", error);
// });
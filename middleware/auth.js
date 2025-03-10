const jwt = require("jsonwebtoken");
const db = require("../models");

const auth = (role) => async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    // Check if token is blacklisted
    const blacklisted = await db.BlacklistedToken.findOne({ where: { token } });
    if (blacklisted) {
      return res.status(401).json({ message: "انتهت الجلسة، الرجاء إعادة تسجيل الدخول." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    if (role && decoded.role !== role) {
      return res.status(403).json({ message: "Unauthorized: Insufficient role" });
    }
    next();
  } catch (error) {
    res.status(401).json({ message: "انتهت الجلسة، الرجاء إعادة تسجيل الدخول" });
  }
};

module.exports = auth;
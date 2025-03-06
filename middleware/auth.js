const jwt = require("jsonwebtoken");

const auth = (role) => async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // content of id, role and name
    if (role && decoded.role !== role) {
      return res.status(403).json({ message: "Unauthorized: Only admins can perform this action" });
    }
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = auth;
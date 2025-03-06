const db = require("../models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");

exports.register = async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  try {
    // Validate inputs
    if (!name || !email || !password || !role) {
      return res
        .status(400)
        .json({ message: "Name, email, password, and role are required" });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }
    if (!["admin", "user"].includes(role)) {
      return res
        .status(400)
        .json({ message: "Role is required" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle image upload for customer
    let profileImageUrl = null;
    if (role === "user" && req.file) {
      profileImageUrl = `/uploads/${req.file.filename}`;
    }

    // Create account
    const account = await db.Account.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role,
    });

    // If customer, create Customer record
    let customer;
    if (role === "user") {
      customer = await db.Customer.create({
        customerId: account.id,
        profileImageUrl,
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: account.id, role: account.role, name: account.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(201).json({
      message: `${
        role === "admin" ? "Admin" : "Customer"
      } registered successfully`,
      data: { account, customer },
      token,
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ message: "Email already in use" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.registerCompany = async (req, res) => {
  const { name, email, password, phone, address, location, auth_code } =
    req.body;

  try {
    // Validate inputs
    if (!name || !email || !password || !auth_code || !address || !location) {
      return res
        .status(400)
        .json({ message: "Name, email, password, address, location, and auth_code are required" });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    // Check verification code
    const verification = await db.VerificationCode.findOne({
      where: {
        code: auth_code,
      },
    });

    if (verification) {
      return res
        .status(403)
        .json({ message: "commercial code already in use" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle image upload
    let profileImageUrl = null;
    if (req.file) {
      profileImageUrl = `/uploads/${req.file.filename}`;
    }

    // Create account
    const account = await db.Account.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: "company",
    });

    // Create company
    const company = await db.Company.create({
      companyId: account.id,
      address,
      location,
      authCode: auth_code,
      profileImageUrl,
    });

    const commercialCode = await db.VerificationCode.create({
      code: auth_code,
      companyId: company.id,
    });

    // Generate token
    const token = jwt.sign(
      { id: account.id, role: "company", name: account.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(201).json({
      message: "Company registered successfully",
      data: { account, company },
      token,
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res
        .status(400)
        .json({ message: "Email or auth_code already in use" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const account = await db.Account.findOne({ where: { email } });
    if (!account || !(await bcrypt.compare(password, account.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: account.id, role: account.role, name: account.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful",
      data: { role: account.role, id: account.id },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

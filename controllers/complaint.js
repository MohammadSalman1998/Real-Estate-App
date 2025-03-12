const db = require("../models");

/**
 *  @method POST
 *  @route  ~/api/complaint
 *  @desc   Create Complaint
 *  @access private only user
 */

exports.createComplaint = async (req, res) => {
  const { content, companyId } = req.body;
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    if (userRole !== "user") {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    if (!content || !companyId) {
      return res.status(400).json({ message: "حدد المحتوى والشركة المرادة" });
    }

    const customer = await db.Customer.findOne({ where: { customerId: userId } });
    if (!customer) {
      return res.status(404).json({ message: "تأكد من حسابك" });
    }

    const company = await db.Company.findByPk(companyId);
    if (!company) {
      return res.status(404).json({ message: "هذه الشركة غير متاحة حاليا" });
    }

    const complaint = await db.Complaint.create({
      customerId: customer.id,
      companyId,
      content,
    });

    res.status(201).json({
      message: "تم إرسال الشكوى بنجاح، نسعى دائما لتحقيق مطالبكم",
      data: complaint,
    });
  } catch (error) {
    console.error("Error in createComplaint:", error);
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};

/**
 *  @method GET
 *  @route  ~/api/complaint/all
 *  @desc   Read All Complaints
 *  @access private only (Admin)
 */

exports.getAllComplaints = async (req, res) => {
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    let complaints;
    if (userRole === "admin") {
      complaints = await db.Complaint.findAll({
        include: [
          { model: db.Customer, as: "Customer",attributes:{exclude: ['walletBalance']}, include: [{ model: db.Account, as: "Account", attributes: { exclude: ['password'] } }] },
          { model: db.Company, as: "Company",attributes:{exclude: ['walletBalance']}, include: [{ model: db.Account, as: "Account", attributes: { exclude: ['password'] } }] },
        ],
      });
    } else {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    res.status(200).json({
      message: "تم جلب الشكاوي بنجاح",
      data: complaints,
    });
  } catch (error) {
    console.error("Error in getAllComplaints:", error);
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};


/**
 *  @method GET
 *  @route  ~/api/complaint/my
 *  @desc   Read User’s Complaints
 *  @access private only (user)
 */

exports.getUserComplaints = async (req, res) => {
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    if (userRole !== "user") {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    const customer = await db.Customer.findOne({ where: { customerId: userId } });
    if (!customer) {
      return res.status(404).json({ message: "تأكد من حسابك" });
    }

    const complaints = await db.Complaint.findAll({
      where: { customerId: customer.id },
      include: [
        { model: db.Company, as: "Company",attributes:{exclude: ['walletBalance']}, include: [{ model: db.Account, as: "Account", attributes: { exclude: ["password"] } }] },
      ],
    });

    res.status(200).json({
      message: "تم استرجاع شكواك بنجاح",
      data: complaints,
    });
  } catch (error) {
    console.error("Error in getUserComplaints:", error);
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};


/**
 *  @method DELETE
 *  @route  ~/api/complaint/:id
 *  @desc   Delete Complaint
 *  @access private only (Admin)
 */

exports.deleteComplaint = async (req, res) => {
  const { id } = req.params;
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    const complaintId = parseInt(id, 10);
    if (isNaN(complaintId)) {
      return res.status(400).json({ message: "تأكد من رقم تعريف الشكوى" });
    }

    const complaint = await db.Complaint.findByPk(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: "هذه الشكوى غير متاحة" });
    }

    if (userRole !== "admin") {
        return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    await complaint.destroy();

    res.status(200).json({
      message: "تم حذف الشكوى بنجاح",
    });
  } catch (error) {
    console.error("Error in deleteComplaint:", error);
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};
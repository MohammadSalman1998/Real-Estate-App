const db = require("../models");


/**
 *  @method GET
 *  @route  ~/api/verificationCode
 *  @desc   Get all verificationCode of companies
 *  @access private (admin only)
 */


exports.getAllVerificationCodes = async (req, res) => {
    const userRole = req.user.role;
    const userId = req.user.id;
  
    try {
      let whereClause = {};
      let includeOptions = [
        { model: db.Company, as: "Company",attributes:{exclude: ['walletBalance']}, include: [{ model: db.Account, as: "Account", attributes: { exclude: ['password'] } }] },
    ];
  
      if (userRole !== "admin") {
        return res.status(403).json({ message: "ليس لديك الصلاحية" });
      }
  
      const verificationCode = await db.VerificationCode.findAll({
        where: whereClause,
        include: includeOptions,
      });
  
      res.status(200).json({
        message: "تم جلب السجلات التجارية بنجاح",
        data: verificationCode,
      });
    } catch (error) {
      console.error("خطأ في جلب البيانات:", error);
      res.status(500).json({ message: "خطأ في الخادم", error: error.message });
    }
};
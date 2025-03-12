const db = require("../models");

/**
 *  @method GET
 *  @route  ~/api/wallet/admin
 *  @desc   Get Admin Wallet
 *  @access private only admin 
 */

exports.getAdminWallet = async (req, res) => {
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    if (userRole !== "admin") {
      return res.status(403).json({ message: "ليس لديك الصلاحية: المدراء فقط يمكنهم عرض المحفظة" });
    }

    // Fetch the admin’s account
    const adminAccount = await db.Account.findByPk(userId);
    if (!adminAccount || adminAccount.role !== "admin") {
      return res.status(404).json({ message: "لم يتم العثور على حساب المدير" });
    }

    // Fetch the admin’s wallet
    const adminWallet = await db.Wallet.findOne({ where: { adminId: userId } });
    if (!adminWallet) {
      return res.status(404).json({ message: "لم يتم العثور على محفظة المدير" });
    }

    res.status(200).json({
      message: "تم استرجاع بيانات المحفظة بنجاح",
      data: {
        adminId: adminWallet.adminId,
        walletBalance: adminWallet.walletBalance,
        createdAt: adminWallet.createdAt,
        updatedAt: adminWallet.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error in getAdminWallet:", error);
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};
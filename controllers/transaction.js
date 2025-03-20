const db = require("../models");



/**
 *  @method GET
 *  @route  ~/api/transaction
 *  @desc   Get all transactions
 *  @access private (admin only)
 */

exports.getAllTransactions = async (req, res) => {
  const userRole = req.user.role;

  try {

    if (userRole !== "admin") {
        return res.status(403).json({ message: "ليس لديك الصلاحية" });
    } 
    let whereClause = {};
    const includeOptions = [
        {
          model: db.Company,
          as: "Company",
          attributes: { exclude: ["walletBalance"] },
          include: [
            {
              model: db.Account,
              as: "Account",
              attributes: { exclude: ["password"] },
            },
          ],
        },
        {
          model: db.Customer,
          as: "Customer",
          attributes: { exclude: ["walletBalance"] },
          include: [
            {
              model: db.Account,
              as: "Account",
              attributes: { exclude: ["password"] },
            },
          ],
        },
        {
          model: db.Reservation,
          as: "Reservation", 
          include: [
            {
              model: db.Post,
              as: "Post",
              include: [
                { model: db.Villa, as: "Villa" },
                { model: db.CommercialStore, as: "CommercialStore" },
                { model: db.House, as: "House" },
              ],
            },
            {
              model: db.Customer,
              as: "Customer",
              include: [
                {
                  model: db.Account,
                  as: "Account",
                  attributes: { exclude: ["password"] },
                },
              ],
            },
          ],
        },
      ];

    const transactions = await db.Transaction.findAll({
      where: whereClause,
      include: includeOptions,
    });


    res.status(200).json({
      message: "تم جلب عمليات التحويل بنجاح",
      data: transactions,
    });
  } catch (error) {
    console.error("خطأ في جلب البيانات:", error);
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};
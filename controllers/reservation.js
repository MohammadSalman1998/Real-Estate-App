const db = require("../models");
const schedule = require('node-schedule'); 

/**
 *  @method POST
 *  @route  ~/api/reservation
 *  @desc   create new reservation and Transaction mony
 *  @access private (User only)
 */



exports.createReservation = async (req, res) => {
  const { postId, email } = req.body;
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    if (userRole !== "user") {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }


    if (!postId) {
      return res.status(400).json({ message: "مطلوب معرف المنشور" });
    }

    const postIdInt = parseInt(postId, 10);
    if (isNaN(postIdInt)) {
      return res.status(400).json({ message: "معرف المنشور غير صالح" });
    }

    // Fetch the user's account to verify email
    const account = await db.Account.findByPk(userId);
    if (!account) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }

    // Verify the provided email matches the account's email
    // if (!email) {
    //   return res.status(400).json({ message: "يرجى تقديم الإيميل لتأكيد الحجز" });
    // }
    // if (email !== account.email) {
    //   return res.status(400).json({ message: "الإيميل المقدم غير مطابق لإيميل الحساب" });
    // }

    // Start a transaction to ensure atomicity
    const result = await db.sequelize.transaction(async (t) => {
      // Fetch user’s customer (with walletBalance)
      const customer = await db.Customer.findOne({ where: { customerId: userId }, transaction: t });
      if (!customer) {
        throw new Error("لم يتم العثور على ملف تعريف المستخدم");
      }

      // Fetch post and company (with walletBalance)
      const post = await db.Post.findByPk(postIdInt, {
        include: [{ model: db.Account, as: "Account" }],
        transaction: t,
      });
      if (!post || post.status !== "accepted" || !post.negotiable) {
        throw new Error("لم يتم العثور على المنشور أو غير متاح للحجز");
      }
      const companyId = post.companyId;
      if (!companyId) {
        throw new Error("الشركة غير مرتبطة بهذا العقار");
      }
      const company = await db.Company.findOne({ where: { companyId }, transaction: t });
      if (!company) {
        throw new Error("لم يتم العثور على ملف تعريف الشركة");
      }

      // Fetch admin and admin wallet
      const adminAccount = await db.Account.findOne({ where: { role: "admin" }, transaction: t });
      if (!adminAccount) {
        throw new Error("لم يتم العثور على ملف تعريف المدير");
      }
      const adminWallet = await db.Wallet.findOne({ where: { adminId: adminAccount.id }, transaction: t });
      if (!adminWallet) {
        throw new Error("لم يتم العثور على محفظة المسؤول");
      }

      // Determine the amount based on type (rent or sale)
      const amount = post.deposit;
      if (!amount || amount <= 0) {
        throw new Error(`لا يوجد سعر صالح للمنشور`);
      }

      // Calculate admin fee and company amount
      const adminFee = amount * 0.10; // 10% to admin
      const companyAmount = amount - adminFee; // 90% to company

      // Check user’s wallet balance
      if (customer.walletBalance < amount) {
        // throw new Error("رصيد المحفظة غير كافٍ");
        return res.status(400).json({ message: "رصيد المحفظة غير كافٍ" });
      }

      // Update wallets with explicit DECIMAL handling
      await customer.update(
        { walletBalance: parseFloat(customer.walletBalance) - amount },
        { transaction: t }
      );
      await company.update(
        { walletBalance: parseFloat(company.walletBalance) + companyAmount },
        { transaction: t }
      );
      await adminWallet.update(
        { walletBalance: parseFloat(adminWallet.walletBalance) + adminFee },
        { transaction: t }
      );

      // Set post negotiable to false
      await post.update(
        { negotiable: false },
        { transaction: t }
      );

      // Create reservation with the full amount as depositAmount
      const reservation = await db.Reservation.create(
        {
          postId: postIdInt,
          customerId: customer.id,
          depositAmount: amount, // Full rentPrice or salePrice
        },
        { transaction: t }
      );

      // Create transaction record
      const transaction = await db.Transaction.create(
        {
          customerId: customer.id,
          companyId: companyId,
          reservationId: reservation.id,
          amountReceived: companyAmount,
          adminFee,
        },
        { transaction: t }
      );

      return { reservation, transaction, post };
    });

    // Schedule the negotiable status to revert to true after 48 hours
    const revertNegotiableDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now
    // const revertNegotiableDate = new Date(Date.now() + 5 * 60 * 1000); // 1 minute from now
    schedule.scheduleJob(revertNegotiableDate, async () => {
      try {
        const post = await db.Post.findByPk(postIdInt);
        if (post && post.status === "accepted") { // Only revert if post still exists and is accepted
          await post.update({ negotiable: true });
          console.log(`Post ${postIdInt} negotiable status reverted to true`);
        } else {
          console.log(`Post ${postIdInt} was deleted or not eligible for negotiable revert`);
        }
      } catch (error) {
        console.error(`Error reverting negotiable status for post ${postIdInt}:`, error);
      }
    });

    res.status(201).json({
      message: "تمت معالجة الحجز والدفع بنجاح يرجى اكمال الدفع خلال ٤٨ ساعة ",
      data: {
        reservation: result.reservation,
        transaction: result.transaction,
      },
    });
  } catch (error) {
    console.error("Error in createReservation:", error);
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};


/**
 *  @method GET
 *  @route  ~/api/reservation
 *  @desc   Read User’s Reservations
 *  @access private (admin only)
 */

exports.getReservations = async (req, res) => {
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    if (userRole !== "admin") {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }


    const reservations = await db.Reservation.findAll({
      include: [
        { model: db.Customer, as: "Customer",attributes: { exclude: ["walletBalance"] }, include: [{ model: db.Account, as: "Account", attributes: { exclude: ["password"] } }] },
        { model: db.Post, as: "Post", include: [{ model: db.Account, as: "Account", attributes: { exclude: ["password"] } }] },
       
      ],
    });

    res.status(200).json({
      message: "تم جلب البيانات بنجاح",
      data: reservations,
    });
  } catch (error) {
    console.error("Error in getReservations:", error);
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

/**
 *  @method GET
 *  @route  ~/api/reservation/my
 *  @desc   Read User’s Reservations
 *  @access private (User only)
 */

exports.getUserReservations = async (req, res) => {
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    if (userRole !== "user") {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    const customer = await db.Customer.findOne({ where: { customerId: userId } });
    if (!customer) {
      return res.status(404).json({ message: "لم يتم التعرف على حساب المستخدم" });
    }

    const reservations = await db.Reservation.findAll({
      where: { customerId: customer.id },
      include: [
        { model: db.Post, as: "Post", include: [{ model: db.Account, as: "Account", attributes: { exclude: ["password"] } }] },
       
      ],
    });

    res.status(200).json({
      message: "تم جلب البيانات بنجاح",
      data: reservations,
    });
  } catch (error) {
    console.error("Error in getUserReservations:", error);
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

/**
 *  @method GET
 *  @route  ~/api/reservation/company
 *  @desc   Read Company’s Reservations
 *  @access private (Company only)
 */

exports.getCompanyReservations = async (req, res) => {
  const userRole = req.user.role;
  const userId = req.user.id;
  const isActive = req.user.isActive;

  try {
    if (userRole !== "company") {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    const company = await db.Company.findOne({ where: { companyId: userId } });
    if (!company) {
      return res.status(404).json({ message: "لم يتم التعرف على حساب الشركة" });
    }

      // Check if the account is active
      if (!isActive) {
        return res.status(403).json({ message: "هذا الحساب غير نشط" });
      }

    const reservations = await db.Reservation.findAll({
      include: [
        {
          model: db.Post,
          as: "Post",
          where: { companyId: company.companyId },
          include: [{ model: db.Account, as: "Account", attributes: { exclude: ["password"] } }],
        },
        { model: db.Customer, as: "Customer",attributes: { exclude: ["walletBalance"] }, include: [{ model: db.Account, as: "Account", attributes: { exclude: ["password"] } }] },
        { model: db.Transaction, as: "Transactions",attributes: { exclude: ["adminFee"] } },
      ],
    });

    res.status(200).json({
      message: "تم جلب البيانات بنجاح",
      data: reservations,
    });
  } catch (error) {
    console.error("Error in getCompanyReservations:", error);
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

/**
 *  @method DELETE
 *  @route  ~/api/reservation/:id
 *  @desc   Delete Reservation (for testing, typically not allowed in production)
 *  @access private 
 */

exports.deleteReservation = async (req, res) => {
  const { id } = req.params;
  const userRole = req.user.role;
  const userId = req.user.id;
  const isActive = req.user.isActive;

  try {
    const reservationId = parseInt(id, 10);
    if (isNaN(reservationId)) {
      return res.status(400).json({ message: "معرف الحجز غير صالح" });
    }

    const reservation = await db.Reservation.findByPk(reservationId, {
      include: [{ model: db.Post, as: "Post" }],
    });
    if (!reservation) {
      return res.status(404).json({ message: "لم يتم العثور على الحجز" });
    }

    if (userRole === "admin") {
      // Admins can delete any
    } else if (userRole === "user") {
      const customer = await db.Customer.findOne({ where: { customerId: userId } });
      if (!customer || reservation.customerId !== customer.id) {
        return res.status(403).json({ message: "انظر: يمكنك فقط حذف حجوزاتك الخاصة." });
      }
    } else if (userRole === "company") {
      const company = await db.Company.findOne({ where: { companyId: userId } });
      if (!company || reservation.Post.companyId !== company.companyId) {
        return res.status(403).json({ message: "غير مصرح به: يمكنك فقط حذف الحجوزات الخاصة بمنشوراتك" });
      }
    } else {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

      // Check if the account is active
      if (!isActive) {
        return res.status(403).json({ message: "هذا الحساب غير نشط" });
      }

    await reservation.destroy();

    res.status(200).json({
      message: "تم حذف الحجز بنجاح",
    });
  } catch (error) {
    console.error("Error in deleteReservation:", error);
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};
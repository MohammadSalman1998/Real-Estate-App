const db = require("../models");

/**
 *  @method POST
 *  @route  ~/api/about_us
 *  @desc   Create AboutUs
 *  @access private only admin or company
 */

exports.createAboutUs = async (req, res) => {
  const { description, mission, vision } = req.body;
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    if (userRole !== "admin" && userRole !== "company") {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    if (!description) {
      return res.status(400).json({ message: "حقل الوصف مطلوب" });
    }

    let company;
    if (userRole === "company") {
      company = await db.Company.findOne({ where: { companyId: userId } });
      if (!company) {
        return res.status(404).json({ message: "حساب هذه الشركة غير متاح" });
      }
    } else if (userRole === "admin" && !req.body.companyId) {
      return res.status(400).json({ message: "قم بتحديد رقم تعريف الشركة" });
    }

    const companyId = userRole === "company" ? company.id : parseInt(req.body.companyId, 10);
    if (userRole === "admin" && isNaN(companyId)) {
      return res.status(400).json({ message: "رقم التعريف لحساب الشركة خاطئ" });
    }

    // Check if AboutUs already exists for this company
    const existingAboutUs = await db.AboutUs.findOne({ where: { companyId } });
    if (existingAboutUs) {
      return res.status(400).json({ message: "بيانات التعريف للشركة موجودة بالفعل" });
    }

    const aboutUs = await db.AboutUs.create({
      companyId,
      description,
      mission: mission || null,
      vision: vision || null,
    });

    res.status(201).json({
      message: "تم اضافة بيانات التعريف بنجاح",
      data: aboutUs,
    });
  } catch (error) {
    console.error("Error in createAboutUs:", error);
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};

/**
 *  @method GET
 *  @route  ~/api/about_us
 *  @desc   Read All AboutUs
 *  @access private only admin 
 */

exports.getAllAboutUs = async (req, res) => {
  const userRole = req.user.role;

  try {
    if (userRole !== "admin") {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    const aboutUsList = await db.AboutUs.findAll({
      include: [
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
      ],
    });

    res.status(200).json({
      message: "تم جلب البيانات بنجاح",
      data: aboutUsList,
    });
  } catch (error) {
    console.error("Error in getAllAboutUs:", error);
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};

/**
 *  @method GET
 *  @route  ~/api/about_us/:id
 *  @desc   Read Single AboutUs
 *  @access public
 */

exports.getAboutUsById = async (req, res) => {
    const { companyId } = req.params;

    try {
      const companyIdInt = parseInt(companyId, 10);
      if (isNaN(companyIdInt)) {
        return res.status(400).json({ message: "رقم تعريف الشركة خاطئ" });
      }
  
      const aboutUs = await db.AboutUs.findOne({
        where: { companyId: companyIdInt },
        include: [
          {
            model: db.Company,
            as: "Company",
            attributes: { exclude: ["walletBalance"] },
            include: [
              {
                model: db.Account,
                as: "Account",
                attributes: ["id", "name", "email"], 
              },
            ],
          },
        ],
      });
  
      if (!aboutUs) {
        return res.status(404).json({ message: "لا توجد بيانات لتلك الشركة" });
      }
  
      res.status(200).json({
        message: "تم جلب البيانات بنجاح",
        data: aboutUs,
      });
    } catch (error) {
      console.error("Error in getPublicAboutUs:", error);
      res.status(500).json({ message: "خطأ من الخادم", error: error.message });
    }
};

/**
 *  @method PUT
 *  @route  ~/api/about_us/:id
 *  @desc   Update AboutUs
 *  @access private only admin or company
 */

exports.updateAboutUs = async (req, res) => {
  const { id } = req.params;
  const { description, mission, vision } = req.body;
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    const aboutUsId = parseInt(id, 10);
    if (isNaN(aboutUsId)) {
      return res.status(400).json({ message: "رقم التعريف خاطئ" });
    }

    const aboutUs = await db.AboutUs.findByPk(aboutUsId);
    if (!aboutUs) {
      return res.status(404).json({ message: "بيانات تلك الشركة غير متاحة" });
    }

    // Authorization: Admin or owning company
    if (userRole !== "admin") {
      if (userRole !== "company") {
        return res.status(403).json({ message: "ليس لديك الصلاحية" });
      }
      const company = await db.Company.findOne({ where: { companyId: userId } });
      if (!company || aboutUs.companyId !== company.id) {
        return res.status(403).json({ message: "ليس لديك الصلاحية" });
      }
    }

    await aboutUs.update({
      description: description || aboutUs.description,
      mission: mission !== undefined ? mission : aboutUs.mission,
      vision: vision !== undefined ? vision : aboutUs.vision,
    });

    const updatedAboutUs = await db.AboutUs.findByPk(aboutUsId, {
      include: [
        {
          model: db.Company,
          as: "Company",
          attributes: {exclude:["walletBalance"]},
          include: [
            {
              model: db.Account,
              as: "Account",
              attributes: { exclude: ["password"] },
            },
          ],
        },
      ],
    });

    res.status(200).json({
      message: "تم تعديل البيانات بنجاح",
      data: updatedAboutUs,
    });
  } catch (error) {
    console.error("Error in updateAboutUs:", error);
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};

/**
 *  @method DELETE
 *  @route  ~/api/about_us/:id
 *  @desc   Delete AboutUs
 *  @access private only admin or company
 */

exports.deleteAboutUs = async (req, res) => {
  const { id } = req.params;
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    const aboutUsId = parseInt(id, 10);
    if (isNaN(aboutUsId)) {
      return res.status(400).json({ message: "رقم التعريف خاطئ" });
    }

    const aboutUs = await db.AboutUs.findByPk(aboutUsId);
    if (!aboutUs) {
      return res.status(404).json({ message: "هذه البيانات غير موجودة" });
    }

    // Authorization: Admin or owning company
    if (userRole !== "admin") {
      if (userRole !== "company") {
        return res.status(403).json({ message: "ليس لديك الصلاحية" });
      }
      const company = await db.Company.findOne({ where: { companyId: userId } });
      if (!company || aboutUs.companyId !== company.id) {
        return res.status(403).json({ message: "ليس لديك الصلاحية" });
      }
    }

    await aboutUs.destroy();

    res.status(200).json({
      message: "تم الحذف بنجاح",
    });
  } catch (error) {
    console.error("Error in deleteAboutUs:", error);
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};
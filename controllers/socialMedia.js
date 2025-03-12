const db = require("../models");

/**
 *  @method POST
 *  @route  ~/api/socialMedia
 *  @desc   Create SocialMedia
 *  @access private only company
 */


exports.createSocialMedia = async (req, res) => {
  const { facebook, twitter, instagram, whatsapp, telegram, linkedin, companyId } = req.body;
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    if (userRole !== "company") {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    let finalCompanyId;
    if (userRole === "company") {
      const company = await db.Company.findOne({ where: { companyId: userId } });
      if (!company) return res.status(404).json({ message: "تأكد من حسابك" });
      finalCompanyId = company.id;
    }

    const existingSocialMedia = await db.SocialMedia.findOne({ where: { companyId: finalCompanyId } });
    if (existingSocialMedia) {
      return res.status(400).json({ message: "وسائل التواصل الاجتماعي موجودة بالفعل لهذه الشركة" });
    }

    // Validation function to check if URL starts with http:// or https://
    const validateUrl = (url) => {
      if (!url) return true; // Allow null/undefined
      return /^(http:\/\/|https:\/\/)/i.test(url);
    };

    // Check each social media field
    const socialMediaFields = { facebook, twitter, instagram, whatsapp, telegram, linkedin };
    for (const [field, value] of Object.entries(socialMediaFields)) {
      if (value && !validateUrl(value)) {
        return res.status(400).json({
          message: `رابط ${field} يجب أن يبدأ بـ "http://" أو "https://"`
        });
      }
    }

    const socialMedia = await db.SocialMedia.create({
      companyId: finalCompanyId,
      facebook: facebook || null,
      twitter: twitter || null,
      instagram: instagram || null,
      whatsapp: whatsapp || null,
      telegram: telegram || null,
      linkedin: linkedin || null,
    });

    res.status(201).json({
      message: "تم إنشاء وسائل التواصل الاجتماعي بنجاح",
      data: socialMedia,
    });
  } catch (error) {
    console.error("Error in createSocialMedia:", error);
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};

/**
 *  @method GET
 *  @route  ~/api/socialMedia/:companyId
 *  @desc   Read SocialMedia 
 *  @access public by companyId
 */
 
exports.getSocialMedia = async (req, res) => {
  const { companyId } = req.params;

  try {
    const companyIdInt = parseInt(companyId, 10);
    if (isNaN(companyIdInt)) {
      return res.status(400).json({ message: "تأكد من رقم تعريف الشركة" });
    }

    const socialMedia = await db.SocialMedia.findOne({
      where: { companyId: companyIdInt },
      include: [
        { model: db.Company, as: "Company",attributes: { exclude: ["walletBalance"] }, include: [{ model: db.Account, as: "Account", attributes: { exclude: ["password"] } }] },
      ],
    });

    if (!socialMedia) {
      return res.status(404).json({ message: "لم يتم العثور على وسائل التواصل الاجتماعي لهذه الشركة" });
    }

    res.status(200).json({
      message: "تم استرجاع وسائل التواصل الاجتماعي بنجاح",
      data: socialMedia,
    });
  } catch (error) {
    console.error("Error in getSocialMedia:", error);
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

/**
 *  @method PUT
 *  @route  ~/api/socialMedia/:companyId
 *  @desc   Update SocialMedia 
 *  @access private only company
 */


exports.updateSocialMedia = async (req, res) => {
  const { companyId } = req.params;
  const { facebook, twitter, instagram, whatsapp, telegram, linkedin } = req.body;
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    const companyIdInt = parseInt(companyId, 10);
    if (isNaN(companyIdInt)) {
      return res.status(400).json({ message: "تأكد من رقم تعريف الشركة" });
    }

    const socialMedia = await db.SocialMedia.findOne({ where: { companyId: companyIdInt } });
    if (!socialMedia) {
      return res.status(404).json({ message: "لم يتم العثور على وسائل التواصل الاجتماعي لهذه الشركة" });
    }

    if (userRole === "company") {
      const company = await db.Company.findOne({ where: { companyId: userId } });
      if (!company || socialMedia.companyId !== company.id) {
        return res.status(403).json({ message: "ليس لديك الصلاحية" });
      }
    } else {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    // Validation function to check if URL starts with http:// or https://
    const validateUrl = (url) => {
      if (url === undefined || url === null) return true; // Allow undefined/null (no change)
      return /^(http:\/\/|https:\/\/)/i.test(url);
    };

    // Check each social media field if provided
    const socialMediaFields = { facebook, twitter, instagram, whatsapp, telegram, linkedin };
    for (const [field, value] of Object.entries(socialMediaFields)) {
      if (value !== undefined && !validateUrl(value)) {
        return res.status(400).json({
          message: `رابط ${field} يجب أن يبدأ بـ "http://" أو "https://"`
        });
      }
    }

    await socialMedia.update({
      facebook: facebook !== undefined ? facebook : socialMedia.facebook,
      twitter: twitter !== undefined ? twitter : socialMedia.twitter,
      instagram: instagram !== undefined ? instagram : socialMedia.instagram,
      whatsapp: whatsapp !== undefined ? whatsapp : socialMedia.whatsapp,
      telegram: telegram !== undefined ? telegram : socialMedia.telegram,
      linkedin: linkedin !== undefined ? linkedin : socialMedia.linkedin,
    });

    const updatedSocialMedia = await db.SocialMedia.findOne({
      where: { companyId: companyIdInt },
      include: [
        { model: db.Company, as: "Company", attributes: { exclude: ["walletBalance"] }, include: [{ model: db.Account, as: "Account", attributes: { exclude: ["password"] } }] },
      ],
    });

    res.status(200).json({
      message: "تم تحديث وسائل التواصل الاجتماعي بنجاح",
      data: updatedSocialMedia,
    });
  } catch (error) {
    console.error("Error in updateSocialMedia:", error);
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};


/**
 *  @method DELETE
 *  @route  ~/api/socialMedia/:companyId
 *  @desc   Delete SocialMedia 
 *  @access private only company
 */

exports.deleteSocialMedia = async (req, res) => {
  const { companyId } = req.params;
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    const companyIdInt = parseInt(companyId, 10);
    if (isNaN(companyIdInt)) {
      return res.status(400).json({ message: "تأكد من رقم تعريف الشركة" });
    }

    const socialMedia = await db.SocialMedia.findOne({ where: { companyId: companyIdInt } });
    if (!socialMedia) {
      return res.status(404).json({ message: "لم يتم العثور على وسائل التواصل الاجتماعي لهذه الشركة" });
    }

    if (userRole === "company") {
      const company = await db.Company.findOne({ where: { companyId: userId } });
      if (!company || socialMedia.companyId !== company.id) {
        return res.status(403).json({ message: "ليس لديك الصلاحية" });
      }
    } else {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    await socialMedia.destroy();

    res.status(200).json({
      message: "تم حذف وسائل التواصل الاجتماعي بنجاح",
    });
  } catch (error) {
    console.error("Error in deleteSocialMedia:", error);
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};
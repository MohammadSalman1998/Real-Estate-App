const db = require("../models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");


/**
 *  @method POST
 *  @route  ~/api/auth/register
 *  @desc   create new account
 *  @access public admin or customer
 */


exports.register = async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    // Validate inputs
    if (!name || !email || !password ) {
      return res
        .status(400)
        .json({ message: "هذه الحقول مطلوبة: الاسم، الإيميل وكلمة المرور" });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "صيغة الإيميل غير صحيحة" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "كلمة المرور يجب ان تكون على الأقل 6 أحرف" });
    }


    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle image upload for customer
    let profileImageUrl = null;
    if (req.file) {
      profileImageUrl = `/uploads/${req.file.filename}`;
    }

    const role = 'user'
    // Create account
    const account = await db.Account.create({ 
      name,
      email,
      password: hashedPassword,
      phone,
      role,
    });


     const customer = await db.Customer.create({
        customerId: account.id,
        profileImageUrl,
      });

    const data = {
      name,
      email,
      phone,
      role,
      customer
    }

    // Generate token
    const token = jwt.sign(
      { id: account.id, role: account.role, name: account.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(201).json({
      message: `${
        role 
      } تم إنشاء الحساب بنجاح`,
      data,
      token,
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ message: "هذا الإيميل موجود مسبقا" });
    }
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};

/**
 *  @method POST
 *  @route  ~/api/auth/company/register
 *  @desc   create new company account
 *  @access public 
 */

exports.registerCompany = async (req, res) => {
  const { name, email, password, phone, webSiteURL, location, auth_code } = req.body;
  
  try {
    // Validate inputs
    if (!name || !email || !password || !auth_code  || !location) {
      return res.status(400).json({
        message: "هذه الحقول مطلوبة: الاسم، الإيميل، كلمة المرور، عنوان الشركة ورقم السجل التجاري",
      });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "صيغة الإيميل غير صحيحة" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "كلمة المرور يجب ان تكون على الأقل 6 أحرف" });
    }

    // Validate webSiteURL starts with http:// or https://
    if (!/^(http:\/\/|https:\/\/)/i.test(webSiteURL)) {
      return res.status(400).json({
        message: "عنوان موقع الويب يجب أن يبدأ بـ 'http://' أو 'https://'",
      });
    }

    // Check verification code
    const verification = await db.VerificationCode.findOne({
      where: { code: auth_code },
    });
    if (verification) {
      return res.status(403).json({ message: "رقم السجل التجاري موجود مسبقا" });
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
      isActive: false,
    });

    // Create company
    const company = await db.Company.create({
      companyId: account.id,
      webSiteURL,
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

    const data = {
      name,
      email,
      phone,
      role: "company",
      company,
    };

    res.status(201).json({
      message: "تم انشاء حساب شركة جديدة بنجاح وهو في انتظار التفعيل",
      data,
      token,
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ message: "الإيميل أو رقم السجل التجاري موجود مسبقا" });
    }
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};

/**
 *  @method POST
 *  @route  ~/api/auth/login
 *  @desc   login to app
 *  @access public 
 */

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "هذه الحقول مطلوبة: الإيميل وكلمة المرور" });
    }

   

    const account = await db.Account.findOne({ where: { email } });
    if (!account || !(await bcrypt.compare(password, account.password))) {
      return res.status(401).json({ message: "الإيميل أو كلمة المرور غير صحيحة" });
    }

     // Check if the account is active
     if (!account.isActive) {
      return res.status(403).json({ message: "هذا الحساب غير نشط، لا يمكنك تسجيل الدخول" });
    }

    let additionalId = null;
    if (account.role === "user") {
      const customer = await db.Customer.findOne({ where: { customerId: account.id } });
      additionalId = customer ? customer.id : null; // Customer table's primary key (id)
    } else if (account.role === "company") {
      const company = await db.Company.findOne({ where: { companyId: account.id } });
      additionalId = company ? company.id : null; // Company table's primary key (id)
    }

    const token = jwt.sign(
      { id: account.id, role: account.role, name: account.name, isActive: account.isActive },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

   res.status(200).json({
      message: "تم تسجيل الدخول بنجاح",
      data: {
        id: account.id, // Account table's id
        role: account.role,
        isActive: account.isActive,
        ...(account.role === "user" && { customerId: additionalId }), // Customer table's id
        ...(account.role === "company" && { companyId: additionalId }), // Company table's id
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};

/**
 *  @method POST
 *  @route  ~/api/auth/logout
 *  @desc   logout from app
 *  @access public 
 */

exports.logout = async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return res.status(400).json({ message: "ليس لديك الصلاحية" });
  }

  try {
    // Add token to blacklist
    await db.BlacklistedToken.create({ token });
    res.status(200).json({ message: "تم تسجيل الخروج بنجاح" });
  } catch (error) {
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};


/**
 *  @method PUT
 *  @route  ~/api/auth/editAccount/:id
 *  @desc   update data account (admin can updata any account, customer can update all his data , company can updata only {name , profile image and walletBalance})
 *  @access private 
 */


exports.editAccount = async (req, res) => {
  const { id } = req.params;
  const {
    name, email, password, oldPassword, phone, address, location, webSiteURL, authCode, walletBalance, profileImageUrl,isActive,
    description, mission, vision, // AboutUs fields
    facebook, twitter, instagram, whatsapp, telegram, linkedin // SocialMedia fields
  } = req.body;
  const userRole = req.user.role; // From JWT
  const userId = req.user.id;     // From JWT

  let prevWalletBalance;
  try {
    const accountId = parseInt(id, 10);
    if (isNaN(accountId)) {
      return res.status(400).json({ message: "رقم الحساب غير صحيح" });
    }

    // Authorization check
    if (userRole !== "admin" && accountId !== userId) {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    const account = await db.Account.findByPk(accountId);
    if (!account) {
      return res.status(404).json({ message: "هذا الحساب غير موجود" });
    }

      // Check if the account is active
      if (!account.isActive) {
        return res.status(403).json({ message: "هذا الحساب غير نشط" });
      }

    // Define allowed updates based on role
    const accountUpdates = {};

    // Admin can edit everything
    if (userRole === "admin") {
      if (name) accountUpdates.name = name;
      if (email && validator.isEmail(email)) accountUpdates.email = email;
      else if (email) return res.status(400).json({ message: "صيغة الإيميل غير صحيحة" });
      if (password && password.length >= 6) accountUpdates.password = await bcrypt.hash(password, 10);
      else if (password) return res.status(400).json({ message: "كلمة المرور يجب ان تكون على الأقل 6 أحرف" });
      if (phone && (phone.length >= 7 && phone.length <= 20)) accountUpdates.phone = phone;
      else if (phone) return res.status(400).json({ message: "رقم الهاتف يجب ان يكون بين 7 و 20 رقم" });
      if (isActive !== undefined) accountUpdates.isActive = isActive; // Only admin can change isActive
    }
    // Customer (user) can edit Account fields with old password verification
    else if (userRole === "user" && account.role === "user") {
      if (name) accountUpdates.name = name;
      if (email && validator.isEmail(email)) accountUpdates.email = email;
      else if (email) return res.status(400).json({ message: "صيغة الإيميل غير صحيحة" });
      if (password) {
        if (!oldPassword) {
          return res.status(400).json({ message: "يرجى تقديم كلمة المرور القديمة لتغيير كلمة المرور" });
        }
        const isMatch = await bcrypt.compare(oldPassword, account.password);
        if (!isMatch) {
          return res.status(400).json({ message: "كلمة المرور القديمة غير صحيحة" });
        }
        if (password.length < 6) {
          return res.status(400).json({ message: "كلمة المرور يجب ان تكون على الأقل 6 أحرف" });
        }
        accountUpdates.password = await bcrypt.hash(password, 10);
      }
      if (phone && (phone.length >= 7 && phone.length <= 20)) accountUpdates.phone = phone;
      else if (phone) return res.status(400).json({ message: "رقم الهاتف يجب ان يكون بين 7 و 20 رقم" });
      if (isActive !== undefined) {
        return res.status(403).json({ message: "ليس لديك الصلاحية لتغيير حالة التفعيل" });
      }
    }
    // Company can edit limited fields with old password verification
    else if (userRole === "company" && account.role === "company") {
      if (name) accountUpdates.name = name;
      if (password) {
        if (!oldPassword) {
          return res.status(400).json({ message: "يرجى تقديم كلمة المرور القديمة لتغيير كلمة المرور" });
        }
        const isMatch = await bcrypt.compare(oldPassword, account.password);
        if (!isMatch) {
          return res.status(400).json({ message: "كلمة المرور القديمة غير صحيحة" });
        }
        if (password.length < 6) {
          return res.status(400).json({ message: "كلمة المرور يجب ان تكون على الأقل 6 أحرف" });
        }
        accountUpdates.password = await bcrypt.hash(password, 10);
      }
      if (phone && (phone.length >= 7 && phone.length <= 20)) accountUpdates.phone = phone;
      else if (phone) return res.status(400).json({ message: "رقم الهاتف يجب ان يكون بين 7 و 20 رقم" });
      if (email) {
        return res.status(403).json({ message: "صلاحية تعديل ملفك تكمن في: الاسم، صورة البروفايل، المبلغ في المحفظة، معلومات عنا، ووسائل التواصل الاجتماعي" });
      }
      if (isActive !== undefined) {
        return res.status(403).json({ message: "ليس لديك الصلاحية لتغيير حالة التفعيل" });
      }
    } else {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    // Apply Account updates
    await account.update(accountUpdates);

    // Handle profile image
    let newProfileImageUrl = null;
    if (req.file) {
      newProfileImageUrl = `/uploads/${req.file.filename}`;
    }

    let combinedData = {
      id: account.id,
      name: account.name,
      email: account.email,
      phone: account.phone || null,
      role: account.role,
      createdAt: account.createdAt,
    };

    if (account.role === "company") {
      const company = await db.Company.findOne({ where: { companyId: accountId } });
      prevWalletBalance = company.walletBalance;
      if (!company) return res.status(404).json({ message: "هذا الحساب غير موجود" });

      // Validate webSiteURL
      if (webSiteURL && !/^(http:\/\/|https:\/\/)/i.test(webSiteURL)) {
        return res.status(400).json({
          message: "عنوان موقع الويب يجب أن يبدأ بـ 'http://' أو 'https://'",
        });
      }

      // Validation function for social media URLs
      const validateUrl = (url) => {
        if (url === undefined || url === null) return true; // Allow undefined/null
        return /^(http:\/\/|https:\/\/)/i.test(url);
      };

      // Check social media fields
      const socialMediaFields = { facebook, twitter, instagram, whatsapp, telegram, linkedin };
      for (const [field, value] of Object.entries(socialMediaFields)) {
        if (value !== undefined && !validateUrl(value)) {
          return res.status(400).json({
            message: `رابط ${field} يجب أن يبدأ بـ "http://" أو "https://"`
          });
        }
      }

      const companyUpdates = {};
      if (userRole === "admin") {
        if (webSiteURL) companyUpdates.webSiteURL = webSiteURL;
        if (location) companyUpdates.location = location;
        if (authCode) companyUpdates.authCode = authCode;
        if (walletBalance !== undefined)     return res.status(403).json({ message: "ليس لديك الصلاحية" });
        if (newProfileImageUrl) companyUpdates.profileImageUrl = newProfileImageUrl;
      } else if (userRole === "company") {
        if (webSiteURL) companyUpdates.webSiteURL = webSiteURL;
        if (location) companyUpdates.location = location;
        if (newProfileImageUrl) companyUpdates.profileImageUrl = newProfileImageUrl;
        if (walletBalance !== undefined) companyUpdates.walletBalance = parseInt(walletBalance) + parseInt(prevWalletBalance);
        if ( authCode) {
          return res.status(403).json({ message: "صلاحية تعديل ملفك تكمن في: جميع البيانات عدا الأيميل و رقم السجل التجاري" });
        }
      }
      await company.update(companyUpdates);

      // Handle AboutUs
      let aboutUs = await db.AboutUs.findOne({ where: { companyId: company.id } });
      if (userRole === "admin" || userRole === "company") {
        if (description || mission !== undefined || vision !== undefined) {
          if (aboutUs) {
            await aboutUs.update({
              description: description || aboutUs.description,
              mission: mission !== undefined ? mission : aboutUs.mission,
              vision: vision !== undefined ? vision : aboutUs.vision,
            });
          } else {
            aboutUs = await db.AboutUs.create({
              companyId: company.id,
              description: description || "",
              mission: mission || "",
              vision: vision || "",
            });
          }
        }
      }

      // Handle SocialMedia
      let socialMedia = await db.SocialMedia.findOne({ where: { companyId: company.id } });
      if (userRole === "admin" || userRole === "company") {
        if (facebook !== undefined || twitter !== undefined || instagram !== undefined || whatsapp !== undefined || telegram !== undefined || linkedin !== undefined) {
          if (socialMedia) {
            await socialMedia.update({
              facebook: facebook !== undefined ? facebook : socialMedia.facebook,
              twitter: twitter !== undefined ? twitter : socialMedia.twitter,
              instagram: instagram !== undefined ? instagram : socialMedia.instagram,
              whatsapp: whatsapp !== undefined ? whatsapp : socialMedia.whatsapp,
              telegram: telegram !== undefined ? telegram : socialMedia.telegram,
              linkedin: linkedin !== undefined ? linkedin : socialMedia.linkedin,
            });
          } else {
            socialMedia = await db.SocialMedia.create({
              companyId: company.id,
              facebook: facebook || null,
              twitter: twitter || null,
              instagram: instagram || null,
              whatsapp: whatsapp || null,
              telegram: telegram || null,
              linkedin: linkedin || null,
            });
          }
        }
      }

      // Merge Company, AboutUs, and SocialMedia data into response
      Object.assign(combinedData, {
        webSiteURL: company.webSiteURL,
        location: company.location,
        authCode: company.authCode,
        walletBalance: company.walletBalance,
        profileImageUrl: company.profileImageUrl,
        aboutUs: aboutUs ? {
          description: aboutUs.description,
          mission: aboutUs.mission,
          vision: aboutUs.vision,
        } : null,
        socialMedia: socialMedia ? {
          facebook: socialMedia.facebook,
          twitter: socialMedia.twitter,
          instagram: socialMedia.instagram,
          whatsapp: socialMedia.whatsapp,
          telegram: socialMedia.telegram,
          linkedin: socialMedia.linkedin,
        } : null,
      });
    } else if (account.role === "user") {
      const customer = await db.Customer.findOne({ where: { customerId: accountId } });
      prevWalletBalance = customer.walletBalance;
      if (!customer) return res.status(404).json({ message: "هذا الحساب غير موجود" });

      const customerUpdates = {};
      if (userRole === "admin" || userRole === "user") {
        if (newProfileImageUrl) customerUpdates.profileImageUrl = newProfileImageUrl;
        if (walletBalance !== undefined) customerUpdates.walletBalance = parseInt(walletBalance) + parseInt(prevWalletBalance);
      }
      await customer.update(customerUpdates);

      // Merge Customer data into response
      Object.assign(combinedData, {
        profileImageUrl: customer.profileImageUrl,
        walletBalance: customer.walletBalance,
      });
    }

    res.status(200).json({
      message: "تم تعديل الحساب بنجاح",
      data: combinedData,
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ message: "هذا الإيميل موجود مسبقا" });
    }
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};


/**
 *  @method GET
 *  @route  ~/api/auth/accounts
 *  @desc   get all accounts 
 *  @access private (only admin)
 */

exports.getAllAccounts = async (req, res) => {
  const userRole = req.user.role;

  try {
    // Restrict to admin only
    if (userRole !== "admin") {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    const accounts = await db.Account.findAll();

    // Map accounts to include Customer or Company data
    const accountsWithData = await Promise.all(
      accounts.map(async (account) => {
        let combinedData = {
          id: account.id,
          name: account.name,
          email: account.email,
          phone: account.phone || null,
          role: account.role,
          isActive: account.isActive,
          createdAt: account.createdAt,
        };

        if (account.role === "company") {
          const company = await db.Company.findOne({ where: { companyId: account.id } });
          if (company) {
            Object.assign(combinedData, {
              webSiteURL: company.webSiteURL,
              location: company.location,
              authCode: company.authCode,
              walletBalance: company.walletBalance,
              profileImageUrl: company.profileImageUrl,
            });
          }
        } else if (account.role === "user") {
          const customer = await db.Customer.findOne({ where: { customerId: account.id } });
          if (customer) {
            Object.assign(combinedData, {
              profileImageUrl: customer.profileImageUrl,
              walletBalance: customer.walletBalance,
            });
          }
        }

        return combinedData;
      })
    );

    res.status(200).json({
      message: "تم جلب البيانات بنجاح",
      data: accountsWithData,
    });
  } catch (error) {
    console.error("خطأ في جلب البيانات:", error);
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};



/**
 *  @method GET
 *  @route  ~/api/auth/account/:id
 *  @desc   get account data (admin can get any account, customer and company can get only his account)
 *  @access private 
 */


exports.getAccountById = async (req, res) => {
  const { id } = req.params;
  const userRole = req.user.role; // "admin", "company", or "user"
  const userId = req.user.id;

  try {
    const accountId = parseInt(id, 10);
    if (isNaN(accountId)) {
      return res.status(400).json({ message: "رقم الحساب غير صحيح" });
    }

    // Fetch the requested account
    const account = await db.Account.findByPk(accountId);
    if (!account) {
      return res.status(404).json({ message: "هذا الحساب غير موجود" });
    }

    // Check if the account is active
    if (!account.isActive) {
      return res.status(403).json({ message: "هذا الحساب غير نشط" });
    }

    // Authorization Logic
    if (userRole === "admin") {
      // Admin can view any account
    } else if (userRole === "company" || userRole === "user") {
      // Companies and users can view their own account or any company account
      if (accountId !== userId && account.role !== "company") {
        return res.status(403).json({ message: "ليس لديك الصلاحية" });
      }
    } else {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    // Base account data
    let combinedData = {
      id: account.id,
      name: account.name,
      email: account.email,
      phone: account.phone || null,
      role: account.role,
      isActive: account.isActive,
      createdAt: account.createdAt,
    };

    // Include additional data based on role
    if (account.role === "company") {
      const company = await db.Company.findOne({ where: { companyId: accountId } });
      if (company) {
        Object.assign(combinedData, {
          webSiteURL: company.webSiteURL,
          location: company.location,
          authCode: company.authCode,
          walletBalance: company.walletBalance,
          profileImageUrl: company.profileImageUrl,
          companyID: company.id,
        });
      }
    } else if (account.role === "user") {
      const customer = await db.Customer.findOne({ where: { customerId: accountId } });
      if (customer) {
        Object.assign(combinedData, {
          profileImageUrl: customer.profileImageUrl,
          walletBalance: customer.walletBalance,
          customerId: customer.id,
        });
      }
    }

    res.status(200).json({
      message: "تم جلب البيانات بنجاح",
      data: combinedData,
    });
  } catch (error) {
    console.error("خطأ في جلب البيانات:", error);
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};


/**
 *  @method DELETE
 *  @route  ~/api/auth/account/:id
 *  @desc   delete account
 *  @access private only admin 
 */

exports.deleteAccount = async (req, res) => {
  const { id } = req.params;
  const userRole = req.user.role;

  try {
    const accountId = parseInt(id, 10);
    if (isNaN(accountId)) {
      return res.status(400).json({ message: "رقم الحساب غير صحيح" });
    }

    // Restrict to admin only
    if (userRole !== "admin") {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    const account = await db.Account.findByPk(accountId);
    if (!account) {
      return res.status(404).json({ message: "هذا الحساب غير موجود" });
    }

    // Delete related Customer or Company data based on role
    if (account.role === "company") {
      const company = await db.Company.findOne({ where: { companyId: accountId } });
      if (company) {
        await company.destroy();
      }
    } else if (account.role === "user") {
      const customer = await db.Customer.findOne({ where: { customerId: accountId } });
      if (customer) {
        await customer.destroy();
      }
    }

    // Delete the Account
    await account.destroy();

    res.status(200).json({
      message: "تم حذف الحساب بنجاح",
      data: { id: accountId },
    });
  } catch (error) {
    console.error("خطأ بحذف الحساب:", error);
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};


// exports.editAccount = async (req, res) => {
//   const { id } = req.params;
//   const {
//     name, email, password, phone, address, location, webSiteURL, authCode, walletBalance, profileImageUrl,
//     description, mission, vision, // AboutUs fields
//     facebook, twitter, instagram, whatsapp, telegram, linkedin // SocialMedia fields
//   } = req.body;
//   const userRole = req.user.role; // From JWT
//   const userId = req.user.id;     // From JWT

//   let prevWalletBalance;
//   try {
//     const accountId = parseInt(id, 10);
//     if (isNaN(accountId)) {
//       return res.status(400).json({ message: "رقم الحساب غير صحيح" });
//     }

//     // Authorization check
//     if (userRole !== "admin" && accountId !== userId) {
//       return res.status(403).json({ message: "ليس لديك الصلاحية" });
//     }

//     const account = await db.Account.findByPk(accountId);
//     if (!account) {
//       return res.status(404).json({ message: "هذا الحساب غير موجود" });
//     }

//     // Define allowed updates based on role
//     const accountUpdates = {};

//     // Admin can edit everything
//     if (userRole === "admin") {
//       if (name) accountUpdates.name = name;
//       if (email && validator.isEmail(email)) accountUpdates.email = email;
//       else if (email) return res.status(400).json({ message: "صيغة الإيميل غير صحيحة" });
//       if (password && password.length >= 6) accountUpdates.password = await bcrypt.hash(password, 10);
//       else if (password) return res.status(400).json({ message: "كلمة المرور يجب ان تكون على الأقل 6 أحرف" });
//       if (phone && (phone.length >= 7 && phone.length <= 20)) accountUpdates.phone = phone;
//       else if (phone) return res.status(400).json({ message: "رقم الهاتف يجب ان يكون بين 7 و 20 رقم" });
//     }
//     // Customer can edit all Account fields
//     else if (userRole === "user" && account.role === "user") {
//       if (name) accountUpdates.name = name;
//       if (email && validator.isEmail(email)) accountUpdates.email = email;
//       else if (email) return res.status(400).json({ message: "صيغة الإيميل غير صحيحة" });
//       if (password && password.length >= 6) accountUpdates.password = await bcrypt.hash(password, 10);
//       else if (password) return res.status(400).json({ message: "كلمة المرور يجب ان تكون على الأقل 6 أحرف" });
//       if (phone && (phone.length >= 7 && phone.length <= 20)) accountUpdates.phone = phone;
//       else if (phone) return res.status(400).json({ message: "رقم الهاتف يجب ان يكون بين 7 و 20 رقم" });
//     }
//     // Company can edit name, profileImageUrl, walletBalance, AboutUs, and SocialMedia
//     else if (userRole === "company" && account.role === "company") {
//       if (name) accountUpdates.name = name;
//       if (password && password.length >= 6) accountUpdates.password = await bcrypt.hash(password, 10);
//       else if (password) return res.status(400).json({ message: "كلمة المرور يجب ان تكون على الأقل 6 أحرف" });
//       if (email || phone) {
//         return res.status(403).json({ message: "صلاحية تعديل ملفك تكمن في: الاسم، صورة البروفايل، المبلغ في المحفظة، معلومات عنا، ووسائل التواصل الاجتماعي" });
//       }
//     } else {
//       return res.status(403).json({ message: "ليس لديك الصلاحية" });
//     }

//     // Apply Account updates
//     await account.update(accountUpdates);

//     // Handle profile image
//     let newProfileImageUrl = null;
//     if (req.file) {
//       newProfileImageUrl = `/uploads/${req.file.filename}`;
//     }

//     let combinedData = {
//       id: account.id,
//       name: account.name,
//       email: account.email,
//       phone: account.phone || null,
//       role: account.role,
//       createdAt: account.createdAt,
//     };

//     if (account.role === "company") {
//       const company = await db.Company.findOne({ where: { companyId: accountId } });
//       prevWalletBalance = company.walletBalance;
//       if (!company) return res.status(404).json({ message: "هذا الحساب غير موجود" });

//       // Validate webSiteURL
//       if (webSiteURL && !/^(http:\/\/|https:\/\/)/i.test(webSiteURL)) {
//         return res.status(400).json({
//           message: "عنوان موقع الويب يجب أن يبدأ بـ 'http://' أو 'https://'",
//         });
//       }

//       // Validation function for social media URLs
//       const validateUrl = (url) => {
//         if (url === undefined || url === null) return true; // Allow undefined/null
//         return /^(http:\/\/|https:\/\/)/i.test(url);
//       };

//       // Check social media fields
//       const socialMediaFields = { facebook, twitter, instagram, whatsapp, telegram, linkedin };
//       for (const [field, value] of Object.entries(socialMediaFields)) {
//         if (value !== undefined && !validateUrl(value)) {
//           return res.status(400).json({
//             message: `رابط ${field} يجب أن يبدأ بـ "http://" أو "https://"`
//           });
//         }
//       }

//       const companyUpdates = {};
//       if (userRole === "admin") {
//         if (webSiteURL) companyUpdates.webSiteURL = webSiteURL;
//         if (location) companyUpdates.location = location;
//         if (authCode) companyUpdates.authCode = authCode;
//         if (walletBalance !== undefined) companyUpdates.walletBalance = parseInt(walletBalance) + parseInt(prevWalletBalance);
//         if (newProfileImageUrl) companyUpdates.profileImageUrl = newProfileImageUrl;
//       } else if (userRole === "company") {
//         if (newProfileImageUrl) companyUpdates.profileImageUrl = newProfileImageUrl;
//         if (walletBalance !== undefined) companyUpdates.walletBalance = parseInt(walletBalance) + parseInt(prevWalletBalance);
//         if (address || location || webSiteURL || authCode) {
//           return res.status(403).json({ message: "صلاحية تعديل ملفك تكمن في: الاسم، صورة البروفايل، المبلغ في المحفظة، معلومات عنا، ووسائل التواصل الاجتماعي" });
//         }
//       }
//       await company.update(companyUpdates);

//       // Handle AboutUs
//       let aboutUs = await db.AboutUs.findOne({ where: { companyId: company.id } });
//       if (userRole === "admin" || userRole === "company") {
//         if (description || mission !== undefined || vision !== undefined) {
//           if (aboutUs) {
//             await aboutUs.update({
//               description: description || aboutUs.description,
//               mission: mission !== undefined ? mission : aboutUs.mission,
//               vision: vision !== undefined ? vision : aboutUs.vision,
//             });
//           } else {
//             aboutUs = await db.AboutUs.create({
//               companyId: company.id,
//               description: description || "",
//               mission: mission || "",
//               vision: vision || "",
//             });
//           }
//         }
//       }

//       // Handle SocialMedia
//       let socialMedia = await db.SocialMedia.findOne({ where: { companyId: company.id } });
//       if (userRole === "admin" || userRole === "company") {
//         if (facebook !== undefined || twitter !== undefined || instagram !== undefined || whatsapp !== undefined || telegram !== undefined || linkedin !== undefined) {
//           if (socialMedia) {
//             await socialMedia.update({
//               facebook: facebook !== undefined ? facebook : socialMedia.facebook,
//               twitter: twitter !== undefined ? twitter : socialMedia.twitter,
//               instagram: instagram !== undefined ? instagram : socialMedia.instagram,
//               whatsapp: whatsapp !== undefined ? whatsapp : socialMedia.whatsapp,
//               telegram: telegram !== undefined ? telegram : socialMedia.telegram,
//               linkedin: linkedin !== undefined ? linkedin : socialMedia.linkedin,
//             });
//           } else {
//             socialMedia = await db.SocialMedia.create({
//               companyId: company.id,
//               facebook: facebook || null,
//               twitter: twitter || null,
//               instagram: instagram || null,
//               whatsapp: whatsapp || null,
//               telegram: telegram || null,
//               linkedin: linkedin || null,
//             });
//           }
//         }
//       }

//       // Merge Company, AboutUs, and SocialMedia data into response
//       Object.assign(combinedData, {
//         webSiteURL: company.webSiteURL,
//         location: company.location,
//         authCode: company.authCode,
//         walletBalance: company.walletBalance,
//         profileImageUrl: company.profileImageUrl,
//         aboutUs: aboutUs ? {
//           description: aboutUs.description,
//           mission: aboutUs.mission,
//           vision: aboutUs.vision,
//         } : null,
//         socialMedia: socialMedia ? {
//           facebook: socialMedia.facebook,
//           twitter: socialMedia.twitter,
//           instagram: socialMedia.instagram,
//           whatsapp: socialMedia.whatsapp,
//           telegram: socialMedia.telegram,
//           linkedin: socialMedia.linkedin,
//         } : null,
//       });
//     } else if (account.role === "user") {
//       const customer = await db.Customer.findOne({ where: { customerId: accountId } });
//       prevWalletBalance = customer.walletBalance;
//       if (!customer) return res.status(404).json({ message: "هذا الحساب غير موجود" });

//       const customerUpdates = {};
//       if (userRole === "admin" || userRole === "user") {
//         if (newProfileImageUrl) customerUpdates.profileImageUrl = newProfileImageUrl;
//         if (walletBalance !== undefined) customerUpdates.walletBalance = parseInt(walletBalance) + parseInt(prevWalletBalance);
//       }
//       await customer.update(customerUpdates);

//       // Merge Customer data into response
//       Object.assign(combinedData, {
//         profileImageUrl: customer.profileImageUrl,
//         walletBalance: customer.walletBalance,
//       });
//     }

//     res.status(200).json({
//       message: "تم تعديل الحساب بنجاح",
//       data: combinedData,
//     });
//   } catch (error) {
//     if (error.name === "SequelizeUniqueConstraintError") {
//       return res.status(400).json({ message: "هذا الإيميل موجود مسبقا" });
//     }
//     res.status(500).json({ message: "خطأ من الخادم", error: error.message });
//   }
// };
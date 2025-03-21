const db = require("../models");
const path = require("path");
const { Op } = require("sequelize");

/**
 *  @method POST
 *  @route  ~/api/post
 *  @desc   Create a post with type-specific data and images
 *  @access private only company
 */

exports.createPost = async (req, res) => {
  const {
    type,
    salePrice,
    rentPrice,
    negotiable,
    rejectionReason,
    deposit,
    ...typeSpecificData
  } = req.body;
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    if (userRole !== "company") {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    if (!type || !["villa", "commercial_store", "house"].includes(type)) {
      return res.status(400).json({ message: "نوع المنشور غير صحيح" });
    }

    const account = await db.Account.findByPk(userId);
    if (!account || account.role !== "company") {
      return res
        .status(404)
        .json({ message: "حساب الشركة غير موجود أو ليس شركة" });
    }

    const company = await db.Company.findOne({ where: { companyId: userId } });
    if (!company) {
      return res.status(404).json({ message: "بيانات الشركة غير موجودة" });
    }

    if (!salePrice && !rentPrice) {
      return res
        .status(404)
        .json({ message: "سعر المبيع أو الإيجار مطلوب إحداهما" });
    }
    if (!deposit) {
      return res.status(404).json({ message: "حدد مبلغ الرعبون المطلوب" });
    }

    let mainImageUrl = null;
    if (req.files && req.files.mainImage) {
      mainImageUrl = `/uploads/${req.files.mainImage[0].filename}`;
    }

    const post = await db.Post.create({
      companyId: userId,
      type,
      salePrice: salePrice || null,
      rentPrice: rentPrice || null,
      deposit,
      negotiable: negotiable === "true" || negotiable === true || true,
      mainImageUrl,
      status: "pending",
    });

    // Handle type-specific data
    if (type === "villa") {
      const { landArea, buildingArea, poolArea, description } =
        typeSpecificData;
      if (!landArea || !buildingArea) {
        await post.destroy(); // Rollback if invalid
        return res
          .status(400)
          .json({ message: "مطلوب مساحة الارض ومساحة البناء للفيلا" });
      }
      await db.Villa.create({
        postId: post.id,
        landArea,
        buildingArea,
        poolArea: poolArea || null,
        description: description || null,
      });
    } else if (type === "commercial_store") {
      const { area, location, description } = typeSpecificData;
      if (!area || !location) {
        await post.destroy();
        return res
          .status(400)
          .json({ message: "المساحة والموقع مطلوبان للمتجر التجاري" });
      }
      await db.CommercialStore.create({
        postId: post.id,
        area,
        location,
        description,
      });
    } else if (type === "house") {
      const { area, location, description } = typeSpecificData;
      if (!area || !location) {
        await post.destroy();
        return res
          .status(400)
          .json({ message: "المساحة والموقع مطلوبان للمنزل" });
      }
      await db.House.create({
        postId: post.id,
        area,
        location,
        description: description || null,
      });
    }

    // Handle additional images
    if (req.files && req.files.images) {
      const imageRecords = req.files.images.map((file) => ({
        postId: post.id,
        imageUrl: `/uploads/${file.filename}`,
      }));
      await db.PostImage.bulkCreate(imageRecords);
    }

    // Fetch full post data
    const fullPost = await db.Post.findByPk(post.id, {
      include: [
        { model: db.Villa, as: "Villa" },
        { model: db.CommercialStore, as: "CommercialStore" },
        { model: db.House, as: "House" },
        { model: db.PostImage, as: "PostImages" },
      ],
    });

    res.status(201).json({
      message: "تم إنشاء المنشور بنجاح وهو في انتظار الموافقة",
      data: fullPost,
    });
  } catch (error) {
    console.error("خطأ في انشاء المنشور:", error);
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};

/**
 *  @method PUT
 *  @route  ~/api/post/:id/accept
 *  @desc   Accept a post
 *  @access private (admin only)
 */

exports.acceptPost = async (req, res) => {
  const { id } = req.params;
  const userRole = req.user.role;

  try {
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return res.status(400).json({ message: "رقم تعريف المنشور غير صحيح" });
    }

    if (userRole !== "admin") {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    const post = await db.Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ message: "هذا المنشور غير موجود حاليا" });
    }

    if (post.status !== "pending") {
      return res.status(400).json({ message: "هذا المنشور معالج مسبقا" });
    }

    await post.update({ status: "accepted" });

    const fullPost = await db.Post.findByPk(postId, {
      include: [
        { model: db.Villa, as: "Villa" },
        { model: db.CommercialStore, as: "CommercialStore" },
        { model: db.House, as: "House" },
        { model: db.PostImage, as: "PostImages" },
      ],
    });

    res.status(200).json({
      message: "تمت الموافقة على المنشور بنجاح",
      data: fullPost,
    });
  } catch (error) {
    console.error("خطأ في الموافقة:", error);
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};

/**
 *  @method PUT
 *  @route  ~/api/post/:id/reject
 *  @desc   Reject a post
 *  @access private (admin only)
 */

exports.rejectPost = async (req, res) => {
  const { id } = req.params;
  const { rejectionReason } = req.body;
  const userRole = req.user.role;

  try {
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return res.status(400).json({ message: "رقم تعريف المنشور غير صحيح" });
    }

    if (userRole !== "admin") {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    const post = await db.Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ message: "هذا المنشور غير موجود حاليا" });
    }

    if (post.status !== "pending") {
      return res.status(400).json({ message: "هذا المنشور معالج مسبقا" });
    }

    await post.update({
      status: "rejected",
      rejectionReason: rejectionReason || "لم يتم تقديم أي سبب",
    });

    const fullPost = await db.Post.findByPk(postId, {
      include: [
        { model: db.Villa, as: "Villa" },
        { model: db.CommercialStore, as: "CommercialStore" },
        { model: db.House, as: "House" },
        { model: db.PostImage, as: "PostImages" },
      ],
    });

    res.status(200).json({
      message: "تم رفض المنشور بنجاح",
      data: fullPost,
    });
  } catch (error) {
    console.error("خطأ في الرفض:", error);
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};

/**
 *  @method GET
 *  @route  ~/api/post
 *  @desc   Get all posts with all related data
 *  @access public (admin can show all posts -  user and company just accepted and negotiable posts)
 */

exports.getAllPosts = async (req, res) => {
  const userRole = req.user.role;

  try {
    let whereClause = {};
    let includeOptions = [
      { model: db.Villa, as: "Villa" },
      { model: db.CommercialStore, as: "CommercialStore" },
      { model: db.House, as: "House" },
      { model: db.PostImage, as: "PostImages" },
      {
        model: db.Account,
        as: "Account",
        attributes: { exclude: ["password"] },
      },
      { model: db.Reservation, as: "Reservations" },
      { model: db.Favorite, as: "Favorites" },
    ];

    if (userRole === "admin" || userRole === "user" || userRole === "company") {
      whereClause.status = "accepted";
    } else {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }


    const posts = await db.Post.findAll({
      where: whereClause,
      include: includeOptions,
    });

    const processedPosts = posts.map((post) => {
      const postData = post.toJSON(); 
      // Combine House and CommercialStore into CommercialStoreOrHouse
      postData.CommercialStoreOrHouse = postData.House || postData.CommercialStore || null;
      // Remove the original properties
      delete postData.House;
      delete postData.CommercialStore;
      return postData;
    });

    res.status(200).json({
      message: "تم جلب المنشورات بنجاح",
      data: processedPosts,
    });
  } catch (error) {
    console.error("خطأ في جلب البيانات:", error);
    res.status(500).json({ message: "خطأ في السيرفر", error: error.message });
  }
};

/**
 *  @method GET
 *  @route  ~/api/post/:id
 *  @desc   Get post by id
 *  @access public (admin can show any post - user and company just accepted and negotiable post)
 */

exports.getPostById = async (req, res) => {
  const { id } = req.params;
  const userRole = req.user.role;

  try {
    const PostId = parseInt(id, 10);
    if (isNaN(PostId)) {
      return res.status(400).json({ message: "تأكد من رقم تعريف المنشور" });
    }

    let whereClause = {};
    let includeOptions = [
      { model: db.Villa, as: "Villa" },
      { model: db.CommercialStore, as: "CommercialStore" },
      { model: db.House, as: "House" },
      { model: db.PostImage, as: "PostImages" },
      {
        model: db.Account,
        as: "Account",
        attributes: { exclude: ["password"] },
      },
      { model: db.Reservation, as: "Reservations" },
      { model: db.Favorite, as: "Favorites" },
    ];

    if (userRole === "admin") {
      // Admins see any posts
    } else if (userRole === "user" || userRole === "company") {
      whereClause.id = PostId;
      whereClause.status = "accepted";
      whereClause.negotiable = true;
    } else {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    const post = await db.Post.findByPk(PostId,{
      where: whereClause,
      include: includeOptions,
    });

    if (!post) {
      res.status(403).json({
        message: "هذا المنشور غير متاح حاليا",
      });
    }

      const postData = post.toJSON(); 
      // Combine House and CommercialStore into CommercialStoreOrHouse
      postData.CommercialStoreOrHouse = postData.House || postData.CommercialStore || null;
      // Remove the original properties
      delete postData.House;
      delete postData.CommercialStore;

    res.status(200).json({
      message: "تم جلب المنشور بنجاح",
      data: postData,
    });
  } catch (error) {
    console.error("خطأ في جلب البيانات:", error);
    res.status(500).json({ message: "خطأ في السيرفر", error: error.message });
  }
};

/**
 *  @method GET
 *  @route  ~/api/post/my/:id
 *  @desc   Get company owen any post by id
 *  @access private (company just owen post)
 */

exports.getCompanyPostById = async (req, res) => {
  const { id } = req.params;
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    const PostId = parseInt(id, 10);
    if (isNaN(PostId)) {
      return res.status(400).json({ message: "تأكد من رقم تعريف المنشور" });
    }

    let whereClause = {};
    let includeOptions = [
      { model: db.Villa, as: "Villa" },
      { model: db.CommercialStore, as: "CommercialStore" },
      { model: db.House, as: "House" },
      { model: db.PostImage, as: "PostImages" },
      {
        model: db.Account,
        as: "Account",
        attributes: { exclude: ["password"] },
      },
      { model: db.Reservation, as: "Reservations" },
      { model: db.Favorite, as: "Favorites" },
    ];

    if (userRole === "company") {
      whereClause.id = PostId;
      whereClause.companyId = userId;
    } else {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    const post = await db.Post.findByPk(PostId,{
      where: whereClause,
      include: includeOptions,
    });

    if (!post) {
      res.status(403).json({
        message: "هذا المنشور غير متاح حاليا",
      });
    }

      const postData = post.toJSON(); 
      // Combine House and CommercialStore into CommercialStoreOrHouse
      postData.CommercialStoreOrHouse = postData.House || postData.CommercialStore || null;
      // Remove the original properties
      delete postData.House;
      delete postData.CommercialStore;

    res.status(200).json({
      message: "تم جلب المنشور بنجاح",
      data: postData,
    });
  } catch (error) {
    console.error("خطأ في جلب البيانات:", error);
    res.status(500).json({ message: "خطأ في السيرفر", error: error.message });
  }
};

/**
 *  @method GET
 *  @route  ~/api/post/status/:status
 *  @desc   Get posts by status (pending, accepted, rejected)
 *  @access private (admin all posts and company just owen posts)
 */

exports.getPostsByStatus = async (req, res) => {
  const { status } = req.params;
  const userRole = req.user.role;
  const userId = req.user.id;

  if (!["pending", "accepted", "rejected"].includes(status)) {
    return res
      .status(400)
      .json({
        message:
          "حالة المنشور المدخل خاطئ استخدم [pending, accepted, or rejected]",
      });
  }

  try {
    let whereClause = { status };
    let includeOptions = [
      { model: db.Villa, as: "Villa" },
      { model: db.CommercialStore, as: "CommercialStore" },
      { model: db.House, as: "House" },
      { model: db.PostImage, as: "PostImages" },
      {
        model: db.Account,
        as: "Account",
        attributes: { exclude: ["password"] },
      },
      { model: db.Reservation, as: "Reservations" },
      { model: db.Favorite, as: "Favorites" },
    ];

    if (userRole === "company") {
      whereClause.companyId = userId;
    } else if (userRole !== "admin") {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    const posts = await db.Post.findAll({
      where: whereClause,
      include: includeOptions,
    });

    res.status(200).json({
      message: `${status} تم جلب المنشورات بنجاح`,
      data: posts,
    });
  } catch (error) {
    console.error("خطأ في جلب البيانات:", error);
    res.status(500).json({ message: "خطأ في السيرفر", error: error.message });
  }
};

/**
 *  @method GET
 *  @route  ~/api/post/type/:type
 *  @desc   Get posts by type (house, commercial_store, villa)
 *  @access public (admin can show all posts - company just owen posts - user just accepted and negotiable posts)
 */

exports.getPostsByType = async (req, res) => {
  const { type } = req.params;
  const userRole = req.user.role;
  const userId = req.user.id;

  if (!["house", "commercial_store", "villa"].includes(type)) {
    return res
      .status(400)
      .json({
        message:
          "نوع المنشور المدخل خاطئ استخدم [house, commercial_store, or villa] ",
      });
  }

  try {
    let whereClause = { type };
    let includeOptions = [
      { model: db.Villa, as: "Villa" },
      { model: db.CommercialStore, as: "CommercialStore" },
      { model: db.House, as: "House" },
      { model: db.PostImage, as: "PostImages" },
      {
        model: db.Account,
        as: "Account",
        attributes: { exclude: ["password"] },
      },
      { model: db.Reservation, as: "Reservations" },
      { model: db.Favorite, as: "Favorites" },
    ];

    if (userRole === "admin") {
      // Admins see all posts of this type
    } else if (userRole === "company") {
      // Companies see only their own posts of this type
      whereClause.companyId = userId;
    } else if (userRole === "user") {
      // Users see only accepted posts with negotiable = true of this type
      whereClause.status = "accepted";
      whereClause.negotiable = true;
    } else {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    const posts = await db.Post.findAll({
      where: whereClause,
      include: includeOptions,
    });

    res.status(200).json({
      message: `${type} تم جلب المنشورات بنجاح`,
      data: posts,
    });
  } catch (error) {
    console.error("خطأ في جلب البيانات:", error);
    res.status(500).json({ message: "خطأ في السيرفر", error: error.message });
  }
};

/**
 *  @method PUT
 *  @route  ~/api/post/:id
 *  @desc   Edit a post (NOTE: when edit images not main image , the images are will removed and then set new images)
 *  @access private (admin or company owner)
 */

exports.editPost = async (req, res) => {
  const { id } = req.params;
  const { salePrice, rentPrice, negotiable, deposit, ...typeSpecificData } =
    req.body;
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return res.status(400).json({ message: "رقم التعريف غير صحيح" });
    }

    const post = await db.Post.findByPk(postId, {
      include: [
        { model: db.Villa, as: "Villa" },
        { model: db.CommercialStore, as: "CommercialStore" },
        { model: db.House, as: "House" },
        { model: db.PostImage, as: "PostImages" },
      ],
    });

    if (!post) {
      return res.status(404).json({ message: "هذا المنشور غير موجود" });
    }

    // Authorization check
    if (
      userRole !== "admin" &&
      (userRole !== "company" || post.companyId !== userId)
    ) {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    // Validate type if provided
    if (
      post.type &&
      !["villa", "commercial_store", "house"].includes(post.type)
    ) {
      return res
        .status(400)
        .json({
          message:
            "تأكد من نوع المنشور على أنه (villa, commercial_store, or house) ",
        });
    }

    // Handle main image update
    let mainImageUrl = post.mainImageUrl;
    if (req.files && req.files.mainImage) {
      mainImageUrl = `/uploads/${req.files.mainImage[0].filename}`;
    }

    // Update Post fields
    await post.update({
      type: post.type,
      salePrice: salePrice !== undefined ? salePrice : post.salePrice,
      rentPrice: rentPrice !== undefined ? rentPrice : post.rentPrice,
      negotiable: negotiable !== undefined ? negotiable : post.negotiable,
      deposit: deposit !== undefined ? deposit : post.deposit,
      mainImageUrl,
      status: "pending", // Reset status to pending
    });

    // Update type-specific data
    if (post.type === "villa") {
      if (post.Villa) {
        await post.Villa.update({
          landArea: typeSpecificData.landArea || post.Villa.landArea,
          buildingArea:
            typeSpecificData.buildingArea || post.Villa.buildingArea,
          poolArea: typeSpecificData.poolArea || post.Villa.poolArea,
          description: typeSpecificData.description || post.Villa.description,
        });
      } else {
        await db.Villa.create({
          postId: post.id,
          landArea: typeSpecificData.landArea,
          buildingArea: typeSpecificData.buildingArea,
          poolArea: typeSpecificData.poolArea,
          description: typeSpecificData.description,
        });
      }
    } else if (post.type === "commercial_store") {
      if (post.CommercialStore) {
        await post.CommercialStore.update({
          area: typeSpecificData.area || post.CommercialStore.area,
          location: typeSpecificData.location || post.CommercialStore.location,
        });
      } else {
        await db.CommercialStore.create({
          postId: post.id,
          area: typeSpecificData.area,
          location: typeSpecificData.location,
        });
      }
    } else if (post.type === "house") {
      if (!typeSpecificData.area || !typeSpecificData.location) {
        return res
          .status(400)
          .json({ message: "المساحة والموقع المطلوب للمنزل" });
      }
      if (post.House) {
        await post.House.update({
          area: typeSpecificData.area || post.House.area,
          location: typeSpecificData.location || post.House.location,
          description: typeSpecificData.description || post.House.description,
        });
      } else {
        await db.House.create({
          postId: post.id,
          area: typeSpecificData.area,
          location: typeSpecificData.location,
          description: typeSpecificData.description,
        });
      }
    }

    // Handle additional images update
    if (req.files && req.files.images) {
      // Delete existing PostImages (optional: keep if you want to append instead)
      await db.PostImage.destroy({ where: { postId: post.id } });

      // Create new PostImages from uploaded files
      const imageRecords = req.files.images.map((file) => ({
        postId: post.id,
        imageUrl: `/uploads/${file.filename}`,
      }));
      await db.PostImage.bulkCreate(imageRecords);
    }

    // Fetch updated post with all includes
    const updatedPost = await db.Post.findByPk(postId, {
      include: [
        { model: db.Villa, as: "Villa" },
        { model: db.CommercialStore, as: "CommercialStore" },
        { model: db.House, as: "House" },
        { model: db.PostImage, as: "PostImages" },
        {
          model: db.Account,
          as: "Account",
          attributes: { exclude: ["password"] },
        },
        { model: db.Reservation, as: "Reservations" },
        { model: db.Favorite, as: "Favorites" },
      ],
    });

    res.status(200).json({
      message: "تم تحديث المنشور بنجاح وإعادة تعيين الحالة إلى معلق",
      data: updatedPost,
    });
  } catch (error) {
    console.error("خطأ في تعديل المنشور:", error);
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};

/**
 *  @method DELETE
 *  @route  ~/api/post/:id
 *  @desc   Delete a post
 *  @access private (admin or company owner)
 */

exports.deletePost = async (req, res) => {
  const { id } = req.params;
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return res.status(400).json({ message: "رقم تعريف المنشور غير صحيح" });
    }

    const post = await db.Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ message: "هذا المنشور غير موجود" });
    }

    // Authorization check
    if (
      userRole !== "admin" &&
      (userRole !== "company" || post.companyId !== userId)
    ) {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    await post.destroy();

    res.status(200).json({
      message: "تم حذف المنشور بنجاح",
    });
  } catch (error) {
    console.error("حدث خطأ عند حذف المنشور", error);
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};

/**
 *  @method GET
 *  @route  ~/api/post/filter?
 *  @desc   filter of posts
 *  @access public
 */

exports.filterPosts = async (req, res) => {
  const userRole = req.user.role;
  const userId = req.user.id;
  const query = req.query; // Get all query parameters

  try {
    let whereClause = {};
    let includeOptions = [
      { model: db.Villa, as: "Villa" },
      { model: db.CommercialStore, as: "CommercialStore" },
      { model: db.House, as: "House" },
      { model: db.PostImage, as: "PostImages" },
      {
        model: db.Account,
        as: "Account",
        attributes: { exclude: ["password"] },
      },
      { model: db.Reservation, as: "Reservations" },
      { model: db.Favorite, as: "Favorites" },
    ];

    // Authorization and base filtering
    if (userRole === "admin" || userRole === "company" || userRole === "user") {
      whereClause.status = "accepted";
      whereClause.negotiable = true;
    } else {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    // Dynamic filtering based on query parameters
    if (query.type) {
      if (!["villa", "commercial_store", "house"].includes(query.type)) {
        return res.status(400).json({ message: "نوع العقار خاطئ" });
      }
      whereClause.type = query.type;
    }
    if (query.status && userRole !== "user") {
      // Users can't filter by status
      if (!["pending"].includes(query.status)) {
        return res
          .status(400)
          .json({
            message: "Invalid status. Use pending, accepted, or rejected",
          });
      }
      whereClause.status = query.status;
    }
    if (query.salePriceMin)
      whereClause.salePrice = { [Op.gte]: parseFloat(query.salePriceMin) };
    if (query.salePriceMax)
      whereClause.salePrice = {
        ...whereClause.salePrice,
        [Op.lte]: parseFloat(query.salePriceMax),
      };
    if (query.rentPriceMin)
      whereClause.rentPrice = { [Op.gte]: parseFloat(query.rentPriceMin) };
    if (query.rentPriceMax)
      whereClause.rentPrice = {
        ...whereClause.rentPrice,
        [Op.lte]: parseFloat(query.rentPriceMax),
      };
    if (query.negotiable && userRole !== "user") {
      // Users can't filter negotiable (fixed to true)
      whereClause.negotiable =
        query.negotiable === "true" || query.negotiable === true;
    }

    // Type-specific filtering (requires joining with related tables)
    let villaWhere = {};
    let commercialStoreWhere = {};
    let houseWhere = {};

    if (query.landAreaMin)
      villaWhere.landArea = { [Op.gte]: parseFloat(query.landAreaMin) };
    if (query.landAreaMax)
      villaWhere.landArea = {
        ...villaWhere.landArea,
        [Op.lte]: parseFloat(query.landAreaMax),
      };
    if (query.buildingAreaMin)
      villaWhere.buildingArea = { [Op.gte]: parseFloat(query.buildingAreaMin) };
    if (query.buildingAreaMax)
      villaWhere.buildingArea = {
        ...villaWhere.buildingArea,
        [Op.lte]: parseFloat(query.buildingAreaMax),
      };
    if (query.poolAreaMin)
      villaWhere.poolArea = { [Op.gte]: parseFloat(query.poolAreaMin) };
    if (query.poolAreaMax)
      villaWhere.poolArea = {
        ...villaWhere.poolArea,
        [Op.lte]: parseFloat(query.poolAreaMax),
      };
    if (query.description)
      villaWhere.description = { [Op.like]: `%${query.description}%` };

    if (query.areaMin) {
      commercialStoreWhere.area = { [Op.gte]: parseFloat(query.areaMin) };
      houseWhere.area = { [Op.gte]: parseFloat(query.areaMin) };
    }
    if (query.areaMax) {
      commercialStoreWhere.area = {
        ...commercialStoreWhere.area,
        [Op.lte]: parseFloat(query.areaMax),
      };
      houseWhere.area = {
        ...houseWhere.area,
        [Op.lte]: parseFloat(query.areaMax),
      };
    }
    if (query.location) {
      commercialStoreWhere.location = { [Op.like]: `%${query.location}%` };
      houseWhere.location = { [Op.like]: `%${query.location}%` };
    }
    if (query.description)
      houseWhere.description = { [Op.like]: `%${query.description}%` };

    // Apply where clauses to includes
    includeOptions = includeOptions.map((include) => {
      if (include.model === db.Villa && Object.keys(villaWhere).length > 0) {
        return { ...include, where: villaWhere };
      }
      if (
        include.model === db.CommercialStore &&
        Object.keys(commercialStoreWhere).length > 0
      ) {
        return { ...include, where: commercialStoreWhere };
      }
      if (include.model === db.House && Object.keys(houseWhere).length > 0) {
        return { ...include, where: houseWhere };
      }
      return include;
    });

    const posts = await db.Post.findAll({
      where: whereClause,
      include: includeOptions,
    });

    res.status(200).json({
      message: "تم جلب البيانات بنجاح",
      data: posts,
    });
  } catch (error) {
    console.error("حدث خطأ اثناء جلب البيانات", error);
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};

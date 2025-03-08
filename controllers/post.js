const db = require("../models");
const path = require("path");


/**
 *  @method POST
 *  @route  ~/api/post
 *  @desc   Create a post with type-specific data and images
 *  @access private only company
 */

exports.createPost = async (req, res) => {
  const { type, salePrice, rentPrice, negotiable, rejectionReason, ...typeSpecificData } = req.body;
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    if (userRole !== "company") {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    if (!type || !["villa", "commercial_store", "house"].includes(type)) {
      return res.status(400).json({ message: "نوع المنشور غير صحيح" });
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
      negotiable: negotiable === "true" || negotiable === true || true,
      mainImageUrl,
      status: "pending",
    });

    // Handle type-specific data
    if (type === "villa") {
      const { landArea, buildingArea, poolArea, description } = typeSpecificData;
      if (!landArea || !buildingArea ) {
        await post.destroy(); // Rollback if invalid
        return res.status(400).json({ message: "مطلوب مساحة الارض ومساحة البناء للفيلا" });
      }
      await db.Villa.create({
        postId: post.id,
        landArea,
        buildingArea,
        poolArea: poolArea || null,
        description: description || null,
      });
    } else if (type === "commercial_store") {
      const { area, location,description } = typeSpecificData;
      if (!area || !location) {
        await post.destroy();
        return res.status(400).json({ message: "المساحة والموقع مطلوبان للمتجر التجاري" });
      }
      await db.CommercialStore.create({
        postId: post.id,
        area,
        location,
        description
      });
    } else if (type === "house") {
      const { area, location, description } = typeSpecificData;
      if (!area || !location) {
        await post.destroy();
        return res.status(400).json({ message: "المساحة والموقع مطلوبان للمنزل" });
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


// Get all posts with all related data
exports.getAllPosts = async (req, res) => {
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    let whereClause = {};
    if (userRole === "company") {
      whereClause.companyId = userId; // Companies only see their own posts
    } else if (userRole !== "admin" || userRole !== "user") {
      return res.status(403).json({ message: "Unauthorized: Only admins or companies can view posts" });
    }

    const posts = await db.Post.findAll({
      where: whereClause,
      include: [
        { model: db.Villa, as: "Villa" },
        { model: db.CommercialStore, as: "CommercialStore" },
        { model: db.House, as: "House" },
        { model: db.PostImage, as: "PostImages" },
        { model: db.Account, as: "Account" }, // Include company account details
        { model: db.Reservation, as: "Reservations" },
        { model: db.Favorite, as: "Favorites" },
      ],
    });

    res.status(200).json({
      message: "All posts retrieved successfully",
      data: posts,
    });
  } catch (error) {
    console.error("Error in getAllPosts:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get posts by status (pending, accepted, rejected)
exports.getPostsByStatus = async (req, res) => {
  const { status } = req.params;
  const userRole = req.user.role;
  const userId = req.user.id;

  if (!["pending", "accepted", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status. Use pending, accepted, or rejected" });
  }

  try {
    let whereClause = { status };
    if (userRole === "company") {
      whereClause.companyId = userId; // Companies only see their own posts
    } else if (userRole !== "admin") {
      return res.status(403).json({ message: "Unauthorized: Only admins or companies can view posts" });
    }

    const posts = await db.Post.findAll({
      where: whereClause,
      include: [
        { model: db.Villa, as: "Villa" },
        { model: db.CommercialStore, as: "CommercialStore" },
        { model: db.House, as: "House" },
        { model: db.PostImage, as: "PostImages" },
        { model: db.Account, as: "Account" },
        { model: db.Reservation, as: "Reservations" },
        { model: db.Favorite, as: "Favorites" },
      ],
    });

    res.status(200).json({
      message: `${status} posts retrieved successfully`,
      data: posts,
    });
  } catch (error) {
    console.error("Error in getPostsByStatus:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get posts by type (house, commercial_store, villa)
exports.getPostsByType = async (req, res) => {
  const { type } = req.params;
  const userRole = req.user.role;
  const userId = req.user.id;

  if (!["house", "commercial_store", "villa"].includes(type)) {
    return res.status(400).json({ message: "Invalid type. Use house, commercial_store, or villa" });
  }

  try {
    let whereClause = { type };
    if (userRole === "company") {
      whereClause.companyId = userId; // Companies only see their own posts
    } else if (userRole !== "admin" && userRole !== "user") {
      return res.status(403).json({ message: "Unauthorized: Only admins, companies, or users can view posts" });
    }

    const posts = await db.Post.findAll({
      where: whereClause,
      include: [
        { model: db.Villa, as: "Villa" },
        { model: db.CommercialStore, as: "CommercialStore" },
        { model: db.House, as: "House" },
        { model: db.PostImage, as: "PostImages" },
        { model: db.Account, as: "Account" },
        { model: db.Reservation, as: "Reservations" },
        { model: db.Favorite, as: "Favorites" },
      ],
    });

    res.status(200).json({
      message: `${type} posts retrieved successfully`,
      data: posts,
    });
  } catch (error) {
    console.error("Error in getPostsByType:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
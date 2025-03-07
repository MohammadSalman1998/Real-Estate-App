const db = require("../models");
const path = require("path");

// Create a post with type-specific data and images
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
      negotiable: negotiable === "true" || negotiable === true,
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
      const { area, location } = typeSpecificData;
      if (!area || !location) {
        await post.destroy();
        return res.status(400).json({ message: "المساحة والموقع مطلوبان للمتجر التجاري" });
      }
      await db.CommercialStore.create({
        postId: post.id,
        area,
        location,
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

// Accept a post (admin only)
exports.acceptPost = async (req, res) => {
  const { id } = req.params;
  const userRole = req.user.role;

  try {
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    if (userRole !== "admin") {
      return res.status(403).json({ message: "Unauthorized: Only admins can accept posts" });
    }

    const post = await db.Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.status !== "pending") {
      return res.status(400).json({ message: "Post is already processed" });
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
      message: "Post accepted successfully",
      data: fullPost,
    });
  } catch (error) {
    console.error("Error in acceptPost:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Reject a post (admin only)
exports.rejectPost = async (req, res) => {
  const { id } = req.params;
  const { rejectionReason } = req.body;
  const userRole = req.user.role;

  try {
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    if (userRole !== "admin") {
      return res.status(403).json({ message: "Unauthorized: Only admins can reject posts" });
    }

    const post = await db.Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.status !== "pending") {
      return res.status(400).json({ message: "Post is already processed" });
    }

    await post.update({
      status: "rejected",
      rejectionReason: rejectionReason || "No reason provided",
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
      message: "Post rejected successfully",
      data: fullPost,
    });
  } catch (error) {
    console.error("Error in rejectPost:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
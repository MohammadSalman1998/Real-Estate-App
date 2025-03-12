const db = require("../models");

/**
 *  @method POST
 *  @route  ~/api/favorite
 *  @desc   add post to my favorite
 *  @access private only user
 */

exports.addToFavorites = async (req, res) => {
  const { postId } = req.body; 
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    // Only users can add to favorites
    if (userRole !== "user") {
      return res.status(403).json({ message: "ليس لديك الصلاحية" });
    }

    // Validate postId
    const postIdInt = parseInt(postId, 10);
    if (isNaN(postIdInt)) {
      return res.status(400).json({ message: "رقم التعريف غير صحيح" });
    }

    // Check if the post exists and is visible to users
    const post = await db.Post.findByPk(postIdInt);
    if (!post) {
      return res.status(404).json({ message: "هذا المنشور غير متاح" });
    }
    if (post.status !== "accepted" || !post.negotiable) {
      return res.status(403).json({ message: "هذا المنشور غير متاح" });
    }

    // Get the customer record tied to the user's Account.id
    const customer = await db.Customer.findOne({ where: { customerId: userId } });
    if (!customer) {
      return res.status(404).json({ message: "تأكد من حسابك" });
    }

    // Check if the post is already favorited by this user
    const existingFavorite = await db.Favorite.findOne({
      where: {
        customerId: customer.id,
        postId: postIdInt,
      },
    });
    if (existingFavorite) {
      return res.status(400).json({ message: "هذا المنشور موجود مسبقا في المفضلة" });
    }

    // Add to favorites
    const favorite = await db.Favorite.create({
      customerId: customer.id,
      postId: postIdInt,
    });

    res.status(201).json({
      message: "تم إضافة المنشور إلى المفضلة بنجاح",
      data: favorite,
    });
  } catch (error) {
    console.error("Error in addToFavorites:", error);
    res.status(500).json({ message: "خطأ من الخادم", error: error.message });
  }
};

/**
 *  @method GET
 *  @route  ~/api/myFavorites
 *  @desc   get my Favorites post 
 *  @access private only user his Favorites
 */

exports.getFavorites = async (req, res) => {
    const userRole = req.user.role;
    const userId = req.user.id;
  
    try {
      // Only users can view their favorites
      if (userRole !== "user") {
        return res.status(403).json({ message: "ليس لديك الصلاحية" });
      }
  
      // Get the customer record tied to the user's Account.id
      const customer = await db.Customer.findOne({ where: { customerId: userId } });
      if (!customer) {
        return res.status(404).json({ message: "تأكد من حسابك" });
      }
  
      // Fetch all favorites for this customer with full post details
      const favorites = await db.Favorite.findAll({
        where: { customerId: customer.id },
        include: [
          {
            model: db.Post,
            as: "Post",
            include: [
              { model: db.Villa, as: "Villa" },
              { model: db.CommercialStore, as: "CommercialStore" },
              { model: db.House, as: "House" },
              { model: db.PostImage, as: "PostImages" },
              {
                model: db.Account,
                as: "Account",
                attributes: { exclude: ["password"] }, // Exclude password
              },
              { model: db.Reservation, as: "Reservations" },
              { model: db.Favorite, as: "Favorites" },
            ],
          },
        ],
      });
  
      // If no favorites, return an empty array with a message
      if (!favorites.length) {
        return res.status(200).json({
          message: "لا يوجد منشورات في المفضلة",
          data: [],
        });
      }
  
      res.status(200).json({
        message: "تم جلب المفضلة بنجاح",
        data: favorites,
      });
    } catch (error) {
      console.error("Error in getFavorites:", error);
      res.status(500).json({ message: "خطأ من السيرفر", error: error.message });
    }
};

  /**
 *  @method DELETE
 *  @route  ~/api/removeFavorite
 *  @desc   remove post from my Favorites 
 *  @access private only user his Favorite
 */

exports.removeFromFavorites = async (req, res) => {
    const { postId } = req.body; 
    const userRole = req.user.role;
    const userId = req.user.id;
  
    try {
      // Only users can remove from favorites
      if (userRole !== "user") {
        return res.status(403).json({ message: "ليس لديك الصلاحية" });
      }
  
      // Validate postId
      const postIdInt = parseInt(postId, 10);
      if (isNaN(postIdInt)) {
        return res.status(400).json({ message: "رقم تعريف المنشور غير صحيح" });
      }
  
      // Get the customer record tied to the user's Account.id
      const customer = await db.Customer.findOne({ where: { customerId: userId } });
      if (!customer) {
        return res.status(404).json({ message: "تأكد من حسابك" });
      }
  
      // Check if the favorite exists
      const favorite = await db.Favorite.findOne({
        where: {
          customerId: customer.id,
          postId: postIdInt,
        },
      });
      if (!favorite) {
        return res.status(404).json({ message: "هذا المنشور غير موجود في المفضلة" });
      }
  
      // Remove from favorites
      await favorite.destroy();
  
      res.status(200).json({
        message: "تم إزالة المنشور من المفضلة",
      });
    } catch (error) {
      console.error("Error in removeFromFavorites:", error);
      res.status(500).json({ message: "خطأ من الخادم", error: error.message });
    }
};
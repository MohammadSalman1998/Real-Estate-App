const db = require('../models');

exports.createPost = async (req, res) => {
  const { type, salePrice, rentPrice, negotiable, mainImageUrl, specificDetails } = req.body;
  const companyId = req.user.id;

  try {
    const post = await db.Post.create({
      companyId,
      type,
      salePrice,
      rentPrice,
      negotiable,
      mainImageUrl,
    });

    if (type === 'villa') {
      await db.Villa.create({ postId: post.id, ...specificDetails });
    } else if (type === 'commercial_store') {
      await db.CommercialStore.create({ postId: post.id, ...specificDetails });
    } else if (type === 'house') {
      await db.House.create({ postId: post.id, ...specificDetails });
    }

    res.status(201).json({ message: 'Post created', postId: post.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
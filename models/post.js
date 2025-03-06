const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Post = sequelize.define('Post', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM('villa', 'commercial_store', 'house'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('accepted', 'rejected', 'pending'),
      defaultValue: 'pending',
    },
    rejectionReason: DataTypes.TEXT,
    salePrice: DataTypes.DECIMAL(15, 2),
    rentPrice: DataTypes.DECIMAL(15, 2),
    negotiable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    mainImageUrl: DataTypes.STRING(255),
  }, {
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false,
  });

  return Post;
};
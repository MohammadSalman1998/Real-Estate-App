const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PostImage = sequelize.define('PostImage', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    imageUrl: DataTypes.STRING(255),
  }, {
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false,
  });

  return PostImage;
};
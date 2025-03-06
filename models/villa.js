const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Villa = sequelize.define('Villa', {
    postId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    landArea: DataTypes.DECIMAL(10, 2),
    buildingArea: DataTypes.DECIMAL(10, 2),
    poolArea: DataTypes.DECIMAL(10, 2),
    description: DataTypes.TEXT,
  }, {
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false,
  });

  return Villa;
};
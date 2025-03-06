const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const House = sequelize.define('House', {
    postId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    area: DataTypes.DECIMAL(10, 2),
    location: DataTypes.STRING(255),
    description: DataTypes.TEXT,
  }, {
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false,
  });

  return House;
};
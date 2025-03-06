const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommercialStore = sequelize.define('CommercialStore', {
    postId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    area: DataTypes.DECIMAL(10, 2),
    location: DataTypes.STRING(255),
  }, {
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false,
  });

  return CommercialStore;
};
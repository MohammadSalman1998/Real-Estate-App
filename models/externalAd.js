const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ExternalAd = sequelize.define('ExternalAd', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    imageUrl: DataTypes.STRING(255),
    content: DataTypes.STRING(255),
  }, {
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false,
  });

  return ExternalAd;
};
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SocialMedia = sequelize.define('SocialMedia', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    facebook: DataTypes.STRING(255),
    twitter: DataTypes.STRING(255),
    instagram: DataTypes.STRING(255),
    whatsapp: DataTypes.STRING(255),
    telegram: DataTypes.STRING(255),
    linkedin: DataTypes.STRING(255),
  }, {
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false,
  });

  return SocialMedia;
};
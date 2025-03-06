const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Favorite = sequelize.define('Favorite', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
  }, {
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false,
  });

  return Favorite;
};
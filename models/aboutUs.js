const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AboutUs = sequelize.define('AboutUs', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    content: DataTypes.TEXT,
  }, {
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false,
  });

  return AboutUs;
};
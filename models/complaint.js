const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Complaint = sequelize.define('Complaint', {
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

  return Complaint;
};
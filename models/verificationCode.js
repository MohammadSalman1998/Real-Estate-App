const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const VerificationCode = sequelize.define('VerificationCode', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(255),
    },
  }, {
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false,
  });

  return VerificationCode;
};
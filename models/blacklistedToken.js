const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const BlacklistedToken = sequelize.define(
    "BlacklistedToken",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      token: {
        type: DataTypes.STRING(500),
        allowNull: false,
        unique: true,
      },
    },
    {
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: false,
    }
  );

  return BlacklistedToken;
};
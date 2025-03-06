const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Company = sequelize.define(
    "Company",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      webSiteURL: DataTypes.STRING(255),
      location: DataTypes.STRING(255),
      authCode: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
      },
      profileImageUrl: DataTypes.STRING(255),
      walletBalance: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
      },
    },
    {
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: false,
    }
  );

  return Company;
};
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Customer = sequelize.define(
    "Customer",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
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

  return Customer;
};
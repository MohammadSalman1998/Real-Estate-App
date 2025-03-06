const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Account = sequelize.define(
    "Account",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      phone: DataTypes.STRING(20),
      role: {
        type: DataTypes.ENUM("admin", "company", "user"),
        allowNull: false, // Ensure role is always set
      },
    },
    {
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: false,
    }
  );

  return Account;
};
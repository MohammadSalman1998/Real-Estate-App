const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Transaction = sequelize.define('Transaction', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    amountReceived: DataTypes.DECIMAL(10, 2),
    adminFee: DataTypes.DECIMAL(10, 2),
  }, {
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false,
  });

  return Transaction;
};
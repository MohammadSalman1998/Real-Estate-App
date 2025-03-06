const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Reservation = sequelize.define('Reservation', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    depositAmount: DataTypes.DECIMAL(10, 2),
  }, {
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false,
  });

  return Reservation;
};
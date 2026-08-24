// container/Models/orderItem.model.js
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const OrderItem = sequelize.define('OrderItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    order_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: true },
    unit_price: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    original_unit_price: { type: DataTypes.DECIMAL(10,2), allowNull: true },
    discount_amount: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
    remise_percentage: { type: DataTypes.DECIMAL(5,2), defaultValue: 0 },
    quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
    total: { type: DataTypes.DECIMAL(12,2), allowNull: false }
  }, { 
    tableName: 'order_items', 
    timestamps: false 
  });

  return OrderItem;
};
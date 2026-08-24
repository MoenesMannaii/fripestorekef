// models/order.model.js
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  return sequelize.define('Order', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER },
    shift_id: { type: DataTypes.INTEGER, allowNull: true },
    table_id: { type: DataTypes.INTEGER, allowNull: true },
    session_id: { type: DataTypes.INTEGER, allowNull: true },
    total: { type: DataTypes.DECIMAL(12,2), defaultValue: 0.00 },
    tax: { type: DataTypes.DECIMAL(12,2), defaultValue: 0.00 },
    paid_amount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0.00 },
    change_amount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0.00 },
    payment_method: { type: DataTypes.ENUM('cash','card','credit','other'), defaultValue: 'cash' },
    client_id: { type: DataTypes.INTEGER, allowNull: true },
    type: { type: DataTypes.ENUM('sale', 'return'), defaultValue: 'sale' },
    original_order_id: { type: DataTypes.INTEGER, allowNull: true },
    note: { type: DataTypes.STRING, allowNull: true },
    has_remise: { type: DataTypes.BOOLEAN, defaultValue: false },
    points_spent: { type: DataTypes.INTEGER, defaultValue: 0 },
    points_discount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.00 },
    ticket_number: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'orders', timestamps: false });
};

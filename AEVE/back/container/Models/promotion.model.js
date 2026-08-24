// Models/promotion.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Promotion = sequelize.define('Promotion', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('percentage', 'bundle'),
      defaultValue: 'percentage'
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'The main product this promotion applies to (for percentage types)'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'promotions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Promotion;
};

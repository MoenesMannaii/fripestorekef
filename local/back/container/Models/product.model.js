// models/product.model.js
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  return sequelize.define('Product', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    sku: { type: DataTypes.STRING, unique: true, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    cost_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
    stock: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0.000 },
    has_sub_units: { type: DataTypes.BOOLEAN, defaultValue: false },
    pieces_per_box: { type: DataTypes.INTEGER, defaultValue: 1 },
    remise_percentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0.00 },
    barcode: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    category: { type: DataTypes.STRING, allowNull: true },
    parent_id: { type: DataTypes.INTEGER, allowNull: true },
    attributes: { 
      type: DataTypes.TEXT, 
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('attributes');
        return rawValue ? JSON.parse(rawValue) : null;
      },
      set(value) {
        this.setDataValue('attributes', value ? JSON.stringify(value) : null);
      }
    },
    sell_by_weight: { type: DataTypes.BOOLEAN, defaultValue: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deleted_at: { type: DataTypes.DATE, allowNull: true }
  }, {
    tableName: 'products',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: true // This enables soft delete
  });
};
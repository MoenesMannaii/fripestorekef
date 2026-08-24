// models/productImage.model.js
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  return sequelize.define('ProductImage', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    url: { type: DataTypes.STRING },
    is_primary: { type: DataTypes.BOOLEAN, defaultValue: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'product_images', timestamps: false });
};

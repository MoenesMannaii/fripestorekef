// Models/promotionBundleItem.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PromotionBundleItem = sequelize.define('PromotionBundleItem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    promotion_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'The free product to be added'
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    }
  }, {
    tableName: 'promotion_bundle_items',
    timestamps: false
  });

  return PromotionBundleItem;
};

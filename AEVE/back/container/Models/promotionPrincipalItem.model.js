// Models/promotionPrincipalItem.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PromotionPrincipalItem = sequelize.define('PromotionPrincipalItem', {
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
      comment: 'The product required to trigger the promotion'
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    }
  }, {
    tableName: 'promotion_principal_items',
    timestamps: false
  });

  return PromotionPrincipalItem;
};

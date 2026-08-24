// models/factureItem.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FactureItem = sequelize.define('FactureItem', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    facture_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },
    product_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },
    quantity: { 
      type: DataTypes.INTEGER, 
      allowNull: false, 
      defaultValue: 0 
    },
    unit_cost: { 
      type: DataTypes.DECIMAL(12, 2), 
      allowNull: false 
    },
    total_cost: { 
      type: DataTypes.DECIMAL(12, 2), 
      allowNull: false 
    },
    created_at: { 
      type: DataTypes.DATE, 
      defaultValue: DataTypes.NOW 
    }
  }, { 
    tableName: 'facture_items', 
    timestamps: false,
    underscored: true
  });

  return FactureItem;
};
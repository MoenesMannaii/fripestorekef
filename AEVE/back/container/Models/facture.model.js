// models/facture.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Facture = sequelize.define('Facture', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    facture_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    supplier_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    supplier_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    supplier_info: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    supplier_phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    supplier_email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    supplier_address: {
      type: DataTypes.STRING,
      allowNull: true
    },
    facture_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    total_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('draft', 'confirmed', 'cancelled'),
      defaultValue: 'draft'
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false
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
    tableName: 'factures',
    timestamps: false,
    underscored: true
  });

  return Facture;
};
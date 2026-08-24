const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  return sequelize.define('Printer', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    ip_address: { type: DataTypes.STRING, allowNull: false },
    port: { type: DataTypes.INTEGER, defaultValue: 9100 }, // Default thermal printer port
    printer_type: { 
      type: DataTypes.ENUM('cashier', 'kitchen', 'bar', 'other'),
      defaultValue: 'other'
    },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    paper_width: { type: DataTypes.INTEGER, defaultValue: 80 }, // 80mm for thermal
    is_default: { type: DataTypes.BOOLEAN, defaultValue: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { 
    tableName: 'printers', 
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};
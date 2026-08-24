const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  return sequelize.define('RestaurantTable', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    table_number: { type: DataTypes.STRING, allowNull: false, unique: true },
    display_name: { type: DataTypes.STRING },
    capacity: { type: DataTypes.INTEGER, defaultValue: 4 },
    x_position: { type: DataTypes.INTEGER, defaultValue: 0 },
    y_position: { type: DataTypes.INTEGER, defaultValue: 0 },
    section: { type: DataTypes.STRING },
    status: { 
      type: DataTypes.ENUM('available', 'occupied', 'reserved', 'cleaning'), 
      defaultValue: 'available' 
    },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { 
    tableName: 'restaurant_tables', 
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};
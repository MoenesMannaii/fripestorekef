const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  return sequelize.define('TableSession', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    session_number: { type: DataTypes.STRING, unique: true },
    customer_count: { type: DataTypes.INTEGER, defaultValue: 1 },
    started_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    ended_at: { type: DataTypes.DATE },
    waiter_id: { type: DataTypes.INTEGER },
    status: { 
      type: DataTypes.ENUM('active', 'closed', 'merged'), 
      defaultValue: 'active' 
    },
    notes: { type: DataTypes.TEXT }
  }, { 
    tableName: 'table_sessions', 
    timestamps: false
  });
};
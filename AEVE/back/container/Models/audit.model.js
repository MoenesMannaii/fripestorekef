// models/audit.model.js
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  return sequelize.define('AuditLog', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    actor_id: { type: DataTypes.INTEGER },
    actor_role: { type: DataTypes.ENUM('admin','worker') },
    action: { type: DataTypes.STRING },
    details: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'audit_logs', timestamps: false });
};

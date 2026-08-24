// models/user.model.js
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  return sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, unique: true, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: true },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('admin','worker'), defaultValue: 'worker' },
    pin: { type: DataTypes.STRING, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    tableName: 'users',
    timestamps: false
  });
};

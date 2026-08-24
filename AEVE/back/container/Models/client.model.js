// container/Models/client.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Client', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    loyalty_points: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_spent: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'clients',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};

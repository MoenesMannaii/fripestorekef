const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Shift = sequelize.define('Shift', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    start_time: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'closed'),
      defaultValue: 'active',
    },
    starting_cash: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    ending_cash: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    }
  }, {
    tableName: 'shifts',
    timestamps: false,
    underscored: true
  });

  return Shift;
};

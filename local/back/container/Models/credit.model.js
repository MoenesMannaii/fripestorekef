// container/Models/credit.model.js
module.exports = (sequelize, DataTypes) => {
  const CreditSale = sequelize.define('CreditSale', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    client_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    client_phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    total_amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    amount_paid: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    remaining_amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM('pending', 'partial', 'paid'),
      allowNull: false,
      defaultValue: 'pending'
    },
    items: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('items');
        return raw ? JSON.parse(raw) : [];
      },
      set(val) {
        this.setDataValue('items', JSON.stringify(val));
      }
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Linked order in orders table'
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'credit_sales',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return CreditSale;
};

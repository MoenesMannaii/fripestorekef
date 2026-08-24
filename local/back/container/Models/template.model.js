// container/Models/template.model.js
module.exports = (sequelize, DataTypes) => {
  const Template = sequelize.define('Template', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    business_name: {
      type: DataTypes.STRING,
      defaultValue: 'Receiptify Corp.'
    },
    address: {
      type: DataTypes.STRING,
      defaultValue: '123 Main St, Anytown, CA 90210'
    },
    phone: {
      type: DataTypes.STRING,
      defaultValue: '(555) 123-4567'
    },
    email: {
      type: DataTypes.STRING,
      defaultValue: 'support@receiptify.com'
    },
    website: {
      type: DataTypes.STRING,
      defaultValue: 'www.receiptify.com'
    },
    tax_number: {
      type: DataTypes.STRING,
      defaultValue: 'TAX-ID: 987654321'
    },
    logo_path: {
      type: DataTypes.STRING,
      allowNull: true
    },
    thank_you_message: {
      type: DataTypes.TEXT,
      defaultValue: 'Merci pour votre achat !'
    },
    return_policy: {
      type: DataTypes.TEXT,
      defaultValue: 'Retours acceptés dans un délai d\'un jour avec le reçu original. Certaines exclusions s\'appliquent.'
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_current: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    loyalty_ratio: {
      type: DataTypes.INTEGER,
      defaultValue: 10
    },
    loyalty_min_points: {
      type: DataTypes.INTEGER,
      defaultValue: 100
    },
    loyalty_points_value: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 30.00
    },
    product_fields_config: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('product_fields_config');
        return rawValue ? JSON.parse(rawValue) : {
          barcode: true,
          sku: true,
          cost_price: true,
          sell_by_weight: true,
          has_sub_units: true,
          category: true,
          description: true
        };
      },
      set(value) {
        this.setDataValue('product_fields_config', value ? JSON.stringify(value) : null);
      }
    },
    ticket_reset_period: {
      type: DataTypes.ENUM('none', 'weekly', 'monthly'),
      defaultValue: 'none'
    },
    last_ticket_reset: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deletion_secret_code: {
      type: DataTypes.STRING,
      defaultValue: '1234'
    },
    deletion_barcode: {
      type: DataTypes.STRING,
      defaultValue: 'ADMIN-DELETE'
    }
  }, {
    tableName: 'templates',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Template;
};
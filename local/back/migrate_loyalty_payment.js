// local/back/migrate_loyalty_payment.js
const { sequelize } = require('./container/Models/index');

async function runMigration() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    const tableInfoTemplates = await queryInterface.describeTable('templates');
    const tableInfoOrders = await queryInterface.describeTable('orders');

    console.log('Checking templates table...');
    if (!tableInfoTemplates.loyalty_min_points) {
      await queryInterface.addColumn('templates', 'loyalty_min_points', {
        type: 'INTEGER',
        defaultValue: 100
      });
      console.log('Added loyalty_min_points to templates');
    }

    if (!tableInfoTemplates.loyalty_points_value) {
      await queryInterface.addColumn('templates', 'loyalty_points_value', {
        type: 'DECIMAL(12, 2)',
        defaultValue: 30.00
      });
      console.log('Added loyalty_points_value to templates');
    }

    console.log('Checking orders table...');
    if (!tableInfoOrders.points_spent) {
      await queryInterface.addColumn('orders', 'points_spent', {
        type: 'INTEGER',
        defaultValue: 0
      });
      console.log('Added points_spent to orders');
    }

    if (!tableInfoOrders.points_discount) {
      await queryInterface.addColumn('orders', 'points_discount', {
        type: 'DECIMAL(12, 2)',
        defaultValue: 0.00
      });
      console.log('Added points_discount to orders');
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

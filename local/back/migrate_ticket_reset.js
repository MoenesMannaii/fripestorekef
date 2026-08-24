const { sequelize } = require('./container/Models');
const { QueryInterface } = sequelize;

async function migrate() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('Checking templates table for ticket reset fields...');
  const templateTable = await queryInterface.describeTable('templates');
  
  if (!templateTable.ticket_reset_period) {
    await queryInterface.addColumn('templates', 'ticket_reset_period', {
      type: sequelize.Sequelize.STRING,
      defaultValue: 'none'
    });
    console.log('Added ticket_reset_period to templates');
  }

  if (!templateTable.last_ticket_reset) {
    await queryInterface.addColumn('templates', 'last_ticket_reset', {
      type: 'DATE',
      allowNull: true
    });
    console.log('Added last_ticket_reset to templates');
  }

  console.log('Checking orders table for ticket_number field...');
  const ordersTable = await queryInterface.describeTable('orders');

  if (!ordersTable.ticket_number) {
    await queryInterface.addColumn('orders', 'ticket_number', {
      type: 'INTEGER',
      allowNull: true
    });
    console.log('Added ticket_number to orders');
    
    // Initialize existing orders with their ID as ticket_number for consistency
    await sequelize.query('UPDATE orders SET ticket_number = id WHERE ticket_number IS NULL');
    console.log('Initialized existing orders with ticket_number = id');
  }

  console.log('Migration for ticket reset completed successfully!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

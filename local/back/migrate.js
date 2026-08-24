const { sequelize } = require('./container/Models/index'); // Adjust path to your sequelize instance

async function runMigration() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    
    // Add deleted_at column
    await queryInterface.addColumn('products', 'deleted_at', {
      type: 'DATE',
      allowNull: true
    });
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
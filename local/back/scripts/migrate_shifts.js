/**
 * Migration: Create shifts table and add shift_id column to orders
 * Run once: node scripts/migrate_shifts.js
 */
const sequelize = require('../container/config/db');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ DB connected');

    const queryInterface = sequelize.getQueryInterface();

    // 1. Create shifts table if it doesn't exist
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME,
        status VARCHAR(10) DEFAULT 'active',
        starting_cash DECIMAL(12,2) DEFAULT 0.00,
        ending_cash DECIMAL(12,2),
        notes TEXT
      )
    `);
    console.log('✅ shifts table ready');

    // 2. Add shift_id column to orders if it doesn't exist
    const [columns] = await sequelize.query(`PRAGMA table_info(orders)`);
    const hasShiftId = columns.some(col => col.name === 'shift_id');

    if (!hasShiftId) {
      await sequelize.query(`ALTER TABLE orders ADD COLUMN shift_id INTEGER REFERENCES shifts(id)`);
      console.log('✅ shift_id column added to orders');
    } else {
      console.log('ℹ️  shift_id already exists in orders, skipping');
    }

    console.log('\n🎉 Migration complete! You can now restart the backend.\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();

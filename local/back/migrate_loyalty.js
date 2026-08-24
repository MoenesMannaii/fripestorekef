const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'container/database/offline_pos.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding loyalty_ratio column to templates table...');
db.run("ALTER TABLE templates ADD COLUMN loyalty_ratio INTEGER DEFAULT 10", (err) => {
  if (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('Column loyalty_ratio already exists.');
    } else {
      console.error('Error adding column:', err.message);
    }
  } else {
    console.log('Column loyalty_ratio added successfully.');
  }
  db.close();
});

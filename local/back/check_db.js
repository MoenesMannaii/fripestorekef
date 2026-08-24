const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'container/database/offline_pos.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking credit_sales table...');
db.all("PRAGMA table_info(credit_sales)", (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log('credit_sales table info:');
    rows.forEach(row => console.log(`- ${row.name} (${row.type})`));
  }
});

console.log('\nChecking orders table...');
db.all("PRAGMA table_info(orders)", (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log('orders table info:');
    rows.forEach(row => console.log(`- ${row.name} (${row.type})`));
  }
  db.close();
});

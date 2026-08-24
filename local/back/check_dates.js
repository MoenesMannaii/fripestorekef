const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'container/database/offline_pos.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking templates table data...');
db.all("SELECT id, created_at, updated_at FROM templates", (err, rows) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log('Rows:', JSON.stringify(rows, null, 2));
  db.close();
});

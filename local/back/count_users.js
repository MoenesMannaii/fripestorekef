const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'container/database/offline_pos.db');
const db = new sqlite3.Database(dbPath);

db.all("SELECT count(*) as count FROM users", (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log('User count:', rows[0].count);
  }
  db.close();
});

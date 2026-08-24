const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./container/database/offline_pos.db');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) return console.error(err);
  
  tables.forEach(table => {
    db.all(`PRAGMA table_info(${table.name})`, (err, columns) => {
      console.log(`Table: ${table.name} | Columns: ${columns.length}`);
      if (columns.length < 5) {
         columns.forEach(c => console.log(`  - ${c.name}`));
      }
    });
  });
});

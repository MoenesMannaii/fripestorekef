const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./container/database/offline_pos.db');

db.serialize(() => {
  console.log('--- TABLES ---');
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) console.error(err);
    else console.log(rows.map(r => r.name).join(', '));
  });

  console.log('\n--- PRODUCTS INFO ---');
  db.all("PRAGMA table_info(products)", (err, rows) => {
    if (err) console.error(err);
    else {
      console.log('Column count:', rows.length);
      rows.forEach(r => console.log(`- ${r.name} (${r.type})`));
    }
    db.close();
  });
});

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'container/database/offline_pos.db');
const db = new sqlite3.Database(dbPath);

db.all("SELECT * FROM product_images LIMIT 10", (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log('Product image samples:');
    rows.forEach(row => console.log(JSON.stringify(row)));
  }
  db.close();
});

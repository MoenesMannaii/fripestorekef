const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'container/database/offline_pos.db');
const db = new sqlite3.Database(dbPath);

console.log('Restoring admin user...');

db.get("SELECT count(*) as count FROM users", (err, row) => {
  if (err) {
    console.error('Error checking users:', err);
    db.close();
    return;
  }

  if (row.count === 0) {
    db.run(`
      INSERT INTO users (name, email, phone, password_hash, role, pin)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      'Admin', 
      'admin@aeve.com', 
      '+216', 
      bcrypt.hashSync('admin2K26', 10), 
      'admin', 
      '0000'
    ], function(err) {
      if (err) {
        console.error('Error creating admin user:', err.message);
      } else {
        console.log('Admin user restored with ID:', this.lastID);
      }
      db.close();
    });
  } else {
    console.log('Users already exist. No restoration needed.');
    db.close();
  }
});

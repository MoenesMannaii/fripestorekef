// container/database/init.js
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

async function initializeDatabase() {
  const dbPath = './container/database/offline_pos.db';
  const schemaPath = './container/database/schema.sql';
  
  // Check if database directory exists, create if not
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('Created database directory:', dbDir);
  }

  // Check if database file exists
  const dbExists = fs.existsSync(dbPath);
  
  if (!dbExists) {
    console.log('Database not found. Creating new database...');
    await createDatabase(dbPath, schemaPath);
  } else {
    console.log('Database already exists at:', dbPath);
    // Ensure admin user exists even if DB exists (in case of accidental truncation)
    await ensureAdminExists(dbPath);
  }
}

function ensureAdminExists(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    db.get("SELECT count(*) as count FROM users", (err, row) => {
      if (err) {
        console.error('Error checking users:', err);
        db.close();
        resolve(); // Don't block startup
        return;
      }
      if (row.count === 0) {
        console.log('No users found in existing database. Restoring default admin...');
        createAdminUser(db).then(() => {
          db.close();
          resolve();
        }).catch(reject);
      } else {
        db.close();
        resolve();
      }
    });
  });
}

function createDatabase(dbPath, schemaPath) {
  return new Promise((resolve, reject) => {
    // Create new database
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error creating database:', err.message);
        reject(err);
        return;
      }
      console.log('New SQLite database created.');
    });

    // Ensure schema file exists
    ensureSchemaFile(schemaPath);

    // Read and execute schema
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Split schema by semicolons and execute each statement
      const statements = schema.split(';').filter(stmt => stmt.trim());
      
      db.serialize(() => {
        // Execute all schema statements
        executeSchemaStatements(db, statements)
          .then(() => createAdminUser(db))
          .then(() => createSampleProducts(db))
          .then(() => {
            db.close((err) => {
              if (err) {
                console.error('Error closing database:', err.message);
                reject(err);
              } else {
                console.log('Database initialization completed.');
                resolve();
              }
            });
          })
          .catch(reject);
      });
    } else {
      console.error('Schema file not found at:', schemaPath);
      db.close();
      reject(new Error('Schema file not found'));
    }
  });
}

function executeSchemaStatements(db, statements) {
  return new Promise((resolve, reject) => {
    let completed = 0;
    const total = statements.length;

    if (total === 0) {
      resolve();
      return;
    }

    statements.forEach((statement, index) => {
      if (statement.trim()) {
        db.run(statement + ';', (err) => {
          if (err) {
            console.error(`Error executing statement ${index + 1}:`, err.message);
            console.error('Statement:', statement);
            reject(err);
          } else {
            console.log(`Executed schema statement ${index + 1}`);
            completed++;
            if (completed === total) {
              resolve();
            }
          }
        });
      } else {
        completed++;
        if (completed === total) {
          resolve();
        }
      }
    });
  });
}

function createAdminUser(db) {
  return new Promise((resolve, reject) => {
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
        reject(err);
      } else {
        console.log('Admin user created with ID:', this.lastID);
        resolve();
      }
    });
  });
}

function createSampleProducts(db) {
  return new Promise((resolve, reject) => {
    const sampleProducts = [
      {
        name: 'Produit A',
        price: 2.50,
        cost_price: 1.50,
        stock: 100,
        barcode: '1234567890123',
        description: 'Description du produit A',
        category: 'Électronique'
      },
      {
        name: 'Produit B', 
        price: 3.25,
        cost_price: 2.00,
        stock: 50,
        barcode: '1234567890124',
        description: 'Description du produit B',
        category: 'Vêtements'
      },
      {
        name: 'Produit C',
        price: 4.75,
        cost_price: 3.00,
        stock: 75,
        barcode: '1234567890125',
        description: 'Description du produit C',
        category: 'Alimentation'
      }
    ];

    let completed = 0;
    const total = sampleProducts.length;

    if (total === 0) {
      resolve();
      return;
    }

    sampleProducts.forEach((product, index) => {
      db.run(`
        INSERT INTO products (name, price, cost_price, stock, barcode, description, category)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        product.name,
        product.price,
        product.cost_price,
        product.stock,
        product.barcode,
        product.description,
        product.category
      ], function(err) {
        if (err) {
          console.error(`Error creating product ${index + 1}:`, err.message);
          reject(err);
        } else {
          console.log(`Sample product created: ${product.name} (ID: ${this.lastID})`);
          completed++;
          if (completed === total) {
            resolve();
          }
        }
      });
    });
  });
}

function ensureSchemaFile(schemaPath) {
  const schemaContent = `
PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin','worker')) NOT NULL DEFAULT 'worker',
  pin TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active INTEGER DEFAULT 1
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0.00,
  cost_price REAL DEFAULT 0.00,
  stock INTEGER DEFAULT 0,
  barcode TEXT,
  description TEXT,
  category TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Product images
CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  url TEXT,
  is_primary INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  total REAL NOT NULL,
  tax REAL DEFAULT 0.00,
  paid_amount REAL DEFAULT 0.00,
  change_amount REAL DEFAULT 0.00,
  payment_method TEXT CHECK(payment_method IN ('cash','card','other')) DEFAULT 'cash',
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  name TEXT,
  unit_price REAL NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER,
  actor_role TEXT CHECK(actor_role IN ('admin','worker')),
  action TEXT,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

  const schemaDir = path.dirname(schemaPath);
  if (!fs.existsSync(schemaDir)) {
    fs.mkdirSync(schemaDir, { recursive: true });
  }
  if (!fs.existsSync(schemaPath)) {
    fs.writeFileSync(schemaPath, schemaContent, 'utf8');
    console.log('Schema file created at:', schemaPath);
  }
}

module.exports = { initializeDatabase };
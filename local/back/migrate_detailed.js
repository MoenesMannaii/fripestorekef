const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'container', 'database', 'offline_pos.db');

const migrations = [
    // Products table
    { table: 'products', column: 'has_sub_units', type: 'TINYINT(1) DEFAULT 0' },
    { table: 'products', column: 'pieces_per_box', type: 'INTEGER DEFAULT 1' },
    { table: 'products', column: 'remise_percentage', type: 'DECIMAL(5,2) DEFAULT 0' },
    { table: 'products', column: 'parent_id', type: 'INTEGER REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE' },
    { table: 'products', column: 'attributes', type: 'TEXT' },
    { table: 'products', column: 'sell_by_weight', type: 'TINYINT(1) DEFAULT 0' },
    
    // Orders table
    { table: 'orders', column: 'shift_id', type: 'INTEGER REFERENCES `shifts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE' },
    { table: 'orders', column: 'table_id', type: 'INTEGER REFERENCES `restaurant_tables` (`id`) ON DELETE SET NULL ON UPDATE CASCADE' },
    { table: 'orders', column: 'session_id', type: 'INTEGER REFERENCES `table_sessions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE' },
    { table: 'orders', column: 'client_id', type: 'INTEGER REFERENCES `clients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE' },
    { table: 'orders', column: 'type', type: "TEXT DEFAULT 'sale'" },
    { table: 'orders', column: 'original_order_id', type: 'INTEGER REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE' },
    { table: 'orders', column: 'has_remise', type: 'TINYINT(1) DEFAULT 0' },

    // Order items table
    { table: 'order_items', column: 'original_unit_price', type: 'DECIMAL(10,2)' },
    { table: 'order_items', column: 'discount_amount', type: 'DECIMAL(10,2) DEFAULT 0' },
    { table: 'order_items', column: 'remise_percentage', type: 'DECIMAL(5,2) DEFAULT 0' },

    // Templates table
    { table: 'templates', column: 'loyalty_ratio', type: 'INTEGER DEFAULT 10' },
    { table: 'templates', column: 'product_fields_config', type: 'TEXT' },
    { table: 'templates', column: 'deletion_secret_code', type: "VARCHAR(255) DEFAULT '1234'" },
    { table: 'templates', column: 'deletion_barcode', type: "VARCHAR(255) DEFAULT 'ADMIN-DELETE'" },

    // Factures table
    { table: 'factures', column: 'supplier_id', type: 'INTEGER REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE' },
    { table: 'factures', column: 'supplier_phone', type: 'VARCHAR(255)' },
    { table: 'factures', column: 'supplier_email', type: 'VARCHAR(255)' },
    { table: 'factures', column: 'supplier_address', type: 'VARCHAR(255)' },
];

async function migrate() {
    console.log('Starting migration for:', dbPath);
    const db = new sqlite3.Database(dbPath);

    const getColumns = (tableName) => {
        return new Promise((resolve, reject) => {
            db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(r => r.name));
            });
        });
    };

    try {
        for (const m of migrations) {
            const columns = await getColumns(m.table);
            if (!columns.includes(m.column)) {
                console.log(`Adding column ${m.column} to table ${m.table}...`);
                await new Promise((resolve, reject) => {
                    db.run(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type}`, (err) => {
                        if (err) {
                            console.error(`Error adding column ${m.column}:`, err.message);
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            } else {
                console.log(`Column ${m.column} already exists in table ${m.table}. Skipping.`);
            }
        }
        
        console.log('Migration finished successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        db.close();
    }
}

migrate();

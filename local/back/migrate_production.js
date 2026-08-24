const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = 'c:\\Users\\User\\Desktop\\fripestore\\AEVE\\back\\container\\database\\offline_pos.db';

const migrations = [
    { table: 'templates', column: 'deletion_secret_code', type: "VARCHAR(255) DEFAULT '1234'" },
    { table: 'templates', column: 'deletion_barcode', type: "VARCHAR(255) DEFAULT 'ADMIN-DELETE'" },
    { table: 'audit_logs', column: 'action', type: "VARCHAR(255)" },
    { table: 'audit_logs', column: 'details', type: "TEXT" }
];

async function migrate() {
    console.log('Starting migration for Production:', dbPath);
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
            try {
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
                    console.log(`Column ${m.column} already exists in table ${m.table}.`);
                }
            } catch (err) {
                console.error(`Error processing table ${m.table}:`, err.message);
                // If table doesn't exist, we might need to handle it, but templates/audit_logs should exist
            }
        }
        
        console.log('Production migration finished.');
    } catch (error) {
        console.error('Production migration failed:', error);
    } finally {
        db.close();
    }
}

migrate();

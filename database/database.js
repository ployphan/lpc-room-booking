const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'database.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Run migration for images column in rooms
        db.all("PRAGMA table_info(rooms)", (errInfo, columns) => {
            if (!errInfo && columns && columns.length > 0) {
                const hasImages = columns.some(c => c.name === 'images');
                if (!hasImages) {
                    db.run("ALTER TABLE rooms ADD COLUMN images TEXT", (alterErr) => {
                        if (alterErr) console.error("Error migrating rooms table:", alterErr.message);
                        else console.log("Added images column to rooms table.");
                    });
                }
            }
        });

        // Run migration for first_name and last_name columns in users
        db.all("PRAGMA table_info(users)", (errInfo, columns) => {
            if (!errInfo && columns && columns.length > 0) {
                const hasFirstName = columns.some(c => c.name === 'first_name');
                if (!hasFirstName) {
                    db.run("ALTER TABLE users ADD COLUMN first_name TEXT", (alterErr1) => {
                        if (!alterErr1) {
                            db.run("ALTER TABLE users ADD COLUMN last_name TEXT", (alterErr2) => {
                                if (!alterErr2) {
                                    console.log("Added first_name and last_name columns to users table.");
                                    // Migrate existing data from full_name to first_name and last_name
                                    db.all("SELECT id, full_name FROM users", (selectErr, usersList) => {
                                        if (!selectErr && usersList) {
                                            usersList.forEach(user => {
                                                const parts = (user.full_name || "").trim().split(/\s+/);
                                                const firstName = parts[0] || '';
                                                const lastName = parts.slice(1).join(' ') || '';
                                                db.run("UPDATE users SET first_name = ?, last_name = ? WHERE id = ?", [firstName, lastName, user.id]);
                                            });
                                            console.log("Migrated full_name data to first_name and last_name successfully.");
                                        }
                                    });
                                } else {
                                    console.error("Error adding last_name column:", alterErr2.message);
                                }
                            });
                        } else {
                            console.error("Error adding first_name column:", alterErr1.message);
                        }
                    });
                }
            }
        });
    }
});

// Helper functions for Promises
const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

// Database Initialization (runs schema)
const initializeDatabase = () => {
    return new Promise((resolve, reject) => {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // SQLite cannot run multiple statements directly with run/exec cleanly in all cases,
        // but db.exec can run multiple SQL statements separated by semicolons.
        db.exec(schema, (err) => {
            if (err) {
                console.error('Error executing schema:', err.message);
                reject(err);
            } else {
                console.log('Database tables initialized successfully.');
                resolve();
            }
        });
    });
};

module.exports = {
    db,
    query,
    get,
    run,
    initializeDatabase,
    dbPath
};

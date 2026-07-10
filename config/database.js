const database = require('../database/database');

module.exports = {
    connection: database.db,
    query: database.query,
    get: database.get,
    run: database.run,
    dbPath: database.dbPath
};

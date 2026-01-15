// reads env vars and decides which database to use
require('dotenv').config();

const sql = process.env.DBTYPE === 'postgres' ? require('./postgres') : require('./mysql');

module.exports = sql;

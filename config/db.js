const postgres = require('postgres');

const sql = postgres({
  host: '192.168.30.103',
  port: 5432,
  database: 'vapex',
  username: 'postgres',
  password: '2026'
});

module.exports = sql;
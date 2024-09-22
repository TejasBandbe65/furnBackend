const mysql = require('mysql2')
const {dbconstants} = require('./env');
require('dotenv').config();

const pool = mysql.createPool({
  host: dbconstants.HOST,
  user: dbconstants.USER,
  password: dbconstants.PASSWORD,
  database: dbconstants.DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

module.exports = pool;

// const connection = mysql.createConnection({
//     host: dbconstants.HOST,
//     user: dbconstants.USER,
//     password: process.env.MYSQL_PASSWORD,
//     database: dbconstants.DATABASE
// });

// connection.connect((err) => {
//     if (err) {
//       console.error('Error connecting to the database:', err.stack);
//       return;
//     }
//     console.log('Connected to the database as id ' + connection.threadId);
// });

// module.exports = connection;
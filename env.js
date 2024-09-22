require('dotenv').config();

module.exports.dbconstants = {
    HOST: process.env.MYSQL_HOST,
    USER: process.env.MYSQL_USER,
    DATABASE: process.env.MYSQL_DATABASE,
    PASSWORD: process.env.MYSQL_PASSWORD,
}

// module.exports.dbconstants = {
//     HOST: "bnlsjql5zcmduab9mgri-mysql.services.clever-cloud.com",
//     USER: "u6bpmyofyx7cvs6z",
//     DATABASE: "bnlsjql5zcmduab9mgri",
// }

// module.exports.dbconstants = {
//     HOST: "mysql-test-server65.mysql.database.azure.com",
//     USER: "tejas",
//     DATABASE: "newdb",
// }

module.exports.constants = {
    FORGET_PASSWORD_LENGHT: '12',
}
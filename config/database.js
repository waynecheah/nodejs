var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

var db = {
    development: {
        root: rootPath,
        port: 3000,
        db: 'mongodb://localhost/mydb'
    },

    test: {
        root: rootPath,
        port: 3000,
        db: 'mongodb://localhost/mydb'
    },

    production: {
        root: rootPath,
        port: 3000,
        db: 'mongodb://localhost/mydb'
    }
};

module.exports = db[env];

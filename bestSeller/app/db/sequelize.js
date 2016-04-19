// ====================================================
// Database connection configuration
// ====================================================

var Sequelize = require('sequelize');
var settings  = rootRequire('config/settings');

// Create new Sequelize connection object and reuse it for the queries
var photoeye = new Sequelize(settings.db.database.photoeye, settings.db.username, settings.db.password, {
  host: settings.db.host,
  port: settings.db.port,
  dialect: 'mssql',
  pool: {
    max: 5,
    min: 0,
    idle: 10000
  }
});

// New Sequelize connection object for the Art Photo Index database
var artphotoindex = new Sequelize(settings.db.database.artphotoindex, settings.db.username, settings.db.password, {
  host: settings.db.host,
  port: settings.db.port,
  dialect: 'mssql',
  pool: {
    max: 5,
    min: 0,
    idle: 10000
  }
});

// New Sequelize connection object for the production photoeye database (used just for reading the bookstore home page for now)
var photoeye_prod = new Sequelize(settings.db.database.photoeye_prod, settings.db.username, settings.db.password, {
  host: settings.db.host,
  port: settings.db.port,
  dialect: 'mssql',
  pool: {
    max: 5,
    min: 0,
    idle: 10000
  }
});

module.exports = {
  photoeye:      photoeye,
  photoeye_prod: photoeye_prod,
  artphotoindex: artphotoindex
};

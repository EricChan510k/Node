// ====================================================
// Settings
// ====================================================
var rootRequire = require("root-require");

// Get both environments
var environment = {
  development : rootRequire('config/env/development.json'),
  production  : rootRequire('config/env/production.json')
};

var NODE_ENV = process.env.NODE_ENV || 'development'; // use 'development' environment as default

// Export the configuration for the current environment
module.exports = environment[NODE_ENV];

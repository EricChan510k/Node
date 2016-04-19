// ====================================================
// Solr Search Engine client
// ====================================================

var solr = require('solr-client');

// Create new Solr client
var client = solr.createClient({
  host   : 'localhost',
  port   : '8081',
  core   : 'photoeye'
  // path   : path,
  // agent  : agent,
  // secure : secure,
  // bigint : bigint
});

module.exports = client;

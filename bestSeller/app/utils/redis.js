// ====================================================
// Redis database client
// ====================================================

var redis = require('redis');

// Create new Redis client
var client = redis.createClient();

// Error handler for the Redis connection
client.on('error', function (err) {
  console.error('Redis Error:', err);
});

module.exports = client;

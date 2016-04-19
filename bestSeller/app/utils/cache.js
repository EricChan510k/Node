// ====================================================
// Caching helper functions
// ====================================================

var redis = rootRequire('app/utils/redis');

var cache_days = 1;

// Write the cached response to Redis
function writeCache (key, value) {
  redis.set(key, value);
  redis.expire(key, cache_days * 24 * 60 * 60); // cache the value for specified number of days
}

// Read the cached response from Redis
function readCache (key, callback) {
  redis.get(key, callback);
}

// These functions are used for extending Expressjs response object
function cacheRender (cache_key, template, data) {
  var res = this;

  res.render(template, data, function(err, html) {

    if (!process.env.DISABLE_CACHE) {
      writeCache('cache: ' + cache_key, html);
      winston.log('Request ' + cache_key + ' is cached');
    }

    res.send(html);
  });
};

function cacheJson (cache_key, data) {
  var res = this;

  if (!process.env.DISABLE_CACHE) {
    
    writeCache('cache: ' + cache_key, JSON.stringify(data));
    winston.log('Request ' + cache_key + ' is cached');
  }

  res.json(data);
};

module.exports = {
  writeCache:  writeCache,
  readCache:   readCache,
  cacheRender: cacheRender,
  cacheJson:   cacheJson
}


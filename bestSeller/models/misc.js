// ====================================================
// Miscellaneous model
// ====================================================

var photoeye = rootRequire('app/db/sequelize').photoeye;

function getCountries (callback) {
  var sql =
    `SELECT 
        countrycode, 
        country, 
        ups, 
        fedex, 
        usps, 
        airborne 
      FROM country`;

  photoeye
    .query(sql)
    .spread(function(results, metadata) {
      callback(results);
    });
}

function getCountryInfo (country_code, callback) {
  var sql =
    `SELECT 
        countrycode, 
        country, 
        ups, 
        fedex, 
        usps, 
        airborne 
      FROM country
      WHERE countrycode = :country_code`;

  var params = { country_code: country_code };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {
      callback(results[0]);
    });
}

function getUSStates (callback) {
  var sql =
    `SELECT 
        autoid,
        stateinitials,
        state,
        statewithspaces
      FROM states`;

  photoeye
    .query(sql)
    .spread(function(results, metadata) {
      callback(results);
    });
}

module.exports = {
  getCountries:   getCountries,
  getCountryInfo: getCountryInfo,
  getUSStates:    getUSStates
};

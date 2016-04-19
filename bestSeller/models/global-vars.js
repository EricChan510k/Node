// ====================================================
// Global Vars model
// ====================================================

var photoeye = rootRequire('app/db/sequelize').photoeye;

function getGlobalVars (callback) {
  var sql =
      `SELECT 
          currentuserindex,
          custnumbercounter,
          acctid,
          salestax,
          handlingcharge
        FROM global_vars
        WHERE id = 1`;

  photoeye
    .query(sql)
    .spread(function(results, metadata) {
      callback(results[0]);
    });
}

module.exports = {
  getGlobalVars: getGlobalVars
};

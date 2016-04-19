// ====================================================
// User ID manager
// ====================================================

var photoeye = rootRequire('app/db/sequelize').photoeye;

module.exports = function (req, res, next) {

  if(req.cookies.USERIDNUMBER) {
    req.session.USERIDNUMBER = req.cookies.USERIDNUMBER;
    next(); // continue the execution
  }
  else if(req.session.USERIDNUMBER) {
    res.cookie('USERIDNUMBER', req.session.USERIDNUMBER, { maxAge: 60 * 24 * 60 * 60 * 1000 /* 60 days */, httpOnly: true });
    next(); // continue the execution
  }
  else {

    photoeye.transaction(function (t) {

      var sql =
        `UPDATE global_vars
          SET currentuserindex = currentuserindex + 1
          WHERE id = 1`;

      return photoeye
        .query(sql, { transaction: t })
        .then(function (results) {

          sql =
            `SELECT currentuserindex
              FROM global_vars
              WHERE id = 1`;

          return photoeye
            .query(sql, { transaction: t });

        });

    })
    .then(function (result) {
      // Transaction has been committed
      var USERIDNUMBER = result[0][0].currentuserindex;

      req.session.USERIDNUMBER = USERIDNUMBER;
      res.cookie('USERIDNUMBER', USERIDNUMBER, { maxAge: 60 * 24 * 60 * 60 * 1000 /* 60 days */, httpOnly: true });

      next(); // continue the execution
    })
    .catch(function (err) {
      // Transaction has been rolled back
      winston.error(err);
      throw Error(err);
    });
    
  }

};

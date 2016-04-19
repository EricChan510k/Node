// ====================================================
// Home controller
// ====================================================

module.exports = function (express, app) {

  /* ROUTES */

  // Handle the root path
  app.get('/', function(req, res) {
    res.render(app.get('default'));
  });

}

// ====================================================
// Auctions controller
// ====================================================

module.exports = function (express, app) {

  /* ROUTES */
  
  app.get('/auctions', function(req, res) {
    res.render('auctions/index', { page_name: 'Auctions' });
  });
}

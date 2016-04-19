// ====================================================
// Gallery controller
// ====================================================

module.exports = function (express, app) {

  /* ROUTES */
  
  app.get('/gallery', function(req, res) {
    res.render('gallery/index', { page_name: 'Gallery' });
  });
}

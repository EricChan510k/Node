// ====================================================
// Nudes controller
// ====================================================

// Get the nudes model
var nudes    = rootRequire('models/nudes');
var misc     = rootRequire('app/utils/misc');

module.exports = function (express, app) {

  /* ROUTES */
  
  app.get('/bookstore/nudes', function(req, res) {

    nudes.getFeaturedBook(function(results) {
      results = results[0];

      if(results)
        results.pub_info = misc.getPublishInfo(results);

      res.render('bookstore/nudes', { featured_book: results, page_name: 'Bookstore' });

    });
  });

  app.get('/bookstore/nudes/results', function(req, res) {
    var skip          = req.query.skip || 0,
        take          = req.query.take || 20,
        featured_book = req.query.featured_book;

    nudes.getNudes(skip, take, featured_book, function(results) {
      res.render('partials/_results', { results: results });
    });
  });
}

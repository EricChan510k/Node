// ====================================================
// Limited Editions controller
// ====================================================

// Get the limited-editions model
var limitedEditions = rootRequire('models/limited-editions');
var misc            = rootRequire('app/utils/misc');

module.exports = function (express, app) {

  /* ROUTES */
  
  app.get('/bookstore/limited-editions', function(req, res) {

    limitedEditions.getFeaturedBook(function(results) {
      results = results[0];

      if(results)
        results.pub_info = misc.getPublishInfo(results);

      res.render('bookstore/limited-editions', { featured_book: results, page_name: 'Bookstore' });

    });
  });

  app.get('/bookstore/limited-editions/results', function(req, res) {
    var skip          = req.query.skip || 0,
        take          = req.query.take || 20,
        featured_book = req.query.featured_book;

    limitedEditions.getLimitedEditions(skip, take, featured_book, function(results) {
      res.render('partials/_results', { results: results });
    });
  });
}

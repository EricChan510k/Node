// ====================================================
// New Arrivals controller
// ====================================================

// Get the new-arrivals model
var newArrivals = rootRequire('models/new-arrivals');
var misc        = rootRequire('app/utils/misc');

module.exports = function (express, app) {

  /* ROUTES */
  
  app.get('/bookstore/new-arrivals', function(req, res) {

    newArrivals.getFeaturedBook(function(results) {
      results = results[0];

      if(results)
        results.pub_info = misc.getPublishInfo(results);

      res.render('bookstore/new-arrivals', { featured_book: results, page_name: 'Bookstore' });

    });
  });

  app.get('/bookstore/new-arrivals2', function(req, res) {

    newArrivals.getFeaturedBook(function(results) {
      results = results[0];

      if(results)
        results.pub_info = misc.getPublishInfo(results);

      res.render('bookstore/new-arrivals2', { featured_book: results, page_name: 'Bookstore' });

    });
  });

  app.get('/bookstore/new-arrivals/results', function(req, res) {
    var skip          = req.query.skip || 0,
        take          = req.query.take || 20,
        featured_book = req.query.featured_book;

    newArrivals.getNewArrivals(skip, take, featured_book, function(results) {
      res.render('partials/_results', { results: results });
    });
  });
}

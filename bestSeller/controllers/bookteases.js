// ====================================================
// BookTeases controller
// ====================================================

// Get the bookteases model
var bookteases = rootRequire('models/bookteases');
var misc       = rootRequire('app/utils/misc');

module.exports = function (express, app) {

  /* ROUTES */
  
  app.get('/bookstore/bookteases', function(req, res) {

    bookteases.getFeaturedBook(function(results) {
      results = results[0];

      if(results)
        results.pub_info = misc.getPublishInfo(results);

      res.render('bookstore/ookteases', { featured_book: results, page_name: 'Bookstore' });

    });
  });

  app.get('/bookstore/bookteases/results', function(req, res) {
    var skip          = req.query.skip || 0,
        take          = req.query.take || 20,
        featured_book = req.query.featured_book;

    bookteases.getBookTeases(skip, take, featured_book, function(results) {
      res.render('partials/_results', { results: results });
    });
  });
}

// ====================================================
// Forthcoming Books controller
// ====================================================

// Get the forthcoming-books model
var forthcomingBooks = rootRequire('models/forthcoming-books');
var misc             = rootRequire('app/utils/misc');

module.exports = function (express, app) {

  /* ROUTES */
  
  app.get('/bookstore/forthcoming-books', function(req, res) {

    forthcomingBooks.getFeaturedBook(function(results) {
      results = results[0];

      if(results)
        results.pub_info = misc.getPublishInfo(results);

      res.render('bookstore/forthcoming-books', { featured_book: results, page_name: 'Bookstore' });

    });
  });

  app.get('/bookstore/forthcoming-books/results', function(req, res) {
    var skip          = req.query.skip || 0,
        take          = req.query.take || 20,
        featured_book = req.query.featured_book;

    forthcomingBooks.getForthcomingBooks(skip, take, featured_book, function(results) {
      res.render('partials/_results', { results: results });
    });
  });
}

// ====================================================
// Signed Books controller
// ====================================================

// Get the signed-books model
var signedBooks = rootRequire('models/signed-books');
var misc        = rootRequire('app/utils/misc');

module.exports = function (express, app) {

  /* ROUTES */
  
  app.get('/bookstore/signed-books', function(req, res) {

    signedBooks.getFeaturedBook(function(results) {
      results = results[0];

      if(results)
        results.pub_info = misc.getPublishInfo(results);

      res.render('bookstore/igned-books', { featured_book: results, page_name: 'Bookstore' });

    });
  });

  app.get('/bookstore/signed-books/results', function(req, res) {
    var skip          = req.query.skip || 0,
        take          = req.query.take || 20,
        featured_book = req.query.featured_book;

    signedBooks.getSignedBooks(skip, take, featured_book, function(results) {
      res.render('partials/_results', { results: results });
    });
  });
}

// ====================================================
// Deep Discounts controller
// ====================================================

// Get the deep-discounts model
var deepDiscounts = rootRequire('models/deep-discounts');
var misc          = rootRequire('app/utils/misc');

module.exports = function (express, app) {

  /* ROUTES */
  
  app.get('/bookstore/deep-discounts', function(req, res) {

    deepDiscounts.getFeaturedBook(function(results) {
      results = results[0];

      if(results)
        results.pub_info = misc.getPublishInfo(results);

      res.render('bookstore/deep-discounts', { featured_book: results, page_name: 'Bookstore' });

    });
  });

  app.get('/bookstore/deep-discounts/results', function(req, res) {
    var skip          = req.query.skip || 0,
        take          = req.query.take || 20,
        featured_book = req.query.featured_book;

    deepDiscounts.getDeepDiscounts(skip, take, featured_book, function(results) {
      res.render('partials/_results', { results: results });
    });
  });
}

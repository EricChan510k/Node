// ====================================================
// Citation controller
// ====================================================

// Get the citation model
var citation = rootRequire('models/citation');
var aws      = rootRequire('app/utils/aws');
var misc     = rootRequire('app/utils/misc');
var cache    = rootRequire('app/utils/cache');
var async    = require('async');

module.exports = function (express, app) {

  /* ROUTES */
  
  app.get('/bookstore/citation/:catalog', function(req, res) {
    var catalog = req.params.catalog;

    // we're using async.paraler to flatten the callbacks, without thsi we'll get the so called "callback hell"
    async.parallel({
      book: function(callback) {
        citation.getCitation(catalog, function(results) {
          results = results[0];

          var isbn = '';
          if(results) {
            results.pub_info = misc.getPublishInfo(results);
            isbn = results.hard_isbn || results.soft_isbn;
          }

          aws.getAmazonProductInfo(isbn, function(amazon) {
            if(amazon)
              results.amazon = amazon;

            callback(null, results);
          });

        });
      },
      stock: function(callback) {
        citation.getCitationStock(catalog, function(results) {

          callback(null, misc.getStockInfo(results));
        });
      }
    },
    function(err, results) {
      if(err)
        winston.error('Error while getting citation data');

      results.breadcrumbs = breadcrumbs(req);

      res.render('bookstore/citation', { citation: results, page_name: 'Bookstore' });
    });
    
  });
  
}

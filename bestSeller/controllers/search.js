// ====================================================
// Search controller
// ====================================================

// Get the search model
var search = rootRequire('models/search');
var aws    = rootRequire('app/utils/aws');

module.exports = function (express, app) {

  /* ROUTES */

  app.get('/bookstore/search', function(req, res) {
    search.getSearchResults(req.query.q, 0, 0, function(results) {
      res.render('bookstore/search', { query: req.query.q, total: results.response.numFound, page_name: 'Bookstore' });
    });
  });
  
  app.get('/bookstore/search/results', function(req, res) {
    var query = req.query.query,
        start = req.query.start,
        rows  = req.query.rows,
        width = req.query.width;

    search.getSearchResults(query, start, rows, function(results) {
      res.render('partials/_results', { results: results.response.docs, raw: results });
    });
  });
}

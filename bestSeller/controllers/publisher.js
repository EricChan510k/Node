// ====================================================
// Publisher controller
// ====================================================

// Get the publisher model
var publisher = rootRequire('models/publisher');

module.exports = function (express, app) {

  /* ROUTES */

   app.get('/bookstore/publisher/results', function(req, res) {
    var pub_title = req.query.pub_title,
        skip      = req.query.skip || 0,
        take      = req.query.take || 20,
        width     = req.query.width;

    publisher.getPublisherBooks(pub_title, skip, take, function(results) {
      res.render('partials/_results', { results: results });
    });
  });
  
  app.get('/bookstore/publisher/:title', function(req, res) {
    var title = req.params.title;

    publisher.getPublisher(title, function(results) {
      results = results[0]; // there is only one publisher

      res.render('bookstore/publisher', { publisher: results, title: title, page_name: 'Bookstore' });
    });
  });

}

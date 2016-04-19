// ====================================================
// Text Page controller
// ====================================================

module.exports = function (express, app) {

  /* ROUTES */
  
  // Bookstore
  app.get('/bookstore/inquiries', function(req, res) {
    res.render('bookstore/inquiries', { page_name: 'Bookstore' });
  });

  app.get('/bookstore/submissions', function(req, res) {
    res.render('bookstore/submissions', { page_name: 'Bookstore' });
  });

  app.get('/bookstore/emailnewsletter', function(req, res) {
    res.render('bookstore/emailnewsletter', { page_name: 'Bookstore' });
  });

  app.get('/bookstore/comments', function(req, res) {
    res.render('bookstore/comments', { page_name: 'Bookstore' });
  });

  app.get('/bookstore/faq', function(req, res) {
    res.render('bookstore/faq', { page_name: 'Bookstore' });
  });

  app.get('/bookstore/returns', function(req, res) {
    res.render('bookstore/returns', { page_name: 'Bookstore' });
  });

  // Gallery
  app.get('/gallery/inquiries', function(req, res) {
    res.render('gallery/inquiries', { page_name: 'Gallery' });
  });

  app.get('/gallery/submissions', function(req, res) {
    res.render('gallery/submissions', { page_name: 'Gallery' });
  });

  app.get('/gallery/emailnewsletter', function(req, res) {
    res.render('gallery/emailnewsletter', { page_name: 'Gallery' });
  });

   app.get('/gallery/sales', function(req, res) {
    res.render('gallery/sales', { page_name: 'Gallery' });
  });

  // Auctions
  app.get('/auctions/consignment-info', function(req, res) {
    res.render('auctions/consignment-info', { page_name: 'Auctions' });
  });

  app.get('/auctions/inquiries', function(req, res) {
    res.render('auctions/inquiries', { page_name: 'Auctions' });
  });

  app.get('/auctions/comments', function(req, res) {
    res.render('auctions/comments', { page_name: 'Auctions' });
  });

  app.get('/auctions/faq', function(req, res) {
    res.render('auctions/faq', { page_name: 'Bookstore' });
  });

  // Footer
  app.get('/copyrights', function(req, res) {
    res.render('copyrights');
  });

  app.get('/privacy-policy', function(req, res) {
    res.render('privacy-policy');
  });

  app.get('/contact-us', function(req, res) {
    res.render('contact-us');
  });
}

// ====================================================
// Artist controller
// ====================================================

// Get the artist model
var artist = rootRequire('models/artist');

module.exports = function (express, app) {

  /* ROUTES */

   app.get('/bookstore/artist/results', function(req, res) {
    var subject   = req.query.subject,
        skip      = req.query.skip || 0,
        take      = req.query.take || 20,
        width     = req.query.width;

    var full_name = subject.toLowerCase().split('-');
    var firstname = full_name[0];
    var lastname  = full_name.splice(1).join(' ');

    if(firstname) firstname = firstname.trim();
    if(lastname) lastname = lastname.trim();

    artist.getArtistBooks(lastname, firstname, skip, take, function(results) {
      res.render('partials/_results', { results: results });
    });
  });
  
  app.get('/bookstore/artist/:subject', function(req, res) {
    var subject = req.params.subject;

    var full_name = subject.toLowerCase().split('-');
    var firstname = full_name[0];
    var lastname  = full_name.splice(1).join(' ');

    if(firstname) firstname = firstname.trim();
    if(lastname) lastname = lastname.trim();

    artist.getArtist(lastname, firstname, function(results) {
      results = results[0]; // there is only one artist

      res.render('bookstore/artist', { artist: results, subject: subject, full_name: subject.replace(/-/g, ' '), page_name: 'Bookstore' });
    });
  });

}

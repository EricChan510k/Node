// ====================================================
// Bookstore controller
// ====================================================

// Get the bookstore model
var bookstore = rootRequire('models/bookstore');
var aws       = rootRequire('app/utils/aws');
var async     = require('async');
var moment    = require('moment');
var request   = require('request');

module.exports = function (express, app) {

  /* ROUTES */

  // Main path for loading the images in the front-end
  app.get('/bookstore/load-images', function(req, res) {
    var catalog = req.query.catalog;
    var isbn    = req.query.hard_isbn || req.query.soft_isbn;
    var width   = req.query.width;

    aws.getBookImages(catalog, isbn, width, function(images) {

      res.json(images);
    });
  });

  // This is temporary solution to get the todays bookshelf from the ColdFusion site
  app.get('/bookstore/todays-bookshelf', function(req, res) {

    request('http://www.photoeye.com/bookstore/includes/dsp_todaysbookshelf.html', function(error, response, body) {

      res.send(body);
    });
  });
  
  app.get('/bookstore', function(req, res) {
    // Book of the week
    var bow_catalog = 'ZG586';

    async.parallel({
      abookaday: function(callback) {
        bookstore.get365ABookADay(function(results) {
          callback(null, results);
        });
      },
      todays_bookshelf: function(callback) {
        // NOT used for now
        // bookstore.getTodaysBookshelf(function(results) {
        //   callback(null, results);
        // });
        callback(null, null);
      },
      weeks_bestsellers: function(callback) {
        bookstore.getWeeksBestsellers(function(results) {
          results = results[0]; // this is array with one element so take that first element

          if(results) {
            results.bestsellers = [];
            var counter = 1;

            while (counter <= 10) {
              var catalog = results['Cat' + counter].trim(),
                  title   = results['Title' + counter].trim(),
                  author  = results['Author' + counter].trim();

              results.bestsellers.push({
                catalog: catalog,
                title:   title,
                author:  author
              });

              counter++;
            }

            results.week_ending = moment(results.WeekEnding).format('MMMM Do, YYYY');
          }

          callback(null, results);
        });
      },
      book_of_week: function(callback) {
        bookstore.getBookOfTheWeek(bow_catalog, function(results) {
          results = results[0]; // this is array with one element so take that first element

          if(results) {
            var bow_info = {
              bow_author     : "TR Ericsson",
              bow_author_bio : "TR Ericsson's work has appeared in solo and group exhibitions in the United States and abroad including those with Kunsthalle Marcel Duchamp, Switzerland; Francis M. Naumann Fine Art, NY; Paul Kasmin Gallery, NY, and Harlan Levey Projects, Brussels. Ericsson's work is in the permanent collections of the Whitney Museum of American Art, the Cleveland Museum of Art, the Indianapolis Museum of Art, the Yale University Library (Special Collections) and the Progressive Art Collection as well numerous private collections.",
              bow_avatar     : "trericsson.jpg",
              bow_intro      : "This week's Book of the Week pick comes from TR Ericsson who has selected <em>The Hollow of the Hand</em> by PJ Harvey and Seamus Murphy from Bloomsbury USA.",
              bow_blurb      : "My affection for this book began with my love for PJ Harvey's acclaimed 2011 album Let England Shake &mdash; the urgency of the songs, the intimacy and compassion, the lyrical rage against the violence of our world and a breathtaking artistry and diversity to the melodies and rhythms of the music. She revisits this beautiful and troubling record in this new book. She and her collaborator, photographer Seamus Murphy, travel to Kosovo, Afghanistan and Washington DC and both document their experiences, Seamus Murphy with photography and PJ Harvey with words.",
              bow_blog_link  : "http://blog.photoeye.com/2015/12/book-of-week-pick-by-tr-ericsson.html"
            };

            results.info = bow_info;
          }

          callback(null, results);
        });
      },
      sections: function(callback) {
        bookstore.getBookstoreSections(function(results) {
          callback(null, results);
        });
      }
    },
    function(err, results) {
      if(err)
        throw new Error('Error while getting bookstore data');

      res.render('bookstore/index', { bookstore: results, page_name: 'Bookstore' });
    });

  });
}

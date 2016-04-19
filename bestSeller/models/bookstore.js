// ====================================================
// Bookstore model
// ====================================================

var photoeye = rootRequire('app/db/sequelize').photoeye_prod; // (temporary use the production database for this models)
var aws      = rootRequire('app/utils/aws');
var misc     = rootRequire('app/utils/misc');
var async    = require('async');

// Get the 365 a book a day books form the bookstore home page
function get365ABookADay (callback) {

  var sql =
    `SELECT TOP 15 
        catnum,
        date,
        tagline,
        info,
        blurb,
        title,
        ROW_NUMBER() OVER(ORDER BY date DESC) row_number
      FROM bookaday_books
      WHERE 
        CAST(FLOOR(CAST(date AS FLOAT)) AS DATETIME) BETWEEN 
          CAST(FLOOR(CAST(DATEADD(day, - 15, GETDATE()) AS FLOAT)) AS DATETIME) 
          AND 
          CAST(FLOOR(CAST(DATEADD(day, + 3, GETDATE()) AS FLOAT)) AS DATETIME)`;

  photoeye
    .query(sql)
    .spread(function(results, metadata) {
      misc.normalize365ABookADayData(results);

      // if we have at least 5 books we return them
      if(results && results.length > 5) {
        callback(results);
      }
      // if we don't have book fallback to the last ones present
      else {
        sql =
          `SELECT TOP 15 
              catnum,
              date,
              tagline,
              info,
              blurb,
              title,
              ROW_NUMBER() OVER(ORDER BY date DESC) row_number
            FROM bookaday_books
              ORDER BY date DESC`;

        photoeye
          .query(sql)
          .spread(function(results, metadata) {
            misc.normalize365ABookADayData(results);

            callback(results);
          });
      }
    });
}

// Get today's bookshelf to display it on bookstore home page (NOT used for now)
function getTodaysBookshelf (callback) {

  var sql =
    `SELECT TOP 20 * FROM 
      (
        SELECT 

          LTRIM(RTRIM(inventory.catalog)) AS catalog, 
          shelf_notifiednocover, 
          shelf_firstused, 
          stock.shelf_stockincreased, 
          stock.autoid, 
          LTRIM(RTRIM(inventory.hard_isbn)) AS hard_isbn, 
          LTRIM(RTRIM(inventory.soft_isbn)) AS soft_isbn, 
          LTRIM(RTRIM(authorsx)) AS authorsx, 
          LTRIM(RTRIM(subjectx)) AS subjectx, 
          LTRIM(RTRIM(title2x)) AS title2x, 
          inventory.use_pe_image_only, 
          ROW_NUMBER() OVER(PARTITION BY inventory.catalog ORDER BY recordid DESC) row_num

        FROM stock INNER JOIN inventory ON inventory.catalog = stock.number_root

        WHERE 
          stock.units > 0

      ) unique_bookshelf 

      WHERE unique_bookshelf.row_num = 1
      ORDER BY shelf_stockincreased DESC`;

  photoeye
    .query(sql)
    .spread(function(results, metadata) {
      misc.normalizeInventoryData(results);
      callback(results);
    });
}

// Gets the bestsellers for this week
function getWeeksBestsellers (callback) {

  var sql =
    `SELECT TOP 1 *
      FROM bookstore_bestsellers
      ORDER BY bookstore_bestsellers.weekending DESC`;

  photoeye
    .query(sql)
    .spread(function(results, metadata) {
      callback(results);
    });
}

// Get the book of the week
function getBookOfTheWeek (catalog, callback) {

  var sql =
    `SELECT TOP 1 
        recordid,
        LTRIM(RTRIM(catalog)) AS catalog,
        LTRIM(RTRIM(inventory.hard_isbn)) AS hard_isbn, 
        LTRIM(RTRIM(inventory.soft_isbn)) AS soft_isbn, 
        LTRIM(RTRIM(title2x)) AS title2x, 
        LTRIM(RTRIM(authorsx)) AS authorsx, 
        LTRIM(RTRIM(subjectx)) AS subjectx, 
        LTRIM(RTRIM(publisherx)) AS publisherx, 
        inventory.use_pe_image_only 
      FROM inventory
      WHERE catalog = :catalog`;

  var params = { catalog: catalog };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {
      misc.normalizeInventoryData(results);
      callback(results);
    });
}

/*
  Category/Section ID (CategoryNo) Chart

  -/1  - New Arrivals
  -/3  - Deep Discounts
  -/4  - Signed Books
  -/5  - Limited Editions
  -/6  - Videos
  1/7  - Monographs
  2/8  - Visual Anthologies
  5/9  - Essays
  9/-  - Nudes
  9/10 - Technical
  1/14 - Foreign
  -/15 - Calendars
*/

// Get the bookstore sections to show them on the bookstore home page
function getBookstoreSections (callback) {
  var width = 300;

  var i = 0;

  var sections = [

    { section_model: 'new-arrivals', section_name: 'New Arrivals', section_link: '/bookstore/new-arrivals' },
    { section_model: 'deep-discounts', section_name: 'Deep Discounts', section_link: '/bookstore/deep-discounts' },
    { section_model: 'bookteases', section_name: 'BookTeases', section_link: '/bookstore/bookteases' },
    { section_model: 'nudes', section_name: 'Nudes', section_link: '/bookstore/nudes' },
    { section_model: 'signed-books', section_name: 'Signed Books', section_link: '/bookstore/signed-books' },
    { section_model: 'limited-editions', section_name: 'Limited Editions', section_link: '/bookstore/limited-editions' },
    { section_model: 'forthcoming-books', section_name: 'Forthcoming Books', section_link: '/bookstore/forthcoming-books' }

  ];

  agregated_results = [];

  async.whilst(
    function () {
      return i < sections.length;
    },
    function (sql_callback) {

      var model = rootRequire('models/' + sections[i].section_model).select_sql;

      // get section with random book
      sql = `SELECT TOP 1 
                ` + model + `
              ORDER BY NEWID()`;

      photoeye
        .query(sql)
        .spread(function(results, metadata) {
          misc.normalizeInventoryData(results);
          sections[i].data = results[0]; // there's only one element
          i++;

          sql_callback(null, sections);
        });

    },
    function (err, all_results) {
      if(err)
        winston.error('Error while getting bookstore sections');

      callback(all_results);
    }
  );
}

module.exports = {
  get365ABookADay:      get365ABookADay,
  getTodaysBookshelf:   getTodaysBookshelf,
  getWeeksBestsellers:  getWeeksBestsellers,
  getBookOfTheWeek:     getBookOfTheWeek,
  getBookstoreSections: getBookstoreSections
};

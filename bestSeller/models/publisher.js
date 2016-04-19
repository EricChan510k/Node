// ====================================================
// Publisher model
// ====================================================

var photoeye  = rootRequire('app/db/sequelize').photoeye;
var misc      = rootRequire('app/utils/misc');
var async     = require('async');
var unidecode = require('unidecode');

function getPublisher (title, callback) {
  var translit_t = unidecode(title);

  var sql =
    `SELECT 
        showcaseid,
        title,
        logoname,
        RIGHT(logoname, 3) AS extension,
        about,
        begindate,
        showcaseimg,
        logoandtitle
      FROM pubshowcase
      WHERE 
        REPLACE(RTRIM(LTRIM(title)), ' ', '-') = :title
        OR REPLACE(RTRIM(LTRIM(altsearch1)), ' ', '-') = :title 
        OR REPLACE(RTRIM(LTRIM(altsearch2)), ' ', '-') = :title 
        OR REPLACE(RTRIM(LTRIM(altsearch3)), ' ', '-') = :title

        OR REPLACE(RTRIM(LTRIM(title)), ' ', '-') = :translit_t
        OR REPLACE(RTRIM(LTRIM(altsearch1)), ' ', '-') = :translit_t 
        OR REPLACE(RTRIM(LTRIM(altsearch2)), ' ', '-') = :translit_t 
        OR REPLACE(RTRIM(LTRIM(altsearch3)), ' ', '-') = :translit_t

        OR REPLACE(REPLACE(RTRIM(LTRIM(title)), ' ', ''), '-', '') = REPLACE(REPLACE(:title, ' ', ''), '-', '')
        OR REPLACE(REPLACE(RTRIM(LTRIM(altsearch1)), ' ', ''), '-', '') = REPLACE(REPLACE(:title, ' ', ''), '-', '') 
        OR REPLACE(REPLACE(RTRIM(LTRIM(altsearch2)), ' ', ''), '-', '') = REPLACE(REPLACE(:title, ' ', ''), '-', '') 
        OR REPLACE(REPLACE(RTRIM(LTRIM(altsearch3)), ' ', ''), '-', '') = REPLACE(REPLACE(:title, ' ', ''), '-', '')

        OR REPLACE(REPLACE(RTRIM(LTRIM(title)), ' ', ''), '-', '') = REPLACE(REPLACE(:translit_t, ' ', ''), '-', '')
        OR REPLACE(REPLACE(RTRIM(LTRIM(altsearch1)), ' ', ''), '-', '') = REPLACE(REPLACE(:translit_t, ' ', ''), '-', '') 
        OR REPLACE(REPLACE(RTRIM(LTRIM(altsearch2)), ' ', ''), '-', '') = REPLACE(REPLACE(:translit_t, ' ', ''), '-', '') 
        OR REPLACE(REPLACE(RTRIM(LTRIM(altsearch3)), ' ', ''), '-', '') = REPLACE(REPLACE(:translit_t, ' ', ''), '-', '')`;

  var params = { title: title, translit_t: translit_t };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {
      callback(results);
    });
}

function getPublisherBooks (publisher, skip, take, callback) {
  var translit_t = unidecode(publisher);

  var sql =
    `SELECT * FROM (
        SELECT ROW_NUMBER() OVER (ORDER BY publisher_books.datepub DESC) AS row_number, * FROM (
            SELECT * FROM (
              (
                SELECT 
                  inventory.recordid, 
                  LTRIM(RTRIM(inventory.catalog)) AS catalog, 
                  LTRIM(RTRIM(inventory.hard_isbn)) AS hard_isbn, 
                  LTRIM(RTRIM(inventory.soft_isbn)) AS soft_isbn, 
                  LTRIM(RTRIM(inventory.subjectx)) AS subjectx, 
                  LTRIM(RTRIM(inventory.title2x)) AS title2x, 
                  LTRIM(RTRIM(inventory.publisherx)) AS publisherx, 
                  LTRIM(RTRIM(inventory.authorsx)) AS authorsx, 
                  inventory.use_pe_image_only, 
                  inventory.ltd_editio,
                  inventory.datepub,
                  1 AS nyp,
                  ROW_NUMBER() OVER(PARTITION BY inventory.catalog ORDER BY recordid DESC) row_num
                FROM inventory 
                WHERE 
                  (hardbound = 1 AND hard_nyp = 1) 
                  OR 
                  (softbound = 1 AND soft_nyp = 1)
              )
              UNION
              (
                SELECT 
                  inventory.recordid, 
                  LTRIM(RTRIM(inventory.catalog)) AS catalog, 
                  LTRIM(RTRIM(inventory.hard_isbn)) AS hard_isbn, 
                  LTRIM(RTRIM(inventory.soft_isbn)) AS soft_isbn, 
                  LTRIM(RTRIM(inventory.subjectx)) AS subjectx, 
                  LTRIM(RTRIM(inventory.title2x)) AS title2x, 
                  LTRIM(RTRIM(inventory.publisherx)) AS publisherx, 
                  LTRIM(RTRIM(inventory.authorsx)) AS authorsx, 
                  inventory.use_pe_image_only, 
                  inventory.ltd_editio,
                  inventory.datepub,
                  0 AS nyp,
                  ROW_NUMBER() OVER(PARTITION BY inventory.catalog ORDER BY recordid DESC) row_num
                FROM inventory 
                WHERE  
                  hard_nyp = 0 AND soft_nyp = 0
              )
            ) unique_books WHERE unique_books.row_num = 1
        ) publisher_books
        WHERE
          REPLACE(RTRIM(LTRIM(publisher_books.publisherx)), ' ', '-') = :publisher
          OR
          REPLACE(RTRIM(LTRIM(publisher_books.publisherx)), ' ', '-') = :translit_t
          OR
          REPLACE(REPLACE(RTRIM(LTRIM(publisher_books.publisherx)), ' ', ''), '-', '') = REPLACE(REPLACE(:publisher, ' ', ''), '-', '')
          OR
          REPLACE(REPLACE(RTRIM(LTRIM(publisher_books.publisherx)), ' ', ''), '-', '') = REPLACE(REPLACE(:translit_t, ' ', ''), '-', '')
      ) paged_books
      WHERE
        row_number BETWEEN
          :skip + 1
          AND 
          :skip + :take
      ORDER BY 
        paged_books.nyp DESC,
        paged_books.datepub DESC`;

  var params = { publisher: publisher, translit_t: translit_t, skip: parseInt(skip), take: parseInt(take) };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {
      misc.normalizeInventoryData(results);
      callback(results);
    });
}

module.exports = {
  getPublisher:      getPublisher,
  getPublisherBooks: getPublisherBooks
};

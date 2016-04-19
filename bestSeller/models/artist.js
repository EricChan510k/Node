// ====================================================
// Artist model
// ====================================================

var photoeye      = rootRequire('app/db/sequelize').photoeye;
var artphotoindex = rootRequire('app/db/sequelize').artphotoindex;
var misc          = rootRequire('app/utils/misc');
var unidecode     = require('unidecode');

function getArtist (lastname, firstname, callback) {
  var translit_l = unidecode(lastname);
  var translit_f = unidecode(firstname);

  var sql =
    `SELECT 
        id,
        lastname,
        firstname,
        city,
        state,
        region,
        nationality,
        birth,
        bio
      FROM api_photographers
      WHERE 
        (lastname = :lastname OR lastname = :translit_l)
        AND 
        (firstname = :firstname OR firstname = :translit_f)`;

  var params = { lastname: lastname, firstname: firstname, translit_l: translit_l, translit_f: translit_f};

  artphotoindex
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {

      callback(misc.getArtistInfo(results));
    });
}

function getArtistBooks (lastname, firstname, skip, take, callback) {
  var translit_l = unidecode(lastname);
  var translit_f = unidecode(firstname);

  var sql =
    `SELECT * FROM (
        SELECT ROW_NUMBER() OVER (ORDER BY artist_books.datepub DESC) AS row_number, * FROM (
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
        ) artist_books
        WHERE
          (
            artist_books.authorsx LIKE :first_last
            OR
            artist_books.authorsx LIKE :last_first
            OR
            artist_books.subjectx = :subject
            OR
            artist_books.authorsx LIKE :translit_fl
            OR
            artist_books.authorsx LIKE :translit_lf
            OR
            artist_books.subjectx = :translit_s
          )
          AND (artist_books.datepub IS NOT NULL OR artist_books.datepub <> '')

      ) paged_books
      WHERE
        row_number BETWEEN
          :skip + 1
          AND 
          :skip + :take
      ORDER BY 
        paged_books.nyp DESC,
        paged_books.datepub DESC`;

  var params = {
    first_last: '%' + firstname + ' ' + lastname + '%',
    last_first: '%' + lastname + ' ' + firstname + '%',
    translit_fl: '%' + translit_f + ' ' + translit_l + '%',
    translit_lf: '%' + translit_l + ' ' + translit_f + '%',
    subject: lastname + ', ' + firstname,
    translit_s: translit_l + ', ' + translit_f,
    skip: parseInt(skip),
    take: parseInt(take)
  };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {
      misc.normalizeInventoryData(results);
      callback(results);
    });
}

module.exports = {
  getArtist:      getArtist,
  getArtistBooks: getArtistBooks
};

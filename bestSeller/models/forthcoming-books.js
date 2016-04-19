// ====================================================
// Forthcoming Books model
// ====================================================

var photoeye = rootRequire('app/db/sequelize').photoeye;
var misc     = rootRequire('app/utils/misc');

var select_sql =
  ` inventory.recordid, 
    LTRIM(RTRIM(inventory.catalog)) AS catalog, 
    LTRIM(RTRIM(inventory.hard_isbn)) AS hard_isbn, 
    LTRIM(RTRIM(inventory.soft_isbn)) AS soft_isbn, 
    LTRIM(RTRIM(inventory.subjectx)) AS subjectx, 
    LTRIM(RTRIM(inventory.title2x)) AS title2x, 
    inventory.abstractx, 
    inventory.ocrx, 
    LTRIM(RTRIM(inventory.publisherx)) AS publisherx, 
    LTRIM(RTRIM(inventory.authorsx)) AS authorsx, 
    inventory.use_pe_image_only, 
    inventory.ltd_editio,
    inventory.datepub,
    stock.units, 
    stock.discont,
    stock.qtyreserved, 
    ROW_NUMBER() OVER(PARTITION BY inventory.catalog ORDER BY recordid DESC) row_num

  FROM inventory INNER JOIN stock ON inventory.catalog = stock.number_root

  WHERE 
    (hardbound = 1 AND hard_nyp = 1) 
    OR 
    (softbound = 1 AND soft_nyp = 1)`;

function getForthcomingBooks (skip, take, featured_book, callback) {

  var sql =
    `SELECT *
      FROM
      (
        SELECT 
          ROW_NUMBER() OVER (ORDER BY unique_inventory.recordid DESC) AS row_number,
          *
          FROM
          (
            SELECT

              ` + select_sql + `
              AND inventory.catalog <> :featured_book

          ) unique_inventory

        WHERE unique_inventory.row_num = 1

      ) AS paged_inventory

      WHERE
        row_number BETWEEN
          :skip + 1
          AND 
          :skip + :take`;

  var params = { skip: parseInt(skip), take: parseInt(take), featured_book: featured_book };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {
      misc.normalizeInventoryData(results);
      callback(results);
    });
}

function getFeaturedBook (callback) {

  var sql =
    `SELECT TOP 1 *
      FROM 
      (
        SELECT
          ` + select_sql + `
          AND (stock.units - stock.qtyreserved) > 0
      ) in_stock_books

      ORDER BY NEWID()`;

  photoeye
    .query(sql)
    .spread(function(results, metadata) {
      misc.normalizeInventoryData(results);
      callback(results);
    });
}

module.exports = {
  select_sql:          select_sql,
  getForthcomingBooks: getForthcomingBooks,
  getFeaturedBook:     getFeaturedBook
};

// ====================================================
// BookTeases model
// ====================================================

var photoeye = rootRequire('app/db/sequelize').photoeye;
var aws      = rootRequire('app/utils/aws');
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
    stock.qtyreserved, 
    stock.price1, 
    (stock.units - stock.qtyreserved) AS stock_left, 
    CASE WHEN (stock.units - stock.qtyreserved) > 0 THEN '1' ELSE '0' END AS in_stock,
    ROW_NUMBER() OVER(PARTITION BY inventory.catalog ORDER BY recordid DESC) row_num

  FROM inventory INNER JOIN stock ON inventory.catalog = stock.number_root

  WHERE 
    (stock.units - stock.qtyreserved) > 0 
    AND inventory.datepub NOT LIKE '%d%'`;

function getBookTeases (skip, take, featured_book, callback) {

  var sql =
    `SELECT *
      FROM
      (
        SELECT 
          ROW_NUMBER() OVER (ORDER BY unique_inventory.datepub DESC, unique_inventory.stock_left DESC) AS row_number,
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
  select_sql:      select_sql,
  getBookTeases:   getBookTeases,
  getFeaturedBook: getFeaturedBook
};

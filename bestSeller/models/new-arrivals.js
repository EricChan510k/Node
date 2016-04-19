// ====================================================
// New Arrivals model
// ====================================================

var photoeye = rootRequire('app/db/sequelize').photoeye;
var misc     = rootRequire('app/utils/misc');

var select_sql = 
  ` LTRIM(RTRIM(inventory.catalog)) AS catalog, 
    LTRIM(RTRIM(inventory.subjectx)) AS subjectx, 
    LTRIM(RTRIM(inventory.title2x)) AS title2x, 
    LTRIM(RTRIM(inventory.hard_isbn)) AS hard_isbn, 
    LTRIM(RTRIM(inventory.soft_isbn)) AS soft_isbn, 
    inventory.abstractx, 
    inventory.ocrx, 
    LTRIM(RTRIM(publisherx)) AS publisherx, 
    LTRIM(RTRIM(authorsx)) AS authorsx, 
    inventory.use_pe_image_only, 
    inventory.datepub, 
    inventory.ltd_editio, 
    stock.price1, 
    LTRIM(RTRIM(stock.number_root)) AS number_root, 
    LTRIM(RTRIM(stock.number_binding)) AS number_binding, 
    stock.number, 
    stock.discont, 
    stock.units, 
    stock.qtyreserved, 
    stock.shelf_firstused, 
    ROW_NUMBER() OVER(PARTITION BY inventory.catalog ORDER BY recordid DESC) row_num
    FROM 
        inventory INNER JOIN stock 
          ON inventory.catalog  = stock.number_root 
    WHERE 
      (stock.units) > 0 AND inventory.datepub > 2009`;

function getNewArrivals (skip, take, featured_book, callback) {

  var sql =
    `SELECT *
      FROM
      (
        SELECT 
          ROW_NUMBER() OVER (ORDER BY unique_inventory.shelf_firstused DESC, unique_inventory.datepub DESC) AS row_number,
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
  getNewArrivals:  getNewArrivals,
  getFeaturedBook: getFeaturedBook
};

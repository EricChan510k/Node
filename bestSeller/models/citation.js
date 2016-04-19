// ====================================================
// Citation model
// ====================================================

var photoeye = rootRequire('app/db/sequelize').photoeye;
var misc     = rootRequire('app/utils/misc');

function getCitation (catalog, callback) {

  var sql =
    `SELECT
        recordid,
        LTRIM(RTRIM(inventory.catalog)) AS catalog, 
        LTRIM(RTRIM(inventory.subjectx)) AS subjectx, 
        LTRIM(RTRIM(inventory.publisherx)) AS publisherx, 
        LTRIM(RTRIM(inventory.title2x)) AS title2x, 
        inventory.abstractx, 
        inventory.ocrx, 
        inventory.hardbound, 
        LTRIM(RTRIM(inventory.hard_isbn)) AS hard_isbn, 
        LTRIM(RTRIM(inventory.soft_isbn)) AS soft_isbn, 
        inventory.hard_price, 
        inventory.cityx, 
        inventory.country, 
        inventory.language, 
        inventory.datepub, 
        inventory.pages, 
        inventory.illustrat, 
        inventory.sizex, 
        LTRIM(RTRIM(inventory.authorsx)) AS authorsx, 
        inventory.ltd_editio,
        inventory.bestbooks,
        inventory.use_pe_image_only,
        inventory.soft_nyp,
        inventory.hard_nyp,
        stock.price1, 
        CASE WHEN (stock.units - stock.qtyreserved) > 0 THEN 1 ELSE 0 end AS in_stock

      FROM inventory INNER JOIN stock ON inventory.catalog = stock.number_root

      WHERE 
        inventory.catalog = :catalog`;

  var params = { catalog: catalog };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {
      misc.normalizeInventoryData(results);
      callback(results);
    });
}

function getCitationStock (catalog, callback) {

  var sql =
    `SELECT 

      LTRIM(RTRIM(number)) AS number,
      LTRIM(RTRIM(number_root)) AS number_root,
      LTRIM(RTRIM(number_binding)) AS number_binding,
      price1,
      units,
      qtyreserved,
      CASE WHEN (stock.units - stock.qtyreserved) > 0 THEN 1 ELSE 0 END AS in_stock,
      saleprice,
      discont,
      additional_handling,
      unitweight,
      stockwidth,
      stockheight,
      stocklength,
      stockisbn,
      invrecordid,
      ingram

    FROM stock 
      WHERE number_root = :catalog 
      ORDER BY in_stock DESC, discont ASC`;

  var params = { catalog: catalog };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {
      callback(results);
    });
}

module.exports = {
  getCitation:      getCitation,
  getCitationStock: getCitationStock
};

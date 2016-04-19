// ====================================================
// Search model
// ====================================================

// Get the Solr client
var solr = rootRequire('app/utils/solr');
var misc = rootRequire('app/utils/misc');

function getSearchResults (query, start, rows, callback) {
  var query =
    solr.createQuery()
      .q(query)
      .sort({ datepub: 'desc', hard_due: 'desc', soft_due: 'desc' })
      .start(start)
      .rows(rows);

  solr.search(query,function(err, results) {
    if(err) {
      console.error(err);
      callback(err);
    }
    else {
      misc.normalizeInventoryData(results.response.docs);
      callback(results);
    }
  });
}

module.exports = {
  getSearchResults: getSearchResults
};

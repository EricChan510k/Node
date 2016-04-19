// ====================================================
// Nunjucks custom filters
// ====================================================

module.exports = function (views_env) {

  views_env.addFilter('toFixed', function(val, decimals) {
    decimals = decimals || 0;
    return val.toFixed(decimals);
  });
};

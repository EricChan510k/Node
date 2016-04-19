// ====================================================
// Routes Middleware
// ====================================================

// Get the artist model
var order = rootRequire('models/order');
var nunjucks    = require('nunjucks');

module.exports = function(express, app, views_env) {

  // ====================================================
  // Expose the Request object to the view templates
  // ====================================================

  app.use(function (req, res, next) {
    
    // add global variable to all views
    views_env.addGlobal('req', req);

    next();
  });


  // ====================================================
  // Initialize the user id manager
  // ====================================================

  app.use(rootRequire('app/utils/userid'));


  // ====================================================
  // Initialize the cart count
  // ====================================================

  function setCartCount (req, res, count) {
    req.session.cart_count = count;

    res.locals.cart_count = count;
  }

  app.use(function (req, res, next) {

    if(typeof req.session.cart_count == 'undefined')
      order.getCartCount(req.session.USERIDNUMBER, function (results) {
        results = results[0];

        setCartCount(req, res, results.cart_count || 0);
        next();
      });
    else {
      setCartCount(req, res, req.session.cart_count);
      next();
    }
  });


  // ====================================================
  // Initialize the breadcrumbs manager
  // ====================================================

  rootRequire('app/utils/breadcrumbs');


  // ====================================================
  // Check the cached requests first
  // ====================================================

  var cache = rootRequire('app/utils/cache');

  app.use(function (req, res, next) {

    cache.readCache('cache: ' + req.url, function(err, reply) {
      if(reply && !process.env.DISABLE_CACHE) {
        console.log('Request ' + req.url + ' from cache');

        reply = reply.toString();

        // check if the cache is object
        try {
          reply = JSON.parse(reply);
        } catch(ex) { }

        if(typeof reply == 'object')
          res.json(reply);
        else
          res.send(reply);
      }
      else
        next(); // otherwise continue
    });
    
  });

};

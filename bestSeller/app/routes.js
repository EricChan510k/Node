module.exports = function(express, app, passport, views_env) {

  // ====================================================
  // Initialize the middleware
  // ====================================================

  rootRequire('app/middleware')(express, app, views_env);
  

  // ====================================================
  // Handle the routes for different controllers
  // ====================================================

  rootRequire('app/utils/module-loader')('controllers', express, app, passport);


  // ====================================================
  // Handle the page errors routes
  // ====================================================

  // Error handling before the end
  app.use(function(err, req, res, next) {
    // log the errro on console
    console.error(err.stack);

    res.status(500).render('error/500');
  });

  // Assume 404 since no middleware responded by now
  app.use(function(req, res, next){
    res.status(404).render('error/404', { url: req.originalUrl });
  });
  
}

// ====================================================
// Set up the PassportJS authentication
// ====================================================

var account = rootRequire('models/account');

// define global function for authenticated routes
global.isAuthenticated = function(req, res, next) {
  if (!req.isAuthenticated()) {
    req.flash('login-message', 'You must login to access your account');
    res.redirect('/account/login');
  }
  else
    next();
};

module.exports = function(passport) {

  // =========================================================================
  // Passport Session Setup ==================================================
  // =========================================================================
  // required for persistent login sessions
  // passport needs ability to serialize and unserialize users out of session

  // used to serialize the user for the session
  passport.serializeUser(function(user, done) {
    done(null, user.custnumber || user.altnum);
  });

  // used to deserialize the user
  passport.deserializeUser(function(custnumber, done) {
    account.getUserByCustnumber(custnumber, function(user) {
      if(user)
        return done(null, user); // if we have user then return it
      
      done(null, false); // invalidates the existing login session because we have such user
    });
  });

  // Configure the strategies
  rootRequire('app/auth/strategies/local')(passport);
  rootRequire('app/auth/strategies/facebook')(passport);
  rootRequire('app/auth/strategies/twitter')(passport);
  rootRequire('app/auth/strategies/instagram')(passport);

};

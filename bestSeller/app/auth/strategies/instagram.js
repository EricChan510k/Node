// =========================================================================
// INSTAGRAM ===============================================================
// =========================================================================

var account           = rootRequire('models/account'),
    InstagramStrategy = require('passport-instagram').Strategy;

// Load the auth variables
var settings = rootRequire('config/settings');

var strategy = 'instagram';

module.exports = function(passport) {

  passport.use(strategy,
    new InstagramStrategy({
      clientID     : settings.auth.instagram.clientID,
      clientSecret : settings.auth.instagram.clientSecret,
      callbackURL  : settings.auth.instagram.callbackURL,
      passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    }, function(req, token, refreshToken, profile, done) { // the callback will send back the token and profile

      var email = null;
      if(profile.emails && profile.emails[0] && profile.emails[0].value)
        email = profile.emails[0].value;

      account.getUserBySocialLogin(strategy, profile.id, function(socialUser) {

        // if social profile exist always login that user
        if(socialUser)
          return done(null, socialUser); 

        // check if the user is already logged in
        if (req.user) {
          // user already exists and is logged in, but no social profile found so we have to link the accounts
          account.createNewSocialLoginForUser(req.user.custnumber || req.user.altnum, strategy, profile.id, profile.displayName, email, function(newUser) {
            return done(null, newUser);
          });
        }
        else {
          // if there is no user found with that social profile, create them
          account.createNewUserWithSocialLogin(strategy, profile.id, profile.displayName, email, function(newUser) {
            return done(null, newUser);
          });
        }

      });

  }));

};

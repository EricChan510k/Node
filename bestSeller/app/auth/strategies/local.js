
var account       = rootRequire('models/account'),
    LocalStrategy = require('passport-local').Strategy;

// function setRememberMeCookie(req) {
//   if(req.session)
//   {
//     if (req.body.remember)
//       req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 365; // One year
//     else
//       req.session.cookie.expires = false;
//   }
// }

module.exports = function(passport) {

  // =========================================================================
  // LOCAL SIGNUP
  // =========================================================================
  // we are using named strategies since we have one for login and one for signup
  // by default, if there was no name, it would just be called 'local'
  passport.use('local-signup',
    new LocalStrategy({
      // by default, local strategy uses username and password, we will override with email
      usernameField : 'email',
      passwordField : 'password',
      passReqToCallback : true // allows us to pass back the entire request to the callback
    }, function(req, email, password, done) {

      if(email != req.body['re-email'])
        return done(null, false, req.flash('signup-message', 'Emails don\'t match.'));

      if(password != req.body['re-password'])
        return done(null, false, req.flash('signup-message', 'Passwords don\'t match.'));

      if(password.trim().length < 5)
        return done(null, false, req.flash('signup-message', 'Password must be at least 5 characters.'));

      // find a user whose email is the same as the forms email
      // we are checking to see if the user trying to signup already exists
      account.getUserByEmail(email, function(existingUser) {

        // check to see if theres already a user with that email
        if (existingUser)
          return done(null, false, req.flash('signup-message', 'That email is already taken.'));
        
        // If we're logged in, we're connecting a new local account.
        if(req.user && !req.user.email) {
            // var user            = req.user;
            // user.local.email    = email;
            // user.local.password = user.generateHash(password);

            // user.save(function(err) {
            //   if (err)
            //     throw err;
            //   return done(null, user);
            // });
        }
        //  We're not logged in, so we're creating a brand new user.
        else {
          // if there is no user with that email
          // create the user
          account.createNewUser(email, password, function (newUser) {
            return done(null, newUser);
          });
        }
      });
  }));


  // =========================================================================
  // LOCAL LOGIN
  // =========================================================================
  // we are using named strategies since we have one for login and one for signup
  // by default, if there was no name, it would just be called 'local'
  passport.use('local-login',
    new LocalStrategy({
      // by default, local strategy uses username and password, we will override with email
      usernameField : 'email',
      passwordField : 'password',
      passReqToCallback : true // allows us to pass back the entire request to the callback
    }, function(req, email, password, done) { // callback with email and password from our form
      // find a user whose email is the same as the forms email
      // we are checking to see if the user trying to login already exists
      account.getUserByEmail(email, function(user) {
        // if the user don't have the password_nodejs password reset his password
        if(user && !user.password_nodejs) {

          account.sendPasswordResetEmail(email);

          return done(null, false, req.flash('login-message', 'Since we migrated our new site we need to reset your password. We sent you an email with the reset password link. You will have to do this one time.'));
        }

        // if no user is found, return the message
        if (!user || !account.validatePassword(password, user.password_nodejs))
          return done(null, false, req.flash('login-message', 'Wrong username or password.')); // req.flash is the way to set flashdata using connect-flash

        // setRememberMeCookie(req);
        return done(null, user); // all is well, return successful user
      });
  }));

};

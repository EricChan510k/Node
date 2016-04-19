// ====================================================
// Account controller
// ====================================================

// Get the account model
var account = rootRequire('models/account');
var order   = rootRequire('models/order');
var misc    = rootRequire('models/misc');
var async   = require('async');

module.exports = function (express, app, passport) {

  /* ROUTES */

  // gets the main account page
  app.get('/account', isAuthenticated, function(req, res) {

    var custnumber = req.user.custnumber || req.user.altnum;

    // get all data for the account, the user, the addresses, shipping, orders, etc.
    async.parallel({
      user: function(callback) {
        callback(null, req.user); // because the user is authenticated we have his info in the request.user object
      },
      addresses: function(callback) {
        account.getAllAddresses(custnumber, function (results) {
          callback(null, results);
        });
      },
      credit_cards: function(callback) {
        account.getCreditCards(custnumber, false /* don't get the deleted */, function(results) {
          callback(null, results);
        });
      },
      shipping: function(callback) {
        account.getShippingMethods(custnumber, function(results) {
          callback(null, results);
        });
      },
      countries: function(callback) {
        misc.getCountries(function (results) {
          callback(null, results);
        });
      },
      states: function(callback) {
        misc.getUSStates(function (results) {
          callback(null, results);
        });
      }
    },
    function(err, results) {
      if(err)
        throw new Error('Error while getting user data');

      res.render('account/index', { account: results, message: req.session.error });
      delete req.session.error;
    });
    
  });

  // saves the account email and password
  app.post('/account', isAuthenticated, function(req, res) {

    var custnumber = req.user.custnumber || req.user.altnum;

    switch(req.query.save) {
      case 'account':

        if(req.body.email != req.body['re-email']) {
          req.session.error = 'Emails don\'t match.';
          return res.redirect(req.url);
        }

        if(req.body.password != req.body['re-password']) {
          req.session.error = 'Passwords don\'t match.';
          return res.redirect(req.url);
        }

        if(req.body.password.trim().length < 5) {
          req.session.error = 'Password must be at least 5 characters.';
          return res.redirect(req.url);
        }

        account.getUserByEmail(req.body.email, function(user) {

          if(user && user.custnumber != custnumber) {
            req.session.error = 'That email is already taken.';
            return res.redirect(req.url);
          }
          
          account.updateAccount(custnumber, req.query.save, req.body, function () {
            res.redirect(req.url);
          });
        });

        break;

      case 'payment':
        if(!req.body.paymentmethod) {
          req.session.error = 'Please select you prefered payment method.';
          return res.redirect(req.url);
        }

        if(req.body.paymentmethod == '1' && !req.body.cc_default)
        {
          req.session.error = 'Please add or select default credit card.';
          return res.redirect(req.url);
        }

        account.updateAccount(custnumber, req.query.save, req.body, function () {
          res.redirect(req.url);
        });
        break;

      case 'shipping':
        if(!req.body.shipvia.trim()) {
          req.session.error = 'Please choose your default shipping method.';
          return res.redirect(req.url);
        }

        if(req.body.tpshipacct.trim() && 
          (req.body.shipvia == 'PRI' ||
          req.body.shipvia == 'BK' ||
          req.body.shipvia == 'CPU' ||
          req.body.shipvia == 'PMI' ||
          req.body.shipvia == 'FCI')) {
          
          req.session.error = `You have entered a FedEx/UPS number, but have chosen a shipping method other than UPS or FedEX.<br>
                              Please Choose a FedEx or UPS shipping method, or erase the FedEx/UPS number.`;
          return res.redirect(req.url);
        }

        account.updateAccount(custnumber, req.query.save, req.body, function () {
          res.redirect(req.url);
        });
        break;

      case 'mailings':

        account.updateAccount(custnumber, req.query.save, req.body, function () {
          res.redirect(req.url);
        });
        break;

      case 'auctions':
        var auctionname = req.body.auctionname.trim();

        if((req.body.auctionagreement && req.body.auction18 && auctionname) ||
           (!req.body.auctionagreement && !req.body.auction18 && !auctionname)) {

          if((req.body.auctionagreement || req.body.auction18) && (auctionname.length < 5 || auctionname.length > 10)) {
            req.session.error = `The auction nickname <strong>` + auctionname + `</strong> must be between 5 and 10 characters in length.<br>
                                Please choose a different name.`;
            return res.redirect(req.url);
          }

          account.checkAuctionName(req.user.email, auctionname, function (auction_name_exist) {
            if(auction_name_exist && auctionname.length) {
              req.session.error = 'That Auction Nickname is already taken.';
              return res.redirect(req.url);
            }
            else
              account.updateAccount(custnumber, req.query.save, req.body, function () {
                res.redirect(req.url);
              });
          });
          
        }
        else {
          req.session.error = `It appears that you are choosing to participate in photo-eye auctions.<br>
                              Please make sure all auction checkboxes are checked and an option nickname is entered.<br>
                              <br>
                              If you prefer not to participate,<br>
                              please uncheck all boxes and clear your auction nickname.`;
          return res.redirect(req.url);
        }
          
        break;
    }
    
  });

  // add new or edit exitsting address in the user account
  app.get('/account/address/:address_book_id?', isAuthenticated, function(req, res) {

    var custnumber = req.user.custnumber || req.user.altnum;

    async.parallel({
      user: function(callback) {
        if(req.session.submitted_data) {
          callback(null, req.session.submitted_data);
          delete req.session.submitted_data;
        }

        else if(req.params.address_book_id == 'main') // get the main account address, but get it through all addresses to see if it's default
          account.getAllAddresses(custnumber, function (addresess) {
            callback(null, addresess[0]); // the first element it the main account address
          });

        else if(parseInt(req.params.address_book_id)) // get the specified address from address book
          account.getAddress(custnumber, req.params.address_book_id, function (address) {
            callback(null, address);
          });

        else  // if we don't have specified address to edit we are entering a new address
          callback(null, null);
      },
      countries: function(callback) {
        misc.getCountries(function (results) {
          callback(null, results);
        });
      },
      states: function(callback) {
        misc.getUSStates(function (results) {
          callback(null, results);
        });
      }
    },
    function(err, results) {
      if(err)
        throw new Error('Error while getting address data');

      res.render('account/address', { address: results, main: req.params.address_book_id == 'main', message: req.session.error });

      delete req.session.error;
    });
    
  });

  // saves the address to the user account
  app.post('/account/address/:address_book_id?', isAuthenticated, function(req, res) {

    var custnumber = req.user.custnumber || req.user.altnum;
    var error;

    // validate the submitted data
    if(req.body.email && req.body.email.trim() && req.body['re-email'].trim() && req.body.email != req.body['re-email']) {
      error = 'Emails don\'t match.';
    }

    if(!req.body.firstname.trim() || !req.body.lastname.trim()) {
      error = 'First Name and Last Name are required.';
    }

    if(!req.body.address1.trim()) {
      error = 'Address Line 1 is required.';
    }

    if(!req.body.city.trim()) {
      error = 'City is required.';
    }

    if(!req.body.state.trim()) {
      error = 'State is required.';
    }

    if(!req.body.country.trim()) {
      error = 'Country is required.';
    }

    if(!req.body.zip.trim()) {
      error = 'Zip is required.';
    }

    // add additional validations if country is United States
    if(req.body.country == '001') {

      if(req.body.zip.trim() && req.body.zip.trim().length < 5) {
        error = `Zip codes for the United States must contain 5 or 9 numbers.<br>
                Example 87501 or 87501-1234`;
      }

      if(!req.body.state.trim() || req.body.state.trim() == 'FO') {
        error = 'You have chosen the United States. Now choose a state.';
      }

      if(req.body.phone.trim() && req.body.phone.trim().replace(/[^0-9]/g, '').length < 10) {
        error = `Please enter at least 10 digits in the phone number.<br>
                Example (505) 555-1212`;
      }

      if(req.body.phone2.trim() && req.body.phone2.trim().replace(/[^0-9]/g, '').length < 10) {
        error = `Please enter at least 10 digits in the fax number.<br>
                Example (505) 555-1212`;
      }

    }
    else { // for the other countries
      if(!req.body.state.trim() || req.body.state.trim() != 'FO') {
        error = `You have chosen a country other than the United States.<br>
                Please change the state to Not Applicable or the country to United States.`;
      }
    }

    if(error) {
      req.session.error = error;
      req.session.submitted_data = req.body;
      return res.redirect(req.url);
    }

    // depending on the parameter save new address, save main account address or save address in the address book
    if(req.params.address_book_id == 'main')  { // update the main account address
      req.body.current_shipping = req.user.shipvia; // add the current shipping method to the body

      account.updateAccount(custnumber, 'address', req.body, function (changed_shipping_destination) {
        if(changed_shipping_destination) {
          req.session.error = 'The shipping destination is changed. Please choose your default shipping method below.'
          res.redirect('/account#shipping');
        }
        else {
          // update the billing address in Authorize.net
          if(req.body.defaultaddress_b == 'true' || req.body.defaultaddress_b == '1')
            account.updateCreditCardBillingAddress(custnumber, function() {});

          res.redirect('/account#addresses');
        }
      });
    }
    else if(parseInt(req.params.address_book_id)) { // update existing in address book
      req.body.current_shipping = req.user.shipvia; // add the current shipping method to the body

      account.updateAddress(custnumber, parseInt(req.params.address_book_id), req.body, function (changed_shipping_destination) {
        if(changed_shipping_destination) {
          req.session.error = 'The shipping destination is changed. Please choose your default shipping method below.'
          res.redirect('/account#shipping');
        }
        else {
          // update the billing address in Authorize.net
          if(req.body.defaultaddress_b == 'true' || req.body.defaultaddress_b == '1')
            account.updateCreditCardBillingAddress(custnumber, function() {});

          res.redirect('/account#addresses');
        }
      });
    }
    else // save new address in address book
      account.saveAddress(custnumber, req.body, function (address) {
        res.redirect('/account#addresses');
      });
    
  });

  // changes the addess to default biiling address
  app.get('/account/address-billing/:address_book_id', isAuthenticated, function(req, res) {
    var custnumber = req.user.custnumber || req.user.altnum;

    account.updateBillingAddress(custnumber, req.params.address_book_id, function (results) {
      // update the billing address in Authorize.net
      account.updateCreditCardBillingAddress(custnumber, function() {});

      res.redirect('/account#addresses');
    });
  });

  // changes the addess to default shipping address
  app.get('/account/address-shipping/:address_book_id', isAuthenticated, function(req, res) {
    var custnumber = req.user.custnumber || req.user.altnum;

    account.updateShippingAddress(custnumber, req.user.shipvia, req.params.address_book_id, function (changed_shipping_destination) {
      if(changed_shipping_destination) {
        req.session.error = 'The shipping destination is changed. Please choose your default shipping method below.'
        res.redirect('/account#shipping');
      }
      else
        res.redirect('/account#addresses');
    });
  });

  // flag the credit card as deleted
  app.get('/account/credit-card/delete', isAuthenticated, function(req, res) {
    var custnumber = req.user.custnumber || req.user.altnum;

    if(req.query.default == 'true' && req.query.paymentmethod == '1') {
      req.session.error = 'You can\'t remove the default credit card. Please add or select another credit card or choose different payment method.';
      return res.redirect('/account#payment');
    }

    account.deleteCreditCard(custnumber, req.query, function (result) {

      res.redirect('/account#payment');
    });
  });

  // add new credit card
  app.get('/account/credit-card/:id?', isAuthenticated, function(req, res) {
    var custnumber = req.user.custnumber || req.user.altnum;

    if(req.params.id) {
      account.getCreditCard(custnumber, req.params.id, function(card) {

        res.render('account/credit-card', { card: card });
      });
    }
    else
      res.render('account/credit-card');
  });

  // saves the new credit card data in Authorize.net
  app.post('/account/credit-card/:id?', isAuthenticated, function(req, res) {

    var error = '';
    var card_type = '';

    if((!req.body.cc_number && !req.params.id) ||
        !req.body.cc_month ||
        !req.body.cc_year ||
        !req.body.cc_name)
    {
      error = 'Please fill all credit card fields.';
    }

    switch(parseInt(req.body.cc_number[0])) {
      // American Express
      case 3:
        card_type = 'AX';
        break;

      // Visa
      case 4:
        card_type = 'VI';
        break;

      // MasterCard
      case 5:
        card_type = 'MC';
        break;

      // Discover
      case 6:
        card_type = 'DS';
        break;
    }

    if(!card_type) {
      error = 'Please enter supported card type: American Express, Visa, MasterCard or Discover.';
    }

    if(req.body.cc_number.length < 12 && !req.params.id) {
      error = 'Please enter full credit card number';
    }

    if((parseInt('20' + req.body.cc_year) < new Date().getFullYear()) ||
       (parseInt('20' + req.body.cc_year) == new Date().getFullYear() && parseInt(req.body.cc_month) < new Date().getMonth() + 1)) {
      error = 'Please enter expiration date in future';
    }

    if(error) {
      return res.render('account/credit-card', { message: error });
    }

    var custnumber = req.user.custnumber || req.user.altnum;

    // add the card type to the request data
    req.body.cc_type = card_type;

    if(req.params.id) {

      account.updateCreditCard(custnumber, req.params.id, req.body, function (result) {

        if(!result)
          return res.render('account/credit-card', { message: 'Error while saving the card. Please try again.' });

        if(result.error)
          return res.render('account/credit-card', { message: result.error });

        res.redirect('/account#payment');
      });
    }
    else {
      account.addCreditCard(custnumber, req.user.email, req.body, function (result) {

        if(!result)
          return res.render('account/credit-card', { message: 'Error while saving the card. Please try again.' });

        if(result.error)
          return res.render('account/credit-card', { message: result.error });

        res.redirect('/account#payment');
      });
    }
  });


  // =========================================================================================
  // ACCOUNT LOGINS ==========================================================================
  // =========================================================================================

  // login to the account
  app.get('/account/login', function(req, res) {
    res.render('account/login', { message: req.flash('login-message') });
  });

  app.post('/account/login', function(req, res, next) {
    passport.authenticate('local-login', function(err, user, info) {
      if(req.body.start_checkout) req.session.start_checkout = true;

      if (err) { return next(err); }

      if (!user) {
        var query = '';
        if(req.body.fromwl) {
          query = '?fromwl=1';

          if(req.body.catalog)
            query += '&catalog=' + req.body.catalog;
        }
        else if(req.body.fromsr) {
          query = '?fromsr=1';
        }

        return res.redirect('/account/login' + query);
      }

      req.logIn(user, function(err) {
        if (err) { return next(err); }

        var custnumber = req.user.custnumber || req.user.altnum;

        if(req.session.start_checkout) {
          req.session.order.guest = false; // it's not anymore guest checkout
          res.redirect('/order/payment');
        }
        // if the user is logging in when adding item to wish list then add that item in their Wish List
        else if(req.body.fromwl) { // the user is redirected form the wish list tab in the cart page
          order.addToWishList(req.session.USERIDNUMBER, custnumber, req.body.catalog, function() {
            res.redirect('/order/cart#wishlist');
          });
        }
        else if(req.body.fromsr) { // the user is redirected form the special requests tab in the cart page
          res.redirect('/order/cart#requests');
        }
        else
          res.redirect('/account');
      });

    })(req, res, next);
  });

  // logout form current session
  app.get('/account/logout', isAuthenticated, function(req, res) {
    req.logout();
    res.redirect('/account/login');
  });

  // register new account
  app.get('/account/register', function(req, res) {
    res.render('account/register', { message: req.flash('signup-message') });
  });

  app.post('/account/register', function(req, res, next) {
    passport.authenticate('local-signup', function(err, user, info) {
      if(req.body.start_checkout) req.session.start_checkout = true;

      if (err) { return next(err); }

      if (!user) { return res.redirect('/account/register'); }

      req.logIn(user, function(err) {
        if (err) { return next(err); }

        if(req.session.start_checkout) {
          req.session.order.guest = false; // it's not anymore guest checkout
          return res.redirect('/order/payment');
        }

        return res.redirect('/account');
      });

    })(req, res, next);
  });

  // password-reset view
  app.get('/account/password-reset', function(req, res) {
    res.render('account/password-reset', { message: req.flash('reset-password-message') });
  });

  // sends passwrod reset email
  app.post('/account/password-reset', function(req, res) {
    // Send password reset link
    account.sendPasswordResetEmail(req.body.email);

    req.flash('reset-password-message', 'Password reset link was sent to the provided email address.');

    res.redirect('/account/password-reset');
  });

  // get new-password view
  app.get('/account/new-password/:reset_hash', function(req, res) {

    account.checkResetLink(req.params.reset_hash, function (count) {
      if(!count)
        req.flash('new-password-message', 'The password reset link is invalid. Please request <a href="/account/password-reset">new one</a>.')
        
      res.render('account/new-password', { message: req.flash('new-password-message') });
    });
  });

  // save the newly entered password
  app.post('/account/new-password/:reset_hash', function(req, res) {

    if(req.body.password != req.body['re-password'])
      return res.render('account/new-password', { message: 'Passwords don\'t match.' } );

    if(req.body.password.trim().length < 5)
      return res.render('account/new-password', { message: 'Password must be at least 5 characters.' });

    account.updatePassword(req.params.reset_hash, req.body.password, function (result) {
      if(result == 'ok')
        res.render('account/new-password', { message: 'Your password is updated. Log in <a href="/account/login">here</a>.' } );
      else
        res.render('account/new-password', { message: 'Error while updating your password. Please try again.' } );
    });

  });


  // =========================================================================================
  // SOCIAL LOGINS ===========================================================================
  // =========================================================================================

  // =====================================
  // FACEBOOK ROUTES
  // =====================================

  // route for Facebook authentication and login
  app.get('/account/facebook', passport.authenticate('facebook'));

  // handle the callback after Facebook has authenticated the user
  app.get('/account/facebook/callback', passport.authenticate('facebook', {
    successRedirect : '/account',
    failureRedirect : '/account/login',
    failureFlash: true
  }));

  // =====================================
  // TWITTER ROUTES
  // =====================================

  // route for Twitter authentication and login
  app.get('/account/twitter', passport.authenticate('twitter'));

  // handle the callback after Twitter has authenticated the user
  app.get('/account/twitter/callback', passport.authenticate('twitter', {
    successRedirect : '/account',
    failureRedirect : '/account/login',
    failureFlash: true
  }));

  // =====================================
  // INSTAGRAM ROUTES
  // =====================================

  // route for Instagram authentication and login
  app.get('/account/instagram', passport.authenticate('instagram'));

  // handle the callback after Instagram has authenticated the user
  app.get('/account/instagram/callback', passport.authenticate('instagram', {
    successRedirect : '/account',
    failureRedirect : '/account/login',
    failureFlash: true
  }));

}

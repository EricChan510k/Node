// ====================================================
// Order controller
// ====================================================

// Get the order model
var order       = rootRequire('models/order');
var account     = rootRequire('models/account');
var misc        = rootRequire('models/misc');
var global_vars = rootRequire('models/global-vars');
var email       = rootRequire('app/utils/email');
var async       = require('async');
var nunjucks    = require('nunjucks');
var moment      = require('moment');

// Checks if the checkout process is started, if not redirect the user to the cart page
function hasCheckoutStarted(req, res, next) {
  if(!req.session.order)
    return res.redirect('/order/cart');

  next();
}

module.exports = function (express, app) {

  /* ROUTES */
  
  app.get('/order/cart', function(req, res) {

    var custnumber = null;
    if(req.user)
      custnumber = req.user.custnumber || req.user.altnum;

    async.parallel({
      cart: function(callback) {
        order.getCart(req.session.USERIDNUMBER, custnumber, true, function (results) {
          callback(null, results);
        });
      },
      wish_list: function(callback) {
        order.getWishList(req.session.USERIDNUMBER, custnumber, null, function (results) {
          callback(null, results);
        });
      },
      special_requests: function(callback) {
        order.getSpecialRequests(req.session.USERIDNUMBER, custnumber, function (results) {
          callback(null, results);
        });
      },
      countries: function(callback) {
        misc.getCountries(function (results) {
          callback(null, results);
        });
      }
    },
    function(err, results) {
      if(err)
        throw new Error('Error while getting cart order data');

      res.render('order/cart', results);
    });
    
  });

  app.post('/order/cart/add-item', function(req, res) {

    var custnumber = null;
    if(req.user)
      custnumber = req.user.custnumber || req.user.altnum;

    // check to see if we have selected book order
    if(req.body.number) {
      // check to see if the user is adding the item to the wish list
      if(req.body.wish_list) {
        // if the customer is not logged in redirect him to the login page
        if(!custnumber)
          return res.redirect('/account/login?fromwl=1&catalog=' + req.body.number);

        order.addToWishList(req.session.USERIDNUMBER, custnumber, req.body.number, function() {
          res.redirect('/order/cart#wishlist');
        });
      }
      else
        order.addOrder(req.session.USERIDNUMBER, custnumber, req.body, function() {
          delete req.session.cart_count; // resets the cart counter
          res.redirect('/order/cart');
        });
    }
    else
      res.redirect(req.headers.referer);
  });

  // updates the quantity or removes item from the cart
  app.post('/order/cart/update-quantity', function(req, res) {

    var custnumber = null;
    if(req.user)
      custnumber = req.user.custnumber || req.user.altnum;

    function renderConfirmData(data) {
      return {
        cart:     nunjucks.render('partials/_cart-confirm.html'       , data),
        totals:   nunjucks.render('partials/_cart-totals-confirm.html', data),
        shipping: nunjucks.render('partials/_shipping-confirm.html'   , data),
        order:    req.session.order,
        shipvia:  req.user.shipvia
      };
    }

    function renderCartData(data) {
      return {
        cart:   nunjucks.render('partials/_cart.html'       , data),
        totals: nunjucks.render('partials/_cart-totals.html', data)
      };
    }

    // check to see if we have book number
    if(req.body.number) {

      if(parseInt(req.body.quantity) > 0) { // if the quantity is bigger then 0 then update the order

        order.updateQuantity(req.session.USERIDNUMBER, req.body.number, req.body.quantity, function() {
          delete req.session.cart_count; // resets the cart counter

          // we have update from the confirm page so handle it differently because we need to render other cart content
          if(parseInt(req.body.confirm_order)) {

            getConfirmOrderData(req, res, function(results) {

              res.json(renderConfirmData({ account: results }));

            });
          }
          else {
            order.getCart(req.session.USERIDNUMBER, custnumber, true, function(results) {

              res.json(renderCartData({ cart: results }));

            });
          }
        });
      }
      else { // else remove the item for the order

        // we have update from the confirm page so handle it differently because we need to render other cart content
        order.removeItem(req.session.USERIDNUMBER, req.body.number, function() {
          delete req.session.cart_count; // resets the cart counter

          if(parseInt(req.body.confirm_order)) {

            getConfirmOrderData(req, res, function(results) {

              res.json(renderConfirmData({ account: results }));

            });
          }
          else {
            order.getCart(req.session.USERIDNUMBER, custnumber, true, function(results) {

              res.json(renderCartData({ cart: results }));

            });
          }
        });
      }
    }
    else
      res.send('');
  });

  // adds item from the cart to the wishlist
  app.post('/order/cart/add-to-wishlist-from-cart', function(req, res) {

    // if the user is not authenticated return such info
    if(!req.isAuthenticated()) {
      return res.json({ not_authenticated: true });
    }

    var custnumber = req.user.custnumber || req.user.altnum;

    order.addToWishList(req.session.USERIDNUMBER, custnumber, req.body.number, function() {
      order.removeItem(req.session.USERIDNUMBER, req.body.number, function() {
        delete req.session.cart_count; // resets the cart counter
      
        async.parallel({
          cart: function(callback) {
            order.getCart(req.session.USERIDNUMBER, custnumber, true, function (results) {
              callback(null, results);
            });
          },
          wish_list: function(callback) {
            order.getWishList(req.session.USERIDNUMBER, custnumber, null, function (results) {
              callback(null, results);
            });
          }
        },
        function(err, results) {
          if(err)
            throw new Error('Error while getting cart order data');

          res.json({
            cart:     nunjucks.render('partials/_cart.html'       , results),
            totals:   nunjucks.render('partials/_cart-totals.html', results),
            wishlist: nunjucks.render('partials/_wish-list.html'  , results)
          });
        });

      });
    });

  });

  // removes item from the wishlist
  app.post('/order/cart/remove-wishlist', function(req, res) {

    // if the user is not authenticated return such info
    if(!req.isAuthenticated()) {
      return res.json({ not_authenticated: true });
    }

    var custnumber = req.user.custnumber || req.user.altnum;

    order.removeFromWishList(req.session.USERIDNUMBER, custnumber, req.body.number, function () {
      order.getWishList(req.session.USERIDNUMBER, custnumber, null, function (results) {
        res.json({
          wishlist: nunjucks.render('partials/_wish-list.html', { wish_list: results })
        });
      });
    });
  });

  // adds item from the wishlist to the cart
  app.post('/order/cart/add-to-cart-from-wishlist', function(req, res) {

    // if the user is not authenticated return such info
    if(!req.isAuthenticated()) {
      return res.json({ not_authenticated: true });
    }

    var custnumber = req.user.custnumber || req.user.altnum;

    order.addOrder(req.session.USERIDNUMBER, custnumber, req.body, function() {
      delete req.session.cart_count; // resets the cart counter
      
      async.parallel({
        cart: function(callback) {
          order.getCart(req.session.USERIDNUMBER, custnumber, true, function (results) {
            callback(null, results);
          });
        },
        wish_list: function(callback) {
          order.getWishList(req.session.USERIDNUMBER, custnumber, null, function (results) {
            callback(null, results);
          });
        }
      },
      function(err, results) {
        if(err)
          throw new Error('Error while getting cart order data');

        res.json({
          cart:     nunjucks.render('partials/_cart.html'       , results),
          totals:   nunjucks.render('partials/_cart-totals.html', results),
          wishlist: nunjucks.render('partials/_wish-list.html'  , results)
        });
      });

    });
  });

  // switches the wishlist type (public or private)
  app.post('/order/cart/wishlist-type', function(req, res) {

    // if the user is not authenticated return such info
    if(!req.isAuthenticated()) {
      return res.json({ not_authenticated: true });
    }

    var custnumber = req.user.custnumber || req.user.altnum;

    order.switchWishListType(req.session.USERIDNUMBER, custnumber, req.body.type, function () {
      order.getWishList(req.session.USERIDNUMBER, custnumber, null, function (results) {
        res.json({
          wishlist: nunjucks.render('partials/_wish-list.html', { wish_list: results })
        });
      });
    });
  });

  // sends invitation on email for wish list
  app.post('/order/cart/send-invitation', function(req, res) {

    // if the user is not authenticated return such info
    if(!req.isAuthenticated()) {
      return res.json({ not_authenticated: true });
    }

    email.sendMail({
      from: '"photo-eye" <orders@photoeye.com>',
      to: req.body.email,
      subject: req.body.subject,
      html: req.body.message
    }, function (err, info) {
      if(err)
        return res.json({ error: err });

      res.json({ success: true });
    });

  });

  // finds a wish list from user's email if exist and public
  app.post('/order/cart/find-wishlist', function(req, res) {

    // if the user is not authenticated return such info
    if(!req.isAuthenticated()) {
      return res.json({ not_authenticated: true });
    }

    var custnumber = req.user.custnumber || req.user.altnum;

    order.findWishList(req.session.USERIDNUMBER, custnumber, req.body.email, function (results) {
      res.json({
        wishlist: nunjucks.render('partials/_wish-list.html', { wish_list: results })
      });
    });

  });

  // loads the selected wish list from the custnumber
  app.post('/order/cart/load-wishlist', function(req, res) {

    // if the user is not authenticated return such info
    if(!req.isAuthenticated()) {
      return res.json({ not_authenticated: true });
    }

    var custnumber = req.user.custnumber || req.user.altnum;

    order.getWishList(req.session.USERIDNUMBER, custnumber, req.body.custnumber, function (results) {
      res.json({
        wishlist: nunjucks.render('partials/_wish-list.html', { wish_list: results })
      });
    });

  });

  // saves special request (new or update existing)
  app.post('/order/cart/save-special-request', function(req, res) {

    // if the user is not authenticated return such info
    if(!req.isAuthenticated()) {
      return res.json({ not_authenticated: true });
    }

    var custnumber = req.user.custnumber || req.user.altnum;

    order.saveSpecialRequest(req.session.USERIDNUMBER, custnumber, req.body, function (status) {

      async.parallel({
        special_requests: function(callback) {
          order.getSpecialRequests(req.session.USERIDNUMBER, custnumber, function (results) {
            callback(null, results);
          });
        },
        countries: function(callback) {
          misc.getCountries(function (results) {
            callback(null, results);
          });
        }
      },
      function(err, results) {
        if(err)
          throw new Error('Error while special requests data');

        res.json({
          special_requests:        nunjucks.render('partials/_special-requests.html', results),
          special_requests_status: status
        });
      });

    });

  });

  // removes special request
  app.post('/order/cart/remove-special-request', function(req, res) {

    // if the user is not authenticated return such info
    if(!req.isAuthenticated()) {
      return res.json({ not_authenticated: true });
    }

    var custnumber = req.user.custnumber || req.user.altnum;

    order.removeSpecialRequest(req.session.USERIDNUMBER, custnumber, req.body.requestid, function (status) {
      
      async.parallel({
        special_requests: function(callback) {
          order.getSpecialRequests(req.session.USERIDNUMBER, custnumber, function (results) {
            callback(null, results);
          });
        },
        countries: function(callback) {
          misc.getCountries(function (results) {
            callback(null, results);
          });
        }
      },
      function(err, results) {
        if(err)
          throw new Error('Error while special requests data');

        res.json({
          special_requests: nunjucks.render('partials/_special-requests.html', results)
        });
      });

    });

  });

  // gets special request for editing
  app.post('/order/cart/get-special-request', function(req, res) {

    // if the user is not authenticated return such info
    if(!req.isAuthenticated()) {
      return res.json({ not_authenticated: true });
    }

    var custnumber = req.user.custnumber || req.user.altnum;

    order.getSpecialRequest(req.session.USERIDNUMBER, custnumber, req.body.requestid, function (special_request) {

      async.parallel({
        special_requests: function(callback) {
          order.getSpecialRequests(req.session.USERIDNUMBER, custnumber, function (results) {
            callback(null, results);
          });
        },
        countries: function(callback) {
          misc.getCountries(function (results) {
            callback(null, results);
          });
        }
      },
      function(err, results) {
        if(err)
          throw new Error('Error while getting cart order data');

        results.special_request = special_request;

        res.json({
          special_requests: nunjucks.render('partials/_special-requests.html', results)
        });
      });

    });

  });

  // gets the shipping estimations
  app.get('/order/shipping', function(req, res) {

    var custnumber = null;
    if(req.user)
      custnumber = req.user.custnumber || req.user.altnum;

    order.getShipping(req.session.USERIDNUMBER, custnumber, req.query, function(results) {
      res.render('partials/_shipping', { shipping: results, shipping_country: req.query.country_code });
    });
  });

  app.get('/order/country-shipping', function(req, res) {

    order.getCountryShipping(req.query.foreign, function(results) {

      res.json({
        order:    req.session.order,
        shipping: nunjucks.render('partials/_shipping-account.html', { account: { shipping: results } }) // send back rendered view for the shipping options
      });
    });
  });

  // start the checkout process
  app.post('/order/cart', function(req, res) {
    
    // create session order variable so we know we're placing order
    req.session.order = {
      total: req.body.total_price,
      tax: req.body.tax_price,
      shipping: {
        method: req.body.shipping_method,
        mom: req.body.shipping_mom,
        price: req.body.shipping_price
      }
    };

    res.redirect('/order/place-order');
  });

  app.get('/order/place-order', hasCheckoutStarted, function(req, res) {

    // if the user is authenticated, skip this guest/login/register page
    if(req.user)
      return res.redirect('/order/payment');    
    res.render('order/place-order', { login_error: 'Please login to continue with your gift certificate purchase.' });
  });

  // start guest checkout
  app.post('/order/place-order', hasCheckoutStarted, function(req, res) {

    if(!req.body.email || !req.body.email.trim())
      return res.render('order/place-order', { guest_error: 'Email is required for guest checkout' });

    // set guest checkout variables, so we can identify it
    req.session.order.guest       = true;
    req.session.order.guest_email = req.body.email;

    res.redirect('/order/payment');
  });

  app.get('/order/payment', hasCheckoutStarted, function(req, res) {
    // delete the session variable for started checkout
    delete req.session.start_checkout;

    // handle guest checkout
    if (req.session.order.guest) {

      async.parallel({
        submitted_data: function(callback) {
          if(req.session.submitted_data) {
            callback(null, req.session.submitted_data);
            delete req.session.submitted_data;
          }
          else
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
          throw new Error('Error while getting user data');

        res.render('order/payment', { account: results, message: req.session.error });
        delete req.session.error;
      });
    }
    // we have user with account
    else if(req.user) {

      var custnumber = req.user.custnumber || req.user.altnum;

      // get all data for the account, the user, the addresses, shipping, orders, etc.
      async.parallel({
        user: function(callback) {
          callback(null, req.user); // because the user is authenticated we have his info in the request.user object
        },
        addresses: function(callback) {
          account.getBillingAndShippingAddress(custnumber, function (results) { // billing and shipping addresses
            callback(null, results);
          });
        },
        submitted_data: function(callback) {
          if(req.session.submitted_data) {
            callback(null, req.session.submitted_data);
            delete req.session.submitted_data;
          }
          else
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
          throw new Error('Error while getting user data');

        // check to see if all required data is present, if it is redirect the user to confirm order page
        if(results.addresses && results.user.paymentmethod && results.user.paymentmethod != 10 /* we won't use paymentmethod = 10 anymore */ && results.user.shipvia)
          return res.redirect('/order/confirm-order');

        res.render('order/payment', { account: results, message: req.session.error });
        delete req.session.error;
      });
    }
    else
      res.redirect('/order/place-order');

  });

  app.post('/order/payment', hasCheckoutStarted, function(req, res) {

    var error;

    // validate the submitted data

    if(req.body.set_addresses) {

      // validate billing address
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

      // validate shipping address only if different then billing address
      if(!req.body.same_as_billing) {

        if(req.body.shipping_email && req.body.shipping_email.trim() && req.body['shipping_re-email'].trim() && req.body.shipping_email != req.body['shipping_re-email']) {
          error = 'Emails don\'t match.';
        }

        if(!req.body.shipping_firstname.trim() || !req.body.shipping_lastname.trim()) {
          error = 'First Name and Last Name are required.';
        }

        if(!req.body.shipping_address1.trim()) {
          error = 'Address Line 1 is required.';
        }

        if(!req.body.shipping_city.trim()) {
          error = 'City is required.';
        }

        if(!req.body.shipping_state.trim()) {
          error = 'State is required.';
        }

        if(!req.body.shipping_country.trim()) {
          error = 'Country is required.';
        }

        if(!req.body.shipping_zip.trim()) {
          error = 'Zip is required.';
        }

        // add additional validations if country is United States
        if(req.body.shipping_country == '001') {

          if(req.body.shipping_zip.trim() && req.body.shipping_zip.trim().length < 5) {
            error = `Zip codes for the United States must contain 5 or 9 numbers.<br>
                    Example 87501 or 87501-1234`;
          }

          if(!req.body.shipping_state.trim() || req.body.shipping_state.trim() == 'FO') {
            error = 'You have chosen the United States. Now choose a state.';
          }

          if(req.body.shipping_phone.trim() && req.body.shipping_phone.trim().replace(/[^0-9]/g, '').length < 10) {
            error = `Please enter at least 10 digits in the phone number.<br>
                    Example (505) 555-1212`;
          }

          if(req.body.shipping_phone2.trim() && req.body.shipping_phone2.trim().replace(/[^0-9]/g, '').length < 10) {
            error = `Please enter at least 10 digits in the fax number.<br>
                    Example (505) 555-1212`;
          }

        }
        else { // for the other countries
          if(!req.body.shipping_state.trim() || req.body.shipping_state.trim() != 'FO') {
            error = `You have chosen a country other than the United States.<br>
                    Please change the state to Not Applicable or the country to United States.`;
          }
        }
      }
    }

    if(req.body.set_paymentmethod) {

      // validate payment method
      if(!req.body.paymentmethod) {
        error = 'Please choose a payment method.';
      }

      var card_type = '';

      // validate credit card if paymentmethod = 1
      if(req.body.paymentmethod == 1) {
        
        if( !req.body.cc_number ||
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

        if(req.body.cc_number.length < 12) {
          error = 'Please enter full credit card number';
        }

        if((parseInt('20' + req.body.cc_year) < new Date().getFullYear()) ||
           (parseInt('20' + req.body.cc_year) == new Date().getFullYear() && parseInt(req.body.cc_month) < new Date().getMonth() + 1)) {
          error = 'Please enter expiration date in future';
        }
      }

      // add the card type to the request data
      req.body.cc_type = card_type;
    }

    if(req.body.set_shipping) {

      // validate shipping method
      if(!req.body.shipvia || !req.body.shipvia.trim()) {
        error = 'Please choose your default shipping method.';
      }

      if(req.body.tpshipacct.trim() && 
        (req.body.shipvia == 'PRI' ||
         req.body.shipvia == 'BK' ||
         req.body.shipvia == 'CPU' ||
         req.body.shipvia == 'PMI' ||
         req.body.shipvia == 'FCI')) {
        
        error = `You have entered a FedEx/UPS number, but have chosen a shipping method other than UPS or FedEX.<br>
                 Please Choose a FedEx or UPS shipping method, or erase the FedEx/UPS number.`;
      }
    }

    if(error) {
      req.session.error = error;

      // make sure if something is missing on post we return the same entered data again
      req.session.submitted_data = req.body;

      return res.redirect(req.url);
    }

    // if the data is valid then save submitted info in the database
    var custnumber = req.user.custnumber || req.user.altnum;

    // save the data in the specified order with async.waterfall function
    async.waterfall([
      function(callback) {
        if(req.body.set_addresses) {
          // save the default address as billing in the account
          var billing_address = {
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            company: req.body.company,
            address1: req.body.address1,
            address2: req.body.address2,
            city: req.body.city,
            state: req.body.state,
            zip: req.body.zip,
            country: req.body.country,
            phone: req.body.phone,
            phone2: req.body.phone2,
            current_shipping: req.body.shipvia // set the current shipping method to comply with the update account functionality
          };

          account.updateAccount(custnumber, 'address', billing_address, function (changed_shipping_destination) {
            callback(null, true); // just return true to continue to the next step
          });
        }
        else
          callback(null, false);
      },
      function(saved_billing_address, callback) {
        if(req.body.set_addresses && !req.body.same_as_billing) {
          // if the shipping address is different that the billing then save it
          var shipping_address = {
            firstname: req.body.shipping_firstname,
            lastname: req.body.shipping_lastname,
            company: req.body.shipping_company,
            address1: req.body.shipping_address1,
            address2: req.body.shipping_address2,
            city: req.body.shipping_city,
            state: req.body.shipping_state,
            zip: req.body.shipping_zip,
            country: req.body.shipping_country,
            email: req.body.shipping_email,
            phone: req.body.shipping_phone,
            phone2: req.body.shipping_phone2,
            defaultaddress_s: 1 // set it as default shipping address
          };

          account.saveAddress(custnumber, shipping_address, function (address) {
            callback(null, true);
          });
        }
        else
          callback(null, false);
      },
      function(saved_shipping_address, callback) {
        if(req.body.set_paymentmethod) {
          // save the payment method
          var payment = {
            paymentmethod: req.body.paymentmethod
          }

          // if the payment method is credit card then save that credit card in the account
          if(req.body.paymentmethod == 1) {
            var card = {
              cc_type: req.body.cc_type,
              cc_number: req.body.cc_number,
              cc_month: req.body.cc_month,
              cc_year: req.body.cc_year,
              cc_name: req.body.cc_name
            };

            account.addCreditCard(custnumber, req.user.email, card, function (result) {

              if(!result) // if there's no card saved return an error
                return callback('Error while saving the card. Please try again.', false);

              // after saving teh credit card, save the payment method
              account.updateAccount(custnumber, 'payment', payment, function () {
                callback(null, true);
              });
              
            });
          }
          else {
            // just save the payment method
            account.updateAccount(custnumber, 'payment', payment, function () {
              callback(null, true);
            });
          }
          
        }
        else
          callback(null, false);
      },
      function(saved_payment_method, callback) {
        if(req.body.set_shipping) {
          // save the shipping method
          var shipping = {
            shipvia: req.body.shipvia,
            tpshipacct: req.body.tpshipacct
          };

          account.updateAccount(custnumber, 'shipping', shipping, function () {
            callback(null, true);
          });
        }
        else
          callback(null, false);
      }
    ], function (err, saved_shipping_method) {
        if(err) {
          req.session.error = err;

          // make sure if something is missing on post we return the same entered data again
          req.session.submitted_data = req.body;

          return res.redirect(req.url);
        }

        // if everything is went fine then go to finalize order page
        res.redirect('/order/confirm-order');
    });
    
  });

  // confirm-order
  app.get('/order/confirm-order', hasCheckoutStarted, function(req, res) {

    // handle quest checkout
    if (req.session.order.guest) {
      res.render('order/confirm-order');
    }
    // we have user account
    else if(req.user) {

      getConfirmOrderData(req, res, function(results) {
        // if the cart is empty redirect them to the bookstore home page
        if(!results.cart || !results.cart.length)
          return res.redirect('/bookstore');

        res.render('order/confirm-order', { account: results, message: req.session.error });
        delete req.session.error;
      });
    }
    else
      res.redirect('/order/place-order');
  });

  app.post('/order/confirm-order', hasCheckoutStarted, function(req, res) {

    var error;

    // validate the submitted data

    // validate the shipping
    if(!req.body.shipping_mom)
      error = 'Please choose your shipping method.';

    // make sure the total bill doesn't exceed $999,999.99 (database can't handle more)
    if(parseFloat(req.body.total_price) > 999999.99)
      error = 'Online orders may not exceed $999,999.00!<br>Please call photo-eye at 1-800-227-6941 to discuss your order or edit the order below.';

    if(error) {
      req.session.error = error;

      // make sure if something is missing on post we return the same entered data again
      req.session.submitted_data = req.body;

      return res.redirect(req.url);
    }

    if (req.session.order.guest) {
      res.render('order/confirm-order');
    }
    // we have user account
    else if(req.user) {
      var custnumber = req.user.custnumber || req.user.altnum;

      getConfirmOrderData(req, res, function(results) {
        // if the cart is empty on confirm order redirect them to the thank you page
        if(!results.cart || !results.cart.length)
          return res.redirect('/order/thank-you');

        // if the stock levels are changed return the user back to review the order
        if(results.stock_changed)
          return res.redirect('/order/confirm-order?stock_changed=1');

        // validate the credit card expiration date if paymentmethod = 1
        if(req.user.paymentmethod == 1 &&
          ((parseInt('20' + results.credit_card.exp_year) < new Date().getFullYear()) ||
          (parseInt('20' + results.credit_card.exp_year) == new Date().getFullYear() && parseInt(results.credit_card.exp_month) < new Date().getMonth() + 1))) {

          error = `The month and year entered for this credit card may be wrong or your credit card has expired.<br>
                    Please double check the expiration date and edit it or input a different credit card number with a valid expiration date.`;
        }

        // validate PO number if paymentmethod = 2
        if(req.user.paymentmethod == 2 && !req.body.po_number) {
          error = 'Net 30 days requires an official institution purchase order number.';
        }

        if(error) {
          req.session.error = error;

          // make sure if something is missing on post we return the same entered data again
          req.session.submitted_data = req.body;

          return res.redirect(req.url);
        }

        // ============================================================================
        // finalize the order, and save the appropriate data
        // ============================================================================
        order.finalizeOrder(req.session.USERIDNUMBER, custnumber, results, req.body, function() {

          // delete the session order data
          delete req.session.order;

          // delete the session user id
          delete req.session.USERIDNUMBER;

          // delete the cookie with the user id
          res.clearCookie('USERIDNUMBER', { path: '/' });

          // resets the cart counter
          delete req.session.cart_count;

          // redirect to the appropriate thank-you page
          res.redirect('/order/thank-you' + (results.ps_apply ? '?ps_apply=' + results.ps_apply : ''));
        });

        delete req.session.error;
      });
    }
    else
      res.redirect('/order/place-order');
  });

  app.get('/order/thank-you', function(req, res) {

    res.render('order/thank-you', { order_type: req.session.order_type });
  });
}

function getConfirmOrderData(req, res, callback) {
  var custnumber = req.user.custnumber || req.user.altnum;

  // get all data for the account, the user, the addresses, shipping, orders, etc.
  async.parallel({
    submitted_data: function(callback) {
      if(req.session.submitted_data) {
        callback(null, req.session.submitted_data);
        delete req.session.submitted_data;
      }
      else
        callback(null, null);
    },
    user: function(callback) {
      callback(null, req.user); // because the user is authenticated we have his info in the request.user object
    },
    addresses: function(callback) {
      account.getBillingAndShippingAddress(custnumber, function (results) { // billing and shipping addresses
        callback(null, results);
      });
    },
    credit_card: function(callback) { // gets default credit card
      account.getDefaultCreditCard(custnumber, function(results) {
        callback(null, results);
      });
    },
    cart: function(callback) { // gets the shopping cart contents
      order.generateOnlineOrderNum(req.session.USERIDNUMBER, function () { // no need to get the returned data as this function only updates the database
        order.getCart(req.session.USERIDNUMBER, custnumber, true, function(results, stock_changed) {
          callback(null, { c: results, s: stock_changed });
        });
      });
    },
    gift_cert: function(callback) {
      order.getGiftCertificate(req.session.USERIDNUMBER, function(results) {
        callback(null, results);
      });
    },
    shipping: function(callback) {
      account.getBillingAndShippingAddress(custnumber, function (addresses) { // first get billing and shipping addresses and use the shipping address in the shipping estimate
        order.getShipping(req.session.USERIDNUMBER, custnumber, { country_code: addresses.shipping_address.country_code, zip: addresses.shipping_address.zip, billing_zip: addresses.billing_address.zip }, function(results) {

          var min_mom, shipvia_mom, order_mom;
          for(var key in results.providers) {

            var provider = results.providers[key];
            if(provider) {
              
              for(var i = 0; i < provider.length; i++) {
                if(i == 0) {
                  min     = provider[i].total_charges;
                  min_mom = provider[i].mom_code;
                }
                else {
                  if(provider[i].total_charges < provider[i - 1].total_charges) {
                    min     = provider[i].total_charges;
                    min_mom = provider[i].mom_code;
                  }
                }

                if(req.user && req.user.shipvia == provider[i].mom_code) {
                  shipvia_mom = provider[i].mom_code;
                }

                if(req.session.order && req.session.order.shipping.mom == provider[i].mom_code) {
                  order_mom = provider[i].mom_code;
                }
              }
            }
          }

          var default_mom;

          // if the user selected shipping in the checkout then use that as default selected
          if(order_mom)
            default_mom = order_mom;
          // else if the user has shipping method set in the account use that as default selected
          else if(shipvia_mom)
            default_mom = shipvia_mom;
          // as a final fall-back use the minimum shipping price as default selected
          else
            default_mom = min_mom;

          results.default_mom = default_mom;

          callback(null, results);
        });
      });
    },
    global_vars: function(callback) {
      global_vars.getGlobalVars(function (results) {
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

    // check to see if all required data is present, if it isn't redirect the user back to payment page to fill the required info
    if(!results.addresses || !results.user.paymentmethod || results.user.paymentmethod == 10 /* we won't use paymentmethod = 10 anymore */ || !results.user.shipvia)
      return res.redirect('/order/payment');


    //===========================================================================
    // Set the data for the finalize order page
    //===========================================================================

    // just reorganize the cart and stock info
    results.stock_changed = results.cart.s;
    results.cart          = results.cart.c;

    // set the apply type value
    results.apply_type = 'apply_type=0'

    if(req.query.ps_apply)
      results.apply_type = 'ps_apply=' + req.query.ps_apply;
    else if(req.query.auction)
      results.apply_type = 'auction=1';
    else if(req.query.account)
      results.apply_type = 'account=1';

    // check the credit cart expiry date
    if(results.credit_card) {

      if((parseInt('20' + results.credit_card.exp_year) < new Date().getFullYear()) ||
         (parseInt('20' + results.credit_card.exp_year) == new Date().getFullYear() && parseInt(results.credit_card.exp_month) < new Date().getMonth() + 1)) {
        // set expired flag for the card
        results.credit_card.expired = true;
      }
    }

    // check to see if billing and shipping addresses are same
    if(results.addresses) {
      if(results.addresses.billing_address.custnumber == results.addresses.shipping_address.custnumber)
        results.addresses.shipping_same_as_billing = true;
    }

    // set today date
    results.today = moment().format('MMMM D, YYYY');

    // set gift cert default values
    results.has_gift_cert   = false;
    results.gift_cert_email = false;
    results.send_by_email   = false;

    // check to see if the user have unused gift cert
    if(results.gift_cert)
      results.has_gift_cert = true;

    // check to see if the gift cert needs to be sent by email
    if(results.has_gift_cert && results.gift_cert.sendbyemail)
      results.send_by_email = true;

    // set default ps_apply value to 0 ('ps' stands for Photographer's Showcase)
    results.ps_apply = 0;

    // get all PS items
    var ps_items = results.cart.filter(function(item) {
      return (item.catalog == 'ZZ201' || item.catalog == 'ZZ202' || item.catalog == 'ZZ203' || item.catalog == 'ZZ204' || item.catalog == 'ZZ205');
    });

    // get all non PS items
    var non_ps_items = results.cart.filter(function(item) {
      return (item.catalog != 'ZZ201' && item.catalog != 'ZZ202' && item.catalog != 'ZZ203' && item.catalog != 'ZZ204' && item.catalog != 'ZZ205');
    });

    // all are PS items
    if(ps_items.length > 0 && non_ps_items.length == 0)
      results.ps_apply = 1;
    // we have mixed items PS and regular books/photographs
    else if(ps_items.length > 0 && non_ps_items.length > 0)
      results.ps_apply = 2;

    // add the online order num to the final results object from the cart
    if(results.cart && results.cart.length)
      results.online_order_num = (results.has_gift_cert ? 'G' : 'W') + results.cart[0].onlineordernum;

    // used variables
    results.books               = 0;
    results.photographs         = 0;
    results.anyphotographs      = 0;
    results.anybooks            = 0;
    results.hb_qty              = 0;
    results.sb_qty              = 0;
    results.not_sb_or_hb_qty    = 0;
    results.total_weight        = 0;
    
    results.total_backordered   = 0;
    results.total_available     = 0;
    results.additional_handling = 0;

    var default_hb_weight = 2.66; // hardbound default weight
    var default_sb_weight = 1.33; // softbound default weight
    var default_vi_weight = 0.67; // video default weight

    if(results.cart && results.cart.length) {
      for(var i = i; i < results.cart.length; i++) {
        var item = results.cart[i];

        if(item.catalog.indexOf('ZP') == 0 || item.catalog.indexOf('ZR') == 0 || item.catalog.indexOf('ZS') == 0 || item.catalog.indexOf('aa') == 0) {
          results.photographs    = 1;
          results.books          = 0;
          results.anyphotographs = 1;
        }
        else {
          results.photographs = 0;
          results.books       = 1;
          results.anybooks    = 1;
        }

        // hardbound
        if(item.binding.indexOf('Hard') == 0 || item.binding.indexOf('Limi') == 0 || item.number_binding == 'HB' || item.number_binding == 'LTD') {
          default_weight = default_hb_weight;
          results.hb_qty++;
        }
        // softbound
        else if(item.binding.indexOf('Soft') == 0 || item.number_binding == 'SB') {
          default_weight = default_sb_weight;
          results.sb_qty++;
        }
        // video
        else if(item.binding.indexOf('Vide') == 0 || item.number_binding == 'VIDEO') {
          default_weight = default_vi_weight;
          results.sb_qty++;
        }
        else {
          results.not_sb_or_hb_qty++;
        }

        results.total_weight        += item.numcopies * (item.unitweight || default_weight);
        results.total_available     += item.qtyreserved;
        results.total_backordered   += item.numcopies - item.qtyreserved;
        results.additional_handling += item.additional_handling;
      }
    }

    // see if the shipping has addtional charges for photograph
    results.shipping.photographs = 0;
    if(results.anyphotographs == 1)
      results.shipping.photographs = 50;

    callback(results);

  });
}

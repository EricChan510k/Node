// ====================================================
// Gift Certificate controller
// ====================================================

// Get the order model
var order = rootRequire('models/order');

module.exports = function (express, app) {

  /* ROUTES */
  
  app.get('/bookstore/gift-certificates', function(req, res) {

    // get the gift certificate if any
    order.getGiftCertificate(req.session.USERIDNUMBER, function(gift_cert) {

      if(gift_cert) {

        var gift_amount = 100, other_amount = '';

        if([25, 50, 75, 100, 150, 200, 250].indexOf(parseInt(gift_cert.amount)) > -1) {
          gift_amount = gift_cert.amount;
        }
        else {
          other_amount = gift_cert.amount;
        }

        gift_cert = {
          gift_amount: gift_amount,
          other_amount: other_amount,
          to_name: gift_cert.toname,
          from_name: gift_cert.fromname,
          message: gift_cert.message,
          send_by_email: parseInt(gift_cert.sendbyemail),
          to_email: gift_cert.toemail
        };
      }
      else if(req.session.submitted_data) {
        gift_cert = req.session.submitted_data;
      }
      else {
        gift_cert = {
          gift_amount: 100,
          other_amount: '',
          to_name: '',
          from_name: '',
          message: '',
          send_by_email: 1,
          to_email: ''
        };
      }

      res.render('bookstore/gift-certificates', { page_name: 'Bookstore', gift_cert: gift_cert, message: req.session.error, error_code: req.session.error_code });

      // delete the session error data
      delete req.session.error;
      delete req.session.error_code;
      delete req.session.submitted_data;
    });
    
  });

  app.post('/bookstore/gift-certificates', function(req, res) {

    var error;

    if(req.body.other_amount.length > 0 && parseInt(req.body.other_amount) < 25) {
      error = 'The gift amount must be greater than $25.';
      error_code = 'under_min_amount';
    }

    if(req.body.to_name.trim().length === 0) {
      error = 'Please enter the recipient\'s name in the "to" field.';
      error_code = 'no_to_name';
    }

    if(req.body.from_name.trim().length === 0) {
      error = 'Please enter your name in the "from" field.';
      error_code = 'no_from_name';
    }

    if(parseInt(req.body.send_by_email) && req.body.to_email.trim().length === 0) {
      error = 'Please enter the recipient\'s e-mail address.';
      error_code = 'no_email_address';
    }

    if(error) {
      req.session.error = error;
      req.session.error_code = error_code;
      req.session.submitted_data = req.body;
      return res.redirect(req.url);
    }
    
    // set xAmount
    var xAmount;
    if (req.body.other_amount.length > 0)
      xAmount = req.body.other_amount
    else
      xAmount = req.body.gift_amount
      
    // get cart content
    order.getGiftCertificate(req.session.USERIDNUMBER, function(results) {
      if (results) {
        console.log("update gift cert");
        // if there is already an unpurchased Gift Certificate in the "Cart", then do update
        order.updateOrderForGiftCert(req.session.USERIDNUMBER, xAmount, results[0], req.body, function(results){
          
          res.redirect('/order/confirm-order');
        });        
      } else {
        // otherwise do insert
        console.log("insert gift cert");
        
        order.addOrderForGiftCert(req.session.USERIDNUMBER, xAmount, req.body, function(results){
          
          res.redirect('/order/confirm-order');
        });
      }
    });
    //order.saveGiftCertificate(req.session.USERIDNUMBER, function(results) {

      //res.redirect('/order/confirm-order');
    //});

  });
}

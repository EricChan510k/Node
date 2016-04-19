// ====================================================
// Authorize.net customer manager
// ====================================================

var settings = rootRequire('config/settings');

var Authorize          = require('auth-net-types'),
    AuthorizeNetCIMLib = require('auth-net-cim');

var AuthorizeNetCIM = new AuthorizeNetCIMLib({
  api: settings.payment.api_login_id,
  key: settings.payment.transaction_key,
  sandbox: settings.payment.sandbox
});

// stores the payment information for the customer
function createCustomerProfile (data, callback) {
  var customerProfile = {};

  // user info
  customerProfile.merchantCustomerId = data.user.custnumber;  // user's custnumber
  customerProfile.description        = data.user.description; // user's description (optional)
  customerProfile.email              = data.user.email;       // user's email

  // payment info
  var creditCard = new Authorize.CreditCard({
    cardNumber:     data.cc.number,
    expirationDate: data.cc.exp,
    cardCode:       data.cc.ccv
  });

  var payment = new Authorize.Payment({
    creditCard: creditCard
  });

  // billing address
  var billTo;

  if(data.billing) {
    billTo = {
      firstName:   data.billing.firstName,
      lastName:    data.billing.lastName,
      company:     data.billing.company,
      address:     data.billing.address,
      city:        data.billing.city,
      state:       data.billing.state,
      zip:         data.billing.zip,
      country:     data.billing.country,
      phoneNumber: data.billing.phoneNumber,
      faxNumber:   data.billing.faxNumber
    };
  }

  customerProfile.paymentProfiles = new Authorize.PaymentProfiles({
    customerType: 'individual',
    payment:      payment,
    billTo:       billTo
  });

  // shipping address
  if(data.shipping) {
    customerProfile.shipToList = new Authorize.ShippingAddress({
      firstName:   data.shipping.firstName,
      lastName:    data.shipping.lastName,
      address:     data.shipping.address,
      city:        data.shipping.city,
      state:       data.shipping.state,
      zip:         data.shipping.zip,
      country:     data.shipping.country,
      phoneNumber: data.shipping.phoneNumber,
      faxNumber:   data.shipping.faxNumber
    });
  }

  // create the customer in Authorize.net
  AuthorizeNetCIM.createCustomerProfile({
      customerProfile: customerProfile,
      validationMode: 'liveMode'
    },
    function(err, response) {
      if(err)
        winston.error(err);

      callback(response);
    });
}

function createCustomerPaymentProfile(data, callback) {

  // payment info
  var creditCard = new Authorize.CreditCard({
    cardNumber:     data.cc.number,
    expirationDate: data.cc.exp,
    cardCode:       data.cc.ccv
  });

  var payment = new Authorize.Payment({
    creditCard: creditCard
  });

  // billing address
  var billTo;

  if(data.billing) {
    billTo = {
      firstName:   data.billing.firstName,
      lastName:    data.billing.lastName,
      company:     data.billing.company,
      address:     data.billing.address,
      city:        data.billing.city,
      state:       data.billing.state,
      zip:         data.billing.zip,
      country:     data.billing.country,
      phoneNumber: data.billing.phoneNumber,
      faxNumber:   data.billing.faxNumber
    };
  }

  var paymentProfile = {
    customerType: 'individual',
    payment:      payment,
    billTo:       billTo
  };

  // create the payment in Authorize.net
  AuthorizeNetCIM.createCustomerPaymentProfile({
      customerProfileId: data.customer_profile_id,
      paymentProfile: paymentProfile,
      validationMode: 'liveMode'
    },
    function(err, response) {
      if(err)
        winston.error(err);

      callback(response);
    });
}

function updateCustomerPaymentProfile(data, callback) {

  // payment info
  var creditCard = new Authorize.CreditCard({
    cardNumber:     'XXXX' + data.cc.last_four,
    expirationDate: data.cc.exp || 'XXXX',
    cardCode:       data.cc.ccv
  });

  var payment = new Authorize.Payment({
    creditCard: creditCard
  });

  // billing address
  var billTo;

  if(data.billing) {
    billTo = {
      firstName:   data.billing.firstName,
      lastName:    data.billing.lastName,
      company:     data.billing.company,
      address:     data.billing.address,
      city:        data.billing.city,
      state:       data.billing.state,
      zip:         data.billing.zip,
      country:     data.billing.country,
      phoneNumber: data.billing.phoneNumber,
      faxNumber:   data.billing.faxNumber
    };
  }

  var paymentProfile = new Authorize.PaymentProfile({
    customerPaymentProfileId: data.paytoken,
    customerType:             'individual',
    payment:                  payment,
    billTo:                   billTo
  });

  AuthorizeNetCIM.updateCustomerPaymentProfile({
      customerProfileId: data.custtoken,
      paymentProfile: paymentProfile,
      validationMode: 'liveMode'
    },
    function(err, response) {
      if(err)
        winston.error(err);

      callback(response);
    });
}

function deleteCustomerPaymentProfile(custtoken, paytoken, callback) {
  AuthorizeNetCIM.deleteCustomerPaymentProfile({
      customerProfileId: custtoken,
      customerPaymentProfileId: paytoken
    },
    function(err, response) {
      if(err)
        winston.error(err);

      callback(response);
  });
}

module.exports = {
  createCustomerProfile:        createCustomerProfile,
  createCustomerPaymentProfile: createCustomerPaymentProfile,
  updateCustomerPaymentProfile: updateCustomerPaymentProfile,
  deleteCustomerPaymentProfile: deleteCustomerPaymentProfile
};

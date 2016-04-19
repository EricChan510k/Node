// ====================================================
// Shipping Estimator
// ====================================================

// default values
var origin_zip     = '87501';
var origin_city    = 'Santa Fe';
var origin_state   = 'NM';
var origin_country = 'US';

var default_length = 18;
var default_width  = 14;
var default_height = 2;

var settings = rootRequire('config/settings');


// USPS - https://github.com/typefoo/node-shipping-usps (For help also refer to https://github.com/dsusco/usps-web-tools-node-sdk)
var uspsAPI  = require('shipping-usps');

// UPS - https://github.com/typefoo/node-shipping-ups
var upsAPI   = require('shipping-ups');

// FedEx - https://github.com/typefoo/node-shipping-fedex
var fedexAPI = require('shipping-fedex');


var usps = new uspsAPI({
  username: settings.shipping.usps.username,
  password: settings.shipping.usps.password,
  imperial: true // set to false for metric
});

function formatUSPSResponse (usps, shipping_data) {
  if(usps && usps.RateV4Response && usps.RateV4Response.Package && usps.RateV4Response.Package.Postage && usps.RateV4Response.Package.Postage.length) {
    var formated = [];

    var insurance = 0;
    if(shipping_data.total > 200 && shipping_data.total <= 300)
      insurance = 4.20;
    else if(shipping_data.total > 300 && shipping_data.total <= 400)
      insurance = 5.20;
    else if(shipping_data.total > 400)
      insurance = 6.20;


    for(var i = 0; i < usps.RateV4Response.Package.Postage.length; i++) {
      var mail_service = usps.RateV4Response.Package.Postage[i].MailService
                          .replace(/&lt;sup&gt;&#174;&lt;\/sup&gt;/gi, '')
                          .replace(/&lt;sup&gt;&#8482;&lt;\/sup&gt;/gi, '');

      var description = mail_service;
      var delivery    = '';
      var mom_code    = '';

      if(
          mail_service == 'Media Mail Parcel' ||
          mail_service == 'Standard Post' ||
          mail_service == 'Priority Mail 2-Day'
        )
      {

        if(mail_service == 'Media Mail Parcel')
          insurance = 0;

        if(mail_service == 'Standard Post' || mail_service == 'Priority Mail 2-Day') {
          description = 'USPS Priority Mail - Insured';
          delivery    = '4 Days or less';
          mom_code    = 'PRI';
        }

        else if(mail_service == 'Media Mail Parcel') {
          description = 'USPS Media Mail - Uninsured';
          delivery    = '3 Weeks or less';
          mom_code    = 'BK';
        }

        var usps_total = parseFloat(usps.RateV4Response.Package.Postage[i].Rate);

        formated.push({
          service_code: usps.RateV4Response.Package.Postage[i].$.CLASSID,
          service_type: usps.RateV4Response.Package.Postage[i].MailService,
          service_description: description,
          shipping: usps_total,
          handling: shipping_data.handling,
          total_charges: parseFloat((usps_total + shipping_data.handling + insurance).toFixed(2)),
          delivery: delivery,
          mom_code: mom_code
        });
      }

    }

    formated.sort(function (a, b) {
      return a.total_charges - b.total_charges;
    });

    return formated;
  }

  return null;
}

function formatUSPSIntlResponse (usps, shipping_data) {
  if(usps && usps.IntlRateV2Response && usps.IntlRateV2Response.Package && usps.IntlRateV2Response.Package.Service && usps.IntlRateV2Response.Package.Service.length) {
    var formated = [];

    var insurance = 0;
    if(shipping_data.total > 200 && shipping_data.total <= 300)
      insurance = 4.20;
    else if(shipping_data.total > 300 && shipping_data.total <= 400)
      insurance = 5.20;
    else if(shipping_data.total > 400)
      insurance = 6.20;


    for(var i = 0; i < usps.IntlRateV2Response.Package.Service.length; i++) {
      var mail_service = usps.IntlRateV2Response.Package.Service[i].SvcDescription
                          .replace(/&lt;sup&gt;&#174;&lt;\/sup&gt;/gi, '')
                          .replace(/&lt;sup&gt;&#8482;&lt;\/sup&gt;/gi, '');

      var description = mail_service;
      var delivery    = '';
      var mom_code    = '';

      if(
          (mail_service == 'First-Class Package International Service' && shipping_data.weight <= 4) ||
          mail_service == 'Priority Mail International'
        )
      {

        if(mail_service == 'First-Class Package International Service' && shipping_data.weight <= 4) {
          description = 'First-Class Package International Service - Insured';
          delivery    = usps.IntlRateV2Response.Package.Service[i].SvcCommitments;
          mom_code    = 'FCI';
        }

        else if(mail_service == 'Priority Mail International') {
          description = 'Priority Air Mail International - Insured';
          delivery    = usps.IntlRateV2Response.Package.Service[i].SvcCommitments;
          mom_code    = 'PMI';
        }

        var usps_total = parseFloat(usps.IntlRateV2Response.Package.Service[i].Postage);

        formated.push({
          service_code: usps.IntlRateV2Response.Package.Service[i].$.ID,
          service_type: usps.IntlRateV2Response.Package.Service[i].SvcDescription,
          service_description: description,
          shipping: usps_total,
          handling: shipping_data.handling,
          total_charges: parseFloat((usps_total + shipping_data.handling + insurance).toFixed(2)),
          delivery: delivery,
          mom_code: mom_code
        });
      }

    }

    formated.sort(function (a, b) {
      return a.total_charges - b.total_charges;
    });

    return formated;
  }

  return null;
}

function getUSPSRates(shipping_data, callback) {
  if(shipping_data.weight == 0)
    return callback(null);

  try {
    if(shipping_data.country_usps == '001') { // domestic rates
      usps.rates({
        packages: [
          {
            Service: 'All',
            ZipOrigination: origin_zip,
            ZipDestination: shipping_data.zip,
            Pounds: Math.ceil(shipping_data.weight),
            Ounces: 0,
            Container: null,
            Size: 'REGULAR',
            Machinable: false
          }
        ]
      }, function(err, res) {
        if(err) {
          callback(null);
          return console.error(err);
        }

        callback(formatUSPSResponse(res, shipping_data));
      });
    }
    else { // international rates
      usps.intlRates({
        packages: [
          {
            Pounds: Math.ceil(shipping_data.weight),
            Ounces: 0,
            MailType: 'PACKAGE',
            ValueOfContents: null,
            Country: shipping_data.country_usps,
            Container: null,
            Size: 'REGULAR',
            Width: null,
            Length: null,
            Height: null,
            Girth: null,
            OriginZip: origin_zip
          }
        ]
      }, function(err, res) {
        if(err) {
          callback(null);
          return console.error(err);
        }

        callback(formatUSPSIntlResponse(res, shipping_data));
      });
    }
  }
  catch(err) {
    callback(null);
  }
}

var ups = new upsAPI({
  environment: 'live',
  username: settings.shipping.ups.username,
  password: settings.shipping.ups.password,
  access_key: settings.shipping.ups.access_key,
  imperial: true // set to false for metric
});

var ups_service_codes = {
  '01': 'UPS Next Day Air',
  '02': 'UPS Second Day Air',
  '03': 'UPS Ground',
  '07': 'UPS Worldwide Express',
  '08': 'UPS Worldwide Expedited',
  '11': 'UPS Standard',
  '12': 'UPS Three-Day Select',
  '13': 'UPS Next Day Air Saver',
  '14': 'UPS Next Day Air Early A.M.',
  '54': 'UPS Worldwide Express Plus',
  '59': 'UPS Second Day Air A.M.',
  '65': 'UPS Saver',
  '82': 'UPS Today Standard',
  '83': 'UPS Today Dedicated Courier',
  '84': 'UPS Today Intercity',
  '85': 'UPS Today Express',
  '86': 'UPS Today Express Saver',
  '92': 'UPS SurePost (USPS) < 1lb',
  '93': 'UPS SurePost (USPS) > 1lb',
  '94': 'UPS SurePost (USPS) BPM',
  '95': 'UPS SurePost (USPS) Media'
};

function formatUPSResponse (ups, shipping_data) {
  if(ups && ups.Response && ups.Response.ResponseStatusCode == '1' && ups.RatedShipment && ups.RatedShipment.length) {
    var formated = [];

    for(var i = 0; i < ups.RatedShipment.length; i++) {

      if(
          ups.RatedShipment[i].Service.Code == '01' || // UPS Next Day Air
          ups.RatedShipment[i].Service.Code == '02' || // UPS Second Day Air
          ups.RatedShipment[i].Service.Code == '03' || // UPS Ground
          ups.RatedShipment[i].Service.Code == '08' || // UPS Worldwide Expedited
          ups.RatedShipment[i].Service.Code == '12'    // UPS Three-Day Select
        )
      {
        var description = ups_service_codes[ups.RatedShipment[i].Service.Code];
        var mom_code = '';

        switch(ups.RatedShipment[i].Service.Code) {
          case '03':
            description = 'UPS Ground - Insured';
            mom_code    = 'UPS';
            break;

          case '12':
            description = 'UPS 3 Day - Insured';
            mom_code    = 'UP3';
            break;

          case '02':
            description = 'UPS 2 Day Air - Insured';
            mom_code    = 'UP2';
            break;

          case '01':
            description = 'UPS Next Day Air - Insured';
            mom_code    = 'UPN';
            break;

          case '08':
            description = 'UPS Worldwide Expedited - Insured';
            mom_code    = 'UPC';
            break;

        }

        var delivery = ups.RatedShipment[i].GuaranteedDaysToDelivery;
        if(delivery && parseInt(delivery) > 0)
          delivery += ' Day' + (parseInt(delivery) > 1 ? 's' : '');
        else
          delivery = '7 Days or less';

        var ups_total = parseFloat(ups.RatedShipment[i].TotalCharges.MonetaryValue);

        formated.push({
          service_code: ups.RatedShipment[i].Service.Code,
          service_type: ups_service_codes[ups.RatedShipment[i].Service.Code],
          service_description: description,
          shipping: ups_total,
          handling: shipping_data.handling,
          total_charges: parseFloat((ups_total + shipping_data.handling).toFixed(2)),
          delivery: delivery,
          mom_code: mom_code
        });
      }

    }

    formated.sort(function (a, b) {
      return a.total_charges - b.total_charges;
    });

    return formated;
  }

  return null;
}

function getUPSRates(shipping_data, callback) {
  if(shipping_data.weight == 0)
    return callback(null);

  try {
    ups.rates({
      shipper: {
        shipper_number: '727-694',
        address: {
          city: origin_city,
          state_code: origin_state,
          country_code: origin_country,
          postal_code: origin_zip
        }
      },
      ship_to: {
        address: {
          country_code: shipping_data.country_ups,
          postal_code: shipping_data.zip,
          residential: true // if this is company set it to false
        }
      },
      packages: [
        {
          weight: shipping_data.weight,
          width: default_width,
          height: default_height,
          length: default_length,
          insured_value: shipping_data.total
        }
      ]
    }, function(err, res) {
      if(err) {
        callback(null);
        return console.error(err);
      }

      callback(formatUPSResponse(res, shipping_data));
    });
  }
  catch(err) {
    callback(null);
  }
}

var fedex = new fedexAPI({
  environment: 'live',
  key: settings.shipping.fedex.key,
  password: settings.shipping.fedex.password,
  account_number: settings.shipping.fedex.account_number,
  meter_number: settings.shipping.fedex.meter_number,
  imperial: true // set to false for metric
});

function formatFedExResponse (fedex, shipping_data) {
  if(fedex && fedex.RateReplyDetails && fedex.RateReplyDetails.length) {
    var formated = [];

    for(var i = 0; i < fedex.RateReplyDetails.length; i++) {

      var service = '';
      if(shipping_data.country_short == 'CA')
        service = 'FEDEX_GROUND';

      if(
          fedex.RateReplyDetails[i].ServiceType != 'FIRST_OVERNIGHT' &&
          fedex.RateReplyDetails[i].ServiceType != 'GROUND_HOME_DELIVERY' &&
          fedex.RateReplyDetails[i].ServiceType != 'INTERNATIONAL_FIRST' &&
          fedex.RateReplyDetails[i].ServiceType != service
        )
      {
        var description = '';
        var delivery    = '';
        var mom_code    = '';

        switch(fedex.RateReplyDetails[i].ServiceType) {
          case 'PRIORITY_OVERNIGHT':
            description = 'Fedex Priority Overnight (AM) Air - Insured';
            delivery    = '1 Day';
            mom_code    = 'FEP';
            break;

          case 'FEDEX_2_DAY':
            description = 'Fedex 2 Day Air - Insured';
            delivery    = '2 Days';
            mom_code    = 'FE2';
            break;

          case 'STANDARD_OVERNIGHT':
            description = 'Fedex Standard Overnight (PM) Air - Insured';
            delivery    = '1 Day';
            mom_code    = 'FES';
            break;

          case 'FEDEX_EXPRESS_SAVER':
            description = 'Fedex 3 Day Express Saver Air  - Insured';
            delivery    = '3 Days or less';
            mom_code    = 'FE3';
            break;

          case 'FEDEX_GROUND':
            description = 'Fedex Ground Economy - Insured';
            delivery    = '7 Days or less';
            mom_code    = 'RPS';
            break;

          case 'INTERNATIONAL_PRIORITY':
            description = 'Fedex International Priority - Insured';
            delivery    = '5 Days or less';
            mom_code    = 'FEI';
            break;

          case 'INTERNATIONAL_ECONOMY':
            description = 'Fedex International Economy - Insured';
            delivery    = '2-5 days';
            mom_code    = 'FEE';
            break;

        }

        if(description) {
          var fedex_total = parseFloat(fedex.RateReplyDetails[i].RatedShipmentDetails[0].ShipmentRateDetail.TotalNetChargeWithDutiesAndTaxes.Amount);

          formated.push({
            service_code: fedex.RateReplyDetails[i].ServiceType,
            service_type: fedex.RateReplyDetails[i].ServiceType,
            service_description: description,
            shipping: fedex_total,
            handling: shipping_data.handling,
            total_charges: parseFloat((fedex_total + shipping_data.handling).toFixed(2)),
            delivery: delivery,
            mom_code: mom_code
          });
        }
      }

    }

    formated.sort(function (a, b) {
      return a.total_charges - b.total_charges;
    });

    return formated;
  }

  return null;
}

function getFedExRates(shipping_data, callback) {
  if(shipping_data.weight == 0)
    return callback(null);
  
  try {
    fedex.rates({
      ReturnTransitAndCommit: true,
      CarrierCodes: ['FDXE','FDXG'],
      RequestedShipment: {
        PackagingType: 'YOUR_PACKAGING',
        Shipper: {
          Address: {
            City: origin_city,
            StateOrProvinceCode: origin_state,
            PostalCode: origin_zip,
            CountryCode: origin_country
          }
        },
        Recipient: {
          Address: {
            PostalCode: shipping_data.zip,
            CountryCode: shipping_data.country_fedex
          }
        },
        PackageCount: '1',
        RequestedPackageLineItems: {
          SequenceNumber: 1,
          GroupPackageCount: 1,
          Weight: {
            Units: 'LB',
            Value: shipping_data.weight
          },
          Dimensions: {
            Length: default_length,
            Width: default_width,
            Height: default_height,
            Units: 'IN'
          }
        }
      }
    }, function(err, res) {
      if(err) {
        callback(null);
        return console.error(err);
      }
//l(JSON.stringify(res));
      callback(formatFedExResponse(res, shipping_data));
    });
  }
  catch(err) {
    callback(null);
  }
}

module.exports =  {
  getUSPSRates:  getUSPSRates,
  getUPSRates:   getUPSRates,
  getFedExRates: getFedExRates
};

// ====================================================
// Amazon Web Services functions
// ====================================================

var settings   = rootRequire('config/settings');
var amazon_api = require('amazon-product-api');
var AWS        = require('aws-sdk');

// config amazon product api client
var amazon = amazon_api.createClient({
  awsId:     settings.aws.accessKeyId,
  awsSecret: settings.aws.secretAccessKey,
  awsTag:    settings.aws.tag
});

// config amazon services api client
AWS.config.update({
  accessKeyId: settings.aws.accessKeyId,
  secretAccessKey: settings.aws.secretAccessKey,
  region: settings.aws.region,
  apiVersions: {
    s3: '2006-03-01'
  }
});

var s3 = new AWS.S3({ endpoint: settings.aws.s3.endpoint });


function getImageURL(catalog, width) {
  var first_letter = catalog[0];

  if (width)
    width = '_' + width;
  else
    width = '';

  return ('http://' + settings.aws.s3.bucket + '/books/' + first_letter + '/' + catalog + '/' + catalog + width + '.jpg').toLowerCase();
}

function withImageURL(data, width) {
  for(var i = 0; i < data.length; i++)
  {
    data[i].img = getImageURL(data[i].catalog, width);
  }

  return data;
}

function getImagePrexif(catalog) {
  var first_letter = catalog[0];

  return ('books/' + first_letter + '/' + catalog).toLowerCase();
}

function getAmazonImageURL(isbn, width, callback) {
  isbn = isbn.trim().replace(/-/g, '').trim();

  if(isbn && parseInt(isbn) > 0) {

    amazon.itemLookup({
      idType: 'ISBN',
      itemId: isbn,
      responseGroup: 'Images' // take only the images from Amazon (we don't need other info)
    }, function(err, results) {
      if (err) {
        console.error(err);
      } else {
        if(results.length)
        {
          var book = results[0];

          if(book) {
            var image;

            if(book.LargeImage)
              image = book.LargeImage[0].URL[0];

            else if(book.MediumImage)
              image = book.MediumImage[0].URL[0];

            else if(book.SmallImage)
              image = book.SmallImage[0].URL[0];

            if(image) {
              if (width)
                image += '_SX' + width + image.substring(image.lastIndexOf('.'));

              return callback(image);
            }
          }
        }
      }

      // if image is not found call the callback function without parameters
      callback();
    });
  }
  else {
    callback();
  }

}

function getBookImages(catalog, isbn, width, callback) {
  s3.listObjects({
    Bucket: settings.aws.s3.bucket,
    Prefix: getImagePrexif(catalog)
  }, function(err, data) {
    if (err)
      winston.error(err);

    var images = {};

    // try and get images from s3 storage
    if(data && data.Contents.length) {

      // original image from s3
      images.img_s3_original = data.Contents
                                .filter(function(item) {
                                  return item.Key.toLowerCase().indexOf(catalog.toLowerCase() + '.jpg') != -1 && item.Key.toLowerCase().indexOf('booktease') == -1;
                                })
                                .map(function(item) {
                                  return 'http://' + settings.aws.s3.bucket + '/' + item.Key;
                                })[0];

      // 300px width image from s3
      images.img_s3_300      = data.Contents
                                .filter(function(item) {
                                  return item.Key.toLowerCase().indexOf(catalog.toLowerCase() + '_300.jpg') != -1 && item.Key.toLowerCase().indexOf('booktease') == -1;
                                })
                                .map(function(item) {
                                  return 'http://' + settings.aws.s3.bucket + '/' + item.Key;
                                })[0];

      // booktease 'email.jpg' image
      images.email_image     = data.Contents
                                .filter(function(item) {
                                  return item.Key.toLowerCase().indexOf('booktease') != -1 && item.Key.toLowerCase().indexOf('email.jpg') != -1;
                                })
                                .map(function(item) {
                                  return 'http://' + settings.aws.s3.bucket + '/' + item.Key;
                                })[0];

      // booktease images without 'email.jpg' image
      images.booktease       = data.Contents
                                .filter(function(item) {
                                  return item.Key.toLowerCase().indexOf('booktease') != -1 && item.Key.toLowerCase().indexOf('email.jpg') == -1;
                                })
                                .map(function(item) {
                                  return 'http://' + settings.aws.s3.bucket + '/' + item.Key;
                                })
                                .sort(function(a, b) {
                                  var needle = 'booktease/image';
                                  a = parseInt(a.substring(a.toLowerCase().indexOf(needle) + needle.length, a.toLowerCase().indexOf('.jpg')));
                                  b = parseInt(b.substring(b.toLowerCase().indexOf(needle) + needle.length, b.toLowerCase().indexOf('.jpg')));

                                  return a - b;
                                });
    }
    
    // if we have the isbn then try and get the amazon image
    if(isbn)
      getAmazonImageURL(isbn, width, function(result) {
        images.img_amazon = result;
        callback(images);
      });
    else
      callback(images);
  });
}

function getBookeases(callback) {
  s3.listObjects({
    Bucket: settings.aws.s3.bucket,
    Prefix: 'booktease'
  }, function(err, data) {
    if(err)
      winston.error(err);

    callback(data);
  });
}

function getAmazonOffer(amazon) {
  var offer = {};

  if(amazon && amazon.length) { // we have Amazon product
    var i = 0; // get the first result that Amazon returns

    var amazon_direct      = false;
    var amazon_marketplace = false;

    if(amazon[i]) {
      offer.asin = amazon[i].ASIN[0];
      offer.url  = amazon[i].DetailPageURL[0];

      /*
       * Amazon Direct Sale
       */

      // check to see if we have direct Amazon sale
      if(amazon[i].Offers && amazon[i].Offers[0].TotalOffers && parseInt(amazon[i].Offers[0].TotalOffers[0]) > 0) {
        amazon_direct = true;

        // set defaults for the Amazon direct sale
        offer.direct = {
          amount:          0,
          price:           '$0.00',
          currency:        '',
          amazon_amount:   0,
          amazon_price:    '$0.00',
          amazon_currency: ''
        };

        // get the original listing price
        if(amazon[i].ItemAttributes) {

          if(amazon[i].ItemAttributes[0].ListPrice) {

            offer.direct.amount   = parseInt(amazon[i].ItemAttributes[0].ListPrice[0].Amount[0]);
            offer.direct.currency = amazon[i].ItemAttributes[0].ListPrice[0].CurrencyCode[0];
            offer.direct.price    = amazon[i].ItemAttributes[0].ListPrice[0].FormattedPrice[0];
              
          }

          if(!offer.direct.amount && amazon[i].OfferSummary) {

            if(amazon[i].OfferSummary[0].LowestNewPrice) {

              offer.direct.amount   = parseInt(amazon[i].OfferSummary[0].LowestNewPrice[0].Amount[0]);
              offer.direct.currency = amazon[i].OfferSummary[0].LowestNewPrice[0].CurrencyCode[0];
              offer.direct.price    = amazon[i].OfferSummary[0].LowestNewPrice[0].FormattedPrice[0];

            }
            else if(amazon[i].OfferSummary[0].LowestUsedPrice) {

              offer.direct.amount   = parseInt(amazon[i].OfferSummary[0].LowestUsedPrice[0].Amount[0]);
              offer.direct.currency = amazon[i].OfferSummary[0].LowestUsedPrice[0].CurrencyCode[0];
              offer.direct.price    = amazon[i].OfferSummary[0].LowestUsedPrice[0].FormattedPrice[0];

            }

            // initally set the Amazon price same as the listing price
            offer.direct.amazon_amount   = offer.direct.amount;
            offer.direct.amazon_currency = offer.direct.currency;
            offer.direct.amazon_price    = offer.direct.price;

          }

          // for books, the ASIN is the same as the ISBN number, and it should be present in the data returned by Amazon
          // more info at http://www.amazon.com/gp/seller/asin-upc-isbn-info.html
          if(amazon[i].ItemAttributes[0].ISBN)
            offer.direct.isbn = amazon[i].ItemAttributes[0].ISBN[0];
          else
            offer.direct.isbn = amazon[i].ASIN[0];

          if(amazon[i].ItemAttributes[0].PublicationDate)
            offer.direct.pub_date = amazon[i].ItemAttributes[0].PublicationDate[0];

          offer.direct.is_basin = offer.direct.isbn[0] == 'B'; // if the number indentifier is BASIN i.e. starts with 'B'

          if(amazon[i].ItemAttributes[0].Binding) {
            switch(amazon[i].ItemAttributes[0].Binding[0]) {

              case 'Hardcover':
                offer.direct.binding = 'Hardbound';
                break;

              case 'Softcover':
              case 'Paperback':
                offer.direct.binding = 'Softbound';
                break;

              case 'Digital':
              case 'Kindle Edition':
                offer.direct.binding = 'Digital';
                break;

              default:
                offer.direct.binding = amazon[i].ItemAttributes[0].Binding[0];
                break;

            }
          }

        }

        // get the direct Amazon offer price
        if(amazon[i].Offers[0].Offer && amazon[i].Offers[0].Offer[0].OfferListing) {

          if(amazon[i].Offers[0].Offer[0].OfferListing[0].OfferListingId)
            offer.direct.amazon_id = amazon[i].Offers[0].Offer[0].OfferListing[0].OfferListingId[0];

          if(amazon[i].Offers[0].Offer[0].OfferListing[0].Price) {

            offer.direct.amazon_amount   = parseInt(amazon[i].Offers[0].Offer[0].OfferListing[0].Price[0].Amount[0]);
            offer.direct.amazon_currency = amazon[i].Offers[0].Offer[0].OfferListing[0].Price[0].CurrencyCode[0];
            offer.direct.amazon_price    = amazon[i].Offers[0].Offer[0].OfferListing[0].Price[0].FormattedPrice[0];

          }

          if(amazon[i].Offers[0].Offer[0].OfferListing[0].Availability)
            offer.direct.availability = amazon[i].Offers[0].Offer[0].OfferListing[0].Availability[0];

          offer.direct.in_stock = false;
          
          if(offer.direct.availability) {

            if(offer.direct.availability == 'Not yet published' && offer.direct.pub_date) {
              offer.direct.not_published = true;
              offer.direct.availability += '. Due ' + offer.direct.pub_date;
            }
            else if(offer.direct.availability.indexOf('1-2 business days') != -1 || offer.direct.availability.indexOf('24 hours') != -1) {
              offer.direct.in_stock = true;
            }

          }

          if(amazon[i].Offers[0].Offer[0].OfferListing[0].IsEligibleForSuperSaverShipping)
            offer.direct.is_eligible_for_super_saver_shipping = amazon[i].Offers[0].Offer[0].OfferListing[0].IsEligibleForSuperSaverShipping[0];

          if(amazon[i].Offers[0].Offer[0].OfferListing[0].PercentageSaved)
            offer.direct.percentage_saved = Math.round(parseFloat(amazon[i].Offers[0].Offer[0].OfferListing[0].PercentageSaved[0]));
          
          if(!offer.direct.percentage_saved && offer.direct.amount > 0 && offer.direct.amazon_amount > 0)
            offer.direct.percentage_saved = Math.round((1 - (offer.direct.amazon_amount / offer.direct.amount)) * 100);
        }
      }

      /*
       * Amazon Marketplace Sale
       */

      // check to see if we have marketplace Amazon sale
      if(amazon[i].OfferSummary) {

        var total_new = 0, total_used = 0, total_collectible = 0;

        if(amazon[i].OfferSummary[0].TotalNew)
          total_new = parseInt(amazon[i].OfferSummary[0].TotalNew[0]);

        if(amazon[i].OfferSummary[0].TotalUsed)
          total_used = parseInt(amazon[i].OfferSummary[0].TotalUsed[0]);

        if(amazon[i].OfferSummary[0].TotalCollectible)
          total_collectible = parseInt(amazon[i].OfferSummary[0].TotalCollectible[0]);

        if(total_new == 0 && total_used == 0 && total_collectible == 0) {
          amazon_marketplace = false;
        }
        else if(amazon_direct && total_new == 0 && total_used == 1 && total_collectible == 0) {
          amazon_marketplace = false;
        }
        else if(amazon_direct && (total_new > 1 || total_used > 1)) {
          amazon_marketplace = true;
        }
        else if(!amazon_direct && (total_new > 0 || total_used > 0 || total_collectible > 0)) {
          amazon_marketplace = true;
        }

        if(amazon_marketplace) {
          offer.marketplace = {};

          offer.marketplace.new = {};

          if(amazon[i].OfferSummary[0].LowestNewPrice) {

            offer.marketplace.new.total = total_new;
            offer.marketplace.new.amount = parseInt(amazon[i].OfferSummary[0].LowestNewPrice[0].Amount[0]);
            offer.marketplace.new.currency = amazon[i].OfferSummary[0].LowestNewPrice[0].CurrencyCode[0];
            offer.marketplace.new.price = amazon[i].OfferSummary[0].LowestNewPrice[0].FormattedPrice[0];

          }

          offer.marketplace.used = {};

          if(amazon[i].OfferSummary[0].LowestUsedPrice) {

            offer.marketplace.used.total = total_used;
            offer.marketplace.used.amount = parseInt(amazon[i].OfferSummary[0].LowestUsedPrice[0].Amount[0]);
            offer.marketplace.used.currency = amazon[i].OfferSummary[0].LowestUsedPrice[0].CurrencyCode[0];
            offer.marketplace.used.price = amazon[i].OfferSummary[0].LowestUsedPrice[0].FormattedPrice[0];

          }

          offer.marketplace.collectible = {};

          if(amazon[i].OfferSummary[0].LowestCollectiblePrice) {

            offer.marketplace.collectible.total = total_collectible;
            offer.marketplace.collectible.amount = parseInt(amazon[i].OfferSummary[0].LowestCollectiblePrice[0].Amount[0]);
            offer.marketplace.collectible.currency = amazon[i].OfferSummary[0].LowestCollectiblePrice[0].CurrencyCode[0];
            offer.marketplace.collectible.price = amazon[i].OfferSummary[0].LowestCollectiblePrice[0].FormattedPrice[0];

          }

        }
      }
    }
  }

  return offer;
}

function getAmazonProductInfo(isbn, callback, merchantId) {
  var width = 300;

  if(isbn) {

    isbn = isbn.trim().replace(/-/g, '');

    amazon.itemLookup({
      idType:        'ISBN',
      itemId:        isbn,
      responseGroup: 'Large',
      merchantId:    'Amazon' // we must use Amazon for merchant id to return the Amazon offer, otherwise will get marketplace offers
    }, function(err, results) {
      if (err) {
        console.error(err);
      } else {
        if(results.length) {
          return callback(getAmazonOffer(results)); // we exit the execution with the "return" command
        }
      }

      // if products are not found call the callback function without parameters
      callback();
    });
  }
  else {
    callback();
  }
}

module.exports = {
  withImageURL:         withImageURL,
  getImageURL:          getImageURL,
  getAmazonImageURL:    getAmazonImageURL,
  getBookImages:        getBookImages,
  getBookeases:         getBookeases,
  getAmazonProductInfo: getAmazonProductInfo
};

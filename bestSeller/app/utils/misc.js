// ====================================================
// Miscellaneous functions
// ====================================================

var moment    = require('moment');
var unidecode = require('unidecode');

function getPublishInfo (citation) {
  var info = ''

  if(citation) {


    if(citation.publisherx && citation.publisherx.trim())
      info += '<a href="/bookstore/publisher/' + citation.publisher_url + '">' + citation.publisherx.trim() + '</a>'; // make it a link

    if(citation.cityx && citation.cityx.trim())
      info += ', ' + citation.cityx.trim();

    if(citation.country && citation.country.trim())
      info += ', ' + citation.country.trim();

    if(citation.datepub && citation.datepub.trim())
      info += ', ' + citation.datepub.trim();

    if(citation.language && citation.language.trim())
      info += ', ' + citation.language.trim();

    if(citation.pages && citation.pages.trim())
      info += ', ' + citation.pages.trim() + ' pp. ';

    if(citation.illustrat && citation.illustrat.trim())
      info += citation.illustrat.trim();

    if(citation.sizex && citation.sizex.trim())
      info += ', ' + citation.sizex.trim() + '.';
  }

  return info;
}

function getAddressInfo (user) {
  var address = '';

  if(user) {
    if(user.address1 && user.address1.trim())
      address += user.address1.trim();

    if(user.address2 && user.address2.trim())
      address += ' ' + user.address2.trim();

    if(user.city && user.city.trim())
      address += ', ' + user.city.trim();

    if(user.zip && user.zip.trim())
      address += ', ' + user.zip.trim();

    if(user.state && user.state.trim())
      address += ' ' + user.state.trim();

    if(user.country_name && user.country_name.trim())
      address += ', ' + user.country_name.trim();

    user.full_address = address;
  }

  return user;
}

function getAddressesInfo(addresses) {
  if(addresses && addresses.length) {

    for(var i = 0; i < addresses.length; i++) {
      addresses[i] = getAddressInfo(addresses[i]);

      // we have address from address book
      if(addresses[i].autoid > 0) {

        if(addresses[i].defaultaddress_b)
          addresses[0].defaultaddress_b = false;

        if(addresses[i].defaultaddress_s)
          addresses[0].defaultaddress_s = false;

        if(addresses[i].defaultaddress_m)
          addresses[0].defaultaddress_m = false;

      }
      
    }
  }

  return addresses;
}

function getCreditCardInfo(credit_cards) {
  if(credit_cards && credit_cards.length) {

    for(var i = 0; i < credit_cards.length; i++) {

      switch(credit_cards[i].cardtype) {
        case 'VI':
          credit_cards[i].card_type_name = 'Visa';
          break;

        case 'MC':
          credit_cards[i].card_type_name = 'MasterCard';
          break;

        case 'AX':
          credit_cards[i].card_type_name = 'American Express';
          break;

        case 'DS':
          credit_cards[i].card_type_name = 'Discover';
          break;

      }
      
      var exp = credit_cards[i].exp.split('/');

      credit_cards[i].exp_month = exp[0];
      credit_cards[i].exp_year  = exp[1];
    }
  }

  return credit_cards;
}

function getCartInfo(cart) {

  if(cart) {
    for(var i = 0; i < cart.length; i++) {
      // hardbound
      if(cart[i].binding.indexOf('Hard') == 0 || cart[i].number_binding == 'HB') {
        cart[i].binding          = 'Hardbound';
        cart[i].binding_short    = 'HB';
      }
      // softbound
      else if(cart[i].binding.indexOf('Soft') == 0 || cart[i].number_binding == 'SB') {
        cart[i].binding          = 'Softbound';
        cart[i].binding_short    = 'SB';
      }
      // limited edition
      else if(cart[i].binding.indexOf('Limi') == 0 || cart[i].number_binding == 'LTD') {
        cart[i].binding          = 'Limited Edition';
        cart[i].binding_short    = 'LTD';
      }
      // video
      else if(cart[i].binding.indexOf('Vide') == 0 || cart[i].number_binding == 'VIDEO') {
        cart[i].binding          = 'Video';
        cart[i].binding_short    = 'Video';
      }
      // photography
      else if(cart[i].binding.indexOf('Photo') == 0) {
        cart[i].binding          = 'Print';
        cart[i].binding_short    = 'Print';
      }

      // get the first 2 and 3 letters form the catalog number as we use them through the application
      cart[i].catalog_2 = cart[i].catalog.substring(0, 2);
      cart[i].catalog_3 = cart[i].catalog.substring(0, 3);
    }
  }

  return cart;
}

function getStockInfo(stock) {
  var available  = false;
  var in_stock   = false;
  var has_signed = false;

  if(stock) {

    for(var i = 0; i < stock.length; i++) {
      if(!stock[i].discont || stock[i].in_stock) {
        available = true;
        break;
      }
    }

    for(var i = 0; i < stock.length; i++) {
      if(stock[i].in_stock) {
        in_stock = true;
        break;
      }
    }

    for(var i = 0; i < stock.length; i++) {
      if(stock[i].in_stock && stock[i].number_binding.indexOf('SIG') > -1) {
        has_signed = true;
        break;
      }
    }

    for(var i = 0; i < stock.length; i++) {
      // keep the original binding and set default short binding name
      stock[i].binding_original = stock[i].number_binding;
      stock[i].binding_short    = stock[i].number_binding;

      var num_binding = stock[i].number_binding.substring(0,2).toUpperCase();

      // hardbound
      if(num_binding == 'HB') {
        stock[i].binding       = 'Hardbound';
        stock[i].binding_short = 'HB';
      }
      // softbound
      else if(num_binding == 'SB') {
        stock[i].binding       = 'Softbound';
        stock[i].binding_short = 'SB';
      }
      // limited edition
      else if(num_binding == 'LT') {
        stock[i].binding       = 'Limited Edition';
        stock[i].binding_short = 'LTD';
      }
      // video
      else if(num_binding == 'VI') {
        stock[i].binding       = 'Video';
        stock[i].binding_short = 'Video';
      }
      // photography
      else if(num_binding == 'PH') {
        stock[i].binding       = 'Print';
        stock[i].binding_short = 'Print';
      }
    }

    for(var i = 0; i < stock.length; i++) {
      var dash = stock[i].number_binding.indexOf('-');

      if(dash != -1) {
        var info = stock[i].number_binding.substring(dash + 1).toUpperCase();
        
        stock[i].additional_info = '';

        if(info.indexOf('SIG') > -1) {
          stock[i].additional_info += ' [Signed]';
          stock[i].signed = true;
        }
        if(info.indexOf('IMP') > -1) {
          stock[i].additional_info += ' [Imperfect]';
          stock[i].imperfect = true;
        }
        if(info.indexOf('2') > -1) {
          stock[i].additional_info += ' [Sale!]';
          stock[i].sale = true;

          var list_price = stock.filter(function(item) {
            return item.binding == stock[i].binding && item.number_binding.indexOf('2') == -1;
          })[0];

          if(list_price) {
            list_price = list_price.price1;

            stock[i].percentage_saved = Math.round((1 - (stock[i].price1 / list_price)) * 100);
            stock[i].discounted_price = stock[i].price1;
            stock[i].price1           = list_price;
            stock[i].listprice        = list_price;
          }
          
        }

        // if we don't have addition info try to get the the parsed one
        if(!stock[i].additional_info)
          stock[i].additional_info = '[' + info + ']';
      }

      stock[i].additional_handling = stock[i].additional_handling || 0;
    }

  }

  var stock_info = {
    data:       stock, 
    available:  available,
    in_stock:   in_stock,
    has_signed: has_signed
  };

  return stock_info;
}

function normalizeInventoryData(inventory) {
  if(inventory && inventory.length) {
    for(var i = 0; i < inventory.length; i++) {
      if(inventory[i].subjectx) {

        // separate the first and last names from the subjectx column
        var full_name = inventory[i].subjectx.toLowerCase().split(', ');
        var firstname = full_name[1];
        var lastname  = full_name[0];

        // Capitalize the firstname
        if(firstname && firstname.trim())
          firstname = (firstname[0].toUpperCase() + firstname.substring(1)).trim();

        // Capitalize the lastname
        if(lastname && lastname.trim())
          lastname = (lastname[0].toUpperCase() + lastname.substring(1)).trim();

        if(firstname) firstname = firstname.trim();
        if(lastname) lastname = lastname.trim();

        inventory[i].firstname = firstname;
        inventory[i].lastname  = lastname;

        // get trans-literal version of the first and last name as we might have diacritical marks
        var fl          = firstname + ' ' + lastname,
            lf          = lastname  + ' ' + lastname,
            translit_fl = unidecode(fl),
            translit_lf = unidecode(lf);

        // make the artist url SEO friendly with dashes
        inventory[i].artist_url = fl.replace(/\s+/g, '-');

        if(inventory[i].authorsx) {
          
          // build a link friendly authors text
          inventory[i].authors_with_links =
            inventory[i].authorsx
              .replace(fl,          '<a href="/bookstore/artist/' + inventory[i].artist_url + '">' + fl + '</a>')
              .replace(lf,          '<a href="/bookstore/artist/' + inventory[i].artist_url + '">' + lf + '</a>')
              .replace(translit_fl, '<a href="/bookstore/artist/' + inventory[i].artist_url + '">' + fl + '</a>')
              .replace(translit_lf, '<a href="/bookstore/artist/' + inventory[i].artist_url + '">' + lf + '</a>');
        }
      }

      if(inventory[i].publisherx) {
        // make publisher url SEO friendly with dashes
        inventory[i].publisher_url = inventory[i].publisherx.trim().replace(/\s+/g, '-');
      }
    }    

    // format binding data if any
    for(var i = 0; i < inventory.length; i++) {
      if(inventory[i].number_binding) {
        // keep the original binding and set default short binding name
        inventory[i].binding_original = inventory[i].number_binding;
        inventory[i].binding_short    = inventory[i].number_binding;

        var num_binding = inventory[i].number_binding.substring(0,2).toUpperCase();

        // hardbound
        if(num_binding == 'HB') {
          inventory[i].binding       = 'Hardbound';
          inventory[i].binding_short = 'HB';
        }
        // softbound
        else if(num_binding == 'SB') {
          inventory[i].binding       = 'Softbound';
          inventory[i].binding_short = 'SB';
        }
        // limited edition
        else if(num_binding == 'LT') {
          inventory[i].binding       = 'Limited Edition';
          inventory[i].binding_short = 'LTD';
        }
        // video
        else if(num_binding == 'VI') {
          inventory[i].binding       = 'Video';
          inventory[i].binding_short = 'Video';
        }
        // photography
        else if(num_binding == 'PH') {
          inventory[i].binding       = 'Print';
          inventory[i].binding_short = 'Print';
        }
      }
    }

    for(var i = 0; i < inventory.length; i++) {
      if(inventory[i].number_binding) {
        var dash = inventory[i].number_binding.indexOf('-');

        if(dash != -1) {
          var info = inventory[i].number_binding.substring(dash + 1).toUpperCase();
          
          inventory[i].additional_info = '';

          if(info.indexOf('SIG') > -1) {
            inventory[i].additional_info += ' [Signed]';
            inventory[i].signed = true;
          }
          if(info.indexOf('IMP') > -1) {
            inventory[i].additional_info += ' [Imperfect]';
            inventory[i].imperfect = true;
          }
          if(info.indexOf('2') > -1) {
            inventory[i].additional_info += ' [Sale!]';
            inventory[i].sale = true;

            var list_price = inventory.filter(function(item) {
              return item.binding == inventory[i].binding && item.number_binding.indexOf('2') == -1;
            })[0];

            if(list_price) {
              list_price = list_price.price1;

              inventory[i].percentage_saved = Math.round((1 - (inventory[i].price1 / list_price)) * 100);
              inventory[i].discounted_price = inventory[i].price1;
              inventory[i].price1           = list_price;
              inventory[i].listprice        = list_price;
            }
            
          }

          // if we don't have addition info try to get the the parsed one
          if(!inventory[i].additional_info)
            inventory[i].additional_info = '[' + info + ']';
        }
      }

      inventory[i].additional_handling = inventory[i].additional_handling || 0;

      if(!inventory[i].saleprice)
        inventory[i].saleprice = inventory[i].price1;
    }
  }
}

function normalize365ABookADayData(abookaday) {
  if(abookaday && abookaday.length) {
    for(var i = 0; i < abookaday.length; i++) {
      if(abookaday[i].date)
        abookaday[i].formatted_date = moment(abookaday[i].date).format('dddd, MMMM Do');

      if(abookaday[i].date > new Date())
        abookaday[i].future = true;
    }

    abookaday.reverse();
  }
}

function getArtistInfo (artist) {
  if(artist && artist.length) {

    for(var i = 0; i < artist.length; i++) {

      var artist_info = '';

      if(artist[i].nationality)
        artist_info += artist[i].nationality + ' ';

      if(artist[i].city)
        artist_info += 'lives in ' + artist[i].city;

      if(artist[i].state && artist[i].state.trim() != 'FO')
        artist_info += ', ' + artist[i].state;
      else if(artist[i].region)
        artist_info += ', ' + artist[i].region;

      if(artist[i].birth)
        artist_info += ' b.' + artist[i].birth;

      artist[i].artist_info = artist_info;
    }
  }

  return artist;
}

module.exports = {
  getPublishInfo:            getPublishInfo,
  getAddressInfo:            getAddressInfo,
  getAddressesInfo:          getAddressesInfo,
  getStockInfo:              getStockInfo,
  getCartInfo:               getCartInfo,
  getCreditCardInfo:         getCreditCardInfo,
  normalizeInventoryData:    normalizeInventoryData,
  normalize365ABookADayData: normalize365ABookADayData,
  getArtistInfo:             getArtistInfo
};

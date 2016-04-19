// ====================================================
// Order model
// ====================================================

var photoeye    = rootRequire('app/db/sequelize').photoeye;
var global_vars = rootRequire('models/global-vars');
var shipping    = rootRequire('app/utils/shipping');
var misc        = rootRequire('app/utils/misc');
var email       = rootRequire('app/utils/email');
var settings    = rootRequire('config/settings');
var misc_db     = rootRequire('models/misc');
var async       = require('async');
var moment      = require('moment');

// Adds item to the shopping cart
function addOrder (user_id, custnumber, order, callback) {
  var number_no_spaces    = order.number.replace(/\s+/g, ''); // clear whitespace
  var record_id           = order['recordid_' + number_no_spaces];
  var binding             = order['binding_' + number_no_spaces];
  var list_price          = order['listprice_' + number_no_spaces];
  var sale_price          = order['saleprice_' + number_no_spaces];
  var additional_handling = order['additional_handling_' + number_no_spaces];
  var ingram              = order['ingram_' + number_no_spaces];

  order.numcopies = parseInt(order.numcopies);
  if(!order.numcopies || order.numcopies <= 0)
    order.numcopies = 1;

  var wish_list_id = null;
  if(order.wishlistid)
    wish_list_id = order.wishlistid;

  photoeye.transaction(function (t) {

    var sql =
      `SELECT COUNT(*) AS in_cart_count, SUM(numcopies) AS qty, SUM(qtyreserved) AS qtyreserved
        FROM orderinfo
        WHERE
          number = :number
          AND userid = :userid`;

    var params = { userid: user_id, number: order.number };

    return photoeye
      .query(sql, { transaction: t, replacements: params })
      .then(function (results) {

        results = results[0][0];

        return new Promise(function (resolve, reject) {

          async.waterfall([
            function (callback) {
              sql =
                  `SELECT fromwishlist
                    FROM orderinfo
                    WHERE
                      number = :number
                      AND userid = :userid`;

                params = {
                  userid: user_id,
                  number: order.number
                };

                photoeye
                  .query(sql, { transaction: t, replacements: params })
                  .spread(function(results, metadata) {

                    var fromwishlist = null;
                    if(results[0])
                      fromwishlist = results[0].fromwishlist;

                    callback(null, fromwishlist);
                  });
            },
            function (from_wish_list, callback) {
              if(results.in_cart_count > 0) {
                sql =
                  `UPDATE orderinfo
                    SET numcopies = numcopies + :numcopies,
                      fromwishlist = :fromwishlist,
                      datecartchanged = GETDATE()
                    WHERE
                      number = :number
                      AND userid = :userid`;

                params = {
                  numcopies: order.numcopies,
                  userid: user_id,
                  number: order.number,
                  fromwishlist: wish_list_id || from_wish_list
                };

                photoeye
                  .query(sql, { transaction: t, replacements: params })
                  .spread(function(results, metadata) {

                    callback(null, results);
                  });

              }
              else {

                sql =
                  `INSERT INTO OrderInfo
                    (
                      recordid,
                      userid,
                      binding,
                      numcopies,
                      listprice,
                      saleprice,
                      catnum,
                      title,
                      number,
                      dateadded,
                      datecartchanged,
                      qtyreserved,
                      ingram,
                      additional_handling,
                      fromwishlist
                    )
                  VALUES
                    (
                      :recordid,
                      :userid,
                      :binding,
                      :numcopies,
                      :listprice,
                      :saleprice,
                      :catnum,
                      :title,
                      :number,
                      GETDATE(),
                      GETDATE(),
                      :qtyreserved,
                      :ingram,
                      :additional_handling,
                      :fromwishlist
                    )`;

                params = {
                  recordid:            record_id,
                  userid:              user_id,
                  binding:             binding,
                  numcopies:           order.numcopies,
                  listprice:           list_price,
                  saleprice:           sale_price,
                  catnum:              order.catalog,
                  title:               order.title2x,
                  number:              order.number,
                  qtyreserved:         0,
                  ingram:              ingram,
                  additional_handling: additional_handling,
                  fromwishlist:        wish_list_id
                };

                photoeye
                  .query(sql, { transaction: t, replacements: params })
                  .spread(function(results, metadata) {

                    callback(null, results);
                  });
              }
            },
            function (previous_query_data, callback) {
              // if we adding item from wish list then remove it from the wishlist
              if(wish_list_id && custnumber) {
                removeFromWishList (user_id, custnumber, order.number, function() {
                  callback(null, null);
                });
              }
              else
                callback(null, null);
            }
          ],
          function(err, results) {
            if(err) {
              winston.error(err);
              return reject(err);
            }

            resolve(results);

          });
        });

      });

  })
  .then(function (results) {
    // Transaction has been committed

    updateStock(user_id, true, function (stock_results) {
      callback(results);
    });
  })
  .catch(function (err) {
    // Transaction has been rolled back
    winston.error(err);
    callback(err);
  });
  
}

// Gets the cart content form the OrderInfo table
function getCart (user_id, custnumber, update, callback) {

  // first update the stock levels before getting the cart
  updateStock(user_id, update, function (stock_changed) {

    // update order info with the appropriate custnumber if the user is logged in
    updateOrderCustNumber(user_id, custnumber, function () {

      var sql =
        `SELECT 
            stock.unitweight,
            stock.stockwidth,
            stock.stockheight,
            stock.stocklength,
            stock.discont,
            LTRIM(RTRIM(stock.number_root)) AS number_root,
            LTRIM(RTRIM(stock.number_binding)) AS number_binding,
            inventory.title2x,
            inventory.authorsx,
            inventory.catalog,
            LTRIM(RTRIM(inventory.hard_isbn)) AS hard_isbn,
            LTRIM(RTRIM(inventory.soft_isbn)) AS soft_isbn,
            inventory.use_pe_image_only,
            inventory.soft_nyp,
            inventory.hard_nyp,
            orderinfo.orderid,
            orderinfo.onlineordernum,
            orderinfo.autoindex,
            orderinfo.recordid,
            orderinfo.numcopies,
            orderinfo.binding,
            orderinfo.listprice,
            orderinfo.saleprice,
            orderinfo.removeitem,
            orderinfo.qtyreserved,
            orderinfo.reservationrevoked,
            orderinfo.autoindex,
            LTRIM(RTRIM(orderinfo.number)) AS number,
            orderinfo.fromwishlist,
            orderinfo.additional_handling
              FROM 
                orderinfo 
                  INNER JOIN inventory ON inventory.recordid = orderinfo.recordid
                  LEFT JOIN stock ON stock.number = orderinfo.number
          WHERE 
            orderinfo.userid = :userid
            AND orderinfo.binding <> 'GiftCert'
            AND orderinfo.number IS NOT NULL
            AND orderinfo.numcopies > 0
            ORDER BY orderinfo.dateadded DESC`;

      var params = { userid: user_id };

      photoeye
        .query(sql, { replacements: params })
        .spread(function(results, metadata) {

            callback(misc.getCartInfo(results), stock_changed);
        });

    });
  });
}

// Gets the cart items count (used for the top header cart icon)
function getCartCount (user_id, callback) {
  var sql =
    `SELECT SUM(numcopies) AS cart_count
      FROM orderinfo 
      WHERE userid = :userid AND number IS NOT NULL`;

  var params = { userid: user_id };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {
      callback(results);
    });

}

// Updates the order with the customer if the user is logged in
function updateOrderCustNumber (user_id, custnumber, callback) {
  var sql =
    `UPDATE orderinfo SET 
      custnumber = :custnumber
      WHERE userid = :userid`;

  var params = { userid: user_id, custnumber: custnumber };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {
      callback(results);
    });

}

// Updates the stock levels
function updateStock (user_id, update, callback) {

  // when we get shipping estimate we don't need to update the stock
  if(!update)
    return callback(false);

  photoeye.transaction(function (t) {

    var sql =
      `SELECT autoindex, numcopies, number, qtyreserved
        FROM orderinfo
        WHERE userid = :userid AND number IS NOT NULL`;

    var params = { userid: user_id };

    return photoeye
      .query(sql, { transaction: t, replacements: params })
      .then(function (order_results) {

        return new Promise(function (resolve, reject) {
          
          if(order_results && order_results.length) {
            order_results = order_results[0];
            var i = -1; // start with -1 so we can increment it to 0 (and get the first element)

            var stock_changed = false;

            async.whilst(
              function () {
                i++;
                return i < order_results.length;
              },
              function (sql_callback) {

                var initial_qty_reserved = 0;
                if(order_results[i].qtyreserved)
                  initial_qty_reserved = order_results[i].qtyreserved;

                sql = `SELECT (units - qtyreserved) AS available, units, qtyreserved
                        FROM stock 
                        WHERE number = :number`;

                params = { number: order_results[i].number };

                photoeye
                  .query(sql, { transaction: t, replacements: params })
                  .spread(function(stock_results, metadata) {
                    stock_results = stock_results[0];

                    if(stock_results) {

                      var available = stock_results.available;

                      var qty_reserved = 0;
                      var initial_numcopies = order_results[i].numcopies;

                      if(order_results[i].qtyreserved > 0)
                        available += 1;

                      qty_reserved = Math.min(order_results[i].numcopies, available);
                      if(qty_reserved < 0)
                        qty_reserved = 0;

                      var reservationrevoked = order_results[i].reservationrevoked || null;                      

                      // check if reserved quantity is revoked for this item in the cart
                      if (initial_qty_reserved < qty_reserved || initial_numcopies > order_results[i].numcopies)
                        reservationrevoked = 0;
                      else if (initial_qty_reserved > qty_reserved)
                        reservationrevoked = 1;

                      sql = `UPDATE orderinfo SET
                                qtyreserved = :qtyreserved,
                                reservationrevoked = :reservationrevoked,
                                datecartchanged = GETDATE()
                              WHERE number = :number AND userid = :userid`;

                      params = {
                        qtyreserved: qty_reserved,
                        reservationrevoked: reservationrevoked,
                        number: order_results[i].number,
                        userid: user_id
                      };

                      photoeye
                        .query(sql, { transaction: t, replacements: params })
                        .spread(function(update_results, metadata) {

                          var stock_update_qty = stock_results.qtyreserved;

                          if(order_results[i].qtyreserved == 0)
                            stock_update_qty += 1;

                          if(available <= 0)
                            stock_update_qty = 0;

                          sql = `UPDATE stock
                                  SET qtyreserved = :qtyreserved
                                  WHERE number = :number`;

                          params = { qtyreserved: stock_update_qty, number: order_results[i].number };

                          photoeye
                            .query(sql, { transaction: t, replacements: params })
                            .spread(function(update_results, metadata) {

                              // check to see if the stock is changed and return this value at the end in the callback
                              if(!stock_changed && initial_qty_reserved != qty_reserved)
                                stock_changed = true;

                              sql_callback(null, stock_changed);
                            });
                          
                        });

                    }
                    else {
                      sql_callback(null, stock_changed);
                    }
                    
                  });

              },
              function (err, all_results) {
                if(err) {
                  winston.error('Error while updating stock levels');
                  return reject(err);
                }

                resolve(all_results);
              });
          }
          else
            reject(Error('No order found'))

        });

      });


  })
  .then(function (result) {
    // Transaction has been committed
    callback(result);
  })
  .catch(function (err) {
    // Transaction has been rolled back
    winston.error(err);
    callback(err);
  });
}

// Updates quantity in the shopping cart for one item
function updateQuantity (user_id, stock_number, numcopies, callback) {

  numcopies = parseInt(numcopies);
  if(!numcopies || numcopies <= 0)
    numcopies = 1;

  photoeye.transaction(function (t) {

    var sql =
        `SELECT autoindex, numcopies, number, qtyreserved
          FROM orderinfo
          WHERE userid = :userid AND number = :number`;

    var params = { userid: user_id, number: stock_number };

    return photoeye
      .query(sql, { transaction: t, replacements: params })
      .then(function (order_results) {
        order_results = order_results[0][0];

        sql =
          `UPDATE orderinfo SET
              numcopies = :numcopies,
              datecartchanged = GETDATE()
            WHERE number = :number AND userid = :userid`;

        params = {
          numcopies: numcopies,
          number: stock_number,
          userid: user_id
        };

        return photoeye
          .query(sql, { transaction: t, replacements: params });

      });

  })
  .then(function (results) {
    // Transaction has been committed

    updateStock(user_id, true, function (stock_results) {
      callback(results);
    });
  })
  .catch(function (err) {
    // Transaction has been rolled back
    winston.error(err);
    callback(err);
  });
}

// Removes item from the shopping cart
function removeItem (user_id, stock_number, callback) {

  photoeye.transaction(function (t) {
    var sql =
        `SELECT autoindex, numcopies, number, qtyreserved
          FROM orderinfo
          WHERE userid = :userid AND number = :number`;

    var params = { userid: user_id, number: stock_number };

    return photoeye
      .query(sql, { transaction: t, replacements: params })
      .then(function (order_results) {
        order_results = order_results[0][0];

        if(!order_results)
          return callback();

        var stock_reserved_qty_update = 0;
        if(order_results.qtyreserved > 0)
          stock_reserved_qty_update = 1;

        sql = `UPDATE stock
                SET qtyreserved = qtyreserved - :stock_reserved_qty_update
                WHERE number = :number`;

        params = { stock_reserved_qty_update: stock_reserved_qty_update, number: stock_number };

        return photoeye
          .query(sql, { transaction: t, replacements: params })
          .then(function (update_results) {
            
            sql =
              `DELETE FROM orderinfo
                WHERE
                  number = :number
                  AND userid = :userid`;

            params = { userid: user_id, number: stock_number };

            return photoeye
              .query(sql, { transaction: t, replacements: params });

          });

      });

  })
  .then(function (result) {
    // Transaction has been committed

    callback(result);
  })
  .catch(function (err) {
    // Transaction has been rolled back
    winston.error(err);
    callback(err);
  });

}

// Gets the shipping estimation for the destination
function getShipping (user_id, custnumber, destination_info, callback) {

  var default_hb_weight = 2.66; // hardbound default weight
  var default_sb_weight = 1.33; // softbound default weight
  var default_vi_weight = 0.67; // video default weight

  getCart(user_id, custnumber, false, function (results) {
    
    var weight = 0, total = 0, handling = 0, tax = 0;

    for(var i = 0; i < results.length; i++) {
      var default_weight = 1.33; // in case no binding is specified use this as default weight

      // hardbound
      if(results[i].binding.indexOf('Hard') == 0 || results[i].binding.indexOf('Limi') == 0 || results[i].number_binding == 'HB' || results[i].number_binding == 'LTD')
        default_weight = default_hb_weight;

      // softbound
      else if(results[i].binding.indexOf('Soft') == 0 || results[i].number_binding == 'SB')
        default_weight = default_sb_weight;

      // video
      else if(results[i].binding.indexOf('Vide') == 0 || results[i].number_binding == 'VIDEO')
        default_weight = default_vi_weight;


      weight   += results[i].numcopies * (results[i].unitweight || default_weight);
      total    += results[i].numcopies * results[i].saleprice;
      handling += results[i].additional_handling;
    }

    global_vars.getGlobalVars(function (vars) {

      handling += vars.handlingcharge; // get this value from Global_Vars table

      // we need the billing zip to estimate the tax as fall-back we get the shipping zip if we don't have billing zip
      var zip = destination_info.billing_zip || destination_info.zip;

      // For US, New Mexico calculate state sales tax
      if(destination_info.country_code == '001' && parseInt(zip) > 87000 && parseInt(zip) < 88440)
        tax = parseFloat((total * parseFloat(vars.salestax)).toFixed(2));

      misc_db.getCountryInfo(destination_info.country_code, function(country) {

        var shipping_data = {
          country_usps:  country.usps,
          country_ups:   country.ups,
          country_fedex: country.fedex,
          country_code:  country.countrycode,
          zip:           destination_info.zip,
          weight:        weight,
          total:         total,
          handling:      handling
        };

        async.parallel({
          usps: function(callback) {
            shipping.getUSPSRates(shipping_data, function(usps_results) {
              callback(null, usps_results);
            });
          },
          ups: function(callback) {
            shipping.getUPSRates(shipping_data, function(ups_results) {
              callback(null, ups_results);
            });
          },
          fedex: function(callback) {
            shipping.getFedExRates(shipping_data, function(fedex_results) {
              callback(null, fedex_results);
            });
          }
        },
        function(err, shipping_results) {
          if(err)
            throw new Error('Error while getting shipping estimation');

          // if the shipping country is US, then add customer pickup as option for shipping
          if(destination_info.country_code == '001') {
            shipping_results.pickup = [{
              service_code: 0,
              service_type: 'Customer Pickup',
              service_description: 'Customer Pickup (photo-eye, Santa Fe, NM)',
              shipping: 0,
              handling: 0,
              total_charges: 0,
              delivery: 'N/A',
              mom_code: 'CPU'
            }];
          }

          callback({ providers: shipping_results, tax: tax });
        });

      });

    });

  });
}

// Gets the shipping methods by country from database table ShippingMethods
function getCountryShipping (foreign, callback) {
  var sql =
    `SELECT 
        autoid,
        shipper,
        LTRIM(RTRIM(momcode)) AS momcode,
        service,
        servicedescription,
        xcarrier,
        raterequesttype,
        deliverydays,
        xforeign,
        sortorder
      FROM shippingmethods
      WHERE 
        xforeign = :foreign
      ORDER BY sortorder`;

  var params = { foreign: foreign };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {
      callback(results);
    });

}

// Checks to see if the user has unused gift certificate
function getGiftCertificate(user_id, callback) {

  var sql =
    `SELECT 
        giftcert.giftcertid,
        giftcert.orderinfoautoid,
        giftcert.onlineordernum,
        giftcert.amount,
        giftcert.sendbyemail,
        giftcert.toname,
        giftcert.fromname,
        giftcert.message,
        giftcert.fromcustnum,
        giftcert.shippingaddressid,
        giftcert.toemail,
        giftcert.purchasedate,
        giftcert.tosenddate,
        giftcert.sentondate,
        'Gift Certificate' AS title2x, 
        '' AS authorsx, 
        'GFTCR' AS catalog, 
        giftcert.amount AS soft_price, 
        0 AS soft_sale,
        0 AS hard_price, 
        0 AS hard_sale, 
        0 AS video, 
        0 AS orderid, 
        NULLIF(orderinfo.onlineordernum, '') AS onlineordernum, 
        orderinfo.autoindex AS autoindex, 
        0 AS recordid, 
        1 AS numcopies, 
        ' ' AS binding, 
        amount AS listprice, 
        0 AS saleprice, 
        orderinfo.removeitem AS removeitem, 
        orderinfo.qtyreserved, 
        orderinfo.reservationrevoked, 
        orderinfo.number, 
        0 as unitweight
    FROM 
      giftcert INNER JOIN orderinfo ON giftcert.orderinfoautoid = orderinfo.autoindex
    WHERE 
      orderinfo.userid = :userid
      AND giftcert.purchasedate IS NULL`;

  var params = { userid: user_id };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {
      // There can be only one Gift Certificate at one time do get the first one
      callback(results[0]); // Search for unpurchased Gift Certificates for this UserID, format the query results so it looks like it came from the shopping cart
    });
}

// Saves or updates the Gift Certificate
function saveGiftCertificate(user_id, callback) {
  callback();
}

// Get new online order number and update the order with this number
function generateOnlineOrderNum(user_id, callback) {

  photoeye.transaction(function (t) {

    var sql =
      `SELECT onlineordernum
        FROM orderinfo
        WHERE userid = :userid`;

    var params = { userid: user_id };

    return photoeye
      .query(sql, { transaction: t, replacements: params })
      .then(function (results) {

        var onlineordernum = null;

        var order_num = results[0].filter(function(item) {
          return item.onlineordernum != null;
        })[0];

        // this means we have item in the cart with online order number
        if(order_num)
          onlineordernum = order_num.onlineordernum;

        var order_num_null = results[0].filter(function(item) {
          return item.onlineordernum == null;
        });

        return new Promise(function (resolve, reject) {
          // the cart don't have online order number on all items so update all items with the newly generated olnine order number
          if(!onlineordernum) {

            sql =
              `UPDATE global_vars
                SET onlineordernum = onlineordernum + 1
                WHERE id = 1`;

            return photoeye
              .query(sql, { transaction: t })
              .then(function (results) {

                sql =
                  `SELECT onlineordernum
                    FROM global_vars
                    WHERE id = 1`;

                return photoeye
                  .query(sql, { transaction: t })
                  .then(function (results) {
                    onlineordernum = results[0][0].onlineordernum.toString() + parseInt(Math.random() * 100).toString();

                    sql =
                      `UPDATE orderinfo
                        SET onlineordernum = :onlineordernum
                        WHERE userid = :userid`;

                    params = { onlineordernum: onlineordernum, userid: user_id };

                    return photoeye
                      .query(sql, { transaction: t, replacements: params })
                      .then(function (results) {

                        resolve(onlineordernum);
                      });

                  });

              });
          }
          // we have items in the card with null value so update these items with the already existing online order number
          else if(order_num_null.length) {

            sql =
              `UPDATE orderinfo
                SET onlineordernum = :onlineordernum
                WHERE userid = :userid
                AND onlineordernum IS NULL`;

            params = { onlineordernum: onlineordernum, userid: user_id };

            return photoeye
              .query(sql, { transaction: t, replacements: params })
              .then(function (results) {

                resolve(onlineordernum);
              });
          }
          // we have have online order number for all items in the cart so we return that
          else
            resolve(onlineordernum);

        });
      });

  })
  .then(function (result) {
    // Transaction has been committed
    callback(result);
  })
  .catch(function (err) {
    // Transaction has been rolled back
    winston.error(err);
    callback(err);
  });

}

function finalizeOrder(user_id, custnumber, data, submitted_data, callback) {

  photoeye.transaction(function (t) {
    
    var sql, params, current_order_id;

    // we return promise because sequelize transactions work that way
    return new Promise(function (resolve, reject) {

      // execute the SQL queries in this order
      async.waterfall([
        function(callback) {

          // There are three different UserInfo tables. So we need to determine the MAX(orderid) from all three
          sql =
            `SELECT MAX(max_order_id) max_order_id FROM
              (
                (SELECT max(orderid) AS max_order_id FROM userinfo)
                UNION
                (SELECT max(orderid) AS max_order_id FROM userinfonew)
                UNION
                (SELECT max(orderid) AS max_order_id FROM userinfonewest)
              ) AS max_order_ids`;

          photoeye
            .query(sql, { transaction: t })
            .spread(function(results, metadata) {
              current_order_id = results[0].max_order_id + 1; // this is the current order id

              callback(null, results);
            });

        },
        function(previous_query_data, callback) {
          sql =
            `INSERT INTO userinfonewest
              (
                custnumber,
                altnum,
                orderid,
                userid,
                acctid,
                custid_billing,
                custid_shipping,
                firstname,
                lastname,
                company,
                address1,
                address2,
                city,
                state,
                country,
                zip,
                phone,
                phone2,
                ship_firstname,
                ship_lastname,
                ship_company,
                ship_1address,
                ship_2address,
                ship_city,
                ship_state,
                ship_country,
                ship_zip,
                ship_phone,
                ship_phone2,
                shipvia,
                cardnum,
                exp,
                cardholder,
                cc_cid,
                tax,
                shipping,
                totalbill,
                paymentmethod,
                email,
                ship_email,
                specialinstructions,
                comment,
                tpshipacct,
                norent,
                ponumber,
                loginid,
                custtoken,
                paytoken,
                timestamp
              )
              VALUES
              (
                :custnumber,
                :altnum,
                :orderid,
                :userid,
                :acctid,
                :custid_billing,
                :custid_shipping,
                :firstname,
                :lastname,
                :company,
                :address1,
                :address2,
                :city,
                :state,
                :country,
                :zip,
                :phone,
                :phone2,
                :ship_firstname,
                :ship_lastname,
                :ship_company,
                :ship_1address,
                :ship_2address,
                :ship_city,
                :ship_state,
                :ship_country,
                :ship_zip,
                :ship_phone,
                :ship_phone2,
                :shipvia,
                :cardnum,
                :exp,
                :cardholder,
                :cc_cid,
                :tax,
                :shipping,
                :totalbill,
                :paymentmethod,
                :email,
                :ship_email,
                :specialinstructions,
                :comment,
                :tpshipacct,
                :norent,
                :ponumber,
                :loginid,
                :custtoken,
                :paytoken,
                GETDATE()
              )`;

          // this is data that we need for the inserts in the database
          params = {

            // user and customer ids
            custnumber:          custnumber,
            altnum:              data.user.altnum || null,
            orderid:             current_order_id,
            userid:              user_id,
            acctid:              custnumber,

            // addresses ids
            custid_billing:      data.addresses.billing_address.custnumber,
            custid_shipping:     data.addresses.shipping_address.custnumber,

            // billing address info
            firstname:           data.addresses.billing_address.firstname, 
            lastname:            data.addresses.billing_address.lastname,
            company:             data.addresses.billing_address.company,
            address1:            data.addresses.billing_address.address1, 
            address2:            data.addresses.billing_address.address2,
            city:                data.addresses.billing_address.city,
            state:               data.addresses.billing_address.state,
            country:             data.addresses.billing_address.country_code,
            zip:                 data.addresses.billing_address.zip,
            phone:               data.addresses.billing_address.phone, 
            phone2:              data.addresses.billing_address.phone2,

            // shipping address info
            ship_firstname:      data.addresses.shipping_address.firstname,
            ship_lastname:       data.addresses.shipping_address.lastname,
            ship_company:        data.addresses.shipping_address.company,
            ship_1address:       data.addresses.shipping_address.address1,
            ship_2address:       data.addresses.shipping_address.address2,
            ship_city:           data.addresses.shipping_address.city,
            ship_state:          data.addresses.shipping_address.state,
            ship_country:        data.addresses.shipping_address.country_code,
            ship_zip:            data.addresses.shipping_address.zip,
            ship_phone:          data.addresses.shipping_address.phone,
            ship_phone2:         data.addresses.shipping_address.phone2,

            // payment info
            shipvia:             submitted_data.shipping_mom,
            cardnum:             null, // don't store the credit cart number anymore
            exp:                 data.credit_card && data.user.paymentmethod == 1 ? data.credit_card.exp : null,
            cardholder:          data.credit_card && data.user.paymentmethod == 1 ? data.credit_card.cardholder : null,
            cc_cid:              null, // don't store the credit cart cid anymore
            tax:                 submitted_data.tax_price,
            shipping:            submitted_data.shipping_price,
            totalbill:           submitted_data.total_price,
            paymentmethod:       data.user.paymentmethod,

            // emails
            email:               data.addresses.billing_address.email,
            ship_email:          data.addresses.shipping_address.email,

            // additional shipping info
            specialinstructions: submitted_data.special_instructions,
            comment:             submitted_data.comment,
            tpshipacct:          data.user.tpshipacct,
            norent:              data.addresses.billing_address.norent,
            ponumber:            submitted_data.po_number || null,

            // Authorize.net data required for MOM
            loginid:             settings.payment.api_login_id,
            custtoken:           data.credit_card.custtoken,
            paytoken:            data.credit_card.paytoken

          };

          photoeye
            .query(sql, { transaction: t, replacements: params })
            .spread(function(results, metadata) {

              callback(null, results);
            });

        },
        function(previous_query_data, callback) {
          sql = `UPDATE mailinglist_om
                  SET comment = :comment
                  WHERE custnumber = :custnumber`;

          params = { comment: submitted_data.comment, custnumber: custnumber };

          photoeye
            .query(sql, { transaction: t, replacements: params })
            .spread(function(results, metadata) {

              callback(null, results);
            });

        },
        function(previous_query_data, callback) {
          sql = `UPDATE orderinfo
                  SET orderid = :orderid
                  WHERE userid = :userid`;

          params = { orderid: current_order_id, userid: user_id };

          photoeye
            .query(sql, { transaction: t, replacements: params })
            .spread(function(results, metadata) {

              callback(null, results);
            });

        },
        function(previous_query_data, callback) {
          // if Photographers Showcase application
          if(data.ps_apply != 0) {

            sql = `SELECT * FROM galleryapplication WHERE id = :custnumber`;

            params = { custnumber: custnumber };

            photoeye
              .query(sql, { transaction: t, replacements: params })
              .spread(function(results, metadata) {

                callback(null, results);
              });
          }
          else
            callback(null, null);

        },
        function(previous_query_data, callback) {
          // if Photographers Showcase application
          if(data.ps_apply != 0) {

            // if no showcase application exits, create new galleryapplication record
            if(!previous_query_data || !previous_query_data.length) {
              sql = `INSERT INTO galleryapplication (id, orderid) 
                      VALUES (:custnumber, :current_order_id)`;

              params = { custnumber: custnumber, current_order_id: current_order_id };

              photoeye
                .query(sql, { transaction: t, replacements: params })
                .spread(function(results, metadata) {

                  callback(null, results);
                });
              
            }
            // if showcase application does exit, update it
            else {

              sql = `UPDATE galleryapplication
                      SET orderid = :current_order_id
                      WHERE id = :custnumber`;

              params = { custnumber: custnumber, current_order_id: current_order_id };

              photoeye
                .query(sql, { transaction: t, replacements: params })
                .spread(function(results, metadata) {

                  callback(null, results);
                });
            }
          }
          else
            callback(null, null);

        },
        function(previous_query_data, callback) {
          // if Photographers Showcase application
          if(data.ps_apply != 0) {

            sql =
              `SELECT catnum 
                FROM orderinfo 
                WHERE userid = :userid
                AND (catnum = 'ZZ201' OR catnum = 'ZZ202' OR catnum = 'ZZ203' OR catnum = 'ZZ204' OR catnum = 'ZZ205')`;

            params = { userid: user_id };

            photoeye
              .query(sql, { transaction: t, replacements: params })
              .spread(function(results, metadata) {

                // if we have Photographers Showcase items in the cart
                if(results && results.length) {

                  var catnum  = results[0].catnum;
                  var credits = 0;

                  if(catnum)
                    credits = parseInt(catnum[4]); // the last number of the catalog number (e.g. ZZ203) is the credits number

                  sql =
                    `UPDATE galleryapplication
                      SET portfoliocredits = portfoliocredits + :credits
                      WHERE orderid = :current_order_id`;

                  params = { credits: credits, current_order_id: current_order_id };

                  photoeye
                    .query(sql, { transaction: t, replacements: params })
                    .spread(function(results, metadata) {

                      callback(null, results);
                    });

                }
                else
                  callback(null, results);

              });
          }
          else
            callback(null, null);

        },
        function(previous_query_data, callback) {
          // transfer data from OrderInfo to FinalOrderInfoNewOrderForm table
          sql =
            `INSERT INTO finalorderinfoneworderform
              SELECT
                  orderinfo.autoindex,
                  orderinfo.orderid,
                  orderinfo.onlineordernum,
                  orderinfo.recordid,
                  orderinfo.userid,
                  orderinfo.binding,
                  orderinfo.numcopies,
                  orderinfo.number,
                  orderinfo.catnum,
                  orderinfo.title,
                  orderinfo.subtitle,
                  orderinfo.saleprice,
                  orderinfo.listprice,
                  orderinfo.removeitem,
                  orderinfo.dateadded,
                  orderinfo.reservationrevoked,
                  orderinfo.qtyreserved,
                  orderinfo.datecartchanged,
                  orderinfo.custnumber,
                  orderinfo.ingram,
                  orderinfo.fromwishlist,
                  orderinfo.additional_handling
                FROM orderinfo
                WHERE userid = :userid` 
                + (data.has_gift_cert ? ` AND binding = 'GiftCert'` : ``);

          params = { userid: user_id };

          photoeye
            .query(sql, { transaction: t, replacements: params })
            .spread(function(results, metadata) {

              callback(null, results);
            });

        },
        function(previous_query_data, callback) {

          // check to see if we have photograph print order
          sql =
            `SELECT * FROM orderinfo WHERE userid = :userid AND (binding = 'Photography' OR LEFT(catnum, 2) = 'PE')`;

          params = { userid: user_id };

          photoeye
            .query(sql, { transaction: t, replacements: params })
            .spread(function(results, metadata) {

              // send email to gallery for this order if we have photographs
              if(results && results.length) {
                
                email.sendMail({
                  from:    settings.email.orders,  // orders@photoeye.com
                  to:      settings.email.orders,  // orders@photoeye.com
                  cc:      settings.email.gallery, // gallery@photoeye.com
                  subject: 'Online Print Order',
                  html:    'There is an order for photograph(s) or a photo-eye Editions portfolio today. Please do a screenshot of the order and send it to the gallery. Credit card will have to be retrieved manually. Thanks!'
                });
              }

              callback(null, results);
            });
        },
        function(previous_query_data, callback) {

          // update the WishList items with the purchase info
          var i = -1; // start with -1 so we can increment it to 0 (and get the first element)

          async.whilst(
            function () {
              i++;
              return i < data.cart.length;
            },
            function (sql_callback) {

              if(data.cart[i].fromwishlist) {

                sql = `UPDATE wishlist_items
                        SET purchased = 1,
                            purchasedby = :custnumber,
                            datepurchased = GETDATE()
                        WHERE 
                          wishlistid = :wishlistid
                          AND number = :number`;

                params = {
                  wishlistid: data.cart[i].fromwishlist,
                  number: data.cart[i].number,
                  custnumber: custnumber
                };

                photoeye
                  .query(sql, { transaction: t, replacements: params })
                  .spread(function(results, metadata) {
                    
                    sql_callback(null, results);
                  });
              }
              else
                sql_callback(null, null);

            },
            function (err, all_results) {
              if(err) {
                winston.error('Error while updating stock levels');
                return callback(err, null);
              }

              callback(null, all_results);
            });
          
        },
        function(previous_query_data, callback) {

          // update ODR_Date the last date ordered in the OrderInfo table
          sql =
            `UPDATE mailinglist_om
              SET odr_date = GETDATE()
              WHERE custnumber = :custnumber`;

          params = { custnumber: custnumber };

          photoeye
            .query(sql, { transaction: t, replacements: params })
            .spread(function(results, metadata) {

              callback(null, results);
            });

        },
        function(previous_query_data, callback) {

          // Giftcert functionality OrderFormCommitFinalOrderNew.cfm line: 700
          // if Gift Certificate, set purchase date then delete it from cart
          if(data.has_gift_cert) {

            callback(null, null);
          }
          // else empty shopping cart
          else {

            sql = `DELETE FROM orderinfo WHERE userid = :userid`;

            params = { userid: user_id };

            photoeye
              .query(sql, { transaction: t, replacements: params })
              .spread(function(results, metadata) {

                callback(null, results);
              });
          }

        }
      ],
      function(err, results) {
        if(err) {
          winston.error(err);
          return reject(err);
        }

        resolve(results);
      });

    });

  })
  .then(function (result) {
    // Transaction has been committed

    // Payment received email
    function paymentReceived() {
      email.sendMail({
        from:    settings.email.info,      // info@photoeye.com
        to:      data.user.email,          // this is the user primary email
        cc:      settings.email.webmaster, // webmaster@photoeye.com
        subject: 'Your Project/Portfolio Application payment has been received',
        html:    `Your Project/Portfolio Application payment has been received. Please click on the following link to continue with the Application/Submission process.<br>
                  <br>
                  <a href="http://www.photoeye.com/submit.cfm?id=` + current_order_id + `">http://www.photoeye.com/submit.cfm?id=` + current_order_id + `</a><br>
                  <br>
                  If you have any questions, please reply to this email and we would be happy to assist you. You may also call us at 505-988-5152. We look forward to viewing your work.<br>
                  <br>
                  Best Regards,<br>
                  <br>
                  The photo-eye Staff<br>
                  <br>
                  photo-eye<br>
                  376 Garcia Street, Suite A<br>
                  Santa Fe, New Mexico 87501<br>
                  <br>
                  phone: 505-988-5152<br>
                  fax: 505-988-4487<br>
                  www.photoeye.com`
      });
    }

    // Thank-you confirmation email
    function confirmationEmail() {
      email.sendMail({//
        from:    settings.email.orders, // orders@photoeye.com
        to:      data.user.email,       // this is the user primary email
        subject: 'photo-eye Web Order #' + data.online_order_num,
        html:    data.user.firstname + ` ` + data.user.lastname + `, we have received your order placed on ` + moment(new Date()).format('MMMM Do, YYYY') + `
                  <br>
                  Your web confirmation number is ` + data.online_order_num + `.<br>
                  <br>
                  Please note all in stock items will be shipped at this time. This order will be processed within the next business day, at which time you will receive an itemized confirmation by email. All in stock items will be shipped at that time.<br>
                  <br>
                  Backordered items will be shipped as they arrive unless you indicated "hold for all" in your order&#39;s special instructions.<br>
                  <br>
                  If you have any questions, please contact orders@photoeye.com or call 505-988-5152 x201, 10am-5:30pm Monday through Saturday, Mountain Time.<br>
                  <br>
                  Thanks so much for your order! We appreciate it!<br>
                  <br>
                  <br>
                  photo-eye<br>
                  <a href="http://www.photoeye.com">http://www.photoeye.com</a>`
      });
    }

    // send the appropriate email
    if (data.has_gift_cert) {

      // see file ThankYouOrderConfirmationEmailGift.cfm on how to send the emails
      if(data.send_by_email) {

      }
    }
    else if(data.ps_apply == 1) {

      paymentReceived();
    }
    else if(data.ps_apply == 2) {

      confirmationEmail();
      paymentReceived();
    }
    else {
      
      confirmationEmail();
    }

    callback(result);
  })
  .catch(function (err) {
    // Transaction has been rolled back
    winston.error(err);
    callback(err);
  });
}


// ==========================================
// Wish List models
// ==========================================

// Adds item to the user's wish list
function addToWishList (user_id, custnumber, catalog_number, callback) {

  // if we don't have catalog number don't add anything just return empty data
  if(!catalog_number)
    return callback();

  photoeye.transaction(function (t) {

    var sql, params, wish_list_id;

    // we return promise because sequelize transactions work that way
    return new Promise(function (resolve, reject) {

      // execute the SQL queries in this order
      async.waterfall([
        // check to see if there's already wish list for this user
        function(callback) {
          sql =
            `SELECT wishlistid 
              FROM wishlist
              WHERE custnum = :custnum AND active = 1`;

          params = { custnum: custnumber };

          photoeye
            .query(sql, { transaction: t, replacements: params })
            .spread(function(results, metadata) {
              if(results[0])
                wish_list_id = results[0].wishlistid; // this is the wish list id

              callback(null, results);
            });
        },
        function(previous_query_data, callback) {
          // if we don't have wish list id we insert new one
          if(!wish_list_id) {
            sql =
              `INSERT INTO wishlist
                  (
                    userid,
                    custnum,
                    title,
                    datecreated,
                    private,
                    active
                  )
                VALUES
                  (
                    :userid,
                    :custnum,
                    null,
                    GETDATE(),
                    1,
                    1
                  )`;

            params = { userid: user_id, custnum: custnumber };

            photoeye
              .query(sql, { transaction: t, replacements: params })
              .spread(function(results, metadata) {

                callback(null, results);
              });
          }
          else
            callback(null, null);
        },
        // now get the latest wish list id for this user
        function(previous_query_data, callback) {
          sql =
            `SELECT wishlistid 
              FROM wishlist
              WHERE custnum = :custnum AND active = 1`;

          params = { custnum: custnumber };

          photoeye
            .query(sql, { transaction: t, replacements: params })
            .spread(function(results, metadata) {
              wish_list_id = results[0].wishlistid; // this is the wish list id

              callback(null, results);
            });
        },
        // update the wish list for this user with the latest user id number
        function(previous_query_data, callback) {
          sql =
            `UPDATE wishlist
              SET userid = :userid
              WHERE wishlistid = :wishlistid AND active = 1`;

          params = { userid: user_id, wishlistid: wish_list_id };

          photoeye
            .query(sql, { transaction: t, replacements: params })
            .spread(function(results, metadata) {

              callback(null, results);
            });
        },
        // check to see if the item is in the wish list
        function(previous_query_data, callback) {
          sql =
            `SELECT COUNT(*) already_in_wish_list
              FROM wishlist_items
              WHERE wishlistid = :wishlistid AND number = :number`;

          params = { wishlistid: wish_list_id, number: catalog_number };

          photoeye
            .query(sql, { transaction: t, replacements: params })
            .spread(function(results, metadata) {

              callback(null, results);
            });
        },
        // if th item is in the wish list items then mark it as active else insert it
        function(previous_query_data, callback) {
          if(previous_query_data[0].already_in_wish_list) {
            sql =
              `UPDATE wishlist_items
                SET active = 1
                WHERE wishlistid = :wishlistid AND number = :number`;

            params = { wishlistid: wish_list_id, number: catalog_number };

            photoeye
              .query(sql, { transaction: t, replacements: params })
              .spread(function(results, metadata) {

                callback(null, results);
              });
          }
          else {
            sql =
              `INSERT INTO wishlist_items
                (
                  wishlistid,
                  number,
                  purchased,
                  purchasedby,
                  datepurchased,
                  dateadded,
                  active
                )
                VALUES
                (
                  :wishlistid,
                  :number,
                  0,
                  null,
                  null,
                  GETDATE(),
                  1
                )`;

            params = { wishlistid: wish_list_id, number: catalog_number };

            photoeye
              .query(sql, { transaction: t, replacements: params })
              .spread(function(results, metadata) {

                callback(null, results);
              });
          }
        }
      ],
      function(err, results) {
        if(err) {
          winston.error(err);
          return reject(err);
        }

        resolve(results);
      });

    });

  })
  .then(function (results) {
    // Transaction has been committed

    callback(results);
  })
  .catch(function (err) {
    // Transaction has been rolled back
    winston.error(err);
    callback(err);
  });
}

// Gets the wish list info with its items
function getWishList (user_id, custnumber, specific_custnumber, callback) {

  var sql =
    `SELECT
        wishlistid,
        userid,
        custnum,
        title,
        datecreated,
        private,
        active
      FROM wishlist
      WHERE custnum = :custnum AND active = 1`;

  var params = { custnum: specific_custnumber || custnumber };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {

      var wish_list_info, wish_list_id;
      if(results[0]) {
        wish_list_info = results[0];
        wish_list_id   = results[0].wishlistid; // this is the wish list id
      }

      // get the wish list items for displaying
      if(wish_list_id) {
        sql =
          `SELECT * 
            FROM
            (
              SELECT

                inventory.recordid,
                LTRIM(RTRIM(inventory.catalog)) AS catalog, 
                LTRIM(RTRIM(inventory.subjectx)) AS subjectx, 
                LTRIM(RTRIM(inventory.publisherx)) AS publisherx, 
                LTRIM(RTRIM(inventory.title2x)) AS title2x, 
                inventory.abstractx, 
                inventory.ocrx, 
                inventory.hardbound, 
                LTRIM(RTRIM(inventory.hard_isbn)) AS hard_isbn, 
                LTRIM(RTRIM(inventory.soft_isbn)) AS soft_isbn, 
                inventory.hard_price, 
                inventory.cityx, 
                inventory.country, 
                inventory.language, 
                inventory.datepub, 
                inventory.pages, 
                inventory.illustrat, 
                inventory.sizex, 
                LTRIM(RTRIM(inventory.authorsx)) AS authorsx, 
                inventory.ltd_editio,
                inventory.bestbooks,
                inventory.use_pe_image_only,
                inventory.soft_nyp,
                inventory.hard_nyp,

                LTRIM(RTRIM(stock.number)) AS number,
                LTRIM(RTRIM(stock.number_root)) AS number_root,
                LTRIM(RTRIM(stock.number_binding)) AS number_binding,
                stock.price1,
                stock.price1 AS listprice,
                stock.units,
                stock.qtyreserved,
                CASE WHEN (stock.units - stock.qtyreserved) > 0 THEN 1 ELSE 0 END AS in_stock,
                stock.saleprice,
                stock.discont,
                stock.additional_handling,
                stock.unitweight,
                stock.stockwidth,
                stock.stockheight,
                stock.stocklength,
                stock.stockisbn,
                stock.invrecordid,
                stock.ingram,

                wishlist_items.itemid,
                wishlist_items.wishlistid,
                wishlist_items.purchased,
                wishlist_items.purchasedby,
                wishlist_items.datepurchased,
                wishlist_items.dateadded,
                wishlist_items.active,

                ROW_NUMBER() OVER(PARTITION BY inventory.catalog ORDER BY recordid DESC) row_num

              FROM wishlist_items
              LEFT JOIN stock ON stock.number = wishlist_items.number
              LEFT JOIN inventory ON inventory.catalog = stock.number_root
              
              WHERE
                wishlistid = :wishlistid
                AND wishlist_items.active = 1
            ) unique_inventory

            WHERE unique_inventory.row_num = 1`;

        params = { wishlistid: wish_list_id };

        photoeye
          .query(sql, { replacements: params })
          .spread(function(results, metadata) {

            // get all wish lists aggregated with the wish list buddies
            getWishLists(user_id, custnumber, function (wish_lists) {

              misc.normalizeInventoryData(results);
              callback({ info: wish_list_info, items: results, lists: wish_lists, custnumber: parseInt(specific_custnumber || custnumber) });
            });

          });
      }
      // we don't have any wish list items
      else
        callback(null);
    });
}

// Removes item from the user's wish list
function removeFromWishList (user_id, custnumber, catalog_number, callback) {

  var sql =
    `SELECT wishlistid 
      FROM wishlist
      WHERE custnum = :custnum AND active = 1`;

  var params = { custnum: custnumber };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {

      var wish_list_id;
      if(results[0])
        wish_list_id = results[0].wishlistid; // this is the wish list id

      // get the wish list items for displaying
      if(wish_list_id) {
        sql =
          `UPDATE wishlist_items
              SET active = 0
            WHERE wishlistid = :wishlistid
              AND number = :number`;

        params = { wishlistid: wish_list_id, number: catalog_number };

        photoeye
          .query(sql, { replacements: params })
          .spread(function(results, metadata) {

            callback(results);
          });
      }
      // we don't have any wish list items
      else
        callback(null);
    });
}

// Gets all wish lists for the user
function getWishLists (user_id, custnumber, callback) {

  var sql =
    `SELECT * FROM
      (
        SELECT 
            0 AS buddy,
            mailinglist_om.firstname, 
            mailinglist_om.lastname, 
            mailinglist_om.email,
            mailinglist_om.custnumber AS custnumber,
            (SELECT COUNT(*) 
              FROM wishlist
                INNER JOIN wishlist_items ON wishlist.wishlistid = wishlist_items.wishlistid 
                WHERE wishlist.custnum = mailinglist_om.custnumber AND wishlist_items.active = 1) AS total
          FROM wishlist
            INNER JOIN mailinglist_om ON wishlist.custnum = mailinglist_om.custnumber
          WHERE mailinglist_om.custnumber = :custnumber
        UNION
        SELECT 
            1 as buddy, 
            mailinglist_om.firstname, 
            mailinglist_om.lastname, 
            mailinglist_om.email,
            mailinglist_om.custnumber AS custnumber,
            (SELECT COUNT(*)
              FROM wishlist 
                INNER JOIN wishlist_items ON wishlist.wishlistid = wishlist_items.WishlistID
                WHERE wishlist.custnum = mailinglist_om.custnumber AND wishlist_items.active = 1) AS total
          FROM wishlist_buddies
            INNER JOIN mailinglist_om ON wishlist_buddies.buddycustnumber = mailinglist_om.custnumber
            INNER JOIN wishlist ON wishlist_buddies.buddycustnumber = wishlist.custnum
          WHERE wishlist_buddies.wishlistid IN (SELECT wishlistid
                                                  FROM wishlist
                                                  WHERE custnum = :custnumber)
                AND mailinglist_om.custnumber <> :custnumber
                AND wishlist.private = 0

      ) wish_lists ORDER BY wish_lists.buddy, wish_lists.lastname`;

  var params = { custnumber: custnumber };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {

      callback(results);
    });
}

// Saves new buddy wish list if email has public wish list associated, and returns its content
function findWishList (user_id, custnumber, email, callback) {
  var sql, params, wish_list_id, buddy_custnumber;

  photoeye.transaction(function (t) {

    return new Promise(function (resolve, reject) {

      async.waterfall([
        // check to see if there's already wish list for this user
        function(callback) {
          sql =
            `SELECT wishlistid 
              FROM wishlist
              WHERE custnum = :custnum AND active = 1`;

          params = { custnum: custnumber };

          photoeye
            .query(sql, { transaction: t, replacements: params })
            .spread(function(results, metadata) {
              if(results[0])
                wish_list_id = results[0].wishlistid; // this is the wish list id

              callback(null, results);
            });
        },
        function(previous_query_data, callback) {
          // if we don't have wish list id we insert new one
          if(!wish_list_id) {
            sql =
              `INSERT INTO wishlist
                  (
                    userid,
                    custnum,
                    title,
                    datecreated,
                    private,
                    active
                  )
                VALUES
                  (
                    :userid,
                    :custnum,
                    null,
                    GETDATE(),
                    1,
                    1
                  )`;

            params = { userid: user_id, custnum: custnumber };

            photoeye
              .query(sql, { transaction: t, replacements: params })
              .spread(function(results, metadata) {

                callback(null, results);
              });
          }
          else
            callback(null, null);
        },
        // now get the latest wish list id for this user
        function(previous_query_data, callback) {
          sql =
            `SELECT wishlistid 
              FROM wishlist
              WHERE custnum = :custnum AND active = 1`;

          params = { custnum: custnumber };

          photoeye
            .query(sql, { transaction: t, replacements: params })
            .spread(function(results, metadata) {
              wish_list_id = results[0].wishlistid; // this is the wish list id

              callback(null, results);
            });
        },
        // now get the wish list info for the searched email
        function(previous_query_data, callback) {
          sql =
            `SELECT 
                firstname, 
                lastname, 
                email, 
                custnumber,
                wishlistid
              FROM mailinglist_om INNER JOIN wishlist ON mailinglist_om.custnumber = wishlist.custnum
              WHERE 
                email = :email 
                AND wishlist.active = 1 
                AND wishlist.private = 0`;

          params = { email: email };

          photoeye
            .query(sql, { transaction: t, replacements: params })
            .spread(function(results, metadata) {
              if(results[0])
                buddy_custnumber = results[0].custnumber;

              callback(null, buddy_custnumber);
            });
        },
        // now check to see if the user is already in the wish list buddies list
        function(previous_query_data, callback) {

          if(buddy_custnumber) {

            sql =
              `SELECT
                  wishlistbuddyid,
                  wishlistid,
                  buddycustnumber
                FROM wishlist_buddies
                WHERE 
                  wishlistid = :wishlistid
                  AND buddycustnumber = :buddycustnumber`;

            params = { wishlistid: wish_list_id, buddycustnumber: buddy_custnumber };

            photoeye
              .query(sql, { transaction: t, replacements: params })
              .spread(function(results, metadata) {

                callback(null, results[0]);
              });
          }
          // we don't have wish list for the searched email
          else
            callback(null, null);
        },
        // if the user is found and he's not in wish list buddies list, add him
        function(previous_query_data, callback) {

          if(!previous_query_data && buddy_custnumber && buddy_custnumber != custnumber) { // make sure the current user doesn't add himself as wish list buddy

             sql =
              `INSERT INTO wishlist_buddies
                (
                  wishlistid, buddycustnumber
                )
                VALUES
                (
                  :wishlistid, 
                  :buddycustnumber
                )`;

            params = { wishlistid: wish_list_id, buddycustnumber: buddy_custnumber };

            photoeye
              .query(sql, { transaction: t, replacements: params })
              .spread(function(results, metadata) {

                callback(null, results);
              });
          }
          else
            callback(null, null);
        }
      ],
      function(err, results) {
        if(err) {
          winston.error(err);
          return reject(err);
        }

        resolve(results);

      });
    });
  })
  .then(function (results) {
    // Transaction has been committed

    // now get the wish list from the buddy custnumber
    var custnum = buddy_custnumber;
    if(!buddy_custnumber)
      custnum = custnumber;

    getWishList(null, custnum, null, function(wish_list) {
      if(custnumber == custnum) // this means the entered email doesn't have public wish list
        wish_list.no_such_buddy_list = true;

      callback(wish_list);
    });

  })
  .catch(function (err) {
    // Transaction has been rolled back
    winston.error(err);
    callback(err);
  });

}

// Switches the wishlist type (public or private)
function switchWishListType (user_id, custnumber, type, callback) {

  var sql =
    `UPDATE wishlist
      SET private = :private
      WHERE custnum = :custnum AND active = 1`;

  var params = { custnum: custnumber, private: type == 'private' ? 1 : 0 };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {

      callback(results);
    });
}


// ==========================================
// Special Requests models
// ==========================================

// Saves the special request
function saveSpecialRequest(user_id, custnumber, data, callback) {

  var sql =
    `SELECT COUNT(*) has_active_request
      FROM wishlist_requests
      WHERE
        custnumber = :custnumber
        AND title = :title
        AND requestid <> :requestid
        AND active = 1`;

  var params = {
    custnumber: custnumber,
    title: data.request_title.trim(),
    requestid: data.request_id || 0
  };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {

      var has_active_request = false;
      if(results[0])
        has_active_request = results[0].has_active_request;

      if(has_active_request)
        return callback({ already_in_requests: true });

      // if we have requestid then we're editing existing request
      if(data.request_id) {

        sql =
          `UPDATE wishlist_requests
            SET
              title            = :title,
              cl_title         = :cl_title,
              subtitle         = :subtitle,
              cl_subtitle      = :cl_subtitle,
              photographer     = :photographer,
              cl_photographer  = :cl_photographer,
              author           = :author,
              cl_author        = :cl_author,
              publisher        = :publisher,
              cl_publisher     = :cl_publisher,
              pubdate          = :pubdate,
              cl_pubdate       = :cl_pubdate,
              country          = :country,
              cl_country       = :cl_country,
              binding          = :binding,
              comments         = :comments,
              firsteditiononly = :firsteditiononly,
              signedonly       = :signedonly,
              oop              = :oop,
              cl_oop           = :cl_oop,
              isbn             = :isbn,
              cl_isbn          = :cl_isbn,
              datelastedited   = GETDATE()
            WHERE
              requestid = :requestid
              AND custnumber = :custnumber`;
      }
      else {

        sql =
          `INSERT INTO wishlist_requests
            (
              custnumber,
              title,
              cl_title,
              subtitle,
              cl_subtitle,
              photographer,
              cl_photographer,
              author,
              cl_author,
              publisher,
              cl_publisher,
              pubdate,
              cl_pubdate,
              country,
              cl_country,
              binding,
              comments,
              firsteditiononly,
              signedonly,
              oop,
              cl_oop,
              isbn,
              cl_isbn,
              datecreated,
              datelastedited,
              active
            )
            VALUES
            (
              :custnumber,
              :title,
              :cl_title,
              :subtitle,
              :cl_subtitle,
              :photographer,
              :cl_photographer,
              :author,
              :cl_author,
              :publisher,
              :cl_publisher,
              :pubdate,
              :cl_pubdate,
              :country,
              :cl_country,
              :binding,
              :comments,
              :firsteditiononly,
              :signedonly,
              :oop,
              :cl_oop,
              :isbn,
              :cl_isbn,
              GETDATE(),
              GETDATE(),
              1
            )`;
      }

      if (data.request_binding == '1')
        data.request_binding = 'any';
      else if (data.request_binding == '2')
        data.request_binding = 'Softbound';
      else if (data.request_binding == '3')
        data.request_binding = 'Hardbound';
      else
        data.request_binding = 'Other';

      params = {
        requestid: data.request_id,
        custnumber: custnumber,
        title: data.request_title.trim(),
        cl_title: data.request_title_cl,
        subtitle: data.request_subtitle.trim(),
        cl_subtitle: data.request_subtitle_cl,
        photographer: data.request_photographer.trim(),
        cl_photographer: data.request_photographer_cl,
        author: data.request_author.trim(),
        cl_author: data.request_author_cl,
        publisher: data.request_publisher.trim(),
        cl_publisher: data.request_publisher_cl,
        pubdate: data.request_pub_date || null,
        cl_pubdate: data.request_pub_date_cl,
        country: data.request_country,
        cl_country: data.request_country_cl,
        binding: data.request_binding,
        comments: data.request_comments.trim(),
        firsteditiononly: data.request_first_edition_only || 0,
        signedonly: data.request_signed_only || 0,
        oop: data.request_oop,
        cl_oop: data.request_oop_cl,
        isbn: data.request_isbn.trim().replace(/-|\s+/g, ''), // remove dashes and empty spaces
        cl_isbn: data.request_isbn_cl
      };

      photoeye
        .query(sql, { replacements: params })
        .spread(function(results, metadata) {

          callback({ added_new_request: true });
        });
    });
}

// Removes special request
function removeSpecialRequest(user_id, custnumber, requestid, callback) {
  var sql =
    `UPDATE wishlist_requests
      SET active = 0
      WHERE
        requestid = :requestid
        AND custnumber = :custnumber`;

  var params = {
    requestid: requestid,
    custnumber: custnumber
  };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {

      callback(results);
    });
}

// Gets the specified special request
function getSpecialRequest(user_id, custnumber, requestid, callback) {
  var sql =
    `SELECT

        requestid,
        custnumber,
        catnumber,
        title,
        cl_title,
        subtitle,
        cl_subtitle,
        photographer,
        cl_photographer,
        author,
        cl_author,
        publisher,
        cl_publisher,
        pubdate,
        cl_pubdate,
        wishlist_requests.country,
        cl_country,
        binding,
        comments,
        firsteditiononly,
        signedonly,
        oop,
        cl_oop,
        isbn,
        cl_isbn,
        datecreated,
        datelastedited,
        notified,
        datelastnotified,
        active,
        country.country as country_name

      FROM wishlist_requests
        LEFT JOIN country ON country.countrycode = wishlist_requests.country
      WHERE
        requestid = :requestid
        AND custnumber = :custnumber
        AND active = 1`;

  var params = { requestid: requestid, custnumber: custnumber };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {

      callback(results[0]);
    });
}

// Gets all special requests for the user
function getSpecialRequests(user_id, custnumber, callback) {
  var sql =
    `SELECT

        requestid,
        custnumber,
        catnumber,
        title,
        cl_title,
        subtitle,
        cl_subtitle,
        photographer,
        cl_photographer,
        author,
        cl_author,
        publisher,
        cl_publisher,
        pubdate,
        cl_pubdate,
        wishlist_requests.country,
        cl_country,
        binding,
        comments,
        firsteditiononly,
        signedonly,
        oop,
        cl_oop,
        isbn,
        cl_isbn,
        datecreated,
        datelastedited,
        notified,
        datelastnotified,
        active,
        country.country as country_name

      FROM wishlist_requests
        LEFT JOIN country ON country.countrycode = wishlist_requests.country
      WHERE custnumber = :custnumber AND active = 1`;

  var params = { custnumber: custnumber };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {

      callback(results);
    });
}

// update order info table
function updateOrderForGiftCert(user_id, x_amount, product_info, form_data, callback) {
  photoeye.transaction(function (t) {
    
    // update OrderInfo table
    var sql = `UPDATE orderinfo 
                SET listprice   = :x_amount 
                WHERE AutoIndex = :autoIndex`;

    var params = { x_amount: x_amount, autoIndex: product_info.AutoIndex };

    return photoeye
      .query(sql, { transaction: t, replacements: params })
      .then(function (order_results) {
        // update GiftCert table
        sql =
          `UPDATE giftcert
            SET
              amount      = :xamount,
              sendbyemail = :sendbyemail,
              toname      = :toname,
              fromname    = :fromname,
              message     = :message`;
        if (form_data.sendbyemail == 1) {
          sql += `toemail = :email,
                  shippingaddressid = NULL`;
        } else {
          sql += `toemail = ''`;
        }
        sql += `WHERE giftcertid = :giftcertid`;

        params = {
          xamount: x_amount,
          sendbyemail: form_data.sendbyemail,
          toname: form_data.toname,
          fromname: form_data.fromname,
          message: form_data.message,
          toemail: form_data.toemail,
          giftcertid: product_info.giftcertid
        };

        return photoeye
          .query(sql, { transaction: t, replacements: params });

      });

  })
  .then(function (results) {
    // Transaction has been committed

  })
  .catch(function (err) {
    // Transaction has been rolled back
    winston.error(err);
    callback(err);
  });

}

function addOrderForGiftCert(user_id, x_amount, form_data, callback) {
  photoeye.transaction(function (t) {
    
    // enter info into the OrderInfo table
    var sql = `SET NOCOUNT ON
               INSERT INTO orderinfo
               (
                  userid, 
                  binding, 
                  numcopies, 
                  listprice, 
                  title
                )
                VALUES
                (
                  :useridnumber,
                  'GiftCert',
                  1,
                  :xamount,
                  'Gift Certificate'
                )
                SELECT autoindex = @@identity
                SET NOCOUNT OFF`;
    var params = { useridnumber: user_id,  xamount: x_amount };

    return photoeye
      .query(sql, { transaction: t, replacements: params })
      .then(function (results) {
        console.log(results[0][0]);
        var autoindex = results[0][0].autoindex;
        return new Promise(function (resolve, reject) {
        // enter information into GiftCert table
        async.waterfall(
          [
            function(callback) {
              var sql = `SELECT TOP 1 giftcertid
                          FROM giftcert
                          ORDER BY giftcertid DESC
                          `;
                photoeye
                  .query(sql, { transaction: t })
                  .spread(function(results, metadata) {
                    console.log(results[0].giftcertid);
                    var xgiftcertid;
                    if(results[0])
                      xgiftcertid = results[0].giftcertid + 1;
                    else
                      xgiftcertid = 1
                    callback(null, autoindex, xgiftcertid);
                  });
		                     
            },
            function(autoindex, xgiftcertid, callback){
              console.log("============", autoindex, xgiftcertid, form_data);
              var sql = `INSERT INTO GiftCert
                        (
                          GiftCertID, 
                          OrderInfoAutoID, 
                          Amount, 
                          SendByEmail, 
                          ToName, 
                          FromName, 
                          Message, 
                          ToEmail
                        )
                        VALUES
                        (
                          :xgiftcertid, 
                          :orderinfoautoid, 
                          :amount, 
                          :sendbyemail, 
                          :toname, 
                          :fromname, 
                          :message, 
                          :toemail
                        )`;
              // var params = {
              //   xgiftcertid:      xgiftcertid,
              //   orderinfoautoid:  autoindex,
              //   amount:           x_amount,
              //   sendbyemail:      form_data.send_by_email,
              //   toname:           form_data.to_name,
              //   fromname:         form_data.from_name,
              //   message:          form_data.message,
              //   toemail:          form_data.to_email
              // };
              var params = {
                xgiftcertid:      xgiftcertid,
                orderinfoautoid:  autoindex,
                amount:           x_amount,
                sendbyemail:      parseInt(form_data.send_by_email),
                toname:           form_data.to_name.trim(),
                fromname:         form_data.from_name.trim(),
                message:          form_data.message.trim(),
                toemail:          form_data.to_email.trim()
              };
              photoeye
                .query(sql, { transaction: t, replacements: params })
                .then(function(results) {
                  callback(null, null);
                });

            }
          ],
          function (err, result){
            if (err) {
              winston.error(err);
              return reject(err);
            }
            resolve(result);
          });
          
        });

      });

  })
  .then(function (results) {
    // Transaction has been committed
    callback(results);

  })
  .catch(function (err) {
    // Transaction has been rolled back
    winston.error(err);
    callback(err);
  });

}

module.exports = {
  addOrder:               addOrder,
  getCart:                getCart,
  getCartCount:           getCartCount,
  updateStock:            updateStock,
  updateQuantity:         updateQuantity,
  removeItem:             removeItem,
  getShipping:            getShipping,
  getCountryShipping:     getCountryShipping,
  updateOrderCustNumber:  updateOrderCustNumber,
  generateOnlineOrderNum: generateOnlineOrderNum,
  getGiftCertificate:     getGiftCertificate,
  saveGiftCertificate:    saveGiftCertificate,
  finalizeOrder:          finalizeOrder,

  addToWishList:          addToWishList,
  getWishList:            getWishList,
  removeFromWishList:     removeFromWishList,
  switchWishListType:     switchWishListType,
  findWishList:           findWishList,

  saveSpecialRequest:     saveSpecialRequest,
  removeSpecialRequest:   removeSpecialRequest,
  getSpecialRequest:      getSpecialRequest,
  getSpecialRequests:     getSpecialRequests,
  
  updateOrderForGiftCert: updateOrderForGiftCert,
  addOrderForGiftCert:    addOrderForGiftCert
};

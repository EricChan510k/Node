// ====================================================
// Account model
// ====================================================

var photoeye = rootRequire('app/db/sequelize').photoeye;
var settings = rootRequire('config/settings');
var email    = rootRequire('app/utils/email');
var misc     = rootRequire('app/utils/misc');
var payment  = rootRequire('app/utils/payment');
var bcrypt   = require('bcrypt-nodejs');
var crypto   = require('crypto');
var async    = require('async');

// Generates one way salted password hash
function generateHash(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(), null);
};

// Checks if entered password is valid
function validatePassword(entered_password, current_password) {
  return bcrypt.compareSync(entered_password, current_password);
};

// Gets existing user by email address (email is always unique)
function getUserByEmail (email, callback) {
  var sql =
    `SELECT 
        autoid,
        custnumber,
        altnum,
        momcustnum,
        title,
        firstname,
        lastname,
        company,
        address1,
        address2,
        city,
        LTRIM(RTRIM(state)) AS state,
        zip,
        mailinglist_om.country AS country_code,
        country.country AS country_name,
        email,
        password,
        password2,
        password_nodejs,
        phone,
        extension,
        phone2,
        extension2,
        paymentmethod,
        comment,
        specialinstructions,
        norent,
        nomail,
        emailnewsletter,
        emailnewsletter2,
        plaintextversion,
        emailnewslettergallery,
        shipvia,
        oldshipvia,
        tpshipacct,
        showcase,
        hint,
        deleteaddress,
        username,
        auctionname,
        auction18,
        auctionagreement,
        auctionemail,
        reviewerclass,
        permissions,
        datechanged,
        lastnlsent,
        nlcounter,
        lastnl2sent,
        nl2counter,
        noemailnewsletter,
        noemailnewsletter_ga,
        temppasswordsent,
        logins,
        loginsfailed,
        booklistdownloads,
        booklistlastdownloaddate,
        odr_date,
        temppwd,
        visualserver,
        reencrypted,
        guide_super_admin,
        indexsuperadmin,
        sitelinklogin,
        sitelinkpassword,
        bademailid,
        exempt,
        auctionadmin
      FROM mailinglist_om LEFT JOIN country ON mailinglist_om.country = country.countrycode
      WHERE 
        email = :email`;

  var params = { email: email };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {
      callback(misc.getAddressInfo(results[0]));
    });
}

// Gets existing user by custnumber address (custnumber is always unique)
function getUserByCustnumber (custnumber, callback) {
  var sql =
    `SELECT 
        autoid,
        custnumber,
        altnum,
        momcustnum,
        title,
        firstname,
        lastname,
        company,
        address1,
        address2,
        city,
        LTRIM(RTRIM(state)) AS state,
        zip,
        mailinglist_om.country AS country_code,
        country.country AS country_name,
        email,
        password,
        password2,
        password_nodejs,
        phone,
        extension,
        phone2,
        extension2,
        paymentmethod,
        comment,
        specialinstructions,
        norent,
        nomail,
        emailnewsletter,
        emailnewsletter2,
        plaintextversion,
        emailnewslettergallery,
        shipvia,
        oldshipvia,
        tpshipacct,
        showcase,
        hint,
        deleteaddress,
        username,
        auctionname,
        auction18,
        auctionagreement,
        auctionemail,
        reviewerclass,
        permissions,
        datechanged,
        lastnlsent,
        nlcounter,
        lastnl2sent,
        nl2counter,
        noemailnewsletter,
        noemailnewsletter_ga,
        temppasswordsent,
        logins,
        loginsfailed,
        booklistdownloads,
        booklistlastdownloaddate,
        odr_date,
        temppwd,
        visualserver,
        reencrypted,
        guide_super_admin,
        indexsuperadmin,
        sitelinklogin,
        sitelinkpassword,
        bademailid,
        exempt,
        auctionadmin
      FROM mailinglist_om LEFT JOIN country ON mailinglist_om.country = country.countrycode
      WHERE 
        custnumber = :custnumber OR altnum = :custnumber`;

  var params = { custnumber: custnumber };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {
      callback(misc.getAddressInfo(results[0]));
    });
}

function getUserBySocialLogin(provider, id, callback) {
  var sql =
    `SELECT 
        autoid,
        mailinglist_om.custnumber,
        altnum,
        momcustnum,
        title,
        firstname,
        lastname,
        company,
        address1,
        address2,
        city,
        LTRIM(RTRIM(state)) AS state,
        zip,
        mailinglist_om.country AS country_code,
        country.country AS country_name,
        mailinglist_om.email,
        password,
        password2,
        password_nodejs,
        phone,
        extension,
        phone2,
        extension2,
        paymentmethod,
        comment,
        specialinstructions,
        norent,
        nomail,
        emailnewsletter,
        emailnewsletter2,
        plaintextversion,
        emailnewslettergallery,
        shipvia,
        oldshipvia,
        tpshipacct,
        showcase,
        hint,
        deleteaddress,
        username,
        auctionname,
        auction18,
        auctionagreement,
        auctionemail,
        reviewerclass,
        permissions,
        datechanged,
        lastnlsent,
        nlcounter,
        lastnl2sent,
        nl2counter,
        noemailnewsletter,
        noemailnewsletter_ga,
        temppasswordsent,
        logins,
        loginsfailed,
        booklistdownloads,
        booklistlastdownloaddate,
        odr_date,
        temppwd,
        visualserver,
        reencrypted,
        guide_super_admin,
        indexsuperadmin,
        sitelinklogin,
        sitelinkpassword,
        bademailid,
        exempt,
        auctionadmin,
        social_logins.provider AS social_logins_provider,
        social_logins.id AS social_logins_id,
        social_logins.name AS social_logins_name,
        social_logins.email AS social_logins_email
      FROM mailinglist_om 
        LEFT JOIN country ON mailinglist_om.country = country.countrycode
        LEFT JOIN social_logins ON mailinglist_om.custnumber = social_logins.custnumber
      WHERE 
        social_logins.provider = :provider
        AND social_logins.id = :id`;

  var params = { provider: provider, id: id };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {
      callback(misc.getAddressInfo(results[0]));
    });
}

function createNewSocialLoginForUser(custnumber, provider, id, name, email, callback) {
  var sql =
    `INSERT INTO social_logins
      (
        custnumber,
        provider,
        id,
        name,
        email
      )
      VALUES
      (
        :custnumber,
        :provider,
        :id,
        :name,
        :email
      )`;

  var params = {
    custnumber: custnumber,
    provider: provider,
    id: id,
    name: name,
    email: email
  };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {

      getUserByCustnumber(custnumber, function(results) {
        callback(results);
      });
    });
}

// Creates new user in photo-eye
function createNewUser(email, password, callback) {
  var hashed_password = generateHash(password);

  photoeye.transaction(function (t) {

    var sql =
      `SELECT acctid 
        FROM global_vars 
        WHERE id = 1`;

    return photoeye
      .query(sql, { transaction: t })
      .then(function (results) {
        results = results[0][0];

        sql = `INSERT INTO mailinglist_om
                (
                  custnumber,
                  altnum,
                  email,
                  password_nodejs,
                  datechanged
                )
                VALUES
                (
                  :custnumber,
                  :altnum,
                  :email,
                  :password_nodejs,
                  GETDATE()
                )`;

        var params = {
          custnumber:      results.acctid,
          altnum:          results.acctid,
          email:           email.trim(),
          password_nodejs: hashed_password
        };

        return photoeye
          .query(sql, { transaction: t, replacements: params })
          .then(function (results) {

            sql =
              `UPDATE global_vars 
                SET acctid = acctid + 1
                WHERE id = 1`;

            return photoeye
              .query(sql, { transaction: t })

          });

      });

  })
  .then(function (result) {
    // Transaction has been committed

    getUserByEmail(email, function (results) {
      callback(results);
    });
  })
  .catch(function (err) {
    // Transaction has been rolled back
    winston.error(err);
    callback(err);
  });
}

// Creates new user in photo-eye with social login
function createNewUserWithSocialLogin(provider, id, name, email, callback) {

  photoeye.transaction(function (t) {

    var sql =
      `SELECT acctid 
        FROM global_vars 
        WHERE id = 1`;

    return photoeye
      .query(sql, { transaction: t })
      .then(function (results) {
        results = results[0][0];

        sql = `INSERT INTO mailinglist_om
                (
                  custnumber,
                  altnum,
                  email,
                  datechanged
                )
                VALUES
                (
                  :custnumber,
                  :altnum,
                  :email,
                  GETDATE()
                )`;

        var custnumber = results.acctid;

        var params = {
          custnumber: custnumber,
          altnum:     custnumber,
          email:      email
        };

        return photoeye
          .query(sql, { transaction: t, replacements: params })
          .then(function (results) {

            sql =
              `UPDATE global_vars 
                SET acctid = acctid + 1
                WHERE id = 1`;

            return photoeye
              .query(sql, { transaction: t })
              .then(function (results) {

                sql =
                  `INSERT INTO social_logins
                    (
                      custnumber,
                      provider,
                      id,
                      name,
                      email
                    )
                    VALUES
                    (
                      :custnumber,
                      :provider,
                      :id,
                      :name,
                      :email
                    )`;

                params = {
                  custnumber: custnumber,
                  provider: provider,
                  id: id,
                  name: name,
                  email: email
                };

                return photoeye
                  .query(sql, { transaction: t, replacements: params })

              });

          });

      });

  })
  .then(function (result) {
    // Transaction has been committed

    getUserBySocialLogin(provider, id, function (results) {
      callback(results);
    });
  })
  .catch(function (err) {
    // Transaction has been rolled back
    winston.error(err);
    callback(err);
  });
}

// Generates and retrieves the password reset link
function getPasswordResetLink(email, callback) {

  var password_nodejs_reset = crypto.createHash('sha1').update(email + new Date() + Math.random()).digest('hex');

  var sql =
    `UPDATE mailinglist_om SET 
        password_nodejs_reset = :password_nodejs_reset 
      WHERE 
        email = :email`;

  var params = { password_nodejs_reset: password_nodejs_reset, email: email };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {

      callback(settings.host + '/account/new-password/' + password_nodejs_reset);
    });
}

// Checks if the reset password link is valid, so we can reset it
function checkResetLink(password_nodejs_reset, callback) {

var sql =
    `SELECT COUNT(*) AS has_reset FROM mailinglist_om 
      WHERE 
        password_nodejs_reset = :password_nodejs_reset`;

  var params = { password_nodejs_reset: password_nodejs_reset };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {
      callback(results[0].has_reset);
    });
}

// Updates the password when the user goes to the reset password link
function updatePassword(reset_hash, password, callback) {

  var hashed_password = generateHash(password);

  photoeye.transaction(function (t) {

    var sql =
      `UPDATE mailinglist_om SET 
          password_nodejs = :password_nodejs, 
          datechanged = GETDATE()
        WHERE 
          password_nodejs_reset = :password_nodejs_reset`;

    var params = { password_nodejs: hashed_password, password_nodejs_reset: reset_hash };

    return photoeye
      .query(sql, { transaction: t, replacements: params })
      .then(function (results) {

        sql = `UPDATE mailinglist_om SET 
                  password_nodejs_reset = NULL 
                WHERE 
                  password_nodejs_reset = :password_nodejs_reset`;

        params = { password_nodejs_reset: reset_hash };

        return photoeye
          .query(sql, { transaction: t, replacements: params });

      });

  })
  .then(function (result) {
    // Transaction has been committed

    callback('ok');
  })
  .catch(function (err) {
    // Transaction has been rolled back
    winston.error(err);
    callback(err);
  });
}

// Sends email reset password
function sendPasswordResetEmail (email_address) {
  getPasswordResetLink(email_address, function (link) {
    if(link) {
      email.sendMail({
        from: '"photo-eye" <info@photoeye.com>',
        to: email_address,
        subject: 'Password Reset Request',
        html: 'Hi,<br>You can reset your password on the following link: <a href="' + link + '">' + link + '</a>'
      });
    }
  });
}

// Updates various parts of the user account, like email, password, main address, shipping, etc.
function updateAccount (custnumber, section, data, callback) {

  var sql, params;

  switch(section) {
    case 'account':
      var hashed_password = generateHash(data.password);

      sql =
        `UPDATE mailinglist_om SET 
            email = :email, 
            password_nodejs = :password_nodejs, 
            datechanged = GETDATE() 
          WHERE 
            custnumber = :custnumber OR altnum = :custnumber`;

      params = {
        password_nodejs: hashed_password,
        email: data.email,
        custnumber: custnumber
      };

      break;

    case 'address':
      sql =
        `UPDATE mailinglist_om SET 
            firstname = :firstname,
            lastname = :lastname,
            company = :company,
            address1 = :address1,
            address2 = :address2,
            city = :city,
            state = :state,
            zip = :zip,
            country = :country,
            phone = :phone,
            phone2 = :phone2,
            datechanged = GETDATE() 
          WHERE 
            custnumber = :custnumber OR altnum = :custnumber`;

      params = {
        firstname: data.firstname,
        lastname: data.lastname,
        company: data.company,
        address1: data.address1,
        address2: data.address2,
        city: data.city,
        state: data.state,
        zip: data.zip,
        country: data.country,
        phone: data.phone,
        phone2: data.phone2,
        custnumber: custnumber
      };

      break;

    case 'payment':
      sql =
        `UPDATE mailinglist_om SET 
            paymentmethod = :paymentmethod,
            datechanged = GETDATE() 
          WHERE 
            custnumber = :custnumber OR altnum = :custnumber`;

      params = {
        paymentmethod: data.paymentmethod,
        custnumber: custnumber
      };

      if(data.cc_default)
        changeDefaultCreditCard(custnumber, data.cc_default, function() {});

      break;

    case 'shipping':
      sql =
        `UPDATE mailinglist_om SET 
            shipvia = :shipvia,
            tpshipacct = :tpshipacct,
            comment = :comment,
            datechanged = GETDATE() 
          WHERE 
            custnumber = :custnumber OR altnum = :custnumber`;

      params = {
        shipvia: data.shipvia,
        tpshipacct: data.tpshipacct,
        comment: data.comment,
        custnumber: custnumber
      };

      break;

    case 'mailings':
      sql =
        `UPDATE mailinglist_om SET 
            norent = :norent,
            emailnewsletter = :emailnewsletter,
            emailnewsletter2 = :emailnewsletter2,
            plaintextversion = :plaintextversion,
            datechanged = GETDATE() 
          WHERE 
            custnumber = :custnumber OR altnum = :custnumber`;

      params = {
        norent: data.norent || 1,
        emailnewsletter: data.emailnewsletter || 0,
        emailnewsletter2: data.emailnewsletter2 || 0,
        plaintextversion: data.plaintextversion || 0,
        custnumber: custnumber
      };

      break;

    case 'auctions':
      sql =
        `UPDATE mailinglist_om SET 
            auctionname = :auctionname,
            auction18 = :auction18,
            auctionagreement = :auctionagreement,
            datechanged = GETDATE() 
          WHERE 
            custnumber = :custnumber OR altnum = :custnumber`;

      params = {
        auctionname: data.auctionname || null,
        auction18: data.auction18 || 0,
        auctionagreement: data.auctionagreement || 0,
        custnumber: custnumber
      };

      break;        
  }

  if(sql) {
    photoeye
      .query(sql, { replacements: params })
      .spread(function(results, metadata) {

        // we have special when updating the address, we must check if the destination has changed so we can change the shipping
        if(section == 'address') {
          checkShippingMethod(custnumber, data.current_shipping, function(result) {
            callback(result);
          }); 
        }
        else
          callback(results);
      });
  }
  else {
    callback(null); // just return null at th end is we don't have update query
  }
}

// Gets address from the address book
function getAddress (custnumber, address_book_id, callback) {
  var sql =
    `SELECT 
        autoid,
        custnumber,
        altnum,
        belongsto,
        defaultaddress_b,
        defaultaddress_s,
        defaultaddress_m,
        firstname,
        lastname,
        company,
        address1,
        address2,
        city,
        LTRIM(RTRIM(state)) AS state,
        zip,
        addressbook.country AS country_code,
        country.country AS country_name,
        email,
        phone,
        phone2,
        datechanged,
        deleteaddress
      FROM addressbook INNER JOIN country ON addressbook.country = country.countrycode
      WHERE 
        autoid = :address_book_id
        AND belongsto = :custnumber`;

  var params = { address_book_id: address_book_id, custnumber: custnumber };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {
      callback(misc.getAddressInfo(results[0]));
    });
}

// inserts new address in the address book
function saveAddress (custnumber, data, callback) {

  photoeye.transaction(function (t) {

    var sql =
      `SELECT acctid 
        FROM global_vars 
        WHERE id = 1`;

    return photoeye
      .query(sql, { transaction: t })
      .then(function (results) {
        results = results[0][0];

        sql =
          `INSERT INTO addressbook
            (
              custnumber,
              altnum,
              belongsto,
              defaultaddress_b,
              defaultaddress_s,
              defaultaddress_m,
              firstname,
              lastname,
              company,
              address1,
              address2,
              city,
              state,
              zip,
              country,
              email,
              phone,
              phone2,
              datechanged
            )
            VALUES
            (
              :custnumber,
              :altnum,
              :belongsto,
              :defaultaddress_b,
              :defaultaddress_s,
              :defaultaddress_m,
              :firstname,
              :lastname,
              :company,
              :address1,
              :address2,
              :city,
              :state,
              :zip,
              :country,
              :email,
              :phone,
              :phone2,
              GETDATE()
            )`;

        var params = {
          custnumber: results.acctid,
          altnum: results.acctid,
          belongsto: custnumber,
          defaultaddress_b: data.defaultaddress_b || 0,
          defaultaddress_s: data.defaultaddress_s || 0,
          defaultaddress_m: data.defaultaddress_m || 0,
          firstname: data.firstname,
          lastname: data.lastname,
          company: data.company,
          address1: data.address1,
          address2: data.address2,
          city: data.city,
          state: data.state,
          zip: data.zip,
          country: data.country,
          email: data.email,
          phone: data.phone,
          phone2: data.phone2
        };

        return photoeye
          .query(sql, { transaction: t, replacements: params })
          .then(function (results) {

            sql =
              `UPDATE global_vars 
                SET acctid = acctid + 1
                WHERE id = 1`;

            return photoeye
              .query(sql, { transaction: t })

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

// Updates existing address in the address book
function updateAddress (custnumber, address_book_id, data, callback) {
  var sql =
    `UPDATE addressbook SET 
        firstname = :firstname,
        lastname = :lastname,
        company = :company,
        address1 = :address1,
        address2 = :address2,
        city = :city,
        state = :state,
        zip = :zip,
        country = :country,
        phone = :phone,
        phone2 = :phone2,
        datechanged = GETDATE() 
      WHERE 
        autoid = :autoid
        AND belongsto = :custnumber`;

  var params = {
    firstname: data.firstname,
    lastname: data.lastname,
    company: data.company,
    address1: data.address1,
    address2: data.address2,
    city: data.city,
    state: data.state,
    zip: data.zip,
    country: data.country,
    phone: data.phone,
    phone2: data.phone2,
    autoid: address_book_id,
    custnumber: custnumber
  };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {

      checkShippingMethod(custnumber, data.current_shipping, function(result) {
        callback(result);
      });
    });
}

// Gets all addresses for one user
function getAllAddresses (custnumber, callback) {
  var sql =
    `(SELECT 
        0 AS autoid,
        custnumber,
        altnum,
        :custnumber AS belongsto,
        1 AS defaultaddress_b,
        1 AS defaultaddress_s,
        1 AS defaultaddress_m,
        firstname,
        lastname,
        company,
        address1,
        address2,
        city,
        LTRIM(RTRIM(state)) AS state,
        zip,
        mailinglist_om.country AS country_code,
        country.country AS country_name,
        email,
        phone,
        phone2,
        norent
      FROM mailinglist_om INNER JOIN country ON mailinglist_om.country = country.countrycode
        WHERE 
          custnumber = :custnumber OR altnum = :custnumber)

      UNION

      (SELECT 
        autoid,
        custnumber,
        altnum,
        belongsto,
        defaultaddress_b,
        defaultaddress_s,
        defaultaddress_m,
        firstname,
        lastname,
        company,
        address1,
        address2,
        city,
        LTRIM(RTRIM(state)) AS state,
        zip,
        addressbook.country AS country_code,
        country.country AS country_name,
        email,
        phone,
        phone2,
        0 AS norent
      FROM addressbook INNER JOIN country ON addressbook.country = country.countrycode
        WHERE 
          belongsto = :custnumber)`;

  var params = { custnumber: custnumber };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {
      callback(misc.getAddressesInfo(results));
    });
}

// Gets the default billing and shipping addresses
function getBillingAndShippingAddress (custnumber, callback) {
  getAllAddresses(custnumber, function (results) {
    if(results && results.length) {

      var billing_address = results.filter(function (item) {
        return item.defaultaddress_b;
      })[0];

      var shipping_address = results.filter(function (item) {
        return item.defaultaddress_s;
      })[0];

      return callback({
        billing_address:  billing_address,
        shipping_address: shipping_address
      });
    }

    callback(null);
  });
}

// Updates the default billing address
function updateBillingAddress (custnumber, address_book_id, callback) {
  photoeye.transaction(function (t) {

    if(address_book_id == 'main')
      address_book_id = 0;

    var sql =
      `UPDATE addressbook SET 
          defaultaddress_b = 0
        WHERE
          belongsto = :custnumber`;

    var params = { custnumber: custnumber };

    return photoeye
      .query(sql, { transaction: t, replacements: params })
      .then(function (results) {

        sql =
          `UPDATE addressbook SET 
              defaultaddress_b = 1
            WHERE
              autoid = :address_book_id
              AND belongsto = :custnumber`;

        params = {
          address_book_id: address_book_id,
          custnumber: custnumber
        };

        return photoeye
          .query(sql, { transaction: t, replacements: params });

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

// Updates the default shipping address
function updateShippingAddress (custnumber, current_shipping, address_book_id, callback) {
  photoeye.transaction(function (t) {

    if(address_book_id == 'main')
      address_book_id = 0;

    var sql =
      `UPDATE addressbook SET 
          defaultaddress_s = 0
        WHERE
          belongsto = :custnumber`;

    var params = { custnumber: custnumber };

    return photoeye
      .query(sql, { transaction: t, replacements: params })
      .then(function (results) {

        sql =
          `UPDATE addressbook SET 
              defaultaddress_s = 1
            WHERE
              autoid = :address_book_id
              AND belongsto = :custnumber`;

        params = {
          address_book_id: address_book_id,
          custnumber: custnumber
        };

        return photoeye
          .query(sql, { transaction: t, replacements: params });

      });

  })
  .then(function (result) {
    // Transaction has been committed

    checkShippingMethod(custnumber, current_shipping, function(result) {
      callback(result);
    });
  })
  .catch(function (err) {
    // Transaction has been rolled back
    winston.error(err);
    callback(err);
  });
}

// Checks if the auction name already exist
function checkAuctionName (email, auction_name, callback) {
  var sql =
    `SELECT COUNT(*) AS auction_name_exist
      FROM mailinglist_om
      WHERE 
        auctionname = :auctionname
        AND email <> :email`;

  var params = { auctionname: auction_name, email: email };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {
      callback(results[0].auction_name_exist);
    });
}

// Gets the shipping methods based on the shipping country
function getShippingMethods (custnumber, callback) {
  getBillingAndShippingAddress(custnumber, function (results) {

    var foreign;
    if(results && results.shipping_address && results.shipping_address.country_code == '001')
      foreign = 0;
    else
      foreign = 1;

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

  });
}

// check if the shipping destination country is changed, if it is remove the current shipping in the user account
function checkShippingMethod (custnumber, current_shipping, callback) {
  getBillingAndShippingAddress(custnumber, function (results) {

    var foreign;
    if(results && results.shipping_address && results.shipping_address.country_code == '001')
      foreign = 0;
    else
      foreign = 1;

    var sql =
      `SELECT COUNT(*) same_shipping_destination
        FROM shippingmethods
        WHERE 
          xforeign = :foreign
          AND momcode = :momcode`;

    var params = { foreign: foreign, momcode: current_shipping };

    photoeye
      .query(sql, { replacements: params })
      .spread(function(results, metadata) {

        // if the shipping destination is changed we remove the shipping method in the user account
        if(!results[0].same_shipping_destination) {
          sql =
            `UPDATE mailinglist_om SET 
                shipvia = NULL, 
                datechanged = GETDATE() 
              WHERE 
                custnumber = :custnumber OR altnum = :custnumber`;

          params = { custnumber: custnumber };

          photoeye
            .query(sql, { replacements: params })
            .spread(function(results, metadata) {
              callback(true);  // the shipping destination is changed so we return 'true'
            });
        }
        else
          callback(false); // the shipping destination is not changed so we return 'false'
                
      });

  });
}

// Get the specified credit card data stored in database and Authorize.net
function getCreditCard(custnumber, id, callback) {
  var sql =
    `SELECT 
        autoid,
        tableid,
        custnumber,
        carddefault,
        cardtype,
        cardnum,
        exp,
        cardholder,
        cc_cid,
        LTRIM(RTRIM(custtoken)) AS custtoken,
        LTRIM(RTRIM(paytoken)) AS paytoken,
        cc_last_four
      FROM creditcardsadditional
      WHERE 
        custnumber = :custnumber
        AND autoid = :autoid
        AND deleted IS NULL`;

  var params = {
    custnumber: custnumber,
    autoid: id
  };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {
      callback(misc.getCreditCardInfo(results)[0]);
    });
}

// Get default credit card
function getDefaultCreditCard(custnumber, callback) {
  var sql =
    `SELECT 
        autoid,
        tableid,
        custnumber,
        carddefault,
        cardtype,
        cardnum,
        exp,
        cardholder,
        cc_cid,
        LTRIM(RTRIM(custtoken)) AS custtoken,
        LTRIM(RTRIM(paytoken)) AS paytoken,
        cc_last_four
      FROM creditcardsadditional
      WHERE 
        custnumber = :custnumber
        AND carddefault = 1
        AND deleted IS NULL`;

  var params = {
    custnumber: custnumber
  };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {
      callback(misc.getCreditCardInfo(results)[0]);
    });
}

// Get all credit card data stored in database and Authorize.net
function getCreditCards(custnumber, deleted, callback) {
  var sql =
    `SELECT 
        autoid,
        tableid,
        custnumber,
        carddefault,
        cardtype,
        cardnum,
        exp,
        cardholder,
        cc_cid,
        LTRIM(RTRIM(custtoken)) AS custtoken,
        LTRIM(RTRIM(paytoken)) AS paytoken,
        cc_last_four
      FROM creditcardsadditional
      WHERE 
        custnumber = :custnumber
        AND custtoken IS NOT NULL
        AND (deleted IS NULL OR 1 = :deleted)`;

  var params = {
    custnumber: custnumber,
    deleted: deleted ? 1 : 0
  };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {
      callback(misc.getCreditCardInfo(results));
    });
}

// Added new credit cart to the database
function addCreditCardLocally(data, callback) {
  var sql =
    `INSERT INTO creditcardsadditional 
      (
        custnumber,
        carddefault,
        cardtype,
        cardnum,
        exp,
        cardholder,
        cc_cid,
        custtoken,
        paytoken,
        cc_last_four
      )
      VALUES
      (
        :custnumber,
        :carddefault,
        :cardtype,
        :cardnum,
        :exp,
        :cardholder,
        :cc_cid,
        :custtoken,
        :paytoken,
        :cc_last_four
      )`;

  var params = {
    custnumber:   data.custnumber,
    carddefault:  data.carddefault,
    cardtype:     data.cardtype,
    cardnum:      data.cardnum,
    exp:          data.exp,
    cardholder:   data.cardholder,
    cc_cid:       data.cc_cid,
    custtoken:    data.custtoken,
    paytoken:     data.paytoken,
    cc_last_four: data.cc_last_four
  };

  photoeye
    .query(sql, { replacements: params })
    .spread(function(results, metadata) {
      callback(results);
    });
}

// Adds new credit cart to Authorize.net and database
function addCreditCard(custnumber, email, data, callback) {

  getBillingAndShippingAddress(custnumber, function(addresses) {

    if(!addresses || !addresses.billing_address) {
      return callback({ error: 'Please add <a href="/account/address/main">billing address</a> before adding new credit card.' });
    }

    var payment_info = {
      user: {
        custnumber: custnumber,
        email:      addresses.billing_address.email || email
      },
      billing: {
        firstName:   addresses.billing_address.firstname,
        lastName:    addresses.billing_address.lastname,
        company:     addresses.billing_address.company,
        address:     addresses.billing_address.address1 + ' ' + addresses.billing_address.address2,
        city:        addresses.billing_address.city,
        state:       addresses.billing_address.state,
        zip:         addresses.billing_address.zip,
        country:     addresses.billing_address.country_name,
        phoneNumber: addresses.billing_address.phone,
        faxNumber:   addresses.billing_address.phone2
      },
      cc: {
        number: data.cc_number,
        exp:    '20' + data.cc_year + '-' + data.cc_month //make the expiration date as yyyy-mm (e.g. 2018-07)
      }
    };

    // check to see if the user is already saved in Authorize.net
    getCreditCards(custnumber, true /* also get the deleted one */, function(cc_data) {

      // if the user exist get his customer token and add new payment method on Authorize.net
      if(cc_data && cc_data.length) {
        payment_info.customer_profile_id = cc_data[0].custtoken; // this is Authorize.net customer token

        payment.createCustomerPaymentProfile(payment_info, function(result) {

          // check if the Authorize.net saving is successful
          if(result && result.messages && result.messages.resultCode == 'Ok' && result.messages.message && result.messages.message.code == 'I00001') {

            new_cc = {
              custnumber:   custnumber,
              carddefault:  0, // this is not the first added card so the user already have a default one
              cardtype:     data.cc_type,
              cardnum:      null,
              exp:          data.cc_month + '/' + data.cc_year,
              cardholder:   data.cc_name,
              cc_cid:       null,
              custtoken:    result.customerProfileId,
              paytoken:     result.customerPaymentProfileId,
              cc_last_four: data.cc_number.substring(data.cc_number.length - 4) // store the last 4 digits in database
            };

            addCreditCardLocally(new_cc, function(result) {
              callback(result);
            });
          }
          else
            callback(null); // return null if there's problem with storing the info at Authorize.net
        });
      }
      // else add the user and the payment in Authorize.net
      else {
        payment.createCustomerProfile(payment_info, function(result) {

          // check if the Authorize.net saving is successful
          if(result && result.messages && result.messages.resultCode == 'Ok' && result.messages.message && result.messages.message.code == 'I00001') {

            new_cc = {
              custnumber:   custnumber,
              carddefault:  1, // this is the first added card so make it a default one
              cardtype:     data.cc_type,
              cardnum:      null,
              exp:          data.cc_month + '/' + data.cc_year,
              cardholder:   data.cc_name,
              cc_cid:       null,
              custtoken:    result.customerProfileId,
              paytoken:     result.customerPaymentProfileIdList.numericString,
              cc_last_four: data.cc_number.substring(data.cc_number.length - 4) // store the last 4 digits in database
            };

            addCreditCardLocally(new_cc, function(result) {
              callback(result);
            });
          }
          else
            callback(null); // return null if there's problem with storing the info at Authorize.net
        });
      }

    });
        
  });

}

// Sets the default credit card
function changeDefaultCreditCard (custnumber, id, callback) {

  photoeye.transaction(function (t) {

    var sql =
      `UPDATE creditcardsadditional 
          SET carddefault = 0 
        WHERE custnumber = :custnumber`;

    var params = {
      custnumber: custnumber
    }

    return photoeye
      .query(sql, { transaction: t, replacements: params })
      .then(function (results) {

        sql =
          `UPDATE creditcardsadditional 
              SET carddefault = 1 
            WHERE 
              autoid = :autoid 
              AND custnumber = :custnumber`;

        params = {
          autoid: id,
          custnumber: custnumber
        };

        return photoeye
          .query(sql, { transaction: t, replacements: params });

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

// Updates existing credit cart to Authorize.net and database
function updateCreditCard(custnumber, id, data, callback) {

  photoeye.transaction(function (t) {

    var sql =
      `SELECT 
          autoid,
          tableid,
          custnumber,
          carddefault,
          cardtype,
          cardnum,
          exp,
          cardholder,
          cc_cid,
          LTRIM(RTRIM(custtoken)) AS custtoken,
          LTRIM(RTRIM(paytoken)) AS paytoken,
          cc_last_four
        FROM creditcardsadditional
        WHERE 
          custnumber = :custnumber
          AND autoid = :autoid`;

    var params = {
      custnumber: custnumber,
      autoid:     id
    };

    return photoeye
      .query(sql, { transaction: t, replacements: params })
      .then(function (cc_info) {
        cc_info = cc_info[0][0];

        var payment_info = {
          custtoken: cc_info.custtoken,
          paytoken: cc_info.paytoken,
          cc: {
            last_four: data.cc_last_four,
            exp:       '20' + data.cc_year + '-' + data.cc_month //make the expiration date as yyyy-mm (e.g. 2018-07)
          }
        };

        return new Promise(function (resolve, reject) {

          payment.updateCustomerPaymentProfile(payment_info, function(result) {

            if(result && result.messages && result.messages.resultCode == 'Ok' && result.messages.message && result.messages.message.code == 'I00001') {
              sql =
                `UPDATE creditcardsadditional SET 
                    cardtype = :cardtype,
                    exp = :exp,
                    cardholder = :cardholder
                  WHERE 
                    autoid = :autoid 
                    AND custnumber = :custnumber`;

              params = {
                cardtype:   data.cc_type,
                exp:        data.cc_month + '/' + data.cc_year,
                cardholder: data.cc_name,
                autoid:     id,
                custnumber: custnumber
              };

              photoeye
                .query(sql, { transaction: t, replacements: params })
                .spread(function(results, metadata) {
                  resolve(results);
                });
              
            }
            else
              reject(null);
          });
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

// Updates existing credit cart to Authorize.net
function updateCreditCardBillingAddress(custnumber, callback) {

  getCreditCards(custnumber, false, function (cards) {

    getBillingAndShippingAddress(custnumber, function (addresses) {

      var i = 0;

      async.whilst(
        function () { return i < cards.length; },
        function (async_callback) {

          var payment_info = {
            custtoken: cards[i].custtoken,
            paytoken: cards[i].paytoken,
            billing: {
              firstName:   addresses.billing_address.firstname,
              lastName:    addresses.billing_address.lastname,
              company:     addresses.billing_address.company,
              address:     addresses.billing_address.address1 + ' ' + addresses.billing_address.address2,
              city:        addresses.billing_address.city,
              state:       addresses.billing_address.state,
              zip:         addresses.billing_address.zip,
              country:     addresses.billing_address.country_name,
              phoneNumber: addresses.billing_address.phone,
              faxNumber:   addresses.billing_address.phone2
            },
            cc: {
              last_four: cards[i].cc_last_four
            }
          };

          payment.updateCustomerPaymentProfile(payment_info, function(result) {

            if(result && result.messages && result.messages.resultCode == 'Ok' && result.messages.message && result.messages.message.code == 'I00001') {
              async_callback(null);
            }
            else
              async_callback(null);

            i++;
          });
        },
        function (err, result) {
          callback(result);
        }
      );

    });

  });
}

// Flag one credit card as deleted and removes it from Authorize.net
function deleteCreditCard(custnumber, data, callback) {

  photoeye.transaction(function (t) {

    var sql =
      `SELECT 
          autoid,
          tableid,
          custnumber,
          carddefault,
          cardtype,
          cardnum,
          exp,
          cardholder,
          cc_cid,
          LTRIM(RTRIM(custtoken)) AS custtoken,
          LTRIM(RTRIM(paytoken)) AS paytoken,
          cc_last_four
        FROM creditcardsadditional
        WHERE 
          custnumber = :custnumber
          AND autoid = :autoid`;

    var params = {
      custnumber: custnumber,
      autoid:     data.id
    }

    return photoeye
      .query(sql, { transaction: t, replacements: params })
      .then(function (cc_info) {
        cc_info = cc_info[0][0];

        return new Promise(function (resolve, reject) {

          payment.deleteCustomerPaymentProfile(cc_info.custtoken, cc_info.paytoken, function(result) {

            if(result && result.messages && result.messages.resultCode == 'Ok' && result.messages.message && result.messages.message.code == 'I00001') {
              sql =
                `UPDATE creditcardsadditional SET 
                    carddefault = 0, 
                    deleted = 1 
                  WHERE 
                    autoid = :autoid 
                    AND custnumber = :custnumber`;

              params = {
                autoid:     data.id,
                custnumber: custnumber
              };

              photoeye
                .query(sql, { transaction: t, replacements: params })
                .spread(function(results, metadata) {
                  resolve(results);
                });
              
            }
            else
              reject(null);
          });
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

module.exports = {
  getUserByEmail:                 getUserByEmail,
  getUserByCustnumber:            getUserByCustnumber,
  createNewUser:                  createNewUser,
  validatePassword:               validatePassword,
  getPasswordResetLink:           getPasswordResetLink,
  checkResetLink:                 checkResetLink,
  updatePassword:                 updatePassword,
  updateAccount:                  updateAccount,
  sendPasswordResetEmail:         sendPasswordResetEmail,
  getAddress:                     getAddress,
  saveAddress:                    saveAddress,
  updateAddress:                  updateAddress,
  getAllAddresses:                getAllAddresses,
  updateBillingAddress:           updateBillingAddress,
  updateShippingAddress:          updateShippingAddress,
  checkAuctionName:               checkAuctionName,
  getBillingAndShippingAddress:   getBillingAndShippingAddress,
  getShippingMethods:             getShippingMethods,
  checkShippingMethod:            checkShippingMethod,
  getUserBySocialLogin:           getUserBySocialLogin,
  createNewSocialLoginForUser:    createNewSocialLoginForUser,
  createNewUserWithSocialLogin:   createNewUserWithSocialLogin,
  addCreditCard:                  addCreditCard,
  updateCreditCard:               updateCreditCard,
  deleteCreditCard:               deleteCreditCard,
  getCreditCard:                  getCreditCard,
  getDefaultCreditCard:           getDefaultCreditCard,
  getCreditCards:                 getCreditCards,
  updateCreditCardBillingAddress: updateCreditCardBillingAddress
};

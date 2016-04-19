var nodemailer    = require('nodemailer'),
    smtpTransport = require('nodemailer-smtp-transport');

var settings = rootRequire('config/settings');

var transporter = nodemailer.createTransport(smtpTransport({
  host: settings.mail.host,
  port: settings.mail.port,
  auth: {
    user: settings.mail.username,
    pass: settings.mail.password
  }
}));

module.exports = transporter;

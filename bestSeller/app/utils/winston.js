// ====================================================
// Windston logging library
// ====================================================

// winston logger library for logging  errors in file and on email
var winston = require('winston');
var Mail    = require('winston-mail').Mail;

var settings = rootRequire('config/settings');

 var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      colorize:    true,
      timestamp:   true,
      prettyPrint: true
    }),
    new (winston.transports.File)({
      level:       'error', // log only error messages in file
      timestamp:   true,
      filename:    settings.winston.file,
      maxsize:     1000000, // 1MB
      prettyPrint: true,
      json:        false
    }),
    new (Mail)({
      to:       settings.winston.mail.to,
      from:     settings.winston.mail.from,
      host:     settings.mail.host,
      port:     settings.mail.port,
      tls:      settings.mail.tls,
      username: settings.mail.username,
      password: settings.mail.password,
      subject:  'photo-eye Unhandled Exception Occured',
      level:    'error' // log only error messages on email
    })
  ],
  exceptionHandlers: [
    new (winston.transports.File)
        ({
          filename: settings.winston.file,
          maxsize:  1000000,
          json:     false
        }),
    new (Mail)({
      to:       settings.winston.mail.to,
      from:     settings.winston.mail.from,
      host:     settings.mail.host,
      port:     settings.mail.port,
      tls:      settings.mail.tls,
      username: settings.mail.username,
      password: settings.mail.password,
      subject:  'photo-eye Unhandled Exception Occured',
      level:    'error' // log only error messages on email
    })
  ],
});

// expose winston logger as global object
global.winston = logger;

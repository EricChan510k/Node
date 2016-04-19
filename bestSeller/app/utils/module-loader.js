// ====================================================
// Dynamic module loader (used for the routes)
// ====================================================

var fs          = require('fs');
var path_module = require('path');

function loadModules(path, express, app, passport) {
  var stat = fs.lstatSync(path);

  if (stat.isDirectory()) {
    console.log('Found folder:', path);
    // we have a directory: do a tree walk
    var files = fs.readdirSync(path);
    var f, l = files.length;
    for (var i = 0; i < l; i++) {
      f = path_module.join(path, files[i]);
      loadModules(f, express, app, passport);
    }
  } else {
    // we have a file: load it
    var module = path.substring(0, path.lastIndexOf('.js')).replace(/\\/i, '/');
    console.log('Loading module:', module);
    rootRequire(module)(express, app, passport);
  }
}

module.exports = loadModules;

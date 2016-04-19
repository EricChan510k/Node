// ====================================================
// Breadcrumbs manager library
// ====================================================

var url = require('url');

function breadcrumbs (req, res) {
  var breadcrumbs = {};

  if(req.session.breadcrumbs)
    breadcrumbs = req.session.breadcrumbs;

  var previous_page, previous_url;

  if(req.headers.referer) {
    previous_page = url.parse(req.headers.referer).pathname.substring(1).toLowerCase();
    previous_url  = req.headers.referer;
  }

  // var current_page, current_url;

  // if(req.url) {
  //   current_page  = url.parse(req.url).pathname.substring(1).toLowerCase();
  //   current_url   = req.url;
  // }

  var pages = ['bookstore', 'new-arrivals'];

  if(previous_page) {

    for(var i = 0; i < pages.length; i++) {
      if(previous_page.indexOf(pages[i]) != -1) {
        breadcrumbs = {};
        breadcrumbs[pages[i]] = true;
        break;
      }
    }

  }

  // if(current_page) {

  // }

  req.session.breadcrumbs = breadcrumbs;

  return breadcrumbs;

}

// expose breadcrumbs as global object
global.breadcrumbs = breadcrumbs;

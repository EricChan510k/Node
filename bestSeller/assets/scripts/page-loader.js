/*
 * Page Loader
 */

function pageLoader () {
  setTimeout(function() {
    // the page is loaded so hide the loader
    $('#page-loader').fadeOut();
  }, 250);
}

if(window.location.href.indexOf('loadall=1') == -1) {
  pageLoader();
}

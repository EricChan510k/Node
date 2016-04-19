/*
 * Bootstrap Tabs Select from Url
 */

var url = window.location.toString();
if (url.match('#')) {
  try {
    $('.nav-tabs a[href=#' + url.split('#')[1] + ']').tab('show');
    setTimeout(function() {
      window.scrollTo(0, 0);
    }, 0);
  }
  catch(err) { }
    
} 

// Change hash for page-reload
$('.nav-tabs a').on('shown.bs.tab', function (e) {
  if(history.pushState) {
    history.pushState(null, null, location.origin + location.pathname + e.target.hash);
  }
  else {
    location.hash = e.target.hash;
  }
});

/*
 * Top Menu
 */

// Open dropdowns on hover
$('header .navbar ul.nav li.dropdown').hover(function() {
  $(this).addClass('open fade-in');
}, function() {
  $(this).removeClass('open fade-in');
});

// Get top menu items
var $menu_items = $('header .navbar ul.nav li');

// Add selected class on the clicked menu item
$menu_items.click(function() {
  window.location = $(this).find('> a').attr('href');
});

// On page load highlight the appropriate menu item
try {
  $($menu_items).siblings().removeClass('selected');

  var l = window.location.toString();
  var item = l.substring(l.lastIndexOf('/') + 1, l.lastIndexOf('.'));

  $menu_items.find('a[href^="' + item + '"]').parent().addClass('selected');
}
catch (err) { }

// Open search field on mobile search click
$('#mobile-search-btn').click(function() {
  $(this).find('i.fa').toggleClass('fa-close');
  $('#mobile-search').toggleClass('search-open');
});

/*
 * Element that triggers the infinite scroll loading
 */
function isScrolledIntoView(element, offset) {
  var elemTop = element.getBoundingClientRect().top - (offset || 0);
  var elemBottom = element.getBoundingClientRect().bottom;

  // var isVisible = (elemTop >= 0) && (elemBottom <= window.innerHeight); // old code
  var isVisible = elemTop <= window.innerHeight;
  return isVisible;
}

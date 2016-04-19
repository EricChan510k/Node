/*
 * Masonry grid
 */

var $grid = $('.masonry').masonry({
  itemSelector : '.item',
  columnWidth  : '.grid-sizer',
  isInitLayout : false
});

$grid.on('layoutComplete', function() {
  
});

// init Masonry Grid
setTimeout(function() {
  $grid.masonry('layout');
}, 500);

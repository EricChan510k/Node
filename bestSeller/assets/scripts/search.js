/*
 * Search Results infinite scroll
 */

var searchSkip        = {};
var searchTake        = 10;
var searchLoaded      = {};
var searchTotal       = {};
var searchWidth       = 300;
var searchBatchSize   = 10;
var searchBatchMax    = 100;
var searchBatchLoaded = 0;

function showSearchMasonryTiles(tab) {
  if(typeof searchLoaded[tab] === 'undefined') searchLoaded[tab] = 0;
  searchLoaded[tab]++;

  if(searchLoaded[tab] == searchTotal[tab])
  {
    $(tab + ' .next-results').hide();

    var data = $($(tab + ' .hide-offset').html()).clone();
    $(tab + ' .hide-offset').empty();
    $(tab + ' .regular-grid').append(data);//.masonry('appended', data, true);

    if(searchBatchLoaded < searchBatchMax) {
      getSearchNextResults(tab);
      searchBatchLoaded += searchBatchSize;
    }
    else {
      searchBatchLoaded = 0;
    }
  }
}

function getSearchNextResults(tab) {
  var loader = $(tab + ' .next-results');

  if(loader.is(':visible')) return; // stop loading if the loader is shown

  loader.show();
  if(typeof searchSkip[tab] === 'undefined') searchSkip[tab] = 0;

  $.ajax({
    url: '/bookstore/search/results',
    data: {
      query: $('#search-query').val(),
      start: searchSkip[tab],
      rows:  searchTake,
      width: searchWidth,
      tab:   tab.substring(1)
    },
    method: 'GET',
    success: function(data, textStatus, jqXHR) {
      searchSkip[tab] += searchTake;
      
      $(tab + ' .hide-offset').append($(data));

      if(typeof searchTotal[tab] === 'undefined') searchTotal[tab] = 0;
      searchTotal[tab] += $(tab + ' .hide-offset .thumbs img').length;

      // After loading every image layout the masonry to calculate the correct position
      $(tab + ' .hide-offset img')
        .load(function() {
          showSearchMasonryTiles(tab);
        })
        .error(function() {
          showSearchMasonryTiles(tab);
        })
        .each(function() {
          var img = $(this);
            var catalog = img.data('catalog');

            if(!img.attr('src') && img.data('catalog')) {

              $.ajax({
                url: '/bookstore/load-images',
                data: {
                  catalog:   img.data('catalog'),
                  hard_isbn: img.data('hard-isbn'),
                  soft_isbn: img.data('soft-isbn'),
                  width:     searchWidth
                },
                method: 'GET',
                success: function(data, textStatus, jqXHR) {
                  if(data) {

                    // Load the main cover image
                    var use_local_image = img.data('use-local-image');
                    var main_image = data.img_s3_300 || data.img_s3_original;

                    if(!use_local_image)
                      main_image = data.img_amazon || data.img_s3_300 || data.img_s3_original;

                    if(main_image) {
                      img.show();
                      loadImage(img, main_image);
                    }
                    else {
                      img.attr({ 'src': '/images/no-preview.jpg', 'data-no-preview': true });
                    }
                  }
                }
              });
            }
        });
      
      if(data.trim().length === 0)
        loader.hide();
    },
    error: function(jqXHR, textStatus, errorThrown) {
      loader.hide();
    }
  });
}

/*
 * Search Results Tabs
 */
var search_active_tab = '#artworks';

$('.search .tab-panel a[data-toggle="tab"]').on('shown.bs.tab', function(e) {
  search_active_tab = $(e.target).attr('href');

  // load on tab activate only if there's no results
  if($(search_active_tab + ' .regular-grid .item').length === 0)
  {
    getSearchNextResults(search_active_tab);
  }
  
});

$('a[href="' + search_active_tab + '"]').tab('show');

/*
 * Search Results filter dropdowns
 */
$('.filter-dropdowns .dropdown-menu a').click(function() {
  var text  = $(this).text();
  var value = $(this).data('value');
  console.log(value);

  $(this).closest('.dropdown').find('> a .selected').html(text);
});

$(window).scroll(function() {
  var trigger = $(search_active_tab + ' .results-end').get(0);
      
  // load results if we reach the trigger element, in this case end of the results
  if(trigger && isScrolledIntoView(trigger, window.innerHeight * 5))
  {
    getSearchNextResults(search_active_tab);
  }
});

/*
 * Used for New Arrivals, Deep Discounts, Signed Books, etc. pages infinite scroll
 */

var sectionPageSkip    = 0;
var sectionPageTake    = 10;
var sectionPageLoaded  = 0;
var sectionPageTotal   = 0;
var sectionPageWidth   = 300;
var sectionBatchSize   = 10;
var sectionBatchMax    = 100;
var sectionBatchLoaded = 0;

function showSectionPageMasonryTiles() {
  sectionPageLoaded++;

  if(sectionPageLoaded == sectionPageTotal)
  {
    $('.section-page .next-results').hide();

    var data = $($('.section-page .hide-offset').html()).clone();
    $('.section-page .hide-offset').empty();
    $('.section-page .masonry').append(data).masonry('appended', data, true);

    if(sectionBatchLoaded < sectionBatchMax) {
      getSectionPageNextResults();
      sectionBatchLoaded += sectionBatchSize;
    }
    else {
      sectionBatchLoaded = 0;
    }
  }
}

function loadSectionPageImage(image) {
  var img = $(image);
  var catalog = img.data('catalog');

  if(!img.attr('src') && img.data('catalog')) {

    $.ajax({
      url: '/bookstore/load-images',
      data: {
        catalog:   img.data('catalog'),
        hard_isbn: img.data('hard-isbn'),
        soft_isbn: img.data('soft-isbn'),
        width:     sectionPageWidth
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
}

function loadSectionPageImagesInRows() {
  var data = $($('.section-page .hide-offset').html()).clone();
  $('.section-page .hide-offset').empty();
  $('.section-page .regular-grid').append(data);

  $('.section-page .regular-grid img')
    .load(function() {
      showSectionPageMasonryTiles();
    })
    .error(function() {
      showSectionPageMasonryTiles();
    })
    .each(function() {
      loadSectionPageImage(this);
    });
}

function loadSectionPageImages() {
  $('.hide-offset img')
    .load(function() {
      showSectionPageMasonryTiles();
    })
    .error(function() {
      showSectionPageMasonryTiles();
    })
    .each(function() {
      loadSectionPageImage(this);
    });
}

function getSectionPageNextResults() {
  var loader = $('.section-page .next-results');

  if(loader.is(':visible')) return; // stop loading if the loader is shown

  loader.show();

  $.ajax({
    url: '/bookstore/' + $('.section-page #page-url').val() + '/results',
    data: {
      skip:          sectionPageSkip,
      take:          sectionPageTake,
      featured_book: $('#featured-book').val()
    },
    method: 'GET',
    success: function(data, textStatus, jqXHR) {
      sectionPageSkip += sectionPageTake;
      
      $('.hide-offset').append($(data));
      $('.section-page .hide-offset img').hide(); // hide the images initially

      sectionPageTotal += $('.hide-offset .thumbs img').length;

      if(window.location.href.indexOf('new-arrivals2') > -1) {
        loadSectionPageImagesInRows();
      }
      else {
        // After loading every image layout the masonry to calculate the correct position
        loadSectionPageImages();
      }

      if(data.trim().length === 0)
        loader.hide();
    },
    error: function(jqXHR, textStatus, errorThrown) {
      loader.hide();
    }
  });
}

$(window).scroll(function() {
  var trigger = $('.section-page .results-end').get(0);
      
  // load results if we reach the trigger element, in this case end of the results
  if(trigger && isScrolledIntoView(trigger, window.innerHeight * 5))
  {
    getSectionPageNextResults();
  }
});

if($('.section-page').length) {
  loadSectionPageImage($('.featured-book .thumb img'));
  $(window).scroll();
}

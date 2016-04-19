/*
 * Publisher infinite scroll
 */

var publisherSkip        = 0;
var publisherTake        = 10;
var publisherLoaded      = 0;
var publisherTotal       = 0;
var publisherWidth       = 300;
var publisherBatchSize   = 10;
var publisherBatchMax    = 100;
var publisherBatchLoaded = 0;
var publisherMainImage   = null;
var publisherAllLoaded   = false;

function showPublisherMasonryTiles() {
  publisherLoaded++;

  if(publisherLoaded == publisherTotal)
  {
    $('.publisher .next-results').hide();

    var data = $($('.publisher .hide-offset').html()).clone();
    $('.publisher .hide-offset').empty();

    var books = $('.publisher .books');

    data.each(function(index, item) {
      item = $(item);

      // process only valid items
      if(item.text().trim()) {

        // we have forthcoming book
        if(item.data('nyp') == '1') {
          if(!$('.publisher .regular-grid#forthcoming').length)
            books.append($('<h3>Forthcoming</h3><div class="regular-grid clearfix" id="forthcoming"></div>'));

          $('.publisher .regular-grid#forthcoming').append(item);
        }
        // we have published book
        else {
          var datepub = item.data('datepub');
          if(!$('.publisher .regular-grid#' + datepub).length)
            books.append($('<h3>' + datepub + '</h3><div class="regular-grid clearfix" id="' + datepub + '"></div>'));

          $('.publisher .regular-grid#' + datepub).append(item);
        }

      }
    });

    if(publisherBatchLoaded < publisherBatchMax) {
      getPublisherNextResults();
      publisherBatchLoaded += publisherBatchSize;
    }
    else {
      publisherBatchLoaded = 0;
    }
    
  }
}

function getPublisherNextResults() {
  // stop loading next results if all are loaded
  if(publisherAllLoaded) return;

  var loader = $('.publisher .next-results');

  if(loader.is(':visible')) return; // stop loading if the loader is shown

  loader.show();

  $.ajax({
    url: '/bookstore/publisher/results',
    data: {
      pub_title: $('#publisher-title').val(),
      skip:      publisherSkip,
      take:      publisherTake,
      width:     publisherWidth
    },
    method: 'GET',
    success: function(data, textStatus, jqXHR) {
      publisherSkip += publisherTake;
      
      $('.hide-offset').append($(data));

      // if we don't have images anymore to load then all are already loaded so stop calling the AJAX
      if(!$('.hide-offset .thumbs img').length)
        publisherAllLoaded = true;

      publisherTotal += $('.hide-offset .thumbs img').length;

      // After loading every image layout the masonry to calculate the correct position
      $('.hide-offset img')
        .load(function() {
          showPublisherMasonryTiles();
        })
        .error(function() {
          showPublisherMasonryTiles();
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
                width:     publisherWidth
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

                  // we have booktease images so use the first one as a main background
                  if(data.booktease && data.booktease.length) {
                    if(!publisherMainImage)
                      publisherMainImage = data.booktease[0]; // get the first booktease image

                    $('.top-info .hidden-image')
                      .load(function() {
                        $('.top-info .main-image').css('background', 'url("' + $('.top-info .hidden-image').attr('src') + '") center center no-repeat');

                        setTimeout(function() {
                          $('.top-info .default-panel').fadeOut();
                        }, 0);
                      })
                      .attr('src', publisherMainImage);
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

$(window).scroll(function() {
  var trigger = $('.publisher .results-end').get(0);
      
  // load results if we reach the trigger element, in this case end of the results
  if(trigger && isScrolledIntoView(trigger, window.innerHeight * 5))
  {
    getPublisherNextResults();
  }
});

if($('.publisher').length) {
  $(window).scroll();

  $('.publisher-info .read-more').click(function() {
    $('.desc-info p[data-read-more]').css('max-height', 'none');
    $(this).hide();
  });
}

/*
 * Artist infinite scroll
 */

var artistSkip        = 0;
var artistTake        = 10;
var artistLoaded      = 0;
var artistTotal       = 0;
var artistWidth       = 300;
var artistBatchSize   = 10;
var artistBatchMax    = 100;
var artistBatchLoaded = 0;
var artistMainImage   = null;
var artistAllLoaded   = false;

function showArtistMasonryTiles() {
  artistLoaded++;

  if(artistLoaded == artistTotal)
  {
    $('.artist .next-results').hide();

    var data = $($('.artist .hide-offset').html()).clone();
    $('.artist .hide-offset').empty();

    var books = $('.artist .books');

    data.each(function(index, item) {
      item = $(item);

      // process only valid items
      if(item.text().trim()) {

        var datepub = item.data('datepub');

        // we have a book
        if(parseInt(datepub)) {
          $('.artist .books .regular-grid').append(item);
        }
        // we have a photograph
        else {
          $('.artist .photographs .regular-grid').append(item);
        }

      }
    });

    if(artistBatchLoaded < artistBatchMax) {
      getArtistNextResults();
      artistBatchLoaded += artistBatchSize;
    }
    else {
      artistBatchLoaded = 0;
    }
    
  }
}

function getArtistNextResults() {
  // stop loading next results if all are loaded
  if(artistAllLoaded) return;

  var loader = $('.artist .next-results');

  if(loader.is(':visible')) return; // stop loading if the loader is shown

  loader.show();

  $.ajax({
    url: '/bookstore/artist/results',
    data: {
      subject: $('#artist-full-name').val(),
      skip:    artistSkip,
      take:    artistTake,
      width:   artistWidth
    },
    method: 'GET',
    success: function(data, textStatus, jqXHR) {
      artistSkip += artistTake;
      
      $('.hide-offset').append($(data));

      // if we don't have images anymore to load then all are already loaded so stop calling the AJAX
      if(!$('.hide-offset .thumbs img').length)
        artistAllLoaded = true;

      artistTotal += $('.hide-offset .thumbs img').length;

      // After loading every image layout the masonry to calculate the correct position
      $('.hide-offset img')
        .load(function() {
          showArtistMasonryTiles();
        })
        .error(function() {
          showArtistMasonryTiles();
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
                width:     artistWidth
              },
              method: 'GET',
              success: function(data, textStatus, jqXHR) {
                if(data) {

                  console.log(data);

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
                    if(!artistMainImage)
                      artistMainImage = data.booktease[0]; // get the first booktease image

                    $('.top-info .hidden-image')
                      .load(function() {
                        $('.top-info .main-image').css('background', 'url("' + $('.top-info .hidden-image').attr('src') + '") center center no-repeat');

                        setTimeout(function() {
                          $('.top-info .default-panel').fadeOut();
                        }, 0);
                      })
                      .attr('src', artistMainImage);
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
  var trigger = $('.artist .results-end').get(0);
      
  // load results if we reach the trigger element, in this case end of the results
  if(trigger && isScrolledIntoView(trigger, window.innerHeight * 5))
  {
    getArtistNextResults();
  }
});

if($('.artist').length) {
  $(window).scroll();

  $('.artist-info .read-more').click(function() {
    $('.desc-info p[data-read-more]').css('max-height', 'none');
    $(this).hide();
  });
}

/*
 * Bookstore Slider
 */

// Init Slick slider
function initBookstoreSlider() {
  var slider = $('.slider-365-a-day .slider').slick({
    centerMode: true,
    centerPadding: '300px',
    slidesToShow: 5,
    infinite: false,
    // swipe: false,
    // draggable: false,
    responsive: [
      {
        breakpoint: 4095,
        settings: {
          slidesToShow: 5
        }
      },
      {
        breakpoint: 2881,
        settings: {
          slidesToShow: 3
        }
      },
      {
        breakpoint: 2400,
        settings: {
          slidesToShow: 3,
          centerPadding: '100px'
        }
      },
      {
        breakpoint: 2000,
        settings: {
          slidesToShow: 1,
          centerPadding: '550px'
        }
      },
      {
        breakpoint: 1700,
        settings: {
          slidesToShow: 1,
          centerPadding: '420px'
        }
      },
      {
        breakpoint: 1450,
        settings: {
          slidesToShow: 1,
          centerPadding: '350px'
        }
      },
      {
        breakpoint: 1300,
        settings: {
          slidesToShow: 1,
          centerPadding: '300px'
        }
      },
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: 1,
          centerPadding: '200px'
        }
      },
      {
        breakpoint: 991,
        settings: {
          slidesToShow: 1,
          centerPadding: '10px'
        }
      }
    ]
  });

  // On after slide change, prevent sliding to future slides
  slider.on('afterChange', function(event, slick, currentSlide) {
    if(currentSlide > $todays_slide)
    {
      setTimeout(function() {
        slider.slick('slickGoTo', $todays_slide);
      }, 0);
    }
    else {
      // remove the '.box-current' class
      $('.slider-365-a-day .slider .slick-track > .slick-slide .box-current').removeClass('box-current');

      // set the '.box-current' class for the current slide
      $slide = $('.slider-365-a-day .slider .slick-track > .slick-slide')[currentSlide];
      $($slide).find('.box').addClass('box-current');
    }
  });

  // On before slide change, prevent sliding to future slides
  slider.on('beforeChange', function(event, slick, currentSlide, nextSlide) {
    if(nextSlide < $todays_slide) {
      $('.slider-365-a-day .slider .slick-next').show();
    }
    else {
      $('.slider-365-a-day .slider .slick-next').hide();
    }
  });

  return slider;
}

function reInitBookstoreSlider() {
  var currentSlide = $slider_bookstore.slick('slickCurrentSlide');

  $slider_bookstore.slick('unslick');
  $slider_bookstore = initBookstoreSlider();

  $slider_bookstore.slick('slickGoTo', currentSlide, true);
}

var $slider_bookstore = initBookstoreSlider();

// Init to today's slide
var $todays_slide = $('.slider-365-a-day .slider .slick-track > .slick-slide:not(.future)').length - 1;
var $slide = $('.slider-365-a-day .slider .slick-track > .slick-slide')[$todays_slide];
$slider_bookstore.slick('slickGoTo', $todays_slide, true);
$($slide).find('.box').addClass('box-current');

// Initially hide the right arrow
$('.slider-365-a-day .slider .slick-next').hide();

// Handle click on the slide overlay
$('.slider-365-a-day .slider .slick-track > .slick-slide:not(.future) .box  > .disabled-overlay').click(function(e) {
  e.preventDefault();
  e.stopPropagation();
  
  var currentSlide = $slider_bookstore.slick('slickCurrentSlide');

  $slide = $(this).closest('.slick-slide').get(0);
  var $clickedIndex = $('.slider-365-a-day .slider .slick-track .slick-slide').index($slide);

  $slider_bookstore.slick('slickGoTo', $clickedIndex);
});

window.addEventListener('orientationchange', function(e) {
  setTimeout(function() {
    reInitBookstoreSlider();
  }, 2000);

  setTimeout(function() {
    reInitBookstoreSlider();
  }, 5000);
});


/*
 * Bookstore Masonry Grid
 */

function setBookstoreGridTilesHeight() {

  $('.bookstore .masonry').find('.item .item-content').height('auto');

  var max_large = Math.max.apply(Math, $('.bookstore .masonry').find('.item.bestsellers .item-content, .item.book-of-the-week .item-content').map(function() {
    return $(this).height();
  }));

  var max_small = Math.max.apply(Math, $('.bookstore .masonry').find('.item:not(.bestsellers,.book-of-the-week) .item-content').map(function() {
    return $(this).height();
  })) * 2; // double the small block height for comparing

  var max_height = max_small;

  if(window.innerWidth > 768) {
    max_height = Math.max(max_large, max_small);

    $('.bookstore .masonry').find('.item.bestsellers .item-content, .item.book-of-the-week .item-content').height(max_height + 12);
  }

  $('.bookstore .masonry').find('.item:not(.bestsellers,.book-of-the-week) .item-content').height(max_height / 2);

  $('.bookstore .masonry').one('layoutComplete', function() {
    $('.bookstore .loader').hide();
    $('.bookstore .masonry').removeClass('hide-offset');
  });

  $('.bookstore .masonry').masonry('layout');
}

var bookstoreWidth = 300;

function bookstoreImageLoaded() {
  bookstoreLoadedImages++;

  if(bookstoreLoadedImages == bookstoreTotalImages) {
    setBookstoreGridTilesHeight();
  }
}

function loadBookstoreImages() {
  $('.bookstore img')
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
            width:     bookstoreWidth
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
}

var bookstoreLoadedImages = 0;
var bookstoreTotalImages  = 0;
if($('.bookstore').length)
{
  bookstoreTotalImages = $('.bookstore .masonry .item img').length;

  $('.bookstore .masonry .item img')
    .load(function() {
      bookstoreImageLoaded();
    }).error(function() {
      bookstoreImageLoaded();
    });

  // show the bookstore sections in 5 seconds in case image loading went wrong
  setTimeout(function() {
    setBookstoreGridTilesHeight();
  }, 5000);

  $(window).resize(function() {
    setBookstoreGridTilesHeight();
  });

  loadBookstoreImages();

  $.ajax({
    url: '/bookstore/todays-bookshelf',
    method: 'GET',
    success: function(data, textStatus, jqXHR) {
      if(data) {
        data = $(data.replace(/\s+src/gi, ' data-src'));

        var books = [];

        data.each(function(index, item) {
          item = $(item);

          if (item.hasClass('TodaysBS_Tip')) {
            var cat = $(this);

            books.push({
              catalog: cat.attr('id').substring(0, 5).trim(),
              title: cat.find('h1 a').text().trim(),
              author: cat.clone().find('h1').remove().end().text().trim()
            });
          }
          
        });

        if(books.length) {
          for(var i = 0; i < books.length; i++) {
            var book =
              '<a href="/bookstore/citation/' + books[i].catalog + '">' +
                '<img data-catalog="' + books[i].catalog + '" data-hard-isbn="" data-soft-isbn="" data-use-local-image="" data-toggle="tooltip" data-placement="top" title="<h6>' + books[i].title + '</h6>' + books[i].author + '" alt="' + books[i].author + ' - ' + books[i].title + '" />' +
              '</a>';

            $('.bookshelf-list').append($(book));
          }
        }

        // Initialize Bootstrap tool-tips
        $('[data-toggle="tooltip"]').tooltip({ html: true });

        loadImages();
        loadBookstoreImages();
      }
    }
  });
}

// Bookstore book of the week how we choose
$('a#how-we-choose').click(function() {
  $('p.how-we-choose').toggle();
});

/*
 * Image Loader
 */

function loadImages () {

  $('.content img')
    .load(function() {
      var img = $(this);

      if(img.data('src') || img.data('catalog')) {
        img.fadeIn('slow');
        img.closest('.image-wrap').find('.image-loader-wrap').remove();
        img.unwrap();
      }

    })
    .error(function() {
      var img = $(this);

      if(img.data('toggle-image')) {
        img.hide();
        $('[data-toggle-image="true"]').hide();
      }
      else {
        img.attr({ 'src': '/images/no-preview.jpg', 'data-no-preview': true });
      }
    })
    .each(function() {
      var img = $(this);

      if(!img.attr('src') && (img.data('src') || img.data('catalog'))) {
        img.wrap('<div class="image-wrap"></div>');

        img.closest('.image-wrap').append($('<div class="image-loader-wrap"><div class="loader"></div></div>'));
      }

      if(!img.attr('src') && img.data('src'))
        img.attr('src', img.data('src'));
    });
}

function loadImage (img, src) {
  $(img)
    .load(function() {
      $(this).fadeIn('slow');
      $(this).closest('.image-wrap').find('.image-loader-wrap').fadeOut();

      if(window.location.href.indexOf('loadall=1') > -1) {
        pageLoader();
      }
    })
    .error(function() {
      $(this).attr({ 'src': '/images/no-preview.jpg', 'data-no-preview': true });
    })
    .each(function() {
      var img = $(this);

      if(!img.attr('src'))
        img.attr('src', src || img.data('src'));
    });
}

// call load images
loadImages();

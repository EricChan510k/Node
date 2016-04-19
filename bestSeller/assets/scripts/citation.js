/*
 * Citation Slider
 */

function initBookteaseSlider() {
  var $slider_citation      = $('.citation .slider');
  var $slider_citation_init = false;

  $('#booktease-modal').on('show.bs.modal', function (event) {
    $('#booktease-modal .modal-body').height(window.innerHeight - 150);
  });

  // Init Slick slider
  $('#booktease-modal').on('shown.bs.modal', function (event) {
    if(!$slider_citation_init) {

      $slider_citation_init = true;

      $slider_citation.show();

      $slider_citation.slick({
        slidesToShow: 1,
        autoplay: false,
        infinite: true,
        lazyLoad: 'progressive'
      });

      // set the slick slide height
      $('.slick-slide').height($('.slick-slider').height());
    }
    
  });
}

if($('.citation').length) {

  // check for selected radio buttons
  var has_selected = false;
  $('.order-form input[type="radio"]').each(function (idx, item) {
    if($(item).is(':checked'))
      has_selected = true;
  });

  // select the first radio button if none is selected
  if(!has_selected)
    $($('.order-form input[type="radio"]')[0]).prop('checked', true);

  $.ajax({
    url: '/bookstore/load-images',
    data: {
      catalog:   $('#citation-catalog').val(),
      hard_isbn: $('#citation-hard-isbn').val(),
      soft_isbn: $('#citation-soft-isbn').val(),
      width:     null // get the biggest image from Amazon
    },
    method: 'GET',
    success: function(data, textStatus, jqXHR) {
      if(data) {

        // Load the main cover image
        var use_local_image = $('#citation-use-local-image').val();
        var main_image = data.img_s3_original;

        if(use_local_image == 'false')
          main_image = data.img_amazon || data.img_s3_original;

        if(main_image) {
          $('.pub-image').show();
          loadImage($('.pub-image img'), main_image);
        }
        else {
          $('.citation .left-side').hide();
          $('.citation .right-side').css('width', '100%');
        }

        // we have booktease data
        if(data.email_image) {
          $('.book-tease').show();
          loadImage($('.book-tease img'), data.email_image);

          // set booktease images if any (use lazy load on on slick slider to speed up the page)
          if(data.booktease && data.booktease.length) {
            var booktease = '';

            for(var i = 0; i < data.booktease.length; i++) {
              booktease += '<div>' +
                              '<div class="box clearfix">' +
                                '<img data-lazy="' + data.booktease[i] + '" />' +
                              '</div>' +
                            '</div>';
            }

            $('#booktease-modal .slider').append($(booktease));
            initBookteaseSlider();
          }
        }
        else {
          // remove the click handler for the booktease modal window
          $('[data-target="#booktease-modal"]').removeAttr('data-target');
        }

      }
    }
  });

}

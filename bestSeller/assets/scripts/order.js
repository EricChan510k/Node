/*
 * Shopping Cart
 */

var confirm_order = $('.confirm-order').length;

// Accept terms
$('.cart .btn.order-bottom').click(function(e) {
  if(!$('#international-checkbox').is(':checked') && $('#country-code').val() != '001')
  {
    e.preventDefault();
    $('#international-notice').addClass('orange');
    alert('Please accept the international shipping policies by checking the box.');
  }
});

function calculateCartTotals() {
  var shipping = $('.cart #shipping-options input[type="radio"]:checked');

  var subtotal      = parseFloat($('.cart #cart-subtotal').val()).toFixed(2) || 0;
  var tax           = parseFloat($('.cart #shipping-options #tax-value').val()).toFixed(2) || 0;
  var shipping_cost = parseFloat(shipping.data('cost')) || 0;

  if(parseFloat(tax) > 0) {
    $('.cart #tax-total').html(tax);
    $('.cart #tax-info').show();
  }
  else {
    $('.cart #tax-total').html(0);
    $('.cart #tax-info').hide();
  }

  var photographs = parseFloat($('#shipping-photographs').val());

  if(photographs) {
    shipping_cost += photographs;
  }

  // If the user chose "Customer Pickup" show different shipping info
  $('#shipping-info').show();
  if(shipping.val() == 'CPU') {
    $('#shipping-info #shipping-info-text').hide();
    $('#shipping-info #customer-pickup-info').show();
    shipping_cost = 0; // set shipping to 0 because it's customer will pickup the order
  }
  else {
    $('#shipping-info #shipping-info-text').show();
    $('#shipping-info #customer-pickup-info').hide();
  }
  
  var total = parseFloat(parseFloat(subtotal) + parseFloat(tax) + shipping_cost).toFixed(2);

  $('.cart #shipping-name').html(shipping.data('name'));
  $('.cart #shipping-cost').html(parseFloat(shipping_cost).toFixed(2));
  $('.cart #final-cost').html(total);

  // set hidden input fields for the checkout process
  $('#shipping-method').val(shipping.data('name'));
  $('#shipping-mom').val(shipping.val());
  $('#shipping-price').val(shipping_cost);
  $('#tax-price').val(tax);
  $('#total-price').val(total);
}

function initializeCartButtons() {
  $('.cart table .quantity').change(function() {
    var quantity = $(this).val();
    var number   = $(this).data('number');

    getCartContent(quantity, number);
  });

  $('.cart table .add-to-wishlist').click(function() {
    var number = $(this).data('number');

    addToWishListFromCart(number);
  });

  $('.cart table .remove-from-cart').click(function() {
    var quantity = 0; // 0 means remove the item from the order
    var number   = $(this).data('number');

    getCartContent(quantity, number);
  });
}

function initializeWishListButtons() {
  $('.cart table .add-to-cart').click(function() {
    var post_data = {};

    post_data.number     = $(this).data('number');
    post_data.catalog    = $(this).data('catalog');
    post_data.title2x    = $(this).data('title2x');
    post_data.wishlistid = $(this).data('wishlistid');

    post_data[$(this).data('binding-name')]             = $(this).data('binding-value');
    post_data[$(this).data('saleprice-name')]           = $(this).data('saleprice-value');
    post_data[$(this).data('listprice-name')]           = $(this).data('listprice-value');
    post_data[$(this).data('recordid-name')]            = $(this).data('recordid-value');
    post_data[$(this).data('additional-handling-name')] = $(this).data('additional-handling-value');
    post_data[$(this).data('ingram-name')]              = $(this).data('ingram-value');

    addToCartFromWishList(post_data);
  });

  $('.cart table .remove-from-wishlist').click(function() {
    var number = $(this).data('number');

    removeFromWishList(number);
  });

  $('.cart .make-public-private').click(function() {
    var type = $(this).data('type');

    switchWishListType(type);
  });

  $('.cart .send-invitation').click(function() {
    sendInvitation();
  });

  $('.cart #search-wish-list-btn').click(function() {
    findWishList();
  });

  $('.cart #search-wish-list').keydown(function(e) {
    if(e.keyCode == 13) {
      e.preventDefault();
      findWishList();
    }
  });

  $('.cart #wish-list-select').change(function() {
    loadWishList();
  });
}

function initializeSpecialRequestButtons() {
  $('.cart .add-new-request-btn').click(function() {
    $('[name="request_id"]').val('');
    $('[name="request_title"]').val('');
    $('[name="request_title_cl"][value="2"]').prop('checked', true);
    $('[name="request_subtitle"]').val('');
    $('[name="request_subtitle_cl"][value="2"]').prop('checked', true);
    $('[name="request_photographer"]').val('');
    $('[name="request_photographer_cl"][value="2"]').prop('checked', true);
    $('[name="request_author"]').val('');
    $('[name="request_author_cl"][value="2"]').prop('checked', true);
    $('[name="request_publisher"]').val('');
    $('[name="request_publisher_cl"][value="2"]').prop('checked', true);
    $('[name="request_pub_date"]').val('');
    $('[name="request_pub_date_cl"][value="2"]').prop('checked', true);
    $('[name="request_country"]').val('0');
    $('[name="request_country_cl"][value="2"]').prop('checked', true);
    $('[name="request_isbn"]').val('');
    $('[name="request_isbn_cl"][value="2"]').prop('checked', true);
    $('[name="request_oop"]').val('0');
    $('[name="request_oop_cl"][value="2"]').prop('checked', true);
    $('[name="request_first_edition_only"]').val('');
    $('[name="request_signed_only"]').val('');
    $('[name="request_binding"]').val('1');
    $('[name="request_comments"]').val('');

    if(!$('.cart .add-new-request').is(':visible'))
      $('.cart .add-new-request').slideToggle();
  });

  $('.cart .save-new-request').click(function() {
    var post_data = {};

    post_data.request_id                 = $('[name="request_id"]').val();
    post_data.request_title              = $('[name="request_title"]').val();
    post_data.request_title_cl           = $('[name="request_title_cl"]:checked').val();
    post_data.request_subtitle           = $('[name="request_subtitle"]').val();
    post_data.request_subtitle_cl        = $('[name="request_subtitle_cl"]:checked').val();
    post_data.request_photographer       = $('[name="request_photographer"]').val();
    post_data.request_photographer_cl    = $('[name="request_photographer_cl"]:checked').val();
    post_data.request_author             = $('[name="request_author"]').val();
    post_data.request_author_cl          = $('[name="request_author_cl"]:checked').val();
    post_data.request_publisher          = $('[name="request_publisher"]').val();
    post_data.request_publisher_cl       = $('[name="request_publisher_cl"]:checked').val();
    post_data.request_pub_date           = $('[name="request_pub_date"]').val();
    post_data.request_pub_date_cl        = $('[name="request_pub_date_cl"]:checked').val();
    post_data.request_country            = $('[name="request_country"]').val();
    post_data.request_country_cl         = $('[name="request_country_cl"]:checked').val();
    post_data.request_isbn               = $('[name="request_isbn"]').val();
    post_data.request_isbn_cl            = $('[name="request_isbn_cl"]:checked').val();
    post_data.request_oop                = $('[name="request_oop"]').val();
    post_data.request_oop_cl             = $('[name="request_oop_cl"]:checked').val();
    post_data.request_first_edition_only = $('[name="request_first_edition_only"]:checked').val();
    post_data.request_signed_only        = $('[name="request_signed_only"]:checked').val();
    post_data.request_binding            = $('[name="request_binding"]').val();
    post_data.request_comments           = $('[name="request_comments"]').val();

    saveSpecialRequest(post_data);
  });

  $('.cart .remove-from-requests').click(function() {
    var requestid = $(this).data('requestid');

    removeFromSpecialRequests(requestid);
  });

  $('.cart .edit-request').click(function() {
    var requestid = $(this).data('requestid');

    editSpecialRequest(requestid);
  });
}

function sendInvitation() {

  if(!$('#invitation_email').val().trim() || !validate.email($('#invitation_email').val().trim())) {
    $('.invitation-status').show().html('Valid e-mail address is required');
    return;
  }

  if(!$('#invitation_subject').val().trim()) {
    $('.invitation-status').show().html('The subject is required');
    return;
  }

  $('.cart .send-invitation').html('<i class="fa fa-spinner fa-spin"></i> &nbsp; Sending...').attr('disabled', 'disabled');

  var message = $('.invitation-intro').html();

  if($('#invitation_message').val().trim()) {
    message +=
      '<br><br>' + 
      '---------------------------------------------------<br>' +
      'Personal message:<br>' +
      '---------------------------------------------------<br>' +
      $('#invitation_message').val().trim().replace(/\n/g, '<br>');
  }

  $.ajax({
    url: '/order/cart/send-invitation',
    data: {
      email:   $('#invitation_email').val(),
      subject: $('#invitation_subject').val(),
      message: message
    },
    method: 'POST',
    success: function(data, textStatus, jqXHR) {
      $('.cart .send-invitation').html('Send Invitation').removeAttr('disabled');

      if(data) {
        if(data.not_authenticated)
          return;

        if(data.error)
          $('.invitation-status').show().html('Invitation is not sent please try again');

        else if(data.success)
          $('.invitation-status').show().html('Invitation is successfully sent!');
      }
    },
    error: function() {
      $('.invitation-status').show().html('Invitation is not sent please try again');
      $('.cart .send-invitation').html('Send Invitation').removeAttr('disabled');
    }
  });
}

function setShippingAccountNumber() {
  var shipping = $('.cart #shipping-options input[type="radio"]:checked').val();
  if(shipping == 'PRI' ||
     shipping == 'BK'  ||
     shipping == 'CPU' ||
     shipping == 'PMI' ||
     shipping == 'FCI')
  {
    $('#shipping-account').hide();
  }
  else
    $('#shipping-account').show();
}

function initializeShippingRadiobox() {
  $('.cart #shipping-options input[type="radio"]').change(function () {
    calculateCartTotals();

    setShippingAccountNumber();
  });

  setShippingAccountNumber();
}

function getCartContent(quantity, number) {
  $('.cart #cart-content').append($('<div class="loader-wrap"><div class="loader"></div></div>'));

  $.ajax({
    url: '/order/cart/update-quantity',
    data: {
      quantity:      quantity, 
      number:        number,
      confirm_order: confirm_order
    },
    method: 'POST',
    success: function(data, textStatus, jqXHR) {
      if(data) {
        $('.cart #cart-content .loader-wrap').remove();

        $('.cart #cart-content').html(data.cart);
        $('.cart #cart-totals').html(data.totals);

        // if we're on the confirm order page load additional shipping data
        if(confirm_order) {
          $('.cart #shipping-options').html(data.shipping);

          initializeShippingRadiobox();
        }

        loadImages();
        loadCartImages();
        initializeCartButtons();
        // get the new shipping rates
        getShippingRates();
      }
    }
  });

}

function addToWishListFromCart(number) {
  $('.cart #cart-content').append($('<div class="loader-wrap"><div class="loader"></div></div>'));

  $.ajax({
    url: '/order/cart/add-to-wishlist-from-cart',
    data: {
      number: number
    },
    method: 'POST',
    success: function(data, textStatus, jqXHR) {
      if(data) {

        $('.cart #cart-content .loader-wrap').remove();
        if(data.not_authenticated) {
          window.location = '/account/login?fromwl=1';
          return;
        }

        $('.cart #cart-content').html(data.cart);
        $('.cart #cart-totals').html(data.totals);
        $('.cart #wishlist-content').html(data.wishlist);

        $('.cart .tab-panel a[href=#wishlist]').tab('show');

        loadImages();
        loadCartImages();
        initializeCartButtons();
        initializeWishListButtons();
        // get the new shipping rates
        getShippingRates();
      }
    }
  });

}

function removeFromWishList(number) {
  $('.cart #wishlist-content').append($('<div class="loader-wrap"><div class="loader"></div></div>'));

  $.ajax({
    url: '/order/cart/remove-wishlist',
    data: {
      number: number
    },
    method: 'POST',
    success: function(data, textStatus, jqXHR) {
      if(data) {

        $('.cart #wishlist-content .loader-wrap').remove();
        if(data.not_authenticated)
          return;

        $('.cart #wishlist-content').html(data.wishlist);

        loadImages();
        loadCartImages();
        initializeWishListButtons();
      }
    }
  });
}

function addToCartFromWishList(post_data) {
  $('.cart #wishlist-content').append($('<div class="loader-wrap"><div class="loader"></div></div>'));

  $.ajax({
    url: '/order/cart/add-to-cart-from-wishlist',
    data: post_data,
    method: 'POST',
    success: function(data, textStatus, jqXHR) {
      if(data) {

        $('.cart #wishlist-content .loader-wrap').remove();
        if(data.not_authenticated)
          return;

        $('.cart #cart-content').html(data.cart);
        $('.cart #cart-totals').html(data.totals);
        $('.cart #wishlist-content').html(data.wishlist);

        $('.cart .tab-panel a[href=#order]').tab('show');

        loadImages();
        loadCartImages();
        initializeCartButtons();
        initializeWishListButtons();
        // get the new shipping rates
        getShippingRates();
      }
    }
  });

}

function switchWishListType(type) {
  $('.cart #wishlist-content').append($('<div class="loader-wrap"><div class="loader"></div></div>'));

  $.ajax({
    url: '/order/cart/wishlist-type',
    data: {
      type: type
    },
    method: 'POST',
    success: function(data, textStatus, jqXHR) {
      if(data) {

        $('.cart #wishlist-content .loader-wrap').remove();
        if(data.not_authenticated)
          return;

        $('.cart #wishlist-content').html(data.wishlist);

        loadImages();
        loadCartImages();
        initializeWishListButtons();
      }
    }
  });
}

function findWishList() {
  var email = $('#search-wish-list').val();

  if(!email.trim() || !validate.email(email.trim())) {
    $('.find-wish-list-error').show().html('Valid e-mail address is required.');
    return;
  }

  $('.cart #wishlist-content').append($('<div class="loader-wrap"><div class="loader"></div></div>'));

  $.ajax({
    url: '/order/cart/find-wishlist',
    data: {
      email: email
    },
    method: 'POST',
    success: function(data, textStatus, jqXHR) {
      if(data) {

        $('.cart #wishlist-content .loader-wrap').remove();
        if(data.not_authenticated)
          return;

        $('.cart #wishlist-content').html(data.wishlist);

        loadImages();
        loadCartImages();
        initializeWishListButtons();
      }
    }
  });
}

function loadWishList() {
  $('.cart #wishlist-content').append($('<div class="loader-wrap"><div class="loader"></div></div>'));

  $.ajax({
    url: '/order/cart/load-wishlist',
    data: {
      custnumber: $('.cart #wish-list-select').val()
    },
    method: 'POST',
    success: function(data, textStatus, jqXHR) {
      if(data) {

        $('.cart #wishlist-content .loader-wrap').remove();
        if(data.not_authenticated)
          return;

        $('.cart #wishlist-content').html(data.wishlist);

        loadImages();
        loadCartImages();
        initializeWishListButtons();
      }
    }
  });
}

function getShippingRates() {

  // if we're on the confirm order page calculate the totals and exit execution
  if(confirm_order) {
    calculateCartTotals();
    return;
  }

  $('.cart #shipping-options').html($('<div class="loader"></div>'));

  $.ajax({
    url: '/order/shipping',
    data: {
      country_code:  $('.cart #country-code').val(),
      zip:           $('.cart #zip-code').val()
    },
    method: 'GET',
    success: function(data, textStatus, jqXHR) {
      if(data) {

        $('.cart #shipping-options').html(data);

        if($('#country-code').val() == '001')
          $('#international-notice').removeClass('show');
        else
          $('#international-notice').addClass('show');

        initializeShippingRadiobox();
        calculateCartTotals();
      }
    }
  });
}

function saveSpecialRequest(post_data) {
  if(!post_data.request_title.trim()) {
    $('.cart .new-request-error').show().html('The title field is required.');
    return;
  }

  if(post_data.request_pub_date.trim() && (post_data.request_pub_date.trim().length < 4 || parseInt(post_data.request_pub_date.trim()) < 0 || parseInt(post_data.request_pub_date.trim()) > 9999)) {
    $('.cart .new-request-error').show().html('The publication date must be a four-digit year in the form <em>1999</em>.');
    return;
  }

  $('.cart #requests-content').append($('<div class="loader-wrap"><div class="loader"></div></div>'));

  $.ajax({
    url: '/order/cart/save-special-request',
    data: post_data,
    method: 'POST',
    success: function(data, textStatus, jqXHR) {
      if(data) {

        $('.cart #requests-content .loader-wrap').remove();
        if(data.not_authenticated)
          return;

        if(data.special_requests_status && data.special_requests_status.already_in_requests) {
          $('.cart .new-request-error').show().html('You already have a record with this title in your Special Request List.');
          return;
        }

        $('.cart #requests-content').html(data.special_requests);

        initializeSpecialRequestButtons();
      }
    }
  });
}

function removeFromSpecialRequests(requestid) {
  $('.cart #requests-content').append($('<div class="loader-wrap"><div class="loader"></div></div>'));

  $.ajax({
    url: '/order/cart/remove-special-request',
    data: {
      requestid: requestid
    },
    method: 'POST',
    success: function(data, textStatus, jqXHR) {
      if(data) {

        $('.cart #requests-content .loader-wrap').remove();
        if(data.not_authenticated)
          return;

        $('.cart #requests-content').html(data.special_requests);

        initializeSpecialRequestButtons();
      }
    }
  });
}

function editSpecialRequest(requestid) {
  $('.cart #requests-content').append($('<div class="loader-wrap"><div class="loader"></div></div>'));

  $.ajax({
    url: '/order/cart/get-special-request',
    data: {
      requestid: requestid
    },
    method: 'POST',
    success: function(data, textStatus, jqXHR) {
      if(data) {

        $('.cart #requests-content .loader-wrap').remove();
        if(data.not_authenticated)
          return;

        $('.cart #requests-content').html(data.special_requests);
        $('.cart .add-new-request').slideToggle();

        initializeSpecialRequestButtons();
      }
    }
  });
}

var cartWidth = 300;

function loadCartImages() {
  $('.cart img')
    .load(function() {
      showSectionPageMasonryTiles();
    })
    .error(function() {
      showSectionPageMasonryTiles();
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
            width:     cartWidth
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

if($('.cart').length) {
  loadCartImages();

  $('.cart #get-rates').click(function () {
    getShippingRates();
  });

  initializeCartButtons();
  initializeWishListButtons();
  initializeSpecialRequestButtons();

  initializeShippingRadiobox();
  getShippingRates();
}

/*
 * Payment page
 */

function getShippingMethods(country_code) {
  
  $.ajax({
      url: '/order/country-shipping',
      data: {
        foreign: (country_code != '001')
      },
      method: 'GET',
      success: function(data, textStatus, jqXHR) {
        if(data) {
          $('#country-shipping-methods').html(data.shipping);

          var shipvia = $('#shipping-shipvia').val();
          var tpshipacct = $('#shipping-tpshipacct').val();

          // this means the user choose something so set this as shipping method
          if(shipvia)
            $('#payment-shipping-method').val(shipvia);
          else
            $('#payment-shipping-method').val(data.order.shipping.mom);

          $('#payment-shipping-number').val(tpshipacct);

          
        }
      }
    });

}

if($('.payment').length) {

  $('#input-billing-country').change(function() {

    if($('.same-as-billing input[type="checkbox"]').is(':checked')) // the shipping address is same as billing
      getShippingMethods($(this).val());
  });

  $('#input-shipping-country').change(function() {
    getShippingMethods($(this).val());
  });

  $('.same-as-billing input[type="checkbox"]').change(function() {
    var fields = $('#shipping-info').find('input[id^=input-shipping], select');

    if($(this).is(':checked'))
    {
      $('#shipping-info .row').hide();
      // get shipping methods
      getShippingMethods($('#input-billing-country').val());
    }
    else {
      $('#shipping-info .row').show();
      // get shipping methods
      getShippingMethods($('#input-shipping-country').val());
    }
  });

  // trigger the checkbox change to collapse the shipping fields
  $('.same-as-billing input[type="checkbox"]').change();

  // at the end check if the user already has shipping address set and populate the shipping methods
  var shipping_country = $('#shipping-country').val();
  if(shipping_country)
    getShippingMethods(shipping_country);
}

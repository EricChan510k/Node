if($('.credit-card').length) {

  // mark the selected card when editing card
  var card_type = $('.credit-card #card-type').val();

  if(card_type)
    $('.credit-card #' + card_type).addClass('detected');

  $('#payment-card-number').keyup(function (e) {
    $('.credit-card label').removeClass('detected');

    switch(parseInt($(this).val()[0])) {
      // American Express
      case 3:

        $('.credit-card #AX').addClass('detected');
        break;

      // Visa
      case 4:

        $('.credit-card #VI').addClass('detected');
        break;

      // MasterCard
      case 5:

        $('.credit-card #MC').addClass('detected');
        break;

      // Discover
      case 6:

        $('.credit-card #DS').addClass('detected');
        break;
    }
  });
}

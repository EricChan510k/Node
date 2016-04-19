/*
 * Home Page Slider
 */

function setSliderHomeHeight() {
  var slider_wrap_height = $('.home .slider-wrap').height();
  var height = window.innerHeight - 220;
  console.log(window.innerHeight < slider_wrap_height);
  if(window.innerHeight < slider_wrap_height) {
    $('.home .slider').height(height);
    $('.home .slider-wrap').height(height);
  }

  console.log((window.innerHeight - height) / 2);
  $('.home .slider-wrap').css('margin-top', ((window.innerHeight - slider_wrap_height) / 2) - 75);
}

if($('.home').length) {

  window.addEventListener('orientationchange', function(e) {
    setTimeout(function() {
      setSliderHomeHeight();
    }, 2000);

    setTimeout(function() {
      setSliderHomeHeight();
    }, 5000);
  });

  $(window).resize(function() {
    setSliderHomeHeight();
  });

  setSliderHomeHeight();
  

  var $slider_home = $('.home .slider').slick({
    slidesToShow: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    pauseOnHover: false,
    dots: true,
    infinite: true,
    speed: 1000,
    fade: true,
    cssEase: 'linear'
  });


  $('.slider.slick-initialized .slick-dots').before($('.slider-navigation'));

  // Handle Slider Dots clicks
  $('.slick-dots button').click(function() {
    $slider_home.slick('slickPause');
    $slider_home.slick('slickPause'); // call it second time because of slider bug
  });

  // On after slide change, highlight the appropriate link
  $slider_home.on('afterChange', function(event, slick, currentSlide) {
    var nav = $('.home .slider-navigation a');
    nav.removeClass('bold');

    var slide = parseInt($('.slick-dots .slick-active button').text());
    $(nav[slide - 1]).addClass('bold');
  });

  // Home page info overlay
  $('.home .box .desc-info .info-link').click(function(e) {
    e.preventDefault();

    $(this).closest('.box').find('.overlay').toggle();
  });

  var repeat = setInterval(function() {
    setSliderHomeHeight();
  }, 10);

  setTimeout(function() {
    clearInterval(repeat);
  }, 5000);
}

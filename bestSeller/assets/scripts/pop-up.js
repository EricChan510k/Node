var popUp = function(myURL, myWindowName, w, h, scroll, menu) {
  var myLeft = ((screen.width  - w) / 2) - 5; 
  var myTop  = ((screen.height - h) / 2) - 40;

  if ((screen.width) < w) {
    w = screen.width - 20;
    scroll = 'yes';
  }
  if ((screen.height) < h) {
    h = screen.height - 60;
    scroll = 'yes';
  }

  var settings = 'height=' + h + ',width=' + w + ',top=' + myTop + ',left=' + myLeft + ', resizable=no,menu=' + menu + ', scrollbars=' + scroll;

  var popupWin = window.open(myURL, myWindowName, settings);   
  popupWin.focus();
};

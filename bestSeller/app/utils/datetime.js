// ====================================================
// Image helper functions
// ====================================================

var moment = require('moment');

function getFormatedDiffFromNow (datetime) {
  var now = moment(new Date());
  var end = moment(datetime);

  var diff = end.diff(now); // difference in milliseconds

  diff = diff / 1000; // get the sifference in seconds

  var secondsInAMinute = 60;
  var secondsInAnHour  = 60 * secondsInAMinute;
  var secondsInADay    = 24 * secondsInAnHour;

  // extract days
  var days = parseInt(diff / secondsInADay);

  // extract hours
  var hourSeconds = diff % secondsInADay;
  var hours = parseInt(hourSeconds / secondsInAnHour);

  // extract minutes
  var minuteSeconds = hourSeconds % secondsInAnHour;
  var minutes = parseInt(minuteSeconds / secondsInAMinute);

  // extract the remaining seconds
  var remainingSeconds = minuteSeconds % secondsInAMinute;
  var seconds = Math.ceil(remainingSeconds);

  return days + ' days ' + hours + ' hrs ' + minutes + ' mins';
}

module.exports = {
  getFormatedDiffFromNow: getFormatedDiffFromNow
};

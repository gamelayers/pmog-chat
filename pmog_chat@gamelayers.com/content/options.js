function resetPrefs() {
  var prefs = document.getElementsByTagName('preference');
  for (var i = prefs.length - 1; i >= 0; i--) {
    if (prefs[i].hasUserValue) {
      prefs[i].reset();
    }
  }
}
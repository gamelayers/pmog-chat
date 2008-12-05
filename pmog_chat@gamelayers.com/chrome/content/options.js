function resetPrefs() {
  var prefs = document.getElementsByTagName('preference');
  for (var i = prefs.length - 1; i >= 0; i--) {
    if (prefs[i].hasUserValue) {
      prefs[i].reset();
    }
  }
}

function removeHistory() {
  var fhService = Components.classes["@mozilla.org/satchel/form-history;1"].getService(Components.interfaces.nsIFormHistory2);
  fhService.removeEntriesForName("ircCommandHistory");
}
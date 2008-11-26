var openChatController = {
      
  supportsCommand : function(cmd) {
    var isSupported = false;
    switch (cmd) {
      case "Tasks:OpenChat":
        isSupported = true;
        break;
      default:
        isSupported = false;
        break;
    }
    return isSupported;
  },
  
  isCommandEnabled : function(cmd) {
    return true;
  },
  
  doCommand : function(cmd) {
    switch (cmd) {
      case "Tasks:OpenChat": 
      {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
        var win = wm.getMostRecentWindow("PMOG:Chat");
        
        if (win) {
          win.focus();
        } else {
          window.open('chrome://pmog_chat/content/irc.xul', 'pmogChatWindow', 'chrome=yes,centerscreen,menubar=yes,resizable=yes');
        }
      }
    }
  }
};

window.controllers.appendController(openChatController);

function openChat() {
  var contr = window.controllers.getControllerForCommand('Tasks:OpenChat');
  
  contr.doCommand("Tasks:OpenChat");
};

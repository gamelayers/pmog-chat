var fileController = {
      
  supportsCommand : function(cmd) {
    var isSupported = false;
    switch (cmd) {
      case "Tasks:CloseWindow":
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
      case "Tasks:CloseWindow": 
      {
        window.close();
        break;
      }
    }
  }
};

var chatController = {
      
  supportsCommand : function(cmd) {
    var isSupported = false;
    switch (cmd) {
      case "Tasks:Connect":
      case "Tasks:Disconnect":
      case "Tasks:Refresh":
      case "Tasks:OpenProfile":
      case "Tasks:JoinChannel":
        isSupported = true;
        break;
      default:
        isSupported = false;
        break;
    }
    return isSupported;
  },
  
  isCommandEnabled : function(cmd) {
    var isEnabled = false;
    switch (cmd) {
      case "Tasks:Connect":
        if (!Peekko.ircclient || !Peekko.ircclient.isConnected()) {
          isEnabled = true;
        }
        break;
      case "Tasks:Disconnect":
        if (Peekko.ircclient && Peekko.ircclient.isConnected()) {
          isEnabled = true; 
        }
        break;
      default:
        isEnabled = true;
        break;
    }
    return isEnabled;
  },
  
  doCommand : function(cmd) {
    switch (cmd) {
      case "Tasks:Connect": 
      {
        Peekko.connectButton();
        break;
      }
      case "Tasks:Disconnect": 
      {
        Peekko.disconnectButton();
        break;
      }
      case "Tasks:Refresh": 
      {
        Peekko.updateButton();
        break;
      }
      case "Tasks:OpenProfile": 
      {
        Peekko.profileButton();
        break;
      }
      case "Tasks:JoinChannel": 
      {
        Peekko.joinButton();
        break;
      }
    }
  }
};

var toolController = {

  supportsCommand : function(cmd) {
    var isSupported = false;
    switch (cmd) {
      case "Tasks:ChatOptions":
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
      case "Tasks:ChatOptions": 
      {
        window.openDialog("chrome://pmogchat/content/options.xul", "options", "chrome,titlebar,toolbar,centerscreen,modal");
        break;
      }
    }
  }
};
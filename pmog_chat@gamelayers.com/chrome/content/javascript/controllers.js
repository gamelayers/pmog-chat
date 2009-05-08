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
      case "Tasks:JoinHelp":
      case "Tasks:ClearChat":
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
      case "Tasks:JoinHelp":
      case "Tasks:JoinChannel":
        if (Peekko.ircclient && Peekko.ircclient.isConnected()) {
           isEnabled = true;
        }
        break;
      case "Tasks:ClearChat":
        if (Peekko.ircclient.isConnected()) {
          isEnabled = true;
        }
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
      case "Tasks:JoinHelp": 
      {
        Peekko.joinChannel('#thenethernet.com');
        break;
      }
      case "Tasks:ClearChat":
      {
        xul.chatWindow.getSelectedChannelIO().clear();
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
        window.openDialog("chrome://pmog_chat/content/options.xul", "options", "chrome,titlebar,toolbar,centerscreen,modal");
        break;
      }
    }
  }
};
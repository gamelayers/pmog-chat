/**
overlay.js
*/
/**
@author Shane Celis <shane@peekko.com>
Licensed under the GNU General Public License
*/

// This thing needs to be split up.  It's not a controller; it's a huge ugly thing.
peekko.Controller = Class.create();
// Extending peekko.Config for backwards compatability, not because I think it's a good thing.
peekko.Controller.prototype = Object.extend(new peekko.Config(), {

  initialize: function() {
    this.ircclient = null;

    // could also be called this.sessions
    this.toolbar = new view.Toolbar();
    this.writer = new io.ChatWriter("console");
    this.chatEvents = new peekko.ChatEvents(this.toolbar);
    this.session = new peekko.Session();
    this.session.window.ioMap["console"] = this.writer;
    this.roomInfo = new peekko.RoomInfo();
    this.roomInfo.addListener(this.toolbar);
    this.roomInfo.addListener(this.session.window);

    this.statsListener = new peekko.StatsListener();
    this.roomInfo.addListener(this.statsListener);

    this.listReply = new Array();
    //this.config = new peekko.DefaultConfig();
    this.connectState = "disconnected";

    // if (peekko.prefs) {
    //   peekko.prefs.addObserver("extensions.pmog.chat.irc.nick", this, false);
    // }
  },

  // observe: function(subject, topic, data) {
  //   if (this.ircclient) {
  //     var nick = peekko.prefs.getCharPref("extensions.pmog.chat.irc.nick");
  //     this.ircclient.foundANick = false;
  //     this.ircclient.runCommand("/nick " + nick);
  //   }
  // },
  
  /**
  Buttons
  =======
    */

publicButton: function(event) {
    log("public");
    this.setPublic(true);


  },

privateButton: function(event) {
    log("private");
    this.setPublic(false);


  },

connectButton: function(event) {
    log("connect");
    this.setConnectState("connecting");
    this.connect();


  },

disconnectButton: function(event) {
    log("disconnect");
    this.setConnectState("disconnecting");
    if (this.ircclient) {
      this.ircclient.disconnect();

    }

  },

updateButton: function(event) {
    log("update");
    this.connect();
    var channel = this.getCurrentChannel();
    this.updateRoomInfo(channel);


  },

profileButton: function() {
    log("open profile");
    var newWindow = getBrowserWindow();
    var user = channelTreeView.getCellText(channelTreeView.treeBox.view.selection.currentIndex);

    //user = user.replace(/\@/, '');
    newWindow.getBrowser().addTab(newWindow.jQuery.pmog.BASE_URL + "/users/" + user);

  },

channelFilterButton: function(filterType) {
    log("channel filter");
    if (filterType == "strip-subdomain") {
      this.toggleStripSubdomain();


    } else {
      this.setFilterType(filterType);


    }
    this.updateRoomInfo(this.getCurrentChannel());


  },

joinButton: function(event) {
    log("join");
    this.joinChannel(this.getCurrentChannel());


  },

// Too much logic in this method.  This should really be pushed over the irc's /join command.
  joinChannel: function(channel) {
    var event = null;
    // bad
    if (this.ircclient == null) {
      var privateChannel = this.getPrivateChannel(channel);
      if (!this.initCommands) {
        this.initCommands = new Array();


      }
      this.initCommands.push("/join " + channel);
      // if (!peekko.config.browseInvisibly()) {
      //   this.initCommands.push("/join " + privateChannel);
      // }
      this.connectButton(event);


    } else {
      var current = channel;
      var was;
      if (this.ircclient.channel) {
        was = this.ircclient.channel.name;

      }
      if (was == current) {
        //Channel hasn't changed
        //this.writer.println("*** already in channel " + current);
      } else {
        // if (was != null && !this.isPrivateChannel(was)) {
        //                     this.ircclient.partChannel(was);
        //                 }
        //                 this.ircclient.joinChannel(current);
        // if (Peekko.session.window.getChannelTab(current) === undefined) {
        //   var newTab = this.session.window.addTab(current);
        //   this.session.window.selectTab(newTab);
        this.ircclient.joinChannel(current);
        // } else {
        //   Peekko.session.window.selectTab(Peekko.session.window.getChannelTab(current));
        //   this.ircclient.joinChannel(current);
        // }

      }


    }


  },

prefAccepted: function(pane) {
    log("prefAccepted");
    pane.acceptDialog();


  },

gotoChannel: function(channel) {
    var newWindow = getBrowserWindow();
    newWindow._content.document.location = this.channelToURL(channel);
    this.joinChannel(channel);


  },

channelToURL: function(channel) {
    var domain = channel.replace(/^#_?/, '');
    return 'http://' + domain;


  },

/**
End of Buttons
==============
    */

/**
Events
======
    */

onLoad: function(event) {
    log("onLoad");
    var mainWindow = getBrowserWindow();
    var content = mainWindow.getBrowser();
    if (content) {
      log("added a progress listener");
      content.addProgressListener(peekko.listener, 
      Components.interfaces.nsIWebProgress.NOTIFY_STATE_ALL);


    }
    this.setConnectState('disconnected');

    var autoConnect = this.getAutoConnect();
    if (autoConnect) {
      this.connectButton(null);


    }

    Peekko.onLocationChange(Peekko.getCurrentURL());


  },

onUnload: function(event) {
    log("onUnload");
    var mainWindow = getBrowserWindow();
    var content = mainWindow.getBrowser();
    if (content) {
      log("removing progress listener");
      content.removeProgressListener(peekko.listener);


    }


  },

onLocationChangeStart: function() {
    log("onLocationChangeStart: " + this.getCurrentURL());
    this.lastLocationStartChannel = this.getPrivateChannel(this.getCurrentChannel());



  },

onLocationChange: function(url) {
    log("onLocationChange: " + url);
    // Update our current session with our new url.
    this.session.url = url;

    var channel = this.URLtoIRCChannel(url);
    this.toolbar.channel = channel;

    if (this.browseInvisibly() && this.ircclient) {
      var newChannel = this.getPrivateChannel(channel);
      // Don't part and leave the same channel.
      if (this.lastLocationStartChannel != newChannel) {
        if (this.ircclient.getChannel(this.lastLocationStartChannel)) {
          this.ircclient.partChannel(this.lastLocationStartChannel);


        }
        this.ircclient.joinChannel(newChannel);


      }


    }
    this.updateRoomInfo(channel);


  },

onLocationChangeEnd: function() {
    log("onLocationChangeEnd: " + this.getCurrentURL());


  },

onTabChange: function(url) {
    log("onTabChange: " + url);
    var channel = this.URLtoIRCChannel(url);
    this.toolbar.channel = channel;
    
    this.updateRoomInfo(channel);


  },


/**
End of Events
=============
    */

connect: function() {
    if (!this.ircclient) {

    var pmogUsername = getBrowserWindow().jQuery.pmog.pmog.user.login;
    if (pmogUsername) {
      peekko.prefs.setCharPref("extensions.pmog.chat.irc.username", pmogUsername);
      peekko.prefs.setCharPref("extensions.pmog.chat.irc.nick", pmogUsername);
    }
    
      var nicks = new Array();
      nicks.push("extensions.pmog.chat.irc.nick");
      nicks.push("extensions.pmog.chat.irc.nick.alt.1");
      nicks.push("extensions.pmog.chat.irc.nick.alt.2");
      nicks.push("extensions.pmog.chat.irc.nick.alt.3");
      var realname = peekko.prefs.getCharPref("extensions.pmog.chat.irc.realname");
      var username = peekko.prefs.getCharPref("extensions.pmog.chat.irc.username");

      this.ircclient = new peekko.Client(new peekko.NickPrefHandler(nicks), username, realname, this);
      this.ircclient.out = this.writer;

      /*
    XXX - This should really be pulled out into its own class: peekko.Client
    rather than doing my own polymorphism; however, it is cool that you can
    do it yourself in javascript.
            */

// room info does some binding too.
      this.roomInfo.setIRCClient(this.ircclient);

      // Start off the irc processing.
      this.ircTimer();

      var host = peekko.prefs.getCharPref("extensions.pmog.chat.irc.host");
      var port = peekko.prefs.getIntPref("extensions.pmog.chat.irc.port");
      var timeout = peekko.prefs.getIntPref("extensions.pmog.chat.irc.timeout");
      this.ircclient.timeout = timeout;
      this.ircclient.connect(host, port);
      
      var irc = this.ircclient;
      var myPrefsListener = new PrefListener("extensions.pmog.chat.irc.",
      function(branch, name)
      {
        switch (name) 
        {
          case "nick":
          {
            var nick = peekko.prefs.getCharPref("extensions.pmog.chat.irc.nick");
            irc.foundANick = false;
            xul.chatWindow.inputs.push("/nick " + nick)
            break;
          }
        }
      });

      myPrefsListener.register();
    }


  },

toggleStripSubdomain: function() {
    this.setStripSubdomain(!this.getStripSubdomain());


  },

getCurrentURL: function() {
    var newWindow = getBrowserWindow();
    return newWindow._content.document.location.toString();


  },

getCurrentChannel: function() {
    return this.URLtoIRCChannel(this.getCurrentURL());


  },

joinCurrentURL: function() {
    this.ircclient.joinChannel(this.getCurrentChannel());


  },

document: function() {
    var newWindow = getBrowserWindow();
    return newWindow._content.document;


  },

lazyUpdateRoomInfo: function(channel) {
    if (channel == null) {
      channel = this.getCurrentChannel();


    }
    if (this.lastChannel == null || this.lastChannel != channel) {
      this.updateRoomInfo(channel);


    }
    this.lastChannel = channel;


  },

updateRoomInfo: function(channel) {
    this.roomInfo.update(this.getPrivateChannel(channel));
    this.roomInfo.update(channel);


  },

urlToTitle: function() {
    var url = this.getCurrentURL();

    if (url == null || url.length == 0) {
      return null;


    }

    return this.normalizeURL(url);


  },

normalizeURL: function(url) {
    // Chop off the scheme.
    var channel = url.toString().replace(/^[a-zA-Z]*:\/+/, "")
    // Chop off any port information.
    channel = channel.replace(/:\d+\//, "/")
    // The channel name SHALL NOT contain any spaces (' '), a control G (^G or ASCII 7), a comma (',').
    channel = channel.replace(/[:,]/g, "_");
    // Chop off the query or #anchor part of the URL.
    channel = channel.replace(/[\?#].*$/, "");

    // Remove any trailing slashes and any preceding wwww's.
    channel = channel.replace(/(^www.?\.|\/+$)/g, "");

    return channel;


  },

URLtoIRCChannel: function(url, filterType, stripSubdomain) {
    if (url == null || url.length == 0) {
      return null;


    }
    if (filterType == null) {
      filterType = this.getFilterType();


    }
    if (stripSubdomain == null) {
      stripSubdomain = this.getStripSubdomain();


    }

    var channel = this.normalizeURL(url);

    if (stripSubdomain) {
      // Only keep the first two items in the domain name.  x.y, gnufoo.org
      // XXX - This will not handle international domain names well.
      //channel = channel.replace(/^(.*\.)?(\w+\.\w+(\.\w\w)?\/)/, '$2');
      //channel = channel.replace(/^([^\/]*\.)?(\w+\.\w+(\/|$))/, '$2');
      if (!channel.match(/[^\/]*\.\w\w(\/|$)/)) {
        channel = channel.replace(/^([^\/]*\.)?(\w+\.\w+(\/|$))/, '$2');


      } else {
        // This must be an international URL.
        channel = channel.replace(/^([^\/]*\.)?(\w+\.\w+(\.\w\w)(\/|$))/, '$2');


      }


    }
    switch (filterType) {
      case "file":
      // don't touch it.
      break;
      case "directory":
      channel = channel.replace(/\/[\w\.]+\.\w+$/, "");
      break;
      case "domain":
      channel = channel.replace(/\/.*$/, "");
      break;
      default:
      log("error: got an unexpected filterType: " + filterType);
      break;


    }
    // Channels names are strings (beginning with a '&', '#', '+' or '!' character) of length
    // up to fifty (50) characters.
    if (channel.length > 50) {
      channel = channel.substring(0, 50);

    }
    return '#' + channel;

  },

getPrivateChannel: function(channel) {
    return '#_' + channel.substring(1);

  },

isPrivateChannel: function(channel) {
    return channel[0] == '#' && channel[1] == '_';

  },

// I don't like this method.  Please kill it.
  getChatWindow: function() {
    return this.session.window;

  },

setToolbarOutput: function(sMessage, sTooltip) {
    var element = $('pmogChatConsole');
    element.label = sMessage;
    if (sTooltip) {
      element.setAttribute("tooltiptext", sTooltip);

    } else {
      element.removeAttribute("tooltiptext");

    }

  },

setConnectState: function(state) {
    this.connectState = state;
    var connect = $('connectButton');
    var disconnect = $('disconnectButton');
    var update = $('updateButton');
    switch (state) {
      case "connected":
      this.toolbar.setStatus("Connected");
      connect.hidden = true;
      disconnect.hidden = false;
      connect.disabled = false;
      disconnect.disabled = false;
      update.disabled = false;
      this.session.window.disableInput(false);
      break;
      case "disconnected":
      this.toolbar.setStatus("Disconnected");
      this.toolbar.update(null, null, null);
      this.session.window.setNick(null);
      this.session.window.update(null, null, null);
      this.session.window.disableInput(true);
      connect.hidden = false;
      disconnect.hidden = true;
      connect.disabled = false;
      disconnect.disabled = false;
      update.disabled = true;
      break;
      case "connecting":
      this.toolbar.setStatus("Connecting...");
      connect.hidden = false;
      disconnect.hidden = true;
      connect.disabled = true;
      disconnect.disabled = false;
      update.disabled = true;
      break;
      case "disconnecting":
      this.toolbar.setStatus("Disconnecting...");
      connect.hidden = true;
      disconnect.hidden = false;
      connect.disabled = false;
      disconnect.disabled = true;
      update.disabled = true;
      break;
      default:
      throw "got the wrong state: " + state;

    }
    window.updateCommands('PmogConnect');


  },

setItemAvatar: function(item, avatar) {
    log("Setting avatar to: " + avatar);
    item.setAttribute("image", avatar);
  },

ircTimer: function() {
    if (this.ircclient) {
      try {
        this.ircclient.process();
      } catch(e) {
        log('Exception in the IRC Client process: ' + e);
      }

      try {
        var input;
        input = this.session.window.getInput();
        if (input && input != "") {
          var command = this.ircclient.executeLocalInput(input);
          try {
            if (command) {
              this.ircclient.sendCommandObject(command);
            }
          } catch(ex) {
            this.writer.println("error: cannot send command to server '" + ex + "'");
          }
        }
      } catch(ex) {
        log("Error: critical error in ircclient: " + ex + " Attempting to recover.");
        // Catch it and try to keep going.  :)
        //throw ex;
      }
      setTimeout(function() {
        Peekko.ircTimer();

      },
      500);

    }

  }

});

var Peekko = new peekko.Controller();
// rename 'Peekko' to 'peekko' or 'controller'.
window.addEventListener("load", 
function(e) {
  Peekko.onLoad(e);

},
false);

window.addEventListener("unload", 
function(e) {
  Peekko.onUnload(e);

},
false);
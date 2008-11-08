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

    initialize : function() {
        this.ircclient = null;

        this.tabs = new PArray(); // could also be called this.sessions
        this.toolbar = new view.Toolbar();
        this.writer = new io.ChatWriter();
        this.chatEvents = new peekko.ChatEvents(this.toolbar);
        //this.writer = new io.MultiplexWriter();
        //this.writer.addWriter(new xul.ChatWriter());
        //this.writer.addWriter(this.toolbar);
        this.session = new peekko.Session();
        
        this.roomInfo = new peekko.RoomInfo();
        this.roomInfo.addListener(this.toolbar);
        this.roomInfo.addListener(this.session.window);
        
        this.statsListener = new peekko.StatsListener();
        this.roomInfo.addListener(this.statsListener);
        
        // this.annotationWindow = null;
        // this.annotationWriter = new BufferedAnnotationWriter();
        this.listReply = $PA();
        this.config = new peekko.DefaultConfig();
        this.connectState = "disconnected";
        //this.onConnectJoinChannel = null;
        
        if (peekko.prefs) {
            peekko.prefs.addObserver("extensions.pmog.chat.pref.accepted", this, false /* weak ref */);
        }
    },

    observe: function(subject,topic,data){
        log("nick changed: " + data);
        if (this.ircclient) {
            var nick = peekko.prefs.getCharPref("extensions.pmog.chat.irc.nick");
            this.ircclient.foundANick = false;
            this.ircclient.runCommand("/nick " + nick);
        }
    },
    /**
        Buttons
        =======
    */

    publicButton : function(event) {
        log("public");
        this.setPublic(true);
    },

    privateButton : function(event) {
        log("private");
        this.setPublic(false);
    },

    // annotateButton : function(event) {
    //     log("annotate");
    // 
    //     var selection = this.focusedWindow().getSelection();
    //     Highlighter.set(this.focusedWindow(), selection, "span", 
    //                     { style : Highlighter.PRESET_STYLES[4] });
    // },

    connectButton : function(event) {
        log("connect");
        this.setConnectState("connecting");
        // if (! this.initCommands) {
        //     this.initCommands = $A();
        // }
        // this.initCommands.push("/join #pmog");
        this.connect();
    },

    disconnectButton : function(event) {
        log("disconnect");
        this.setConnectState("disconnecting");
        if (this.ircclient) {
            this.ircclient.disconnect();
        }
    },

    updateButton : function(event) {
        log("update");
        //this.toolbar.setStatus("");
        this.connect();
        var channel = this.getCurrentChannel();
        this.updateRoomInfo(channel);
    },
    
    profileButton : function(event) {
      log("open profile");
      var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                                .getService(Components.interfaces.nsIWindowMediator);
      var newWindow = wm.getMostRecentWindow("navigator:browser");
      var user = document.getElementById("pmogChatUsers").selectedItem.value;
      
      newWindow.getBrowser().addTab(newWindow.p$.pmog.BASE_URL + "/users/" + user);
      
    },

    channelFilterButton : function(filterType) {
        log("channel filter");
        if (filterType == "strip-subdomain") {
            this.toggleStripSubdomain();
        } else {
            this.setFilterType(filterType);
        }
        this.updateRoomInfo(this.getCurrentChannel());
    },

    joinButton : function(event) {
        log("join");
        
        this.joinChannel(this.getCurrentChannel());
        
    },
    
    // Too much logic in this method.  This should really be pushed over the irc's /join command.
    joinChannel : function(channel) {
        var event = null; // bad
        if (this.ircclient == null) {
            //var channel = this.getCurrentChannel();
            var privateChannel = this.getPrivateChannel(channel);
            if (! this.initCommands) {
                this.initCommands = $A();
            }
            this.initCommands.push("/join " + channel);
            if (! peekko.config.browseInvisibly()) {
                this.initCommands.push("/join " + privateChannel);
            }
            this.connectButton(event);
        } else {
            var current = channel;
            //var current = this.getCurrentChannel();
            var was;
            if (this.ircclient.channel) {
                was = this.ircclient.channel.name;
            }
            if (was == current) {
                this.writer.println("*** already in channel " + current);
            } else {
                if (was != null && ! this.isPrivateChannel(was)) {
                    this.ircclient.partChannel(was);
                }
                this.ircclient.joinChannel(current);
            }
        }
    },
    
    // updateMostPopMenu : function() {
    //     this.roomInfo.update(this.roomInfo.allToken);
    // },

    prefAccepted : function(pane) {
        log("prefAccepted");
        pane.acceptDialog();
    },
    // 
    // populateMostPopMenu : function(event) {
    //      // Get the menu element that we will be working with
    //     var menu = $('peekko-most-pop-menu');
    // 
    //     var lastItem = menu.childNodes.length - 1;
    //     
    //     // Save the last two items, because we always want them in the menu.
    //     var separator = menu.childNodes.item(lastItem - 1);
    //     var update = menu.childNodes.item(lastItem);
    //     try {
    //         // Clean up whatever is currently in the menu.
    //         for(var i = lastItem; i >= 0; i--) {
    //            menu.removeChild(menu.childNodes.item(i));
    //         }
    // 
    //         var len = this.statsListener.rooms.length;
    //         if (len > 5) {
    //             len = 5;
    //         }
    //         // Load the search terms into our menu
    //         for(var i = 0; i < len; i++)
    //         {
    //             // For each search term, create a menu item element
    //             var item = null;
    //             item = document.createElement("menuitem");
    // 
    //             // Set the menuitem element's various attributes:
    //             // The label will be the search term itself
    //             // The tooltip will be the text "Dynamic Item #", where # is the number of the item
    //     
    //             var channel = this.statsListener.rooms[i][0];
    //             var count = this.statsListener.rooms[i][1];
    //             item.setAttribute("label", channel);
    //             item.setAttribute("tooltiptext", channel + " has " + count + " chatters"); // XXX 1 chatters bad.
    //             item.setAttribute("oncommand", "Peekko.gotoChannel('" + channel + "');");
    // 
    //             // Add the item to our menu
    //             menu.appendChild(item);
    //         }
    //     } finally {
    //         menu.appendChild(separator);
    //         menu.appendChild(update);
    //     }
    // },
    
    gotoChannel : function(channel) {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                                  .getService(Components.interfaces.nsIWindowMediator);
        var newWindow = wm.getMostRecentWindow("navigator:browser");
        newWindow._content.document.location = this.channelToURL(channel);
        this.joinChannel(channel);
    },
    
    channelToURL : function(channel) {
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

    onLoad : function(event) {
        log("onLoad");
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                                    .getService(Components.interfaces.nsIWindowMediator);
        var mainWindow = wm.getMostRecentWindow("navigator:browser");
        var content = mainWindow.getBrowser();
        //var content = document.getElementById("content");
        if (content) {
            log("added a progress listener");
            content.addProgressListener(peekko.listener,
                                        Components.interfaces.nsIWebProgress.NOTIFY_STATE_ALL);
        }
        this.setConnectState('disconnected');
        // We don't want it to show disconnected forever.
        //this.toolbar.setStatus("");
        
        
        //var element = $("peekko-filter-popup-" + this.getFilterType());
        //if (element) {
        //    element.setAttribute("checked", "true");
        //}
        //if (this.getStripSubdomain()) {
        //    $('peekko-filter-popup-strip-subdomain').setAttribute("checked", "true");
        //}
        //this.updateRoomInfo();

        var autoConnect = this.getAutoConnect();
        if (autoConnect) {
            this.connectButton(null);
        }
        
        //Peekko.onLocationChange(Peekko.getCurrentURL());
    },
    
    onUnload : function(event) {
        log("onUnload");
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                                    .getService(Components.interfaces.nsIWindowMediator);
        var mainWindow = wm.getMostRecentWindow("navigator:browser");
        var content = mainWindow.getBrowser();
        //var content = document.getElementById("content");
        if (content) {
            log("removing progress listener");
            content.removeProgressListener(peekko.listener);
        }
    },
    
    onLocationChangeStart : function() {
        log("onLocationChangeStart: " + this.getCurrentURL());
        this.lastLocationStartChannel = this.getPrivateChannel(this.getCurrentChannel());

    },

    onLocationChange : function(url) {
        log("onLocationChange: " + url);
        // Update our current session with our new url.
        this.session.url = url;
        
        // Update the IM client if we're broadcasting our whereabouts.
        // if (this.broadcast) {
        //     this.setIMStatus(url);
        // }
        // 
        // If we've changed locations, we should invalidate the window we once had.
/*        if (this.session.window.hasDocument()) {
            // We have a chat window.  What will we do with it?
            this.session.window.removeDocument();
            this.session.chatWriter.setChatWriter(null);
        }*/
        
        // must save first
/*        if (this.annotationWindow != null) {
            this.annotationWindow.save(this.urlToTitle());
            this.annotationWindow = null;
        }
        this.annotationWriter.setAnnotationWriter(null);
        this.toggleAnnotationButton(true);
*/
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
            // If I'm not in the channel I'm currently at, join it.
/*            if (this.ircclient.getChannel(newChannel) == null) {
                this.ircclient.joinChannel(newChannel);
            }*/
        }
        this.updateRoomInfo(channel);
    },
    
    onLocationChangeEnd : function() {
        //log("onLocationChangeEnd");
/*        if (! this.session.showChatButtonToggle)  {
            this.getChatWindow().show();
        }*/
        

        
        // Only part and join the new channel if the channel is not set as sticky.
 /*       if (this.ircclient && this.ircclient.channel.name 
            && ! this.session.sticky && this.ircclient.channel.name != this.getCurrentChannel() ) {
            this.ircclient.partChannel(this.ircclient.channel.name);
            this.ircclient.joinChannel(this.getCurrentChannel());
        }*/
        log("onLocationChangeEnd: " + this.getCurrentURL());
        

    },
    
    onTabChange : function(url) {
        log("onTabChange: " + url);
        var channel = this.URLtoIRCChannel(url);
        this.toolbar.channel = channel;
        
        if (! peekko.config.browseInvisibly()) {
            var privateChannel = this.getPrivateChannel(channel);
            if (this.ircclient && this.ircclient.getChannel(privateChannel) == null 
                && this.connectState == "connected") {
                    this.ircclient.joinChannel(privateChannel);
            } else {
                if (! this.initCommands) {
                    this.initCommands = $A();
                }
                this.initCommands.push("/join " + privateChannel);
            }
        }
        this.updateRoomInfo(channel);
        //this.roomInfo.update(channel);

/*        var session = this.tabs.detect(function (value) { return value.url == url});
        if (session == null) {
            // Add a new session
            this.session = new peekko.Session();
            this.session.url = url;
            this.tabs.push(this.session);
            this.writer.addWriter(this.session.chatWriter);
        } else {
            // We switched sessions.
            this.session = session;
            this.toggleChatButton();
        }
        // XXX - tabs are currently being leaked here.
        log("tabs length: " + this.tabs.length);
*/
    },


    /**
        End of Events
        =============
    */
    
    connect : function() {
        if (! this.ircclient) {

            var nicks = $PA();
            nicks.push("extensions.pmog.chat.irc.nick");
            nicks.push("extensions.pmog.chat.irc.nick.alt.1");
            nicks.push("extensions.pmog.chat.irc.nick.alt.2");
            nicks.push("extensions.pmog.chat.irc.nick.alt.3");
            var realname = peekko.prefs.getCharPref("extensions.pmog.chat.irc.realname");
            var username = peekko.prefs.getCharPref("extensions.pmog.chat.irc.username");
            //this.ircclient = new irc.Client(nicks, username, realname);
            this.ircclient = new peekko.Client(new peekko.NickPrefHandler(nicks), username, realname, this);
            if (this.initCommands) {
                var commands = this.initCommands;
                this.ircclient.onRegistered = function() {
                    this.runCommand.apply(this, commands);
                }
                this.initCommands = null;
            }
            //this.ircclient.onConnect.hook(dirtyBind(this.onConnect, this));
            this.ircclient.out = this.writer;

            /*
                XXX - This should really be pulled out into its own class: peekko.Client
                rather than doing my own polymorphism; however, it is cool that you can
                do it yourself in javascript.
            */

            // room info does some binding too.
            this.roomInfo.setIRCClient(this.ircclient);
            // I don't know why Prototype's bind doesn't work here.  :(
/*            this.ircclient.onConnect = dirtyBind(this.onConnect, this);
            this.ircclient.onDisconnect = dirtyBind(this.onDisconnect, this);
            this.ircclient.onTimeout = dirtyBind(this.onTimeout, this);
            
            this.ircclient.onJoin = dirtyBind(this.onJoin, this);
            this.ircclient.onPart = dirtyBind(this.onPart, this);
            this.ircclient.onKick = dirtyBind(this.onKick, this);
            this.ircclient.onQuit = dirtyBind(this.onQuit, this);
            this.ircclient.onTopicChange = dirtyBind(this.onTopicChange, this);                                        
            this.ircclient.onText = dirtyBind(this.onText, this);
                    
            this.ircclient.onNameReply = dirtyBind(this.onNameReply, this);
            this.ircclient.onNameReplyEnd = dirtyBind(this.onNameReplyEnd, this);
            this.ircclient.onChannelModeChange = dirtyBind(this.onChannelModeChange, this);
            this.ircclient.onMyNickChange = dirtyBind(this.onMyNickChange, this);
            this.ircclient.onChannelChange = dirtyBind(this.onChannelChange, this);
*/
            //this.config.setup();
            // Start off the irc processing.
            this.ircTimer();
            

            var host = peekko.prefs.getCharPref("extensions.pmog.chat.irc.host");
            var port = peekko.prefs.getIntPref("extensions.pmog.chat.irc.port");
            var timeout = peekko.prefs.getIntPref("extensions.pmog.chat.irc.timeout");
            this.ircclient.timeout = timeout;
            this.ircclient.connect(host, port);
        }
    },
    
    toggleStripSubdomain : function() {
        this.setStripSubdomain(! this.getStripSubdomain());
    },

/*    unprivatizeRoom : function() {
        log("unprivatizeRoom");
        if (this.ircclient && this.ircclient.channel && this.ircclient.channel.hasMode('s') 
            && this.ircclient.isOperator() && ! this.isPrivateChannel(this.ircclient.channel)) {
            // Make the room public.  We don't want it to be private.  We want other people to see us!
            this.ircclient.sendCommand("MODE", [ this.ircclient.channel.name, "-s"]);
            setTimeout(function() { Peekko.roomInfo.update(Peekko.getCurrentChannel()); }, 1000);
        }
    },
    
    _privatizeChannel : function(channel) {
        log("_privatizeChannel: " + channel);
        if (this.ircclient) {
            var oChannel = this.ircclient.getChannel(channel);
            log("_privatizeChannel: " + oChannel);            
            if (oChannel && ! oChannel.hasMode('s') && oChannel.isOperator()) {
                // Make the room private.
                this.ircclient.sendCommand("MODE", [ oChannel.name, "+s"]);
            }
        }
    },*/

    getCurrentURL : function() {
      var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                                  .getService(Components.interfaces.nsIWindowMediator);
      var newWindow = wm.getMostRecentWindow("navigator:browser");
        return newWindow._content.document.location.toString();
    },

    getCurrentChannel : function() {
        return this.URLtoIRCChannel(this.getCurrentURL());
    },

    joinCurrentURL : function() {
        this.ircclient.joinChannel(this.getCurrentChannel());
    },
/*
    setIMStatus : function(msg) {
        //this.document().location = "pkko://localhost/chat?msg=" + msg;
        //PKUtil.makeHttpRequest("pkko://localhost/chat?msg=" + msg);
        //PKUtil.execCommand("/Users/ed/ws/peekko/firefox-toolbar/bin/away " + msg)
        PKUtil.execCommand("/home/shane/bin/away " + msg)
    },*/

    /**
        Returns the document the user is currently at, which is different than the local document.
    */
    document : function() {
      var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                                  .getService(Components.interfaces.nsIWindowMediator);
      var newWindow = wm.getMostRecentWindow("navigator:browser");
        return newWindow._content.document;
    },
    
    lazyUpdateRoomInfo : function(channel) {
        if (channel == null) {
            channel = this.getCurrentChannel();
        }        
        if (this.lastChannel == null || this.lastChannel != channel) {
            this.updateRoomInfo(channel);
        }
        this.lastChannel = channel;
    },

    /**
        Updates the channel and its private counterpart.
    */
    updateRoomInfo : function(channel) {
        this.roomInfo.update(this.getPrivateChannel(channel));
        this.roomInfo.update(channel);
    },

    /**
        Mangle the URL into annotation title to be saved and recalled.
    */
    urlToTitle : function() {
        var url = this.getCurrentURL();

        if (url == null || url.length == 0) {
            return null;
        }

        return this.normalizeURL(url);
    },


    /**
        Normalize the url according to IRC RFC 1.3 Channel name.
    */
    normalizeURL : function(url) {
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

    /**
        Mangle the URL into something that'll work as an IRC channel name.

        See IRC RFC 1.3 Channels
    */
    URLtoIRCChannel : function(url, filterType, stripSubdomain) {
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
            if (! channel.match(/[^\/]*\.\w\w(\/|$)/)) {
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

    /**
        Convert to private channel.
    */
    getPrivateChannel : function(channel) {
        return '#_' + channel.substring(1);
    },
    
    isPrivateChannel : function(channel) {
        return channel[0] == '#' && channel[1] == '_';
    },

/*    focusedWindow : function() {
        var focusedWindow = null;
        if (document.commandDispatcher)
            focusedWindow = document.commandDispatcher.focusedWindow;
        if (focusedWindow == window)
            focusedWindow = _content;
        return focusedWindow;
    },*/



    // I don't like this method.  Please kill it.
    getChatWindow : function() {
 /*       if (! this.session.hasWindow()) {
            var doc = this.document();
            this.session.createWindow(doc);
        }*/
        return this.session.window;
    },

    // getAnnotationWindow : function() {
    //     if (this.annotationWindow == null) {
    //         var doc = this.document();
    //         var annotationInjector = new AnnotationWindowInjector(doc);
    //         annotationInjector.inject();
    //         this.annotationWindow = new AnnotationWindow(doc);
    //         this.annotationWindow.setTitle(this.urlToTitle());
    //         this.annotationWindow.load(this.urlToTitle());
    //         this.annotationWriter.setAnnotationWriter(new AnnotationWriter(doc));
    //     }
    //     return this.annotationWindow;
    // },

    setToolbarOutput : function(sMessage, sTooltip) {
        var element = $('pmogChatConsole');
        element.label = sMessage;
        if (sTooltip) {
            element.setAttribute("tooltiptext", sTooltip);
        } else {
            element.removeAttribute("tooltiptext");
        }
    },

    toggleChatButton : function(bShow) {
        // if (bShow == null) {
        //     bShow = this.session.window.isHidden();
        // }
        this.toolbar.resetShowButton();        

        var show = $('button-show-chat');
        var hide = $('button-hide-chat');
        if (bShow) {
            show.hidden = false;
            hide.hidden = true;
        } else {
            show.hidden = true;
            hide.hidden = false;
        }
    },

    toggleAnnotationButton : function(bShow) {
        var show = $('button-show-annotation');
        var hide = $('button-hide-annotation');
        if (bShow) {
            show.hidden = false;
            hide.hidden = true;
        } else {
            show.hidden = true;
            hide.hidden = false;
        }
    },

    setConnectState : function(state) {
        this.connectState = state;
        var connect = $('connectButton');
        var disconnect = $('disconnectButton');
        var update = $('updateButton');
        //var mostpop = $('peekko-most-pop-button');

        switch (state) {
            case "connected":
                this.toolbar.setStatus("Connected");
                //this.evaporateStatus();
                connect.hidden = true;
                disconnect.hidden = false;
                connect.disabled = false;
                disconnect.disabled = false;
                update.disabled = false;
                //mostpop.disabled = false;
                this.session.window.disableInput(false);
                this.toolbar.setShowButtonClass("no-messages");
                //this.updateMostPopMenu();
                break;
            case "disconnected":
                this.toolbar.setStatus("Disconnected");
                //this.evaporateStatus();
                this.toolbar.update(null, null, null);
                this.session.window.setNick(null);
                this.session.window.update(null, null, null);
                this.session.window.disableInput(true);
                connect.hidden = false;
                disconnect.hidden = true;
                connect.disabled = false;
                disconnect.disabled = false;
                update.disabled = true;
                //mostpop.disabled = true;
                this.toolbar.setShowButtonClass("not-connected");
                this.toolbar.setJoinButtonClass("peeps-not-connected");
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
    
    // evaporateStatus : function(seconds, evap) {
    //     if (seconds == null) {
    //         seconds = 60;
    //     }
    //     var toolbar = this.toolbar;
    //     setTimeout(function() { toolbar.setStatus(""); }, seconds * 1000);
    // },
    
    showUsers: function() {
      var list = document.getElementById("pmogChatUsers");
      
      var count = list.getRowCount();
      
      if (count > 0) {
        while (count--){
          var item = list.getItemAtIndex(0);
          list.removeItemAt(list.getIndexOfItem(item));
        }
      }

      for (var i=0; i < this.ircclient.channel.users.length; i++) {
        
        var itm = list.appendItem(this.ircclient.channel.users[i], this.ircclient.channel.users[i]);
        itm.setAttribute("context", "userContextPopup");
      };

    },
    
    ircTimer : function() {
        if (this.ircclient) {
          try {
            this.ircclient.process();
          } catch (e) {
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
                    } catch (ex) {
                        this.writer.println("error: cannot send command to server '" + ex + "'");
                    }
                }
            } catch (ex) {
                log("error: ircclient puked out: " + ex);
                // Catch it and try to keep going.  :)
                //throw ex;
            }
            setTimeout(function() { Peekko.ircTimer(); }, 1000);
        }
    }
});
var Peekko = new peekko.Controller(); // rename 'Peekko' to 'peekko' or 'controller'.

window.addEventListener("load", function(e) { Peekko.onLoad(e); }, false);
window.addEventListener("unload", function(e) { Peekko.onUnload(e); }, false);
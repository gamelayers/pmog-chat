/**
    peekko.js
*/
/**
    @author Shane Celis <shane@peekko.com>
    Licensed under the GNU General Public License
*/
var peekko = {}; // peekko package

peekko.Session = function() {
    this.url = null;
    this.window = xul.chatWindow;
    this.channel = null;
};

peekko.ChatListener = Class.create();
Object.extend(peekko.ChatListener.prototype, {
   initialize : function() {

   },

   /**
     Called when a message is received from a person.
   */
   onMessage : function(message) {
     log("onMessage for ChatListener");
   },

   /**
     Called when a message is sent to you from a person.
   */
   onMessageToYou : function(message) {
     
   },

   /**
     Called when a message is sent from a person with your name in it.
   */
   onMessageAboutYou : function(message) {
     log("Message about you: " + message);
   }

});

peekko.ChatEvents = Class.create();
Object.extend(peekko.ChatEvents.prototype, {
    initialize : function() {
        //this.listeners = $PA(arguments);
        this.listeners = new Array();
    },

    addListener : function(listener) {
        this.listeners.push(listener);
    },

    message : function(message) {
        this.listeners.forEach(
            bind(function (listener) {
                try {
                    listener.onMessage.call(listener, message);
                } catch (ex) {
                    this.onException(ex, listener);
                }
            }, this));
    },

    messageToYou : function(message) {
        this.listeners.forEach(
            bind(function (listener) {
                try {
                    listener.onMessageToYou.call(listener, message);
                } catch (ex) {
                    this.onException(ex, listener);
                }
            }, this));
    },

    messageAboutYou : function(message) {
        this.listeners.forEach(
            bind(function (listener) {
                try {
                    listener.onMessageAboutYou.call(listener, message);
                } catch (ex) {
                    this.onException(ex, listener);
                }
            }, this));
    },

    onException : function(ex, listener) {
        log("chat events got an exception: " + ex);
    }

});

// For documentation purposes more than anything.
peekko.RoomListener = Class.create();
Object.extend(peekko.RoomListener.prototype, {

   initialize : function() { },

   onNoSuchRoom : function(channel) { },

   // Sneaking the pattern variable in there.
   onRoomUpdate : function(channel, count, topic, pattern) { },

   onRetryingUpdate : function(channel, errorMessage) { },

   onWaitingForUpdate : function(channel) { },

   onNotConnected : function(channel) { },

   onStartUpdate : function(channel) { },

   onEndUpdate : function(channel) { }
});

/**
    This class creates a queue to check the room info against.

    XXX - rename to RoomEvents
*/
peekko.RoomInfo = Class.create();
Object.extend(peekko.RoomInfo.prototype, {
    initialize : function() {
        this.queue = new Array();
        this.listReply = new Array();
        this.checkQueueRunning = false;
        this.channel = null; // this should really be called channelPattern
        this.updateRoomInfoRunning = false;
        this.timeout = 2000;
        this.listeners = new Array();
        this.ircclient = null;
        this.allToken = "__all__";
        this.updates = 0;
    },

    setIRCClient : function(ircclient) {
        this.ircclient = ircclient;
        if (this.ircclient != null) {
            this.ircclient.onListStart = bind(this.onListStart, this);
            this.ircclient.onListReply = bind(this.onListReply, this);
            this.ircclient.onListEnd = bind(this.onListEnd, this);
            this.ircclient.onServerLoadTooHeavy = bind(this.onServerLoadTooHeavy, this);
        }
        //this.queue = $PA();
        this.queue = new Array();
    },

    addListener : function(listener) {
        this.listeners.push(listener);
    },

    /**
        Listener Notifying Methods
        --------------------------
    */
    noSuchRoom : function(channel) {
        this.listeners.forEach(
            bind(function (listener) {
                try {
                    listener.onNoSuchRoom.call(listener, channel);
                } catch (ex) {
                    this.onException(ex, listener);
                }
            }, this));
    },

    roomUpdate : function(channel, count, topic, pattern) {
        this.listeners.forEach(
            bind(function (listener) {
                try {
                    listener.onRoomUpdate.call(listener, channel, count, topic, pattern);
                } catch (ex) {
                    this.onException(ex, listener);
                }
            }, this));
    },

    retryingUpdate : function(channel) {
        this.listeners.forEach(
            bind(function (listener) {
                try {
                    listener.onRetryingUpdate.call(listener, channel);
                } catch (ex) {
                    this.onException(ex, listener);
                }
            }, this));
    },

    waitingForUpdate : function(channel) {
        this.listeners.forEach(
            bind(function (listener) {
                try {
                    listener.onWaitingForUpdate.call(listener, channel);
                } catch (ex) {
                    this.onException(ex, listener);
                }
            }, this));
    },

    notConnected : function(channel) {
        this.listeners.forEach(
            bind(function (listener) {
                try {
                    listener.onNotConnected.call(listener, channel);
                } catch (ex) {
                    this.onException(ex, listener);
                }
            }, this));
    },

    endUpdate : function(channel) {
        this.listeners.forEach(
            bind(function (listener) {
                try {
                    listener.onEndUpdate.call(listener, channel);
                } catch (ex) {
                    this.onException(ex, listener);
                }
            }, this));
    },

    startUpdate : function(channel) {
        this.listeners.forEach(
            bind(function (listener) {
                try {
                    listener.onStartUpdate.call(listener, channel);
                } catch (ex) {
                    this.onException(ex, listener);
                }
            }, this));
    },

    /** End of Listener Notifying Methods */

    onException : function(ex, listener) {
        log("got an exception from the listener(" + listener + "): " + ex);
    },

    onListStart : function() {
        if (this.updateRoomInfoRunning) {
            this.listReply = new Array();
            this.waited = 0;
            this.updates = 0;
        } else {
            irc.Client.prototype.onListStart.apply(this.ircclient, arguments);
        }
    },

    onListReply : function(channel, count, topic) {
        if (this.updateRoomInfoRunning) {
            this.roomUpdate(channel, parseInt(count), topic, this.channel /* pattern */);
            this.updates++;
            //this.listReply.push([channel, count, topic]);
        } else {
            irc.Client.prototype.onListReply.call(this.ircclient, channel, count, topic);
        }
    },

    onListEnd : function() {
        if (! this.updateRoomInfoRunning) {
            irc.Client.prototype.onListEnd.call(this.ircclient);
            return;
        }
        this.endUpdate(this.channel);
        if (this.updates == 0) {
            // There is no room and therefore no people.
            this.noSuchRoom(this.channel);
        }
        this.updateRoomInfoRunning = false;
    },

    onServerLoadTooHeavy : function(oMsg) {
        if (! this.updateRoomInfoRunning) {
            irc.Client.prototype.onServerLoadTooHeavy.call(this.ircclient, oMsg);
        } else {
            this.retryingUpdate(this.channel, oMsg.body);

            // put it in the queue.
            this.update(this.channel);
        }
    },

    checkQueue : function(waited) {
        if (waited == null) {
            waited = 0;
        }
        this.checkQueueRunning = true;
        if (! this.updateRoomInfoRunning) {
            // start a new one
            if (this.queue.length == 0) {
                this.checkQueueRunning = false;
                this.updateRoomInfoRunning = false;
                log("exit 1");
                return;
            }
            // Talking to Peekko here is wonky; fix it.
            if (this.ircclient != null && Peekko.connectState == "connected") {
                this.channel = this.queue.shift();
                this.updateRoomInfoRunning = true;
                this.startUpdate(this.channel);
                if (this.channel != this.allToken) {
                    // List just one channel.
                    this.ircclient.list(this.channel);
                } else {
                    // List all the channels.
                    this.ircclient.list();
                }
            } else if (Peekko.connectState == "disconnected") {
                this.checkQueueRunning = false;
                var channel;
                while ((channel = this.queue.shift()) != null) {
                    this.notConnected(channel);
                }
                // Clear the queue.  No sense keeps its state around.
                this.queue = null;
                log("exit 3");
                return;
            } else {
                // There's no irc client running yet; just chill.
            }

        } else {
            // just wait
        }
        // Make sure we don't get stuck here because the server does something dumb.
        waited++;
        if (waited < 20) {
            setTimeout(bind(function() { this.checkQueue(waited) }, this), this.timeout);
        } else {

            // ignore the fact that we haven't got the reply and move on to the
            // next item in the queue.
            // XXX - not currently working that way.  ugh.
            this.updateRoomInfoRunning = false;
            this.checkQueueRunning = false;
            log("exit 2");
        }
    },

    update : function(channel) {
        try {
          if (channel && channel.length != 0 && this.ircclient != null) {
              this.queue.push(channel);
              this.waitingForUpdate(channel);
          }
          if (! this.checkQueueRunning) {
              this.checkQueue();
          }
        } catch (e) {
          log("Exception in update: " + e);
        }
    },

    updateAll : function() {
        this.update(this.allToken); // list all the channels.
    }

});

/**
    The class peekko.Config accesses the preferences.
*/
peekko.Config = Class.create();
Object.extend(peekko.Config.prototype, {
    initialize : function() {

    },

    getAudibleAlerts : function() {
        if (peekko.prefs) {
            return peekko.prefs.getBoolPref("extensions.pmog.chat.audible.alert.enabled");
        } else {
            return false;
        }
    },

    getAlertOnMessages : function() {
        if (peekko.prefs) {
            return peekko.prefs.getBoolPref("extensions.pmog.chat.audible.alert.on.messages");
        } else {
            return false;
        }
    },

    getAlertOnMessagesToMe : function() {
        if (peekko.prefs) {
            return peekko.prefs.getBoolPref("extensions.pmog.chat.audible.alert.on.messages.to.me");
        } else {
            return false;
        }
    },

    getAlertAllowance : function() {
        if (peekko.prefs) {
            return peekko.prefs.getIntPref("extensions.pmog.chat.audible.alert.allowance");
        } else {
            return 3;
        }
    },

    getAutoConnect : function() {
        if (peekko.prefs) {
            return peekko.prefs.getBoolPref("extensions.pmog.chat.auto.connect");
        } else {
            return false;
        }
    },

    browseInvisibly : function() {
        if (peekko.prefs) {
            return peekko.prefs.getBoolPref("extensions.pmog.chat.browse.invisibly");
        } else {
            log("error: unable to use preferences to get browse invisibly");
            return true;
        }
    },

    setFilterType : function(sType) {
        peekko.prefs.setCharPref("extensions.pmog.chat.filter.type", sType);
    },

    getFilterType : function() {
        if (peekko.prefs) {
            return peekko.prefs.getCharPref("extensions.pmog.chat.filter.type");
        } else {
            log("error: unable to use preferences to get filter type");
            return "domain";
        }
    },

    setStripSubdomain : function(bYes) {
        log('setStripSubdomain: ' + bYes);
        if (peekko.prefs) {
            peekko.prefs.setBoolPref("extensions.pmog.chat.filter.strip.subdomain", bYes);
        }
    },

    getStripSubdomain : function() {
        if (peekko.prefs) {
            return peekko.prefs.getBoolPref("extensions.pmog.chat.filter.strip.subdomain");
        } else {
            log("error: unable to use preferences to get strip subdomain");
            return true;
        }
    },

    resetIRCServer : function() {
        this._clearUserPref("extensions.pmog.chat.irc.host");
        this._clearUserPref("extensions.pmog.chat.irc.port");
    },

    _clearUserPref : function(pref) {
        if (peekko.prefs && peekko.prefs.prefHasUserValue(pref)) {
            peekko.prefs.clearUserPref(pref);
        }
    },

    _getPref : function(pref, defaultValue) {
        if (peekko.prefs) {
            switch (typeof(defaultValue)) {
                case "string":
                    return peekko.prefs.getCharPref(pref);
                case "boolean":
                    return peekko.prefs.getBoolPref(pref);
                case "number":
                    return peekko.prefs.getIntPref(pref);
                default:
                    log("error: unknown default value type " + typeof(defaultValue));
                    return defaultValue;
            }
        } else {
            log("error: unable to use preferences to get '" + pref + "'");
            return defaultValue;
        }
    },

    _setPref : function(pref, value) {
        if (peekko.prefs) {
            switch (typeof(value)) {
                case "string":
                    peekko.prefs.setCharPref(pref, value);
                case "boolean":
                    peekko.prefs.setBoolPref(pref, value);
                case "number":
                    peekko.prefs.setIntPref(pref, value);
                default:
                    log("error: unknown value type " + typeof(value));
            }
        } else {
            log("error: unable to use preferences to get '" + pref + "'");
        }
    },

    getTextForegroundColor : function() {
        return this._getPref("extensions.pmog.chat.color.text.foreground", "#c0c0c0");
    },

    getTextBackgroundColor : function() {
        return this._getPref("extensions.pmog.chat.color.text.background", "#101010");
    },

    getWindowForegroundColor : function() {
        return this._getPref("extensions.pmog.chat.color.window.foreground", "#ffffff");
    },

    getWindowBackgroundColor : function() {
        return this._getPref("extensions.pmog.chat.color.window.background", "#f3881b");
    },

    getFontSize : function() {
        return this._getPref("extensions.pmog.chat.color.font.size", 16);
    },

    prefAccepted : function() {
        // This is not a preference.  I'm just abusing the preferences system to do notifications.
        var value = this._getPref("extensions.pmog.chat.pref.accepted", 0);
        this._setPref("extensions.pmog.chat.pref.accepted", value + 1);
    }
});

/*
    This class is a nick iterator hooked up to the preferences.
*/
peekko.NickPrefHandler = function(aPrefs) {
    this.nicks = aPrefs;
    this.index = 0;

    this.hasNextNick = function() {
        return this.index < this.nicks.length;
    }

    this.nextNick = function() {
        if (! this.hasNextNick()) {
            throw "no more nicks left"
        }
        var pref = this.nicks[this.index];
        var nick = peekko.config._getPref(pref, "newbie");
        this.index++;
        return nick;
    }

    this.reset = function() {
        this.index = 0;
    }
}
// Create an always available instance of the Config class.
peekko.config = new peekko.Config();

/**
    Reference: http://simon.incutio.com/archive/2005/04/28/firefox
*/
peekko.listener =
{
    started : false,
    locationChanged : false,

    QueryInterface: function(aIID) {
       if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
           aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
           aIID.equals(Components.interfaces.nsISupports)) {
           return this;
       }
       throw Components.results.NS_NOINTERFACE;
    },

    onStateChange: function(aProgress, aRequest, aFlag, aStatus) {
        if(aFlag & Components.interfaces.nsIWebProgressListener.STATE_START) {
            // This fires when the load event is initiated
            this.started = true;
            Peekko.onLocationChangeStart();
        }
        if(aFlag & Components.interfaces.nsIWebProgressListener.STATE_STOP) {
            // This fires when the load finishes
            this.started = false;

            if (this.locationChanged) {
                Peekko.onLocationChangeEnd();
                this.locationChanged = false;
            }
        }
        return 0;
    },

    onLocationChange: function(aProgress, aRequest, aURI) {

        if (this.started) {
            Peekko.onLocationChange(aURI.spec);
            this.locationChanged = true;
        } else {
            Peekko.onTabChange(aURI.spec);
        }
        return 0;
    },

    onProgressChange: function() { return 0; },
    onStatusChange: function() { return 0; },
    onSecurityChange: function() { return 0; },
    onLinkIconAvailable: function() { return 0; }
};

if (Components) {
    peekko.prefs = Components.classes["@mozilla.org/preferences-service;1"]
                                    .getService(Components.interfaces.nsIPrefBranch2);

    peekko.sound = Components.classes["@mozilla.org/sound;1"]
                                    .getService(Components.interfaces.nsISound);

    peekko.url = Components.classes["@mozilla.org/network/standard-url;1"];

    peekko.sound.init();
}

// Reference: http://books.mozdev.org/html/mozilla-chp-5-sect-4.html
peekko.playSound = function(soundURL) {
    if (! Components) {
        return;
    }
    var url = peekko.url.createInstance();
    url = url.QueryInterface(Components.interfaces.nsIURL);
    url.spec = soundURL;
    peekko.sound.play(url);
}

peekko.StatsListener = Class.create();
peekko.StatsListener.prototype = Object.extend(new peekko.RoomListener(), {

    initialize : function() {
        //this.rooms = $PA();
        this.rooms = new Array();
        //this.tempRooms = $PA();
        this.tempRooms = new Array();
        this.allToken = "__all__"; // defined in peekko.RoomInfo
    },

    onStartUpdate : function(channel) {
        if (channel == this.allToken) {
            // Clear the channels.
            //this.tempRooms = $PA();
            this.tempRooms = new Array();
        }
    },

    onRoomUpdate : function(channel, count, topic, pattern) {
        if (pattern == this.allToken && ! irc.Channel.isPrivateChannel(channel)) {
            // Collect all the channels.
            this.tempRooms.push([channel, count, topic]);
        }
    },

    onEndUpdate : function(channel) {
        if (channel == this.allToken) {
            // Now sort them.
            this.rooms = this.tempRooms.sortBy(function(value) {
                // Return the people count of the room to sort by.
                return value[1];
            }).reverse();
        }
    }
});

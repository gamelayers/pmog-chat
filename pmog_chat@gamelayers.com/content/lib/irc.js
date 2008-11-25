/**
    irc.js
    
    Modified by Shane Celis <shane@peekko.com>
    
    Many thanks to Level Three Solutions.  If I hadn't had this to begin with, I may have
    never embarked on this project.
*/

// ------------------------------------------------------------
// JISIRC - Version 1.0 beta 1 - 9/25/2003
// JavaScript IRC Client with DCC Send/Chat Support
// by Level Three Solutions
// Version 1.0
// http://www.levelthreesolutions.com/jisirc/
// Released under GNU LESSER GENERAL PUBLIC LICENSE
// (freely distrubtable)
// ------------------------------------------------------------
// ------------------------------------------------------------
// DEPENDANCY: SocketWrench Freeware Edition ActiveX control
// by Catalyst Development Corporation
// Version 3.6
// http://www.catalyst.com/
// Freeware License
// The SocketWrench package is completely free, and may be 
// used to create freeware, shareware or commercial software
// packages without any runtime licensing fees or royalties. 
// (freely distrubtable)
// ------------------------------------------------------------
// DEPENDANCY: EsResolve ActiveX control
// by Brattberg Development
// Version 1.1 Build 6
// http://activex.sourceforge.net/esresolve.html
// released under the GNU LESSER GENERAL PUBLIC LICENSE
// (freely distrubtable)
// ------------------------------------------------------------
// DEPENDANCY: global.js
// by Level Three Solutions 
// Version N/A
// http://www.levelthreesolutions.com
// Released under GNU LESSER GENERAL PUBLIC LICENSE
// Included with EasyTMD
// (freely distrubtable)
// ------------------------------------------------------------

// Create an irc package.  Everything should go into this package.
var irc = {}; 

/**
    Resolves a hostname to an IP address (not necessary for the Mozilla sockets).
*/
irc.hostnameToIP = function(sHost) {
    var oDNS = new ActiveXObject("EsRESOLVE.EsResolveCtrl.1");
    oDNS.Address = sHost;
    oDNS.Resolve(sHost);
    return oDNS.IP;
}

irc.aSockets = new PArray(); // scoket control array
irc.aDCCChats = new PArray(); // dcc chat object array
irc.aDCCSends = new PArray(); // dcc send object array

irc.aCommands = [ // recognized commands
        ["ping", -1],
        ["nick", -2],
        ["join", -3],
        ["mode", -4],
        ["part", -5],
        ["quit", -6],
        ["kick", -7],
        ["topic", -8],
        ["privmsg", -9],
        ["notice", -10],
        ["error", -11],
        ["pong", -12],
        ["invite", -13]
    ];

irc.aChannelSpecifiers = {
    '@' : 'Secret',
    '*' : 'Private',
    '=' : 'Public'
}

irc.char1 = String.fromCharCode(1);
/**
    Parameterized command object.
*/
irc.Command = function(sCommand, aParams, sMessage, fEvent) {
    this.command = sCommand;
    this.params = aParams;
    this.message = sMessage;
    this.event = fEvent;
    
    this.rawCommand = function() {
        return this.command + " " +
               this.params.join(" ") + (this.message == null ? "" : " :" +
               this.message);
    }
}

/**
    Raw command object.  (Instance of duck typing.)
*/
irc.RawCommand = function(rawCommand, fEvent) {
    this.command = rawCommand;
    this.event = fEvent;
    
    this.rawCommand = function() {
        return this.command;
    }
}

/*
    This class is a nick iterator.  I did this so I could 
    hook up the iterator to the UI, and have it be more flexible.
*/
irc.NickHandler = function(aNicks) {
    this.nicks = aNicks;
    this.index = 0;
    
    this.hasNextNick = function() {
        return this.index < this.nicks.length;
    }
    
    this.nextNick = function() {
        if (! this.hasNextNick()) {
            throw "no more nicks left"            
        }
        var nick = this.nicks[this.index];
        this.index++;
        return nick;
    }
    
    this.reset = function() {
        this.index = 0;
    }
}

irc.HorribleNickGenerator = function() {
    var sounds = [ "yac", "pew", "n0", "dur", "brak", "maw", "mawk", "bla", 
                   "ubur", "kruz", "klat", "head", "face", "thing", "mabob", 
                   "O0b", "zle", "z0r", "hak", "sla", "doy", "bou", "twa", 
                   "ka", "o0t", "w0" ];
    this.hasNextNick = function() {
        return true;
    }
    
    this.nextNick = function() {
        var syllables = randomInt(3) + 1;
        var nick = "";
        for (var i = 0; i < syllables; i++) {
            nick += sounds[randomInt(sounds.length)];
        }
        nick += randomInt(20);
        return nick;
    }
    
    function randomInt(max) {
        return Math.floor(Math.random() * max);
    }
}

/**
    The Message class accepts a string that is assumed to be a line from the IRC server 
    and parses it.
*/
irc.Message = function(sMsg) {
    this.prefix = "";
    this.command = "";
    this.commandCode = 0;
    this.parameters = new PArray();
    this.body = "";
    // Get rid of these weird characters that are used for bold or other tricks.
    // Maybe I can come back to this and actually have it use the right attributes.
    // But I don't see anything in the RFC about it.
    
    sMsg = sMsg.replace(/\x02/g, "*"); // bold
    sMsg = sMsg.replace(/\x16/g, "-"); // reverse
    sMsg = sMsg.replace(/\x1f/g, "_"); // underline 

    // Strip off any trailing spaces.
    sMsg = sMsg.replace(/ +$/g, "");
    
    if (sMsg.indexOf(":") == 0) {
        this.prefix = sMsg.substring(1, sMsg.indexOf(" "));
        sMsg = sMsg.substring(sMsg.indexOf(" ")+1);
    }
    var aMsg = sMsg.split(" ");
    this.command = aMsg[0];
    this.lccommand = aMsg[0].toLowerCase();
    var index = sMsg.indexOf(":");
    if (index == -1) {
        // If we couldn't find a second colon...
        this.body = null;
    } else {
        this.body = sMsg.substring(index + 1);
        this.body = this.body.substring(0, this.body.length);
    }
    this.parameters = sMsg.substring(sMsg.indexOf(" ")+1);
    index = this.parameters.indexOf(":");
    if (index != -1) {
        this.parameters = this.parameters.substring(0, this.parameters.indexOf(":"));
    }
    this.parameters = $PA(this.parameters.split(" "));
    if (this.parameters[this.parameters.length - 1].length == 0) {
        // Pop off the null string.
        this.parameters.pop();
    }
    this.nick = this.prefix.substring(0, this.prefix.indexOf("!"));

    for (var i=0; i<irc.aCommands.length; i++) {
        if (this.lccommand == irc.aCommands[i][0]) {
            this.commandCode = irc.aCommands[i][1];
            break;
        }
    }
    if (this.commandCode == 0) { // unlisted command
        this.commandCode = this.command * 1;
        if (this.commandCode.isNaN) this.commandCode = 0;
    }
    this.toString = function() {
        return "prefix: " + this.prefix + 
               "\ncommand: " + this.command + 
               "\ncommandCode: " + this.commandCode + 
               "\nparameters: " + this.parameters.join(", ") +
               "\nbody: " + this.body + "\n";
    }
}

irc.Channel = function(name) {

    this.clear = function(name) {
        this.name = name;
        this.modes = new PArray();
        this.users = new PArray();
        this.limit = null;
        this.operator = null;
        //this.key = null;
    }
    
    this.clear(name);
    
    this.toString = function() {
        return this.name + (this.modes.length == 0 ? "" : " +" + this.modes.join(''));
    }
    
    this.setMode = function(modes) {
        this.modes = new PArray();
        this.changeMode(modes);
    }
    
    this.addMode = function(mode) {
        if (! this.modes.contains(mode)) {
            this.modes.push(mode);
        }
    }
    
    this.removeMode = function(mode) {
        if (this.modes.contains(mode)) {
            this.modes = this.modes.without(mode);
        }
    }
    
    this.changeMode = function(change) {
        var doThis = null;
        for (var i = 0; i < change.length; i++) {
            var token = change.charAt(i);
            switch (token) {
                case "+":
                    doThis = this.addMode;
                    break;
                case "-":
                    doThis = this.removeMode;
                    break;
                default:
                    if (doThis) {
                        doThis.call(this, token);
                    }
            }
        }
    }
    
    this.hasMode = function(mode) {
        return this.modes.contains(mode);
    }
    
    this.toString = function() {
        return this.name;
    }

    /**
        Returns that this channel is private (only according to peekko).
    */
    this.isPrivate = function() {
        return irc.Channel.isPrivateChannel(this.name);
    }
    
    this.isOperator = function() {
        if (this.operator != null) {
            return this.operator;
        } else {
            return false;
        }
    }
    
    this.hasUser = function(user) {
        return this.users.contains(user);
    }
    
    this.addUser = function(user) {
        //log("addUser: " + user);
        if (! this.hasUser(user)) {
            this.users.push(user)
        }
    }
    
    this.removeUser = function(user) {
        if (this.hasUser(user)) {
            this.users = this.users.without(user);
        }
    }
    
    this.clearUsers = function() {
        this.users = new PArray();
    }
}

// static method
irc.Channel.isPrivateChannel = function(channel) {
    if (channel != null) {
        return channel.indexOf("#_") == 0;
    } else {
        return false;
    }
}


irc.Client = Class.create();
irc.Client.prototype = {
    
    initialize : function(oNickHandler, sUserName, sRealName, peekko) {
        this.nickHandler = oNickHandler;//new irc.NickHandler(aNicks);
        this.nick = null;
        this.foundANick = false;
        this.userName = sUserName;
        this.realName = sRealName;
        this.hostName = null;
        this.port = 0;
        this.sock = -1;
        this.status = 0;
        this.connected = false;
        this.connectStartTime = 0;
        //this.out = new io.LogWriter();
        this.out = new io.ChatWriter("console");
        this.err = new io.LogWriter();
        //this.err = new io.ChatWriter();
        this.channel = new irc.Channel();
        this.channels = $PA();
        this.timeout = 30;
        this.novice = false;

        var defaultHandler = dirtyBind(this.defaultHandler, this);
        // Event handlers (a few).

        this.onDCCSend = defaultHandler;
        this.onDCCSendConnect = defaultHandler;
        
        this.peekko = peekko;
    },
    
    print: function(channel, msg) {
      var cSentTo = this.cleanChannelName(channel);
      Peekko.session.window.ioMap.get(cSentTo).println(msg);
    },
    
    broadcast: function(msg) {
      var ios = Peekko.session.window.ioMap.values;
      for (var i = ios.length - 1; i >= 0; i--){
        ios[i].println(msg);
      }
    },
    
    cleanChannelName: function(channel) {
      return channel.replace(/#/, '');
    },

    /**
        Parses and executes a command, sending any requests to the server if
        necessary.
    */
    runCommand : function() {
        var commands = $PA(arguments);
        var command;
        while ((command = commands.shift()) != null) {
            var oCommand = this.executeLocalInput(command);
            if (oCommand) {
                // If there's a remote command...
                this.sendCommandObject(oCommand);
            }
        }
    },
    
    defaultChannel : function() {
        return this.channel.name;
    },
    
    joinChannel : function(channel) {
        this.sendCommand("JOIN", [channel]);
    },
    
    partChannel : function(channel) {
        this.sendCommand("PART", [channel]);
    },
    
    who : function(channel) {
        this.sendCommand("WHO", [channel]);
    },
    
    list : function(channel) {
        if (channel) {
            this.sendCommand("LIST", [channel]);
        } else {
            this.sendCommand("LIST", $PA());
        }
    },
    
    /**
        Returns "you" if it's given your current nick.  Good for substituting "you" in various results.
    */
    yourNick : function(nick) {
        return this.nick == nick ? "you" : nick;
    },
    
/**
    Event Handlers
    ==============
*/

    onConnect : function() {
        this.out.println("*** Connected to " + this.hostName);
    },
    
    onDisconnect : function() {
        this.out.println("*** Disconnected from " + this.hostName);        
    },
    
    onSentMessage : function(sentTo, message) {
      var cSentTo = sentTo.replace(/#/, '');
      
      var tab = Peekko.session.window.getChannelTab(sentTo);
      if (tab === undefined) {
        tab = Peekko.session.window.addTab(sentTo);
      }
      Peekko.session.window.selectTab(tab);
      
      Peekko.session.window.ioMap.get(cSentTo).createMessage(sentTo, this.nick, message);
      Peekko.session.window.ioMap.get(cSentTo).scrollDown();
    },

    onNickChange : function(newNick, oldNick) {
        this.broadcast("*** " + oldNick + " is known as " + newNick);
        for (var i = channelTreeView.visibleData.length - 1; i >= 0; i--){
          if (channelTreeView.isContainer(i)) {
            var cKey = channelTreeView.visibleData[i][0];
            var cData = channelTreeView.childData[cKey].indexOf(oldNick);
            if (cData != -1) {
              channelTreeView.childData[cKey][cData] = newNick;
            }
          }
        }
        
        for (var i = channelTreeView.visibleData.length - 1; i >= 0; i--){
          if (channelTreeView.visibleData[i][0] === oldNick) {
            channelTreeView.visibleData[i][0] = newNick;
            channelTreeView.treeBox.invalidate();
          }
        }
    },
    
    onMyNickChange : function(newNick, oldNick) {
        if (oldNick) {
            this.out.println("*** " + oldNick + " is known as " + newNick);
        } else {
            this.out.println("*** your nick is " + newNick);
        }
    },

    // Rename to onMessage?
    onText : function(channel, nick, message) {
        if (channel == this.nick) {
            // Private message
            //this.out.println("*" + nick + "* " + message);
            var privChat = Peekko.session.window.getChannelTab(nick);
            if (privChat === undefined) {
              privChat = Peekko.session.window.addTab(nick);
            }
            Peekko.session.window.ioMap.get(nick).createMessage(channel, nick, message);
            Peekko.session.window.ioMap.get(nick).scrollDown();
            //Peekko.session.window.selectTab(nick);
        } else {
            // // Public message to the channel
            // if (this.channel.name == channel) {
            //     //this.out.println("<" + nick + "> " + message);
            //     this.out.createMessage(channel, nick, message);
            // } else {
            //     //this.out.println("<" + nick + ":" + channel + "> " + message);
            //     this.out.createMessage(channel, nick, message);
            // }
            var cChannel = channel.replace(/#/, '');
            Peekko.session.window.ioMap.get(cChannel).createMessage(channel, nick, message);
            Peekko.session.window.ioMap.get(cChannel).scrollDown();
        }
        //this.out.scrollDown();
    },

    onNotice : function(message, from) {
        if (from) {
            this.out.println("-" + from + "- " + message);
        } else {
            this.out.println(message);
        }
    },

    onActionMessage : function(nick, message) {
        this.out.println("* " + nick + message);
    },
    
    onUnhandledMessage : function(oMsg) {
        this.printBody(oMsg);
    },
    
    onErrorMessage : function(msg) {
        this.broadcast("*** " + msg);        
    },

    onJoin : function(nick, channel) {
      var cSentTo = channel.replace("#", "");
      var channelTab = Peekko.session.window.getChannelTab(channel);
      if (channelTab === undefined) {
        channelTab = Peekko.session.window.addTab(channel);
      }
      Peekko.session.window.selectTab(channelTab);
      //this.out.println("*** " + this.yourNick(nick) + " joined channel " + channel);
      //Peekko.session.window.ioMap.get(cSentTo).println("*** " + this.yourNick(nick) + " joined channel " + channel);
      this.print(channel, "*** " + this.yourNick(nick) + " joined channel " + channel);
      if (this.nick !== nick) {
        channelTreeView.addPlayer(channel, nick);
      }
    },
    
    onChannelChange : function(channel) {
        //noop;
    },

    onPart : function(nick, channel) {
        this.print(channel, "*** " + this.yourNick(nick) + " left channel " + channel);
        if (this.nick !== nick) {
          channelTreeView.removePlayer(channel, nick);
        }
    },

    onWhoReply : function(oMsg) {
        var params = oMsg.parameters;
        this.out.println(params[1] + " " + params[5] + " " + params[6] + " " 
                         + params[2] + "@" + params[3] + " (" + oMsg.body + ")");
    },

    onWhoReplyEnd : function() {
    },
        
    onMOTD : function(body) {
        this.out.println("*** " + body);
    },
    
    onDCCChat : function(sNick) {
        this.out.println("*D* DCC CHAT request received from " + sNick);
    },
    
    onDCCChatConnect : function(oChat) {
        
    },
    
    onListStart : function() {
        this.out.println("*** Channel Users Topic");
    },    

    onListReply : function(channel, count, topic) {
        if (this.novice && irc.Channel.isPrivateChannel(channel)) {
            // Don't show any private channels to the term if I'm marked as novice.
            return;
        }
        this.out.println("*** List Reply: " + channel + " " + count + " " + topic);
    },
    
    onListEnd : function(success) {
    },
    
    onNameReply : function(sPublic, sChannel, aNames) {
        this.print(sChannel, sPublic + " " + sChannel + ": " + aNames.join(', '));
    },
    
    onNameReplyEnd : function(oMsg) {
      Peekko.showUsers();
    },
    
    onChannelModeChange : function(change, channel, source) {
        //if (! this.novice) {
            this.out.println("*** Mode change \"" + change + "\" on channel " + channel + " by " + source);
        //}
        var oChannel = this.getChannel(channel);
        if (oChannel) {
            oChannel.changeMode(change);
        }
    },
    
    onUserModeChange : function(change, user, source) {
        //if (! this.novice) {
            this.out.println("*** Mode change \"" + change + "\" for user " + user + " by " + source);
        //}
    },    
    
    onUpdate : function(status) {
        //this.err.println("status: " + status);
    },
    
    onServerLoadTooHeavy : function(oMsg) {
        this.printBody(oMsg);
    },
    
    // Timed out connecting to server.
    onTimeout : function(timeout) {
        this.err.println("timed out after " + timeout + " seconds");
    },
    
    onPong : function(oMsg) {
        this.pongReceived = true;
    },
    
    onTopicChange : function(nick, channel, topic) {
        this.print(channel, "*** " + nick + " has changed the topic on channel " 
                         + channel + " to " + topic);
    },
    
    onNoMoreNicks : function() {
        this.out.println("*** all the nicknames you selected were taken.");
        this.disconnect();
    },
    
    onQuit : function(nick, body) {
        this.out.println("*** Signoff: " + nick + " (" + body + ")");
    },
    
    onKick : function(channel, who, by, comment) {
        this.out.println("*** " + who + " has been kicked off channel " 
                         + channel + " by " + by + " (" + comment + ")");
    },
    
    onJoinedTooManyChannels : function(oMsg) {
        this.printBody(oMsg);
    },
    
    /**
        Called when you initially register nick that is accepted by the server.
    */
    onRegistered : function() {
        //noop
    },
    
    defaultHandler : function() {
    },
    
    printBody : function(oMsg) {
        this.out.println("*** " + oMsg.body);
    },    
    
    printRestParams : function(oMsg) {
        this.out.println("*** " + oMsg.parameters.rest().join(" "));
    },
    
    printRestAndBody : function(oMsg) {
        this.out.println("*** " + oMsg.parameters.rest().join(" ") + " " + oMsg.body);
    },
    
/**
    End of Event Handlers
    =====================
**/

    connect : function(sHost, iPort) {
        this.hostName = sHost;
        this.port = iPort;
        this.sock = irc.aSockets.length;
        this.connectStartTime = (new Date()).getTime();

        irc.aSockets[this.sock] = this.openSocket(sHost, iPort);
        
        this.status = 1;
    },
    
    openSocket : function(sHost, iPort) {
       // XXX - Need some means of dispatching or testing for either socket type.
        //irc.aSockets[this.sock] = new net.ActiveXSocket();
        var sock = new net.MozillaSocket();
        sock.open(sHost, iPort);
        return sock;
    },
    
    read : function() {
        try {
            var data = irc.aSockets[this.sock].read();
            //this.err.println("READ: " + data);
            this.lastRead = new Date().getTime();
            return data;
        } catch (ex) {
            // Since it's non-blocking, we just return an empty string. 
            //this.err.println("read ex: " + ex);
            return "";
        }
    },

    send : function(s) {
        this.err.println("SEND: " + s);
        irc.aSockets[this.sock].write(s);
    },
 
    isConnected : function() {
        return irc.aSockets[this.sock].isAlive();
    },
    
    isOperator : function() {
        if (this.channel.operator != null) {
            return this.channel.operator;
        } else {
            return false;
        }
    },
    
    getChannel : function(name) {
        return this.channels.find(function(oChannel) { return oChannel.name == name; });
    },
    
/*  isConnected : function() {
        try {
            return irc.aSockets[this.sock].Connected;
        } catch (e) {
            return false;
        }
    }*/

    // **** IRC client functionality ****
    login : function() {
        if (!this.isConnected) return;
        //Command: NICK
        //Parameters: <nickname>
        this.sendCommand("NICK", [this.nickHandler.nextNick()]);
        //Command: USER
        //Parameters: <user> <mode> <unused> : <realname>
        this.sendCommand("USER", [this.userName, 8, "*"], this.realName);
    },
    
    disconnect : function(sMessage, bDCC) {
        if (this.status > 0 && this.status < 4) {
            this.sendCommand("QUIT", $PA(), sMessage);
            if (bDCC) {
                for (var i=0; i<irc.irc.aDCCChats.length; i++) {
                    irc.irc.aDCCChats[i].disconnect();
                    irc.aSockets[irc.irc.aDCCChats[i].socket] = null;
                    irc.aDCCChats[i] = null;
                }
                for (var i=0; i<irc.aDCCSends.length; i++) {
                    irc.aDCCChats[i].disconnect();
                    irc.aSockets[irc.aDCCChats[i].socket] = null;
                    irc.aDCCChats[i] = null;
                }
            }
        }       
        this.onDisconnect(this.nick);
    },

    process : function() { // called from app specific timer
        if (irc.aDCCSends.length) 
            for (var i=0; i<irc.aDCCSends.length; i++) 
                if (irc.aDCCSends[i]) 
                    irc.aDCCSends[i].process();
        switch (this.status) {
        case 1 : // connecting
            if (this.isConnected()) {
                this.login();
                this.status = 2;
            }
            // Need a timeout
            var now = new Date().getTime();
            if ((now - this.connectStartTime)/1000 > this.timeout) {
                this.onTimeout(this.timeout);
                this.status = 4;
            }
            break;
        case 2 : // connected but not logged in
        case 3 : // connected and logged in
            if (! this.isConnected()) {
                this.err.println("connect suddenly returned failure");
                this.onDisconnect();
                this.status = 4;
            }
            var sRead = this.read();
            if (sRead.length) {
                var lines = sRead.split(/[\n\r]+/);
                for (var i = 0; i < lines.length; i++) {
                    this.processMsg(lines[i]);
                }
            }
            var now = new Date().getTime();
            // We'll only send a ping when it reaches double our current timeout.
            if ((now - this.lastRead)/1000 > (this.timeout * 2)) {
                // We're faking a read, so we don't call this again.
                this.lastRead = now;
                this.pongReceived = false;
                this.err.println("sending out a ping; testing to see if we're still connected")
                // I don't know that that is technically right.
                this.sendCommand("PING", $PA(), "me");
                
                setTimeout(bind(this.checkForPong, this), this.timeout * 1000);
            }
            break;
        case 4 : // disconnecting
            try {
                irc.aSockets[this.sock].close();
            } catch (e) {
                this.err.println("error closing socket: " + e);
            }
            irc.aSockets[this.sock] = null;
            this.connected = false;
            this.status = 0;
            break;
        }
        this.onUpdate(this.status);
    },

    msg : function(sNick, sMsg) {
        this.sendCommand("PRIVMSG", [sNick], sMsg);
    },

    ctcp : function(sNick, sMsg) {
        var s = String.fromCharCode(1);
        this.sendCommand("PRIVMSG", [sNick], s + sMsg + s);
    },
    
    argsOrChannel : function(args) {
        return args.length == 0 ? [ this.defaultChannel() ] : args;
    },
    
    /**
        Executes anything that can be done locally, and returns a command object 
        that can be sent to the IRC server to do some activity remotely.
    */
    executeLocalInput : function(sInput) {
        var result = null;
        var reg = /^\/(\S+)\s*(.*)?$/;
        var m = reg.exec(sInput);
        if (m) {
            var command = m[1];
            var body = m[2];
            var args;
            if (body) {
                args = $PA(body.split(/\s/));  // Don't /\s+/ otherwise we'll collapse the spaces.
            } else {
                args = $PA();
            }
            

            //this.err.println("command = " + command);
            //this.err.println("body = " + body);
            //this.err.println("args = " + args.join(', '));

            switch (command.toLowerCase()) {
                case "channel":
                    if (this.channel.name) {
                        this.out.println("*** Current channel " + this.channel.name);
                    } else {
                        this.out.println("*** No current channel");
                    }
                    if (this.channels.length == 0) {
                        this.out.println("*** You are not on any channels");
                    } else {
                        this.out.println("*** You are on the following channels:");
                    }
                    for (var i = 0; i < this.channels.length; i++) {
                        if (this.novice && this.channels[i].isPrivate()) {
                            continue;
                        }
                        this.out.println("***     " + this.channels[i]);
                    }
                    result = null;
                    break;
                case "clear":
                    if (this.out.clear) {
                        this.out.clear();
                    }
                    result = null;
                    break;
                case "ctcp":
                    result = new irc.Command("PRIVMSG", [ args[0] ], 
                                             irc.char1 + args[1].toUpperCase() + irc.char1);
                    break;
                case "j":
                case "join":
                    if (args.length != 1) {
                        this.out.println("*** join <channel>");
                        return null;
                    }
                    var channel = args[0];
                    var oChannel = this.getChannel(channel);
                    if (oChannel) {
                        this.channel = oChannel;
                        //this.out.println("*** You are now talking to channel " + this.channel.name);
                        this.onChannelChange(this.channel.name);
                        result = null;
                    } else {
                        result = new irc.Command("JOIN", args);
                    }
                    break;
                case "who":
                case "w":
                    result = new irc.Command("WHO", this.argsOrChannel(args));
                    break;
                case "leave":
                case "l":
                case "part":
                case "p":
                    result = new irc.Command("PART", this.argsOrChannel(args));
                    break;
                case "me":
                    //var channel = this.defaultChannel();
                    var channel = Peekko.session.window.tabcontainer.selectedTab.label;
                    if (channel == null) {//|| Peekko.session.window.tabcontainer.selectedTab.value !== "private") {
                        this.out.println("*** message not sent; join a channel first.");
                        return null;
                    }
                    var token = String.fromCharCode(1);
                    result = new irc.Command("PRIVMSG", [ channel ], token + "ACTION " + body + token);
                    var out = this;
                    var msg = "* " + this.nick + " " + body;
                    result.event = function() {
                        out.print(channel, msg);
                    }
                    break;
                case "msg":
                    var sendto = args.shift();
                    var msg = args.join(' ');
                    
                    // var tab = Peekko.session.window.getChannelTab(sendTo);
                    // if (tab == null) {
                    //   tab = Peekko.session.window.addTab(sendTo);
                    // }
                    // Peekko.session.window.selectTab(tab);
                    // This parsing will eat up any extra whitespace.  (Extra whitespace isn't shown anyhow
                    // in the html.)
                    result = new irc.Command("PRIVMSG", [ sendto ], msg);
                    var ircclient = this;
                    /*var env = { sendto : sendto, msg : msg, ircclient : this };
                    var fn = function() {
                        this.ircclient.onSentMessage(this.sendto, this.msg);
                    }
                    result.event = dirtyBind(fn, env);
                    */
                    result.event = function() {
                        ircclient.onSentMessage(sendto, msg);
                    }
                    break;
                // Maybe use double quotations to send raw commands too.
                //case "/":
                case "names":
                    result = new irc.Command("NAMES", this.argsOrChannel(args));
                    break;
                case "quote":
                    // Return a raw irc command to the server.
                    result = new irc.RawCommand(body);
                    break;
                case "quit":
                    this.disconnect();
                    break;
                case "set":
                    if (args[0] == "novice") {
                        if (args[1] == "on") {
                            this.novice = true;
                        } else if (args[1] == "off") {
                            this.novice = false;
                        } else {
                            this.out.println("*** set novice <on|off>");
                        }
                    } else {
                        this.out.println("*** set novice <on|off>");                        
                    }
                    result = null;
                    break;
                case "topic":
                    var sendto = args.shift();
                    var msg = args.join(' ');
                    result = new irc.Command("TOPIC", [ sendto ], msg);
                    break;
                case "notice":
                    var sendto = args.shift();
                    var msg = args.join(' ');
                    var ircclient = this;
                    result = new irc.Command("NOTICE", [ sendto ], msg);
                 /*   var env = { sendto : sendto, msg : msg, ircclient : this };
                    var fn = function() {
                        this.ircclient.println("-> -" + this.sendto + "- " + this.msg);
                    }
                    result.event = dirtyBind(fn, env);*/
                    result.event = function() {
                        ircclient.out.println("-> -" + sendto + "- " + msg);                        
                    }
                    break;
                default:
                    result = new irc.Command(command, args);
                    break;
            }
        } else {
            var reg = /^\s*\[([^\]]*)\]\s*$/;
            var m = reg.exec(sInput);
            if (m) {
                // It's an action quote.
                return this.executeLocalInput("/me " + m[1]);
            }
            // Not a command, so it must be a message.  Send it to the default channel.
            //var channel = this.defaultChannel()
            var channel = Peekko.session.window.tabcontainer.selectedTab.label;
            var ircclient = this;
            if (channel == null) {
                this.out.println("*** message not sent; join a channel first.");
                return null;
            }
            result = new irc.Command("PRIVMSG", [ channel ], sInput);
            // Emulating a closure with this trick.
            //var env = { channel : channel, input : sInput, ircclient : this };
            result.event = function() {
                ircclient.onSentMessage(channel, sInput);
            };
            // Why doesn't bind work here?
            //result.event = fn.bind(env);
            //result.event = dirtyBind(fn, env);
        }
        return result;
    },
    
    sendCommandObject : function(command) {
        this.sendCommandRaw(command.rawCommand());
        if (command.event) {
            command.event();
        }
    },

    sendCommand : function(sCommand, aParams, sMessage) {
        this.sendCommandObject(new irc.Command(sCommand, aParams, sMessage));
    },
    
    sendCommandRaw : function(sCommand) {
        this.send(sCommand + "\r\n");
    },
    
    checkForPong : function() {
        if (! this.pongReceived) {
            this.err.println("no pong received");
            this.onDisconnect();
            this.status = 4;            
        }
    },


    /**
        Reference: http://www.irchelp.org/irchelp/rfc/rfc2812.txt
    */
    processMsg : function(sMsg) {
        //this.err.println("processing message: " + sMsg);
        if (sMsg == "" || sMsg.match(/^\s*$/)) {
            return;
        }
        var oMsg = new irc.Message(sMsg);
        switch (oMsg.commandCode) {
        case -1 : // PING
            this.sendCommand("PONG", [oMsg.body]);
            break;
        case -2 : // NICK
            if (oMsg.nick == this.nick) {
                this.onMyNickChange(oMsg.body, oMsg.nick);
                this.nick = oMsg.body;
                this.foundANick = true;
            } else {
                this.onNickChange(oMsg.body, oMsg.nick);
            }
            break;
        case -3 : // JOIN
            var nick = oMsg.nick;
            var channel = oMsg.body;
            if (nick == this.nick) {
                var oChannel = new irc.Channel(channel);
                this.channels.push(oChannel);
                // XXX - not good enough
                if (! oChannel.isPrivate()) {
                    this.channel = oChannel;
                    this.onChannelChange(oChannel.name);
                }
            } else {
                // it's somebody else
                var oChannel = this.getChannel(channel);
                if (oChannel) {
                    oChannel.addUser(nick);
                }
            }
            this.onJoin(nick, channel);
            break;
        case -4 : // MODE
            var source = (oMsg.nick == "" ? oMsg.prefix : oMsg.nick);
            if (oMsg.parameters) {
                var channel = oMsg.parameters.shift();
            }
            if (oMsg.body == null) {
                this.onChannelModeChange(oMsg.parameters.join(" "), channel, source);
            } else {
                this.onUserModeChange(oMsg.body, channel, source);               
            }
            break;
        case -5: // PART
            // Part must behave differently depending on the server.  Yuck.
            //var channel = oMsg.body;
            var channel = oMsg.parameters[0];
            var nick = oMsg.nick;
            if (nick == this.nick) {
                this.channels = this.channels.reject(function(oChannel) { 
                                    return oChannel.name == channel }
                                );

                if (this.channels.length > 0) {
                    if (this.channel == channel) {
                        // If we're parting our current channel.
                        this.channel = this.channels.detect(function(channel) { return ! channel.isPrivate() });
                        if (this.channel == null) {
                            this.channel = new irc.Channel();
                        }
                        this.onChannelChange(this.channel.name);
                    }
                } else {
                    this.channel.clear();
                    this.onChannelChange(null);
                }
            } else {
                // it's somebody else
                var oChannel = this.getChannel(channel);
                if (oChannel) {
                    oChannel.removeUser(nick);
                }
            }
            this.onPart(nick, channel);
            break;
        case -6 : // QUIT
            // hmmm, have to go through each channel since there's no clear indication what
            // channel the user was in.
            var nick = oMsg.nick;
            this.onQuit(nick, oMsg.body);
            
            this.channels.each(function(oChannel) {
                oChannel.removeUser(nick);
            });
            break;
        case -7 : // KICK
            var channel = oMsg.parameters[0];
            var nick = oMsg.nick;
            var oChannel = this.getChannel(channel);
            if (oChannel) {
                oChannel.removeUser(nick);
            }
            this.onKick(channel, oMsg.parameters[1], nick, oMsg.body);
            break;
        case -8 : // TOPIC
            //this.err.println("PROCESSING TOPIC MESSAGE IN IRC.JS");
            this.onTopicChange(oMsg.nick, oMsg.parameters[0], oMsg.body);
            break;
        case -9 : // PRIVMSG
            if (oMsg.body.charCodeAt(0) == 1) { //ctcp
                oMsg.body = oMsg.body.substring(1, oMsg.body.length-1);
                var ctcpCommand = oMsg.body.split(" ")[0];
                switch (ctcpCommand) {
                case "ACTION":
                    var message = oMsg.body.substring(oMsg.body.indexOf(" "));
                    this.onActionMessage(oMsg.nick, message);
                    break;
                case "PING":
       /*             this.sendCommand("NOTICE", [ oMsg.parameters[0] ], 
                                 c1 + "*/
                    break;
                case "DCC":
                    var sNick = oMsg.nick;
                    var sType = oMsg.body.split(" ")[1];
                    //this.err.println("Nick: " + sNick + "\nUser: " + sHost + "\nType:" + sType + "\nPort: " + iPort + "\n");
                    if (sType == "CHAT") {
                        var sHost = oMsg.body.split(" ")[3];
                        var iPort = oMsg.body.split(" ");
                        iPort = iPort[iPort.length-1];
                        iPort = iPort * 1;
                        if (this.onDCCChat(sNick)) {
                            var oDCC = new irc.dcc.Chat(sNick, sHost, iPort, true, this);
                            oDCC.index = irc.aDCCChats.length;
                            irc.aDCCChats[irc.aDCCChats.length] = oDCC;
                            //oDCC = this.onDCCChatConnect(oDCC);
                            this.onDCCChatConnect(oDCC);                            
                        }
                    } else if (sType == "SEND") {
                        var sHost = oMsg.body.split(" ")[3];
                        var iPort = oMsg.body.split(" ")[4];
                        iPort = iPort * 1;
                        var sName = oMsg.body.split(" ")[2];
                        var iSize = oMsg.body.split(" ")[5];
                        if (this.onDCCSend(sNick, sName, iSize)) {
                            var oDCC = new irc.dcc.Send(sNick, sHost, iPort, true, sName, "", iSize, this);
                            oDCC.index = irc.aDCCSends.length;
                            irc.aDCCSends[irc.aDCCSends.length] = oDCC;
                            this.onDCCSendConnect(oDCC);
                            try {
                                oDCC.connect();
                            } catch (e) {
                                this.err.println("DCC error: can't connect to " + oDCC.nick + "\n");
                            }
                        }
                    } else {
                        this.err.println("Unknown DCC type '" + oMsg.body + "'");
                    }
                    break;
                case "VERSION":
                    var c1 = String.fromCharCode(1);
                    this.sendCommand("NOTICE", [ oMsg.nick ], 
                                     c1 + "VERSION Peekko Chat " + peekko.Version + " - Shane Celis" + c1);
                    break;
                default:
/*                    this.out.println("*** CTCP " + ctcpCommand + " reply from " + oMsg.nick + ": " +
*/                                     
                    this.err.println("Cannot dispatch on '" + oMsg.body +"'");
                }
            } else {
                this.onText(oMsg.parameters[0].toLowerCase(), oMsg.prefix.split("!")[0], oMsg.body);
            }
            break;
        case -10 : // NOTICE
            this.onNotice(oMsg.body, oMsg.nick == "" ? null : oMsg.nick);
            break;

        case -11 : // ERROR
            if (oMsg.body.indexOf("Closing Link") > -1) {
                this.status = 4;
                this.onDisconnect();
            }
            break;
        case -12 : // PONG
            this.onPong(oMsg);
            break;
        case -13 : // INVITE
            var fromNick = oMsg.nick;
            var toNick = oMsg.parameters[0];
            this.out.println("*** " + fromNick + " invites " + this.yourNick(toNick) + " to channel " + oMsg.body);
            break;
        case 000 : // other messages with no command code
            break;
        case 001 : //server welcome message
            this.out.println("Welcome " + oMsg.parameters[0] );
            this.connected = true;
            this.nick = oMsg.parameters[0];
            this.foundANick = true;
            this.onConnect(oMsg.parameters);
            this.onMyNickChange(this.nick);
            this.onRegistered();
            this.status = 3;
            break;
        case 002 :
        case 003 :
        case 004 :
        case 005 :
            if (!this.connected) {
                this.connected = true;
                this.onConnect();
                this.status = 3;
            }
            break;
        case 221:
            this.out.println("*** Your user mode is " + oMsg.parameters[1]);
            break;
        // I want all these handled by the unhandledMessage(), I think.
/*
        case 250 : // STATSDLINE
        case 251 : // LUSERCLIENT
*/
        case 252 : // LUSEROP
        case 253 : // LUSERUNKNOWN
        case 254 : // LUSERCHANNELS
            this.printRestAndBody(oMsg);
            break;
/*
        case 255 : // LUSERME
*/
        case 254 :
            this.out.println("*** " + oMsg.parameters[1] + " channels have been formed");
            break;
        case 263 : // Server load is too heavy.
            this.onServerLoadTooHeavy(oMsg);
            break;
/*
        case 265 : // local users
        case 266 : // global users
            break;
*/
        case 301 : // away
            this.print(oMsg.body, "*** " + oMsg.parameters[1] + " is away: " + oMsg.body);
            break;
        case 311 : // whois #1
            var params = oMsg.parameters;
            this.out.println("*** " + params[1] + " is " + params[2] + "@" + params[3] + "(" + oMsg.body + ")");
            break;
        case 315 : // ENDOFWHO
            this.onWhoReplyEnd();
            break;
        case 317 : // idle
            this.out.println("*** " + oMsg.parameters[1] + " has been idle " + oMsg.parameters[2] + " seconds");
            break;
        case 318 : // ENDOFWHOIS
            break;
        case 319 : // whois #2
            // Strip out the #_ channels
            channels = oMsg.body; 
            if (this.novice) {
                var aChannels = $PA(oMsg.body.split(' '));
                aChannels = aChannels.reject(function(channel) {
                    return irc.Channel.isPrivateChannel(channel);
                });
                channels = aChannels.join(' ');
            }
            this.out.println("*** on channels: " + channels);
            break;
        case 312 : // whois #3
            this.out.println("*** on irc via server " + oMsg.parameters[2] + " (" + oMsg.body + ")");
            break;
        case 320 : // whois #4
            this.out.println("*** " + oMsg.parameters[1] + " " + oMsg.body);
            break;
        case 321 : // LIST start
            this.onListStart();
            break;
        case 322 : // LIST
            var topic = oMsg.parameters[1];
            if (oMsg.body !== undefined) {
                topic = oMsg.body.replace(/^\[[\w\+-]+\] ?/, "");
            } else {
              topic = oMsg.parameters[2];
            }
            this.onListReply(oMsg.parameters[1], oMsg.parameters[2], topic);
            break;
        case 323 : // LIST end
            this.onListEnd();
            break;
        case 324 :
            //this.onChannelModeReply();
            var channel = oMsg.parameters[1];
            var mode = oMsg.parameters[2];
            var oChannel = this.getChannel(channel);
            if (oChannel) {
                oChannel.setMode(mode)
            }
            this.out.println("*** Mode for channel " + channel + " is \"" + mode + "\"");
            break;
        case 329:
            this.printRestParams(oMsg);
            break;
        case 332 : // TOPIC
            if (this.novice && irc.Channel.isPrivateChannel(oMsg.parameters[1])) {
                // 
            } else {
                this.out.println("*** Topic for " + oMsg.parameters[1] + ": " + oMsg.body);
                if (Peekko.session.window.getChannelTab(oMsg.parameters[1]) !== undefined) {
                  var tpanel = document.getElementById(Peekko.session.window.getChannelTab(oMsg.parameters[1]).linkedPanel);
                  tpanel.childNodes[0].topic = oMsg.body;
                }
            }
            break;
        case 333 : // I have no idea what this one is about
            //this.printRestParams(oMsg);
            break;
        case 341 : // invite
            this.out.println("*** Inviting " + oMsg.parameters[1] + " to channel " + oMsg.parameters[2]);
            break;
        case 352 : // WHOREPLY
            this.onWhoReply(oMsg);
            break;
        case 353 : // NAMREPLY
            //this.err.println("NAME Reply: " + oMsg);
            var nicks = $PA(oMsg.body.split(/ +/));
            var channel = oMsg.parameters[2];
            //this.err.println("NAME Reply Channel: " + channel);
            var oChannel = this.getChannel(channel);
            if (oChannel && oChannel.operator == null) {
                var r = new RegExp("^.?" + this.nick + "$");
                var myNicks = nicks.grep(r);
                if (myNicks.length != 1) {
                    this.err.println("error: too many or too few nicks were identified as mine: " + myNicks.length);
                } 
                oChannel.operator = /^@/.test(myNicks[0]);
                oChannel.clearUsers();
                nicks.each(function(nick) {
                    oChannel.addUser(nick);
                });
            }
            this.onNameReply(irc.aChannelSpecifiers[oMsg.parameters[1]], channel, nicks);
            break;
        case 366 : // ENDOFNAMES
            this.onNameReplyEnd(oMsg);
            break;
        case 374 : // ENDOFINFO
        case 375 : // MOTD start
            break;
        case 372 : // MOTD
            this.onMOTD(oMsg.body);
            break;
        case 376 : // MOTD end
            break;
        case 403 : // channel doesn't exist
            // Just use a generic error message
            //this.onErrorMessage("channel does not exist: " + oMsg.parameters);
            this.printBody(oMsg);
            break;
        case 405 : // ERR_TOOMANYCHANNELS You have joined too many channels
            // XXX - Need to do some sort of channel garbage collection.
            this.onJoinedTooManyChannels(oMsg);
            break;
        case 409 : // NOORIGIN in pong reply
        case 421 : // Unknown command
            this.onErrorMessage(oMsg.parameters[0] + " " + oMsg.body);
            break;
        case 422 : // error trying to part a channel you're not in
            break;
        case 433 : // nickname in use
            if (! this.foundANick) {
                // Only generate a new nick if we don't have one already.
                if (this.nickHandler.hasNextNick()) {
                    this.sendCommand("NICK", [this.nickHandler.nextNick()]);
                } else {
                    if (this.horribleNicks == null) {
                        this.horribleNicks = new irc.HorribleNickGenerator();
                        this.out.println("*** None of the nicks you have selected are available; " +
                                         "will use the horrible nickname generator");
                    }
                    var nick = this.horribleNicks.nextNick();
                    this.out.println("*** Generated this horrible nickname for you: " + nick);
                    this.sendCommand("NICK", [nick]);
                    // reset the nickHandler to see if the nicknames they've selected will work now.
                    this.nickHandler.reset();
                    //this.onNoMoreNicks();
                }
            } else {
                this.printRestAndBody(oMsg);
            }
            break;
/*      case 462 : // ALREADYREGISTRED
        case 477 : // please register
            break;
*/
        case 513 : // Send back a requested pong
            var m = oMsg.body.match(/PONG (\d+)/);
            if (m) {
                this.sendCommand("PONG", [ m[1] ]);
            } else {
                this.onUnhandledMessage(oMsg);
            }
            break;
        default :
            this.onUnhandledMessage(oMsg);
            //this.err.println("Unhandled code " + oMsg.commandCode + " for message '" + sMsg + "'");
            this.err.println("Unhandled code " + oMsg.commandCode + " command: " + oMsg);

            break;
        }
    }
};
    

/**
    DCC Chat Classes
    ================
**/


irc.dcc = {}; // sub package 'dcc'


// **** DCC chat object ****

/*
    XXX - I don't believe the dcc.Chat class works yet.  I'm putting it on the TODO list.
*/
irc.dcc.Chat = Class.create();
irc.dcc.Chat.prototype = {

    initialize : function(sNick, sHost, iPort, bConnect, oClient) {
        this.nick = sNick;
        this.hostName = sHost;
        this.port = iPort;
        this.client = oClient;
        this.sock = -1;
        this.status = 0;
        this.connected = false;
        this.index = -1;

        this.read = this.client.read;
        this.send = this.client.send;
        this.isConnected = this.client.isConnected;
        // Rename this to onMessage?
        this.onText = this.client.defaultHandler;

        if (bConnect) {
            try {
                this.connect();
            } catch (e) {
                this.err.println("Couldn't connect to " + this.nick + "\n");
            }
        } else this.accept();
    },

    connect : function()  {
        this.sock = irc.aSockets.length;
        irc.aSockets[this.sock] = ircclient_openSocket(this.hostName, this.port);
        this.status = 1;
    },

    accept : function()  {
    },

    disconnect : function()  {
        this.onDisconnect(this.nick);
        try {
            irc.aSockets[this.sock].close();
        } catch (e) {
            this.client.err.println("DCC error: close error\n");
        }
        irc.aSockets[this.sock] = null;
        irc.aDCCChats[this.index] = null;
    },

    process : function()  {
        if (!this.isConnected()) return;
        var sRead = this.read();
        if (sRead.length) {
            this.onText(this.nick, sRead.substring(0, sRead.length-1));
        }
    },

    msg : function(sMsg)  {
        this.client.out.println(sMsg + "\r\n");
    },

    sendCommand : function()  {

    },

    addHandler : function(sName, fFunction)  {
        switch (sName) {
        case "ontext" :
            this.onText = fFunction; // nick, message
            break;
        case "ondisconnect" :
            this.onDisconnect = fFunction; // nick
            break;
        }
    }
};

irc.dcc.Send = Class.create();
// **** DCC send object ****
irc.dcc.Send.prototype = {
    
    initialize : function(sNick, sHost, iPort, bReceive, sFileName, sPath, iSize, oClient) {
        this.nick = sNick;
        this.hostName = sHost;
        this.port = iPort;
        this.client = oClient;
        this.sock = -1;
        this.fileName = sFileName;
        this.path = sPath;
        this.size = iSize;
        this.sizeReceived = 0;
        this.sizeSend = 0;
        this.status = 0;
        this.connected = false;
        this.index = -1;

        this.read = this.client.read;
        this.isConnected = this.client.isConnected;

        this.onPartReceived = this.client.defaultHandler;
        this.onDisconnect = this.client.defaultHandler;
        this.onComplete = this.client.defaultHandler;
    },

    connect : function()  {
        this.file = oFS.OpenTextFile(this.path + this.fileName, ForWriting, true);
        this.sock = irc.aSockets.length;
        irc.aSockets[this.sock] = ircclient_openSocket(this.hostName, this.port);
/*          irc.aSockets[this.sock] = new ActiveXObject("Catalyst.SocketCtrl.1");
        irc.aSockets[this.sock].AddressFamily = 2; // AF_INET
        irc.aSockets[this.sock].Protocol = 0; // IPPROTO_TCP
        irc.aSockets[this.sock].SocketType = 1; // STREAM
        irc.aSockets[this.sock].Binary = true;  // <--- This is different than the other one.
        irc.aSockets[this.sock].Blocking = false;
        irc.aSockets[this.sock].BufferSize = 16384;
        irc.aSockets[this.sock].AutoResolve = true;
        irc.aSockets[this.sock].HostAddress = this.hostName;
        irc.aSockets[this.sock].RemotePort = this.port;
        irc.aSockets[this.sock].Timeout = 500;
        try {
            irc.aSockets[this.sock].Action = 2; // SOCKET_CONNECT
        } catch (e) {
            this.err.println("Couldn't connect to " + this.nick + "\n");
        }*/
        this.status = 1;
    },

    accept : function()  {

    },

    disconnect : function()  {
        try {
            //irc.aSockets[this.sock].Action = 7; // SOCKET_CLOSE
            irc.aSockets[this.sock].close();
        } catch (e) {

        }
        irc.aSockets[this.sock] = null;
        irc.aDCCSends[this.index] = null;
    },

    send : function()  {
        //irc.aSockets[this.sock].Blocking = true;
        // XXX - This needs to be rewritten
        try {
            irc.aSockets[this.sock].SendLen = 32;
            irc.aSockets[this.sock].SendLong = this.sizeReceived;
        } catch (e) {

        }
        //irc.aSockets[this.sock].Blocking = false;
    },

    complete : function()  {
        this.disconnect();
    },

    process : function()  {
        if ((!this.isConnected() && this.status == 1)) return; //  || irc.aSockets[this.sock].IsBlocking
        else if (this.status == 3) return;
        try {
            irc.aSockets[this.sock].RecvLen = irc.aSockets[this.sock].RecvNext;
            var sRead = irc.aSockets[this.sock].RecvData;
        } catch (e) {
            var sRead = "";
        }
        if (sRead.length) {
            this.status = 2;
            try {
                this.file.Write(sRead);
                this.sizeReceived += irc.aSockets[this.sock].RecvLen;
            } catch (e) {

            }
            this.onPartReceived(this.nick, this.fileName, this.sizeReceived);
            this.send();
        } else if (this.status == 2 && this.sizeReceived == this.size) {
            this.onComplete(this.nick, this.fileName, this.sizeReceived);
            this.complete();
            this.status = 3;
            try {
                this.file.Close();
            } catch (e) {

            }
            return;
        } else if (!this.isConnected()) {
            this.onDisconnect(this.nick, this.fileName, this.sizeReceived);
            this.disconnect();
            this.status = 3;
            try {
                this.file.Close();
            } catch (e) {

            }
            return;
        }
    },

    sendPart : function(iStart)  {

    },

    addHandler : function(sName, fFunction)  {
        switch (sName) {
        case "onpartreceived" :
            this.onPartReceived = fFunction; // nice, file size
            break;
        case "ondisconnect" :
            this.onDisconnect = fFunction; // nick, file
            break;
        case "oncomplete" :
            this.onComplete = fFunction; // nick, file
            break;
        }
    }
};

/**
    client.js

    requires peekko.js, irc.js
*/

peekko.Client = Class.create();
Object.extend(peekko.Client.prototype, irc.Client.prototype);
Object.extend(peekko.Client.prototype, {

    /**
        Same arguments as irc.Client except it expects a controller on the end.
    */
    initialize : function() {
        var args = $A(arguments);
        this.controller = args.pop();
        this.parent = irc.Client.prototype;
        this.parent.initialize.apply(this, args);
        this.chatEvents = new peekko.ChatEvents(this.controller.toolbar);
        this.roomInfo = this.controller.roomInfo;
        log ("peekko.Client initiated");
    },
    
    onConnect : function(params) {
        var channel = this.controller.getCurrentChannel();
        
        this.controller.updateRoomInfo(channel);
        this.controller.setConnectState("connected");
        this.parent.onConnect.apply(this);

        window.updateCommands('PmogConnect');
    },

    onDisconnect : function() {
        log("onDisconnect");
        this.controller.setConnectState("disconnected");
        // Have the super class do whatever it does.
        this.parent.onDisconnect.apply(this);
        if (this.controller.ircclient) {
            this.controller.ircclient = null;
            this.roomInfo.setIRCClient(null);
        }
        window.updateCommands('PmogConnect');
    },

    onChannelModeChange : function(change, channel, source) {
        if (! this.isPrivateChannel(channel)) {
            this.parent.onChannelModeChange.call(this, change, channel, source);
        }
    },

    onNameReply : function() {
        if (! this.isPrivateChannel(arguments[1])) {
            this.parent.onNameReply.apply(this, arguments);
        }
    },
    
    onNameReplyEnd : function(oMsg) {
        this.parent.onNameReplyEnd.call(this, oMsg);
        var channel = oMsg.parameters[1];
    },
    
    onTimeout : function(timeout) {
        this.out.println("error: timedout trying to connect to server");
            autoConnect = peekko.config.getAutoConnect();
            // XXX - Need to differentiate between user initiated and auto initiated connections.
            // I'm just throwing this in to not annoy everyone to tears.
            if (! autoConnect) {
                alert("Peekko Chat timedout trying to connnect to server.\n" +
                      "You may have trouble connecting if you are behind a firewall.");
            }
        //}
        this.onDisconnect();
        this.controller.setConnectState("disconnected");
        if (this.ircclient) {
            this.ircclient = null;
            this.roomInfo.setIRCClient(null);
        }
    },
    
    onJoin : function() {
        if (! this.isPrivateChannel(arguments[1])) {
            this.parent.onJoin.apply(this, arguments);
            this.roomInfo.update(this.channel.name);
        }
    },
    
    onPart : function() {
        if (! this.isPrivateChannel(arguments[1])) {
            this.parent.onPart.apply(this, arguments);
            this.roomInfo.update(this.channel.name);
        }
    },

    onKick : function() {
        if (! this.isPrivateChannel(arguments[0])) {
            this.parent.onKick.apply(this, arguments);
            this.roomInfo.update(this.channel.name);
        }
    },
    
    onQuit : function(nick, message) {
        // Need to make sure I don't print this if the the person isn't in the actual room.
        var result = false;
        var channels = this.getPublicChannels();
        channels.forEach(function(oChannel) {
            if (oChannel.hasUser(nick)) {
                result = true;
            }
        });
        if (result) {
            this.parent.onQuit.apply(this, [nick, message]);
            this.roomInfo.update(this.channel.name);
        }
    },

    onTopicChange : function() {
        if (! this.isPrivateChannel(arguments[1])) {
            this.parent.onTopicChange.apply(this, arguments);
            this.roomInfo.update(this.channel.name);
        }
    },
    
    onText : function(channel, nick, message) {
        this.parent.onText.apply(this, [channel, nick, message]);
        if (channel == this.nick) {
            // Private message
            this.chatEvents.messageToYou(message);
        } else {
            // Public message to the channel
            if (new RegExp(this.nick, 'i').test(message)) {
                this.chatEvents.messageAboutYou(message);
            } else {                
                this.chatEvents.message(message);
            }
        }
    },
    
    onMyNickChange : function(newNick, oldNick) {
        this.controller.session.window.setNick(newNick);
        this.parent.onMyNickChange.call(this, newNick, oldNick);
    },

    onChannelChange : function(channel) {
        if (channel == null) {
            this.controller.session.window.channel = null;
        } else if (! this.isPrivateChannel(channel)) {
            this.controller.session.window.channel = channel;
            this.roomInfo.update(channel);
        }
    },
    
    onJoinedTooManyChannels : function(oMsg) {
        var channels = this.getPrivateChannels();
        if (channels && channels.length == 0) {
            this.parent.onJoinedTooManyChannels.call(this, oMsg);
        } else {
            // Do some channel garbage collection.
            channels.forEach(bind(function(oChannel) {
                this.partChannel(oChannel.name);
            }, this));
        }
    },
    
    getPublicChannels : function() {
      return this.channels.filter(function(element, index, array) { return ! element.isPrivate(); });
        // return this.channels.findAll(function(oChannel) {
        //     return ! oChannel.isPrivate();
        // });
    },
    
    getPrivateChannels : function() {
      return this.channels.filter(function(element, index, array) { return element.isPrivate(); });
        // return this.channels.findAll(function(oChannel) {
        //     return oChannel.isPrivate();
        // });
    },
    
    isPrivateChannel : function(channel) {
        return channel[0] == '#' && channel[1] == '_';
    },
    
    _privatizeChannel : function(channel) {
        log("_privatizeChannel: " + channel);
        var oChannel = this.getChannel(channel);
        if (oChannel && ! oChannel.hasMode('s') && oChannel.isOperator()) {
            // Make the room private.
            // Mark it as moderated too that way people don't chat in there and cause a bunch of ruckus.
            this.sendCommand("MODE", [ oChannel.name, "+smt"]); 
        }
    }

});

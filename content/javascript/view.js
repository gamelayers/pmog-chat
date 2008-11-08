/**
    view.js
    
*/
/**
    @author Shane Celis <shane@peekko.com>
    Licensed under the GNU General Public License
*/
var view = {}; // view package

// This class might want to be moved over to xul.js
// these images should be handled by css.
view.images = [ "peekko16.png", "peekko24.png", "peekko32.png" ];
view.Toolbar = Class.create();
view.Toolbar.prototype = Object.extend(Object.extend(new peekko.RoomListener(), new peekko.ChatListener()), 
{
    
    initialize : function() {
        this.channel = null;
        this.browsersCount = null;
        this.showButtonClasses = [ "no-messages", "messages", "messages-to-you", "not-connected" ];
    },
    
    element : function(id) {
        var element = $(id);
        if (! element) {
            throw "no element '" + id + "' defined";
        }
        return element;
    },
    
    getIndexForCount : function(count) {
        var index = Math.ceil(count/3);
        if (index >= view.images.length) {
            index = view.images.length - 1;
        }
        return index;
    },
    
    // Overloading the print method with tooltip
    setStatus : function(sMessage, sTooltip) {
        // I think the status portion is overkill.
        
        var element = this.element('pmogChatConsole');
        element.label = sMessage;
        if (sTooltip) {
            element.setAttribute("tooltiptext", sTooltip);
        } else {
            element.removeAttribute("tooltiptext");
        }
    },
    
    getJoinButtonClass : function(chatters, browsers) {
        return "peeps-" + (chatters > 0 ? "on" : "off") + "-" + (browsers > 0 ? "on" : "off");
    },
    
    update : function(channel, count, topic, maxCount) {
        var msg = $PA();
        var joinButtonClass = null;
        var joiningWord = "in";
        if (count != null && ! isNaN(count)) {
            msg.push(count, "chatting");
            joinButtonClass = this.getJoinButtonClass(count, 0);
            if (this.browsersCount != null && ! isNaN(this.browsersCount)) {
                var upperBound = 0;
                if (! peekko.config.browseInvisibly()) {
                    // If we're not invisibly browsing, we're on the people we're seeing, so
                    // raise the upperBound.
                    upperBound = 1;
                }
                if (this.browsersCount > upperBound) {
                    msg.push(this.browsersCount, "browsing");
                    joinButtonClass = this.getJoinButtonClass(count, this.browsersCount);
                    joiningWord = "at";
                }
            }
        }
        if (channel != null) {
            if (msg.length > 0) {
                msg.push(joiningWord);
            }
            msg.push(channel);
        }
        
        if (topic != null && topic.length != 0) {
            if (msg.length > 0) {
                msg.push("-");
            }            
            msg.push(topic);
        }
        if (joinButtonClass != null) {
            this.setJoinButtonClass(joinButtonClass);
        }
        this.setOutput(msg.join(' '));
    },
    
    setOutput : function(sMessage, sTooltip) {
        var element = this.element('status-text');
        element.label = sMessage;
        if (sTooltip) {
            element.setAttribute("tooltiptext", sTooltip);
        } else {
            element.removeAttribute("tooltiptext");
        }
    },
    
    // Update
    setShowButtonClassIndex : function(index) {
        this.setShowButtonClass(this.showButtonClasses[index]);
    },
    
    updateShowButtonClassIndex : function(newIndex) {
        var currentClassIndex = this.showButtonClasses.indexOf($('button-show-chat').className);
        // These audio alerts should really be put into their own listener.
        if (newIndex == 1 && peekko.config.getAlertOnMessages()) {
            // Play when I get a message for the first time.
            this.lazyPlaySound("chrome://peekko/skin/pop4.wav");
        }
        if (newIndex == 2 && peekko.config.getAlertOnMessagesToMe()) {
            // Play when I get a message to or about me for the first time.
            this.lazyPlaySound("chrome://peekko/skin/pop2.wav");
        }        
        if (newIndex > currentClassIndex) {
            this.setShowButtonClassIndex(newIndex);
        }
    },
    
    /**
        Only play a sound if it's been 3 minutes since it was last played.
    */
    lazyPlaySound : function(url) {
        if (! peekko.config.getAudibleAlerts()) {
            return;
        }
        var now = new Date().getTime();
        if (this.lastPlayedSound != null) {
            log("delta: " + (now - this.lastPlayedSound));
            if ((now - this.lastPlayedSound) < peekko.config.getAlertAllowance() * 60 * 1000) {
                // Don't play the sound, it's too soon.
                return;
            }
        }
        peekko.playSound(url);
        this.lastPlayedSound = now;
    },
    
    setShowButtonClass : function(className) {
        //$('button-show-chat').className = className;
        //$('button-hide-chat').className = className;
    },
    
    setJoinButtonClass : function(className) {
        $('joinButton').className = className;        
    },
    
    resetShowButton : function() {
        //if ($('button-show-chat').className != "not-connected") {
        //    this.setShowButtonClassIndex(0);
        //}
    },
    
    /**
        Events
        ======
    */

    onMessage : function(message) {
        this.updateShowButtonClassIndex(1);
    },
    
    onMessageToYou : function(message) {
        this.updateShowButtonClassIndex(2);
    },
    
    onNoSuchRoom : function(channel) {
        if (this.channel == channel) {
            this.update(channel, 0);
        }
        if (this.channel && Peekko.getPrivateChannel(this.channel) == channel) {
            this.browsersCount = 0;
        }
        
    },
   
    onRoomUpdate : function(channel, count, topic) {
        if (this.channel == channel) {
            this.update(channel, count, topic);
        }
        // XXX - getPrivateChannel() should obviously should be pulled out of Peekko
        if (this.channel && Peekko.getPrivateChannel(this.channel) == channel) {
            this.browsersCount = count;
        }
    },

    onRetryingUpdate : function(channel, errorMessage) {
        if (this.channel == channel) {
            this.update(channel + "...", null, errorMessage);
        }
    },

    onWaitingForUpdate : function(channel) {
        if (this.channel == channel) {
            this.update(channel + "...");
            this.setJoinButtonClass("peeps-off-off");
        }
    },
    
    onNotConnected : function(channel) {
        if (this.channel == channel) {
            this.update(channel, null, "not connected");
            this.setJoinButtonClass("peeps-not-connected");
        }
    },
    
    toString : function() {
        return "peekko.Toolbar";
    }
});


Object.extend(view.Toolbar.prototype, {
    onMessageAboutYou : view.Toolbar.prototype.onMessageToYou
});


/**
    view.js

*/
/**
    @author Shane Celis <shane@peekko.com>
    Licensed under the GNU General Public License
*/
var view = {}; // view package

// This class might want to be moved over to xul.js
view.Toolbar = Class.create();
view.Toolbar.prototype = Object.extend(Object.extend(new peekko.RoomListener(), new peekko.ChatListener()),
{

    initialize : function() {
        this.channel = null;
        this.browsersCount = null;
    },

    element : function(id) {
        var element = $(id);
        if (! element) {
            throw "no element '" + id + "' defined";
        }
        return element;
    },

    // Overloading the print method with tooltip
    setStatus : function(sMessage, sTooltip) {
        var element = this.element('pmogChatConsole');
        element.label = sMessage;
        if (sTooltip) {
            element.setAttribute("tooltiptext", sTooltip);
        } else {
            element.removeAttribute("tooltiptext");
        }
    },

    update : function(channel, count, topic, maxCount) {
        //var msg = $PA();
        var msg = new Array();
        var joiningWord = "in";
        if (count != null && ! isNaN(count)) {
            msg.push(count, "chatting");
            if (this.browsersCount != null && ! isNaN(this.browsersCount)) {
                var upperBound = 0;
                if (! peekko.config.browseInvisibly()) {
                    // If we're not invisibly browsing, we're on the people we're seeing, so
                    // raise the upperBound.
                    upperBound = 1;
                }
                if (this.browsersCount > upperBound) {
                    msg.push(this.browsersCount, "browsing");
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

    /**
        Events
        ======
    */

    onMessage : function(message) {

    },

    onMessageToYou : function(message) {
      log("Message about you: " + message);
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
        }
    },

    onNotConnected : function(channel) {
        if (this.channel == channel) {
            this.update(channel, null, "not connected");
        }
    },

    toString : function() {
        return "peekko.Toolbar";
    }
});


Object.extend(view.Toolbar.prototype, {
    onMessageAboutYou : view.Toolbar.prototype.onMessageToYou
});


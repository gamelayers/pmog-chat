/**
    xul.js

    I created this package to differentiate from the HTML injection chat window.
    This is so much simpler, so much easier to code.  I love XUL!
*/
/**
    @author Shane Celis <shane@peekko.com>
    Licensed under the GNU General Public License
*/
const HTMLNS = "http://www.w3.org/1999/xhtml";
const XULNS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

var xul = {};
xul.ChatWindow = Class.create();
xul.ChatWindow.MAX_HISTORY = 30;
xul.ChatWindow.prototype = Object.extend(new peekko.RoomListener(), {
    initialize: function() {
        this.inputs = $PA();
        this.nick = null;
        this.channel = null;
        this.commandHistory = new Array();
        this.lastHistoryReferenced = -1;
        this.tabcontainer = document.getElementsByTagName('tabbox')[0];
        this.ioMap = new AssociativeArray();
    },

getInput: function() {
        if (this.inputs.length > 0) {
            return this.inputs.shift();
        }
        return null;
    },

onInput: function(event) {
        switch (event.keyCode) {
          case 13:
          case 14:
            var chatInput = $('chat-input');
            var input = chatInput.value;
            if (input && input.length != 0) {
                chatInput.value = '';
                this.inputs.push(input);
                if (!this.commandHistory.length || this.commandHistory[0] != input) {
                  this.commandHistory.unshift(input);
                }

                if (this.commandHistory.length > this.MAX_HISTORY) {
                  this.commandHistory.pop();
                }

                this.lastHistoryReferenced = -1;
            }
            break;
            case 38:
            /* up */
            if (xul.chatWindow.lastHistoryReferenced == -2) {
                xul.chatWindow.lastHistoryReferenced = -1;
                event.target.value = "";
            } else if (xul.chatWindow.lastHistoryReferenced < xul.chatWindow.commandHistory.length - 1) {
                event.target.value = xul.chatWindow.commandHistory[++xul.chatWindow.lastHistoryReferenced];
            }
            event.preventDefault();
            break;
            case 40:
            /* down */
            if (xul.chatWindow.lastHistoryReferenced > 0) {
                event.target.value = xul.chatWindow.commandHistory[--xul.chatWindow.lastHistoryReferenced];
            } else if (xul.chatWindow.lastHistoryReferenced == -1) {
                event.target.value = "";
                xul.chatWindow.lastHistoryReferenced = -2;
            } else {
                xul.chatWindow.lastHistoryReferenced = -1;
                event.target.value = "";
            }
            event.preventDefault();
            break;
            default:
            break;
        }
    },

focusOnInput: function(event) {
        var chatInput = $('chat-input');
        chatInput.focus();
    },

    setStatus: function(sStatus) {
        $("status-text").value = sStatus;
    },

setNick: function(sNick) {
        this.nick = sNick;
    },

update: function(channel, count, topic) {
        var status = $PA();
        if (this.nick != null) {
            status.push(this.nick);
        }
        if (channel != null) {
            if (status.length > 0) {
                status.push("on");
            }
            status.push(channel);
            
            // var cChannel = channel.replace(/#/, '');
            // var sb = document.getElementById(cChannel + '-output');
            // if (sb != null) {
            //   sb.notificationBox.appendNotification(topic, 'hi', null, 0, null);
            // }
        }
        if (count != null && !isNaN(count)) {
            if (status.length > 0) {
                status.push("with");
            }
            //count--;  // don't count yourself.
            status.push(count)
            status.push((count == 1 ? "person": "people"));


        }
        if (topic != null && topic.length != 0) {
            if (status.length > 0) {
                status = [status.join(' ') + ";"];
            }
            status.push("topic: " + topic);
        }
        this.setStatus(status.join(' '));
    },

isScrollAtBottom: function(threshold) {
        //var chatOutput = $("chat-output");
        var chatOutput = document.getElementById(this.tabcontainer.selectedTab.linkedPanel);
        // the variable scrollTop appears to be write-only.  I cannot read where the scrollbar
        // is at; therefore, I cannot be nice and not readjust the scrollbar if it messes up.
        log("scrolltop " + chatOutput.inputField.scrollTop);
        log("scrollheight " + chatOutput.inputField.scrollHeight);
        log("delta " + (chatOutput.inputField.scrollTop - chatOutput.inputField.scrollHeight));
        //return (chatOutput.inputField.scrollTop - chatOutput.inputField.scrollHeight) < threshold;
        return true;
    },

disableInput: function(val) {
        var isDisabled = val || false;
        var chatInput = $('chat-input');
        chatInput.disabled = isDisabled;
    },

onNoSuchRoom: function(channel) {
        if (this.channel == channel) {
          this.update(channel, 0);
        }
    },

onRoomUpdate: function(channel, count, topic) {
        if (this.channel == channel) {
            this.update(channel, count, topic);
        }
    },

onRetryingUpdate: function(channel, errorMessage) {
        if (this.channel == channel) {
          this.update(channel + "...", null, errorMessage);
        }
    },

onWaitingForUpdate: function(channel) {
        if (this.channel == channel) {
          this.update(channel + "...");
        }
    },

onNotConnected: function(channel) {
  if (this.channel == channel) {
    this.update(channel, null, "not connected");
  }
},

toString: function() {
        return "xul.ChatWindow";
    },

observe: function(subject, topic, data) {
        log("pref changed: " + data);
    },

addTab: function(title) {
  
        cTitle = title.replace(/#/, '');
        
        var t = document.createElementNS(
        "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "tab");

        t.className = "tabbrowser-tab";

        t.setAttribute("label", title);

        this.tabcontainer.tabs.appendChild(t);

        var tp = document.createElementNS(
        "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "tabpanel");

        tp.id = cTitle + "-output-panel";
        t.linkedPanel = tp.id;

        var sb = document.createElementNS(
        "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "chat-panel");

        sb.className = "chat-output";
        
        sb.id = cTitle + "-output";

        tp.appendChild(sb);

        this.tabcontainer.tabpanels.appendChild(tp);
        
        this.ioMap.add(cTitle, new io.ChatWriter(cTitle));
        
        return t;
    },
    
selectTab: function(tab) {
    this.tabcontainer.selectedTab = tab;
}

});

xul.chatWindow = new xul.ChatWindow();
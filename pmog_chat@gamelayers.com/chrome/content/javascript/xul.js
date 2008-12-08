/**
    xul.js

    I created this package to differentiate from the HTML injection chat window.
    This is so much simpler, so much easier to code.  I love XUL!
*/
/**
    @author Shane Celis <shane@peekko.com>
    Licensed under the GNU General Public License
*/
const HTMLNS  = "http://www.w3.org/1999/xhtml";
const XULNS   = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const SVGNS   = "http://www.w3.org/2000/svg";
const XLINKNS = "http://www.w3.org/1999/xlink";


var xul = {};
xul.ChatWindow = Class.create();
xul.ChatWindow.MAX_HISTORY = 30;
xul.ChatWindow.prototype = Object.extend(new peekko.RoomListener(), {
    initialize: function() {
        this.inputs = new Array();
        this.nick = null;
        this.channel = null;
        this.commandHistory = new Array();
        this.lastHistoryReferenced = -1;
        this.tabcontainer = document.getElementsByTagName('tabbox')[0];
        this.ioMap = {};
    },

getInput: function() {
        if (this.inputs.length > 0) {
            return this.inputs.shift();
        }
        return null;
    },
    
addHistory: function(value) {
  var fhService = Components.classes["@mozilla.org/satchel/form-history;1"].getService(Components.interfaces.nsIFormHistory2);
  fhService.addEntry("ircCommandHistory", value);
},

onInput: function(event) {
        switch (event.keyCode) {
          case 13:
          case 14:
            var chatInput = $('chat-input');
            var input = chatInput.value;
            if (input && input.length !== 0) {
                chatInput.value = '';
                this.inputs.push(input);
                this.addHistory(input);
            }
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
        var status = new Array();
        if (this.nick !== null) {
            status.push(this.nick);
        }
        if (channel !== null) {
            if (status.length > 0) {
                status.push("on");
            }
            status.push(channel);
        }
        if (count !== null && !isNaN(count)) {
            if (status.length > 0) {
                status.push("with");
            }
            //count--;  // don't count yourself.
            status.push(count);
            status.push((count == 1 ? "person": "people"));


        }
        if (topic) {
            if (status.length > 0) {
                status = [status.join(' ') + ";"];
            }
            status.push("topic: " + topic);
        }
        this.setStatus(status.join(' '));
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
    
setTabIcon: function(tabName, imagePath) {
  var tab = this.getChannelTab(tabName);
  if (tab == undefined) {
    return;
  }
  
  tab.setAttribute("image", imagePath);
},

addTab: function(title) {
    var type;
    var cTitle; //= title.replace(/#/, '');
    var favicon; //= this.getFavicon(cTitle);
    
    if (title.indexOf("#") != -1) {
      type = "channel";
      cTitle = title.replace(/#/, '');
      favicon = this.getFavicon(cTitle);
    } else {
      type = "private";
      cTitle = title;
      //favicon = this.getAvatar(title);
      //this.getAvatar(title, this.setTabIcon);
      if (channelTreeView.userData && channelTreeView.userData[title] !== undefined) {
        favicon = channelTreeView.userData[title].avatar;
      } else {
        channelTreeView.userData[title] = {};
        Peekko.session.window.getAvatar(title, this.setTabIcon);
      }
    }
        
        var t = document.createElementNS(XULNS, "tab");

        t.className = "tabbrowser-tab";

        t.setAttribute("label", title);
        
        t.setAttribute("oncommand", "Peekko.session.window.closeTab(this);");
        
        if (favicon !== undefined) {
          t.setAttribute("image", favicon);
        }
        
        t.setAttribute("value", type);
        t.setAttribute("id", title);

        this.tabcontainer.tabs.appendChild(t);
        
        channelTreeView.addChannel(cTitle, type);
        
        var tp = document.createElementNS(XULNS, "tabpanel");

        tp.id = cTitle + "-output-panel";
        t.linkedPanel = tp.id;
        tp.flex = "1";

        var sb = document.createElementNS(XULNS, "chat-panel");

        sb.className = "chat-output";
        
        sb.id = cTitle + "-output";
        
        sb.flex = "1";
        
        tp.appendChild(sb);

        this.tabcontainer.tabpanels.appendChild(tp);
        
        sb.topicIcon = favicon;
        sb.topic = title;
        sb.contextMenu = "contentAreaContextMenu";
        
        var chatWriter = new io.ChatWriter(cTitle, t.id);
        this.ioMap[cTitle] = chatWriter;
        
        return t;
    },
    
selectTab: function(tab) {
    this.tabcontainer.selectedTab = tab;
},

closeTab: function(tab) {
  var type = tab.value;
  var channel = tab.getAttribute("label");
  var cLabel = channel.replace(/#/, '');
  
  if (type === "channel") {
    Peekko.ircclient.partChannel(channel);
  }
  
  delete this.ioMap[cLabel];
  var mPanel = $(tab.linkedPanel);  
  this.tabcontainer.tabs.removeChild(tab);
  this.tabcontainer.tabpanels.removeChild(mPanel);
  
  channelTreeView.removeChannel(cLabel);
  
  this.tabcontainer.tabs.selectedItem = this.tabcontainer.tabs.getItemAtIndex(this.tabcontainer.tabs.itemCount - 1);
},

getChannelTab: function(channelName) {
  var tabs = document.getElementsByTagName('tab');
  var tab;
  for (var i = tabs.length - 1; i >= 0; i--){
    var tl = tabs[i].label.split(" - ")[0];
    if (tl === channelName) {
      tab = tabs[i];
    }
  }
  return tab;
},

getFavicon: function(url) {
  var faviconService = Components.classes["@mozilla.org/browser/favicon-service;1"].getService(Components.interfaces.nsIFaviconService);
  
  var urlService = peekko.url.createInstance();
  urlService = urlService.QueryInterface(Components.interfaces.nsIURL);
  urlService.spec = "http://" + url;
    
  var iconUrl = faviconService.getFaviconImageForPage(urlService).path;
    
  return iconUrl.replace('favicon:', '');
},

tabChange: function() {
  var tab = this.tabcontainer.tabs.selectedItem;
  var ioName = tab.label.replace(/#/, '');
  
  if (this.ioMap[ioName] !== undefined) {
    this.ioMap[ioName].clearBackgroundCount();
  }
  
  if (Peekko.ircclient && this.tabcontainer.tabs.selectedItem.value === "channel") {
    Peekko.joinChannel(this.tabcontainer.tabs.selectedItem.label);
    Peekko.ircclient.executeLocalInput("/join " + this.tabcontainer.tabs.selectedItem.label);
  } else if (Peekko.ircclient) {
    Peekko.ircclient.channel = null;
  }
},

getAvatar: function(player, callback) {
  var newWindow = getBrowserWindow();
  
  newWindow.jQuery.pmog.getAvatar(player, callback);
}
});

xul.chatWindow = new xul.ChatWindow();
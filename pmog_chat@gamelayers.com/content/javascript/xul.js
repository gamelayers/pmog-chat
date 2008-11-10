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
const XULNS  = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

var xul = {}; // xul package

xul.ChatWriter = Class.create();
xul.ChatWriter.prototype = Object.extend(new io.Writer(), {
    
    createMessage : function(channel, nick, message) {
      log("createMessage called!");
      var wrapperSpan = this.createSpan();
      wrapperSpan.style.display = "block";
      wrapperSpan.setAttribute("class", "single-message");
      
      var nickSpan = this.createSpan();
      nickSpan.textContent = "(" + nick + "): ";
      nickSpan.setAttribute("class", "message-nick");
      
      wrapperSpan.appendChild(nickSpan);
      
      var messageSpan = this.createSpan();
      messageSpan.textContent = message;
      messageSpan.setAttribute("class", "message-text");
      
      wrapperSpan.appendChild(messageSpan);
      
      log("Appending a new message from: " + nickSpan.textContent);
      this.boxInterface.element.appendChild(wrapperSpan);
      
    },
    
    createSpan : function() {
      span = document.createElementNS(HTMLNS, "span");
      //span.textContent = text;
      //span.style.display = "block";
      
      return span;
    },
    
    initialize : function() {
      this.boxInterface = $('chat-output').boxObject.QueryInterface(Components.interfaces.nsIScrollBoxObject);
      //this.boxInterface.element.addEventListener("DOMNodeInserted", function() {Peekko.writer.scrollDown();}, false);
    },
    
    print : function(s) {
        //var chatOutput = $("chat-output");
        if (! this.boxInterface.element) {
            throw "error: cannot get 'chat-output' div";
        }
        var child = this.createSpan();
        child.style.display = "block";
        child.textContent = s;
        this.boxInterface.element.appendChild(child);
    },
    
    println : function(s) {
      this.print(s);
        // var chatOutput = $("chat-output");
        // if (! chatOutput) {
        //     throw "error: cannot get 'chat-output' div";
        // }
        // chatOutput.appendChild(this.createSpan(s));
        // //this.scrollDown();
    },
    
    scrollDown : function() {
      log("Scroll Down called");
      var size = this.scrolledSize();
      this.boxInterface.scrollBy(0, size);
    },
    
    clear : function() {
        // var chatOutput = $("chat-output");
        this.boxInterface.element.removeAll();
        //this.scrollDown();
    },
    
    scrolledSize: function() {
      var width = {};
      var height = {};
      this.boxInterface.getScrolledSize(width, height);
      return height.value;
    }
    
});

xul.ChatWindow = Class.create();
xul.ChatWindow.prototype = Object.extend(new peekko.RoomListener(), {
    initialize : function() {
        this.inputs = $PA();
        this.nick = null;
        this.channel = null;
        this.x = null;
        this.y = null;
        this.move = bind(this.dragMove, this);        
        this.stop = bind(this.dragStop, this);               
        //this.move = this.dragMove.bindAsEventListener(this);
        //this.stop = this.dragStop.bindAsEventListener(this);
        
        // This ought to be the same height as the chat-output to begin with.
        // They must be kept in sync.  Sucks, I know.
        //this.height = 85;

        if (peekko.prefs) {
            peekko.prefs.addObserver("extensions.pmog.chat.color", this, false /* weak ref */);
        }
    },
    
    getInput : function() {
        if (this.inputs.length > 0) {
            return this.inputs.shift();
        }
        return null;
    },
    
    onInput : function(event) {
/*        log("got something! " + [event, event.keyCode, event.charCode, event.ctrlKey].join(', '));
*/     switch (event.keyCode) {
           case 13:
           case 14:
               var chatInput = $('chat-input');
               var input = chatInput.value;
               if (input && input.length != 0) {
                    //peekko.history.addEntry('irc-input', input);
                    chatInput.value = '';
                    this.inputs.push(input);
               }
               break;
           default:
               break;
       }
    },
    
    dragStart : function(event) {
        this.x = event.clientX;
        this.y = event.clientY;
        // Double click to hide the window.  XXX - Need to tell the controller about it.
/*        var now = new Date().getTime();
        if (this.lastMouseClick != null) {
            log("delta: " + (now - this.lastMouseClick));
            if ((now - this.lastMouseClick) < 500) {
                this.hide();
                return;
            }
        }
        this.lastMouseClick = now;*/
        document.addEventListener("mousemove", this.move, true);
        document.addEventListener("mouseup", this.stop, true);
    },

    dragMove : function(event) {
        var x = event.clientX;
        var y = event.clientY;

        var dy = this.y - y;

        // Trying to make this a little less bumpy.
        if (Math.abs(dy) > 10) {
            var element = $('chat-output');
            this.height += dy;
            element.height = (this.height).toString();
            this.y = y;
        }
    },

    dragStop : function(event) {
        this.x = null;
        this.y = null;

        document.removeEventListener("mousemove", this.move, true);
        document.removeEventListener("mouseup", this.stop, true);
        //this.scrollDown();
    },
    
    focusOnInput : function(event) {
        var chatInput = $('chat-input');
        chatInput.focus();
    },

    focusOnInputIfNoSelection : function(event) {
        if (! this.hasSelection()) {
            this.focusOnInput(event);
        }
    },
    
    hasSelection : function() {
        var element = $('chat-output');
        try {
            return element.selectionStart != element.selectionEnd;
        } catch (ex) {
            // too noisy.
            // log("hasSelection exception: " + ex);
            return false;
        }
    },
    
    setStatus : function(sStatus) {
        $("status-text").value = sStatus;
    },
    
    setNick : function(sNick) {
        this.nick = sNick;
    },

    update : function(channel, count, topic) {
        var status = $PA();
        //var help = "type /help for help"; 
        if (this.nick != null) {
            status.push(this.nick);
        }
        if (channel != null) {
            if (status.length > 0) {
                status.push("on");
            }
            status.push(channel)
        }
        if (count != null && ! isNaN(count)) {
            if (status.length > 0) {
                status.push("with");
            }
            //count--;  // don't count yourself.
            status.push(count)
            status.push((count == 1 ? "person" : "people"));
        }
        if (topic != null && topic.length != 0) {
            if (status.length > 0) {
                status = [ status.join(' ') + ";" ];
            }
            status.push("topic: " + topic);
        }
        this.setStatus(status.join(' '));
/*
        if (status.length > 0) {
            this.setStatus(status.join(' ') + "; " + help);
        } else {
            this.setStatus(help);
        }
*/
    },
    
    // show : function() {
    //     $('chat-window').hidden = false;
    //     this.scrollDown();
    // },
    // 
    // hide : function() {
    //     $('chat-window').hidden = true;
    // },
    // 
    // isHidden : function() {
    //     return $('chat-window').hidden;
    // },
    
//     scrollDown : function() {
//         var chatOutput = $("chat-output");
//         if (! chatOutput) {
//             throw "error: cannot to get 'chat-output' chatOutput";
//         }
// /*        chatOutput.getScrolledSize(x, y);
//         log("position: " + chatOutput.getScrolledSize());
//         chatOutput.scrollToLine(5);
//         log("calling");
//         chatOutput.scrollTo(0, 50);
// */
//         // XUL doesn't exactly expose scrolling yet.  You have to call the
//         // underlying HTML to do it, but at least you can do it!
//         //chatOutput.inputField.scrollTop = chatOutput.inputField.scrollHeight;
//         //chatOutput.inputField.scrollTop = 50;
//     },
    
    isScrollAtBottom : function(threshold) {
        var chatOutput = $("chat-output");
        // the variable scrollTop appears to be write-only.  I cannot read where the scrollbar 
        // is at; therefore, I cannot be nice and not readjust the scrollbar if it messes up.
        log("scrolltop " + chatOutput.inputField.scrollTop);
        log("scrollheight " + chatOutput.inputField.scrollHeight);
        log("delta " + (chatOutput.inputField.scrollTop - chatOutput.inputField.scrollHeight));        
        //return (chatOutput.inputField.scrollTop - chatOutput.inputField.scrollHeight) < threshold;
        return true;
    },
    
    disableInput : function(yes) {
        var chatInput = $('chat-input');
        chatInput.disable = yes;
    },
    
    onNoSuchRoom : function(channel) {
        if (this.channel == channel)
            this.update(channel, 0);
    },
   
    onRoomUpdate : function(channel, count, topic) {
        if (this.channel == channel) {
            this.update(channel, count, topic);
            
            // This is called whenever a channel changes, i.e. join, part or another user joins/parts
            // It's purpose is to update the user listbox with the current set of users.
            Peekko.showUsers();
        }
    },

    onRetryingUpdate : function(channel, errorMessage) {
        if (this.channel == channel)        
            this.update(channel + "...", null, errorMessage);
    },

    onWaitingForUpdate : function(channel) {
        if (this.channel == channel)        
            this.update(channel + "...");
    },

    onNotConnected : function(channel) {
        if (this.channel == channel)
            this.update(channel, null, "not connected");
    },
    
    toString : function() {
        return "xul.ChatWindow";
    },
    
    observe: function(subject,topic,data){
        log("pref changed: " + data);
    }

});

xul.chatWindow = new xul.ChatWindow();

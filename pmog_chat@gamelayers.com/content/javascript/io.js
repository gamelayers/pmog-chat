/**
    Here's a good reference on how to use the prototype.js library.

    Reference: http://www.sergiopereira.com/articles/prototype.js.html

    Classes
    =======

    * io.Writer

    * io.BufferedWriter

    * io.MultiplexWriter

    * io.LogWriter
*/
/**
    @author Shane Celis <shane@peekko.com>
    Licensed under the GNU Lesser General Public License
*/

var io = {};
// Trying out some of the new prototype.js library techniques.
io.Writer = Class.create();
io.Writer.prototype = {
    initialize : function () {

    },

    print : function(str) {
        //throw "abstract method: not implemented";
    },

    println : function(str) {
        this.print(str + "\n");
        this.flush();
    },

    flush : function() {

    }
};

// This looks familiar, doesn't it?
io.BufferedWriter = Class.create();
io.BufferedWriter.prototype = Object.extend(new io.Writer(), {

    initialize : function() {
        this.init();
    },

    // call this clear maybe?
    init : function() {
        this.buffer = "";
    },

    print : function(str) {
        this.buffer = this.buffer + str;
    },

    toString : function() {
        return this.buffer;
    }

});

// Eh, why not.
io.LogWriter = Class.create();
io.LogWriter.prototype = Object.extend(new io.Writer(), {
    print : function(str) {
        log(str);
    }
});

io.ChatWriter = Class.create();
io.ChatWriter.prototype = Object.extend(new io.Writer(), {

    /**
     * This writes a message from a user to the chat output.
     * @param {String} channel The channel name that the message was sent to
     * @param {String} nick The nick of the user who sent the message
     * @param {String} message The content of the message sent
     */
    createMessage : function(channel, nick, message) {
      // First we create one span element that will wrap all the
      // contents of the message, like a container.
      //var wrapperSpan = this.createDiv();

      // Set the single-message class to it, this lets us style it from CSS
      //wrapperSpan.setAttribute("class", "single-message");

      // Create a span to hold the timestamp and nick
      //var nickSpan = this.createSpan();
      //nickSpan.textContent = "[" + getTimestamp() + "] " + nick + ": ";

      // We have three CSS classes for the nickname section of the message:
      // 1) The nick class which we can use CSS to affect the nick section of all messages
      // 2) The self-nick for styling the current user's nick. (sent messages)
      // 3) The user-nick for styling the nick of any other user. (received messages)
      // So we determine here which user style to add and append it to the nick class name.
      var nickClasses = "nick ";
      if (nick == Peekko.ircclient.nick) {;
        nickClasses = nickClasses + "self-nick";
      } else {
        nickClasses = nickClasses + "user-nick";
      }
      
      var newRow = this.createRow({one: "[" + getTimestamp() + "] " + nick + ":", two: message});
      newRow.childNodes[0].setAttribute("class", nickClasses);
      jQuery(this.table).append(newRow);

      // Apply the classes to the nick span
      //nickSpan.setAttribute("class", nickClasses);

      // Append the nick span to the wrapper span
      //wrapperSpan.appendChild(nickSpan);

      // Create a final span to contain the message itself.
      // This allows us to style the message separately from the
      // nick and timestamp.
      //
      //
      // This doesn't alternate like the nick section does depending
      // on who's sending but maybe we want to?
      //var messageSpan = this.createSpan();

      // Kind of incongruent but jQuery handles the appending and converting links much better
      //jQuery(messageSpan).append(message);

      // This will find any URLs in the message and auto-link them.
      //jQuery(messageSpan).autolink();

      // Set the message-text CSS class name. So we can style the message via CSS
      //messageSpan.setAttribute("class", "message-text");

      // Add the message to the wrapper and the message is complete
      //wrapperSpan.appendChild(messageSpan);

      // Here is the tricky part, we insert the new message BEFORE the
      // cursor. The cursor is really just a label that is at the bottom
      // of the chat output. We insert new messages before it and then tell
      // the output box to always keep the cursor element in view. This makes
      // sure we're always scrolling with new text.
      //this.boxInterface.element.insertBefore(wrapperSpan, this.cursor);

      //this.boxInterface.element.insertBefore(this.createBr(), this.cursor);

      // Tell the output box to scroll after adding new text so that we always have the latest message in sight.
      this.scrollDown();
      
      if (Peekko.session.window.tabcontainer.tabs.selectedItem.id !== this.tabId) {
        this.incrementBackgroundCount();
      }
    },

    /**
     * Creates an HTML span element
     * @returns HTML span DOM object
     * @type Object
     */
    createDiv : function() {
      return document.createElementNS(HTMLNS, "div");
    },

    /**
     * Creates an HTML span element
     * @returns HTML span DOM object
     * @type Object
     */
    createSpan : function() {
      return document.createElementNS(HTMLNS, "span");
    },

    /**
     * Creates an HTML br element
     * @returns HTML br DOM object
     * @type Object
     */
    createBr : function() {
      return document.createElementNS(HTMLNS, "br");
    },

    /**
     * Creates an HTML table row element
     * @returns HTML table row DOM object
     * @type Object
     */
    createTr : function() {
      return document.createElementNS(HTMLNS, "tr");
    },

    /**
     * Creates an HTML table column element
     * @returns HTML table column DOM object
     * @type Object
     */
    createTd : function() {
      return document.createElementNS(HTMLNS, "td");
    },
    
    createRow: function(messageData) {
      var column1 = messageData.one;
      var column2 = messageData.two;
      
      var row = this.createTr();
      
      var rowBgClass;
      if(this.table.childNodes.length % 2 == 0) {
        rowBgClass = "even";
      } else {
        rowBgClass = "odd";
      }
      
      var c1;
      var c2;
      if (column1 === undefined) {
      } else {
        c1 = this.createTd();
        c1.setAttribute("class", "nick");
        c1.style.width = "100px";
        jQuery(c1).append(column1);
        jQuery(row).append(c1);
      }
      
      if (column2 === undefined) {
        c1.setAttribute("colspan", "2");
      } else {
        c2 = this.createTd();
        c2.setAttribute("class", "shrinkwrap " + rowBgClass);
        jQuery(c2).append(column2);
        jQuery(c2).autolink();

        if (c1 === undefined) {
          c2.setAttribute("colspan", "2");
          c2.setAttribute("align", "center");
        }

        jQuery(row).append(c2);
      }
      return row;
    },

    /**
     * Initializes the IO writer for the specific channel
     * @param {String} id The ID of the channel
     */
    initialize : function(id, tabId) {
      this.tabId = tabId || undefined;
      
      
      if (this.tabId !== undefined) {
        this.jqId = "#" + this.tabId;
        this.tabLabel = $(tabId).label;
      }
      
      this.backgroundMessages = 0;
      // This ID coincides with the ID on the actual chat-panel element of the XUL
      this.id = id + "-output";

      // The ID is important here because it's using the prototype $ function to get the chat-panel
      // element from the DOM
      this.boxInterface = $(this.id).contentBoxObject;

      // Set the cursor propery to the chat_cursor element SPECIFIC TO THIS chat-panel
      // In other words, every tab and subsequent chat-panel created has a label with the
      // class 'chat_cursor'. We want to get a reference to the chat_cursor label on the tab
      // associated with this channel output
      this.cursor = this.boxInterface.element.getElementsByClassName('chat_cursor')[0];
      
      // Get a reference to the chat output table
      this.table = this.boxInterface.element.childNodes[0];
    },
    
    incrementBackgroundCount: function() {
      this.backgroundMessages++;
       // log("BG: " + this.backgroundMessages);
       //  jQuery($(this.tabId)).toggleClass("activity");
       
      jQuery($(this.tabId)).addClass("activity");
      $(this.tabId).setAttribute("count", "(" + this.backgroundMessages + ")");
    },

    clearBackgroundCount: function() {
      this.backgroundMessages = 0;
      jQuery($(this.tabId)).removeClass("activity");
      $(this.tabId).setAttribute("count", "");
    },

    /**
     * Prints a generic message, not attributed to any user, to the chat output
     * @param {String} s The message to print out to the channel
     */
    print : function(s) {
        if (! this.boxInterface.element) {
            throw "error: cannot get " + this.id + " container";
        }
        //var child = this.createDiv();

        //child.setAttribute("class", "system-message");
        //child.textContent = s;
        //this.boxInterface.element.insertBefore(child, this.cursor);
        // var lineBr = this.createBr();
        // lineBr.setAttribute("class", "no-height");
        // this.boxInterface.element.insertBefore(lineBr, this.cursor);
        var newRow = this.createRow({two: s});
        jQuery(this.table).append(newRow);
        this.scrollDown();
    },

    /**
     * Prints a generic message, not attributed to any user, to the chat output (alias for print)
     * @param {String} s The message to print out to the channel
     */
    println : function(s) {
      this.print(s);
    },

    /**
     * Scrolls the chat output so that the newest message is visible
     */
    scrollDown : function() {
      this.boxInterface.ensureElementIsVisible(this.cursor);
    },

    /**
     * Clears all the output of the channel
     */
    clear : function() {
        this.boxInterface.element.removeAll();
    }
});

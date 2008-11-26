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
    
    createMessage : function(channel, nick, message) {
      // message = parseURLInString(message);
      var wrapperSpan = this.createSpan();
      //wrapperSpan.style.display = "block";
      wrapperSpan.setAttribute("class", "single-message");
      
      var nickSpan = this.createSpan();
      nickSpan.textContent = nick + ":";

      var nickClasses;
      if (nick == Peekko.ircclient.nick) {
        //nickSpan.setAttribute("class", "self-nick");
        nickClasses = "self-nick";
      } else {
        //nickSpan.setAttribute("class", "user-nick");
        nickClasses = "user-nick";
      }
      
      nickClasses = nickClasses + " nick";
      
      nickSpan.setAttribute("class", nickClasses);
      
      wrapperSpan.appendChild(nickSpan);
      
      var messageSpan = this.createSpan();
      // messageSpan.textContent = message;
      jQuery(messageSpan).append(message);
      jQuery(messageSpan).autolink();
      
      messageSpan.setAttribute("class", "message-text");
      
      wrapperSpan.appendChild(messageSpan);
      
      this.boxInterface.element.appendChild(wrapperSpan);
            
      this.boxInterface.element.appendChild(this.createBr());
      // this.boxInterface.element.style.MozUserSelect = "text";
      this.scrollDown();
      
    },
    
    createSpan : function() {
      return document.createElementNS(HTMLNS, "span");
    },
    
    createBr : function() {
      return document.createElementNS(HTMLNS, "br");
    },
    
    initialize : function(id) {
      this.id = id + "-output";
      //this.boxInterface = $(this.id).boxObject.QueryInterface(Components.interfaces.nsIScrollBoxObject);
      this.boxInterface = $(this.id).contentBoxObject;
    },
    
    print : function(s) {
        if (! this.boxInterface.element) {
            throw "error: cannot get " + this.id + " container";
        }
        var child = this.createSpan();
        //child.style.display = "block";
        child.textContent = s;
        this.boxInterface.element.appendChild(child);
        this.boxInterface.element.appendChild(this.createBr());
        this.scrollDown();
    },
    
    println : function(s) {
      this.print(s);
    },
    
    scrollDown : function() {
      this.boxInterface.ensureElementIsVisible(this.boxInterface.element.lastChild);
    },
    
    clear : function() {
        this.boxInterface.element.removeAll();
    }
});

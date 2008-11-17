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
// 
// io.MultiplexWriter = Class.create();
// io.MultiplexWriter.prototype = Object.extend(new io.Writer(), {
//     
//     initialize : function() {
//         this.writers = $PA(arguments);
//     },
//     
//     addWriter : function(writer) {
//         this.writers.unshift(writer);
//     },
//     
//     removeWriter : function(writer) {
//         this.writers = this.writers.reject(function(value) { return value == writer });
//     },
//     
//     onException : function(ex, writer, f, args) {
//     },
//     
//     // I don't know why Prototype's bind didn't work here within the extension's context.
//     // It worked outside of it in unit tests.
//     print : function () {
//         var _arguments = arguments;
//         this.writers.each(
//             bind(function (writer) { 
//                 try {
//                     writer.print.apply(writer, _arguments);
//                 } catch (ex) {
//                     this.onException(ex, writer);
//                 }
//             }, this));
//     },
//     
//     println : function () {
//         var _arguments = arguments;        
//         this.writers.each(
//             bind(function (writer) { 
//                 try {
//                     writer.println.apply(writer, _arguments);
//                 } catch (ex) {
//                     this.onException(ex, writer);
//                 }
//             }, this));
//     },
//     
//     flush : function() {
//         this.writers.each(
//             bind(function (writer) { 
//                 try {
//                     writer.flush();
//                 } catch (ex) {
//                     this.onException(ex, writer);
//                 }
//             }, this));
//     }
// });

io.ChatWriter = Class.create();
io.ChatWriter.prototype = Object.extend(new io.Writer(), {
    
    createMessage : function(channel, nick, message) {
      var wrapperSpan = this.createSpan();
      wrapperSpan.style.display = "block";
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
      messageSpan.textContent = message;
      messageSpan.setAttribute("class", "message-text");
      
      wrapperSpan.appendChild(messageSpan);
      
      this.boxInterface.element.appendChild(wrapperSpan);
      
    },
    
    createSpan : function() {
      return document.createElementNS(HTMLNS, "span");
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
        child.style.display = "block";
        child.textContent = s;
        this.boxInterface.element.appendChild(child);
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

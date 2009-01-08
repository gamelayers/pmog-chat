/*
ConsoleServer can only be accessed within a Firefox extension.  It cannot be accessed
outside of a plugin extension.  An error concerning "UnnamedClass.classes" will be issued
if that happens.
*/

var jsenv = new Object();
// Netscape/Mozilla security manager, for gaining priviledges with consent.
jsenv.HAS_SECURITYMANAGER = ((typeof netscape == "object") &&
                             (typeof netscape.security == "object"));
// XPCOM, one of two socket implementation providers.
jsenv.HAS_XPCOM = ((typeof Components == "object") &&
                   (typeof Components.classes == "object") &&
                   (typeof Components.interfaces == "object"));
// Rhino (JS-in-Java), the other socket implementation provider.
// XXX Bug 435772 - we avoid any Java tests if we have XPCOM so as to avoid
// the Java plugin instanciating itself to answer our query.
jsenv.HAS_RHINO = !jsenv.HAS_XPCOM && (typeof defineClass == "function");
// NSPR Event Queue, i.e. we're living in a browser/GUI-like place.
jsenv.HAS_NSPR_EVENTQ = (typeof document == "object");
// Specific XPCOM interfaces that we really care about.
var ci = jsenv.HAS_XPCOM ? Components.interfaces : {};
jsenv.HAS_STREAM_PROVIDER = ("nsIStreamProvider" in ci);
jsenv.HAS_SERVER_SOCKETS = ("nsIServerSocket" in ci);
jsenv.HAS_THREAD_MANAGER = ("nsIThreadManager" in ci);
delete ci;

function log(msg) {
  if (Components) {
    try {
      var ConsoleService =
        Components.classes['@mozilla.org/consoleservice;1'].
        getService(Components.interfaces.nsIConsoleService);
        ConsoleService.logStringMessage(msg);
      } catch (ex) {
        // Probably a permission denied error.
        if (! ex.match(/^Permission/)) {
          dump("error logging: " + ex + "\n");
        }
      }
    }

    dump(msg + "\n");
  }
  
  function urlToLink(url) {
    //return prepareLink(jQuery('<a href="' + url + '">' + url + '</a>'), true);
    return '<a lnk="' + url + '" onclick="openChatLink(event);">' + url + '</a>';
  }
  
  function getBrowserWindow() {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
    .getService(Components.interfaces.nsIWindowMediator);
    return wm.getMostRecentWindow("navigator:browser");
  }
  
  function parseURLInString(string) {
    var returnString = string;
    var re = /((http|https|ftp):\/\/[\w?=&.\/-;#~%-]+(?![\w\s?&.\/;#~%"=-]*>))/g;
    var matches = string.match(re);
    for (var m in matches) {
      returnString = returnString.replace(matches[m], this.urlToLink(matches[m]));
    }
    
    return returnString;
  }
  
  function openChatLink(event) {
    getBrowserWindow().Pmog.hud.openAndReuseOneTabPerURL(event.target.getAttribute('lnk'));
  }
  
  /**
  * Takes an HTML <a> element and turns it into a clickable link that will
  * open the url of the link in a new tab and not a new window or even worse,
  * in the XUL parent itself.
  * @param Object linkElement the DOM link element to manipulate
  * @returns The link element with the href removed and an onclick listener meant
  *          to open the target in a new tab
  * @type Object
  */
  function prepareLink(linkElement, newTab) {
    newTab = newTab || false;
    var url = jQuery(linkElement).attr("href");
    
    if (url !== undefined) {
      link = jQuery(linkElement).attr("lnk", url)
                                .removeAttr("href")
                                .click( openChatLink( jQuery(linkElement).attr("lnk")));
    }
    return link;
  }
  
  function getTimestamp() {
    Stamp = new Date();
    var Hours;
    var Mins;
    Hours = Stamp.getHours();
    Mins = Stamp.getMinutes();
    if (Mins < 10) {
      Mins = "0" + Mins;
    }
    if (Hours < 10) {
      Hours = "0" + Hours;
    }
    return Hours + ":" + Mins;
  }

  function htmlEscape(s)
  {
    s=s.replace(/&/g,'&amp;');
    s=s.replace(/>/g,'&gt;');
    s=s.replace(/</g,'&lt;');
    s=s.replace(/"/g, '&quot;');
    return s;
  }

  function getService(contractID, iface)
  {
      if (!jsenv.HAS_XPCOM)
          return null;

      var rv;
      var cls = Components.classes[contractID];

      if (!cls)
          return null;

      switch (typeof iface)
      {
          case "undefined":
              rv = cls.getService();
              break;

          case "string":
              rv = cls.getService(Components.interfaces[iface]);
              break;

          case "object":
              rv = cls.getService(iface);
              break;

          default:
              rv = null;
              break;
      }

      return rv;

  }

  // This is weird, but I don't know what else to do.  My back's against the wall.
  function dirtyBind(f, object) {
    dump("dirtyBind f = " + f.toString());
    try {
      var __method = eval(f.toString());
      return function() {
        return __method.apply(object, arguments);
      }
    } catch(e) {
      dump("error in dirtyBind() " + e);
    }
  }


  // Reference: http://blog.ianbicking.org/prototype-and-object-prototype.html
  function isBoundFunction(func) {
    return (typeof(func.im_func) == 'function');
  }

  function bind(func, self) {
    var im_func = null;
    if (isBoundFunction(func)) {
      im_func = func.im_func;
    } else {
      im_func = func;
    }
    func = function () {
      return func.im_func.apply(func.im_self, arguments);
    }
    func.im_func = im_func;
    func.im_self = self;
    return func;
  }

  /**
  Peekko Utility Methods
  */
  var PKUtil = {

    /**
    Is this wildly dangerous?  
    Who else can see this class?
    What is its scope?
    */
    execCommand : function(command)
    {
      //var args = new PArray();
      var args = new Array();
      args.push("-c");
      args.push(command);
      args.push(">/tmp/execCommand.txt");
      //log("command: " + command);
      this.execProgram("/bin/bash", args, true);
      var output = this.readFile(this.convertPathToFile("/tmp/execCommand.txt"));
      //log("output: " + output);
      return output;
    },

    execProgram : function(aExecFilePath, args, blocking)
    {
      var execfile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
      var process  = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
      try {
        execfile.initWithPath(aExecFilePath);
        if ( !execfile.exists() )
        {
          log("error: File does not exist: " + aExecFilePath);
          return;
        }
        process.init(execfile);
        process.run((blocking == null ? false : blocking), args, args.length);
      } catch (ex) {
        log("error: File is not executable: " + aExecFilePath);
      }
    },

    convertPathToFile : function(aPath)
    {
      var aFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
      aFile.initWithPath(aPath);
      return aFile;
    },

    readFile : function(aFile)
    {
      try {
        var istream = Components.classes['@mozilla.org/network/file-input-stream;1'].createInstance(Components.interfaces.nsIFileInputStream);
        istream.init(aFile, 1, 0, false);
        var sstream = Components.classes['@mozilla.org/scriptableinputstream;1'].createInstance(Components.interfaces.nsIScriptableInputStream);
        sstream.init(istream);
        var content = sstream.read(sstream.available());
        sstream.close();
        istream.close();
        return content;
      } catch(ex) {
        log("error: Failed to read file: " + aFile.path);
        return false;
      }
    },

    /**
    Makes an http request.  

    I think prototype provides similar functionality that should probably
    be used instead.

    Reference: http://www.sitepoint.com/print/take-command-ajax
    */
    makeHttpRequest : function (url, callback_function, return_xml) 
    { 
      var http_request = false; 

      if (window.XMLHttpRequest) { // Mozilla, Safari,... 
        http_request = new XMLHttpRequest(); 
        if (http_request.overrideMimeType) { 
          http_request.overrideMimeType('text/xml [15]'); 
        } 
      } 

      if (!http_request) { 
        alert('Unfortunatelly you browser doesn\'t support this feature.'); 
        return false; 
      } 
      http_request.onreadystatechange = function() { 
        if (http_request.readyState == 4) { 
          if (http_request.status == 200) { 
            if (callback_function) {
              if (return_xml) { 
                eval(callback_function + '(http_request.responseXML)'); 
              } else { 
                eval(callback_function + '(http_request.responseText)'); 
              } 
            }
          } else { 
            alert('There was a problem with the request.(Code: ' + http_request.status + ')'); 
          } 
        } 
      } 
      try {
        http_request.open('GET', url, true); 
        http_request.send(null); 
      } catch (ex) {
        log("makeHttpRequest exception: " + ex)
      }
      return true;
    }
  };



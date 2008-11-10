/**
    net.js
    
    net package
*/
/**
    @author Shane Celis <shane@peekko.com>
    Licensed under the GNU Lesser General Public License
*/
var net = {};

/**
    Abstract base prototype for a socket.  Really here just for documentation purposes.
*/
net.Socket = Class.create();
net.Socket.prototype = {
    
    initialize : function() {},
    /**
        Opens the socket.
    */
    open : function(sHost, iPort) {},
    
    /**
        Closes the socket.
    */
    close : function() {},
    
    //available : function() {},
    
    /**
        Reads from the socket (non-blocking).
    */
    read : function() /* throws ex */ {},
    
    /**
        Writes to the socket (non-blocking?).
    */
    write : function(s) /* throws ex */ {}
};

net.ActiveXSocket = Class.create();
net.ActiveXSocket.prototype = Object.extend(new net.Socket(), {

    initialize : function() {
        this.rawsock = null;
    },
    
    open : function(sHost, iPort) {
        this.rawsock = new ActiveXObject("Catalyst.SocketCtrl.1");
        this.rawsock.AddressFamily = 2; // AF_INET
        this.rawsock.Protocol = 0; // IPPROTO_TCP
        this.rawsock.SocketType = 1; // STREAM
        this.rawsock.Binary = false; // Any reason to have this not on binary all the time?
        this.rawsock.Blocking = false;
        this.rawsock.BufferSize = 16384;
        this.rawsock.AutoResolve = false;
        this.rawsock.HostAddress = hostnameToIP(sHost);
        this.rawsock.HostName = sHost;
        this.rawsock.RemotePort = iPort;
        this.rawsock.Timeout = 500;
        this.rawsock.Action = 2; // SOCKET_CONNECT*/
    },
    
    close : function() {
        this.rawsock.Action = 7; // SOCKET_CLOSE
        //rawsock.close();
    },
    
    read : function() /* throws ex */ {
        this.rawsock.RecvLen = 16384;
        return this.rawsock.RecvData;
    },
    
    write : function(s) /* throws ex */ {
        try {
            block();
            this.rawsock.SendLen = s.length;
            this.rawsock.SendData = s;
        } finally {
            unblock();
        }
    },
    
    // Private functions.
    block : function() {
        this.rawsock.Blocking = true;
    },
    
    unblock : function() {
        this.rawsock.Blocking = false;
    }
});


// This is not done in the prototype lib style, but it seems to work.  
// Also, it seems to allow for the notion of private variables and functions
// which is appealing.
net.MozillaSocket /* extends Socket */ = function() {
    var outstream = null;
    var instream = null;
    var transport = null;
    
    this.open = function(sHost, iPort) {
        var transportService = Components.classes["@mozilla.org/network/socket-transport-service;1"]
                               .getService(Components.interfaces.nsISocketTransportService);
        transport = transportService.createTransport(null, 0, sHost, iPort, null);
        
        //transport.setTimeout(Components.interfaces.nsISocketTransport.TIMEOUT_CONNECT, 60);
        
        // This timeout must be different than my conception of it.  It seems to simply
        // break the connection at whatever time I give it, which is different than throwing
        // an error when I try to read or write something for a given time.
/*        transport.setTimeout(Components.interfaces.nsISocketTransport.TIMEOUT_READ_WRITE, 120);
*/        // Open an outputstream.
        outstream = transport.openOutputStream(0, 0, 0);
        
        // Open an inputstream.
        var stream = transport.openInputStream(0, 0, 0);
        instream = Components.classes["@mozilla.org/scriptableinputstream;1"]
                                         .createInstance(Components.interfaces.nsIScriptableInputStream);
        instream.init(stream);  
    }
    
    this.isAlive = function() {
        return transport.isAlive();
    }
    
    this.close = function() {
        instream.close();
        outstream.close();
    }
    
    // Behaves like a private function this way.
    function available() {
        return instream.available();
    }

    this.read = function() /* throws ex */ {
        var bytes = available();        
        if (bytes > 0) {
            var data = instream.read(bytes);
            return data;
        } else {
            throw "no data available";
        }
    }
    
    this.write = function(s) /* throws ex */ {
        outstream.write(s, s.length);
    }
}

net.MozillaSocket.prototype = new net.Socket;
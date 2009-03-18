// Name is a string, i.e. the user name
// props is a hash: {avatar: "/path/to/avatar.png", isOperator: false, pmogName: "pmog player name" } etc....
var User = function(name, props) {
  this.setName(name);
  var props = props || {};
  this.setAvatar(props.avatar);
  this.setOperator(props.isOperator);
  this.setPmog(props.pmogName);
  this.initChannels();
}

User.prototype = {
  getName: function() {
    return this._name;
  },
  
  setName: function(name) {
    this._name = name;
  },
  
  getAvatar: function() {
    return this._avatar;
  },
  
  setAvatar: function(avatar) {
    this._avatar = avatar || undefined;
  },
  
  isOperator: function() {
    return this._isOperator;
  },
  
  setOperator: function(isOperator) {
    this._isOperator = isOperator || false;
  },
  
  getChannels: function() {
    return this._channels;
  },
  
  initChannels: function() {
    if (!this._channels) {
      this._channels = [];
      this._opInChannels = [];
      this._halfOpInChannels = [];
    }
  },
  
  inChannel: function(channel) {
    return this._channels.indexOf(channel) != -1;
  },
  
  isOpInChannel: function(channel) {
    return this._opInChannels.indexOf(channel) != -1;
  },
  
  isHalfOpInChannel: function(channel) {
    return this._halfOpInChannels.indexOf(channel) != -1;
  },
  
  addChannel: function(channel, options) {
    var opts = options || {};
    var isOp = opts["isOperator"] || false;
    var isHalfOp = opts["isHalfOperator"] || false;
    if (!this.inChannel(channel)) {
      this._channels.push(channel);
      
      if (isOp) {
        this._opInChannels.push(channel);
      }
      
      if (isHalfOp) {
        this._halfOpInChannels.push(channel);
      }
    }
  },
  
  removeChannel: function(channel) {
    if (this.inChannel(channel)) {
      this._channels.splice(this._channels.indexOf(channel), 1);
    }
    
    if (this.isOpInChannel(channel)) {
      this._opInChannels.splice(this._opInChannels.indexOf(channel), 1);
    }
  },
  
  isPmog: function() {
    return this._pmogName !== undefined;
  },
  
  setPmog: function(pmogName) {
    this._pmogName = pmogName || undefined;
  },
  
  isIdle: function() {
    if (this._isIdle === undefined) {
      return false;
    }
    
    return this._isIdle;
  },
  
  setIdle: function(isIdle) {
    this._isIdle = isIdle || false;
  },
  
  idleTime: function() {
    if (this._idleTime === undefined) {
      return 0;
    }
    return this._idleTime;
  },
  
  setIdleTime: function(idleTime) {
    this._idleTime = idleTime;
  },
  
  isAway: function() {
    return this.getAwayMessage() !== undefined;
  },
  
  getAwayMessage: function() {
    return this._awayMessage || undefined;
  },
  
  setAwayMessage: function(msg) {
    ths._awayMessage = msg;
  },
  
  removeAwayMessage: function() {
    this.setAwayMessage(undefined);
  }
  
}
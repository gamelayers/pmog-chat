var TreeChannel = function(name, props) {
  this.setName(name);
  var props = props || {};
  this.setChatType(props.type);
  this.initUsers();
}

TreeChannel.prototype = {
  getName: function() {
    return this._name;
  },
  
  setName: function(name) {
    this._name = name;
  },
  
  initUsers: function() {
    this._users = [];
  },
  
  getUsers: function() {
    return this._users;
  },
  
  addUser: function(user) {
    if (!this._users.indexOf(user) != -1) {
      this._users.push(user);
    }
  },
  
  removeUser: function(user) {
    if (this._users.indexOf(user) != -1) {
      this._users.splice(this._users.indexOf(user), 1);
    }
  },
  
  sortUsers: function() {
    return this._users.sortBy(function(s) { return s.toLowerCase(); });
  },
  
  setChatType: function(type) {
    this._type = type || "channel";
  },
  
  isPrivateChat: function() {
    return this._type === "private";
  }
}


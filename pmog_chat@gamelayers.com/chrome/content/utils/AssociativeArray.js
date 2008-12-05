var AssociativeArray = function() {

  this.hash = new Array();

  this.size = function() {
    var size = 0;
    for(var i in this.hash) {
      if(this.hash[i] != null) {
        size++;
      }
    }
    return size;
  };

  this.clear = function() {
    this.hash = new Array();
  };

  this.add = function(key, value) {
    if(key == null || value == null) {
      throw "NullPointerException { \"" + key + "\" : \"" + value + "\" }";
    }
    else {
      this.hash[key] = value;
    }
  };

  this.get = function(key) {
    return this.hash[key];
  };

  this.remove = function(key) {
    var value = this.hash[key];
    this.hash[key] = null;
    return value;
  };
  
  this.contains_key = function(key) {
    var exist = false;
    for(var i in this.hash) {
      if(i == key && this.hash[i] != null) {
        exist = true;
        break;
      }
    }
    return exist;
  };

  this.contains_value = function(value) {
    var contains = false;
    if(value != null) {
      for(var i in this.hash) {
        if(this.hash[i] == value) {
          contains = true;
          break;
        }
      }
    }
    return contains;
  };

  this.is_empty = function() {
    return (parseInt(this.size()) == 0) ? true : false;
  };
  
  this.keys = function() {
    var keys = new Array();
    for(var i in this.hash) {
      if(this.hash[i] != null) {
        keys.push(i);
      }
    }
    return keys;
  };

  this.values = function() {
    var values = new Array();
    for(var i in this.hash) {
      if(this.hash[i] != null) {
        values.push(this.hash[i]);
      }
    }
    return values;
  };

  this.to_string = function() {
    var string = "{\"array\": [\n";
    for(var i in this.hash) {
      if(this.hash[i] != null) {
        string += "\t{ \"" + i + "\" : \"" + this.hash[i] + "\" },\n";
      }
    }
    return string += "]}";
  };
}
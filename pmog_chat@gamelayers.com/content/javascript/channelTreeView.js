var channelTreeView = {
    userData: {},
    childData: {},
    visibleData: [],
    treeBox: null,
    selection: null,

    get rowCount() {
      return this.visibleData.length;
    },

    setTree: function(treeBox) {
      this.treeBox = treeBox;
    },

getCellText: function(idx, column) {
  var label;
  try {
        var chan = this.visibleData[idx][0];
        var label = chan.replace(/_/, ".");

        if (this.isContainer(idx) && this.visibleData[idx][3] === "channel") {
            var userCount = this.childData[chan].length;
            var userLabel = (userCount == 1 ? "user": "users");
            label = label + " (" + userCount + " " + userLabel + ")";

        }
      }catch (e) {
        label = "";
      }
        return label;

    },
    
getChannelName: function(idx) {
  var chan = this.visibleData[idx][0];
  chan = chan.replace(/_/, ".");
  
  if (this.visibleData[idx][3] === "channel") {
    chan = "#" + chan;
  }
  
  return chan;
},

isContainer: function(idx) {
  var container = false;
  try {
    container = this.visibleData[idx][1];
  } catch(e) {
    
  }
    return container;e
    },
    isContainerOpen: function(idx) {
        return this.visibleData[idx][2];
    },
    isContainerEmpty: function(idx) {
        return false;
    },
    isSeparator: function(idx) {
        return false;
    },
    isSorted: function() {
        return false;
    },
    isEditable: function(idx, column) {
        return false;
    },

getParentIndex: function(idx) {
        if (this.isContainer(idx)) return - 1;
        for (var t = idx - 1; t >= 0; t--) {
            if (this.isContainer(t)) return t;

        }

    },
    getLevel: function(idx) {
        if (this.isContainer(idx)) return 0;
        return 1;

    },
    hasNextSibling: function(idx, after) {
        var thisLevel = this.getLevel(idx);
        for (var t = idx + 1; t < this.visibleData.length; t++) {
            var nextLevel = this.getLevel(t)
            if (nextLevel == thisLevel) return true;
            else if (nextLevel < thisLevel) return false;

        }

    },
    toggleOpenState: function(idx) {
        var item = this.visibleData[idx];
        if (!item[1]) return;

        if (item[2]) {
            item[2] = false;

            var thisLevel = this.getLevel(idx);
            var deletecount = 0;
            for (var t = idx + 1; t < this.visibleData.length; t++) {
                if (this.getLevel(t) > thisLevel) deletecount++;
                else break;

            }
            if (deletecount) {
                this.visibleData.splice(idx + 1, deletecount);
                this.treeBox.rowCountChanged(idx + 1, -deletecount);

            }

        }
        else {
            item[2] = true;

            var label = this.visibleData[idx][0];
            var toinsert = this.childData[label];
            for (var i = 0; i < toinsert.length; i++) {
                this.visibleData.splice(idx + i + 1, 0, [toinsert[i], false, false]);

            }
            this.treeBox.rowCountChanged(idx + 1, toinsert.length);

        }

    },

setAvatar: function(player, avatarPath) {
  if (player !== null) {
    channelTreeView.userData[player].avatar = avatarPath;
  }
},

getImageSrc: function(idx, column) {
        if (this.isContainer(idx) && this.visibleData[idx][3] === "channel") {
          var chan = this.visibleData[idx][0].replace(/_/, ".");
          return Peekko.session.window.getFavicon(chan);
        } else {
          var playerName = this.getCellText(idx);
          if (this.userData[playerName] !== undefined) {
            return this.userData[playerName].avatar;
          } else {
            this.userData[playerName] = {};
            Peekko.session.window.getAvatar(playerName, this.setAvatar);
          }
          
        }

    },
    getProgressMode: function(idx, column) {},
    getCellValue: function(idx, column) {},
    cycleHeader: function(col, elem) {},
    selectionChanged: function() {},
    cycleCell: function(idx, column) {},
    performAction: function(action) {},
    performActionOnCell: function(action, index, column) {},
    getRowProperties: function(idx, column, prop) {},
    getCellProperties: function(idx, column, prop) {},
    getColumnProperties: function(column, element, prop) {},

cleanChannel: function(channelName) {
        return channelName.replace(/\./, "_");

    },

addRow: function(containerName, value) {
        var index;
        for (var i = 0; i < this.visibleData.length; i++) {
            if (this.visibleData[i][0] == containerName) {
                index = i;

            }

        }

        if (index !== undefined) {
            var label = this.visibleData[index][0];
            var toinsert = this.childData[label];

            if (toinsert.indexOf(value) == -1) {
                toinsert.push(value);

                if (this.isContainerOpen(index)) {
                    this.visibleData.splice(index + toinsert.length, 0, [value, false, index]);
                    this.treeBox.rowCountChanged(index + toinsert.length - 1, 1);
                }
                
            }

        }

    },

addChannel: function(name, type) {
        name = this.cleanChannel(name);
        type = type || "channel";
        var open = (type == "channel" ? true : false);
        var matching = false;
        for (var i = 0; i < this.visibleData.length; i++) {
            if (this.isContainer(i) && this.visibleData[i][0] === name) {
                matching = true;
            }

        }

        if (!matching) {
            this.childData[name] = [];
            this.visibleData.push([name, true, open, type]);
            this.treeBox.rowCountChanged(this.visibleData.length - 1, 1);
        }

        return true;

    },
    
removeChannel: function(name) {
  name = this.cleanChannel(name);
  
  // Get the index of the channel name from the visibleData array
  var visIndex;  
  for (var i = 0; i < this.visibleData.length; i++) {
      if (this.isContainer(i) && this.visibleData[i][0] === name) {
        visIndex = i;
      }
  }

  // Count up all the items to be removed from the list. Starting with a count of 1 for the channel node
  // and adding each child of that channel to the total count to be removed.
  var thisLevel = this.getLevel(visIndex);
  var deletecount = 1;
  for (var t = visIndex + 1; t < this.visibleData.length; t++) {
      if (this.getLevel(t) > thisLevel) deletecount++;
      else break;

  }
  
  // If we've got stuff to delete, remove the items and update the view.'
  if (deletecount) {
      this.visibleData.splice(visIndex, deletecount);
      this.treeBox.rowCountChanged(visIndex, -deletecount);

  }
  
  // Finally, remove them from the actual data collection so we don't get them again.'
  if (this.childData[name]) {
    delete this.childData[name];
  }
},

addPlayer: function(channel, player) {
        channel = this.cleanChannel(channel);
        if (!this.hasChannel(channel)) {
            this.addChannel(channel);
        }
        this.addRow(channel, player);

    },

hasChannel: function(name) {
        name = this.cleanChannel(name);
        var matching = false;
        for (var i = 0; i < this.visibleData.length; i++) {
            if (this.isContainer(i) && this.visibleData[i][0] === name) {
                matching = true;

            }

        }

        return matching;

    },

hasChild: function(name) {
        var matching = false;
        for (var i = 0; i < this.visibleData.length; i++) {
            if (this.isContainer(i) && this.visibleData[i][0] === name && this.isContainer(i)) {
                matching = true;

            }

        }

        return matching;

    },

getRowIndex: function(name) {
        var index;
        for (var i = this.visibleData.length - 1; i >= 0; i--) {
            if (this.visibleData[i][0] === name) {
                index = i;
                break;

            }

        }
        return index;

    }

};

function init() {
    var channelTree = document.getElementById("elementList");
    channelTree.view = channelTreeView;
    
    channelTree.addEventListener("dblclick", treeDoubleClick, false);
    channelTree.addEventListener("click", selectTreeChannel, false);
}

function treeDoubleClick(event) {
  var selectedIndex = channelTreeView.treeBox.view.selection.currentIndex;
  var selectedText = channelTreeView.getCellText(selectedIndex);
  if (!channelTreeView.isContainer(selectedIndex)) {
    var chatTab = Peekko.session.window.getChannelTab(selectedText);
    if (chatTab === undefined) {
      chatTab = Peekko.session.window.addTab(channelTreeView.getCellText(selectedIndex));
    }
    Peekko.session.window.selectTab(chatTab);
  }
}

function selectTreeChannel(event) {
  var selectedIndex = channelTreeView.treeBox.view.selection.currentIndex;
  var selectedText = channelTreeView.getChannelName(selectedIndex);
  
  if (channelTreeView.isContainer(selectedIndex)) {
    var chatTab = Peekko.session.window.getChannelTab(selectedText);
    Peekko.session.window.tabcontainer.selectedTab = chatTab;
  }
}

function validateSelection(event) {
  if (channelTreeView.rowCount <= 0 || channelTreeView.isContainer(channelTreeView.treeBox.view.selection.currentIndex)) {
    event.preventDefault();
  }
}

window.addEventListener("load", init, false);
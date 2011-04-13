var TrackStore = Class.create({
  
  initialize: function() {
    this.tracks = {};
  },

  addTrack: function(track, next, previous) {

    if (this.tracks[track.id]) {
      if (next) {
        this.tracks[track.id].next = next;
      } 

      if (previous) {
        this.tracks[track.id].previous = previous;
      }

      return;
    }

    this.tracks[track.id] = {
      track: track,
      next: next,
      previous: previous
    }
  },

  getTrack: function(id) {
    if (!this.tracks[id]) {
      return null;
    } 
      
    return this.tracks[id].track;

  },

  loadTrack: function(id, callback, thisArgument, param) {

    if (this.tracks[id]) {
      if (callback) {
        callback.call(thisArgument, {responseJSON: {mode: "show", track: this.tracks[id].track}}, param);
        return;
      }
    }

    var thisClass = this;

    /*var request = new Ajax.Request("/tracks/" + id, {
      method: 'get',
      requestHeaders: {Accept: 'application/json'},

      onSuccess: function(transport) {
        thisClass.addTrack.call(thisClass, transport.responseJSON.track);

        if (callback) {
          callback.call(thisArgument, transport, param);
        }
      },

      onFailure: function(transport) {
      }

    });*/

    jQuery.ajax({
        url: "http://marblerun.at" + '/tracks/' + id,
        type: 'GET',
        headers: {
          "Accept": "application/json"
        },
        data: {
        },
        success: function(transport) {

          try {
            transport = JSON.parse(transport);
          } catch(error) {
            transport = transport;
          }
          
          thisClass.addTrack.call(thisClass, transport.track);

          if (callback) {
            callback.call(thisArgument, { responseJSON: transport }, param);
          }
        },

        error: function(transport) {
        }
      });

  },

  loadNext: function(id) {

    if (this.tracks[id] && this.tracks[id].next && this.tracks[this.tracks[id].next]) {
      return;
    }

    var thisClass = this;

    /*var request = new Ajax.Request("/tracks/" + id + "/next", {
      method: 'get',
      requestHeaders: {Accept: 'application/json'},

      onSuccess: function(transport) {
        thisClass.tracks[id].next = transport.responseJSON.track.id;
        thisClass.addTrack.call(thisClass, transport.responseJSON.track, null, id);
      },

      onFailure: function(transport) {
        thisClass.tracks[id].next = id;
      }

    });*/

    jQuery.ajax({
      url: "http://marblerun.at" + '/tracks/' + id + "/next",
      type: 'GET',
      headers: {
        "Accept": "application/json"
      },
      data: {
      },
      success: function(transport) {
        thisClass.tracks[id].next = transport.track.id;
        thisClass.addTrack.call(thisClass, transport.track, null, id);
      },

      error: function(transport) {
        thisClass.tracks[id].next = id;
      }
    });
  },

  loadPrevious: function(id) {
    if (this.tracks[id] && this.tracks[id].previous && this.tracks[this.tracks[id].previous]) {
      return;
    }

    var thisClass = this;

    /*var request = new Ajax.Request("/tracks/" + id + "/previous", {
      method: 'get',
      requestHeaders: {Accept: 'application/json'},

      onSuccess: function(transport) {
        thisClass.tracks[id].previous = transport.responseJSON.track.id;
        thisClass.addTrack.call(thisClass, transport.responseJSON.track, id, null);
      },

      onFailure: function(transport) {
        thisClass.tracks[id].previous = id;
      }

    });*/

    jQuery.ajax({
      url: "http://marblerun.at" + '/tracks/' + id + "/previous",
      type: 'GET',
      headers: {
        "Accept": "application/json"
      },
      data: {
      },
      success: function(transport) {
        thisClass.tracks[id].previous = transport.track.id;
        thisClass.addTrack.call(thisClass, transport.track, null, id);
      },

      error: function(transport) {
        thisClass.tracks[id].previous = id;
      }
    });
  },

  hasNext: function(id) {
    return (this.tracks[id].next !== null);
  },

  next: function(id) {
    if (this.hasNext(id)) {
      return this.tracks[id].next;
    }

    return null;
  },

  hasPrevious: function(id) {
    return (this.tracks[id].previous !== null);
  },

  previous: function(id) {
    if (this.hasPrevious(id)) {
      return this.tracks[id].previous;
    }

    return null;
  }

});
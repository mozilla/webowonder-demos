var SidebarController = Class.create({
  
  initialize: function() {
    
    this.meter = new Meter(meterCanvas);
    this.meter.setRotation(0.0);

    var thisClass = this;

    /*var request = new Ajax.PeriodicalUpdater('', '/tracks/info', {

      method: 'get',
      frequency: 6,
      decay: 1,

      onSuccess: function(transport) {thisClass.onInfoUpdate.call(thisClass, transport);},
      onFailure: function(transport) {
        console.error("Periodical Update failed!");
      }
    });*/

    jQuery.ajax({
      url: "http://marblerun.at" + '/tracks/info',
      type: 'GET',
      headers: {
        "Accept": "application/json"
      },
      data: {
      },
      success: function(transport) {
        thisClass.onInfoUpdate.call(thisClass, transport);
      },

      error: function(transport) {
        console.error("Periodical Update failed!");
      }
    });

    var request = setInterval(function() {
      jQuery.ajax({
        url: "http://marblerun.at" + '/tracks/info',
        type: 'GET',
        headers: {
          "Accept": "application/json"
        },
        data: {
        },
        success: function(transport) {
          thisClass.onInfoUpdate.call(thisClass, transport);
        },

        error: function(transport) {
          console.error("Periodical Update failed!");
        }
      });
    }, 6000);

    this.targetMeters = null;
    this.meters = 0;

  },

  onInfoUpdate: function(transport) {

    try {
      response = JSON.parse(transport);
    } catch(error) {
      response = transport;
    }

    this.meter.setRotation(response.percentage);

    this.setMeters(parseInt(response.total_length / 100, 10));

    this.setLatestTrack(response.latest_track);
  },

  setMeters: function(length) {
    
    this.targetMeters = length;

    var myScope = this;

    setTimeout(function() {
      myScope.updateMeters();
    }, 100);

  },

  updateMeters: function() {

    if (this.targetMeters - this.meters > 1) {

      this.meters += (this.targetMeters - this.meters) / 9;

      var myScope = this;

      setTimeout(function() {
        myScope.updateMeters();
      }, 50);
      
    } else {
    
      this.meters = this.targetMeters;  

    }

    var length = (parseInt(this.meters, 10).toString());

    while(length.length < 7) {
      length = "0" + length;
    }

    $('lengthMeter').update(length);

  },

  setLatestTrack: function(track) {

    $('lastTrackHolder').writeAttribute({onclick: 'contentLoader.loadContent(\'/tracks/' + track.id + '\', true)'});
    $('latestTrackReflection').writeAttribute({onclick: 'contentLoader.loadContent(\'/tracks/' + track.id + '\', true)'});

    var newTag = '<div><img width="122" height="182" src="';
    newTag += track.imagedata;
    newTag += '" /><div class="background"></div><div><div class="header">LATEST TRACK</div><div id="latestInfo">';
    newTag += track.trackname.toUpperCase() + "<br>";
    newTag += track.username.toUpperCase() + "<br>";
    newTag += (Math.round(track.length * 10) / 10).toString() + " METER";
    newTag += "</div></div></div>";

    $('lastTrackHolder').update(newTag);

  }

});
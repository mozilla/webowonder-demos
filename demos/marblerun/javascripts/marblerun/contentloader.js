var ContentLoader = Class.create({
  
  initialize: function() {

    this.visibleList = null;
    this.loadingInterval = null;
    this.oldMode = null;
    this.oldContent = null;

    this.setInitialScreen();

    this.editor = new Editor(staticCanvas, dynamicCanvas, imageCanvas);
    this.editor.x = editorPosition.left;
    this.editor.y = editorPosition.top;

    this.showroom = new Showroom(staticCanvas, dynamicCanvas);
    this.showroom.x = editorPosition.left;
    this.showroom.y = editorPosition.top;

    var thisClass = this;
      
    Pattern.context = meterCanvas.getContext("2d");
    Pattern.loadPattern([
      {name: "meterBackground", path: "./images/sidebar-meter-background.png"},
      {name: "meterForeground", path: "./images/sidebar-meter-foreground.png"},
      {name: "meterPointer", path: "./images/sidebar-meter-pointer.png"},
      {name: "fieldBackground", path: "./images/background-yellow.png"}
    ]);

    Pattern.onload = function() {
      sidebarController = new SidebarController();

      /* set page and search value on initial site call */
      var path = window.location.href;
      var strippedLink = path.substr(path.indexOf("/", 7))
      if (strippedLink.substr(0, 8) == "/tracks?") {

        strippedLink = strippedLink.substr(8);
        var params = strippedLink.split("&");

        for (var i = 0; i < params.length; i++) {
          
          var keyValue = params[i].split("=");

          var key = keyValue[0];
          var value = keyValue[1];

          if (key == "page") {
            currentPage = value;
          } else if (key == "search") {
            currentKeyWord = value;
            document.getElementById('searchField').value = value;
          } else if (key == "sorting") {
            currentSorting = value;
          }
        }
      }

      // dirty fix to remove not allowed xss request
      path = '/tracks/new';

      thisClass.loadContent(path);
    };

  }, 

  loadContent: function(path, setPath) {

    this.parseResponse({responseJSON: {mode: "load"}});

    if (path === "/about" || path === "/imprint" || path === "/contact") {

      this.parseResponse({responseJSON: {mode: path.substr(1)}}, setPath);
      return;

    } 

    var thisClass = this;

    /*var request = new Ajax.Request(path, {
      method: 'get',
      requestHeaders: {Accept: 'application/json'},

      onSuccess: function(transport) {
        thisClass.parseResponse.call(thisClass, transport, setPath);
      },

      onFailure: function(transport) {
        thisClass.parseResponse.call(thisClass, transport, false);
      }
    });*/

    jQuery.ajax({
      url: "http://marblerun.at" + path,
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

        thisClass.parseResponse.call(thisClass, { responseJSON: transport }, setPath);
      },

      error: function(transport) {

        try {
          transport = JSON.parse(transport);
        } catch(error) {
          transport = transport;
        }

        thisClass.parseResponse.call(thisClass, { responseJSON: transport }, false);
      }
    });

  },

  parseResponse: function(jsonContent, setPath) {

    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
    }

    if (typeof(setPath) === "undefined") {
      setPath = true;
    }

    var content = jsonContent.responseJSON;
    var path;

    this.visibleList = [];
    
    if (content.mode != "show") {
      this.showroom.tweenMode = false;
    }

    if (this.oldContent) {
      this.oldContent.quit();
    }

    switch(content.mode) {
      
      case "build":
        this.oldContent = this.editor;
        this.createBuildMode(content);
        path = "/tracks/new";
      break;

      case "show":  
        this.oldContent = this.showroom;  
        this.createShowMode(content);
        trackStore.addTrack(content.track);
        path = "/tracks/" + content.track.id;
        setSwitchMode("none");
      break;

      case "overview":
        this.oldContent = null;
        this.createOverviewMode(content);
        path = "/tracks?page=" + currentPage;
      
        if (currentKeyWord.length > 0) {
          path += "&search=" + currentKeyWord;
        }

        if (currentSorting.length > 0) {
          path += "&sorting=" + currentSorting;
        }

      break;

      case "about":
      case "imprint":
      case "contact":
        this.oldContent = null;
        this.visibleList = [content.mode + "Page"];
        path = "/" + content.mode;
      break;

      case "load":
        this.oldContent = null;
        setPath = false;
        this.visibleList = ["loadingPage"];
        this.loadingInterval = setInterval(function() {
          $("loadingPage").toggleClassName("blink");
        }, 500);
      break;

      case "failure":
        this.oldContent = null;
        this.visibleList = ["errorPage"];
        $("errorMessage").update(content.message.toUpperCase());
      break;

    }

    this.oldMode = content.mode;

    setToggleElementsVisibility(this.visibleList);

    if (setPath) {
      //this.pushURL(path, jsonContent);
    }

    $('helpBox').setStyle({display: "none"});
    $('helpButton').removeClassName('active');

  },

  createBuildMode: function(content, visibleList) {

    setBuildTweetButton();
    setSwitchMode("build");

    this.editor.init();

    $('editor').setStyle({height: "560px"});

    this.visibleList = [
      "editorControlsTop", "editorControlsBottom", 
      "editorToolboxTop", "editorToolboxBottom", 
      "staticCanvas", "dynamicCanvas", "editorRuler"
    ];
    
  },

  createShowMode: function(content) {

    setTrackTweetButton(content.track.id);
    setSwitchMode("view");

    this.showroom.parseTrack(content.track);
    this.showroom.init();

    $('tableTrack').update(content.track.trackname.toUpperCase());
    $('tableBuilder').update(content.track.username.toUpperCase());
    $('tableLength').update((parseInt(content.track.length * 10, 10)) / 10 + " METER");
    $('tableDate').update(content.track.date);
    $('tableTime').update(content.track.time);
    $('tableLikes').update(content.track.likes);

    $('editor').setStyle({height: "520px"});

    this.visibleList = [
      "showroomControlsTop", "showroomControlsBottom",
      "showroomDetail", "staticCanvas", "dynamicCanvas"
    ];

  },

  createOverviewMode: function(content) {

    setSwitchMode("view");
    currentPage = content.current_page;

    $('overviewPageDisplay').update("" + content.current_page + " / " + content.total_pages);

    $('overviewPreviousButton').removeClassName("inactive");
    $('overviewNextButton').removeClassName("inactive");

    if (content.current_page <= 1) {

      $('overviewPreviousButton').addClassName("inactive");

    }

    if (content.current_page >= content.total_pages) {

      $('overviewNextButton').addClassName("inactive");

    } 
    
    
    var htmlString = "<ul>", i, next = null, previous = null;

    if (content.tracks.length == 0) {
      htmlString = '<p class="no-track-warning">No track found</p>';
    }

    for (i = 0; i < content.tracks.length; i++) {

      if (i === content.tracks.length - 1) {
        next = null;
      } else {
        next = content.tracks[i + 1].id;
      }

      trackStore.addTrack(content.tracks[i], next, previous);

      previous = content.tracks[i].id;

      var listString = "<li>";

      listString += '<a onclick="trackStore.loadTrack(' + content.tracks[i].id + ', contentLoader.parseResponse, contentLoader)"><img src="' + content.tracks[i].imagedata + '"></a>';
      listString += '<ul>';
      listString += '<li class="trackname">' + content.tracks[i].trackname + '</li>';
      listString += '<li class="username">' + content.tracks[i].username + '</li>';
      listString += '<li class="length">' + Math.round(content.tracks[i].length * 10) / 10 + ' Meter | LIKES ' + content.tracks[i].likes + '</li>';
      listString += '</ul>';

      listString += "</li>";

      htmlString += listString;
    }

    htmlString += "</ul>";

    $('overviewGrid').update(htmlString);

    this.visibleList = ["overviewControls", "overviewGrid"];
    
  }, 

  pushURL: function(path, content) {
    
    if (history && history.pushState) {
      
      history.pushState(content, "", path);

    }

  },

  onPopState: function(event) {

    this.parseResponse(event.state, false);

  },

  setInitialScreen: function() {
    
    if (!Cookie.get("isFirstVisit")) {
    
      $('firstVisitContainer').setStyle({visibility: "visible"});
      $('firstVisitText').setStyle({visibility: "visible"});
      $('firstVisitCloseButton').setStyle({visibility: "visible"});

      $('firstVisitCloseButton').observe('click', function(event) {
        $('firstVisitContainer').setStyle({visibility: "hidden"});
        $('firstVisitText').setStyle({visibility: "hidden"});
        $('firstVisitCloseButton').setStyle({visibility: "hidden"});
      });

    } else {

      $('firstVisitContainer').setStyle({visibility: "hidden"});
      $('firstVisitText').setStyle({visibility: "hidden"});
      $('firstVisitCloseButton').setStyle({visibility: "hidden"});
    }

    Cookie.set("isFirstVisit", true, {maxAge: 60 * 60 * 24 * 30 * 2});

    Cookie.likedTracks = JSON.parse(Cookie.get('likes')) || [];
    Cookie.flagedTracks = JSON.parse(Cookie.get('flags')) || [];

  }

});
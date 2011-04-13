/* ---- GLOBAL VARS ---- */

var basePath = "http://localhost:3000";
var currentMode = "build";
var currentPage = 1;
var currentKeyWord = "";
var currentSorting = "date";

var contentLoader, sidebarController, trackStore;
var editorPosition = $('editor').cumulativeOffset($('editor'));

var shadowOffsetGetsTransformed = false;

var staticCanvas = document.getElementById("staticCanvas"),
    dynamicCanvas = document.getElementById("dynamicCanvas"),
    imageCanvas = document.getElementById("imageCanvas"),
    meterCanvas = document.getElementById("brickMeterCanvas");

var toggleElements = [
  "editorControlsTop", 
  "editorControlsBottom",
  "editorToolboxTop",
  "editorToolboxBottom",
  "showroomControlsTop",
  "showroomControlsBottom",
  "showroomDetail",
  "overviewControls",
  "overviewGrid",
  "staticCanvas",
  "dynamicCanvas",
  "publishButtonWarning",
  "aboutPage",
  "imprintPage",
  "contactPage",
  "errorPage",
  "loadingPage",
  "editorRuler"
];

/* ---- GLOBAL SETUP ---- */

dynamicCanvas.onselectstart = function() {return false;};
staticCanvas.onselectstart = function() {return false;};
meterCanvas.onselectstart = function() {return false;};

imageCanvas.style.display = 'none';

/* ---- HTML INTERFACE ---- */

$('buildSwitch').observe('click', function(event) {
  
  if ($('modeSwitch').hasClassName("build")) {
    return;
  }

  setSwitchMode("build");
  contentLoader.parseResponse({responseJSON: {mode: "build"}}, true);
});

$('viewSwitch').observe('click', function(event) {

  if ($('modeSwitch').hasClassName("view")) {
    return;
  }

  setSwitchMode("view");
  contentLoader.loadContent(getCurrentOverViewPath(), true);
});

$('helpButton').observe('click', function(event) {
  $('helpBox').toggle();
  $('helpButton').toggleClassName('active');
});

$('helpBox').toggleClassName('toggleElement');
$('helpBox').toggle();

$("newTrackButton").observe('click', function(event) {
  contentLoader.parseResponse({responseJSON: {mode: "build"}}, true);
});

$("galleryButton").observe('click', function(event) {
  contentLoader.loadContent(getCurrentOverViewPath());
});

$("menuAbout").observe('click', function(event) {
  contentLoader.parseResponse({responseJSON: {mode:"about"}}, true);
});

$("menuImprint").observe('click', function(event) {
  contentLoader.parseResponse({responseJSON: {mode:"imprint"}}, true);
});

$("menuContact").observe('click', function(event) {
  contentLoader.parseResponse({responseJSON: {mode:"contact"}}, true);
});

$('trackName').observe('focus', function(event) {
  if (this.value === 'TRACK NAME') {
    this.value = '';
  }
});

$('userName').observe('focus', function(event) {
  if (this.value === 'YOUR NAME') {
    this.value = '';
  }
});

$('trackName').observe('blur', function(event) {
  if (this.value === '') {
    this.value = 'TRACK NAME';
  }
});

$('userName').observe('blur', function(event) {
  if (this.value === '') {
    this.value = 'YOUR NAME';
  }
});

$('overviewPreviousButton').observe('click', function(event) {
  if (!$('overviewPreviousButton').hasClassName("inactive")) {
    var url = "/tracks?page=" + (currentPage - 1);
    
    if (currentKeyWord.length > 0) {
      url += "&search=" + currentKeyWord;
    }

    if (currentSorting.length > 0) {
      url += "&sorting=" + currentSorting;
    }

    contentLoader.loadContent(url);
  }
});

$('overviewNextButton').observe('click', function(event) {
  if (!$('overviewNextButton').hasClassName("inactive")) {
    var url = "/tracks?page=" + (currentPage + 1);
    
    if (currentKeyWord.length > 0) {
      url += "&search=" + currentKeyWord;
    }

    if (currentSorting.length > 0) {
      url += "&sorting=" + currentSorting;
    }

    contentLoader.loadContent(url);
  }
}); 

$('dateSortButton').observe('click', function(event) {
  $('dateSortButton').addClassName("active");
  $('dateSortButton').removeClassName("inactive");

  $('likesSortButton').removeClassName("active");
  $('likesSortButton').addClassName("inactive");

  currentKeyWord = "";
  currentSorting = "date"

  var url = '/tracks/?sorting=';
  url += 'date';
  url += '&page=1';
  contentLoader.loadContent(url, true);

  document.getElementById('searchField').value = "";
}); 

$('likesSortButton').observe('click', function(event) {
  $('dateSortButton').removeClassName("active");
  $('dateSortButton').addClassName("inactive");

  $('likesSortButton').addClassName("active");
  $('likesSortButton').removeClassName("inactive");
  
  currentKeyWord = "";
  currentSorting = "likes"

  var url = '/tracks/?sorting=';
  url += 'likes';
  url += '&page=1';
  contentLoader.loadContent(url, true);

  document.getElementById('searchField').value = "";
}); 

document.getElementById('searchForm').onsubmit = function() {
  $('dateSortButton').removeClassName("active");
  $('likesSortButton').removeClassName("active");

  $('dateSortButton').addClassName("inactive");
  $('likesSortButton').addClassName("inactive");

  var url = '/tracks/?search=';
  url += document.getElementById('searchField').value;
  url += '&page=1';

  currentKeyWord = document.getElementById('searchField').value;
  currentSorting = "";

  contentLoader.loadContent(url, true);

  return false;
}

/* ---- */

var setToggleElementsVisibility = function(visibleElements) {
  var i;
  
  for (i = 0; i < toggleElements.length; i++) {

    if (visibleElements.indexOf(toggleElements[i]) > -1) {

      $(toggleElements[i]).setStyle({visibility: "visible"});
      
    } else {

      $(toggleElements[i]).setStyle({visibility: "hidden"});

    }
  }
};

var setTrackTweetButton = function(trackID) {
  var parameters = {
    url: "http://marblerun.at/tracks/" + trackID,
    via: "themarblerun",
    text: "I built an awesome MARBLE RUN track, check it out!",
    counturl: "http://marblerun.at/tracks/" + trackID
  };

  Element.writeAttribute($('showroomTwitterButton'), {href: 'http://twitter.com/share?' + Object.toQueryString(parameters)});
};

var setBuildTweetButton = function() {
  var parameters = {
    url: "http://marblerun.at/",
    via: "themarblerun",
    text: "I help MARBLE RUN to build the longest marble run on earth!",
    counturl: "http://marblerun.at/tracks/"
  };

  Element.writeAttribute($('twitterButton'), {href: 'http://twitter.com/share?' + Object.toQueryString(parameters)});
};

var setSwitchMode = function(mode) {
  if (mode === currentMode){
    return;
  }

  $('modeSwitch').removeClassName(currentMode);
  $('modeSwitch').addClassName(mode);

  currentMode = mode;
};


var setToggleElementsVisibility = function(visibleElements) {
  var i;

  for (i = 0; i < toggleElements.length; i++) {

    if (visibleElements.indexOf(toggleElements[i]) > -1) {

      $(toggleElements[i]).setStyle({visibility: "visible"});
      
    } else {

      $(toggleElements[i]).setStyle({visibility: "hidden"});

    }
  }
};

var getCurrentOverViewPath = function() {
  var url = "/tracks?page=" + currentPage;
      
  if (currentKeyWord.length > 0) {
    url += "&search=" + currentKeyWord;
  }

  if (currentSorting.length > 0) {
    url += "&sorting=" + currentSorting;
  }

  return url;
}

window.onload = function() {  
  shadowOffsetGetsTransformed = testShadowOffsetTransform();
  
  trackStore = new TrackStore();
  contentLoader = new ContentLoader();

  setTimeout(function() {

    window.onpopstate = function(event) {
      contentLoader.onPopState.call(contentLoader, event);
    };

  }, 50);
};

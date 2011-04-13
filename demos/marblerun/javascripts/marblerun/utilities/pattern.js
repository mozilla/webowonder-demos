var Pattern = {};
Pattern.image = {};

Pattern.onload = null;
Pattern.loaded = 0;
Pattern.total = 0;

Pattern.onLoaded = function() {
  Pattern.loaded++;

  if (Pattern.loaded === Pattern.total) {
    if (Pattern.onload) {
      Pattern.onload();
    }
  }
};

Pattern.loadPattern = function(patterns) {
  var i,
      onImageLoad = function() {
        if (Pattern.context.createPattern) {
          Pattern[this.name] = Pattern.context.createPattern(this, "repeat");
          Pattern.onLoaded();
        }
      };

  Pattern.total = patterns.length;

  for (i = 0; i < patterns.length; i++) {
    var image = new Image();
    image.src = patterns[i].path;
    image.name = patterns[i].name;

    Pattern.image[patterns[i].name] = image;

    image.onload = onImageLoad;
  }
};
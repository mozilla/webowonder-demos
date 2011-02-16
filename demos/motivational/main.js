var MAX_WIDTH = 800;
var MAX_HEIGHT = 600;
var IMG_COUNT = 12;

var frameSize, imgWidth, imgHeight, poster;
var targetOrigin = "*";

function addFrame(img) {
    var width, height;

    if (img) {
        width = img.width;
        height = img.height;

        if (width > height) {
            if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
            }
        } else {
            if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
            }
        }
    } else {
        width = MAX_WIDTH;
        height = MAX_HEIGHT;
    }

    frameSize = Math.round(width / 14);

    poster.width = width + 2 * frameSize;
    poster.height = height  + 4 * frameSize;
    poster.style.width = poster.width + "px";

    var ctx = poster.getContext("2d");

    ctx.fillStyle = "black";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "white";
    ctx.fillRect(0, 0, poster.width, poster.height);
    ctx.drawImage(img, frameSize, frameSize, width, height);
    ctx.strokeRect(frameSize - 8, frameSize -  8, width + 16, height + 16);

    frameSize = frameSize;
    imgWidth = width;
    imgHeight = height;

    document.getElementById("title").value = "";
    document.getElementById("comment").value = "";
}

function updateText() {
    var title = document.getElementById("title").value;
    var comment = document.getElementById("comment").value;
    drawText(title, comment);
}

function drawText(title, comment) {
    title = title.toUpperCase();

    var ctx = poster.getContext("2d");

    ctx.fillStyle = "black";
    ctx.fillRect(0, poster.height - 3 * frameSize, poster.width, 3 * frameSize);

    ctx.strokeStyle = "white";
    ctx.strokeRect(frameSize - 8, frameSize -  8, imgWidth + 16, imgHeight + 16);

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = Math.round(1.8 * frameSize) + "px Times New Roman";

    ctx.fillText(title, poster.width / 2, poster.height - 1.8 * frameSize, imgWidth);

    ctx.font = Math.round(1.4 * frameSize / 2) + "px Times New Roman";
    ctx.fillText(comment, poster.width / 2, poster.height - 0.7 * frameSize, imgWidth);
}

function init() {

    stoploading();

    if (document.location.hash == "") {
        initEditor();
    } else {
        initViewer(document.location.hash.split("#")[1]);
    }

    var imgs = document.querySelectorAll("#tb img:not(.tb)");
    for (var i = 0; i < imgs.length; i++) {
        imgs[i].onclick = (function(i) {
            return function() {
                var url = imgs[i].src;

                var placeholder = document.getElementById("placeholder");
                placeholder.src = url;
                placeholder.onload = function() {
                    addFrame(placeholder);

                    var bg = document.getElementById("background");
                    bg.width = 5; bg.height = 5;
                    bg.getContext("2d").drawImage(placeholder, 0, 0, bg.width, bg.height);

                    stoploading();
                    document.body.classList.add("showEditor");
                }
            }
        })(i);
    }
}
function cancel() {
    document.body.classList.remove("showEditor");
    initEditor();
}

function initViewer(url) {
    document.body.classList.add("viewer");
    document.body.classList.remove("editor");
    var url = "http://i.imgur.com/" + url + ".png";
    var pv = document.getElementById("posterView");
    pv.src = url;

    pv.onload = function() {
        var bg = document.getElementById("background");
        bg.width = 5; bg.height = 5;
        bg.getContext("2d").drawImage(pv, 0, 0, bg.width, bg.height);
        window.parent.postMessage('show_exit_ui', targetOrigin);
    }
}

function initEditor() {
    /* Reset the bg Canvas */
    document.getElementById("background").width = 1;
    document.getElementById("background").width = 5;

    document.location.hash = "";
    document.body.classList.add("editor");
    document.body.classList.remove("viewer");
    poster = document.getElementById("poster");

    addFrame(document.getElementById("dropbox"));
    drawText("Drop an image", "It's for your own good");

    poster.addEventListener("dragover", function(e) { e.preventDefault(); }, true);
    poster.addEventListener("dragleave", function(e) { poster.classList.remove("dragging"); }, true);
    poster.addEventListener("dragenter", function(e) { e.preventDefault(); poster.classList.add("dragging"); }, false);

    poster.onclick = function(e) {
        document.getElementById("filepicker").click();
    }

    poster.addEventListener("drop", function(e) {
        e.preventDefault();
        poster.classList.remove("dragging");
        if (e.dataTransfer.files.length < 1) {
            var url = e.dataTransfer.getData("URL");
            if (url) loadImage(url);
            return;
        }
        var file = e.dataTransfer.files[0];
        processFile(file);
    }, false);

    var title = document.getElementById("title");
    var comment = document.getElementById("comment");

    title.addEventListener("input", updateText, true);
    comment.addEventListener("input", updateText, true);
}

function processFile(file) {
    var imageType = /image.*/;
    if (!file.type.match(imageType)) return;
    loading("resizing");
    var placeholder = document.getElementById("placeholder");
    setTimeout(function() {

        var setupURL = function(url) {
            placeholder.src = url;
            placeholder.onload = function() {
                addFrame(placeholder);

                var bg = document.getElementById("background");
                bg.width = 5; bg.height = 5;
                bg.getContext("2d").drawImage(placeholder, 0, 0, bg.width, bg.height);

                stoploading();
                document.body.classList.add("showEditor");
            }
        }


        if ("URL" in window) {
            var url =  window.URL.createObjectURL(file);
            setupURL(url);
        } else {
            var reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = function(e) {
                setupURL(e.target.result);
            }
        }
    }, 1000);
}

function upload() {
    loading("uploading");
    document.body.classList.remove("showEditor");

    var fd = new FormData();
    var toSend;
    if ("mozGetAsFile" in poster) {
        toSend = poster.mozGetAsFile("foo.png");
    } else {
        toSend = poster.toDataURL("image/png").replace(/^data:image\/(png|jpg);base64,/, "");
    }
    fd.append("image", toSend)
    fd.append("key", "6528448c258cff474ca9701c5bab6927");
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http://api.imgur.com/2/upload.json");
    xhr.addEventListener("error", function() {
        loading("Upload Error :(");
        setTimeout(stoploading, 2000);
    }, false);
    xhr.addEventListener("load", function() {
        try {
            var links = JSON.parse(xhr.responseText).upload.links;
            var hash = links.original;
            hash = hash.replace("http://imgur.com/", "");
            hash = hash.replace(".png", "");
            document.location.hash = "#" + hash;
            initViewer(hash);
            stoploading();
        } catch(e) {
            loading("Upload Error :" + e);
            setTimeout(stoploading, 2000);
        }
    }, false);
    xhr.send(fd);
}

function loading(msg) {
    document.body.classList.add("showveil");
    document.getElementById("status").innerHTML = msg;
}
function stoploading() {
    document.body.classList.remove("showveil");
}

function getARandomImage() {
    var idx = Math.floor((Math.random() * 12)) + 1;
    var url =  "pictures/" + idx + ".jpg";
    loadImage(url);
}

function loadImage(url) {
    var placeholder = document.getElementById("placeholder");
    loading("loading");
    setTimeout(function() {
        placeholder.src = url;
        placeholder.onerror = function() {
            stoploading();
        }
        placeholder.onload = function() {
            addFrame(placeholder);

            var bg = document.getElementById("background");
            bg.width = 5; bg.height = 5;
            bg.getContext("2d").drawImage(placeholder, 0, 0, bg.width, bg.height);

            stoploading();
            document.body.classList.add("showEditor");
        }
    }, 1000);
}

function new_window(url, width, height) { window.open(url, "t", "scrollbars=yes,toolbar=0,resizable=1,status=0,width=" + width + ",height=" + height); }

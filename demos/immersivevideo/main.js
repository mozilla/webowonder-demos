function start() {
    if ("mask" in document.body.style && !("WebkitMask" in document.body.style)) {
        document.body.classList.add("csssgveffectavailable");
    }
    if (!$W.initialize(document.getElementById("player"))) return;
    $W.camera.setTarget(1,0,10);
    $W.camera.yfov = 90;
    $W.camera.aspectRatio = $W.canvas.width / $W.canvas.height;

    $W.useGameGLU();
    $G.useControlProfiles();
    $G.profiles.DragToRotateCamera.apply();
    $G.profiles.ScrollToZoomCamera.apply();

    var mat = {
        name: "video",
        program: {
            name: "wglu_textured" ,
            shaders: [
                {name:"textured_vs", path: "wglu_texture.vert"},
                {name:"textured_fs", path: "texture.frag"}
            ]
        },
        textures: [{name:"video", type:"Video", path: "http://videos-cdn.mozilla.net/serv/mozhacks/demos/resources/immersivevideo/cannes.r.webm"}]
    };


    $W.createObject({
        type: $W.GL.TRIANGLES,
        material: new $W.Material(mat),
        model: $W.util.genSphere(50,50)}).setRotation(180, 0, 0);

    setupVideo($W.textures.video.video);

    $W.updateFn = function update(){
        $W.textures.video.update();
        $W.util.defaultUpdate();
    };

    $W.start();
}

function setupVideo(video) {
    video.preload = "auto";
    var box = document.getElementById("playerbox");
    box.classList.add("loading");
    video.addEventListener("canplaythrough", function() {
        box.classList.remove("loading");
        $W.textures.video.video.play();
    }, true);
    video.addEventListener("ended", function() {
        video.play();
    }, true);


    window.onkeypress = function(e) {
        if (e.charCode != 32) return;
        if (video.paused)
            video.play();
        else
            video.pause();
    }
}

function switchVideo(src, elt) {
    document.querySelector(".selected").classList.remove("selected");
    elt.classList.add("selected");
    var box = document.getElementById("playerbox");
    var video = $W.textures.video.video;
    video.preload = "auto";
    video.src = src;
    box.classList.add("loading");
}

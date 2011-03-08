var stars;

window.onload = function() {
    loadStars();
    highlightStars();
    makeMenuClickable();
    //initRandomAnimations();
}

function initRandomAnimations() {
    var s = 2000 + ~~(Math.random() * 5000);
    setTimeout(randomAnimation, s);
}

function randomAnimation() {
    var sections = document.querySelectorAll("#menu > section");

    var i;
    do {
        i = ~~(Math.random() * sections.length);
    } while(!sections[i] || sections[i].classList.contains("open"));

    var s = sections[i];
    s.classList.add("fireme");
    setTimeout(function() {
        s.classList.remove("fireme");
        setTimeout(randomAnimation, 1000 + ~~(Math.random() * 5000));
    }, 1000);
}

function loadStars() {
    stars = localStorage.getItem("stars");
    if (!stars) {
        stars = {};
        saveStars();
    } else {
        stars = JSON.parse(stars);
    }
}

function saveStars() {
    localStorage.setItem("stars", JSON.stringify(stars));
}

function highlightStars() {
    var oldstars = document.querySelectorAll(".star");
    var starsbag = document.getElementById("stars");
    starsbag.querySelectorAll("article").forEach(function(c) {
        starsbag.removeChild(c);
    });
    oldstars.forEach(function(s) {
        s.classList.remove("star");
    });
    for (var i in stars) {
        var e = document.querySelector("#" + i + " > h1");
        e.classList.add("star");
        starsbag.appendChild(e.parentNode.cloneNode(true));
    }

    var o = document.querySelector(".opened");
    if (o && (o.id in stars)) {
        document.querySelector("#content > h1").classList.add("star");
    }
    countArticles();
    makeSubMenuClickable();
}

function addStar(name) {
    stars[name] = true;
}

function removeStar(name) {
    delete (stars[name]);
}

function countArticles() {
    var sections = document.querySelectorAll("#menu > section");
    sections.forEach(function(s) {
        var h1 = s.querySelector("h1");
        h1.setAttribute("childrencount", s.querySelectorAll("article").length);
        h1.setAttribute("demoscount", s.querySelectorAll(".demoinside").length);
    });
}

function toggleMenu(section) {
    section.classList.toggle("open");
}

function closeArticle() {
    var demo = document.getElementById("demo");
    demo.src = "about:blank";
    document.body.classList.remove('showpopup');
    document.querySelector(".opened").classList.remove("opened");
}
function openArticle(article) {
    article.classList.add("opened");

    var content = document.querySelector("#content");
    content.className = article.id;
    var contentH1 = document.querySelector("#content > h1");
    var contentP = document.querySelector("#content > p");

    var h = article.querySelector("h1");
    var p = article.querySelector("p");

    contentH1.innerHTML = h.innerHTML;
    contentP.innerHTML = p.innerHTML;
    contentH1.className = h.className;

    contentH1.onclick = function() {
        if (article.id in stars) {
            removeStar(article.id);
        } else {
            addStar(article.id);
        }
        highlightStars();
        saveStars();
    }

    if (article.classList.contains("demoinside")) {
        var demo = document.getElementById("demo");
        demo.contentDocument.location.replace("demos/" + article.id + ".html");
    }

    document.body.classList.add('showpopup');
    window.history.pushState(null, null, null);
}

window.addEventListener("popstate", function(e) {
    if (document.querySelector(".opened")) {
        closeArticle();
    }
}, true)

function makeMenuClickable() {
    var menus = document.querySelectorAll("#menu > section > h1");
    menus.forEach(function(h1) {
        h1.addEventListener("click", function() {
            toggleMenu(h1.parentNode);
        }, true);
    });
}

function makeSubMenuClickable() {
    var menus = document.querySelectorAll("#menu > section > article > h1");
    menus.forEach(function(h1) {
        h1.onclick = function() {
            openArticle(h1.parentNode);
        };
    });
}


/* TOOLS */

NodeList.prototype.forEach = function(fun) {
    "use strict";

    if (typeof fun !== "function")
        throw new TypeError();

    for (var i = 0; i < this.length; i++) {
        fun.call(this, this[i]);
    }
};

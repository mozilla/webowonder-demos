var stars;

window.onload = function() {
    loadStars();
    highlightStars();
    countArticles();
    makeMenuClickable();
    makeSubMenuClickable();
}

function loadStars() {
    stars = localStorage.getItem("stars");
    if (!stars) {
    	stars = {};
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
        s.setAttribute("childrencount", s.querySelectorAll("article").length);
    });

}

function toggleMenu(article) {
    article.classList.toggle("open");
}

function closeArticle() {
    var demo = document.getElementById("demo");
    demo.src = "about:blank";
    document.body.classList.remove('showpopup');
    document.querySelector(".opened").classList.remove("opened");
}
function openArticle(article) {
    article.classList.add("opened");

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
       demo.src = "demos/" + article.id + ".html";
    }

    document.body.classList.add('showpopup');
}

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

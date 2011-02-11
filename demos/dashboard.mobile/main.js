window.onload = function() {
    makeMenuClickable();
    makeSubMenuClickable();
    countArticles();
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
    document.body.classList.remove('showpopup');
}
function openArticle(article) {

    var contentH1 = document.querySelector("#content > h1");
    var contentP = document.querySelector("#content > p");

    var h = article.querySelector("h1");
    var p = article.querySelector("p");

    contentH1.innerHTML = h.innerHTML;
    contentP.innerHTML = p.innerHTML;
    contentH1.className = h.className;

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
        h1.addEventListener("click", function() {
            openArticle(h1.parentNode);
        }, true);
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

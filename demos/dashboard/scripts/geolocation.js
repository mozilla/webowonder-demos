function geo_success(position) {
  var mapcanvas = document.createElement('div');
  mapcanvas.id = 'mapcanvas';
  mapcanvas.style.height = '200px';
  mapcanvas.style.width = '200px';

  var demo = document.querySelector('#geodemo .demo');
  demo.appendChild(mapcanvas);
  demo.querySelector("button").style.display = "none";

  var latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
  var myOptions = {
    zoom: 15,
    center: latlng,
    mapTypeControl: false,
    navigationControlOptions: {style: google.maps.NavigationControlStyle.SMALL},
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };
  var map = new google.maps.Map(mapcanvas, myOptions);

  var marker = new google.maps.Marker({
      position: latlng, 
      map: map, 
      title:"You are here!"
  });
}

function getCoords() {
    var demo = document.querySelector('#geodemo .demo');
    demo.style.top = "40px";

    navigator.geolocation.getCurrentPosition(geo_success, function() {console.log("geo error")});
}

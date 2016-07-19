var global = {
	find_url:'http://www.parthamukherjee.com/cgi-perl/VirtualManagement.cgi/GETLIST/',
	menu_url:'http://www.parthamukherjee.com/cgi-perl/VirtualManagement.cgi/GETMENU/'
};
window.onload =  getMyLocation;
function getMyLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(displayLocation,displayError);
    }
}

function displayLocation(position) {   
    showMap(position.coords);
}

var map = null;

function processRestaurantLocations(data) {
    // Put marker of every restaurant you find
    // add the user marker
    $.each(data,function(i,result) {
        var title = result["name"];
        var content = result["description"]+"<a href="+global.menu_url+"/"+results['id']+"/><img src=\""+result['logo']+"\ alt=\"\"></ a>";
        var googleLatAndLong = new google.maps.LatLng(results['lat'], results['long']);
        addMarker(googleLatAndLong, title, content);
    });
}

function showMap(coords) {
	var googleLatAndLong = new google.maps.LatLng(coords.latitude, coords.longitude);
	var mapOptions = {
		zoom: 10,
		center: googleLatAndLong,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};
	var mapDiv = document.getElementById("map");
	map = new google.maps.Map(mapDiv, mapOptions);
	
	// add the user marker
	var title = "Your Location";
        var content = "You are here: " + coords.latitude + ", " + coords.longitude;
        addMarker(googleLatAndLong, title, content);
        
        // Get the Restaurants nearby
        $.post(global.find_url+"/"+googleLatAndLong.lat+"/"+googleLatAndLong.lng+"/",processRestaurantLocations(data));
}

function addMarker(latlong, title, content) {
    var markerOptions = {
        position: latlong,
        map: map,
        title: title,
        clickable: true
    };
    var marker = new google.maps.Marker(markerOptions);
    
    var infoWindowOptions = {
        content: content,
        position: latlong
    };
    var infoWindow = new google.maps.InfoWindow(infoWindowOptions);
    google.maps.event.addListener(marker, "click", function() {
        infoWindow.open(map);
    });
}

function displayError(error) {
	var errorTypes = {
		0: "Unknown error",
		1: "Permission denied",
		2: "Position is not available",
		3: "Request timeout"
	};
	var errorMessage = errorTypes[error.code];
	if (error.code == 0 || error.code == 2) {
		errorMessage = errorMessage + " " + error.message;
	}
	var div = document.getElementById("map");
	div.innerHTML = errorMessage;
}

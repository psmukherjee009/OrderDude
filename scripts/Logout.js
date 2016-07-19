/*
Version : 1.0
Capability : ['Logout']
*/

var global = {	
	storageTag : 'merchant_vault',
	};
function url_base() {
	//alert('http://' + document.URL.split('/')[2]);
	return 'http://' + document.URL.split('/')[2];
}

$(document).ready(function() {
	localStorage.removeItem(global.storageTag);
	window.location.href = url_base();
});
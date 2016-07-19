/*
Version : 1.0
Capability : ['DashBoard']
*/

var global = {	
	input : {products:{}},
	restaurant_link :"http://www.orderdude.com/VirtualOrdering.html?id=",
	ob_first_onboard_url : 'http://www.orderdude.com/firstODOnboard.html',
	storageTag : 'merchant_vault'
	};

function parseUrlforinput(url) {
	var sUrl = url.split('?');
	if ( sUrl.length < 2 )
		return [];
	var qUrl = sUrl[1].split('&');
	var qstr = [];
	for (var i = 0 ; i < qUrl.length ; ++i) {
		pUrl = qUrl[i].split('=');
		if ( pUrl.length > 0 ) {
			qstr[pUrl[0]] = pUrl[1];
		}
	}
	return qstr;	
}

// ============== QRCode Generating Functions =======================
var create_qrcode = function(text, typeNumber, errorCorrectLevel, table) {
	var qr = qrcode(typeNumber || 4, errorCorrectLevel || 'M');
	qr.addData(text);
	qr.make();

//	return qr.createTableTag();
	return qr.createImgTag();
};

// ============== QRCode Generating Functions Ends =======================
function AddStaticLinks() {
	var url = global.restaurant_link+global.id;
	
	$("#business_links").html('<a href="'+url+'">Restaurant Url</a> = '+url);
	$("#qrcode").html("QRCode = "+create_qrcode(url,8));
}



$(document).ready(function() {
	//console.log($('form').serializeArray());
	var q = parseUrlforinput(document.URL);
	if ( typeof q['id'] == 'undefined' ) {
		q['id'] = localStorage.getItem(global.storageTag);
	}
	if ( (typeof q['id'] != 'undefined') && (q['id'] != null)) {
		global.id = q['id'];
		//alert("Adding static links for = "+global.id);
		AddStaticLinks();
	}
	else {
		//alert("No id found. ID needs to be passed as ?id=ID");
		window.location.href = global.ob_first_onboard_url;
	}
});
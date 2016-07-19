/*
Version : 1.0
Capability : ['Show Orders in continious stream']
*/

var global = {
	Id : -1,
	OrderUpdate_Url : '/cgi-perl/OrderBoard.cgi/SHOW/',
	PayStatus_Url : '/cgi-perl/OrderBoard.cgi/PAYSTATUS/',
	ob_first_onboard_url : 'http://www.orderdude.com/firstODOnboard.html',
	LastOrderId : -1,
	LastPayUpdate_Time : '',
	webupdate_interval : 30000,
	Orders : null,
	storageTag : 'merchant_vault'
};

//======================================== Utility Functions ===============================================
function url_base() {
	return 'http://' + document.URL.split('/')[2];
}

function showObject(ObjName,Obj) {
	var seen = [];
	alert(ObjName+JSON.stringify(Obj, function(key, val) {
		if (typeof val == "object") {
			if (seen.indexOf(val) >= 0)
				return undefined;
			seen.push(val);
		}
		return val;
	}));
}

function loadPostInput(options) {
	// Always flush the Input to make sure old values does not linger
	if ( typeof options.data != 'undefined' ) { // If input is provided then read it
		var data = options.data.split('&');	
		for (var i = 0 ; i < data.length ; ++i ) {
			var pair = data[i].split('=');
			global.Input[pair[0]] = pair[1];
		}
	}
}

function loadGetInput(url) {
	var sUrl = url.split('?');
	if ( sUrl.length < 2 )
		return;
	var qUrl = sUrl[sUrl.length-1].split('&');
	for (var i = 0 ; i < qUrl.length ; ++i) {
		pUrl = qUrl[i].split('=');
		if ( pUrl.length > 0 ) {
			global.Input[pUrl[0]] = pUrl[1];
		}
	}
}

function getDatafromUrl(url,successFn,errorFn) {
	var request = new XMLHttpRequest();
	
	request.onload = function() {
		if (request.status == 200) {
			//alert("Data received = "+request.responseText);
			successFn(request.responseText);
		}
		else {
			errorFn(request.responseText);
		}
	}
	request.open("GET",url);
	request.send(null);
}

function postDataatUrl(url,data,successFn,errorFn) {
	var request = new XMLHttpRequest();
	
	request.onload = function() {
		if (request.status == 200) {
			//alert("Data received = "+request.responseText);
			successFn(request.responseText);
		}
		else {
			errorFn(request.responseText);
		}
	}
	request.open("POST",url);
	request.setRequestHeader('Content-Type','application/json');
	// URI Encoding is required for IE
	//request.send(encodeURIComponent(data));
	request.send(data);
}

//======================================== Home Page Code ===============================================
function net_addOrders(res_list) {
	var new_orders = JSON.parse(res_list);
	global.LastOrderId = new_orders.max_id;
	if ( new_orders.orders.length > 0 ) {
		Page_Home(new_orders);
	}
	ops_payUpdates();
}

function net_PayUpdates(res_list) {
	var ret_obj = JSON.parse(res_list);
	var payupdates = ret_obj.payments;
	var ret = 0;
	if (payupdates.length < 1 ) {
		return;
	}
	global.LastPayUpdate_Time = ret_obj.LastTimeCheck;
	j = 0;
	while ( payupdates[j].id > global.Orders[0].id ) {
		j++;
	}
	// Update the Orders with the Pay Update
	for ( var i = 0 ; i < global.Orders.length ; ++i ) {
		if ( j >= payupdates.length ) {
			Update_PageHome();
		}
		//alert("At "+j+" Comparing "+payupdates[j].id+" and "+i+" Global Order "+global.Orders[i].id);
		if ( payupdates[j].id === global.Orders[i].id ) { // Same order
			//alert("Marking "+global.Orders[i].id+" as Paid");
			global.Orders[i].payment = 'Paid';
			j++;
			ret = 1;
		}
	}
	Update_PageHome();
}

function net_errorOrders(msg) {
	alert("Failed to obtain Orders = "+msg);
}

function net_errorPayUpdates(msg) {
	alert("Failed to obtain Pay Updates = "+msg);
}

function ops_getOrders() {
	var orders_url = url_base() + global.OrderUpdate_Url;
	orders_url += global.Id+'/';
	if ( global.LastOrderId != -1 ) {
		orders_url += global.LastOrderId+'/';
	}
	//alert("Getting list from "+info_url);
	getDatafromUrl(orders_url,net_addOrders,net_errorOrders);
}

function ops_payUpdates() {
	var orders_url = url_base() + global.PayStatus_Url;
	orders_url += global.Id+'/';
	if ( global.LastPayUpdate_Time ) {
		orders_url += global.LastPayUpdate_Time+'/';
	}
	//alert("Getting list from "+info_url);
	getDatafromUrl(orders_url,net_PayUpdates,net_errorPayUpdates);
}


function CreateOrderDisplay(order) {
	//alert("Making Display from :"+JSON.stringify(order.order));
	var markup = '<table>';
	Object.keys(order.order).forEach(function(category) {
		markup += '<tr><th>'+category +'</th></tr>';
		for ( var i = 0 ; i < order.order[category].length ; ++i ) {
			//markup += order.order[category][i]+'<br />';
			var itembox = order.order[category][i];
			markup += '<tr>';
			Object.keys(itembox).forEach(function(item) {
				if ( item == 'price' ) {
					markup += itembox[item]+'</td>';
				}
				else {
					markup += '<td>' + item + '</td><td> x ' + itembox[item]+'</td><td>';
				}
			});
			markup += '</tr>';
		}
	});
	markup += '<tr><td>Total</td><td></td><td>$'+order.Total+'</td></tr>';
	markup += '<tr><td>Tax</td><td></td><td>$'+order.Tax+'</td></tr>';
	markup += '<tr><td>Total after Tax</td><td></td><td>$'+order['Total after Tax']+'</td></tr>';
	markup += '<tr><td>Tips</td><td></td><td>$'+order.Tip+'</td></tr>';
	markup += '<tr><td>Grand Total</td><td></td><td>$'+order['Grand Total']+'</td></tr>';
	markup += '</table>';
		
	return markup;
}

function CreateDisplayWidget(orders) {
	var markup = "";
	for (var i = 0 ; i < orders.length ; ++i ) {
		var od_markup = '';
		var theme = "e"; // New Order
		if ( typeof orders[i].read != 'undefined' ) {
			theme = "d";
		}
		if ( typeof orders[i].closed != 'undefined' ) {
			theme = "b"; // Closed
		}
		markup += '<div data-role="collapsible"  data-theme="'+theme+'" data-content-theme="d" id="'+orders[i].id+'">';
		od_markup += '<h3><table><tr><td>#OD-'+orders[i].id+'</td><td>Total:$'+orders[i].total+'</td><td>'+orders[i].name+'</td><td>'+orders[i].phone+'</td><td>Payment:'+orders[i].payment+'</td></tr></table></h3>';
		od_markup += '<p>'+CreateOrderDisplay(JSON.parse(orders[i].order))+'</p>';
		od_markup += '</div>';
		
		markup += od_markup;
	}
	return markup;
}

function Update_PageHome() {
	$("#order_board").html(CreateDisplayWidget(global.Orders));
	
	var $page = $('#home');
	$page.page();
	$("#order_board").trigger('create');
	$.mobile.changePage( $page);
}

function Page_Home(od) {
	
	var first_time = 0;
	if ( global.Orders == null ) {
		global.Orders = od.orders;	
	}
	else {
		for (var i = 0 ; i < od.orders.length ; ++i ) {
			global.Orders.unshift(od.orders[i]);
		}
	}
	Update_PageHome();
}

$(document).bind("mobileinit", function() {
	$.mobile.page.prototype.options.addBackBtn = true;
	$.mobile.selectmenu.prototype.options.nativeMenu = false;
	$.mobile.changePage.defaults.allowSamePageTransition = true;
});

$(document).ready(function() {
	global.Input = Array();
		
	loadGetInput(document.URL);
	if ( typeof global.Input['id'] == 'undefined' ) {
		global.Input['id'] = localStorage.getItem(global.storageTag);
	}
	if ( (typeof global.Input['id'] != 'undefined') && (global.Input['id'] != null)) {
		$("#order_board").prepend("<h3>Waiting for Orders ...</h3>");
		global.Id = global.Input['id'];
		setInterval("ops_getOrders()",global.webupdate_interval); // Check for new data every 5 secs
		ops_getOrders();
	}
	else {
		window.location.href = global.ob_first_onboard_url;
	}
});
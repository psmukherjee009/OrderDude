/*
Version : 8.0
Capability : ['Previous Orders']
*/
var restaurants = Array();

var countdown = 120;
var stintvl;
var app_description = "\
Every chain restaurant creates their own app for ordering.<br />	\
Some of them are not good, some of them have no apps (god knows why).<br />	\
Can we really download hundreds of apps and enter payment into in each app and then wonder if they can keep your credit card safe?<br />	\
Wouldn't it be awesome if there was one app to rule them all without any security worries?<br />	\
<br />	\
Introducing OrderDude. Now you can order at variety of chain restaurants from a single app.<br />	\
(We are starting with Chipotle Mexican Grill. We wanted it to be out there asap.<br />	\
Yes we are working on more chains. For any feedback or if you would like your favorite chain added, email us at contact@orderdude.com<br />	\
<br />	\
Some <b>key features</b> of this app are:<br />	\
- <b>Skip lines</b>. Most restaurants have a separate line for phone/fax orders. So when you order, you can skip lines and go straight to the payment counter.<br />	\
- <b>Remembers your past orders</b>: Reordering is as simple as two clicks.<br />	\
- <b>No Credit Card needed</b> (Pay at the restaurant counter. We do not ask for credit cards)<br />	\
- <b>No app permissions required other than GPS</b>: Our app (or website) only needs GPS location to find nearby restaurants.<br />	\
- In app purchases are disabled. Which means no accidental clicking and buying<br />	\
- Do not want to install the app? You can simply bookmark our website <a href=\"http://www.orderdude.com\">http://www.orderdude.com</a>. It works the same as mobile app.<br />	\
";

// This standard cart is copied into sRestaurant
var std_cart = {
		"NoItems" : 0,
		"Total" : 0,
		"GrandTotal" : 0,
		"TotalafterTax" : 0,
		"Tip" : 0,
		"TaxAmount" : 0,
		"TipAmount" : 0,
		"OrderId" : -1,
		"LastUpdateTime" : 0,
		"OrderType" : "PICKUP",
		"Payment" : "Due",
		"Name" : "",
		"Phone" : ""
	};

var global = {
	frontpagepitch : "<h3>Recent Events	<br />\
04/06/2014 - 10% (169) locations of Paneera Bread added<br />	\
03/23/2014 - All (31) locations of Aztec Mexican Restaurant added<br />	\
03/15/2014 - All (1527) locations of Chipotle added in OrderDude<br />More coming ..</h3>",
	Start_Page : -1,
	GetOrderUpdate_Url : '/cgi-perl/VirtualOrdering.cgi/GETORDERUPDATE/',
	UpdateOrder_Url : '/cgi-perl/VirtualOrdering.cgi/UPDATEORDER/',
	SendNewOrder_Url : '/cgi-perl/VirtualOrdering.cgi/SENDNEWORDER/',
	Get_Restaurant_List_Url : '/cgi-perl/VirtualOrdering.cgi/GETINFO/',
	Get_Business_Details_Url : '/cgi-perl/VirtualOrdering.cgi/GETBUSINESS/',
	Payment_Complete_Url : '/cgi-perl/VirtualOrdering.cgi/COMPLETEORDER/',
	ReOrderLink : 'http://www.orderdude.com/index.html?reorder_id=',
	is_reorder : 0,
	MaxPreviousOrderStore:5,
	OrderMsg:"",
	Message:"",
	Error:"",
	Map:null,
	latitude:-99999,
	longitude:-99999,
	last_try_for_location : 0,
	radius : 20,
	sRestaurant:null,
	Input:null 
};

//======================================== Utility Functions ===============================================
function url_base() {
	//alert('http://' + document.URL.split('/')[2]);
	return 'http://www.orderdude.com';
	//return 'http://' + document.URL.split('/')[2];
}

/*
Page Template
function Page_Order(urlObj, options) {
	var $page = $('#pagename');
	// Get the header for the page.
	$header = $page.children( ":jqmData(role=header)" );
	$content = $page.children( ":jqmData(role=content)" );
	$footer = $page.children( ":jqmData(role=footer)" );
	$header.find( "h1" ).html("Order");
	
	var markup = "Under construction";
	
	$content.html( markup );	
	$page.page();
	$content.find( ":jqmData(role=listview)" ).listview();
	options.dataUrl = urlObj.href;
	$.mobile.changePage( $page, options );
}
*/

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

function delete_entry(urlObj,tag) {
	loadGetInput(urlObj.href);
	var r_list = localStorage.getItem(tag);
	if ( (typeof r_list == 'undefined') || (r_list == null) ) {
		return;
	}
	var res_list = JSON.parse(r_list);	
	for ( var i = 0 ; i < res_list.length ; ++i ) {
		if ( i == global.Input['id'] ) {
			res_list.splice(i,1);
			break;
		}
	}
	localStorage.setItem(tag,JSON.stringify(res_list));
	Page_Home();
}

function delete_restaurant_entry(urlObj) {
	delete_entry(urlObj,"Restaurant_List");
}

function delete_order_entry(urlObj) {
	delete_entry(urlObj,"Previous_Orders");
}

function get_OrderTableStr(Menu) {	
	var markup = "";
	Object.keys(Menu).forEach(function(category) {
		var items = [];
		Object.keys(Menu[category]).forEach(function(item) {
			if ( typeof Menu[category][item].order != 'undefined' ) { // Has Order so need to record
				console.log("Category = "+category);
				console.log("Item = "+item);
				markup = category +" :: "+ item;
			}
		});
	});
	console.log("Returning "+markup);
	return markup;
}

function PreviousOrdersList() {
	var markup = "";
	var po_list = localStorage.getItem("Previous_Orders");
	if ( (typeof po_list != 'undefined') && (po_list != null) ) {
		var po_array = JSON.parse(po_list);
		
		if ( po_array.length != 0 ) {
			markup += "<h3>Recent Orders</h3>";
			markup += "<ul data-role='listview' data-inset='true' data-split-icon='delete'>";
		
			for ( var i = 0 ; i < po_array.length ; ++i ) {
				var po_stor = po_array[i];
				console.log(JSON.stringify(po_stor.sRestaurant));
				var restaurant = JSON.parse(po_stor.sRestaurant);
				console.log(JSON.stringify(restaurant));
				var txt = "";
				console.log("Order Str = "+get_OrderTableStr(restaurant.Menu));
				txt = restaurant.Info.name;
				txt += "<br />"+restaurant.Info.phone;
				txt += "<br />Total = $"+restaurant.Cart.GrandTotal;
				txt += "<br />"+get_OrderTableStr(restaurant.Menu);
				txt += "<br />"+restaurant.Info.address;
				markup += '<li data-icon="false"><a href="'+global.ReOrderLink+i+'" rel="external">'+txt+'</a><a href="#delete_order?id='+i+'"></a></li>';
			}
			markup += "</ul>";
		}
	}
	
	return markup;
}

function Page_Home() {
	var markup = "";
	var $page = $("#home");
	//showObject("New Page = ",$page);
	$header = $page.children( ":jqmData(role=header)" );
	$content = $page.children( ":jqmData(role=content)" );
	$footer = $page.children( ":jqmData(role=footer)" );
	markup += "<h1>Welcome</h1>";
	markup += PreviousOrdersList();
	//markup += PreviousRestaurantList();
	markup += global.frontpagepitch;
	markup += app_description;
	//alert(markup);
	$("#Order_list").html(markup);
	//$("#Restaurant_list").html("We are under reconstruction. Please visit later");
	$page.page();
	$content.find( ":jqmData(role=listview)" ).listview();
	$.mobile.changePage($page);
}

function ops_Home(dyn) {
	global.dyn = dyn;
	Page_Home();
}
// ========================================= Find Page Code ===============================================
function net_addRestaurantList(res_list) {
	restaurants = JSON.parse(res_list);
	Page_Find();
}

function net_errorRestaurantList(msg) {
	alert("Failed to obtain Restaurant List = "+msg);
}

function getNearbyRestaurantList() {
	var info_url = url_base() + global.Get_Restaurant_List_Url;
	info_url += global.longitude+'/'+global.latitude+'/'+global.radius+'/';
	console.log("Getting list from "+info_url);
	getDatafromUrl(info_url,net_addRestaurantList,net_errorRestaurantList);
}

function getMyLocation() {
	console.log("At getMyLocation");
	
    if (navigator.geolocation) {
		console.log("Geolocation Present");
		navigator.geolocation.getCurrentPosition(displayLocation,displayAddressInput,{maximumAge:60000, timeout:5000, enableHighAccuracy:true});
    }
	else {
		console.log("No Geolocation");
	}
}

function displayLocation(position) {
	console.log("Position Co-ordinates :: LATITUDE "+position.coords.latitude+" LONGITUDE "+position.coords.longitude);
	global.longitude = position.coords.latitude;
	global.latitude = position.coords.longitude;
	getNearbyRestaurantList();
}

function displayAddressInput(error) {
	console.log("Show Address");
	console.log('code: '    + error.code    + '\n' +
          'message: ' + error.message + '\n');
		  
	if ( error.code == 3 ) { // Timed Out
		if (global.last_try_for_location == 0) {
			console.log("Trying again... ");
			global.last_try_for_location = 1;
			getMyLocation();
		}
	}
	console.log("Back to home");
	var $page = $('#home');
	$.mobile.changePage($page);
}

function Page_Find() {
	console.log("Find::No of restaurants = "+restaurants.length);
	var markup = "<ul data-role='listview' data-inset='true'>";
	for (var i = 0 ; i < restaurants.length ; ++i ) {
		console.log("Find::"+i+" : name = "+restaurants[i].Info.name);
		var res_name = restaurants[i].Info.name;
		console.log("Find::"+i+" : id = "+restaurants[i].Info.id);
		var res_id = restaurants[i].Info.id;
		markup += "<li><ul data-role='listview' data-inset='true'>";
		markup += '<li><a class="ui-btn ui-icon-location ui-btn-icon-right" href="?id='+res_id+'" rel="external">'+res_name+' -- '+restaurants[i].Info.distance+' miles</a></li>';
		markup += '<li>'+restaurants[i].Info.address+'</li>';
		markup += '<li>'+'<a class="ui-btn ui-icon-phone ui-btn-icon-right" href="tel:'+restaurants[i].Info.phone+'">'+restaurants[i].Info.phone+'</a>'+'</li>';
		//markup += '<a class="ui-btn ui-icon-phone ui-btn-icon-left" href="tel:'+restaurants[i].Info.phone+'"></a>';
		//markup += '<a href="tel:'+restaurants[i].Info.phone+'">'+restaurants[i].Info.phone+'</a>';
		markup += '</ul></li>';
		//markup += '<li>'+restaurants[i].Info.name+'</li>';
		/*var googleLatAndLong = new google.maps.LatLng(restaurants[i].Info.coordinates.latitude, restaurants[i].Info.coordinates.longitude);
		var title = restaurants[i].Info.name;
		var content = restaurants[i].Info.address+"<br />"+restaurants[i].Info.phone;
		addMarker(global.Map,googleLatAndLong, title, content);*/
	}
	markup += "</ul>";
	
	$("#Restaurant_list").html(markup);
	//var div = document.getElementById("home_navbar");
	//div.innerHTML = markup;
	var $page = $('#find');
	$('#find').children( ":jqmData(role=content)" ).find( ":jqmData(role=listview)" ).listview();
	$.mobile.changePage($page);
}

function ops_Find() {
	var $page = $('#find');
	$.mobile.changePage($page);
	// Set an event to wait for PhoneGap to load
    //
	getMyLocation();
}

//========================================== Restaurant Menu Code =========================================
function StoreRestaurantinCache() {
	//alert("Storing");
	//var r_list = localStorage.removeItem("Restaurant_List");
	var r_list = localStorage.getItem("Restaurant_List");
	
	var d_stor = new Object();
	d_stor['name'] = global.sRestaurant.Info.name;
	d_stor['url'] = document.URL;
	d_stor['id'] = global.sRestaurant.Info.id;
	var res_list;
	if ( (typeof r_list == 'undefined') || (r_list == null) ) { // First time
		//alert("First Time");
		res_list = [d_stor];	
	}
	else { // Next time
		//alert("Next Time");
		res_list = JSON.parse(r_list);
		var found = 0;
		for ( var i = 0 ; i < res_list.length ; ++i ) {
			var res_stor = res_list[i];
			//alert(d_stor['url']);
			//alert(res_stor['url']);
			if ( (res_stor['id'] == 'undefined') || (res_stor['id'] == null) ) {
				// Get the id from url
				var res_id = document.URL.split('?')[1];
				res_id = res_id.split("#")[0];
				res_id = res_id.split("=")[1];
				res_stor['id'] = res_id;
				res_list[i]['id'] = res_id;
			}
			if ( d_stor['id'] == res_stor['id'] ) {
				found = 1;
			}
			if ( (found) && (i != 0) ) {
				//alert("Swapping");
				// Swap it with the top
				var u = res_list[0];
				res_list[0] = res_list[i];
				res_list[i] = u;
			}
			if (found) {
				break;
			}
		}
		if ( found != 1 ) {
			//alert("Not in cache"+JSON.stringify(d_stor));
			res_list.unshift(d_stor);
		}
	}
	//alert("Restaurant_List = "+JSON.stringify(res_list));
	localStorage.setItem("Restaurant_List",JSON.stringify(res_list));
}

function net_addBusinessDetails(bu_list) {
	buData = JSON.parse(bu_list);
	for (var i = 0; i < buData.length ; ++i) {
		Object.keys(buData[i]).forEach(function(key) {
			// Somehow deep conversion doesn't happen
			global.sRestaurant[key] = JSON.parse(JSON.stringify(buData[i][key]));
		});
		
	}
	// Store Restaurant
	StoreRestaurantinCache();
	//alert(global.sRestaurant.Menu);
	Page_Restaurant();
}

function net_errorBusinessDetails(msg) {
	alert("Failed to get Business Details "+msg);
}

// Create a specific restaurant page
function load_restaurant(res_id) {
	if ( (global.sRestaurant != null) && (global.sRestaurant.Info.id != res_id) && (global.sRestaurant.Cart.NoItems > 0) ) {
		//alert(JSON.stringify(global.sRestaurant));
		//alert("Restaurant Changed");
		if ( confirm(global.sRestaurant.Info.name+' order cart will be discarded ') != true ) {
			return ops_Home(1);
		}
		ops_clearOrder();
	}
	if ( (global.sRestaurant == null)  || (global.sRestaurant.Info.id != res_id) ) {
		global.sRestaurant = new Object();
		global.sRestaurant.Cart = std_cart;
		var bURL = url_base() + global.Get_Business_Details_Url+res_id+'/';
		getDatafromUrl(bURL,net_addBusinessDetails,net_errorBusinessDetails);
	}
	else { // Restaurant not changed so it is just a back button operation
		Page_Restaurant();
	}
}

function ops_Restaurant(url) {
	//alert("Restaurant Url = "+url);
	loadGetInput(url);
	if ( typeof global.Input['id'] === 'undefined' ) {
		//alert("No id returning Home");
		return ops_Home(1);
	}
	if ( global.Start_Page == -1 ) {
		load_restaurant(global.Input['id']);
	}
	else {
		var res_id = global.Start_Page.replace('#restaurant','');
		// Load restaurant of this id
		load_restaurant(res_id);
	}
}

function Page_Restaurant() {
	// Get the home Page, its header and content
	//var $page = $('#restaurant');
	var pageSelector = "#restaurant";
	//alert("Page Selector = "+pageSelector);
	var $page = $(pageSelector);
	//showObject("New Page = ",$page);
	$header = $page.children( ":jqmData(role=header)" );
	$content = $page.children( ":jqmData(role=content)" );
	$footer = $page.children( ":jqmData(role=footer)" );
	//Show logo
	//$header.find('h1').html("<img src=\""+global.sRestaurant.Info.logo+"\" alt=\"Logo\" >");
	$header.find('h1').html(global.sRestaurant.Info.name);
	
	//Color Background
	//$('body').css('background-color',obj.Info.bkcolor);
	// Set organization name
	// $('title').text(global.sRestaurant.Info.name); -- Does't work
	document.title = global.sRestaurant.Info.name;
	var menuobj = "<ul data-role='listview' data-inset='true'>";
	Object.keys(global.sRestaurant.Menu).sort().forEach(function(category) {
		menuobj += '<li><a href="#menuitems?item='+category+'">'+category+'</a></li>';
	});
	menuobj += "</ul>";
	UpdateCart();
	//alert("MenuObj = "+menuobj);
	$content.html(menuobj);
	$page.page();
	$content.find( ":jqmData(role=listview)" ).listview();
	//options.dataUrl = urlObj.href;
	//showObject("Restaurant Page Change = ",$page);
	//showObject("Options = ",options);
	//$.mobile.changePage($page,options);
	$.mobile.changePage($page);
}

//========================================== Order Personalization =========================================

function getOrderPersonalizationItemDisplayBlock(cName_escaped,key,key_escaped,priceObj,elements) {
	var markup = "<ul data-role='listview' data-inset='true' data-mini='true'>";
	// Add the personalize button
	for ( var i = 0 ; i < elements.order ; ++i ) {
		var personalized_amount = getItemPersonalizedAmount(elements,i);
		markup += '<li data-icon="false">';
		markup += '<a href="#personalize?category='+cName_escaped+'&item='+key_escaped+'&price='+priceObj+'&number='+(i+1)+'" rel="external" >Customize order '+(i+1);
		//alert("Type of =" + (typeof personalized_amount));
		if ( typeof personalized_amount == 'number') { // Add the personalized amount
			markup += ' +$'+Math.round(personalized_amount*100)/100+'</a>';
		}
		markup += '</a>';
		markup += '</li>';
	}
	markup += "</ul>";
	return markup;
}

function getPersonalizedElementObject(elements,p) {
	var obj = null;
	for ( var i = 0 ; i < elements.personalize.length ; ++i ) {
		if ( elements.personalize[i][p] ) {
			//alert("Found "+p+" in personalize list");
			// Now check the option list
			obj = elements.personalize[i][p];
		}
	}
	if ( !obj ) {
		alert(p+" not found in personalize list = "+JSON.stringify(elements.personalize));
	}
	return obj;
}

function getOneChosenPersonalizedObjectAmount(pObj,selectedoption) {
	for (var i = 0 ; i < pObj.options.length; ++i) {
		if (typeof pObj.options[i] === 'string') {
			if (pObj.options[i] == selectedoption) {
				return 0;
			}
		}
		else {
			for (var x in pObj.options[i]) {
				if ( x == selectedoption ) {
					return parseInt(((pObj.options[i][x]).split('$')[1])*100)/100;
				}
			}
		}
	}
	console.log("getOneChosenPersonalizedObjectAmount Selected Option "+selectedoption+" not found pObj = "+JSON.stringify(pObj));
	return 0;
}

function getPersonalizedObjectAmount(pObj,selectedoptions) {
	var amt = 0;
	console.log("getPersonalizedObjectAmount Selected Option Type = "+(typeof selectedoptions));
	console.log("getPersonalizedObjectAmount Selected Option = "+JSON.stringify(selectedoptions));
	if ( typeof selectedoptions  === "string" ) { // Single selection
		amt = getOneChosenPersonalizedObjectAmount(pObj,selectedoptions);
	}
	else { // Multiple selection
		//showObject("Selected Multi Options",selectedoptions);
		for (var i in selectedoptions) {
			//alert("Checking for "+selectedoptions[i]);
			var add_amt = getOneChosenPersonalizedObjectAmount(pObj,selectedoptions[i]);
			amt += add_amt;
			console.log("Extra Amount for "+selectedoptions[i]+" = "+add_amt+" Resulting in total = "+amt);
		}
	}
	console.log("getPersonalizedObjectAmount = "+amt);
	return amt;
}

function getItemPersonalizedAmount(elements,num) {
	var p_amt;
	
	console.log("TotaL Amount AT ENTRY "+global.sRestaurant.Cart.Total);
	if (typeof elements.personalized_order == 'undefined') {
		console.log("Order of element "+num+" not personalized yet");
		return p_amt;
	}
	if (!elements.personalized_order[num]) {
		console.log("Order of this specific element "+num+" is not personalized");
		return p_amt;
	}
	p_amt = 0;
	
	if (typeof elements.personalized_additional_order_amount == 'undefined') {
		elements.personalized_additional_order_amount = new Array();
	}
	if ( !elements.personalized_additional_order_amount[num] ) {
		elements.personalized_additional_order_amount[num] = 0;
	}
	for ( var p in elements.personalized_order[num] ) {
		console.log("Working on "+p);
		var p_obj = getPersonalizedElementObject(elements,p);
		if (! p_obj) {
			console.log("Order of this specific element "+num+" P Obj = "+p+" not found in menu");
			return p_amt;
		}
		var ele_amt = getPersonalizedObjectAmount(p_obj,elements.personalized_order[num][p]);
		p_amt += ele_amt;
		console.log("At end of "+p+" Additional Amount = "+p_amt+" after adding ="+ ele_amt);
	}
	console.log("Total Additional Amount for "+num+" = "+p_amt);
	var add_to_total = p_amt - elements.personalized_additional_order_amount[num];
	elements.personalized_additional_order_amount[num] = p_amt;
	console.log("getItemPersonalizedAmount personalized_additional_order_amount = "+JSON.stringify(elements.personalized_additional_order_amount));
	global.sRestaurant.Cart.Total += add_to_total;
	console.log("TotaL Amount increased by "+add_to_total+" to "+global.sRestaurant.Cart.Total);
	return p_amt;
}

function update_presonalization(urlObj, options) {
	loadPostInput(options);
	//console.log("update_presonalization Input = "+JSON.stringify(global.Input));
	//console.log("update_presonalization Input Number = "+global.Input['number']);
	//console.log("update_presonalization HREF = "+urlObj.href);
	console.log("update_presonalization POST = "+JSON.stringify(options.data));
	var category,item ,number,price;
	
	options.data = options.data.replace(/\+/g,' ');
	var data = options.data.split('&');
	for (var i = 0 ; i < data.length ; ++i ) {
		var pair = data[i].split('=');
		if ( pair[0] == 'category' ) {
			category = pair[1]
			category = category.replace(/\%26/g,'&');
			//category = category.replace(/\+/g,' ');
		}
		else if ( pair[0] == 'item' ) {
			item = pair[1];
			item = item.replace(/\%26/g,'&');
			//item = item.replace(/\+/g,' ');
		}
		else if ( pair[0] == 'number' ) {
			number = pair[1];
		}
	}
	
	console.log("update_presonalization Category = "+category+" Item = "+item+" Number = "+number);
	if ( typeof global.sRestaurant.Menu[category] == 'undefined' ) {
		console.log("update_presonalization Category = "+category+" not found");
		return;
	}
	if ( typeof global.sRestaurant.Menu[category][item] == 'undefined' ) {
		console.log("update_presonalization Item "+item+" in Category = "+category+" not found");
		return;
	}
	if ( typeof global.sRestaurant.Menu[category][item].order == 'undefined' ) {
		console.log("update_presonalization Order in Item "+item+" in Category = "+category+" not found");
		return;
	}
	if ( typeof global.sRestaurant.Menu[category][item].personalize == 'undefined' ) {
		console.log("update_presonalization Personalize in Item "+item+" in Category = "+category+" not found");
		return;
	}
	
	if ( typeof global.sRestaurant.Menu[category][item].personalized_order == 'undefined' ) {
		global.sRestaurant.Menu[category][item].personalized_order = new Array();
	}
	console.log("update_presonalization Personalize List = "+JSON.stringify(global.sRestaurant.Menu[category][item].personalize));
	// Simple Item 1st order
	var chosen = new Object;
	for (var i = 0 ; i < data.length ; ++i ) {
		// Create a personalized object and attach it with the buffer
		var pair = data[i].split('=');
		if ( (pair[0] == 'category') 
			|| ( pair[0] == 'item' )
			|| ( pair[0] == 'number' )
			|| ( pair[0] == 'price' ) ) {
			continue;
		}
		pair[0] = pair[0].replace(/\%26/g,'&');
		pair[1] = pair[1].replace(/\%26/g,'&');
		//pair[0].replace(/\+/g,' ');
		//pair[1].replace(/\+/g,' ');
		//alert("Pair 0 = "+pair[0]+" Pair 1 = "+pair[1]);
		if ( chosen[pair[0]] ) { // Multiple choices
			//alert("Type of Chosen = "+(typeof chosen[pair[0]]));
			if ( typeof chosen[pair[0]] === "string") {
				//alert("New Array");
				var new_pair = new Array();
				new_pair.push(chosen[pair[0]]);
				new_pair.push(pair[1]);
				chosen[pair[0]] = new_pair;
			}
			else {
				//alert("Appending to array");
				chosen[pair[0]].push(pair[1]);
			}
		}
		else { // Single Choice
			chosen[pair[0]] = pair[1];
		}
		
		//global.sRestaurant.Menu[category][item].order = 1;
	}
	global.sRestaurant.Menu[category][item].personalized_order[number-1] = chosen;
	console.log("Personalized Order X= "+JSON.stringify(global.sRestaurant.Menu[category][item].personalized_order));
	//global.sRestaurant.Cart.Total += parseFloat(price.replace('$',''));
	//global.sRestaurant.Cart.NoItems += 1;
	
	//alert("Changing page to "+$.mobile.path.makeUrlAbsolute('#menuitems?item='+category.replace('&','%26'),urlObj));
	$.mobile.changePage($.mobile.path.makeUrlAbsolute('#menuitems?item='+category.replace(/&/g,'%26'),urlObj));
}

function buildPersonalizeBlock(elements,categoryName,item,id) {
	console.log('----------------------- Building Personalized Block -----------------');
	var personalizeObj = elements["personalize"];
	
	// No Personalization
	if ( !personalizeObj ) { return; }
	console.log("buildPersonalizeBlock Personalized Object = "+JSON.stringify(personalizeObj));
	
	// Create the markup
	var link='#update_presonalization';
	var markup = '';
	markup += '<form action="'+link+'" method="POST">'; 
	markup += '<input type="hidden" name="category" value="'+categoryName+'" />';
	markup += '<input type="hidden" name="item" value="'+item+'" />';
	markup += '<input type="hidden" name="number" value="'+id+'" />';
	// All the hidden data
	
	// Check if this was personalized earlier
	var p_order = false;
	var p_id = id-1;
	if (typeof elements.personalized_order == 'undefined') { console.log("No personalized Order");	}
	else if (!elements.personalized_order[p_id]) { console.log("No personalized Order for "+p_id);	}
	else {
		p_order = true;
		console.log("Select for "+p_id+" = "+JSON.stringify(elements.personalized_order[p_id]));
	}
	
	for (var num = 0 ; num < personalizeObj.length ; ++num) {
		Object.keys(personalizeObj[num]).forEach(function(key) {
			var options = personalizeObj[num][key]["options"];
			if ( options.length > 4 ) {
				markup += '<fieldset data-role="controlgroup" data-mini="true" >';
			}
			else {
				markup += '<fieldset data-role="controlgroup" data-type="horizontal" data-mini="true" >';
			}
			markup += '<legend>'+key+' : </legend>';
			
				
			if ( personalizeObj[num][key]["choice"] == 1 ) { // Choose only one
				
				for (var i = 0 ; i < options.length ; ++i ) {
					var id = key;
					var value = "";
					var displayname = '';
					if ( typeof options[i] === "string" ) {
						id += options[i];
						value = options[i];
						displayname = options[i];
					}
					else {
						for (var x in options[i]) {
							id += x;
							value = x;
							displayname = x + ' ( +' + options[i][x]+' )';
						}
					}
					markup += '<input type="radio" name="'+key+'" id="'+id+'" value="'+value+'" ';
					
					if ( p_order ) {
						console.log("Personalized order for key = "+key+" value = "+value+" = "+elements.personalized_order[p_id][key]);
						if ( elements.personalized_order[p_id][key] ) {
							if (elements.personalized_order[p_id][key] == value) { markup += 'checked="checked"';}
						}
					}
					else {
						if ( i == 0 ) {	markup += 'checked="checked"';	}
					}
					
					markup += ' />';
					markup += '<label for="'+id+'">'+displayname+'</label>';
				}
			}
			else { // Choose as many as you want
				for (var i = 0 ; i < options.length ; ++i ) {
					var name = key;
					var value = "";
					var displayname = '';
					if ( typeof options[i] === "string" ) {
						name += options[i];
						value = options[i];
						displayname = options[i];
					}
					else {
						for (var x in options[i]) {
							name += x;
							value = x;
							displayname = x + ' ( +' + options[i][x]+' )';
						}
					}
					markup += '<input type="checkbox" name="'+key+'" id="'+name+'" value="'+value+'" '
					if ( p_order ) {
						console.log("Personalized order for key = "+key+" value = "+value+" = "+elements.personalized_order[p_id][key]);
						if ( elements.personalized_order[p_id][key] ) {
							if (elements.personalized_order[p_id][key].indexOf(value) != -1) {
								markup += 'checked="checked"';
							}
						}
					}
					else {
						if ( i == 0 ) {	markup += 'checked="checked"';	}
					}
					markup += ' />';
					markup += '<label for="'+name+'">'+displayname+'</label>';
				}
			}
			markup += '</fieldset>';
		});
	}
	markup += '<input type="submit" value="Done" />';
	markup += '</form>';
	console.log('Markup = '+markup);
	console.log('----------------------- Building Personalized Block Ends -----------------');
	return markup;
}

function personalize(urlObj, options) {
	loadGetInput(urlObj.href);
	var categoryName = global.Input['category'];
	var item = global.Input['item'];
	var partsName = global.Input['parts'];
	var price = global.Input['price'];
	var number = global.Input['number'];
	
	// Now build a page with 
	categoryName = categoryName.replace(/\%26/g,'&');
	item = item.replace(/\%20/g,' ');
	var category = global.sRestaurant.Menu[categoryName];
	pageSelector = urlObj.hash.replace( /\?.*$/, "" );
	if ( !category ) {
		return;
	}
	//alert('Category = '+JSON.stringify(category));
	//alert(' Items = '+item);
	var elements = category[item];
	
	var $page = $(pageSelector);
	$header = $page.children( ":jqmData(role=header)" );
	$content = $page.children( ":jqmData(role=content)" );
	$footer = $page.children( ":jqmData(role=footer)" );
	var markup = buildPersonalizeBlock(elements,categoryName,item,number);
			
	$header.find( "h1" ).html("Select for "+ item+' #'+number );
	$content.html( markup).trigger( "create" );
	$page.page();

	// Enhance the listview we just injected.
	$content.find( ":jqmData(role=listview)" ).listview();
	//$.mobile.changePage($.mobile.path.makeUrlAbsolute('#menuitems?item='+categoryName.replace(/&/g,'%26'),urlObj));
	//options.dataUrl = urlObj.href;
	$.mobile.changePage( $page);
}

//========================================== Selecting Items of menu =========================================
//Add orders in the global.sRestaurant object and then build the Item Block
function ops_addItem(urlObj, options) {
	loadGetInput(urlObj.href);
	var category = global.Input['category'];
	var item = global.Input['item'];
	var parts = global.Input['parts'];
	var price = global.Input['price'];
	var order_num = 0;
	category = category.replace(/\%26/g,'&');
	item = item.replace(/\%26/g,'&');
	//alert("Add Item in Category = "+category);
	if ( typeof global.sRestaurant.Menu[category] == 'undefined' )
		return;
	//alert("Item = "+item);
	//alert("Parts = "+parts);
	
	if ( typeof parts != 'undefined' ) {
		//alert(category);
		//alert(item);
		if (typeof  global.sRestaurant.Menu[category][item].order != 'undefined') {
			if (typeof global.sRestaurant.Menu[category][item].order[parts] != 'undefined' ) {
				//alert("Complex Item Order 1");
				global.sRestaurant.Menu[category][item].order[parts] += 1;
			}
			else {
				// Complex Item subsequent Order
				//alert("Complex Item Order 2");
				global.sRestaurant.Menu[category][item].order.push(parts);
			}
		}
		else {
			// Complex Item 1st Order
			//alert("Complex Item Order 3");
			global.sRestaurant.Menu[category][item].order = [parts];
			global.sRestaurant.Menu[category][item].order[parts] = 1;
		}
		order_num = global.sRestaurant.Menu[category][item].order[parts];
	}
	else {
		if ( typeof global.sRestaurant.Menu[category][item].order != 'undefined' ) {
			//alert("Simple Item Order 1");
			global.sRestaurant.Menu[category][item].order += 1;
		}
		else {
			// Simple Item 1st order
			//alert("Simple Item Order 2");
			global.sRestaurant.Menu[category][item].order = 1;
		}
		order_num = global.sRestaurant.Menu[category][item].order;
	}
	global.sRestaurant.Cart.Total += parseFloat(price.replace('$',''));
	global.sRestaurant.Cart.NoItems += 1;
	
	delete global.Input['parts'];
	//alert("Changing page to "+$.mobile.path.makeUrlAbsolute('#menuitems?item='+category.replace('&','%26'),urlObj));
	if ( typeof global.sRestaurant.Menu[category][item].personalize != 'undefined' ) {
		// Move the user to personalize page
		// #personalize?category='+cName_escaped+'&item='+key_escaped+'&price='+priceObj+'&number='+(i+1)
		$.mobile.changePage($.mobile.path.makeUrlAbsolute('#personalize?category='+category.replace(/&/g,'%26')+'&item='+item.replace(/&/g,'%26')+'&price='+price+'&number='+order_num,urlObj));
	}
	else {
		$.mobile.changePage($.mobile.path.makeUrlAbsolute('#menuitems?item='+category.replace(/&/g,'%26'),urlObj));
	}
}

function ops_removeItem(urlObj, options) {
	loadGetInput(urlObj.href);
	var category = global.Input['category'];
	var item = global.Input['item'];
	var parts = global.Input['parts'];
	var price = global.Input['price'];
	
	category = category.replace(/\%26/g,'&');
	item = item.replace(/\%26/g,'&');
	//alert(category);
	//alert(item);
	if ( typeof parts != 'undefined' ) {
		if ( typeof global.sRestaurant.Menu[category][item].order != 'undefined' ) {
			if ( global.sRestaurant.Menu[category][item].order[parts] > 0) {
				global.sRestaurant.Menu[category][item].order[parts] -= 1;
				global.sRestaurant.Cart.Total -= parseFloat(price.replace('$',''));
				global.sRestaurant.Cart.NoItems -= 1;
			}
			if ( global.sRestaurant.Menu[category][item].order[parts] == 0 ) {
				delete global.sRestaurant.Menu[category][item].order[parts]; 
				if ( global.sRestaurant.Menu[category][item].order.length < 1 )
					delete global.sRestaurant.Menu[category][item].order;
			}
		}
	}
	else {
		if ( global.sRestaurant.Menu[category][item].order > 0) {
			global.sRestaurant.Menu[category][item].order -= 1;
			global.sRestaurant.Cart.Total -= parseFloat(price.replace('$',''));
			global.sRestaurant.Cart.NoItems -= 1;
		}
		if (global.sRestaurant.Menu[category][item].order == 0)
			delete global.sRestaurant.Menu[category][item].order;
	}
	delete global.Input['parts'];
	$.mobile.changePage($.mobile.path.makeUrlAbsolute('#menuitems?item='+category.replace(/&/g,'%26'),urlObj));
}


function buildItemBlock(categoryName,category) {
	//var markup = "<ul data-role='listview' data-inset='true' data-theme='d'>";
	var markup = '<table id="ItemBlock">';
	// The array of items for this category.
	//alert("Called with "+categoryName);
	var cName_escaped = categoryName.replace(/&/g,'%26');
	Object.keys(category).sort().forEach(function(key) {
		var key_escaped = key.replace(/&/g,'%26');
		//alert("Escaped Key = "+key_escaped);
		var elements = category[key];
		var priceObj = elements["price"];
		if ( typeof elements["price"] === "string" ) {	//Case of simple pricing		
				//alert(key+" is ordered by "+elements.order);
				markup += '<tr><td>';
				markup += '<a href="#ops_removeItem?category='+cName_escaped+'&item='+key_escaped+'&price='+priceObj+'"><img src="images/minus.png" alt="minus"/></a>';
				markup += '</td>';
				markup += '<td>';
				if ( typeof elements.order != 'undefined' ) {
					markup += '<label>';
					markup += key +'<br /> '+elements.order+' x '+priceObj;
					if ( typeof elements.personalize != 'undefined' ) {
						markup += getOrderPersonalizationItemDisplayBlock(cName_escaped,key,key_escaped,priceObj,elements);
					}
					markup += '</label>';
				}
				else {
					markup += '<label>'+key +'<br />'+priceObj+'</label>';
				}
				markup += '</td>';
				
				markup += '<td>';
				markup += '<a href="#ops_addItem?category='+cName_escaped+'&item='+key_escaped+'&price='+priceObj+'"><img src="images/plus.png" alt="plus"/></a>';
				markup += '</td></tr>';
		}
		else { // Case of complex pricing
			Object.keys(priceObj).forEach(function(parts) {
				var price = priceObj[parts];
				markup += '<tr><td>';
				markup += '<a href="#ops_removeItem?category='+cName_escaped+'&item='+key_escaped+'&parts='+parts+'&price='+price+'"><img src="images/minus.png" alt="minus"/></a>';
				markup += '</td>';
				markup += '<td>';
				if ( ( typeof elements.order != 'undefined' ) 
					&& ( typeof elements.order[parts] != 'undefined' ) ){
					//alert(parts + " Creating for "+elements.order[parts]);
					markup += '<label>'+key +'<br />['+parts+'] '+elements.order[parts]+' x '+price;
					if ( typeof elements.personalize != 'undefined' ) {
						markup += getOrderPersonalizationItemDisplayBlock(cName_escaped,key,key_escaped,priceObj,elements);
					}
					markup += '</label>';
				}
				else {
					markup += '<label>'+key+'<br />['+parts+'] '+price+'</label>';
				}
				markup += '</td>';
				
				markup += '<td>';
				markup += '<a href="#ops_addItem?category='+cName_escaped+'&item='+key_escaped+'&parts='+parts+'&price='+price+'"><img src="images/plus.png" alt="plus"/></a>';
				markup += '</td></tr>';
			});
		}
	});
	markup += '</table>';
	/*
	if (global.sRestaurant.Cart.Total > 0) {
		markup += '<br /><div id="cartinfo"><a href="#cart" data-role="button" data-rel="dialog" data-rel="back">Order</a></div>';
	}
	*/
	
	return markup;
}

function ops_clearOrder() {
	Object.keys(global.sRestaurant.Menu).forEach(function(category) {
		var items = [];
		Object.keys(global.sRestaurant.Menu[category]).forEach(function(item) {
			if ( typeof global.sRestaurant.Menu[category][item].order != 'undefined' ) { // Has Order. Clear it
				delete global.sRestaurant.Menu[category][item].order;
			}	
		});
	});
	global.sRestaurant.Cart.NoItems = 0;
	global.sRestaurant.Cart.Total = 0;
	global.sRestaurant.Cart.GrandTotal = 0;
	global.sRestaurant.Cart.OrderId = -1;
	delete global.sRestaurant.Cart.PPKey;
	
	global.Error = "";
	global.OrderMsg = "";
	global.Message = "";
}

function UpdateCart() {
	if ( global.sRestaurant.Cart.Total > 0 ) {
		$footer.find("h4").html("Total = $"+Math.round(global.sRestaurant.Cart.Total*100)/100);
		//$('.cart_button').html('Cart <sup><span class="ui-li-count">'+global.sRestaurant.Cart.NoItems+'</span></sup>');
		$('.cart_button').html('Cart <sup>'+global.sRestaurant.Cart.NoItems+'</sup>');
	}
	else {
		$footer.find("h4").html("");
		$('.cart_button').html('Cart');
	}
}

// Load the data for a specific category, based on
// the URL passed in. Generate markup for the items in the
// category, inject it into an embedded page, and then make
// that page the current active page.
function Page_MenuItems( urlObj, options )
{
	var categoryName = urlObj.hash.replace( /.*item=/, "" );

	categoryName = categoryName.replace(/\%26/g,'&');
	category = global.sRestaurant.Menu[categoryName];
	pageSelector = urlObj.hash.replace( /\?.*$/, "" );
	if ( category ) {
		var $page = $(pageSelector);
		$header = $page.children( ":jqmData(role=header)" );
		$content = $page.children( ":jqmData(role=content)" );
		$footer = $page.children( ":jqmData(role=footer)" );
		
		markup = buildItemBlock(categoryName,category);
		$header.find( "h1" ).html( categoryName );
		$content.html( markup );

		UpdateCart();
			
		$page.page();

		// Enhance the listview we just injected.
		$content.find( ":jqmData(role=listview)" ).listview();

		options.dataUrl = urlObj.href;
		$.mobile.changePage( $page, options );
	}
	else {
		console.log("No Category "+JSON.stringify(urlObj));
		ops_Restaurant(urlObj.hrefNoHash);
	}
}

//========================================== Cart =========================================

function calculate_taxes_and_tips() {
	var tax = parseFloat(global.sRestaurant.Info.tax.replace('%',''));
	global.sRestaurant.Cart.TaxAmount = Math.round(global.sRestaurant.Cart.Total*tax)/100;
	
	global.sRestaurant.Cart.TotalafterTax = Math.round((global.sRestaurant.Cart.Total+global.sRestaurant.Cart.TaxAmount)*100)/100;
	
	global.sRestaurant.Cart.TipAmount = Math.round(global.sRestaurant.Cart.Total*global.sRestaurant.Cart.Tip)/100;
	
	global.sRestaurant.Cart.GrandTotal = Math.round((global.sRestaurant.Cart.Total+global.sRestaurant.Cart.TaxAmount+global.sRestaurant.Cart.TipAmount)*100)/100;
}

function get_OrderTableObject() {	
	console.log('--------------- Creating Order Object ----------------------');
	var categories = [];
	Object.keys(global.sRestaurant.Menu).forEach(function(category) {
		var items = [];
		Object.keys(global.sRestaurant.Menu[category]).forEach(function(item) {
			if ( typeof global.sRestaurant.Menu[category][item].order != 'undefined' ) { // Has Order so need to record
				var item_obj = "";
				if ( typeof global.sRestaurant.Menu[category][item]["price"] === "string" ) { // Single Price structure -- Add item quantity price
					item_obj += '{"'+item+'":"'+global.sRestaurant.Menu[category][item].order+'","price":"'+global.sRestaurant.Menu[category][item].price+'"';
				}
				else { // Variable Price structure -- Add item [type] quantity price
					Object.keys(global.sRestaurant.Menu[category][item].price).forEach(function(parts) {
						if ( typeof global.sRestaurant.Menu[category][item].order[parts] != 'undefined') {
							//alert(global.sRestaurant.Menu[category][item].order[parts]);
							item_obj += '{"'+item+'":"'+global.sRestaurant.Menu[category][item].order[parts]+'","type":"'+parts+'","price":"'+global.sRestaurant.Menu[category][item].price[parts]+'"';
						}
					});
				}
				var elements = global.sRestaurant.Menu[category][item];
				if (typeof elements.personalized_order  != 'undefined' ) { // Has personalized order
					item_obj += ',"personalized_order":'+JSON.stringify(elements.personalized_order);
				}
				if (typeof elements.personalized_additional_order_amount  != 'undefined' ) { // Has personalized order amount
					item_obj += ',"personalized_additional_order_amount":'+JSON.stringify(elements.personalized_additional_order_amount);
				}
				
				item_obj += '}'; 
				items.push(item_obj);
			}	
		});
		if (items.length > 0) {
			var cat = '"'+category+'":[';
			cat += items[0];
			for ( var i = 1 ; i < items.length ; ++i ) {
				cat += ","+items[i];
			}
			cat += "]";
			categories.push(cat)
		}
	});
	var markup = '{ "order":{';
	if (categories.length > 0) {
		markup += categories[0];
		for ( var i = 1 ; i < categories.length ; ++i ) {
			markup += ","+categories[i];
		}
	}
	markup += '}';
	calculate_taxes_and_tips();
	markup += ',"Total":"'+(Math.round(global.sRestaurant.Cart.Total*100)/100)+'"';
	markup += ',"Tax":"'+global.sRestaurant.Cart.TaxAmount+'"';
	markup += ',"Total after Tax":"'+global.sRestaurant.Cart.TotalafterTax+'"';
	markup += ',"Tip":"'+global.sRestaurant.Cart.TipAmount+'"';
	markup += ',"Grand Total":"'+global.sRestaurant.Cart.GrandTotal+'"';
	markup += '}';
	console.log(markup);
	console.log("Order Object = "+JSON.stringify(JSON.parse(markup)));
	console.log('--------------- Creating Order Object Ends ----------------------');
	return JSON.parse(markup);
}

function get_OrderTable() {
	console.log('--------------- Creating Order Table ----------------------');
	var markup = '<table>';
	Object.keys(global.sRestaurant.Menu).forEach(function(category) {
		var added_category_header = 0;
		Object.keys(global.sRestaurant.Menu[category]).forEach(function(item) {
			if ( typeof global.sRestaurant.Menu[category][item].order != 'undefined' ) { // Has Order so need to record
				if ( added_category_header == 0 ) { // Make Category Header
					markup += '<tr><th>'+category+'</th></tr>';
					added_category_header = 1;
				}
				if ( typeof global.sRestaurant.Menu[category][item]["price"] === "string" ) { // Single Price structure -- Add item quantity price
					markup += '<tr><td><b>'+item+'</b></td><td>'+global.sRestaurant.Menu[category][item].order+' x </td><td>'+global.sRestaurant.Menu[category][item].price+'</td></tr>';
				}
				else { // Variable Price structure -- Add item [type] quantity price
					Object.keys(global.sRestaurant.Menu[category][item].price).forEach(function(parts) {
						if ( typeof global.sRestaurant.Menu[category][item].order[parts] != 'undefined') {
							//alert(global.sRestaurant.Menu[category][item].order[parts]);
							markup += '<tr><td><b>'+item+'</b></td><td>[ '+global.sRestaurant.Menu[category][item].order[parts]+' x '+parts+' ]</td><td>'+global.sRestaurant.Menu[category][item].price[parts]+'</td></tr>';
						}
					});
				}
				var elements = global.sRestaurant.Menu[category][item];
				if (typeof elements.personalized_order != 'undefined' ) { // Has personalized order
					for ( var num = 0 ; num < elements.order ; ++num ) {
						if ( !elements.personalized_additional_order_amount[num] ) {
							markup += '<tr><td>Personalization #'+num+'</td><td></td><td></td></tr>';
						}
						else {
							markup += '<tr><td>Personalization #'+num+'</td><td></td><td>$'+elements.personalized_additional_order_amount[num]+'</td></tr>';
						}
						
						for ( var p in elements.personalized_order[num] ) {
							console.log("Working on "+p);
							var p_obj = getPersonalizedElementObject(elements,p);
							if (! p_obj) {
								continue;
							}				
							var selectedoptions = elements.personalized_order[num][p];
							var amt = 0;
							// Print the personalization
							if ( typeof selectedoptions  === "string" ) { // Single selection
								amt = getOneChosenPersonalizedObjectAmount(p_obj,selectedoptions);
							}
							else { // Multiple selection
								//showObject("Selected Multi Options",selectedoptions);
								for (var i in selectedoptions) {
									//alert("Checking for "+selectedoptions[i]);
									amt += getOneChosenPersonalizedObjectAmount(p_obj,selectedoptions[i]);
								}
							}
							if ( amt > 0 ) {
								markup += '<tr><td>'+p+' : '+selectedoptions+'</td><td>$'+amt+'</td><td></td></tr><tr></tr><tr></tr>';
							}
							else {
								markup += '<tr><td>'+p+' : '+selectedoptions+'</td><td></td><td></td></tr><tr></tr><tr></tr>';
							}
						}
					}
				}
			}
		});
	});
	
	calculate_taxes_and_tips();
	
	markup += '<tr><td colspan=3></td></tr>';
	markup += '<tr><td colspan=3>----------------------------------</td></tr>';
	markup += '<tr><td>Total</td><td></td><td>'+(Math.round(global.sRestaurant.Cart.Total*100)/100)+'</td></tr>';
	markup += '<tr><td colspan=3>----------------------------------</td></tr>';
	markup += '<tr><td>Tax ('+global.sRestaurant.Info.tax+')</td><td></td><td>'+global.sRestaurant.Cart.TaxAmount+'</td></tr>';
	markup += '<tr><td colspan=3>----------------------------------</td></tr>';
	markup += '<tr><td>Total after taxes</td><td></td><td>'+global.sRestaurant.Cart.TotalafterTax+'</td></tr>';
	markup += '<tr><td colspan=3>----------------------------------</td></tr>';
	markup += '<tr><td>Tip ('+global.sRestaurant.Cart.Tip+' %)</td><td></td><td>'+global.sRestaurant.Cart.TipAmount+'</td></tr>';
	markup += '<tr><td colspan=3>----------------------------------</td></tr>';
	markup += '<tr><td>Grand Total</td><td></td><td>'+global.sRestaurant.Cart.GrandTotal+'<sup>*</sup></td></tr>';
	markup += '<tr><td colspan=3>----------------------------------</td></tr>';
	markup += '<tr><td colspan=3>* <i>Approximate. Actual prices may vary in Restaurant</i></td></tr>';
	markup += '</table>';
	console.log('--------------- Creating Order Table Ends ----------------------');
	return markup;
}

function Page_Cart(page_name) {
	if ( typeof page_name == 'undefined' ) {
		page_name = '#cart';
	}
	var $page = $(page_name);
	// Get the header for the page.
	$header = $page.children( ":jqmData(role=header)" );
	$content = $page.children( ":jqmData(role=content)" );
	$footer = $page.children( ":jqmData(role=footer)" );
	$header.find( "h1" ).html('Cart ('+global.sRestaurant.Cart.NoItems+' items)');
	
	var markup = get_OrderTable();
	
	var footer_markup = "";
	//markup += '<div data-role="controlgroup" data-type="horizontal">';
	// Add the big order button
	if ( localStorage.getItem('Name') && localStorage.getItem('Phone') ) { // Have the order inputs so go to orders directly
		global.sRestaurant.Cart['Name'] = localStorage.getItem('Name');
		global.sRestaurant.Cart['Phone'] = localStorage.getItem('Phone');
		if ( typeof global.sRestaurant.Info.products.dinein != 'undefined' ) {
			footer_markup += '<a href="#sendnewdineinorder" data-role="button"  class="cart_button ui-btn-right">Dine In</a>';
		}
		if ( typeof global.sRestaurant.Info.products.ordering != 'undefined' ) {
			footer_markup += '<a href="#sendnewpickuporder" data-role="button">Send to Restaurant</a>';
		}
	}
	else {
		if ( typeof global.sRestaurant.Info.products.dinein != 'undefined' ) {
			footer_markup += '<a href="#collectdineininfo" data-role="button"  class="cart_button ui-btn-right">Dine In</a>';
		}
		if ( typeof global.sRestaurant.Info.products.ordering != 'undefined' ) {
			footer_markup += '<a href="#collectpickupinfo" data-role="button">Send to Restaurant</a>';
		}
	}
	$content.html( markup );
	$footer.html( footer_markup );
	
	$page.page();
	$footer.trigger('create');
	//$content.find( ":jqmData(role=listview)" ).listview();
	//options.dataUrl = urlObj.href;
	//$.mobile.changePage( $page, options );
	$.mobile.changePage( $page);
}

function ops_ReCart(url) {
	loadGetInput(url);
	//alert("Reorder on Id = "+global.Input['id']);
	if ( typeof global.Input['reorder_id'] === 'undefined' ) {
		//alert("No id returning Home");
		return ops_Home(1);
	}
	var r_list = localStorage.getItem("Previous_Orders");
	if ( (typeof r_list != 'undefined') && (r_list != null) ) {
		var res_list = JSON.parse(r_list);
		if ( ( res_list.length == 0 ) || ( global.Input['reorder_id'] >= res_list.length ) ){
			return ops_Home(1);
		}
		var lOrder = res_list[global.Input['reorder_id']];
		global.OrderMsg = lOrder.OrderMsg;
		//global.Message = lOrder.Message; -- This puts the older orders too
		global.Message = "";
		global.Error = lOrder.Error;
		global.sRestaurant = JSON.parse(lOrder.sRestaurant);
		console.log("Reorder sRestaurant = "+JSON.stringify(global.sRestaurant));
		// SetUp as new order
		global.sRestaurant.Cart.OrderId = -1;
		global.is_reorder = 1;
		return Page_Cart("#reorder");
	}
	else {
		return ops_Home(1);
	}
}

function Update_Page_Cart() {
	var $page = $('#cart');
	$content = $page.children( ":jqmData(role=content)" );
	var markup = get_OrderTable();
	$content.html( markup );
	$page.page();
	$content.find( ":jqmData(role=listview)" ).listview();
	$.mobile.changePage( $page);
}

//========================================== Collect User Info =========================================
function ops_CollectDineInInfo(urlObj, options) {
	Page_CollectInfo(urlObj, options,'#sendnewdineinorderwithInfo','Dine In');
}

function ops_CollectPickUpInfo(urlObj, options) {
	Page_CollectInfo(urlObj, options,'#sendnewpickuporderwithInfo','Send to Restaurant');
}

function Page_CollectInfo(urlObj, options,link,boxval) {
	var $page = $('#collectinfo');
	// Get the header for the page.
	$header = $page.children( ":jqmData(role=header)" );
	$content = $page.children( ":jqmData(role=content)" );
	$footer = $page.children( ":jqmData(role=footer)" );
	$header.find( "h1" ).html("Tell about yourself");
	
	var markup = '';
	markup += '<form action="'+link+'" method="POST">'; 
	markup += '<table>';
	markup += '<tr><td>Name:</td><td><input type="text" name="Name"><td></tr>';
	markup += '<tr><td>Phone:</td><td><input type="tel" name="Phone"><td></tr>';
	markup += '<tr><td>Remember</td><td><input type="checkbox" name="remember_me"><td></tr>';
	markup += '<tr><td></td><td><input type="submit" name="submit" value="'+boxval+'"></td></tr>';
	markup += '</table>';
	markup += '</form>';
	
	$content.html( markup );	
	$page.page();
	options.dataUrl = urlObj.href;
	$.mobile.changePage( $page, options );
}

//========================================== New Order Code =========================================
function net_NewOrdersuccess(msg) {
	var data = JSON.parse(msg);
	global.sRestaurant.Cart.OrderId = data.OrderId;
	global.Message += '<div class="ReceivedMsg"> Order # OD-'+data.OrderId+'</div>';
	addToPreviousOrderList();
	if ( typeof data.PPKey != 'undefined' ) {
		global.sRestaurant.Cart.PPKey = data.PPKey;
		saveOrder();
		Page_Payment();
	}
	else {
		Page_CompleteOrder();
	}
}

	
function net_Ordererror(msg) {
	alert("Your order didn't go through. Please try again"+msg);
}

function SendNewOrder(message) {
	// Send new Orders Only if there is no orderId associated with cart
	if ( global.sRestaurant.Cart.OrderId != -1 ) {
		if ( typeof global.sRestaurant.Cart.PPKey != 'undefined' ) {
			Page_Payment();
		}
		else {
			Page_CompleteOrder();
		}
	}
	// Transmit the order
	var order_url = url_base() + global.SendNewOrder_Url+global.sRestaurant.Cart.Phone+'/'+global.sRestaurant.Info.id+'/';
	if ( typeof global.sRestaurant.Info.products.payment != 'undefined' ) {
		order_url += 'PAY2/';
	}
	//alert("Sending order "+message);
	postDataatUrl(order_url,message,net_NewOrdersuccess,net_Ordererror);
}

function capture_info(options) {
	loadPostInput(options);
	global.sRestaurant.Cart.Name = global.Input['Name'];
	global.sRestaurant.Cart.Phone = global.Input['Phone'];
	if (global.Input['remember_me'] == 'on') { // Store the inputs locally
		localStorage.setItem('Name',global.Input['Name']);
		localStorage.setItem('Phone',global.Input['Phone']);
	}
	//alert('Captured Phone = '+global.Input['Phone']);
}
/*
New Order transmits the order created by the user along with name and phone number
*/

function ops_sendNewDineInOrderwithInfo(urlObj, options) {
	//alert('sendNewDineInOrderwithInfo');
	capture_info(options);
	ops_sendNewDineInOrder(urlObj, options);
}

function ops_sendNewPickUpOrderwithInfo(urlObj, options) {
	//alert('sendNewPickUpOrderwithInfo');
	capture_info(options);
	ops_sendNewPickUpOrder(urlObj, options);
}

function ops_sendNewDineInOrder(urlObj, options) {
	global.sRestaurant.Cart.OrderType = 'DINEIN';
	sendNewOrder(urlObj, options);
}

function ops_sendNewPickUpOrder(urlObj, options) {
	global.sRestaurant.Cart.OrderType = 'PICKUP';
	sendNewOrder(urlObj, options);
}

function cleanLastOrder() {
	//alert('Removing Last Order ');
	localStorage.removeItem('LastOrder');
}

function createOrderObject() {
	var lOrder = new Object;
	lOrder['OrderMsg'] = global.OrderMsg;
	lOrder['Message'] = global.Message;
	lOrder['Error'] = global.Error;
	lOrder['sRestaurant'] = JSON.stringify(global.sRestaurant);
	return lOrder;
}

function addToPreviousOrderList(lOrder) {
	if ( global.is_reorder ) {
		console.log("Reorder so avoid putting in the list");
		return;
	}
	var po = localStorage.getItem("Previous_Orders");
	var po_obj;
	
	var lOrder = createOrderObject();
	if ( (typeof po == 'undefined') || ( po == null) ) {
		// First Time
		po_obj = new Array(lOrder);
	}
	else {
		po_obj = JSON.parse(po);
		po_obj.unshift(lOrder);
	}
	//alert("Saving Previous Orders");
	localStorage.setItem("Previous_Orders",JSON.stringify(po_obj));
}

function saveOrder() {
	// Saving the whole global is not the best use of resources so lets save specific items
	var lOrder = createOrderObject();
	localStorage.setItem('LastOrder',JSON.stringify(lOrder));
	//alert('Saved Last Order '+localStorage.getItem('LastOrder'));
}

function loadLastOrder() {
	//alert('Last Order = '+localStorage.getItem('LastOrder').replace(/,"/g,',\n"'));
	var lOrder = JSON.parse(localStorage.getItem('LastOrder'));
	global.OrderMsg = lOrder.OrderMsg;
	global.Message = lOrder.Message;
	global.Error = lOrder.Error;
	global.sRestaurant = JSON.parse(lOrder.sRestaurant);
}

// Creates or Updates the message seen by the client
function updateClientOrderDisplay() {
	//alert("Getting Order Table");
	var order_msg = get_OrderTable();
	// Important Info along with the order
	order_msg += '<strong>';
	order_msg += '<br />Name = '+global.sRestaurant.Cart.Name;
	order_msg += '<br />Phone = '+global.sRestaurant.Cart.Phone;
	order_msg += '<br />Payment = '+global.sRestaurant.Cart.Payment;
	order_msg += '</strong>';
	global.OrderMsg = order_msg;
}

function sendNewOrder(urlObj, options) {
	updateClientOrderDisplay();
	
	// Send the order
	var order_details = get_OrderTableObject();
	//order_details.invoiceData = create_invoice();
	order_details.Name = global.sRestaurant.Cart.Name;
	order_details.Phone = global.sRestaurant.Cart.Phone;
	order_details.Payment = global.sRestaurant.Cart.Payment;
	//alert("Invoice = "+JSON.stringify(order_details.invoiceData));
	//showObject(get_OrderTableObject());
	//alert("SendNewOrder "+order_details);
	SendNewOrder(JSON.stringify(order_details));
}

//========================================== Payment =========================================
function Page_Payment() {
	var $page = $('#payment');
	
	updateClientOrderDisplay();
	var markup = global.OrderMsg;
	
	// Payment buttons
	//markup += '<ul data-role="listview" data-inset="true">';
	//markup += '<li><a href="#" data-role="button" data-transition="pop" data-rel="back">Pay at Counter</a></li>';
	//markup += '<li><a href="https://www.paypal.com/webscr?cmd=_ap-payment&paykey='+ppkey+'" data-theme=""><img src="https://www.paypal.com/cgi-perl/webscr?cmd=/i/btn/btn_xpressCheckout.gif" align="left" style="margin-right:7px;"></a></li>';
	//markup += '<li><a href="https://www.paypal.com/webscr?cmd=_ap-payment&paykey='+ppkey+'" data-role="button">Pay with PayPal</a></li>';
	//markup += '</ul>';
	
	var footer_markup = '';
	if ( typeof global.sRestaurant.Info.products.payment != 'undefined' ) {
		footer_markup += '<a href="https://www.paypal.com/webscr?cmd=_express-checkout-mobile&token='+global.sRestaurant.Cart.PPKey+'" data-role="button">Pay with PayPal</a>';
	}
	if ( typeof global.sRestaurant.Info.products.payatcounter != 'undefined' ) {
		footer_markup += '<a href="#completeorder" data-role="button" class="cart_button ui-btn-right">Pay at Counter</a>';
	}
	
	$header = $page.children( ":jqmData(role=header)" );
	$content = $page.children( ":jqmData(role=content)" );
	$footer = $page.children( ":jqmData(role=footer)" );
	$header.find( "h1" ).html("Payment");
	
	$content.html(markup);	
	$footer.html(footer_markup);
	
	$page.page();
	$content.find( ":jqmData(role=listview)" ).listview();
	$.mobile.changePage( $page);
}


//========================================== Complete Order =========================================
function net_CompleteOrdersuccess(msg) {
	var data = JSON.parse(msg);
	if ( typeof data.Payment != 'undefined' ) {
		global.sRestaurant.Cart.Payment = "Paid";
	}
	Page_CompleteOrder();
}

function net_CompleteOrdererror(msg) {
	alert("Couldn't verify your payment. A refund will be issued in 7 days if a valid payment was made"+msg);
}

function ops_CompleteOrder_PayatCounter() {
	var order_url = url_base() + global.Payment_Complete_Url+global.sRestaurant.Cart.OrderId;
	getDatafromUrl(order_url,net_CompleteOrdersuccess,net_CompleteOrdererror);
}

function ops_CompleteOrder() {
	//alert('Complete Order');
	loadLastOrder();
	
	// If yes then validate the payment
	if ( typeof global.Input['pid'] != 'undefined' ) {
		//alert('Confirming Pay Order for '+global.sRestaurant.Cart.OrderId);
		var order_url = url_base() + global.Payment_Complete_Url+global.sRestaurant.Cart.OrderId+'?pid='+encodeURIComponent(global.Input['pid']);
		if ( typeof global.Input['token'] != 'undefined' ) {
			order_url += '&token='+global.Input['token'];
		}
		if ( typeof global.Input['PayerID'] != 'undefined' ) {
			order_url += '&PayerID='+global.Input['PayerID'];
		}
		getDatafromUrl(order_url,net_CompleteOrdersuccess,net_CompleteOrdererror);
	}
	else {
		//alert('Payment Cancelled');
		Page_Payment();
	}
}

function OrderConfirmCountdown() {
	if ( countdown > 0 ) {
		$('#CalltoConfirmOrder').html("Confirm Order in "+countdown+" secs");
	}
	else {
		$('#CalltoConfirmOrder').html("Confirm Order");
		clearTimeout(stintvl);
	}
	countdown--;
}

function Page_CompleteOrder() {
	updateClientOrderDisplay();
	var str_order_complete_header = "Order Sent";
	
	var errorBox = '<div class="error">'+global.Error+'</div>';
	var orderMsg = '<div id="orderMsg">'+global.OrderMsg+'</div>';
	//var previousMsg = '<div id="prevMsg">'+global.Message+'</div>';
	var previousMsg = '';
	var confirmMsg = '';
	//var messageBox = '<form action="#updateOrder" method="POST">'; 
	//messageBox += '<br /><label for="basic">Message:</label><input type="text" name="msg" id="msg" value="" data-mini="true" />';
	//messageBox += '<br /><input type="submit" name="Send" value="Send">';
	var messageBox = '<h2>Pickup your Order'+global.Message+'</h2>';
	if ( global.sRestaurant.Cart.OrderType == 'DINEIN' ) {
		messageBox = '<h2>Your Dine In Order is sent'+global.Message+'</h2>';
	}
	if ( typeof global.sRestaurant.Info.order_confirm != 'undefined' ) {
		str_order_complete_header = "Order Faxed";
		messageBox = '<h2>Order faxed'+global.Message+'</h2>';
		confirmMsg = '<a id="CalltoConfirmOrder" data-role="button" data-icon="phone" href="tel:'+global.sRestaurant.Info.order_confirm+'">Confirm Order</a>';
		stintvl = setInterval(OrderConfirmCountdown,1000);
	}
	var markup = errorBox+confirmMsg + orderMsg+previousMsg + messageBox;
	//markup += '<br /><a href="www.orderdude.com" data-role="button">Order</a>';
	ops_clearOrder();
	
	var $page = $('#order');
	// Get the header for the page.
	$header = $page.children( ":jqmData(role=header)" );
	$content = $page.children( ":jqmData(role=content)" );
	$footer = $page.children( ":jqmData(role=footer)" );
	$header.find( "h1" ).html(str_order_complete_header);
	UpdateCart();
	$content.html(markup);	
	$page.page();
	cleanLastOrder();
	$.mobile.changePage( $page);
}

//========================================== Update Order Code ======================================
function net_UpdateOrdersuccess(msg) {
	//alert("Update Msg Response = "+msg);
	var data = JSON.parse(msg);
	//alert("JSON Return = "+JSON.stringify(data));
	if ( typeof data.PPKey != 'undefined' ) {
		// Have a PayPal Payment Key so try payment
		//alert("PPKEY = "+data.PPKey);
		Page_Payment(data.PPKey);
	}
	else {
		Page_CompleteOrder();
	}
}

function UpdateOrder(msg) {
	var update_url = url_base() + global.UpdateOrder_Url+global.sRestaurant.Cart.OrderId;
	global.Message += '<div class="SendMsg">'+msg.replace('+',' ')+'</div>';
	//alert("Update URL = "+update_url);
	postDataatUrl(update_url,msg,net_UpdateOrdersuccess,net_Ordererror);
}


function ops_updateOrder(urlObj, options) {
	loadPostInput(options);
	if (global.Input['msg']) { // Proceed to post the message
		UpdateOrder(global.Input['msg']);
	}
	else { // Go Back with this error
		alert("No message");
		global.Error = "<p>No msg in Form</p>";
		history.back(-1);
	}
}
// Display Error, Message and a Box to capture new messages
// We need to add trigger to ping the server for updates at regular intervals
function ops_getMessage() {
	var $page = $('#order');
	
	// Transmit the order
	var get_orderupdate_URL = url_base() + global.GetOrderUpdate_Url+global.sRestaurant.Cart.Phone+'/'+global.sRestaurant.Info.id+'/'+global.sRestaurant.Cart.OrderId+'/?lastupdatetime='+global.sRestaurant.Cart.LastUpdateTime;
	
	// Send the order
	getDatafromUrl(get_orderupdate_URL,net_Ordersuccess,net_Ordererror);
}
//======================================== Registry ======================================================
// Listen for any attempts to call changePage.
// This is the circuit maker for all clicks
function PageBeforeChange( e, data ) {
	//alert("Page Before Change");
	// We only want to handle changePage() calls where the caller is
	// asking us to load a page by URL.
	//alert("PageBeforeChange");
	//alert(JSON.stringify(e)); // This is a great way to decipher an Object
	if ( typeof data.toPage === "string" ) {
		// We are being asked to load a page by URL, but we only
		// want to handle URLs that request the data for a specific
		// category.
		var u = $.mobile.path.parseUrl( data.toPage );
		//alert(JSON.stringify(data));
		console.log('ChangePage = '+data.toPage);
		if ( u.hash.search(/^#restaurant/) !== -1 ) { // RestaurantPage
			ops_Restaurant(u.href);
			e.preventDefault();
		}
		else if ( u.hash.search(/^#menuitems/) !== -1 ) { // Get Menu Items
			// We're being asked to display the items for a specific category.
			// Call our internal method that builds the content for the category
			// on the fly based on our in-memory category data structure.
			Page_MenuItems( u, data.options );

			// Make sure to tell changePage() we've handled this call so it doesn't
			// have to do anything.
			e.preventDefault();
		}	
		else if (u.hash.search(/^#ops_addItem/) !== -1) { // ops_addItem
			//alert("Add Item Invokation"+data.toPage);
			ops_addItem(u,data.options);
			e.preventDefault();
		}
		else if (u.hash.search(/^#ops_removeItem/) !== -1) { // Remove Item
			ops_removeItem(u,data.options);
			e.preventDefault();
		}
		else if (u.hash.search(/^#update_presonalization/) !== -1) { // Remove Item
			//console.log("Update Personalize Invokation"+JSON.stringify(data));
			update_presonalization(u,data.options);
			e.preventDefault();
		}
		else if (u.hash.search(/^#personalize/) !== -1) { // ops_addItem
			//alert("Personalize Invokation"+data.toPage);
			personalize(u,data.options);
			e.preventDefault();
		}
		else if (u.hash.search(/^#cart/) !== -1) { // Cart Item
			//if (global.sRestaurant.Cart.NoItems > 0) {
			if ( global.sRestaurant.Cart.Total > 0 ) {
				Page_Cart();
				e.preventDefault();
			}
			else {
				e.preventDefault();
			}
		}
		else if (u.hash.search(/^#reorder/) !== -1) { // Cart Item
			//alert("reorder request");
			ops_ReCart(u.href);
			e.preventDefault();
		}
		else if (u.hash.search(/^#clearcart/) !== -1) { // Cart Item
			ops_clearOrder();
			history.back(-1);
		}
		else if (u.hash.search(/^#collectdineininfo/) !== -1) { // Cart Item
			ops_CollectDineInInfo(u,data.options);
			e.preventDefault();
		}
		else if (u.hash.search(/^#collectpickupinfo/) !== -1) { // Cart Item
			ops_CollectPickUpInfo(u,data.options);
			e.preventDefault();
		}
		else if (u.hash.search(/^#sendnewdineinorderwithInfo/) !== -1) { // Send new Order with the Info captured
			//alert("NewOrderwithInfo");
			ops_sendNewDineInOrderwithInfo(u,data.options);
			e.preventDefault();
		}
		else if (u.hash.search(/^#sendnewpickuporderwithInfo/) !== -1) { // Send new Order with the Info captured
			//alert("NewOrderwithInfo");
			ops_sendNewPickUpOrderwithInfo(u,data.options);
			e.preventDefault();
		}
		else if (u.hash.search(/^#sendnewdineinorder/) !== -1) { // TransmitOrder
			//alert("NewOrder");
			ops_sendNewDineInOrder(u,data.options);
			e.preventDefault();
		}
		else if (u.hash.search(/^#sendnewpickuporder/) !== -1) { // TransmitOrder
			//alert("NewOrder");
			ops_sendNewPickUpOrder(u,data.options);
			e.preventDefault();
		}
		else if (u.hash.search(/^#updateOrder/) !== -1) { // TransmitOrder after processing the form
			ops_updateOrder(u,data.options);
			e.preventDefault();
		}
		else if (u.hash.search(/^#postmessage/) !== -1) { // TransmitOrder
			ops_postMessage(u,data.options);
			e.preventDefault();
		}
		else if (u.hash.search(/^#getmessage/) !== -1) { // Update Order
			ops_getMessage(u,data.options);
			e.preventDefault();
		}
		else if (u.hash.search(/^#order/) !== -1) { // Order Page
			//alert("Order");
			Page_Order(u,data.options);
			e.preventDefault();
		}
		else if (u.hash.search(/^#cancelorder/) !== -1) { // Order Page
			//alert("Order");
			Page_Order(u,data.options);
			e.preventDefault();
		}
		else if (u.hash.search(/^#completeorder/) !== -1) { // Order Page
			//alert("CompleteOrder without any attempt to pay");
			ops_CompleteOrder_PayatCounter();
			e.preventDefault();
		}
		else if (u.hash.search(/^#back/) !== -1) { // Go Back
			//alert("Going Back for "+data.toPage);
			history.back(-1);
		}
		else if ( u.hash.search(/^#find/) !== -1 ) { // Restaurant remove from history
			console.log("Loading Find Page");
			ops_Find();
			e.preventDefault();
		}
		else if ( u.hash.search(/^#delete_restaurant/) !== -1 ) { // Restaurant remove from history
			delete_restaurant_entry(u);
			e.preventDefault();
		}
		else if ( u.hash.search(/^#delete_order/) !== -1 ) { // Order remove from history
			delete_order_entry(u);
			e.preventDefault();
		}
		else {
			//alert("No handler for "+data.toPage);
			if ( global.Start_Page == -1 ) {
				ops_Home(1);
			}
			else {
				//alert("Start Page = "+global.Start_Page);
				load_restaurant(global.Start_Page);
			}
			e.preventDefault();
			
		}
	}
	/*else { This causes a page to revert back
		showObject('ChangePage = Data.toPage is not string ',data);
		ops_Home();
		e.preventDefault();
	}*/
}

$(document).bind("mobileinit", function() {
	$.mobile.page.prototype.options.addBackBtn = true;
	$.mobile.selectmenu.prototype.options.nativeMenu = false;
	$.mobile.changePage.defaults.allowSamePageTransition = true;
});

$(document).ready(function() {
	//alert("Document Base URL "+document.URL);
	if ( (!document.URL) || ( document.URL.indexOf("orderdude") == -1) 	) {
		console.log("Reloading Home");
		window.location.href = "http://www.orderdude.com";
	}
	global.Input = Array();
	$(document).bind( "pagebeforechange", function( e, data ) {
		//alert("URL for change = "+document.URL);
		PageBeforeChange(e,data);
	});
	
	$('#div-slider-tip').change(function () { 
		if ( global.sRestaurant.Cart.Tip != $('#slider-tip').val() ) {
			global.sRestaurant.Cart.Tip = $('#slider-tip').val();
			Update_Page_Cart();
		}
	});
	console.log("Top");
	loadGetInput(document.URL);
	//alert("URL = "+document.URL);
	//alert("Input = "+JSON.stringify(global.Input));
	if ( typeof global.Input['id'] != 'undefined' ) { // Asking for Restaurant Page
		global.Start_Page = global.Input['id'];
		global.Start_Page = global.Start_Page.replace('#restaurant','');
		//alert("Set Start Page to "+global.Start_Page);
		ops_Restaurant(document.URL);
	}
	else if ( typeof global.Input['completeorder'] != 'undefined' ) {
		console.log("Completing Order");
		ops_CompleteOrder();
	}
	else if ( document.URL.indexOf("reorder_id") != -1 ) {
		console.log("Loading ReOrder");
		ops_ReCart(document.URL);
	}
	else {
		console.log("Loading Home");
		Page_Home();
	}
});
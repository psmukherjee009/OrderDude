/*
Version : 5.0
Capability : ['PayPal Express Checkout Mobile']
*/
var restaurants = Array();

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
	Start_Page : -1,
	GetOrderUpdate_Url : '/cgi-bin/VirtualOrdering.cgi/GETORDERUPDATE/',
	UpdateOrder_Url : '/cgi-bin/VirtualOrdering.cgi/UPDATEORDER/',
	SendNewOrder_Url : '/cgi-bin/VirtualOrdering.cgi/SENDNEWORDER/',
	Get_Restaurant_List_Url : '/cgi-bin/VirtualOrdering.cgi/GETINFO/',
	Get_Business_Details_Url : '/cgi-bin/VirtualOrdering.cgi/GETBUSINESS/',
	Payment_Complete_Url : '/cgi-bin/VirtualOrdering.cgi/COMPLETEORDER/',
	MaxPreviousOrderStore:5,
	OrderMsg:"",
	Message:"",
	Error:"",
	Map:null,
	latitude:-99999,
	longitude:-99999,
	radius : 50,
	sRestaurant:null,
	Input:null 
};

//======================================== Utility Functions ===============================================
function url_base() {
	//alert('http://' + document.URL.split('/')[2]);
	return 'http://' + document.URL.split('/')[2];
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
function net_addRestaurantList(res_list) {
	restaurants = JSON.parse(res_list);
	Page_Home();
}

function net_errorRestaurantList(msg) {
	alert("Failed to obtain Restaurant List = "+msg);
}

function getNearbyRestaurantList() {
	var info_url = url_base() + global.Get_Restaurant_List_Url;
	info_url += global.longitude+'/'+global.latitude+'/'+global.radius+'/';
	//alert("Getting list from "+info_url);
	getDatafromUrl(info_url,net_addRestaurantList,net_errorRestaurantList);
}

function Page_Home() {
	//alert("No of restaurants = "+restaurants.length);
	var markup = "<ul data-role='listview' data-inset='true'>";
	for (var i = 0 ; i < restaurants.length ; ++i ) {
		//alert(i+" : name = "+restaurants[i].Info.name);
		var res_name = restaurants[i].Info.name;
		//alert(i+" : id = "+restaurants[i].Info.id);
		var res_id = restaurants[i].Info.id;
		markup += '<li><a href="#restaurant?id='+res_id+'">'+res_name+'</a></li>';
		//markup += '<li>'+restaurants[i].Info.name+'</li>';
		/*var googleLatAndLong = new google.maps.LatLng(restaurants[i].Info.coordinates.latitude, restaurants[i].Info.coordinates.longitude);
		var title = restaurants[i].Info.name;
		var content = restaurants[i].Info.address+"<br />"+restaurants[i].Info.phone;
		addMarker(global.Map,googleLatAndLong, title, content);*/
	}
	markup += "</ul>";
	
	var div = document.getElementById("home_navbar");
	div.innerHTML = markup;
	if ( global.dyn === 1 ) {
		var $page = $('#home');
		UpdateCart();
		$page.page();
	}
	$('#home').children( ":jqmData(role=content)" ).find( ":jqmData(role=listview)" ).listview();
	if ( global.dyn === 1 ) {
		//options.dataUrl = urlObj.href;
		$.mobile.changePage($page);
	}
}

function ops_Home(dyn) {
	global.dyn = dyn;
	getNearbyRestaurantList();
}

//========================================== Restaurant Menu Code =========================================

function net_addBusinessDetails(bu_list) {
	buData = JSON.parse(bu_list);
	for (var i = 0; i < buData.length ; ++i) {
		Object.keys(buData[i]).forEach(function(key) {
			// Somehow deep conversion doesn't happen
			global.sRestaurant[key] = JSON.parse(JSON.stringify(buData[i][key]));
		});
		
	}
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
	Object.keys(global.sRestaurant.Menu).forEach(function(category) {
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

//========================================== Selecting Items of menu =========================================
//Add orders in the global.sRestaurant object and then build the Item Block
function ops_addItem(urlObj, options) {
	loadGetInput(urlObj.href);
	var category = global.Input['category'];
	var item = global.Input['item'];
	var parts = global.Input['parts'];
	var price = global.Input['price'];
	category = category.replace(/\%26/g,'&');
	item = item.replace(/\%26/g,'&');
	//alert("Add Item in Category = "+category);
	if ( typeof global.sRestaurant.Menu[category] == 'undefined' )
		return;
	//alert(item);
	if ( typeof parts != 'undefined' ) {
		//alert(category);
		//alert(item);
		if (typeof  global.sRestaurant.Menu[category][item].order != 'undefined') {
			if (typeof global.sRestaurant.Menu[category][item].order[parts] != 'undefined' ) {
				global.sRestaurant.Menu[category][item].order[parts] += 1;
			}
			else {
				global.sRestaurant.Menu[category][item].order.push(parts);
				global.sRestaurant.Menu[category][item].order[parts] = 1;
			}
		}
		else {
			global.sRestaurant.Menu[category][item].order = [parts];
			global.sRestaurant.Menu[category][item].order[parts] = 1;
		}
	}
	else {
		if ( typeof global.sRestaurant.Menu[category][item].order != 'undefined' ) {
			global.sRestaurant.Menu[category][item].order += 1;
		}
		else {
			global.sRestaurant.Menu[category][item].order = 1;
		}
	}
	global.sRestaurant.Cart.Total += parseFloat(price.replace('$',''));
	global.sRestaurant.Cart.NoItems += 1;
	//alert("Changing page to "+$.mobile.path.makeUrlAbsolute('#menuitems?item='+category.replace('&','%26'),urlObj));
	$.mobile.changePage($.mobile.path.makeUrlAbsolute('#menuitems?item='+category.replace(/&/g,'%26'),urlObj));
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
	$.mobile.changePage($.mobile.path.makeUrlAbsolute('#menuitems?item='+category.replace(/&/g,'%26'),urlObj));
}

function buildItemBlock(categoryName,category) {
	//var markup = "<ul data-role='listview' data-inset='true' data-theme='d'>";
	var markup = '<table id="ItemBlock">';
	// The array of items for this category.
	//alert("Called with "+categoryName);
	var cName_escaped = categoryName.replace(/&/g,'%26');
	Object.keys(category).forEach(function(key) {
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
					markup += '<label>'+key +'<br /> '+elements.order+' x '+priceObj+'</label>';
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
					markup += '<label>'+key +'<br />['+parts+'] '+elements.order[parts]+' x '+price+'</label>';
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
		$('.cart_button').html('Cart <sup><span class="ui-li-count">'+global.sRestaurant.Cart.NoItems+'</span></sup>');
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
		//$content.find( ":jqmData(role=listview)" ).listview();

		options.dataUrl = urlObj.href;
		$.mobile.changePage( $page, options );
	}
	else {
		alert("No Category");
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

/*
'"invoiceData":{"item":[
					{"name":"Cheetos Crunchy","itemCount":1,"price":1.5,"itemPrice":1.5},
					{"name":"Coke","itemCount":1,"price":1,"identifier":"aramark_Coke","itemPrice":1}
			],
			"totalTax":0,
			"totalShipping":0}'
*/
function create_invoice() {
	var invoice = '"invoiceData":{"item":[';
	var invoice_line_items = [];
	Object.keys(global.sRestaurant.Menu).forEach(function(category) {
		Object.keys(global.sRestaurant.Menu[category]).forEach(function(item) {
			if ( typeof global.sRestaurant.Menu[category][item].order != 'undefined' ) { // Has Order so need to record
				if ( typeof global.sRestaurant.Menu[category][item]["price"] === "string" ) { // Single Price structure -- Add item quantity price
					var name = item;
					var price_per_item = parseFloat(global.sRestaurant.Menu[category][item].price.replace('$',''));
					var no_of_items = global.sRestaurant.Menu[category][item].order;
					var total_price = price_per_item * no_of_items;
					invoice_line_items.push('{"name":"'+name+'","itemCount":'+no_of_items+',"price":'+total_price+',"itemPrice":'+price_per_item+'}');
				}
				else { // Variable Price structure -- Add item [type] quantity price
					Object.keys(global.sRestaurant.Menu[category][item].price).forEach(function(parts) {
						if ( typeof global.sRestaurant.Menu[category][item].order[parts] != 'undefined') {
							var name = item +' -- '+ parts;
							var price_per_item = parseFloat(global.sRestaurant.Menu[category][item].price[parts].replace('$',''));
							var no_of_items = global.sRestaurant.Menu[category][item].order[parts];
							var total_price = price_per_item * no_of_items;
							invoice_line_items.push('{"name":"'+name+'","itemCount":'+no_of_items+',"price":'+total_price+',"itemPrice":'+price_per_item+'}');
						}
					});
				}			
			}
		});	
	});
	invoice += invoice_line_items[0];
	for ( var i = 1; i < invoice_line_items.length ; ++i ) {
		invoice += ','+invoice_line_items[i];
	}
	
	if (global.sRestaurant.Cart.TipAmount > 0) {
		invoice += ',{"name":"Tip","itemCount":1,"price":'+global.sRestaurant.Cart.TipAmount+',"itemPrice":'+global.sRestaurant.Cart.TipAmount+'}';
	}
	// Invoice Items ends
	invoice += ']';
	
	invoice += ',"totalTax":'+global.sRestaurant.Cart.TaxAmount;
	invoice += ',"totalShipping":0}';
	return invoice;
}

function get_OrderTableObject() {	
	var categories = [];
	Object.keys(global.sRestaurant.Menu).forEach(function(category) {
		var items = [];
		Object.keys(global.sRestaurant.Menu[category]).forEach(function(item) {
			if ( typeof global.sRestaurant.Menu[category][item].order != 'undefined' ) { // Has Order so need to record
				if ( typeof global.sRestaurant.Menu[category][item]["price"] === "string" ) { // Single Price structure -- Add item quantity price
					items.push('{"'+item+'":"'+global.sRestaurant.Menu[category][item].order+'","price":"'+global.sRestaurant.Menu[category][item].price+'"}');
				}
				else { // Variable Price structure -- Add item [type] quantity price
					Object.keys(global.sRestaurant.Menu[category][item].price).forEach(function(parts) {
						if ( typeof global.sRestaurant.Menu[category][item].order[parts] != 'undefined') {
							//alert(global.sRestaurant.Menu[category][item].order[parts]);
							items.push('{"'+item+'":"'+global.sRestaurant.Menu[category][item].order[parts]+'","type":"'+parts+'","price":"'+global.sRestaurant.Menu[category][item].price[parts]+'"}');
						}
					});
				}
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
	//alert(markup);
	//alert("Object Transformation = "+JSON.stringify(JSON.parse(markup)));
	return JSON.parse(markup);
}

function get_OrderTable() {
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
					markup += '<tr><td>'+item+'</td><td>'+global.sRestaurant.Menu[category][item].order+' x </td><td>'+global.sRestaurant.Menu[category][item].price+'</td></tr>';
				}
				else { // Variable Price structure -- Add item [type] quantity price
					Object.keys(global.sRestaurant.Menu[category][item].price).forEach(function(parts) {
						if ( typeof global.sRestaurant.Menu[category][item].order[parts] != 'undefined') {
							//alert(global.sRestaurant.Menu[category][item].order[parts]);
							markup += '<tr><td>'+item+' </td><td>[ '+global.sRestaurant.Menu[category][item].order[parts]+' x '+parts+' ]</td><td>'+global.sRestaurant.Menu[category][item].price[parts]+'</td></tr>';
						}
					});
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
	markup += '<tr><td>Grand Total</td><td></td><td>'+global.sRestaurant.Cart.GrandTotal+'</td></tr>';
	markup += '<tr><td colspan=3>----------------------------------</td></tr>';
	markup += '</table>';
	return markup;
}

function Page_Cart() {
	var $page = $('#cart');
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
		footer_markup += '<a href="#sendnewdineinorder" data-role="button">Dine In</a>';
		footer_markup += '<a href="#sendnewpickuporder" data-role="button" class="cart_button ui-btn-right">Pick Up</a>';
	}
	else {
		footer_markup += '<a href="#collectdineininfo" data-role="button">Dine In</a>';
		footer_markup += '<a href="#collectpickupinfo" data-role="button" class="cart_button ui-btn-right">Pick Up</a>';
	}
	$content.html( markup );
	$footer.html( footer_markup );
	
	$page.page();
	$content.find( ":jqmData(role=listview)" ).listview();
	//options.dataUrl = urlObj.href;
	//$.mobile.changePage( $page, options );
	$.mobile.changePage( $page);
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
	Page_CollectInfo(urlObj, options,'#sendnewpickuporderwithInfo','Pick Up');
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

function saveOrder() {
	// Saving the whole global is not the best use of resources so lets save specific items
	var lOrder = new Object;
	lOrder['OrderMsg'] = global.OrderMsg;
	lOrder['Message'] = global.Message;
	lOrder['Error'] = global.Error;
	lOrder['sRestaurant'] = JSON.stringify(global.sRestaurant);
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
	order_details.invoiceData = create_invoice();
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
	//markup += '<li><a href="https://www.paypal.com/webscr?cmd=_ap-payment&paykey='+ppkey+'" data-theme=""><img src="https://www.paypal.com/cgi-bin/webscr?cmd=/i/btn/btn_xpressCheckout.gif" align="left" style="margin-right:7px;"></a></li>';
	//markup += '<li><a href="https://www.paypal.com/webscr?cmd=_ap-payment&paykey='+ppkey+'" data-role="button">Pay with PayPal</a></li>';
	//markup += '</ul>';
	
	var footer_markup = '<a href="https://www.paypal.com/webscr?cmd=_express-checkout-mobile&token='+global.sRestaurant.Cart.PPKey+'" data-role="button">Pay with PayPal</a>';
	footer_markup += '<a href="#completeorder" data-role="button" class="cart_button ui-btn-right">Pay at Counter</a>';
	
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
	cleanLastOrder();
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

function Page_CompleteOrder() {
	updateClientOrderDisplay();
	
	var errorBox = '<div class="error">'+global.Error+'</div>';
	var orderMsg = '<div id="orderMsg">'+global.OrderMsg+'</div>';
	//var previousMsg = '<div id="prevMsg">'+global.Message+'</div>';
	var previousMsg = '';
	//var messageBox = '<form action="#updateOrder" method="POST">'; 
	//messageBox += '<br /><label for="basic">Message:</label><input type="text" name="msg" id="msg" value="" data-mini="true" />';
	//messageBox += '<br /><input type="submit" name="Send" value="Send">';
	var messageBox = '<h2>Pickup your Order'+global.Message+'</h2>';
	if ( global.sRestaurant.Cart.OrderType == 'DINEIN' ) {
		messageBox = '<h2>Your Dine In Order is sent'+global.Message+'</h2>';
	}
	
	var markup = errorBox+orderMsg+previousMsg + messageBox;
	//markup += '<br /><a href="www.orderdude.com" data-role="button">Order</a>';
	ops_clearOrder();
	var $page = $('#order');
	// Get the header for the page.
	$header = $page.children( ":jqmData(role=header)" );
	$content = $page.children( ":jqmData(role=content)" );
	$footer = $page.children( ":jqmData(role=footer)" );
	$header.find( "h1" ).html("Order Sent Sucessfully");
	
	$content.html(markup);	
	$page.page();
	
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
		// alert('ChangePage = '+data.toPage);
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
		else if (u.hash.search(/^#cart/) !== -1) { // Cart Item
			if (global.sRestaurant.Cart.NoItems > 0) {
				Page_Cart();
				e.preventDefault();
			}
			else {
				e.preventDefault();
			}
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
	global.Input = Array();
	$(document).bind( "pagebeforechange", function( e, data ) {
		PageBeforeChange(e,data);
	});
	
	$('#div-slider-tip').change(function () { 
		if ( global.sRestaurant.Cart.Tip != $('#slider-tip').val() ) {
			global.sRestaurant.Cart.Tip = $('#slider-tip').val();
			Update_Page_Cart();
		}
	});
	loadGetInput(document.URL);
	if ( typeof global.Input['id'] != 'undefined' ) { // Asking for Restaurant Page
		global.Start_Page = global.Input['id'];
		global.Start_Page = global.Start_Page.replace('#restaurant','');
		//alert("Set Start Page to "+global.Start_Page);
		ops_Restaurant(document.URL);
	}
	else if ( typeof global.Input['completeorder'] != 'undefined' ) {
		ops_CompleteOrder();
	}
	else {
		ops_Home(0);
	}
});
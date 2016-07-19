var restaurants = Array();

var global = {
	GetOrderUpdate_Url : 'http://www.orderdude.com/cgi-bin/VirtualOrdering.cgi/GETORDERUPDATE/',
	UpdateOrder_Url : 'http://www.orderdude.com/cgi-bin/VirtualOrdering.cgi/UPDATEORDER/',
	SendNewOrder_Url : 'http://www.orderdude.com/cgi-bin/VirtualOrdering.cgi/SENDNEWORDER/',
	Get_Restaurant_List_Url : 'http://www.orderdude.com/cgi-bin/VirtualOrdering.cgi/GETINFO/',
	Get_Business_Details_Url : 'http://www.orderdude.com/cgi-bin/VirtualOrdering.cgi/GETBUSINESS/',
	MaxPreviousOrderStore:5,
	OrderMsg:"",
	Message:"",
	Error:"",
	Input:"",
	Map:null,
	latitude:-99999,
	longitude:-99999,
	radius : 50,
	sRestaurant:null,
	Input:null,
	Cart : {
		"NoItems" : 0,
		"Total" : 0,
		"GrandTotal" : 0,
		"Tip" : 0,
		"OrderId" : -1,
		"LastUpdateTime" : 0
	}
};

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
	global.Input = Array();
	if ( typeof options.data != 'undefined' ) { // If input is provided then read it
		var data = options.data.split('&');	
		for (var i = 0 ; i < data.length ; ++i ) {
			var pair = data[i].split('=');
			global.Input[pair[0]] = pair[1];
		}
	}
}

function parseUrlforinput(urlObj) {
	var sUrl = urlObj.href.split('?');
	//alert("Surl = "+sUrl);
	if ( sUrl.length < 2 )
		return [];
	var qUrl = sUrl[1].split('&');
	//alert("Qurl = "+qUrl);
	var qstr = [];
	for (var i = 0 ; i < qUrl.length ; ++i) {
		//alert(i+" : "+qUrl[i]);
		pUrl = qUrl[i].split('=');
		if ( pUrl.length > 0 ) {
			//alert("Split 1 = "+pUrl[0]+" split 2 = "+pUrl[1]);
			qstr[pUrl[0]] = pUrl[1];
		}
		//qstr[pUrl[0]] = pUrl[1];
	}
	return qstr;	
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

function postDatafromUrl(url,data,successFn,errorFn) {
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
	// URI Encoding is required for IE
	request.send(encodeURIComponent(data));
}



//Add orders in the global.sRestaurant object and then build the Item Block
function ops_addItem(urlObj, options) {
	var qstr = parseUrlforinput(urlObj);
	var category = qstr['category'];
	var item = qstr['item'];
	var parts = qstr['parts'];
	var price = qstr['price'];
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
	var qstr = parseUrlforinput(urlObj);
	var category = qstr['category'];
	var item = qstr['item'];
	var parts = qstr['parts'];
	var price = qstr['price'];
	
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

	// Get the object that represents the category we
	// are interested in. Note, that at this point we could
	// instead fire off an ajax request to fetch the data, but
	// for the purposes of this sample, it's already in memory.
	categoryName = categoryName.replace(/\%26/g,'&');
	//alert("Show Category "+categoryName);
	category = global.sRestaurant.Menu[categoryName];
	// The pages we use to display our content are already in
	// the DOM. The id of the page we are going to write our
	// content into is specified in the hash before the '?'.
	pageSelector = urlObj.hash.replace( /\?.*$/, "" );
	//alert("Show Category *"+categoryName+"* Page Selector"+pageSelector);
	if ( category ) {
		// Get the page we are going to dump our content into.
		var $page = $(pageSelector);

		// Get the header for the page.
		$header = $page.children( ":jqmData(role=header)" );

		// Get the content area element for the page.
		$content = $page.children( ":jqmData(role=content)" );
		
		$footer = $page.children( ":jqmData(role=footer)" );
		
		// The markup we are going to inject into the content
		// area of the page.
		markup = buildItemBlock(categoryName,category);
		
		// Find the h1 element in our header and inject the name of
		// the category into it.
		$header.find( "h1" ).html( categoryName );

		// Inject the category items markup into the content element.
		$content.html( markup );

		UpdateCart();
			
		// Pages are lazily enhanced. We call page() on the page
		// element to make sure it is always enhanced before we
		// attempt to enhance the listview markup we just injected.
		// Subsequent calls to page() are ignored since a page/widget
		// can only be enhanced once.
		$page.page();

		// Enhance the listview we just injected.
		//$content.find( ":jqmData(role=listview)" ).listview();

		// We don't want the data-url of the page we just modified
		// to be the url that shows up in the browser's location field,
		// so set the dataUrl option to the URL for the category
		// we just loaded.
		options.dataUrl = urlObj.href;

		// Now call changePage() and tell it to switch to
		// the page we just modified.
		//alert("Show Category Change Page to "+pageSelector);
		$.mobile.changePage( $page, options );
	}
	else {
		alert("No Category");
	}
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
	var tax = parseFloat(global.sRestaurant.Info.tax.replace('%',''));
	var tax_amount = Math.round(global.sRestaurant.Cart.Total*tax)/100;
	global.sRestaurant.Cart.GrandTotal = Math.round((global.sRestaurant.Cart.Total+tax_amount)*100)/100;
	markup += ',"Total":"'+(Math.round(global.sRestaurant.Cart.Total*100)/100)+'"';
	markup += ',"Tax":"'+tax_amount+'"';
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
	var tax = parseFloat(global.sRestaurant.Info.tax.replace('%',''));
	var tax_amount = Math.round(global.sRestaurant.Cart.Total*tax)/100;
	global.sRestaurant.Cart.GrandTotal = Math.round((global.sRestaurant.Cart.Total+tax_amount)*100)/100;
	markup += '<tr><td colspan=3></td></tr>';
	markup += '<tr><td colspan=3>----------------------------------</td></tr>';
	markup += '<tr><td>Total</td><td></td><td>'+(Math.round(global.sRestaurant.Cart.Total*100)/100)+'</td></tr>';
	markup += '<tr><td colspan=3>----------------------------------</td></tr>';
	markup += '<tr><td>Tax ('+global.sRestaurant.Info.tax+')</td><td></td><td>'+tax_amount+'</td></tr>';
	markup += '<tr><td colspan=3>----------------------------------</td></tr>';
	//markup += '<tr><td>Tips</td><td><input type="range" name="slider-tip" id="slider-tip" value="5" min="0" max="30" step="5" /></td><td>'+(global.sRestaurant.Cart.GrandTotal*(1+(($('slider-tip').val())/100)))+'</td></tr>';
	//markup += '<tr><td>Tips</td><td><input type="range" name="slider-tip" id="slider-tip" value="5" min="0" max="30" data-highlight="true"/></td><td></td></tr>';
	markup += '<tr><td colspan=3>----------------------------------</td></tr>';
	markup += '<tr><td>Total after taxes</td><td></td><td>'+global.sRestaurant.Cart.GrandTotal+'</td></tr>';
	markup += '</table>';
	return markup;
}

function Page_Cart(urlObj, options) {
	//alert("Building Cart");
	// Get the page we are going to dump our content into.
	
	var $page = $('#cart');
	// Get the header for the page.
	$header = $page.children( ":jqmData(role=header)" );
	$content = $page.children( ":jqmData(role=content)" );
	$footer = $page.children( ":jqmData(role=footer)" );
	$header.find( "h1" ).html('Cart ('+global.sRestaurant.Cart.NoItems+' items)');
	
	var markup = get_OrderTable();
	
	// Store the Order for future access
	var ono = 0;
	if ( typeof localStorage.getItem("OrderNo") != 'undefined' ) {
		ono = localStorage.getItem("OrderNo");
	}
	if ( ono > global.MaxPreviousOrderStore ) {
		ono = 0
	}
	ono += 1;
	localStorage.setItem("OrderNo",ono);
	localStorage.setItem("OrderNo_"+ono,markup);
	
	// Add the big order button
	if ( localStorage.getItem('Name') && localStorage.getItem('Phone') ) { // Have the order inputs so go to orders directly
		markup += '<br /><a href="#sendneworder" data-role="button">Order</a>';
	}
	else {
		markup += '<br /><a href="#collectinfo" data-role="button" data-rel="dialog" data-transition="pop" data-rel="back">Order</a>';
	}
	// Inject the category items markup into the content element.
	$content.html( markup );
	
	$page.page();
	options.dataUrl = urlObj.href;
	$.mobile.changePage( $page, options );
}

function Page_CollectInfo(urlObj, options) {
	var $page = $('#collectinfo');
	// Get the header for the page.
	$header = $page.children( ":jqmData(role=header)" );
	$content = $page.children( ":jqmData(role=content)" );
	$footer = $page.children( ":jqmData(role=footer)" );
	$header.find( "h1" ).html("Tell about yourself");
	
	var markup = '<form action="#sendneworder" method="POST">'; 
	markup += '<table>';
	markup += '<tr><td>Name:</td><td><input type="text" name="Name"><td></tr>';
	markup += '<tr><td>Phone:</td><td><input type="text" name="Phone"><td></tr>';
	markup += '<tr><td><input type="checkbox" name="remember_me"></td><td>Remember Me<td></tr>';
	markup += '<tr><td></td><td><input type="submit" name="submit" value="Submit"></td></tr>';
	markup += '</table>';
	markup += '</form>';
	
	$content.html( markup );	
	$page.page();
	options.dataUrl = urlObj.href;
	$.mobile.changePage( $page, options );
}

//========================================== Order Code =========================================

function net_NewOrdersuccess(msg) {
	var data = JSON.parse(msg);
	global.sRestaurant.Cart.OrderId = data.OrderId;
	global.Message += '<div class="ReceivedMsg"> Order # '+data.OrderId+'</div>';
	Page_Order();
}

function net_UpdateOrdersuccess(msg) {
	//alert("Update Msg Response = "+msg);
	var data = JSON.parse(msg);
	//alert("JSON Return = "+JSON.stringify(data));
	
	Page_Order();
}
	
function net_Ordererror(msg) {
	alert("Your order didn't go through. Please try again"+msg);
}

function SendNewOrder(message) {
	// Transmit the order
	var order_url = global.SendNewOrder_Url+global.Input.Phone+'/'+global.sRestaurant.Info.id+'/';
	//alert("Sending order "+message);
	postDatafromUrl(order_url,message,net_NewOrdersuccess,net_Ordererror);
}

function UpdateOrder(msg) {
	var update_url = global.UpdateOrder_Url+global.sRestaurant.Cart.OrderId;
	global.Message += '<div class="SendMsg">'+msg.replace('+',' ')+'</div>';
	//alert("Update URL = "+update_url);
	postDatafromUrl(update_url,msg,net_UpdateOrdersuccess,net_Ordererror);
}
/*
New Order transmits the order created by the user along with name and phone number
*/
function ops_sendNewOrder(urlObj, options) {
	//alert("Loading Post Data");
	loadPostInput(options);
	//alert("Loaded Post Data");
	if (global.Input['remember_me'] == 'on') { // Store the inputs locally
		localStorage.setItem('Name',global.Input['Name']);
		localStorage.setItem('Phone',global.Input['Phone']);
	}
	//alert("After remember me");
	// Get the values in local storage
	if ( !global.Input['Name'] )
		global.Input['Name'] = localStorage.getItem('Name');
	if ( !global.Input['Phone'] )
		global.Input['Phone'] = localStorage.getItem('Phone');
	//alert("Getting Order Table");
	// Order with Name and Phone number ready	
	var order_msg = get_OrderTable();
	order_msg += '<br /><strong>Name = '+global.Input['Name']+'<br /> Phone = '+global.Input['Phone']+'</strong>';
	//showObject(get_OrderTableObject());
	//alert("SendNewOrder "+order_details);
	// Send the order
	var order_details = get_OrderTableObject();
	order_details.Name = global.Input['Name'];
	order_details.Phone = global.Input['Phone'];
	global.OrderMsg = order_msg;
	SendNewOrder(JSON.stringify(order_details));
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

function ops_getMessage() {
	var $page = $('#order');
	
	// Transmit the order
	var get_orderupdate_URL = global.GetOrderUpdate_Url+global.Input.Phone+'/'+global.sRestaurant.Info.id+'/'+global.Cart.OrderId+'/?lastupdatetime='+global.Cart.LastUpdateTime;
	
	// Send the order
	getDatafromUrl(get_orderupdate_URL,net_Ordersuccess,net_Ordererror);
}

// Display Error, Message and a Box to capture new messages
// We need to add trigger to ping the server for updates at regular intervals
function Page_Order() {
	var errorBox = '<div class="error">'+global.Error+'</div>';
	var orderMsg = '<div id="orderMsg">'+global.OrderMsg+'</div>';
	var previousMsg = '<div id="prevMsg">'+global.Message+'</div>';
	//var messageBox = '<form action="#updateOrder" method="POST">'; 
	//messageBox += '<br /><label for="basic">Message:</label><input type="text" name="msg" id="msg" value="" data-mini="true" />';
	//messageBox += '<br /><input type="submit" name="Send" value="Send">';
	var messageBox = '<h2>Pickup your Order</h2>';
	var markup = errorBox+orderMsg+previousMsg + messageBox;
	//markup += '<br /><a href="www.orderdude.com" data-role="button">Order</a>';
	global['LastOrder'] = new Object();
	global.LastOrder['Order'] = get_OrderTableObject();
	global.LastOrder['Id'] = global.sRestaurant.Info.id;
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

//========================================== Restaurant Menu Code =========================================

function net_addBusinessDetails(bu_list) {
	buData = JSON.parse(bu_list);
	for (var i = 0; i < buData.length ; ++i) {
		Object.keys(buData[i]).forEach(function(key) {
			//alert("Key = "+key+" Value = "+buData[i][key]);
			console.log(buData[i][key]);
			global.sRestaurant[key] = JSON.parse(buData[i][key]);
		});
	}
	//alert(global.sRestaurant.Menu);
	Page_Restaurant();
}

function net_errorBusinessDetails(msg) {
	alert("Failed to get Business Details "+msg);
}

function ops_Restaurant(urlObj, options) {
	var qstr = parseUrlforinput(urlObj);
	var obj = null;
	for ( var i = 0; i < restaurants.length ; ++i ) {
		if (restaurants[i].Info.id == qstr['id']) {
			obj = restaurants[i];
			break;
		}
	}
	if (obj == null) { // Back button operation
		Page_Restaurant();
	}
	else {
		global.sRestaurant = obj;
		global.sRestaurant.Cart = global.Cart;
		var bURL = global.Get_Business_Details_Url+global.sRestaurant.Info.id+'/';
		getDatafromUrl(bURL,net_addBusinessDetails,net_errorBusinessDetails);
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
	$header.find('h1').html("<img src=\""+global.sRestaurant.Info.logo+"\" alt=\"Logo\" >");
	
	//Color Background
	//$('body').css('background-color',obj.Info.bkcolor);
	// Set organization name
	$('title').text(global.sRestaurant.Info.name);
	
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

//======================================== Front Page Code ===============================================
function net_addRestaurantList(res_list) {
	restaurants = JSON.parse(res_list);
	Page_Home();
}

function net_errorRestaurantList(msg) {
	alert("Failed to obtain Restaurant List = "+msg);
}

function getNearbyRestaurantList() {
	var info_url = global.Get_Restaurant_List_Url;
	info_url += global.longitude+'/'+global.latitude+'/'+global.radius+'/';
	//alert("Getting list from "+info_url);
	getDatafromUrl(info_url,net_addRestaurantList,net_errorRestaurantList);
}

function getMyLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(displayLocation,displayError);
    } else {
        alert("Oops, no geolocation support");
    }
}

function displayLocation(position) {
	showMap(position.coords);
}

function addMarker(latlong, title, content) {
    var markerOptions = {
        position: latlong,
        map: global.Map,
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
        infoWindow.open(pMap);
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
	global.Map = new google.maps.Map(mapDiv, mapOptions);
	global.latitude = coords.latitude;
	global.longitude = coords.longitude;
	// add the user marker
	var title = "Your Location";
        var content = "You are here: " + coords.latitude + ", " + coords.longitude;
        addMarker(googleLatAndLong, title, content);
        getNearbyRestaurantList();
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

function showAddress(address) {
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode( { 'address': address}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
         $("#location").html("You are at "+results[0].geometry.location);
      } else {
      }
    });
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
	getMyLocation();
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
		//alert('ChangePage = '+data.toPage);
		if ( u.hash.search(/^#restaurant/) !== -1 ) { // RestaurantPage
			ops_Restaurant(u, data.options);
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
				Page_Cart(u,data.options);
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
		
		else if (u.hash.search(/^#collectinfo/) !== -1) { // Cart Item
			Page_CollectInfo(u,data.options);
			e.preventDefault();
		}
		else if (u.hash.search(/^#sendneworder/) !== -1) { // TransmitOrder
			//alert("NewOrder");
			ops_sendNewOrder(u,data.options);
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
		else if (u.hash.search(/^#back/) !== -1) { // Go Back
			//alert("Going Back for "+data.toPage);
			history.back(-1);
		}
		else {
			//alert("No handler for "+data.toPage);
			ops_Home(1);
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
	//alert("Ready");
	$(document).bind( "pagebeforechange", function( e, data ) {
		PageBeforeChange(e,data);
	});
	ops_Home(0);
});
var global = { Input:null };

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
				markup = category +" :: "+ item+"<br />";
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
				txt += "<br /><br />"+get_OrderTableStr(restaurant.Menu);
				txt += "<br />Total = $"+restaurant.Cart.GrandTotal;
				markup += '<li data-icon="false"><a href="http://www.orderdude.com/VirtualOrdering_8.html?reorder_id='+i+'" rel="external">'+txt+'</a><a href="#delete_order?id='+i+'"></li>';
			}
			markup += "</ul>";
		}
		else {
			markup += "<h3>No Recent Orders 1</h3>";
		}
	}
	else
	{
		markup += "<h3>No Recent Orders</h3>";
	}
	return markup;
}

function PreviousRestaurantList() {
	var markup = "";
	var r_list = localStorage.getItem("Restaurant_List");
	if ( (typeof r_list != 'undefined') && (r_list != null) ) {
		var res_list = JSON.parse(r_list);
		if ( res_list.length != 0 ) {
			markup += "<h3>Recent Restaurants</h3>";
			markup += "<ul data-role='listview' data-inset='true' data-split-icon='delete'>";
		
			for ( var i = 0 ; i < res_list.length ; ++i ) {
				var res_stor = res_list[i];
				var url = res_stor["url"];
				markup += '<li data-icon="false"><a class="force-reload" href="'+url+'" rel="external">'+res_stor["name"]+'</a><a href="#delete_restaurant?id='+i+'"></li>';
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
	markup += "<h1>Welcome to OrderDude</h1>";
	markup += PreviousOrdersList();
	//markup += PreviousRestaurantList();
	
	
	//alert(markup);
	$("#Restaurant_list").html(markup);
	//$("#Restaurant_list").html("We are under reconstruction. Please visit later");
	$page.page();
	$content.find( ":jqmData(role=listview)" ).listview();
	$.mobile.changePage($page);
}

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
		if ( u.hash.search(/^#delete_restaurant/) !== -1 ) { // RestaurantPage
			delete_restaurant_entry(u);
			e.preventDefault();
		}
		else if ( u.hash.search(/^#delete_order/) !== -1 ) { // OrderPage
			delete_order_entry(u);
			e.preventDefault();
		}
	}
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
	Page_Home();
});
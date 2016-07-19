/*
Version : 7.0
Capability : ['Personalization']
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
	GetOrderUpdate_Url : '/cgi-perl/VirtualOrdering.cgi/GETORDERUPDATE/',
	UpdateOrder_Url : '/cgi-perl/VirtualOrdering.cgi/UPDATEORDER/',
	SendNewOrder_Url : '/cgi-perl/VirtualOrdering.cgi/SENDNEWORDER/',
	Get_Restaurant_List_Url : '/cgi-perl/VirtualOrdering.cgi/GETINFO/',
	Get_Business_Details_Url : '/cgi-perl/VirtualOrdering.cgi/GETBUSINESS/',
	Payment_Complete_Url : '/cgi-perl/VirtualOrdering.cgi/COMPLETEORDER/',
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
		//var data = decodeURI(options.data).split('&');
		var data = decodeURIComponent(options.data).split('&');
		for (var i = 0 ; i < data.length ; ++i ) {
			var pair = data[i].split('=');
			global.Input[pair[0]] = pair[1];
		}
	}
}

function loadGetInput(url) {
	
	//var sUrl = decodeURI(url).split('?');
	var sUrl = decodeURIComponent(url).split('?');
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
		markup += '<li data-icon="false"><a href="?id='+res_id+'" rel="external">'+res_name+'</a></li>';
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
function StoreRestaurantinCache() {
	//alert("Storing");
	//var r_list = localStorage.removeItem("Restaurant_List");
	var r_list = localStorage.getItem("Restaurant_List");
	
	var d_stor = new Object();
	d_stor['name'] = global.sRestaurant.Info.name;
	d_stor['url'] = document.URL;
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
			if ( d_stor['url'] == res_stor['url'] ) {
				if ( i != 0 ) {
					//alert("Swapping");
					// Swap it with the top
					var u = res_list[0];
					res_list[0] = res_list[i];
					res_list[i] = u;
				}
				found = 1;
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

function has_terminal_item(obj) {
	//console.log("Searching for terminal item in "+JSON.stringify(obj));
	if ( typeof(obj) !== "object" ) {
		//console.log(obj+" is not an object");
		return true;
	}
	if ( obj["price"] !== undefined ) {
		//console.log(JSON.stringify(obj)+" has price");
		return true;
	}
	//console.log("Deep Searching for terminal item in "+JSON.stringify(obj));
	var has_price = false;
	Object.keys(obj).forEach(function(item) {
		if ( obj[item]["price"] !== undefined ) {
			//console.log(JSON.stringify(obj)+" "+item+" has price");
			has_price = true;
		}
	});
	//console.log(JSON.stringify(obj)+" is terminal = "+has_price);
	return has_price;
}

function buildCategoryBlock(MenuObj,menuname) {
	var categoryitems = "";
	var menustr = "";
	if ( menuname === undefined ) {
		menuname = "";
	}
	
	Object.keys(MenuObj).forEach(function(category) {
		var categoryname = category;
		if ( menuname !== "" ) {
			categoryname = menuname+"."+category;
		}
		console.log("Working on "+categoryname);
		if ( has_terminal_item(MenuObj[category]) === false ) {
			// alert(categoryname+" has no terminal Object "+JSON.stringify(MenuObj[category]));
			// This menu section should provide a collapsible menu
			menustr += '<div data-role="collapsible" data-theme="c" data-content-theme="d" data-collapsed="false">';
			menustr += '<h3><ul data-role="listview" data-inset="true" data-theme="c"><li>'+category+'</li></ul></h3>';
			menustr += buildCategoryBlock(MenuObj[category],categoryname);
			menustr += "</div>";
		}
		else {
			categoryitems += '<li><a href="#menuitems?item='+categoryname+'">'+category+'</a></li>';
		}
	});
	
	if ( categoryitems !== "" ) {
		categorystr = "<ul data-role='listview' data-inset='true'>";
		categorystr += categoryitems;
		categorystr += "</ul>";
	}
	return menustr+categorystr;
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
	var menuobj = buildCategoryBlock(global.sRestaurant.Menu);
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
		markup += '<a href="#personalize?category='+cName_escaped+'&item='+key_escaped+'&price='+priceObj+'&number='+(i+1)+'" rel="external" >Personalize Item '+(i+1);
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
	
	var menu = global.sRestaurant.Menu
	category.split('.').forEach(function(catx) {
		if ( typeof(menu[catx]) === undefined ) {
			console.log("update_presonalization Category = "+catx+" not found");
			return;
		}
		menu = menu[catx];
	});
	
	console.log("update_presonalization Category = "+category+" Item = "+item+" Number = "+number);
	if ( menu[item] === undefined ) {
		console.log("update_presonalization Item "+item+" in Category = "+category+" not found");
		return;
	}
	if ( menu[item].order === undefined ) {
		console.log("update_presonalization Order in Item "+item+" in Category = "+category+" not found");
		return;
	}
	if ( menu[item].personalize === undefined ) {
		console.log("update_presonalization Personalize in Item "+item+" in Category = "+category+" not found");
		return;
	}
	
	if ( menu[item].personalized_order === undefined ) {
		menu[item].personalized_order = new Array();
	}
	console.log("update_presonalization Personalize List = "+JSON.stringify(menu[item].personalize));
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
	menu[item].personalized_order[number-1] = chosen;
	console.log("Personalized Order X= "+JSON.stringify(menu[item].personalized_order));
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
		console.log("Personalized Order for "+p_id+" = "+JSON.stringify(elements.personalized_order[p_id]));
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
	markup += '<input type="submit" value="Personalize '+id+'" />';
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
	pageSelector = urlObj.hash.replace( /\?.*$/, "" );
	
	var category = global.sRestaurant.Menu
	categoryName.split('.').forEach(function(catx) {
		category = category[catx];
	});
	
	console.log("Personalization category "+categoryName+" object = "+JSON.stringify(category));
	if ( !category ) {
		return;
	}
	var elements = category[item];
	console.log("Personalization element "+item+" object = "+JSON.stringify(elements));
	var $page = $(pageSelector);
	$header = $page.children( ":jqmData(role=header)" );
	$content = $page.children( ":jqmData(role=content)" );
	$footer = $page.children( ":jqmData(role=footer)" );
	
	var markup = buildPersonalizeBlock(elements,categoryName,item,number);
			
	$header.find( "h1" ).html( 'Personalize '+item+' #'+number );
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
	var categoryName = global.Input['category'];
	var item = global.Input['item'];
	var parts = global.Input['parts'];
	var price = global.Input['price'];
	categoryName = categoryName.replace(/\%26/g,'&');
	item = item.replace(/\%26/g,'&');
	var category = global.sRestaurant.Menu
	categoryName.split('.').forEach(function(catx) {
		category = category[catx];
	});
	//alert("Add Item in Category = "+category);
	if ( typeof category == 'undefined' )
		return;
	//alert("Item = "+item);
	//alert("Parts = "+parts);
	
	if ( typeof parts != 'undefined' ) {
		//alert(category);
		//alert(item);
		if (typeof  category[item].order != 'undefined') {
			if (typeof category[item].order[parts] != 'undefined' ) {
				//alert("Complex Item Order 1");
				category[item].order[parts] += 1;
			}
			else {
				// Complex Item subsequent Order
				//alert("Complex Item Order 2");
				category[item].order.push(parts);
				category[item].order[parts] = 1;
			}
		}
		else {
			// Complex Item 1st Order
			//alert("Complex Item Order 3");
			category[item].order = [parts];
			category[item].order[parts] = 1;
		}
	}
	else {
		if ( typeof category[item].order != 'undefined' ) {
			//alert("Simple Item Order 1");
			category[item].order += 1;
		}
		else {
			// Simple Item 1st order
			//alert("Simple Item Order 2");
			category[item].order = 1;
		}
	}
	global.sRestaurant.Cart.Total += parseFloat(price.replace('$',''));
	global.sRestaurant.Cart.NoItems += 1;
	
	delete global.Input['parts'];
	//alert("Changing page to "+$.mobile.path.makeUrlAbsolute('#menuitems?item='+category.replace('&','%26'),urlObj));
	$.mobile.changePage($.mobile.path.makeUrlAbsolute('#menuitems?item='+categoryName.replace(/&/g,'%26'),urlObj));
}

function ops_removeItem(urlObj, options) {
	loadGetInput(urlObj.href);
	var categoryName = global.Input['category'];
	var item = global.Input['item'];
	var parts = global.Input['parts'];
	var price = global.Input['price'];
	
	categoryName = categoryName.replace(/\%26/g,'&');
	item = item.replace(/\%26/g,'&');
	var category = global.sRestaurant.Menu
	categoryName.split('.').forEach(function(catx) {
		category = category[catx];
	});
	//alert(category);
	//alert(item);
	if ( typeof parts != 'undefined' ) {
		if ( typeof category[item].order != 'undefined' ) {
			if ( category[item].order[parts] > 0) {
				category[item].order[parts] -= 1;
				global.sRestaurant.Cart.Total -= parseFloat(price.replace('$',''));
				global.sRestaurant.Cart.NoItems -= 1;
			}
			if ( category[item].order[parts] == 0 ) {
				delete category[item].order[parts]; 
				if ( category[item].order.length < 1 )
					delete category[item].order;
			}
		}
	}
	else {
		if ( category[item].order > 0) {
			category[item].order -= 1;
			global.sRestaurant.Cart.Total -= parseFloat(price.replace('$',''));
			global.sRestaurant.Cart.NoItems -= 1;
		}
		if (category[item].order == 0)
			delete category[item].order;
	}
	delete global.Input['parts'];
	$.mobile.changePage($.mobile.path.makeUrlAbsolute('#menuitems?item='+categoryName.replace(/&/g,'%26'),urlObj));
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

function ops_clearOrderfromMenu(menu) {
	if ( typeof(menu) !== 'object' ) {
		return;
	}
	if ( typeof menu.order != 'undefined' ) { // Has Order. Clear it
		delete menu.order;
	}
	
	// Now clear it from sub trees
	Object.keys(menu).forEach(function(key) {
		ops_clearOrderfromMenu(menu[key]);
	});
}
function ops_clearOrder() {
	ops_clearOrderfromMenu(global.sRestaurant.Menu);
	
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
	var category = global.sRestaurant.Menu
	categoryName.split('.').forEach(function(catx) {
		category = category[catx];
	});
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
		alert("No Category for "+categoryName);
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

function create_OrderTableItemObject(item,item_name) {
	var item_obj = "";
	if ( item.order === undefined ) { // Has Order so need to record
		return item_obj;
	}
	
	if ( typeof(item["price"]) === "string" ) { // Single Price structure -- Add item quantity price
		item_obj += '{"'+item_name+'":"'+item.order+'","price":"'+item.price+'"';
	}
	else { // Variable Price structure -- Add item [type] quantity price
		Object.keys(item.price).forEach(function(parts) {
			if ( item.order[parts] !== undefined) {
				//alert(global.sRestaurant.Menu[category][item].order[parts]);
				item_obj += '{"'+item_name+'":"'+item.order[parts]+'","type":"'+parts+'","price":"'+item.price[parts]+'"';
			}
		});
	}
	
	if ( item.personalized_order  !== undefined ) { // Has personalized order
		item_obj += ',"personalized_order":'+JSON.stringify(item.personalized_order);
	}
	if ( item.personalized_additional_order_amount !== undefined ) { // Has personalized order amount
		item_obj += ',"personalized_additional_order_amount":'+JSON.stringify(item.personalized_additional_order_amount);
	}
		
	item_obj += '}';
	
	return item_obj;
}

function get_MenuOrderTableObject(menu,category) {
	var markup = "";
	if ( typeof(menu) !== "object" ) {
		console.log(obj+" is not an object");
		return markup;
	}
	
	var objbox = [];
	var price_level = 0;
	Object.keys(menu).forEach(function(item) {
		var categoryName = "";
		if ( category !== undefined ) {
			categoryName = category+".";
		}
		categoryName += item;
		if ( menu[item]["price"] !== undefined ) {
			price_level = 1;
			var itemobjstr = create_OrderTableItemObject(menu[item],item);
			if ( itemobjstr !== "" ) {
				objbox.push(itemobjstr);
			}
		}
		else {
			var itemobjstr = get_MenuOrderTableObject(menu[item],categoryName);
			if ( itemobjstr !== "" ) {
				objbox.push(itemobjstr);
			}
		}
	});
	
	var objstr = "";
	if (objbox.length > 0) {
		objstr += objbox[0];
		for ( var i = 1 ; i < objbox.length ; ++i ) {
			objstr += ","+objbox[i];
		}
	}
	if ( category !== undefined ) {
		if ( price_level === 1 ) {
			if ( objstr !== "" ) {
				markup += '"'+category+'":['+objstr+']';
			}
		}
		else {
			markup += objstr;
		}
	}
	else {
		markup = '"order":{'+objstr+'}';
	}
	
	return markup;	
}

function get_OrderTableObject() {	
	console.log('--------------- Creating Order Object ----------------------');
	var markup = get_MenuOrderTableObject(global.sRestaurant.Menu);
	calculate_taxes_and_tips();
	markup += ',"Total":"'+(Math.round(global.sRestaurant.Cart.Total*100)/100)+'"';
	markup += ',"Tax":"'+global.sRestaurant.Cart.TaxAmount+'"';
	markup += ',"Total after Tax":"'+global.sRestaurant.Cart.TotalafterTax+'"';
	markup += ',"Tip":"'+global.sRestaurant.Cart.TipAmount+'"';
	markup += ',"Grand Total":"'+global.sRestaurant.Cart.GrandTotal+'"';
	markup = '{'+markup+'}';
	console.log(markup);
	console.log("Order Object = "+JSON.stringify(JSON.parse(markup)));
	console.log('--------------- Creating Order Object Ends ----------------------');
	return JSON.parse(markup);
}

function create_OrderTableItem(item,item_name) {
	var markup = "";
	if ( item.order === undefined ) { // Has Order so need to record
		return markup;
	}
	console.log("create_OrderTableItem item "+item_name+" object : "+JSON.stringify(item));
	if ( typeof(item["price"]) === "string" ) { // Single Price structure -- Add item quantity price
		markup += '<tr><td>'+item_name+'</td><td>'+item.order+' x </td><td>'+item.price+'</td></tr>';
	}
	else { // Variable Price structure -- Add item [type] quantity price
		Object.keys(item.price).forEach(function(parts) {
			if ( item.order[parts] !== undefined ) {
				//alert(item.order[parts]);
				markup += '<tr><td>'+item_name+' </td><td>[ '+item.order[parts]+' x '+parts+' ]</td><td>'+item.price[parts]+'</td></tr>';
			}
		});
	}
	
	if ( item.personalized_order === undefined ) { // No personalized order
		return markup;
	}
	for ( var num = 0 ; num < item.order ; ++num ) {
		if ( !item.personalized_additional_order_amount[num] ) {
			markup += '<tr><td>Personalization #'+num+'</td><td></td><td></td></tr>';
			//continue;
		}
		else {
			markup += '<tr><td>Personalization #'+num+'</td><td></td><td>$'+item.personalized_additional_order_amount[num]+'</td></tr>';
		}
						
		for ( var p in item.personalized_order[num] ) {
			console.log("Working on "+p);
			var p_obj = getPersonalizedElementObject(item,p);
			if (! p_obj) {
				continue;
			}				
			var selectedoptions = item.personalized_order[num][p];
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
			markup += '<tr><td>'+p+' : '+selectedoptions+'</td><td>$'+amt+'</td><td></td></tr>';
		}
	}
	return markup;
}

function get_MenuOrderTable(obj) {
	var markup = "";
	if ( typeof(obj) !== "object" ) {
		//console.log(obj+" is not an object");
		return markup;
	}
	
	Object.keys(obj).forEach(function(category) {
		if ( obj[category]["price"] !== undefined ) {
			markup += create_OrderTableItem(obj[category],category)
		}
		else {
			var itemobjstr = get_MenuOrderTable(obj[category]);
			if ( itemobjstr !== "" ) {
				markup += '<tr><th>'+category+'</th></tr>';
				markup += itemobjstr;
			}
		}
	});
	return markup;	
}

function get_OrderTableBottom() {
	var markup = "";
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
	return markup;
}

function get_OrderTable() {
	console.log('--------------- Creating Order Table ----------------------');
	var markup = '<table>';
	
	markup += get_MenuOrderTable(global.sRestaurant.Menu);
	markup += get_OrderTableBottom();
	
	markup += '</table>';
	console.log('--------------- Creating Order Table Ends ----------------------');
	return markup;
}

function get_OrderTable1() {
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
				var elements = global.sRestaurant.Menu[category][item];
				if (typeof elements.personalized_order != 'undefined' ) { // Has personalized order
					for ( var num = 0 ; num < elements.order ; ++num ) {
						if ( !elements.personalized_additional_order_amount[num] ) {
							markup += '<tr><td>Personalization #'+num+'</td><td></td><td></td></tr>';
							continue;
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
							markup += '<tr><td>'+p+' : '+selectedoptions+'</td><td>$'+amt+'</td><td></td></tr>';
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
	markup += '<tr><td>Grand Total</td><td></td><td>'+global.sRestaurant.Cart.GrandTotal+'</td></tr>';
	markup += '<tr><td colspan=3>----------------------------------</td></tr>';
	markup += '</table>';
	console.log('--------------- Creating Order Table Ends ----------------------');
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
		if ( typeof global.sRestaurant.Info.products.dinein != 'undefined' ) {
			footer_markup += '<a href="#sendnewdineinorder" data-role="button"  class="cart_button ui-btn-right">Dine In</a>';
		}
		if ( typeof global.sRestaurant.Info.products.ordering != 'undefined' ) {
			footer_markup += '<a href="#sendnewpickuporder" data-role="button">Pick Up</a>';
		}
	}
	else {
		if ( typeof global.sRestaurant.Info.products.dinein != 'undefined' ) {
			footer_markup += '<a href="#collectdineininfo" data-role="button"  class="cart_button ui-btn-right">Dine In</a>';
		}
		if ( typeof global.sRestaurant.Info.products.ordering != 'undefined' ) {
			footer_markup += '<a href="#collectpickupinfo" data-role="button">Pick Up</a>';
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

function Page_CompleteOrder() {
	updateClientOrderDisplay();
	
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
		confirmMsg = '<a data-role="button" data-icon="grid" href="tel:'+global.sRestaurant.Info.order_confirm+'">Call to Confirm Order</a>';
	}
	var markup = errorBox+confirmMsg + orderMsg+previousMsg + messageBox;
	//markup += '<br /><a href="www.orderdude.com" data-role="button">Order</a>';
	ops_clearOrder();
	
	var $page = $('#order');
	// Get the header for the page.
	$header = $page.children( ":jqmData(role=header)" );
	$content = $page.children( ":jqmData(role=content)" );
	$footer = $page.children( ":jqmData(role=footer)" );
	$header.find( "h1" ).html("Order Sent Sucessfully");
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
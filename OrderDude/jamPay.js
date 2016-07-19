
var global = {

	serverUrl: 'http://www.parthamukherjee.com',
	debugEnabled: true,
	data: null,

	restaurantId: null,
	orderItems: [],
	
	nextEvent: null,
	longitude: null,	// user's current location longtitude
	latitude: null,		// user's current location latitude
	
	// constants defined here
	prodServerUrl: 'http://www.parthamukherjee.com',
}


function handleEvent()
{
	var returnObject = null;
	switch(arguments[0])
	{
		default:
			returnObject = handleEventPrivate.apply(this, arguments);
			break;
	}
	return returnObject;
}

function handleEventPrivate() {
	var returnObject = null;
	
//	alert("event = " + arguments[0]);
//	alert("event = " + arguments[0] + ": " + global.nextEvent);

	try {

	switch(arguments[0]) { 

	case 'loadData':
		handleEvent('call_server', 'getRestaurantMenu', "", "/cgi-perl/VirtualManagement.cgi/HI/TEST/vinaytest2");
		break;

	case 'getRestaurantMenu_success':
		global.data = arguments[1];
		handleEvent('showItems', 'global.data');
		break;

		
	case 'showItems':
		// 1 = current menu depth e.g. Menu.Soup
		// 2 = navigate forward or backwards
		var path =  arguments[1];
		var pageId =  path.replace(/\./g, "_");	// page names do not work with dot in them. So we need to name pages with underscores
		var items = eval(path);

		if($("#" + pageId).attr("data-role") != "page") {
			var newPage = "<div data-role=page id=" + pageId + "><div data-role=header>";
			newPage += '<a href="#" class="ui-btn-left" data-icon="arrow-l" onclick="history.back()">Back</a>';
			newPage += '<h1>' + items.name + '</h1><a href="#" class="ui-btn-right" data-icon="arrow-r" onclick="handleEvent(\'checkoutClicked\');">Checkout</a></div><div data-role=content>';
			for (var key in items) {

				if($.inArray(key, ['location', 'name', 'id']) < 0) {
					var price = eval(path + "." + key + ".price");
					if(!!price) {
//						newPage += '<a data-role="button">' + eval(path + "." + key + ".name");
						newPage += "<br/><table width='100%' border='1'>";
						if(typeof price == "string") {
							newPage += '<tr><td width="10%"><a data-role="button" onClick="handleEvent(\'removeItem\', \'' + path + "." + key + '\');"><img src="images/minus.png"></a></td><td width="80%">$';
							newPage += eval(path + "." + key + ".name") + "<br/> (" + price + ")";
							newPage += '</td><td width="10%"><a data-role="button" onClick="handleEvent(\'addItem\', \'' + path + "." + key + '\');"><img src="images/plus.png"></a></td>';
						} else if(typeof price == "object") {
							for (var key1 in price) {
								newPage += '<tr><td width="10%"><a data-role="button" onClick="handleEvent(\'removeItem\', \'' + path + "." + key + "." + key1 + '\');"><img src="images/minus.png"></a></td><td width="80%">$';
								newPage += eval(path + "." + key + ".name") + '<br/>' + key1 + ' (' + eval("price[key1]") + ')';
								newPage += '</td><td width="10%"><a data-role="button" onClick="handleEvent(\'addItem\', \'' + path + "." + key + "." + key1 + '\');"><img src="images/plus.png"></a></td>';
							}
						}
						newPage += "</table>";
					} else {
						newPage += '<a data-role="button" onClick="handleEvent(\'showItems\', \'' + path + '.' + key + '\')">' + eval(path + "." + key + ".name");
					}
//					newPage += '</a>';
				}
			}
			newPage += "</div></div>";
			newPage = $(newPage);
			newPage.appendTo( $.mobile.pageContainer );
		}
		
		// here check if we clicked on a restaurant
		// if so, clear previous order (we can only send order to one restaurant at a time, and save restarurant id for ordering process
		if(path.split('.').length == 3) {
			global.restaurantId = eval(path + ".id");
		}

		$.mobile.changePage( "#" + pageId, { reverse: !!arguments[2]} );
		break;
		
		
	case 'showItems1':
		// 1 = current menu depth e.g. Menu.Soup
		// 2 = navigate forward or backwards
		var path =  arguments[1];
		var pageId =  path.replace(/\./g, "_");	// page names do not work with dot in them. So we need to name pages with underscores
		var items = eval(path);

		if($("#" + pageId).attr("data-role") != "page") {
			var newPage = "<div data-role=page id=" + pageId + "><div data-role=header>";
			newPage += '<a href="#" class="ui-btn-left" data-icon="arrow-l" onclick="history.back()">Back</a>';
			newPage += '<h1>' + items.name + '</h1><a href="#" class="ui-btn-right" data-icon="arrow-r" onclick="handleEvent(\'checkoutClicked\');">Checkout</a></div><div data-role=content>';
			for (var key in items) {

				if($.inArray(key, ['location', 'name', 'id']) < 0) {
					var price = eval(path + "." + key + ".price");
					if(!!price) {
						newPage += '<a data-role="button">' + eval(path + "." + key + ".name");
						newPage += "<br/><table width='100%'>";
						if(typeof price == "string") {
							newPage += '<tr><td width="10%"><a data-role="button" onClick="handleEvent(\'removeItem\', \'' + path + "." + key + '\');"><img src="images/minus.png"></a></td><td width="80%">$';
							newPage += price;
							newPage += '</td><td width="10%"><a data-role="button" onClick="handleEvent(\'addItem\', \'' + path + "." + key + '\');"><img src="images/plus.png"></a></td>';
						} else if(typeof price == "object") {
							for (var key1 in price) {
								newPage += '<tr><td width="10%"><a data-role="button" onClick="handleEvent(\'removeItem\', \'' + path + "." + key + "." + key1 + '\');"><img src="images/minus.png"></a></td><td width="80%">$';
								newPage += key1 + ' ' + eval("price[key1]");
								newPage += '</td><td width="10%"><a data-role="button" onClick="handleEvent(\'addItem\', \'' + path + "." + key + "." + key1 + '\');"><img src="images/plus.png"></a></td>';
							}
						}
						newPage += "</table>";
					} else {
						newPage += '<a data-role="button" onClick="handleEvent(\'showItems\', \'' + path + '.' + key + '\')">' + eval(path + "." + key + ".name");
					}
					newPage += '</a>';
				}
			}
			newPage += "</div></div>";
			newPage = $(newPage);
			newPage.appendTo( $.mobile.pageContainer );
		}
		
		// here check if we clicked on a restaurant
		// if so, clear previous order (we can only send order to one restaurant at a time, and save restarurant id for ordering process
		if(path.split('.').length == 3) {
			global.restaurantId = eval(path + ".id");
		}

		$.mobile.changePage( "#" + pageId, { reverse: !!arguments[2]} );
		break;
		
	case 'clearOrder':
		global.orderItems = [];
		handleEvent('checkout_page_show');
		break;
		
	case 'checkoutClicked':
		$.mobile.changePage('#checkout');
		break;

	case 'checkout_page_show':
		var orderString = "";
		var htmlString = "<table class='reference' width='100%' border='1'>";

		var total = 0;
		for(i=0; i< global.orderItems.length; i++) {
//			alert(global.orderItems[i]);
			var price = eval(global.orderItems[i] + '.price');
			htmlString += '<tr><td>' + eval(global.orderItems[i] + '.name') + ':</td><td>' + price + '</td></tr>';
			orderString += eval(global.orderItems[i] + '.name') + ', ';
			total += parseFloat(price);
		}
		htmlString += '<tr><td>Total :</td><td>' + total + '</td></tr>';
		htmlString += "</table>";
		$("#checkout #additionalData").html(htmlString);
		$("#checkout #order").val(orderString);

		$("#checkout #pathUrl").val('/cgi-perl/VirtualManagement.cgi/SENDORDER/' + $("#checkout #senderId").val() + '/' + global.restaurantId);
			
		break;
		
	case 'addItem':
		global.orderItems.push(arguments[1]);
		break;
		
	case 'removeItem':
		var index = global.orderItems.indexOf(arguments[1]);
		global.orderItems.splice(index, 1);
		break;
		
	case 'getRestaurantMenu_failed':
		alert('getting restaurant menu failed');
		break;

		
	case 'checkoutFormValidate':
		$("#checkout #pathUrl").val('/cgi-perl/VirtualManagement.cgi/SENDORDER/' + $("#checkout #senderId").val() + '/' + global.restaurantId + "?JSON=1");
		break;

	case 'checkout_fail':
		alert('error in ordering');
		break;
		
	case 'checkout_success':
		alert('successfully ordered');
		break;
	
// GENERIC EVENTS
		case 'deviceReady':	// this event is fired only when running on a real phone, not fired when testing using a desktop browser
			navigator.geolocation.getCurrentPosition(function(position) {
				global.latitude  = position.coords.latitude
				global.longitude = position.coords.longitude
				
			}, function(error) {
				global.latitude  = -1;	// -1 means we were unable to find location
				global.longitude = -1;	// -1 means we were unable to find location
			});

			break;

		case 'mobileinit':
			$.mobile.page.prototype.options.addBackBtn = true;
			$.mobile.selectmenu.prototype.options.nativeMenu = false;
			$.mobile.changePage.defaults.allowSamePageTransition = true;


			break;

		case 'document_ready':
			if(!global.debugEnabled) {
				global.serverUrl = global.prodServerUrl;
			}
			
//			following line is commented out because in browser it gives an annoying popup
//			if(!global.debugEnabled) {
//				document.addEventListener("backbutton", function(){handleEvent('back_button');}, false);
//			}
			document.addEventListener("menubutton", function(){handleEvent('menu_button');}, false);
			document.addEventListener("deviceready", function(){handleEvent('deviceReady');}, false);

			$("a").click(function(event) {
				return handleEvent('link_' + this.hash, event);
			});

			$('div:jqmData(role="page")').each(function(){
				var pageId = this.id;
				$('#' + this.id + 'Form').live('submit', function(event) {
					handleEvent('formSubmit', event, pageId);
					return false;
				});


				$('#' + pageId).bind('pageinit',function(event){
					return handleEvent(this.id + '_page_init', event);
				});	


				$('#' + pageId).bind('pageshow',function(event){
					$('#' + this.id + 'Form #id').val(window.localStorage.getItem("id"));
					return handleEvent(this.id + '_page_show', event);
				});	

				$('#' + pageId).bind('pagehide',function(event){
					return handleEvent(this.id + '_page_hide', event);
				});	

			});	

			// make sure user is logged in before accessing priviledged pages
			$(document).bind( "pagebeforechange", function( event, data ) {
				if(!global.user) {
					if ( typeof data.toPage === "string" ){
						var u = $.mobile.path.parseUrl( data.toPage );
						if( u.hash in {
							'#account':1,
							'#deleteAccount':1,
							'#oneClick':1,
							'#addCard':1,
							'#removeCardBank':1,
							'#addAddress':1,
							'#removeAddress':1,
							'#addBank':1,
							'#sellerSetup':1,
							'#shippingAddress':1,
							'#merchantAccount':1,
						}){
							global.nextEvent = ['load_page', data.toPage];
							data.toPage = u.hrefNoHash + '#login';
						}
					}
				}
			});
			
			
			// google analytics integration start
			$('[data-role=page]').live('pageshow', function (event, ui) {
			    try {
			        _gaq.push(['_setAccount', 'UA-31030939-1']);

			        hash = location.hash;

			        if (hash) {
			            _gaq.push(['_trackPageview', hash.substr(1)]);
			        } else {
			            _gaq.push(['_trackPageview']);
			        }
			    } catch(err) {
			    	// do nothing, analytics not being recorded but that is not critical
			    }
			});
			// google analytics integration end

			break;
		
		
		
		case 'call_server':
			// arg1 = target
			// arg2 = data
			// arg3 = url path
			
			var target = arguments[1]
			$.mobile.showPageLoadingMsg();

		
			$.ajax({
				type: "GET",
				dataType: "json",
				url: global.serverUrl + arguments[3], // + "/submit",
				cache: false,
				data: arguments[2] + "&target=" + target,
				success: function(data){
					$.mobile.hidePageLoadingMsg();
					handleEvent('processServerResponse', target, data);
				},
				error: function(data){
					$.mobile.hidePageLoadingMsg();
					alert("server error " + data);
					handleEvent('server_communiation_failure', 
							(!!data && !!data.message) ? data.message : "Unable to get a response from server, please check your internet connectivity");
				}
			});
			break;

		case 'processServerResponse':
			// arg1 = target
			// arg2 = response message from server
			// arg3 = silentCall = boolean if loading dialog should not be shown

			// logic:
			// if we have a message from server, show the message and save next event to be done when message window closes
			// if there is no message from server, simply trigger the next event
			if(!!arguments[2].message) {
				var messageTitle = arguments[2].messageTitle
				if(!!messageTitle) {
					messageTitle = (!!arguments[2].success ? "Success" : "Error");
				}
				global.nextEvent = [arguments[1] + (!!arguments[2].success ? "_success" : "_fail"), arguments[2].data];
				handleEvent("showMessage", arguments[2].message, messageTitle, arguments[3]);
			} else {
				handleEvent(arguments[1] + (!!arguments[2].success ? "_success" : "_failed"), arguments[2].data);
			}
			break;

		case 'server_communiation_failure':
			// arg1 = response message
			// arg2 = response messageTitle
			// arg3 = silentCall = boolean if loading dialog should not be shown

			handleEvent("showMessage", arguments[1], arguments[2], arguments[3]);
			break;

		case 'formSubmit':
			// arg1 = event name
			// arg2 = form name

			var event = arguments[1];
			event.preventDefault();

			var requiredFields = $("#" + arguments[2] + "Form :input.required").filter(function() {
			    return true;
			});
			requiredFields.css("border", "none");
			
			
			var emptyFields = $("#" + arguments[2] + "Form :input.required").filter(function() {
			    return !$.trim(this.value).length;
			});

			if(emptyFields.length) {
			    emptyFields.css("border", "1px solid red");   
			    alert("Please fill in all the required fields marked in red");
			    return false;
			}
			
			var validateMsg = handleEvent(arguments[2] + 'FormValidate');
			if( validateMsg != null){
				handleEvent('showMessage', validateMsg);
				returnObject = false;
				break;
			}
			
			var formData = $("#" + arguments[2] + 'Form').serialize();

//			formData += "&longitude=" + global.longitude;
//			formData += "&latitude=" + global.latitude;
			
//			if(!!window.JamPayActivity) {
//				formData += "&pushId=" + window.JamPayActivity.getPushId();
//			}
			
			var pathUrl = "";
			if( $("#" + arguments[2] + 'Form #pathUrl').val())
				pathUrl = $("#" + arguments[2] + 'Form #pathUrl').val()

			// set target same as form name
			handleEvent('call_server', arguments[2], formData, pathUrl);
			break;

			
		case 'link_#exit':
			handleEvent('call_server', "exit", null, true);
			global.user = null;

			// wait so that server call goes through to reduce no of sessions
			setTimeout('navigator.app.exitApp()' ,500);
			break;

		case 'exit_success':
			if(!!navigator.app) {
				navigator.app.exitApp();
			} else {
				$.mobile.changePage('#login');
			}
			break;

		case 'load_page':
			$.mobile.changePage(arguments[1]);
			break;
			
// MESSAGE / ERROR page events

		case 'showMessage':
			// arg1 = response message
			// arg2 = response messageTitle
			// arg3 = silentCall = boolean if loading dialog should not be shown
			

			if(!arguments[3]) {
				if(navigator.notification) {
					navigator.notification.confirm(
						arguments[1], // BODY COPY
						function(response) {
							handleEvent('error_page_hide', response);
							}, // CALL BACK FUNCTION
						!!arguments[2] ? arguments[2] : "Error", // TITLE
						'Ok' // BUTTON TEXT
					);
				} else if($("#error").length) {

					$("#error #errorHeader1").html(!!arguments[2] ? arguments[2] : "Error");

					$("#error #message").html("<p>" + arguments[1] + "</p>");
		
					$("#show-error-page").click();
				} else {
					alert(!!arguments[2] ? arguments[2] : "Error" + ": " + arguments[1]);
					var temp = global.nextEvent;
					global.nextEvent = null;
					handleEvent.apply(this, temp);
				}
			}

			break;

		case 'link_#errorClose':
			$('#error').dialog('close')
			break;

		case 'error_page_hide':
			var temp = global.nextEvent;
			global.nextEvent = null;
			handleEvent.apply(this, temp);
			break;
			
		default:
//			alert('event unhandled: ' + arguments[0]);
			break;
	}
	} catch(error)
	{
		var txt="There was an error on this page.\n\n";
		txt+="Error description: " + error.message + "\n\n";
		txt+="Click OK to continue.\n\n";
		alert(txt);
	}
	return returnObject;
}



$(document).bind("mobileinit", function() {
	handleEvent('mobileinit');
});

$(document).ready(function() {
	handleEvent('document_ready');
});

function escapeHTML(input) {
	input = "" + input;
	return input.replace(/&/g,'&amp;').replace(/>/g,'&gt;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
};


// http://www.parthamukherjee.com/cgi-perl/VirtualManagement.cgi
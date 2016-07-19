var global = {
		add_menu_url : '/cgi-perl/Admin.cgi/ADDMENU/',
		get_menu_url : '/cgi-perl/VirtualOrdering.cgi/GETMENU/',
		ob_first_onboard_url : 'http://www.orderdude.com/firstODOnboard.html',
		ob_dashboard_url : 'http://www.orderdude.com/DashBoard.html',
		storageTag : 'merchant_vault'
	};
	
function url_base() {
	//alert('http://' + document.URL.split('/')[2]);
	return 'http://' + document.URL.split('/')[2];
}


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

function displayErrorMsg(error_msg) {
	$('#Error').html("<p>"+error_msg+"</p>");
	$('#Error').addClass('error');
}

function clearError() {
	$('#Error').html("");
}

function queryURL(url,data,successFn,errorFn) {
	var request = new XMLHttpRequest();
	//alert("Sending Post to "+url);
	request.onload = function() {
		if (request.status == 200) {
			successFn(request.responseText);
		}
		else {
			errorFn(request.responseText);
		}
	}
	if ( data === null ) {
		request.open("GET",url);
		// URI Encoding is required for IE
		request.send(null);
	}
	else {
		request.open("POST",url);
		request.setRequestHeader('Content-Type','application/json');
		// URI Encoding is required for IE
		request.send(encodeURIComponent(data));
	}
}

function successMenuAdd(text) {
	var response = JSON.parse(text);
	if ( typeof response.error != 'undefined' ) {
		alert("Failed:"+response.error);
	}
	else {
		alert("Sucessfully added menu");
		window.location.href = ob_dashboard_url;
	}
}

function errorMenuAdd(text) {
	alert("Unable to update menu :: "+text);
	//displayErrorMsg("Unable to update menu :: "+text);
}

function parsePrice(priceText) {
	var parts = priceText.split(';');
	if ( parts.length > 1 ) {
		var priceTxt = '{"';
		priceTxt += priceText.split(';').join('","');
		priceTxt += '"}';
		priceTxt = priceTxt.split('=').join('":"');
		priceText = priceTxt;
		return priceText;
	}
	return '"'+priceText+'"';
}

// It is like quaranteen comma with its hex value in parts of line within double quotes
function quatranteenCommawithHex(line,pairchar) {
	var ncols = line.split(pairchar);
	if ( ncols.length > 1 ) {
		commaQuarenteened = true;
		// Quaranteen all commas inside double quotes
		for ( var j = 1 ; j < ncols.length ; j+=2 ) {
			ncols[j] = ncols[j].split(',').join('0x2C');
		}
		var qLine = "";
		for ( var j = 0 ; j < ncols.length ; j+=1 ) {
			qLine += ncols[j];
		}
		//alert("Quaranteened "+qLine);
		return qLine;
	}
	return line;
}

function convertBulkCSVMenutoJSON(csvtext) {
	var lines = csvtext.split("\n");
	var menu = '{';
	var addedItems = false;
	var commaQuarenteened = false;
	for ( var i = 0 ; i < lines.length ; ++i ) {
		lines[i] = lines[i].replace('\t',''); // No tabs
		// Quaranteen all commas within double quotes
		lines[i] = quatranteenCommawithHex(lines[i],"\"",",","%2C");
		//lines[i] = quatranteenCommawithHex(lines[i],"'",","," ");
		//alert("Quaranteened "+lines[i]);
		var cols = lines[i].split(",");
		if ( cols.length < 2 ) {   // Category
			if (lines[i].trim() != "") {
				//alert(i+" :: Category :: "+lines[i]);
				if ( addedItems ) {
					menu += '},'; 
				}
				menu += '"'+lines[i]+'"'+':{'; 
				addedItems = false;
			}
			else {
				//alert(i+" :: Blank :: "+lines[i]);
			}
		}
		else {  // Items
			if ( cols.length < 3 ) {
				alert("Line # "+(i+1)+ " has less than required items");
			}
			else if ( cols.length > 3 ) {
				alert("Line # "+(i+1)+ " has more than required items");
			}
			else {
				//alert(i+" :: Items :: "+lines[i]);
				if ( addedItems ) {
					menu += ',';
				}
				menu += '"'+cols[0]+'":{"description":"'+cols[2]+'","price":'+parsePrice(cols[1])+'}';
				addedItems = true;
			}
		}
	}
	if ( addedItems ) {
		menu += '}'; 
	}
	menu += '}';
	//alert(menu);
	// Un Quaranteen
	menu = menu.split('0x2C').join(',');
	//alert(menu);
	queryURL(url_base() + global.add_menu_url+global.id+'/',menu,successMenuAdd,errorMenuAdd)
}

function successGetMenu(data) {
	alert("Success");
	var jobj = JSON.parse(data);
	alert("Success :: Return = "+JSON.stringify(jobj));
	if ( typeof jobj != 'undefined' ) {
		var markup = "";
		if ( (typeof jobj.Menu == 'undefined') || (jobj.Menu == null) ) {
			return;
		}
		var menuobj = JSON.parse(jobj.Menu);
		
		Object.keys(menuobj).forEach(function(key) {
			var category = menuobj[key];
			markup += '"'+key+'"\n';
			Object.keys(category).forEach(function(item) {
				markup += '"'+item+'",';
				if ( typeof category[item]['price'] === 'object' ) {
					//alert("Price Object"+JSON.stringify(category[item]['price']));
					Object.keys(category[item]['price']).forEach(function(p) {
						markup += p+'='+category[item]['price'][p]+';';
					});
					markup = markup.substring(0, markup.length - 1);
					markup += ',';
				}
				else {
					//alert("Price String"+category[item]['price']);
					markup += category[item]['price']+',';
				}
				
				if ( typeof category[item]['description'] != 'undefined' ) {
					markup += '"'+category[item]['description']+'"\n';
				}
				else {
					markup += '\n';
				}
			});
			markup += '\n';
		});
		markup += '\n';
		$('#menu_csv').append(markup);
		//$('#menu_csv').append(jobj.Menu);
	}
}

function errorGetMenu(data) {
	alert("Unable to get menu :: "+data);
}

function AddMenu() {
	queryURL(url_base() + global.get_menu_url+global.id+'/',null,successGetMenu,errorGetMenu);
}

$(document).ready(function() {
	//console.log($('form').serializeArray());
	var q = parseUrlforinput(document.URL);
	if ( typeof q['id'] == 'undefined' ) {
		q['id'] = localStorage.getItem(global.storageTag);
	}
	if ( (typeof q['id'] != 'undefined') && (q['id'] != null) ) {
		global.id = q['id'];
		AddMenu();
		$('#bulkmenuadd').click ( function() {convertBulkCSVMenutoJSON($('#menu_csv').val());return false;} );
	}
	else {
		window.location.href = global.ob_first_onboard_url;
	}
});
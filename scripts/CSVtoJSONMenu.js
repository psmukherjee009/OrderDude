var item_index = 0;
var price_index = 1;
var desc_index = 2;

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

function setIndexofItems(infotext) {
	infotext = infotext.replace(/"/g,'');
	var info = infotext.split(",");
	
	for ( var i = 0 ; i < info.length ; ++i ) {
		console.log("Matching "+info[i].toLowerCase());
		if ( info[i].toLowerCase() == "price" ) {
			console.log("Setting Price Index to "+i);
			price_index = i;
		}
		else if ( info[i].toLowerCase() == "item" ) {
			console.log("Setting Item Index to "+i);
			item_index = i;
		}
		else {
			console.log("Setting Description Index to "+i);
			desc_index = i;
		}
	}
	console.log("Set Price Index = "+price_index+" Item Index = "+item_index+" Description Index = "+desc_index);
}

function convertBulkCSVMenutoJSON(csvtext) {
	var lines = csvtext.split("\n");
	console.log("Original Price Index = "+price_index+" Item Index = "+item_index+" Description Index = "+desc_index);
	if ( ((lines[0].toLowerCase().indexOf("price")) != -1) &&
		 ((lines[0].toLowerCase().indexOf("item")) != -1) &&
		 ((lines[0].toLowerCase().indexOf("description")) != -1) ) {
		console.log("Indexes Changed");
		setIndexofItems(lines[0]);
		lines.shift();
	}
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
				if ( lines[i] == "END" ) {
					menu += '},'; 
				}
				else {
					menu += '"'+lines[i]+'"'+':{'; 
					addedItems = false;
				}
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
				menu += '"'+cols[item_index]+'":{"description":"'+cols[desc_index]+'","price":'+parsePrice(cols[price_index])+'}';
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
	//queryURL(url_base() + global.add_menu_url+global.id+'/',menu,successMenuAdd,errorMenuAdd)
	//menu = menu.replace(/}/g,"}<br />");
	console.log(menu);
	$('#Result').html(menu);
}

$(document).ready(function() {
	//console.log($('form').serializeArray());
	$('#bulkmenuadd').click ( function() {convertBulkCSVMenutoJSON($('#menu_csv').val());return false;} );
});
function parsePrice(priceText) {
	var parts = priceText.split(';');
	if ( parts.length > 1 ) {
		var priceTxt = '{';
		priceTxt += priceText.split(';').join(',');
		priceTxt += '}';
		priceTxt = priceTxt.split('=').join(':');
		priceText = priceTxt;
	}
	return priceText;
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
		// Quaranteen all commas within double quotes
		lines[i] = quatranteenCommawithHex(lines[i],"\"",",","%2C");
		//lines[i] = quatranteenCommawithHex(lines[i],"'",","," ");
		//alert("Quaranteened "+lines[i]);
		var cols = lines[i].split(",");
		if ( cols.length < 2 ) {
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
		else {
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
				menu += '"'+cols[0]+'":{"description":"'+cols[1]+'","price":"'+parsePrice(cols[2])+'"}';
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
	alert(menu);
}


var bulkmenuhelp = 'There are 2 types of instructions accepted <br /><ul><li> Category --> represented in a single line. </li><li>Item details --> represented in format -- item, description,price </li></ul>';
var bulkmenuex = 'For Example<br />Soup<br />Chicken Corn Soup,Soup made of chicken in chicken stock,$5.99<br />Vegetable Soup,,$4.00<br />Hot and Sour Chicken Soup,Soup made of chicken in soy sauce,small = $5.99;large = $10.99<br /><br />Noodles<br />Penang Asam Laksa,"hot & sour lai-fun noodles in lemon grass fish broth with fish, onion & pineapple",$8.95<br />';
$(document).ready(function() {
	var markup = '<form action="" method="put">';
	markup += '<br />'+bulkmenuhelp+'<br /><p>'+bulkmenuex+'</p><br />';
	markup += '<textarea name="menu_csv" cols="120" rows="25" id="menu_csv"></textarea><br />';
	markup += '<input type="submit" value="Add Menu" id="bulkmenuadd"/>';
	markup += '</form>';
	var div = document.getElementById("content");
	div.innerHTML = markup;
	//console.log($('form').serializeArray());
	$('#bulkmenuadd').click ( function() {convertBulkCSVMenutoJSON($('#menu_csv').val());} );
});
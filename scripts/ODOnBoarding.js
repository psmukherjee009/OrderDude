var global = {
	companylogoask : 'Enter url of your logo : ',
	menu_ask : 'Enter url of your menu : ',
	menu_instruction : 'We will process this menu after the approval of your application',
	menu_link : '',
	latitude : -999999,
	longitude : -999999,
	ob_info_onboarding_url:'/cgi-perl/Admin.cgi/ADDINFO/',
	ob_menu_onboard_url : 'http://www.orderdude.com/ODOnboarding_GetMenu.html',
	ophours_max_entry : 10,
	input : {products:{}}
};

// Version 2.0 Slimmer Onboardingfunction url_base() {
	//alert('http://' + document.URL.split('/')[2]);
	return 'http://' + document.URL.split('/')[2];
}


function displayErrorMsg(error_msg) {
	$('#Error').html("<p>"+error_msg+"</p>");
	$('#Error').addClass('error');
}
function display_form_data(data) {
	data.replace(/'&'/g,'\n');
	alert(data);
}
function clearError() {
	$('#Error').html("");
}
function addressChkFailed() {
	$('#res_address_line1').addClass('error');
	$('#res_address_line2').addClass('error');
	$('#res_address_city').addClass('error');
}
function Address2GeoCode(address) {
	var geocoder = new google.maps.Geocoder();
	geocoder.geocode( { 'address': address}, function(results, status) {
	if (status == google.maps.GeocoderStatus.OK) {
		//alert("Location Valid"+results[0].geometry.location);
		global.latitude = results[0].geometry.location.lat();
		global.longitude = results[0].geometry.location.lng();
		//alert("Latitude = "+global.latitude+" Longitude = "+global.longitude);
	} else {
		//alert("Location Invalid");
		addressChkFailed();
		handle_event('displayErrorMsg','ADDRESS Invalid : Unable to find GeoCode for this address');
	}
	});

}
function loadmenulink(imageObj) {
	var cl_url = prompt(global.menu_ask,"file:///C:/Users/partha/Downloads/MenuCard_Sym.PNG");
	if (cl_url) {
		$("#menu_label").after("<sub>"+global.menu_instruction+"</sub>");
		$("#menu_link").replaceWith("<iframe src=" + cl_url + " width=100% height=100%></iframe>");
		global.menu_link = cl_url;
	}
}
function loadcompanylogo(imageObj) {
	var cl_url = prompt(global.companylogoask,"file:///C:/Users/partha/Documents/PrintScreen%20Files/CompanyLogoImage.gif");
	 if (cl_url)
		$('#company_logo').attr('src',cl_url);
}function display_input_onboardmerchant_pg1() {
	var data = JSON.stringify(global.input);
	data.replace(/'}'/g,'}\n\n');
	data.replace(/'{'/g,'\n{');
	alert("Input = "+data);
	
	//var values = $('#monboard').serialize();
	//alert("Values "+ values.serializeArray());
};

function check_text_field (fieldname,defaultvalue) {
	var error_msg = "";
	if ( ($(fieldname).val() == defaultvalue) || ($(fieldname).val().trim() == "") ) {
		error_msg = fieldname + " is mandatory<br />";
		$(fieldname).addClass('error');
	}
	else {
		$(fieldname).removeClass('error');
	}
	return error_msg;
}
function validate_input() {
	var error_msg = "";
	
	error_msg = error_msg + check_text_field('#res_name','Restaurant Name');
	//error_msg = error_msg + check_text_field('#res_description','Describe your Restaurant Type');
	//error_msg = error_msg + check_text_field('#res_address_line1','Street Address 1');
	//error_msg = error_msg + check_text_field('#res_address_line2','Street Address 2');
	//error_msg = error_msg + check_text_field('#res_address_city','City');
	error_msg = error_msg + check_text_field('#res_phone','555-555-5555');
	
		if ( error_msg.trim() != "" ) {
		handle_event('displayErrorMsg','Mandatory Fields missing');
		return 0;
	}
	/*else {
		var address = $('#res_address_line1').val();
		if ($('#res_address_line2').val().trim() != "")
			address = address +','+$('#res_address_line2').val();
		address = address +','+$('#res_address_city').val()+','+$('#res_address_state').val();
		address.replace(/ /g,"+");
		Address2GeoCode(address);
	}
	if (global.latitude == -999999)
		return 0;
	*/
	return 1;
}
function submit_form(url,input) {
	//alert("Submit Form "+url+" data = "+input);
	var request = new XMLHttpRequest();
	
	request.onload = function() {
		if (request.status == 200) {
			//alert("Data received = "+request.responseText);
			var res = JSON.parse(request.responseText);
			global.input.id = res.Id;
			// Load the next page
			window.location.href = global.ob_menu_onboard_url+'?id='+global.input.id;
		}
	}
	request.open("POST",url);
	request.setRequestHeader('Content-Type','application/json');
	request.send(input);
}
// Build the input object
// We will dump this to the backend in JSON format
function gather_values_onboardmerchant_pg1() {
	//global.input.logo = $('#company_logo').attr('src');
	//global.input.bkcolor = $('#bkcolor').val();
	global.input.name = $('#res_name').val();
	//global.input.description = $('#res_description').val();
	global.input.password = $('#res_password').val();
	//global.input.menu_link = global.menu_link;
	
	//global.input.email = $('#res_email').val();
	//global.input.use_email = ($('#res_use_email').attr('checked')) ? 1 : 0;
	global.input.phone = $('#res_phone').val();
	global.input.sms = ($('#res_use_sms').attr('checked')) ? 1 : 0;
	global.input.carrier = $('#res_phone_carrier').val();
	//global.input.fax = $('#res_fax').val();
	//global.input.use_fax = ($('#res_use_fax').attr('checked')) ? 1 : 0;
	
	//global.input.address.line1 = $('#res_address_line1').val();
	//global.input.address.line2 = $('#res_address_line2').val();
	//global.input.address.city = $('#res_address_city').val();
	//global.input.address.state = $('#res_address_state').val();
	//global.input.address.zip = $('#res_address_zip').val();
	
	global.input.products.ordering = $('#res_products_ordering').attr('checked');
	global.input.products.payment = $('#res_products_payment').attr('checked');
	global.input.products.dinein = $('#res_products_dinein').attr('checked');
		//global.input.latitude = global.latitude;
	//global.input.longitude = global.longitude;
	
	global.input.tax = $('#res_tax').val();
		/*global.input.op_hours = [];
	for (var i = 0 ; i < global.ophours_max_entry ; ++i) {
		if ( $('#op_hours #op_wday_from_'+i).val() === '--' ) {
			continue;
		}
		
		var oph = new Object();
		oph.from = $('#op_hours #op_wday_from_'+i).val();
		oph.to = $('#op_hours #op_wday_to_'+i).val();
		
		var open = $('#op_hours #op_hours_from_'+i).val();
		open += $('#op_hours #op_min_from_'+i).val();
		open += ' '+$('#op_hours #op_ampm_from_'+i).val();
		oph.open = open;
		
		var close = $('#op_hours #op_hours_to_'+i).val();
		close += $('#op_hours #op_min_to_'+i).val();
		close += ' '+$('#op_hours #op_ampm_to_'+i).val();
		oph.close = close;
		//alert("Adding "+JSON.stringify(oph));		//global.input.op_hours.push(oph);
		// It works
		global.input.op_hours.push(JSON.parse(JSON.stringify(oph)));
	}*/
}
function submit_input() {
	handle_event('submit_form',url_base() + global.ob_info_onboarding_url,JSON.stringify(global.input));
}

function onboardmerchant_pg1(Obj) {
	clearError();
	if (validate_input(Obj) == 1) {
		gather_values_onboardmerchant_pg1();
		//display_input_onboardmerchant_pg1();
		submit_input();	
	}
}
function handle_event() {
	switch(arguments[0]) {
		case 'loadcompanylogo':
			loadcompanylogo();
			break;
		case 'loadmenulink':
			loadmenulink();
			break;
		case 'onboardmerchant_pg1':
			onboardmerchant_pg1();
			break;
		case 'submit_form' : // url,data
			submit_form(arguments[1],arguments[2]);
			break;
		case 'displayErrorMsg' : // Msg
			displayErrorMsg(arguments[1]);
			break;
		case 'display_form_data' : // Data
			display_form_data(arguments[1]);
			break;
		default:
			$("#Error").html("No such handler "+arguments);
			break;
	}
}
function create_operating_hours() {
	var wkdays = ['--','Mon','Tue','Wed','Thr','Fri','Sat','Sun'];
	var min = [':00', ':15', ':30', ':45'];
	for (var h = 1; h < 13; h++) {
			$(this).append('<option value="' + h + '">' + h + '</option>');
		}
	var markup = "";
	for (var i = 0 ; i < global.ophours_max_entry ; ++i) {
		markup += '<select name="op_hours" id="op_wday_from_'+i+'">'
		for (var j = 0 ; j < wkdays.length ; ++j) {
			markup += '<option value="'+wkdays[j]+'">'+wkdays[j]+'</option>';
		}
		markup += '</select>';
		markup += ' to ';
		markup += '<select name="op_hours" id="op_wday_to_'+i+'">'
		for (var j = 0 ; j < wkdays.length ; ++j) {
			markup += '<option value="'+wkdays[j]+'">'+wkdays[j]+'</option>';
		}
		markup += '</select>';
		markup += ' open: ';
		markup += '<select name="op_hours" id="op_hours_from_'+i+'">'
		for (var h = 1; h < 13; h++) {
			markup += '<option value="' + h + '">' + h + '</option>';
		}
		markup += '</select>';
		markup += '<select name="op_hours" id="op_min_from_'+i+'">'
		for (var m = 0; m < min.length; m++) {
			markup += '<option value="' + min[m] + '">' + min[m] + '</option>';
		}
		markup += '</select>';
		markup += '<select name="op_hours" id="op_ampm_from_'+i+'">'
		markup += '<option value="AM">AM</option>';
		markup += '<option value="PM">PM</option>';
		markup += '</select>';
		markup += ' close: ';
		markup += '<select name="op_hours" id="op_hours_to_'+i+'">'
		for (var h = 1; h < 13; h++) {
			markup += '<option value="' + h + '">' + h + '</option>';
		}
		markup += '</select>';
		markup += '<select name="op_hours" id="op_min_to_'+i+'">'
		for (var m = 0; m < min.length; m++) {
			markup += '<option value="' + min[m] + '">' + min[m] + '</option>';
		}
		markup += '</select>';
		markup += '<select name="op_hours" id="op_ampm_to_'+i+'">'
		markup += '<option value="PM">PM</option>';
		markup += '<option value="AM">AM</option>';
		markup += '</select><br/>';
	}
	$('#op_hours').html(markup);
}
$(document).ready(function() {
	$('#company_logo').click ( function() {handle_event('loadcompanylogo');} );
	$('#menu_link').click ( function() {handle_event('loadmenulink');} );
	$('#onboardmerchant_pg1').click( function() { handle_event('onboardmerchant_pg1');});
	$('#bkcolor').simpleColor();
	create_operating_hours();
   });

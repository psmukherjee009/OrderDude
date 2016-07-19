var global = {
	companylogoask : 'Enter url of your logo : ',
	menu_ask : 'Enter url of your menu : ',
	menu_instruction : 'We will process this menu after the approval of your application',
	menu_link : '',
	latitude : -999999,
	longitude : -999999,
	ob_edit_info_url:'/cgi-perl/Admin.cgi/ADDINFO/',
	ob_get_info_url:'/cgi-perl/VirtualOrdering.cgi/GETBUSINESS/',
	ob_menu_onboard_url : 'http://www.orderdude.com/EditMenu.html',
	ob_first_onboard_url : 'http://www.orderdude.com/firstODOnboard.html',
	ophours_max_entry : 10,
	input : {products:{}},
	storageTag : 'merchant_vault'
};

// Version 2.0 Slimmer Onboarding
function url_base() {
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
}function display_input_onboardmerchant_pg1() {
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
	error_msg = error_msg + check_text_field('#res_phone','555-555-5555');
	
		if ( error_msg.trim() != "" ) {
		handle_event('displayErrorMsg','Mandatory Fields missing');
		return 0;
	}
	return 1;
}
function submit_form(url,input) {
	//alert("Submit Form "+url+" data = "+input);
	var request = new XMLHttpRequest();
	
	request.onload = function() {
		if (request.status == 200) {
			//alert("Data received = "+request.responseText);
			var res = JSON.parse(request.responseText);
			alert('Saved');
		}
	}
	request.open("POST",url);
	request.setRequestHeader('Content-Type','application/json');
	request.send(input);
}
function get_info(id) {
	var url = global.ob_get_info_url+id+'/';
	var request = new XMLHttpRequest();
	
	request.onload = function() {
		if (request.status == 200) {
			//alert("Data received = "+request.responseText);
			var res = JSON.parse(request.responseText);
			//alert("Input = "+JSON.stringify(res));
			global.input = res[0].Info;
			//alert("Input = "+JSON.stringify(global.input));
			set_values_onboardmerchant_pg1();
		}
	}
	request.open("GET",url);
	request.setRequestHeader('Content-Type','application/json');
	request.send(null);
}
function set_values_onboardmerchant_pg1() {
	$('#res_name').val(global.input.name);
	$('#res_password').val(global.input.password);
	
	$('#res_phone').val(global.input.phone);
	$('#res_use_sms').attr('checked',global.input.sms);
	$('#res_phone_carrier').val(global.input.carrier);
	
	$('#res_products_ordering').attr('checked',global.input.products.ordering);
	$('#res_products_dinein').attr('checked',global.input.products.dinein);
	$('#res_products_payatcounter').attr('checked',global.input.products.payatcounter);
	$('#res_products_payment').attr('checked',global.input.products.payment);
	
	$('#res_tax').val(global.input.tax);
}
// Build the input object
// We will dump this to the backend in JSON format
function gather_values_onboardmerchant_pg1() {
	global.input.name = $('#res_name').val();
	global.input.password = $('#res_password').val();
	
	global.input.phone = $('#res_phone').val();
	global.input.sms = ($('#res_use_sms').attr('checked')) ? 1 : 0;
	global.input.carrier = $('#res_phone_carrier').val();
	
	global.input.products.ordering = $('#res_products_ordering').attr('checked');
	global.input.products.dinein = $('#res_products_dinein').attr('checked');
	global.input.products.payatcounter = $('#res_products_payatcounter').attr('checked');
	global.input.products.payment = $('#res_products_payment').attr('checked');	
	global.input.tax = $('#res_tax').val();
}
function submit_input() {
	var url = global.ob_edit_info_url;
	if ( typeof global.input.id != 'undefined' ) {
		url += global.input.id+"/";
	}
	handle_event('submit_form',url_base() + url,JSON.stringify(global.input));
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
$(document).ready(function() {
	var q = localStorage.getItem(global.storageTag);
	if ( (typeof q != 'undefined') && (q != null) ) {
		$('#onboardmerchant_pg1').click( function() { handle_event('onboardmerchant_pg1');});
		get_info(q);
	}
	else {
		window.location.href = global.ob_first_onboard_url;
	}
});

var global_base = {
	ob_info_onboarding_url:'/cgi-perl/Admin.cgi/ADDINFO/',
	ob_menu_onboard_url : 'http://www.orderdude.com/EditMenu.html',
	ob_merchant_dashboard_url : 'http://www.orderdude.com/DashBoard.html',
	ob_merchant_orderboard_url : 'http://www.orderdude.com/OrderBoard.html',
	input : {products:{}},
	storageTag : 'merchant_vault',
	ob_login_url : '/cgi-perl/Admin.cgi/LOGIN/'
};

var global = global_base;

// Version 2.0 Slimmer Onboarding
function url_base() {
	//alert('http://' + document.URL.split('/')[2]);
	return 'http://' + document.URL.split('/')[2];
}

function displayLoginErrorMsg(error_msg) {
	$('#LoginError').html("<p>"+error_msg+"</p>");
	$('#LoginError').addClass('error');
}

function displayErrorMsg(error_msg) {
	$('#Error').html("<p>"+error_msg+"</p>");
	$('#Error').addClass('error');
}
function display_form_data(data) {
	data.replace(/'&'/g,'\n');
	alert(data);
}
function clearLoginError() {
	$('#LoginError').html("");
}
function clearError() {
	$('#Error').html("");
}
function display_input_onboardmerchant_pg1() {
	var data = JSON.stringify(global.input);
	data.replace(/'}'/g,'}\n\n');
	data.replace(/'{'/g,'\n{');
	alert("Input = "+data);
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
	request.send(data);
}
function submit_form(url,input) {
	//alert("Submit Form "+url+" data = "+input);
	var request = new XMLHttpRequest();
	
	request.onload = function() {
		if (request.status == 200) {
			//alert("Data received = "+request.responseText);
			var res = JSON.parse(request.responseText);
			global.input.id = res.Id;
			// Store this id in local storage
			localStorage.setItem(global.storageTag,res.Id);
			// Load the next page
			window.location.href = global.ob_menu_onboard_url;
		}
	}
	request.open("POST",url);
	request.setRequestHeader('Content-Type','application/json');
	request.send(input);
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
function onboard_success(text) {
	//alert("Data received = "+request.responseText);
	var res = JSON.parse(text);
	global.input.id = res.Id;
	// Store this id in local storage
	localStorage.setItem(global.storageTag,res.Id);
	// Load the next page
	window.location.href = global.ob_menu_onboard_url;
}

function onboard_fail(text) {
	alert("Onboarding Failed. Please try again...");
}function submit_onboard_input() {
	postDataatUrl(url_base() + global.ob_info_onboarding_url,JSON.stringify(global.input),onboard_success,onboard_fail);
}


function onboardmerchant_pg1(Obj) {
	global = global_base;
	clearError();
	clearLoginError();
	if (validate_input(Obj) == 1) {
		gather_values_onboardmerchant_pg1();
		//display_input_onboardmerchant_pg1();
		submit_onboard_input();	
	}
}

//================== login Related Functions ===================
function validate_login_input() {
	var error_msg = "";
	
	error_msg = error_msg + check_text_field('#log_login','phone number');
	error_msg = error_msg + check_text_field('#log_password','');
	
	
	if ( error_msg.trim() != "" ) {
		handle_event('displayLoginErrorMsg','Mandatory Fields missing');
		return 0;
	}
	return 1;
}

function gather_login_data() {
	global.input.login = $('#log_login').val();
	global.input.pass = $('#log_password').val();
}

function login_success(text) {
	//alert("Data received = "+request.responseText);
	var res = JSON.parse(text);
	if ( res.Id != -1 ) {
		global.input.id = res.Id;
		// Store this id in local storage
		localStorage.setItem(global.storageTag,res.Id);
		// Load the next page
		window.location.href = global.ob_merchant_dashboard_url;
	}
	else {
		login_fail(text);
	}
}

function login_fail(text) {
	handle_event('displayLoginErrorMsg','Login Failed. Please try again');
}
function submit_login() {
	postDataatUrl(url_base() + global.ob_login_url,JSON.stringify(global.input),login_success,login_fail);
}

function login() {
	global = global_base;
	clearLoginError();
	clearError();
	if (validate_login_input() == 1) {
		gather_login_data();
		//display_input_onboardmerchant_pg1();
		submit_login();	
	}}
//================== login Related Functions Ends===================
function handle_event() {
	switch(arguments[0]) {
		case 'onboardmerchant_pg1':
			onboardmerchant_pg1();
			break;
		case 'login_pg' :
			login();
			break;
		case 'displayErrorMsg' : // Msg
			displayErrorMsg(arguments[1]);
			break;
		case 'displayLoginErrorMsg' : // Msg
			displayLoginErrorMsg(arguments[1]);
			break;
		case 'display_form_data' : // Data
			display_form_data(arguments[1]);
			break;
		default:
			$("#Error").html("No such handler "+arguments);
			break;
	}
}

$(document).bind("mobileinit", function() {
	$.mobile.page.prototype.options.addBackBtn = true;
	$.mobile.selectmenu.prototype.options.nativeMenu = false;
	$.mobile.changePage.defaults.allowSamePageTransition = true;
});
$(document).ready(function() {
	// Already Logged In
	//alert(localStorage.getItem(global.storageTag));
	if ( (typeof localStorage.getItem(global.storageTag) != 'undefined') && (localStorage.getItem(global.storageTag) != null) ) {
		window.location.href = global.ob_merchant_orderboard_url;
	}
	$('#onboardmerchant_pg1').click( function() { handle_event('onboardmerchant_pg1');});
	$('#login_pg').click( function() { handle_event('login_pg');});
   });

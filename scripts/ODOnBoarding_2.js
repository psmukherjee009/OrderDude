var global = {
	companylogoask : 'Enter url of your logo : ',
	menu_ask : 'Enter url of your menu : ',
	menu_instruction : 'We will process this menu after the approval of your application',
	menu_link : '',
	latitude : -999999,
	longitude : -999999,
	ob_info_onboarding_url:'/cgi-bin/Admin.cgi/ADDINFO/',
	ob_menu_onboard_url : 'http://www.orderdude.com/ODOnboarding_GetMenu.html',
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
			global.input.id = res.Id;
			// Store this id in local storage
			localStorage.setItem(global.storageTag,res.Id);
			// Load the next page
			window.location.href = global.ob_menu_onboard_url+'?id='+global.input.id;
			//$('#menu_block').css("display","inline");
			//$('#info_block').css("display","none");
			//$("#menu_label").after("<sub>"+global.menu_instruction+"</sub>");
			//$("#menu_block").replaceWith("<iframe src=" + global.ob_menu_onboard_url+'?id='+global.input.id + " width=100% height=100% frameBorder='0' scrolling='no'></iframe>");
			//global.menu_link = cl_url;
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
	global.input.products.payment = $('#res_products_payment').attr('checked');
	global.input.products.dinein = $('#res_products_dinein').attr('checked');
		
	global.input.tax = $('#res_tax').val();
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
$(document).ready(function() {
	$('#onboardmerchant_pg1').click( function() { handle_event('onboardmerchant_pg1');});
   });

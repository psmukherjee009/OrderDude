var global = {
	test_url:'http://www.parthamukherjee.com/cgi-perl/VirtualManagement.cgi/TEST_JSON/'
};

function displayErrorMsg(error_msg) {
	$('#Error').html("<p>"+error_msg+"</p>");
	$('#Error').addClass('error');
}

function ajax_ver1(url) {
	alert("ajax_ver1");
	$.ajax({
		url:url,
		type:"POST",
		dataType: "json",
		cache:false,
		success : function(data) {
			alert("Success "+data.message);
		},
		error : function(data) {
			alert("Failed "+data.message);
		},
		complete : function(data) {
			alert("Complete "+ data.message);
		}
	});
}

function json_ver1(url) {
	alert("json_ver1");
	$.post(url,function(json) {
		alert("Came In");
		if (json.status == "success") {
			 alert("Success "+json.message);
		}
		else {
			alert("Failed "+json.message);
		}
	});
}

function ajax_getver(url) {
	alert("ajax_getver");
	$.ajax({
		type: 'GET',
		url: url,
		dataType: 'json',
		cache:false,
		success: function(ret){
			alert("Success "+ret.message);
		},
		error: function(ret){
			alert("Handle Errors here"+ret.message);
		},
		complete: function(ret) {
			alert("Complete "+ret.message);
		}
	});
}

function get_json(url) {
	alert("get_json");
	$.getJSON(url,function(json) {
		alert("Called "+json.message);
	});
}

function submit_form(url) {
	//alert("Submit Form "+url);
	ajax_ver1(url);
	//json_ver1(url);
	//ajax_getver(url);
	//get_json(url);
}

$(document).ready(function() {
	$('#test_communication1').click ( function() {ajax_ver1(global.test_url);} );
	$('#test_communication2').click ( function() {json_ver1(global.test_url);} );
	$('#test_communication3').click ( function() {ajax_getver(global.test_url);} );
	$('#test_communication4').click ( function() {get_json(global.test_url);} );
	//$('#test_communication').click( function() {alert("Clicked");} );
   });

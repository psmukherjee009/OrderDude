$(document).bind("mobileinit", function() {
	$.mobile.page.prototype.options.addBackBtn = true;
	$.mobile.selectmenu.prototype.options.nativeMenu = false;
	$.mobile.changePage.defaults.allowSamePageTransition = true;
});
var countdown = 120;
var stintvl;
function OrderConfirmCountdown() {
	if ( countdown > 0 ) {
		$('#CalltoConfirmOrder').html("Call to Confirm Order after "+countdown+" secs");
	}
	else {
		$('#CalltoConfirmOrder').html("Call to Confirm Order");
		clearTimeout(stintvl);
	}
	countdown--;
}

$(document).ready(function() {
	$('#CalltoConfirmOrder').data('disabled',true);
	
	$('#CalltoConfirmOrder').html("Call to Confirm Order after "+countdown+" secs");
	stintvl = setInterval(OrderConfirmCountdown,1000);
	
});
function buildMenuNavigator() {
	alert("Working");
	var listhtml = '<ul data-role="listview" data-theme="b"><li><a href="acura.html">Acura</a></li><li><a href="audi.html">Audi</a></li><li><a href="bmw.html">BMW</a></li></ul>';
	$('test_list').html(listhtml);
	$.mobile.changePage( "#", { reverse: !!arguments[2]} );
}
		
		
$(document).ready(function() {
	buildMenuNavigator(); 
});
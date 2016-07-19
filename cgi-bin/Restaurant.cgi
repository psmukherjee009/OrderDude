#!/usr/bin/perl -wT
use strict;
use warnings;

use CGI;
use CGI::Carp qw(fatalsToBrowser set_message warningsToBrowser);
use DBI;
use LWP::Simple;

my ($cgi,%cookies,%data,$dbh,$sth);
my $db_data_source	= "orderdude.com";
my $db_user		= "orderdud_www";
my $db_password		= "OrderDude2012";
my $table_name		= "orderdud_www.TestMenu";

my $msg_wall_url = "http://www.orderdude.com/cgi-bin/SimpleMessageBoard.cgi";
my $restaurant_id;

sub GetWebPage {
	my ($url) = @_;
	my ($i);

	$_ = get($url);
	$i = 1;
	#print "Getting URL $url\n";
	while ( not defined $_ ) {
		sleep(1);
		$_ = get($url);
		$i++;
		if ( $i > 5 ) {
		 	print "URL $url failed $i times :: Abandoning $url\n";
		 	return (-1,"");
		}
	}
	return (1,$_);
}

sub createDBLink() {
	$dbh = DBI->connect($db_data_source,
 								 $db_user,
								 $db_password,
								 { RaiseError => 0, AutoCommit => 0});
	Info ("DB Connect Failure", "Error","Can't connect to $db_data_source: $DBI::errstr ($DBI::err)") if ( !$dbh );
	#print $cgi->p("Creating new DB link");
}

sub execute_on_DB($) {
	my ($cmd) = @_;
	
	createDBLink() if ( !$dbh );
	$sth = $dbh->prepare($cmd);
	$sth->execute();
}

sub get_from_DB($) {
	my ($cmd) = @_;
	execute_on_DB($cmd);
	my (@data,@row);

	while (@row = $sth->fetchrow_array) {
		push(@data,@row);
	}
	return @data;
}

sub getAvailableMenusfromDB {
	my $cmd = "select t.Name from $table_name t";
	my @menus = get_from_DB($cmd);
	return @menus;
}

sub DisplayOrderWindow {
	print $cgi->p("Type your response below.");
	
	#print $cgi->hidden(-name => "RESTAURANT_id", -value => $data{"RESTAURANT_id"});
	print "Receiver Phone :".$cgi->textfield(-name => "RECEIVER_id",
							-value => "",
							-size => 20,
							-maxlength => 256)."<br />";
	print $cgi->textarea(-name => "msg",
							-value => $data{"msg"},
							-rows => 15,
							-cols => 50);
	print $cgi->submit(-name => "Choice" , -value => "Order");
	
}

sub ShowOrders {
	my $wall_show_url = "$msg_wall_url/SHOW/".$data{"RESTAURANT_id"}."/".$data{"RECEIVER_id"}."/?DIS_REVERSE=1\&nohtml=1\&inCSV=1";
	
	my ($ret,$contents) = GetWebPage($wall_show_url);
	if ($ret = 1) {
		return $contents;
	}
	else {
		print "Please try again later";
	}
}

sub AddOrders {
	my $wall_add_url = "$msg_wall_url/ADD/".$data{"RESTAURANT_id"}."/".$data{"RECEIVER_id"};
	$wall_add_url .= "/?DIS_REVERSE=1\&nohtml=1\&inCSV=1";
	# Add message to Restaurant Wall
	my ($ret,$contents) = GetWebPage($wall_add_url."\&msg=".$data{"msg"});
	if ($ret = 1) {
		return $contents;
	}
	else {
		print "Failed to order. Please try again later";
	}
}

sub ManageOrder {
	if ( $data{"msg"} ) {
		return AddOrders() if ($data{"RECEIVER_id"});
	}
	return ShowOrders();
}

sub getRestaurantfromDB {
	my ($menu_name) = @_;

	my $cmd = "select t.Description,t.Wall_id,t.Use_Wall,t.menu,t.Phone,t.Use_SMS,t.Email,t.Use_Email from $table_name t where t.name = \"$menu_name\"";
	my @menu_data = get_from_DB($cmd);
	#print $cgi->p("Menu $menu_name from DB $cmd @menu_data");
	return @menu_data;
}

sub LoadRestaurant {
	my ($desc,$wall_id,$use_wall,$menu,$phone,$use_sms,$email,$use_email) = getRestaurantfromDB($data{"MenuName"});

	$data{"Desc"}			= $desc;
	$data{"Wall_id"}		= $wall_id;
	$data{"Use_Wall"}		= $use_wall;
	$data{"Menu"}			= $menu;
	$data{"Phone"}			= $phone;
	$data{"Use_SMS"}		= $use_sms;
	$data{"Email"}			= $use_email;
	$restaurant_id			= (($phone) ? $phone : $wall_id);
	$data{"RESTAURANT_id"}	= $restaurant_id;
	print "<table>";
	print "<tr><td>Restaurant Id = </td><td>$restaurant_id</td></tr>";
	print "<tr><td>Wall Id = </td><td>$wall_id</td></tr>";
	print "<tr><td>Phone = </td><td>$phone</td></tr>";
	print "<tr><td>Email = </td><td>$email</td></tr>";
	print "</table>";
}

sub MenuRequestBlock() {
	my @menus = getAvailableMenusfromDB();
	if ( $#menus < 0 ) {
		print $cgi->h2("No Available Menus");
		return;
	}
	#print $cgi->p("Available Menus : @menus");
	#print $cgi->start_form(-action => "", -method => "POST");
	#print $cgi->start_form(-action => "DisplayCookie.cgi", -method => "POST");
	print "<table>";
	print "<tr>";
	print "<td>Menu List :</td>";
	print "<td>";
	print "<select name=\"MenuName\">";
	print "<option selected=\"selected\" value=\"".$menus[0]."\">".$menus[0]."</option>";
	for ( my $i = 1 ; $i <= $#menus ; ++$i ) {
		print "<option value=\"".$menus[$i]."\">".$menus[$i]."</option>";
	}
	print "</select>";
	print "</td>";
	print "<td>".$cgi->submit(-name => "Choice" , -value => "ShowRestaurant")."</td>";
	print "</tr>";
	print "</table>";
	#print $cgi->end_form();
}

sub DisplayMessages {
	my ($contents) = @_;

	my @parts = split /,/,$contents;
	my $nocols = $parts[0];
	print "<table>";
	for ( my $i = 1 ; $i <= $#parts ; $i += $nocols ) {
		print "<tr>";
		for (my $j = 0; $j < $nocols ; ++$j) {
			print "<td>|$parts[$i+$j]|</td>";
		}
		print "</tr>";
	}
	print "</table>";
}

sub Main() {
	$cgi = CGI->new();
	%data = $cgi->Vars;

	print $cgi->header("text/html");
	print $cgi->start_html("Restaurant");
	if ($data{"SHOW_INPUT"}) {
		print $cgi->p("POST input");
		foreach my $key (keys %data) {
			print $cgi->p("$key = $data{$key}<br />\n");
		}
	}
	print $cgi->start_form(-action => "", -method => "POST");
	if ( ($data{"Choice"} eq "ShowRestaurant") ) {
		LoadRestaurant();
	}
	else {		
		MenuRequestBlock();
	}
	if ($data{"RESTAURANT_id"}) {
		my $contents = ManageOrder();
		DisplayMessages($contents);
		DisplayOrderWindow();
	}
	
	#Load all data
	while (my ($key,$value) = each %data) {
		print $cgi->hidden(-name => $key, -value => $value);
	}
	print $cgi->end_form();
	print $cgi->end_html();
	exit();
}


Main();

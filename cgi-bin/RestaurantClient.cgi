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

my ($name,$phone,$menu);

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

sub getMenufromDB {
	my ($menu_name) = @_;

	my $cmd = "select t.Description,t.Wall_id,t.Phone,t.menu from $table_name t where t.name = \"$menu_name\"";
	my @menu_data = get_from_DB($cmd);
	$cgi->p("Menu $menu_name from DB @menu_data");
	return @menu_data;
}

sub DisplayMenuWindow {
	my $menu_name = $data{"MenuName"};
	#print $cgi->p("Displaying Menu for $menu_name");
	my ($desc,$w_id,$phone,$menu) = getMenufromDB($menu_name);
	
	print $cgi->h3("$menu_name -- $desc");
	$data{"RESTAURANT_id"} = (($phone) ? $phone : $w_id) if ( !$data{"RESTAURANT_id"} );
	#Remove xml tags from the menu
	#$menu =~ s/<xml /<xml style='display:none /g;
	#$menu =~ s/<\/xml>//g;
	print $menu;
}

sub DisplayOrderWindow {
	print $cgi->p("Your Name and Phone number is required for Ordering");
	print $cgi->p("Type your order below. Restaurant = ".$data{"RESTAURANT_id"});
	
	print $cgi->hidden(-name => "RESTAURANT_id", -value => $data{"RESTAURANT_id"});
	print $cgi->textarea(-name => "msg",
							-value => $data{"msg"},
							-rows => 15,
							-cols => 50);
	print $cgi->submit(-name => "Choice" , -value => "Order");
	
}

sub HandleOrder {
	my $wall_add_url = "$msg_wall_url/ADD/".$data{"Phone"}."/".$data{"RESTAURANT_id"};
	$wall_add_url .= "/?DIS_REVERSE=1\&nohtml=1";
	my $wall_show_url = "$msg_wall_url/SHOW/".$data{"Phone"}."/".$data{"RESTAURANT_id"}."/?DIS_REVERSE=1\&nohtml=1";
	
	if ( $data{"msg"} ) {
		# Add message to Restaurant Wall
		my ($ret,$contents) = GetWebPage($wall_add_url."\&msg=".$data{"msg"});
		if ($ret = 1) {
			print $contents;
		}
		else {
			print "Failed to order. Please try again later";
		}
	}
	else {
		my ($ret,$contents) = GetWebPage($wall_show_url);
		if ($ret = 1) {
			print $contents;
		}
		else {
			print "Please try again later";
		}
	}
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
	print "<td>Phone :</td><td>".$cgi->textfield(-name => "Phone",
							-value => $phone,
							-size => 20,
							-maxlength => 256)."</td>";
	print "<td>Menu List :</td>";
	print "<td>";
	print "<select name=\"MenuName\">";
	$data{"MenuName"} = $menus[0] if ( !($data{"MenuName"}));
	for ( my $i = 0 ; $i <= $#menus ; ++$i ) {
		if ( $data{"MenuName"} eq $menus[$i] ) {
			print "<option selected=\"selected\" value=\"".$menus[$i]."\">".$menus[$i]."</option>";
		}
		else {
			print "<option value=\"".$menus[$i]."\">".$menus[$i]."</option>";
		}
	}
	print "</select>";
	print "</td>";
	print "<td></td>";
	print "</tr>";
	print "<tr>";
	print "<td>Name :</td><td>".$cgi->textfield(-name => "Name",
							-value => $name,
							-size => 20,
							-maxlength => 256)."</td>";
	print "<td></td>";
	print "<td></td>";
	print "<td></td>";
	print "<td>".$cgi->submit(-name => "Choice" , -value => "ShowMenu")."</td>";
	print "</tr>";
	print "</table>";
	#print $cgi->end_form();
	
	
}

sub Main() {
	$cgi = CGI->new();
	%data = $cgi->Vars;

	print $cgi->header("text/html");
	print $cgi->start_html("Menu");
	if ($data{"SHOW_INPUT"}) {
		print $cgi->p("POST input");
		foreach my $key (keys %data) {
			print $cgi->p("$key = $data{$key}<br />\n");
		}
	}
	print $cgi->start_form(-action => "", -method => "POST");
	MenuRequestBlock();
	if ( ($data{"Choice"} eq "ShowMenu") ) {
		#print $cgi->p("Request to Display Menu");
		DisplayMenuWindow();
		DisplayOrderWindow();
	}
	if ( ($data{"Choice"} eq "Order") ) {
		DisplayMenuWindow();
		HandleOrder();
		DisplayOrderWindow();
	}
	print $cgi->end_form();
	print $cgi->end_html();
	exit();
}


Main();

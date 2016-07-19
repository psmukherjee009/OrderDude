#!/usr/bin/perl -wT
use strict;
use warnings;
use lib "perlsystemlibs";
use lib "/home/orderdud/perl5";
use lib ".";

use CGI;
use CGI::Carp qw(fatalsToBrowser set_message warningsToBrowser);
use DBI;
use LWP::Simple;
use JSON;

use Res_Address;
use Res_Communicators;
use Res_Description;
use Res_Location;
BEGIN {
    my $b__dir = (-d '/home/orderdud/perl'?'/home/orderdud/perl':( getpwuid($>) )[7].'/perl');
    unshift @INC,$b__dir.'5/lib/perl5',$b__dir.'5/lib/perl5/x86_64-linux-thread-multi',map { $b__dir . $_ } @INC;
}

my ($cgi,%cookies,%data,$dbh,$sth);

my $db_data_source	= "orderdude.com";
my $db_user		= "orderdud_www";
my $db_password		= "OrderDude2012";
my $table_name		= "orderdud_www.Menu";
my $test_table_name	= "orderdud_www.TestMenu";

my $host_url = "http://www.orderdude.com/cgi-bin/VirtualManagement.cgi";
my $test_admin_url = "http://www.orderdude.com/cgi-bin/TestAdmin.cgi";
my $test_menu_url = "http://www.orderdude.com/cgi-bin/VirtualManagement.cgi/HI/TEST";
my $msg_wall_url = "http://www.orderdude.com/cgi-bin/SimpleMessageBoard.cgi";

sub Info($$;$) {
	my ($status, $title, $message) = @_;

	print $cgi->header('text/html');
	print $cgi->start_html($title);
	print $cgi->h1($status);
	print $cgi->p($message);
	print $cgi->end_html;
	exit;
}

sub createDBLink() {
	$dbh = DBI->connect($db_data_source,
 				$db_user,
				$db_password,
				{ RaiseError => 0, AutoCommit => 0});
	Info ("DB Connect Failure", "Error","Can't connect to $db_data_source: $DBI::errstr ($DBI::err)") if ( !$dbh );
}

sub execute_on_DB($) {
	my ($cmd) = @_;
	
	createDBLink();
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

sub SecurityCheck() {
	LastStage( 403, "Go Away!", "I only talk to localhost!")
		unless $cgi->remote_host eq 'localhost'
			or $cgi->remote_host eq '127.0.0.1';
}

sub LastStage {
	my ($status, $title, $message) = @_;
	
	$status = 404 if (!$status);
	$title = 'Resource Not Found' if (!$title);
	# Nothing handles this, throw back a standard 404
	print $cgi->header(-status => $status, -type => 'text/html');
	print $cgi->h1('Resource Not Found'); 
	print $cgi->p($message) if ($message);
	exit();
}

sub CMD($$) {
	my ($path, $code) = @_;
	return unless $cgi->path_info =~ $path;
	$code->();
	exit;
}

sub GET($$) {
	my ($path, $code) = @_;
	return unless $cgi->request_method eq 'GET' or $cgi->request_method eq 'HEAD';
	CMD($path, $code);
}

sub POST($$) {
    my ($path, $code) = @_;
    return unless $cgi->request_method eq 'POST';
    CMD($path, $code);
}

sub APIDocumentation {
	my ($error_msg) = @_;
	
	print $cgi->header('text/html');
	print $cgi->h1("Virtual Management API Documentation");
	print $cgi->h3("$error_msg") if ($error_msg);
	print $cgi->p("Here is a list of what you can do:");
	print $cgi->dl(
		$cgi->dt("GET /GETLIST/LATITUDE/LONGITUDE/RADIUS/"),
		$cgi->dd("Returns the nearby restaurant within that radius"),
		
		$cgi->dt("GET /GETMENU/ID/"),
		$cgi->dd("Returns the restaurant and menu of that restaurant"),
		
		$cgi->dt("GET /GETMENU/TEST/TESTNAME/"),
		$cgi->dd("Returns the restaurant and menu list of TESTNAME
					add inhtml=1 to view in browser"),

		$cgi->dt("GET /CANCEL/ORDERNUMBER/ID/"),
		$cgi->dd("Cancels the previous order"),
		
		$cgi->dt("GET /CANCEL/TEST/TESTNUMBER/"),
		$cgi->dd("Returns the response of TESTNUMBER for cancel order"),

		$cgi->dt("POST /ORDER/ID/"),
		$cgi->dd("Accepts the XML order form and processes it with Restaurant"),
		
		$cgi->dt("POST /ORDER/TEST/TESTNUM/"),
		$cgi->dd("Accepts the order form and return response of TESTNUM"),
		
		$cgi->dt("GET /SENDORDER/SENDER_ID/RESTAURANT_ID/?order=\"Order Details\""),
		$cgi->dd("Accepts the order form and return response of TESTNUM"),
	);
}

sub AvailableTests {
	my $cmd = "select t.Name,t.Description from $test_table_name t";
	my @tests = get_from_DB($cmd);
	if ($#tests < 0 ) {
		print $cgi->h2("No Tests in DB");
		return;
	}
	for( my $t=0; $t <= $#tests; $t += 2) {
		$tests[$t] = $cgi->a({href => "$test_menu_url/$tests[$t]"},$tests[$t]);
	}
	print "<table>";
	print "<tr><th>TestName</th><th>Test Description</th>";
	for( my $t=0; $t <= $#tests; $t += 2) {
		print "<tr><td>$tests[$t]</td><td>$tests[$t+1]</td></tr>";
	}
	print "</table>";
}

sub SendMenuTest(@) {
	my @in = @_;

	
	if ( $in[0] ) {
		my $cmd = "select t.Menu from $test_table_name t where t.Name = \"$in[0]\"";
		#print $cgi->p("Getting menu using $cmd");
		my @output = get_from_DB($cmd);
		#print $cgi->p("Got menu @output");
		print "@output";
	}
	else {
		AvailableTests();
	}
	exit();
}

sub FindandSendMenu {
	my ($lat,$long,$alt,$dis) = @_;
	
	my $cmd = "select l.res_id,l.LATITUDE,l.LONGITUDE,d.name,d.description,d.logo
			from pmukherjee.Res_Location l
			inner join pmukherjee.Res_Description d
			on d.res_id = l.res_id
			where pow((pow($lat-l.LATITUDE,2)+pow($long-l.LONGITUDE,2)),0.5) < $dis";
	my $db = new DBBase(DBInfo::ResDB());
	my @ret = $db->get_from_DB($cmd);
	my @res_nearby;
	for ( my $i = 0 ; $i <= $#ret; $i += 6 ) {
		push( @res_nearby,{ 
			'id' => $ret[$i],
			'lat' => $ret[$i+1],
			'long' => $ret[$i+2],
			'name' => $ret[$i+3],
			'description' => $ret[$i+4],
			'logo' => $ret[$i+5]});
	}
	
	print $cgi->header('application/json');
	my $json = JSON->new->allow_nonref;
	my $return_text = $json->pretty->encode( \@res_nearby );
	print $return_text;
}

sub SendMenu() {
	print $cgi->header('text/html');
	
	my @cmd = split /\//,$cgi->path_info;
	#print $cgi->p("Sending Menu for ".$cgi->path_info()." Test = ",$cmd[2]);
	SendMenuTest(@cmd[3..$#cmd]) if ($cmd[2] eq "TEST");
	if ( $#cmd < 1 ) {
		APIDocumentation($cgi->path_info()." does not contain sufficient data for this call");
		exit();
	}
	FindandSendMenu($cmd[2],$cmd[3],$cmd[4],50);
	exit();
}

sub SendList() {
	print $cgi->header('text/html');
	
	my @cmd = split /\//,$cgi->path_info;
	#print $cgi->p("Sending Menu for ".$cgi->path_info()." Test = ",$cmd[2]);
	if ( $#cmd < 4 ) {
		APIDocumentation($cgi->path_info()." does not contain sufficient data for this call");
		exit();
	}
	FindandSendMenu($cmd[2],$cmd[3],$cmd[4],50);
	exit();
}

sub CancelOrderTest(@) {
	my @cmd = @_;

	print $cgi->header('text/html');
	print <<CANCELORDERTEST;
CANCELORDERTEST
}

sub CancelOrder() {
	print $cgi->header('text/html');
	print $cgi->p("Cancelling Order for ".$cgi->path_info());
	my @cmd = split /\//,$cgi->path_info;
	CancelOrderTest(@cmd[2..$#cmd]) if ($cmd[1] eq "TEST");
}

sub ProcessOrderTest(@) {
	my @cmd = @_;

	print $cgi->header('text/html');
	print <<PROCESSORDERTEST;
PROCESSORDERTEST
}

sub ProcessOrder() {
	print $cgi->header('text/html');
	print $cgi->p("Processing Order for ".$cgi->path_info());
	my @cmd = split /\//,$cgi->path_info;
	ProcessOrderTest(@cmd[2..$#cmd]) if ($cmd[1] eq "TEST");
}

sub SendOrder() {
	print $cgi->header('text/html');
	#print $cgi->p("Sending Order for ".$cgi->path_info());
	my @cmd = split /\//,$cgi->path_info;
	
	# Find if the restaurant id is present or not
	LastStage (403, "Missing Sender and Restaurant Id", "Missing Sender and Restaurant Id") if ($#cmd < 3);
	
	# Find if the order is present or not
	LastStage (403, "Missing Order", "Missing Order") if (!$data{"order"});
	
	# Add message to Restaurant Wall
	my ($ret,$contents) = GetWebPage($msg_wall_url."/ADD/".$cmd[2]."/".$cmd[3]."\?\&msg=".$data{"order"});
	$contents = "Failed to order. Please try again later" if ($ret == -1);
	
	$contents = "{
			\"success\":true,
			\"messageTitle\":null,
			\"message\":null,
			\"data\":{\"response\":\"$contents\"}
		}"	if ($data{"JSON"});
	print $cgi->header("220");
	exit();
}

sub OnBoardingPage1 {
	
	my $com = Res_Communicators->new();
	my $res_id = $com->add($data{'res_phone'},$data{'res_phone_carrier'},$data{'res_use_sms'},$data{'res_email'},$data{'res_use_email'},$data{'res_fax'},$data{'res_use_fax'},1);
	
	my $addr = Res_Address->new();
	$addr->add($data{'res_address_line1'},$data{'res_address_line2'},$data{'res_address_city'},$data{'res_address_state'},$data{'res_address_zip'},$res_id);
	
	my $desc = Res_Description->new();
	$desc->add($data{'res_name'},$data{'res_description'},$data{'res_menu_link'},$data{'res_logo'},$data{'res_password'},$res_id);
	
	my $loc = Res_Location->new();
	$loc->add($data{'res_LATITUDE'},$data{'res_LONGITUDE'},0,$res_id);
	
	#print $cgi->header(-status => 220, -type => 'text/html');
	print $cgi->header('application/json');
	#print "{ 'status' : 'success', 'message' : 'OK' }";
	my %msg = ('status' => 'success', 'message' => 'OK');
	my $json = JSON->new->allow_nonref;
	my $return_text = $json->pretty->encode( \%msg );
	print $return_text;
	exit();
}

sub TestJson {
	print $cgi->header('application/json');

	my %msg = ('status' => 'success', 'message' => 'OK');
	my $json = JSON->new->allow_nonref;
	my $return_text = $json->pretty->encode( \%msg );
	print $return_text;
	exit();
}

sub Main() {
	$ENV{REQUEST_METHOD} = 'GET' unless defined $ENV{REQUEST_METHOD};
	$cgi = CGI->new;
	%data = $cgi->Vars;

	#SecurityCheck();
	
	# Handle the commands now
	GET qr{^$}				=>	\&APIDocumentation;
	GET qr{^/HI/.*$}			=>	\&SendMenu;
	GET qr{^/GETLIST/.*$}			=>	\&SendList;
	GET qr{^/GETMENU/.*$}			=>	\&SendMenu;
	GET qr{^/CANCEL/.*$}			=>	\&CancelOrder;
	POST qr{^/ORDER/.*$}			=>	\&ProcessOrder;
	GET qr{^/SENDORDER/.*$}			=>	\&SendOrder;
	CMD qr{^/ONBOARD_PG1/.*$}		=>	\&OnBoardingPage1;
	CMD qr{^/TEST_JSON/.*$}			=>	\&TestJson;

	# Didn't match any command
	LastStage();
}

Main();

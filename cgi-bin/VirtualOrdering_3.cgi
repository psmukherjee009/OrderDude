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
use Data::Dumper;
use JSON;
use URI::Escape;

BEGIN {
    my $b__dir = (-d '/home/orderdud/perl'?'/home/orderdud/perl':( getpwuid($>) )[7].'/perl');
    unshift @INC,$b__dir.'5/lib/perl5',$b__dir.'5/lib/perl5/x86_64-linux-thread-multi',map { $b__dir . $_ } @INC;
}

my ($cgi,%cookies,%data,$dbh,$sth);

my $db_data_source			= "dbi:mysql:orderdud_www:orderdude.com";
my $db_user				= "orderdud_www";
my $db_password				= "OrderDude2012";

my $table_ob				= "orderdud_www.OB_DB";
my @table_ob_fields			= qw(latitude longitude id Info_JSON Menu_JSON Reservation_JSON Token_JSON Coupons_JSON);
my @table_ob_info_fields		= qw(latitude longitude id Info_JSON);
my @table_ob_bu_fields			= qw(id Info_JSON Menu_JSON Reservation_JSON Token_JSON Coupons_JSON);

my $table_order				= "orderdud_www.order_board";
my $table_order_id_gen			= "orderdud_www.order_id_generator";

################################################ Basic DB Related Functions ##########################################
sub createDBLink() {
	$dbh = DBI->connect($db_data_source,
 				 $db_user,
				 $db_password,
				 { RaiseError => 0, AutoCommit => 0});
	Info ("DB Connect Failure", "Error","Failed to connect to DB $DBI::errstr ($DBI::err)") if ( !$dbh );
}

sub execute_on_DB($) {
	my ($cmd) = @_;
	
	createDBLink() if (!$dbh);
	$sth = $dbh->prepare($cmd);
	$sth->execute() || Info("DB Execute Failure","Error","Error $cmd --- $DBI::errstr ($DBI::err)");
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

sub get_last_inserted_id {
	my $cmd = "select LAST_INSERT_ID()";
	my @ret = get_from_DB($cmd);
	my $id = ($#ret < 0) ? -1 : $ret[0];
	return $id;
}

################################################ Basic DB Related Functions Ends ##########################################
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

sub GetPostInput {
	my $post_input = "";
	$post_input = $data{'POSTDATA'} if ($data{'POSTDATA'}); # Firefox
	$post_input = $data{'XForms:Model'} if ($data{'XForms:Model'}); # Chrome
	$post_input = $data{'keywords'} if ($data{'keywords'}); # IE
	$post_input = uri_unescape($post_input);
	return $post_input;
}

sub PostWebPage {
	my ($url,$data) = @_;
	
	my $ua = LWP::UserAgent->new;
	my $response = $ua->request(POST url, 
		'Content-Type' => 'text/yaml',
		'Content'        => $data
	);
	if ($response->is_success) {
		
	}
}

sub Info($$;$) {
	my ($title, $status, $message) = @_;

	print $cgi->header('text/html');
	print $cgi->start_html($title);
	print $cgi->h1($status);
	print $cgi->p($message);
	print $cgi->end_html;
	exit;
}

sub LastStage {
	my ($title, $status, $message) = @_;
	
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
		$cgi->dt("<a href=\"".$cgi->url()."/GETINFO/LATITUDE/LONGITUDE/RADIUS/\">GETINFO/LATITUDE/LONGITUDE/RADIUS/</a>"),
		$cgi->dd("Returns the nearby restaurant information within that radius.<br />
			"),
			
		$cgi->dt("<a href=\"".$cgi->url()."/GETBUSINESS/ID/\">GETBUSINESS/ID/</a>"),
		$cgi->dd("Returns business details<br />
			Business details include Restaurant Menu, Reservation, Token, Coupons, etc<br />"),
		$cgi->dt("<a href=\"".$cgi->url()."/GETMENU/ID/\">GETMENU/ID/</a>"),
		$cgi->dd("Returns Restaurant Menu details<br />
			Restaurant Menu<br />"),	
		$cgi->dt("<a href=\"".$cgi->url()."/ADDINFO/\">/ADDINFO/</a>"),
		$cgi->dd("Adds a new restaurant in our DB<br />
			Info comes as JSON input in POST<br />"),
			
		$cgi->dt("<a href=\"".$cgi->url()."/ADDMENU/ID/\">/ADDMENU/ID/</a>"),
		$cgi->dd("Adds Menu to your restaurant identified by ID<br />
			Menu comes as JSON input in POST<br />"),
		$cgi->dt("<a href=\"".$cgi->url()."/EDITINFO/\">/EDITINFO/</a>"),
		$cgi->dd("Returns the nearby restaurant information within that radius<br />
			Following fields are needed to update restaurant info<br />
			Field 'id' is needed along with the fields that can be modified<br />"),
			
		$cgi->dt("<a href=\"".$cgi->url()."/SENDNEWORDER/SENDER_ID/RECEIVER_ID/\?order=Order Details\">/SENDNEWORDER/SENDER_ID/RECEIVER_ID/\?order=the_order</a>"),
		$cgi->dd("Accepts the order form and return OrderNumber if order number is not present"),
			
		$cgi->dt("<a href=\"".$cgi->url()."/UPDATEORDER/ORDER_ID\?order=Order Details\">/UPDATEORDER/ORDER_ID/\?order=the_order</a>"),
		$cgi->dd("Appends msg to existing order"),
			
		$cgi->dt("<a href=\"".$cgi->url()."/GETORDERUPDATE/SENDER_ID/RECEIVER_ID/ORDERID/\?lastupdatetime=time\">/GETORDERUPDATE/SENDER_ID/RECEIVER_ID/ORDERID/\?lastupdatetime=time</a>"),
		$cgi->dd("Get updates of the order id after lastupdatetime")
	);
}

sub GetInfo() {
	my @cmd = split /\//,$cgi->path_info;
	#print $cgi->p("Sending Menu for ".$cgi->path_info()." Test = ",$cmd[2]);
	if ( $#cmd < 4 ) {
		APIDocumentation($cgi->path_info()." does not contain sufficient data for this call");
		exit();
	}
	my $cmd = "select ".join(",",@table_ob_info_fields)."
			from $table_ob";
	my @info_db_data = get_from_DB($cmd);
	my @info_stack;
	my $json = JSON->new->allow_nonref;
	for ( my $i = 0 ; $i <= $#info_db_data; $i += ($#table_ob_info_fields+1) ) {
		my %info_atom;
		for ( my $j = 0 ; $j <= $#table_ob_info_fields ; ++$j ) {
			if ( ($table_ob_info_fields[$j] eq "Info_JSON") ) {
				#my $info_json_hash = $json->pretty->decode($info_db_data[$i+$j]);
				my $info_json_hash = $json->decode($info_db_data[$i+$j]);
				#Info("DeNormalizing","DeNormalizing","Denormalized to ".Dumper($info_json_hash));
				$info_json_hash->{"id"} = $info_db_data[$i+$j-1];
				$info_atom{"Info"} = $info_json_hash;
			}
			#Info("DeNormalizing","DeNormalizing","Denormalized to ".$info_db_data[$i+$j]) if ( ($table_ob_info_fields[$j] eq "Info_JSON") || ($table_ob_info_fields[$j] eq "Menu_JSON") );
		}
		push(@info_stack,\%info_atom);
	}
	
	#print $cgi->header(-type => 'application/json',-access_control_allow_origin => '*');
	#$json = JSON->new->allow_nonref;
	#my $info_json_text = $json->encode(\@info_stack);
	#print $info_json_text;
	#exit();
	returnJSONData(\@info_stack);
}

## Given a business id it returns the parts of business we are conducting
sub GetBusiness {
	my @cmd = split /\//,$cgi->path_info;
	#print $cgi->p("Sending Menu for ".$cgi->path_info()." Test = ",$cmd[2]);
	if ( $#cmd < 2 ) {
		APIDocumentation($cgi->path_info()." does not contain sufficient data for this call");
		exit();
	}
	Info("Bad ID","ID needs to be numeric",$cmd[2]." is not numeric") if ($cmd[2] !~ /^[+-]?\d+$/);
	my $id = $cmd[2];
	my $cmd = "select ".join(",",@table_ob_bu_fields)."
			from $table_ob
			where id = $id";
	my @bu_db_data = get_from_DB($cmd);
	my @bu_stack;
	my $json = JSON->new->allow_nonref;
	my %db_col_map = ( "Info_JSON" => "Info","Menu_JSON" => "Menu","Reservation_JSON" => "Reserve","Token_JSON" => "Token", "Coupon_JSON" => "Coupons" );
	for ( my $i = 0 ; $i <= $#bu_db_data; $i += ($#table_ob_bu_fields+1) ) {
		my %bu_atom;
		for ( my $j = 0 ; $j <= $#table_ob_bu_fields ; ++$j ) {
			next if ( (! ($bu_db_data[$i+$j])) );
			next if ( !($db_col_map{$table_ob_bu_fields[$j]}) );
			my $json_hash = $json->decode($bu_db_data[$i+$j]);
			if ( ($table_ob_bu_fields[$j] eq "Info_JSON") ) {	
				$json_hash->{"id"} = $id;
			}
			$bu_atom{$db_col_map{$table_ob_bu_fields[$j]}} = $json_hash;
		}
		push(@bu_stack,\%bu_atom);
	}
	
	#print $cgi->header(-type => 'application/json',-access_control_allow_origin => '*');
	#$json = JSON->new->allow_nonref;
	#my $bu_json_text = $json->encode(\@bu_stack);
	#print $bu_json_text;
	#exit();
	returnJSONData(\@bu_stack);
}

## Given a business id it returns the Menu. Mostly used for adjusting Menu
sub GetMenu {
	my @cmd = split /\//,$cgi->path_info;
	#print $cgi->p("Sending Menu for ".$cgi->path_info()." Test = ",$cmd[2]);
	if ( $#cmd < 2 ) {
		APIDocumentation($cgi->path_info()." does not contain sufficient data for this call");
		exit();
	}
	Info("Bad ID","ID needs to be numeric",$cmd[2]." is not numeric") if ($cmd[2] !~ /^[+-]?\d+$/);
	my $id = $cmd[2];
	my $cmd = "select Menu_JSON
			from $table_ob
			where id = $id";
	my @bu_db_data = get_from_DB($cmd);
	
	returnJSONData({"ret"=> -1}) if ( $#bu_db_data < 0 );
	returnJSONData({"Menu" => $bu_db_data[0]});
}

sub returnJSONData {
	my ($load) = @_;
	
	if ( $data{'callback'} ) {
		print $cgi->header(-type => 'application/json',-access_control_allow_origin => '*');
	}
	else {
		print $cgi->header(-type => 'application/javascript',-access_control_allow_origin => '*');
	}
	my $json = JSON->new->allow_nonref;
	my $json_text = $json->encode($load);
	if ( $data{'callback'} ) {
		print $data{'callback'}.'('.$json_text.')';
	}
	else {
		print $json_text;
	}
	exit();
}

sub AddInfo() {
	print $cgi->header(-type => 'application/json',-access_control_allow_origin => '*');
	my $json = JSON->new->allow_nonref;
	my $info_json_hash = $json->pretty->decode(GetPostInput());
	#print "Server Got ".Dumper($info_json_hash);
	my $cmd = "insert into $table_ob(latitude,longitude,Info_JSON)
			values (".$info_json_hash->{"latitude"}.",".$info_json_hash->{"longitude"}.",".$json->pretty->encode(GetPostInput()).")";
	#print $cmd;
	
	execute_on_DB($cmd);
	print get_last_inserted_id();
	exit();
}

sub AddMenu() {
	my @cmd = split /\//,$cgi->path_info;
	APIDocumentation("Restaurant ID missing. Mandatory for ADDMENU API") if ( $#cmd <= 1);
	
	print $cgi->header(-type => 'application/json',-access_control_allow_origin => '*');
	my $json = JSON->new->allow_nonref;
	#print "Post Input = ".GetPostInput();
	my $info_json_hash = $json->pretty->decode(GetPostInput());
	#print "Server Got ".Dumper($info_json_hash);
	my $cmd = "update $table_ob
			set Menu_JSON=".$json->pretty->encode(GetPostInput())."
			where id = ".$cmd[2];
	
	execute_on_DB($cmd);
	#print "Done";
	exit();
}

sub EditInfo() {
}

########################################### Order Related Logics #############################################
sub gen_new_order_id() {
	my $cmd = "insert into $table_order_id_gen values (null)";
	execute_on_DB($cmd);
	$cmd = "select LAST_INSERT_ID()";
	my @ret = get_from_DB($cmd);
	#Info("test", "test","<p>@ret</p>");
	return $ret[0];
}

# Status 
# 1 -> New
# 2 -> update
# 3 -> processed
# 4 -> complete
sub SendNewOrder() {
	#print $cgi->p("Sending Order for ".$cgi->path_info());
	my @cmd = split /\//,$cgi->path_info;
	
	# Find if the restaurant id is present or not
	APIDocumentation("Missing necessary params in ".$cgi->path_info) if ($#cmd < 1);
	
	my $post_input = GetPostInput();
	
	# Order comes in POST data feed
	my $json = JSON->new->allow_nonref;
	my $order_hash;
	eval {
		#Info("Test","Check Val 1","Data = ".$data{'keywords'}." \n<br />Input = $post_input");
		$order_hash = $json->pretty->decode($post_input);
	};
	if ($@) {
		Info("Malformed Input","Details here of Post keys ::$post_input","$@");
	};
	$data{"order"} = $post_input;
	
	APIDocumentation("Missing order in ".$cgi->path_info) if (!$data{"order"});
	
	# Create the Order
	my $order_id = gen_new_order_id();
	my $cmd = "insert into $table_order(`id`,`order`,`from`,`to`,status,total,name,phone)
			values ($order_id
				,".$json->pretty->encode($post_input)."
				,".$cmd[2]."
				,".$cmd[3]."
				,1
				,".$order_hash->{"Grand Total"}."
				,\"".$order_hash->{"Name"}."\"
				,\"".$order_hash->{"Phone"}."\"
				)";
	execute_on_DB($cmd);
	my %ret_hash;
	$ret_hash{"OrderId"} = $order_id;
	#$ret_hash{"CMD"} = $cmd;
	returnJSONData(\%ret_hash);
}

sub UpdateOrder {
	#print $cgi->p("Sending Order for ".$cgi->path_info());
	my @cmd = split /\//,$cgi->path_info;
	
	# Find if the restaurant id is present or not
	APIDocumentation("Missing necessary params in ".$cgi->path_info) if ($#cmd < 1);
	
	my $msg = GetPostInput();
	# Msg comes in POST data feed
	APIDocumentation("Missing order in ".$cgi->path_info) if (!$msg);
	#$msg =~ s/"/\\"/g;
	# Create the Order
	my $order_id = $cmd[2];
	my $cmd = "insert into $table_order(`id`,`order`,status)
			values ($order_id
				,\"".$msg."\"
				,2
				)";
	execute_on_DB($cmd);
	my %ret_hash;
	$ret_hash{"Ret"} = 1;
	#$ret_hash{"CMD"} = $cmd;
	returnJSONData(\%ret_hash);
}

sub GetOrderUpdate() {
	
	#print $cgi->p("Sending Order for ".$cgi->path_info());
	my @cmd = split /\//,$cgi->path_info;
	
	# Find if the restaurant id is present or not
	APIDocumentation("Missing necessary params in ".$cgi->path_info) if ($#cmd < 4);
	
	# Find if the order is present or not
	#LastStage (403, "Missing Order", "Missing Order") if (!$data{"order"});
	
	my $url = "/SHOW/".$cmd[2]."/".$cmd[3]."/".$cmd[4];
	my $params = "inCSV=1";
	$params .= "\&lastupdatetime=".$data{"lastupdatetime"} if ( $data{"lastupdatetime"} );
	
	# Add message to Restaurant Wall
	my ($ret,$contents) = GetWebPage($url."\?".$params);
	
	# Add message to Restaurant Wall
	#my ($ret,$contents) = GetWebPage($url."\?".$params);
	Info("Order Failed","","{status:-1}") if ($ret == -1);
	my @return_fields = qw( id from to lastupdatetime status msg);
	my @msg_parts = split(',',$contents);
	my $ret_msg = "{";
	for ( my $i = 1; $i <= $#msg_parts; $i += ($#return_fields+1)) {
		$ret_msg .= "{";
		for (my $j = 0 ; $j <= $#return_fields ; ++$j) {
			$ret_msg .= $return_fields[$j].":".$msg_parts[$i+$j].","
		}
		chop($ret_msg);
		$ret_msg .= "},";
	}
	chop($ret_msg);
	$ret_msg .= "}";
	returnJSONData($ret_msg);
	exit();
}

sub Main() {
	$ENV{REQUEST_METHOD} = 'GET' unless defined $ENV{REQUEST_METHOD};
	$cgi = CGI->new;
	%data = $cgi->Vars;
	
	#SecurityCheck();
	
	# Handle the commands now
	CMD qr{^$}				=>	\&APIDocumentation;
	CMD qr{^/GETINFO/.*$}			=>	\&GetInfo;
	CMD qr{^/GETBUSINESS/.*$}		=>	\&GetBusiness;
	CMD qr{^/GETMENU/.*$}			=>	\&GetMenu;
	CMD qr{^/ADDINFO/.*$}			=>	\&AddInfo;
	CMD qr{^/ADDMENU/.*$}			=>	\&AddMenu;
	CMD qr{^/EDITINFO/.*$}			=>	\&EditInfo;
	CMD qr{^/SENDNEWORDER/.*$}		=>	\&SendNewOrder;
	CMD qr{^/UPDATEORDER/.*$}		=>	\&UpdateOrder;
	CMD qr{^/GETORDERUPDATE/.*$}		=>	\&GetOrderUpdate;

	# Didn't match any command
	LastStage();
}

Main();

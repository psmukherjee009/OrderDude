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
#use WWW::Curl::Easy;

# Version : 1.0
# Capability : ['Add Info','Add Menu']
# This cgi is used to populate the DB with Business related info

BEGIN {
    my $b__dir = (-d '/home/orderdud/perl'?'/home/orderdud/perl':( getpwuid($>) )[7].'/perl');
    unshift @INC,$b__dir.'5/lib/perl5',$b__dir.'5/lib/perl5/x86_64-linux-thread-multi',map { $b__dir . $_ } @INC;
}

my ($cgi,%cookies,%data,$dbh,$sth);
my %debug_hash;

my $db_data_source			= "dbi:mysql:orderdude:orderdude.db.3401528.hostedresource.com";
my $db_user					= "orderdude";
my $db_password				= "OrderDude2012!";

my $table_ob				= "orderdude.OB_DB";
my @table_ob_fields			= qw(latitude longitude id Info_JSON Menu_JSON Reservation_JSON Token_JSON Coupons_JSON);
my @table_ob_info_fields	= qw(latitude longitude id Info_JSON);
my @table_ob_bu_fields		= qw(id Info_JSON Menu_JSON Reservation_JSON Token_JSON Coupons_JSON);

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


################################################ Utility Functions Starts ##########################################
sub Encrypt {
	my ($data) = @_;

	#use Digest::SHA qw(hmac_sha256_base64);
	#return hmac_sha256_base64($data);
	use Digest::SHA1 qw(sha1_base64);
	return sha1_base64($data);
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
		$cgi->dt("<a href=\"".$cgi->url()."/ADDINFO/\">/ADDINFO/ID/</a>"),
		$cgi->dd("Adds a new restaurant in our DB<br />
			Will create a new ID id ID is not present<br />
			Info comes as JSON input in POST<br />"),
			
		$cgi->dt("<a href=\"".$cgi->url()."/ADDMENU/ID/\">/ADDMENU/ID/</a>"),
		$cgi->dd("Adds Menu to your restaurant identified by ID<br />
			Menu comes as JSON input in POST<br />")
	);
}

################################################ Utility Functions Ends ##########################################

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

sub json2hash {
	my ($post_input) = @_;
	
	my $json = JSON->new->allow_nonref;
	my $hash;
	eval {
		#Info("Test","Check Val 1","Data = ".$data{'keywords'}." \n<br />Input = $post_input");
		$hash = $json->pretty->decode($post_input);
	};
	if ($@) {
		my %ret_hash;
		$ret_hash{'return'} = -1;
		$ret_hash{'error'} = $@;
		returnJSONData(\%ret_hash);
		#Info("Malformed Input","Details here of Post keys ::$post_input","$@");
	};
	return $hash;
}

sub hash2json {
	my ($hash) = @_;
	my $json = JSON->new->allow_nonref;
	return $json->encode($hash);
}

sub hash2prettyjson {
	my ($hash) = @_;
	my $json = JSON->new->allow_nonref;
	return $json->pretty->encode($hash);
}

sub nvp2hash {
	my ($nvp) = @_;
	my @pairs = split('&',$nvp);
	my %hash;
	foreach my $p (@pairs) {
		my ($key,$val) = split('=',$p);
		$hash{$key} = $val;
	}
	return \%hash;
}

sub AddInfo() {
	my @cmd = split /\//,$cgi->path_info;
	#my %debug_hash;
	
	#print $cgi->header(-type => 'application/json',-access_control_allow_origin => '*');
	my $json = JSON->new->allow_nonref;
	my $info_json_hash = $json->decode(GetPostInput());
	#$debug_hash{"password"} = $info_json_hash->{"password"};
	$info_json_hash->{"password"} = Encrypt($info_json_hash->{"password"});
	#$debug_hash{"Enc password"} = $info_json_hash->{"password"};
	#$debug_hash{"Enc password ret"} = Encrypt($debug_hash{"password"});
	#print "Server Got ".Dumper($info_json_hash);
	my $cmd = "";
	if ( $#cmd >= 2 ) {
		$cmd .= "update $table_ob
				set Info_JSON='".$json->encode($info_json_hash)."'
				where id = ".$cmd[2];
	}
	else {
		$cmd = "insert into $table_ob(Info_JSON)
				values ('".$json->encode($info_json_hash)."')";
	}
	
	#print $cmd;
	
	execute_on_DB($cmd);
	my %ret_hash;
	$ret_hash{"return"} = 1;
	if ( $#cmd >= 2 ) {
		$ret_hash{"Id"} = $cmd[2];
	}
	else {
		$ret_hash{"Id"} = get_last_inserted_id();
	}
	#$ret_hash{debug} = \%debug_hash;
	returnJSONData(\%ret_hash);
}


sub Login() {
	my $json = JSON->new->allow_nonref;
	my $login_hash = $json->decode(GetPostInput());
	my %debug_hash;
	
	my $cmd = "select id,Info_JSON
			from $table_ob
			where Info_JSON LIKE '\%".$login_hash->{'login'}."\%'";
	my @info_db_data = get_from_DB($cmd);
	my @info_stack;
	$json = JSON->new->allow_nonref;
	my %ret_hash;
	$login_hash->{"pass"} = Encrypt($login_hash->{"pass"});
	$ret_hash{"return"} = 1;
	$ret_hash{"Id"} = -1;
	$debug_hash{"login"} = $login_hash->{'login'};
	$debug_hash{"pass"} = $login_hash->{"pass"};
	for ( my $i = 0 ; $i <= $#info_db_data; $i += 2 ) {
		my $info_json_hash = $json->decode($info_db_data[$i+1]);
		$debug_hash{"login_".$i} = $info_json_hash->{"phone"};
		$debug_hash{"password_".$i} = $info_json_hash->{"password"};
		if ( ($info_json_hash->{"phone"} eq $login_hash->{"login"}) && ($info_json_hash->{"password"} eq $login_hash->{"pass"}) ) {
			$ret_hash{"Id"} = $info_db_data[$i];
			last;
		}
	}
	$ret_hash{debug} = \%debug_hash;
	returnJSONData(\%ret_hash);
}

sub AddMenu() {
	my @cmd = split /\//,$cgi->path_info;
	APIDocumentation("Restaurant ID missing. Mandatory for ADDMENU API") if ( $#cmd <= 1);
	
	#print $cgi->header(-type => 'application/json',-access_control_allow_origin => '*');
	my $json = JSON->new->allow_nonref;
	#print "Post Input = ".GetPostInput();
	my $info_json_hash = $json->pretty->decode(GetPostInput());
	#print "Server Got ".Dumper($info_json_hash);
	my $cmd = "update $table_ob
			set Menu_JSON=".$json->pretty->encode(GetPostInput())."
			where id = ".$cmd[2];
	
	execute_on_DB($cmd);
	my %ret_hash;
	$ret_hash{"return"} = 1;
	$ret_hash{debug} = \%debug_hash;
	returnJSONData(\%ret_hash);
}

sub Main() {
	$ENV{REQUEST_METHOD} = 'GET' unless defined $ENV{REQUEST_METHOD};
	$cgi = CGI->new;
	%data = $cgi->Vars;
	
	#SecurityCheck();
	
	# Handle the commands now
	CMD qr{^$}				=>	\&APIDocumentation;
	CMD qr{^/ADDINFO/.*$}			=>	\&AddInfo;
	CMD qr{^/ADDMENU/.*$}			=>	\&AddMenu;
	CMD qr{^/LOGIN/.*$}			=>	\&Login;
	
	# Didn't match any command
	LastStage();
}

Main();

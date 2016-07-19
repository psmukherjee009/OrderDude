#!/usr/bin/perl -wT
use strict;
use warnings;
use lib "perlsystemlibs";
use lib "/home/orderdud/perl5";
use lib ".";

use CGI;
use CGI::Carp qw(fatalsToBrowser set_message warningsToBrowser);
use DBI;
use Data::Dumper;
use JSON;
use URI::Escape;

#Version : 1.0
#Capability : ['Show Orders']

BEGIN {
    my $b__dir = (-d '/home/orderdud/perl'?'/home/orderdud/perl':( getpwuid($>) )[7].'/perl');
    unshift @INC,$b__dir.'5/lib/perl5',$b__dir.'5/lib/perl5/x86_64-linux-thread-multi',map { $b__dir . $_ } @INC;
}

my ($cgi,$html,%data,$dbh,$sth);

my $db_data_source	= "dbi:mysql:orderdud_www:orderdude.com";
my $db_user		= "orderdud_www";
my $db_password		= "OrderDude2012";

my $order_board_table	= "orderdud_www.order_board";

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

sub Info($$;$) {
	my ($status, $title, $message) = @_;

	print $cgi->header('text/html');
	print $cgi->start_html($title);
	print $cgi->h1($status);
	print $cgi->p($message);
	print $cgi->end_html;
	exit;
}

sub Usage {
	my ($msg) = @_;

	print $cgi->header('text/html');
	print $cgi->start_html("OrderBoard API");
	print $cgi->h1("Order Board API Documentation");
	print $cgi->p("Error : $msg") if ($msg);
	print $cgi->p("Here is a list of what you can do:");
	print $cgi->dl(
		$cgi->dt("<a href=\"".$cgi->url()."/\">GET API Documentation</a>"),
		$cgi->dd("Shows API documentation"),
		$cgi->dt("<a href=\"".$cgi->url()."/SHOW/to/id\">Shows order to the receiver after that Order Id</a>"),
		$cgi->dd("Shows orders for this receiver after that order id. <br />
					id is optional<br />
					returns JSON formatted response"),
		$cgi->dt("<a href=\"".$cgi->url()."/PAYSTATUS/to/timefrom\">Shows any order which got paid to the receiver after that timeperiod</a>"),
		$cgi->dd("Shows orders which got paid for this receiver after that time. <br />
					time is optional<br />
					returns JSON formatted response")
	);
	print $cgi->end_html();
	exit();
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

sub CMD($$) {
	my ($path, $code) = @_;
	return unless $cgi->path_info =~ $path;
	$code->();
	exit;
}

sub ShowOrders {
	my @cmd = split /\//,$cgi->path_info;
	shift @cmd;
	$data{"to"} = $cmd[1] if (!($data{"to"}));
	Usage("Need Receiver Id to show") if ( !($data{"to"}) );
	if (!($data{"id"})) {
		$data{"id"} = int($cmd[2]) if ( $#cmd > 1 );
	}
	my $cmd = "select `id`,`order`,`from`,`to`,status,create_time,total,name,phone,payment
			from $order_board_table";
	$cmd .= " where `to` = ".$data{"to"};
	$cmd .= " and id > ".$data{"id"} if ($data{"id"});
	$cmd .= " order by `id` desc";
	my @bu_db_data = get_from_DB($cmd);
	my @orders;
	for ( my $i = 0 ; $i <= $#bu_db_data ; $i += 10 ) {
		my %msg;
		$msg{'id'} = $bu_db_data[$i];
		$msg{'order'} = $bu_db_data[$i+1];
		$msg{'from'} = $bu_db_data[$i+2];
		$msg{'to'} = $bu_db_data[$i+3];
		$msg{'status'} = $bu_db_data[$i+4];
		$msg{'create_time'} = $bu_db_data[$i+5];
		$msg{'total'} = $bu_db_data[$i+6];
		$msg{'name'} = $bu_db_data[$i+7];
		$msg{'phone'} = $bu_db_data[$i+8];
		$msg{'payment'} = $bu_db_data[$i+9];
		push(@orders,\%msg);
	}
	my %ret_hash;
	if ( $#bu_db_data >= 0 ) {
		$ret_hash{'max_id'} = $bu_db_data[0];
	}
	else {
		$ret_hash{'max_id'} = $data{"id"};
	}
	
	$ret_hash{'orders'} = \@orders;
	returnJSONData(\%ret_hash);
}

sub GetPayStatus {
	my @cmd = split /\//,$cgi->path_info;
	shift @cmd;
	$data{"to"} = $cmd[1] if (!($data{"to"}));
	Usage("Need Receiver Id to show") if ( !($data{"to"}) );
	if (!($data{"LastTimeCheck"})) {
		$data{"LastTimeCheck"} = $cmd[2] if ( $#cmd > 1 );
	}
	my $cmd = "select `id`,payment,NOW()
			from $order_board_table";
	$cmd .= " where `to` = ".$data{"to"};
	$cmd .= " and payment != 'Due'";
	$cmd .= " and update_time > '".$data{"LastTimeCheck"}."'" if ($data{"LastTimeCheck"});
	$cmd .= " order by `id` desc";
	my @bu_db_data = get_from_DB($cmd);
	my @orders;
	for ( my $i = 0 ; $i <= $#bu_db_data ; $i += 3 ) {
		my %msg;
		$msg{'id'} = $bu_db_data[$i];
		$msg{'payment'} = $bu_db_data[$i+1];
		push(@orders,\%msg);
	}
	my %ret_hash;
	if ( $#bu_db_data >= 0 ) {
		#$ret_hash{'PrevLastTimeCheck'} = $data{'LastTimeCheck'};
		$ret_hash{'LastTimeCheck'} = $bu_db_data[2];
	}
	else {
		$ret_hash{'LastTimeCheck'} = $data{'LastTimeCheck'};
	}
	#$ret_hash{'cmd'} = $cmd;
	#$ret_hash{'input'} = \@cmd;
	$ret_hash{'payments'} = \@orders;
	
	returnJSONData(\%ret_hash);
}

sub Main () {
	$ENV{REQUEST_METHOD} = 'GET' unless defined $ENV{REQUEST_METHOD};
	$cgi = CGI->new;
	%data = $cgi->Vars;
	delete @ENV{qw(IFS CD PATH ENV BASH_ENV)}; 

	# Handle the commands now
	CMD qr{^$}					=>	\&Usage;
	CMD qr{^/SHOW/.*$}				=>	\&ShowOrders;
	CMD qr{^/PAYSTATUS/.*$}				=>	\&GetPayStatus;
	
	# Didn't match any command
	LastStage();
}

Main();
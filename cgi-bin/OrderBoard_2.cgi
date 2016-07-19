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

#Version : 2.0
#Capability : ['Utility Lib Inclusion']

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
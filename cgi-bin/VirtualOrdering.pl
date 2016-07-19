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

BEGIN {
    my $b__dir = (-d '/home/orderdud/perl'?'/home/orderdud/perl':( getpwuid($>) )[7].'/perl');
    unshift @INC,$b__dir.'5/lib/perl5',$b__dir.'5/lib/perl5/x86_64-linux-thread-multi',map { $b__dir . $_ } @INC;
}

my ($cgi,%cookies,%data,$dbh,$sth);

my $db_data_source			= "orderdude.com";
my $db_user				= "orderdud_www";
my $db_password				= "OrderDude2012";
my $table_info				= "orderdud_www.Res_Info"
my @table_info_fields 			= qw (name logo bkcolor phone id address latitude longitude tax email fax);
my @table_info_edit_fields 		= qw (name logo bkcolor phone address latitude longitude tax email fax);

sub Info($$;$) {
	my ($title, $status, $message) = @_;

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
		$cgi->dt("<a href=\"".$cgi->url()."GET /GETINFO/LATITUDE/LONGITUDE/RADIUS/\">GET /GETINFO/LATITUDE/LONGITUDE/RADIUS/</a>"),
		$cgi->dd("Returns the nearby restaurant information within that radius.<br />
			Following fields are returned per restaurant<br />
			".join("<br />",@table_info_fields)."),
		
		$cgi->dt("<a href=\"".$cgi->url()."GET /ADDINFO/\">GET /ADDINFO/</a>"),
		$cgi->dd("Adds a new restaurant in our DB<br />
			Following are acceptable fields<br />
			".join("<br />",@table_info_edit_fields)."),
		
		$cgi->dt("<a href=\"".$cgi->url()."GET /EDITINFO/\">GET /EDITINFO/</a>"),
		$cgi->dd("Returns the nearby restaurant information within that radius<br />
			Following fields are needed to update restaurant info<br />
			Field 'id' cannot be edited and is needed to be present to find the Restaurant<br />
			".join("<br />",map { "e_".$_ } @table_info_fields).")
	);
}



#  `name` varchar(256) COLLATE latin1_general_ci NOT NULL,
#  `logo` varchar(256) COLLATE latin1_general_ci NOT NULL,
#  `bkcolor` int(11) DEFAULT NULL,
#  `phone` varchar(15) COLLATE latin1_general_ci NOT NULL,
#  `id` bigint(20) NOT NULL AUTO_INCREMENT,
#  `address` varchar(1048) COLLATE latin1_general_ci NOT NULL,
#  `latitude` double NOT NULL,
#  `longitude` double NOT NULL,
#  `tax` float NOT NULL,
#  `email` varchar(256) COLLATE latin1_general_ci NOT NULL,
#  `fax` varchar(15) COLLATE latin1_general_ci NOT NULL,



sub GetInfo() {
	print $cgi->header('text/html');
	
	my @cmd = split /\//,$cgi->path_info;
	#print $cgi->p("Sending Menu for ".$cgi->path_info()." Test = ",$cmd[2]);
	if ( $#cmd < 4 ) {
		APIDocumentation($cgi->path_info()." does not contain sufficient data for this call");
		exit();
	}
	my $cmd = "select ".join(",",@table_info_fields)."
			from $table_info";
	my $db = new DBBase(DBInfo::ResDB());
	my @info = $db->get_from_DB($cmd);
	my @info_stack;
	for ( my $i = 0 ; $i <= $#ret; $i += $#table_info_fields ) {
		my %info_atom;
		for ( my $j = 0 ; $j <= $#table_info_fields ; ++$j ) {
			$info_atom{$table_info_fields[$j]} = $info[$i+$j];
		}
		push(@info_stack,\%info_atom);
	}
	
	print $cgi->header('application/json');
	my $json = JSON->new->allow_nonref;
	my $info_json_text = $json->pretty->encode( \@info_stack );
	print $info_json_text;
	exit();
}

sub AddInfo() {
}

sub EditInfo() {
}

sub Main() {
	$ENV{REQUEST_METHOD} = 'GET' unless defined $ENV{REQUEST_METHOD};
	$cgi = CGI->new;
	%data = $cgi->Vars;

	#SecurityCheck();
	
	# Handle the commands now
	GET qr{^$}				=>	\&APIDocumentation;
	GET qr{^/GETINFO/.*$}			=>	\&GetInfo;
	GET qr{^/ADDINFO/.*$}			=>	\&AddInfo;
	GET qr{^/EDITINFO/.*$}			=>	\&EditInfo;

	# Didn't match any command
	LastStage();
}

Main();

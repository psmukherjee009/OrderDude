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

my ($cgi,$html,%data);

sub Usage {
	my ($msg) = @_;

	print $cgi->header('text/html');
	print $cgi->start_html("Utility API");
	print $cgi->h1("Utility API Documentation");
	print $cgi->p("Error : $msg") if ($msg);
	print $cgi->p("Here is a list of what you can do:");
	print $cgi->dl(
		$cgi->dt("<a href=\"".$cgi->url()."/\">GET API Documentation</a>"),
		$cgi->dd("Shows API documentation"),
		$cgi->dt("<a href=\"".$cgi->url()."/GETQRCODE/\">Get QR Code</a>"),
		$cgi->dd("Returns the image of QR Code. <br />
					expects JSON input of the QRCode in the field content<br />
					returns JSON formatted response"),
	);
	print $cgi->end_html();
	exit();
}

sub GetQRCode {
}

sub Main () {
	$ENV{REQUEST_METHOD} = 'GET' unless defined $ENV{REQUEST_METHOD};
	$cgi = CGI->new;
	%data = $cgi->Vars;
	delete @ENV{qw(IFS CD PATH ENV BASH_ENV)}; 

	# Handle the commands now
	CMD qr{^$}					=>	\&Usage;
	CMD qr{^/SHOW/.*$}				=>	\&GetQRCode;
	
	# Didn't match any command
	LastStage();
}

Main();


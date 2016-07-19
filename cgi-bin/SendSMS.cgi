#!/usr/bin/perl -wT
use strict;
use warnings;
use lib "perlsystemlibs";
use lib "/home/orderdud/perl5";

use CGI;
use CGI::Carp qw(fatalsToBrowser set_message warningsToBrowser);
use DBI;
use Data::Dumper;
use Mail::Sendmail;
use Net::SMTP::SSL;

my ($cgi,$html,%data);

my %us_carriers = (
	"ATT"				=>		"\@txt.att.net",
	"SPRINT"			=>		"\@messaging.sprintpcs.com",
	"TMOBILE"			=>		"\@tmomail.net",
	"VERIZON"			=>		"\@vtext.com"
);

my %country = (
	"US"	=>	\%us_carriers
);

sub SendSMS {
	my ($to,$message) = @_;
	
	$html .= $cgi->p("Sending $message to $to");
	
	my %mail = (
		From => 'orders@orderdude.com',
		#Replyto => 'orders@orderdude.com',
		To => $to,
		#Subject => "Testing SMS",
		Message => "$message "
	);

	#Server Info
	$mail{Smtp} = Net::SMTP::SSL->new("srv45.hosting24.com", Port=> 465, Debug=>1);
	#$mail{smtp} = 'srv45.hosting24.com';
	$mail{auth} = {
                        user=>'orders+orderdude.com',
                        password => "OrderDude2012",
			#method => "LOGIN PLAIN",
                        #method => "DIGEST-MD5",
                        required => 1
                    };
	$mail{port} = 465;
	#$html .= $cgi->p("Sending Email ".::Dumper(%mail));
	
    my $ret = Mail::Sendmail::sendmail(%mail);

	if (!$ret) {
		$html .= $cgi->p("Send Email Failed $Mail::Sendmail::error");
		$html .= $cgi->p("SMS send failed");
	}
	else {
		$html .= $cgi->p("SMS $message sent to $to");
	}
}

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

	$html .= $cgi->p("Error : $msg") if ($msg);
	$html .= $cgi->h2("Usage: SendSMS.cgi/COUNTRY/CARRIER/PHONENUMBER/?msg=Short message here");
	$html .= $cgi->h3("Supported Countries and Carrier :");
	foreach my $c (keys %country) {
		$html .= "<p>";
		$html .= $cgi->h3($c);
		$html .= $cgi->h4("Supported Carriers in $c");
		$html .= "<ul>";
		my %carriers = %{$country{$c}};
		foreach my $cat (keys %carriers) {
			$html .= $cgi->li($cat);
		}
		$html .= "</ul>";
		$html .= "</p>";
	}
}

sub TestForm() {
	$html .= $cgi->start_form(-action => "", -method => "POST");
	$html .= "<table>";
	$html .= "<tr><td>Phone :</td><td colspan=\"2\">".$cgi->textfield(-name => "PHONENUMBER",
							-value => $data{"PHONENUMBER"},
							-size => 20,
							-maxlength => 256)."</td></tr>";
	$html .= "<tr><td>Carrier :</td><td colspan=\"2\">".$cgi->popup_menu(-name => "CARRIER",
							-values => [keys %{$country{$data{"COUNTRY"}}}],
							-default => "ATT" )
							."</td></tr>";
	$html .= "<tr><td>Message :</td><td colspan=\"2\">".$cgi->textarea(-name => "msg",
							-value => $data{"MSG"},
							-rows => 15,
							-cols => 50)."</td></tr>";
	$html .= "<tr><td></td><td colspan=\"2\">".$cgi->submit(-name => "choice" , -value => "Send")."</td></tr>";
	$html .= "</table>";
	$html .= $cgi->end_form();
}

sub Main () {
	#$ENV{REQUEST_METHOD} = 'GET' unless defined $ENV{REQUEST_METHOD};
	$cgi = CGI->new;
	%data = $cgi->Vars;
	$data{"COUNTRY"} = "US";
	delete @ENV{qw(IFS CD PATH ENV BASH_ENV)}; 
	$html = "";
	my @cmd = split /\//,$cgi->path_info;
	shift @cmd;
	$cmd[0] = $data{"COUNTRY"} if ($data{"COUNTRY"});
	$cmd[1] = $data{"CARRIER"} if ($data{"CARRIER"});
	$cmd[2] = $data{"PHONENUMBER"} if ($data{"PHONENUMBER"});
	#$html .= $cgi->p("CMDS $#cmd @cmd");
	if ($#cmd < 2) {
		TestForm();
		return Usage();
	}
	return Usage("$cmd[0] country not supported") if (!($country{$cmd[0]}));
	return Usage("No Carrier $cmd[1] in $cmd[0]") if (!($country{$cmd[0]}->{$cmd[1]}));
	return Usage("Phone Number length needs to be 10 digits") if (length($cmd[2]) != 10);
	return Usage("Phone Number needs to be digits only") if ( int($cmd[2]) < 100 ); # 100 is just an arbiturary number to make sure it is totally digits.
	return Usage("No message to SMS") if (!$data{"msg"});
	my $phone_num = $cmd[2];
	my $email = $country{$cmd[0]}->{$cmd[1]};
	my $msg = $data{"msg"};
	$html .= "SendSMS $phone_num $email $msg";
	SendSMS($phone_num.$email,$data{"msg"});
}

Main();
print $cgi->header('text/html');
print $cgi->start_html("SendSMS");
print $html;
print $cgi->end_html();

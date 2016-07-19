#!/usr/bin/perl -w

use Getopt::Long;
use IO::File;
use MIME::QuotedPrint;
use MIME::Base64;
use Mail::Sendmail;
use strict;
use warnings;

my $cc;
my $bcc;

if ( $#ARGV < 3 ) {
	print "Usage :: $0 <from> <to> <subject> <message> <file attachment list>\n";
	exit();
}
GetOptions( 'cc=s' => \$cc, 'bcc=s' => \$bcc, );

my( $from, $to, $subject, $msgbody_file, $attachment_file ) = @ARGV;

my $msgbody = $msgbody_file;
my $msgbodytype = "text/plain";
if ( -e $msgbody ) {
	$msgbody = read_file( $msgbody_file );
	$msgbodytype = "text/html";
}

#my $attachment_data = undef;
#if ( $#ARGV > 3 ) {
#	$attachment_data = encode_base64( read_file( $attachment_file, 1 ) );
#}

my %mail = (
    To   => $to,
    From => $from,
    Subject => $subject
);

$mail{Cc} = $cc if $cc;
$mail{Bcc} = $bcc if $bcc;

my $boundary = "====" . time . "====";

$mail{'content-type'} = qq(multipart/mixed; boundary="$boundary");

$boundary = '--'.$boundary;

$mail{body} = <<END_OF_BODY;
$boundary
Content-Type: $msgbodytype; charset="iso-8859-1"
Content-Transfer-Encoding: quoted-printable

$msgbody
END_OF_BODY
$mail{body} = "";
for (my $i = 4; $i <= $#ARGV ; ++$i) {
	$mail{body} .= attach_file($boundary,$ARGV[$i]);
}
$mail{body} .= "$boundary--";

sendmail(%mail) or die $Mail::Sendmail::error;

print "Sendmail Log says:\n$Mail::Sendmail::log\n";
sub attach_file {
	my ($boundary,$attachment_file) = @_;

	if ( ! -e $attachment_file) {
		return;
	}
	my $attachment_data = encode_base64( read_file( $attachment_file, 1 ) );
	my $body = <<END_OF_BODY;
$boundary
Content-Type: application/octet-stream; name="$attachment_file"
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="$attachment_file"

$attachment_data
END_OF_BODY
}

sub read_file {
    my( $filename, $binmode ) = @_;
    my $fh = new IO::File;
    $fh->open("< $filename")
        or die "Error opening $filename for reading - $!\n";
    $fh->binmode if $binmode;
    local $/;
    <$fh>
}

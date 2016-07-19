#!/usr/bin/perl -wT
use strict;
use warnings;
use lib "perlsystemlibs";
use lib "/home/orderdud/perl5";
use lib ".";

use HTML::QRCode;
use CGI;
use CGI::Carp qw(fatalsToBrowser set_message warningsToBrowser);
BEGIN {
    my $b__dir = (-d '/home/orderdud/perl'?'/home/orderdud/perl':( getpwuid($>) )[7].'/perl');
    unshift @INC,$b__dir.'5/lib/perl5',$b__dir.'5/lib/perl5/x86_64-linux-thread-multi',map { $b__dir . $_ } @INC;
}

  my $q = CGI->new;
  my $text = $q->param('text') || 'http://example.com/';
  my $qrcode = HTML::QRCode->new->plot($text);
  print $q->header;
  print <<"HTML";
  <html>
  <head></head>
  <body>
  $qrcode
  </body>
  </html>
  HTML
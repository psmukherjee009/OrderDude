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
use MIME::Base64;
use POSIX qw(strftime);
#use Email::MIME;

#use WWW::Curl::Easy;

#Version : 7.0
#Capability : ['Personalization','Fax Ordering']

BEGIN {
    my $b__dir = (-d '/home/orderdud/perl'?'/home/orderdud/perl':( getpwuid($>) )[7].'/perl');
    unshift @INC,$b__dir.'5/lib/perl5',$b__dir.'5/lib/perl5/x86_64-linux-thread-multi',map { $b__dir . $_ } @INC;
}

my ($cgi,%cookies,%data,$dbh,$sth);
my %debug_hash;
my %sms_email_map = ( 
			'att'		=>	'txt.att.net',
			'verizon'	=>	'vtext.com',
			'sprint'	=>	'messaging.sprintpcs.com',
			'tmobile'	=>	'tmomail.net'
);

my $db_data_source			= "dbi:mysql:orderdude:orderdude.db.3401528.hostedresource.com";
my $db_user					= "orderdude";
my $db_password				= "OrderDude2012!";

my $table_ob				= "orderdude.OB_DB";
my @table_ob_fields			= qw(latitude longitude id Info_JSON Menu_JSON Reservation_JSON Token_JSON Coupons_JSON);
my @table_ob_info_fields	= qw(latitude longitude id Info_JSON);
my @table_ob_bu_fields		= qw(id Info_JSON Menu_JSON Reservation_JSON Token_JSON Coupons_JSON);

my $table_order				= "orderdude.order_board";
my $table_order_id_gen		= "orderdude.order_id_generator";

my $wsite				= "http://www.orderdude.com/VirtualOrdering.html";

my $CURL				= "/usr/bin/curl";
#my $MAIL				= "/bin/mail";
my $MAIL				= "/usr/sbin/sendmail.real";
my $FROM				= "orders\@orderdude.com";

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
		$cgi->dt("<a href=\"".$cgi->url()."/GETINFO/LATITUDE/LONGITUDE/RADIUS/\">GETINFO/LATITUDE/LONGITUDE/RADIUS/</a>"),
		$cgi->dd("Returns the nearby restaurant information within that radius.<br />
			"),
			
		$cgi->dt("<a href=\"".$cgi->url()."/GETBUSINESS/ID/\">GETBUSINESS/ID/</a>"),
		$cgi->dd("Returns business details<br />
			Business details include Restaurant Menu, Reservation, Token, Coupons, etc<br />"),
		$cgi->dt("<a href=\"".$cgi->url()."/GETMENU/ID/\">GETMENU/ID/</a>"),
		$cgi->dd("Returns Restaurant Menu details<br />
			Restaurant Menu<br />"),	
		$cgi->dt("<a href=\"".$cgi->url()."/SENDNEWORDER/SENDER_ID/RECEIVER_ID/\?order=Order Details\">/SENDNEWORDER/SENDER_ID/RECEIVER_ID/\?order=the_order</a>"),
		$cgi->dd("Accepts the order form and return OrderNumber if order number is not present"),
			
		$cgi->dt("<a href=\"".$cgi->url()."/UPDATEORDER/ORDER_ID\?order=Order Details\">/UPDATEORDER/ORDER_ID/\?order=the_order</a>"),
		$cgi->dd("Appends msg to existing order"),
			
		$cgi->dt("<a href=\"".$cgi->url()."/GETORDERUPDATE/SENDER_ID/RECEIVER_ID/ORDERID/\?lastupdatetime=time\">/GETORDERUPDATE/SENDER_ID/RECEIVER_ID/ORDERID/\?lastupdatetime=time</a>"),
		$cgi->dd("Get updates of the order id after lastupdatetime"),
		
		$cgi->dt("<a href=\"".$cgi->url()."/COMPLETEORDER/ORDER_ID?pid=Payment_id\">/COMPLETEORDER/ORDER_ID?pid=Payment_id</a>"),
		$cgi->dd("If pid is sent then it verifies the pid against the orderid and completes the payment as paid or transmits as due")
		
	);
}

################################################ Utility Functions Ends ##########################################

################################################ SMS Functions Starts ############################################

sub stripPhone2Numbers {
	my ($phone) = @_;
	
	# Take out -, (, ), and spaces
	$phone =~ s/-//g;
	$phone =~ s/\(//g;
	$phone =~ s/\)//g;
	$phone =~ s/ //g;
	$phone =~ s/\t//g;
	$phone =~ s/\.//g;
	return $phone;
	
}

sub carrier2SMSemail {
	my ($carrier) = @_;

	return $sms_email_map{$carrier};
}

sub createOrderDisplay {
    my ($order_hash) = @_; 
    
    my $text = ""; 
    #print "Order Hash 2 = ".Dumper($order_hash)."\n";
    while (my ($key,$val) = each (%{$order_hash})) {
        $text .= "$key\n";
        foreach my $item (@{$val}) {
            my $item_text = ""; 
            my ($name,$quantity,$price,@personalization,@personalized_price);
            $name = ""; 
            while (my ($item_part,$val) = (each (%{$item}))) {
                if ( $item_part eq 'price' ) { 
                    $price = $val;
                }
				elsif ( $item_part eq 'personalized_order' ) { 
                    @personalization = @$val;
                }
				elsif ( $item_part eq 'personalized_additional_order_amount' ) { 
                    @personalized_price = @$val;
                }
                elsif ( $item_part eq 'type' ) { 
                    $name .= "[ $val ]";
                }   
                else {
                    $name = $item_part.$name;
                    $quantity = $val;
                }   
            }   
            $item_text = "\t$name\tx $quantity\t$price\n";
			for ( my $i = 0 ; $i <= $#personalization; ++$i ) {
				$item_text .= "Personalization #".($i+1);
				if ( $personalized_price[$i] ) {
					$item_text .= "\t\$".$personalized_price[$i]."\n";
				}
				else {
					$item_text .= "\tNONE\n";
				}
				if ( !$personalization[$i] ) {
					next;
				}
				my %p_obj = %{$personalization[$i]};
				foreach ( keys %p_obj ) {
					$item_text .= $_.":";
					if ( ref($p_obj{$_}) eq "ARRAY" ) {# Array of elements through multi select
						$item_text .= join(" , ",@{$p_obj{$_}});
					}
					else { 
						$item_text .= $p_obj{$_};
					}
					$item_text .= "\n";
				}
			}
            $text .= $item_text;
        }   
    }
    return $text;
}

sub viewableOrder {
	my ($order_id,$hash) = @_;
	
	
	# Create the Order display first
	my $txt = createOrderDisplay($hash->{'order'});
	$txt .= "----------------\n";
	$txt .= "Total\t\t".($hash->{'Total'})."\n";
	$txt .= "----------------\n";
	$txt .= "Tax\t\t".($hash->{'Tax'})."\n";
	#$txt .= "----------------\n";
	#$txt .= "Total after Tax\t\t\t".($hash->{'Total after Tax'})."\n";
	#$txt .= "----------------\n";
	$txt .= "Tips\t\t".($hash->{'Tip'})."\n";
	$txt .= "----------------\n";
	$txt .= "Grand Total\t".($hash->{'Grand Total'})."\n";
	$txt .= "----------------\n";
	$txt .= "Name = ".$hash->{'Name'}."\n";
	$txt .= "Phone = ".$hash->{'Phone'}."\n";
	$txt .= "Payment = ".$hash->{'Payment'}."\n";
	$txt .= "Order # OD-$order_id";
	return $txt;
}

sub ExecuteCommand {
	my ($cmd) = @_;
	
	$cmd =~ s/\n/#NEWLINW#/g;
	$cmd =~ s/\t/    /g;
	$cmd =~ s/\$/\\\$/g;
	#Info("Test","Test","$cmd");
	my $path = $ENV{"PATH"};
	$ENV{"PATH"} = "";
	# A blanket untaint 
	if ( my @captures = $cmd =~ m/(.*)/ ) {
		$cmd = $1;
	}
	$cmd =~ s/#NEWLINW#/\n/g;
	my $ret_msg = `$cmd`;
	#Info("Test","Test","$cmd");
	$ENV{"PATH"} = $path;
	return $ret_msg;
}

sub ReadFile {
	my ($file) = @_;

	my @output;

	open RD_HDL,"<$file" || die "Unable to open $file\n";
	push(@output,$_) while(<RD_HDL>);
	close RD_HDL;
	$debug_hash{"msg"} .= " Read $file of $#output lines";
	return @output;
}

sub processEmailAttachment {
	my ($filename,$boundary) = @_;
	
	my $text = "$boundary\n";
    $text .= "Content-Transfer-Encoding: base64\n";
    $text .= "Content-Type: application/pdf\n";
    $text .= "Content-Disposition: attachment; filename=$filename\n\n";
	$text .= MIME::Base64::encode(join(q{}, ReadFile($filename)));
	$text .= "\n";
    
	return $text;
}

sub SendEmail {
# Attachment doesn't work
	my ($to,$subject,$body,$filename) = @_;
	
	my $now_string = strftime "%Y%M%d%H%M%S",localtime;
    
	my $text = "";
	$text .= "From: $FROM\n";
	$text .= "To: $to\n";
	$text .= "Subject: $subject\n" if ($subject);
	
	my $boundary="---====_OD_====_$now_string\_====";
	if ($filename) {
		$text .= "Mime-Version: 1.0\n";
		$text .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\n";
		$text .= "\n";
		$text .= "$boundary\n";
		$text .= "Content-Type: text/plain; charset=\"US-ASCII\"\n";
		$text .= "Content-Transfer-Encoding: 7bit\n";
		$text .= "Content-Disposition: inline\n";
		$text .= "\n";
	}
    $text .= "$body attached $filename\n" if ($body);
    $text .= "\n";
    if ($filename) {
		$debug_hash{"msg"} = "Starting to load $filename";
		$text .= processEmailAttachment($filename,$boundary);
	}
	$text .= "${boundary}--\n";
    my $cmd = "echo \"$text\" | $MAIL -t -oi";
	return (ExecuteCommand($cmd),$cmd);
}

sub SendSMS {
	my ($ph,$email_base,$sub,$msg,$is_live) = @_;
	
	#my $cmd = "echo \"$msg\" \| $MAIL -s \"$sub\" $ph\@$email_base";
	#my $cmd = "echo \"\n$msg\" \| $MAIL -f orders\@orderdude.com $ph\@$email_base";
	#ExecuteCommand($cmd);
	if ( ! $is_live ) { # Not live then send it to my phone
		$ph = "4083097328";
	}
	SendEmail("$ph\@$email_base",undef,"\n$msg",undef);
}

sub createpdffile {
	my ($order_id) = @_;
	
	my $filename = "../pdforders/$order_id\.pdf";
	if (! -e $filename ) {
		#my $cmd = "./pdfcrowd.sh http://www.orderdude.com/cgi-perl/VirtualOrdering.cgi/CHIPOTLEFAXORDER/$order_id\/ > $filename";
		my $cmd = "./wkhtmltopdf-i386 -q -O landscape http://www.orderdude.com/cgi-perl/VirtualOrdering.cgi/CHIPOTLEFAXORDER2/$order_id\/  $filename";
		my $ret_msg = ExecuteCommand($cmd);
		$debug_hash{"CMD"} = $cmd;
		$debug_hash{"RETURN"} = ( $? == -1 ) ? "Failed" : "Success";
		$debug_hash{"RETURN_MSG"} = $ret_msg;
		$debug_hash{"RETURN_NUM"} = $?;
	}
	else {
		$debug_hash{"RETURN_MSG"} = "File Already Exits";
	}
	return $filename;
}

sub createhtmlfile {
	my ($order_id) = @_;
	
	my $filename = "../orders/$order_id\.html";
	if (! -e $filename ) {
		my $cmd = "$CURL http://www.orderdude.com/cgi-perl/VirtualOrdering.cgi/CHIPOTLEFAXORDER/$order_id\/ > $filename";
		my $ret_msg = ExecuteCommand($cmd);
		$debug_hash{"CMD"} = $cmd;
		$debug_hash{"RETURN"} = ( $? == -1 ) ? "Failed" : "Success";
		$debug_hash{"RETURN_MSG"} = $ret_msg;
		$debug_hash{"RETURN_NUM"} = $?;
	}
	else {
		$debug_hash{"RETURN_MSG"} = "File Already Exits";
	}
	return $filename;
}

# SendFax $order_id,$fax#
sub SendFax {
	my ($order_id,$fax,$is_live) = @_;
	
	# Create the order file
	#my $filename = createhtmlfile($order_id);
	my $filename = createpdffile($order_id);
		
	# Send the fax now
	my $ret_msg2 = "";
	my $fax_email = "1$fax\@myfax.com";
	if ( !$is_live ) {
		$fax_email = "$fax\@parthamukherjee.com";
	}
	#my $cmd2 = "./SendEmail.sh $fax_email '' '' $filename";
	my $cmd2 = "./SendEmail.pl orders\@orderdude.com -cc partha\@parthamukherjee.com -bcc vinaykaggarwal\@gmail.com '$fax_email' '' '' $filename";
	$ret_msg2 .= ExecuteCommand($cmd2);
	$debug_hash{"CMD2"} = $cmd2;
	$debug_hash{"RETURN_NUM2"} = $?;
	$debug_hash{"FAX_NUM_DEST"} = $fax;
	$debug_hash{"FAX_EMAIL"} = $fax_email;
	$debug_hash{"RETURN_MSG2"} = $ret_msg2;
	$debug_hash{"RETURN2"} = ( $? == -1 ) ? "Failed" : "Success";
}

################################################ SMS Functions Ends ##############################################
sub GetInfo() {
	my @cmd = split /\//,$cgi->path_info;
	#print $cgi->p("Sending Menu for ".$cgi->path_info()." Test = ",$cmd[2]);
	if ( $#cmd < 3 ) {
		APIDocumentation($cgi->path_info()." does not contain sufficient data for this call");
		exit();
	}
	my $e_r = 3959; # Earth Radius 3959 miles or 6371 kms
	my $lat = $cmd[2];
	my $long = $cmd[3];
	my $pi = 3.1415926535897932384626433832795;
	my $radius = 50;
	$radius = $cmd[4] if ( $#cmd > 3 );
	my $dis_factor = ($e_r*$pi)/180;
	my $search_radius_in_deg = $radius/$dis_factor;
	my $cmd = "select Info_JSON,is_live,id,ROUND($dis_factor*sqrt(pow(latitude-$lat,2)+pow((longitude-$long)*cos(((latitude+$lat)/2)),2)),2) as distance
			from $table_ob";
	if ( $lat != -99999 ) {
		$cmd .= " where latitude != 0 and (pow(latitude-$lat,2)+pow((longitude-$long)*cos(((latitude+$lat)/2)),2)) < pow($search_radius_in_deg,2)";
		$cmd .= " order by (pow(latitude-$lat,2)+pow((longitude-$long)*cos(((latitude+$lat)/2)),2))"
	}
	my @info_db_data = get_from_DB($cmd);
	my @info_stack;
	my $json = JSON->new->allow_nonref;
	for ( my $i = 0 ; $i <= $#info_db_data; $i += 4 ) {
		my %info_atom;
		#my $info_json_hash = $json->pretty->decode($info_db_data[$i]);
		my $info_json_hash = $json->decode($info_db_data[$i]);
		#Info("DeNormalizing","DeNormalizing","Denormalized to ".Dumper($info_json_hash));
		
		$info_json_hash->{"is_live"} = $info_db_data[$i+1];
		$info_json_hash->{"id"} = $info_db_data[$i+2];
		$info_json_hash->{"distance"} = $info_db_data[$i+3];
		
		$info_atom{"Info"} = $info_json_hash;
		#Info("DeNormalizing","DeNormalizing","Denormalized to ".$info_db_data[$i]) if ( ($table_ob_info_fields[$j] eq "Info_JSON") || ($table_ob_info_fields[$j] eq "Menu_JSON") );
		push(@info_stack,\%info_atom);
	}
	
	#print $cgi->header(-type => 'application/json',-access_control_allow_origin => '*');
	#$json = JSON->new->allow_nonref;
	#my $info_json_text = $json->encode(\@info_stack);
	#print $info_json_text;
	#exit();
	returnJSONData(\@info_stack);
}

## Creates the Chipotle Fax Order and sends the fax
sub print_chipotle_fax_outline2 {
	my ($id) = @_;
	
	my $address = "1 Fountain Square Plaza,Cincinnati, OH 45202";
	my $phone = "513.579.9900";
	my $fax = "513.579.0097";
	
	my $cmd = "select Info_JSON
			from $table_ob
			where id = $id";
	my @data = get_from_DB($cmd);
	if ( $#data >= 0 ) {
		my $info_hash = json2hash($data[0]);
		$address = $info_hash->{"address"};
		$phone = $info_hash->{"phone"};
		$fax = $info_hash->{"fax"};
	}
	my $address_line1 = (split(',',$address))[0];
	
print<<EOF;
Content-type: text/html

<html>
<head><meta http-equiv=Content-Type content="text/html; charset=UTF-8">
<style type="text/css">
<!--
span.cls_026{font-family:Arial,serif;font-size:24.1px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_026{font-family:Arial,serif;font-size:24.1px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
span.cls_002{font-family:Arial,serif;font-size:6.0px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
div.cls_002{font-family:Arial,serif;font-size:6.0px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
span.cls_013{font-family:Arial,serif;font-size:9.1px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
div.cls_013{font-family:Arial,serif;font-size:9.1px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
span.cls_017{font-family:Arial,serif;font-size:16.8px;color:rgb(254,255,255);font-weight:bold;font-style:normal;text-decoration: none}
div.cls_017{font-family:Arial,serif;font-size:16.8px;color:rgb(254,255,255);font-weight:bold;font-style:normal;text-decoration: none}
span.cls_014{font-family:Arial,serif;font-size:8.1px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_014{font-family:Arial,serif;font-size:8.1px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
span.cls_025{font-family:Arial,serif;font-size:9.1px;color:rgb(254,255,255);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_025{font-family:Arial,serif;font-size:9.1px;color:rgb(254,255,255);font-weight:normal;font-style:normal;text-decoration: none}
span.cls_027{font-family:Arial,serif;font-size:13.1px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_027{font-family:Arial,serif;font-size:13.1px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
span.cls_015{font-family:Arial,serif;font-size:9.1px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_015{font-family:Arial,serif;font-size:9.1px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
span.cls_018{font-family:Arial,serif;font-size:8.1px;color:rgb(137,137,137);font-weight:bold;font-style:normal;text-decoration: none}
div.cls_018{font-family:Arial,serif;font-size:8.1px;color:rgb(137,137,137);font-weight:bold;font-style:normal;text-decoration: none}
span.cls_003{font-family:Arial,serif;font-size:4.0px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
div.cls_003{font-family:Arial,serif;font-size:4.0px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
span.cls_004{font-family:Arial,serif;font-size:6.0px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_004{font-family:Arial,serif;font-size:6.0px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
span.cls_019{font-family:Arial,serif;font-size:8.3px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_019{font-family:Arial,serif;font-size:8.3px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
span.cls_005{font-family:Arial,serif;font-size:8.1px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
div.cls_005{font-family:Arial,serif;font-size:8.1px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
span.cls_006{font-family:Arial,serif;font-size:10.1px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
div.cls_006{font-family:Arial,serif;font-size:10.1px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
span.cls_020{font-family:Arial,serif;font-size:7.0px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
div.cls_020{font-family:Arial,serif;font-size:7.0px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
span.cls_022{font-family:Arial,serif;font-size:4.6px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
div.cls_022{font-family:Arial,serif;font-size:4.6px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
span.cls_023{font-family:Arial,serif;font-size:7.0px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_023{font-family:Arial,serif;font-size:7.0px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
span.cls_024{font-family:Arial,serif;font-size:8.6px;color:rgb(137,137,137);font-weight:bold;font-style:normal;text-decoration: none}
div.cls_024{font-family:Arial,serif;font-size:8.6px;color:rgb(137,137,137);font-weight:bold;font-style:normal;text-decoration: none}
span.cls_010{font-family:Times,serif;font-size:17.4px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_010{font-family:Times,serif;font-size:17.4px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
span.cls_011{font-family:Times,serif;font-size:20.1px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_011{font-family:Times,serif;font-size:20.1px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
span.cls_007{font-family:Times,serif;font-size:38.7px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_007{font-family:Times,serif;font-size:38.7px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
span.cls_012{font-family:Times,serif;font-size:17.8px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_012{font-family:Times,serif;font-size:17.8px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
span.cls_028{font-family:Arial,serif;font-size:6.0px;color:rgb(158,158,158);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_028{font-family:Arial,serif;font-size:6.0px;color:rgb(158,158,158);font-weight:normal;font-style:normal;text-decoration: none}
-->

</style>
</head>
<body>
<div style="position:absolute;left:50%;margin-left:-420px;top:0px;width:841px;height:595px;border-style:outset;overflow:hidden">
<div style="position:absolute;left:0px;top:0px">
<img src="http://www.orderdude.com/images/ChipotleFaxLayout2.png" width=841 height=595></div>
<div style="position:absolute;left:227.64px;top:12.92px" class="cls_026"><span class="cls_026">Fax Order Form | $address_line1</span></div>
<div style="position:absolute;left:175.44px;top:58.86px" class="cls_002"><span class="cls_002">DATE</span></div>
<div style="position:absolute;left:233.45px;top:58.86px" class="cls_002"><span class="cls_002">COMPANY NAME</span></div>
<div style="position:absolute;left:390.44px;top:58.86px" class="cls_002"><span class="cls_002">CONTACT NAME</span></div>
<div style="position:absolute;left:545.44px;top:58.86px" class="cls_002"><span class="cls_002">PHONE</span></div>
<div style="position:absolute;left:650.44px;top:58.86px" class="cls_002"><span class="cls_002">PICK-UP TIME?</span></div>
<div style="position:absolute;left:715.44px;top:58.86px" class="cls_002"><span class="cls_002">PAGE</span></div>
<div style="position:absolute;left:740.44px;top:58.86px" class="cls_002"><span class="cls_002">OF</span></div>

<div style="position:absolute;left:60.30px;top:70.56px" class="cls_010"><span class="cls_006">START HERE</span></div>
<div style="position:absolute;left:43.2px;top:67.56px" class="cls_017"><span class="cls_017">1</span></div>


<div style="position:absolute;left:42.71px;top:101.13px" class="cls_017"><span class="cls_017">2</span><span class="cls_024">- Complete the form below.</span></div>
<div style="position:absolute;left:256.68px;top:101.13px" class="cls_017"><span class="cls_017">3</span><span class="cls_024">- Fax your order to $fax</span></div>
<div style="position:absolute;left:545.35px;top:101.13px" class="cls_017"><span class="cls_017">4</span><span class="cls_024">- Call $phone to confirm.</span></div>




<div style="position:absolute;left:185.93px;top:157.70px" class="cls_002"><span class="cls_002">ORDER</span></div>
<div style="position:absolute;left:300.89px;top:157.70px" class="cls_002"><span class="cls_002">beans</span></div>
<div style="position:absolute;left:340.82px;top:159.70px" class="cls_002"><span class="cls_002">FAJITA</span></div>
<div style="position:absolute;left:410.64px;top:152.70px" class="cls_002"><span class="cls_002">with</span></div>
<div style="position:absolute;left:405.33px;top:158.66px" class="cls_004"><span class="cls_004">circle one</span></div>
<div style="position:absolute;left:505.27px;top:158.70px" class="cls_002"><span class="cls_002">salsa</span></div>
<div style="position:absolute;left:585.72px;top:158.70px" class="cls_002"><span class="cls_002">dairy</span></div>
<div style="position:absolute;left:635.18px;top:150.44px" class="cls_002"><span class="cls_002">+</span><span class="cls_003">$</span><span class="cls_002">1.40</span></div>
<div style="position:absolute;left:635.61px;top:156.69px" class="cls_004"><span class="cls_004">N/C on</span></div>
<div style="position:absolute;left:635.06px;top:161.69px" class="cls_004"><span class="cls_004">veg items</span></div>
<div style="position:absolute;left:735.76px;top:158.70px" class="cls_002"><span class="cls_002">drink</span></div>

<div style="position:absolute;left:720.01px;top:165.66px" class="cls_004"><span class="cls_004">Please write in flavor</span></div>


<div style="position:absolute;left:70.50px;top:165.70px" class="cls_002"><span class="cls_002">name</span></div>
<div style="position:absolute;left:165.42px;top:166.66px" class="cls_004"><span class="cls_004">burrito • burrito BOWL</span></div>
<div style="position:absolute;left:268.32px;top:166.70px" class="cls_002"><span class="cls_002">rice</span></div>



<div style="position:absolute;left:160.79px;top:172.66px" class="cls_004"><span class="cls_004">crispy tacos • Soft tacos • salad</span></div>
<div style="position:absolute;left:288.73px;top:175.70px" class="cls_004"><span class="cls_004">BLACK</span></div>
<div style="position:absolute;left:313.26px;top:175.70px" class="cls_004"><span class="cls_004">PINTO</span></div>
<div style="position:absolute;left:345.36px;top:173.70px" class="cls_002"><span class="cls_002">VEG</span></div>
<div style="position:absolute;left:370.20px;top:174.70px" class="cls_004"><span class="cls_004">CHK</span></div>
<div style="position:absolute;left:393.27px;top:174.70px" class="cls_004"><span class="cls_004">CAR</span></div>
<div style="position:absolute;left:416.57px;top:174.70px" class="cls_004"><span class="cls_004">STK</span></div>
<div style="position:absolute;left:435.27px;top:174.70px" class="cls_004"><span class="cls_004">BAR</span></div>
<div style="position:absolute;left:453.40px;top:174.70px" class="cls_004"><span class="cls_004">VEG</span></div>
<div style="position:absolute;left:474.41px;top:174.70px" class="cls_004"><span class="cls_004">MILD</span></div>
<div style="position:absolute;left:474.41px;top:179.69px" class="cls_004"><span class="cls_004">TOM</span></div>
<div style="position:absolute;left:500.01px;top:174.70px" class="cls_004"><span class="cls_004">med</span></div>
<div style="position:absolute;left:498.01px;top:179.69px" class="cls_004"><span class="cls_004">CORN</span></div>
<div style="position:absolute;left:522.01px;top:174.70px" class="cls_004"><span class="cls_004">MED</span></div>
<div style="position:absolute;left:522.11px;top:179.69px" class="cls_004"><span class="cls_004">GRN</span></div>
<div style="position:absolute;left:545.26px;top:174.70px" class="cls_004"><span class="cls_004">HOT</span></div>
<div style="position:absolute;left:575.37px;top:174.70px" class="cls_004"><span class="cls_004">sr cr</span></div>
<div style="position:absolute;left:600.29px;top:174.70px" class="cls_004"><span class="cls_004">chz</span></div>
<div style="position:absolute;left:641.80px;top:174.70px" class="cls_004"><span class="cls_004">guac</span></div>
<div style="position:absolute;left:670.37px;top:174.70px" class="cls_004"><span class="cls_004">lettuce</span></div>
EOF
}

my $fax_line_no = 0;
sub print_chipotle_fax_line2 {
	my ($i,$price,$type,$po,$po_amt,$name,$quantity) = @_;

	my %p_o_h;
	for ( my $j = 0 ; $j < $quantity; ++$j ) {
		if ( $po ) {
			my @orders = @{$po};
			if ( $#orders >= 0 ) {
				if ( $j > $#orders ) {
						%p_o_h = %{$orders[-1]};
				}
				else {
					if ( defined %{$orders[$j]} ) {
						%p_o_h = %{$orders[$j]};
					}
				}
			}
		}
		my $rice = ($p_o_h{"rice"}) ? (($p_o_h{"rice"} eq "NONE") ? "N" : (($p_o_h{"rice"} eq "Brown") ? "B" : "W")) : "";
		
		my $beans = ($p_o_h{"beans"}) ? (($p_o_h{"beans"} eq "No Beans") ? "N" : (($p_o_h{"beans"} eq "Pinto Beans") ? "P" : "B")) : "";
		my $black_beans = ($beans eq "B") ? "B" : "";
		my $pinto_beans = ($beans eq "P") ? "P" : "";
		
		my %selected_toppings;
		my %toppings = (
			"Fajita Veggies"							=>	"F",
			"Sour Cream"								=>	"SC",
			"Cheese"									=>	"C",
			"Lettuce"									=>	"L",
			"Fresh Tomato Salsa (mild)"					=>	"M",
			"Roasted Chili-Corn Salsa (medium)"			=>	"MC",
			"Tomatillo-Green Chili Salsa (medium)"		=>	"MG",
			"Tomatillo-Red Chili Salsa (hot)"			=>	"H",
			"Guacamole"									=>	"G"
		);
		if ($p_o_h{"toppings"}) {
			if ( ref($p_o_h{"toppings"}) eq "ARRAY" ) {
				my @tops = @{$p_o_h{"toppings"}};
				foreach (keys %toppings) {
					for ( my $i = 0 ; $i <= $#tops; ++$i ) {
						if ( $_ eq $tops[$i] ) {
							$selected_toppings{$toppings{$_}} = 1;
						}
					}
				}
			}
			else {
				foreach (keys %toppings) {
					$selected_toppings{$toppings{$_}} = 1 if ( $p_o_h{"toppings"} eq $_);
				}
			}
		}
		
		my $choice= (split(" ",$name))[0];
		my $ch = ($choice) ? ((($choice eq "Chicken") ? "C" : (($choice eq "Carnitas") ? "CA" : (
											($choice eq "Steak") ? "S" :(($choice eq "Barbacoa") ? "B" :
												(($choice eq "Veggie") ? "V" : "SO")))))): "";
		
		my $top_pix = 200+($fax_line_no*30.8);
		
		print "<div style=\"position:absolute;left:34px;top:".$top_pix."px\" class=\"cls_005\"><span class=\"cls_005\">".($fax_line_no+1)."</span></div>";
		print "<div style=\"position:absolute;left:48.27px;top:".$top_pix."px\" class=\"cls_010\"><span class=\"cls_010\">$name</span></div>";
		print "<div style=\"position:absolute;left:180.12px;top:".$top_pix."px\" class=\"cls_010\"><span class=\"cls_010\"></span></div>";
		print "<div style=\"position:absolute;left:268.32px;top:".$top_pix."px\" class=\"cls_006\"><span class=\"cls_006\">$rice</span></div>";
		print "<div style=\"position:absolute;left:288.73px;top:".$top_pix."px\" class=\"cls_006\"><span class=\"cls_006\">$black_beans</span></div>";
		print "<div style=\"position:absolute;left:313.26px;top:".$top_pix."px\" class=\"cls_006\"><span class=\"cls_006\">$pinto_beans</span></div>";
		print "<div style=\"position:absolute;left:345.36px;top:".$top_pix."px\" class=\"cls_006\"><span class=\"cls_006\">".(($selected_toppings{"F"}) ? "F" : "")."</span></div>";
		print "<div style=\"position:absolute;left:370.20px;top:".$top_pix."px\" class=\"cls_006\"><span class=\"cls_006\">".(($ch eq "C")?"C":"")."</span></div>";
		print "<div style=\"position:absolute;left:393.27px;top:".$top_pix."px\" class=\"cls_006\"><span class=\"cls_006\">".(($ch eq "CA")?"CA":"")."</span></div>";
		print "<div style=\"position:absolute;left:416.57px;top:".$top_pix."px\" class=\"cls_006\"><span class=\"cls_006\">".(($ch eq "S")?"S":"")."</span></div>";
		print "<div style=\"position:absolute;left:435.27px;top:".$top_pix."px\" class=\"cls_006\"><span class=\"cls_006\">".(($ch eq "B")?"B":"")."</span></div>";
		print "<div style=\"position:absolute;left:453.40px;top:".$top_pix."px\" class=\"cls_006\"><span class=\"cls_006\">".(($ch eq "V")?"V":"")."</span></div>";
		print "<div style=\"position:absolute;left:474.41px;top:".$top_pix."px\" class=\"cls_006\"><span class=\"cls_006\">".(($selected_toppings{"M"}) ? "M" : "")."</span></div>";
		print "<div style=\"position:absolute;left:500px;top:".$top_pix."px\" class=\"cls_006\"><span class=\"cls_006\">".(($selected_toppings{"MC"}) ? "MC" : "")."</span></div>";
		print "<div style=\"position:absolute;left:522px;top:".$top_pix."px\" class=\"cls_006\"><span class=\"cls_006\">".(($selected_toppings{"MG"}) ? "MG" : "")."</span></div>";
		print "<div style=\"position:absolute;left:545.26px;top:".$top_pix."px\" class=\"cls_006\"><span class=\"cls_006\">".(($selected_toppings{"H"}) ? "H" : "")."</span></div>";
		print "<div style=\"position:absolute;left:575.37px;top:".$top_pix."px\" class=\"cls_006\"><span class=\"cls_006\">".(($selected_toppings{"SC"}) ? "SC" : "")."</span></div>";
		print "<div style=\"position:absolute;left:600.29px;top:".$top_pix."px\" class=\"cls_006\"><span class=\"cls_006\">".(($selected_toppings{"C"}) ? "C" : "")."</span></div>";
		print "<div style=\"position:absolute;left:641.80px;top:".$top_pix."px\" class=\"cls_006\"><span class=\"cls_006\">".(($selected_toppings{"G"}) ? "G" : "")."</span></div>";
		print "<div style=\"position:absolute;left:670.37px;top:".$top_pix."px\" class=\"cls_006\"><span class=\"cls_006\">".(($selected_toppings{"L"}) ? "L" : "")."</span></div>";
		$fax_line_no++;
	}
}

sub ChipotleFaxOrder2 {
	my @cmd = split /\//,$cgi->path_info;
	#print $cgi->p("Sending Menu for ".$cgi->path_info()." Test = ",$cmd[2]);
	if ( $#cmd < 2 ) {
		APIDocumentation($cgi->path_info()." does not contain sufficient data for this call");
		exit();
	}
	Info("Bad ID","ID needs to be numeric",$cmd[2]." is not numeric") if ($cmd[2] !~ /^[+-]?\d+$/);
	my $order_id = $cmd[2];
	my $cmd = "select `order`,`to` from $table_order where id = ".$order_id;
	my @data = get_from_DB($cmd);
	my %ret_msg;
	$fax_line_no = 0;
	if ( $#data >= 0 ) {
		my ($order,$res_id) = @data;
		my $order_hash = json2hash($order);
		my %order_details = %{$order_hash->{"order"}};
		print_chipotle_fax_outline2($res_id);
		foreach(keys %order_details) {
			my $category = $_;
			if ( ref($order_details{$_}) eq "ARRAY" ) {
				my @list = @{$order_details{$_}};
				for ( my $i = 0 ; $i <= $#list ; ++$i ) {
					my %order_line = %{$list[$i]};
					my ($price,$type,$po,$po_amt,$name,$quantity);
					foreach (keys %order_line ) {
						if ( $_ eq "personalized_order" ) 						{ $po = $order_line{$_};	}
						elsif ( $_ eq "personalized_additional_order_amount" )	{ $po_amt = $order_line{$_}; }
						elsif ($_ eq "price" )									{ $price = $order_line{$_} }
						else 													{ $name = $_; $quantity = $order_line{$_}	}
					}
					print_chipotle_fax_line2($i,$price,$type,$po,$po_amt,$name,$quantity);
				}
			}
		}
		# Date
		my($day, $month, $year)=(localtime)[3,4,5];
		my $date = ($month+1)."/$day/".($year+1900);
		print "<div style=\"position:absolute;left:175.44px;top:72.86px\" class=\"cls_010\"><span class=\"cls_006\">$date</span></div>";
		
		#company name
		print "<div style=\"position:absolute;left:233.44px;top:67.86px\" class=\"cls_010\"><span class=\"cls_010\">OrderDude.com</span></div>";
		
		#contact name
		print "<div style=\"position:absolute;left:390.44px;top:72.86px\" class=\"cls_010\"><span class=\"cls_006\">".$order_hash->{"Name"}."</span></div>";
		
		#contact phone
		print "<div style=\"position:absolute;left:545.44px;top:72.86px\" class=\"cls_010\"><span class=\"cls_006\">".$order_hash->{"Phone"}."</span></div>";
		
		print "</div></body></html>";
		exit();
	}
	else {
		$ret_msg{"status"} = 0;
		$ret_msg{"reason"} = "Order $order_id not found";
		$ret_msg{"cmd"} = "$cmd -- Returned $#data  @data";
	}
	$ret_msg{"debug"} = \%debug_hash;
	returnJSONData(\%ret_msg);
	exit();
}

sub print_chipotle_fax_outline {
	my ($id) = @_;
	
	my $address = "1 Fountain Square Plaza,Cincinnati, OH 45202";
	my $phone = "513.579.9900";
	my $fax = "513.579.0097";
	
	my $cmd = "select Info_JSON
			from $table_ob
			where id = $id";
	my @data = get_from_DB($cmd);
	if ( $#data >= 0 ) {
		my $info_hash = json2hash($data[0]);
		$address = $info_hash->{"address"};
		$phone = $info_hash->{"phone"};
		$fax = $info_hash->{"fax"};
	}
	my $address_line1 = (split(',',$address))[0];
	
print<<EOF;
Content-type: text/html

<html>
<head><meta http-equiv=Content-Type content="text/html; charset=UTF-8">
<style type="text/css">
<!--
span.cls_026{font-family:Arial,serif;font-size:24.1px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_026{font-family:Arial,serif;font-size:24.1px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
span.cls_002{font-family:Arial,serif;font-size:6.0px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
div.cls_002{font-family:Arial,serif;font-size:6.0px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
span.cls_013{font-family:Arial,serif;font-size:9.1px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
div.cls_013{font-family:Arial,serif;font-size:9.1px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
span.cls_017{font-family:Arial,serif;font-size:16.8px;color:rgb(254,255,255);font-weight:bold;font-style:normal;text-decoration: none}
div.cls_017{font-family:Arial,serif;font-size:16.8px;color:rgb(254,255,255);font-weight:bold;font-style:normal;text-decoration: none}
span.cls_014{font-family:Arial,serif;font-size:8.1px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_014{font-family:Arial,serif;font-size:8.1px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
span.cls_025{font-family:Arial,serif;font-size:9.1px;color:rgb(254,255,255);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_025{font-family:Arial,serif;font-size:9.1px;color:rgb(254,255,255);font-weight:normal;font-style:normal;text-decoration: none}
span.cls_027{font-family:Arial,serif;font-size:13.1px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_027{font-family:Arial,serif;font-size:13.1px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
span.cls_015{font-family:Arial,serif;font-size:9.1px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_015{font-family:Arial,serif;font-size:9.1px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
span.cls_018{font-family:Arial,serif;font-size:8.1px;color:rgb(137,137,137);font-weight:bold;font-style:normal;text-decoration: none}
div.cls_018{font-family:Arial,serif;font-size:8.1px;color:rgb(137,137,137);font-weight:bold;font-style:normal;text-decoration: none}
span.cls_003{font-family:Arial,serif;font-size:4.0px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
div.cls_003{font-family:Arial,serif;font-size:4.0px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
span.cls_004{font-family:Arial,serif;font-size:6.0px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_004{font-family:Arial,serif;font-size:6.0px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
span.cls_019{font-family:Arial,serif;font-size:8.3px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_019{font-family:Arial,serif;font-size:8.3px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
span.cls_005{font-family:Arial,serif;font-size:8.1px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
div.cls_005{font-family:Arial,serif;font-size:8.1px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
span.cls_006{font-family:Arial,serif;font-size:10.1px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
div.cls_006{font-family:Arial,serif;font-size:10.1px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
span.cls_020{font-family:Arial,serif;font-size:7.0px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
div.cls_020{font-family:Arial,serif;font-size:7.0px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
span.cls_022{font-family:Arial,serif;font-size:4.6px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
div.cls_022{font-family:Arial,serif;font-size:4.6px;color:rgb(43,42,41);font-weight:bold;font-style:normal;text-decoration: none}
span.cls_023{font-family:Arial,serif;font-size:7.0px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_023{font-family:Arial,serif;font-size:7.0px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
span.cls_024{font-family:Arial,serif;font-size:8.6px;color:rgb(137,137,137);font-weight:bold;font-style:normal;text-decoration: none}
div.cls_024{font-family:Arial,serif;font-size:8.6px;color:rgb(137,137,137);font-weight:bold;font-style:normal;text-decoration: none}
span.cls_010{font-family:Times,serif;font-size:17.4px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_010{font-family:Times,serif;font-size:17.4px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
span.cls_011{font-family:Times,serif;font-size:20.1px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_011{font-family:Times,serif;font-size:20.1px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
span.cls_007{font-family:Times,serif;font-size:38.7px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_007{font-family:Times,serif;font-size:38.7px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
span.cls_012{font-family:Times,serif;font-size:17.8px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_012{font-family:Times,serif;font-size:17.8px;color:rgb(43,42,41);font-weight:normal;font-style:normal;text-decoration: none}
span.cls_028{font-family:Arial,serif;font-size:6.0px;color:rgb(158,158,158);font-weight:normal;font-style:normal;text-decoration: none}
div.cls_028{font-family:Arial,serif;font-size:6.0px;color:rgb(158,158,158);font-weight:normal;font-style:normal;text-decoration: none}
-->
</style>
</head>
<body>
<div style="position:absolute;left:50%;margin-left:-420px;top:0px;width:841px;height:595px;border-style:outset;overflow:hidden">
<div style="position:absolute;left:0px;top:0px">
<img src="http://www.orderdude.com/images/chipotle-fax-background.jpg" width=841 height=595></div>
<div style="position:absolute;left:227.64px;top:12.92px" class="cls_026"><span class="cls_026">Fax Order Form | $address_line1</span></div>
<div style="position:absolute;left:308.44px;top:58.86px" class="cls_002"><span class="cls_002">DATE</span></div>
<div style="position:absolute;left:366.45px;top:58.86px" class="cls_002"><span class="cls_002">COMPANY NAME</span></div>
<div style="position:absolute;left:488.44px;top:58.86px" class="cls_002"><span class="cls_002">CONTACT NAME</span></div>
<div style="position:absolute;left:608.44px;top:58.86px" class="cls_002"><span class="cls_002">PHONE</span></div>
<div style="position:absolute;left:685.44px;top:58.86px" class="cls_002"><span class="cls_002">PICK-UP TIME?</span></div>
<div style="position:absolute;left:743.44px;top:58.86px" class="cls_002"><span class="cls_002">PAGE</span></div>
<div style="position:absolute;left:776.44px;top:58.86px" class="cls_002"><span class="cls_002">OF</span></div>

<div style="position:absolute;left:49.94px;top:74.08px" class="cls_025"><span class="cls_025">$address_line1</span></div>
<div style="position:absolute;left:64.62px;top:88.48px" class="cls_025"><span class="cls_025">Mon-Sat: 11 am-11 pm</span></div>
<div style="position:absolute;left:73.33px;top:99.28px" class="cls_025"><span class="cls_025">Sun: 11 am-10 pm</span></div>
<div style="position:absolute;left:236.30px;top:59.56px" class="cls_013"><span class="cls_013">START HERE</span></div>
<div style="position:absolute;left:221.2px;top:58.06px" class="cls_017"><span class="cls_017">1</span></div>

<div style="position:absolute;left:219.71px;top:87.13px" class="cls_017"><span class="cls_017">2</span><span class="cls_024">- Complete the form below.</span></div>
<div style="position:absolute;left:385.68px;top:87.13px" class="cls_017"><span class="cls_017">3</span><span class="cls_024">- Fax your order to $fax</span></div>
<div style="position:absolute;left:608.35px;top:87.02px" class="cls_017"><span class="cls_017">4</span><span class="cls_024">- Call $phone to confirm.</span></div>


<!--

<div style="position:absolute;left:243.48px;top:68.56px" class="cls_014"><span class="cls_014">(PLEASE PRINT)</span></div>
<div style="position:absolute;left:218.91px;top:112.06px" class="cls_015"><span class="cls_015">No need to wait in the queue. Go directly to the register. Your order will be ready for you. Order from one to infinity (share the love) but please just one form of payment — cash, VISA or Mastercard.</span></div>
<div style="position:absolute;left:59.56px;top:122.33px" class="cls_018"><span class="cls_018">BURRITOS, TACOS & MORE</span></div>
<div style="position:absolute;left:43.12px;top:135.33px" class="cls_013"><span class="cls_013">BURRITOS</span></div>
<div style="position:absolute;left:51.12px;top:290.33px" class="cls_020"><span class="cls_020">CHICKEN</span></div>
<div style="position:absolute;left:148.19px;top:290.33px" class="cls_022"><span class="cls_022"><sup>\$</sup></span><span class="cls_020">6.70</span></div>
<div style="position:absolute;left:51.12px;top:297.83px" class="cls_014"><span class="cls_014">Higher Welfare chicken, marinated in our</span></div>
<div style="position:absolute;left:51.12px;top:306.33px" class="cls_014"><span class="cls_014">chipotle adobo, then grilled.</span></div>
<div style="position:absolute;left:51.12px;top:319.33px" class="cls_020"><span class="cls_020">STEAK</span></div>
<div style="position:absolute;left:147.80px;top:319.33px" class="cls_022"><span class="cls_022"><sup>\$</sup></span><span class="cls_020">6.95</span></div>
<div style="position:absolute;left:51.12px;top:326.83px" class="cls_014"><span class="cls_014">Farm Assured beef, marinated in our</span></div>
<div style="position:absolute;left:51.12px;top:335.33px" class="cls_014"><span class="cls_014">chipotle adobo, then grilled..</span></div>
<div style="position:absolute;left:51.12px;top:348.33px" class="cls_020"><span class="cls_020">CARNITAS</span></div>
<div style="position:absolute;left:147.80px;top:348.33px" class="cls_022"><span class="cls_022"><sup>\$</sup></span><span class="cls_020">6.95</span></div>
<div style="position:absolute;left:51.12px;top:355.83px" class="cls_014"><span class="cls_014">Outdoor Reared seared pork, braised for</span></div>
<div style="position:absolute;left:51.12px;top:364.33px" class="cls_014"><span class="cls_014">hours then shredded..</span></div>
<div style="position:absolute;left:51.12px;top:377.33px" class="cls_020"><span class="cls_020">BARBACOA</span></div>
<div style="position:absolute;left:147.80px;top:377.33px" class="cls_022"><span class="cls_022"><sup>\$</sup></span><span class="cls_020">6.95</span></div>
<div style="position:absolute;left:51.12px;top:384.83px" class="cls_014"><span class="cls_014">Farm Assured seared beef, braised for</span></div>
<div style="position:absolute;left:51.12px;top:393.33px" class="cls_014"><span class="cls_014">hours then shredded..</span></div>
<div style="position:absolute;left:51.12px;top:406.33px" class="cls_020"><span class="cls_020">VEGETARIAN</span></div>
<div style="position:absolute;left:147.17px;top:406.33px" class="cls_022"><span class="cls_022"><sup>\$</sup></span><span class="cls_020">6.50</span></div>
<div style="position:absolute;left:51.12px;top:413.83px" class="cls_014"><span class="cls_014">Includes our fresh-made guacamole and</span></div>
<div style="position:absolute;left:51.12px;top:422.33px" class="cls_014"><span class="cls_014">vegetarian black beans.</span></div>
<div style="position:absolute;left:92.98px;top:440.33px" class="cls_018"><span class="cls_018">SALSAS</span></div>
<div style="position:absolute;left:43.12px;top:449.33px" class="cls_020"><span class="cls_020">Roasted Tomato</span></div>
<div style="position:absolute;left:160.40px;top:449.33px" class="cls_023"><span class="cls_023">Mild</span></div>
<div style="position:absolute;left:43.13px;top:457.33px" class="cls_020"><span class="cls_020">Roasted Chili-Corn</span></div>
<div style="position:absolute;left:148.78px;top:457.33px" class="cls_023"><span class="cls_023">Medium</span></div>
<div style="position:absolute;left:43.13px;top:465.34px" class="cls_020"><span class="cls_020">Tomatillo-Green Chili</span></div>
<div style="position:absolute;left:135.97px;top:465.34px" class="cls_023"><span class="cls_023">Medium Hot</span></div>
<div style="position:absolute;left:43.14px;top:473.34px" class="cls_020"><span class="cls_020">Tomatillo-Red Chili</span></div>
<div style="position:absolute;left:161.79px;top:473.34px" class="cls_023"><span class="cls_023">Hot</span></div>
<div style="position:absolute;left:92.72px;top:487.33px" class="cls_018"><span class="cls_018">EXTRAS</span></div>
<div style="position:absolute;left:43.12px;top:496.33px" class="cls_020"><span class="cls_020">Tortilla Chips & Guacamole</span></div>
<div style="position:absolute;left:155.06px;top:496.33px" class="cls_022"><span class="cls_022"><sup>\$</sup></span><span class="cls_020">2.30</span></div>
<div style="position:absolute;left:43.12px;top:504.33px" class="cls_020"><span class="cls_020">Tortilla Chips & Salsa</span></div>
<div style="position:absolute;left:156.97px;top:504.33px" class="cls_022"><span class="cls_022"><sup>\$</sup></span><span class="cls_020">1.60</span></div>
<div style="position:absolute;left:43.12px;top:512.33px" class="cls_020"><span class="cls_020">Guacamole</span></div>
<div style="position:absolute;left:156.82px;top:512.33px" class="cls_022"><span class="cls_022"><sup>\$</sup></span><span class="cls_020">1.40</span></div>
<div style="position:absolute;left:43.12px;top:520.33px" class="cls_020"><span class="cls_020">Tortilla Chips</span></div>
<div style="position:absolute;left:155.50px;top:520.33px" class="cls_022"><span class="cls_022"><sup>\$</sup></span><span class="cls_020">0.90</span></div>
<div style="position:absolute;left:92.64px;top:533.83px" class="cls_024"><span class="cls_024">DRINKS</span></div>
<div style="position:absolute;left:43.12px;top:543.33px" class="cls_020"><span class="cls_020">Bottled Water</span></div>
<div style="position:absolute;left:157.07px;top:543.33px" class="cls_022"><span class="cls_022"><sup>\$</sup></span><span class="cls_020">1.30</span></div>
<div style="position:absolute;left:43.12px;top:551.33px" class="cls_020"><span class="cls_020">Juices & Tonics</span></div>
<div style="position:absolute;left:154.96px;top:551.33px" class="cls_022"><span class="cls_022"><sup>\$</sup></span><span class="cls_020">2.00</span></div>
<div style="position:absolute;left:43.12px;top:559.33px" class="cls_020"><span class="cls_020">Coke</span></div>
<div style="position:absolute;left:159.38px;top:559.33px" class="cls_022"><span class="cls_022"><sup>\$</sup></span><span class="cls_020">1.15</span></div>
<div style="position:absolute;left:220.34px;top:569.48px" class="cls_028"><span class="cls_028">CHIPOTLE MEXICAN GRILL UK LTD. / WHITE ROSE HOUSE, 28A YORK PLACE, LEEDS, LS1 2EZ / REGISTERED IN ENGLAND AND WALES - CO NUMBER 06708087 - CHIPOTLE is trademark of Chipotle Mexican Grill Management GmbH.</span></div>
<div style="position:absolute;left:43.12px;top:172.33px" class="cls_013"><span class="cls_013">BURRITO BOWL</span></div>
<div style="position:absolute;left:43.12px;top:181.08px" class="cls_019"><span class="cls_019">Burrito ingredients served in a bowl, no tortilla.</span></div>
<div style="position:absolute;left:43.12px;top:193.33px" class="cls_013"><span class="cls_013">TACOS</span></div>
<div style="position:absolute;left:43.12px;top:202.08px" class="cls_019"><span class="cls_019">Your choice of soft flour or crispy corn tortillas,</span></div>
<div style="position:absolute;left:43.12px;top:210.09px" class="cls_019"><span class="cls_019">filled with meat, salsa, cheese or sour cream,</span></div>
<div style="position:absolute;left:43.12px;top:218.09px" class="cls_019"><span class="cls_019">and romaine lettuce.</span></div>
<div style="position:absolute;left:43.12px;top:230.33px" class="cls_013"><span class="cls_013">SALADS</span></div>
<div style="position:absolute;left:43.12px;top:239.08px" class="cls_019"><span class="cls_019">Chopped romaine lettuce with choice of beans,</span></div>
<div style="position:absolute;left:43.12px;top:247.09px" class="cls_019"><span class="cls_019">meat, salsa and cheese, with freshly made</span></div>
<div style="position:absolute;left:43.12px;top:255.09px" class="cls_019"><span class="cls_019">chipotle-honey vinaigrette.</span></div>
<div style="position:absolute;left:72.51px;top:271.33px" class="cls_018"><span class="cls_018">WHAT GOES INSIDE</span></div>
<div style="position:absolute;left:43.12px;top:144.08px" class="cls_019"><span class="cls_019">Flour tortilla, with choice of coriander-lime rice,</span></div>
<div style="position:absolute;left:43.12px;top:152.09px" class="cls_019"><span class="cls_019">pinto or vegetarian black beans, meat, salsa,</span></div>
<div style="position:absolute;left:43.12px;top:160.09px" class="cls_019"><span class="cls_019">cheese or sour cream.</span></div>
<div style="position:absolute;left:229.44px;top:541.86px" class="cls_010"><span class="cls_010">Example</span></div>
<div style="position:absolute;left:305.56px;top:539.76px" class="cls_011"><span class="cls_011">Burrito</span></div>
<div style="position:absolute;left:406.94px;top:522.80px" class="cls_007"><span class="cls_007">O</span></div>
<div style="position:absolute;left:468.22px;top:522.45px" class="cls_007"><span class="cls_007">O</span></div>
<div style="position:absolute;left:650.11px;top:522.45px" class="cls_007"><span class="cls_007">O</span></div>
<div style="position:absolute;left:741.94px;top:542.13px" class="cls_012"><span class="cls_012">Coke</span></div>

-->
<div style="position:absolute;left:500.64px;top:133.70px" class="cls_002"><span class="cls_002">with</span></div>
<div style="position:absolute;left:679.18px;top:133.44px" class="cls_002"><span class="cls_002">+</span><span class="cls_003">\$</span><span class="cls_002">1.40</span></div>

<div style="position:absolute;left:332.93px;top:137.70px" class="cls_002"><span class="cls_002">ORDER</span></div>
<div style="position:absolute;left:418.89px;top:137.70px" class="cls_002"><span class="cls_002">beans</span></div>
<div style="position:absolute;left:579.27px;top:137.70px" class="cls_002"><span class="cls_002">salsa</span></div>
<div style="position:absolute;left:639.72px;top:137.70px" class="cls_002"><span class="cls_002">dairy</span></div>
<div style="position:absolute;left:681.61px;top:139.69px" class="cls_004"><span class="cls_004">N/C on</span></div>
<div style="position:absolute;left:759.76px;top:137.70px" class="cls_002"><span class="cls_002">drink</span></div>
<div style="position:absolute;left:449.82px;top:142.70px" class="cls_002"><span class="cls_002">FAJITA</span></div>
<div style="position:absolute;left:496.33px;top:141.66px" class="cls_004"><span class="cls_004">circle one</span></div>

<div style="position:absolute;left:250.50px;top:145.70px" class="cls_002"><span class="cls_002">name</span></div>
<div style="position:absolute;left:316.42px;top:146.66px" class="cls_004"><span class="cls_004">burrito • burrito BOWL</span></div>
<div style="position:absolute;left:393.32px;top:146.70px" class="cls_002"><span class="cls_002">rice</span></div>
<div style="position:absolute;left:678.06px;top:144.69px" class="cls_004"><span class="cls_004">veg items</span></div>
<div style="position:absolute;left:743.01px;top:146.66px" class="cls_004"><span class="cls_004">Please write in flavor</span></div>
<div style="position:absolute;left:454.36px;top:148.70px" class="cls_002"><span class="cls_002">VEG</span></div>
<div style="position:absolute;left:304.79px;top:152.66px" class="cls_004"><span class="cls_004">crispy tacos • Soft tacos • salad</span></div>
<div style="position:absolute;left:412.73px;top:151.70px" class="cls_004"><span class="cls_004">BLACK</span></div>
<div style="position:absolute;left:433.26px;top:151.70px" class="cls_004"><span class="cls_004">PINTO</span></div>
<div style="position:absolute;left:475.20px;top:151.70px" class="cls_004"><span class="cls_004">CHK</span></div>
<div style="position:absolute;left:493.27px;top:151.70px" class="cls_004"><span class="cls_004">CAR</span></div>
<div style="position:absolute;left:511.57px;top:151.70px" class="cls_004"><span class="cls_004">STK</span></div>
<div style="position:absolute;left:526.27px;top:151.70px" class="cls_004"><span class="cls_004">BAR</span></div>
<div style="position:absolute;left:542.40px;top:151.70px" class="cls_004"><span class="cls_004">VEG</span></div>
<div style="position:absolute;left:557.41px;top:151.70px" class="cls_004"><span class="cls_004">mILD</span></div>
<div style="position:absolute;left:576.01px;top:151.70px" class="cls_004"><span class="cls_004">med</span></div>
<div style="position:absolute;left:594.01px;top:151.70px" class="cls_004"><span class="cls_004">MED</span></div>
<div style="position:absolute;left:612.26px;top:151.70px" class="cls_004"><span class="cls_004">HOT</span></div>
<div style="position:absolute;left:631.37px;top:151.70px" class="cls_004"><span class="cls_004">sr cr</span></div>
<div style="position:absolute;left:657.29px;top:151.70px" class="cls_004"><span class="cls_004">chz</span></div>
<div style="position:absolute;left:682.80px;top:151.70px" class="cls_004"><span class="cls_004">guac</span></div>
<div style="position:absolute;left:709.37px;top:151.70px" class="cls_004"><span class="cls_004">lettuce</span></div>

<div style="position:absolute;left:558.03px;top:156.69px" class="cls_004"><span class="cls_004">TOM</span></div>
<div style="position:absolute;left:574.72px;top:156.69px" class="cls_004"><span class="cls_004">CORN</span></div>
<div style="position:absolute;left:594.11px;top:156.69px" class="cls_004"><span class="cls_004">GRN</span></div>

EOF
}

#my $fax_line_no = 0;
sub print_chipotle_fax_line {
	my ($i,$price,$type,$po,$po_amt,$name,$quantity) = @_;

	my %p_o_h;
	for ( my $j = 0 ; $j < $quantity; ++$j ) {
		if ( $po ) {
			my @orders = @{$po};
			if ( $#orders >= 0 ) {
				if ( $j > $#orders ) {
						%p_o_h = %{$orders[-1]};
				}
				else {
					if ( defined %{$orders[$j]} ) {
						%p_o_h = %{$orders[$j]};
					}
				}
			}
		}
		my $rice = ($p_o_h{"rice"}) ? (($p_o_h{"rice"} eq "NONE") ? "N" : (($p_o_h{"rice"} eq "Brown") ? "B" : "W")) : "";
		
		my $beans = ($p_o_h{"beans"}) ? (($p_o_h{"beans"} eq "No Beans") ? "N" : (($p_o_h{"beans"} eq "Pinto Beans") ? "P" : "B")) : "";
		my $black_beans = ($beans eq "B") ? "B" : "";
		my $pinto_beans = ($beans eq "P") ? "P" : "";
		
		my %selected_toppings;
		my %toppings = (
			"Fajita Veggies"							=>	"F",
			"Sour Cream"								=>	"SC",
			"Cheese"									=>	"C",
			"Lettuce"									=>	"L",
			"Fresh Tomato Salsa (mild)"					=>	"M",
			"Roasted Chili-Corn Salsa (medium)"			=>	"MC",
			"Tomatillo-Green Chili Salsa (medium)"		=>	"MG",
			"Tomatillo-Red Chili Salsa (hot)"			=>	"H",
			"Guacamole"									=>	"G"
		);
		if ($p_o_h{"toppings"}) {
			if ( ref($p_o_h{"toppings"}) eq "ARRAY" ) {
				my @tops = @{$p_o_h{"toppings"}};
				foreach (keys %toppings) {
					for ( my $i = 0 ; $i <= $#tops; ++$i ) {
						if ( $_ eq $tops[$i] ) {
							$selected_toppings{$toppings{$_}} = 1;
						}
					}
				}
			}
			else {
				foreach (keys %toppings) {
					$selected_toppings{$toppings{$_}} = 1 if ( $p_o_h{"toppings"} eq $_);
				}
			}
		}
		
		my $choice= (split(" ",$name))[0];
		my $ch = ($choice) ? ((($choice eq "Chicken") ? "C" : (($choice eq "Carnitas") ? "CA" : (
											($choice eq "Steak") ? "S" :(($choice eq "Barbacoa") ? "B" :
												(($choice eq "Veggie") ? "V" : "SO")))))): "";
		
		print "<div style=\"position:absolute;left:213.17px;top:".(178+($fax_line_no*30.8))."px\" class=\"cls_005\"><span class=\"cls_005\">".($fax_line_no+1)."</span></div>";
		print "<div style=\"position:absolute;left:229.44px;top:".(178+($fax_line_no*30.8))."px\" class=\"cls_010\"><span class=\"cls_010\">$name</span></div>";
		print "<div style=\"position:absolute;left:305.56px;top:".(178+($fax_line_no*30.8))."px\" class=\"cls_010\"><span class=\"cls_010\"></span></div>";
		print "<div style=\"position:absolute;left:396.87px;top:".(178+($fax_line_no*30.8))."px\" class=\"cls_006\"><span class=\"cls_006\">$rice</span></div>";
		print "<div style=\"position:absolute;left:415.89px;top:".(178+($fax_line_no*30.8))."px\" class=\"cls_006\"><span class=\"cls_006\">$black_beans</span></div>";
		print "<div style=\"position:absolute;left:435.04px;top:".(178+($fax_line_no*30.8))."px\" class=\"cls_006\"><span class=\"cls_006\">$pinto_beans</span></div>";
		print "<div style=\"position:absolute;left:457.32px;top:".(178+($fax_line_no*30.8))."px\" class=\"cls_006\"><span class=\"cls_006\">".(($selected_toppings{"F"}) ? "F" : "")."</span></div>";
		print "<div style=\"position:absolute;left:476.08px;top:".(178+($fax_line_no*30.8))."px\" class=\"cls_006\"><span class=\"cls_006\">".(($ch eq "C")?"C":"")."</span></div>";
		print "<div style=\"position:absolute;left:491.42px;top:".(178+($fax_line_no*30.8))."px\" class=\"cls_006\"><span class=\"cls_006\">".(($ch eq "CA")?"CA":"")."</span></div>";
		print "<div style=\"position:absolute;left:512.13px;top:".(178+($fax_line_no*30.8))."px\" class=\"cls_006\"><span class=\"cls_006\">".(($ch eq "S")?"S":"")."</span></div>";
		print "<div style=\"position:absolute;left:526.88px;top:".(178+($fax_line_no*30.8))."px\" class=\"cls_006\"><span class=\"cls_006\">".(($ch eq "B")?"B":"")."</span></div>";
		print "<div style=\"position:absolute;left:541.88px;top:".(178+($fax_line_no*30.8))."px\" class=\"cls_006\"><span class=\"cls_006\">".(($ch eq "V")?"V":"")."</span></div>";
		print "<div style=\"position:absolute;left:558.27px;top:".(178+($fax_line_no*30.8))."px\" class=\"cls_006\"><span class=\"cls_006\">".(($selected_toppings{"M"}) ? "M" : "")."</span></div>";
		print "<div style=\"position:absolute;left:572.92px;top:".(178+($fax_line_no*30.8))."px\" class=\"cls_006\"><span class=\"cls_006\">".(($selected_toppings{"MC"}) ? "MC" : "")."</span></div>";
		print "<div style=\"position:absolute;left:590.78px;top:".(178+($fax_line_no*30.8))."px\" class=\"cls_006\"><span class=\"cls_006\">".(($selected_toppings{"MG"}) ? "MG" : "")."</span></div>";
		print "<div style=\"position:absolute;left:612.71px;top:".(178+($fax_line_no*30.8))."px\" class=\"cls_006\"><span class=\"cls_006\">".(($selected_toppings{"H"}) ? "H" : "")."</span></div>";
		print "<div style=\"position:absolute;left:631.05px;top:".(178+($fax_line_no*30.8))."px\" class=\"cls_006\"><span class=\"cls_006\">".(($selected_toppings{"SC"}) ? "SC" : "")."</span></div>";
		print "<div style=\"position:absolute;left:658.08px;top:".(178+($fax_line_no*30.8))."px\" class=\"cls_006\"><span class=\"cls_006\">".(($selected_toppings{"C"}) ? "C" : "")."</span></div>";
		print "<div style=\"position:absolute;left:684.96px;top:".(178+($fax_line_no*30.8))."px\" class=\"cls_006\"><span class=\"cls_006\">".(($selected_toppings{"G"}) ? "G" : "")."</span></div>";
		print "<div style=\"position:absolute;left:715.35px;top:".(178+($fax_line_no*30.8))."px\" class=\"cls_006\"><span class=\"cls_006\">".(($selected_toppings{"L"}) ? "L" : "")."</span></div>";
		$fax_line_no++;
	}
}

sub ChipotleFaxOrder {
	my @cmd = split /\//,$cgi->path_info;
	#print $cgi->p("Sending Menu for ".$cgi->path_info()." Test = ",$cmd[2]);
	if ( $#cmd < 2 ) {
		APIDocumentation($cgi->path_info()." does not contain sufficient data for this call");
		exit();
	}
	Info("Bad ID","ID needs to be numeric",$cmd[2]." is not numeric") if ($cmd[2] !~ /^[+-]?\d+$/);
	my $order_id = $cmd[2];
	my $cmd = "select `order`,`to` from $table_order where id = ".$order_id;
	my @data = get_from_DB($cmd);
	my %ret_msg;
	$fax_line_no = 0;
	if ( $#data >= 0 ) {
		my ($order,$res_id) = @data;
		my $order_hash = json2hash($order);
		my %order_details = %{$order_hash->{"order"}};
		print_chipotle_fax_outline($res_id);
		foreach(keys %order_details) {
			my $category = $_;
			if ( ref($order_details{$_}) eq "ARRAY" ) {
				my @list = @{$order_details{$_}};
				for ( my $i = 0 ; $i <= $#list ; ++$i ) {
					my %order_line = %{$list[$i]};
					my ($price,$type,$po,$po_amt,$name,$quantity);
					foreach (keys %order_line ) {
						if ( $_ eq "personalized_order" ) 						{ $po = $order_line{$_};	}
						elsif ( $_ eq "personalized_additional_order_amount" )	{ $po_amt = $order_line{$_}; }
						elsif ($_ eq "price" )									{ $price = $order_line{$_} }
						else 													{ $name = $_; $quantity = $order_line{$_}	}
					}
					print_chipotle_fax_line($i,$price,$type,$po,$po_amt,$name,$quantity);
				}
			}
		}
		# Date
		my($day, $month, $year)=(localtime)[3,4,5];
		my $date = ($month+1)."/$day/".($year+1900);
		print "<div style=\"position:absolute;left:308.44px;top:65.86px\" class=\"cls_010\"><span class=\"cls_006\">$date</span></div>";
		
		#company name
		print "<div style=\"position:absolute;left:366.44px;top:65.86px\" class=\"cls_010\"><span class=\"cls_010\">OrderDude.com</span></div>";
		
		#contact name
		print "<div style=\"position:absolute;left:488.44px;top:65.86px\" class=\"cls_010\"><span class=\"cls_006\">".$order_hash->{"Name"}."</span></div>";
		
		#contact phone
		print "<div style=\"position:absolute;left:608.44px;top:65.86px\" class=\"cls_010\"><span class=\"cls_006\">".$order_hash->{"Phone"}."</span></div>";
		
		print "</div></body></html>";
		exit();
	}
	else {
		$ret_msg{"status"} = 0;
		$ret_msg{"reason"} = "Order $order_id not found";
		$ret_msg{"cmd"} = "$cmd -- Returned $#data  @data";
	}
	$ret_msg{"debug"} = \%debug_hash;
	returnJSONData(\%ret_msg);
	exit();
}

sub Order2pdfImpl {
	my ($order_id) = @_;
}

sub Order2pdf {
	my %ret_msg;
	my @cmd = split /\//,$cgi->path_info;
	#print $cgi->p("Sending Menu for ".$cgi->path_info()." Test = ",$cmd[2]);
	if ( $#cmd < 2 ) {
		APIDocumentation($cgi->path_info()." does not contain sufficient data for this call");
		exit();
	}
	Info("Bad ID","ID needs to be numeric",$cmd[2]." is not numeric") if ($cmd[2] !~ /^[+-]?\d+$/);
	my $order_id = $cmd[2];
	my $cmd = "./pdfcrowd.sh http://www.orderdude.com/cgi-perl/VirtualOrdering.cgi/CHIPOTLEFAXORDER2/$order_id\/ > ../pdforders/$order_id\.pdf";
	#my $cmd = "ls";
	#Remove Taint Mode
	#$cmd =~ m/^([a-zA-Z0-9\._]+)$/ or die "Bad data in first argument";	
	my $path = $ENV{"PATH"};
	$ENV{"PATH"} = "";
	# A blanket untaint 
	if ( my @captures = $cmd =~ m/(.*)/ ) {
		$cmd = $1;
	}
	my $ret_msg = `$cmd`;
	`$cmd`;
	$ret_msg{"CMD"} = $cmd;
	$ret_msg{"RETURN_NUM"} = $?;
	$ret_msg{"RETURN_MSG"} = $ret_msg;
	$ret_msg{"RETURN"} = ( $? == -1 ) ? "Failed" : "Success";
	returnJSONData(\%ret_msg);
	exit();
}

sub EmailOrder {
	my %ret_msg;
	my $cmd2;
	my @cmd = split /\//,$cgi->path_info;
	#print $cgi->p("Sending Menu for ".$cgi->path_info()." Test = ",$cmd[2]);
	if ( $#cmd < 2 ) {
		APIDocumentation($cgi->path_info()." does not contain sufficient data for this call");
		exit();
	}
	Info("Bad ID","ID needs to be numeric",$cmd[2]." is not numeric") if ($cmd[2] !~ /^[+-]?\d+$/);
	my $order_id = $cmd[2];
	my $filename = "../pdforders/$order_id\.pdf";
	if ( -e $filename ) {
		my $cmd = "./pdfcrowd.sh http://www.orderdude.com/cgi-perl/VirtualOrdering.cgi/CHIPOTLEFAXORDER/$order_id\/ > $filename";
		my $ret_msg = ExecuteCommand($cmd);
		$ret_msg{"CMD"} = $cmd;
		$ret_msg{"RETURN"} = ( $? == -1 ) ? "Failed" : "Success";
		$ret_msg{"RETURN_MSG"} = $ret_msg;
		$ret_msg{"RETURN_NUM"} = $?;
	}
	else {
		$ret_msg{"RETURN_MSG"} = "File Already Exits";
	}
	
	my $ret_msg2 = "";
	#($ret_msg2,$cmd2) .= SendEmail("partha\@parthamukherjee.com","Test","Testing Body",undef);
	#($ret_msg2,$cmd2) .= SendEmail("partha\@parthamukherjee.com","Test","Testing Body 3",$filename);
	$cmd2 = "./SendEmail.sh partha\@parthamukherjee.com '' '' $filename";
	$ret_msg2 .= ExecuteCommand($cmd2);
	
	#$cmd2 =~ s/\n/<br \/>/g;
	$ret_msg{"CMD2"} = $cmd2;
	$ret_msg{"RETURN_NUM2"} = $?;
	
	$ret_msg{"RETURN_MSG2"} = $ret_msg2;
	$ret_msg{"RETURN2"} = ( $? == -1 ) ? "Failed" : "Success";
	$ret_msg{"debug"} = \%debug_hash;
	returnJSONData(\%ret_msg);
	exit();
}

## Creates the Fax Order and sends the fax
sub FaxOrder {
	my @cmd = split /\//,$cgi->path_info;
	#print $cgi->p("Sending Menu for ".$cgi->path_info()." Test = ",$cmd[2]);
	if ( $#cmd < 2 ) {
		APIDocumentation($cgi->path_info()." does not contain sufficient data for this call");
		exit();
	}
	Info("Bad ID","ID needs to be numeric",$cmd[2]." is not numeric") if ($cmd[2] !~ /^[+-]?\d+$/);
	my $order_id = $cmd[2];
	my $cmd = "select `order` from $table_order where id = ".$order_id;
	my @data = get_from_DB($cmd);
	my %ret_msg;
	if ( $#data >= 0 ) {
		my ($order) = @data;
		my $order_hash = json2hash($order);
		my %order_details = %{$order_hash->{"order"}};
print<<EOF;
Content-type: text/html

<!doctype html>
<html>
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width,initial-scale=1">
		<title>FaxOrder</title>
		<script src="scripts/jquery-1.8.0.min.js"></script>
		<link rel="stylesheet" href="https://ajax.aspnetcdn.com/ajax/jquery.mobile/1.1.1/jquery.mobile-1.1.1.min.css" />
		<link rel="stylesheet" href="css/VirtualOrdering.css" />
		<script src="https://ajax.aspnetcdn.com/ajax/jquery.mobile/1.1.1/jquery.mobile-1.1.1.min.js"></script>
		<script src="scripts/VirtualOrdering.js"></script>
		
	</head>
	<body>
		<div id="home" data-role="page" data-add-back-btn="true">
			<div data-role="header"><h1>Base Ready</h1></div>
			<div data-role="content">
				<p>$order</p>
EOF
				my $markup = "<table>";
				foreach(keys %order_details) {
					my $category = $_;
					if ( ref($order_details{$_}) eq "ARRAY" ) {
						my @list = @{$order_details{$_}};
						for ( my $i = 0 ; $i <= $#list ; ++$i ) {
							my %order_line = %{$list[$i]};
							my ($price,$type,$po,$po_amt,$name,$quantity);
							foreach (keys %order_line ) {
								if ( $_ eq "personalized_order" ) 						{	$po = $order_line{$_};	}
								elsif ( $_ eq "personalized_additional_order_amount" )	{ $po_amt = $order_line{$_}; }
								elsif ($_ eq "price" )									{ $price = $order_line{$_} }
								else 													{ $name = $_; $quantity = $order_line{$_}	}
							}
							my %p_o_h;
							for ( my $j = 0 ; $j < $quantity; ++$j ) {
								if ( $po ) {
									my @orders = @{$po};
									if ( $#orders >= 0 ) {
										if ( $j > $#orders ) {
											%p_o_h = %{$orders[-1]};
										}
										else {
											if (  defined %{$orders[$j]} ) {
												%p_o_h = %{$orders[$j]};
											}
										}
									}
								}
							}
							my $rice = ($p_o_h{"rice"}) ? (($p_o_h{"rice"} eq "NONE") ? "N" : (($p_o_h{"rice"} eq "Brown") ? "B" : "W")) : "";
							my $beans = ($p_o_h{"beans"}) ? (($p_o_h{"beans"} eq "No Beans") ? "N" : (($p_o_h{"beans"} eq "Pinto Beans") ? "P" : "B")) : "";
							my $black_beans = ($beans eq "B") ? "B" : "";
							my $pinto_beans = ($beans eq "P") ? "P" : "";
		
							my @toppings;
							my %toppings = (
								"Fajita Veggies"							=>	"F",
								"Sour Cream"								=>	"SC",
								"Cheese"									=>	"C",
								"Lettuce"									=>	"L",
								"Fresh Tomato Salsa (mild)"					=>	"M",
								"Roasted Chili-Corn Salsa (medium)"			=>	"MC",
								"Tomatillo-Green Chili Salsa (medium)"		=>	"MG",
								"Tomatillo-Red Chili Salsa (hot)"			=>	"H",
								"Guacamole"									=>	"G"
							);
							if ($p_o_h{"toppings"}) {
								if ( ref($p_o_h{"toppings"}) eq "ARRAY" ) {
									my @tops = @{$p_o_h{"toppings"}};
									print "Toppings = @tops<br />";
									foreach (keys %toppings) {
										for ( my $i = 0 ; $i <= $#tops; ++$i ) {
											if ( $_ eq $tops[$i] ) {
												print "Adding topping $_ <=> ".$toppings{$_}."<br /> ";
												push(@toppings,$toppings{$_});
											}
										}
									}
								}
								else {
									foreach (keys %toppings) {
										push(@toppings,$toppings{$_}) if ( $p_o_h{"toppings"} eq $_);
									}
								}
							}
						
		
						my $choice= (split(" ",$name))[0];
						my $ch = ($choice) ? (
								(
									($choice eq "Chicken") ? "C" : 
									(
										($choice eq "Carnitas") ? "CA" : 
										(
											($choice eq "Steak") ? "S" :
											(
												($choice eq "Barbacoa") ? "B" :
												(
													($choice eq "Veggie") ? "V" : "SO"
													
												)
											)
										)
									)
								)
							)
							: "";
							$markup .= "<tr>";
							$markup .= "<td>$category</td>";
							$markup .= "<td>$name</td>";
							$markup .= "<td>x $quantity</td>";
							$markup .= "<td>$type</td>";
							$markup .= "<td>$price</td>";
							$markup .= "<td>$rice</td>";
							$markup .= "<td>$beans</td>";
							$markup .= "<td>@toppings</td>";
							$markup .= "<td>$choice</td>";
							$markup .= "<td>$ch</td>";
							$markup .= "</tr>";
						}
					}
				}
				
				$markup .= "</table>";
print<<EOF;
				$markup
</div>

			</div>
			
			<div data-role="footer"  data-position="fixed"></div>
		</div>
	</body>
</html>
EOF
		exit();
	}
	else {
		$ret_msg{"status"} = 0;
		$ret_msg{"reason"} = "Order $order_id not found";
		$ret_msg{"cmd"} = "$cmd -- Returned $#data  @data";
	}
	$ret_msg{"debug"} = \%debug_hash;
	returnJSONData(\%ret_msg);
	exit();
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

########################################### Order Related Logics #############################################
sub gen_new_order_id() {
	my $cmd = "insert into $table_order_id_gen values (null)";
	execute_on_DB($cmd);
	$cmd = "select LAST_INSERT_ID()";
	my @ret = get_from_DB($cmd);
	#Info("test", "test","<p>@ret</p>");
	return $ret[0];
}

sub getECAuthLive {
	my $data = 'USER=pp_api1.orderdude.com&';
	$data .= 'PWD=WYJXKN6Z8ZKLAD8R&';
	$data .= 'SIGNATURE=AapFRHLiYeo7Ks-9v.Y-mT-D1t4vAlmDnIMvjSbuJSEOeYxHrcxyeDFO&';
	$data .= 'VERSION=96.0&';
	return $data;
}

sub getECAuthSandbox {
	my $data = 'USER=pp_1353421194_biz_api1.orderdude.com&';
	$data .= 'PWD=1353421212&';
	$data .= 'SIGNATURE=AVnLV.sPA0EdyGiyjYdBJQrL1OPwAyXUfkLAS4-D3ncVofUxxhsbz5ER&';
	$data .= 'VERSION=96.0&';
	return $data;
}

sub getECAuth {
	return (getECAuthLive(),'https://api-3t.paypal.com/nvp');
	#return (getECAuthSandbox(),'https://api-3t.sandbox.paypal.com/nvp');
}

sub getECAuthPaymentInfo {
	my ($grand_total) = @_;
	my $data = 'PAYMENTREQUEST_0_PAYMENTACTION=Sale&';
	$data .= 'PAYMENTREQUEST_0_AMT='.$grand_total.'&';
	$data .= 'PAYMENTREQUEST_0_CURRENCYCODE=USD&';
	return $data;
}

sub setEC {
	my ($grand_total,$payment_track_id) = @_;
	
	my ($data,$url) = getECAuth();
	$data .= getECAuthPaymentInfo($grand_total);
	$data .= 'ORDERDESCRIPTION=Restaurant Order Total&';
	$data .= 'INVOICEID='.$payment_track_id.'&';
	$data .= 'SOLUTIONTYPE=Sole&';
	$data .= 'CANCELURL='.uri_escape($wsite.'?completeorder=0').'&';
	$data .= 'RETURNURL='.uri_escape($wsite.'?completeorder=1&pid='.$payment_track_id).'&';
	$data .= 'NOSHIPPING=1&';
	$data .= 'METHOD=SetExpressCheckout';
	
	#$data = uri_escape($data);	
	
	my $cmd = "$CURL -d \'";
	$cmd .= $data;
	$cmd .= '\'';
	$cmd .= " $url";
	
	my $path = $ENV{"PATH"};
	$ENV{"PATH"} = "";
	# A blanket untaint 
	if ( $cmd =~ m/(.*)/ ) {
		$cmd = $1;
	}
	my $ret_msg = `$cmd`;
	$ENV{"PATH"} = $path;
	
	my $pp_hash = nvp2hash($ret_msg);
	$debug_hash{'setec_cmd'} = $cmd;
	$debug_hash{'setec_ret'} = $ret_msg;
	return $pp_hash->{"TOKEN"};
	#return $ret_msg;
	#return $cmd;
}

sub getEC {
	my ($token) = @_;
	
	# GetExpressCheckout
	my ($data,$url) = getECAuth();
	$data .= "TOKEN=$token&";
	$data .= 'METHOD=GetExpressCheckoutDetails';
	#$data = uri_escape($data);	
	
	my $cmd = "$CURL -d \'";
	$cmd .= $data;
	$cmd .= '\'';
	$cmd .= " $url";
	
	my $path = $ENV{"PATH"};
	$ENV{"PATH"} = "";
	# A blanket untaint 
	if ( $cmd =~ m/(.*)/ ) {
		$cmd = $1;
	}
	my $ret_msg = `$cmd`;
	$ENV{"PATH"} = $path;
	
	my $pp_hash = nvp2hash($ret_msg);
	my $payer_id = $pp_hash->{'PayerID'};
	$debug_hash{'getec_cmd'} = $cmd;
	$debug_hash{'getec_ret'} = $ret_msg;
	return $payer_id;
}

sub doEC {
	my ($token,$payer_id,$grand_total) = @_;
	# DoExpressCheckout
	my ($data,$url) = getECAuth();
	$data .= getECAuthPaymentInfo($grand_total);
	$data .= "TOKEN=$token&";
	$data .= "PAYERID=$payer_id&";
	$data .= 'METHOD=DoExpressCheckoutPayment';
	#$data = uri_escape($data);	
	
	my $cmd = "$CURL -d \'";
	$cmd .= $data;
	$cmd .= '\'';
	$cmd .= " $url";
	
	my $path = $ENV{"PATH"};
	$ENV{"PATH"} = "";
	# A blanket untaint 
	if ( $cmd =~ m/(.*)/ ) {
		$cmd = $1;
	}
	my $ret_msg = `$cmd`;
	$ENV{"PATH"} = $path;
	$debug_hash{'doec_cmd'} = $cmd;
	$debug_hash{'doec_ret'} = $ret_msg;
	
	my $pp_hash = nvp2hash($ret_msg);
	return ($pp_hash->{'ACK'} eq 'Success');
}

# Do both Get and Do Express Checkout
sub completeEC {
	my ($token,$payer_id,$grand_total) = @_;
	
	#my $payer_id = getEC($token);
	return doEC($token,$payer_id,$grand_total);
}

# Status 
# 1 -> New
# 2 -> update
# 3 -> paid
# 4 -> complete
sub SendNewOrder() {
	#print $cgi->p("Sending Order for ".$cgi->path_info());
	my @cmd = split /\//,$cgi->path_info;
	
	# Find if the restaurant id is present or not
	APIDocumentation("Missing necessary params in ".$cgi->path_info) if ($#cmd < 2);
	
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
	my $cmd = "insert into $table_order(`id`,`order`,`from`,`to`,status,total,name,phone,payment,create_time)
			values ($order_id
				,".$json->pretty->encode($post_input)."
				,".$cmd[2]."
				,".$cmd[3]."
				,1
				,".$order_hash->{"Grand Total"}."
				,\"".$order_hash->{"Name"}."\"
				,\"".$order_hash->{"Phone"}."\"
				,\"".$order_hash->{"Payment"}."\"
				,NOW()
				)";
	execute_on_DB($cmd);
	
	my %ret_hash;
	$ret_hash{"OrderId"} = $order_id;
	
	########### Payment Requested ###################
	if ( ($#cmd >= 3) && ($cmd[4] eq 'PAY2') ) {
		my $payment_track_id = Encrypt($order_id + int(rand(10000000)));
		$cmd = "update $table_order set enc_order_id = \"$payment_track_id\" where id = $order_id";
		execute_on_DB($cmd);
	
		my $pp_key = setEC($order_hash->{"Grand Total"},$payment_track_id);
		if ( $pp_key ) {
			$ret_hash{"PPKey"} = $pp_key;
			$pp_key = uri_unescape($pp_key);
			$cmd = "update $table_order set pp_token = \"$pp_key\" where id = $order_id";
			execute_on_DB($cmd);
		}
	}
	else {
		CommunicateOrder($cmd[3],$order_id,$order_hash);
	}
	$ret_hash{debug} = \%debug_hash;
	#$ret_hash{"CMD"} = $cmd;
	returnJSONData(\%ret_hash);
}

sub CommunicateOrder {
	my ($res_id,$order_id,$order_hash) = @_;
	# Gather restaurant's phone number to send SMS
	my $cmd = "select Info_JSON,is_live
			from $table_ob
			where id = $res_id";
	my @info_db_data = get_from_DB($cmd);
		
	if ( $#info_db_data >= 0 ) {
		my $info_hash = json2hash($info_db_data[0]);
		$info_hash->{"is_live"} = $info_db_data[1];
		if ( ! $info_hash->{"is_live"} ) {
			$debug_hash{"is_live"} = "Not Live so not transmitting";
		}
		else {
			$debug_hash{"is_live"} = "Transmitting Live order";
		}
		if ( $info_hash->{"sms"} ) { # Send SMS if only allowed
			my $order_text = viewableOrder($order_id,$order_hash);
			$debug_hash{"sms_order_text"} = $order_text;
			# SendSMS to,carrier,sub,message
			SendSMS(stripPhone2Numbers($info_hash->{'phone'}),
				carrier2SMSemail($info_hash->{'carrier'}),
				"Order # $order_id",
				$order_text,
				$info_hash->{"is_live"});
			$debug_hash{"sms_status"} = 1;
		}
		else {
			$debug_hash{"sms_status"} = 0;
			$debug_hash{"sms_reason"} = "SMS not opted";
		}
		if ( $info_hash->{"fax"} ) { # Fax only if fax number is provided
			# SendFax $order_id,$fax#
			SendFax($order_id,
				stripPhone2Numbers($info_hash->{'fax'}),
				$info_hash->{"is_live"});
			$debug_hash{"fax_num"} = $info_hash->{'fax'};
			$debug_hash{"status"} = 1;
		}
		else {
			$debug_hash{"fax_status"} = 0;
			$debug_hash{"fax_reason"} = "SMS not opted";
		}
	}
	else {
		$debug_hash{"status"} = 0;
		$debug_hash{"reason"} = "Restaurant $res_id not found";
	}
}


sub CompleteOrder() {
	#print $cgi->p("Sending Order for ".$cgi->path_info());
	my @param = split /\//,$cgi->path_info;
	my %ret_msg;
	
	# Find if the restaurant id is present or not
	APIDocumentation("Missing necessary params in ".$cgi->path_info) if ($#param < 1);
	my $order_id = $param[2];
	my $cmd = "select enc_order_id,`order`,`to`,total,pp_token from $table_order where id = ".$order_id;
	my @data = get_from_DB($cmd);
	if ( $#data > 0 ) {
		my ($pid_no,$order,$res_id,$grand_total,$pp_token) = @data;
		
		my $order_hash = json2hash($order);
				
		if ($data{'pid'}) { #Payment is done so validate it
			$ret_msg{'pid'} = $data{'pid'};
			if ( ($#data >= 0) && ($data[0] eq $data{'pid'}) ) {
				if ( completeEC($pp_token,$data{'PayerID'},$grand_total) ) {
					$order_hash->{'Payment'} = "Paid";
					#my $cmd = "update $table_order set status = 3,payment=\"Paid\",order=\"".hash2prettyjson($order_hash)."\" where id = ".$order_id;
					my $cmd = "update $table_order set status = 3,payment=\"Paid\" where id = ".$order_id;
					execute_on_DB($cmd);
					$ret_msg{'Payment'} = 1;
				}
			}
		}
		CommunicateOrder($res_id,$order_id,$order_hash);
	}
	else {
		$ret_msg{"status"} = 0;
		$ret_msg{"reason"} = "Order $order_id not found";
	}
	$ret_msg{"debug"} = \%debug_hash;
	returnJSONData(\%ret_msg);
	exit();
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
	CMD qr{^$}						=>	\&APIDocumentation;
	CMD qr{^/GETINFO/.*$}			=>	\&GetInfo;
	CMD qr{^/GETBUSINESS/.*$}		=>	\&GetBusiness;
	CMD qr{^/GETMENU/.*$}			=>	\&GetMenu;
	CMD qr{^/SENDNEWORDER/.*$}		=>	\&SendNewOrder;
	CMD qr{^/COMPLETEORDER/.*$}		=>	\&CompleteOrder;
	CMD qr{^/UPDATEORDER/.*$}		=>	\&UpdateOrder;
	CMD qr{^/GETORDERUPDATE/.*$}	=>	\&GetOrderUpdate;
	CMD qr{^/FAXORDER/.*$}			=>	\&FaxOrder;
	CMD qr{^/CHIPOTLEFAXORDER/.*$}	=>	\&ChipotleFaxOrder;
	CMD qr{^/CHIPOTLEFAXORDER2/.*$}	=>	\&ChipotleFaxOrder2;
	CMD qr{^/ORDER2PDF/.*$}			=>	\&Order2pdf;
	CMD qr{^/EMAILORDER/.*$}		=>	\&EmailOrder;
	
	
	# Didn't match any command
	LastStage();
}

Main();

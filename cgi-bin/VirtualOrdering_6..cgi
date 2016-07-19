#!/usr/bin/perl -wT
use strict;
use warnings;
use lib "perlsystemlibs";
use lib "/home/orderdud/perl5";
use lib ".";

use CGI;
use CGI::Carp qw(fatalsToBrowser set_message warningsToBrowser);

use LWP::Simple;
use Data::Dumper;
use JSON;
use URI::Escape;

use OD_DB;
use OD_Utility;

#use WWW::Curl::Easy;

#Version : 6.0
#Capability : ['Not yet decided']


my ($cgi,%cookies,%data,$dbh,$sth);
my %debug_hash;
my %sms_email_map = ( 
			'att'		=>	'txt.att.net',
			'verizon'	=>	'vtext.com',
			'sprint'	=>	'messaging.sprintpcs.com',
			'tmobile'	=>	'tmomail.net'
);

my @table_ob_fields			= qw(latitude longitude id Info_JSON Menu_JSON Reservation_JSON Token_JSON Coupons_JSON);
my @table_ob_info_fields		= qw(latitude longitude id Info_JSON);
my @table_ob_bu_fields			= qw(id Info_JSON Menu_JSON Reservation_JSON Token_JSON Coupons_JSON);

my $wsite				= "http://www.orderdude.com/VirtualOrdering.html";

my $CURL				= "/usr/bin/curl";
my $MAIL				= "/bin/mail";

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
            my ($name,$quantity,$price);
            $name = ""; 
            while (my ($item_part,$val) = (each (%{$item}))) {
                if ( $item_part eq 'price' ) { 
                    $price = $val;
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

sub SendSMS {
	my ($ph,$email_base,$sub,$msg) = @_;
	
	my $cmd = "echo \"$msg\" \| $MAIL -s \"$sub\" $ph\@$email_base";
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
	
}

################################################ SMS Functions Ends ##############################################
sub GetInfo() {
	my @cmd = split /\//,$cgi->path_info;
	#print $cgi->p("Sending Menu for ".$cgi->path_info()." Test = ",$cmd[2]);
	if ( $#cmd < 4 ) {
		APIDocumentation($cgi->path_info()." does not contain sufficient data for this call");
		exit();
	}
	my $cmd = "select ".join(",",@table_ob_info_fields)."
			from $table_ob
			where Menu_JSON is not null";
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
	$data .= 'SOLUTIONTYPE=Sole&';
	$data .= 'INVOICEID='.$payment_track_id.'&';
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
	#$ret_hash{debug} = \%debug_hash;
	#$ret_hash{"CMD"} = $cmd;
	returnJSONData(\%ret_hash);
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
		# Gather restaurant's phone number to send SMS
		my $cmd = "select Info_JSON
				from $table_ob
				where id = $res_id";
		my @info_db_data = get_from_DB($cmd);
		
		if ( $#info_db_data >= 0 ) {
			my $info_hash = json2hash($info_db_data[0]);
			
			# SendSMS to,carrier,sub,message
			SendSMS(stripPhone2Numbers($info_hash->{'phone'}),
				carrier2SMSemail($info_hash->{'carrier'}),
				"Order # $order_id",
				viewableOrder($order_id,$order_hash));
			$ret_msg{"status"} = 1;
		}
		else {
			$ret_msg{"status"} = 0;
			$ret_msg{"reason"} = "Restaurant $res_id not found";
		}
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
	CMD qr{^$}				=>	\&APIDocumentation;
	CMD qr{^/GETINFO/.*$}			=>	\&GetInfo;
	CMD qr{^/GETBUSINESS/.*$}		=>	\&GetBusiness;
	CMD qr{^/GETMENU/.*$}			=>	\&GetMenu;
	CMD qr{^/SENDNEWORDER/.*$}		=>	\&SendNewOrder;
	CMD qr{^/COMPLETEORDER/.*$}		=>	\&CompleteOrder;
	
	CMD qr{^/UPDATEORDER/.*$}		=>	\&UpdateOrder;
	CMD qr{^/GETORDERUPDATE/.*$}		=>	\&GetOrderUpdate;
	
	# Didn't match any command
	LastStage();
}

Main();

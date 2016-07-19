#!/usr/bin/perl -wT
use strict;
use warnings;

BEGIN {
    my $b__dir = (-d '/home/orderdud/perl'?'/home/orderdud/perl':( getpwuid($>) )[7].'/perl');
    unshift @INC,$b__dir.'5/lib/perl5',$b__dir.'5/lib/perl5/x86_64-linux-thread-multi',map { $b__dir . $_ } @INC;
}


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

1;
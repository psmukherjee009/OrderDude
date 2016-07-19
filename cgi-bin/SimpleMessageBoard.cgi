#!/usr/bin/perl -wT
use strict;
use warnings;

use CGI;
use CGI::Carp qw(fatalsToBrowser set_message warningsToBrowser);
use DBI;

my ($cgi,$html,%data,$dbh,$sth);

my $db_data_source	= "dbi:mysql:orderdud_www:orderdude.com";
my $db_user		= "orderdud_www";
my $db_password		= "OrderDude2012";
my $msg_board_table	= "orderdud_www.MSG_Board";
my $topic_id_table	= "orderdud_www.topic_id_generator";

sub createDBLink() {
	$dbh = DBI->connect($db_data_source,
 								 $db_user,
								 $db_password,
								 { RaiseError => 0, AutoCommit => 0});
	Info ("DB Connect Failure", "Error","an't connect to $db_data_source: $DBI::errstr ($DBI::err)") if ( !$dbh );
}

sub execute_on_DB($) {
	my ($cmd) = @_;
	
	createDBLink() if (!$dbh);
	$sth = $dbh->prepare($cmd);
	my $ret = $sth->execute();
	Info ("CMD Execution Failure", "Error","$cmd failed:: $DBI::errstr ($DBI::err) ") if ( !$ret );
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

sub gen_new_topic_id() {
	my $cmd = "insert into $topic_id_table values (null)";
	execute_on_DB($cmd);
	$cmd = "select LAST_INSERT_ID()";
	my @ret = get_from_DB($cmd);
	#Info("test", "test","<p>@ret</p>");
	return $ret[0];
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

	print $cgi->header('text/html');
	print $cgi->start_html("SimpleMessageBoard API");
	print $cgi->h1("Simple Message Board API Documentation");
	print $cgi->p("Error : $msg") if ($msg);
	print $cgi->p("Here is a list of what you can do:");
	print $cgi->dl(
		$cgi->dt("<a href=\"".$cgi->url()."/\">GET API Documentation</a>"),
		$cgi->dd("Shows API documentation"),
		$cgi->dt("<a href=\"".$cgi->url()."/SHOW/from\">Shows all messages of this sender</a>"),
		$cgi->dd("Shows messages of sender to and from on the board. You need to fill the from in the clicked url to see saved messages<br />
					nohtml=1 --> Will return data in HTML table format only<br />
					inCSV=1  --> Will return data in CSV format with no of cols as first data<br />
					lastupdatetime --> Will send messages after the lastupdatetime"),
		$cgi->dt("<a href=\"".$cgi->url()."/SHOW/from/to\">Shows message between sender and the receiver</a>"),
		$cgi->dd("Shows messages between sender and receiver. You need to add a valid sender id and receiver id<br />
					nohtml=1 --> Will return data in HTML table format only<br />
					inCSV=1  --> Will return data in CSV format with no of cols as first data<br />
					lastupdatetime --> Will send messages after the lastupdatetime"),
		$cgi->dt("<a href=\"".$cgi->url()."/SHOW/from/to/id\">Shows message between sender and the receiver of a specific chat</a>"),
		$cgi->dd("Shows messages between sender and receiver of a specific chat. You need to add a valid sender id and receiver id<br />
					nohtml=1 --> Will return data in HTML table format only<br />
					inCSV=1  --> Will return data in CSV format with no of cols as first data<br />
					lastupdatetime --> Will send messages after the lastupdatetime"),
		
		$cgi->dt("<a href=\"".$cgi->url()."/ADD/from/to?msg=Short message here\">Add a message on the Board from sender to receiver</a>"),
		$cgi->dd("Add message to Message Board from sender to receiver.You need to add a valid from and to.<br />
					nohtml=1 --> Will return data in HTML table format only<br />
					inCSV=1  --> Will return data in CSV format with no of cols as first data<br />
					lastupdatetime --> Will send messages after the lastupdatetime"),
		$cgi->dt("<a href=\"".$cgi->url()."/ADD/from/to/id?msg=Short message here\">Add a message on the Board from sender to receiver on s specific chat id</a>"),
		$cgi->dd("Add message to Message Board from sender to receiver.You need to add a valid from and to.<br />
					nohtml=1 --> Will return data in HTML table format only<br />
					inCSV=1  --> Will return data in CSV format with no of cols as first data<br />
					lastupdatetime --> Will send messages after the lastupdatetime"),
		
		$cgi->dt("<a href=\"".$cgi->url()."/TEST/\">Get Test Page</a>"),
		$cgi->dd("This allows you to Test saving and getting messages from MessageBoard")
	);
	print $cgi->end_html();
	exit();
}

sub TestPage() {
	print $cgi->header('text/html');
	print $cgi->start_html("SimpleMessageBoard Test");
	print $cgi->start_form(-action => $cgi->url()."/ADD/", -method => "POST");
	print "<table>";
	print "<tr><td>Sender Id :</td><td colspan=\"2\">".
									$cgi->textfield(-name => "from",
													-value => "",
													-size => 20,
													-maxlength => 256)
									."</td></tr>";
	print "<tr><td>Receiver Id :</td><td colspan=\"2\">".
									$cgi->textfield(-name => "to",
													-value => "",
													-size => 20,
													-maxlength => 256)
									."</td></tr>";
	
	print "<tr><td>Message :</td><td colspan=\"2\">".
									$cgi->textarea(-name => "msg",
													-value => $data{"msg"},
													-rows => 15,
													-cols => 50)
									."</td></tr>";
	print "<tr><td></td><td colspan=\"2\">".$cgi->submit(-name => "choice" , -value => "Send")."</td></tr>";
	print "</table>";
	print $cgi->end_form();
	print $cgi->end_html();
	exit();
}

sub CMD($$) {
	my ($path, $code) = @_;
	return unless $cgi->path_info =~ $path;
	$code->();
	exit;
}

sub ShowMBPage {
	my ($cols,@values) = @_;

	print $cgi->header('text/html');
	if ( $data{"inCSV"} ) {
		print $cols.",".join(",",@values);
		exit;
	}
	if ( !$data{"nohtml"} ) {
		print $cgi->start_html("MessageBoardBase Test");
	}
	print "<table>";
	for (my $i = 0 ; $i <= $#values ; $i += $cols) {
		print "<tr>";
		for (my $j = 0 ; $j < $cols ; ++$j) {
			print "<td>".$values[$i+$j]."</td>";
		}
		print "</tr>";
	}
	print "</table>";
	print $cgi->end_html() if (!$data{"nohtml"});
	exit();
}

sub ShowMBData {
	my ($from,$to,$id) = @_;

	my $no_cols = 6;
	my $cmd = "select t.id,t.from,t.to,t.status,t.create_time,t.msg from $msg_board_table t
				where (t.from = $from or t.to = $from) ";
	if ($to) {
		$cmd .= " and (t.from = $to or t.to = $to)";
	}
	if ($id) {
		$cmd .= " and t.id = $id";
	}
	$cmd .= " and t.create_time > \"".$data{"lastupdatetime"}."\"" if ( $data{"lastupdatetime"} );
	$cmd .= " order by t.create_time";
	$cmd .= " desc " if ( !$data{"DIS_REVERSE"} );
	$cmd .= " limit 100";
	my @values = get_from_DB($cmd);
	#Usage($cmd);
	return ($no_cols,@values);
}

sub ShowMB {
	my @cmd = split /\//,$cgi->path_info;
	shift @cmd;
	$data{"from"} = $cmd[1] if (!($data{"from"}));
	Usage("Need Sender to show") if ( !($data{"from"}) );
	$data{"to"} = int($cmd[2]) if (!($data{"to"}));
	$data{"id"} = int($cmd[3]) if (!($data{"id"}));
	my ($no_cols,@values) = ShowMBData($data{"from"},$data{"to"},$data{"id"});
	ShowMBPage($no_cols,@values);
}

sub AddmsgPage { ShowMB(@_); }

sub AddmsgData {
	my ($from,$to,$id,$msg) = @_;

	$msg =~ s/"/\\"/g;
	$msg =~ s/,/0x2c/g; # Changing comma to hex value so that csv doesn't get issues
	# MySQL reserved words in column names so backticked
	my $cmd = "insert into $msg_board_table(`from`,`to`,msg,`id`) values ($from,$to,\"$msg\",$id)";
	execute_on_DB($cmd);
	# Add the passed data
}

sub Addmsg {
	my @cmd = split /\//,$cgi->path_info;
	shift @cmd;
	$data{"from"} = $cmd[1] if (!($data{"from"}));
	Usage("Need SENDER Id to show") if ( !($data{"from"}) );
	$data{"to"} = $cmd[2] if (!($data{"to"}));
	Usage("Need to to be able to add in ".$data{"from"}) if ( !($data{"to"}) );
	$data{"id"} = int($cmd[3]) if (!($data{"id"}));
	if (!$data{"msg"}) { # Non URL encoded order will be sent on post
		$data{"msg"} = $cgi->param('POSTDATA');
	}
	Usage("No Message") if ( !($data{"msg"}) );
	#Info("Data","Check Data","MB_ID = ".$data{"MB_ID"}." Nickname = ".$data{"NICKNAME"}."msg = ".$data{"msg"}." @cmd");
	if ( !$data{"id"} ) {
		$data{"id"} = gen_new_topic_id();
		$data{"id"} = 0 if ( (!$data{"id"}) || ($data{"id"} < 0) );
	}
	AddmsgData($data{"from"},$data{"to"},$data{"id"},$data{"msg"});
	AddmsgPage();
}

sub Main () {
	$ENV{REQUEST_METHOD} = 'GET' unless defined $ENV{REQUEST_METHOD};
	$cgi = CGI->new;
	%data = $cgi->Vars;
	delete @ENV{qw(IFS CD PATH ENV BASH_ENV)}; 

	# Handle the commands now
	CMD qr{^$}					=>	\&Usage;
	CMD qr{^/SHOW/.*$}				=>	\&ShowMB;
	CMD qr{^/ADD/.*$}				=>	\&Addmsg;
	CMD qr{^/TEST/.*$}				=>	\&TestPage;
	
}

Main();
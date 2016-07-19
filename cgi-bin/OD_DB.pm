#!/usr/bin/perl -wT
use strict;
use warnings;
use DBI;

my ($cgi,$html,%data,$dbh,$sth);

my $db_data_source	= "dbi:mysql:orderdud_www:orderdude.com";
my $db_user		= "orderdud_www";
my $db_password		= "OrderDude2012";

my $order_board_table	= "orderdud_www.order_board";
my $table_order		= "orderdud_www.order_board";
my $table_order_id_gen	= "orderdud_www.order_id_generator";
my $table_ob		= "orderdud_www.OB_DB";

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

1;
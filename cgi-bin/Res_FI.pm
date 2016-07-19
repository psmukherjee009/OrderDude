 #!/usr/bin/perl -wT
use strict;
use warnings;

use CGI;
use CGI::Carp qw(fatalsToBrowser set_message warningsToBrowser);
use DBInfo;


package Res_FI;

#CREATE TABLE `pmukherjee`.`Res_FI` (
#`routing_number` VARCHAR( 256 ) NOT NULL ,
#`bank_account_number` VARCHAR( 256 ) NOT NULL ,
#`default` TINYINT NOT NULL DEFAULT '1',
#`status` TINYINT NOT NULL DEFAULT '0',
#`res_id` BIGINT NOT NULL
#) ENGINE = MYISAM COMMENT = 'Restaurant Owners Bank Info' ;


my $table_name		= "orderdud_www.Res_FI";

sub new {
	my ($class) = @_;
	my (%handle);

	$handle{"table"} = $table_name;
	bless \%handle,$class;
	return \%handle;
}

sub add {
	my ($self,$routing_number,$bank_account_number,$default,$status,$res_id) = @_;
	
	my $cmd = "insert into ".$self->{"table"}."(routing_number,bank_account_number,default,status,res_id) values (\"$routing_number\",\"$bank_account_number\",$default,$status,$res_id)";
	
	my $db = new DBBase(DBInfo::ResDB());
	return $db if (!$db);
	#Info ("DB Connect Failure", "Error","Can't connect to $db_data_source: $DBI::errstr ($DBI::err)") if ( !$db );
	my $ret = $db->execute_on_DB($cmd);
	fill(@_) if ($ret);
	return $ret;
}

sub get {
	my ($self,$res_id) = @_;
	
	my $cmd = "select routing_number,bank_account_number,default,status from ".$self->{"table"}." where res_id = $res_id";
	my $db = new DBBase(DBInfo::ResDB());
	return $db if (!$db);
	#Info ("DB Connect Failure", "Error","Can't connect to $db_data_source: $DBI::errstr ($DBI::err)") if ( !$db );
	my @ret = $db->get_from_DB($cmd);
	$self->fill(@ret,$res_id) if ($#ret > 1);
	return @ret;
}

sub update {
	my ($self,$routing_number,$bank_account_number,$default,$status,$res_id) = @_;
	
	my $cmd = "update ".$self->{"table"}."
				set routing_number = \"$routing_number\",bank_account_number = \"$bank_account_number\",default=$default,status=$status
				where res_id = $res_id";
	
	my $db = new DBBase(DBInfo::ResDB());
	return $db if (!$db);
	#Info ("DB Connect Failure", "Error","Can't connect to $db_data_source: $DBI::errstr ($DBI::err)") if ( !$db );
	my $ret = $db->execute_on_DB($cmd);
	fill(@_) if ($ret);
	return $ret;
}

sub fill {
	my ($self,$routing_number,$bank_account_number,$default,$status,$res_id) = @_;
	
	$self->{"routing_number"} = $routing_number;
	$self->{"bank_account_number"} = $bank_account_number;
	$self->{"default"} = $default;
	$self->{"status"} = $status;
	$self->{"res_id"} = $res_id;
}

sub routing_number($) { return $_[0]->{"routing_number"}; }
sub bank_account_number($) { return $_[0]->{"bank_account_number"}; }
sub default($) { return $_[0]->{"default"}; }
sub status($) { return $_[0]->{"status"}; }
sub res_id($) { return $_[0]->{"res_id"}; }

1;
	
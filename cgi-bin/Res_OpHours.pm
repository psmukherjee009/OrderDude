 #!/usr/bin/perl -wT
use strict;
use warnings;

use CGI;
use CGI::Carp qw(fatalsToBrowser set_message warningsToBrowser);
use DBInfo;


package Res_OpHours;

#CREATE TABLE `pmukherjee`.`Res_OpHours` (
#`res_id` BIGINT NOT NULL ,
#`weekday` VARCHAR( 15 ) NOT NULL ,
#`open` TIME NOT NULL ,
#`close` TIME NOT NULL
#) ENGINE = MYISAM  COMMENT = 'Hours of operation' ;

my $table_name		= "orderdud_www.Res_OpHours";


sub new {
	my ($class) = @_;
	my (%handle);

	$handle{"table"} = $table_name;
	bless \%handle,$class;
	return \%handle;
}

sub add {
	my ($self,$weekday,$open,$close,$res_id) = @_;
	
	my $cmd = "insert into ".$self->{"table"}."(weekday,open,close,res_id) values (\"$weekday\",\"$open\",\"$close\",$res_id)";
	
	my $db = new DBBase(DBInfo::ResDB());
	return $db if (!$db);
	#Info ("DB Connect Failure", "Error","Can't connect to $db_data_source: $DBI::errstr ($DBI::err)") if ( !$db );
	my $ret = $db->execute_on_DB($cmd);
	fill(@_) if ($ret);
	return $ret;
}

sub get {
	my ($self,$res_id) = @_;
	
	my $cmd = "select weekday,open,close from ".$self->{"table"}." where res_id = $res_id";
	my $db = new DBBase(DBInfo::ResDB());
	return $db if (!$db);
	#Info ("DB Connect Failure", "Error","Can't connect to $db_data_source: $DBI::errstr ($DBI::err)") if ( !$db );
	my @ret = $db->get_from_DB($cmd);
	$self->fill(@ret,$res_id) if ($#ret > 1);
	return @ret;
}

sub update {
	my ($self,$weekday,$open,$close,$res_id) = @_;
	
	my $cmd = "update ".$self->{"table"}."
				set weekday = \"$weekday\", open = \"$open\", close = \"$close\"
				where res_id = $res_id";
	
	my $db = new DBBase(DBInfo::ResDB());
	return $db if (!$db);
	#Info ("DB Connect Failure", "Error","Can't connect to $db_data_source: $DBI::errstr ($DBI::err)") if ( !$db );
	my $ret = $db->execute_on_DB($cmd);
	fill(@_) if ($ret);
	return $ret;
}

sub fill {
	my ($self,$weekday,$open,$close,$res_id) = @_;
	
	$self->{"weekday"} = $weekday;
	$self->{"open"} = $open;
	$self->{"close"} = $close;
	$self->{"res_id"} = $res_id;
}

sub weekday($) { return $_[0]->{"weekday"}; }
sub open($) { return $_[0]->{"open"}; }
sub close($) { return $_[0]->{"close"}; }
sub res_id($) { return $_[0]->{"res_id"}; }
1;
	
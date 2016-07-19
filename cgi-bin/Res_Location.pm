 #!/usr/bin/perl -wT
use strict;
use warnings;

use CGI;
use CGI::Carp qw(fatalsToBrowser set_message warningsToBrowser);
use DBInfo;



package Res_Location;

#CREATE TABLE `pmukherjee`.`Res_Location` (
#`latitude` FLOAT NOT NULL ,
#`longitude` FLOAT NOT NULL ,
#`altitude` FLOAT NOT NULL ,
#`res_id` BIGINT NOT NULL ,
#PRIMARY KEY ( `res_id` )
#) ENGINE = MYISAM COMMENT = 'Containing location properties of the Restaurant' ;

my $table_name		= "orderdud_www.Res_Location";


sub new {
	my ($class) = @_;
	my (%handle);

	$handle{"table"} = $table_name;
	bless \%handle,$class;
	return \%handle;
}

sub add {
	my ($self,$lat,$long,$alt,$res_id) = @_;
	
	my $cmd = "insert into ".$self->{"table"}."(latitude,longitude,altitude,res_id) values (\"$lat\",\"$long\",\"$alt\",$res_id)";
	
	my $db = new DBBase(DBInfo::ResDB());
	return $db if (!$db);
	#Info ("DB Connect Failure", "Error","Can't connect to $db_data_source: $DBI::errstr ($DBI::err)") if ( !$db );
	my $ret = $db->execute_on_DB($cmd);
	fill(@_) if ($ret);
	return $ret;
}

sub get {
	my ($self,@res_id) = @_;
	
	my $cmd = "select latitude,longitude,altitude,res_id from ".$self->{"table"}." where res_id in ".join(",",@res_id).")";
	my $db = new DBBase(DBInfo::ResDB());
	return $db if (!$db);
	#Info ("DB Connect Failure", "Error","Can't connect to $db_data_source: $DBI::errstr ($DBI::err)") if ( !$db );
	my @ret = $db->get_from_DB($cmd);
	$self->fill(@ret) if ( ($#ret > 1) and ($#res_id < 1) );
	return @ret;
}

sub update {
	my ($self,$lat,$long,$alt,$res_id) = @_;
	
	my $cmd = "update ".$self->{"table"}."
				set latitude = \"$lat\", longitude = \"$long\", altitude = \"$alt\"
				where res_id = $res_id";
	
	my $db = new DBBase(DBInfo::ResDB());
	return $db if (!$db);
	#Info ("DB Connect Failure", "Error","Can't connect to $db_data_source: $DBI::errstr ($DBI::err)") if ( !$db );
	my $ret = $db->execute_on_DB($cmd);
	fill(@_) if ($ret);
	return $ret;
}

sub fill {
	my ($self,$lat,$long,$alt,$res_id) = @_;
	
	$self->{"latitude"} = $lat;
	$self->{"longitude"} = $long;
	$self->{"altitude"} = $alt;
	$self->{"res_id"} = $res_id;
}

sub latitude($) { return $_[0]->{"latitude"}; }
sub longitude($) { return $_[0]->{"longitude"}; }
sub altitude($) { return $_[0]->{"altitude"}; }
sub res_id($) { return $_[0]->{"res_id"}; }
1;
	
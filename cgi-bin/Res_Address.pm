#!/usr/bin/perl -wT
use strict;
use warnings;

use CGI;
use CGI::Carp qw(fatalsToBrowser set_message warningsToBrowser);
use DBInfo;


package Res_Address;
# CREATE TABLE `pmukherjee`.`Res_Address` (
#`line1` VARCHAR( 256 ) NOT NULL ,
#`line2` VARCHAR( 256 ) NOT NULL ,
#`city` VARCHAR( 256 ) NOT NULL ,
#`state` VARCHAR( 256 ) NOT NULL ,
#`zip` VARCHAR( 50 ) NOT NULL ,
#`res_id` BIGINT NOT NULL ,
#PRIMARY KEY ( `res_id` )
#) ENGINE = MYISAM COMMENT = 'Address of Restaurant' ;

my $table_name		= "orderdud_www.Res_Address";


sub new {
	my ($class) = @_;
	my (%handle);

	$handle{"table"} = $table_name;
	bless \%handle,$class;
	return \%handle;
}

sub add {
	my ($self,$line1,$line2,$city,$state,$zip,$res_id) = @_;
	
	my $cmd = "insert into ".$self->{"table"}."(line1,line2,city,state,zip,res_id) values (\"$line1\",\"$line2\",\"$city\",\"$state\",\"$zip\",$res_id)";
	
	my $db = new DBBase(DBInfo::ResDB());
	return $db if (!$db);
	#Info ("DB Connect Failure", "Error","Can't connect to $db_data_source: $DBI::errstr ($DBI::err)") if ( !$db );
	my $ret = $db->execute_on_DB($cmd);
	fill(@_) if ($ret);
	return $ret;
}

sub get {
	my ($self,$res_id) = @_;
	
	my $cmd = "select line1,line2,city,state,zip from ".$self->{"table"}." where res_id = $res_id";
	my $db = new DBBase(DBInfo::ResDB());
	return $db if (!$db);
	#Info ("DB Connect Failure", "Error","Can't connect to $db_data_source: $DBI::errstr ($DBI::err)") if ( !$db );
	my @ret = $db->get_from_DB($cmd);
	$self->fill(@ret,$res_id) if ($#ret > 1);
	return @ret;
}

sub update {
	my ($self,$line1,$line2,$city,$state,$zip,$res_id) = @_;
	
	my $cmd = "update ".$self->{"table"}."
				set line1 = \"$line1\", line2 = \"$line2\", city = \"$city\", state = \"$state\",zip = \"$zip\"
				where res_id = $res_id";
	
	my $db = new DBBase(DBInfo::ResDB());
	return $db if (!$db);
	#Info ("DB Connect Failure", "Error","Can't connect to $db_data_source: $DBI::errstr ($DBI::err)") if ( !$db );
	my $ret = $db->execute_on_DB($cmd);
	fill(@_) if ($ret);
	return $ret;
}

sub fill {
	my ($self,$line1,$line2,$city,$state,$zip,$res_id) = @_;
	
	$self->{"line1"} = $line1;
	$self->{"line2"} = $line2;
	$self->{"city"} = $city;
	$self->{"state"} = $state;
	$self->{"zip"} = $zip;
	$self->{"res_id"} = $res_id;
}

sub line1($) { return $_[0]->{"line1"}; }
sub line2($) { return $_[0]->{"line2"}; }
sub city($) { return $_[0]->{"city"}; }
sub state($) { return $_[0]->{"state"}; }
sub zip($) { return $_[0]->{"zip"}; }
sub res_id($) { return $_[0]->{"res_id"}; }
1;
	
 #!/usr/bin/perl -wT
use strict;
use warnings;

use CGI;
use CGI::Carp qw(fatalsToBrowser set_message warningsToBrowser);
use DBInfo;


package Res_Communicators;

#CREATE TABLE `pmukherjee`.`Res_Communicators` (
#`phone` VARCHAR( 15 ) NOT NULL ,
#`carrier` VARCHAR( 256 ) NOT NULL ,
#`use_sms` TINYINT NOT NULL DEFAULT '1',
#`email` VARCHAR( 256 ) NOT NULL ,
#`use_email` TINYINT NOT NULL DEFAULT '0',
#`fax` VARCHAR( 15 ) NOT NULL ,
#`use_fax` TINYINT NOT NULL DEFAULT '0',
#`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY ,
#`use_wall` TINYINT NOT NULL DEFAULT '1'
#) ENGINE = MYISAM COMMENT = 'Means of Communications to Restaurants' ;

my $table_name		= "orderdud_www.Res_Communicators";


sub new {
	my ($class) = @_;
	my (%handle);

	$handle{"table"} = $table_name;
	bless \%handle,$class;
	return \%handle;
}

sub add {
	my ($self,$phone,$carrier,$use_sms,$email,$use_email,$fax,$use_fax,$use_wall) = @_;
	
	my $cmd = "insert into ".$self->{"table"}."(phone,carrier,use_sms,email,use_email,fax,use_fax,use_wall) 
			values (\"$phone\",\"$carrier\",$use_sms,\"$email\",$use_email,\"$fax\",$use_fax,$use_wall)";
	
	my $db = new DBBase(DBInfo::ResDB());
	return $db if (!$db);
	Info ("DB Connect Failure", "Error","Can't connect to $DBI::errstr ($DBI::err)") if ( !$db );
	my $ret = $db->execute_on_DB($cmd);
	return $ret if (!$ret);
	my $id = $db->get_last_inserted_id();
	fill(@_,$id) if ($id);
	return $id;
}

sub get {
	my ($self,$id) = @_;
	
	my $cmd = "select phone,carrier,use_sms,email,use_email,fax,use_fax,use_wall from ".$self->{"table"}." where id = $id";
	my $db = DBBase->new(DBInfo::ResDB());
	return $db if (!$db);
	#Info ("DB Connect Failure", "Error","Can't connect to $db_data_source: $DBI::errstr ($DBI::err)") if ( !$db );
	my @ret = $db->get_from_DB($cmd);
	$self->fill(@ret,$id) if ($#ret > 1);
	return @ret;
}

sub update {
	my ($self,$phone,$carrier,$use_sms,$email,$use_email,$fax,$use_fax,$use_wall,$id) = @_;
	
	my $cmd = "update ".$self->{"table"}."
				set phone= \"$phone\",carrier= \"$carrier\",use_sms=$use_sms ,email= \"$email\",use_email=$use_email,fax= \"$fax\",use_fax=$use_fax,use_wall=$use_wall
				where id = $id";
	
	my $db = new DBBase(DBInfo::ResDB());
	return $db if (!$db);
	#Info ("DB Connect Failure", "Error","Can't connect to $db_data_source: $DBI::errstr ($DBI::err)") if ( !$db );
	my $ret = $db->execute_on_DB($cmd);
	fill(@_) if ($ret);
	return $ret;
}

sub fill {
	my ($self,$phone,$carrier,$use_sms,$email,$use_email,$fax,$use_fax,$use_wall,$id) = @_;
	$self->{"phone"} = $phone;
	$self->{"carrier"} = $carrier;
	$self->{"use_sms"} = $use_sms;
	$self->{"email"} = $email;
	$self->{"use_email"} = $use_email;
	$self->{"fax"} = $fax;
	$self->{"use_fax"} = $use_fax;
	$self->{"use_wall"} = $use_wall;
	$self->{"id"} = $id;
}

sub phone($) { return $_[0]->{"phone"}; }
sub carrier($) { return $_[0]->{"carrier"}; }
sub use_sms($) { return $_[0]->{"use_sms"}; }
sub email($) { return $_[0]->{"email"}; }
sub use_email($) { return $_[0]->{"use_email"}; }
sub fax($) { return $_[0]->{"fax"}; }
sub use_fax($) { return $_[0]->{"use_fax"}; }
sub use_wall($) { return $_[0]->{"use_wall"}; }
sub id($) { return $_[0]->{"id"}; }

1;



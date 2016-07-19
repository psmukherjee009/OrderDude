 #!/usr/bin/perl -wT
use strict;
use warnings;

use CGI;
use CGI::Carp qw(fatalsToBrowser set_message warningsToBrowser);
use DBInfo;


package Res_Description;

#CREATE TABLE `pmukherjee`.`Res_Description` (
#`description` VARCHAR( 256 ) NOT NULL ,
#`menu` TEXT NOT NULL ,
#`logo` VARCHAR( 256 ) NOT NULL ,
#`password` VARCHAR( 256 ) NOT NULL ,
#`res_id` BIGINT NOT NULL ,
#PRIMARY KEY ( `res_id` )
#) ENGINE = MYISAM COMMENT = 'Restaurant Description with Menu' ;

my $table_name		= "orderdud_www.Res_Description";


sub new {
	my ($class) = @_;
	my (%handle);

	$handle{"table"} = $table_name;
	bless \%handle,$class;
	return \%handle;
}

sub add {
	my ($self,$name,$desc,$menu,$logo,$password,$res_id) = @_;
	
	my $cmd = "insert into ".$self->{"table"}."(name,description,menu,logo,password,res_id) values (\"$name\",\"$desc\",\"$menu\",\"$logo\",\"$password\",$res_id)";
	
	my $db = new DBBase(DBInfo::ResDB());
	return $db if (!$db);
	#Info ("DB Connect Failure", "Error","Can't connect to $db_data_source: $DBI::errstr ($DBI::err)") if ( !$db );
	print "Executing $cmd";
	my $ret = $db->execute_on_DB($cmd);
	fill(@_) if ($ret);
	return $ret;
}

sub get_nofields { return 5; }
sub get {
	my ($self,@res_id) = @_;
	
	my $cmd = "select namedescription,menu,logo,password,res_id from ".$self->{"table"}." where res_id in (".join(",",@res_id).")";
	my $db = new DBBase(DBInfo::ResDB());
	return $db if (!$db);
	#Info ("DB Connect Failure", "Error","Can't connect to $db_data_source: $DBI::errstr ($DBI::err)") if ( !$db );
	my @ret = $db->get_from_DB($cmd);
	$self->fill(@ret) if ($#ret > 1);
	return @ret;
}

sub update {
	my ($self,$name,$desc,$menu,$logo,$password,$res_id) = @_;
	
	my $cmd = "update ".$self->{"table"}."
				set name = \"$name\" description = \"$desc\", menu = \"$menu\", logo = \"$logo\", password = \"$password\"
				where res_id = $res_id";
	
	my $db = new DBBase(DBInfo::ResDB());
	return $db if (!$db);
	#Info ("DB Connect Failure", "Error","Can't connect to $db_data_source: $DBI::errstr ($DBI::err)") if ( !$db );
	my $ret = $db->execute_on_DB($cmd);
	fill(@_) if ($ret);
	return $ret;
}

sub fill {
	my ($self,$name,$desc,$menu,$logo,$password,$res_id) = @_;
	
	$self->{"name"} = $name;
	$self->{"desc"} = $desc;
	$self->{"menu"} = $menu;
	$self->{"logo"} = $logo;
	$self->{"password"} = $password;
	$self->{"res_id"} = $res_id;
}

sub name($) { return $_[0]->{"name"}; }
sub desc($) { return $_[0]->{"desc"}; }
sub menu($) { return $_[0]->{"menu"}; }
sub logo($) { return $_[0]->{"logo"}; }
sub password($) { return $_[0]->{"password"}; }
sub res_id($) { return $_[0]->{"res_id"}; }
1;
	
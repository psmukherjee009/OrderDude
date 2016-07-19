#!/usr/bin/perl -wT
use strict;
use warnings;

use DBI;

package DBBase;

sub new {
	my ($class,$db_data_source,$db_user,$db_password) = @_;
	my (@db_handles);

	$db_handles[0] = createDBLink($db_data_source,$db_user,$db_password);
	bless \@db_handles,$class;
	return \@db_handles;
}

sub dbh() { $_[0]->[0]; }
sub sth() { $_[0]->[1]; }

sub createDBLink {
	my ($db_data_source,$db_user,$db_password) = @_;
	
	my $dbh = DBI->connect($db_data_source,
 				$db_user,
				$db_password,
				{ RaiseError => 0, AutoCommit => 0});
	return $dbh;
}

sub execute_on_DB($$) {
	my ($self,$cmd) = @_;
	
	
	$self->[1] = $self->[0]->prepare($cmd);
	return ($self->[1])->execute();
}

sub get_from_DB($$) {
	my ($self,$cmd) = @_;
	
	$self->execute_on_DB($cmd);
	my (@data,@row);

	while (@row = ($self->[1])->fetchrow_array) {
		push(@data,@row);
	}
	return @data;
}

sub get_last_inserted_id {
	my ($self) = @_;

	my $cmd = "select LAST_INSERT_ID()";
	my @ret = $self->get_from_DB($cmd);
	my $id = ($#ret < 0) ? -1 : $ret[0];
	return $id;
}

1;
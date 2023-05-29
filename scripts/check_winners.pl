#!/usr/bin/perl
use CGI;
use DBI;

use JSON;

my $scriptURL = CGI::url();
my $addr = $ENV{'REMOTE_ADDR'};

my $server = "127.0.0.1";
my $user = "postgres";
my $passwd = "postgres";
my $dbase = "cp";
my $port = 5432;

my $ddositsuko = ddos_check($scriptURL);

my $par = 11;

if ($ddositsuko > $par) {
	exit if ($ddositsuko > $par+1); #important not to apply again
	my $applied = apply_firewall($a);
	
	if ($applied) {

		print STDERR "$a: DDOS firewall applied!\n";
	}
}

$query = new CGI;

$dbconn=DBI->connect("dbi:Pg:dbname=$dbase;port=$port;host=$server",$user, $passwd);

$dbconn->{LongReadLen} = 16384;

print "Content-type:application/json; charset=UTF-8\r\n\r\n";

my $c = "SELECT ROW_TO_JSON(a) FROM (SELECT id, acc_id, sum, calc*100 as percent, (jp/1000000000000) as jackpot, date_and_time FROM winners order by id desc) a";

my $r=$dbconn->prepare($c);
$r->execute;

my $ls = $r->fetchall_arrayref; 
my $nt = $r->rows();

	print '[';	
	for (my $j = 0; $j < $nt; $j++) {
		print ${${$ls}[$j]}[0];
		print ',' unless ($j == $nt-1);
	}
	print ']';

$dbconn->disconnect;

#my %hash = ('result' => $cur);
#my $j = encode_json(\%hash);

#print $j;

exit;

sub ddos_check {

my $url = shift;

my $checklist = "/var/www/html/cp/handlers/checklist";

my $checkstr = $a."_".$url;
open (IN,$checklist);
my $counter = 0;
while (!eof(IN)) {
	my $q = readline (*IN); $q =~ s/\n//g;
	$counter++ if ($q eq $checkstr);
}
   
close (IN);

return $counter;
}

sub apply_firewall {

my $a = shift;

system("sudo /usr/local/bin/ip_apply $a");
print STDERR "sudo /usr/local/bin/ip_apply $a\n";

return 1;
}

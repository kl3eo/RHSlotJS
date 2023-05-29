#!/usr/bin/perl
use CGI;
use JSON;

my $scriptURL = CGI::url();
my $a = $ENV{'REMOTE_ADDR'};

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

my $acc = $query->param('acc') || '';

print $query->header();

my $cur = length($acc) == 48 && substr($acc,0,1) == '5' ? `node /opt/nvme/polka/get_bal.js --address=$acc` : 0;
$cur =~ s/(\r|\n)//g;

#print STDERR "Here cur is $cur!\n";

my %hash = ('result' => $cur);
my $j = encode_json(\%hash);

print $j;

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

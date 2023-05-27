#!/usr/bin/perl

use CGI;
use DBI;

use JSON;

my $server = "127.0.0.1";
my $user = "postgres";
my $passwd = "postgres";
my $dbase = "cp";
my $port = 5432;

my $ret = "ERR";

$query = new CGI;

my $pass = defined($query->param('pass')) ? $query->param('pass') : '';
my $sess = defined($query->param('sess')) ? $query->param('sess') : '';
my $acc_id = defined($query->param('acc_id')) ? $query->param('acc_id') : '';

my $bhash = defined($query->param('bhash')) ? $query->param('bhash') : '';
my $txhash = defined($query->param('txhash')) ? $query->param('txhash') : '';
#https://discord.com/channels/351390305561346060/351390306073313290
my $cmd = '';

$dbconn=DBI->connect("dbi:Pg:dbname=$dbase;port=$port;host=$server",$user, $passwd);

$dbconn->{LongReadLen} = 16384;

if (length($bhash) && $pass eq "lol") {
 my $curr = '';
 my $need_u = 1;

 eval {
  local $SIG{ALRM} = sub { my %hash = ('result' => 'ERR'); my $j = encode_json(\%hash); print "Content-type:application/json; charset=UTF-8\r\n\r\n"; print $j; die "alarm\n" };
  alarm 5;

  if (-f "/tmp/bnum_p") {
    my $c = `date +%s`;
    my $c1 = `date +%s -r /tmp/bnum_p`;
    my $d = $c - $c1;
    $need_u = 0 if ($d < 10);
  }
  
  if ($need_u){
    $curr = `node /opt/nvme/polka/bnum.js`;
    $curr =~ s/(\r|\n)//g;
    if ($curr =~ /^\d+$/) {
      system("echo $curr > /tmp/bnum_p");
    }
  } else {
    $curr = `cat /tmp/bnum_p`;
    $curr =~ s/(\r|\n)//g;
  }
  
  alarm 0;
 };
 
 if ($curr =~ /^\d+$/) { 
 
  my $sel = length($sess) == 16 ? "select bnum, last_acc_id from sessions where session = ?" : "select bnum, last_addr from sj_sessions where session = ?";
  my $result = $dbconn->prepare($sel);
  $result->execute($sess);
  my $listresult = $result->fetchall_arrayref;
  my $ntuples = $result->rows();
  my $last_num = ${${$listresult}[0]}[0];
  my $last_acc_id = ${${$listresult}[0]}[1];
  my $good = ($ntuples == 1 && ($curr == $last_num || $curr == $last_num + 1 || $curr == $last_num + 2 || $curr == $last_num + 3 || $curr == $last_num + 4 || $curr == $last_num + 5) && $last_acc_id eq $acc_id) ? 1 : 0;
print STDERR "Here ntuples is $ntuples, curr is $curr, last is $last_acc_id and acc is $acc_id! Good is $good!\n";
  if ($good) {

        $bhash =~ /^0x(.+)$/g;
	my $bh = $1;
        $txhash =~ /^0x(.+)$/g;
	my $th = $1;

	my $good_acc_id = `node /opt/nvme/polka/get_block_by_hash.js --bh=$bh --th=$th`;
	$good_acc_id =~ s/(\r|\n|")//g;
	my $l = length($good_acc_id);
print STDERR "Bhash is $bhash, bh is $bh, th is $th, last_acc is $last_acc_id, good_acc is $good_acc_id, length is $l!\n";
	if (length($good_acc_id) == 48 && substr($good_acc_id,0,1) == '5' && $last_acc_id eq $good_acc_id) {
print STDERR "Here we go!\n";
		$cmd = length($sess) == 16 ? "update sessions set acc_id  = ?, bnum = 0, last_acc_id = null where session = ?" : "update sj_sessions set addr  = ?, bnum = 0, last_addr = null where session = ?";
		my $result=$dbconn->prepare($cmd);
        	$result->execute($good_acc_id, $sess);
		$ret = "OK";
	}
  }
 }
 
} elsif ($pass eq "lol") {
 
 my $res = '';
 my $need_u = 1;

 eval {
  local $SIG{ALRM} = sub { my %hash = ('result' => 'ERR'); my $j = encode_json(\%hash); print "Content-type:application/json; charset=UTF-8\r\n\r\n"; print $j; die "alarm\n" };
  alarm 5;

  if (-f "/tmp/bnum_p") {
    my $c = `date +%s`;
    my $c1 = `date +%s -r /tmp/bnum_p`;
    my $d = $c - $c1;
    $need_u = 0 if ($d < 10);
  }
  
  if ($need_u){
    $res = `node /opt/nvme/polka/bnum.js`;
    $res =~ s/(\r|\n)//g;
    if ($res =~ /^\d+$/) {
      system("echo $res > /tmp/bnum_p");
    }
  } else {
    $res = `cat /tmp/bnum_p`;
    $res =~ s/(\r|\n)//g;
  }
  
  alarm 0;
 };
 
 if ($res =~ /^\d+$/) { 
	$cmd = length($sess) == 16 ? "update sessions set bnum  = ?, last_acc_id = ? where session = ?" : "update sj_sessions set bnum  = ?, last_addr = ? where session = ?";
	my $result=$dbconn->prepare($cmd);
	$result->execute($res, $acc_id, $sess);
 }
}

print "Content-type:application/json; charset=UTF-8\r\n\r\n";

print STDERR "params: acc_id: $acc_id, pass: $pass, sess: $sess!\n";


my %hash = ('result' => $ret);
$j = encode_json(\%hash);
print $j; #returning to fetch

$dbconn->disconnect;

exit


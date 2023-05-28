#!/usr/bin/perl

use CGI;
use DBI;
use Date::Calc qw(Day_of_Week);

my $scriptURL = CGI::url();
my $addr = $ENV{'REMOTE_ADDR'};

my $server = "127.0.0.1";
my $user = "postgres";
my $passwd = "postgres";
my $dbase = "cp";
my $port = 5432;

my $ddositsuko = ddos_check($scriptURL);

my $par = 31;

if ($ddositsuko > $par) {
	exit if ($ddositsuko > $par+1); #important not to apply again
	my $applied = apply_firewall();
	
	if ($applied) {

		print STDERR "$addr: DDOS firewall applied!\n";
	}
	exit;
}
 
$query = new CGI;

my $Coo = $query->cookie('session') || '';
my $mode = defined($query->param('mode')) ? $query->param('mode') : '';

my $maximum = defined($query->param('max')) ? $query->param('max') : 24;
exit unless ($maximum =~ /^\d+$/);

my $reel = defined($query->param('num')) ? $query->param('num') : 0;
$reel =~ s/(\r|\n|;|'|"|`)//g;
exit unless ($reel =~ /^\d+$/);

my $old_coo = defined($query->param('old_coo')) ? $query->param('old_coo') : '';

#print STDERR "Reel is $reel!\n";

my $max = int ($maximum/2);

print "Content-type:text/html; charset=UTF-8\r\n\r\n";


$dbconn=DBI->connect("dbi:Pg:dbname=$dbase;port=$port;host=$server",$user, $passwd);
$dbconn->{LongReadLen} = 16384;

if ($mode eq "get_random") {

	
	my $rand = int(rand($max));
	
	exit unless ($reel >= 0 && $reel < 5);
	
	#$rand = $max-1 if ($reel > 0 && $reel < 5); #test

	if ($reel ne '4') {
		$cmd = "update sj_sessions set r$reel=$rand where session='$Coo'";
		my $result=$dbconn->prepare($cmd);
		$result->execute();
	}
	
	if ($reel eq '4') {
		$comm = "select gnum, addr from sj_sessions where session='$Coo'";
		&getTable;
		my $gnum = ${${$listresult}[0]}[0];
		my $addr = ${${$listresult}[0]}[1];
		my $new_coo_arrived = ($gnum eq '0' && length($addr) == 0) ? 1 : 0;
		my $new_gnum = $gnum + 1;

#print STDERR "reel4: new coo? $new_coo_arrived, gnum is $gnum, addr is $addr!\n";

		unless ($new_coo_arrived) {
			my $cmd = "update sj_sessions set gnum=$new_gnum, r4=$rand, max=$max where session='$Coo'";
			my $result=$dbconn->prepare($cmd);
			$result->execute();
		} else {
			$old_coo =~ s/(\r|\n|;|'|"|`)//g;
			exit unless ($old_coo =~ /[a-zA-Z]{24}/);
			$comm = "select gnum, addr from sj_sessions where session='$old_coo'";
			&getTable;
			my $gnum = ${${$listresult}[0]}[0];
			my $good_acc_id = ${${$listresult}[0]}[1];
			if ($gnum eq '2' && length($good_acc_id) == 48 && substr($good_acc_id,0,1) == '5') {
				my $cmd = "update sj_sessions set last_addr='$good_acc_id', r4=$rand, max=$max where session='$Coo'";
				my $result=$dbconn->prepare($cmd);
				$result->execute();
			}		
		}		
	}


	print $rand;

} elsif ($mode eq "get_claim") {
	$comm = "select r0, r1, r2, r3, r4, addr, last_addr, gnum, max from sj_sessions where session='$Coo'";
	&getTable;
	my $a = ${${$listresult}[0]}[0];
	my $b = ${${$listresult}[0]}[1];
	my $c = ${${$listresult}[0]}[2];
	my $d = ${${$listresult}[0]}[3];
	my $e = ${${$listresult}[0]}[4];
	my $acc_id = ${${$listresult}[0]}[5];
	my $last_acc_id = ${${$listresult}[0]}[6];
	my $gnum = ${${$listresult}[0]}[7];
	my $max = ${${$listresult}[0]}[8];
	my $claim = defined($query->param('claim')) ? $query->param('claim') : 0;
	
	my $case = 0;
	
	exit if ($a eq '-1' || $b eq '-1' || $c eq '-1' || $d eq '-1' || $e eq '-1') ; #incomplete game
	
	$case = 3 if (($a eq $b && $a eq $c && $a ne $d) || ($b eq $c && $b eq $d && $b ne $e) || ($c eq $d && $c eq $e && $c ne $b));
	$case = 4 if (($a eq $b && $a eq $c && $a eq $d && $a ne $e) || ($b eq $c && $b eq $d && $b eq $e && $b ne $a));
	$case = 5 if ($a eq $b && $a eq $c && $a eq $d && $a eq $e);
	
	#maxOccurrences * (maxPrize / symbols.length) / reelCount - formula from the slotjs
	my $calc = ($case * (($c+1)/$max))/5;
	
print STDERR "Jackpot: case is $case, sym is $c, max is $max, calc is $calc, claim is $claim!\n";
	
	print $calc;
	
} elsif ($mode eq "get_coo") {
	
	$comm = "select count(*) from sj_sessions where session = '$Coo'";
	&getTable;
	if ( $ntuples == 1 && ${${$listresult}[0]}[0] > 0) {
		print $Coo;
	} else {
		print 0;
	}

}

		
$dbconn->disconnect;
exit;

sub getTable { #16

my $now_time  = time;
my $tt = $now_time - $script_start_time;

print STDERR "Debug: in get table - begin, dbase is $dbase; comm is $comm, time is $tt\n" if ($debug);

	$result=$dbconn->prepare($comm);

    	$result->execute;
	&dBaseError($result, $comm."  (".$result->rows()." rows found)") if ($result->rows() ==
	-2);
	
	$listresult = $result->fetchall_arrayref;
	$ntuples = $result->rows();

$now_time  = time;
$tt = $now_time - $script_start_time;

print STDERR "Debug: in get table - end, time is $tt\n" if ($debug);

}

sub dBaseError {

    local($check, $message) = @_;
    print "<H4><FONT COLOR=BLACK><P>$message<BR>Error: ".$check->errstr."</FONT></H4>";
    die("Action failed on command:$message  Error_was:$DBI::errstr");
}

sub make_date { #33

my $addedtime = shift;
my $t; my $this_;
    ($thissec,$thismin,$thishour,$mday,$mon,$thisyear,$t,$t,$t) = gmtime(time+$addedtime);
    $mon++;
	my $month = $months[$mon];
	     $month = $$month if $$month;
    $thisyear += 1900;
    $current_date = "$mday $month $thisyear";
    $current_date = "$month $mday, $thisyear" if ($language eq "english");

    if ($mday >= 10 && $mon >= 10 ) { $this_ = "$mon/$mday";}
    elsif ($mon >= 10) { $this_ = "$mon/0$mday";}
    elsif ($mday >= 10) { $this_ = "0$mon/$mday";}
    else { $this_ = "0$mon/0$mday";}
    
    $thissec = '0'.$thissec if ($thissec < 10);

	$thisdate = "$thisyear/$this_";
    
    if ($thishour >= 10 && $thismin >= 10 ) { $thistime = "$thishour:$thismin";}
    elsif ($thishour >= 10) { $thistime = "$thishour:0$thismin";}
    elsif ($thismin >= 10) { $thistime = "0$thishour:$thismin";}
    else { $thistime = "0$thishour:0$thismin";}
}

sub find_weekday { #144

my $td = shift;

$td =~ /^(\d+)-(\d+)-(\d+)/;
my $y = $1;
my $m = $2;
my $d = $3;

my $wd = Day_of_Week($y, $m, $d);
$wd = 0 if ($wd eq '7');

@weekday = ("Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday");

return $weekday[$wd];
}

sub find_month { #144

my $m = shift;

@mo_abbr = ('',"Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec");

return $mo_abbr[$m];
}

sub connError { #11

    my $message = shift;
    if (!defined($dbconn)) {print "<H4><FONT COLOR=BLACK><P>$message<BR>Error: ". $DBI::errstr ."</FONT></H4>";die("$message ERROR:$DBI::errstr")}
}


sub ddos_check {

my $url = shift;

my $checklist = "/var/www/html/cp/handlers/checklist";

my $checkstr = $addr."_".$url;
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

my $who = shift;

my $applied = 0;

system("sudo /usr/local/bin/ip_apply $addr");
print STDERR "sudo /usr/local/bin/ip_apply $addr\n";

return 1;
}

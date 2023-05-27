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
}
 
$query = new CGI;

my $Coo = $query->cookie('session') || '';
my $mode = defined($query->param('mode')) ? $query->param('mode') : '';
my $maximum = defined($query->param('max')) ? $query->param('max') : 24;
my $reel = defined($query->param('num')) ? $query->param('num') : 0;
$reel =~ s/(\r|\n|;|'|"|`)//g;

print STDERR "Reel is $reel!\n";

my $max = int ($maximum/2);

print "Content-type:text/html; charset=UTF-8\r\n\r\n";

if ($mode eq "get_random") {

	$dbconn=DBI->connect("dbi:Pg:dbname=$dbase;port=$port;host=$server",$user, $passwd);
	$dbconn->{LongReadLen} = 16384;
	
	my $rand = int(rand($max));
	
	#$rand = 8 if ($reel < 3);

	$cmd = "update sj_sessions set r$reel=$rand where session='$Coo'";
print STDERR "cmd is $cmd!\n";
	my $result=$dbconn->prepare($cmd);
	$result->execute();
		
	$dbconn->disconnect;

	print $rand;
} else {
	print $Coo;
}

exit;

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

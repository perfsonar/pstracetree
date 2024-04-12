#!/usr/bin/perl -w

use strict;
use CGI qw/:standard/;
use CGI::Carp qw(fatalsToBrowser);
use Config::General;
use Log::Log4perl qw(get_logger :easy :levels);
use Net::IP;
use Params::Validate;
use Data::Dumper;
use JSON qw( encode_json decode_json);

# use perfSONAR_PS::Utils::GeoLookup qw(geoIPLookup);

my $cgi = CGI->new();

my $msg=();

if ( $cgi->param( "ip" ) ) {
    my $ip= $cgi->param( "ip" );
    if ( $ip =~ /[\w\.:]/i){
	$msg->{address} = geoIPLookup( $ip);
    } else {
	$msg->{error}='invalid chars ip';
    }
} else {
    # print "<font color=red><h2>Error  parameter 'ip' missing<h2>\n";
    $msg->{error}=' parameter "ip" missing';
}
print $cgi->header('application/json');
print encode_json($msg);

exit(0);

#!/usr/bin/perl -w

# circumventing CORS by relaying a http request
# usage :  cors.pl?url=baseurl&param1=val1&param2=val2
# expecting json format output

use strict;
use CGI qw/:standard -debug/;
use CGI::Carp qw(fatalsToBrowser);
use Config::General;
use Log::Log4perl qw(get_logger :easy :levels);
use Net::IP;
use Params::Validate;
use Data::Dumper;
use JSON qw( encode_json decode_json);
use HTTP::Tiny;

# use perfSONAR_PS::Utils::GeoLookup qw(geoIPLookup);

my $cgi = CGI->new();
my $cgiout = CGI->new();

my $msg=();
my $key;
# copy parameters
my $params;
foreach $key ($cgi->param){
    if ( $key ne "" && $key ne 'method'){ 
	if ( $params){
	    $params .= '&';
	} else {
	    $params .= '?';
	}
	$params.= $key . "=" . $cgi->param( $key);
    }
    
}
my $url;
if ( $url=$cgi->param( "url" ) ) {
    
    my $response = HTTP::Tiny->new->get( $url . $params);
    # if ($response->{success}) {
	print $response->{headers};
	print $response->{content};
    #}
} else {
    # print "<font color=red><h2>Error  parameter 'ip' missing<h2>\n";
    $msg->{error}='*** parameter missing';
    print $cgi->header( -type => 'application/json', -charset => 'utf-8');
    print encode_json($msg);
}

exit(0);

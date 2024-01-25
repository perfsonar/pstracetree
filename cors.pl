#!/usr/bin/perl -w

# Circumventing CORS by relaying a http request
# Expecting json format output
# Usage :  cors.pl?url=baseurl&param1=val1&param2=val2
#          verify_SSL=0  - will disable certificate checking (and reduce level of security)
#   

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

my $msg=();
my $key;
# copy parameters
my $params;
foreach $key ($cgi->param){
    if ( $key ne "url" && $key ne 'method' && $key ne 'verify_SSL'){ 
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

    my $http_session;
    if (defined $cgi->param("verify_SSL")) {
	$http_session = HTTP::Tiny->new( ('verify_SSL' =>  $cgi->param("verify_SSL")) );
    } else {
	$http_session = HTTP::Tiny->new();
    }	
    my $response = $http_session->get( $url . $params);
    # if ($response->{success}) {
	print  $cgi->header( -type => $response->{headers}{'content-type'},  -charset => 'utf-8');
	print $response->{content};
    #}
} else {
    # print "<font color=red><h2>Error  parameter 'ip' missing<h2>\n";
    $msg->{error}='*** parameter missing';
    print $cgi->header( -type => 'application/json', -charset => 'utf-8');
    print encode_json($msg);
}

exit(0);

#!/usr/bin/perl -w
#
# Request all traceroute tests from a measurement archive applying Open search API
# Returns a json document with Open search results
# Usage :  get-tracetests.pl?param1=value1&param2=value2...
#          mahost=<url>           Hostname of measurement archive to query (default https://localhost)
#          start=<iso datetime>   Start time of range (default today 00:00 local timezone)
#          end=<iso datetime>     End time of range (default today 23:59 local timezone)
#          from=<hostname>        Source host to apply (if not given a list of host peers is returned)
#          to=<hostname>          Destination host to apply (if not given a list of host peers is returned)
#          verify_SSL=[0|1]       Flag to disable certificate checking (default 1)
#          debug=<0-3>            Debug level (default 0)
#          help                   Print help text     
#
# Author: Otto J Wittner <otto.wittner@sikt.no>
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
use POSIX qw(strftime);

# use perfSONAR_PS::Utils::GeoLookup qw(geoIPLookup);

my $cgi = CGI->new();

if (defined $cgi->param( "help" )) {
    # Return help message
    my $msg->{usage}="get-tracetests.pl?param1=value1&param2=value2...
          mahost=<url>           Hostname of measurement archive to query (default https://localhost)
          start=<iso datetime>   Start time of range (default today 00:00 local timezone)
          end=<iso datetime>     End time of range (default today 23:59 local timezone)
          from=<hostname>        Source host to apply (if not given a list of host peers is returned)
          to=<hostname>          Destination host to apply (if not given a list of host peers is returned)
          verify_SSL=[0|1]       Flag to disable certificate checking (default 0)
          help                   Print help text";			 
    print $cgi->header( -type => 'application/json', -charset => 'utf-8');
    print encode_json($msg), "\n";
    exit(0);
}    

# Prepare parameters for search query
my $mahost = "https://localhost";
$mahost = $cgi->param( "mahost" ) if ( defined $cgi->param( "mahost" ) );
my $iso_start = strftime("%Y-%m-%dT00:00:00%z", localtime);  # ISO formatted beginning of today in current timezone
$iso_start = $cgi->param("start") if (defined $cgi->param("start"));
if ( ! ($iso_start =~ /\D/) ) {
    # Not ISO but likely epoch time. Convert.
    $iso_start = strftime("%Y-%m-%dT00:00:00%z", localtime($cgi->param("start")));
}
my $iso_end = strftime("%Y-%m-%dT23:59:59%z", localtime);    # ISO formatted end of today in current timezone
$iso_end = $cgi->param("end") if (defined $cgi->param("end"));
if ( ! ($iso_end =~ /\D/) ) {
    # Not ISO but likely epoch time. Convert.
    $iso_end = strftime("%Y-%m-%dT00:00:00%z", localtime($cgi->param("end")));
}
my $from='';
$from = $cgi->param("from") if (defined $cgi->param("from"));
my $to='';
$to = $cgi->param("to") if (defined $cgi->param("to"));
my $verify_SSL= 1;
$verify_SSL = $cgi->param("verify_SSL") if (defined $cgi->param("verify_SSL"));

# Prepare query
my $query='';
if (! $from || ! $to ) {
    # Search for all peers with trace test results available
    $query = '{ "query": { "bool": { "filter": [ { "term": { "test.type.keyword": "trace" } }, 
                                                 { "range": { "@timestamp": { "gte": "' . $iso_start . '", "lt": "' . $iso_end . '" } } } ] } },
		"size": 0,
  	        "aggs": { "peers": { "multi_terms": { "terms": [ { "field": "test.spec.source.keyword"}, 
                                                                { "field": "test.spec.dest.keyword"} ],
                                                     "size" : 1000000  },
                                    "aggs": { "timestamp": { "max": { "field": "@timestamp" } } }

                                   } } }'; # size = <large-number> to ensure all peers found are returned
} else {
    # Search for trace test results (traceroutes) in time range between given hosts 
   $query = '{ "query": { "bool": { "filter": [ { "term": { "test.type.keyword": "trace" } }, 
                                                { "term": { "test.spec.source.keyword": "' . $from . '" } },
                                                { "term": { "test.spec.dest.keyword": "' . $to . '" } },
                                                { "range": { "@timestamp": { "gte": "' . $iso_start . '", "lt": "' . $iso_end . '" } } } 
                                              ] 
                                   } 
                         },
	       "size": 8640  }';   # size = 8640 => fetch everything for 10s sampling periode over 24 hours
}

print $query,"\n" if (defined $cgi->param('debug'));

# Run query
my $http_session = HTTP::Tiny->new( 'verify_SSL' =>  $verify_SSL );
#my $response = $http_session->post( $mahost . '/opensearch/pscheduler/_search', 'Content-Type' => 'application/json', Content => $query );
my $request_options = { 'headers' => { 'Content-Type' => 'application/json' }, 'content' => $query };
my $response = $http_session->request( 'POST', $mahost . '/opensearch/pscheduler/_search', $request_options );
# Return (output) respons
print  $cgi->header( -type => $response->{headers}{'content-type'},  -charset => 'utf-8');
print $response->{content};
exit(0);



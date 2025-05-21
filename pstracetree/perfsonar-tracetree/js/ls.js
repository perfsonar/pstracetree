/* This is a simple perfsonar archive browser using the web api's
It uses terminology like MA and LS from there
 Gets a list of traceroute-capable MA's
 lists the traceroute measurements in an ma
 analyze a traceroute and present graphs and tables
 
 https://docs.perfsonar.net/esmond_api_rest.html
*/

function fetch_ls(ls, start_time){
    ma_list=[];
    var url= ls + '&type=service&service-type=ma"';
    //$.getJSON( url, function( loc){
    // $.getJSON( 'cors.pl?method=GET&url=' + encodeURI(url), function( loc){

    var verify_SSL="";
    if ('verify_SSL' in urlParams){
	verify_SSL = "verify_SSL=" + urlParams['verify_SSL'] + "&";
    }
    
    $.getJSON( 'cors.pl?' + verify_SSL + 'method=GET&url=' + url, function( loc){
	$.each(loc.hosts, function(index, host){
	    fetch_ma(host.locator,start_time);
	} );
    } )
	.fail(function( jqxhr, textStatus, error) {
	    msg= "Failed to get "+ ls;
	    console.log("##1 " + msg + " error " + textStatus + ", " + error );
	    
	    if (confirm(msg + "\nThere may be some SSL certificate issues.\n\nTry again with disabled SSL checks?")) {
		urlParams['verify_SSL']=0;
		fetch_ls('https://ps-west.es.net/lookup/activehosts.json', start_time);
	    } else {
		$("#ma").html("<h2 style=text-align:center> No list of MAs available.</h2><p style=text-align:center>Add 'mahost=&lt;hostname/ip-address&gt;' to specify a MA host.<br/>Add 'verify_SSL=0' to disable SSL cerificate checks.</p>");
	    }
	//fetch_ma('https://34.123.110.14:8090/lookup/records', start_time);
    } ); 
}

function fetch_ma(loc, start_time){
    var url=  loc + '&type=service&service-type=ma' ;
    var re=/\d[\d\.:]+\d/;  // extract address
 
    //var head='<font style="font-weight:bold; font-size:large;">Measurement archives</font> ';
    var head='<input type="text" id="ma_in" onkeyup="search_table_ma()" placeholder="Search table..">';
    head+='<table id="ma_table" class=sortable border=1><thead title="Sortable"><tr><th>Service<th>Location<th>Country<th>URls</thead><tbody>';
    var tail='</tbody></table>';
    // var cors='cors.pl?method=GET&url=' + encodeURI(url);


    var verify_SSL="";
    if ('verify_SSL' in urlParams){
	verify_SSL = "verify_SSL=" + urlParams['verify_SSL'] + "&";
    }

    var cors='cors.pl?' + verify_SSL + 'method=GET&url=' + url;

    $.getJSON( cors, function( mas){
    // $.getJSON( url, function( mas){
	var rows=[];
	$.each(mas, function(index, ma){
	    if ( ma["psservice-eventtypes"].indexOf( "packet-trace") >= 0 ){
		// console.log (ma["location-sitename"] + ' - ' + ma["service-locator"][0]);
		var tr = '<tr><td>'+ ma["service-name"] + '<td>' + ma["location-sitename"] + '<td>' + ma["location-country"];
		var first=true;
		$.each( ma["service-locator"], function( index, base ){
		    if ( first){
			tr+='<td>';
			first=false;
		    }
			
		    var srv = base.split("/").slice(0,3).join("/");
	    	    // tr += '<td><a href="ls.html?ma=' + base + '">' + srv  + '</a>' ;
		    tr += '<button onclick=fetch_base("' + base + '",' + start_time + ')> ' + srv  + '</button> ' ;
		} );
		//$('#ma_table tr:last').after( tr);
		head+=tr;
	    }
	} );
	$("#ma").html( head+tail)
	    .ready( function(){
		sorttable.makeSortable(document.getElementById("ma_table"))
	    });

	//makeSortable(document.getElementById("ma_table"));
    } )
    .fail(function( jqxhr, textStatus, error) {
	msg= "Failed to get "+ url + "\n\n(Error message:\n " + textStatus + ", " + error + ")";
	$("#ma").innerHTML='<h3>' + msg + '</h3>';
	console.log("##2 " + msg);
	console.log(cors);
	alert(msg);
    });
}

var measurements=[]; // measurement
var tr_events=[]; // list of events
var urlParams = {};

function fetch_base(url, start_time, end_time){
    // Fetches basic list of traceroutes within a time range from an Esmond archive
    if (end_time == undefined) {
	// Default range is 24h
	end_time = start_time + 24*3600;
    }
    
    var pairs={}; // list of unique peers
    $('#tabs').tabs({'active': 1});

    
    var server= url.split("/").slice(0,3).join("/");
    if ( url.slice(-1) !== "/" ){
	url += "/";	
    }

    var fetch_url = url + '&tool-name=pscheduler/traceroute';
    var verify_SSL="";
    if ('verify_SSL' in urlParams){
	verify_SSL = "verify_SSL=" + urlParams['verify_SSL'] + "&";
    }
    fetch_url = 'cors.pl?' + verify_SSL + 'method=GET&url=' + fetch_url;
    var msg='Fetching MA ' + fetch_url;
    console.log(msg);
     $("#peers").html(msg);
    var head='<input type="text" id="peer_in" onkeyup="search_table_peer()" placeholder="Search table..">';
    var start = new Date(start_time*1000);
    var end   = new Date(end_time*1000);
  //  head += ' time-start: <input type="text" id="datepicker" size=12 ';
  //  head += 'value="' + start.toLocaleDateString() + '">' ;
    head += ' From <input type="text" id="datepicker_from" size=12 ';
    head += 'value="' + start.toLocaleDateString() + '">' ;
    head += ' To <input type="text" id="datepicker_to" size=12 ';
    head += 'value="' + end.toLocaleDateString() + '">' ;
    // + start.toLocaleTimeString() + ' ('+start_time+')';
    var peer_table = '<table id="peer_table" class=sortable border=0><thead title="Sortable"><tr><th>Time updated<th>Peers list</thead><tbody>';
    var peer_table_tail='</tbody></table>';
	
    $.getJSON( fetch_url, function( events){
	var traceroutes_found = false;
	$.each(events, function(index, event){
	    if ( event["pscheduler-test-type"] === "trace" ){
		$.each( event["event-types"], function(index, evt){
		    if ( evt["event-type"] === "packet-trace" &&  evt["time-updated"] >= start_time && evt["time-updated"] < end_time){
			// Traceroute results within day 
			measurements.push(evt);
			var mno = measurements.length - 1;
			tr_events.push( event);
			var pair =  event["input-source"] + ' - ' + event["input-destination"];
			if ( ! pairs[pair] ){ // avoid duplicates
			    //var tr = '<tr><td><a href=ls.html?pair=' + mno + '>' + pair + '</a>';
			    var tu = new Date( evt["time-updated"] * 1000 );
			    var tr = '<tr><td>' + tu.toLocaleDateString() + 'T' + tu.toLocaleTimeString();
			    tr += '<td><button onclick=\'tracetree("' + server + '", ' + mno + ')\'>' + pair + '</button>';
			    peer_table += tr;
			    //$('#peer_table tr:last').after( tr);
			    pairs[pair] = true;
			    traceroutes_found = true;
		    
			    if (urlParams["from"] == event["input-source"] && urlParams["to"] == event["input-destination"] ) {
				// A pair of measurement nodes are already specified. Display tracetree.
				tracetree(server, mno);
				// $('#page-title').hide();
			    }
			}
		    }
		});
	    }
	} );
	if (traceroutes_found ) {
	    peer_table += "</tbody></table>";
	} else {
	    peer_table = "<h4>No tracroutes found.</h4>"
	}
//	$("#peers").html( head + tail)
	$("#peers").html( head + peer_table )
	    .ready( function(){
//		$( "#datepicker" ).datepicker( /* "setDate", new Date(start_time*1000)*/ );
//		$( "#datepicker" ).change( function(){
		$( "#datepicker_from" ).datepicker( { defaultDate: new Date(start_time*1000), changeMonth: true, numberOfMonth: 1 });
		$( "#datepicker_from" ).change( function(){
		    fetch_base(url, new Date($(this).val()) / 1000, new Date($("#datepicker_to").val()) / 1000 ); } );
		$( "#datepicker_to" ).datepicker( { defaultDate: new Date(end_time*1000), changeMonth: true, numberOfMonth: 1 });
		$( "#datepicker_to" ).change( function(){
		    fetch_base(url, new Date($("#datepicker_from").val()) / 1000, new Date($(this).val()) / 1000); } );
		if (traceroutes_found) sorttable.makeSortable(document.getElementById("peer_table"));
	    });
	//makeSortable( document.getElementById("peer_table"));
    } )
	.fail(function( jqxhr, textStatus, error) {
	    msg= "Failed to get "+ url + "\n\n(Error message:\n" + textStatus + ", " + error + ")";
	    console.log("##3 " + msg);
	    alert(msg);
    });   

    // pscheduler-test-type
}

function fetch_base_os(mahost, start_time, end_time){
    //Fetches basic list of traceroutes within a time range from Opensearch archive 
    if (end_time == undefined) {
	// Default range is 24h
	end_time = start_time + 24*3600;
    }
    var start_iso = new Date(start_time * 1000 ).toISOString();  // ... from milliseconds
    var end_iso = new Date(end_time * 1000 ).toISOString();
    
    var pairs={}; // list of unique peers
    $('#tabs').tabs({'active': 1});

    var server= mahost.split("/").slice(0,3).join("/");

    // Add flag controlling SSL cert verification
    var verify_SSL="";
    if ('verify_SSL' in urlParams){
	verify_SSL = "verify_SSL=" + urlParams['verify_SSL'];
    }
    // Prepare full url to apply 
    fetch_url = 'get-tracetests.pl?' + verify_SSL + '&mahost=' + mahost + '&start=' + start_iso + '&end=' + end_iso;
    var msg='Fetching all traceroute peers from archive ' + mahost + ' applying ' + fetch_url;
    console.log(msg);
    $("#peers").html(msg);

    // Prepare table to display traceroutes found
    var head='<input type="text" id="peer_in" onkeyup="search_table_peer()" placeholder="Search table..">';
    var start = new Date(start_time*1000);
    var end   = new Date(end_time*1000);
    head += ' From <input type="text" id="datepicker_from" size=12 ';
    head += 'value="' + start.toLocaleDateString() + '">' ;
    head += ' To <input type="text" id="datepicker_to" size=12 ';
    head += 'value="' + end.toLocaleDateString() + '">' ;
    var peer_table = '<table id="peer_table" class=sortable border=0><thead title="Sortable"><tr><th>Time updated<th>Peers list</thead><tbody>';
    var peer_table_tail='</tbody></table>';

    $.getJSON( fetch_url, function(results){
	var traceroutes_found = false;
	for (var r = 0; r < results.aggregations.peers.buckets.length; r++) {
	    // Peers found. Store.
	    let from =  results.aggregations.peers.buckets[r].key[0];
	    let to =  results.aggregations.peers.buckets[r].key[1];
	    let pair =  from + ' - ' + to;
	    if ( ! pairs[pair] ){ // Avoid duplicates
		var tu = new Date( results.aggregations.peers.buckets[r].timestamp.value );
		var tr = '<tr><td>' + tu.toLocaleDateString() + 'T' + tu.toLocaleTimeString();
		tr += '<td><button onclick=\'tracetree_os("' + server + '", "' + from + '", "' + to + '", ' + start_time + ',  ' + end_time + ')\'>' + pair + '</button>';
		peer_table += tr;
		//$('#peer_table tr:last').after( tr);
		pairs[pair] = true;
		traceroutes_found = true;
		
		if (urlParams["from"] == from && urlParams["to"] == to ) {
		    // A pair of measurement nodes are already specified. Display tracetree.
		    tracetree_os(server, from, to, start_time, end_time);
		    // $('#page-title').hide();
		}
	    }
	}
	if (traceroutes_found ) {
	    peer_table += "</tbody></table>";
	} else {
	    peer_table = "<h4>No tracroutes found.</h4>"
	}
//	$("#peers").html( head + tail)
	$("#peers").html( head + peer_table )
	    .ready( function(){
//		$( "#datepicker" ).datepicker(  "setDate", new Date(start_time*1000) );
//		$( "#datepicker" ).change( function(){
		$( "#datepicker_from" ).datepicker( { defaultDate: new Date(start_time*1000), changeMonth: true, numberOfMonth: 1 });
		$( "#datepicker_from" ).change( function(){
		    fetch_base_os(mahost, new Date($(this).val()) / 1000, new Date($("#datepicker_to").val()) / 1000 ); } );
		$( "#datepicker_to" ).datepicker( { defaultDate: new Date(end_time*1000), changeMonth: true, numberOfMonth: 1 });
		$( "#datepicker_to" ).change( function(){
		    fetch_base_os(mahost, new Date($("#datepicker_from").val()) / 1000, new Date($(this).val()) / 1000); } );
		if (traceroutes_found) sorttable.makeSortable(document.getElementById("peer_table"));
	    });
	//makeSortable( document.getElementById("peer_table"));
    } )
	.fail(function( jqxhr, textStatus, error) {
	    msg= "Failed to get "+ fetch_url + "\n\n(Error message:\n" + textStatus + ", " + error + ")";
	    console.log("##3 " + msg);
	    alert(msg);
    });   
}


function tracetree( srv, mno){
    //var srv=urlParams['ma'].split("/").slice(0,3).join("/");
      
    var base =  srv + measurements[ mno ]['base-uri'];
    var url='tracetree.html?mahost=' + base;
    url+="&from=" + tr_events[mno]["input-source"];
    url+="&to=" + tr_events[mno]["input-destination"];
    if ( urlParams["stime"] ) {
	url+="&stime=" + urlParams["stime"];
    }
    if ('verify_SSL' in urlParams){
	url = url + "&verify_SSL=" + urlParams['verify_SSL'];
    }

    //url = 'cors.pl?method=GET&url=' + encodeURI(url);

    console.log( 'ls::tracetree ' + url );

    
    //window.open( url, '_blank') ;
    $('#trace').html(
	'<iframe id="itrace" width=100% height=1000 src="about:blank" frameborder="0" scrolling="yes"></iframe>');
    document.getElementById('itrace').src = url;
    $('#tabs').tabs({'active': 2});

    
}

function tracetree_os(server, from, to, start_time, end_time){
    //tracetree_os( srv, mno){
      
    var url='tracetree.html?mahost=' + server;
    url+="&from=" + from;
    url+="&to=" + to;
    url+="&start=" + start_time;
    url+="&end=" + end_time;
    if ( urlParams["stime"] ) {
	url+="&stime=" + urlParams["stime"];
    }
    if ('verify_SSL' in urlParams){
	url = url + "&verify_SSL=" + urlParams['verify_SSL'];
    }
    if ('api' in urlParams){
	url = url + "&api=" + urlParams['api'];
    }

    console.log( 'ls::tracetree ' + url );

    $('#trace').html(
	'<iframe id="itrace" width=100% height=1000 src="about:blank" frameborder="0" scrolling="yes"></iframe>');
    document.getElementById('itrace').src = url;
    $('#tabs').tabs({'active': 2});
    
}

$(document).ready( function(){
    $(function(){
	$( "#tabs" ).tabs();
    } );

    // (window.onpopstate = function () {
    var match,
        pl     = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
        query  = window.location.search.substring(1);
    var from,
	to;

    var parm='';

    while (match = search.exec(query))
	urlParams[decode(match[1])] = decode(match[2]);

    var start_time; // in epoch
    if ( urlParams['time-start']){
	start_time = new Date( urlParams['time-start'] ) / 1000;
    } else { // yesterday
	var now= new Date() /1000;
	var day=  24*3600;
	start_time = Math.floor(now / day) * day;
    }
    
    var end_time; // in epoch
    if ( urlParams['time-end']){
	end_time = new Date( urlParams['time-end'] ) / 1000;
    } else { // start_time + 24h
	var day=  24*3600;
	end_time = start_time + day;
    }
	
    if ( urlParams['mahost']){
	let base= 'https://' +  urlParams['mahost'];
	var html='<button onclick="';
	html+="fetch_ls('https://ps-west.es.net/lookup/activehosts.json'," + start_time + ');">';
//	html+="fetch_base('" + base + "/esmond/perfsonar/archive'" + ');">';
	html+='Fetch MA list</button>';
	$("#ma").html(html);


	if ( urlParams['api'] === 'opensearch' ) {
	    // Fetch content applying Opensearch API
	    fetch_base_os( base, start_time, end_time);
	} else {
            fetch_base( base + "/esmond/perfsonar/archive/", start_time, end_time );
	}
    } else {
	fetch_ls('https://ps-west.es.net/lookup/activehosts.json', start_time);
    }
    // } );

} );

/* function sortTable(table, col, reverse) {
    var tb = table.tBodies[0], // use `<tbody>` to ignore `<thead>` and `<tfoot>` rows
        tr = Array.prototype.slice.call(tb.rows, 0), // put rows into array
        i;
    reverse = -((+reverse) || -1);
    tr = tr.sort(function (a, b) { // sort rows
        return reverse // `-1 *` if want opposite order
            * (a.cells[col].textContent.trim() // using `.textContent.trim()` for test
                .localeCompare(b.cells[col].textContent.trim())
               );
    });
    for(i = 0; i < tr.length; ++i) tb.appendChild(tr[i]); // append each row in order
}

function makeSortable(table) {
    var th = table.tHead, i;
    th && (th = th.rows[0]) && (th = th.cells);
    if (th) i = th.length;
    else return; // if no `<thead>` then do nothing
    while (--i >= 0) (function (i) {
        var dir = 1;
        th[i].addEventListener('click', function () {sortTable(table, i, (dir = 1 - dir))});
    }(i));
}

function makeAllSortable(parent) {
    parent = parent || document.body;
    var t = parent.getElementsByTagName('table'), i = t.length;
    while (--i >= 0) makeSortable(t[i]);
}

		      */

function search_table_ma() {
    search_table('ma_in', 'ma_table');
}
function search_table_peer() {
    search_table('peer_in', 'peer_table');
}

function search_table(input,table) {
    // Declare variables
    var input, filter, table, tr, td, i;
    input = document.getElementById(input);
    filter = input.value.toUpperCase();
    table = document.getElementById(table);
    tr = table.getElementsByTagName("tr");

    // Loop through all table rows, and hide those who don't match the search query
    for (i = 0; i < tr.length; i++) {
	//td = tr[i].getElementsByTagName("td")[0];
	var hit=false;
	$.each(tr[i].getElementsByTagName("td"), function( index, td ){
	    if (td) {
		if ( td.innerHTML.toUpperCase().indexOf(filter) > -1) {
		    hit=true;
		}
	    } else {
		hit=true;
	    }
	} );
	if ( hit === true){
            tr[i].style.display = "";
	} else {
            tr[i].style.display = "none";
	}
    }
}

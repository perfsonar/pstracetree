var tree;    // generated traceroute topology
var positions=[]; // last position of nodes
var tr_data; // the ingested json stats
    var urlParams={};
var timeline; // timeline object

var mother={range:86400};  // the mother slice of traceroutes in ms
var current_slice=mother;  // the current top level slice
var in_slice=mother;   // the current zoomed in graph
var slices=[]; // slices
var update_time;  // last time graph was updated in ms
var update_interval=3000;  // update graph every .. ms
var last_rangechange;
var last_select;
slices.push(mother);

var msts=1;  // convert s to ms
var slice_default=10;  // number of subslices 
var slide_max=100; // max_value on slice slider 

var destination='';

// object to store slice info


var node_colors=["#f7fbff",
		 "#deebf7",
		 "#c6dbef",
		 "#9ecae1",
		 "#6baed6",
		 "#4292c6"];
		 // "#2171b5"];
		 // "#08519c"];


function create_limits(nodes, colors){
    var stats = new Stats();
    for ( node of nodes){
	if ( node.n !== undefined )
	    stats.add(node.n);
    }

    // var digits = new Integer(stats.max()).toString().length;
    // var max=Math.pow(10, digits);
    // var step=max / colors.length;
    var step=stats.max() / colors.length;
    var limits=[];
    var limit=0;
    for ( i in colors){
	limits.push(limit);
	limit += step;
    }
    return limits;
}

function taint_nodes(nodes, colors, limits){
    for ( nix in nodes){
	if ( nodes[nix].n !== undefined ){
	    for ( var lim= limits.length -1; lim >= 0; lim-- ){
		if (  nodes[nix].n >= limits[lim] ){
		    // nodes[nix].color={background:colors[lim]};
		    if ( ! nodes[nix].color)
			nodes[nix].color={};
		    nodes[nix].color.background=colors[lim];
		    break;
		}
	    }
	    /* var lim=0;
	    while ( nodes[nix].n > limits[lim]){
		lim++;
	    }
	    nodes[nix].color=colors[lim]; */
	}
    }
}


function create_legend( elem, colors, limits){
    var table= "<table id=legend>\n";

    var limit=0;
    
    for ( i in  colors) {
	var lim= limits[i].toPrecision(3);
	table+= '<tr><td bgcolor="' + colors[i] + '" title=' + lim + '>' + lim + '</td>' + "\n";
    }
    document.getElementById(elem).innerHTML = table + '</table>';
}

			      
			      
// extract traceroute data from existing slices
function tr_slice( start, range){
    var extract=[];
    var startms=start;
    var endms=startms+range;

    for ( slice of slices ){
	if ( slice.tr_data && slice.start <= start
	     && (slice.start+slice.range) >= endms){
	    for ( tr of slice.tr_data ){ // if no data in interval continue until at least one
		if ( tr.ts >= startms && ( tr.ts <= endms || extract.length <= 0 ) ){
		    extract.push(tr);
		}
	    }
	    return extract;
	}
    }
}



// make slice
// *** too complex so split up between in and out slices 
function tr_slice_make( slice, slice_no, level){
    // sub_slice - bool
    var upslice= level === 'out';
    var sub_slice = level === 'in';
    var ca_start= slice.start;

    var new_range = slice.range;
    if ( sub_slice ){
	new_range = compute_slice_size( slice.range );
	ca_start = slice.start + slice_no * new_range;
    } else if ( upslice ){
	new_range = compute_mother_size(slice.range);
    } else if ( level === 'same' ){ 
	ca_start = slice.start + ( slice_no - slice.slice_no ) * new_range;
    }
    
    //var start = slice.start + ( slice_no - slice.slice_no ) * new_range;
    var now=new Date().getTime() / 1000;
    if ( ( ca_start + new_range ) > now )  // adjust to end
	ca_start = now - new_range;
    var start= Math.floor(ca_start / new_range) * new_range; // round off to nearest unit

    var n_slice={ start: start, range: new_range, end: start + new_range,
		  slice_no: 0 };

    var slice_count=0;
    if ( sub_slice ){
	slice_count=slice.slice_count;
    } else if ( slice.mother !== undefined) {
	slice_count=slice.mother.slice_count;
    } else if (! upslice) {
	slice_count=slice.slice_count;
    }

    // hook up in slice_tree
    if ( sub_slice ){
	n_slice.mother=slice;
    } else if ( upslice ){
	slice.mother=n_slice;
    } else {
	n_slice.mother=slice.mother;
    }
 
    n_slice.slice_count = compute_slice_count( n_slice.range );
    if ( n_slice.mother === undefined ){ // next on the mother level
	current_slice=n_slice;
    }

    var extract = tr_slice( start, new_range);
    if ( extract.length > 0 ){
	n_slice.tr_data=extract;
	n_slice.slice_no = slice_no;
	// n_slice.slice_count=slice_count;
	
	tr_slice_show( n_slice);
    } else { // fetch new data - new motherslice or slice outside data
	fetch_and_plot_json( n_slice, urlParams.mahost );
    }
    in_slice=n_slice;
    slices.push( n_slice);
    // $("#timeslot").val( Math.floor( slice_no * slide_max / n_slice.slice_count ) );

}


function tr_slice_show(slice){
    if ( slice.tr_data ){
	var tree;
	if ( ! slice.tree)
	    slice.tree=traceroute_sum(slice.tr_data);

	var limits=create_limits(slice.tree.nodes, node_colors);
	taint_nodes( slice.tree.nodes, node_colors, limits);
	create_legend('legend', node_colors, limits);

	plot_tree_json(slice.tree, 'treetainer', false);
	report_stats( slice.tree);
	report_trace( 'diff', slice.tr_data);
	plot_stats_hops(slice.tree);
	in_slice=slice;
	show_time_slice(slice);
	update_time = new Date().getTime();


	if ( slice.range > 1 )  // don't zoom timeline too close
	    update_timeline_window(slice);

    } else {
	alert("empty slice for slice " + slice.slice_no + ' starting ' + slice.start);
    }
}



function zoom_to_slice(slice, level){
    if (slice){
      in_slice=slice;
      current_slice=slice;
	// $("#timeslot").val(0);
	tr_slice_show( slice);
	show_time_slice(slice);
    } else { 
	tr_slice_make(current_slice, 0, level );
	// tr_slice_make(current_slice, $("#timeslot").val() * current_slice.slice_count / slide_max, false );
      }
      var stop=1;
}




function go_to_slice( slice, level, delta){
    if ( slice ){
	var mom=slice; // in case this is first zoom
	if ( slice.mother !== undefined ){
	    mom=slice.mother;
	} 

	var sno=0;
	if ( 'slice_no' in slice )
	    sno=slice.slice_no + delta;
        if (mom)
	    document.getElementById('timeslot').value = Math.floor( sno * slide_max / mom.slice_count );
						      
	tr_slice_make( slice, sno, level );

    }
}

// compute slice size to fit time units

function compute_slice_size(range){
    var new_range;
    for ( slice of [10, 60, 600, 3600, 3600*24, 3600*24*7] ){
	slice_count = range/slice;
	if ( slice_count > 3 && slice_count < 25 )
	    return slice;
    }
    return Math.floor(range/10);
}

// compute slice_count for an interval
function compute_slice_count(range){
    var slice_count=10;
    if ( ( range/86400 ).toFixed(1) == 1 )
	slice_count = 24;
    else if ( ( range/3600 ).toFixed(1) == 1 )
	slice_count = 6;
    else if ( ( range/60 ).toFixed(1) == 1 )
	slice_count = 6;
    return slice_count;
}

// compute interval for mother slice

function compute_mother_size(sub_range){
    var range=10*sub_range;
    if ( Math.floor( sub_range / 86400 ) == 1 )
	range=7*sub_range;  // week
    else if ( Math.floor( sub_range / 3600 ) == 1 )
	range=24*sub_range; // weekday
    else if ( Math.floor( sub_range / 60 ) == 1 )
	range=60*sub_range; // hour
    return range;
}

// sum up traceroute data from PS MA
// making a graph for visjs and a stats table

function traceroute_sum(tr_data){
    var nodes=[{label:'start', id:'start', hop:0, color:{background:'#20C020'}}];
    var node_ix=[]; // index in nodes
    var edges=[];
    var stats=[];
    var stats_ix=[];
    var routers=[];  // previous hop routers
    var prouters=[];  // previous hop routers
    var loss=[];
    routers['start']=1;
    var start, range;

    for (let tr of tr_data){  // array of traceroutes
	var last_node=0, all_hops=[];
	if (!start) start=tr.ts;
	range=tr.ts-start;

	for (let hop of tr.val){ // array of hops
	    hop.color={background:"#4292c6"};
	    all_hops.push(hop);
	    if (hop.ip){  // weed out trailing '*'
		last_node=all_hops.length-1;
	    }
	}
	var real_hops=all_hops.slice(0,last_node+1); 
	if ( real_hops[last_node].id !== destination){
	    real_hops[last_node].color.border='AA1111';
	}
	
	for ( let hop of real_hops ){
	    var pttl=0;

	    //var id=hop.ttl + '-' + hop.ip;
	    var id=hop.ttl + '*';
	    if (hop.ip) {
		id=hop.ip;
	    } 
	    var label=id;
	    if ( hop.hostname){
		label=hop.hostname;
	    }

	    if ( hop.ttl !== pttl ){ // new ttl level
		prouters=routers;
		routers=[];
	    }
	    tr_edges(prouters, id, edges);
	    
	    if ( ! routers[id] ) { routers[id]=0; }
	    routers[id]++;
	    
	    if ( ! ( id in node_ix ) ){
		nodes.push({
		    "label": label,
		    "id": id,
		    "n": 0,
		    "hop": hop.ttl
		});
		node_ix[id] = nodes.length - 1;
	    } 
	    nodes[node_ix[id]].n++;
	    if ( 'color' in nodes[node_ix[id]] ){
		nodes[node_ix[id]].color=node.color;
	    }
	    if ( hop.ip){
		update_stats( id, hop, tr.ts, stats, stats_ix);
	    } else {
		loss[hop.ttl] = ++ loss[hop.ttl] || 1 ;
	    }
	    pttl=hop.ttl;
	}
	prouters=[];
	routers=[];
    }
    // change edges to array
    var edgelist=[];
    Object.keys(edges).forEach(function (key) {    
	edgelist.push(edges[key]);
    });
    for ( stat of stats){ // expand stats statistics
	stat.avg=stat.rtt.avg();
	stat.min=stat.rtt.min();
	stat.max=stat.rtt.max();
	stat.sdv=stat.rtt.sdv();
    }
    
    return { "nodes": nodes, "edges": edgelist, "stats": stats, "start":start, "range":range , "loss":loss}
}

// build edges
function tr_edges( prouters, to, edges ){
    for ( from in prouters){
	edge = from + "-" + to;
	if ( ! ( edge in edges ) ){
	    edges[edge]={
		"id": edge,
		"from": from,
		"to" : to,
		"value": 0,
		"color":"#000000"
	    };
	}
	edges[edge].value++;  // use count
    }
}

// update stats
function update_stats(hopid, hop, ts, stats, stats_ix){
    //var hopid=hop.ttl + '-' + hop.ip;
    var ix;
    if ( hopid in stats_ix){
	ix=stats_ix[hopid];
    } else {
	ix=stats.length;
	stats_ix[hopid]=ix;
    }
    
    if ( ! ( ix in stats ) ){
	stats[ix]={
	    address: hop.ip,
	    router: hop.ip,
	    return_report: "",
	    seen: 0,
	    "loss": 0,
	    hop: hop.ttl,
	    rtt: new Stats()
	}
    }
    stats[ix].seen++;
    stats[ix].rtt.add(hop.rtt);
    if ( hop.hostname ){
	stats[ix].router = hop.hostname;
    }

    var d = new Date(ts*1000); // ms
    var t = pad(d.getDate(),2) + ' ' + pad(d.getHours(),2) + ':'
	+ pad(d.getMinutes(),2) + ':' + pad(d.getSeconds(),2);
    if ( typeof stats[ix].first_seen === "undefined" ){
	stats[ix].first_seen=t;
    }
    stats[ix].last_seen=t;
}

/* $(function () {
   fetch_and_plot();
   }); */

function fetch_and_plot(tpath) {
    // Get trace data from <pre> element of input path
    //var tpath = $("[name='tpath']").val();
    $("pre").load( tpath + " pre", function( response, status, xhr ) {
	if ( status == "success" ) {
	    // Web page of input path loaded and parsed. Start ploting.
	    plot_trace();
	} else if ( status == "error" ) {
	    var msg = "Sorry but there was an error: ";
	    $( "#error" ).html( msg + xhr.status + " " + xhr.statusText );
	}
    });
    
}

function fetch_and_plot_gv() {
    // Get trace data from <pre> element of input path
    var tpath = $("[name='gvpath']").val();
    var jqxhr = $.get(tpath, function( data){
	plot_tree(data);
    },'text')
	.fail(function( jqxhr, textStatus, error) {
	    console.log( "##4 Failed to get "+ tpath + " error " + textStatus + ", " + error);
	});

}

function os2esmond_traceroute(os_json){
    // Convert traceroute json results from Opensearch to esmond style
    var esmond_json=[];
    
    for (let tr=0; tr < os_json.hits.hits.length; tr++) {
	// A traceroute results is available
	if(urlParams['ip-version'] !== os_json.hits.hits[tr]._source.test.spec['ip-version'] )
	   // Wrong ip version. Skip.
	   continue;
	   
	let esmond_tr={};
	esmond_tr.ts = Date.parse(os_json.hits.hits[tr]._source['@timestamp']);
	esmond_tr.val = []; 
	for (let tr_query=0; tr_query < os_json.hits.hits[tr]._source.result.json.length; tr_query++) {
	    // Traceroute query result available (ref '-q' option)
	    for (let hn=0; hn < os_json.hits.hits[tr]._source.result.json[tr_query].length; hn++) {
		// Hop found
		let hop={};
		hop.ttl = hn + 1;
		hop.query = 1;     // Unclear if required...
		hop.success = 1;   // Unclear if required...
		if( typeof os_json.hits.hits[tr]._source.result.json[tr_query][hn].ip != 'undefined' )
		    hop.ip = os_json.hits.hits[tr]._source.result.json[tr_query][hn].ip;
		if( typeof os_json.hits.hits[tr]._source.result.json[tr_query][hn].hostname != 'undefined' )
		    hop.hostname = os_json.hits.hits[tr]._source.result.json[tr_query][hn].hostname;
		if( typeof os_json.hits.hits[tr]._source.result.json[tr_query][hn].rtt != 'undefined' ) {
		    // Clean off "PT" prefix + "S" postfix and convert to milliseconds
		    hop.rtt = Number(os_json.hits.hits[tr]._source.result.json[tr_query][hn].rtt.slice(2, -1)) * 1000;
		}
	    	esmond_tr.val.push(hop);
	    }
	    // Add hop
	    esmond_json.push(esmond_tr);
	}
    }
    return esmond_json;
}

function fetch_and_plot_json(slice, base) {
    // Get trace data from <pre> element of input path
    document.getElementById('awaiting').style.display='block';

    show_time_slice(slice);
    in_slice=slice;
    // current_slice=slice;

    var tpath=base + '?';
    if (slice.start) tpath += '&time-start=' + Math.floor(slice.start);
    if (slice.range) tpath += '&time-range=' + Math.floor(slice.range);
    // if (slice.end) tpath += '&time-end' + slice.end;

    
    //document.getElementById("raw_button").onclick= function(){
    //	document.location.href="/js/traceraw.pl?mp=" + path[3] + "&index=" + path[1] +
    //	    "&dest=" + to + "&date=" + path[4]; // pick up when clicking button
    //}
    //document.getElementById("summary_button").onclick= function(){
    //	document.location.href="/" + to + "/sum/gap-sum-" + path[4] + ".html";
    //}

    var url = 'cors.pl?method=GET&url=' + encodeURI(tpath);

    if (urlParams['api'] == 'opensearch') {
	// Apply request cgi for Openseach archive
	url = 'get-tracetests.pl?mahost=' + base + '&from=' + urlParams['from'] + '&to=' + urlParams['to'] + '&start=' + urlParams['start'] + '&end=' + urlParams['end'];
    }

    if ('verify_SSL' in urlParams){
	url = url + "&verify_SSL=" + urlParams['verify_SSL'];
    }
    console.log('Fetching traceroutes via:' + url );
    
    var jqxhr = $.getJSON( url, function( tr_json){
	//	  plot_tree_json(reduce_graph(data));
	//	  plot_tree_json(collapse_nodes(data));

	slice.tr_data=tr_json;
	if (urlParams['api'] == 'opensearch') {
	    // Convert received Opensearch json structure into esmond-style
	    slice.tr_data= os2esmond_traceroute(tr_json);
	}
	
	tr_slice_show(slice);
	update_timeline(slice);

	//tr_data=data; //global variable
    })
	.fail(function( jqxhr, textStatus, error) {
	    msg= "##5 Failed to get "+ tpath + " error " + textStatus + ", " + error;
	    console.log(msg);
	    alert(msg);
	});

}
function fetch_and_plot_topo(tpath) {
    // Get trace data from <pre> element of input path
    //var tpath = $("[name='gvpath']").val();

    var path=tpath.split("/");
    var dest=path[path.length-1];
    dest=dest.replace(/\d\.json$/,"");
    document.getElementById("raw_button").onclick= function(){
        document.location.href="/js/traceraw.pl?mp=" + path[3] + "&index=" + path[1] +
            "&dest=" + dest + "&date=" + path[4]; // pick up when clicking button
    }
    document.getElementById("summary_button").onclick= function(){
        document.location.href="/" + path[1] + "/sum/gap-sum-" + path[4] + ".html";
    }
            
      var jqxhr = $.getJSON(tpath, function( data){
//        plot_tree_json(reduce_graph(data));
//        plot_tree_json(collapse_nodes(data));
          plot_tree_json(data, 'treetainer', false);
          report_stats(data);
          plot_stats_hops(data);
          tr_data=data;
      })
        .fail(function( jqxhr, textStatus, error) {
            console.log( "##6 Failed to get "+ tpath + " error " + textStatus + ", " + error);
        });

}


function plot_tree(data){
    var tracedata = data.split("\n");
    var node_re=/^\s*"*([\w\d\.\:_]+)"*\s+\[.*color="([^"]+)/;  // "154.54.42.85" [ fillcolor="#f7fbff" ]
    var edge_re=/^\s*"*([\w\d\.\:_]+)"*\s+->\s+"*([\w\d\.\:_]+)"*.*color="([^"]+)/; // start -> "128.39.65.25" [ color="#000000" ]
    // var edge_re=/(\d+)\.(\d+)\.(\d+)\.(\d+)/;
    // var nodes=new vis.DataSet();
    //var edges=new vis.DataSet();
    var nodes=[];
    var edges=[];
    var node,from, to, color;
    var res=[];
    $.each( data.split("\n"), function(index, line){
	if ( res=edge_re.exec(line) ){
	    edges.push({id: res[1]+'-'+res[2], from: res[1], to: res[2], color: res[3] } );
	} else if (res=node_re.exec(line) ) {
	    nodes.push({ id: res[1], label: res[1], color: res[2] } );			  
	}
	
    });
    // var opts={ physics: { solver:'hierarchicalRepulsion'} };
    var opts={
	//physics: { solver:'barnesHut'},
	physics: { solver:'repulsion'},
	edges: {
	    arrows: { middle:{ enabled: true, scaleFactor:1, type:'arrow'} }
	}
    };
    var container = document.getElementById('treetainer');
    tree=new vis.Network( container, {nodes: nodes, edges: edges}, opts );
    var pausekrok=1;
    
}

var last_tr=null, last_tr_bgc; // remember color change on tr line     
var topology;



//================================================================================


// show timespan of slice


function update_slice(){
    // update_timeslotOut();
    // return;
    
    var meter=document.getElementById('timeslot').value;
    var slice_no=Math.floor(meter * current_slice.slice_count / slide_max);
    var delta= slice_no - in_slice.slice_no;
    var now = new Date().getTime();
    
    if ( delta !== 0 && (now - update_time) > update_interval){
	go_to_slice( current_slice, 'in', delta );
    }
}

function update_timeslotOut(){
    var timeslot=document.getElementById('timeslot').value;
    document.getElementById('timeslotOut').innerHTML=
		( ' ' + ( Math.floor(timeslot * current_slice.slice_count / slide_max) + 0) ).slice(-2)
	+ '/' + (' ' + current_slice.slice_count).slice(-2);
}

function show_time_slice(slice){

    var start=new Date(slice.start*1000);
    var end=new Date(slice.end*1000);
    var span = document.getElementById('timespan');
    var spanstart = document.getElementById('timestart');
    var end_day='';
    var day=86
    var t_range=readable_range(slice.range);
    
    if ( ( slice.end - slice.start ) > 86400 ){
	end_day= end.toLocaleDateString() + ' ';
    }
	spanstart.innerHTML= start.toLocaleDateString() + ' ' + start.toLocaleTimeString();
	span.innerHTML= ' + ' + t_range /* + end.toLocaleTimeString() */;

    // document.getElementById('timeslot').value = Math.floor( slice.slice_no * slide_max / current_slice.slice_count );
    
    document.getElementById('current_span').innerHTML=readable_range(current_slice.range);
    update_timeslotOut();

}

function readable_range(secs){
    var t_range='';
    if ( secs < 60 )
	t_range = (secs).toFixed(0) + 's';
    else if ( secs < 3600)
	t_range = (secs / 60).toFixed(2) + 'm';
    else if ( secs < 86400)
	t_range = (secs / 3600).toFixed(2) + 'h';
    else if  ( secs < 86400*7)
	t_range = (secs / 86400).toFixed(1) + 'd';
    else
	t_range = (secs / 86400 / 7 ).toFixed(1) + 'w';
    return t_range;
}


// show the time span of actual traceroutes 
function show_time_span(tr_data){
    var min, max;
    for ( tr of tr_data){
	if ( !min || tr.ts < min ) min = tr.ts;
	if ( !max || tr.ts > max) max = tr.ts;
    }
    var start=new Date(min * 1000);
    var end=new Date(max * 1000);
    var span = document.getElementById('timespan');
    var end_day='';
    
    if ( ( max - min ) > 86400 ){
	end_day= end.toLocaleDateString() + ' ';
    }
    span.innerHTML= start.toLocaleDateString() + ' ' + start.toLocaleTimeString()
	+ ' - ' + end_day + end.toLocaleTimeString();

}

//--------------------------------------------------------------------------------
// timeline functions

function init_timeline(){
    var options = {'configure': false,
		   maxHeight: 200,
		   multiselect: true,
		   stack: false};
    var container = document.getElementById('timeline');
    timeline = new vis.Timeline(container, {}, options);

    timeline.on('doubleClick', function(parms){
	console.log ('dblclick ' + parms.time + ' snapped ' + parms.snappedTime );
	if ( last_select ){
	    clearInterval(last_select);
	}
	zoom_by_factor(parms, 2);
    } );

    timeline.on('select', function(parms){
	console.log ('select ' + parms.items.length + ' type ' + parms.event.type  );
	if ( parms.items.length > 1 ){
	    start = parms.items[0];
	    range = parms.items[parms.items.length-1] - start;
	    zoom_by_timeline_slice ( start, range);
	} else if ( parms.items.length === 1){ // single tr :
	    if ( last_select ){
		clearInterval(last_select);
	    }
	    last_select = setTimeout(
		zoom_by_timeline_slice( parms.items[0], 1 ), update_interval ); // 3 sek range
	}
    } );

    timeline.on('timechanged', function(parms){
	if ( parms.id === 'end' ){
	    var start = timeline.getCustomTime( 'start') / 1000;
	    // var end = timeline.getCustomTime( 'end') / 1000;
	    var end = parms.time / 1000;
	    var range = end - start;
	    zoom_by_timeline_slice ( start, range);
	}
    } );

    timeline.on('rangechanged', function( parms){
	
	if ( parms.byUser ){ // adjust the window to middle 1/3
	    var right=new Date().getTime(); // now
	    var rangems = ( parms.end - parms.start ) / 3;
	    if ( parms.end < right ) right = parms.end;

	    var range = rangems/1000;
	    var start = ( right - rangems) / 1000;
	    // var left = parms.start / 1000;

	    // var start = left + range;
	    // var start = right/1000 - 2 * range;
	    
	    if ( parms.event.type === 'panend' ){ // just drag
		zoom_by_timeline_slice( start, range );
	    } else if ( parms.event.type === 'wheel' ){
		if ( last_rangechange ){
		    clearInterval(last_rangechange);
		}
		last_rangechange = setTimeout( zoom_by_timeline_slice( start, range) , update_interval );
		console.log( 'start: ' + parms.start + ' end: ' + parms.end + ' byuser ' + parms.byUser);
	    }
	    timeline.removeCustomTime('newstart');
	    timeline.removeCustomTime('newend');

	    timeline.redraw();
	}
	
	timeline.redraw();   // ... probably not optimal to do this here...

    } );

    timeline.on('rangechange', function( parms){
	if ( parms.byUser){
	    var win = timeline.getWindow();
	    var left = win.start.getTime();
	    var range = ( win.end.getTime() - left ) / 3;
	    var start = left + range;
	    var end = start + range;
	    
	    try { timeline.getCustomTime( 'newstart'); } // make new customtime
	    catch(err) {  
		timeline.addCustomTime(undefined,'newstart');
		timeline.addCustomTime(undefined,'newend');
		timeline.setCustomTimeTitle('New start', 'newstart');
		timeline.setCustomTimeTitle('New end', 'newend');
	    }
	    timeline.setCustomTime( start, 'newstart');
	    timeline.setCustomTime( end, 'newend');
	}
    } );


    timeline.addCustomTime(undefined,'start');
    timeline.addCustomTime(undefined,'end');
    timeline.setCustomTimeTitle('Start', 'start');
    timeline.setCustomTimeTitle('End', 'end');

    /*
    Object.keys(window).forEach(key => {
    if (/^on/.test(key)) {
        window.addEventListener(key.slice(2), event => {
            console.log(event);
        });
    } 
    });*/
}


function show_timeline(tr_data){
    var items=[];
    var id=0;
    $.each(tr_data, function( ix, shot){
	id ++;
	var t=new Date( shot.ts * 1000);
	items.push( {'id': shot.ts, 'type': 'point', 'start':t });
		     /*, 'content': t.toLocaleTimeString()} */
    } );
    var vis_items = new vis.DataSet( items );

    timeline.setItems(vis_items);

}

function update_timeline(n_slice){
    var ids=[], items=[];
    var min=100*365*86400, max=0;
    for ( slice of slices ){
	if ( slice.tr_data ){
	    for ( tr of slice.tr_data ){
		if ( ! ids[tr.ts] ){
		    var t=new Date( tr.ts * 1000);
		    items.push({ id: tr.ts, 'type': 'point', 'start':t });
		    ids[tr.ts]=true;
		    if ( tr.ts > max ) { max = tr.ts; }
		    if ( tr.ts < min ) { min = tr.ts; }
		}
	    }
	}
    }
    items.sort( function(a,b){
	return a.id - b.id});
    var vis_items = new vis.DataSet( items );

    timeline.setItems(vis_items);

    var r=timeline.getItemRange();    
    //timeline.setWindow(r.min, r.max);
}

function update_timeline_window(slice){ // set selection in middle 1/3
    var start=slice.start*1000;
    var end= slice.end*1000;
    var range=  slice.range * 1000;
    var startD= new Date( start - range );
    var endD=new Date( start + 2 * range );
    timeline.setCustomTime( start, 'start');
    timeline.setCustomTime( end, 'end');
    timeline.setWindow(start-range, end+range);
    document.getElementById('awaiting').style.display='none';
}

function zoom_by_rangechange(){
    zoom_by_timeline( timeline, 'out');
    last_rangechange= undefined;
}

function zoom_by_factor(parms, factor){
    var start, range;
    var win=timeline.getWindow();
    start= win.start.getTime() / 1000;
    wrange= ( win.end.getTime() / 1000 - start );
    var center= parms.time / 1000;
    var range = wrange / 3 / factor;
    start = center - range/2;	
    zoom_by_timeline_slice ( start, range);
}


function zoom_by_timeline(timeline, direction){
    var start, range;
    if ( direction === 'out' ){ // zoom to middle 1/3
	var win=timeline.getWindow();
	var left= win.start.getTime() / 1000;
	range= ( win.end.getTime() / 1000 - left );
	start= left + range;
    } else if (direction === 'in' ){
	var items = timeline.getSelection();
	if ( items.length > 0){
	    start = items[0];
	    range = items[items.length-1] - start;
	} else {
	    var startms = timeline.getCustomTime( 'start');
	    var endms = timeline.getCustomTime( 'end');
	    if ( start !== pCustomTime.start || end != pCustomTime.end){
		start = startms/1000;
		range = endms/1000 - start;
	    }
	}
    } else {
	console.log('invalid direction : ' + directon );
    }
    
    zoom_by_timeline_slice ( start, range);
}


function zoom_by_timeline_slice ( start, range){
    document.getElementById('awaiting').style.display='block';
	
    var n_slice={start:start, range: range, end: start + range};

    var extract = tr_slice( start, range);
    if ( extract.length > 0 ){
	n_slice.tr_data=extract;
	n_slice.slice_no = compute_slice_count( range );
	tr_slice_show( n_slice);
    } else { // fetch new data - new motherslice or slice outside data
	fetch_and_plot_json( n_slice, urlParams.mahost );
    }

    slices.push(n_slice);


}
function scroll_by_step(step){
    var p_start = timeline.getCustomTime( 'start')/1000;
    var p_end = timeline.getCustomTime( 'end')/1000;
    var range=p_end - p_start;
    zoom_by_timeline_slice ( p_start + range * step, range);
    
}

//--------------------------------------------------------------------------------

function plot_tree_json(data, divid, copy){
    var nodes=[];
    var edges=[];
    var node,from, to, color;
    var res=[];

    // var opts={ physics: { solver:'hierarchicalRepulsion'} };
    var opts={
	physics: { solver:'barnesHut',
		   //physics: { solver:'repulsion'},
		   stabilization:{ enabled:true, iterations:10 },
		   timestep:0.3 },
	layout: {improvedLayout:true},
	nodes: {},
	edges: { scaling: {max: 8},
		 arrows: { middle:{ enabled: true, scaleFactor:1, type:'arrow'} }
	       },
	interaction: { hover:true, hoverConnectedEdges: true, multiselect: false, navigationButtons: true }
    };

    var container = document.getElementById(divid);

    if( data.nodes.length < 1 ){
	container.innerHTML='<h2>Empty data set - missing data ?</h2>';
	return(-1);
    }			    

    fix_positions(data.nodes, data.stats, container);
    nodes=new vis.DataSet(data.nodes);
    edges=new vis.DataSet(data.edges);
    topology={nodes:nodes, edges:edges};

    if (copy){
	new vis.Network( container, topology, opts );
    } else if ( tree ) {
	// tree.destroy();
	update_tree_json(tree, topology);
    } else {
	tree=new vis.Network( container, topology, opts );

	tree.on("hoverNode", function (params) {
            console.log('hoverNode Event:', params, params.node);
	    if ( last_tr !== null)
		last_tr.style.backgroundColor=last_tr_bgc;
	    last_tr=window.parent.document.getElementById(params.node);
	    if ( last_tr !== null ){
		last_tr_bgc=last_tr.style.backgroundColor;
		last_tr.style.backgroundColor="#e000a0";
	    }

	    // .css("background-color","#c000a0");
	});
	tree.on("selectNode", function (params) {
	    var adr=params.nodes[0];

	    var tr=window.parent.document.getElementById(adr);
	    //console.log('select node in table tr: ' + tr);
	    // if ( tr !== null)
	    //    tr.scrollIntoView(true);
	    //format_pollIntoView(true);
	    format_popup(adr);
	    // tree.enableEditMode();

	    // location.href="#" + params.node;
            console.log('select Event:', params);
	});

	tree.on("oncontext", function (params) {
	    var adr=params.nodes[0];
	    
	    var tr=window.parent.document.getElementById(adr);
	    if ( tr !== null)
		tr.scrollIntoView(true);
	    // tree.enableEditMode();

	});
	
	
	tree.on("dragStart", function (params) {
	    var nodel= tree.getSelectedNodes();
	    var ret=nodes.update([{id:nodel[0], fixed:false}]);
	    console.log('setselection ' + nodel + ': ' + ret);
	    console.log('dragstart Event:', params);
	});

	tree.on("dragEnd", function (params) {
	    var nodel= tree.getSelectedNodes();
	    var ret=nodes.update([{id:nodel[0], fixed:true}]);
	    //var ret=tree.setSelection({ nodes: nodel }, {fixed:true} );
	    console.log('setselection ' + nodel + ': ' + ret);
	    console.log('dragend Event:', params);
	});

	var pausekrok=1;
    }
    
}

function update_positions(network){
    var pos = network.getPositions();
    for ( let p of pos ){
	positions[p.id]=p;	    
    }
	
}

function update_tree_json(network, data){
    var g_nodes=network.body.data.nodes._data,
	g_edges=network.body.data.edges._data,
	positions = network.getPositions(),
	g_ids = Object.keys(g_nodes),
	n_ids = Object.keys(data.nodes._data);
    var ret;
    
    for ( var n_id of n_ids){
	if ( ! ( g_ids.includes(n_id) ) ){ // new node
	    try {
		ret=network.body.data.nodes.update( data.nodes._data[n_id] ); }
	    
	    catch(err) {
		alert ( 'error in update_tree ' + err);  }
	    console.log ('add ' + n_id + ' : ' + ret);
	}
    }
    for ( var g_id of g_ids){
	if ( ! ( n_ids.includes(g_id) ) ){ // remove node
	    try {
		ret=network.body.data.nodes.remove( g_nodes[g_id] ); }
	    catch(err) {
		alert ('error in update_tree ' + err) }
	    console.log ('remove ' + g_id + ' : ' + ret);
	}
    
    }

    var eg_ids = Object.keys(g_edges),
	en_ids = Object.keys(data.edges._data);
    
    for ( var en_id of en_ids){
	if ( ! ( eg_ids.includes(en_id) ) ){ // new node
	    try {
		ret=network.body.data.edges.update( data.edges._data[en_id] ); }
	    
	    catch(err) {
		alert ( 'error in update_tree ' + err);  }
	    console.log ('add ' + en_id + ' : ' + ret);
	}
    }
    for ( var eg_id of eg_ids){
	if ( ! ( en_ids.includes(eg_id) ) ){ // remove node
	    try {
		ret=network.body.data.edges.remove( g_edges[eg_id] ); }
	    catch(err) {
		alert ('error in update_tree ' + err) }
	    console.log ('remove ' + eg_id + ' : ' + ret);
	}
    
    }

}

// reduce number of arcs in graph google/amazon

var max_parallel=5;

// only accept first n nodes per hop
function reduce_graph(data){
    var ok_nodes=new Object();
    var nodes=[];
    var edges=[];
    var hops=[];

    // only accept first n nodes per hop
    for (let stats of data.stats){
	if ( ! hops[stats.hop]) hops[stats.hop]=0;
	if ( hops[stats.hop]++ <= max_parallel){
	    ok_nodes[stats.address]=true;
	}
    }
    for ( let node of data.nodes ){
	if ( node.id in ok_nodes){
	    nodes.push(node);
	}
    }
    for ( let edge of data.edges ){
	if ( edge.to in ok_nodes && edge.from in ok_nodes){
	    edges.push(edge);
	}
    }
    return {nodes:nodes, edges:edges, stats:data.stats};
}

// try to collappse massive parallell load sharing nodes

function collapse_nodes(data){
    var min_collapse=3;
    var c_factor=2;
    var nodes=[];
    var kanter=[];
    var hop=[];
    var collapse=[]; // node to be collapsed into another
    var collapsed=[]; // nodes that are beeing collapsed to

    for (let s1 of data.stats){
	hop[s1.address]=s1.hop;
	for (let s2 of data.stats){
	    var a1=s1.address;
	    var a2=s2.address;
	    if (a1 !== a2 && s1.hop === s2.hop
		&& prefiks(s1.address) === prefiks(s2.address)
	        && ( Math.abs(s1.seen - s2.seen)*c_factor < (s1.seen + s2.seen)/2) ){ // forskjell < c_faktor

		if ( ! ( collapse[a2] || collapse[a1] ) ){
		    var collto=a1;
		    while ( typeof  collapse[collto] !== 'undefined'){
			if ( collapse[collto] === collto ){
			    delete collapse[collto];
			} else {
			    collto= collapse[collto];
			}
		    }
		    collapse[a2]=collto;
		    if ( typeof collapsed[a1] === 'undefined'){
			collapsed[a1]=0;
		    } 
		    collapsed[a1]++;
		}
	    }
	}
    }
    for ( let node of data.nodes ){

	
	if ( collapse[node.id]){
	    if ( collapsed[collapse[node.id]] > min_collapse){
		continue;
	    } else {  // keep node
		delete collapse[node.id];
	    }
	}
	if ( collapsed[node.id] > min_collapse){
	    node.label=prefiks('C:'+node.id);
	}
	nodes.push(node);
    }
    for ( let edge of data.edges ){
	var from=edge.from, to=edge.to;
	var myedge=Object.assign({},edge); // copy of object
	var colla=false;
	if ( typeof collapse[to] !== 'undefined'){
	    myedge.to=collapse[to];
	    colla=true;
	}
	if ( typeof collapse[from] !== 'undefined'){
	    myedge.from=collapse[from];
	    colla=true;
	}
	if (  ! colla ){
	    kanter.push(myedge);
	}
    }

    // document collapses for popup
    for ( let stats of data.stats){
	stats.collapses='';
	if ( collapsed[stats.address] > 0 ){
	    for ( let s2 of tr_data.stats){
		if ( collapse[s2.address] === stats.address ){
		    stats.collapses += s2.address + "\n";
		}
	    }
	}
    }
    
    return {nodes:nodes, edges:kanter, stats:data.stats};

}

//
function prefiks(adr, length){
    var dot3=adr.lastIndexOf(".");
    return adr.substr(0,dot3);
}

// fix up nodes list to see if the graph could be drawn semi-geographically. 

function fix_positions(nodes, stats, container){
    last=stats.length-1;
    if (last >= 0){ // nodes available
	var starti = find_node(nodes, stats[0].address);
	var endi=find_node(nodes, stats[last].address);

	if ( starti !== null && endi !== null){
	    var minx=15, maxx= container.clientWidth-30;
	    var miny=15, maxy= container.clientHeight-30;

	    if ( stats[0].latitude <= stats[last].latitude){
		nodes[starti].y=maxy;
		nodes[endi].y=miny;
	    } else {
		nodes[starti].y=miny;
		nodes[endi].y=maxy;
	    }
	    if ( stats[0].longitude <= stats[last].longitude){
		nodes[starti].x=maxx;
		nodes[endi].x=minx;
	    } else {
		nodes[starti].x=minx;
		nodes[endi].x=maxx;
	    }
	    nodes[starti].fixed=true;
	    //	nodes[endi].fixed=true;
	}
    }
}

function find_pos(stats, adr){
    var lon=0, lat=0;
    for (var i=0; i< stats.length; i++){
	if (stats[i].id === adr)
	    return {lat: stats[i].latitude, lon:stats[i]};
    }
    return null;
}

function find_node(nodes, adr){
    for (var i=0; i< nodes.length; i++){
	if (nodes[i].id === adr)
	    return i ;
    }
    return null;
}

function report_stats(data){
    var html='';
    if ( data.start ){
	var d=new Date(data.start * 1000);
	html += '<h3>From ' + d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
	if (data.range){
	    html+= ' for ' + readable_range(data.range);
	}
	html += '</h3>';
    }
	
    html+='<table id="stats_table" class=sortable><thead><th>Hop<th>Router<th>Avg ms<th>Min<th>Max<th>Sdv<th>Loss%<th>Seen<th>Address<th>Start<th>End<th>Error</thead><tbody>';
    var phop;
    var sorted=data.stats.slice(); // copy array so not to destroy sequence
    sorted.sort( function( a, b){
	if ( a.hop === b.hop)
	    return b.seen - a.seen;
	else
	    return a.hop - b.hop;
    });
    
    $.each( sorted, function( index, point){
	var hops=point.hop;
	if ( phop == point.hop){ // space when same as previous
	    hops='';
	}
	phop=point.hop;
	html += '<tr id="' + point.address + '"><td>' + hops  + '</td>' +
	    '<td>' + point.router + '</td>' +
	    '<td align=right>' + point.avg.toFixed(1) + '</td>' +
	    '<td align=right>' + point.min.toFixed(1) + '</td>' +
	    '<td align=right>' + point.max.toFixed(1) + '</td>' +
	    '<td align=right>' + point.sdv.toFixed(1) + '</td>';
	html += '<td align=right>';
	if ( point.hop !== phop ){
	    if ( data.loss[point.hop] )
		html+=data.loss[point.hop];
	    else
		html+='0';
	}
	// '<td align=right>' + point.loss.toFixed(2) + '%</td>' +
	html += '<td align=right>' + point.seen + '</td>' +
	    '<td>' + point.address + '</td>' +
	    '<td>' + point.first_seen + '</td>' +
	    '<td>' + point.last_seen + '</td>' +
	    '<td>' + point.return_report + '</td>' +
	    '</tr>';
    });
    html += '</tbody></table>';
    
    
    $("#hoptablein", document).html(html)
	.ready( function(){
	    sorttable.makeSortable(document.getElementById("stats_table"))
	});
}

function report_trace(report_type, tr_data){
    var phash='', n=0;
    var html='';
    var variants={};
    var variantno=0;
    var thisvariant=0;
    $("#trace_table").html('<h2>Traceroute variants</h2>');
    
    for ( shot of tr_data){
	n++;
	var hash='';
	var last_ttl=0;
	for ( hop of shot.val){
	    if ( hop.ip){
		last_ttl=hop.ttl;
		hash+= hop.ttl + hop.ip;
	    }
	}
	if ( variants[hash] ) {
	    thisvariant=variants[hash];
	} else {
	    thisvariant=variantno;
	}
	if ( report_type !== 'diff' || hash !== phash ){
	    if ( n > 1 ){
		html +='--//-- ' + n + ' alike --//--';
	    }
	    if ( phash !== '' ){
		html += '</div>';
	    }
	    html += '<div style="vertical-align:top; margin-right:20px; display:inline-block">';
	    html += report_trace_entry(shot, last_ttl, thisvariant, variants[hash] );
	    n=0;
	}
	phash=hash;
	if ( ! variants[hash] ) {
	    variants[hash]=variantno;
	    variantno++;
	}
    }
    if ( n > 1 ){
	html+='--//-- ' + n + ' alike --//--';
    }
    $("#trace_table").append( html + '</div>' );
}

function report_trace_entry( shot, last_ttl, thisvariant, donotshow){
    var start=new Date( shot.ts * 1000);
    var html='';
    var head='<b>' + thisvariant + '</b>: ' + start.toLocaleDateString() +  ' '
	+ start.toLocaleTimeString();
    if ( donotshow){
	html= '<p>' + head + '</p>';
    } else {
	html='<table border=1><caption>' + head + '</caption>';
	html+='<thead><th>Hop<th class=ipadr>Address<th>Roundtriptime</thead><tbody>';

	for ( hop of shot.val){
	    if ( hop.ttl > last_ttl)
		break;
	    html+='<tr><td>' + hop.ttl
		+ '<td>' + ( hop.ip !== undefined ? hop.ip : '' )
		+ '<td class=num>' + ( hop.rtt !== undefined ? hop.rtt.toFixed(1) : '' );
	}
	html+='</tbody></table>';
    }
    return html;
    //$("#trace_table").append(html);
}


function trf(id,val){
    return '<tr><th>' + id + '<td>' + val;
}
function txtf(id,val, decimals){
    while (id.length < 10){
	id+=' ';
    }
    var valtxt;
    if ( typeof val == 'number')
	valtxt=val.toFixed(decimals);
    else
	valtxt=val;
    return id + "\t" + valtxt + "\n";
}

function format_popup(adr){
    $.each(in_slice.tree.stats, function(){
	if ( this.address === adr){
	    var html='<table>'
		+ trf('router', this.router)
		+ trf('address', this.address)
		+ trf('hop', this.hop)
		+ trf('avg', this.avg)
		+ trf('min', this.min)
		+ trf('max', this.max)
		+ trf('sdv', this.sdv)
		+ trf('loss', this.loss)
		+ trf('seen', this.seen)
	        + trf('collapses', this.collapses)
	+ '<table>';
	    
	  //$("treepop").qtip({content: html, style:{name: 'dark', tip: 'topLeft'}});
	  // console.log(document.getElementById('treepop'));
	  // document.getElementById('treepop').html(html);
	    // document.getElementById('treepop').classList.toggle('show');
	    var text= ''
		+ txtf('name', this.router, 0)
		+ txtf('address', this.address, 0)
		+ txtf('hop', this.hop, 0)
		+ txtf('avg', this.avg, 1)
		+ txtf('min', this.min, 1)
		+ txtf('max', this.max, 1)
		+ txtf('sdv', this.sdv, 1)
		+ txtf('loss', this.loss, 2)
		+ txtf('seen', this.seen, 0)
		+ txtf('collapses', this.collapses);
	    alert(text);

	  return false; // break
	}
    });
}

function plot_stats_hops(data){
    var chartdata=[];
    var phop;
    $.each(data.stats, function(index, s){
	chartdata.push({
	    x: parseInt( s.hop ? s.hop : phop),
	    y: s.seen,
	    z: s.avg,
	    host: s.router,
	    avg: s.avg,
	    min: s.min,
	    max: s.max,
	    sdv: s.sdv,
	    loss: s.loss });
	phop=s.hop;
    });
    //plot_hops(chartdata);
}

function plot_trace() {
  // plot from pre table in div  
  //var tracedata = $("#data").html().split("\n"); // Put data-set from <pre> tag into an array
  var tracedata=window.parent.document.getElementById('stats').innerText.split("\n");
  var chartdata = [];

/*
  // Parse table and prepare dataset for highcharts
  var regpatt = /^\s*(\d*)\s+(\S+)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+)/;
  var length = tracedata.length;
  var previous_hopcount = 0;
  for (var i = 0; i < length; i++) {
    var columns = regpatt.exec(tracedata[i]);
    if (columns) {
      if(!columns[1]) columns[1] = previous_hopcount; // If hopcount is missing, reuse previous
      chartdata.push({
           x: parseInt(columns[1]),
           y: parseInt(columns[8]),
           z: parseFloat(columns[3]),   //Bubble size is also controlled by max and min setings...        
           host: columns[2],
           avg: parseFloat(columns[3]),
           min: parseFloat(columns[4]),
           max: parseFloat(columns[5]),
           sdv: parseFloat(columns[6]),
           loss: parseFloat(columns[7])
        }
      )
      previous_hopcount = columns[1];
    }
  }
    plot_hops(chartdata);
*/
}

/*
function plot_hops(chartdata){
    // Plot bubble chart
    var myChart = Highcharts.chart('hoptainer', {

    chart: {
      type: 'bubble',
      plotBorderWidth: 1,
      zoomType: 'xy'
    },
    legend: {
      enabled: false
    },
    title: {
      text: 'Aggregated trace route results'
    },
    subtitle: {
      text: 'Source: mp collection'
    },
    xAxis: {
      gridLineWidth: 1,
      title: {
        text: 'No of hops from source'
      },
      labels: {
        format: '{value}'
      },
	tickInterval: 1,
	maxPadding: 0.1,
      minPadding: 0.1,
//      type: 'logarithmic',
     },

    yAxis: {
      startOnTick: false,
      endOnTick: false,
      title: {
        text: 'No of replys from host'
      },
      labels: {
        format: '{value}'
      },
      maxPadding: 0.5,
      minPadding: 0.5,
      type: 'logarithmic',
    },

    tooltip: {
      useHTML: true,
      headerFormat: '<table>',
      pointFormat: '<tr><th colspan="2"><h3>{point.host}</h3></th></tr>' +
        '<tr><th>Hop:</th><td>{point.x}</td></tr>' +
        '<tr><th>Avg:</th><td>{point.avg}ms</td></tr>' +
        '<tr><th>Min:</th><td>{point.min}ms</td></tr>' +
        '<tr><th>Max:</th><td>{point.max}ms</td></tr>' +
        '<tr><th>Sdv:</th><td>{point.sdv}ms</td></tr>' +
        '<tr><th>Loss:</th><td>{point.loss}%</td></tr>' +
        '<tr><th>Seen:</th><td>{point.y}</td></tr>',
      footerFormat: '</table>',
      followPointer: true
    },

	plotOptions: {
    series: {
      dataLabels: {
        enabled: true,
        format: '{point.host}',
        rotation: 90,
        style: { "fontSize": "12px" }

      }
    },
    bubble: {
      minSize: 20,
      maxSize: 80,
    }
  },

  series: [{
    data: chartdata
  }]

  });

}
*/

function get_path(url,type){
    var pathre=/(mahost|topo|base)=(.+)(\&|$)/;
    var path=pathre.exec(url);
    if (path){
	var tailre=/(.*\/)[^\/]*$/;
	var head=tailre.exec(path[1]);
	if ( type == 'base' ){
	    return head[1];
	} else { // type == 'Description'		      
	    // var adre=/\/([^\/]*)\/([^\/]*)\/trace\/([^\/]*).\.json$/;
	    var fre=/\/([^\/]*)\/([^\/]*)\/trace\//;
	    var from=fre.exec(path[1]);
	    var adre=/\/trace\/([^\/]*).\.json$/;
	    var adr=adre.exec(path[1]);
	    // return 'from ' + from[1] + ' to ' + adr[1] + ' on ' + from[2];
	    return 'from A to B on then';
	}
    } else {
	return 'unknown';
    }
}


function navigate(direction){
    var url=document.URL;

    if ( direction === "up"){ // cut to plain directory
       document.location.href=get_path(url, 'base');
    } else {
	var pat=/\/(\d\d\d\d)\-*(\d\d)\-*(\d\d)\//;
	var ds=pat.exec(url);
	var dato=new Date( ds[1], ds[2]-1, ds[3]); // month is zero based
 
	if ( direction === "previous"){
	    dato.setDate(dato.getDate()-1);
	} else if ( direction === "next"){
	    dato.setDate(dato.getDate()+1);
	} else {
	    console.log( "invalid direction for navigation : " + url);
	}

	var sep="";
	if ( ds[0].search("-") > 0){ // yy-mm-dd
	    sep="-";
	}
	var nd= "/" + dato.getFullYear() + sep + ("0"+(dato.getMonth()+1)).slice(-2) 
		       + sep + ("0" + dato.getDate()).slice(-2) + "/"; // yymmdd / yy-mm-dd
	var nurl=url.replace(ds[0], nd);
	document.location.href=nurl;
    }
    
}

var copy_no=0; // counting copy tabs
// copy div to a new tab name with current timestamp
function copy_div(div){
    var from=document.getElementById(div);
    var timetext=document.getElementById('timestart').innerHTML;
    var timespan='copy' + (copy_no++);

    var li='<li><a href="#' + timespan + '">' + timetext + '</a></li>';
    $(li).appendTo("#tabs .ui-tabs-nav");
    $( '<div id="' + timespan + '"></div>').appendTo( tabs );
    $("#tabs").tabs("refresh");

    //var copy = document.createElement("div");
    // var copy=$("#" + $.escapeSelector(timespan) );
    var copy=document.getElementById(timespan);
    copy.style.width = from.style.width;
    copy.style.height = from.style.height;
    copy.innerHTML = from.innerHTML;
    // copy.setAttribute("id", timespan );

    //document.getElementById("tabs").appendChild(copy);
    plot_tree_json(current_slice.tree, timespan, true);

}

function copy_tree(slice){
    var timespan=document.getElementById('timestart').innerHTML;
 
    
}

/* statistical functions */

function Stats(){
    this.values=[];
    this.sum=0;
    this.n=0;
    this.sumsq=0;
    this.add=function (value){
        this.values.push(value);
        this.sum+=value;
        this.sumsq+=value*value;
        this.n++;
    }
    this.avg=function(){
        if ( this.n > 0){
            return this.sum/this.n;
        } else {
            return 0;
        }
    }
    this.median=function(){
        return median(this.values);
    }
    this.sdv= function(){
        if ( this.n > 1 ){
            return( Math.sqrt( Math.abs( 
                this.sumsq/this.n - Math.pow( this.sum/this.n, 2) ) ) );
        } else {
            return 0;
        }
    }
    this.min=function(){
        return Math.min.apply(Math, this.values);
    }
    this.max=function(){
        return Math.max.apply(Math, this.values);
    }
}


// pad numbers with leading zero

function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

		       

//--------------------------------------------------------------------------------
$(document).ready( function(){
    $(function(){
	$( "#tabs" ).tabs();
    } );
    document.getElementById('treetainer').style.height= window.innerHeight * 0.6 + "px" ;
    document.getElementById('treetainer').style.width= window.innerWidth *0.7 + "px" ;
    /* get url parameteres*/

    // document.getElementById("tracepath").innerHTML=get_path(document.URL, 'Description');		     

    (window.onpopstate = function () {
	var match,
            pl     = /\+/g,  // Regex for replacing addition symbol with a space
            search = /([^&=]+)=?([^&]*)/g,
            decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
            query  = window.location.search.substring(1);
	    var from,
		to;

	var parm='';

	urlParams = {};
	urlParams['ip-version'] = 4;         // Default to ipv4
	while (match = search.exec(query))
	    urlParams[decode(match[1])] = decode(match[2]);

	var tracepeers='';
	if (urlParams['from'])
	    tracepeers += ' from ' + urlParams['from'];
	if (urlParams['to'])
	    tracepeers += ' to ' + urlParams['to'];
	document.getElementById('tracepeers').innerHTML=tracepeers;
	    
	if ( urlParams['stime']){
	    var st=urlParams['stime'];
	    if ( isNaN( st) )
		st= new Date( st) / 1000;
	    mother.start = st * msts; } // params in in sec
	if ( urlParams['etime']){
	    var end=urlParams['etime'];
	    if ( isNaN( end) )
		end= new Date( end) / 1000;
	    mother.end = end * msts ; }
	if ( urlParams['time-range']){
	    mother.range = urlParams['time-range'] * msts; }

	if ( ! mother.start){
	    if ( ! mother.end)
		mother.end=Date.now() / 1000 * msts;
	    mother.start=mother.end-mother.range;
	}
	mother.start= Math.floor( mother.start / mother.range) * mother.range; // round off
	if (! mother.end )
	    mother.end = mother.start + mother.range;
	mother.slice_count= Math.floor( mother.range / compute_slice_size(mother.range) );
	mother.slice_no=0;
	current_slice=mother;

	$("#timeslotxxx").mouseup( function(){
	    update_slice();
	});
    
	$("#timeslot").mouseup( function(){
	    var slice_count;
	    if ( ! current_slice.slice_count )
		current_slice.slice_count =
		    current_slice.range / compute_slice_size(current_slice.range);
	    slice_count = current_slice.slice_count;

	    var no = Math.floor( $("#timeslot").val() * slice_count / slide_max );
	    if ( no === 0 || no !== in_slice.slice_no ){
		tr_slice_make( current_slice, no, 'in');

		// $("#timeslotOut").val( Math.floor(timeslot.value*current_slice.slice_count/slide_max)
		//    + '/'+current_slice.slice_count );
	    }
	    /* document.getElementById('timeslotOut').innerHTML=
		Math.floor(timeslot.value*current_slice.slice_count/slide_max)
		+ '/'+current_slice.slice_count; */
	} );

	if ( urlParams['mahost'])
	    fetch_and_plot_json(mother, urlParams['mahost']);

	if ( urlParams['topo'])
	    fetch_and_plot_topo(urlParams['topo']);

	if ( urlParams['hops'])
	    ; // fetch_and_plot(urlParams['hops']);
	if ( urlParams['intern'])
	    ; // plot_trace();
        //$( "#tabs" ).tabs();
    })();

    init_timeline();

});

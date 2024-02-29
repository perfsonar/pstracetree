# perSONAR Tracetree

perfSONAR Tracetree (PStracetree) is a visualization tool for traceroute measurements.

A set of traceroute results collected over a time window is summarized and visualized in a network graph. Nodes in the graph are routers / hosts observed while links the order routers are reported, i.e. the likely inter-connection between routers. 

("likely inter-connections" refers to the fact that a traceroute measurement consists of a number of individual probe packets with increasing ttl values. Hence the distance to routers in a path is well documented while the order of routers can only be estimated.) 

Summarized results are also available in more traditional table formats.

PStracetree access currently the (legacy) Esmond perfSONAR API, hence it may visualize results stored in both perfSONAR 4.x an 5.x (through Elmond) archives. 

## Installation

PStracetree may be installed from source as well as from binaries tailored for different Linux distros.

### From binaries

  * For Redhat el8 and el9: `dnf install rpmbuild/RPMS/rpmbuild/RPMS/noarch/perfsonar-tracetree*el[8/9].noarch.rpm`
  * For Debian and Ubuntu: <to-be-added>

### From source

  * Run `make dist` to create a tar-archive of the system.
  * Run `make install` to install

## Usage

After installation PStracetree will be available at http://localhost/pstracetree

PStracetree's default behavior is to attempt to fetch and display the global list of perfSONAR measurement archives. If only a single (global or private) archive is relevant add `mahost=<my-archive-hostname>` to the PStracetree url. \
E.g. `http://localhost/pstracetree/?mahost=my-archive.mydomain.org` or \
`http://localhost/pstracetree/?mahost=192.168.10.1` 

Note that SSL certificate verification may occasionally fail (e.g. due to self-made certificates). Add `verify_SSL=0` to disable verification.

To visualize a set of traceroute results collected on a specific date apply \
`http://localhost/pstracetree/?mahost=<my-archive-host>&from=<src-testpoint-hostname>&to=<dst-testpoint-hostname>&time-start=<iso-date>`.

The graph visualizer component, "tracetree.html", may also present a specific set of results directly (without being embedded in the "tab environment") by applying \
`http://localhost/pstracetree/tracetree.html?base=<MA base-uri>&time-start=<unix-epoch-time>&time-range=<seconds>&time-end=<unix-epoch-time>&from=<src-testpoint-hostname>&to=<dst-testpoint-hostname>`\
Note that "MA base-uri" is a specific traceroute-results-url for a pair of tespoints. ("from" and "to" only helps with displaying relevant endpoint hostnames.) 

## Building packages

Distro-packages can be rebuilt by running scripts in the `rpmbuild/` and `debbuild/` folders. Run `./build.sh -h` in relevant folder for instructions. (To be replaced by *unibuild* go *github actions*.)

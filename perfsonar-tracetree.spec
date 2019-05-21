%define install_base /usr/lib/perfsonar/tracetree
%define config_base %{install_base}/etc

%define apacheconf apache-perfsonar-tracetree.conf

%define perfsonar_auto_version 4.2.0
%define perfsonar_auto_relnum 0.0.a1

Name:			perfsonar-tracetree
Version:		%{perfsonar_auto_version}
Release:		%{perfsonar_auto_relnum}%{?dist}
Summary:		perfSONAR traceroute tree
License:		ASL 2.0
Group:			Development/Libraries
URL:			http://www.perfsonar.net
Source0:		perfsonar-tracetree-%{version}.%{perfsonar_auto_relnum}.tar.gz
BuildRoot:		%{_tmppath}/%{name}-%{version}-%{release}-root-%(%{__id_u} -n)
BuildArch:		noarch
Requires:		httpd

%description
The perfSONAR tracetree package presents traceroutes from perfSONAR
measuremet archive (Esmond). Routes are presented in form of a node
graph and a stats table.

%pre

%prep
%setup -q -n perfsonar-tracetree-%{version}.%{perfsonar_auto_relnum}

%build

%install
rm -rf %{buildroot}

make ROOTPATH=%{buildroot}/%{install_base} install

mkdir -p %{buildroot}/etc/httpd/conf.d
install -D -m 0644 %{apacheconf} %{buildroot}/etc/httpd/conf.d/%{apacheconf}

%clean
rm -rf %{buildroot}

%post
service httpd restart &> /dev/null || :

%files
%defattr(-,perfsonar,perfsonar,-)
%license LICENSE
%{install_base}/html/*
/etc/httpd/conf.d/*

%changelog
* Mon May 20 2019 Valentin.Vidic@CARNet.hr 4.2.0-0.0.a1
- Initial packaging

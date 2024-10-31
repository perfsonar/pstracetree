PACKAGE=perfsonar-tracetree
ROOTPATH=/usr/lib/perfsonar/pstracetree
CONFIGPATH=/etc/perfsonar
PERFSONAR_AUTO_VERSION=5.3.0
PERFSONAR_AUTO_RELNUM=1
VERSION=${PERFSONAR_AUTO_VERSION}
RELEASE=${PERFSONAR_AUTO_RELNUM}

default:
	@echo No need to build the package. Just run \"make install\"

dist:
	mkdir /tmp/$(PACKAGE)-$(VERSION)
	tar ch -T MANIFEST | tar x -C /tmp/$(PACKAGE)-$(VERSION)
	tar czf $(PACKAGE)-$(VERSION).tar.gz -C /tmp $(PACKAGE)-$(VERSION)
	rm -rf /tmp/$(PACKAGE)-$(VERSION)

#install:
#	mkdir -p ${ROOTPATH}
#	tar ch --exclude=apache* --exclude=*spec --exclude=dependencies --exclude=MANIFEST --exclude=Makefile -T MANIFEST | tar x -C ${ROOTPATH}

install:
#	Install all files according to MANIFEST
	@echo Installing...
	@awk -v rp=$(ROOTPATH) -v cp=$(CONFIGPATH) '{ \
		if ( substr($$1,1,1) != "#" && NF >= 1) { \
			cmd=""; \
			if ( substr($$1,1,4) == "etc/" ) { \
				cmd="install -m 640 -TD "$$1" "cp"/"substr($$1,5) \
			} else { \
				cmd="install -m 640 -TD "$$1" "rp"/"$$1 \
			} \
			system(cmd); \
			split(cmd,c," "); print(c[6]); \
		} \
	}'  MANIFEST

uninstall:
#	Remove all files according to MANIFEST
	@echo Removing...
	@awk -v rp=$(ROOTPATH) -v cp=$(CONFIGPATH) '{ \
		if ( substr($$1,1,1) != "#" ) { \
			cmd=""; \
			if ( substr($$2,1,4) == "etc/" ) { \
				cmd="rm -f "cp"/"substr($$1,5) \
			} else { \
				cmd="rm -f "rp"/"$$1 \
			} \
			system(cmd); \
			split(cmd,c," "); print(c[3]); \
		} \
	}'  MANIFEST

clean: 

test:

cover:

test_jenkins:

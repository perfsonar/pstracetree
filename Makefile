PACKAGE=perfsonar-tracetree
ROOTPATH=/usr/lib/perfsonar/pstracetree
PERFSONAR_AUTO_VERSION=5.1.0
PERFSONAR_AUTO_RELNUM=alfa1
VERSION=${PERFSONAR_AUTO_VERSION}
RELEASE=${PERFSONAR_AUTO_RELNUM}

default:
	@echo No need to build the package. Just run \"make install\"

dist:
	mkdir /tmp/$(PACKAGE)-$(VERSION).$(RELEASE)
	tar ch -T MANIFEST | tar x -C /tmp/$(PACKAGE)-$(VERSION).$(RELEASE)
	tar czf $(PACKAGE)-$(VERSION).$(RELEASE).tar.gz -C /tmp $(PACKAGE)-$(VERSION).$(RELEASE)
	rm -rf /tmp/$(PACKAGE)-$(VERSION).$(RELEASE)

install:
	mkdir -p ${ROOTPATH}
	tar ch --exclude=apache* --exclude=*spec --exclude=dependencies --exclude=MANIFEST --exclude=Makefile -T MANIFEST | tar x -C ${ROOTPATH}

test:

cover:

test_jenkins:

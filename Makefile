PACKAGE=perfsonar-tracetree
ROOTPATH=/usr/lib/perfsonar/tracetree
VERSION=0.4
RELEASE=0.0.a1

default:
	@echo No need to build the package. Just run \"make install\"

dist:
	mkdir /tmp/$(PACKAGE)-$(VERSION).$(RELEASE)
	tar ch -T MANIFEST | tar x -C /tmp/$(PACKAGE)-$(VERSION).$(RELEASE)
	tar czf $(PACKAGE)-$(VERSION).$(RELEASE).tar.gz -C /tmp $(PACKAGE)-$(VERSION).$(RELEASE)
	rm -rf /tmp/$(PACKAGE)-$(VERSION).$(RELEASE)

install:
	mkdir -p ${ROOTPATH}/html
	tar ch --exclude=apache* --exclude=*spec --exclude=dependencies --exclude=MANIFEST --exclude=LICENSE --exclude=Makefile -T MANIFEST | tar x -C ${ROOTPATH}/html

test:

cover:

test_jenkins:

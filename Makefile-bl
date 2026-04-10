#
# Makefile for Any Package
#

include $(wildcard unibuild/unibuild.make)

default:
	@echo "See README.md for instructions."

system-test:
	@echo "Prepareing system test of PS Tracetreep..."
	docker compose -f pstracetree/tests/system-test.yml --project-directory . build
	@echo "*********************************************************************"
	@echo "* Visit https://your.host:4435/pstracetree to test running instance *"
	@echo "*********************************************************************"
	docker compose -f pstracetree/tests/system-test.yml --project-directory . up 
	@echo "System test completed."

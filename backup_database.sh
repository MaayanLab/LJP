#!/bin/bash
mongodump -h 10.90.122.109 -d LJP2014 \
	--excludeCollection experiments \
	--excludeCollectionsWithPrefix ljp12

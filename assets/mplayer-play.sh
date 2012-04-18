#!/bin/bash

mplayer -rawaudio samplesize=2:channels=1:rate=8000 -demuxer rawaudio $1

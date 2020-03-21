#!/usr/bin/env bash

ffmpeg -nostdin -guess_layout_max 0 -loglevel warning -hide_banner -safe 0 -i playlist.txt -af loudnorm=I=-18:TP=-4:LRA=10 -ar 44100 -ac 2 -f pulse gnr

#!/bin/sh

convert $1  -pointsize $3 -undercolor white -draw "gravity SouthEast text 5,5 '$2'" $1

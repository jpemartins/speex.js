rm test.pcm
cat encoded.spx | ../../libspeex.js/bin/samples_dec test.pcm
./mplayer-play test.pcm

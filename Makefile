SPEEX_SRC_DIR=lib/speex-1.2rc1
CLOSURE_COMPILER_PATH=bin/closure_compiler.jar

all: test

aurora:
	cat src/libspeex.js > dist/aurora-speex.js	
	cat src/util.js >> dist/aurora-speex.js
	cat src/types.js >> dist/aurora-speex.js
	cat src/codec.js >> dist/aurora-speex.js	
	cat src/decoder.js >> dist/aurora-speex.js
	cat src/aurora/demuxer.js >> dist/aurora-speex.js	
	cat src/aurora/decoder.js >> dist/aurora-speex.js	

	java -jar $(CLOSURE_COMPILER_PATH) --js=dist/aurora-speex.js > dist/aurora-speex.min.js

bundle: 
	cat src/libspeex.js > dist/speex.js	
	cat src/util.js >> dist/speex.js
	cat src/types.js >> dist/speex.js
	cat src/speex.js >> dist/speex.js
	cat src/codec.js >> dist/speex.js
	cat src/decoder.js >> dist/speex.js
	cat src/encoder.js >> dist/speex.js
	cat src/ogg.js >> dist/speex.js
	java -jar $(CLOSURE_COMPILER_PATH) --js=dist/speex.js > dist/speex.min.js
	java -jar $(CLOSURE_COMPILER_PATH) --js=src/ogg.js > dist/ogg.min.js

test: decoder encoder

decoder:
	gcc -I$(SPEEX_SRC_DIR)/include -L$(SPEEX_SRC_DIR)/libspeex/.libs -lspeex test/samples_dec.c -obin/samples_dec

encoder:
	gcc -I$(SPEEX_SRC_DIR)/include -L$(SPEEX_SRC_DIR)/libspeex/.libs -lspeex test/samples_enc.c -obin/samples_enc

clean:
	rm dist/libspeex.*

.PHONY: decoder encoder

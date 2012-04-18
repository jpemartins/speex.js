"use strict";

(function (global) {

if (typeof importScripts === 'function') {	
	self.console = {
		log: function () {}
	  , debug: function () {}
	  , warn: function () {}
	  , error: function () {}
	}
}

function Speex(params) {
	!params.mode && (params.mode = 0);

	this.params = params;	

	this.frame_size = 320 || params.frame_size;

	this.ring_size = 2304 || params.ring_size;
	
    this.linoffset = 0;

    this.ringoffset = 0;

    this.modoffset = 0;
      
    this.linbuf = new Int16Array(this.frame_size);

    this.ring = new Int16Array(this.ring_size * 2);

    this.modframes = new Int16Array(this.frame_size);
    
    this.spxbuf = [];
	
	this.encoder = new SpeexEncoder(params);
	this.decoder = new SpeexDecoder(params);

	// bootstrap
	this.init();
}

Speex.util = global.util;

Speex.onerror = function (name, code) {
	console.error("decoding error: ", ret);
}
/**
  * Reads the speex header located on the first page 
  * of the OGG format
  */
Speex.header = function (oggPage, onerror) {
	var arr = libspeex.allocate(libspeex.intArrayFromString(oggPage), 'i8', libspeex.ALLOC_STACK)
	  , err = onerror || Speex.onerror
	  , header_addr;
			
	header_addr = libspeex.speex_packet_to_header(arr, oggPage.length);	

	if (!header_addr) {
		err(new Error("cannot read header from bitstream"));
		return;
	}

	var typename = Speex.types.SpeexHeader
	  , header = {}
	  , i = 0, offset;

	header.speex_string = libspeex.Pointer_stringify(header_addr);
	header.speex_version_string = libspeex.Pointer_stringify(header_addr+8);
	
	for (var field in typename) {
		if (field === "__size__") continue;
		offset = 28 + typename[field];
		header[field] = libspeex.getValue(header_addr+offset, 'i32');
		i+=1;
	}

	if (header.mode >= Speex.SPEEX_NB_MODES || header.mode<0) {
		err(new Error("Mode number "+header.mode+" does not (yet/any longer) exist in this version"));
	}

	if (header.speex_version_id > 1) {
		err(new Error("Version "+header.speex_version_string+" is not supported"));
	}
 
	return header;
}

Speex.prototype.set = function (name, value) {	
	this.options[name] = value;
}

Speex.prototype.enable = function (option) {	
	this.set(option, true);
}

Speex.prototype.disable = function (option) {	
	this.set(option, false);
}

/**
  * Initialize the codec
  */
Speex.prototype.init = function () {	
	this.encoder.init();
	this.decoder.init();
}

/**
  * Closes the codec
  */
Speex.prototype.close = function () {	
	//this.encoder.close();
	this.decoder.close();
}

/**
  * @argument pcmdata Float32Array|Int16Array
  * @returns String|Uint8Array
  */
Speex.prototype.encode = function (data, isFile) {
	isFile = !!isFile;

	if (isFile) {
		return this.encoder.process(data);
	}

	// ring spin
    for (var i=-1, j=this.ringoffset; ++i < data.length; ++j) {
        this.ring[j] = data[i];
    }
    
    this.ringoffset += data.length;

    // has enough to decode
    if ((this.ringoffset > this.linoffset) 
    	&& (this.ringoffset - this.linoffset < this.frame_size)) {
        
        return;
    }

    // buffer fill
    for (var i=-1; ++i < this.linbuf.length;) {
        this.linbuf[i] = this.ring[this.linoffset + i];            
    }

    this.linoffset += this.linbuf.length;
    this.spxbuf = this.encoder.process(this.linbuf);

    if (this.ringoffset > this.ring_size) {
        this.modoffset = this.ringoffset % this.ring_size;
        
		//console.log("ignoring %d samples", this.modoffset);
        this.ringoffset = 0;
    }

    if (this.linoffset > this.ring_size) {
        this.linoffset = 0;
    }

    return this.spxbuf;
}

/**
  * @argument encoded String|Uint8Array
  * @returns Float32Array
  */
Speex.prototype.decode = function (spxdata) {
	return this.decoder.process(spxdata);
}

util.merge(Speex, {
	
	SPEEX_NB_MODES: 3,
	
	SPEEX_SET_ENH: 0,
	SPEEX_GET_ENH: 1,
	
	SPEEX_GET_FRAME_SIZE: 3,
	
	SPEEX_SET_QUALITY: 4,
	SPEEX_GET_QUALITY: 5, // Not used
	
	SPEEX_SET_VBR: 12,
	SPEEX_GET_VBR: 13,
	
	SPEEX_SET_VBR_QUALITY: 14,
	SPEEX_GET_VBR_QUALITY: 15,

	SPEEX_SET_COMPLEXITY: 16,
	SPEEX_GET_COMPLEXITY: 17,	
	
	SPEEX_SET_SAMPLING_RATE: 24,
	SPEEX_GET_SAMPLING_RATE: 25,
	
	SPEEX_SET_VAD: 30,
	SPEEX_GET_VAD: 31,
	
	SPEEX_SET_ABR: 32,
	SPEEX_GET_ABR: 33,
	
	SPEEX_SET_DTX: 34,
	SPEEX_GET_DTX: 35,
	
	types: {

		/**

		Bit-packing data structure representing (part of) a bit-stream.
		
		typedef struct SpeexBits {
		   char *chars;   	//< "raw" data
		   int   nbBits;  	//< Total number of bits stored in the stream
		   int   charPtr; 	//< Position of the byte "cursor" 
		   int   bitPtr;  	//< Position of the bit "cursor" within the current char 
		   int   owner;   	//< Does the struct "own" the "raw" buffer (member "chars") 
		   int   overflow;	//< Set to one if we try to read past the valid data 
		   int   buf_size;	//< Allocated size for buffer 
		   int   reserved1; //< Reserved for future use 
		   void *reserved2; //< Reserved for future use 
		} SpeexBits;
		*/
		SpeexBits: libspeex.generateStructInfo([
			["i1*", 'chars'],
			["i32", 'nbBits'],
			["i32", 'charPtr'],
			["i32", 'bitPtr'],
			["i32", 'owner'],
			["i32", 'overflow'],
			["i32", 'buf_size'],
			["i32", 'reserved1'],
			["i8*", 'reserved2']
		]),

		/**
		  * Speex header info for file-based formats
		  		
		typedef struct SpeexHeader {
		   char speex_string[SPEEX_HEADER_STRING_LENGTH];
		   char speex_version[SPEEX_HEADER_VERSION_LENGTH];
		   spx_int32_t speex_version_id;
		   spx_int32_t header_size;
		   spx_int32_t rate;
		   spx_int32_t mode;
		   spx_int32_t mode_bitstream_version;
		   spx_int32_t nb_channels;
		   spx_int32_t bitrate;
		   spx_int32_t frame_size;
		   spx_int32_t vbr;
		   spx_int32_t frames_per_packet;
		   spx_int32_t extra_headers;
		   spx_int32_t reserved1;
		   spx_int32_t reserved2;
		} SpeexHeader;
		*/		
		SpeexHeader: libspeex.generateStructInfo([
			["i32", 'speex_version_id'],
			["i32", 'header_size'],
			["i32", 'rate'],
			["i32", 'mode'],
			["i32", 'mode_bitstream_version'],
			["i32", 'nb_channels'],
			["i32", 'bitrate'],
			["i32", 'frame_size'],
			["i32", 'vbr'],
			["i32", 'frames_per_packet'],
			["i32", 'extra_headers'],
			["i32", 'reserved1'],
			["i32", 'reserved2']
		]),

		/**

		Preprocessor internal state
		
		typedef struct SpeexPreprocessState {
		} SpeexPreprocessState;
		*/
		SpeexPreprocessState: libspeex.generateStructInfo([
		]),

		/**

		Echo canceller state
		
		typedef struct SpeexEchoState {
		} SpeexEchoState;
		*/
		SpeexEchoState: libspeex.generateStructInfo([
		])
	}
});

global["Speex"] = Speex;

}(this));

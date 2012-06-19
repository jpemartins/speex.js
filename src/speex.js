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

util.merge(Speex, global.types);

global["Speex"] = Speex;

}(this));

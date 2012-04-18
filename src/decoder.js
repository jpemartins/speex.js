(function (global) {

var util = Speex.util;

function SpeexDecoder (params) {
	CodecProcessor.apply(this, arguments);

	this.params = params;

	this.enh = params.enh || 1;

	// samples buffer size in shorts
	this.frame_size = params.frame_size || 160;

	// encoded speex packet in bytes (38 [quality=8] by default)
	//this.bits_size = params.bits_size || 38;
	this.bits_size = SpeexEncoder.quality_bits[params.quality || 8];
}

util.inherit(SpeexDecoder, CodecProcessor);

SpeexDecoder.prototype.init = function () {
	var bits_addr = libspeex.allocate(Speex.types.SpeexBits.__size__, 'i8', libspeex.ALLOC_STACK);
	libspeex.speex_bits_init(bits_addr);

	var i32ptr = libspeex.allocate(1, 'i32', libspeex.ALLOC_STACK)
	  , state = libspeex.speex_decoder_init(this.mode);
	
	libspeex.setValue(i32ptr, this.enh, "i32");
	libspeex.speex_decoder_ctl(state, Speex.SPEEX_SET_ENH, i32ptr);	
    libspeex.speex_decoder_ctl(state, Speex.SPEEX_GET_SAMPLING_RATE, i32ptr);

	this.state = state;
	this.bits = bits_addr;
	this.buffer = libspeex.allocate(this.frame_size, 
	 	(this.floating_point ? 'float' : 'i16')
	  , libspeex.ALLOC_STATIC);
	 
	this.output = new Float32Array(1);	
}

/**
  * Copy the samples to the input buffer
  */
SpeexDecoder.prototype.read = function (offset, nb, data) {
	var input_addr = this.input
	  , len = offset + nb > data.length ? data.length - offset : nb
	  , isStrIn = data.constructor == String.prototype.constructor;

	!input_addr && (input_addr = libspeex.allocate(this.bits_size, 'i8', libspeex.ALLOC_STATIC));

	for (var m=offset-1, k=0; ++m < offset+len; k+=1){
		libspeex.setValue(input_addr+k, !isStrIn ? data[m] : util.parseInt(data[m]), 'i8');
	}

	/* Read the buffer */
	libspeex.speex_bits_read_from(this.bits, input_addr, len);

	this.input = input_addr;

	return len;
}

SpeexDecoder.prototype.process = function (spxdata) {
		//console.time('decode');
	var output_offset = 0, offset = 0, len;

	// Varies from quality
	var total_packets = Math.ceil(spxdata.length / this.bits_size)
	  , estimated_size = this.frame_size * total_packets
	  , decoder_func = this.floating_point ? libspeex.speex_decode : libspeex.speex_decode_int
	  , benchmark = !!this.params.benchmark;
	
	// Buffer to store the audio samples
	if (!this.buffer) {
		this.buffer =  libspeex.allocate(this.frame_size, 'i16', libspeex.ALLOC_STACK)
	}
		
	var bits_addr = this.bits
	  , input_addr = this.input
	  , buffer_addr = this.buffer
	  , state_addr = this.state;
		
	if (this.output.length < estimated_size) {
		this.output = new Float32Array(estimated_size);		
	}

	while (offset < spxdata.length) {
		/* Benchmarking */		
		benchmark && console.time('decode_packet_offset_' + offset);

		/* Read bits */
		len = this.read(offset, this.bits_size, spxdata);

  		/* Decode the data */
  		ret = decoder_func(state_addr, bits_addr, buffer_addr);      	      	
  	
  		if (ret < 0) {
	  		Speex.onerror("decoding error: ", ret);
  			return;
  		}

  		/* Write the samples to the output buffer */
  		this.write(output_offset, this.frame_size, buffer_addr);

  		benchmark && console.timeEnd('decode_packet_offset_' + offset);

  		offset += len;
  		output_offset += this.frame_size;  		
  	}

  	//Speex.play(this.output.decoder);
  	//Speex.mozPlay(this.output.decoder);
  	//console.timeEnd('decode');
  	return this.output.subarray(0, output_offset);
}

SpeexDecoder.prototype.close = function () {
	if (!!this.state) {
		libspeex.speex_bits_destroy(this.bits); 
		libspeex.speex_decoder_destroy(this.state);		
	}
}


/**
  * Copy to the output buffer 
  */
SpeexDecoder.prototype.write = function (offset, nframes, addr) {	
  	for (var m=0, k=offset-1; ++k<offset+nframes; m+=2) {
  		this.output[k] = libspeex.getValue(addr+m, "i16") / 32768;
  	}
}

global["SpeexDecoder"] = SpeexDecoder;

}(this));
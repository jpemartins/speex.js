(function (global) {

var util = global.util;

function SpeexDecoder (params) {
	CodecProcessor.apply(this, arguments);

	this.floating_point = !params.lpcm && true;

	this.ctl_func = libspeex["_speex_decoder_ctl"];

	this.params = params;

	this.enh = params.enh || 1;

	// samples buffer size in shorts
	this.frame_size = params.frame_size || 160;

	// encoded speex packet in bytes (38 [quality=8] by default)
	this.bits_size = params.bits_size !== undefined ? params.bits_size :
		SpeexEncoder.quality_bits[params.quality || 8];
}

util.inherit(SpeexDecoder, CodecProcessor);

SpeexDecoder.prototype.init = function () {
	var bits_addr = libspeex.allocate(SpeexDecoder.types.SpeexBits.__size__, 'i8', libspeex.ALLOC_STACK);
	libspeex._speex_bits_init(bits_addr);

	var i32ptr = libspeex.allocate(1, 'i32', libspeex.ALLOC_STACK)
	  , state = libspeex._speex_decoder_init(this.mode)
	  , sample_rate;

	libspeex.setValue(i32ptr, this.enh, "i32");
	libspeex._speex_decoder_ctl(state, SpeexDecoder.SPEEX_SET_ENH, i32ptr);

	libspeex.setValue(i32ptr, this.params.sample_rate, "i32");
	libspeex._speex_decoder_ctl(state, SpeexDecoder.SPEEX_SET_SAMPLING_RATE, i32ptr);

	libspeex._speex_decoder_ctl(state, SpeexDecoder.SPEEX_GET_FRAME_SIZE, i32ptr);
	this.frame_size = libspeex.getValue(i32ptr, "i32");

	this.state = state;
	this.bits = bits_addr;
	this.buffer = libspeex.allocate(this.frame_size,
	 	'i16', libspeex.ALLOC_NORMAL);

	this.output = new Float32Array(1);
}

/**
  * Copy the samples to the input buffer
  */
SpeexDecoder.prototype.read = function (offset, nb, data) {
	var input_addr = this.input
	  , len = offset + nb > data.length ? data.length - offset : nb
	  , isStrIn = data.constructor == String.prototype.constructor;

	!input_addr && (input_addr = libspeex.allocate(this.bits_size, 'i8', libspeex.ALLOC_NORMAL));

	for (var m=offset-1, k=0; ++m < offset+len; k+=1){
		libspeex.setValue(input_addr+k, !isStrIn ? data[m] : util.parseInt(data[m]), 'i8');
	}

	/* Read the buffer */
	libspeex._speex_bits_read_from(this.bits, input_addr, len);

	this.input = input_addr;

	return len;
}

SpeexDecoder.prototype.process = function (spxdata, segments) {
		//console.time('decode');
	var output_offset = 0, offset = 0, segidx = 0;
	var bits_size = this.bits_size, len;

	// Varies from quality
	var total_packets = Math.ceil(spxdata.length / bits_size)
	  , estimated_size = this.frame_size * total_packets

	  // fixed-point or floating-point is decided at compile time
	  , decoder_func = libspeex._speex_decode_int
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
		this.output = this.floating_point ?
			new Float32Array(estimated_size) : new Int16Array(estimated_size);
	}

	while (offset < spxdata.length) {
		/* Benchmarking */
		benchmark && console.time('decode_packet_offset_' + offset);

		if (segments && segments.length > 0)
			bits_size = segments[segidx];
		else
			bits_size = this.bits_size;

		/* Read bits */
		len = this.read(offset, bits_size, spxdata);

  		/* Decode the data */
  		ret = decoder_func(state_addr, bits_addr, buffer_addr);

  		if (ret < 0) {
  			return ret;
  		}

  		/* Write the samples to the output buffer */
  		this.write(output_offset, this.frame_size, buffer_addr);

  		benchmark && console.timeEnd('decode_packet_offset_' + offset);

  		offset += len;
		output_offset += this.frame_size;
		segidx++;
  	}

  	return this.output.subarray(0, output_offset);
}

SpeexDecoder.prototype.close = function () {
	if (!!this.state) {
		libspeex._speex_bits_destroy(this.bits);
		libspeex._speex_decoder_destroy(this.state);
	}
}


/**
  * Copy to the output buffer
  */
SpeexDecoder.prototype.write = function (offset, nframes, addr) {
	var sample;

  	for (var m=0, k=offset-1; ++k<offset+nframes; m+=2) {
  		sample = libspeex.getValue(addr+m, "i16");
  		this.output[k] =  this.floating_point ? sample / 32768 : sample;
  	}
}

util.merge(SpeexDecoder, global.types);

global["SpeexDecoder"] = SpeexDecoder;

}(this));

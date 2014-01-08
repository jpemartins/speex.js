(function (global) {

var util = Speex.util;

function SpeexEncoder (params) {
	CodecProcessor.apply(this, arguments);

	this.quality = params.quality || 8;

	this.enh = params.enh || 1;

	this.buffer_size = params.buffer_size || 200;

	this.floating_point = !!params.floating_point;

	// samples buffer size in shorts
	this.frame_size = params.frame_size || 160;

	// encoded speex packet in bytes (38 [quality=8] by default)
	this.bits_size = params.bits_size || SpeexEncoder.quality_bits[this.quality];
}

util.inherit(SpeexEncoder, CodecProcessor);

// TO DO - number of bytes to be written (and read by the decoder)
//         must be done automatically
SpeexEncoder.quality_bits = {
	1: 10
  , 2: 15
  , 3: 20
  , 4: 20
  , 5: 28
  , 6: 28
  , 7: 38
  , 8: 38
  , 9: 46
  , 10: 46
}

SpeexEncoder.prototype.init = function () {
	var i32ptr = libspeex.allocate(1, 'i32', libspeex.ALLOC_STACK)
	  , bits_addr = libspeex.allocate(Speex.types.SpeexBits.__size__, 'i8', libspeex.ALLOC_STACK)
	  , state;

	libspeex._speex_bits_init(bits_addr);

	state = libspeex._speex_encoder_init(this.mode);

	libspeex._speex_encoder_ctl(state, Speex.SPEEX_GET_FRAME_SIZE, i32ptr);
	this.frame_size = libspeex.getValue(i32ptr, 'i32');

	this.buffer_size = this.buffer_size;

	libspeex.setValue(i32ptr, this.quality, 'i32');
	libspeex._speex_encoder_ctl(state, Speex.SPEEX_SET_QUALITY, i32ptr);

	this.state = state;
	this.bits = bits_addr;
	this.input = libspeex.allocate(this.frame_size, 'i16', libspeex.ALLOC_NORMAL);
	this.buffer = libspeex.allocate(this.buffer_size, 'i8', libspeex.ALLOC_NORMAL);
}

/**
  * Copy the samples to the input buffer
  */
SpeexEncoder.prototype.read = function (offset, length, data) {
	var input_addr = this.input
	  , len = offset + length > data.length ? data.length - offset : length;

	for (var m=offset-1, k=0; ++m < offset+len; k+=2){
		libspeex.setValue(input_addr+k, data[m], 'i16');
	}

	return len;
}

/* Copy to the output buffer */
SpeexEncoder.prototype.write = function (offset, nb, addr) {
  	for (var m=0, k=offset-1; ++k<offset+nb; m+=1) {
  		this.output[k] = libspeex.getValue(addr+m, "i8");
  	}
}

SpeexEncoder.prototype.process = function (pcmdata) {
	var output_offset = 0, offset = 0, len, nb, err, tm_str, segments = []

	  , encode_func = this.floating_point ?
		  	libspeex._speex_encode : libspeex._speex_encode_int

      , benchmark = !!this.params.benchmark

	  // Varies from quality
	  , total_packets = Math.ceil(pcmdata.length / this.frame_size)
	  , estimated_size = this.bits_size * total_packets;

	if (!this.output || this.output.length < estimated_size) {
		this.output = new Uint8Array(estimated_size);
	}

	var bits_addr = this.bits
	  , input_addr = this.input
	  , buffer_addr = this.buffer
	  , state_addr = this.state
	  , output_addr = this.output

	while (offset < pcmdata.length) {
		benchmark && console.time('encode_packet_offset_'+offset);

		libspeex._speex_bits_reset(bits_addr);
		/* Frames to the input buffer */
		len = this.read(offset, this.frame_size, pcmdata);

    	/* Encode the frame */
    	err = encode_func(state_addr, input_addr, bits_addr);

    	/* Copy the bits to an array of char that can be written */
    	nb = libspeex._speex_bits_write(bits_addr, buffer_addr, this.buffer_size);

    	this.write(output_offset, nb, buffer_addr);

    	benchmark && console.timeEnd('encode_packet_offset_'+offset);

    	output_offset += nb;
    	offset += len;
		segments.push(nb);
	}

	return [this.output.subarray(0, output_offset), segments];
}


SpeexEncoder.prototype.close = function () {
	/* 'XXX' ABORT Error */
	if (!!this.state) {
		libspeex._speex_bits_destroy(this.bits);
		libspeex._speex_encoder_destroy(this.state);
	}
}

util.merge(SpeexEncoder, global.types);

global["SpeexEncoder"] = SpeexEncoder;

}(this));

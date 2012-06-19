OggDemuxer = Demuxer.extend(function () {
  Demuxer.register(this);

  this.probe = function(stream) {
    return stream.peekString(0, 4) === 'OggS';
  }

  this.prototype.pi = 0;

  this.prototype.currentPage = {};

  this.prototype.readPage = function (stream) {
  	this.pi += 1;

  	var page = {
		capturePattern: stream.readString(4)
	  , version: stream.readUInt8(4)
	  , type: stream.readUInt8()
	  , granulePos: stream.readString(8) // UInt64
	  , serial: stream.readUInt32()
	  , sequece: stream.readUInt32()
	  , checksum: stream.readUInt32()
	  , pageSegments: stream.readUInt8()
	  , segments: stream.readUInt8()

	  , segmentsRead: 0
	  , pageData : null
	  , data: function (data) {
	  	return data ? this.pageData = data : this.pageData;
	  }
	  , nextSegment: function () {
	  	if (this.segmentsRead == this.pageSegments) {
	  		return null;
	  	}

	  	var buf = stream.readSingleBuffer(page.segments);
	  	this.segmentsRead += 1;
	  	return buf;
	  }
	};

	return page;
  }

  this.speex = function (stream) {
  	return {
		speex_string: stream.readString(8)
	  , speex_version: stream.readString(20)
	  , speex_version_id: stream.readInt32(true)
	  , header_size: stream.readInt32(true)
	  , rate: stream.readInt32(true)
	  , mode: stream.readInt32(true)
	  , mode_bitstream_version: stream.readInt32(true)
	  , nb_channels: stream.readInt32(true)
	  , bitrate: stream.readInt32(true)
	  , vbr: stream.readInt32(true)
	  , frames_per_packet: stream.readInt32(true)
	  , extra_headers: stream.readInt32(true)
	  , reserved1: stream.readInt32(true)
	  , reserved2: stream.readInt32(true)
	};
  }

  this.flac = function (stream) {
  	throw new Error("To be implemented");
  }

  this.celt = function (stream) {  	
  	throw new Error("To be implemented");
  }

  this.vorbis = function (stream) {  	
  	throw new Error("To be implemented");
  }

  this.prototype.decoderInit = false;

  this.prototype.readHeaderSegment = function (stream) {
  	var identifier = stream.peekString(0, 8), h, codec;

  	if (identifier === "Speex   ") {
  		codec = "speex";  		
  	} else if (identifier === "\x01vorbis\x00") {
  		codec = "vorbis";
  	} else if (identifier === "CELT ") {  	
  		codec = "celt";
  	} else if (identifier === "FLAC ") {
  		codec = "flac";
  	}

  	h = OggDemuxer[codec](stream);
  	h.codec = codec;
  	return h;
  }

  this.prototype.readHeader = function () {
	this.header = this.readHeaderSegment(this.stream); 

	this.emit('format', {
		formatID: this.header.codec
	  , sampleRate: (this.header.mode + 1) * 8000
	  , channelsPerFrame: this.header.nb_channels
	  , bitsPerChannel: 16
	});
  }

  this.prototype.readExtraHeaders = function () {
  	// Ignore extra headers
  	this.stream.advance(this.currentPage.segments);
  }  	

  this.prototype.read = function (buffer) {
  	if (!this.decoderInit) {
  		
  		var h = this.header
  		  , cookie = {
			mode: h.mode
		  ,	block_size: this.currentPage.segments
		  , init: true
		};

		this.emit('cookie', cookie);
		this.decoderInit = true;
	}

	while (this.stream.peekUInt8() === 38) {
		this.stream.advance(1);
	}

	while (buffer = this.currentPage.nextSegment()) {			
		this.duration += 20;
		this.emit('data', buffer, this.isLast());
	}  			
  }  	

  this.prototype.isLast = function () {
  	return this.stream.remainingBytes() === 0; 
  }

  this.prototype.readChunk = function () {
  	var buffer;

  	while(!this.isLast()) {
  		while (this.stream.peekUInt8() !== 79) {
  			this.stream.advance(1);
  		}

	  	this.currentPage = this.readPage(this.stream);

		if (this.pi == 1) { // First Page - Headers
			
			this.readHeader();
			this.duration = 0;

		} else if (this.pi == 2) {  // Extra Headers Page
			
			this.readExtraHeaders();
		
		} else if (this.pi > 2) {  // Data			
		
			this.read(buffer);		
		}
	}

	this.emit('duration', this.duration);
  }
});

Decoder.extend(function () {
	Decoder.register("speex", this);	

	this.prototype.__decoder__ = null;

	this.prototype.nb = null;
	this.prototype.bufferIn = null;
	this.prototype.bufferOut = null;
	

	this.prototype.setCookie = function (cookie) {
		if (cookie.init) {
			this.__decoder__ = new SpeexDecoder({
				mode: cookie.mode
			  , bits_size: cookie.block_size
			  , lpcm: true
			});

			this.nb = cookie.block_size;

			this.__decoder__.init();
		}
	}

	this.prototype.readChunk = function () {
		if (this.stream.remainingBytes() == 0) {
			return this.once('available', this.readChunk);
		}

		this.bufferIn = this.stream.readBuffer(this.nb);
		this.bufferOut = this.__decoder__.process(this.bufferIn.data);

 		this.emit('data', this.bufferOut);

 		return 0;
	}
});
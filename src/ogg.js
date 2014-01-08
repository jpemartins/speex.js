function Ogg(stream, options) {
	var opts = options || {};
	this.stream = stream;
	this.pageExpr = new BitString(
	 "capturePattern:4/char,"
	+"version:1,"
	+"headerType:1,"
	+"granulePos:8,"
	+"serial:4,"
	+"sequence:4,"
	+"checksum:4,"
	+"pageSegments:1,"
	+"segments:pageSegments/char,"
	+"frames:_,", {
		bytes: true
	  , bigEndian: false
	});

	this.rawPages = [];
	this.pages = [];
	this.pageIdx = 0;

	this.frames = [];
	this.data = null;
	this.segments = [];

	this.unpacked = false;
	this.file = !!opts.file;
	this.error = (options||{}).error || function (e) {};
}

Ogg.CAPTURE_PATTERN = 0x4f676753; // "OggS"
Ogg.INVALID_CAPTURE_PATTERN = 1;

Ogg.prototype.magic = function (c) {
	var magic;

	magic |= (c[0] << 24);
	magic |= (c[1] << 16);
	magic |= (c[2] << 8);
	magic |= c[3];

	return magic;
}

Ogg.prototype.createPage = function (data) {
	return this.pageExpr.pack(data);
}

Ogg.prototype.parsePage = function (binStr) {
	var page = this.pageExpr.unpack(binStr),
		seg = page.segments;

	if (this.magic(page.capturePattern) != Ogg.CAPTURE_PATTERN) {
		this.error( { code: Ogg.INVALID_CAPTURE_PATTERN });
		return;
	}

	this.rawPages.push(binStr);

	page.bos = function () {
		return (this.header == 2);
	}

	page.cont = function () {
		return (this.header == 0);
	}

	page.eos = function () {
		return (this.header == 4);
	}

	// Pushes the ogg parsed paged
	this.pages.push(page);

	// Pushes the page frames
	this.frames.push(page.frames);
}

Ogg.prototype.pageOut = function () {
	return this.pages[this.pageIdx], (this.pageIdx += 1);
}

Ogg.prototype.pages = function () {
	return this.pages;
}

Ogg.prototype.demux = function () {
	if (this.unpacked) return;

	var begin, next = 0, str, frameIdx = 0;

	while(next >= 0) {

		// Fetches OGG Page begin/end
		var begin = this.stream.indexOf("OggS", next), tmp;
		next = this.stream.indexOf("OggS", begin + 4);

		// Fetch Ogg Raw Page
		str = this.stream.substring(begin, next != -1 ? next : undefined)

		// Parse and store the page
		this.parsePage(str);
	}

	// Fetch headers
	if (this.file) {
		frameIdx = 2;
		this.headers = this.frames.slice(0, frameIdx);
	}

	// Fetch Data
	this.data = this.frames.slice(frameIdx);
	for (var i = frameIdx; i<this.pages.length; ++i) {
		this.segments.push(this.pages[i].segments);
	}

	this.unpacked = true;
	return this.pages;
}

Ogg.prototype.mux = function (d, o) {
	function OggPageHeader(type, length, checksum) {
		return page = {
			capturePattern: [0x4f, 0x67, 0x67, 0x53]
		  , version: 0
		  , headerType: type
		  , granulePos: 0 // TODO
		  , serial: 406
		  , sequence: 0
		  , checksum: checksum || 0 // TODO
		  , pageSegments: 1
		  , segments: [ length || 0 ]
		  , frames: ""
		};
	}

	function OggPageData(segments) {
		var p = OggPageHeader(0);
		p.pageSegments = segments.length;
		p.segments = segments;
		return p;
	}

	function frames(segments) {
		var sum = 0;
		for (var i=0; i<segments.length; ++i) {
			sum += segments[i];
		}
		return sum;
	}

	o=o||{};

	var str = "";
	var hdr = d[0];
	// header page
	str = this.createPage(OggPageHeader(2,
			o.length || hdr.length, o.checksum))+hdr;
	if (d.length == 1)
		return str;

	var comments = d[1];
	// comments page
	str += this.createPage(OggPageHeader(0,
			o.length || comments.length, o.checksum))+comments;
	if (d.length == 2)
		return str;


	// data page
	var data = d[2];
	var segments = data[1].chunk(100)
	  , stream = String.fromCharCode.apply(null,
	  		new Uint8Array(data[0].buffer))
	  , a = 0, b = 0, len = segments.length;

	for (var i = 0; i < len; ++i) {
		var segchunk = segments[i];
		b += frames(segchunk);
		str += (this.createPage(OggPageData(segchunk)) + stream.substring(a, b));
		a = b;
	}
	return str;
}

Ogg.prototype.bitstream = function () {
	if (!this.unpacked)	return null;
	return this.data.join("");
};

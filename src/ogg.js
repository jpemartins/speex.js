function Ogg(stream) {
	this.stream = stream;
	this.pageExpr = new BitString(
	 "char(4):capturePattern;"
	+"1:version;"
	+"1:headerType;"
	+"8:granulePos;"
	+"4:serial;"
	+"4:sequence;"
	+"4:checksum;"
	+"1:pageSegments;"
	+"1:segments;"
	+"char():frames;", {
		bytes: true
	  , bigEndian: false
	});

	this.rawPages = [];
	this.pages = [];
	this.pageIdx = 0;

	this.frames = [];

	this.unpacked = false;
}

Ogg.prototype.parsePage = function (binStr) {
	var page = this.pageExpr.unpack(binStr);

	// Pushes the ogg page
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

	var idx=0;

	while (page.frames[idx] == '&') {
		++idx;
	}

	page.frames = page.frames.substr(idx);
		
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

Ogg.prototype.unpack = function () {
	if (this.unpacked) return;

	var begin, next = 0, str;

	while(next >= 0) {

		// Fetches OGG Page begin/end
		var begin = this.stream.indexOf("OggS", next), tmp;
		next = this.stream.indexOf("OggS", begin + 4);

		// Fetch Ogg Raw Page
		str = this.stream.substring(begin, next != -1 ? next : undefined)
		
		// Parse and store the page
		this.parsePage(str);
	}

	// Fetch (Extra-)headers
	this.headers = this.frames.slice(0, 2);
	
	// Fetch Data
	this.data = this.frames.slice(2);
	
	this.unpacked = true;
	return this.pages; 
}

Ogg.prototype.bitstream = function () {
	if (!this.unpacked)	return null;
	return this.data.join("");
};

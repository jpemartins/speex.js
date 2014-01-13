var assert = chai.assert;

describe("Ogg", function () {
	var wb, nb;
	before(function () {
		wb = {
		    src: "../assets/wb_male_speex_21.ogg"
	  	  , data: null
	  	  , ogg: null
		};

		nb =  {
	    	src: "../assets/female.ogg"
	  	  , data: null
	  	  , ogg: null
		};
	});

	it("read wideband file", function (done) {
		Speex.readArrayBuffer(wb.src, function (data) {
			assert.ok(!!data);
			assert.equal(24045, data.byteLength);
			wb.data = String.fromCharCode.apply(null, new Uint8Array(data));
			done();
		});
	});

	it("read narrowband file", function (done) {
		Speex.readArrayBuffer(nb.src, function (data) {
			assert.ok(!!data);
			assert.equal(11989, data.byteLength);
			nb.data = String.fromCharCode.apply(null, new Uint8Array(data));
			done();
		});
	});
	
	describe("#new", function () {
		it("should create wideband ogg", function () {
			wb.ogg = new Ogg(wb.data, { file: true });
			assert.ok(!!wb.ogg.error);
		});
		it("should create narrowband ogg", function () {
			nb.ogg = new Ogg(nb.data, { file: true });
			assert.ok(!!nb.ogg.error);
		});		
		it("bitstrings are compiled", function () {
			assert.equal(11, wb.ogg.pageExpr.types.length);
			assert.equal(11, nb.ogg.pageExpr.types.length);
		});
	});

	describe("#unpack", function () {
		it("should have all the fields for each ogg page", function (done) {
			var pages = wb.ogg.demux();
			for (var i = 0, len = wb.ogg.data.length; i < len; ++i) {
				var page = wb.ogg.pages[i];
				assert(page.capturePattern != undefined&& 
					page.version != undefined && 
					page.headerType != undefined && 
					page.granulePos != undefined &&
					page.serial != undefined &&
					page.sequence != undefined &&
					page.checksum != undefined &&
					page.pageSegments != undefined &&
					page.segments != undefined &&
					page.frames != undefined
				  , "page "+i+" correct");
			}
			done();
		});

		it("should all start with 'OggS'", function () {
			var magic = wb.ogg.magic
			  , len = wb.ogg.pages.length;
			for (var i = 0, page; i < len; ++i) {
				page = wb.ogg.pages[i];
				assert(magic(page.capturePattern) == Ogg.CAPTURE_PATTERN, 
					"page "+i+" not valid");
			}
		});


		it("bos page", function () {
			assert.equal(2, wb.ogg.pages[0].headerType, 
				"first page header type is BOS");
		});

		it("data", function () {
			assert(wb.ogg.data.length > 0, "no data");
			for (var i = 1, len = wb.ogg.data.length; i < len - 1; ++i) {
				assert.equal(0, wb.ogg.pages[i].headerType,
					"remaining pages are CONT");
			}
		});

		it("eos page", function () {
			var len = wb.ogg.pages.length;
			assert.equal(4, wb.ogg.pages[len - 1].headerType, 
				"last page is EOS");
		});

		it("granule positions grows", function () {
			var prev = wb.ogg.pages[0].granulePos;
			for (var i = 0, len = wb.ogg.pages.length; i < len; ++i) {
				assert(prev <= wb.ogg.pages[i].granulePos);
				prev = wb.ogg.pages[i].granulePos;
			}
		});
	});

	describe("#pack", function () {
		var page = {
			capturePattern: [0x4f, 0x67, 0x67, 0x53]
		  , version: 0
		  , headerType: 2
		  , granulePos: 0
		  , serial: 406
		  , sequence: 0
		  , checksum: 1382996072
		  , pageSegments: 1
		  , segments: [ 80 ]
		  , frames: ""
		};

		it("should encap the whole header", function () {
			var str = wb.ogg.mux([wb.ogg.frames[0]]);
			assert.equal(str, wb.ogg.rawPages[0]);
		});

		it("should encap a data ogg page header", function () {
			var p = wb.ogg.pages[2];
			p.frames = "";
			var str = wb.ogg.createPage(p);
			assert.equal(str, wb.ogg.rawPages[2].substr(0, str.length));
		});

		it("should encap the whole data ogg page", function () {
			var p = wb.ogg.pages[2];
			p.frames = "";
			var str = wb.ogg.createPage(p) + wb.ogg.frames[2];
			assert.equal(str, wb.ogg.rawPages[2]);
		});

		it("should pack the whole file", function () {
			var len = wb.ogg.rawPages.length;			
			var str = "";
			for (var i = 0; i<len; ++i) {
				var p = wb.ogg.pages[i]
				  , packedPage = (wb.ogg.createPage(p) + wb.ogg.frames[i]);
				p.frames = "";

				str += packedPage;
				assert.equal(packedPage, wb.ogg.rawPages[i], "page "+i+" invalid");
			}			
			assert.equal(str, wb.data);
		});
	});
	
	describe("Speex", function () {
		var spxhdr = new BitString(
			 "speex_string:8/char,"
			+"speex_version_string:20/char,"
			+"speex_version_id/int,"
			+"header_size/int,"
			+"rate/int,"
			+"mode/int,"
			+"mode_bitstream_version/int,"
			+"nb_channels/int,"
			+"bitrate/int,"
			+"frame_size/int,"
			+"vbr/int,"
			+"frames_per_packet/int,"
			+"extra_headers/int,"
			+"reserved1/int,"
			+"reserved2/int", {
				bytes: true
		  	  , bigEndian: false
			});

		it ("should decode speex header", function () {
			var o = spxhdr.unpack(wb.ogg.frames[0])
			  , src = Speex.parseHeader(wb.ogg.frames[0]);

			o.speex_string = String.fromCharCode.apply(null, 
					o.speex_string);
			o.speex_version_string = String.fromCharCode.apply(null, 
					o.speex_version_string);

			assert.equal("Speex   ", o.speex_string);
			assert.equal("1.2rc1\0\0\0\0\0\0\0\0\0\0\0\0\0\0", 
				o.speex_version_string);
			assert.deepEqual(src, o);
		});

		it ("should encode speex header", function () {
			function str2arr(str) {			
	  			var arr = new Array(str.length);
	  			for (var i=0, len=str.length; i<len; i++) {
	    			arr[i] = str.charCodeAt(i);
	  			}
	  			return arr;
			}

			var hdr = {
					bitrate: -1,
					extra_headers: 0,
					frame_size: 320,
					frames_per_packet: 1,
					header_size: 80,
					mode: 1,
					mode_bitstream_version: 4,
					nb_channels: 1,
					rate: 16000,
					reserved1: 0,
					reserved2: 0,
					speex_string: str2arr("Speex   "),
					speex_version_id: 1,
					speex_version_string: 
						str2arr("1.2rc1\0\0\0\0\0\0\0\0\0\0\0\0\0\0"),
					vbr: 0
				};
			var str = spxhdr.pack(hdr), dec;
			assert.equal(str.length, wb.ogg.frames[0].length, "Length dont match");
			dec = spxhdr.unpack(wb.ogg.frames[0]);
			assert.deepEqual(dec, hdr);
			assert.equal(str, wb.ogg.frames[0]);
		});
	});
});

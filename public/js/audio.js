(function (global) {

function readArrayBuffer(src, callback) {
	if (!callback)
		return null;

	var xhr = new XMLHttpRequest();
	var blob;
	xhr.responseType = 'arraybuffer';
	xhr.onload = function (e) {
		if (e.target.status == 200)
		return callback(e.target.response);
	};

	xhr.open("GET", src, true);
	xhr.send();
}

function readBlobURL(src, callback) {
	var xhr = new XMLHttpRequest();
	var blob;
	xhr.open("GET", src, true);
	xhr.responseType = 'blob';
	xhr.onload = function (e) {
		if (e.target.status == 200)
			return callback(e.target.response);
	}
	xhr.send();
	return blob;
}

function readFile(evt, onload, isTypedArray, callback) {
    var f = evt.target.files[0];
    var reader = new FileReader();
	reader.onload = (function (file) {
		return onload;
	})(f);

	// Read the file as an ArrayBuffer
    if (!!isTypedArray) {
    	reader.readAsArrayBuffer(f);
		return;
	}

	// Read the file as a Binary String
    reader.readAsBinaryString(f);
}

function decodeFile (file) {
	var stream, samples, st;
	var ogg, header, err;

	ogg = new Ogg(file, { file: true });
	ogg.demux();
	stream = ogg.bitstream();

	header = Speex.parseHeader(ogg.frames[0]);
	console.log(header);

	comment = new SpeexComment(ogg.frames[1]);
	console.log(comment.data);

	performance.mark("decodeStart");
	st = new Speex({
		quality: 8
	  ,	mode: header.mode
	  , rate: header.rate
	});

	samples = st.decode(stream, ogg.segments);

	performance.mark("decodeEnd");
	performance.measure("decode", "decodeStart", "decodeEnd");

	return [samples, header];
}

function wavDemux (file) {
	var filebuf = new Uint8Array(file)
	  , wavHeader = filebuf.subarray(0, 44)
	  , wavData = filebuf.subarray(44)
	  , pcm = PCMData.decode(String.fromCharCode
					.apply(null, wavHeader));

	pcm.samples = new Int16Array(wavData.buffer);
	return pcm;
}

function encodeFile (file) {
	var pcm = wavDemux(file)
	  , isNarrowband = pcm.sampleRate < 16000
	  , spxcodec = new Speex({
    	   quality: 8
	  	 , mode: isNarrowband ? 0 : 1
	  	 , bits_size: isNarrowband ? 38 : 70
		})
	  , spxhdr, spxcmt, spxdata
	  , oggdata = new Ogg(null, {file: true}), r;

	spxcodec.bits_size = isNarrowband ? 15 : 70;

	performance.mark("encodeStart");
	 // samples
	spxdata = spxcodec.encode(pcm.samples, true);

	spxhdr = new SpeexHeader({
		bitrate: -1,
		extra_headers: 0,
		frame_size: isNarrowband ? 160 : 320,
		frames_per_packet: 1,
		header_size: 80,
		mode: isNarrowband ? 0 : 1,
		mode_bitstream_version: 4,
		nb_channels: 1,
		rate: pcm.sampleRate,
		reserved1: 0,
		reserved2: 0,
		speex_string: "Speex   ",
		speex_version_id: 1,
		speex_version_string:
			"1.2rc1\0\0\0\0\0\0\0\0\0\0\0\0\0\0",
		vbr: 0
	});

	spxcmt = "Encoded with speex.js";
	spxcmt = new SpeexComment({
		vendor_string: spxcmt
	  , vendor_length: spxcmt.length
	});

	r = oggdata.mux([spxhdr.raw, spxcmt.raw, spxdata]);
	performance.mark("encodeEnd");
	performance.measure("encode", "encodeStart", "encodeEnd");
	return r;
}

function audioElementDecode(element, src) {
	var audio = element;
	readBlobURL(src, function (blob) {
		var evt;
		blob.name = src;
		evt = { target: { files: [ blob ] } };
		readFile(evt, function (event) {
			var ret = decodeFile(event.target.result)
			  , samples = ret[0], rate = ret[1].rate;
			var waveData = PCMData.encode({
				sampleRate: rate, channelCount: 1,
				bytesPerSample: 2, data: samples
			}), waveDataBuf;

			waveDataBuf = Speex.util.str2ab(waveData);
			var blob = new Blob([waveDataBuf], { type: "audio/wav" });
			audio.src = URL.createObjectURL(blob);
			audio.play();
		}, false);
	});
}

function checkAudioElements() {
	var audioElements = document.querySelectorAll("audio");
	for (var i = 0; i<audioElements.length; ++i){
		var audio = audioElements[i];
		if (!audio.error)
			continue;

		if (audio.error.code == MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ||
			audio.error.code == MediaError.MEDIA_ERR_DECODE) {
			console.warn("Couldn't decode media, trying with speex");
			audioElementDecode(audio, audio.src);
		}
	}
}

global.checkAudioElements = checkAudioElements;
global.readFile = readFile;
global.readBlob = readBlobURL;
global.readArrayBuffer = readArrayBuffer;
global.decodeFile = decodeFile;
global.encodeFile = encodeFile;

})(Speex);
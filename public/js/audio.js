(function (global) {

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
	var ogg, header, headerFrame, err;

	ogg = new Ogg(file, { file: true });
	ogg.unpack();
	stream = ogg.bitstream();
	headerFrame = ogg.frames[0];

	header = Speex.parseHeader(headerFrame);
	console.log(header);

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
global.decodeFile = decodeFile;

})(Speex);
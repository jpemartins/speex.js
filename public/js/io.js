function handleFileSelect(evt, isTypedArray) {
    var f = evt.target.files[0];
    var reader = new FileReader();
	reader.onload = (function (file) {
		return function (e) {
			var extension = file.name.split(".")[1];

			if (extension === "ogg") {
				var samples, ogg = new Ogg(e.target.result), samplesDec;

				ogg.unpack();
				samples = ogg.bitstream();

				ret = Speex.header(ogg.frames[0]);
				console.log(ret);

				samplesDec = new Speex({
					quality: 8
				}).decode(samples);

				Speex.util.play(samplesDec);

			} else if (extension == "wav") {
				var data = e.target.result;
				encodeWAV(data);
			}
		}
	})(f);
    	
	// Read the file as an ArrayBuffer
    if (!!isTypedArray) {
    	reader.readAsArrayBuffer(f);	
		return;
	}
	
	// Read the file as a Binary String
    reader.readAsBinaryString(f);
}

function encodeWAV (data) {
	var isFloatArray = data.constructor.prototype == Float32Array.prototype;
	var frames, bytes, begin, end, times, ret
	  , buffer = data;

	var shorts = !isFloatArray ? new Int16Array(buffer) : data;
	
	var codec = new Speex({
	   	benchmark: false
	  , quality: 2
	  , complexity: 2
	  , bits_size: 15		  
	})
	
	var spxdata = codec.encode(shorts, true);
	Speex.util.play(codec.decode(spxdata));
	codec.close();
}

document.getElementById('file').addEventListener('change', function (evt) {
	handleFileSelect(evt);
}, false);

document.getElementById('play_wav').addEventListener('change', function (evt) {
	handleFileSelect(evt, true);
}, false);

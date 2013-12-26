(function (global) {

var etimes = document.querySelector("#etimes")
  , dtimes = document.querySelector("#dtimes")
  , nrsamples = document.querySelector("#nrsamples");

function printStreamTimes(e, d, nr) {
	!!e && (etimes.innerHTML = ""+e);
	!!d && (dtimes.innerHTML = ""+d);
	!!nr && (nrsamples.innerHTML = ""+nr);
}

global.printStreamTimes = printStreamTimes;

var tdtimes = document.querySelector("#dtotaltime")
  , tetimes = document.querySelector("#etotaltime")
  , dsize = document.querySelector("#dsize")
  , esize = document.querySelector("#esize");


function printFileTimes(ds, es, td, te) {
	!!ds && (dsize.innerHTML = ""+ds);
	!!es && (esize.innerHTML = ""+es);
	!!td && (tdtimes.innerHTML = ""+td);
	!!te && (tetimes.innerHTML = ""+te);
}

global.printFileTimes = printFileTimes;

function handleFileSelect(evt, isTypedArray) {
    var f = evt.target.files[0];
    var reader = new FileReader();
	reader.onload = (function (file) {
		return function (e) {
			var extension = file.name.split(".")[1];

			if (extension === "ogg") {
				var data = e.target.result;
				var samples = decodeOgg(data);
				Speex.util.play(samples);

			} else if (extension == "wav") {
				var data = e.target.result;
				var samples = encodeWAVdecodeSpx(data);
				Speex.util.play(samples);
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

function decodeOgg (file) {
	var samples, samplesDec;
	var ogg = new Ogg(file);

	ogg.unpack();
	samples = ogg.bitstream();

	ret = Speex.header(ogg.frames[0]);
	console.log(ret);

	performance.mark("decodeStart");
	samplesDec = new Speex({
		quality: 8
	}).decode(samples);
	performance.mark("decodeEnd");

	performance.measure("decode", "decodeStart", "decodeEnd");

	printFileTimes(samplesDec.length, file.length, 
		performance.getEntriesByName("decode")[0].duration, null);

	return samplesDec;
}

function encodeWAVdecodeSpx (data) {
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
	
	performance.mark("encodeStart");
	var spxdata = codec.encode(shorts, true);
	performance.mark("encodeEnd");

	performance.mark("decodeStart");
	var samples = codec.decode(spxdata);
	performance.mark("decodeEnd");
	
	performance.measure("encode", "encodeStart", "encodeEnd");
	performance.measure("decode", "decodeStart", "decodeEnd");

	printFileTimes(
		data.byteLength,
		spxdata.byteLength,
		performance.getEntriesByName("decode")[0].duration,
		performance.getEntriesByName("encode")[0].duration);
	
	codec.close();

	performance.clearMeasures();
	performance.clearMarks();
	return samples;
}

document.getElementById('file').addEventListener('change', function (evt) {
	handleFileSelect(evt);
}, false);

document.getElementById('play_wav').addEventListener('change', function (evt) {
	handleFileSelect(evt, true);
}, false);

})(window);
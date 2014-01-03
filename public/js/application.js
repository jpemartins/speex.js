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
	var file = evt.target.files[0];
	Speex.readFile(evt, function(e) {
		var ext = file.name.split(".")[1];
		var samples, sampleRate;

		if (ext === "ogg") {
			var data = e.target.result,
				ret, header;
			ret = Speex.decodeFile(data);
			samples = ret[0];
			header = ret[1];
			sampleRate = header.rate;
					
			printFileTimes(samples.length*2, file.length, 
				performance.getEntriesByName("decode")[0].duration, null);

		} else if (ext == "wav") {
			var data = e.target.result;
			samples = encodeWAVdecodeSpx(data);			
		}

		Speex.util.play(samples, sampleRate);

	}, isTypedArray);
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
	});
	
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

setTimeout(function(){
	Speex.checkAudioElements();
}, 200);

})(window);
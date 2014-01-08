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

function addDownloadLink(filename, sel, data, mimetype) {
	var url = "data:"+mimetype+";base64,"+btoa(data);
	var container = document.querySelector(sel).parentElement;
	var anchor =  "<br/><a download=\""+filename+"\" href=\"" +
		url + "\">" + filename + " ("+data.length/1024.0+" Kbytes)</a>";

	container.innerHTML += anchor;
}

function handleFileSelect(evt, isTypedArray) {
	var file = evt.target.files[0];
	Speex.readFile(evt, function(e) {
		var tks = file.name.split(".");
		var filename = tks[0]
		  , ext = tks[1];
		var samples, sampleRate;

		if (ext === "ogg") {
			var data = e.target.result,
				ret, header;
			ret = Speex.decodeFile(data);
			samples = ret[0];
			header = ret[1];
			sampleRate = header.rate;
			addDownloadLink(filename+".wav", "#file_ogg",
				samples, "audio/wav");

			printFileTimes(samples.length*2, file.length,
				performance.getEntriesByName("decode")[0].duration, null);

			Speex.util.play(samples, sampleRate);
		} else if (ext == "wav") {
			var data = e.target.result;
			samples = Speex.encodeFile(data);
			addDownloadLink(filename+".ogg", "#file_wav",
				samples, "audio/ogg");

			printFileTimes(data.length, samples.length, 0,
				performance.getEntriesByName("encode")[0].duration);
		}
	}, isTypedArray);
}

document.getElementById('file_ogg').addEventListener('change', function (evt) {
	handleFileSelect(evt);
}, false);

document.getElementById('file_wav').addEventListener('change', function (evt) {
	handleFileSelect(evt, true);
}, false);

setTimeout(function(){
	Speex.checkAudioElements();
}, 200);

})(window);
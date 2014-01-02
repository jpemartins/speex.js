(function (global) {
	global.util = {
		toString: function (data, fn) {
			var BlobBuilder = global["WebKitBlobBuilder"] || global["MozBlobBuilder"] || global["BlobBuilder"];

			var bb = new BlobBuilder();
			bb.append(data.buffer);
			buffer = null;
			var reader = new FileReader();
			reader.onload = function (e) {
				fn(e.target.result);
			};
			reader.readAsBinaryString(bb.getBlob());	
		}

	  , parseInt: function (chr) {
	  		return Binary.toUint8(chr);
	  	}

	  , mozPlay: function (floats) {
		  	var audio, pos = 0, size;
		  	if ((audio = new Audio())["mozSetup"]) {
		  		audio.mozSetup(1, 8000);

		  		while (pos < floats.length) {
		  			size = (floats.length - pos > 800) ? 800 : floats.length - pos;
		  			audio.mozWriteAudio(floats.subarray(pos, pos+size));
		  			pos += size;
		  		}  		
		  	}
		}

	  , play: function (floats, sampleRate) {
		  	var waveData = PCMData.encode({
				sampleRate: sampleRate || 8000,
				channelCount:   1,
				bytesPerSample: 2,
				data: floats
			});
			
			var element = new Audio();
			element.src = "data:audio/wav;base64,"+btoa(waveData);
			element.play();	
		}

		/**
		  * @author LearnBoost
		  */
	  , merge: function (target, additional, deep, lastseen) {
			var seen = lastseen || []
			  , depth = typeof deep == 'undefined' ? 2 : deep
			  , prop;

			for (prop in additional) {
			  if (additional.hasOwnProperty(prop) && seen.indexOf(prop) < 0) {
			    if (typeof target[prop] !== 'object' || !depth) {
			      target[prop] = additional[prop];
			      seen.push(additional[prop]);
			    } else {
			      merge(target[prop], additional[prop], depth - 1, seen);
			    }
			  }
			}

			return target;
		}

		/**
		  * @author LearnBoost
		  */
	  , inherit: function (ctor, ctor2) {
	    	function f() {};
	    	f.prototype = ctor2.prototype;
	    	ctor.prototype = new f;
	  	}

	  , str2ab: function (str) {
			var buf = new ArrayBuffer(str.length); // 2 bytes for each char
  			var bufView = new Uint8Array(buf);
  			for (var i=0, strLen=str.length; i<strLen; i++) {
    			bufView[i] = str.charCodeAt(i);
  			}
  			return buf;
		}
  	}
}(this));
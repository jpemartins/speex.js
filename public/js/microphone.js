(function () {

var Context = window["webkitAudioContext"] || window["mozAudioContext"] || window["AudioContext"];

function startCapture() {
  var supported = typeof(Context) !== "undefined";
  supported && !!(new Context()).createMediaElementSource;

  if (supported) {
    gUM_startCapture();
    return;
  }

  flash_startCapture();
}

function gUM_startCapture() {
    var codec = new Speex({ quality: 6 });

    function onmicaudio (samples) {
        var encoded = codec.encode(samples), decoded;        
        if (!!encoded){
            decoded = codec.decode(encoded);
            sink.writeAudio(decoded); 
        }

    }

    var resampler = new Resampler(44100, 8000, 1, 1024);
	  var sink = new XAudioServer(1, 8000, 320, 512, function (samplesRequested) {}, 0);

    function callback (_fn) {
        var fn = _fn;
        return function (stream) {
            var audioContext = new Context();

            // Create an AudioNode from the stream.
            var mic = audioContext.createMediaStreamSource( stream );
            var processor = audioContext.createJavaScriptNode( 1024, 1, 1 );
            var refillBuffer = new Int16Array(190);

            processor.onaudioprocess = function (event) {
                var inputBuffer = event.inputBuffer.getChannelData(0);
                var samples = resampler.resampler(inputBuffer);

                for (var i = 0; i < samples.length; ++i) {
                    refillBuffer[i] = Math.ceil(samples[i] * 32768);
                }

                fn (refillBuffer);
            }

            mic.connect(processor);
            processor.connect(audioContext.destination);
        }
    }
    navigator.webkitGetUserMedia( {audio:true}, callback(onmicaudio) );
}

function flash_startCapture() {
    // quality = 2; nb = 15
    // quality = 4; nb = 20
    // quality = 6; nb = 28
    // quality = 8; nb = 38
    var codec = new Speex({
              quality: 6
        })

      , sink = new Audio()
      , buffer_size = 2304;
    
    sink["mozSetup"] && sink.mozSetup(1, 8000);
    
    function onRecordingComplete() {
        
    }

    function onCaptureError (err) {
        console.error(err);
    }

    function onSamplesDec (samples) {                
        var wavData = atob(samples)
          , data = new Int16Array(new ArrayBuffer(wavData.length - 44))
          , encoded, decoded;
        
        if (data.length > buffer_size) {
            console.log("too much samples: size=", data.length);
            return;
        }

        for (var i=44, j=-1; ++j < data.length; i+=2) {
            data[j] = Binary.toInt16(wavData.substr(i, 2));
        }
    
        encoded = codec.encode(data);        
        if (!!encoded){
            decoded = codec.decode(encoded)
            sink["mozWriteAudio"] && sink.mozWriteAudio(decoded);
            !sink["mozWriteAudio"] && Speex.play(decoded);
        }
    }

    navigator.device.captureAudio(onRecordingComplete, onCaptureError, {
        codec: "Speex"
      , raw: true
      , onsamples: onSamplesDec
    });
}

document.getElementById('flash-capture').addEventListener('click', startCapture, false);

})();


function startCapture() {
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
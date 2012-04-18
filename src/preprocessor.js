(function (global) {

var util = Speex.util;

function SpeexPreProcessor (params) {
	CodecProcessor.apply(this, arguments);	

	this.opt_basename = "SPEEX_PREPROCESS_SET_";
}

util.inherit(SpeexPreProcessor, CodecProcessor);

SpeexPreProcessor.prototype.init = function () {
}

SpeexPreProcessor.prototype.process = function (pcmdata) {
}


SpeexPreProcessor.prototype.close = function () {
}

global["SpeexPreProcessor"] = SpeexPreProcessor;

}(this));
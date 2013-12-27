(function () {
	if (window.performance["mozMark"] || window.performance["mark"]) {
		return;
	}

	function PerformanceEntry(name, entryType, startTime, duration) {
		this.name = name;
		this.entryType = entryType;
		this.startTime = startTime;
		this.duration = duration;
	}

	function PerformanceMeasure(name, startTime, duration) {
		PerformanceEntry.apply(this, [name, "measure", startTime, duration ]);
	}
	PerformanceMeasure.prototype = PerformanceEntry.prototype;

	function PerformanceMark(name, startTime) {
		PerformanceEntry.apply(this, [name, "mark", startTime, 0 ]);
	}
	PerformanceMeasure.prototype = PerformanceEntry.prototype;

	var navStart = performance.timing.navigationStart;

	/* DOMHighResTimeStamp is the relative time to navigationStart
	 * The precision of the timer is down to a tenth of a milisecond (double value)
     */
	var tick = !!performance.now ? (function(){ return performance.now() }) : 
			(function () { return Date.now() - navStart; });

	const marks = {}, measures = {};

	var entries = {
		'marks': marks
	  , 'measures': measures
	}

	performance.__proto__.mark = function (name) {
		if (name in performance.timing) {
			throw new Error("mark name not allowed");
		}

		(marks[name] = marks[name] || []).push(new PerformanceMark(name, tick()));
	}

	performance.__proto__.clearMarks = function (name) {
		if (!name) {
			delete marks;
			return (marks = {});
		}
		
		marks[name] = [];
	}

	performance.__proto__.measure = function (name, startMark, endMark) {
		var duration, startTime, startIdx, endIdx;
		var startMarks = marks[startMark||""]
		  , endMarks = marks[endMark||""];

		if (!measures[name]) {
			measures[name] = [];	
		}

		startIdx = (startMarks || []).length - 1;

		if (!endMarks && startMarks) {
			startTime = startMarks[startIdx].startTime;
			duration = startTime - performance.now();
		} else if (!startMarks) {
			startTime = performance.now();
			duration = startTime - navStart;
		} else if (endMarks && startMarks) {
			endIdx = (endMarks || []).length - 1;			
			startTime = startMarks[startIdx].startTime;
			duration = endMarks[endIdx].startTime - startTime
		}

		measures[name].push(new PerformanceMeasure(name, 
			startTime, duration));
	}

	performance.__proto__.clearMeasures = function (name) {
		if (!name) {
			delete measures;
			return (measures = {});
		}
		
		measures[name] = [];
	}

	performance.__proto__.getEntriesByName = function (name) {
		return measures[name] || measures;
	}

	performance.__proto__.getEntriesByType = function (type) {
		var arr;
		if (type == "measures") {
			arr = measures;
		} else if (type == "mark") {
			arr = []
			for (p in marks) {
				arr = arr.concat(marks[p]);
			}
		}
		return arr;
	}

}());


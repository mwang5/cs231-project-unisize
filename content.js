
// true: squeezed, false: normal
var isActive = false
var mobileWidthThreshold = 400
var unmodifiedActualWidth = null
var previousViewportWidth = null
/*	0	unmodified
	1	resized
   	2	mobile		*/
var curLevel = 0


function getGeometry() {
	return {
		"width": {
			"actual": document.documentElement.scrollWidth,
		   	"viewport": document.documentElement.clientWidth
			}
		}
}

function getAppropriateLevel(w) 
{
	if (w.viewport < mobileWidthThreshold) {
		return 2
	} else	if (w.viewport < unmodifiedActualWidth) {
		return 1
	} else {
		return 0
	}
}

function handleEvent() 
{
	console.log(tstamp() + " handling resize event");
	var w = getGeometry().width
	
	if (previousViewportWidth && previousViewportWidth == w.viewport) {
		console.log("\tignoring duplicate resize event");
		return; 
	} else {
		previousViewportWidth = w.viewport;
	}
	
	if (unmodifiedActualWidth == null && (w.actual > w.viewport) && w.viewport > mobileWidthThreshold) {
		unmodifiedActualWidth = w.actual
	}

	newLevel = getAppropriateLevel(w)
	if (newLevel == curLevel)
		return;
	
	if (curLevel == 0) {
		if (newLevel == 1) {
			modification_apply()
		} else if (newLevel == 2) {
			mobile_apply()
		}
	} else if (curLevel == 1) {
		if (newLevel == 0) {
			modification_revert()
		} else if (newLevel == 2) {
			mobile_apply()
		}
	} else if (curLevel == 2) {
		if (newLevel == 0) {
			mobile_revert()
		} else if (newLevel == 1) {
			mobile_revert()
			modification_apply()
		}
	}

	curLevel = newLevel
	chrome.extension.sendRequest({"iconState": curLevel}, function(){})
	
	console.log("\tviewport is now " + w.viewport );
	console.log("\tnotifying background page");
}


function modification_apply() {
	// get a matching rule
	chrome.extension.sendRequest({}, function(rule) {
		// apply rule
		var mods = rule.mods
		for (var i = 0; i < mods.length; i++) {
			applyTransform(mods[i].transform)
		}
	})
	// update icon
}

function modification_revert() {
	// XXX: poor solution, will clear forms
	window.location.reload()
}

function mobile_apply() {
	chrome.extension.sendRequest({"mobile": true}, function(){
		document.body.style.webkitTransform = "scale(0.86)"
		document.body.style.webkitTransformOrigin = "0px 0px"
		document.getElementById("viewport").style.width = "116%"
	})
}

function mobile_revert() {
	chrome.extension.sendRequest({"mobile": false}, function(){})
}


window.addEventListener('resize', function() {
	handleEvent()
})

console.log(tstamp() + "content script re-initialized");
handleEvent()


function tstamp() {
	var d = new Date()
	return d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds() + "." + d.getMilliseconds()
}


// true: squeezed, false: normal
var isActive = false
var unmodifiedActualWidth = null

function getGeometry() {
	return {
		"width": {
			"actual": document.documentElement.scrollWidth,
		   	"viewport": document.documentElement.clientWidth
			}
		}
}

function handleEvent() 
{
	var w = getGeometry().width
	
	if (!isActive && (w.actual > w.viewport)) {
		isActive = true;
		unmodifiedActualWidth = w.actual
		modify()
		chrome.extension.sendRequest({"iconState": "active"}, function(){})
	}
	else if (isActive && (w.viewport >= unmodifiedActualWidth)) {
		isActive = false;
		unmodifiedActualWidth = null
		restore()		
		chrome.extension.sendRequest({"iconState": "passive"}, function(){})
	}
}


function modify() {
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

function restore() {
	// XXX: poor solution, will clear forms
	window.location.reload()
}


window.addEventListener('resize', function() {
	handleEvent()
})

handleEvent()


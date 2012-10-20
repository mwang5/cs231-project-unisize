
// true: squeezed, false: normal
var state = undefined

function checkWindowSize() {
	var is_small
	//is_small = (window.innerWidth < 640)
	var root = document.compatMode=='BackCompat'? document.body : document.documentElement
	is_small = root.scrollWidth > root.clientWidth
	return is_small
}

function updateState() {
	var old_state = state
	state = checkWindowSize()
	return (old_state === undefined || state != old_state) 
}


function requestResizeIfNeeded() {
	if (updateState()) {
		chrome.extension.sendRequest({"state": state}, function(response) {})
	}
}


window.addEventListener('resize', function() {
	requestResizeIfNeeded()
})

requestResizeIfNeeded()


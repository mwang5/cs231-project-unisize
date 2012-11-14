var previousViewportSize = null
var ignoreResizeEvents = true 	// will be enabled from background.js:onTabActivated()

init()


function init() 
{
	chrome.extension.sendRequest({"type": "init"}, function(){})
	chrome.extension.onRequest.addListener(onRequest)
	window.addEventListener('resize', function() {
		var geom = _getGeometry()
		log("window.onresize (" + _size2str(geom.viewportSize) + ")")
		if (ignoreResizeEvents) {
			log("\tignored: events disabled")
		} else {
			if (previousViewportSize == null || !_sizeEqual(previousViewportSize, geom.viewportSize)) {
				previousViewportSize = geom.viewportSize
				log("\tnotifying background script")
				_handleResize(geom)
			} else {
				log("\tignored: size not changed")
			}
		}
	})
}


function _handleResize(geom)
{
	chrome.extension.sendRequest( {"type": "resize", "newGeometry": geom}, function(response) {
		var ts = response.parametrizedElementTransformList
		if (typeof ts != 'undefined') {
			log("applying element transformations")
			for (var i = 0; i < ts.length; i++) {
				applyTransform(ts[i].elementTransform, ts[i].param)
			}
		}
	})
}


function onRequest(req, sender, sendResponse) 
{
	if (req.type == "ignoreResizeEvents") {
		ignoreResizeEvents = req.value
		log("events " + (ignoreResizeEvents ? "disabled" : "enabled"))
		if (!ignoreResizeEvents) {
			var geom = _getGeometry()
			if (previousViewportSize == null || !_sizeEqual(previousViewportSize, geom.viewportSize)) {
				previousViewportSize = geom.viewportSize
				console.log("\tsize changed (" + _size2str(geom.viewportSize) + ") since events was last disabled, notifying background script")
				_handleResize(geom)
			}
		}
	}
	sendResponse({})
}


function _sizeEqual(a,b) {
	return (a.width == b.width && a.height == b.height)
}

function _getGeometry()
{
	return { "viewportSize": {
				"width": document.documentElement.clientWidth,
				"height": document.documentElement.clientHeight
				},
			"contentSize": {
				"width": document.documentElement.scrollWidth,
				"height": document.documentElement.scrollHeight
				}
			}
}


var T_RELATIVE_PIXEL_METRIC = 1
var T_SET_STRING_PROPERTY	= 2


function applyTransform(tran, param) 
{
	var xpres = document.evaluate(tran.element, document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null)
	var elem = xpres.iterateNext()

	switch(tran.method) {
		case T_RELATIVE_PIXEL_METRIC:
			elem.style[_stylePropertyNameToCamelCase(tran.property)] = 
					(_getComputedMetric(elem, tran.property) + param) + "px"
			break
		case T_SET_STRING_PROPERTY:
			elem.style[_stylePropertyNameToCamelCase(tran.property)] = param 
			break
		default:
			throw "unsupported element transformation method"
	}
}


function _stylePropertyNameToCamelCase(name)
{
	var errstr = "_propertyNameToCamelCase(): invalid argument" 
    var	components = name.split('-')
	if (components[0] == "") { // -webkit-*
		s = 1
	} else {
		s = 0
	}
	if (components.length <= s)
		throw errstr

	var res = ""
	for (var i = s; i< components.length; i++) {
		var c = components[i]
		if (c == "")
			throw errstr
		if (i == s) {
			res = res + c
		} else  {
			res  = res + c.substr(0,1).toUpperCase() + c.substr(1)
		}
	}
	return res
}


function _getComputedMetric(elem, name) 
{
	var str = window.getComputedStyle(elem).getPropertyValue(name)
	var pxi = str.indexOf("px")
	if (str == null || str.length == 0)
		throw ("style." + name + " is empty")
	if ( pxi <= 0 && pxi != str.length - 2)
		throw ("style." + name + " does not end in \"px\" or otherwise invalid")
	return parseInt(str.substr(0, str.length - 2))
}


function log(msg)
{
	if (msg[0] != '\t') { 
		var d = new Date()
		var msec = d.getMilliseconds() + ""
		msec = "000".slice(msec.length) + msec
		var tstamp = /* d.getHours() + ":" + d.getMinutes() + */ ":" + d.getSeconds() + "." + msec + "| "
		msg = tstamp + msg
	}
	console.log(msg)
}


function _size2str(size) 
{
	if (size == null) {
		return ""
	} else if (typeof size.width == 'undefined' || typeof size.height == 'undefined') {
		return "invalid"
	} else {
		return size.width + "x" + size.height
	}
}



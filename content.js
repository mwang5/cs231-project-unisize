var previousViewportSize = null
var ignoreResizeEvents = true 	// will be enabled from background.js:onTabActivated()
var L_ORIGINAL = 0
var L_SHRINKED = 1
var L_MOBILE   = 2
var cur_level = 0;

init()
window.onload = function () {
    
    //window.addEventListener('DOMNodeInserted', OnNodeInserted, true);
    //window.addEventListener('DOMNodeInsertedIntoDocument', OnNodeInserted, false);
};
var transform_rules;
function init()
{
    window.addEventListener('DOMNodeInserted', OnNodeInserted, true);
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

function OnNodeInserted(event_args)
{
    //console.log(event_args);
    if(event_args.target.tagName != "DIV")
        return;
    console.log(event_args);
    if(transform_rules)
    {
        if(event_args.target.baseURI.indexOf("calendar") > 0 && cur_level == L_SHRINKED)
        {
            for (var i = 0; i < transform_rules.length; i++) {
                applyTransformTo(event_args.target, transform_rules[i].elementTransform, transform_rules[i].param);
            }
        }
    }
}

function _handleResize(geom)
{
	chrome.extension.sendRequest( {"type": "resize", "newGeometry": geom}, function(response) {
        var ts = response.parametrizedElementTransformList;
        if(typeof response.tab_level != 'undefined')
            cur_level = response.tab_level;
        if (typeof ts != 'undefined') {
            transform_rules = ts;
            console.log("applying element transformations")
            for (var i = 0; i < ts.length; i++) {
                applyTransform(ts[i].elementTransform, ts[i].param)
            }
        }
    })
}


function onRequest(req, sender, sendResponse) 
{
    tab = sender.tab;
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

function applyTransformTo(target, tran, param)
{
    //console.log("In applyTransformTo");
    //console.log(target);
    var elements = target.querySelectorAll("div.fbCalendarGridDayHeader, div.fbCalendarGridItem");
   	//var xpres = document.evaluate(tran.element, target, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null)
	//var elem = xpres.iterateNext()
	/* SEE: http://blog.stchur.com/2006/06/21/css-computed-style/ */
    
    for(var i = 0;i < elements.length; i++)
    {
        switch(tran.method) {
            case T_RELATIVE_PIXEL_METRIC:
                elements[i].style[_stylePropertyNameToCamelCase(tran.property)] =
                (_getComputedMetric(elements[i], tran.property) + param) + "px"
                break
            case T_SET_STRING_PROPERTY:
                elements[i].style[_stylePropertyNameToCamelCase(tran.property)] = param
                break
            default:
                throw "unsupported element transformation method"
        }

    }/*
    while(elem != null)
    {
        //console.log(elem);
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
        elem = xpres.iterateNext()
    }*/
}



function applyTransform(tran, param)
{
	var xpres = document.evaluate(tran.element, document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null)
	var elem = xpres.iterateNext()
	/* SEE: http://blog.stchur.com/2006/06/21/css-computed-style/ */
    
    while(elem != null)
    {
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
        elem = xpres.iterateNext()
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



var tabs = {}
var winsz = null	// 'normal' window size for the rest of the tabs
var currentActiveTabId = null	// id of the currently active tab

var L_ORIGINAL = 0
var L_SHRINKED = 1
var L_MOBILE   = 2

var ICON_MAP = []
ICON_MAP[L_ORIGINAL] = "icon-inactive.png"
ICON_MAP[L_SHRINKED] = "icon.png"
ICON_MAP[L_MOBILE] = "icon-mobile.png"

var MOBILE_WIDTH_THRESHOLD = 400


// Called when a message is passed.  
function onRequest(req, sender, sendResponse) 
{
	var id = sender.tab.id
	var resp = {}

	if (req.type == 'init') {
		if (!(id in tabs))
			resp = onInit({"id": id, "browserObject": sender.tab})
		else
			log("WARN: init event on previously initialized tab (id=" + id + ")")

	} else if (req.type == 'resize') {
		if (!(id in tabs)) {
			log("ERROR: resize event on uninitialized tab (id=" + id + ")")
			sendResponse({})
			return
		}
		var tabconf = tabs[id]
		tabconf.browserObject = sender.tab
		resp = onResize(tabconf, req.newGeometry)
		delete tabconf.browserObject
	} 
	sendResponse(resp)
}


function onInit(tab)
{
	log("onInit(tab.id=" + tab.id + ")")
	if (!winsz) {
			_getWindowSize(tab.browserObject.windowId,	_recordGlobalWindowSize);
	}
	if ( !(tab.id in tabs) ) {
		tabs[tab.id] = {
			"id": 	 tab.id,
			"level": 0,
			"originalContentWidth" : null,
			"ignoreResize": false,	
			"lastDesktopUrl": null,
			"windowSize": null
		}
	}
	chrome.pageAction.show(tab.id)
	return {}
}


function onResize(tab, geom)
{
	log("onResize(tab.id=" + tab.id + ")")

	if (tab.originalContentWidth == null && (geom.contentSize.width > geom.viewportSize.width)
		   	&& tab.level == L_ORIGINAL ) {
		tab.originalContentWidth = geom.contentSize.width
	}

	_getWindowSize(tab.browserObject.windowId,	function(curSize) {
		tab.windowSize = curSize			 
	})

	var newLevel
	var curLevel = tab.level
	if (geom.viewportSize.width < MOBILE_WIDTH_THRESHOLD) {
		newLevel = L_MOBILE
	} else	if (tab.originalContentWidth && geom.viewportSize.width < tab.originalContentWidth) {
		newLevel = L_SHRINKED
	} else {
		newLevel = L_ORIGINAL
	}
	
	if (newLevel != curLevel) {

		var tranList = []
		if (newLevel == L_MOBILE) {
			tab.lastDesktopUrl = tab.browserObject.url; 
			chrome.webRequest.onBeforeSendHeaders.addListener(
					setUAHeader,
					{urls:["*://*/*"]},	// 'opt_filter'
					["requestHeaders", "blocking"] // 'blockingInfoSpec'
				);
			chrome.tabs.update(tab.id, {"url": "https://www.facebook.com"})
			tranList = [
						{
							"element": '//*[@id="viewport"]',
						   	"method": T_SET_STRING_PROPERTY,
							"property": "width",
							"value"	  : "116%"
						},
						{
							"element": '//body',
						   	"method": T_SET_STRING_PROPERTY,
							"property": "-webkit-transform",
							"value"	  : "scale(0.86)"
						},
						{
							"element": '//body',
						   	"method": T_SET_STRING_PROPERTY,
							"property": "-webkit-transform-origin",
							"value"	  : "0px 0px"
						}
					]
			for(var i=0; i<tranList.length; i++) {
				var tranInstance = {"elementTransform": tranList[i], "param": tranList[i].value }
				tranList[i] = tranInstance
			}

		}
		
		if (curLevel == L_MOBILE) {
			var desktopUrl = tab.lastDesktopUrl
			tab.lastDesktopUrl = null
			chrome.webRequest.onBeforeSendHeaders.removeListener(setUAHeader);
			chrome.tabs.update(tab.id, {url: desktopUrl}, function() {
				tab.level = L_ORIGINAL // change to L_SHRINKED in initial resize event of reloaded content script
			})
			return {}
		}

		var shrink = null;	
		if (newLevel == L_SHRINKED) {
			shrink = true
		} else if (curLevel == L_SHRINKED && newLevel != L_MOBILE) {
			shrink = false
		}
		
		if (shrink != null) {
			var modifications = RULE_DEFINITIONS[0].mods
			for (var i = 0; i < modifications.length; i++) {
				for (var j = 0; j < modifications[i].transform.length; j++) {

					var tran = modifications[i].transform[j]
					var tranInstance = {"elementTransform": tran}
					if (tran.method == T_RELATIVE_PIXEL_METRIC) { 
						tranInstance.param = shrink ? tran.maxDelta : -tran.maxDelta
					} else if (tran.method == T_SET_STRING_PROPERTY) {
						tranInstance.param = shrink ? tran.value : ""
					}
					tranList = tranList.concat(tranInstance)
				}	
			}
		}

		tab.level = newLevel
		chrome.pageAction.setIcon({path: ICON_MAP[newLevel], tabId: tab.id})
		return { "parametrizedElementTransformList": tranList }
	}
	
	return {}
}


function setUAHeader(details) 
{
	var fakeMobileUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3"
	var hdrs = details.requestHeaders
	if (details.tabId in tabs) {
		for (var i = 0; i < hdrs.length; i++) 
			if (hdrs[i].name == "User-Agent")
				break
		if (i!=hdrs.length)
			hdrs[i].value = fakeMobileUA
	} 
	return {"requestHeaders": hdrs};
}



function onTabActivated(activeinfo) 
{
	var newActiveTabId = activeinfo.tabId
	var win = activeinfo.windowId
	log("onTabActivated(newtab=" + newActiveTabId + ",oldtab=" + currentActiveTabId)

	if (newActiveTabId in tabs) {
		tabs[newActiveTabId].ignoreResizeEvents = true;
	}
	
	var ns = (newActiveTabId in tabs && tabs[newActiveTabId].windowSize != null)
	var os = (currentActiveTabId in tabs && tabs[currentActiveTabId].windowSize != null)
	currentActiveTabId = newActiveTabId

	var newSize
	if (!ns) {
		if (!os) {
			log("\t(global->global) do nothing")
			return
		} else {
			log("\t(individual->global) restoring global size")
			newSize = winsz
		}
	} else {
		newSize = tabs[newActiveTabId].windowSize
		if (!os) {
			_getWindowSize(win, function(oldSize) {
				log("\tsaving current window size")
				_recordGlobalWindowSize(oldSize)
				log("\t(global->individual) restoring individual size")
				tabs[newActiveTabId].ignoreResizeEvents = false;
				_resizeWindow(win, newSize)
			})
			return
		}
		log("\t(individual->individual) restoring individual size")
	}
	_resizeWindow(win, newSize)
}


function _resizeWindow(windowId, newSize)
{
	log("\tresizing window to " + _size2str(newSize))
	chrome.windows.update(windowId, newSize)
}

function _getWindowSize(win, callback) 
{
	chrome.windows.get(win,	function(wnd) {
		callback({"width": wnd.width, "height": wnd.height})
	})
}


function _recordGlobalWindowSize(size) 
{
	log("\trecording global window size")
	log("\t\told " + _size2str(winsz))
	log("\t\tnew " + _size2str(size))
	winsz = size
}


chrome.extension.onRequest.addListener(onRequest);
chrome.tabs.onActivated.addListener(onTabActivated);


// Called when the url of a tab changes.
/*
function checkForValidUrl(tabId, changeInfo, tab) {
	host = getHostname(tab.url)
	if ( host == "facebook.com") {
		chrome.pageAction.show(tabId);
	}
	console.log(host)
};


function getHostname(url) {
	var l = document.createElement("a")
	l.href = url
	var host = l.hostname
	if (host.indexOf("www.") === 0)
		host = host.substring(4)
	return host
};
*/

// Listen for any changes to the URL of any tab.
//chrome.tabs.onUpdated.addListener(checkForValidUrl);

function log(msg)
{
	if (msg[0] != '\t') { 
		var d = new Date()
		var tstamp = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds() + "." + d.getMilliseconds() + "| "
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


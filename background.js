var tabs = {}
var globalWindowSize = null	// 'normal' window size for the rest of the tabs
var currentActiveTabId = null	// id of the currently active tab
var currentWindowSize = null
var singleWindowId = null

var L_ORIGINAL = 0
var L_SHRINKED = 1
var L_MOBILE   = 2

var ICON_MAP = []
ICON_MAP[L_ORIGINAL] = "icon-inactive.png"
ICON_MAP[L_SHRINKED] = "icon.png"
ICON_MAP[L_MOBILE] = "icon-mobile.png"

var MOBILE_WIDTH_THRESHOLD = 500


// Called when a message is passed.  
function onRequest(req, sender, sendResponse) 
{
	var id = sender.tab.id
	var resp = {}

	if (req.type == 'init') {
		if (id in tabs) {
			console.error("init event on previously initialized tab (id=" + id + ")")
			resp = onInit({"id": id, "browserObject": sender.tab})
		} else
			resp = onInit({"id": id, "browserObject": sender.tab})

	} else if (req.type == 'resize') {
		if (!(id in tabs)) {
			console.error("resize event on uninitialized tab (id=" + id + ")")
		} else {
			var tabconf = tabs[id]
			tabconf.browserObject = sender.tab
			resp = onResize(tabconf, req.newGeometry)
			delete tabconf.browserObject
		}
	} 
	sendResponse(resp)
}


function onInit(tab)
{
	log("onInit(tab.id=" + tab.id + ")")
	if ( !(tab.id in tabs) ) {
		tabs[tab.id] = {
			"id": 	 tab.id,
			"level": L_ORIGINAL,
			"originalContentWidth" : null,
			"lastDesktopUrl": null,
			"windowSize": null
		}
		
		// save global window size since the tab effectively transitioned from global -> indiv
		chrome.windows.get(tab.browserObject.windowId,	function(wnd) {
			console.log("\tsaving global size")
			globalWindowSize = {"width": wnd.width, "height": wnd.height}
			__cont__() 
		})
	}
	__cont__(); function __cont__() {

	// check if it's an active tab, if so enable resize events
	chrome.tabs.query({"active": true, "windowId": tab.browserObject.windowId},
			__cont__); function __cont__(tabList) {

	console.assert(tabList.length == 1)
	if (tabList[0].id == tab.id) {
		console.log("\tnewly initialized tab is active")
		chrome.tabs.sendRequest(tab.id,
			{type: "ignoreResizeEvents", value: false}, function(){
				log("\tresize events enabled for newly initialized #" + tab.id)
			})
	} else {
		console.log("\tnewly initialized tab is not active")
	}
	// show icon
	chrome.pageAction.show(tab.id)

	}}
	return {}
}


function onResize(tab, geom)
{
	log("onResize(tab.id=" + tab.id + ", geom.viewportSize=" + geom.viewportSize.width + "x" + geom.viewportSize.height + ")")

	if (tab.originalContentWidth == null && (geom.contentSize.width > geom.viewportSize.width)
		   	&& tab.level == L_ORIGINAL ) {
		log("\tstoring tab.originalContentWidth")
		tab.originalContentWidth = geom.contentSize.width
	}
	
	chrome.windows.get(tab.browserObject.windowId,	function(wnd) {
			currentWindowSize = {"width": wnd.width, "height": wnd.height}
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
	
	log("\t" + curLevel + "->" + newLevel)
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
            var hasCalendar = tab.browserObject.url.indexOf("calendar");
            //**************** Calendar page *******************
            if(hasCalendar >= 0)
            {
                tranList = [];
                for (var i = 0; i < modifications.length; i++) {
                    if(!modifications[i].target || modifications[i].target != "calendar")
                        continue;
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
            else
            {
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
	var newt = activeinfo.tabId
	var win = activeinfo.windowId
	var oldt = currentActiveTabId
	if (singleWindowId != null) {
		if (win != singleWindowId) {
			console.error("tab #" + newt + " activated in a different window (" + win + "). ignoring")
			return
		}
	} else {
	//	singleWindowId = win
	//}
		chrome.windows.get(win,	function(wnd) {	
			if (wnd.type == "normal") {
				log("\twindow is normal, only working with this one from now on")
				singleWindowId = win
				__cont__()
			} else {
				log("\twindow is not normal. ignoring")
			}
	})}
	__cont__(); function __cont__()	{

	log("onTabActivated(newt = " + newt + ", oldt = " + oldt + ", nwin = " + win )
	console.assert(typeof newt != 'undefined' && newt != null)
	console.assert(oldt == null || newt != oldt)
	currentActiveTabId = newt
	var oldIndiv = (oldt!= null && oldt in tabs)
	var newIndiv = (newt in tabs)
	log("\t" + (oldIndiv?"indiv":"global") + " -> " + (newIndiv?"indiv":"global"))
	if (!newIndiv && !oldIndiv)
		return
	var oldSize
	var newSize
	if (oldIndiv) {
		// ignore all resize events until tab active again
		log("\tdisabling resize events for #" + newt)
		chrome.tabs.sendRequest(oldt,
			   					{type: "ignoreResizeEvents", value: true},
							   	__cont__())
	} else 	__cont__();	function __cont__() {

	// obtain current window size (before it's resized!)
	if (currentWindowSize) {	
		oldSize = currentWindowSize
		currentWindowSize = null
		__cont__()
	} else {
		chrome.windows.get(win,	function(wnd) {
			oldSize = {"width": wnd.width, "height": wnd.height}
			__cont__() })
	}; function __cont__() {
	
	// save current window size either as global or specific to previously active tab
	if (oldIndiv) {
		tabs[oldt].windowSize = oldSize
	} else {
		globalWindowSize = oldSize
	}
	if (newt != currentActiveTabId) {
		console.error("active tab changed before finished updating state after previous change");
	   	return
   	}
	// resize window
	console.assert((newIndiv && tabs[newt].windowSize != null) || (!newIndiv && globalWindowSize != null))
	var newSize = newIndiv ? tabs[newt].windowSize : globalWindowSize
	if (newIndiv) {
		currentWindowSize = newSize
	}
	if (_sizeEqual(newSize, oldSize)) {
		log("\tindividual size same as global, not resizing")
		__cont__() 
	}
	console.log("\tresizing window")
	chrome.windows.update(win, newSize, function() {
		window.setTimeout(__cont__, 200) }); function __cont__() {

	// ready to accept new resize events
	if (newt != currentActiveTabId) {
		console.error("active tab changed before finished updating state after previous change");
	   	return
   	}
	if (newIndiv) {
		log("\tenabling resize events back for #" + newt)
		chrome.tabs.sendRequest(newt,
				{type: "ignoreResizeEvents", value: false}, function(){})
	}
	
	}}}
	}
}


chrome.extension.onRequest.addListener(onRequest);
chrome.tabs.onActivated.addListener(onTabActivated);


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

function _sizeEqual(a,b) {
	return (a.width == b.width && a.height == b.height)
}


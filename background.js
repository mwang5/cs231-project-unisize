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

var tabs = {}
var winsz = null	// 'normal' window size for the rest of the tabs
var curtab = null	// id of the currently active tab


// Called when a message is passed.  
function onRequest(req, sender, sendResponse) {
	var icon
	var tid = sender.tab.id

	if (!winsz)
			_getWindowSize(sender.tab.windowId,	recordWindowSize);

	if ( !(tid in tabs) ) {
		if (!(typeof req.onResized != 'undefined' && req.tabSizePolicy == "global")) {
			tabs[tid] = { 
				mobile:	{
					spoofed: false
				},
				stickySize: {
					enabled: true,
					lastSize: null
				//	winId: null
				}
			}
		}
	}
	var tab = tabs[tid]

	if (typeof req.iconState != 'undefined') {
		var iconMap = ["icon-inactive.png", "icon.png", "icon-mobile.png"]
		chrome.pageAction.show(tid)
		chrome.pageAction.setIcon({path: iconMap[req.iconState], tabId: tid})
		sendResponse({})

	} else if (typeof req.mobile != 'undefined') {
		sendResponse(
				spoofMobileUserAgent(tid, sender.tab.url, req.mobile)
				)

	} else if (typeof req.onResized != 'undefined') {
		log("onResized(tid=" + tid)
		_getWindowSize(sender.tab.windowId,	function(curSize) {
			log("\tupdating individual size")
		   	log("\t\told " + _size2str(tabs[tid].stickySize.lastSize))
			log("\t\tnew " + _size2str(curSize))
			tabs[tid].stickySize.lastSize = curSize			 
		});
		//tabs[tid].stickySize.winId = sender.tab.windowId
		sendResponse({})

	} else {
		// lookup matching rule
		var rule = global_rules[0]; 
		sendResponse(rule)
	}
}


function spoofMobileUserAgent(tid, url, active)
{
	//log("got request from content script in tab #" + tid)
	var state = tabs[tid].mobile

	if (active && state.spoofed ||
		!active && !state.spoofed) {
			// nothing changed
			//log("\tstate not changed, responding with reload=false")
			return {"reload": false}

	} else {
		if (active) {
			//log("\tregistering tab for spoofing");
			//log("\tattaching (global) handler to onBeforeSendHeaders");
			state.spoofed = true;
			state.last_url = url; 
			chrome.webRequest.onBeforeSendHeaders.addListener(
					setUAHeader,
					{urls:["*://*/*"]},	// 'opt_filter'
					["requestHeaders", "blocking"] // 'blockingInfoSpec'
				);
			//log("\tupdate tab's url (will cause reload)")
		  	chrome.tabs.update(tid, {url: "https://www.facebook.com"})
			
		} else {
			//log("\tun-registering tab for spoofing");
			//log("\tremoving (global) handler to onBeforeSendHeaders");
			chrome.webRequest.onBeforeSendHeaders.removeListener(setUAHeader);
			//log("\tupdate to latest recorded \"desktop\" url")
		  	chrome.tabs.update(tid, {url: state.last_url})
			state.spoofed = false;
			delete state.last_url;
		}
		//log("\tstate changed, responding with reload=true")
		return {"reload": true}
	}
}


function setUAHeader(details) 
{
	//log("spoofing headers now!")
	var fakeMobileUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3"
	var hdrs = details.requestHeaders
	//log("\tid of reloading tab = " + details.tabId)
	if (details.tabId in tabs) {
		for (var i = 0; i < hdrs.length; i++) 
			if (hdrs[i].name == "User-Agent")
				break
		if (i!=hdrs.length)
			hdrs[i].value = fakeMobileUA
		else {
			//log("\toops, User-Agent header missing ...")
		}
	} else {
		//log("\tnope, not supposed to spoof for this tab")
	}
	return {"requestHeaders": hdrs};
}



function onTabActivated(activeinfo) 
{
	var newtab = activeinfo.tabId
	var win = activeinfo.windowId
	log("onTabActivated(newtab=" + newtab + ",oldtab=" + curtab)
	
	var ns = (newtab in tabs && tabs[newtab].stickySize.enabled == true)
	var os = (curtab in tabs && tabs[curtab].stickySize.enabled == true)
	curtab = newtab	

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
		newSize = tabs[newtab].stickySize.lastSize
		if (!os) {
			_getWindowSize(win, function(oldSize) {
				log("\tsaving current window size")
				recordWindowSize(oldSize)
				log("\t(global->individual) restoring individual size")
				resizeWindow(win, newSize)
			})
			return
		}
		log("\t(individual->individual) restoring individual size")
	}
	resizeWindow(win, newSize)
}

function _getWindowSize(win, callback) 
{
	chrome.windows.get(win,	function(wnd) {
		callback({"width": wnd.width, "height": wnd.height})
	})
}

function resizeWindow(wid, newSize) 
{
	log("\tresizing window to " + _size2str(newSize))
	chrome.windows.update(wid, newSize)
}


function recordWindowSize(size) 
{
	log("\trecording global window size")
	log("\t\told " + _size2str(winsz))
	log("\t\tnew " + _size2str(size))
	winsz = size
}


// Listen for the content script to send a message to the background page.
chrome.extension.onRequest.addListener(onRequest);
//chrome.windows.onCreated.addListener( function(wnd) {
//	log("windows.onCreated")
//	recordWindowSize(wnd)
//});
chrome.tabs.onActivated.addListener(onTabActivated);


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


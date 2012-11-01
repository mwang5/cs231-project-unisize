

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


// Called when a message is passed.  
function onRequest(req, sender, sendResponse) {
	var icon
	var tid = sender.tab.id
	
	if ( typeof tabs == 'undefined' )
		tabs = {}
	if ( !(tid in tabs) ) {
		tabs[tid] = { 
			mobile:	{
				spoofed: false
			}
	 	}
	}

	if (typeof req.iconState != 'undefined') {
		var iconMap = ["icon-inactive.png", "icon.png", "icon-mobile.png"]
		chrome.pageAction.show(tid)
		chrome.pageAction.setIcon({path: iconMap[req.iconState], tabId: tid})
		sendResponse({})
	} else if (typeof req.mobile != 'undefined') {
		sendResponse(
				spoofMobileUserAgent(tid, sender.tab.url, req.mobile)
				)
	} else {
		// lookup matching rule
		var rule = global_rules[0]; 
		sendResponse(rule)
	}
}


function spoofMobileUserAgent(tid, url, active)
{
	console.log( tstamp() + "got request from content script in tab #" + tid)
	var state = tabs[tid].mobile

	if (active && state.spoofed ||
		!active && !state.spoofed) {
			// nothing changed
			console.log("\tstate not changed, responding with reload=false")
			return {"reload": false}

	} else {
		if (active) {
			console.log("\tregistering tab for spoofing");
			console.log("\tattaching (global) handler to onBeforeSendHeaders");
			state.spoofed = true;
			state.last_url = url; 
			chrome.webRequest.onBeforeSendHeaders.addListener(
					setUAHeader,
					{urls:["*://*/*"]},	// 'opt_filter'
					["requestHeaders", "blocking"] // 'blockingInfoSpec'
				);
			console.log("\tupdate tab's url (will cause reload)")
		  	chrome.tabs.update(tid, {url: "https://www.facebook.com"})
			
		} else {
			console.log("\tun-registering tab for spoofing");
			console.log("\tremoving (global) handler to onBeforeSendHeaders");
			chrome.webRequest.onBeforeSendHeaders.removeListener(setUAHeader);
			console.log("\tupdate to latest recorded \"desktop\" url")
		  	chrome.tabs.update(tid, {url: state.last_url})
			state.spoofed = false;
			delete state.last_url;
		}
		console.log("\tstate changed, responding with reload=true")
		return {"reload": true}
	}
	



}


function setUAHeader(details) 
{
	console.log(tstamp() + "spoofing headers now!")
	var fakeMobileUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3"
	var hdrs = details.requestHeaders
	console.log("\tid of reloading tab = " + details.tabId)
	if (details.tabId in tabs) {
		for (var i = 0; i < hdrs.length; i++) 
			if (hdrs[i].name == "User-Agent")
				break
		if (i!=hdrs.length)
			hdrs[i].value = fakeMobileUA
		else
			console.log("\toops, User-Agent header missing ...")
	} else {
		console.log("\tnope, not supposed to spoof for this tab")
	}
	return {"requestHeaders": hdrs};
}


// Listen for the content script to send a message to the background page.
chrome.extension.onRequest.addListener(onRequest);

function tstamp() {
	var d = new Date()
	return d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds() + "." + d.getMilliseconds() + "| "


}



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
function onRequest(request, sender, sendResponse) {
	var icon
	var tid = sender.tab.id

	if (typeof request.iconState != 'undefined') {
		if (request.iconState == "active") {
			icon = 'icon.png'
		} else if (request.state == "passive") {
			icon = 'icon-inactive.png'
		} else
			throw "invalid icon state"
		chrome.pageAction.show(tid)
		chrome.pageAction.setIcon({path: icon, tabId: tid})
		sendResponse({})
	} else {
		// lookup matching rule
		var rule = global_rules[0]; 
		sendResponse(rule)
	}
}


// Listen for the content script to send a message to the background page.
chrome.extension.onRequest.addListener(onRequest);

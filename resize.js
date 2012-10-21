function applyTransform(tranList) 
{
	for (var i = 0; i< tranList.length; i++) {

		var tran = tranList[i]
		var xpres = document.evaluate(tran.target, document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null)
		var tgt = xpres.iterateNext()
		var oldval = null;
		
		switch(tran.method) {
			case "decreaseWidth":
				oldval = getComputedMetric(tgt, "width")
				tgt.style.width = oldval - tran.args + "px"
				break;
			case "decreaseMinWidth":
				oldval = getComputedMetric(tgt, "min-width")
				tgt.style.minWidth = oldval - tran.args + "px"
				break;
			case "decreaseMargin":
				var sides = ["left", "right", "top", "bottom"]
				for (var j = 0; j < sides.length; j++) {
					var which = sides[j]
					if (tran.args.hasOwnProperty(which)) {
						var propName1 = "margin-" + which
						var propName2 = "margin" + which.substr(0,1).toUpperCase() + which.substr(1)
						oldval = getComputedMetric(tgt,propName1)
						tgt.style[propName2] = oldval - tran.args[which] + "px"
						break;
					}
				}
				break;
			case "remove":
				tgt.parentNode.removeChild(tgt)
				break;
			default:
		}
	}
}


function getComputedMetric(elem, name) {
	var str = window.getComputedStyle(elem).getPropertyValue(name)
	var pxi = str.indexOf("px")
	if (str == null || str.length == 0)
		throw ("style." + name + " is empty")
	if ( pxi <= 0 && pxi != str.length - 2)
		throw ("style." + name + " does not end in \"px\" or otherwise invalid")
	return parseInt(str.substr(0, str.length - 2))
}

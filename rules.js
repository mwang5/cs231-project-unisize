var T_RELATIVE_PIXEL_METRIC = 1
var T_SET_STRING_PROPERTY	= 2


RULE_DEFINITIONS = 
	[
		{
			// Hard-coded rule for a particular page/ webapp view
			"page": ['*://*.facebook.com/', "*://*.facebook.com/?sk=nf"],
			"mods" : [
				// List of all possible modifications
			
				{
					// Shrink left-side navigation
				   //"id": 1,
				   //"gain": 100,			   			   
				   //"type": "draw-under",
				   "transform": [
					    // necessary DOM transformations	
						{ 
							"element": '//*[@id="leftCol"]', // XPath of element
							"method": T_RELATIVE_PIXEL_METRIC,
							"property": "width",
							"maxDelta" : -100 
						},
						{ 
							"element": '//*[@id="contentCol"]',
							"method": T_RELATIVE_PIXEL_METRIC,
							"property": "margin-left",
							"maxDelta" : -100 
					   	},
						{ 
							"element": '//*[@id="contentCol"]',
							"method": T_SET_STRING_PROPERTY,
							"property": "position",
							"value" : "relative" 
					   	}, 
						{ 
							"element": '//*[@id="contentCol"]',
							"method": T_SET_STRING_PROPERTY,
							"property": "-webkit-box-shadow",
							"value" : "#5A5A5A -20px 0px 50px -25px" 
					   	}, 
						{ 
							"element": '//*[@id="contentCol"]',
							"method": T_SET_STRING_PROPERTY,
							"property": "border-left",
							"value" : "1px solid gray" 
					   	},
					   	/* Remove ellipsis in links, padding on the right and onhover edit/pencil icon:
						   .uiSideNav .sideNavItem .linkWrap{text-overflow:clip; }
						   .uiSideNav .item, .uiSideNav .subitem { padding-right: 0px; }
						   .buttonWrap {display: none;}
						   */
						{ 
							"element": '//*[@id="globalContainer"]',
							"method": T_RELATIVE_PIXEL_METRIC,
							"property": "width",
						   	"maxDelta": -100
					   	}                       
					]
				},
                {
                      "target": "calendar",
                      "transform": [
                            {
                                    "element": '//*[contains(@class,"fbCalendarGridDayHeader") or contains(@class,"fbCalendarGridItem")]',
                                    "method": T_RELATIVE_PIXEL_METRIC,
                                    "property":"width",
                                    "maxDelta": -20
                            }
                        ]
                },


				{
					// Hide right column entirely (Ticker + Ads)
					//"id" : 2,
					//"gain": 244,
					//"type": "hide",
					"transform": [ 
						{ 
							"element": '//*[@id="rightCol"]',
						   	"method": T_SET_STRING_PROPERTY,
							"property": "display",
							"value"	  : "none"
					   	},                 
						{ 
							"element": '//*[@id="globalContainer"]',
							"method": T_RELATIVE_PIXEL_METRIC,
							"property": "width",
						   	"maxDelta": -244
					   	}          
					]   
				},
				
				{
					// Make top blue navigation bar more compact
					//"id" : 3
					//"gain": 340,
					//"type": "unspecified",
					"transform": [ 
						{
						   // Resize search field	
							"element": '//*[@id="q"]',
							"method": T_RELATIVE_PIXEL_METRIC,
							"property": "width",
							"maxDelta": -100
					   	},                 
						{
						   // Resize search field	
							"element": '//*[@id="navSearch"]',
							"method": T_RELATIVE_PIXEL_METRIC,
							"property": "width",
							"maxDelta": -100
					   	},                 
						{
						   // Remove "Find Friends"	
							"element": '//*[@id="findFriendsNav"]/parent::*',
						   	"method": T_SET_STRING_PROPERTY,
							"property": "display",
							"value"	  : "none"
					   	},
						{ 
							// Remove "Home"
							"element": '//*[@id="navHome"]',
						   	"method": T_SET_STRING_PROPERTY,
							"property": "display",
							"value"	  : "none"
					   	},
						{
						   // Squeeze container element
							"element": '//*[@id="pageHead"]',
							"method": T_RELATIVE_PIXEL_METRIC,
							"property": "width",
							"maxDelta": -340
					   	},                 
						{
						   // Squeeze container element
							"element": '//*[@id="blueBar"]',
							"method": T_RELATIVE_PIXEL_METRIC,
							"property": "min-width",
							"maxDelta": -340
					   	},                 
			   						
					]   
				},
			]
		}
	]

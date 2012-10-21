global_rules = 
	[
		{
			// Hard-coded rule for a particular page/ webapp view
			"page": ['*://*.facebook.com/', "*://*.facebook.com/?sk=nf"],
			"mods" : [
				// List of all possible modifications
			
				{
					// Shrink left-side navigation
				   "type": "draw-under",	
					"transform": [
					    // necessary DOM transformations	
						{ 
							"target": '//*[@id="leftCol"]', // XPath of element
						   	"method": "decreaseWidth" ,
							"args" : 100 
						},
						{ 
							"target": '//*[@id="contentCol"]',
						   	"method": "decreaseMargin", 
							"args": { "left": 100 }
					   	}, 
						{ 
							"target": '//*[@id="globalContainer"]',
						   	"method": "decreaseWidth",
						   	"args": 100
					   	}                       
					]
				},                      

				{
					// Hide right column entirely (Ticker + Ads)
					"type": "hide",
					"transform": [ 
						{ 
							"target": '//*[@id="rightCol"]',
						   	"method": "remove"
					   	},                 
						{ 
							"target": '//*[@id="globalContainer"]',
						   	"method": "decreaseWidth",
						   	"args": 244
					   	}          
					]   
				},
				
				{
					// Make top blue navigation bar more compact
					"type": "unspecified",
					"transform": [ 
						{
						   // Resize search field	
							"target": '//*[@id="q"]',
						   	"method": "decreaseWidth",
							"args": 100
					   	},                 
						{
						   // Resize search field	
							"target": '//*[@id="navSearch"]',
						   	"method": "decreaseWidth",
							"args": 100
					   	},                 
						{
						   // Remove "Find Friends"	
							"target": '//*[@id="findFriendsNav"]/parent::*',
						   	"method": "remove"
					   	},
						{ 
							// Remove "Home"
							"target": '//*[@id="navHome"]',
						   	"method": "remove"
					   	},
						{
						   // Squeeze container element
							"target": '//*[@id="pageHead"]',
						   	"method": "decreaseWidth",
							"args": 340
					   	},                 
						{
						   // Squeeze container element
							"target": '//*[@id="blueBar"]',
						   	"method": "decreaseMinWidth",
							"args": 340
					   	},                 
			   						
					]   
				},
			]
		}
	]

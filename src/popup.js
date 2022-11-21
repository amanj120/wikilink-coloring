let actionButton = document.getElementById("actionButton");

// when the button is clicked, it will disable itself and launch the highlight function
actionButton.addEventListener("click", async () => {
	actionButton.disabled = true;
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
      	target: { tabId: tab.id },
      	func: highlightWikiLinks,
    })
});


// this function highlights the links based on "relevance" and also 
// injects a "Recommended Pages" section into the wikipedia section
function highlightWikiLinks() {

	// If the current webpage is not a wikipedia page then the extension doesn't do anythin
	if (/en\.wikipedia\.org/.test(window.location.hostname) == false) {
		return; 
	} 

	// this function gets the link similarity scores using the Flask API endpoint
	function getLinkSimilarity(url) {
		let infoUrl = url.replace("/wiki/", "/w/index.php?title=").concat("&action=info");
		let apiEndpoint = "http://127.0.0.1:5000/"
		return fetch(infoUrl)
			.then(response => response.text())
			.then(data => { //gets the page ID for the current wikipedia page using a regex match
				let tmp = data
					.match(/<tr id="mw-pageinfo-article-id">.*<\/tr>/)[0]
					.match(/<td>[0-9]*<\/td>/)[0]
					.replace("<td>", "")
					.replace("</td>", "");
				let pageID = parseInt(tmp);
				return pageID;
			})
			.then(pageID => {
				console.log("page ID for url %s is %d", url, pageID);
				return fetch(apiEndpoint + pageID)
			})
			.then(response => {
				return response.text();
			})
			.then(json => { //converts the returned json string into a javascript Map object
				return new Map(Object.entries(JSON.parse(json)));
			});
	}

	// assigns a color from white to green given a float in [0, 1]
	function getColorFromFloat(input) {
		let r = 255 - Math.floor(input * 191.0);
		let g = 255 - Math.floor(input * 63.0);
		let b = 255 - Math.floor(input * 255.0);
		return "rgb(" + r + ", " + g + ", " + b + ")";
	}
	
	// gets all hyperlinks in the page
	const urls = document.getElementById("bodyContent").getElementsByTagName("a");
	
	getLinkSimilarity(window.location.href)
		.then(similarities => { 
			// goes through all hyperlinks in the page
			// filters the hyperlinks to other wikiepdia pages
			// checks if the similarity map has the hyperlink
			// and highlights the hyperlink accordingly
			for (let url of urls) {
				if (/\/wiki\/[^:#]*$/.test(url.href) == true) {
					let urlHref = url.href.replace("https://en.wikipedia.org/wiki/", "");
					if (similarities.has(urlHref)) {
						let similarity = similarities.get(urlHref)
						url.style.backgroundColor = getColorFromFloat(similarity);
					}
				}
			}
			return similarities;
		})
		.then(similarities => {
			// generates the top recommended pages and displays it on the wiki page 
			let keys = Array.from(similarities.keys());
			keys.sort((key1, key2) => {
				return similarities.get(key2) - similarities.get(key1) // highest to lowest
			});
			let topKeys = keys.slice(0, 6);
			let tmp = document.getElementById("mw-content-text");
			let top5 = document.createElement("div");
			top5.className = "mw-body-content";
			tmp.prepend(top5)
			let innerhtml = "<h2><span class=\"mw-headline\">Recommended Pages</span></h2>";
			innerhtml += "<table>";
			for (let i = 0; i < topKeys.length; i+= 1) {
				let key = topKeys[i];
				let pretty = key.replaceAll("_", " ");
				let url = "https://en.wikipedia.org/wiki/" + key;
				innerhtml += "<tr><td><a href=" + url+ ">"+pretty+"</a></td></tr>";
			}
			innerhtml += "</table><h2><span class=\"mw-headline\"></span></h2>";
			top5.innerHTML = innerhtml;
			return similarities;
		});
}

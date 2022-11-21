let actionButton = document.getElementById("actionButton");

actionButton.addEventListener("click", async () => {
	actionButton.disabled = true;
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
      	target: { tabId: tab.id },
      	func: highlightWikiLinks,
    });
});

// main business logic goes here
function highlightWikiLinks() {

	function getLinkSimilarity(url) {
		let infoUrl = url.replace("/wiki/", "/w/index.php?title=").concat("&action=info");
		return fetch()
			.then(response => response.text())
			.then(data => {
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
				return fetch("http://127.0.0.1:5000/" + pageID)
			})
			.then(response => {
				return response.text();
			})
			.then(json => {
				return new Map(Object.entries(JSON.parse(json)));
			});
	}

	// assigns a color from red to green given a float in [0, 1]
	function getColorFromFloat(input) {
		let r = 255 - Math.floor(input * 191.0);
		let g = 255 - Math.floor(input * 63.0);
		let b = 255 - Math.floor(input * 255.0);
		return "rgb(" + r + ", " + g + ", " + b + ")";
	}

	if (/wikipedia\.org/.test(window.location.hostname) == false) {
		return; // The extension only works on wikipedia pages
	} 
	
	const urls = document.getElementById("bodyContent").getElementsByTagName("a");
	
	getLinkSimilarity(window.location.href)
		.then(similarities => {
			for (let url of urls) {
				if (/\/wiki\/[^:#]*$/.test(url.href) == true) {
					let urlHref = url.href.replace("https://en.wikipedia.org/wiki/", "");
					if (similarities.has(urlHref)) {
						let similarity = similarities.get(urlHref)
						url.style.backgroundColor = getColorFromFloat(similarity);
					} else {
						console.log("%s was not in similarity map", urlHref)
					}
				}
			}
		});
}

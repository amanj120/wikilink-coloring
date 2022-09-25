let actionButton = document.getElementById("actionButton");

actionButton.addEventListener("click", async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
      	target: { tabId: tab.id },
      	func: highlightWikiLinks,
    });
  });

// main business logic goes here
function highlightWikiLinks() {

	function isWikiArticle() {
		return /wikipedia\.org/.test(window.location.hostname);
	}

	function getInfoUrl(url) {
		return url.replace("/wiki/", "/w/index.php?title=").concat("&action=info");
	}

	// returns the number of views a page has truncated to the range [128, 1048576] 
	async function getTruncatedPageViews(url) {
		let infoUrl = getInfoUrl(url);
		const response = await fetch(infoUrl);
		const data = await response.text();
		let tmp = data.match(/<div class="mw-pvi-month">.*<\/div>/)[0]
			.replace("<div class=\"mw-pvi-month\">", "")
			.replace("</div>", "");
		let pageViews = parseInt(tmp.replaceAll(",", ""));

		if (pageViews < 128) {
			pageViews = 128;
		} else if (pageViews > 1048576) {
			pageViews = 1048576
		}

		return pageViews;
	}

	if (!isWikiArticle()) {
		console.log("The current page is not a Wikipedia article");
		return;
	} 
	
	const urls = document.getElementById("bodyContent").getElementsByTagName("a")
	const urlMap = new Map();

	for (let url of urls) {
		if (/\/wiki\/[^:#]*$/.test(url.href) == true) {
			let urlHref = url.href;
			if (urlMap.has(urlHref) == false) {
				urlMap.set(urlHref, new Array());
			}
			urlMap.get(urlHref).push(url);
			
		}
	}

	const urlMapEntries = urlMap.entries();

	const linkColorId = setInterval(() => {
		let entry = urlMapEntries.next();
		
		if (entry.done == true) {
			clearInterval(linkColorId);
		}

		let urlHref = entry.value[0];
		let urlHrefTags = entry.value[1];
		getTruncatedPageViews(urlHref).then((pageViews) => {
			// follows logarithmic scaling in the range [0, 511]
			let strength = Math.floor(((Math.log2(pageViews) - 7) * 511.0)/13.0); 
			
			if (strength < 256) {
				for (let url of urlHrefTags) {
					url.style.backgroundColor = 'rgb(255, ' + strength + ', 0)';
				}
			} else {
				for (let url of urlHrefTags) {
					url.style.backgroundColor = 'rgb(' + (511-strength) + ', 255, 0)';
				}
			}
			console.log(urlHref, pageViews, strength);
		});
	}, 50);
}

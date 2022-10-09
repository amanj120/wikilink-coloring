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

	// returns the number of redirects to a page
	// this is capped at 5000 because we have to query the number of links we want
	// and asking for more increses computational complexity
	async function getRedirects(url) {
		let infoUrl = url.replace("/wiki/", "/w/index.php?title=Special:WhatLinksHere/").concat("&namespace=0&hideredirs=1&hidetrans=1&limit=5000");
		const response = await fetch(infoUrl);
		const data = await response.text();
		let tmp = data.match(/Displayed .* items/)[0];
		let redirectsStr = tmp.replace("Displayed ", "").replace(" items", "");
		let redirects = parseInt(redirectsStr.replaceAll(",", ""));
		return redirects;
	}

	// returns the number of views a wiki page 
	async function getPageViews(url) {
		let infoUrl = url.replace("/wiki/", "/w/index.php?title=").concat("&action=info");
		const response = await fetch(infoUrl);
		const data = await response.text();
		let tmp = data.match(/<div class="mw-pvi-month">.*<\/div>/)[0]
			.replace("<div class=\"mw-pvi-month\">", "")
			.replace("</div>", "");
		let pageViews = parseInt(tmp.replaceAll(",", ""));
		return pageViews;
	}

	// assigns a color from red to green given a float in [0, 1]
	function getColorFromFloat(input) {
		let strength = Math.floor(input * 511.0)
		if (strength < 256) {
			return 'rgb(255, ' + strength + ', 0)';
		} else {
			return 'rgb(' + (511-strength) + ', 255, 0)';
		}
	}

	if (/wikipedia\.org/.test(window.location.hostname) == false) {
		return; // The extension only works on wikipedia pages
	} 
	
	const urls = document.getElementById("bodyContent").getElementsByTagName("a")
	const urlMap = new Map();

	// TODO: filter to include links with "#" that aren't the same page
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
	const linkColorThreadId = setInterval(async () => {
		let entry = urlMapEntries.next();
		if (entry.done == true) {
			clearInterval(linkColorThreadId);
		}

		let href = entry.value[0];
		let tags = entry.value[1];

		let pageViews = await getPageViews(href);
		let redirects = await getRedirects(href);

		console.log(href, "redirects: ", redirects, "pageViews: ", pageViews);

		/* TODO: change the highlight color of the link:
			for (let tag of tags) {
				// let color = <some calculation here>
				tag.style.backgroundColor = color;
			}
		*/
	}, 50);
}

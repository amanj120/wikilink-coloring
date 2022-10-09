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

	// returns the number of redirects to a page capped at 5000
	async function getRedirects(url) {
		let infoUrl = url.replace("/wiki/", "/w/index.php?title=Special:WhatLinksHere/").concat("&namespace=0&hideredirs=1&hidetrans=1&limit=5000");
		const response = await fetch(infoUrl);
		const data = await response.text();
		let tmp = data.match(/Displayed .* items/)[0];
		let redirectsStr = tmp.replace("Displayed ", "").replace(" items", "");
		let redirects = parseInt(redirectsStr.replaceAll(",", ""));
		return redirects;
	}

	// returns the number of views a page has had in the past 30 days
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

	async function getLinkSimilarity(url, parentUrls) {
		const response = await fetch(url);
		const data = response.body;
		console.log(data);
		// const paragraphs = data.getElementById("bodyContent").getElementsByTagName("p");
		// const childUrls = new Set();
		// let similar = 0.0;
		// let total = 0.0;
		// for (let p of paragraphs) {
		// 	console.log(url, p);
		// 	let urls = p.getElementsByTagName("a");
		// 	if (/\/wiki\/[^:#]*$/.test(url.href) == true) {
		// 		let urlHref = url.href;
		// 		if (childUrls.has(urlHref) == false) {
		// 			total += 1.0;
		// 			childUrls.add(urlHref);
		// 			if (parentUrls.has(urlHref)) {
		// 				similar += 1.0;
		// 			}
		// 		}
		// 	}
		// }
		// return similar / total;
		return 1.0;
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
	
	const paragraphs = document.getElementById("bodyContent").getElementsByTagName("p")
	const urlMap = new Map();

	for (let p of paragraphs) {
		let urls = p.getElementsByTagName("a");
		for (let url of urls) {
			if (/\/wiki\/[^:#]*$/.test(url.href) == true) {
				let urlHref = url.href;
				if (urlMap.has(urlHref) == false) {
					urlMap.set(urlHref, new Array());
				}
				urlMap.get(urlHref).push(url);
				url.style.backgroundColor = "#FF0000";
			}
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
		let similarity = await getLinkSimilarity(href, urlMap);

		console.log(href, "redirects: ", redirects, "pageViews: ", pageViews);



		/* TODO: change the highlight color of the link:
			for (let tag of tags) {
				// let color = <some calculation here>
				tag.style.backgroundColor = color;
			}
		*/
	}, 50);
}

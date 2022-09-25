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

	// assigns a color to the number of views based on a logarithmic scale
	function getColorFromPageViews(pageViews) {
		if (pageViews < 128) {
			pageViews = 128;
		} else if (pageViews > 1048576) {
			pageViews = 1048576;
		}
		let strength = Math.floor(((Math.log2(pageViews) - 7) * 511.0)/13.0); 
			
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
	const linkColorId = setInterval(() => {
		let entry = urlMapEntries.next();
		if (entry.done == true) {
			clearInterval(linkColorId);
		} else {
			let href = entry.value[0];
			let tags = entry.value[1];

			getPageViews(href).then((pageViews) => {
				let color = getColorFromPageViews(pageViews);
				for (let tag of tags) {
					tag.style.backgroundColor = color;
				}
				console.log(href, pageViews);
			});
		}
	}, 50);
}

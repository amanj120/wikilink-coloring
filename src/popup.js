let actionButton = document.getElementById("actionButton");

actionButton.addEventListener("click", async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
      	target: { tabId: tab.id },
      	func: highlightWikiLinks,
    });
  });
  
// The body of this function will be executed as a content script inside the
// current page
function highlightWikiLinks() {

	function isWikiArticle() {
		// This regex identifies if a page is a Wikipedia article.
		let wikiDomainPattern = /wikipedia\.org/;
		return wikiDomainPattern.test(window.location.hostname);
	}

	if (!isWikiArticle()) {
		console.log("The current page is not a Wikipedia article");
		return;
	} 
	
	let urls = document.getElementById("bodyContent").getElementsByTagName("a")

	for (index in urls) {
		let url = urls.item(index);
		if (/\/wiki\//.test(url.href) == true) {
			if (/(File:|Help:|Category:|#)/.test(url.href) == false){
				url.style.backgroundColor = "#FF00FF";
			}
		}
		console.log(url.href);
	}
}


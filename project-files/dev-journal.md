# Developer Journal

## 2022-09-24
Here is what I accomplished today:
* I made this Git repo.
* I followed the [Chrome extension getting started guide](https://developer.chrome.com/docs/extensions/mv3/getstarted/) to make a basic Chrome extension.
* I modified the basic Chrome extension to identify if a webpage is a Wikipedia article, and if so, to highlight all other hyperlinked Wikipedia articles.

## 2022-10-06
I totally forgot this thing existed, but here's what I've done so far: 
* Added a web scraper to get number of page views
* Added a web scraper to get the number of articles that link to the current article
* I've also thought about more thorough evaluation methods other than just speed:
    * Compare the performance of the heuristic to "true" performance (in terms of link quality)
    * "true" performance could be:
        * number of bidirectional one hop paths (source - hop - sink) between the two pages
    * we want to avoid "parent" topics:
        * i.e. Georgia Tech's "parent" could be Georgia, but that doesn't provide too much information
* Wikipedia is essentially a directed graph, what information do we want to extract from it?
    * Source: A, Target C:
    * let n' = set of paths A -> X -> C
    * let m' = set of paths C -> X -> A
    * let s = set of paths A -> X
    * let t = set of paths C -> X
    * let n = set of paths X -> C
    * let m = set of paths X -> A
    * (n'/n) = forward_score
    * (m'/m) = backward_score
    * direct_forward_path = 1 (because A -> C always exists since C is a link we found on article A)
    * direct_backward_path = 1 if C -> A exists, else 0
    * we can easily calculate n', m', s, and t. n and m are harder to calculate
* Maybe take a look at this: https://www.mediawiki.org/wiki/API:REST_API

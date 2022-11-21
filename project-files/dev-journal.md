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

# 2022-10-09:
* What if we looked at paths: A -> C -> C' where A -> C' exists
* Actually, let's just download a wiki data dump and store it somewhere and work with that instead, that way we're not limited by Wiki's 429 HTTP errors, and we can stop using fucking javascript. 
    * https://dumps.wikimedia.org/
    * we can just use this for a somewhat up to date model, and use the actual (n'/n) and (m'/m) and back_path metrics
    
# 2022-10-10: 
* I created a python script to convert a wikipedia dump into a directed graph of articles
* scp enwiki-20221001-pages-articles-multistream-index.txt ajain471@login-phoenix.pace.gatech.edu:/storage/scratch1/1/ajain471/cs6235/
* scp enwiki-20221001-pages-articles-multistream.xml.bz2 ajain471@login-phoenix.pace.gatech.edu:/storage/scratch1/1/ajain471/cs6235/
* scp wikiToGraph.py ajain471@login-phoenix.pace.gatech.edu:/storage/scratch1/1/ajain471/cs6235/
* [ajain471@login-coc-ice-1 ~]$ qsub -I -N AMAN-6235 -q coc-ice-long -l mem=127g,nodes=1:ppn=1,walltime=8:00:00,file=127g
* This is to run the job in COC-ICE 
* https://dumps.wikimedia.org/enwiki/20221001/enwiki-20221001-pages-articles-multistream.xml.bz2
* I uploaded the files to google cloud storage:
    * https://storage.googleapis.com/wikilink-coloring-dump-info/enwiki-20221001-pages-articles-multistream-index.txt
    * https://storage.googleapis.com/wikilink-coloring-dump-info/enwiki-20221001-pages-articles-multistream.xml.bz2

# 2022-10-28
* Alright buckle up fuckwads cuz a lot has happened lately and i got a story to tell y'all
So essentially this big ass wikipedia dump is 100 gigabytes right, pretty big. there were a couple issues, the biggest being that 100 GB of text is a lot of text. So, i split up this dump processing pipeline into a couple steps. The first step is to iterate through the multistream for each 100-page chunk and for each page, check if it's an article or redirect in namespace 0. namespace 0 means actual pages, not categories or files or wtv. This also requires a funky little regex thing to figure out the links from the wiki XML. originally this took forever, but I managed to make the program multi-processed and I ran it on PACE using a whopping 256 GB of RAM and 16 cores, and it still took like an hour to do that. That's how we ended up with a bunch of these little outputEdges-X.json and redirects-X.json files. 
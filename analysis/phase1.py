from bs4 import BeautifulSoup
from bz2 import BZ2Decompressor
from tqdm import tqdm
import json
import re
import multiprocess
import os

# convert multistream file into outputs, redirects, and node list in parallel

def wikify(name: str): 
    if name is None or len(name) == 0:
        return None
    name = name.replace(" ", "_").replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;")
    name = name[0].upper() + name[1:]
    name = name.strip() # TODO: should we be doing this?
    return name


def getLinksFromPageText(text):
    links = list()
    tmp_links = re.findall("\[\[[^:\[\]]+\]\]", text)
    for tmp_link in tmp_links:
        link = tmp_link.replace("[[", "").replace("]]", "")
        if "|" in link:
            link = link[:link.find("|")]
        link = wikify(link)
        if link in pageData:
            linkID = int(pageData[link])
            links.append(linkID)
    return links


articlesPath = "enwiki-latest-pages-articles-multistream.xml.bz2"
indexPath = "enwiki-latest-pages-articles-multistream-index.txt"
print("loading chunkData and pageData")   

with open(indexPath, "r") as indexFile:
    chunkData = list()
    pageData = dict()
    prevOffset = None
    for line in tqdm(indexFile):
        if line is None:
            break
        data = line.split(":")
        offset = int(data[0])
        pageId = int(data[1])
        pageName = wikify(":".join(data[2:]))
        pageData[pageName] = pageId
        if prevOffset == None:
            prevOffset = offset
        if offset != prevOffset:
            chunkData.append((prevOffset, offset - prevOffset))
            prevOffset = offset
    chunkData.append((prevOffset, -1))

    # Use this for checkpointing    
    with open("chunkData.json", "w") as f:
        json.dump(chunkData, f, indent = 2)
    with open("pageData.json", "w") as f:
        json.dump(pageData, f, indent = 2, ensure_ascii=False)
print("finishing writing chunkData and pageData")

# Use this for checkpointing
with open("chunkData.json", "r") as chunkDataFile:
    chunkData = json.load(chunkDataFile)
with open("pageData.json", "r") as pageDataFile:
    pageData = json.load(pageDataFile)


def processSingleChunk(raw, outputEdges, redirects):    
    decompressor = BZ2Decompressor()
    byteString = b'<root> ' + decompressor.decompress(raw) + b' </root>'
    xmldata = BeautifulSoup(bytes.decode(byteString), "lxml")
    pages = xmldata.find_all("page")

    for page in pages:
        namespace = int(page.find("ns").text)
        if namespace != 0:
            continue

        titleID = int(page.find("id").text)
        redirect_tag = page.find("redirect")

        if redirect_tag is None:
            text = page.find("text").text
            links = getLinksFromPageText(text)
            outputEdges[titleID] = links
        else:
            link = wikify(redirect_tag.attrs["title"])
            if link in pageData:
                linkID = int(pageData[link])
                redirects[titleID] = linkID


def processChunkPartition(args):
    numChunksProcessed = 0
    procID = args[0]
    numProcs = args[1]

    outputEdges = dict()
    redirects = dict()
    numChunks = len(chunkData)
    
    with open(articlesPath, "rb") as articles:
        print("started chunks on procID {}".format(procID))
        for chunkIdx in range(procID, numChunks, numProcs):
            chunk = chunkData[chunkIdx]
            articles.seek(chunk[0])
            raw = articles.read(chunk[1])
            processSingleChunk(raw, outputEdges, redirects)
            numChunksProcessed += 1
            if procID == 0:
                if numChunksProcessed % 100 == 0:
                    print("{}/{} processed on proc 0".format(numChunksProcessed, numChunks//numProcs))            
        print("finished chunks on procID {}".format(procID))
    
    outputEdgesFileName = "outputEdges-{}.json".format(procID)
    redirectsFileName = "redirects-{}.json".format(procID)        
    with open(outputEdgesFileName, "w") as f:
        json.dump(outputEdges, f, indent=2)
    with open(redirectsFileName, "w") as f:
        json.dump(redirects, f, indent=2)
    print("finished writing graph data to file in procID {}".format(procID))


def processDump(numProcs):
    with multiprocess.Pool(numProcs) as pool:
        results = pool.map(processChunkPartition, [(procID, numProcs) for procID in range(numProcs)]) 
    
    redirects = dict()
    allNodes = set()

    for filename in os.listdir("."):
        if filename.startswith("outputEdges"):
            with open(filename, "r") as tmpFile:
                tmpDict = json.load(tmpFile)
                allNodes.update(tmpDict.keys())
        elif filename.startswith("redirects"):
            with open(filename, "r") as tmpFile:
                tmpDict = json.load(tmpFile)
                redirects.update(tmpDict)
    
    with open("all-redirects.json", "w") as tmp:
        json.dump(redirects, tmp, indent=2)
    
    with open("all-nodes.json", "w") as tmp:
        json.dump(list(allNodes), tmp, indent=2)
    
    print("there are {} nodes in this graph".format(len(allNodes)))


# def singleThreadProcessChunks():
#     outputEdges = dict()
#     redirects = dict()
    
#     print("starting chunk processing")
#     with open(articlesPath, "rb") as articles:
#         for chunk in tqdm(chunkData):
#             articles.seek(chunk[0])
#             raw = articles.read(chunk[1])
#             singleChunkToGraph(raw, outputEdges, redirects)
#     print("finished chunk processing")

#     with open("outputEdges.json", "w") as f:
#         json.dump(outputEdges, f, indent=2)
#     with open("redirects.json", "w") as f:
#         json.dump(redirects, f, indent=2)


if __name__ == "__main__":
    processDump(16)
        

import json
from tqdm import tqdm
import os

# convert outputs, redirects, and node list into single graph file

print("loading all-redirects")
with open("all-redirects.json", "r") as tmp:
    redirects = json.load(tmp)

print("loading all-nodes")
with open("all-nodes.json", "r") as tmp:
    nodeList = json.load(tmp)
    allNodes = set([int(x) for x in nodeList])

print("loading pageData")
with open("pageData.json", "r") as tmp:
    pageData = json.load(tmp)

files = list(filter(lambda x: x.startswith("outputEdges") and x.endswith(".json"), os.listdir(".")))
graph = dict()

for filename in files:
    print("processing file {}".format(filename))

    with open(filename, "r") as tmp:
        tmpOutputs = json.load(tmp)
            
    for node in tqdm(tmpOutputs):
        node = int(node)
        neighbors = tmpOutputs[str(node)]
        nodeOutputs = set()
        
        for neighbor in neighbors:
            while neighbor in redirects:
                neighbor = redirects[str(neighbor)]
            
            neighbor = int(neighbor)

            if neighbor not in allNodes:
                continue
            
            neighborInputsKey = "{}-inputs".format(neighbor)
            
            if neighborInputsKey not in graph:
                graph[neighborInputsKey] = set()
            
            graph[neighborInputsKey].add(int(node))
            nodeOutputs.add(int(neighbor))
        
        graph["{}-outputs".format(node)] = nodeOutputs

for name, node in pageData.items():
    if int(node) in allNodes:
        graph["{}-name".format(int(node))] = name

numMissingKeys = 0

for node in allNodes:
    node = int(node)
    if "{}-inputs".format(node) not in graph:
        graph["{}-inputs".format(node)] = set()
        numMissingKeys += 1
    if "{}-outputs".format(node) not in graph:
        graph["{}-outputs".format(node)] = set()
        numMissingKeys += 1
    if "{}-name".format(node) not in graph:
        graph["{}-name".format(node)] = ""
        numMissingKeys += 1

print("{}/{} keys missing".format(numMissingKeys, len(allNodes) * 3))

class SetEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, set):
            return list(obj)
        return json.JSONEncoder.default(self, obj)

with open("graph.json", "w") as tmp:
	json.dump(graph, tmp, indent=2, cls=SetEncoder)



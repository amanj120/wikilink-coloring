import json
from tqdm import tqdm

print("opening all nodes")
with open("all-nodes.json", "r") as tmp:
    allNodes = json.load(tmp)

# shard the giant graph.json file
print("opening graph.json")
with open("graph.json", "r") as tmp:
    graph = json.load(tmp)
    print("opened graph.json")
    assert len(graph.keys()) == len(allNodes) * 3
    shardSize = 100000
    allKeys = list(graph.keys())
    for shardStart in tqdm(range(0, len(allKeys), shardSize)):
        tmpDict = dict()
        for idx in range(shardStart, min(len(allKeys), shardStart + shardSize)):
            tmpDict[allKeys[idx]] = graph[allKeys[idx]]
        with open("graph-shard-{}.json".format(shardStart // shardSize), "w") as shardFile:
            json.dump(tmpDict, shardFile, indent = 2, ensure_ascii=False)
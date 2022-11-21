import json
import os
import redis
from tqdm import tqdm

print("establishing connection to redis")
db = redis.StrictRedis(db=1)
assert db.ping(), "redis connection could not be established"

print("loading shards and all-nodes list for verificatoin")
shards = list(filter(lambda x: x.startswith("graph-shard"), os.listdir("export")))
with open("export/all-nodes.json", "r") as tmp:
    nodes = set([int(x) for x in json.load(tmp)])
    
print("uploading shards to redis db")
for filename in tqdm(shards):
    with open("export/{}".format(filename), "r") as tmp:
        shard = json.load(tmp)
        for key,value in shard.items():
            db.set(key, json.dumps(value, ensure_ascii=False))

print("verifying all nodes present in redis database")
for node in tqdm(nodes):
    assert "{}-name".format(node) in db, "{}-name".format(node)
    assert "{}-inputs".format(node) in db, "{}-inputs".format(node)
    assert "{}-outputs".format(node) in db, "{}-outputs".format(node)
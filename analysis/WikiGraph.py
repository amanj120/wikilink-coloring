import redis
import json

# wrapper around the redis database that reads the graph information and provides similarity scores
class WikiGraph:

    def __init__(self):
        self.db = redis.StrictRedis(db=1)
        assert self.db.ping(), "redis connection could not be established"
    
    def getInputs(self, node):
        return set(json.loads(self.db.get("{}-inputs".format(node))))
    
    def getOutputs(self, node):
        return set(json.loads(self.db.get("{}-outputs".format(node))))

    def getName(self, node):
        return self.db.get("{}-name".format(node)).decode("UTF-8")[1:-1] # get rid of quote marks
    

    # This is the main information retrieval algorithm
    # It works by comparing input and output similarity scores for each page in the node's community
    # the community is the set of all nodes that are connected to the given node (either input or output)
    # the input similarity score is how similar two nodes' inputs are to each other
        # this is the intersection of their inputs divided by the union of their inputs
        # intersection/union normalizes for pages that share a large number of inputs, but only because
        # both of their input spaces are very large, so the actual overlap percentage is small
    # output similarity score is calculated similarly
    def getSimilarities(self, node):
        nodeOuts = self.getOutputs(node)
        nodeIns = self.getInputs(node)
        community = nodeIns.union(nodeOuts)

        data = dict()
        maxSimilarity = 0.0

        for neighbor in community:
            ins = self.getInputs(neighbor)
            outs = self.getOutputs(neighbor)
            inputSimilarity = len(nodeIns.intersection(ins)) / len(nodeIns.union(ins))
            outputSimilarity = len(nodeOuts.intersection(outs)) / len(nodeOuts.union(outs))
            L2 = ((inputSimilarity ** 2) + (outputSimilarity ** 2)) ** 0.5
            data[self.getName(neighbor)] = L2
            maxSimilarity = max(maxSimilarity, L2)
        
        for key in data.keys():
            data[key] /= maxSimilarity
    
        return data

        
        
        
   
    

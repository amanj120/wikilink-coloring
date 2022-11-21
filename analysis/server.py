import json
from flask import Flask
from WikiGraph import WikiGraph
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # need to do this to allow requests from the wikipedia.org domain
graph = WikiGraph()

# Simple HTTP wrapper around the redis graph interface
@app.route('/<pageId>', methods=["GET"])
def getAnalysis(pageId):
    node = int(pageId)
    data = graph.getSimilarities(node)
    return json.dumps(data, ensure_ascii=False)


if __name__ == "__main__":
    app.run()
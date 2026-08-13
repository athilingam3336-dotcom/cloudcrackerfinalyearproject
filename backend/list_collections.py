from pymongo import MongoClient
client = MongoClient('mongodb://localhost:27017')
db = client['cloudcrackers']
print(db.list_collection_names())

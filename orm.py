'''
Database connections and Classes 
'''
import json, requests
import networkx as nx
from networkx.readwrite import json_graph
from bson.objectid import ObjectId

from pymongo import MongoClient
client = MongoClient('mongodb://10.90.122.109:27017/')
db = client['LJP2014']
COLL = db['ljp56Chdirs2']
COLL_RES = db['userResults']

## CONFIGs
RURL = 'http://146.203.54.71:31164/custom/SigineLJP' # URL for the Rook server doing enrichments
LJP_NET_PATH = 'data/harvard_net_with_pos.json'


def load_LJP_net():
	data = json.load(open(LJP_NET_PATH, 'rb'))
	net = json_graph.node_link_graph(data)
	return net

class EnrichmentResult(object):
	"""EnrichmentResult: object for documents in the userResults collection"""
	projection = {'_id':0, 'data':0, 'timestamp':0}

	def __init__(self, rid):
		'''To retrieve a result using _id'''
		self.rid = ObjectId(rid)
		doc = COLL_RES.find_one({'_id': self.rid}, self.projection)
		self.sig_ids = doc['result']['sig_ids']
		self.scores = doc['result']['scores']
		type_ = doc['type']
		if type_ == 'CD': self.default_score = 1.
		else: self.default_score = 0.
		# timestamp = self.rid.generation_time

	def bind_to_network(self, net):
		'''Bind the enrichment results to the networkx.Graph object'''
		result_dict = dict(zip(self.sig_ids, self.scores))
		for n in net.nodes():
			if n in result_dict:
				net.node[n]['Enrichment score'] = result_dict[n]
			else:
				net.node[n]['Enrichment score'] = self.default_score
		return net


class UserInput(object):
	"""The base class for GeneSets and Signature"""
	config = {"direction":"mimic","combination":False}
	headers = {'content-type':'application/json'}
	default_score = None # default enrichment score for an irrelevant signature

	def __init__(self, data):
		self.data = data
		self.result = None
		self.type = None
		self.rid = None

	def enrich(self):
		'''POST to Rook API to get enriched LJP signatures'''
		self.config['method'] = self.type
		payload = dict(self.data.items() + self.config.items())
		response = requests.post(RURL, data=json.dumps(payload),headers=self.headers)
		self.result = response.json()
		return self.result

	def save(self):
		'''Save the UserInput as well as the EnrichmentResult to a document'''
		res = COLL_RES.insert_one({
			'result': self.result, 
			'data': self.data, 
			'type': self.type,
			})
		self.rid = res.inserted_id # <class 'bson.objectid.ObjectId'>
		return str(self.rid)

	def bind_enrichment_to_network(self, net):
		'''Bind the enrichment results to the networkx.Graph object'''
		scores = self.result['scores']
		sig_ids = self.result['sig_ids']
		result_dict = dict(zip(sig_ids, scores))
		for n in net.nodes():
			if n in result_dict:
				net.node[n]['Enrichment score'] = result_dict[n]
			else:
				net.node[n]['Enrichment score'] = self.default_score
		return net

class GeneSets(UserInput):
	"""docstring for GeneSets"""
	def __init__(self, up_genes, dn_genes):
		data = {'upGenes': up_genes, 'dnGenes': dn_genes}
		UserInput.__init__(self, data)
		self.type = 'geneSet'
		self.default_score = 0. # overlap/genecount

class Signature(UserInput):
	"""docstring for Signature"""
	def __init__(self, genes, vals):
		data = {'input': {
					'genes': genes,
					'vals': vals
				}
			}
		UserInput.__init__(self, data)
		self.type = 'CD'
		self.default_score = 1. # cosine distance


## testing
## GeneSets user input
# data = json.load(open('test/ebovs_crispy_old.json', 'rb'))
# data = data['ebov30min']
# gs = GeneSets(data['up'], data['dn'])
# print gs.type
# print gs.config
# res = gs.enrich()
# print gs.config
# rid = gs.save()
# print rid

## Signature user input
# data = json.load(open('test/ebovs.json', 'rb'))
# data = data['ebov30min']
# sig = Signature(data['genes'] ,data['vals'])
# print sig.default_score
# res = sig.enrich()
# rid = sig.save()
# print rid

# print res.keys()
# print min(res['scores']), max(res['scores'])
# print res['scores'][:5]


## testing bind to network methods
# net = load_LJP_net()
# print net.number_of_edges(), net.number_of_nodes()
# n = net.nodes()[2]
# print net.node[n]


# # net = sig.bind_enrichment_to_network(net)
# # print net.number_of_edges(), net.number_of_nodes()
# # print net.node[n]


# rid = '568d7b30d5c2f714998a6e25'
# er = EnrichmentResult(rid)

# net = er.bind_to_network(net)
# print net.number_of_edges(), net.number_of_nodes()
# print net.node[n]


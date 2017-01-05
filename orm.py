'''
Database connections and Classes 
'''
import json, requests
import pandas as pd
import networkx as nx
from networkx.readwrite import json_graph
from bson.objectid import ObjectId

from pymongo import MongoClient

## load CONFIG
CONFIG = json.load(open('config/config.json', 'rb'))

client = MongoClient(CONFIG['mongoURI'])
# client = MongoClient('mongodb://127.0.0.1:27017/')
DB = client['LJP2014']
COLL = DB['ljp56Chdirs2']
COLL_RES = DB['userResults']

## CONFIGs
RURL = CONFIG['RURL'] # URL for the Rook server doing enrichments
LJP_NET_PATH = CONFIG['LJP_NET_PATH']

def load_LJP_net(net_path=None):
	if net_path is None:
		net_path = LJP_NET_PATH
	data = json.load(open(net_path, 'rb'))
	net = json_graph.node_link_graph(data)
	## remove all links since they are not required for visualization
	net.remove_edges_from(net.edges())
	return net

def load_enrichment_tables():
	'''Load rank average tables for signatures clustered by Cidx and by DrugName'''
	df1 = pd.read_csv(CONFIG['ENRICH_TABLE_PATH'])
	df1.columns = ['Cidx', 'terms', 'RA', 'library', 'direction']
	df2 = pd.read_csv(CONFIG['ENRICH_DRUG_TABLE_PATH'])
	df2.columns = ['Drug', 'terms', 'RA', 'library', 'direction']

	name_map = {
		'MGI_Mammalian_Phenotype_Level_4': 'MGI_Mammalian_Phenotype',
		'Epigenomics_Roadmap_HM_ChIP-seq': 'Epigenomics_Roadmap_HM',
		'ENCODE_TF_ChIP-seq_2015': 'ENCODE_TF', 
		'GO_Biological_Process_2015': 'GO_Biological_Process',	
	}
	df2['library'] = df2['library'].map(lambda x: name_map.get(x, x))
	return {'Cidx': df1, 'Drug': df2}

class EnrichmentResult(object):
	"""EnrichmentResult: object for documents in the userResults collection"""
	projection = {'_id':0, 'data':0, 'timestamp':0}
	default_score = 0.

	def __init__(self, rid):
		'''To retrieve a result using _id'''
		self.rid = ObjectId(rid)
		doc = COLL_RES.find_one({'_id': self.rid}, self.projection)
		self.sig_ids = doc['result']['sig_ids']
		self.scores = doc['result']['scores']
		self.type = doc['type']
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
	default_score = 0. # default enrichment score for an irrelevant signature

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

	def json_data(self):
		'''Return an object to be encoded to json format'''
		return self.data

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

	def enrich(self):
		'''Convert cosine distance returned from the Rook API to cosine simiarity'''
		self.result = super(Signature, self).enrich()
		self.result['scores'] = map(lambda x: round(1-x, 4), self.result['scores'])
		return self.result

	def json_data(self):
		'''Return an object to be encoded to json format'''
		return self.data['input']

class SignatureCollection(object):
	"""A collection of signatures"""
	projection = {'_id': 0}

	def __init__(self, coll_name):
		self.coll = DB[coll_name]

	def fetch(self, query):
		'''Fetch a Signature instance in the collection based on query'''
		doc = self.coll.find_one(query)
		return Signature(doc['genes'], doc['vals'])
		

class CCLESignatureCollection(SignatureCollection):
	"""The class for a whole collection of example signatures"""
	def __init__(self):
		SignatureCollection.__init__(self, 'ccle')

	def summary(self):
		'''Summary metadata fields and return an array of metadata dicts'''
		# pipeline = [
		# 	{'$project': {'tissue':1, 'cell':1}},
		# 	{'$group': {
		# 		'_id': '$tissue', 
		# 		'cells': {'$addToSet': '$cell'}}
		# 	}
		# ]
		# res = self.coll.aggregate(pipeline)
		# meta = list(res)
		res = self.coll.find({}, {'cell':1,'tissue':1,'_id':0})
		options = list(res)
		optgroups = self.coll.distinct('tissue')
		meta = {'options': options, 
			'optgroups': [{'id': tissue, 'name': tissue[0] + tissue[1:].lower().replace('_', ' ')} for tissue in optgroups]}
		self.meta = meta
		return self.meta

class DiseaseSignatureCollection(SignatureCollection):
	"""docstring for DiseaseSignatureCollection"""
	def __init__(self):
		SignatureCollection.__init__(self, 'diseases')

	def summary(self):
		res = self.coll.find({}, {'term':1, 'desc':1, '_id':0})
		options = list(res)
		meta = {'options': options}
		self.meta = meta
		return self.meta
		

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

# from pprint import pprint
# esc = CCLESignatureCollection()
# meta = esc.summary()
# pprint(meta)

# df = load_enrichment_table()
# print df.head()
# print df.shape
# print df.loc[(df['Cluster Index'] == 1) & (df['Library'] == 'KEA_2015'), :].shape
# print df['Cluster Index'].unique()

'''
To retrieve the DEGs from mongodb and perform enrichment analysis
to find top enriched terms for each LJP signature
'''
import os, sys
import json
import cPickle as pickle
from collections import OrderedDict
import numpy as np
import pandas as pd
from scipy.stats import fisher_exact
from pymongo import MongoClient
client = MongoClient('mongodb://10.91.53.225:27017/')
db = client['LJP2014']
COLL = db['ljp56Chdirs2']

sys.path.append('/Users/zichen/Documents/bitbucket/maayanlab_utils')
from RNAseq import enrichr_result
from fileIO import read_gmt
# from gene_lists import fisherp

def fisherp(s1, s2, universe=22000):
	a = len(s1 & s2)
	b = len(s1)
	c = len(s2)
	if a == 0:
		pval = 1.
	else:
		_, pval = fisher_exact([[a,b], [c,universe]])
	return pval



print COLL.count()
all_sig_ids = COLL.distinct("sig_id")
print len(all_sig_ids)

## only do enrichment for sig_ids in network
data = json.load(open('../net_and_view.cyjs', 'rb'))
sig_ids_in_net = set([node['data']['name'] for node in data['elements']['nodes']])

## make sure mongodb contain all the sig_ids in network
print len(sig_ids_in_net)
assert len(sig_ids_in_net & set(all_sig_ids)) == len(sig_ids_in_net)

GENES = json.load(open('../LJP56GeneSymbols.json', 'rb'))
GENES = np.array(GENES)
print "# of genes", len(GENES)

class Signature(object):
	"""docstring for Signature"""
	def __init__(self, sig_id, meta=None, up_genes=None, dn_genes=None,
			projection={'sigIdx':True, 'chdirFull':True, '_id':False}):
		## defaults:
		if meta is None: meta = {}
		if up_genes is None: up_genes = set()
		if dn_genes is None: dn_genes = set()

		self.sig_id = sig_id
		self.meta = meta
		self.up_genes = up_genes
		self.dn_genes = dn_genes

		## get data from db
		doc = COLL.find_one({'sig_id': sig_id}, projection)
		if 'sigIdx' in doc:
			sigIdx = np.array(doc['sigIdx']) - 1 # because it's generated in MATLAB
			chdirs = np.array(doc['chdirFull'])[sigIdx]
			genes = GENES[sigIdx]
			for gene, val in zip(genes, chdirs):
				if val > 0:
					self.up_genes.add(gene)
				else:
					self.dn_genes.add(gene)


	def enrich(self, d_gmt):
		## enrichment using fisher test
		up_pvals = np.ones(len(d_gmt))
		dn_pvals = np.ones(len(d_gmt))

		i = 0
		for term, gene_set in d_gmt.items():
			up_pval = fisherp(self.up_genes, gene_set, universe=22000)
			up_pvals[i] = up_pval
			
			dn_pval = fisherp(self.dn_genes, gene_set, universe=22000)
			dn_pvals[i] = dn_pval
			i += 1

		return up_pvals, dn_pvals


## retrieve up/dn genes for sigs
# d_sig_objs = OrderedDict()
# i = 0
# for sig_id in sig_ids_in_net:
# 	i += 1
# 	sig = Signature(sig_id)
# 	d_sig_objs[sig_id] = sig 
# 	# print len(sig.up_genes), len(sig.dn_genes)
# 	if i % 100 == 0:
# 		print i, len(sig_ids_in_net)
# pickle.dump(d_sig_objs, open('../d_sig_objs.pkl', 'wb'))


## compute enrichment
def get_top_enriched_term(pval_mat, d_gmt, sig_ids, pval_cutoff=None, max_term=19, rank_cutoff=2):
	
	terms = d_gmt.keys()
	significant_mat = pval_mat < pval_cutoff
	pval_mat = pd.DataFrame(pval_mat)
	# pval_mat.columns = terms
	rank_mat = pval_mat.rank(axis=1).values

	enrich_mat = significant_mat * (rank_mat < rank_cutoff) # True for term passing both pval_mat and rank_cutoff

	enrich_vec = enrich_mat.sum(axis=0) # 0 for terms not enriched in a sigle signature
	print "# of enriched terms across signatures", (enrich_vec > 0).sum()

	# series of # of enriched signature for each term
	enrich_s = pd.Series(enrich_vec, index=terms)
	enrich_s.sort(ascending=False)
	frequent_terms = enrich_s[0:max_term].index.tolist()
	print 'frequent_terms:', frequent_terms
	
	d_sig_id_terms = {} # collect enriched term for sig_id

	enriched_rank_mat = significant_mat * rank_mat

	terms = np.array(terms)
	for sig_id, row in zip(sig_ids, enriched_rank_mat): # iterate each signature
		srt_idx = row.argsort()[::-1] # sort ranks from lare
		mask_sig = row[srt_idx] > 0
		sorted_terms = terms[srt_idx][mask_sig]
		enriched_term = 'other'
		for term in sorted_terms:
			if term in frequent_terms:
				enriched_term = term
				break
		d_sig_id_terms[sig_id] = enriched_term

	return d_sig_id_terms



d_sig_objs = pickle.load(open('../d_sig_objs.pkl', 'rb'))
print len(d_sig_objs)

GMT_FILE_ROOT = '/Users/zichen/Documents/GitLab/gmt_files/'
# gmt_name = 'ChEA'
# gmt_name = 'KEGG_2015'
# gmt_name = 'KEA_2015'
# gmt_name = 'MGI_Mammalian_Phenotype_Level_4'
# gmt_name = 'Epigenomics_Roadmap_HM_ChIP-seq'
# gmt_name = 'ENCODE_TF_ChIP-seq_2015'
gmt_name = 'GO_Biological_Process_2015'

d_gmt = read_gmt(GMT_FILE_ROOT + '%s.gmt' % gmt_name)
for key, genes in d_gmt.items():
	d_gmt[key] = set(genes)

pval_cutoff = 0.05/len(d_gmt)

## compute p-values and save pvalue matrix
up_pval_mat = np.ones((len(sig_ids_in_net),  len(d_gmt)), dtype=np.float32)
dn_pval_mat = np.ones((len(sig_ids_in_net),  len(d_gmt)), dtype=np.float32)

i = 0
for sig_id, sig in d_sig_objs.items():
	up_pvals, dn_pvals = sig.enrich(d_gmt)
	up_pval_mat[i] = up_pvals
	dn_pval_mat[i] = dn_pvals
	i += 1
	if i % 50 == 0:
		print i, len(d_sig_objs)

np.savetxt('../up_pval_mat_%s.txt' % gmt_name, up_pval_mat)
np.savetxt('../dn_pval_mat_%s.txt' % gmt_name, dn_pval_mat)

# up_pval_mat = np.loadtxt('../up_pval_mat_%s.txt' % gmt_name)
# dn_pval_mat = np.loadtxt('../dn_pval_mat_%s.txt' % gmt_name)

# terms = d_gmt.keys()
# sig_ids = d_sig_objs.keys()

# d_sig_id_terms = get_top_enriched_term(up_pval_mat, d_gmt, sig_ids, pval_cutoff=pval_cutoff)
# print d_sig_id_terms.items()[:5]
# print d_sig_id_terms.items()[5:15]


# enrich_vec = get_top_enriched_term(dn_pval_mat, d_gmt, pval_cutoff=pval_cutoff)



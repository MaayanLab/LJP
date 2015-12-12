'''
Get top enriched term for each signature based on the enrichment p-value matrices

And output json_graph
'''
from signature import *

import os, sys
import cPickle as pickle
import pandas as pd
from networkx.readwrite import json_graph

sys.path.append('/Users/zichen/Documents/bitbucket/maayanlab_utils')
from fileIO import read_gmt

## extract top enriched terms and make json

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


data = json.load(open('../harvard_net_with_pos.json','rb'))
G = json_graph.node_link_graph(data)

d_sig_objs = pickle.load(open('../d_sig_objs.pkl', 'rb'))
print len(d_sig_objs)
sig_ids = d_sig_objs.keys()

gmt_names = [
	'ChEA',
	'KEGG_2015',
	'KEA_2015',
	'MGI_Mammalian_Phenotype_Level_4',
	'Epigenomics_Roadmap_HM_ChIP-seq',
	'ENCODE_TF_ChIP-seq_2015',
	'GO_Biological_Process_2015',
]

rank_cutoff = 5

for gmt_name in gmt_names:
	print gmt_name
	d_gmt = read_gmt(GMT_FILE_ROOT + '%s.gmt' % gmt_name)
	for key, genes in d_gmt.items():
		d_gmt[key] = set(genes)
	terms = d_gmt.keys()
	pval_cutoff = 0.05/len(d_gmt)

	## load enrichment p-value matrices
	up_pval_mat = np.loadtxt('../up_pval_mat_%s.txt' % gmt_name)
	dn_pval_mat = np.loadtxt('../dn_pval_mat_%s.txt' % gmt_name)

	## find top enriched term for each sig_id and bind them to G
	d_sig_id_terms = get_top_enriched_term(up_pval_mat, d_gmt, sig_ids, pval_cutoff=pval_cutoff, rank_cutoff=rank_cutoff)
	key = gmt_name + '|up'
	for sig_id, term in d_sig_id_terms.items():
		G.node[sig_id][key] = term

	d_sig_id_terms = get_top_enriched_term(dn_pval_mat, d_gmt, sig_ids, pval_cutoff=pval_cutoff, rank_cutoff=rank_cutoff)
	key = gmt_name + '|dn'
	for sig_id, term in d_sig_id_terms.items():
		G.node[sig_id][key] = term

## output network
data = json_graph.node_link_data(G)
json.dump(data, open('../harvard_net_with_pos_enriched_terms.json', 'wb'))
json.dump(data, open('data/harvard_net_with_pos_enriched_terms.json', 'wb'))


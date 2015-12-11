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

sys.path.append('/Users/zichen/Documents/bitbucket/maayanlab_utils')
from RNAseq import enrichr_result
from fileIO import read_gmt
# from gene_lists import fisherp

from signature import *

print COLL.count()
all_sig_ids = COLL.distinct("sig_id")
print len(all_sig_ids)

## only do enrichment for sig_ids in network
data = json.load(open('../net_and_view.cyjs', 'rb'))
sig_ids_in_net = set([node['data']['name'] for node in data['elements']['nodes']])

## make sure mongodb contain all the sig_ids in network
print len(sig_ids_in_net)
assert len(sig_ids_in_net & set(all_sig_ids)) == len(sig_ids_in_net)


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

d_sig_objs = pickle.load(open('../d_sig_objs.pkl', 'rb'))
print len(d_sig_objs)


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



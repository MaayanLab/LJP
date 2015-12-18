## perform enrichment for signatures using Enrichr API
import os, sys
import json
import cPickle as pickle
from collections import OrderedDict
import numpy as np
import pandas as pd
from signature import *
sys.path.append('/Users/zichen/Documents/bitbucket/maayanlab_utils')
# from RNAseq import enrichr_result


d_sig_objs = pickle.load(open('../d_sig_objs.pkl', 'rb'))
print len(d_sig_objs)

gmt_names = ['ChEA_2015',
'KEGG_2015',
'KEA_2015',
'MGI_Mammalian_Phenotype_Level_4',
'Epigenomics_Roadmap_HM_ChIP-seq',
'ENCODE_TF_ChIP-seq_2015',
'GO_Biological_Process_2015',
]

res_dir = '../Enrichr_results/'
i = 0

## hit the Enrichr API
# for sig_id, sig in d_sig_objs.items():
# items = d_sig_objs.items()
# items.reverse()
# for sig_id, sig in items:
# 	fn = res_dir + sig_id + '.pkl'
# 	i += 1
# 	if not os.path.isfile(fn):
# 		res = sig.enrichr(gmt_names)
# 		pickle.dump(res, open(fn, 'wb'))
# 		if i % 50 == 0:
# 			print i, len(d_sig_objs)

## parse pkls and extract combined scores
## and outer join the combined scores df
d_all_result = {}
for gmt_name in gmt_names:
	d_all_result[gmt_name + '-up'] = None
	d_all_result[gmt_name + '-dn'] = None

i = 0
for fn in os.listdir(res_dir):
	if fn.endswith('.pkl'):

		(res_up, res_dn) = pickle.load(open(res_dir + fn,'rb'))
		sig_id = fn.split('/')[-1].strip('.pkl')

		# gmt_name = gmt_names[0]
		for gmt_name in gmt_names:
			if gmt_name in res_up:
				df = res_up[gmt_name]
				df = df[['term', 'combined']].set_index('term')
				df.columns = [sig_id]
				# print df.head()
				# print df.shape
				key = gmt_name + '-up'
				if d_all_result[key] is None:
					d_all_result[key] = df
				else:
					d_all_result[key] = d_all_result[key].merge(df, how='outer', left_index=True, right_index=True)
			if gmt_name in res_dn:
				df = res_dn[gmt_name]
				df = df[['term', 'combined']].set_index('term')
				df.columns = [sig_id]
				key = gmt_name + '-dn'
				if d_all_result[key] is None:
					d_all_result[key] = df
				else:
					d_all_result[key] = d_all_result[key].merge(df, how='outer', left_index=True, right_index=True)				

		i += 1
		if i % 100 == 0:
			print i, len(d_sig_objs), d_all_result[key].shape

pickle.dump(d_all_result, open('../Enrichr_d_all_results_combined_score.pkl', 'wb'))



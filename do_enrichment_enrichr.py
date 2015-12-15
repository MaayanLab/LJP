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
for sig_id, sig in d_sig_objs.items():
	fn = res_dir + sig_id + '.pkl'
	i += 1
	if not os.path.isfile(fn):
		res = sig.enrichr(gmt_names)
		pickle.dump(res, open(fn, 'wb'))
		if i % 50 == 0:
			print i, len(d_sig_objs)


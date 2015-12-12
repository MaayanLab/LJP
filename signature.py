import numpy as np
from scipy.stats import fisher_exact
import json
from pymongo import MongoClient
# client = MongoClient('mongodb://10.91.53.225:27017/')
# db = client['LJP2014']
# COLL = db['ljp56Chdirs2']

GENES = json.load(open('../LJP56GeneSymbols.json', 'rb'))
GENES = np.array(GENES)
print "# of genes", len(GENES)

GMT_FILE_ROOT = '/Users/zichen/Documents/GitLab/gmt_files/'


def fisherp(s1, s2, universe=22000):
	a = len(s1 & s2)
	b = len(s1)
	c = len(s2)
	if a == 0:
		pval = 1.
	else:
		_, pval = fisher_exact([[a,b], [c,universe]])
	return pval


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


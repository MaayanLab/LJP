'''
To insert upGenes, dnGenes fields in the database
'''
import cPickle as pickle
from signature import *
d_sig_objs = pickle.load(open('../d_sig_objs.pkl', 'rb'))
print len(d_sig_objs)

c = 0
for sig_id, sig in d_sig_objs.items():
	if len(sig.up_genes) > 0:
		c += 1
		# print sig_id
		# print list(sig.up_genes)
		# print list(sig.dn_genes)
		COLL.update_one(
			{"sig_id": sig_id}, 
			{"$set": {"upGenes": list(sig.up_genes), "dnGenes": list(sig.dn_genes)}}
			)
		if c % 100 == 0:
			print c, len(d_sig_objs), sig_id


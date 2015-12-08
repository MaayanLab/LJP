## to parse cytoscape json file exported from cytoscape

import os, sys, json
import math
import numpy as np
import pandas as pd
import networkx as nx
from networkx.readwrite import json_graph


data = json.load(open('net_and_view.cyjs', 'rb'))

G = nx.Graph()

print len(data)
print data.keys()
print data['elements'].keys()
print len(data['elements']['nodes'])
print len(data['elements']['edges'])
# print 
print data['elements']['nodes'][0].keys()
print data['elements']['edges'][0].keys()


# a list of node attrs to have in the network
node_attrs = ['CellLine', 'cellular_function', 'Cidx', 'Conc', 'DrugClass',
	'GRvalue', 'pathway_role', 'pvalue', 'Time', 'DrugName'] 

d_sid_name = {}

smallest_logp = 5

for node in data['elements']['nodes']:
	d = node['data']
	pos = node['position']
	name = d['name']
	attrs = {key: d[key] for key in node_attrs}
	if attrs['pvalue'] == 0:
		attrs['-logPvalue'] = 5
	else:
		attrs['-logPvalue'] = -math.log10(attrs['pvalue'])
	attrs['position'] = pos
	G.add_node(name, **attrs)

for edge in data['elements']['edges']:
	d = edge['data']
	n1, n2 = d['name'].split(' (pp) ')
	# cosinedist = d['cosinedist']
	G.add_edge(n1,n2)

print G.number_of_nodes(), G.number_of_edges()
data = json_graph.node_link_data(G,attrs={'source': 'source', 'target': 'target', 'key': 'key', 'id': 'id'})
# print data['links'][0]
json.dump(data, open('harvard_net_with_pos.json', 'wb'))
import matplotlib.pyplot as plt
# x = [d['position']['x'] for n,d in G.nodes(data=True)]
# y = [d['position']['y'] for n,d in G.nodes(data=True)]
## examine pvalues
# p = [d['pvalue'] for n,d in G.nodes(data=True)]
# logp = np.log10(p)
# plt.scatter(x, y)

# logp.sort()
# print logp[np.isfinite(logp)][:5]
# plt.hist(p, bins=100)
# plt.show()

## to parse edge, node tables exported from cytoscape session file
import os, sys, json
import numpy as np
import pandas as pd
import networkx as nx
from networkx.readwrite import json_graph


G = nx.Graph()
node_df = pd.read_csv('cytoscape_tables/cluster_color_nodes.csv')

print node_df.head()
# print node_df['DrugClass'].unique()
# print node_df['pathway_role'].unique()
# print node_df['DrugName'].nunique()
# print node_df['cellular_function'].nunique()
# print node_df['CellLine'].nunique()

# a list of node attrs to have in the network
node_attrs = ['CellLine', 'cellular_function', 'Cidx', 'Conc', 'DrugClass',
	'GRvalue', 'pathway_role', 'pvalue', 'Time'] 

## add node and attrs of node needed
for i, row in node_df.iterrows():
	name = row['name']
	attrs = {key: row[key] for key in node_attrs}
	G.add_node(name, **attrs)


edge_df = pd.read_csv('cytoscape_tables/cluster_color_edges.csv')
print edge_df.head()


for i, row in edge_df.iterrows():
	name = row['name']
	cosinedist = row['cosinedist']
	n1, n2 = name.split(' (pp) ')
	G.add_edge(n1, n2, weight=cosinedist)

data = json_graph.node_link_data(G,attrs={'source': 'source', 'target': 'target', 'key': 'key', 'id': 'id'})
json.dump(data, open('harvard_net.json', 'wb'))



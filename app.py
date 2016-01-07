'''
Flask app handling enrichment against LJP data from user input up/dn gene sets and/or signatures
'''
import os, sys
from flask import Flask, request, redirect

from orm import *

ENTER_POINT = '/LJP'
app = Flask(__name__, static_url_path=ENTER_POINT, static_folder=os.getcwd())
app.debug = True
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 6

NET = load_LJP_net()

@app.route(ENTER_POINT + '/')
def root():
	return app.send_static_file('index.html') 
	## should have front-end routing for home.html and result.html

@app.route(ENTER_POINT + '/enrich', methods=['POST'])
def enrich():
	'''
	POST request data to SigineLJP and combine enrichment result 
	with network layout.
	'''
	if request.method == 'POST': 
		# data = json.loads(request.data)
		if request.form['method'] == 'geneSet':
			up_genes = request.form['upGenes'].split()
			dn_genes = request.form['dnGenes'].split()
			# print up_genes
			# print dn_genes
			user_input = GeneSets(up_genes, dn_genes)
		elif request.form['method'] == 'CD':
			genes_vals = request.form['signature'].split()
			genes = []
			vals = []
			for gv in genes_vals:
				gene, val = gv.split(',')
				genes.append(gene)
				vals.append(float(val))
			# print genes
			user_input = Signature(genes, vals)

		## POST to SigineLJP to do the enrichment 
		res = user_input.enrich()
		## save user input and enrichment results to db and get a result id
		rid = user_input.save()
	return redirect(ENTER_POINT + '/#result/' + rid, code=302)

@app.route(ENTER_POINT + '/result', methods=['GET'])
def result():
	'''
	Retrieve a enrichment result using id and combine it 
	with network layout.
	'''
	if request.method == 'GET': 
		rid = request.args.get('id', '')
		## retrieve enrichment results from db
		result_obj = EnrichmentResult(rid)
		## bind enrichment result to the network layout
		net = result_obj.bind_to_network(NET)
		## dump to json
		net_data = json_graph.node_link_data(net)
		return json.dumps(net_data)

if __name__ == '__main__':
	if len(sys.argv) > 1:
		port = int(sys.argv[1])
	else:
		port = 5000
	if len(sys.argv) > 2:
		host = sys.argv[2]
	else:
		host = '127.0.0.1'

	app.run(host=host, port=port)

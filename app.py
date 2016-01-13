'''
Flask app handling enrichment against LJP data from user input up/dn gene sets and/or signatures
'''
import os, sys
from flask import Flask, request, redirect

from orm import *

ENTER_POINT = CONFIG['ENTER_POINT']
app = Flask(__name__, static_url_path=ENTER_POINT, static_folder=os.getcwd())
app.debug = True
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 6

TABLE = load_enrichment_table()
NET = load_LJP_net()
CCLE = CCLESignatureCollection()
DISEASES = DiseaseSignatureCollection()

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
	return redirect(ENTER_POINT + '/#/result/' + rid, code=302)

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

@app.route(ENTER_POINT + '/ccle', methods=['GET'])
def ccle():
	'''
	Retrieve metadata of CCLE signatures or a specific signature.
	'''
	if request.method == 'GET':
		cell = request.args.get('cell', None)
		if cell is None:
			metadata = CCLE.summary()
			return json.dumps(metadata)
		else:
			sig = CCLE.fetch({'cell': cell})
			return json.dumps(sig.json_data())

@app.route(ENTER_POINT + '/diseases', methods=['GET'])
def diseases():
	'''
	Retrieve metadata of disease signatures or a specific signature.
	'''
	if request.method == 'GET':
		disease = request.args.get('disease', None)
		if disease is None:
			metadata = DISEASES.summary()
			return json.dumps(metadata)
		else:
			sig = DISEASES.fetch({'term': disease})
			return json.dumps(sig.json_data())

@app.route(ENTER_POINT + '/annotation', methods=['GET'])
def annotation():
	'''
	Retrieve table for top enriched terms for clusters
	'''
	if request.method == 'GET':
		## GET args
		cidx = int(request.args.get('cidx', 1))
		library = request.args.get('library', None)
		direction = request.args.get('direction', None)

		if None in (cidx, library, direction): # output meta
			meta = {}
			for col in TABLE.columns:
				if col not in ('Enriched Terms', 'Rank Average', 'Library'):
					meta[col] = TABLE[col].unique().tolist()
			## reorder libraries
			meta['Library'] = ['GO_Biological_Process', 'KEGG_2015', 'MGI_Mammalian_Phenotype', 
				'ChEA_2015', 'ENCODE_TF', 'KEA_2015', 'Epigenomics_Roadmap_HM']
			return json.dumps(meta)
		else: # output subset of table
			sub_table = TABLE.loc[
				(TABLE['Cluster Index'] == cidx) &
				(TABLE['Library'] == library) &
				(TABLE['Direction'] == direction)
			, :][['Enriched Terms', 'Rank Average']]
			return sub_table.to_json()



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

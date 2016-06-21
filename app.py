"""
Flask app handling enrichment against LJP data from user input up/dn gene sets and/or signatures
"""

import os, sys
from flask import Flask, request, redirect, render_template

from orm import *

ENTER_POINT = CONFIG['ENTER_POINT']
app = Flask(__name__, static_url_path=ENTER_POINT, static_folder=os.getcwd())
app.debug = True
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 6

# global variables
TABLE = load_enrichment_table()
NET = load_LJP_net()
NET0 = load_LJP_net(net_path=CONFIG['LJP_NET_PATH0'])  # the network without cluster enrichment
CCLE = CCLESignatureCollection()
DISEASES = DiseaseSignatureCollection()


@app.route(ENTER_POINT + '/')
def index_page():
    filename = 'data/harvard_net_with_pos_Cidx_enriched_terms_combined_score.json'
    with open(filename) as f:
        graph = f.read()
    description = '''<p>LJP-BCNB visualizes thousands of signatures from six breast cancer cell lines treated with ~100 single molecule perturbations, mostly kinase inhibitors. These perturbations were applied in different concentrations while gene expression was measured at different time points using the <a class="alert-link" href="http://www.lincscloud.org/l1000/">L1000 technology</a>. Under the same conditions, the cells were imaged for cell viability. The distance between nodes represents response similarity computed using the cosine distance between the Characteristic Direction vectors of perturbations compared with their appropriate controls.</p>
        <p>Use the controls on the top-right to zoom and pan the network and adjust the color, size and shape of the nodes based on various classifications.</p>'''
    return render_template('index.html',
                           description=description,
                           script='index',
                           graph=graph)


@app.route(ENTER_POINT + '/search')
def search_page():
    return render_template('search.html')


@app.route(ENTER_POINT + '/annotation', methods=['GET'])
def annotation_page():
    """
    Retrieve table for top enriched terms for clusters
    """
    description = '''<p>From this page you can explore the biological regulatory roles of each of the LJP network clusters. Up and down gene sets for each perturbation were submitted to enrichment analysis with Enrichr, and the top five terms for each cluster based on average rank, are displayed. Use the controls on the top right to toggle between clusters, libraries and up/down differentially expressed genes.</p>'''
    return render_template('index.html',
                           description=description,
                           script='annotation')

    # if request.method == 'GET':
    #     # GET args
    #     cidx = int(request.args.get('Cidx', 1))
    #     library = request.args.get('library', None)
    #     direction = request.args.get('direction', None)
    #
    #     if None in (cidx, library, direction):  # output meta
    #         meta = {}
    #         for col in TABLE.columns:
    #             if col not in ('terms', 'RA', 'library'):
    #                 meta[col] = TABLE[col].unique().tolist()
    #         # reorder libraries
    #         meta['library'] = ['GO_Biological_Process', 'KEGG_2015', 'MGI_Mammalian_Phenotype',
    #                            'ChEA_2015', 'ENCODE_TF', 'KEA_2015', 'Epigenomics_Roadmap_HM']
    #         return json.dumps(meta)
    #     else:  # output subset of table
    #         sub_table = TABLE.loc[
    #                     (TABLE['Cidx'] == cidx) &
    #                     (TABLE['library'] == library) &
    #                     (TABLE['direction'] == direction)
    #         , :][['terms', 'RA']]
    #         return sub_table.to_json(orient='records')


# should have front-end routing for home.html and result.html
@app.route(ENTER_POINT + '/net0', methods=['GET'])
def net0():
    """
    Serve the json_graph for NET0
    """
    if request.method == 'GET':
        net_data = json_graph.node_link_data(NET0)
        return json.dumps(net_data)


@app.route(ENTER_POINT + '/enrich', methods=['POST'])
def enrich():
    """
    POST request data to SigineLJP and combine enrichment result
    with network layout.
    """
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

        # POST to SigineLJP to do the enrichment
        res = user_input.enrich()
        # save user input and enrichment results to db and get a result id
        rid = user_input.save()
    return redirect(ENTER_POINT + '/result/' + rid, code=302)


@app.route(ENTER_POINT + '/result/<string:result_id>', methods=['GET'])
def result(result_id):
    """
    Retrieve a enrichment result using id and combine it
    with network layout.
    """
    # retrieve enrichment results from db
    result_obj = EnrichmentResult(result_id)
    # bind enrichment result to the network layout
    net = result_obj.bind_to_network(NET)
    net_data = json_graph.node_link_data(net)
    graph = json.dumps(net_data)
    return render_template('index.html',
                           description=None,
                           script='result',
                           graph=graph)


@app.route(ENTER_POINT + '/ccle', methods=['GET'])
def ccle():
    """
    Retrieve metadata of CCLE signatures or a specific signature.
    """
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
    """
    Retrieve metadata of disease signatures or a specific signature.
    """
    if request.method == 'GET':
        disease = request.args.get('disease', None)
        if disease is None:
            metadata = DISEASES.summary()
            return json.dumps(metadata)
        else:
            sig = DISEASES.fetch({'term': disease})
            return json.dumps(sig.json_data())


if __name__ == '__main__':
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    else:
        port = 5000
    if len(sys.argv) > 2:
        host = sys.argv[2]
    else:
        host = '127.0.0.1'
    app.run(host=host, port=port, threaded=True)

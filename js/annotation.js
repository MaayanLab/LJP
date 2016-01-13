// config params
var w = $("#svg_container").innerWidth();
var h = w/2;


// function for positions
var x = d3.scale.linear()
    .range([0, w]);

var y = d3.scale.linear()
    .range([0, h]);

var text_center = false;
var outline = false;

var nominal_base_node_size = 2;
var nominal_text_size = 2;
var max_text_size = 24;
var nominal_stroke = 1.5;
var max_stroke = 4.5;
var max_base_node_size = 36;

var text_display_scale = 3;
var min_zoom = 0.1;
var max_zoom = 20;
var svg = d3.select("#svg_container").append("svg");
var zoom = d3.behavior.zoom().scaleExtent([min_zoom,max_zoom])
var g = svg.append("g");


// for user to read
var readableMap = {
	shapeAttr: 'Shape by:',
	colorAttr: 'Color by:',
	sizeAttr: 'Size by:',
	CellLine: 'Cell line',
	Time: 'Time point',
	Conc: 'Concentration',
	DrugClass: 'Drug class',
	Cidx: 'Cluster index',
	pathway_role: 'Pathway role',
	cellular_function: 'Cellular function',
	GRvalue: 'GR value',
	'-logPvalue': '-log p-value',
	CELL_CYCLE: 'Cell cycle',
	SRC_family: 'SRC family',
	DNA_repair: 'DNA repair',
	terms: 'Enriched terms',
	RA: 'Rank Average'
}

function convertName (name) {
	if (readableMap.hasOwnProperty(name)) {
		name = readableMap[name];
	}
	return name;
}

function getParamsFromControler() {
	var params = {}
	var keys = ['Cidx', 'direction', 'library'];
	for (var i = 0; i < keys.length; i++) {
		var key = keys[i];
		var val = d3.select("#" + key).property("value");
		params[key] = val;
	};
	return params;
}

// Create DOMs for legend
var legendG = svg.append("g")
	.attr("class", "legend")
	.attr("transform", "translate(20, 20)");
legendG.append("g")
	.attr("id", "legendShape")
	.attr("class", "legendPanel")
	.attr("transform", "translate(0, 0)");
legendG.append("g")
	.attr("id", "legendSize")
	.attr("class", "legendPanel")
	.attr("transform", "translate(0, 170)");
legendG.append("g")
	.attr("id", "legendColor")
	.attr("class", "legendPanel")
	.attr("transform", "translate(0, 260)");

// Create DOM for controlers
var controlers = d3.select("#controlers")
	.attr("class", "form-horizontal");

// get attributes for controlers
d3.json(config['ENTER_POINT'] + '/annotation', function(controlAttrs){
	// create DOMs for controlAttrs and get params
	var params = _.mapObject(controlAttrs, function(val, key){
		var div = controlers.append("div")
			.attr("class", "form-group");
		div.append("label").attr("class", "control-label").text(convertName(key));
		var s = div.append("select").attr("id", key)
			.attr("class", "form-control");
		for (var i = 0; i < val.length; i++) {
			var item = val[i];
			s.append("option").text(convertName(item))
				.attr("value", item);
		};
		return val[0];
	});	

	// Create DOM for tooltip
	var tooltip = d3.select("body").append("div")
		.attr("class", "tooltip")
		.style("opacity", 0);

	// draw graph
	d3.json(config['ENTER_POINT'] + '/net0', function(error, graph) {
		// to get the extent of x and y from the data
		x.domain(d3.extent(graph.nodes, function(d) { return d.position.x; })).nice();
		y.domain(d3.extent(graph.nodes, function(d) { return d.position.y; })).nice();

		// get default params
		var cidxToHighlight = params['Cidx'];
		var shapeAttr = 'CellLine',
			sizeAttr = 'GRvalue',
			colorAttr = 'Cidx';
		var show_text = true;	

		// get uniq_categories for shapes
		var uniq_categories = _.uniq(_.map(graph.nodes, function(d){ return d[shapeAttr]}));
		// console.log(uniq_categories);

		var shape = d3.scale.ordinal()
			.domain(uniq_categories)
			.range(d3.svg.symbolTypes);
		
		var shapeL = d3.scale.ordinal() // used just for d3.legend
			.domain(uniq_categories)
			.range(_.map(d3.svg.symbolTypes, function(t) { return d3.svg.symbol().type(t)(); }));
		
		// get uniq_categories for colors
		// color by categorical variable
		var colors2 = {false:'#ccc', true:'red'};
		var colorDomain = [false, true];
		// console.log(uniq_categories2)
		var color = d3.scale.ordinal()
			.domain(colorDomain)
			.range(_.map(colorDomain, function(i){ return colors2[i]; }))
		var legendColor = d3.legend.color()
			.title(colorAttr)
			.shape("path", d3.svg.symbol().type("circle").size(30)())
			.shapePadding(10)
			.scale(color);

		svg.select("#legendColor")
			.call(legendColor);

		// get extent for sizes	
		var sizeExtent = d3.extent(graph.nodes, function(d){ return d[sizeAttr]});
		// console.log(sizeExtent);
		var size = d3.scale.linear()
			.domain(sizeExtent)
			.range([0.1,4])
			.nice();

		// set up legend
		// shape legend
		var legendShape = d3.legend.symbol()
			.scale(shapeL)
			.orient("vertical")
			.title(shapeAttr)
		svg.select("#legendShape")
			.call(legendShape);

		var legendSize = d3.legend.size()
			.scale(size)
			.title(sizeAttr)
			.cells(3)
			.shape('circle')
			.shapePadding(25)
			.labelOffset(15)
			.orient('horizontal');
		svg.select("#legendSize")
			.call(legendSize);

		// node is the wrapper of path and text for each nodes
		var node = g.selectAll(".node")
			.data(graph.nodes)
			.enter().append("g")
			.attr("class", "node")
			.attr("transform", function(d, i){
				return "translate(" + x(d.position.x) + "," + y(d.position.y) + ")";
			})
			.on("mouseover", function(d) {
				tooltip.transition()
				.duration(200)
				.style("opacity", .9);
				tooltip.html(d["DrugName"] + "<br/>" + d["id"]
					)
					.style("left", (d3.event.pageX + 5) + "px")
					.style("top", (d3.event.pageY - 28) + "px");
				})
			.on("mouseout", function(d) {
				tooltip.transition()
					.duration(500)
					.style("opacity", 0);
			});


		var circle = node.append("path")
		.attr("d", d3.svg.symbol()
			.size(function(d) { return Math.PI*Math.pow(size(d[sizeAttr])||nominal_base_node_size,2); })
			.type(function(d) { return shape(d[shapeAttr]); })
			)
		.style("fill", function(d) {
			return color(d[colorAttr] === cidxToHighlight);
		})
		.style("stroke-width", nominal_stroke)
		.style("strok", "black");


		var text = node.append("text")
		.attr("dy", ".35em")
		.style("font-size", nominal_text_size + "px")
		.attr("display", function(){
			var currentScale = d3.transform(g.attr("transform")).scale[0];
			return currentScale > text_display_scale ? "default" : "none";
		});


		if (text_center)
			text.text(function(d) { return d["DrugName"]; })
		.style("text-anchor", "middle");
		else 
			text.attr("dx", function(d) {return (size(d[sizeAttr])||nominal_base_node_size);})
		.text(function(d) { return '\u2002'+d["DrugName"]; });


		resize();


		function redraw(cidxToHighlight) {
			// 1. update the colors of node circles
			circle.style("fill", function(d) {
				return color(d[colorAttr] === cidxToHighlight);
			});

			// 2. update the legends
			legendColor.scale(color)
				.title('Belongs to Cluster #' + cidxToHighlight);
			svg.select("#legendColor").html("")
				.call(legendColor);

			// 3. update zoom
			zoom.on("zoom", zoomed);
			svg.call(zoom);	 		

		}
		
		redraw(cidxToHighlight);
		drawTable(params);

		d3.selectAll("select").on("change", function(){
			// get new params from select
			params = getParamsFromControler();
			var cidxToHighlight = parseInt(params["Cidx"]);
			redraw(cidxToHighlight);
			// drawTable
			drawTable(params);
		})	

		function resize() {
			var width = window.innerWidth, height = window.innerHeight;
			svg.attr("width", width).attr("height", height);
			w = width;
			h = height;
		};

		function zoomed() {
			var stroke = nominal_stroke;
			if (nominal_stroke*zoom.scale()>max_stroke) stroke = max_stroke/zoom.scale();
			// link.style("stroke-width",stroke);
			circle.style("stroke-width",stroke);

			var base_radius = nominal_base_node_size;
			if (nominal_base_node_size*zoom.scale()>max_base_node_size) base_radius = max_base_node_size/zoom.scale();
			circle.attr("d", d3.svg.symbol()
				.size(function(d) { return Math.PI*Math.pow(size(d[sizeAttr])*base_radius/nominal_base_node_size||base_radius,2); })
				.type(function(d) { return shape(d[shapeAttr]); })
				)
				
			if (!text_center) text.attr("dx", function(d) { return (size(d[sizeAttr])*base_radius/nominal_base_node_size||base_radius); });
			
			var text_size = nominal_text_size;
			if (nominal_text_size*zoom.scale()>max_text_size) text_size = max_text_size/zoom.scale();
			text.style("font-size",text_size + "px");

			// display text if the currentScale is large
			if (show_text) {
				var currentScale = d3.transform(g.attr("transform")).scale[0];
				text.attr("display", function(){
					return currentScale > text_display_scale ? "default" : "none";
				});
			} else {
				text.attr("display", "none");
			};

			g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
		};

		// zoom out a little to display the whole view
		var factor =0.8;
		var scale = d3.transform(g.attr("transform")).scale[0];
		var extent = [min_zoom,max_zoom];
		var newScale = scale * factor;
		var t = zoom.translate();
		var c = [w / 2, h / 2];
				zoom.scale(newScale)
					.translate(
					[c[0] + (t[0] - c[0]) / scale * newScale, 
					c[1] + (t[1] - c[1]) / scale * newScale])
					.event(svg.transition().duration(0))

		function zoomByFactor(factor){ // for zooming svg after button click
			var scale = d3.transform(g.attr("transform")).scale[0];;
			var extent = [min_zoom,max_zoom];
			var newScale = scale * factor;
			if (extent[0] <= newScale && newScale <= extent[1]) {
				var t = zoom.translate();
				var c = [w / 2, h / 2];
				zoom.scale(newScale)
					.translate(
					[c[0] + (t[0] - c[0]) / scale * newScale, 
					c[1] + (t[1] - c[1]) / scale * newScale])
					.event(svg.transition().duration(350));
			}
		};


		function drawTable(params){
			// send a GET request with params and draw table using response
			var el = "#table";
			
			d3.select("#table-div").remove();
			var div = d3.select(el).append("div")
				.attr("id", 'table-div')
				// .attr("class", "well");

			var getParams = $.param(params);
			console.log(params)
			// to get table using params:
			d3.json(config['ENTER_POINT'] + '/annotation?' + getParams, function(tableData){
				// display table on DOM
				var table = div.append('table')
					.attr('class', 'table table-hover table-striped table-condensed')
				var th = table.append('thead').append('tr');
				// add table header
				var keys = _.keys(tableData[0]);
				for (var i = 0; i < keys.length; i++) {
					th.append('td').text(convertName(keys[i]));
				};
				// add table data
				var tbody = table.append('tbody');
				var trs = tbody.selectAll('tr').data(tableData)
					.enter()
					.append('tr');
				trs.append('td').text(function(d){ return d[keys[0]]; });
				trs.append('td').text(function(d){ return d3.format(".2f")(d[keys[1]]); });
			});

		}


	});// end of d3.json('/net0') block


}); // end of d3.json('/annotation') block



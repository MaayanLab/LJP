$(document).ready(function(){
	$("#controlers").draggable({cursor: "move"});
})

// config params
var w = window.innerWidth;
var h = window.innerHeight;


// function for positions
var x = d3.scale.linear()
    .range([0, w]);

var y = d3.scale.linear()
    .range([0, h]);

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
}

function convertName (name) {
	if (readableMap.hasOwnProperty(name)) {
		name = readableMap[name];
	}
	return name;
}

// for controls and display of nodes
var controlAttrs = {
	shapeAttr: ["CellLine", 'Time', "Conc"],
	colorAttr: ["DrugClass","Cidx", "CellLine", "pathway_role", "cellular_function", "Conc", "Time",
		"GRvalue", "-logPvalue",
'ChEA_2015|up', 
'KEGG_2015|up', 
'KEA_2015|up', 
'MGI_Mammalian_Phenotype_Level_4|up', 
'Epigenomics_Roadmap_HM_ChIP-seq|up', 
'ENCODE_TF_ChIP-seq_2015|up', 
'GO_Biological_Process_2015|up', 
'ChEA_2015|dn', 
'KEGG_2015|dn', 
'KEA_2015|dn', 
'MGI_Mammalian_Phenotype_Level_4|dn', 
'Epigenomics_Roadmap_HM_ChIP-seq|dn', 
'ENCODE_TF_ChIP-seq_2015|dn', 
'GO_Biological_Process_2015|dn', 

		],
	sizeAttr: ["GRvalue", "-logPvalue", "Time", "Conc"],
}



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
	.attr("class", "well form-horizontal");

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
// DOM for showing text input
var div = controlers.append("div")
	.attr("class", "form-group");
div.append("label").attr("class", "control-label")
	.text("Show labels");
div.append("span").text(" ");
div.append("input")
	.attr("id", "show_text")
	.attr("type", "checkbox")
	.property("checked", true);

// default params
// console.log(params);

// Create DOM for tooltip
var tooltip = d3.select("body").append("div")
	.attr("class", "tooltip")
	.style("opacity", 0);

// svg.style("cursor","move");

var graph_fn = config["LJP_NET_PATH"];
d3.json(graph_fn, function(error, graph) {
	// to get the extent of x and y from the data
	x.domain(d3.extent(graph.nodes, function(d) { return d.position.x; })).nice();
	y.domain(d3.extent(graph.nodes, function(d) { return d.position.y; })).nice();

	// get default params
	var shapeAttr = params.shapeAttr,
		sizeAttr = params.sizeAttr,
		colorAttr = params.colorAttr;
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
	if (colorAttr === 'GRvalue' ||  colorAttr === '-logPvalue'){ // color by continuous variable 
		var colorExtent = d3.extent(graph.nodes, function(d) { return d[colorAttr]; });
		var min_score = colorExtent[0],
			max_score = colorExtent[1];
		var color = d3.scale.linear()
			.domain([min_score, (min_score+max_score)/2, max_score])
			.range(["#1f77b4", "white", "#d62728"]);
		var legendColor = d3.legend.color()
			.title(colorAttr)
			.shapeWidth(20)
			.cells(5)
			.scale(color);
	} else{ // color by categorical variable
		var uniq_categories2 = _.uniq(_.map(graph.nodes, function(d){ return d[colorAttr]}));
		var range20 = [];
		for (var i = 0; i != 20; ++i) range20.push(i)
		var colors20 = d3.scale.category20()
		// console.log(uniq_categories2)
		var color = d3.scale.ordinal()
			.domain(uniq_categories2)
			.range(_.map(range20, function(i){ return colors20(i); }))
		var legendColor = d3.legend.color()
			.title(colorAttr)
			.shape("path", d3.svg.symbol().type("circle").size(30)())
			.shapePadding(10)
			.scale(color);
	} 
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
		return color(d[colorAttr]);
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


	function redraw(shapeAttr, colorAttr, sizeAttr) {
		// 1. update scales
		var uniq_categories = _.uniq(_.map(graph.nodes, function(d){ return d[shapeAttr]}));
		shape.domain(uniq_categories);
		shapeL.domain(uniq_categories);
		
		// get uniq_categories for colors
		if (colorAttr === 'GRvalue' ||  colorAttr === '-logPvalue'){ // color by continuous variable 
			var colorExtent = d3.extent(graph.nodes, function(d) { return d[colorAttr]; });
			var min_score = colorExtent[0],
				max_score = colorExtent[1];
			var color = d3.scale.linear()
				.domain([min_score, (min_score+max_score)/2, max_score])
				.range(["#1f77b4", "white", "#d62728"]);
			var legendColor = d3.legend.color()
				.title(colorAttr)
				.shapeWidth(20)
				.cells(5)
				.scale(color);
		} else{ // color by categorical variable
			var uniq_categories2 = _.uniq(_.map(graph.nodes, function(d){ return d[colorAttr]}));
			var range20 = [];
			for (var i = 0; i != 20; ++i) range20.push(i)
			var colors20 = d3.scale.category20()
			// console.log(uniq_categories2)
			var color = d3.scale.ordinal()
				.domain(uniq_categories2)
				.range(_.map(range20, function(i){ return colors20(i); }))
			var legendColor = d3.legend.color()
				.title(colorAttr)
				.shape("path", d3.svg.symbol().type("circle").size(30)())
				.shapePadding(10)
				.scale(color);
		} 		

		var sizeExtent = d3.extent(graph.nodes, function(d){ return d[sizeAttr]});
		size.domain(sizeExtent)

		// 2. update the node circles
		circle.attr("d", d3.svg.symbol()
			.size(function(d) { return Math.PI*Math.pow(size(d[sizeAttr])||nominal_base_node_size,2); })
			.type(function(d) { return shape(d[shapeAttr]); })
			)
		.style("fill", function(d) {
			return color(d[colorAttr]);
		});

		// 3. update the legends
		legendShape.scale(shapeL)
			.title(convertName(shapeAttr))
		svg.select("#legendShape").html("")
			.call(legendShape);

		legendColor.scale(color)
			.title(convertName(colorAttr));
		svg.select("#legendColor").html("")
			.call(legendColor);

		legendSize.scale(size)
			.title(convertName(sizeAttr))
		svg.select("#legendSize").html("")
			.call(legendSize);
		// update legend text
		d3.selectAll("text.label").each(function(d, i){
			if (typeof d === "string") d3.select(this).text(convertName(d));
		});

		// 4. update zoom
		zoom.on("zoom", zoomed);

		svg.call(zoom);	 		

	}
	
	redraw(shapeAttr, colorAttr, sizeAttr)

	d3.selectAll("select").on("change", function(){
		// get new params from select
		var shapeAttr = d3.select("#shapeAttr").property("value"); 
		var colorAttr = d3.select("#colorAttr").property("value");
		var sizeAttr = d3.select("#sizeAttr").property("value");		
		redraw(shapeAttr, colorAttr, sizeAttr)
	})

	d3.select("#show_text").on("change", function(){
		// controling whether to show text labels
		var show_text = d3.select(this).property("checked");
		text.attr("display", function(){
			if (show_text) {
				var currentScale = d3.transform(g.attr("transform")).scale[0];
				return currentScale > text_display_scale ? "default" : "none";	
			} else {
				return "none";
			}
		});
	})

	// console.log(error)
	// var linkedByIndex = {}; // to store edges
	// graph.links.forEach(function(d) {
	// 	linkedByIndex[d.source + "," + d.target] = true;
	// });

	// function isConnected(a, b) {
	// 	return linkedByIndex[a.index + "," + b.index] || linkedByIndex[b.index + "," + a.index] || a.index == b.index;
	// }

	// function hasConnections(a) {
	// 	for (var property in linkedByIndex) {
	// 		s = property.split(",");
	// 		if ((s[0] == a.index || s[1] == a.index) && linkedByIndex[property]) return true;
	// 	}
	// 	return false;
	// }
	

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
		var show_text = d3.select("#show_text").property("checked");
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

	// zoom in/out buttons
	var btnGroup = controlers.append("div");

	btnGroup.append("button")
		.attr("class", "btn btn-default")
		.on("click", function(){ zoomByFactor(1.2) })
		.append("span")
			.attr("class", "glyphicon glyphicon-zoom-in");
	
	btnGroup.append("span").text("  ");
			
	btnGroup.append("button")
		.attr("class", "btn btn-default")
		.on("click", function(){ zoomByFactor(0.8) })
		.append("span")
			.attr("class", "glyphicon glyphicon-zoom-out");

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



});// end of d3.json(graph_fn) block

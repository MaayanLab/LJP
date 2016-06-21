function render_graph(graph) {

    // config params
    var $page = $('#page');
    var w = $page.width();
    var h = $page.height();

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
        colorAttr: ["Enrichment score", "DrugClass","Cidx", "CellLine", "pathway_role", "cellular_function", "Conc", "Time",
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

    // continuous color attributes
    var colorAttrContinuous = ["Enrichment score", "GRvalue", "-logPvalue"];

    var text_center = false;
    var outline = false;

    var nominal_base_node_size = 2;
    var nominal_text_size = 2;
    var max_text_size = 24;
    var nominal_stroke = 0.5;
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


    // Create DOM for controls
    var controls = d3.select("#controls");

    var params = _.mapObject(controlAttrs, function(val, key){
        var div = controls.append("div")
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
    var div = controls.append("div")
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

    // get rid from the URL
    // seems hacky and may need to change
    var rid = window.location.href.split('/').slice(-1).pop()
    // console.log(rid)

    // to get the extent of x and y from the data
    x.domain(d3.extent(graph.nodes, function(d) { return d.position.x; })).nice();
    y.domain(d3.extent(graph.nodes, function(d) { return d.position.y; })).nice();
    // sort nodes by Enrichment scores to get top and bottom 5 sigIds
    var sortedNodes = _.sortBy(graph.nodes, 'Enrichment score')
    var sortedSigIds = _.map(sortedNodes, function(d){ return d.id; });
    var bottomSigIds = sortedSigIds.slice(0,5),
        topSigIds = sortedSigIds.slice(-5);
    // make sure the nodes to be highlighted are at the right of the array
    sortedNodes = sortedNodes.slice(5, sortedNodes.length).concat(sortedNodes.slice(0,5));
    sortedSigIds = null;

    // get default params
    var shapeAttr = params.shapeAttr,
        sizeAttr = params.sizeAttr,
        colorAttr = params.colorAttr;
    var show_text = true;

    // set up scales used to draw shape, color and size
    setUpScales(shapeAttr, colorAttr, sizeAttr);
    // draw legends
    drawLegends(shapeAttr, colorAttr, sizeAttr);

    // draw the actural nodes of the network
    // node is the wrapper of path and text for each nodes
    var node = g.selectAll(".node")
        // .data(graph.nodes)
        .data(sortedNodes)
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
    // .style("z-index", "0")
    .style("strok", "black");


    var text = node.append("text")
    .attr("dy", ".35em")
    .style("font-size", nominal_text_size + "px")
    // .style("z-index", "1")
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

    // resize the svg
    resize();

    // enabling zoom
    zoom.on("zoom", zoomed);
    svg.call(zoom);

    // for controls
    d3.selectAll("select").on("change", function(){
        // get new params from select
        var shapeAttr = d3.select("#shapeAttr").property("value");
        var colorAttr = d3.select("#colorAttr").property("value");
        var sizeAttr = d3.select("#sizeAttr").property("value");
        redraw(shapeAttr, colorAttr, sizeAttr)
    });

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
    });

    // zoom in/out buttons
    var btnGroup = controls.append("div");

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



    // functions below
    function setUpScales(shapeAttr, colorAttr, sizeAttr) {
        // set up scales for shape, color and size
        // return global variables: [size, shape, shapeL, color, legendColor]
        // get extent for sizes
        var sizeExtent = d3.extent(graph.nodes, function(d){ return d[sizeAttr]});
        if (sizeAttr === 'Conc') {
            size = d3.scale.log();
        } else{
            size = d3.scale.linear();
        };
        size.domain(sizeExtent)
            .range([1,4])
            .nice();

        // get uniq_categories for shapes
        var uniq_categories = _.uniq(_.map(graph.nodes, function(d){ return d[shapeAttr]}));

        shape = d3.scale.ordinal()
            .domain(uniq_categories)
            .range(d3.svg.symbolTypes);

        shapeL = d3.scale.ordinal() // used just for d3.legend
            .domain(uniq_categories)
            .range(_.map(d3.svg.symbolTypes, function(t) { return d3.svg.symbol().type(t)(); }));

        // get uniq_categories for colors
        if (colorAttrContinuous.indexOf(colorAttr) !== -1){ // color by continuous variable
            var colorExtent = d3.extent(graph.nodes, function(d) { return d[colorAttr]; });
            // console.log("colorExtent:")
            // console.log(colorExtent)
            var min_score = colorExtent[0],
                max_score = colorExtent[1];
            if (min_score * max_score < 0) { // min_score < 0 ; max_score > 0
                var center_score = 0;
            } else{
                var center_score = (min_score+max_score)/2;
            };
            color = d3.scale.pow()
                .domain([min_score, center_score, max_score])
                .range(["#1f77b4", "#ddd", "#d62728"]);
            legendColor = d3.legend.color()
                .title(colorAttr)
                .shapeWidth(20)
                .cells(5)
                .labelFormat(d3.format(".2f"))
                .scale(color);
        } else{ // color by categorical variable
            var uniq_categories2 = _.uniq(_.map(graph.nodes, function(d){ return d[colorAttr]}));
            var range20 = [];
            for (var i = 0; i != 20; ++i) range20.push(i)
            var colors20 = d3.scale.category20()
            color = d3.scale.ordinal()
                .domain(uniq_categories2)
                .range(_.map(range20, function(i){ return colors20(i); }))
            legendColor = d3.legend.color()
                .title(colorAttr)
                .shape("path", d3.svg.symbol().type("circle").size(30)())
                .shapePadding(10)
                .scale(color);
        }

    };

    function drawLegends (shapeAttr, colorAttr, sizeAttr) {
        // Draw and/or update legends
        // shape legend
        var legendShape = d3.legend.symbol()
            .scale(shapeL)
            .orient("vertical")
            .title(convertName(shapeAttr))
        svg.select("#legendShape").html("")
            .call(legendShape);
        // size legend
        var legendSize = d3.legend.size()
            .scale(size)
            .title(convertName(sizeAttr))
            .cells(3)
            .shape('circle')
            .shapePadding(25)
            .labelOffset(15)
            .orient('horizontal');
        svg.select("#legendSize").html("")
            .call(legendSize);
        // color legend
        legendColor.scale(color)
            .title(convertName(colorAttr));
        svg.select("#legendColor").html("")
            .call(legendColor);

        // add subtitle if coloring by Enrichment score
        d3.select("#legendColor").append('text')
            .attr("transform", "translate(0,15)")
            .text(function(){
                var colorLegendTitle = d3.select("#colorAttr").property("value");
                if (colorLegendTitle === 'Enrichment score') {
                    return 'positive: mimic; negative: reverse'
                } else { return ''; }
            })
            .style('font-size', 12)
        // update legend text
        d3.selectAll("text.label").each(function(d, i){
            if (typeof d === "string") d3.select(this).text(convertName(d));
        });
    };

    function redraw(shapeAttr, colorAttr, sizeAttr) {
        // 1. update scales
        setUpScales(shapeAttr, colorAttr, sizeAttr);

        // 2. update the node circles
        circle.style("fill", function(d) {
            return color(d[colorAttr]);
        });

        // 3. update the legends
        drawLegends(shapeAttr, colorAttr, sizeAttr);
        // 4. update zoom
        zoom.on("zoom", zoomed);
        svg.call(zoom);
    };

    function resize() {
        var width = $page.width(),
            height = $page.height();
        svg.attr("width", width).attr("height", height);
        w = width;
        h = height;
    };

    highlightNodes(topSigIds, bottomSigIds);

    function highlightNodes(topSigIds, bottomSigIds) {
        // Highlight two array of nodes based on their id
        sigIds = topSigIds.concat(bottomSigIds);
        circle.style("stroke", function(d){
            if (sigIds.indexOf(d.id) !== -1) { return "black"; }
            else{ return "none" };
        });

        text.attr("display", function(d){
            if (sigIds.indexOf(d.id) !== -1) { // is in sigIds
                return "default";
            } else{
                var currentDisplay = d3.select(this).attr("display");
                return currentDisplay;
            };
        }).style("font-size", function(d){
            if (sigIds.indexOf(d.id) !== -1) { return "10px"; }
            else{ return nominal_text_size+"px"; }
        }).style("fill", function(d){
            if (topSigIds.indexOf(d.id) !== -1) { return "red"; }
            if (bottomSigIds.indexOf(d.id) !== -1) { return "blue"; }
        });

        d3.selectAll(".highlight").remove();
        // add highlight circles
        node.each(function(d){
            if (sigIds.indexOf(d.id) !== -1) {
                d3.select(this).append("circle")
                    .attr("class", "highlight")
                    .attr("r", 10)
            }
        });
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
        // highlight nodes
        highlightNodes(topSigIds, bottomSigIds);

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
    }
}
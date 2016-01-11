// scripts for the input page
$("#example1").click(function(e){
	e.preventDefault();
	d3.json("test/ebovs_crispy_old.json", function(data){
		data = data['ebov30min'];
		$("[name=upGenes]").text(data['up'].join('\n'));
		$("[name=dnGenes]").text(data['dn'].join('\n'));
	})

})

function fillSignature(data){
	// fill signature data to the textarea
	var signatureTextarea = $("[name=signature]");
	var signatureStr = '';
	signatureTextarea.text(signatureStr);
	for (var i = 0; i < data['vals'].length; i++) {
		var val = data['vals'][i]
		var gene = data['genes'][i]
		signatureStr += gene + ',' + val + '\n';
	};
	signatureTextarea.text(signatureStr);
};

$("#example2").click(function(e){
	e.preventDefault();
	d3.json("test/ebovs.json", function(data){
		data = data['ebov30min'];
		fillSignature(data);
	});
})


$.getJSON('/LJP/ccle', function(meta){
	var select = $("#ccle").selectize({
		options: meta.options,
		optgroups: meta.optgroups,
		labelField: 'cell',
		valueField: 'cell',
		optgroupField: 'tissue',
		optgroupLabelField: 'name',
		optgroupValueField: 'id',
		optgroupOrder: meta.optgroups.map(function(d) { return d.id; }),
		searchField: ['cell', 'tissue'],
		// plugins: ['optgroup_columns']
		onChange: function(cell){ // cell line selected
			console.log(cell)
			$.getJSON('/LJP/ccle?cell='+cell, function(data){
				fillSignature(data);
			});
		},
	}); 
});

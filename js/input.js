// scripts for the input page
// console.log(config)

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


$.getJSON(config['ENTER_POINT']+'/ccle', function(meta){
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
			$.getJSON(config['ENTER_POINT'] + '/ccle?cell='+cell, function(data){
				fillSignature(data);
			});
		},
	}); 
});


$.getJSON(config['ENTER_POINT']+'/diseases', function(meta){
	var select = $("#disease").selectize({
		options: meta.options,
		// optgroups: meta.optgroups,
		labelField: 'term',
		valueField: 'term',
		searchField: ['term'],

		onChange: function(disease){ // disease selected
			console.log(disease)
			$.getJSON(config['ENTER_POINT'] + '/diseases?disease='+disease, function(data){
				fillSignature(data);
			});
		},

		// render: function(){
		// 	item: function(item, escape){
		// 		return '<div>' +
  //               (item.term ? '<span class="name">' + escape(item.term) + '</span>' : '') +
  //               (item.desc ? '<span class="desc">' + escape(item.desc) + '</span>' : '') +
  //           '</div>';
		// 	},
		// 	option: function(item, excape)
		// },
	}); 
});



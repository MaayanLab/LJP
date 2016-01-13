var Router = Backbone.Router.extend({
	
	el: "#page-content", // selector to load page content

	routes: {
		'': 'view',
		'search': 'search',
		'result/:id': 'result',
		'annotation': 'annotation'
	},

	view: function(){
		$(this.el).load("view.html");
	},

	search: function(){
		$(this.el).load("search.html", function() {

		});
	},

	result: function(id){
		$(this.el).load("result.html", function() {
			// console.log(id)
		});
	},

	annotation: function(){
		$(this.el).load("annotation.html");
	}

});

var appRouter = new Router();
Backbone.history.start(); 

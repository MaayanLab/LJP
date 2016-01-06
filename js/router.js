var Router = Backbone.Router.extend({
	
	el: "#page-content", // selector to load page content

	routes: {
		'': 'home',
		'result/:id': 'result'
	},

	home: function(){
		$(this.el).load("home.html", function() {

		});
	},

	result: function(id){
		$(this.el).load("result.html", function() {
			// console.log(id)
		});
	},

});

var appRouter = new Router();
Backbone.history.start(); 

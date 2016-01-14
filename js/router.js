var removeActive = function(){
	$("ul.navbar-nav").children().each(function() {
		$(this).removeClass('active');
	});
};

var Router = Backbone.Router.extend({
	
	el: "#page-content", // selector to load page content

	routes: {
		'': 'view',
		'search': 'search',
		'result/:id': 'result',
		'annotation': 'annotation'
	},

	view: function(){
		$(this.el).load("view.html", function(){
			removeActive();
			$("#view").addClass("active");
		});
	},

	search: function(){
		$(this.el).load("search.html", function() {
			removeActive();
			$("#search").addClass("active");
		});
	},

	result: function(id){
		$(this.el).load("result.html", function() {
			// console.log(id)
			removeActive();
		});
	},

	annotation: function(){
		$(this.el).load("annotation.html", function(){
			removeActive();
			$("#annotation").addClass("active");
		});
	}

});

var appRouter = new Router();
Backbone.history.start(); 

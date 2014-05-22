(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module with d3 as a dependency.
		define(["jquery", "d3", "d3/tip"], factory)
	} else {
		// Browser global.
		root.jnj_chart = factory(root.$, root.d3)
	}
}(this, function (jQuery, d3) {
	var chart = {
		version: "0.0.1"
	};
	var $ = jQuery;
	var d3 = d3;

	chart.util = chart.util || {};
	chart.util.wrap = function (text, width) {
		text.each(function () {
			var text = d3.select(this),
				words = text.text().split(/\s+/).reverse(),
				word,
				line = [],
				lineNumber = 0,
				lineHeight = 1.1, // ems
				y = text.attr("y"),
				dy = parseFloat(text.attr("dy")),
				tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
			while (word = words.pop()) {
				line.push(word);
				tspan.text(line.join(" "));
				if (tspan.node().getComputedTextLength() > width) {
					line.pop();
					tspan.text(line.join(" "));
					line = [word];
					tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
				}
			}
		});
	}

	chart.donut = function () {

		this.render = function (data, target, w, h, options) {

			var defaults = {
				colors: d3.scale.category10(),
				margin: {
					top: 5,
					right: 75,
					bottom: 5,
					left: 10
				}
			};

			var options = $.extend({}, defaults, options);

			var width = w - options.margin.left - options.margin.right,
				or = width / 2,
				ir = width / 6;

			var total = 0;
			data.forEach(function (d) {
				total += +d.value;
			});

			var chart = d3.select(target)
				.append("svg:svg")
				.data([data])
				.attr("width", w)
				.attr("height", h)
				.attr("viewBox", "0 0 " + w + " " + h);

			var vis = chart.append("g")
				.attr("transform", "translate(" + or + "," + or + ")");

			var legend = chart.append("g")
				.attr("transform", "translate(" + (w - options.margin.right) + ",0)")
				.attr("class", "legend");

			var arc = d3.svg.arc()
				.innerRadius(ir)
				.outerRadius(or);

			var pie = d3.layout.pie() //this will create arc data for us given a list of values
				.value(function (d) {
					return d.value > 0 ? Math.max(d.value, total * .015) : 0; // we want slices to appear if they have data, so we return a minimum of 1.5% of the overall total if the datapoint has a value > 0.
				}); //we must tell it out to access the value of each element in our data array

			var arcs = vis.selectAll("g.slice") //this selects all <g> elements with class slice (there aren't any yet)
				.data(pie) //associate the generated pie data (an array of arcs, each having startAngle, endAngle and value properties)
				.enter() //this will create <g> elements for every "extra" data element that should be associated with a selection. The result is creating a <g> for every object in the data array
				.append("svg:g") //create a group to hold each slice (we will have a <path> and a <text> element associated with each slice)
				.attr("class", "slice"); //allow us to style things in the slices (like text)

			arcs.append("svg:path")
				.attr("fill", function (d) {
					return options.colors(d.data.id);
				}) //set the color for each slice to be chosen from the color function defined above
			.attr("stroke", "#fff")
				.attr("stroke-width", 2)
				.attr("title", function (d) {
					return d.label;
				})
				.attr("d", arc); //this creates the actual SVG path using the associated data (pie) with the arc drawing function

			legend.selectAll('rect')
				.data(function (d) {
					return d;
				})
				.enter()
				.append("rect")
				.attr("x", 0)
				.attr("y", function (d, i) {
					return i * 15;
				})
				.attr("width", 10)
				.attr("height", 10)
				.style("fill", function (d) {
					return options.colors(d.id);
				});

			legend.selectAll('text')
				.data(function (d) {
					return d;
				})
				.enter()
				.append("text")
				.attr("x", 12)
				.attr("y", function (d, i) {
					return (i * 15) + 9;
				})
				.text(function (d) {
					return d.label;
				});

			$(window).on("resize", {
					container: $(target),
					chart: $(target + " svg"),
					aspect: w / h
				},
				function (event) {
					var targetWidth = event.data.container.width();
					event.data.chart.attr("width", targetWidth);
					event.data.chart.attr("height", Math.round(targetWidth / event.data.aspect));
				}).trigger("resize");
		}
	}

	chart.histogram = function () {
		var self = this;
		self.xScale = {}; // shared xScale for histogram and boxplot

		self.drawBoxplot = function (g, data, width, height) {
			var boxplot = g,
				x = self.xScale,
				whiskerHeight = height / 2;

			if (data.LIF != data.q1) // draw whisker
			{
				boxplot.append("line")
					.attr("class", "bar")
					.attr("x1", x(data.LIF))
					.attr("y1", (height / 2) - (whiskerHeight / 2))
					.attr("x2", x(data.LIF))
					.attr("y2", (height / 2) + (whiskerHeight / 2));
				
				boxplot.append("line")
					.attr("class", "whisker")
					.attr("x1", x(data.LIF))
					.attr("y1", height / 2)
					.attr("x2", x(data.q1))
					.attr("y2", height / 2)
			}

			boxplot.append("rect")
				.attr("class", "box")
				.attr("x", x(data.q1))
				.attr("width", x(data.q3) - x(data.q1))
				.attr("height", height);

			boxplot.append("line")
				.attr("class", "median")
				.attr("x1", x(data.median))
				.attr("y1", 0)
				.attr("x2", x(data.median))
				.attr("y2", height);

			if (data.UIF != data.q3) // draw whisker
			{
				boxplot.append("line")
					.attr("class", "bar")
					.attr("x1", x(data.UIF))
					.attr("y1", (height / 2) - (whiskerHeight / 2))
					.attr("x2", x(data.UIF))
					.attr("y2", (height / 2) + (whiskerHeight / 2));
				
				boxplot.append("line")
					.attr("class", "whisker")
					.attr("x1", x(data.q3))
					.attr("y1", height / 2)
					.attr("x2", x(data.UIF))
					.attr("y2", height / 2)
			}
		}

		self.render = function (data, target, w, h, options) {
			var defaults = {
				margin: {
					top: 10,
					right: 10,
					bottom: 10,
					left: 40
				},
				xFormat: d3.format(',.0f'),
				yFormat: d3.format('s'),
				tickPadding: 10
			};

			var options = $.extend({}, defaults, options);

			// alocate the SVG container, only creating it if it doesn't exist using the selector
			var chart;
			var isNew = false; // this is a flag to determine if chart has already been ploted on this target.
			if (!$(target + " svg")[0]) {
				chart = d3.select(target).append("svg")
					.attr("width", w)
					.attr("height", h)
					.attr("viewBox", "0 0 " + w + " " + h);
				isNew = true;
			} else {
				chart = d3.select(target + " svg");
			}

			// apply labels (if specified) and offset margins accordingly
			if (options.xLabel) {
				var xAxisLabel = chart.append("g")
					.attr("transform", "translate(" + w / 2 + "," + (h - options.margin.bottom) + ")")

				xAxisLabel.append("text")
					.style("text-anchor", "middle")
					.text(options.xLabel);

				var bbox = xAxisLabel.node().getBBox();
				options.margin.bottom += bbox.height + 10;
			}

			if (options.yLabel) {
				var yAxisLabel = chart.append("g")
					.attr("transform", "translate(0," + (((h - options.margin.bottom - options.margin.top) / 2) + options.margin.top) + ")");
				yAxisLabel.append("text")
					.attr("transform", "rotate(-90)")
					.attr("y", 0)
					.attr("x", 0)
					.attr("dy", "1em")
					.style("text-anchor", "middle")
					.text(options.yLabel);

				var bbox = yAxisLabel.node().getBBox();
				options.margin.left += bbox.width;
			}


			// we can calculate width now since the Y labels have been accounted for.
			// height is calculated after we determine if the boxplot is rendered
			var width = w - options.margin.left - options.margin.right;


			var x = self.xScale = d3.scale.linear()
				.domain([d3.min(data, function (d) {
					return d.x;
				}), d3.max(data, function (d) {
					return d.x + d.dx;
				})])
				.range([0, width]);

			if (options.boxplot) {
				var boxplotG = chart.append("g")
					.attr("class", "boxplot")
					.attr("transform", "translate(" + options.margin.left + "," + (h - options.margin.bottom) + ")");

				self.drawBoxplot(boxplotG, options.boxplot, width, 10);
				options.margin.bottom += 10; // boxplot takes up 10 vertical space
			}

			// determine hieght of histogram
			var height = h - options.margin.top - options.margin.bottom - options.tickPadding;

			// this function asusmes data has been transfomred into a d3.layout.histogram structure

			var y = d3.scale.linear()
				.domain([0, d3.max(data, function (d) {
					return d.y;
				})])
				.range([height, 0]);

			var xAxis = d3.svg.axis()
				.scale(x)
				.orient("bottom")
				.ticks(10)
				.tickFormat(options.xFormat);

			var yAxis = d3.svg.axis()
				.scale(y)
				.orient("left")
				.ticks(4)
				.tickFormat(options.yFormat);

			var hist = chart.append("g")
				.attr("transform", "translate(" + options.margin.left + "," + options.margin.top + ")");

			var bar = hist.selectAll(".bar")
				.data(data)
				.enter().append("g")
				.attr("class", "bar")
				.attr("transform", function (d) {
					return "translate(" + x(d.x) + "," + y(d.y) + ")";
				});

			bar.append("rect")
				.attr("x", 1)
				.attr("width", function (d) {
					return x(d.x + d.dx) - x(d.x) - 1;
				})
				.attr("height", function (d) {
					return height - y(d.y);
				});

			if (isNew) {
				hist.append("g")
					.attr("class", "x axis")
					.attr("transform", "translate(0," + height + ")")
					.call(xAxis);

				hist.append("g")
					.attr("class", "y axis")
					.attr("transform", "translate(0," + 0 + ")")
					.call(yAxis);

				$(window).on("resize", {
						container: $(target),
						chart: $(target + " svg"),
						aspect: w / h
					},
					function (event) {
						var targetWidth = event.data.container.width();
						event.data.chart.attr("width", targetWidth);
						event.data.chart.attr("height", Math.round(targetWidth / event.data.aspect));
					}).trigger("resize");
			}
		}
	}


	chart.boxplot = function () {
		this.render = function (data, target, w, h, options) {
			var defaults = {
				margin: {
					top: 10,
					right: 10,
					bottom: 10,
					left: 10
				},
				yFormat: d3.format('s'),
				tickPadding: 15
			};

			var options = $.extend({}, defaults, options);

			var svg;
			if (!$(target + " svg")[0]) {
				svg = d3.select(target).append("svg")
					.attr("width", w)
					.attr("height", h)
					.attr("viewBox", "0 0 " + w + " " + h);
			} else {
				svg = d3.select(target + " svg");
			}

			// apply labels (if specified) and offset margins accordingly
			if (options.xLabel) {
				var xAxisLabel = svg.append("g")
					.attr("transform", "translate(" + w / 2 + "," + (h - 5) + ")")

				xAxisLabel.append("text")
					.style("text-anchor", "middle")
					.text(options.xLabel);

				var bbox = xAxisLabel.node().getBBox();
				options.margin.bottom += bbox.height + 5;
			}

			if (options.yLabel) {
				var yAxisLabel = svg.append("g")
					.attr("transform", "translate(0," + (((h - options.margin.bottom - options.margin.top) / 2) + options.margin.top) + ")");
				yAxisLabel.append("text")
					.attr("transform", "rotate(-90)")
					.attr("y", 0)
					.attr("x", 0)
					.attr("dy", "1em")
					.style("text-anchor", "middle")
					.text(options.yLabel);

				var bbox = yAxisLabel.node().getBBox();
				options.margin.left += bbox.width + 5;
			}

			options.margin.left += options.tickPadding;
			options.margin.bottom += options.tickPadding;

			var width = w - options.margin.left - options.margin.right;
			var height = h - options.margin.top - options.margin.bottom;

			var x = d3.scale.ordinal()
				.rangeRoundBands([0, width], (1.0 / data.length))
				.domain(data.map(function (d) {
					return d.Category;
				}));

			var y = d3.scale.linear()
				.range([height, 0])
				.domain([0, options.yMax || d3.max(data, function (d) {
					return d.max;
				})]);

			var boxWidth = 10;
			var boxOffset = (x.rangeBand()/2) - (boxWidth / 2);
			var whiskerWidth = boxWidth / 2;
			var whiskerOffset = (x.rangeBand()/2) - (whiskerWidth / 2);

			var chart = svg.append("g")
				.attr("transform", "translate(" + options.margin.left + "," + options.margin.top + ")");

			// draw main box and whisker plots
			var boxplots = chart.selectAll(".boxplot")
				.data(data)
				.enter().append("g")
				.attr("class", "boxplot")
				.attr("transform", function (d) {
					return "translate(" + x(d.Category) + ",0)";
				});

			// for each g element (containing the boxplot render surface), draw the whiskers, bars and rects
			boxplots.each(function (d, i) {
				var boxplot = d3.select(this);
				if (d.LIF != d.q1) // draw whisker
				{
					boxplot.append("line")
						.attr("class", "bar")
						.attr("x1", whiskerOffset)
						.attr("y1", y(d.LIF))
						.attr("x2", whiskerOffset + whiskerWidth)
						.attr("y2", y(d.LIF))
					boxplot.append("line")
						.attr("class", "whisker")
						.attr("x1", x.rangeBand() / 2)
						.attr("y1", y(d.LIF))
						.attr("x2", x.rangeBand() / 2)
						.attr("y2", y(d.q1))
				}

				boxplot.append("rect")
					.attr("class", "box")
					.attr("x", boxOffset)
					.attr("y", y(d.q3))
					.attr("width",  boxWidth)
					.attr("height", y(d.q1) - y(d.q3));

				boxplot.append("line")
					.attr("class", "median")
					.attr("x1", boxOffset)
					.attr("y1", y(d.median))
					.attr("x2", boxOffset + boxWidth)
					.attr("y2", y(d.median));

				if (d.UIF != d.q3) // draw whisker
				{
					boxplot.append("line")
						.attr("class", "bar")
						.attr("x1", whiskerOffset)
						.attr("y1", y(d.UIF))
						.attr("x2", x.rangeBand() - whiskerOffset)
						.attr("y2", y(d.UIF))
					boxplot.append("line")
						.attr("class", "whisker")
						.attr("x1", x.rangeBand() / 2)
						.attr("y1", y(d.UIF))
						.attr("x2", x.rangeBand() / 2)
						.attr("y2", y(d.q3))
				}
				// to do: add max/min indicators


			});

			// draw x and y axis
			var xAxis = d3.svg.axis()
				.scale(x)
				.orient("bottom");

			var yAxis = d3.svg.axis()
				.scale(y)
				.orient("left")
				.tickFormat(options.yFormat)
				.ticks(5);

			chart.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height + ")")
				.call(xAxis);

			chart.append("g")
				.attr("class", "y axis")
				.attr("transform", "translate(0," + 0 + ")")
				.call(yAxis);


			$(window).on("resize", {
					container: $(target),
					chart: $(target + " svg"),
					aspect: w / h
				},
				function (event) {
					var targetWidth = event.data.container.width();
					event.data.chart.attr("width", targetWidth);
					event.data.chart.attr("height", Math.round(targetWidth / event.data.aspect));
				}).trigger("resize");

		}
	}

	chart.barchart = function () {
		this.render = function (data, target, w, h, options) {
			var defaults = {
				label: 'label',
				value: 'value',
				rotate: 0,
				colors: d3.scale.category10(),
				textAnchor: 'middle',
				showLabels: false
			};

			var options = $.extend({}, defaults, options);

			var label = options.label;
			var value = options.value;


			var total = 0;
			for (d = 0; d < data.length; d++) {
				total = total + data[d][value];
			}

			var margin = {
					top: 20,
					right: 10,
					bottom: 25,
					left: 10
				},
				width = w - margin.left - margin.right,
				height = h - margin.top - margin.bottom;

			var commaseparated = d3.format(',');
			var formatpercent = d3.format('.1%');

			var x = d3.scale.ordinal()
				.rangeRoundBands([0, width], (1.0 / data.length));

			var y = d3.scale.linear()
				.range([height, 0]);

			var xAxis = d3.svg.axis()
				.scale(x)
				.tickSize(2, 0)
				.orient("bottom");

			var yAxis = d3.svg.axis()
				.scale(y)
				.orient("left");

			var svg = d3.select(target).append("svg")
				.attr("width", w)
				.attr("height", h)
				.attr("viewBox", "0 0 " + w + " " + h)
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
				.attr("class", "barchart");

			x.domain(data.map(function (d) {
				return d[label];
			}));
			y.domain([0, options.yMax || d3.max(data, function (d) {
				return d[value];
			})]);

			svg.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + (height + 1) + ")")
				.call(xAxis)
				.selectAll(".tick text")
				.style("text-anchor", options.textAnchor)
				.attr("transform", function (d) {
					return "rotate(" + options.rotate + ")"
				});

			if (options.wrap) {
				svg.selectAll(".tick text")
					.call(chart.util.wrap, x.rangeBand());
			}

			svg.selectAll(".bar")
				.data(data)
				.enter().append("rect")
				.attr("class", "bar")
				.attr("x", function (d) {
					return x(d[label]);
				})
				.attr("width", x.rangeBand())
				.attr("y", function (d) {
					return y(d[value]);
				})
				.attr("height", function (d) {
					return height - y(d[value]);
				})
				.attr("title", function (d) {
					temp_title = d[label] + ": " + commaseparated(d[value], ",")
					if (total > 0) {
						temp_title = temp_title + ' (' + formatpercent(d[value] / total) + ')';
					} else {
						temp_title = temp_title + ' (' + formatpercent(0) + ')';
					}
					return temp_title;
				})
				.style("fill", function (d) {
					return options.colors(d[label]);
				});

			if (options.showLabels) {
				svg.selectAll(".barlabel")
					.data(data)
					.enter()
					.append("text")
					.attr("class", "barlabel")
					.text(function (d) {
						return formatpercent(d[value] / total);
					})
					.attr("x", function (d) {
						return x(d[label]) + x.rangeBand() / 2;
					})
					.attr("y", function (d) {
						return y(d[value]) - 3;
					})
					.attr("text-anchor", "middle");
			}

			$(window).on("resize", {
					container: $(target),
					chart: $(target + " svg"),
					aspect: w / h
				},
				function (event) {
					var targetWidth = event.data.container.width();
					event.data.chart.attr("width", targetWidth);
					event.data.chart.attr("height", Math.round(targetWidth / event.data.aspect));
				}).trigger("resize");
		}
	}

	chart.areachart = function () {
		this.render = function (data, target, w, h, options) {
			var defaults = {
				margin: {
					top: 20,
					right: 30,
					bottom: 20,
					left: 40
				},
				xFormat: d3.format(',.0f'),
				yFormat: d3.format('s')
			};
			var options = $.extend({}, defaults, options);

			var width = w - options.margin.left - options.margin.right,
				height = h - options.margin.top - options.margin.bottom;

			var x = d3.scale.linear()
				.domain(d3.extent(data, function (d) {
					return d.x;
				}))
				.range([0, width]);

			var y = d3.scale.linear()
				.domain([0, d3.max(data, function (d) {
					return d.y;
				})])
				.range([height, 0]);

			var xAxis = d3.svg.axis()
				.scale(x)
				.tickFormat(options.xFormat)
				.ticks(10)
				.orient("bottom");

			var yAxis = d3.svg.axis()
				.scale(y)
				.tickFormat(options.yFormat)
				.ticks(4)
				.orient("left");

			var area = d3.svg.area()
				.x(function (d) {
					return x(d.x);
				})
				.y0(height)
				.y1(function (d) {
					return y(d.y);
				});

			var chart = d3.select(target)
				.append("svg:svg")
				.data(data)
				.attr("width", w)
				.attr("height", h)
				.attr("viewBox", "0 0 " + w + " " + h);

			var vis = chart.append("g")
				.attr("transform", "translate(" + options.margin.left + "," + options.margin.top + ")");

			vis.append("path")
				.datum(data)
				.attr("class", "area")
				.attr("d", area);

			vis.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height + ")")
				.call(xAxis);

			vis.append("g")
				.attr("class", "y axis")
				.call(yAxis)

			$(window).on("resize", {
					container: $(target),
					chart: $(target + " svg"),
					aspect: w / h
				},
				function (event) {
					var targetWidth = event.data.container.width();
					event.data.chart.attr("width", targetWidth);
					event.data.chart.attr("height", Math.round(targetWidth / event.data.aspect));
				}).trigger("resize");
		}
	}

	chart.line = function () {
		this.render = function (data, target, w, h, options) {
			var defaults = {
				margin: {
					top: 5,
					right: 5,
					bottom: 5,
					left: 40
				},
				xFormat: d3.format(',.0f'),
				yFormat: d3.format('s'),
				interpolate: "linear",
				xValue: "x",
				yValue: "y",
				cssClass: "lineplot",
				tickPadding: 10,
				showSeriesLabel: false,
				colorScale: null
			};
			var options = $.extend({}, defaults, options);

			// convert data to multi-series format if not already formatted
			if (!data[0].hasOwnProperty("values")) {
				// assumes data is just an array of values (single series)
				data = [
					{
						name: 'series',
						values: data
				}];
			}

			var chart = d3.select(target)
				.append("svg:svg")
				.data(data)
				.attr("width", w)
				.attr("height", h)
				.attr("viewBox", "0 0 " + w + " " + h);

			// apply labels (if specified) and offset margins accordingly
			if (options.xLabel) {
				var xAxisLabel = chart.append("g")
					.attr("transform", "translate(" + w / 2 + "," + (h - options.margin.bottom) + ")")

				xAxisLabel.append("text")
					.style("text-anchor", "middle")
					.text(options.xLabel);

				var bbox = xAxisLabel.node().getBBox();
				options.margin.bottom += bbox.height + 10;
			}

			if (options.yLabel) {
				var yAxisLabel = chart.append("g")
					.attr("transform", "translate(0," + (((h - options.margin.bottom - options.margin.top) / 2) + options.margin.top) + ")");
				yAxisLabel.append("text")
					.attr("transform", "rotate(-90)")
					.attr("y", 0)
					.attr("x", 0)
					.attr("dy", "1em")
					.style("text-anchor", "middle")
					.text(options.yLabel);

				var bbox = yAxisLabel.node().getBBox();
				options.margin.left += bbox.width;
			}

			var width = w - options.margin.left - options.margin.right;
			var height = h - options.margin.top - options.margin.bottom - options.tickPadding;

			var x = options.xScale || d3.scale.linear()
				.domain([d3.min(data, function (d) {
					return d3.min(d.values, function (d) {
						return d["xValue"];
					});
				}), d3.max(data, function (d) {
					return d3.max(d.values, function (d) {
						return d["xValue"];
					});
				})]);

			var xAxis = d3.svg.axis()
				.scale(x)
				.ticks(10)
				.orient("bottom");

			// check for custom tick formatter
			if (options.tickFormat) {
				xAxis.tickFormat(options.tickFormat);
			} else // apply standard formatter
			{
				xAxis.tickFormat(options.xFormat);
			}

			// if x scale is ordinal, then apply rangeRoundBands, else apply standard range.
			if (typeof x.rangePoints === 'function') {
				x.rangePoints([0, width]);
			} else {
				x.range([0, width]);

			}

			var y = options.yScale || d3.scale.linear()
				.domain([0, d3.max(data, function (d) {
					return d3.max(d.values, function (d) {
						return d["yValue"];
					});
				})])
				.range([height, 0]);

			var yAxis = d3.svg.axis()
				.scale(y)
				.tickFormat(options.yFormat)
				.ticks(4)
				.orient("left");

			// create a line function that can convert data[] into x and y points
			var line = d3.svg.line()
				.x(function (d) {
					return x(d["xValue"]);
				})
				.y(function (d) {
					return y(d["yValue"]);
				})
				.interpolate(options.interpolate);

			var vis = chart.append("g")
				.attr("class", options.cssClass)
				.attr("transform", "translate(" + options.margin.left + "," + options.margin.top + ")");

			var series = vis.selectAll(".series")
				.data(data)
				.enter()
				.append("g")

			var seriesLines = series.append("path")
				.attr("class", "line")
				.attr("d", function (d) {
					return line(d.values);
				});

			if (options.colorScale) {
				seriesLines.style("stroke", function (d) {
					return options.colorScale(d.name);
				})
			}

			if (options.showSeriesLabel) {
				series.append("text")
					.datum(function (d) {
						return {
							name: d.name,
							value: d.values[d.values.length - 1]
						};
					})
					.attr("transform", function (d) {
						return "translate(" + x(d.value["xValue"]) + "," + y(d.value["yValue"]) + ")";
					})
					.attr("x", 3)
					.attr("dy", 2)
					.style("font-size", "8px")
					.text(function (d) {
						return d.name;
					});
			}

			vis.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height + ")")
				.call(xAxis);

			vis.append("g")
				.attr("class", "y axis")
				.call(yAxis)

			$(window).on("resize", {
					container: $(target),
					chart: $(target + " svg"),
					aspect: w / h
				},
				function (event) {
					var targetWidth = event.data.container.width();
					event.data.chart.attr("width", targetWidth);
					event.data.chart.attr("height", Math.round(targetWidth / event.data.aspect));
				}).trigger("resize");
		}
	}

	chart.treemap = function () {
		var self = this;

		var root,
			node,
			nodes,
			treemap,
			svg,
			x,
			y,
			currentZoomNode;

		this.render = function (data, target, width, height, options) {
			root = data;
			x = d3.scale.linear().range([0, width]);
			y = d3.scale.linear().range([0, height]);

			treemap = d3.layout.treemap()
				.round(false)
				.size([width, height])
				.sticky(true)
				.value(function (d) {
					return options.getsizevalue(d);
				});

			svg = d3.select(target)
				.append("svg:svg")
				.attr("width", width)
				.attr("height", height)
				.append("svg:g");

			nodes = treemap.nodes(data)
				.filter(function (d) {
					return options.getsizevalue(d);
				});

			color_range = d3.extent(nodes, function (d) {
				return options.getcolorvalue(d);
			});

			var color = d3.scale.linear()
				.domain([color_range[0], color_range[1]])
				.range(["blue", "red"]);

			var tip = d3.tip()
				.attr('class', 'd3-tip')
				.offset([-10, 0])
				.html(function (d) {
					return options.gettitle(d);
				})
			svg.call(tip);

			var cell = svg.selectAll("g")
				.data(nodes)
				.enter().append("svg:g")
				.attr("class", "cell")
				.attr("transform", function (d) {
					return "translate(" + d.x + "," + d.y + ")";
				});

			cell.append("svg:rect")
				.attr("width", function (d) {
					return Math.max(0, d.dx - 1);
				})
				.attr("height", function (d) {
					return Math.max(0, d.dy - 1);
				})
				.attr("title", function (d) {
					return options.gettitle(d);
				})
				.attr("id", function (d) {
					return d.id;
				})
				.style("fill", function (d) {
					return color(d.records_per_person);
				})
				.on('mouseover', tip.show)
				.on('mouseout', tip.hide)
				.on('click', function (d) {
					options.onclick(d);
				});
		}
	}

	return chart;
}));

		(function () {
			define(["jquery", "d3", "jnj/chart", "datatables"], function ($, d3, jnj_chart) {
				var condition_occurrence = {};
				var threshold;

				// bind to all matching elements upon creation
				$(document).on('click', '#condition_table tr', function () {
					id = $($(this).children()[0]).text();
					concept_name = $($(this).children()[5]).text();
					condition_occurrence.drilldown(id, concept_name);
				});

				$('#myTab a').click(function (e) {
					e.preventDefault()
					$(this).tab('show')
				})

				condition_occurrence.drilldown = function (concept_id, concept_name) {
					$('.drilldown svg').remove();
					$('#conditionDrilldownTitle').text(concept_name);
					$('#reportConditionOccurrencesDrilldown').removeClass('hidden');

					$.ajax({
						type: "GET",
						url: 'data/' + datasource_folder + '/conditions/condition_' + concept_id + '.json',
						success: function (data) {
							// age at first diagnosis visualization
							var boxplot = new jnj_chart.boxplot();
							bpseries = [];
							bpdata = data.AgeAtFirstDiagnosis;
							for (i = 0; i < bpdata.Category.length; i++) {
								bpseries.push({
									Category: bpdata.Category[i],
									max: bpdata.MaxValue[i],
									median: bpdata.MedianValue[i],
									LIF: bpdata.P10Value[i],
									q1: bpdata.P25Value[i],
									q3: bpdata.P75Value[i],
									UIF: bpdata.P90Value[i]
								});
							}
							boxplot.render(bpseries, "#ageAtFirstDiagnosis", 500, 500, {
								xLabel: 'Gender',
								yLabel: 'Age at First Diagnosis'
							});

							// condition type visualization
							var donut = new jnj_chart.donut();
							slices = [];

							for (i = 0; i < data.ConditionsByType.ConceptName.length; i++) {
								slices.push({
									id: data.ConditionsByType.ConceptName[i],
									label: data.ConditionsByType.ConceptName[i],
									value: data.ConditionsByType.CountValue[i]
								})
							}

							slices.sort(function (a, b) {
								var nameA = a.label.toLowerCase(),
									nameB = b.label.toLowerCase()
								if (nameA < nameB) //sort string ascending
									return -1
								if (nameA > nameB)
									return 1
								return 0 //default return value (no sorting)
							});

							donut.render(slices, "#conditionsByType", 400, 400, {
								margin: {
									top: 5,
									left: 5,
									right: 200,
									bottom: 5
								}
							});

							// render trellis
							trellisData = data.PrevalenceByGenderAgeYear;

							var allDeciles = ["00-09", "10-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70-79", "80-89", "90-99"];
							var allSeries = ["MALE", "FEMALE"];
							var minYear = d3.min(trellisData.XCalendarYear),
								maxYear = d3.max(trellisData.XCalendarYear);

							var seriesInitializer = function (tName, sName, x, y) {
								return {
									TrellisName: tName,
									SeriesName: sName,
									XCalendarYear: x,
									YPrevalence1000PP: y
								};
							}

							var nestByDecile = d3.nest()
								.key(function (d) {
									return d.TrellisName;
								})
								.key(function (d) {
									return d.SeriesName;
								})
								.sortValues(function (a, b) {
									return a.XCalendarYear - b.XCalendarYear;
								});

							// map data into chartable form
							var normalizedSeries = trellisData.TrellisName.map(function (d, i) {
								var item = {};
								var container = this;
								d3.keys(container).forEach(function (p) {
									item[p] = container[p][i];
								});
								return item;
							}, trellisData);

							var dataByDecile = nestByDecile.entries(normalizedSeries);
							// fill in gaps
							var yearRange = d3.range(minYear, maxYear, 1);

							dataByDecile.forEach(function (trellis) {
								trellis.values.forEach(function (series) {
									series.values = yearRange.map(function (year) {
										yearData = series.values.filter(function (f) {
											return f.XCalendarYear == year;
										})[0] || seriesInitializer(trellis.key, series.key, year, 0);
										yearData.date = new Date(year, 0, 1);
										return yearData;
									})
								})
							});

							// create svg with range bands based on the trellis names
							var chart = new jnj_chart.trellisline();
							chart.render(dataByDecile, "#trellisLinePlot", 1000, 300, {
								trellisSet: allDeciles,
								xFormat: d3.time.format("%Y"),
								yFormat: d3.format("0.3f")
							});
						}
					});
				}

				condition_occurrence.render = function (folder) {
					format_pct = d3.format('.2%');
					format_fixed = d3.format('.2f');
					format_comma = d3.format(',');

					$('#reportConditionOccurrences svg').remove();

					width = 1000;
					height = 250;
					minimum_area = 50;
					threshold = minimum_area / (width * height);

					$.ajax({
						type: "GET",
						url: 'data/' + folder + '/condition_treemap.json',
						contentType: "application/json; charset=utf-8",
						success: function (data) {
							table_data = data.ConceptPath.map(function (d, i) {
								conceptDetails = this.ConceptPath[i].split('-');
								return {
									concept_id: this.concept_id[i],
									soc: conceptDetails[0],
									hlgt: conceptDetails[1],
									hlt: conceptDetails[2],
									pt: conceptDetails[3],
									snomed: conceptDetails[4],
									num_persons: format_comma(this.num_persons[i]),
									pct_persons: format_pct(this.pct_persons[i]),
									records_per_person: format_fixed(this.records_per_person[i])
								}
							}, data);

							$('#condition_table').dataTable({
								data: table_data,
								columns: [
									{
										data: 'concept_id'
									},
									{
										data: 'soc'
									},
									{
										data: 'hlgt'
									},
									{
										data: 'hlt'
									},
									{
										data: 'pt'
									},
									{
										data: 'snomed'
									},
									{
										data: 'num_persons',
										className: 'numeric'
									},
									{
										data: 'pct_persons',
										className: 'numeric'
									},
									{
										data: 'records_per_person',
										className: 'numeric'
									}
								],
								pageLength: 5,
								lengthChange: false,
								deferRender: true,
								destroy: true
							});

							$('#reportConditionOccurrences').show();

							tree = buildHierarchyFromJSON(data, threshold);
							var treemap = new jnj_chart.treemap();
							treemap.render(tree, '#treemap_container', width, height, {
								onclick: function (node) {
									condition_occurrence.drilldown(node.id, node.name)
								},
								getsizevalue: function (node) {
									return node.num_persons;
								},
								getcolorvalue: function (node) {
									return node.records_per_person;
								},
								gettitle: function (node) {
									title = '';
									steps = node.path.split('-');
									for (i = 0; i < steps.length; i++) {
										if (i == steps.length - 1) {
											title += '<hr class="path">';
											title += '<div class="pathleaf">' + steps[i] + '</div>';
											title += '<div class="pathleafstat">Prevalence: ' + format_pct(node.pct_persons) + '</div>';
											title += '<div class="pathleafstat">Number of People: ' + format_comma(node.num_persons) + '</div>';
											title += '<div class="pathleafstat">Records per Person: ' + format_fixed(node.records_per_person) + '</div>';
										} else {
											title += ' <div class="pathstep">' + Array(i + 1).join('&nbsp;&nbsp') + steps[i] + ' </div>';
										}
									}
									return title;
								}
							});
						}

					});
				}

				function buildHierarchyFromJSON(data, threshold) {
					var total = 0;

					var root = {
						"name": "root",
						"children": []
					};

					for (i = 0; i < data.pct_persons.length; i++) {
						total += data.pct_persons[i];
					}

					for (var i = 0; i < data.ConceptPath.length; i++) {
						var parts = data.ConceptPath[i].split("-");
						var currentNode = root;
						for (var j = 0; j < parts.length; j++) {
							var children = currentNode["children"];
							var nodeName = parts[j];
							var childNode;
							if (j + 1 < parts.length) {
								// Not yet at the end of the path; move down the tree.
								var foundChild = false;
								for (var k = 0; k < children.length; k++) {
									if (children[k]["name"] == nodeName) {
										childNode = children[k];
										foundChild = true;
										break;
									}
								}
								// If we don't already have a child node for this branch, create it.
								if (!foundChild) {
									childNode = {
										"name": nodeName,
										"children": []
									};
									children.push(childNode);
								}
								currentNode = childNode;
							} else {
								// Reached the end of the path; create a leaf node.
								childNode = {
									"name": nodeName,
									"num_persons": data.num_persons[i],
									"id": data.concept_id[i],
									"path": data.ConceptPath[i],
									"pct_persons": data.pct_persons[i],
									"records_per_person": data.records_per_person[i]
								};

								// we only include nodes with sufficient size in the treemap display
								// sufficient size is configurable in the calculation of threshold
								// which is a function of the number of pixels in the treemap display
								if ((data.pct_persons[i] / total) > threshold) {
									children.push(childNode);
								}
							}
						}
					}
					return root;
				};
				return condition_occurrence;
			});
		})();

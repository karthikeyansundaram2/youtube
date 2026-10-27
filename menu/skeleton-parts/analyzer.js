/*--------------------------------------------------------------
>>> ANALYZER
--------------------------------------------------------------*/

extension.skeleton.main.layers.section.analyzer = {
	component: 'button',
	variant: 'analyzer',
	category: true,
	on: {
		click: {
			analyzer_activation: {
				component: 'switch',
				variant: 'activation',
				text: 'activate'
			},
			chartSection: {
				component: 'section',
				variant: 'card',
				title: 'watchTime',

				chart: {
					component: 'chart',
					type: 'bar',
					labels: function () {
						var labels = [];

						for (var i = 0; i < 4; i++) {
							var hour = i * 6;

							if (satus.storage.get('use_24_hour_format') === false) {
								if (hour === 0) {
									hour = 12;
								}

								if (hour > 12) {
									hour = hour - 12 + 'P';
								} else {
									hour += 'A';
								}
							} else {
								if (hour < 10) {
									hour = '0' + hour;
								}
							}

							labels.push(String(hour));
						}

						return labels;
					},
					datasets: function () {
						var analyzer = satus.storage.get('analyzer'),
							datasets = [],
							channel_counter = {},
							max = 3600;

						if (satus.isObject(analyzer)) {
							var hours = analyzer[ /*new Date().toDateString()*/ 'Sun May 29 2022'];

							if (satus.isObject(hours)) {
								for (var hour in hours) {
									var channels = hours[hour],
										max2 = 0;

									if (satus.isObject(channels)) {
										for (var name in channels) {
											var seconds = channels[name];

											if (satus.isNumber(seconds)) {
												if (!satus.isObject(channel_counter[name])) {
													channel_counter[name] = {
														label: name,
														data: []
													};

													for (var i = 0; i < 24; i++) {
														channel_counter[name].data.push(0);
													}
												}

												channel_counter[name].data[hour] = seconds;

												max2 += seconds;
											}
										}
									}

									if (max2 > max) {
										max = max2;
									}
								}
							}
						}

						for (var i = 0, k = Object.keys(channel_counter), l = k.length; i < l; i++) {
							var channel = channel_counter[k[i]];

							channel.color = satus.color.hslToRgb([360 / l * i, 100, 40]);

							for (var j = 0, m = channel.data.length; j < m; j++) {
								channel.data[j] = channel.data[j] / (max / 100);

								if (channel.data[j] < 1) {
									channel.data[j] = 0;
								}
							}

							datasets.push(channel);
						}

						return datasets;
					}
				}
			},
			mostViewedChannelsSection: {
				component: 'section',
				variant: 'card',
				title: 'mostViewedChannels',
				on: {
					render: function () {
						var analyzer = satus.storage.get('analyzer'),
							array = [],
							object = {};

						if (satus.isObject(analyzer)) {
							for (var key in analyzer) {
								var date = analyzer[key];

								if (satus.isObject(date)) {
									for (var hour in date) {
										var channels = date[hour];

										if (satus.isObject(channels)) {
											for (var name in channels) {
												var data = channels[name];

												if (satus.isNumber(data)) {
													if (!satus.isObject(object[name])) {
														object[name] = 0;
													}

													object[name] += data;
												}
											}
										}
									}
								}
							}
						}

						for (var key in object) {
							var hours = 0,
								minutes = 0,
								seconds = object[key];

							hours = Math.floor(seconds / 60 / 60);
							minutes = Math.floor(seconds / 60) % 60;
							seconds = Math.floor(seconds - minutes * 60);

							if (hours < 10) {
								hours = '0' + hours;
							}

							if (minutes < 10) {
								minutes = '0' + minutes;
							}

							if (seconds < 10) {
								seconds = '0' + seconds;
							}

							array.push([
								key,
								hours + ':' + minutes + ':' + seconds
							]);
						}

						if (array.length > 0) {
							satus.render({
								component: 'list',
								items: satus.sort(array, 'desc', 1).slice(0, 8)
							}, this);
						} else {
							satus.render({
								component: 'span',
								text: 'empty'
							}, this);
						}
					}
				}
			},
			transcriptArchiveSection: {
				component: 'section',
				variant: 'card',
				title: 'transcriptArchive',

				transcript_archive_enabled: {
					component: 'switch',
					text: 'archiveTranscriptsOfWatchedVideos',
					value: false
				},
				transcript_archive_search: {
					component: 'text-field',
					storage: false,
					placeholder: 'searchTranscripts',
					lineNumbers: false,
					rows: 1,
					on: {
						input: function () {
							var query = this.value.trim().toLowerCase(),
								container = this.parentNode.querySelector('.it-transcript-archive-results');

							if (!container) {
								container = document.createElement('div');
								container.className = 'it-transcript-archive-results';
								this.after(container);
							}

							container.replaceChildren();

							if (query.length < 2) { return; }

							var archive = satus.storage.get('transcript_archive'),
								watched = satus.storage.get('watched_segments') || {},
								results = [];

							if (!satus.isObject(archive)) { archive = {}; }

							for (var id in archive) {
								var entry = archive[id],
									played = watched[id] && Array.isArray(watched[id].s) ? watched[id].s : [];

								if (!satus.isObject(entry) || !Array.isArray(entry.s)) { continue; }

								for (var i = 0, l = entry.s.length; i < l; i++) {
									var start = entry.s[i][0],
										text = String(entry.s[i][1]);

									if (text.toLowerCase().indexOf(query) === -1) { continue; }

									// Personal ranking: lines inside parts that were actually played come first, then recently watched videos.
									results.push({
										id: id,
										title: entry.t || id,
										start: start,
										text: text,
										played: played.some(function (part) { return start >= part[0] && start <= part[1]; }),
										updated: entry.u || 0
									});
								}
							}

							results.sort(function (a, b) {
								return (b.played - a.played) || (b.updated - a.updated) || (a.start - b.start);
							});

							if (results.length === 0) {
								var empty = document.createElement('span');

								empty.textContent = satus.locale.get('empty');
								container.appendChild(empty);

								return;
							}

							results.slice(0, 50).forEach(function (result) {
								var link = document.createElement('a'),
									minutes = Math.floor(result.start / 60),
									seconds = result.start % 60;

								link.className = 'satus-list__item';
								link.style.display = 'block';
								link.href = 'https://www.youtube.com/watch?v=' + encodeURIComponent(result.id) + '&t=' + result.start + 's';
								link.target = '_blank';
								link.textContent = (result.played ? '▶ ' : '') + result.title + ' [' + minutes + ':' + (seconds < 10 ? '0' : '') + seconds + '] ' + result.text;
								container.appendChild(link);
							});
						}
					}
				},
				transcript_archive_clear: {
					component: 'button',
					text: 'clearTranscriptArchive',
					on: {
						click: function () {
							satus.storage.remove('transcript_archive');
						}
					}
				}
			}
		}
	},

	icon: {
		component: 'span',

		svg: {
			component: 'svg',
			attr: {
				'viewBox': '0 0 24 24',
				'fill': 'transparent',
				'stroke': 'currentColor',
				'stroke-linecap': 'round',
				'stroke-width': '1.75'
			},

			path: {
				component: 'path',
				attr: {
					'd': 'M21.21 15.89A10 10 0 118 2.83M22 12A10 10 0 0012 2v10z'
				}
			}
		}
	},
	label: {
		component: 'span',
		text: 'analyzer'
	}
};

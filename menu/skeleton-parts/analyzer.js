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

				archive_transcripts: {
					component: 'switch',
					text: 'archiveTranscriptsOfWatchedVideos'
				},
				search_transcripts: {
					component: 'button',
					text: 'searchTranscripts',
					on: {
						click: {
							component: 'section',
							variant: 'card',

							query: {
								component: 'text-field',
								storage: false,
								placeholder: 'search',
								lineNumbers: false,
								rows: 1,
								on: {
									render: function () {
										extension.transcriptArchiveSearch(this.parentNode, '');
									},
									input: function () {
										extension.transcriptArchiveSearch(this.parentNode, this.value);
									}
								}
							}
						}
					}
				},
				clear_transcript_archive: {
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

// Lists archived transcripts matching the query, most matching lines first
extension.transcriptArchiveSearch = function (container, query) {
	var archive = satus.storage.get('transcript_archive'),
		results = container.querySelector('.it-transcript-archive-results'),
		matches = [];

	query = (query || '').trim().toLowerCase();

	if (!results) {
		results = document.createElement('div');
		results.className = 'it-transcript-archive-results';
		container.appendChild(results);
	}
	results.textContent = '';

	if (satus.isObject(archive)) {
		for (var id in archive) {
			var video = archive[id];

			if (!satus.isObject(video) || typeof video.text !== 'string') {
				continue;
			}

			var lines = video.text.split('\n').filter(function (line) {
				return query === '' || line.toLowerCase().indexOf(query) !== -1;
			});
			var titleMatch = query !== '' && ((video.title || '') + ' ' + (video.channel || '')).toLowerCase().indexOf(query) !== -1;

			if (query === '' || lines.length > 0 || titleMatch) {
				matches.push({ id: id, video: video, lines: query === '' ? [] : lines, score: query === '' ? video.when || 0 : lines.length + (titleMatch ? 1 : 0) });
			}
		}
	}

	matches.sort(function (a, b) {
		return b.score - a.score;
	});

	if (matches.length === 0) {
		var empty = document.createElement('span');
		empty.textContent = satus.locale.get('empty');
		results.appendChild(empty);
		return;
	}

	matches.slice(0, 50).forEach(function (match) {
		var item = document.createElement('div'),
			title = document.createElement('a');

		item.style.margin = '8px 0';
		title.href = 'https://www.youtube.com/watch?v=' + match.id;
		title.target = '_blank';
		title.textContent = (match.video.title || match.id) + (match.video.channel ? ' — ' + match.video.channel : '');
		item.appendChild(title);

		match.lines.slice(0, 5).forEach(function (line) {
			var time = line.match(/^\[((?:\d+:)?\d+:\d+)\]/),
				seconds = 0,
				link = document.createElement('a');

			if (time) {
				time[1].split(':').forEach(function (part) {
					seconds = seconds * 60 + Number(part);
				});
			}

			link.href = 'https://www.youtube.com/watch?v=' + match.id + (seconds ? '&t=' + seconds + 's' : '');
			link.target = '_blank';
			link.textContent = line;
			link.style.display = 'block';
			link.style.opacity = '.7';
			link.style.fontSize = '12px';
			item.appendChild(link);
		});

		results.appendChild(item);
	});
};

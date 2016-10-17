import videojs from 'video.js';

// Default options for the plugin.
const defaults = {};

/**
 * Function to invoke when the player is ready.
 *
 * This is a great place for your plugin to initialize itself. When this
 * function is called, the player will have its DOM and child components
 * in place.
 *
 * @function onPlayerReady
 * @param    {Player} player
 * @param    {Object} [options={}]
 */
const onPlayerReady = (player, options) => {
	player.addClass('vjs-open');

};

/**
 * A video.js plugin.
 *
 * In the plugin function, the value of `this` is a video.js `Player`
 * instance. You cannot rely on the player being in a "ready" state here,
 * depending on how the plugin is invoked. This may or may not be important
 * to you; if not, remove the wait for "ready"!
 *
 * @function open
 * @param    {Object} [options={}]
 *           An object of options left to the plugin author to define.
 */
const open = function(options) {
	this.ready(() => {
		onPlayerReady(this, videojs.mergeOptions(defaults, options));
	});
};

/**
 * 分辨率
 * @param {[type]} options [description]
 * return {[type]}  [description]
 */
const videoJsResolutionSwitcher = function(options) {

	/**
	 * Initialize the plugin.
	 * @param {object} [options] configuration for the plugin
	 */

	var settings = videojs.mergeOptions(defaults, options),
		player = this,
		groupedSrc = {},
		currentSources = {},
		currentResolutionState = {};

	/**
	 * Updates player sources or returns current source URL
	 * @param   {Array}  [src] array of sources [{src: '', type: '', label: '', res: ''}]
	 * @returns {Object|String|Array} videojs player object if used as setter or current source URL, object, or array of sources
	 */
	player.updateSrc = function(src) {
		//Return current src if src is not given
		if (!src) {
			return player.src();
		}

		// Only add those sources which we can (maybe) play
		src = src.filter(function(source) {
			try {
				return (player.canPlayType(source.type) !== '');
			} catch (e) {
				// If a Tech doesn't yet have canPlayType just add it
				return true;
			}
		});
		//Sort sources
		this.currentSources = src.sort(compareResolutions);
		this.groupedSrc = bucketSources(this.currentSources);
		// Pick one by default
		var chosen = chooseSrc(this.groupedSrc, this.currentSources);
		this.currentResolutionState = {
			label: chosen.label,
			sources: chosen.sources
		};

		player.trigger('updateSources');
		player.setSourcesSanitized(chosen.sources, chosen.label);
		player.trigger('resolutionchange');
		return player;
	};

	/**
	 * Returns current resolution or sets one when label is specified
	 * @param {String}   [label]         label name
	 * @param {Function} [customSourcePicker] custom function to choose source. Takes 2 arguments: sources, label. Must return player object.
	 * @returns {Object}   current resolution object {label: '', sources: []} if used as getter or player object if used as setter
	 */
	player.currentResolution = function(label, customSourcePicker) {
		if (label == null) {
			return this.currentResolutionState;
		}

		// Lookup sources for label
		if (!this.groupedSrc || !this.groupedSrc.label || !this.groupedSrc.label[label]) {
			return;
		}
		var sources = this.groupedSrc.label[label];
		// Remember player state
		var currentTime = player.currentTime();
		var isPaused = player.paused();

		// Hide bigPlayButton
		if (!isPaused && this.player_.options_.bigPlayButton) {
			this.player_.bigPlayButton.hide();
		}

		// Change player source and wait for loadeddata event, then play video
		// loadedmetadata doesn't work right now for flash.
		// Probably because of https://github.com/videojs/video-js-swf/issues/124
		// If player preload is 'none' and then loadeddata not fired. So, we need timeupdate event for seek handle (timeupdate doesn't work properly with flash)
		var handleSeekEvent = 'loadeddata';
		if (this.player_.techName_ !== 'Youtube' && this.player_.preload() === 'none' && this.player_.techName_ !== 'Flash') {
			handleSeekEvent = 'timeupdate';
		}
		player
			.setSourcesSanitized(sources, label, customSourcePicker || settings.customSourcePicker)
			.one(handleSeekEvent, function() {
				player.currentTime(currentTime);
				player.handleTechSeeked_();
				if (!isPaused) {
					// Start playing and hide loadingSpinner (flash issue ?)
					player.play().handleTechSeeked_();
				}
				player.trigger('resolutionchange');
			});
		return player;
	};

	/**
	 * Returns grouped sources by label, resolution and type
	 * @returns {Object} grouped sources: { label: { key: [] }, res: { key: [] }, type: { key: [] } }
	 */
	player.getGroupedSrc = function() {
		return this.groupedSrc;
	};
	player.setSourcesSanitized = function(sources, label, customSourcePicker) {
		this.currentResolutionState = {
			label: label,
			sources: sources
		};

		if (typeof customSourcePicker === 'function') {
			return customSourcePicker(player, sources, label);
		}
		player.src(sources.map(function(src) {
			return {
				src: src.src,
				type: src.type,
				res: src.res
			};
		}));

		$(".vjs-resolution-button-label").html(label);
		return player;
	};

	/**
	 * Method used for sorting list of sources
	 * @param   {Object} a - source object with res property
	 * @param   {Object} b - source object with res property
	 * @returns {Number} result of comparation
	 */
	function compareResolutions(a, b) {
		if (!a.res || !b.res) {
			return 0;
		}
		return (+b.res) - (+a.res);
	}

	/**
	 * Group sources by label, resolution and type
	 * @param   {Array}  src Array of sources
	 * @returns {Object} grouped sources: { label: { key: [] }, res: { key: [] }, type: { key: [] } }
	 */
	function bucketSources(src) {
		var resolutions = {
			label: {},
			res: {},
			type: {}
		};
		src.map(function(source) {
			initResolutionKey(resolutions, 'label', source);
			initResolutionKey(resolutions, 'res', source);
			initResolutionKey(resolutions, 'type', source);

			appendSourceToKey(resolutions, 'label', source);
			appendSourceToKey(resolutions, 'res', source);
			appendSourceToKey(resolutions, 'type', source);
		});
		return resolutions;
	}

	function initResolutionKey(resolutions, key, source) {
		if (resolutions[key][source[key]] == null) {
			resolutions[key][source[key]] = [];
		}
	}

	function appendSourceToKey(resolutions, key, source) {
		resolutions[key][source[key]].push(source);
	}

	/**
	 * Choose src if option.default is specified
	 * @param   {Object} groupedSrc {res: { key: [] }}
	 * @param   {Array}  src Array of sources sorted by resolution used to find high and low res
	 * @returns {Object} {res: string, sources: []}
	 */
	function chooseSrc(groupedSrc, src) {
		var selectedRes = settings['default']; // use array access as default is a reserved keyword
		var selectedLabel = '';
		if (selectedRes === 'high') {
			selectedRes = src[0].res;
			selectedLabel = src[0].label;
		} else if (selectedRes === 'low' || selectedRes == null || !groupedSrc.res[selectedRes]) {
			// Select low-res if default is low or not set
			selectedRes = src[src.length - 1].res;
			selectedLabel = src[src.length - 1].label;
		} else if (groupedSrc.res[selectedRes]) {
			selectedLabel = groupedSrc.res[selectedRes][0].label;
		}
		return {
			res: selectedRes,
			label: selectedLabel,
			sources: groupedSrc.res[selectedRes]
		};
	}

	function initResolutionForYt(player) {
		// Map youtube qualities names
		var _yts = {
			highres: {
				res: 1080,
				label: '1080',
				yt: 'highres'
			},
			hd1080: {
				res: 1080,
				label: '1080',
				yt: 'hd1080'
			},
			hd720: {
				res: 720,
				label: '720',
				yt: 'hd720'
			},
			large: {
				res: 480,
				label: '480',
				yt: 'large'
			},
			medium: {
				res: 360,
				label: '360',
				yt: 'medium'
			},
			small: {
				res: 240,
				label: '240',
				yt: 'small'
			},
			tiny: {
				res: 144,
				label: '144',
				yt: 'tiny'
			},
			auto: {
				res: 0,
				label: 'auto',
				yt: 'auto'
			}
		};
		// Overwrite default sourcePicker function
		var _customSourcePicker = function(_player, _sources, _label) {
			// Note that setPlayebackQuality is a suggestion. YT does not always obey it.
			player.tech_.ytPlayer.setPlaybackQuality(_sources[0]._yt);
			player.trigger('updateSources');
			return player;
		};
		settings.customSourcePicker = _customSourcePicker;

		// Init resolution
		player.tech_.ytPlayer.setPlaybackQuality('auto');

		// This is triggered when the resolution actually changes
		player.tech_.ytPlayer.addEventListener('onPlaybackQualityChange', function(event) {
			for (var res in _yts) {
				if (res.yt === event.data) {
					player.currentResolution(res.label, _customSourcePicker);
					return;
				}
			}
		});

		// We must wait for play event
		player.one('play', function() {
			var qualities = player.tech_.ytPlayer.getAvailableQualityLevels();
			var _sources = [];

			qualities.map(function(q) {
				_sources.push({
					src: player.src().src,
					type: player.src().type,
					label: _yts[q].label,
					res: _yts[q].res,
					_yt: _yts[q].yt
				});
			});

			player.groupedSrc = bucketSources(_sources);
			var chosen = {
				label: 'auto',
				res: 0,
				sources: player.groupedSrc.label.auto
			};

			this.currentResolutionState = {
				label: chosen.label,
				sources: chosen.sources
			};

			player.trigger('updateSources');
			player.setSourcesSanitized(chosen.sources, chosen.label, _customSourcePicker);
		});
	}

	player.ready(function() {
		if (settings.ui) {
			var menuButton = new ResolutionMenuButton(player, settings);
			player.controlBar.resolutionSwitcher = player.controlBar.el_.insertBefore(menuButton.el_, player.controlBar.getChild('fullscreenToggle').el_);
			player.controlBar.resolutionSwitcher.dispose = function() {
				this.parentNode.removeChild(this);
			};
		}
		if (player.options_.sources.length > 1) {
			// tech: Html5 and Flash
			// Create resolution switcher for videos form <source> tag inside <video>
			player.updateSrc(player.options_.sources);
		}

		if (player.techName_ === 'Youtube') {
			// tech: YouTube
			initResolutionForYt(player);
		}
	});

	var videoJsResolutionSwitcher,
		defaults = {
			ui: true
		};

	/*
	 * Resolution menu item
	 */
	var MenuItem = videojs.getComponent('MenuItem');
	var ResolutionMenuItem = videojs.extend(MenuItem, {
		constructor: function(player, options) {
			options.selectable = true;
			// Sets this.player_, this.options_ and initializes the component
			MenuItem.call(this, player, options);
			this.src = options.src;

			player.on('resolutionchange', videojs.bind(this, this.update));
		}
	});
	ResolutionMenuItem.prototype.handleClick = function(event) {
		MenuItem.prototype.handleClick.call(this, event);
		this.player_.currentResolution(this.options_.label);
	};
	ResolutionMenuItem.prototype.update = function() {
		var selection = this.player_.currentResolution();
		this.selected(this.options_.label === selection.label);
	};
	MenuItem.registerComponent('ResolutionMenuItem', ResolutionMenuItem);

	/*
	 * Resolution menu button
	 */
	var MenuButton = videojs.getComponent('MenuButton');
	var ResolutionMenuButton = videojs.extend(MenuButton, {
		constructor: function(player, options) {
			this.label = document.createElement('span');
			options.label = 'Quality';
			// Sets this.player_, this.options_ and initializes the component
			MenuButton.call(this, player, options);
			this.el().setAttribute('aria-label', 'Quality');
			this.controlText('Quality');

			if (options.dynamicLabel) {
				videojs.addClass(this.label, 'vjs-resolution-button-label');
				this.el().appendChild(this.label);
			} else {
				var staticLabel = document.createElement('span');
				videojs.addClass(staticLabel, 'vjs-menu-icon');
				this.el().appendChild(staticLabel);
			}
			player.on('updateSources', videojs.bind(this, this.update));
		}
	});
	ResolutionMenuButton.prototype.createItems = function() {
		var menuItems = [];
		var labels = (this.sources && this.sources.label) || {};

		// FIXME order is not guaranteed here.
		for (var key in labels) {
			if (labels.hasOwnProperty(key)) {
				menuItems.push(new ResolutionMenuItem(
					this.player_, {
						label: key,
						src: labels[key],
						selected: key === (this.currentSelection ? this.currentSelection.label : false)
					}));
			}
		}
		return menuItems;
	};
	ResolutionMenuButton.prototype.update = function() {
		this.sources = this.player_.getGroupedSrc();
		this.currentSelection = this.player_.currentResolution();
		this.label.innerHTML = this.currentSelection ? this.currentSelection.label : '';
		return MenuButton.prototype.update.call(this);
	};
	ResolutionMenuButton.prototype.buildCSSClass = function() {
		return MenuButton.prototype.buildCSSClass.call(this) + ' vjs-resolution-button';
	};
	MenuButton.registerComponent('ResolutionMenuButton', ResolutionMenuButton);
};

/**
 * 禁用滚动条拖动
 * @param {[type]} options [description]
 * return {[type]}  [description]
 */
const disableProgress = function(options) {
	var
	/**
	 * Copies properties from one or more objects onto an original.
	 */
		extend = function(obj /*, arg1, arg2, ... */ ) {
			var arg, i, k;
			for (i = 1; i < arguments.length; i++) {
				arg = arguments[i];
				for (k in arg) {
					if (arg.hasOwnProperty(k)) {
						obj[k] = arg[k];
					}
				}
			}
			return obj;
		},

		// define some reasonable defaults for this sweet plugin
		defaults = {
			autoDisable: false
		};


	var
	// save a reference to the player instance
		player = this,
		state = false,

		// merge options and defaults
		settings = extend({}, defaults, options || {});

	// disable / enable methods
	player.disableProgress = {
		disable: function() {
			state = true;
			player.controlBar.progressControl.seekBar.off("focus");
			player.controlBar.progressControl.seekBar.off("mousedown");
			player.controlBar.progressControl.seekBar.off("touchstart");
			player.controlBar.progressControl.seekBar.off("click");
		},
		enable: function() {
			state = false;
			player.controlBar.progressControl.seekBar.on("focus", player.controlBar.progressControl.seekBar.handleFocus);
			player.controlBar.progressControl.seekBar.on("mousedown", player.controlBar.progressControl.seekBar.handleMouseDown);
			player.controlBar.progressControl.seekBar.on("touchstart", player.controlBar.progressControl.seekBar.handleMouseDown);
			player.controlBar.progressControl.seekBar.on("click", player.controlBar.progressControl.seekBar.handleClick);
		},
		getState: function() {
			return state;
		}
	};

	if (settings.autoDisable) {
		player.disableProgress.disable();
	}
};

/**
 * 打点
 * @param {[type]} options [description]
 * return {[type]}  [description]
 */
const markers = function(options) {
	//default setting
	var defaultSetting = {
		markerStyle: {
			'width': '8px',
			'border-radius': '20%',
			'background-color': 'rgba(255,0,0,.5)'
		},
		markerTip: {
			display: true,
			text: function(marker) {
				return marker.text;
			},
			time: function(marker) {
				return marker.time;
			}
		},
		breakOverlay: {
			display: true,
			displayTime: 1,
			text: function(marker) {
				return marker.overlayText;
			},
			style: {
				'width': '100%',
				'height': 'calc(100% - 36px)',
				'background-color': 'rgba(0,0,0,0.7)',
				'color': 'white',
				'font-size': '17px'
			}
		},
		onMarkerClick: function(marker) {
			return false
		},
		onMarkerReached: function(marker) {},
		markers: []
	};

	// create a non-colliding random number
	function generateUUID() {
		var d = new Date().getTime();
		var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = (d + Math.random() * 16) % 16 | 0;
			d = Math.floor(d / 16);
			return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
		});
		return uuid;
	};
	/**
	 * register the markers plugin (dependent on jquery)
	 */
	var setting = $.extend(true, {}, defaultSetting, options),
		markersMap = {},
		markersList = [], // list of markers sorted by time
		videoWrapper = $(this.el()),
		currentMarkerIndex = -1,
		player = this,
		markerTip = null,
		breakOverlay = null,
		overlayIndex = -1;

	function sortMarkersList() {
		// sort the list by time in asc order
		markersList.sort(function(a, b) {
			return setting.markerTip.time(a) - setting.markerTip.time(b);
		});
	}

	function addMarkers(newMarkers) {
		// create the markers
		$.each(newMarkers, function(index, marker) {
			marker.key = generateUUID();

			videoWrapper.find('.vjs-progress-control').append(
				createMarkerDiv(marker));

			// store marker in an internal hash map
			markersMap[marker.key] = marker;
			markersList.push(marker);
		});

		sortMarkersList();
	}

	function getPosition(marker) {
		return (setting.markerTip.time(marker) / player.duration()) * 100
	}

	function createMarkerDiv(marker, duration) {
		var markerDiv = $("<div class='vjs-marker'></div>");
		var marg = parseInt(videoWrapper.find('.vjs-progress-control .vjs-slider').css('marginLeft'));
		markerDiv.css(setting.markerStyle)
			.css({
				"margin-left": marg - parseFloat(markerDiv.css("width")) / 2 + 'px',
				"left": getPosition(marker) + '%'
			})
			.attr("data-marker-key", marker.key)
			.attr("data-marker-time", setting.markerTip.time(marker));

		// add user-defined class to marker
		if (marker.class) {
			markerDiv.addClass(marker.class);
		}

		// bind click event to seek to marker time
		markerDiv.on('click', function(e) {

			var preventDefault = false;
			if (typeof setting.onMarkerClick === "function") {
				// if return false, prevent default behavior
				preventDefault = setting.onMarkerClick(marker) == false;
			}

			if (!preventDefault) {
				var key = $(this).data('marker-key');
				player.currentTime(setting.markerTip.time(markersMap[key]));
			}
		});

		if (setting.markerTip.display) {
			registerMarkerTipHandler(markerDiv);
		}

		return markerDiv;
	}

	function updateMarkers() {
		// update UI for markers whose time changed

		for (var i = 0; i < markersList.length; i++) {
			var marker = markersList[i];
			var markerDiv = videoWrapper.find(".vjs-marker[data-marker-key='" + marker.key + "']");
			var markerTime = setting.markerTip.time(marker);

			if (markerDiv.data('marker-time') != markerTime) {
				markerDiv.css({
						"left": getPosition(marker) + '%'
					})
					.attr("data-marker-time", markerTime);
			}
		}
		sortMarkersList();
	}

	function removeMarkers(indexArray) {
		// reset overlay
		if (breakOverlay) {
			overlayIndex = -1;
			breakOverlay.css("visibility", "hidden");
		}
		currentMarkerIndex = -1;

		for (var i = 0; i < indexArray.length; i++) {
			var index = indexArray[i];
			var marker = markersList[index];
			if (marker) {
				// delete from memory
				delete markersMap[marker.key];
				markersList[index] = null;

				// delete from dom
				videoWrapper.find(".vjs-marker[data-marker-key='" + marker.key + "']").remove();
			}
		}

		// clean up array
		for (var i = markersList.length - 1; i >= 0; i--) {
			if (markersList[i] === null) {
				markersList.splice(i, 1);
			}
		}

		// sort again
		sortMarkersList();
	}


	// attach hover event handler
	function registerMarkerTipHandler(markerDiv) {

		markerDiv.on('mouseover', function() {
			var marker = markersMap[$(this).data('marker-key')];

			markerTip.find('.vjs-tip-inner').html(setting.markerTip.text(marker));

			// margin-left needs to minus the padding length to align correctly with the marker
			markerTip.css({
				"left": getPosition(marker) + '%',
				"margin-left": -parseFloat(markerTip.css("width")) / 2 - 5 + 'px',
				"visibility": "visible"
			});

		}).on('mouseout', function() {
			markerTip.css("visibility", "hidden");
		});
	}

	function initializeMarkerTip() {
		markerTip = $("<div class='vjs-tip'><div class='vjs-tip-arrow'></div><div class='vjs-tip-inner'></div></div>");
		videoWrapper.find('.vjs-progress-control').append(markerTip);
	}

	// show or hide break overlays
	function updateBreakOverlay() {
		if (!setting.breakOverlay.display || currentMarkerIndex < 0) {
			return;
		}

		var currentTime = player.currentTime();
		var marker = markersList[currentMarkerIndex];
		var markerTime = setting.markerTip.time(marker);

		if (currentTime >= markerTime &&
			currentTime <= (markerTime + setting.breakOverlay.displayTime)) {
			if (overlayIndex != currentMarkerIndex) {
				overlayIndex = currentMarkerIndex;
				breakOverlay.find('.vjs-break-overlay-text').html(setting.breakOverlay.text(marker));
			}

			breakOverlay.css('visibility', "visible");

		} else {
			overlayIndex = -1;
			breakOverlay.css("visibility", "hidden");
		}
	}

	// problem when the next marker is within the overlay display time from the previous marker
	function initializeOverlay() {
		breakOverlay = $("<div class='vjs-break-overlay'><div class='vjs-break-overlay-text'></div></div>")
			.css(setting.breakOverlay.style);
		videoWrapper.append(breakOverlay);
		overlayIndex = -1;
	}

	function onTimeUpdate() {
		onUpdateMarker();
		updateBreakOverlay();
	}

	function onUpdateMarker() {
		/*
		    check marker reached in between markers
		    the logic here is that it triggers a new marker reached event only if the player 
		    enters a new marker range (e.g. from marker 1 to marker 2). Thus, if player is on marker 1 and user clicked on marker 1 again, no new reached event is triggered)
		*/

		var getNextMarkerTime = function(index) {
			if (index < markersList.length - 1) {
				return setting.markerTip.time(markersList[index + 1]);
			}
			// next marker time of last marker would be end of video time
			return player.duration();
		}
		var currentTime = player.currentTime();
		var newMarkerIndex;

		if (currentMarkerIndex != -1) {
			// check if staying at same marker
			var nextMarkerTime = getNextMarkerTime(currentMarkerIndex);
			if (currentTime >= setting.markerTip.time(markersList[currentMarkerIndex]) &&
				currentTime < nextMarkerTime) {
				return;
			}

			// check for ending (at the end current time equals player duration)
			if (currentMarkerIndex === markersList.length - 1 &&
				currentTime === player.duration()) {
				return;
			}
		}

		// check first marker, no marker is selected
		if (markersList.length > 0 &&
			currentTime < setting.markerTip.time(markersList[0])) {
			newMarkerIndex = -1;
		} else {
			// look for new index
			for (var i = 0; i < markersList.length; i++) {
				nextMarkerTime = getNextMarkerTime(i);

				if (currentTime >= setting.markerTip.time(markersList[i]) &&
					currentTime < nextMarkerTime) {
					newMarkerIndex = i;
					break;
				}
			}
		}

		// set new marker index
		if (newMarkerIndex != currentMarkerIndex) {
			// trigger event
			if (newMarkerIndex != -1 && options.onMarkerReached) {
				options.onMarkerReached(markersList[newMarkerIndex]);
			}
			currentMarkerIndex = newMarkerIndex;
		}

	}

	// setup the whole thing
	function initialize() {
		if (setting.markerTip.display) {
			initializeMarkerTip();
		}

		// remove existing markers if already initialized
		player.markers.removeAll();
		addMarkers(options.markers);

		if (setting.breakOverlay.display) {
			initializeOverlay();
		}
		onTimeUpdate();
		player.on("timeupdate", onTimeUpdate);
	}

	// setup the plugin after we loaded video's meta data
	player.on("loadedmetadata", function() {
		initialize();
	});

	// exposed plugin API
	player.markers = {
		getMarkers: function() {
			return markersList;
		},
		next: function() {
			// go to the next marker from current timestamp
			var currentTime = player.currentTime();
			for (var i = 0; i < markersList.length; i++) {
				var markerTime = setting.markerTip.time(markersList[i]);
				if (markerTime > currentTime) {
					player.currentTime(markerTime);
					break;
				}
			}
		},
		prev: function() {
			// go to previous marker
			var currentTime = player.currentTime();
			for (var i = markersList.length - 1; i >= 0; i--) {
				var markerTime = setting.markerTip.time(markersList[i]);
				// add a threshold
				if (markerTime + 0.5 < currentTime) {
					player.currentTime(markerTime);
					break;
				}
			}
		},
		add: function(newMarkers) {
			// add new markers given an array of index
			addMarkers(newMarkers);
		},
		remove: function(indexArray) {
			// remove markers given an array of index
			removeMarkers(indexArray);
		},
		removeAll: function() {
			var indexArray = [];
			for (var i = 0; i < markersList.length; i++) {
				indexArray.push(i);
			}
			removeMarkers(indexArray);
		},
		updateTime: function() {
			// notify the plugin to update the UI for changes in marker times 
			updateMarkers();
		},
		reset: function(newMarkers) {
			// remove all the existing markers and add new ones
			player.markers.removeAll();
			addMarkers(newMarkers);
		},
		destroy: function() {
			// unregister the plugins and clean up even handlers
			player.markers.removeAll();
			breakOverlay.remove();
			markerTip.remove();
			player.off("timeupdate", updateBreakOverlay);
			delete player.markers;
		},
	};
};

/**
 * 水印
 * @param {[type]} options [description]
 * return {[type]}  [description]
 */
const waterMark = function(settings) {
	var defaults = {
			file: 'logo.png',
			xpos: 0,
			ypos: 0,
			xrepeat: 0,
			opacity: 100,
			clickable: false,
			url: "",
			className: 'vjs-watermark',
			text: false,
			debug: false
		},
		extend = function() {
			var args, target, i, object, property;
			args = Array.prototype.slice.call(arguments);
			target = args.shift() || {};
			for (i in args) {
				object = args[i];
				for (property in object) {
					if (object.hasOwnProperty(property)) {
						if (typeof object[property] === 'object') {
							target[property] = extend(target[property], object[property]);
						} else {
							target[property] = object[property];
						}
					}
				}
			}
			return target;
		};

	//! global varible containing reference to the DOM element
	var div;

	// var settings = $.extend(true, {}, defaults, options);

	if (settings.debug) console.log('watermark: Register init');

	var options, player, video, img, link;
	options = extend(defaults, settings);

	/* Grab the necessary DOM elements */
	player = this.el();
	video = this.el().getElementsByTagName('video')[0];

	// create the watermark element
	if (!div) {
		div = document.createElement('div');
		div.className = options.className;
	} else {
		//! if div already exists, empty it
		div.innerHTML = '';
	}

	// if text is set, display text
	if (options.text)
		div.textContent = options.text;

	// if img is set, add img
	if (options.file) {
		img = document.createElement('img');
		div.appendChild(img);
		div.style.display = "inline-block";
		div.style.position = "absolute";
		div.style.zIndex = 0;
		img.src = options.file;
	}
	//img.style.bottom = "0";
	//img.style.right = "0";
	if ((options.ypos === 0) && (options.xpos === 0)) // Top left
	{
		div.style.top = "0px";
		div.style.left = "0px";
	} else if ((options.ypos === 0) && (options.xpos === 100)) // Top right
	{
		div.style.top = "0px";
		div.style.right = "0px";
	} else if ((options.ypos === 100) && (options.xpos === 100)) // Bottom right
	{
		div.style.bottom = "0px";
		div.style.right = "0px";
	} else if ((options.ypos === 100) && (options.xpos === 0)) // Bottom left
	{
		div.style.bottom = "0px";
		div.style.left = "0px";
	} else if ((options.ypos === 50) && (options.xpos === 50)) // Center
	{
		if (options.debug) console.log('watermark: player:' + player.width + 'x' + player.height);
		if (options.debug) console.log('watermark: video:' + video.videoWidth + 'x' + video.videoHeight);
		if (options.debug) console.log('watermark: image:' + img.width + 'x' + img.height);
		div.style.top = (this.height() / 2) + "px";
		div.style.left = (this.width() / 2) + "px";
	}
	div.style.opacity = options.opacity;

	//div.style.backgroundImage = "url("+options.file+")";
	//div.style.backgroundPosition.x = options.xpos+"%";
	//div.style.backgroundPosition.y = options.ypos+"%";
	//div.style.backgroundRepeat = options.xrepeat;
	//div.style.opacity = (options.opacity/100);

	//if user wants watermark to be clickable, add anchor elem
	//todo: check if options.url is an actual url?
	if (options.clickable && options.url !== "") {
		link = document.createElement("a");
		link.href = options.url;
		link.target = "_blank";
		link.appendChild(div);
		//add clickable watermark to the player
		player.appendChild(link);
	} else {
		//add normal watermark to the player
		player.appendChild(div);
	}

	if (options.debug) console.log('watermark: Register end');
};

/**
 * 记录 录音 截屏
 * @param {[type]} options [description]
 * return {[type]}  [description]
 */
const record = function(options) {
    var VjsComponent = videojs.getComponent('Component');
    var VjsButton = videojs.getComponent('Button');

    /**
     * Base class for recorder backends.
     * @class
     * @augments videojs.Component
     * @private
     */
    videojs.RecordBase = videojs.extend(VjsComponent,
    {
        // recorder modes
        IMAGE_ONLY: 'image_only',
        AUDIO_ONLY: 'audio_only',
        VIDEO_ONLY: 'video_only',
        AUDIO_VIDEO: 'audio_video',
        ANIMATION: 'animation',

        // supported recorder plugin engines
        RECORDRTC: 'recordrtc',
        LIBVORBISJS: 'libvorbis.js',
        RECORDERJS: 'recorder.js',
        LAMEJS: 'lamejs',
        OPUSRECORDER: 'opus-recorder',

        /**
         * The constructor function for the class.
         *
         * @private
         * @param {(videojs.Player|Object)} player - Video.js player instance.
         * @param {Object} options - Player options.
         */
        constructor: function(player, options)
        {
            VjsComponent.call(this, player, options);
        },

        /**
         * Browser detector.
         *
         * @private
         * @return {object} result containing browser, version and minVersion
         *     properties.
         */
        detectBrowser: function()
        {
            // Returned result object.
            var result = {};
            result.browser = null;
            result.version = null;
            result.minVersion = null;

            // Non supported browser.
            if (typeof window === 'undefined' || !window.navigator)
            {
                result.browser = 'Not a supported browser.';
                return result;
            }

            // Firefox.
            if (navigator.mozGetUserMedia)
            {
                result.browser = 'firefox';
                result.version = this.extractVersion(navigator.userAgent,
                    /Firefox\/([0-9]+)\./, 1);
                result.minVersion = 31;
                return result;
            }

            // Chrome/Chromium/Webview.
            if (navigator.webkitGetUserMedia && window.webkitRTCPeerConnection)
            {
                result.browser = 'chrome';
                result.version = this.extractVersion(navigator.userAgent,
                    /Chrom(e|ium)\/([0-9]+)\./, 2);
                result.minVersion = 38;
                return result;
            }

            // Edge.
            if (navigator.mediaDevices &&
                navigator.userAgent.match(/Edge\/(\d+).(\d+)$/))
            {
                result.browser = 'edge';
                result.version = this.extractVersion(navigator.userAgent,
                    /Edge\/(\d+).(\d+)$/, 2);
                result.minVersion = 10547;
                return result;
            }
            // Non supported browser default.
            result.browser = 'Not a supported browser.';
            return result;
        },

        /**
         * Extract browser version out of the provided user agent string.
         *
         * @private
         * @param {!string} uastring - userAgent string.
         * @param {!string} expr - Regular expression used as match criteria.
         * @param {!number} pos - position in the version string to be
         *     returned.
         * @return {!number} browser version.
         */
        extractVersion: function(uastring, expr, pos)
        {
            var match = uastring.match(expr);
            return match && match.length >= pos && parseInt(match[pos], 10);
        },
        isEdge: function()
        {
            return this.detectBrowser().browser === 'edge';
        },
        isOpera: function()
        {
            return !!window.opera || navigator.userAgent.indexOf('OPR/') !== -1;
        },
        isChrome: function()
        {
            return this.detectBrowser().browser === 'chrome';
        },

        /**
         * Remove any temporary data and references to streams.
         * @private
         */
        dispose: function()
        {
            // remove previous recording
            if (this.mediaURL !== undefined)
            {
                URL.revokeObjectURL(this.mediaURL);
            }
        },

        /**
         * Add filename and timestamp to recorded file object.
         *
         * @param {(blob|file)} fileObj - Blob of File object.
         * @private
         */
        addFileInfo: function(fileObj)
        {
            var now = new Date();
            fileObj.lastModifiedDate = now;

            // guess extension name from mime type, e.g. audio/ogg, but
            // any extension is valid here. Chrome also accepts extended
            // mime types like video/webm;codecs=h264,vp9,opus
            var fileExtension = '.' + fileObj.type.split('/')[1];
            if (fileExtension.indexOf(';') > -1)
            {
                fileExtension = fileExtension.split(';')[0];
            }

            // use timestamp in filename, e.g. 1451180941326.ogg
            fileObj.name = now.getTime() + fileExtension;
        },

        /**
         * Invoked when recording is stopped and resulting stream is available.
         *
         * @param {blob} data - Reference to the recorded Blob.
         * @private
         */
        onStopRecording: function(data)
        {
            this.recordedData = data;

            this.addFileInfo(this.recordedData);

            // store reference to recorded stream URL
            this.dispose();
            this.mediaURL = URL.createObjectURL(this.recordedData);

            // notify listeners
            this.trigger('recordComplete');
        }
    });

    /**
     * Engine for the RecordRTC library.
     *
     * @private
     * @class
     * @augments videojs.RecordBase
     */
    videojs.RecordRTCEngine = videojs.extend(videojs.RecordBase,
    {
        /**
         * Setup recording engine.
         * @private
         */
        setup: function(stream, mediaType, debug)
        {
            this.inputStream = stream;
            this.mediaType = mediaType;
            this.debug = debug;

            // setup RecordRTC
            this.engine = new MRecordRTC();
            this.engine.mediaType = this.mediaType;
            this.engine.disableLogs = !this.debug;
            this.engine.mimeType = this.mimeType;

            // audio settings
            this.engine.bufferSize = this.bufferSize;
            this.engine.sampleRate = this.sampleRate;
            this.engine.numberOfAudioChannels = this.audioChannels;

            // video/canvas settings
            this.engine.video = this.video;
            this.engine.canvas = this.canvas;

            // animated gif settings
            this.engine.quality = this.quality;
            this.engine.frameRate = this.frameRate;

            // connect stream to recording engine
            this.engine.addStream(this.inputStream);
        },

        /**
         * Start recording.
         * @private
         */
        start: function()
        {
            this.engine.startRecording();
        },

        /**
         * Stop recording. Result will be available async when onStopRecording
         * is called.
         * @private
         */
        stop: function()
        {
            this.engine.stopRecording(this.onStopRecording.bind(this));
        },

        /**
         * Invoked when recording is stopped and resulting stream is available.
         *
         * @private
         * @param {string} audioVideoURL - Reference to the recorded Blob
         *     object, e.g. 'blob:http://localhost:8080/10100016-4248-9949-b0d6-0bb40db56eba'
         * @param {string} type - Media type, eg. 'video' or 'audio'.
         */
        onStopRecording: function(audioVideoURL, type)
        {
            // store reference to recorded stream URL
            this.mediaURL = audioVideoURL;

            // store reference to recorded stream data
            var recordType = this.player().recorder.getRecordType();
            this.engine.getBlob(function(recording)
            {
                switch (recordType)
                {
                    case this.AUDIO_ONLY:
                        this.recordedData = recording.audio;

                        this.addFileInfo(this.recordedData);

                        // notify listeners
                        this.trigger('recordComplete');
                        break;

                    case this.VIDEO_ONLY:
                    case this.AUDIO_VIDEO:
                        // when recording both audio and video, recordrtc
                        // calls this twice on chrome, first with audio data
                        // and then with video data.
                        // on firefox it's called once but with a single
                        // blob that includes both audio and video data.
                        if (recording.video !== undefined)
                        {
                            // data is video-only but on firefox audio+video
                            this.recordedData = recording.video;

                            // on the chrome browser two blobs are created
                            // containing the separate audio/video streams.
                            if (recordType === this.AUDIO_VIDEO && this.isChrome())
                            {
                                // store both audio and video
                                this.recordedData = recording;

                                for (var mtype in this.recordedData)
                                {
                                    this.addFileInfo(this.recordedData[mtype]);
                                }
                            }
                            else
                            {
                                this.addFileInfo(this.recordedData);
                            }

                            // notify listeners
                            this.trigger('recordComplete');
                        }
                        break;

                    case this.ANIMATION:
                        this.recordedData = recording.gif;

                        this.addFileInfo(this.recordedData);

                        // notify listeners
                        this.trigger('recordComplete');
                        break;
                }
            }.bind(this));
        }
    });

    /**
     * Record audio/video/images using the Video.js player.
     *
     * @class
     * @augments videojs.RecordBase
     */
    videojs.Recorder = videojs.extend(videojs.RecordBase,
    {
        /**
         * The constructor function for the class.
         *
         * @param {(videojs.Player|Object)} player
         * @param {Object} options - Player options.
         */
        constructor: function(player, options)
        {
            // run base component initializing with new options.
            VjsComponent.call(this, player, options);

            // setup plugin options
            this.loadOptions();

            // (re)set recorder state
            this.resetState();

            // cross-browser getUserMedia
            var promisifiedOldGUM = function(constraints, successCallback, errorCallback)
            {
                // get ahold of getUserMedia, if present
                var getUserMedia = (navigator.getUserMedia ||
                    navigator.webkitGetUserMedia ||
                    navigator.mozGetUserMedia ||
                    navigator.msGetUserMedia);
                // Some browsers just don't implement it - return a rejected
                // promise with an error to keep a consistent interface
                if (!getUserMedia)
                {
                    return Promise.reject(
                        new Error('getUserMedia is not implemented in this browser')
                    );
                }
                // otherwise, wrap the call to the old navigator.getUserMedia with
                // a Promise
                return new Promise(function(successCallback, errorCallback)
                {
                    getUserMedia.call(navigator, constraints, successCallback,
                        errorCallback);
                });
            };
            // Older browsers might not implement mediaDevices at all, so we set an
            // empty object first
            if (navigator.mediaDevices === undefined)
            {
                navigator.mediaDevices = {};
            }
            // Some browsers partially implement mediaDevices. We can't just assign
            // an object with getUserMedia as it would overwrite existing
            // properties. Here, we will just add the getUserMedia property if it's
            // missing.
            if (navigator.mediaDevices.getUserMedia === undefined)
            {
                navigator.mediaDevices.getUserMedia = promisifiedOldGUM;
            }

            // wait until player ui is ready
            this.player().one('ready', this.setupUI.bind(this));
        },

        /**
         * Setup plugin options.
         */
        loadOptions: function()
        {
            // record settings
            this.recordImage = this.options_.options.image;
            this.recordAudio = this.options_.options.audio;
            this.recordVideo = this.options_.options.video;
            this.recordAnimation = this.options_.options.animation;
            this.maxLength = this.options_.options.maxLength;
            this.debug = this.options_.options.debug;

            // video/canvas settings
            this.videoFrameWidth = this.options_.options.frameWidth;
            this.videoFrameHeight = this.options_.options.frameHeight;
            this.videoRecorderType = this.options_.options.videoRecorderType;
            this.videoMimeType = this.options_.options.videoMimeType;

            // audio settings
            this.audioEngine = this.options_.options.audioEngine;
            this.audioRecorderType = this.options_.options.audioRecorderType;
            this.audioWorkerURL = this.options_.options.audioWorkerURL;
            this.audioBufferSize = this.options_.options.audioBufferSize;
            this.audioSampleRate = this.options_.options.audioSampleRate;
            this.audioChannels = this.options_.options.audioChannels;
            this.audioMimeType = this.options_.options.audioMimeType;

            // animation settings
            this.animationFrameRate = this.options_.options.animationFrameRate;
            this.animationQuality = this.options_.options.animationQuality;
        },

        /**
         * Player UI is ready.
         * @private
         */
        setupUI: function()
        {
            // insert custom controls on left-side of controlbar
            this.player().controlBar.addChild(this.player().cameraButton);
            this.player().controlBar.el().insertBefore(
                this.player().cameraButton.el(),
                this.player().controlBar.el().firstChild);
            this.player().controlBar.el().insertBefore(
                this.player().recordToggle.el(),
                this.player().controlBar.el().firstChild);

            // get rid of unused controls
            if (this.player().controlBar.remainingTimeDisplay !== undefined)
            {
                this.player().controlBar.remainingTimeDisplay.el().style.display = 'none';
            }
            if (this.player().controlBar.liveDisplay !== undefined)
            {
                this.player().controlBar.liveDisplay.el().style.display = 'none';
            }

            // loop feature is not used in this plugin
            this.player().loop(false);

            // tweak player UI based on type
            switch (this.getRecordType())
            {
                case this.AUDIO_ONLY:
                    // reference to videojs-wavesurfer plugin
                    this.surfer = this.player().waveform;
                    if (this.surfer)
                    {
                        // initially hide playhead (fixed in wavesurfer 1.0.25)
                        this.playhead = this.surfer.el().getElementsByTagName('wave')[1];
                        this.playhead.style.display = 'none';
                    }
                    break;

                case this.IMAGE_ONLY:
                case this.VIDEO_ONLY:
                case this.AUDIO_VIDEO:
                case this.ANIMATION:
                    // customize controls
                    // XXX: below are customizations copied from videojs.wavesurfer that
                    //      tweak the video.js UI...
                    this.player().bigPlayButton.hide();

                    // loadedmetadata resets the durationDisplay for the
                    // first time
                    this.player().one('loadedmetadata', function()
                    {
                        // display max record time
                        this.setDuration(this.maxLength);
                    }.bind(this));

                    // the native controls don't work for this UI so disable
                    // them no matter what
                    if (this.player().usingNativeControls_ === true)
                    {
                        if (this.player().tech_.el_ !== undefined)
                        {
                            this.player().tech_.el_.controls = false;
                        }
                    }

                    if (this.player().options_.controls)
                    {
                        // progress control isn't used by this plugin
                        this.player().controlBar.progressControl.hide();

                        // prevent controlbar fadeout
                        this.player().on('userinactive', function(event)
                        {
                            this.player().userActive(true);
                        });

                        // videojs automatically hides the controls when no valid 'source'
                        // element is included in the 'audio' tag. Don't. Ever again.
                        this.player().controlBar.show();
                        this.player().controlBar.el().style.display = 'flex';
                    }
                    break;
            }

            // disable currentTimeDisplay's 'timeupdate' event listener that
            // constantly tries to reset the current time value to 0
            this.player().off('timeupdate');

            // display max record time
            this.setDuration(this.maxLength);

            // hide play control
            this.player().controlBar.playToggle.hide();
        },

        /**
         * Indicates whether the plugin is currently recording or not.
         *
         * @return {boolean} Plugin currently recording or not.
         */
        isRecording: function()
        {
            return this._recording;
        },

        /**
         * Indicates whether the plugin is currently processing recorded data
         * or not.
         *
         * @return {boolean} Plugin processing or not.
         */
        isProcessing: function()
        {
            return this._processing;
        },

        /**
         * Indicates whether the plugin is destroyed or not.
         *
         * @return {boolean} Plugin destroyed or not.
         */
        isDestroyed: function()
        {
            return this.player() && (this.player().children() === null);
        },

        /**
         * Open the browser's recording device selection dialog.
         */
        getDevice: function()
        {
            // define device callbacks once
            if (this.deviceReadyCallback === undefined)
            {
                this.deviceReadyCallback = this.onDeviceReady.bind(this);
            }
            if (this.deviceErrorCallback === undefined)
            {
                this.deviceErrorCallback = this.onDeviceError.bind(this);
            }
            if (this.engineStopCallback === undefined)
            {
                this.engineStopCallback = this.onRecordComplete.bind(this);
            }
            // ask the browser to give the user access to the media device
            // and get a stream reference in the callback function
            switch (this.getRecordType())
            {
                case this.AUDIO_ONLY:
                    // setup microphone
                    this.mediaType = {
                        audio: (this.audioRecorderType === 'auto') ? true : this.audioRecorderType,
                        video: false
                    };
                    // remove existing microphone listeners
                    this.surfer.microphone.un('deviceReady',
                        this.deviceReadyCallback);
                    this.surfer.microphone.un('deviceError',
                        this.deviceErrorCallback);

                    // setup new microphone listeners
                    this.surfer.microphone.on('deviceReady',
                        this.deviceReadyCallback);
                    this.surfer.microphone.on('deviceError',
                        this.deviceErrorCallback);

                    // disable existing playback events
                    this.surfer.setupPlaybackEvents(false);

                    // (re)set surfer liveMode
                    this.surfer.liveMode = true;
                    this.surfer.microphone.paused = false;

                    // open browser device selection dialog
                    this.surfer.microphone.start();
                    break;

                case this.IMAGE_ONLY:
                case this.VIDEO_ONLY:
                    // setup camera
                    this.mediaType = {
                        audio: false,
                        video: (this.videoRecorderType === 'auto') ? true : this.videoRecorderType
                    };
                    navigator.mediaDevices.getUserMedia({
                        audio: false,
                        video: (this.getRecordType() === this.IMAGE_ONLY) ? this.recordImage : this.recordVideo
                    }).then(
                        this.onDeviceReady.bind(this)
                    ).catch(
                        this.onDeviceError.bind(this)
                    );
                    break;

                case this.AUDIO_VIDEO:
                    // setup camera and microphone
                    this.mediaType = {
                        audio: (this.audioRecorderType === 'auto') ? true : this.audioRecorderType,
                        video: (this.videoRecorderType === 'auto') ? true : this.videoRecorderType
                    };
                    navigator.mediaDevices.getUserMedia({
                        audio: this.recordAudio,
                        video: this.recordVideo
                    }).then(
                        this.onDeviceReady.bind(this)
                    ).catch(
                        this.onDeviceError.bind(this)
                    );
                    break;

                case this.ANIMATION:
                    // setup camera
                    this.mediaType = {
                        // animated GIF
                        audio: false,
                        video: false,
                        gif: true
                    };
                    navigator.mediaDevices.getUserMedia({
                        audio: false,
                        video: this.recordAnimation
                    }).then(
                        this.onDeviceReady.bind(this)
                    ).catch(
                        this.onDeviceError.bind(this)
                    );
                    break;
            }
        },

        /**
         * Invoked when the device is ready.
         * @private
         * @param stream: LocalMediaStream instance.
         */
        onDeviceReady: function(stream)
        {
            this._deviceActive = true;

            // store reference to stream for stopping etc.
            this.stream = stream;

            // forward to listeners
            this.player().trigger('deviceReady');

            // hide device selection button
            this.player().deviceButton.hide();

            // reset time (e.g. when stopDevice was used)
            this.setDuration(this.maxLength);
            this.setCurrentTime(0);

            // hide play/pause control (e.g. when stopDevice was used)
            this.player().controlBar.playToggle.hide();

            // reset playback listeners
            this.off(this.player(), 'timeupdate', this.playbackTimeUpdate);
            this.off(this.player(), 'pause', this.onPlayerPause);
            this.off(this.player(), 'play', this.onPlayerStart);

            // setup recording engine
            if (this.getRecordType() !== this.IMAGE_ONLY)
            {
                // currently libvorbis.js, recorder.js, opus-recorder and lamejs
                // are only supported in audio-only mode
                if (this.getRecordType() !== this.AUDIO_ONLY &&
                    (this.audioEngine === this.LIBVORBISJS ||
                     this.audioEngine === this.RECORDERJS ||
                     this.audioEngine === this.LAMEJS ||
                     this.audioEngine === this.OPUSRECORDER))
                {
                    throw new Error('Currently ' + this.audioEngine +
                        ' is only supported in audio-only mode.');
                }

                // get recorder class
                var EngineClass;
                switch (this.audioEngine)
                {
                    case this.RECORDRTC:
                        // RecordRTC.js (default)
                        EngineClass = videojs.RecordRTCEngine;
                        break;

                    case this.LIBVORBISJS:
                        // libvorbis.js
                        EngineClass = videojs.LibVorbisEngine;
                        break;

                    case this.RECORDERJS:
                        // recorder.js
                        EngineClass = videojs.RecorderjsEngine;
                        break;

                    case this.LAMEJS:
                        // lamejs
                        EngineClass = videojs.LamejsEngine;
                        break;

                    case this.OPUSRECORDER:
                        // opus-recorder
                        EngineClass = videojs.OpusRecorderEngine;
                        break;

                    default:
                        // unknown engine
                        throw new Error('Unknown audioEngine: ' + this.audioEngine);
                }
                try
                {
                    // connect stream to recording engine
                    this.engine = new EngineClass(this.player());
                }
                catch (err)
                {
                    throw new Error('Could not load ' + this.audioEngine +
                        ' plugin');
                }

                // listen for events
                this.engine.on('recordComplete', this.engineStopCallback);

                // audio settings
                this.engine.bufferSize = this.audioBufferSize;
                this.engine.sampleRate = this.audioSampleRate;
                this.engine.audioChannels = this.audioChannels;
                this.engine.audioWorkerURL = this.audioWorkerURL;

                // mime type
                this.engine.mimeType = {
                    video: this.videoMimeType,
                    gif: 'image/gif'
                };
                if (this.audioMimeType !== null &&
                    this.audioMimeType !== 'auto')
                {
                    this.engine.mimeType.audio = this.audioMimeType;
                }

                // video/canvas settings
                this.engine.video = {
                    width: this.videoFrameWidth,
                    height: this.videoFrameHeight
                };
                this.engine.canvas = {
                    width: this.videoFrameWidth,
                    height: this.videoFrameHeight
                };

                // animated GIF settings
                this.engine.quality = this.animationQuality;
                this.engine.frameRate = this.animationFrameRate;

                // initialize recorder
                this.engine.setup(this.stream, this.mediaType, this.debug);

                // show elements that should never be hidden in animation,
                // audio and/or video modus
                var element;
                var uiElements = [this.player().controlBar.currentTimeDisplay,
                                  this.player().controlBar.timeDivider,
                                  this.player().controlBar.durationDisplay];
                for (element in uiElements)
                {
                    uiElements[element].el().style.display = 'block';
                    uiElements[element].show();
                }

                // show record button
                this.player().recordToggle.show();
            }
            else
            {
                // disable record indicator
                this.player().recordIndicator.disable();

                // setup UI for retrying snapshot (e.g. when stopDevice was
                // used)
                this.retrySnapshot();

                // reset and show camera button
                this.player().cameraButton.onStop();
                this.player().cameraButton.show();
            }

            // setup preview
            if (this.getRecordType() !== this.AUDIO_ONLY)
            {
                // show live preview
                this.mediaElement = this.player().el().firstChild;
                this.mediaElement.controls = false;

                // mute incoming audio for feedback loops
                this.mediaElement.muted = true;

                // hide the volume bar while it's muted
                this.displayVolumeControl(false);

                // start stream
                if (this.streamURL !== undefined)
                {
                    URL.revokeObjectURL(this.streamURL);
                }
                this.streamURL = URL.createObjectURL(this.stream);
                this.load(this.streamURL);
                this.mediaElement.play();
            }
        },

        /**
         * Invoked when an device error occurred.
         * @private
         */
        onDeviceError: function(code)
        {
            this._deviceActive = false;

            // store code
            this.player().deviceErrorCode = code;

            // forward error to player
            this.player().trigger('deviceError');
        },

        /**
         * Start recording.
         */
        start: function()
        {
            if (!this.isProcessing())
            {
                this._recording = true;

                // hide play control
                this.player().controlBar.playToggle.hide();

                // setup preview engine
                switch (this.getRecordType())
                {
                    case this.AUDIO_ONLY:
                        // disable playback events
                        this.surfer.setupPlaybackEvents(false);

                        // hide playhead
                        // backwards compat (fixed since wavesurfer 1.0.25)
                        this.playhead.style.display = 'none';

                        // start/resume live audio visualization
                        this.surfer.microphone.paused = false;
                        this.surfer.liveMode = true;
                        this.player().play();
                        break;

                    case this.VIDEO_ONLY:
                    case this.AUDIO_VIDEO:
                        this.startVideoPreview();
                        break;

                    case this.ANIMATION:
                        // hide the first frame
                        this.player().recordCanvas.hide();

                        // hide the animation
                        this.player().animationDisplay.hide();

                        // show preview video
                        this.mediaElement.style.display = 'block';

                        // for animations, capture the first frame
                        // that can be displayed as soon as recording
                        // is complete
                        this.captureFrame();

                        // start video preview **after** capturing first frame
                        this.startVideoPreview();
                        break;
                }

                // start recording
                if (this.getRecordType() !== this.IMAGE_ONLY)
                {
                    // start countdown
                    this.startTime = new Date().getTime();
                    this.countDown = this.setInterval(
                        this.onCountDown.bind(this), 100);

                    // cleanup previous recording
                    if (this.engine !== undefined)
                    {
                        this.engine.dispose();
                    }

                    // start recording stream
                    this.engine.start();
                }
                else
                {
                    // create snapshot
                    this.createSnapshot();
                }

                // notify UI
                this.player().trigger('startRecord');
            }
        },

        /**
         * Stop recording.
         */
        stop: function()
        {
            if (!this.isProcessing())
            {
                this._recording = false;
                this._processing = true;

                // notify UI
                this.player().trigger('stopRecord');

                if (this.getRecordType() !== this.IMAGE_ONLY)
                {
                    // stop countdown
                    this.clearInterval(this.countDown);

                    // stop recording stream (result will be available async)
                    if (this.engine)
                    {
                        this.engine.stop();
                    }
                }
                else
                {
                    if (this.player().recordedData)
                    {
                        // notify listeners that image data is (already) available
                        this.player().trigger('finishRecord');
                    }
                }
            }
        },

        /**
         * Stop device(s) and recording if active.
         */
        stopDevice: function()
        {
            if (this.isRecording())
            {
                // stop stream once recorded data is available,
                // otherwise it'll break recording
                this.player().one('finishRecord', this.stopStream.bind(this));

                // stop recording
                this.stop();
            }
            else
            {
                // stop stream now, since there's no recorded data available
                this.stopStream();
            }
        },

        /**
         * Stop stream and device.
         */
        stopStream: function()
        {
            // stop stream and device
            if (this.stream)
            {
                this._deviceActive = false;

                if (this.getRecordType() === this.AUDIO_ONLY)
                {
                    // make the microphone plugin stop it's device
                    this.surfer.microphone.stopDevice();
                    return;
                }
                // MediaStream.stop is deprecated since:
                // - Chrome 45 (https://developers.google.com/web/updates/2015/07/mediastream-deprecations)
                // - Firefox 44 (https://www.fxsitecompat.com/en-US/docs/2015/mediastream-stop-has-been-deprecated/,
                //   https://bugzilla.mozilla.org/show_bug.cgi?id=1103188#c106 and
                //   https://bugzilla.mozilla.org/show_bug.cgi?id=1192170)
                var result = this.detectBrowser();
                if ((result.browser === 'chrome' && result.version >= 45) ||
                    (result.browser === 'firefox' && result.version >= 44) ||
                    (result.browser === 'edge'))
                {
                    switch (this.getRecordType())
                    {
                        case this.VIDEO_ONLY:
                        case this.ANIMATION:
                        case this.IMAGE_ONLY:
                        case this.AUDIO_VIDEO:
                            this.stream.getTracks().forEach(function(stream)
                            {
                                stream.stop();
                            });
                            break;
                    }
                    return;
                }
                // fallback for older browsers
                this.stream.stop();
            }
        },

        /**
         * Invoked when recording completed and the resulting stream is
         * available.
         * @private
         */
        onRecordComplete: function()
        {
            // store reference to recorded stream URL
            this.mediaURL = this.engine.mediaURL;

            // store reference to recorded stream data
            switch (this.getRecordType())
            {
                case this.AUDIO_ONLY:
                    // show play control
                    this.player().controlBar.playToggle.show();

                    // store recorded data
                    this.player().recordedData = this.engine.recordedData;

                    // notify listeners that data is available
                    this.player().trigger('finishRecord');

                    // Pausing the player so we can visualize the recorded data
                    // will trigger an async video.js 'pause' event that we
                    // have to wait for.
                    this.player().one('pause', function()
                    {
                        // setup events during playback
                        this.surfer.setupPlaybackEvents(true);

                        // display loader
                        this.player().loadingSpinner.show();

                        // show playhead
                        this.playhead.style.display = 'block';

                        // restore interaction with controls after waveform
                        // rendering is complete
                        this.surfer.surfer.once('ready', function()
                        {
                            this._processing = false;
                        }.bind(this));

                        // visualize recorded stream
                        this.load(this.player().recordedData);
                    }.bind(this));

                    // pause player so user can start playback
                    this.player().pause();
                    break;

                case this.VIDEO_ONLY:
                case this.AUDIO_VIDEO:
                    // show play control
                    this.player().controlBar.playToggle.show();

                    // store recorded data (video-only or firefox audio+video)
                    this.player().recordedData = this.engine.recordedData;

                    // notify listeners that data is available
                    this.player().trigger('finishRecord');

                    // remove previous listeners
                    this.off(this.player(), 'pause', this.onPlayerPause);
                    this.off(this.player(), 'play', this.onPlayerStart);

                    // pausing the player so we can visualize the recorded data
                    // will trigger an async video.js 'pause' event that we
                    // have to wait for.
                    this.player().one('pause', function()
                    {
                        // video data is ready
                        this._processing = false;

                        // hide loader
                        this.player().loadingSpinner.hide();

                        // show stream total duration
                        this.setDuration(this.streamDuration);

                        // update time during playback
                        this.on(this.player(), 'timeupdate',
                            this.playbackTimeUpdate);

                        // because there are 2 separate data streams for audio
                        // and video in the Chrome browser, playback the audio
                        // stream in a new extra audio element and the video
                        // stream in the regular video.js player.
                        if (this.getRecordType() === this.AUDIO_VIDEO &&
                            this.isChrome() && this.player().recordedData.audio)
                        {
                            if (this.extraAudio === undefined)
                            {
                                this.extraAudio = this.createEl('audio');
                                this.extraAudio.id = 'extraAudio';

                                // handle volume changes in extra audio
                                // for chrome
                                this.player().on('volumechange',
                                    this.onVolumeChange.bind(this));
                            }
                            if (this.extraAudioURL !== undefined)
                            {
                                URL.revokeObjectURL(this.extraAudioURL);
                            }
                            this.extraAudioURL = URL.createObjectURL(
                                this.player().recordedData.audio);
                            this.extraAudio.src = this.extraAudioURL;

                            // pause extra audio when player pauses
                            this.on(this.player(), 'pause',
                                this.onPlayerPause);
                        }

                        // workaround some browser issues when player starts
                        this.on(this.player(), 'play', this.onPlayerStart);

                        // unmute local audio during playback
                        if (this.getRecordType() === this.AUDIO_VIDEO)
                        {
                            this.mediaElement.muted = false;

                            // show the volume bar when it's unmuted
                            this.displayVolumeControl(true);
                        }

                        // load recorded media
                        this.load(this.mediaURL);
                    }.bind(this));

                    // pause player so user can start playback
                    this.player().pause();
                    break;

                case this.ANIMATION:
                    // show play control
                    this.player().controlBar.playToggle.show();

                    // store recorded data
                    this.player().recordedData = this.engine.recordedData;

                    // notify listeners that data is available
                    this.player().trigger('finishRecord');

                    // animation data is ready
                    this._processing = false;

                    // hide loader
                    this.player().loadingSpinner.hide();

                    // show animation total duration
                    this.setDuration(this.streamDuration);

                    // hide preview video
                    this.mediaElement.style.display = 'none';

                    // show the first frame
                    this.player().recordCanvas.show();

                    // pause player so user can start playback
                    this.player().pause();

                    // show animation on play
                    this.on(this.player(), 'play', this.showAnimation);

                    // hide animation on pause
                    this.on(this.player(), 'pause', this.hideAnimation);
                    break;
            }
        },

        /**
         * Fired when the volume in the temporary audio element
         * for Chrome in audio+video mode is present.
         * @private
         */
        onVolumeChange: function()
        {
            var volume = this.player().volume();
            if (this.player().muted())
            {
                // muted volume
                volume = 0;
            }

            if (this.extraAudio !== undefined)
            {
                this.extraAudio.volume = volume;
            }
        },

        /**
         * Invoked during recording and displays the remaining time.
         * @private
         */
        onCountDown: function()
        {
            var currentTime = (new Date().getTime() - this.startTime) / 1000;
            var duration = this.maxLength;

            this.streamDuration = currentTime;

            if (currentTime >= duration)
            {
                // at the end
                currentTime = duration;

                // stop recording
                this.stop();
            }

            // update duration
            this.setDuration(duration);

            // update current time
            this.setCurrentTime(currentTime, duration);
        },

        /**
         * Updates the player's element displaying the current time.
         *
         * @private
         * @param {number} [currentTime=0] - Current position of the
         *    playhead (in seconds).
         * @param {number} [duration=0] - Duration in seconds.
         */
        setCurrentTime: function(currentTime, duration)
        {
            currentTime = isNaN(currentTime) ? 0 : currentTime;
            duration = isNaN(duration) ? 0 : duration;

            switch (this.getRecordType())
            {
                case this.AUDIO_ONLY:
                    this.surfer.setCurrentTime(currentTime, duration);
                    break;

                case this.VIDEO_ONLY:
                case this.AUDIO_VIDEO:
                case this.ANIMATION:
                    var time = Math.min(currentTime, duration);

                    // update control
                    this.player().controlBar.currentTimeDisplay.el(
                        ).firstChild.innerHTML = this.formatTime(
                        time, duration);
                    break;
            }
        },

        /**
         * Updates the player's element displaying the duration time.
         *
         * @private
         * @param {number} [duration=0] - Duration in seconds.
         */
        setDuration: function(duration)
        {
            duration = isNaN(duration) ? 0 : duration;

            switch (this.getRecordType())
            {
                case this.AUDIO_ONLY:
                    this.surfer.setDuration(duration);
                    break;

                case this.VIDEO_ONLY:
                case this.AUDIO_VIDEO:
                case this.ANIMATION:
                    // update control
                    this.player().controlBar.durationDisplay.el(
                        ).firstChild.innerHTML = this.formatTime(
                        duration, duration);
                    break;
            }
        },

        /**
         * Start loading data.
         *
         * @param {(string|blob|file)} url - Either the URL of the media file,
         *     a Blob or a File object.
         */
        load: function(url)
        {
            switch (this.getRecordType())
            {
                case this.AUDIO_ONLY:
                    // visualize recorded stream
                    this.surfer.load(url);
                    break;

                case this.IMAGE_ONLY:
                case this.VIDEO_ONLY:
                case this.AUDIO_VIDEO:
                case this.ANIMATION:
                    // assign stream to audio/video element source
                    this.mediaElement.src = url;
                    break;
            }
        },

        /**
         * Destroy plugin and players and cleanup resources.
         */
        destroy: function()
        {
            // prevent callbacks if recording is in progress
            if (this.engine)
            {
                this.engine.dispose();
                this.engine.off('recordComplete', this.engineStopCallback);
            }

            // stop recording and device
            this.stop();
            this.stopDevice();

            // stop countdown
            this.clearInterval(this.countDown);

            // dispose player
            switch (this.getRecordType())
            {
                case this.AUDIO_ONLY:
                    if (this.surfer)
                    {
                        // also disposes player
                        this.surfer.destroy();
                    }
                    break;

                case this.IMAGE_ONLY:
                case this.VIDEO_ONLY:
                case this.AUDIO_VIDEO:
                case this.ANIMATION:
                    this.player().dispose();
                    break;
            }

            this.resetState();
        },

        /**
         * Reset the plugin.
         */
        reset: function()
        {
            // prevent callbacks if recording is in progress
            if (this.engine)
            {
                this.engine.dispose();
                this.engine.off('recordComplete', this.engineStopCallback);
            }

            // stop recording and device
            this.stop();
            this.stopDevice();

            // stop countdown
            this.clearInterval(this.countDown);

            // reset options
            this.loadOptions();

            // reset recorder state
            this.resetState();

            // reset record time
            this.setDuration(this.maxLength);
            this.setCurrentTime(0);

            // reset player
            this.player().reset();
            switch (this.getRecordType())
            {
                case this.AUDIO_ONLY:
                    if (this.surfer && this.surfer.surfer)
                    {
                        // empty last frame
                        this.surfer.surfer.empty();
                    }
                    break;

                case this.IMAGE_ONLY:
                case this.ANIMATION:
                    // reset UI
                    this.player().recordCanvas.hide();
                    this.player().cameraButton.hide();
                    break;
            }

            // hide play control
            this.player().controlBar.playToggle.hide();

            // show device selection button
            this.player().deviceButton.show();

            // hide record button
            this.player().recordToggle.hide();

            // loadedmetadata resets the durationDisplay for the
            // first time
            this.player().one('loadedmetadata', function()
            {
                // display max record time
                this.setDuration(this.maxLength);
            }.bind(this));
        },

        /**
         * Reset the plugin recorder state.
         * @private
         */
        resetState: function()
        {
            this._recording = false;
            this._processing = false;
            this._deviceActive = false;
            this.devices = [];
        },

        /**
         * Get recorder type.
         */
        getRecordType: function()
        {
            if (this.isModeEnabled(this.recordImage))
            {
                return this.IMAGE_ONLY;
            }
            else if (this.isModeEnabled(this.recordAnimation))
            {
                return this.ANIMATION;
            }
            else if (this.isModeEnabled(this.recordAudio) && !this.isModeEnabled(
                this.recordVideo))
            {
                return this.AUDIO_ONLY;
            }
            else if (this.isModeEnabled(this.recordAudio) && this.isModeEnabled(
                this.recordVideo))
            {
                return this.AUDIO_VIDEO;
            }
            else if (!this.isModeEnabled(this.recordAudio) && this.isModeEnabled(
                this.recordVideo))
            {
                return this.VIDEO_ONLY;
            }
        },

        /**
         * Create and display snapshot image.
         * @private
         */
        createSnapshot: function()
        {
            var recordCanvas = this.captureFrame();

            // turn the canvas data into base-64 data with a PNG header
            this.player().recordedData = recordCanvas.toDataURL('image/png');

            // hide preview video
            this.mediaElement.style.display = 'none';

            // show the snapshot
            this.player().recordCanvas.show();

            // stop recording
            this.stop();
        },

        /**
         * Reset UI for retrying a snapshot image.
         * @private
         */
        retrySnapshot: function()
        {
            this._processing = false;

            // retry: hide the snapshot
            this.player().recordCanvas.hide();

            // show preview video
            this.player().el().firstChild.style.display = 'block';
        },

        /**
         * Capture frame from camera and copy data to canvas.
         * @private
         */
        captureFrame: function()
        {
            var recordCanvas = this.player().recordCanvas.el().firstChild;

            // set the canvas size to the dimensions of the camera,
            // which also wipes the content of the canvas
            recordCanvas.width = this.player().width();
            recordCanvas.height = this.player().height();

            // get a frame of the stream and copy it onto the canvas
            recordCanvas.getContext('2d').drawImage(
                this.mediaElement, 0, 0,
                recordCanvas.width,
                recordCanvas.height
            );

            return recordCanvas;
        },

        /**
         * Start preview of video stream.
         * @private
         */
        startVideoPreview: function()
        {
            // disable playback events
            this.off('timeupdate');
            this.off('play');

            // mute local audio
            this.mediaElement.muted = true;

            // hide volume control to prevent feedback
            this.displayVolumeControl(false);

            // start or resume live preview
            if (this.streamURL !== undefined)
            {
                URL.revokeObjectURL(this.streamURL);
            }
            this.streamURL = URL.createObjectURL(this.stream);
            this.load(this.streamURL);
            this.mediaElement.play();
        },

        /**
         * Show animated GIF.
         * @private
         */
        showAnimation: function()
        {
            var animationDisplay = this.player().animationDisplay.el().firstChild;

            // set the image size to the dimensions of the recorded animation
            animationDisplay.width = this.player().width();
            animationDisplay.height = this.player().height();

            // hide the first frame
            this.player().recordCanvas.hide();

            // show the animation
            animationDisplay.src = this.mediaURL;
            this.player().animationDisplay.show();
        },

        /**
         * Hide animated GIF.
         * @private
         */
        hideAnimation: function()
        {
            // show the first frame
            this.player().recordCanvas.show();

            // hide the animation
            this.player().animationDisplay.hide();
        },

        /**
         * Player started playback.
         * @private
         */
        onPlayerStart: function()
        {
            // workaround Firefox issue
            if (this.player().seeking())
            {
                // There seems to be a Firefox issue
                // with playing back blobs. The ugly,
                // but functional workaround, is to
                // simply reset the source. See
                // https://bugzilla.mozilla.org/show_bug.cgi?id=969290
                this.load(this.mediaURL);
                this.player().play();
            }

            // workaround chrome issue
            if (this.getRecordType() === this.AUDIO_VIDEO &&
                this.isChrome() && !this._recording && this.extraAudio !== undefined)
            {
                // sync extra audio playhead position with video.js player
                this.extraAudio.currentTime = this.player().currentTime();
                this.extraAudio.play();
            }
        },

        /**
         * Player is paused.
         * @private
         */
        onPlayerPause: function()
        {
            // pause extra audio when video.js player pauses
            if (this.extraAudio !== undefined)
            {
                this.extraAudio.pause();
            }
        },

        /**
         * Update time during playback.
         * @private
         */
        playbackTimeUpdate: function()
        {
            this.setCurrentTime(this.player().currentTime(),
                this.streamDuration);
        },

        /**
         * Collects information about the media input and output devices
         * available on the system.
         *
         * Returns an array.
         */
        enumerateDevices: function()
        {
            var self = this;
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices)
            {
                self.player().enumerateErrorCode = 'enumerateDevices() not supported.';
                self.player().trigger('enumerateError');
                return;
            }

            // List cameras and microphones.
            navigator.mediaDevices.enumerateDevices(this).then(function(devices)
            {
                self.devices = [];
                devices.forEach(function(device)
                {
                    self.devices.push(device);
                });

                // notify listeners
                self.player().trigger('enumerateReady');
            }).catch(function(err)
            {
                self.player().enumerateErrorCode = err;
                self.player().trigger('enumerateError');
            });
        },

        /**
         * Show or hide the volume menu.
         *
         * @private
         * @param {boolean} display - Hide/show volume control.
         */
        displayVolumeControl: function(display)
        {
            if (this.player().controlBar.volumeMenuButton !== undefined)
            {
                if (display === true)
                {
                    display = 'block';
                }
                else
                {
                    display = 'none';
                }
                this.player().controlBar.volumeMenuButton.el().style.display = display;
            }
        },

        /**
         * Format seconds as a time string, H:MM:SS, M:SS or M:SS:MMM.
         *
         * Supplying a guide (in seconds) will force a number of leading zeros
         * to cover the length of the guide.
         *
         * @param {number} seconds - Number of seconds to be turned into a
         *     string.
         * @param {number} guide - Number (in seconds) to model the string
         *     after.
         * @return {string} Time formatted as H:MM:SS, M:SS or M:SS:MMM, e.g.
         *     0:00:12.
         * @private
         */
        formatTime: function(seconds, guide)
        {
            // Default to using seconds as guide
            seconds = seconds < 0 ? 0 : seconds;
            guide = guide || seconds;
            var s = Math.floor(seconds % 60),
                m = Math.floor(seconds / 60 % 60),
                h = Math.floor(seconds / 3600),
                gm = Math.floor(guide / 60 % 60),
                gh = Math.floor(guide / 3600),
                ms = Math.floor((seconds - s) * 1000);

            // Handle invalid times
            if (isNaN(seconds) || seconds === Infinity)
            {
                // '-' is false for all relational operators (e.g. <, >=) so this
                // setting will add the minimum number of fields specified by the
                // guide
                h = m = s = ms = '-';
            }

            // Check if we need to show milliseconds
            if (guide > 0 && guide < this.msDisplayMax)
            {
                if (ms < 100)
                {
                    if (ms < 10)
                    {
                        ms = '00' + ms;
                    }
                    else
                    {
                        ms = '0' + ms;
                    }
                }
                ms = ':' + ms;
            }
            else
            {
                ms = '';
            }

            // Check if we need to show hours
            h = (h > 0 || gh > 0) ? h + ':' : '';

            // If hours are showing, we may need to add a leading zero.
            // Always show at least one digit of minutes.
            m = ((h && m < 10) ? '0' + m : m) + ':';

            // Check if leading zero is need for seconds
            s = ((s < 10) ? '0' + s : s);

            return h + m + s + ms;
        },

        /**
         * Return boolean indicating whether mode is enabled or not.
        */
        isModeEnabled: function(mode)
        {
            return mode === Object(mode) || mode === true;
        }

    });

    var RecordToggle, CameraButton, DeviceButton, RecordIndicator, RecordCanvas,
        AnimationDisplay;

    /**
     * Button to toggle between start and stop recording.
     * @private
     * @class
     * @augments videojs.Button
    */
    RecordToggle = videojs.extend(VjsButton,
    {
        /** @constructor */
        constructor: function(player, options)
        {
            VjsButton.call(this, player, options);

            this.on('click', this.onClick);
            this.on('tap', this.onClick);
            this.on(player, 'startRecord', this.onStart);
            this.on(player, 'stopRecord', this.onStop);
        }
    });
    RecordToggle.prototype.onClick = function(e)
    {
        // stop this event before it bubbles up
        e.stopImmediatePropagation();

        var recorder = this.player().recorder;

        if (!recorder.isRecording())
        {
            recorder.start();
        }
        else
        {
            recorder.stop();
        }
    };
    RecordToggle.prototype.onStart = function()
    {
        // replace element class so it can change appearance
        this.removeClass('vjs-icon-record-start');
        this.addClass('vjs-icon-record-stop');

        // update label
        this.el().firstChild.firstChild.innerHTML = this.localize('Stop');
    };
    RecordToggle.prototype.onStop = function()
    {
        // replace element class so it can change appearance
        this.removeClass('vjs-icon-record-stop');
        this.addClass('vjs-icon-record-start');

        // update label
        this.el().firstChild.firstChild.innerHTML = this.localize('Record');
    };

    /**
     * Button to toggle between create and retry snapshot image.
     * @private
     * @class
     * @augments videojs.Button
    */
    CameraButton = videojs.extend(VjsButton,
    {
        /** @constructor */
        constructor: function(player, options)
        {
            VjsButton.call(this, player, options);

            this.on('click', this.onClick);
            this.on('tap', this.onClick);
            this.on(player, 'startRecord', this.onStart);
            this.on(player, 'stopRecord', this.onStop);
        }
    });
    CameraButton.prototype.onClick = function(e)
    {
        // stop this event before it bubbles up
        e.stopImmediatePropagation();

        var recorder = this.player().recorder;

        if (!recorder.isProcessing())
        {
            // create snapshot
            recorder.start();
        }
        else
        {
            // retry
            recorder.retrySnapshot();

            // reset camera button
            this.onStop();
        }
    };
    CameraButton.prototype.onStart = function()
    {
        // replace element class so it can change appearance
        this.removeClass('vjs-icon-photo-camera');
        this.addClass('vjs-icon-photo-retry');

        // update label
        this.el().firstChild.firstChild.innerHTML = this.localize('Retry');
    };
    CameraButton.prototype.onStop = function()
    {
        // replace element class so it can change appearance
        this.removeClass('vjs-icon-photo-retry');
        this.addClass('vjs-icon-photo-camera');

        // update label
        this.el().firstChild.firstChild.innerHTML = this.localize('Image');
    };

    /**
     * Button to select recording device.
     * @private
     * @class
     * @augments videojs.Button
    */
    DeviceButton = videojs.extend(VjsButton,
    {
        /** @constructor */
        constructor: function(player, options)
        {
            VjsButton.call(this, player, options);

            this.on('click', this.onClick);
            this.on('tap', this.onClick);
        }
    });
    DeviceButton.prototype.onClick = function(e)
    {
        // stop this event before it bubbles up
        e.stopImmediatePropagation();

        // open device dialog
        this.player().recorder.getDevice();
    };

    /**
     * Icon indicating recording is active.
     * @private
     * @class
     * @augments videojs.Component
    */
    RecordIndicator = videojs.extend(VjsComponent,
    {
        /** @constructor */
        constructor: function(player, options)
        {
            VjsComponent.call(this, player, options);

            this.on(player, 'startRecord', this.show);
            this.on(player, 'stopRecord', this.hide);
        }
    });
    RecordIndicator.prototype.disable = function()
    {
        // disable record indicator event handlers
        this.off(this.player(), 'startRecord', this.show);
        this.off(this.player(), 'stopRecord', this.hide);
    };

    /**
     * Canvas for displaying snapshot image.
     * @private
     * @class
     * @augments videojs.Component
    */
    RecordCanvas = videojs.extend(VjsComponent);

    /**
     * Image for displaying animated GIF image.
     * @private
     * @class
     * @augments videojs.Component
    */
    AnimationDisplay = videojs.extend(VjsComponent);

    /**
     * Create a custom button.
     * @private
     * @param {string} className - Class name for the new button.
     * @param {string} label - Label for the new button.
     * @param {string} iconName - Icon for the new button.
     */
    var createButton = function(className, label, iconName)
    {
        var props = {
            className: 'vjs-' + className + '-button vjs-control vjs-icon-' + iconName,
            innerHTML: '<div class="vjs-control-content"><span class="vjs-control-text">' +
                label + '</span></div>',
        };
        var attrs = {
            role: 'button',
            'aria-live': 'polite', // let the screen reader user know that the text of the button may change
            tabIndex: 0
        };
        return VjsComponent.prototype.createEl('div', props, attrs);
    };

    var createPlugin = function()
    {
        var props = {
            className: 'vjs-record',
        };
        var attrs = {
            tabIndex: 0
        };
        return VjsComponent.prototype.createEl('div', props, attrs);
    };

    // plugin defaults
    var defaults = {
        // Single snapshot image.
        image: false,
        // Include audio in the recorded clip.
        audio: false,
        // Include video in the recorded clip.
        video: false,
        // Animated GIF.
        animation: false,
        // Maximum length of the recorded clip.
        maxLength: 10,
        // Width of the recorded video frames.
        frameWidth: 320,
        // Height of the recorded video frames.
        frameHeight: 240,
        // Enables console logging for debugging purposes.
        debug: false,
        // The mime type for the video recorder. Default to 'video/webm'.
        // Use 'video/mp4' (Firefox) or 'video/webm;codecs=H264' (Chrome 52 and
        // newer) for MP4.
        videoMimeType: 'video/webm',
        // Video recorder type to use. This allows you to specify an alternative
        // recorder class, e.g. WhammyRecorder. Defaults to 'auto' which let's
        // recordrtc specify the best available recorder type.
        videoRecorderType: 'auto',
        // Audio recording library to use. Legal values are 'recordrtc',
        // 'libvorbis.js', 'opus-recorder', 'lamejs' and 'recorder.js'.
        audioEngine: 'recordrtc',
        // Audio recorder type to use. This allows you to specify an alternative
        // recorder class, e.g. StereoAudioRecorder. Defaults to 'auto' which let's
        // recordrtc specify the best available recorder type. Currently this
        // setting is only used with the 'recordrtc' audioEngine.
        audioRecorderType: 'auto',
        // The mime type for the audio recorder. Defaults to 'auto' which will pick
        // the best option available in the browser (e.g. either 'audio/wav',
        // 'audio/ogg' or 'audio/webm').
        audioMimeType: 'auto',
        // The size of the audio buffer (in sample-frames) which needs to
        // be processed each time onprocessaudio is called.
        // From the spec: This value controls how frequently the audioprocess event is
        // dispatched and how many sample-frames need to be processed each call.
        // Lower values for buffer size will result in a lower (better) latency.
        // Higher values will be necessary to avoid audio breakup and glitches.
        // Legal values are 256, 512, 1024, 2048, 4096, 8192 or 16384.
        audioBufferSize: 4096,
        // The audio sample rate (in sample-frames per second) at which the
        // AudioContext handles audio. It is assumed that all AudioNodes
        // in the context run at this rate. In making this assumption,
        // sample-rate converters or "varispeed" processors are not supported
        // in real-time processing.
        // The sampleRate parameter describes the sample-rate of the
        // linear PCM audio data in the buffer in sample-frames per second.
        // An implementation must support sample-rates in at least
        // the range 22050 to 96000.
        audioSampleRate: 44100,
        // Allows you to record single-channel audio, which can reduce the
        // filesize.
        audioChannels: 2,
        // URL for the audio worker.
        audioWorkerURL: '',
        // Frame rate in frames per second.
        animationFrameRate: 200,
        // Sets quality of color quantization (conversion of images to the
        // maximum 256 colors allowed by the GIF specification).
        // Lower values (minimum = 1) produce better colors,
        // but slow processing significantly. 10 is the default,
        // and produces good color mapping at reasonable speeds.
        // Values greater than 20 do not yield significant improvements
        // in speed.
        animationQuality: 10
    };
	/**
	 * Initialize the plugin.
	 *
	 * @param {object} [options] - Configuration for the plugin.
	 * @private
	 */

	var settings = videojs.mergeOptions(defaults, options);
	var player = this;

	// create recorder
	player.recorder = new videojs.Recorder(player, {
		'el': createPlugin(),
		'options': settings
	});
	player.addChild(player.recorder);

	// add device button
	player.deviceButton = new DeviceButton(player, {
		'el': createButton('device', player.localize('Device'),
			'device-perm')
	});
	player.recorder.addChild(player.deviceButton);

	// add record indicator
	player.recordIndicator = new RecordIndicator(player, {
		'el': VjsComponent.prototype.createEl('div', {
			className: 'vjs-record-indicator vjs-control'
		})
	});
	player.recordIndicator.hide();
	player.recorder.addChild(player.recordIndicator);

	// add canvas for recording and displaying image
	player.recordCanvas = new RecordCanvas(player, {
		'el': VjsComponent.prototype.createEl('div', {
			className: 'vjs-record-canvas',
			innerHTML: '<canvas></canvas>'
		})
	});
	player.recordCanvas.hide();
	player.recorder.addChild(player.recordCanvas);

	// add image for animation display
	player.animationDisplay = new AnimationDisplay(player, {
		'el': VjsComponent.prototype.createEl('div', {
			className: 'vjs-animation-display',
			innerHTML: '<img />'
		})
	});
	player.animationDisplay.hide();
	player.recorder.addChild(player.animationDisplay);

	// add camera button
	player.cameraButton = new CameraButton(player, {
		'el': createButton('camera', player.localize('Image'),
			'photo-camera')
	});
	player.cameraButton.hide();

	// add record toggle
	player.recordToggle = new RecordToggle(player, {
		'el': createButton('record', player.localize('Record'),
			'record-start')
	});
	player.recordToggle.hide();
};

// Register the plugin with video.js.
videojs.plugin('open', open);
videojs.plugin('videoJsResolutionSwitcher', videoJsResolutionSwitcher);
videojs.plugin('disableProgress', disableProgress);
videojs.plugin('markers', markers);
videojs.plugin('waterMark', waterMark);
videojs.plugin('record', record);

// Include the version number.
open.VERSION = '__VERSION__';

export default open;
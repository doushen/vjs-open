'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _videoJs = require('video.js');

var _videoJs2 = _interopRequireDefault(_videoJs);

// Default options for the plugin.
var defaults = {};

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
var onPlayerReady = function onPlayerReady(player, options) {
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
var open = function open(options) {
	var _this = this;

	this.ready(function () {
		onPlayerReady(_this, _videoJs2['default'].mergeOptions(defaults, options));
	});
};

/**
 * 分辨率
 * @param {[type]} options [description]
 * return {[type]}  [description]
 */
var videoJsResolutionSwitcher = function videoJsResolutionSwitcher(options) {

	/**
  * Initialize the plugin.
  * @param {object} [options] configuration for the plugin
  */

	var settings = _videoJs2['default'].mergeOptions(defaults, options),
	    player = this,
	    groupedSrc = {},
	    currentSources = {},
	    currentResolutionState = {};

	/**
  * Updates player sources or returns current source URL
  * @param   {Array}  [src] array of sources [{src: '', type: '', label: '', res: ''}]
  * @returns {Object|String|Array} videojs player object if used as setter or current source URL, object, or array of sources
  */
	player.updateSrc = function (src) {
		//Return current src if src is not given
		if (!src) {
			return player.src();
		}

		// Only add those sources which we can (maybe) play
		src = src.filter(function (source) {
			try {
				return player.canPlayType(source.type) !== '';
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
	player.currentResolution = function (label, customSourcePicker) {
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
		player.setSourcesSanitized(sources, label, customSourcePicker || settings.customSourcePicker).one(handleSeekEvent, function () {
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
	player.getGroupedSrc = function () {
		return this.groupedSrc;
	};
	player.setSourcesSanitized = function (sources, label, customSourcePicker) {
		this.currentResolutionState = {
			label: label,
			sources: sources
		};

		if (typeof customSourcePicker === 'function') {
			return customSourcePicker(player, sources, label);
		}
		player.src(sources.map(function (src) {
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
		return +b.res - +a.res;
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
		src.map(function (source) {
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
		var _customSourcePicker = function _customSourcePicker(_player, _sources, _label) {
			// Note that setPlayebackQuality is a suggestion. YT does not always obey it.
			player.tech_.ytPlayer.setPlaybackQuality(_sources[0]._yt);
			player.trigger('updateSources');
			return player;
		};
		settings.customSourcePicker = _customSourcePicker;

		// Init resolution
		player.tech_.ytPlayer.setPlaybackQuality('auto');

		// This is triggered when the resolution actually changes
		player.tech_.ytPlayer.addEventListener('onPlaybackQualityChange', function (event) {
			for (var res in _yts) {
				if (res.yt === event.data) {
					player.currentResolution(res.label, _customSourcePicker);
					return;
				}
			}
		});

		// We must wait for play event
		player.one('play', function () {
			var qualities = player.tech_.ytPlayer.getAvailableQualityLevels();
			var _sources = [];

			qualities.map(function (q) {
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

	player.ready(function () {
		if (settings.ui) {
			var menuButton = new ResolutionMenuButton(player, settings);
			player.controlBar.resolutionSwitcher = player.controlBar.el_.insertBefore(menuButton.el_, player.controlBar.getChild('fullscreenToggle').el_);
			player.controlBar.resolutionSwitcher.dispose = function () {
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
	var MenuItem = _videoJs2['default'].getComponent('MenuItem');
	var ResolutionMenuItem = _videoJs2['default'].extend(MenuItem, {
		constructor: function constructor(player, options) {
			options.selectable = true;
			// Sets this.player_, this.options_ and initializes the component
			MenuItem.call(this, player, options);
			this.src = options.src;

			player.on('resolutionchange', _videoJs2['default'].bind(this, this.update));
		}
	});
	ResolutionMenuItem.prototype.handleClick = function (event) {
		MenuItem.prototype.handleClick.call(this, event);
		this.player_.currentResolution(this.options_.label);
	};
	ResolutionMenuItem.prototype.update = function () {
		var selection = this.player_.currentResolution();
		this.selected(this.options_.label === selection.label);
	};
	MenuItem.registerComponent('ResolutionMenuItem', ResolutionMenuItem);

	/*
  * Resolution menu button
  */
	var MenuButton = _videoJs2['default'].getComponent('MenuButton');
	var ResolutionMenuButton = _videoJs2['default'].extend(MenuButton, {
		constructor: function constructor(player, options) {
			this.label = document.createElement('span');
			options.label = 'Quality';
			// Sets this.player_, this.options_ and initializes the component
			MenuButton.call(this, player, options);
			this.el().setAttribute('aria-label', 'Quality');
			this.controlText('Quality');

			if (options.dynamicLabel) {
				_videoJs2['default'].addClass(this.label, 'vjs-resolution-button-label');
				this.el().appendChild(this.label);
			} else {
				var staticLabel = document.createElement('span');
				_videoJs2['default'].addClass(staticLabel, 'vjs-menu-icon');
				this.el().appendChild(staticLabel);
			}
			player.on('updateSources', _videoJs2['default'].bind(this, this.update));
		}
	});
	ResolutionMenuButton.prototype.createItems = function () {
		var menuItems = [];
		var labels = this.sources && this.sources.label || {};

		// FIXME order is not guaranteed here.
		for (var key in labels) {
			if (labels.hasOwnProperty(key)) {
				menuItems.push(new ResolutionMenuItem(this.player_, {
					label: key,
					src: labels[key],
					selected: key === (this.currentSelection ? this.currentSelection.label : false)
				}));
			}
		}
		return menuItems;
	};
	ResolutionMenuButton.prototype.update = function () {
		this.sources = this.player_.getGroupedSrc();
		this.currentSelection = this.player_.currentResolution();
		this.label.innerHTML = this.currentSelection ? this.currentSelection.label : '';
		return MenuButton.prototype.update.call(this);
	};
	ResolutionMenuButton.prototype.buildCSSClass = function () {
		return MenuButton.prototype.buildCSSClass.call(this) + ' vjs-resolution-button';
	};
	MenuButton.registerComponent('ResolutionMenuButton', ResolutionMenuButton);
};

/**
 * 禁用滚动条拖动
 * @param {[type]} options [description]
 * return {[type]}  [description]
 */
var disableProgress = function disableProgress(options) {
	var
	/**
  * Copies properties from one or more objects onto an original.
  */
	extend = function extend(obj /*, arg1, arg2, ... */) {
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
		disable: function disable() {
			state = true;
			player.controlBar.progressControl.seekBar.off("focus");
			player.controlBar.progressControl.seekBar.off("mousedown");
			player.controlBar.progressControl.seekBar.off("touchstart");
			player.controlBar.progressControl.seekBar.off("click");
		},
		enable: function enable() {
			state = false;
			player.controlBar.progressControl.seekBar.on("focus", player.controlBar.progressControl.seekBar.handleFocus);
			player.controlBar.progressControl.seekBar.on("mousedown", player.controlBar.progressControl.seekBar.handleMouseDown);
			player.controlBar.progressControl.seekBar.on("touchstart", player.controlBar.progressControl.seekBar.handleMouseDown);
			player.controlBar.progressControl.seekBar.on("click", player.controlBar.progressControl.seekBar.handleClick);
		},
		getState: function getState() {
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
var markers = function markers(options) {
	//default setting
	var defaultSetting = {
		markerStyle: {
			'width': '8px',
			'border-radius': '20%',
			'background-color': 'rgba(255,0,0,.5)'
		},
		markerTip: {
			display: true,
			text: function text(marker) {
				return marker.text;
			},
			time: function time(marker) {
				return marker.time;
			}
		},
		breakOverlay: {
			display: true,
			displayTime: 1,
			text: function text(marker) {
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
		onMarkerClick: function onMarkerClick(marker) {
			return false;
		},
		onMarkerReached: function onMarkerReached(marker) {},
		markers: []
	};

	// create a non-colliding random number
	function generateUUID() {
		var d = new Date().getTime();
		var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
			var r = (d + Math.random() * 16) % 16 | 0;
			d = Math.floor(d / 16);
			return (c == 'x' ? r : r & 0x3 | 0x8).toString(16);
		});
		return uuid;
	};
	/**
  * register the markers plugin (dependent on jquery)
  */
	var setting = $.extend(true, {}, defaultSetting, options),
	    markersMap = {},
	    markersList = [],
	    // list of markers sorted by time
	videoWrapper = $(this.el()),
	    currentMarkerIndex = -1,
	    player = this,
	    markerTip = null,
	    breakOverlay = null,
	    overlayIndex = -1;

	function sortMarkersList() {
		// sort the list by time in asc order
		markersList.sort(function (a, b) {
			return setting.markerTip.time(a) - setting.markerTip.time(b);
		});
	}

	function addMarkers(newMarkers) {
		// create the markers
		$.each(newMarkers, function (index, marker) {
			marker.key = generateUUID();

			videoWrapper.find('.vjs-progress-control').append(createMarkerDiv(marker));

			// store marker in an internal hash map
			markersMap[marker.key] = marker;
			markersList.push(marker);
		});

		sortMarkersList();
	}

	function getPosition(marker) {
		return setting.markerTip.time(marker) / player.duration() * 100;
	}

	function createMarkerDiv(marker, duration) {
		var markerDiv = $("<div class='vjs-marker'></div>");
		var marg = parseInt(videoWrapper.find('.vjs-progress-control .vjs-slider').css('marginLeft'));
		markerDiv.css(setting.markerStyle).css({
			"margin-left": marg - parseFloat(markerDiv.css("width")) / 2 + 'px',
			"left": getPosition(marker) + '%'
		}).attr("data-marker-key", marker.key).attr("data-marker-time", setting.markerTip.time(marker));

		// add user-defined class to marker
		if (marker['class']) {
			markerDiv.addClass(marker['class']);
		}

		// bind click event to seek to marker time
		markerDiv.on('click', function (e) {

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
				}).attr("data-marker-time", markerTime);
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

		markerDiv.on('mouseover', function () {
			var marker = markersMap[$(this).data('marker-key')];

			markerTip.find('.vjs-tip-inner').html(setting.markerTip.text(marker));

			// margin-left needs to minus the padding length to align correctly with the marker
			markerTip.css({
				"left": getPosition(marker) + '%',
				"margin-left": -parseFloat(markerTip.css("width")) / 2 - 5 + 'px',
				"visibility": "visible"
			});
		}).on('mouseout', function () {
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

		if (currentTime >= markerTime && currentTime <= markerTime + setting.breakOverlay.displayTime) {
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
		breakOverlay = $("<div class='vjs-break-overlay'><div class='vjs-break-overlay-text'></div></div>").css(setting.breakOverlay.style);
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

		var getNextMarkerTime = function getNextMarkerTime(index) {
			if (index < markersList.length - 1) {
				return setting.markerTip.time(markersList[index + 1]);
			}
			// next marker time of last marker would be end of video time
			return player.duration();
		};
		var currentTime = player.currentTime();
		var newMarkerIndex;

		if (currentMarkerIndex != -1) {
			// check if staying at same marker
			var nextMarkerTime = getNextMarkerTime(currentMarkerIndex);
			if (currentTime >= setting.markerTip.time(markersList[currentMarkerIndex]) && currentTime < nextMarkerTime) {
				return;
			}

			// check for ending (at the end current time equals player duration)
			if (currentMarkerIndex === markersList.length - 1 && currentTime === player.duration()) {
				return;
			}
		}

		// check first marker, no marker is selected
		if (markersList.length > 0 && currentTime < setting.markerTip.time(markersList[0])) {
			newMarkerIndex = -1;
		} else {
			// look for new index
			for (var i = 0; i < markersList.length; i++) {
				nextMarkerTime = getNextMarkerTime(i);

				if (currentTime >= setting.markerTip.time(markersList[i]) && currentTime < nextMarkerTime) {
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
	player.on("loadedmetadata", function () {
		initialize();
	});

	// exposed plugin API
	player.markers = {
		getMarkers: function getMarkers() {
			return markersList;
		},
		next: function next() {
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
		prev: function prev() {
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
		add: function add(newMarkers) {
			// add new markers given an array of index
			addMarkers(newMarkers);
		},
		remove: function remove(indexArray) {
			// remove markers given an array of index
			removeMarkers(indexArray);
		},
		removeAll: function removeAll() {
			var indexArray = [];
			for (var i = 0; i < markersList.length; i++) {
				indexArray.push(i);
			}
			removeMarkers(indexArray);
		},
		updateTime: function updateTime() {
			// notify the plugin to update the UI for changes in marker times
			updateMarkers();
		},
		reset: function reset(newMarkers) {
			// remove all the existing markers and add new ones
			player.markers.removeAll();
			addMarkers(newMarkers);
		},
		destroy: function destroy() {
			// unregister the plugins and clean up even handlers
			player.markers.removeAll();
			breakOverlay.remove();
			markerTip.remove();
			player.off("timeupdate", updateBreakOverlay);
			delete player.markers;
		}
	};
};

/**
 * 水印
 * @param {[type]} options [description]
 * return {[type]}  [description]
 */
var waterMark = function waterMark(settings) {
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
	    extend = function extend() {
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
	if (options.text) div.textContent = options.text;

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
	if (options.ypos === 0 && options.xpos === 0) // Top left
		{
			div.style.top = "0px";
			div.style.left = "0px";
		} else if (options.ypos === 0 && options.xpos === 100) // Top right
		{
			div.style.top = "0px";
			div.style.right = "0px";
		} else if (options.ypos === 100 && options.xpos === 100) // Bottom right
		{
			div.style.bottom = "0px";
			div.style.right = "0px";
		} else if (options.ypos === 100 && options.xpos === 0) // Bottom left
		{
			div.style.bottom = "0px";
			div.style.left = "0px";
		} else if (options.ypos === 50 && options.xpos === 50) // Center
		{
			if (options.debug) console.log('watermark: player:' + player.width + 'x' + player.height);
			if (options.debug) console.log('watermark: video:' + video.videoWidth + 'x' + video.videoHeight);
			if (options.debug) console.log('watermark: image:' + img.width + 'x' + img.height);
			div.style.top = this.height() / 2 + "px";
			div.style.left = this.width() / 2 + "px";
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

// Register the plugin with video.js.
_videoJs2['default'].plugin('open', open);
_videoJs2['default'].plugin('videoJsResolutionSwitcher', videoJsResolutionSwitcher);
_videoJs2['default'].plugin('disableProgress', disableProgress);
_videoJs2['default'].plugin('markers', markers);
_videoJs2['default'].plugin('waterMark', waterMark);

// Include the version number.
open.VERSION = '__VERSION__';

exports['default'] = open;
module.exports = exports['default'];
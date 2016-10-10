(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.videojsOpen = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _videoJs = (typeof window !== "undefined" ? window['videojs'] : typeof global !== "undefined" ? global['videojs'] : null);

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
			display: false,
			displayTime: 3,
			text: function text(marker) {
				return "Break overlay: " + marker.overlayText;
			},
			style: {
				'width': '100%',
				'height': '20%',
				'background-color': 'rgba(0,0,0,0.7)',
				'color': 'white',
				'font-size': '17px'
			}
		},
		onMarkerClick: function onMarkerClick(marker) {},
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

			videoWrapper.find('.vjs-progress-control .vjs-slider').append(createMarkerDiv(marker));

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
		markerDiv.css(setting.markerStyle).css({
			// "margin-left": -parseFloat(markerDiv.css("width")) / 2 + 'px',
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
		videoWrapper.find('.vjs-progress-control .vjs-slider').append(markerTip);
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
var waterMark = function waterMark(options) {
	var defaults = {
		file: 'Owned_Stamp.png',
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
		img.src = options.file;
	}

	//img.style.bottom = "0";
	//img.style.right = "0";
	if (options.ypos === 0 && options.xpos === 0) // Top left
		{
			div.style.top = "0";
			div.style.left = "0";
		} else if (options.ypos === 0 && options.xpos === 100) // Top right
		{
			div.style.top = "0";
			div.style.right = "0";
		} else if (options.ypos === 100 && options.xpos === 100) // Bottom right
		{
			div.style.bottom = "0";
			div.style.right = "0";
		} else if (options.ypos === 100 && options.xpos === 0) // Bottom left
		{
			div.style.bottom = "0";
			div.style.left = "0";
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
open.VERSION = '1.0.0';

exports['default'] = open;
module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvb3Blbi9Eb2N1bWVudHMvV29yay9Tb3VyY2VUcmVlL3Zqcy1vcGVuL3NyYy9wbHVnaW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7dUJDQW9CLFVBQVU7Ozs7O0FBRzlCLElBQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQzs7Ozs7Ozs7Ozs7OztBQWFwQixJQUFNLGFBQWEsR0FBRyxTQUFoQixhQUFhLENBQUksTUFBTSxFQUFFLE9BQU8sRUFBSztBQUMxQyxPQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0NBRTVCLENBQUM7Ozs7Ozs7Ozs7Ozs7O0FBY0YsSUFBTSxJQUFJLEdBQUcsU0FBUCxJQUFJLENBQVksT0FBTyxFQUFFOzs7QUFDOUIsS0FBSSxDQUFDLEtBQUssQ0FBQyxZQUFNO0FBQ2hCLGVBQWEsUUFBTyxxQkFBUSxZQUFZLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7RUFDN0QsQ0FBQyxDQUFDO0NBQ0gsQ0FBQzs7Ozs7OztBQU9GLElBQU0seUJBQXlCLEdBQUcsbUNBQVMsT0FBTyxFQUFFOzs7Ozs7O0FBT25ELEtBQUksUUFBUSxHQUFHLHFCQUFRLFlBQVksQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDO0tBQ3JELE1BQU0sR0FBRyxJQUFJO0tBQ2IsVUFBVSxHQUFHLEVBQUU7S0FDZixjQUFjLEdBQUcsRUFBRTtLQUNuQixzQkFBc0IsR0FBRyxFQUFFLENBQUM7Ozs7Ozs7QUFPN0IsT0FBTSxDQUFDLFNBQVMsR0FBRyxVQUFTLEdBQUcsRUFBRTs7QUFFaEMsTUFBSSxDQUFDLEdBQUcsRUFBRTtBQUNULFVBQU8sTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO0dBQ3BCOzs7QUFHRCxLQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFTLE1BQU0sRUFBRTtBQUNqQyxPQUFJO0FBQ0gsV0FBUSxNQUFN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QyxpQkFBaUIsRUFBRSxlQUFlLENBQUMsQ0FBQztBQUNuRCxxQkFBUSxNQUFNLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ25DLHFCQUFRLE1BQU0sQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7OztBQUd2QyxJQUFJLENBQUMsT0FBTyxHQUFHLGFBQWEsQ0FBQzs7cUJBRWQsSUFBSSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJpbXBvcnQgdmlkZW9qcyBmcm9tICd2aWRlby5qcyc7XG5cbi8vIERlZmF1bHQgb3B0aW9ucyBmb3IgdGhlIHBsdWdpbi5cbmNvbnN0IGRlZmF1bHRzID0ge307XG5cbi8qKlxuICogRnVuY3Rpb24gdG8gaW52b2tlIHdoZW4gdGhlIHBsYXllciBpcyByZWFkeS5cbiAqXG4gKiBUaGlzIGlzIGEgZ3JlYXQgcGxhY2UgZm9yIHlvdXIgcGx1Z2luIHRvIGluaXRpYWxpemUgaXRzZWxmLiBXaGVuIHRoaXNcbiAqIGZ1bmN0aW9uIGlzIGNhbGxlZCwgdGhlIHBsYXllciB3aWxsIGhhdmUgaXRzIERPTSBhbmQgY2hpbGQgY29tcG9uZW50c1xuICogaW4gcGxhY2UuXG4gKlxuICogQGZ1bmN0aW9uIG9uUGxheWVyUmVhZHlcbiAqIEBwYXJhbSAgICB7UGxheWVyfSBwbGF5ZXJcbiAqIEBwYXJhbSAgICB7T2JqZWN0fSBbb3B0aW9ucz17fV1cbiAqL1xuY29uc3Qgb25QbGF5ZXJSZWFkeSA9IChwbGF5ZXIsIG9wdGlvbnMpID0+IHtcblx0cGxheWVyLmFkZENsYXNzKCd2anMtb3BlbicpO1xuXG59O1xuXG4vKipcbiAqIEEgdmlkZW8uanMgcGx1Z2luLlxuICpcbiAqIEluIHRoZSBwbHVnaW4gZnVuY3Rpb24sIHRoZSB2YWx1ZSBvZiBgdGhpc2AgaXMgYSB2aWRlby5qcyBgUGxheWVyYFxuICogaW5zdGFuY2UuIFlvdSBjYW5ub3QgcmVseSBvbiB0aGUgcGxheWVyIGJlaW5nIGluIGEgXCJyZWFkeVwiIHN0YXRlIGhlcmUsXG4gKiBkZXBlbmRpbmcgb24gaG93IHRoZSBwbHVnaW4gaXMgaW52b2tlZC4gVGhpcyBtYXkgb3IgbWF5IG5vdCBiZSBpbXBvcnRhbnRcbiAqIHRvIHlvdTsgaWYgbm90LCByZW1vdmUgdGhlIHdhaXQgZm9yIFwicmVhZHlcIiFcbiAqXG4gKiBAZnVuY3Rpb24gb3BlblxuICogQHBhcmFtICAgIHtPYmplY3R9IFtvcHRpb25zPXt9XVxuICogICAgICAgICAgIEFuIG9iamVjdCBvZiBvcHRpb25zIGxlZnQgdG8gdGhlIHBsdWdpbiBhdXRob3IgdG8gZGVmaW5lLlxuICovXG5jb25zdCBvcGVuID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHR0aGlzLnJlYWR5KCgpID0+IHtcblx0XHRvblBsYXllclJlYWR5KHRoaXMsIHZpZGVvanMubWVyZ2VPcHRpb25zKGRlZmF1bHRzLCBvcHRpb25zKSk7XG5cdH0pO1xufTtcblxuLyoqXG4gKiDliIbovqjnjodcbiAqIEBwYXJhbSB7W3R5cGVdfSBvcHRpb25zIFtkZXNjcmlwdGlvbl1cbiAqIHJldHVybiB7W3R5cGVdfSAgW2Rlc2NyaXB0aW9uXVxuICovXG5jb25zdCB2aWRlb0pzUmVzb2x1dGlvblN3aXRjaGVyID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXG5cdC8qKlxuXHQgKiBJbml0aWFsaXplIHRoZSBwbHVnaW4uXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uc10gY29uZmlndXJhdGlvbiBmb3IgdGhlIHBsdWdpblxuXHQgKi9cblxuXHR2YXIgc2V0dGluZ3MgPSB2aWRlb2pzLm1lcmdlT3B0aW9ucyhkZWZhdWx0cywgb3B0aW9ucyksXG5cdFx0cGxheWVyID0gdGhpcyxcblx0XHRncm91cGVkU3JjID0ge30sXG5cdFx0Y3VycmVudFNvdXJjZXMgPSB7fSxcblx0XHRjdXJyZW50UmVzb2x1dGlvblN0YXRlID0ge307XG5cblx0LyoqXG5cdCAqIFVwZGF0ZXMgcGxheWVyIHNvdXJjZXMgb3IgcmV0dXJucyBjdXJyZW50IHNvdXJjZSBVUkxcblx0ICogQHBhcmFtICAge0FycmF5fSAgW3NyY10gYXJyYXkgb2Ygc291cmNlcyBbe3NyYzogJycsIHR5cGU6ICcnLCBsYWJlbDogJycsIHJlczogJyd9XVxuXHQgKiBAcmV0dXJucyB7T2JqZWN0fFN0cmluZ3xBcnJheX0gdmlkZW9qcyBwbGF5ZXIgb2JqZWN0IGlmIHVzZWQgYXMgc2V0dGVyIG9yIGN1cnJlbnQgc291cmNlIFVSTCwgb2JqZWN0LCBvciBhcnJheSBvZiBzb3VyY2VzXG5cdCAqL1xuXHRwbGF5ZXIudXBkYXRlU3JjID0gZnVuY3Rpb24oc3JjKSB7XG5cdFx0Ly9SZXR1cm4gY3VycmVudCBzcmMgaWYgc3JjIGlzIG5vdCBnaXZlblxuXHRcdGlmICghc3JjKSB7XG5cdFx0XHRyZXR1cm4gcGxheWVyLnNyYygpO1xuXHRcdH1cblxuXHRcdC8vIE9ubHkgYWRkIHRob3NlIHNvdXJjZXMgd2hpY2ggd2UgY2FuIChtYXliZSkgcGxheVxuXHRcdHNyYyA9IHNyYy5maWx0ZXIoZnVuY3Rpb24oc291cmNlKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRyZXR1cm4gKHBsYXllci5jYW5QbGF5VHlwZShzb3VyY2UudHlwZSkgIT09ICcnKTtcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0Ly8gSWYgYSBUZWNoIGRvZXNuJ3QgeWV0IGhhdmUgY2FuUGxheVR5cGUganVzdCBhZGQgaXRcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0Ly9Tb3J0IHNvdXJjZXNcblx0XHR0aGlzLmN1cnJlbnRTb3VyY2VzID0gc3JjLnNvcnQoY29tcGFyZVJlc29sdXRpb25zKTtcblx0XHR0aGlzLmdyb3VwZWRTcmMgPSBidWNrZXRTb3VyY2VzKHRoaXMuY3VycmVudFNvdXJjZXMpO1xuXHRcdC8vIFBpY2sgb25lIGJ5IGRlZmF1bHRcblx0XHR2YXIgY2hvc2VuID0gY2hvb3NlU3JjKHRoaXMuZ3JvdXBlZFNyYywgdGhpcy5jdXJyZW50U291cmNlcyk7XG5cdFx0dGhpcy5jdXJyZW50UmVzb2x1dGlvblN0YXRlID0ge1xuXHRcdFx0bGFiZWw6IGNob3Nlbi5sYWJlbCxcblx0XHRcdHNvdXJjZXM6IGNob3Nlbi5zb3VyY2VzXG5cdFx0fTtcblxuXHRcdHBsYXllci50cmlnZ2VyKCd1cGRhdGVTb3VyY2VzJyk7XG5cdFx0cGxheWVyLnNldFNvdXJjZXNTYW5pdGl6ZWQoY2hvc2VuLnNvdXJjZXMsIGNob3Nlbi5sYWJlbCk7XG5cdFx0cGxheWVyLnRyaWdnZXIoJ3Jlc29sdXRpb25jaGFuZ2UnKTtcblx0XHRyZXR1cm4gcGxheWVyO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGN1cnJlbnQgcmVzb2x1dGlvbiBvciBzZXRzIG9uZSB3aGVuIGxhYmVsIGlzIHNwZWNpZmllZFxuXHQgKiBAcGFyYW0ge1N0cmluZ30gICBbbGFiZWxdICAgICAgICAgbGFiZWwgbmFtZVxuXHQgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY3VzdG9tU291cmNlUGlja2VyXSBjdXN0b20gZnVuY3Rpb24gdG8gY2hvb3NlIHNvdXJjZS4gVGFrZXMgMiBhcmd1bWVudHM6IHNvdXJjZXMsIGxhYmVsLiBNdXN0IHJldHVybiBwbGF5ZXIgb2JqZWN0LlxuXHQgKiBAcmV0dXJucyB7T2JqZWN0fSAgIGN1cnJlbnQgcmVzb2x1dGlvbiBvYmplY3Qge2xhYmVsOiAnJywgc291cmNlczogW119IGlmIHVzZWQgYXMgZ2V0dGVyIG9yIHBsYXllciBvYmplY3QgaWYgdXNlZCBhcyBzZXR0ZXJcblx0ICovXG5cdHBsYXllci5jdXJyZW50UmVzb2x1dGlvbiA9IGZ1bmN0aW9uKGxhYmVsLCBjdXN0b21Tb3VyY2VQaWNrZXIpIHtcblx0XHRpZiAobGFiZWwgPT0gbnVsbCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuY3VycmVudFJlc29sdXRpb25TdGF0ZTtcblx0XHR9XG5cblx0XHQvLyBMb29rdXAgc291cmNlcyBmb3IgbGFiZWxcblx0XHRpZiAoIXRoaXMuZ3JvdXBlZFNyYyB8fCAhdGhpcy5ncm91cGVkU3JjLmxhYmVsIHx8ICF0aGlzLmdyb3VwZWRTcmMubGFiZWxbbGFiZWxdKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHZhciBzb3VyY2VzID0gdGhpcy5ncm91cGVkU3JjLmxhYmVsW2xhYmVsXTtcblx0XHQvLyBSZW1lbWJlciBwbGF5ZXIgc3RhdGVcblx0XHR2YXIgY3VycmVudFRpbWUgPSBwbGF5ZXIuY3VycmVudFRpbWUoKTtcblx0XHR2YXIgaXNQYXVzZWQgPSBwbGF5ZXIucGF1c2VkKCk7XG5cblx0XHQvLyBIaWRlIGJpZ1BsYXlCdXR0b25cblx0XHRpZiAoIWlzUGF1c2VkICYmIHRoaXMucGxheWVyXy5vcHRpb25zXy5iaWdQbGF5QnV0dG9uKSB7XG5cdFx0XHR0aGlzLnBsYXllcl8uYmlnUGxheUJ1dHRvbi5oaWRlKCk7XG5cdFx0fVxuXG5cdFx0Ly8gQ2hhbmdlIHBsYXllciBzb3VyY2UgYW5kIHdhaXQgZm9yIGxvYWRlZGRhdGEgZXZlbnQsIHRoZW4gcGxheSB2aWRlb1xuXHRcdC8vIGxvYWRlZG1ldGFkYXRhIGRvZXNuJ3Qgd29yayByaWdodCBub3cgZm9yIGZsYXNoLlxuXHRcdC8vIFByb2JhYmx5IGJlY2F1c2Ugb2YgaHR0cHM6Ly9naXRodWIuY29tL3ZpZGVvanMvdmlkZW8tanMtc3dmL2lzc3Vlcy8xMjRcblx0XHQvLyBJZiBwbGF5ZXIgcHJlbG9hZCBpcyAnbm9uZScgYW5kIHRoZW4gbG9hZGVkZGF0YSBub3QgZmlyZWQuIFNvLCB3ZSBuZWVkIHRpbWV1cGRhdGUgZXZlbnQgZm9yIHNlZWsgaGFuZGxlICh0aW1ldXBkYXRlIGRvZXNuJ3Qgd29yayBwcm9wZXJseSB3aXRoIGZsYXNoKVxuXHRcdHZhciBoYW5kbGVTZWVrRXZlbnQgPSAnbG9hZGVkZGF0YSc7XG5cdFx0aWYgKHRoaXMucGxheWVyXy50ZWNoTmFtZV8gIT09ICdZb3V0dWJlJyAmJiB0aGlzLnBsYXllcl8ucHJlbG9hZCgpID09PSAnbm9uZScgJiYgdGhpcy5wbGF5ZXJfLnRlY2hOYW1lXyAhPT0gJ0ZsYXNoJykge1xuXHRcdFx0aGFuZGxlU2Vla0V2ZW50ID0gJ3RpbWV1cGRhdGUnO1xuXHRcdH1cblx0XHRwbGF5ZXJcblx0XHRcdC5zZXRTb3VyY2VzU2FuaXRpemVkKHNvdXJjZXMsIGxhYmVsLCBjdXN0b21Tb3VyY2VQaWNrZXIgfHwgc2V0dGluZ3MuY3VzdG9tU291cmNlUGlja2VyKVxuXHRcdFx0Lm9uZShoYW5kbGVTZWVrRXZlbnQsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRwbGF5ZXIuY3VycmVudFRpbWUoY3VycmVudFRpbWUpO1xuXHRcdFx0XHRwbGF5ZXIuaGFuZGxlVGVjaFNlZWtlZF8oKTtcblx0XHRcdFx0aWYgKCFpc1BhdXNlZCkge1xuXHRcdFx0XHRcdC8vIFN0YXJ0IHBsYXlpbmcgYW5kIGhpZGUgbG9hZGluZ1NwaW5uZXIgKGZsYXNoIGlzc3VlID8pXG5cdFx0XHRcdFx0cGxheWVyLnBsYXkoKS5oYW5kbGVUZWNoU2Vla2VkXygpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHBsYXllci50cmlnZ2VyKCdyZXNvbHV0aW9uY2hhbmdlJyk7XG5cdFx0XHR9KTtcblx0XHRyZXR1cm4gcGxheWVyO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGdyb3VwZWQgc291cmNlcyBieSBsYWJlbCwgcmVzb2x1dGlvbiBhbmQgdHlwZVxuXHQgKiBAcmV0dXJucyB7T2JqZWN0fSBncm91cGVkIHNvdXJjZXM6IHsgbGFiZWw6IHsga2V5OiBbXSB9LCByZXM6IHsga2V5OiBbXSB9LCB0eXBlOiB7IGtleTogW10gfSB9XG5cdCAqL1xuXHRwbGF5ZXIuZ2V0R3JvdXBlZFNyYyA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLmdyb3VwZWRTcmM7XG5cdH07XG5cdHBsYXllci5zZXRTb3VyY2VzU2FuaXRpemVkID0gZnVuY3Rpb24oc291cmNlcywgbGFiZWwsIGN1c3RvbVNvdXJjZVBpY2tlcikge1xuXHRcdHRoaXMuY3VycmVudFJlc29sdXRpb25TdGF0ZSA9IHtcblx0XHRcdGxhYmVsOiBsYWJlbCxcblx0XHRcdHNvdXJjZXM6IHNvdXJjZXNcblx0XHR9O1xuXG5cdFx0aWYgKHR5cGVvZiBjdXN0b21Tb3VyY2VQaWNrZXIgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdHJldHVybiBjdXN0b21Tb3VyY2VQaWNrZXIocGxheWVyLCBzb3VyY2VzLCBsYWJlbCk7XG5cdFx0fVxuXHRcdHBsYXllci5zcmMoc291cmNlcy5tYXAoZnVuY3Rpb24oc3JjKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRzcmM6IHNyYy5zcmMsXG5cdFx0XHRcdHR5cGU6IHNyYy50eXBlLFxuXHRcdFx0XHRyZXM6IHNyYy5yZXNcblx0XHRcdH07XG5cdFx0fSkpO1xuXG5cdFx0JChcIi52anMtcmVzb2x1dGlvbi1idXR0b24tbGFiZWxcIikuaHRtbChsYWJlbCk7XG5cdFx0cmV0dXJuIHBsYXllcjtcblx0fTtcblxuXHQvKipcblx0ICogTWV0aG9kIHVzZWQgZm9yIHNvcnRpbmcgbGlzdCBvZiBzb3VyY2VzXG5cdCAqIEBwYXJhbSAgIHtPYmplY3R9IGEgLSBzb3VyY2Ugb2JqZWN0IHdpdGggcmVzIHByb3BlcnR5XG5cdCAqIEBwYXJhbSAgIHtPYmplY3R9IGIgLSBzb3VyY2Ugb2JqZWN0IHdpdGggcmVzIHByb3BlcnR5XG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IHJlc3VsdCBvZiBjb21wYXJhdGlvblxuXHQgKi9cblx0ZnVuY3Rpb24gY29tcGFyZVJlc29sdXRpb25zKGEsIGIpIHtcblx0XHRpZiAoIWEucmVzIHx8ICFiLnJlcykge1xuXHRcdFx0cmV0dXJuIDA7XG5cdFx0fVxuXHRcdHJldHVybiAoK2IucmVzKSAtICgrYS5yZXMpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEdyb3VwIHNvdXJjZXMgYnkgbGFiZWwsIHJlc29sdXRpb24gYW5kIHR5cGVcblx0ICogQHBhcmFtICAge0FycmF5fSAgc3JjIEFycmF5IG9mIHNvdXJjZXNcblx0ICogQHJldHVybnMge09iamVjdH0gZ3JvdXBlZCBzb3VyY2VzOiB7IGxhYmVsOiB7IGtleTogW10gfSwgcmVzOiB7IGtleTogW10gfSwgdHlwZTogeyBrZXk6IFtdIH0gfVxuXHQgKi9cblx0ZnVuY3Rpb24gYnVja2V0U291cmNlcyhzcmMpIHtcblx0XHR2YXIgcmVzb2x1dGlvbnMgPSB7XG5cdFx0XHRsYWJlbDoge30sXG5cdFx0XHRyZXM6IHt9LFxuXHRcdFx0dHlwZToge31cblx0XHR9O1xuXHRcdHNyYy5tYXAoZnVuY3Rpb24oc291cmNlKSB7XG5cdFx0XHRpbml0UmVzb2x1dGlvbktleShyZXNvbHV0aW9ucywgJ2xhYmVsJywgc291cmNlKTtcblx0XHRcdGluaXRSZXNvbHV0aW9uS2V5KHJlc29sdXRpb25zLCAncmVzJywgc291cmNlKTtcblx0XHRcdGluaXRSZXNvbHV0aW9uS2V5KHJlc29sdXRpb25zLCAndHlwZScsIHNvdXJjZSk7XG5cblx0XHRcdGFwcGVuZFNvdXJjZVRvS2V5KHJlc29sdXRpb25zLCAnbGFiZWwnLCBzb3VyY2UpO1xuXHRcdFx0YXBwZW5kU291cmNlVG9LZXkocmVzb2x1dGlvbnMsICdyZXMnLCBzb3VyY2UpO1xuXHRcdFx0YXBwZW5kU291cmNlVG9LZXkocmVzb2x1dGlvbnMsICd0eXBlJywgc291cmNlKTtcblx0XHR9KTtcblx0XHRyZXR1cm4gcmVzb2x1dGlvbnM7XG5cdH1cblxuXHRmdW5jdGlvbiBpbml0UmVzb2x1dGlvbktleShyZXNvbHV0aW9ucywga2V5LCBzb3VyY2UpIHtcblx0XHRpZiAocmVzb2x1dGlvbnNba2V5XVtzb3VyY2Vba2V5XV0gPT0gbnVsbCkge1xuXHRcdFx0cmVzb2x1dGlvbnNba2V5XVtzb3VyY2Vba2V5XV0gPSBbXTtcblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiBhcHBlbmRTb3VyY2VUb0tleShyZXNvbHV0aW9ucywga2V5LCBzb3VyY2UpIHtcblx0XHRyZXNvbHV0aW9uc1trZXldW3NvdXJjZVtrZXldXS5wdXNoKHNvdXJjZSk7XG5cdH1cblxuXHQvKipcblx0ICogQ2hvb3NlIHNyYyBpZiBvcHRpb24uZGVmYXVsdCBpcyBzcGVjaWZpZWRcblx0ICogQHBhcmFtICAge09iamVjdH0gZ3JvdXBlZFNyYyB7cmVzOiB7IGtleTogW10gfX1cblx0ICogQHBhcmFtICAge0FycmF5fSAgc3JjIEFycmF5IG9mIHNvdXJjZXMgc29ydGVkIGJ5IHJlc29sdXRpb24gdXNlZCB0byBmaW5kIGhpZ2ggYW5kIGxvdyByZXNcblx0ICogQHJldHVybnMge09iamVjdH0ge3Jlczogc3RyaW5nLCBzb3VyY2VzOiBbXX1cblx0ICovXG5cdGZ1bmN0aW9uIGNob29zZVNyYyhncm91cGVkU3JjLCBzcmMpIHtcblx0XHR2YXIgc2VsZWN0ZWRSZXMgPSBzZXR0aW5nc1snZGVmYXVsdCddOyAvLyB1c2UgYXJyYXkgYWNjZXNzIGFzIGRlZmF1bHQgaXMgYSByZXNlcnZlZCBrZXl3b3JkXG5cdFx0dmFyIHNlbGVjdGVkTGFiZWwgPSAnJztcblx0XHRpZiAoc2VsZWN0ZWRSZXMgPT09ICdoaWdoJykge1xuXHRcdFx0c2VsZWN0ZWRSZXMgPSBzcmNbMF0ucmVzO1xuXHRcdFx0c2VsZWN0ZWRMYWJlbCA9IHNyY1swXS5sYWJlbDtcblx0XHR9IGVsc2UgaWYgKHNlbGVjdGVkUmVzID09PSAnbG93JyB8fCBzZWxlY3RlZFJlcyA9PSBudWxsIHx8ICFncm91cGVkU3JjLnJlc1tzZWxlY3RlZFJlc10pIHtcblx0XHRcdC8vIFNlbGVjdCBsb3ctcmVzIGlmIGRlZmF1bHQgaXMgbG93IG9yIG5vdCBzZXRcblx0XHRcdHNlbGVjdGVkUmVzID0gc3JjW3NyYy5sZW5ndGggLSAxXS5yZXM7XG5cdFx0XHRzZWxlY3RlZExhYmVsID0gc3JjW3NyYy5sZW5ndGggLSAxXS5sYWJlbDtcblx0XHR9IGVsc2UgaWYgKGdyb3VwZWRTcmMucmVzW3NlbGVjdGVkUmVzXSkge1xuXHRcdFx0c2VsZWN0ZWRMYWJlbCA9IGdyb3VwZWRTcmMucmVzW3NlbGVjdGVkUmVzXVswXS5sYWJlbDtcblx0XHR9XG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlczogc2VsZWN0ZWRSZXMsXG5cdFx0XHRsYWJlbDogc2VsZWN0ZWRMYWJlbCxcblx0XHRcdHNvdXJjZXM6IGdyb3VwZWRTcmMucmVzW3NlbGVjdGVkUmVzXVxuXHRcdH07XG5cdH1cblxuXHRmdW5jdGlvbiBpbml0UmVzb2x1dGlvbkZvcll0KHBsYXllcikge1xuXHRcdC8vIE1hcCB5b3V0dWJlIHF1YWxpdGllcyBuYW1lc1xuXHRcdHZhciBfeXRzID0ge1xuXHRcdFx0aGlnaHJlczoge1xuXHRcdFx0XHRyZXM6IDEwODAsXG5cdFx0XHRcdGxhYmVsOiAnMTA4MCcsXG5cdFx0XHRcdHl0OiAnaGlnaHJlcydcblx0XHRcdH0sXG5cdFx0XHRoZDEwODA6IHtcblx0XHRcdFx0cmVzOiAxMDgwLFxuXHRcdFx0XHRsYWJlbDogJzEwODAnLFxuXHRcdFx0XHR5dDogJ2hkMTA4MCdcblx0XHRcdH0sXG5cdFx0XHRoZDcyMDoge1xuXHRcdFx0XHRyZXM6IDcyMCxcblx0XHRcdFx0bGFiZWw6ICc3MjAnLFxuXHRcdFx0XHR5dDogJ2hkNzIwJ1xuXHRcdFx0fSxcblx0XHRcdGxhcmdlOiB7XG5cdFx0XHRcdHJlczogNDgwLFxuXHRcdFx0XHRsYWJlbDogJzQ4MCcsXG5cdFx0XHRcdHl0OiAnbGFyZ2UnXG5cdFx0XHR9LFxuXHRcdFx0bWVkaXVtOiB7XG5cdFx0XHRcdHJlczogMzYwLFxuXHRcdFx0XHRsYWJlbDogJzM2MCcsXG5cdFx0XHRcdHl0OiAnbWVkaXVtJ1xuXHRcdFx0fSxcblx0XHRcdHNtYWxsOiB7XG5cdFx0XHRcdHJlczogMjQwLFxuXHRcdFx0XHRsYWJlbDogJzI0MCcsXG5cdFx0XHRcdHl0OiAnc21hbGwnXG5cdFx0XHR9LFxuXHRcdFx0dGlueToge1xuXHRcdFx0XHRyZXM6IDE0NCxcblx0XHRcdFx0bGFiZWw6ICcxNDQnLFxuXHRcdFx0XHR5dDogJ3RpbnknXG5cdFx0XHR9LFxuXHRcdFx0YXV0bzoge1xuXHRcdFx0XHRyZXM6IDAsXG5cdFx0XHRcdGxhYmVsOiAnYXV0bycsXG5cdFx0XHRcdHl0OiAnYXV0bydcblx0XHRcdH1cblx0XHR9O1xuXHRcdC8vIE92ZXJ3cml0ZSBkZWZhdWx0IHNvdXJjZVBpY2tlciBmdW5jdGlvblxuXHRcdHZhciBfY3VzdG9tU291cmNlUGlja2VyID0gZnVuY3Rpb24oX3BsYXllciwgX3NvdXJjZXMsIF9sYWJlbCkge1xuXHRcdFx0Ly8gTm90ZSB0aGF0IHNldFBsYXllYmFja1F1YWxpdHkgaXMgYSBzdWdnZXN0aW9uLiBZVCBkb2VzIG5vdCBhbHdheXMgb2JleSBpdC5cblx0XHRcdHBsYXllci50ZWNoXy55dFBsYXllci5zZXRQbGF5YmFja1F1YWxpdHkoX3NvdXJjZXNbMF0uX3l0KTtcblx0XHRcdHBsYXllci50cmlnZ2VyKCd1cGRhdGVTb3VyY2VzJyk7XG5cdFx0XHRyZXR1cm4gcGxheWVyO1xuXHRcdH07XG5cdFx0c2V0dGluZ3MuY3VzdG9tU291cmNlUGlja2VyID0gX2N1c3RvbVNvdXJjZVBpY2tlcjtcblxuXHRcdC8vIEluaXQgcmVzb2x1dGlvblxuXHRcdHBsYXllci50ZWNoXy55dFBsYXllci5zZXRQbGF5YmFja1F1YWxpdHkoJ2F1dG8nKTtcblxuXHRcdC8vIFRoaXMgaXMgdHJpZ2dlcmVkIHdoZW4gdGhlIHJlc29sdXRpb24gYWN0dWFsbHkgY2hhbmdlc1xuXHRcdHBsYXllci50ZWNoXy55dFBsYXllci5hZGRFdmVudExpc3RlbmVyKCdvblBsYXliYWNrUXVhbGl0eUNoYW5nZScsIGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0XHRmb3IgKHZhciByZXMgaW4gX3l0cykge1xuXHRcdFx0XHRpZiAocmVzLnl0ID09PSBldmVudC5kYXRhKSB7XG5cdFx0XHRcdFx0cGxheWVyLmN1cnJlbnRSZXNvbHV0aW9uKHJlcy5sYWJlbCwgX2N1c3RvbVNvdXJjZVBpY2tlcik7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQvLyBXZSBtdXN0IHdhaXQgZm9yIHBsYXkgZXZlbnRcblx0XHRwbGF5ZXIub25lKCdwbGF5JywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgcXVhbGl0aWVzID0gcGxheWVyLnRlY2hfLnl0UGxheWVyLmdldEF2YWlsYWJsZVF1YWxpdHlMZXZlbHMoKTtcblx0XHRcdHZhciBfc291cmNlcyA9IFtdO1xuXG5cdFx0XHRxdWFsaXRpZXMubWFwKGZ1bmN0aW9uKHEpIHtcblx0XHRcdFx0X3NvdXJjZXMucHVzaCh7XG5cdFx0XHRcdFx0c3JjOiBwbGF5ZXIuc3JjKCkuc3JjLFxuXHRcdFx0XHRcdHR5cGU6IHBsYXllci5zcmMoKS50eXBlLFxuXHRcdFx0XHRcdGxhYmVsOiBfeXRzW3FdLmxhYmVsLFxuXHRcdFx0XHRcdHJlczogX3l0c1txXS5yZXMsXG5cdFx0XHRcdFx0X3l0OiBfeXRzW3FdLnl0XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cblx0XHRcdHBsYXllci5ncm91cGVkU3JjID0gYnVja2V0U291cmNlcyhfc291cmNlcyk7XG5cdFx0XHR2YXIgY2hvc2VuID0ge1xuXHRcdFx0XHRsYWJlbDogJ2F1dG8nLFxuXHRcdFx0XHRyZXM6IDAsXG5cdFx0XHRcdHNvdXJjZXM6IHBsYXllci5ncm91cGVkU3JjLmxhYmVsLmF1dG9cblx0XHRcdH07XG5cblx0XHRcdHRoaXMuY3VycmVudFJlc29sdXRpb25TdGF0ZSA9IHtcblx0XHRcdFx0bGFiZWw6IGNob3Nlbi5sYWJlbCxcblx0XHRcdFx0c291cmNlczogY2hvc2VuLnNvdXJjZXNcblx0XHRcdH07XG5cblx0XHRcdHBsYXllci50cmlnZ2VyKCd1cGRhdGVTb3VyY2VzJyk7XG5cdFx0XHRwbGF5ZXIuc2V0U291cmNlc1Nhbml0aXplZChjaG9zZW4uc291cmNlcywgY2hvc2VuLmxhYmVsLCBfY3VzdG9tU291cmNlUGlja2VyKTtcblx0XHR9KTtcblx0fVxuXG5cdHBsYXllci5yZWFkeShmdW5jdGlvbigpIHtcblx0XHRpZiAoc2V0dGluZ3MudWkpIHtcblx0XHRcdHZhciBtZW51QnV0dG9uID0gbmV3IFJlc29sdXRpb25NZW51QnV0dG9uKHBsYXllciwgc2V0dGluZ3MpO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucmVzb2x1dGlvblN3aXRjaGVyID0gcGxheWVyLmNvbnRyb2xCYXIuZWxfLmluc2VydEJlZm9yZShtZW51QnV0dG9uLmVsXywgcGxheWVyLmNvbnRyb2xCYXIuZ2V0Q2hpbGQoJ2Z1bGxzY3JlZW5Ub2dnbGUnKS5lbF8pO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucmVzb2x1dGlvblN3aXRjaGVyLmRpc3Bvc2UgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0dGhpcy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMpO1xuXHRcdFx0fTtcblx0XHR9XG5cdFx0aWYgKHBsYXllci5vcHRpb25zXy5zb3VyY2VzLmxlbmd0aCA+IDEpIHtcblx0XHRcdC8vIHRlY2g6IEh0bWw1IGFuZCBGbGFzaFxuXHRcdFx0Ly8gQ3JlYXRlIHJlc29sdXRpb24gc3dpdGNoZXIgZm9yIHZpZGVvcyBmb3JtIDxzb3VyY2U+IHRhZyBpbnNpZGUgPHZpZGVvPlxuXHRcdFx0cGxheWVyLnVwZGF0ZVNyYyhwbGF5ZXIub3B0aW9uc18uc291cmNlcyk7XG5cdFx0fVxuXG5cdFx0aWYgKHBsYXllci50ZWNoTmFtZV8gPT09ICdZb3V0dWJlJykge1xuXHRcdFx0Ly8gdGVjaDogWW91VHViZVxuXHRcdFx0aW5pdFJlc29sdXRpb25Gb3JZdChwbGF5ZXIpO1xuXHRcdH1cblx0fSk7XG5cblx0dmFyIHZpZGVvSnNSZXNvbHV0aW9uU3dpdGNoZXIsXG5cdFx0ZGVmYXVsdHMgPSB7XG5cdFx0XHR1aTogdHJ1ZVxuXHRcdH07XG5cblx0Lypcblx0ICogUmVzb2x1dGlvbiBtZW51IGl0ZW1cblx0ICovXG5cdHZhciBNZW51SXRlbSA9IHZpZGVvanMuZ2V0Q29tcG9uZW50KCdNZW51SXRlbScpO1xuXHR2YXIgUmVzb2x1dGlvbk1lbnVJdGVtID0gdmlkZW9qcy5leHRlbmQoTWVudUl0ZW0sIHtcblx0XHRjb25zdHJ1Y3RvcjogZnVuY3Rpb24ocGxheWVyLCBvcHRpb25zKSB7XG5cdFx0XHRvcHRpb25zLnNlbGVjdGFibGUgPSB0cnVlO1xuXHRcdFx0Ly8gU2V0cyB0aGlzLnBsYXllcl8sIHRoaXMub3B0aW9uc18gYW5kIGluaXRpYWxpemVzIHRoZSBjb21wb25lbnRcblx0XHRcdE1lbnVJdGVtLmNhbGwodGhpcywgcGxheWVyLCBvcHRpb25zKTtcblx0XHRcdHRoaXMuc3JjID0gb3B0aW9ucy5zcmM7XG5cblx0XHRcdHBsYXllci5vbigncmVzb2x1dGlvbmNoYW5nZScsIHZpZGVvanMuYmluZCh0aGlzLCB0aGlzLnVwZGF0ZSkpO1xuXHRcdH1cblx0fSk7XG5cdFJlc29sdXRpb25NZW51SXRlbS5wcm90b3R5cGUuaGFuZGxlQ2xpY2sgPSBmdW5jdGlvbihldmVudCkge1xuXHRcdE1lbnVJdGVtLnByb3RvdHlwZS5oYW5kbGVDbGljay5jYWxsKHRoaXMsIGV2ZW50KTtcblx0XHR0aGlzLnBsYXllcl8uY3VycmVudFJlc29sdXRpb24odGhpcy5vcHRpb25zXy5sYWJlbCk7XG5cdH07XG5cdFJlc29sdXRpb25NZW51SXRlbS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGVjdGlvbiA9IHRoaXMucGxheWVyXy5jdXJyZW50UmVzb2x1dGlvbigpO1xuXHRcdHRoaXMuc2VsZWN0ZWQodGhpcy5vcHRpb25zXy5sYWJlbCA9PT0gc2VsZWN0aW9uLmxhYmVsKTtcblx0fTtcblx0TWVudUl0ZW0ucmVnaXN0ZXJDb21wb25lbnQoJ1Jlc29sdXRpb25NZW51SXRlbScsIFJlc29sdXRpb25NZW51SXRlbSk7XG5cblx0Lypcblx0ICogUmVzb2x1dGlvbiBtZW51IGJ1dHRvblxuXHQgKi9cblx0dmFyIE1lbnVCdXR0b24gPSB2aWRlb2pzLmdldENvbXBvbmVudCgnTWVudUJ1dHRvbicpO1xuXHR2YXIgUmVzb2x1dGlvbk1lbnVCdXR0b24gPSB2aWRlb2pzLmV4dGVuZChNZW51QnV0dG9uLCB7XG5cdFx0Y29uc3RydWN0b3I6IGZ1bmN0aW9uKHBsYXllciwgb3B0aW9ucykge1xuXHRcdFx0dGhpcy5sYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0XHRcdG9wdGlvbnMubGFiZWwgPSAnUXVhbGl0eSc7XG5cdFx0XHQvLyBTZXRzIHRoaXMucGxheWVyXywgdGhpcy5vcHRpb25zXyBhbmQgaW5pdGlhbGl6ZXMgdGhlIGNvbXBvbmVudFxuXHRcdFx0TWVudUJ1dHRvbi5jYWxsKHRoaXMsIHBsYXllciwgb3B0aW9ucyk7XG5cdFx0XHR0aGlzLmVsKCkuc2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJywgJ1F1YWxpdHknKTtcblx0XHRcdHRoaXMuY29udHJvbFRleHQoJ1F1YWxpdHknKTtcblxuXHRcdFx0aWYgKG9wdGlvbnMuZHluYW1pY0xhYmVsKSB7XG5cdFx0XHRcdHZpZGVvanMuYWRkQ2xhc3ModGhpcy5sYWJlbCwgJ3Zqcy1yZXNvbHV0aW9uLWJ1dHRvbi1sYWJlbCcpO1xuXHRcdFx0XHR0aGlzLmVsKCkuYXBwZW5kQ2hpbGQodGhpcy5sYWJlbCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2YXIgc3RhdGljTGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cdFx0XHRcdHZpZGVvanMuYWRkQ2xhc3Moc3RhdGljTGFiZWwsICd2anMtbWVudS1pY29uJyk7XG5cdFx0XHRcdHRoaXMuZWwoKS5hcHBlbmRDaGlsZChzdGF0aWNMYWJlbCk7XG5cdFx0XHR9XG5cdFx0XHRwbGF5ZXIub24oJ3VwZGF0ZVNvdXJjZXMnLCB2aWRlb2pzLmJpbmQodGhpcywgdGhpcy51cGRhdGUpKTtcblx0XHR9XG5cdH0pO1xuXHRSZXNvbHV0aW9uTWVudUJ1dHRvbi5wcm90b3R5cGUuY3JlYXRlSXRlbXMgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgbWVudUl0ZW1zID0gW107XG5cdFx0dmFyIGxhYmVscyA9ICh0aGlzLnNvdXJjZXMgJiYgdGhpcy5zb3VyY2VzLmxhYmVsKSB8fCB7fTtcblxuXHRcdC8vIEZJWE1FIG9yZGVyIGlzIG5vdCBndWFyYW50ZWVkIGhlcmUuXG5cdFx0Zm9yICh2YXIga2V5IGluIGxhYmVscykge1xuXHRcdFx0aWYgKGxhYmVscy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHRcdG1lbnVJdGVtcy5wdXNoKG5ldyBSZXNvbHV0aW9uTWVudUl0ZW0oXG5cdFx0XHRcdFx0dGhpcy5wbGF5ZXJfLCB7XG5cdFx0XHRcdFx0XHRsYWJlbDoga2V5LFxuXHRcdFx0XHRcdFx0c3JjOiBsYWJlbHNba2V5XSxcblx0XHRcdFx0XHRcdHNlbGVjdGVkOiBrZXkgPT09ICh0aGlzLmN1cnJlbnRTZWxlY3Rpb24gPyB0aGlzLmN1cnJlbnRTZWxlY3Rpb24ubGFiZWwgOiBmYWxzZSlcblx0XHRcdFx0XHR9KSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBtZW51SXRlbXM7XG5cdH07XG5cdFJlc29sdXRpb25NZW51QnV0dG9uLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnNvdXJjZXMgPSB0aGlzLnBsYXllcl8uZ2V0R3JvdXBlZFNyYygpO1xuXHRcdHRoaXMuY3VycmVudFNlbGVjdGlvbiA9IHRoaXMucGxheWVyXy5jdXJyZW50UmVzb2x1dGlvbigpO1xuXHRcdHRoaXMubGFiZWwuaW5uZXJIVE1MID0gdGhpcy5jdXJyZW50U2VsZWN0aW9uID8gdGhpcy5jdXJyZW50U2VsZWN0aW9uLmxhYmVsIDogJyc7XG5cdFx0cmV0dXJuIE1lbnVCdXR0b24ucHJvdG90eXBlLnVwZGF0ZS5jYWxsKHRoaXMpO1xuXHR9O1xuXHRSZXNvbHV0aW9uTWVudUJ1dHRvbi5wcm90b3R5cGUuYnVpbGRDU1NDbGFzcyA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBNZW51QnV0dG9uLnByb3RvdHlwZS5idWlsZENTU0NsYXNzLmNhbGwodGhpcykgKyAnIHZqcy1yZXNvbHV0aW9uLWJ1dHRvbic7XG5cdH07XG5cdE1lbnVCdXR0b24ucmVnaXN0ZXJDb21wb25lbnQoJ1Jlc29sdXRpb25NZW51QnV0dG9uJywgUmVzb2x1dGlvbk1lbnVCdXR0b24pO1xufTtcblxuLyoqXG4gKiDnpoHnlKjmu5rliqjmnaHmi5bliqhcbiAqIEBwYXJhbSB7W3R5cGVdfSBvcHRpb25zIFtkZXNjcmlwdGlvbl1cbiAqIHJldHVybiB7W3R5cGVdfSAgW2Rlc2NyaXB0aW9uXVxuICovXG5jb25zdCBkaXNhYmxlUHJvZ3Jlc3MgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdHZhclxuXHQvKipcblx0ICogQ29waWVzIHByb3BlcnRpZXMgZnJvbSBvbmUgb3IgbW9yZSBvYmplY3RzIG9udG8gYW4gb3JpZ2luYWwuXG5cdCAqL1xuXHRcdGV4dGVuZCA9IGZ1bmN0aW9uKG9iaiAvKiwgYXJnMSwgYXJnMiwgLi4uICovICkge1xuXHRcdFx0dmFyIGFyZywgaSwgaztcblx0XHRcdGZvciAoaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0YXJnID0gYXJndW1lbnRzW2ldO1xuXHRcdFx0XHRmb3IgKGsgaW4gYXJnKSB7XG5cdFx0XHRcdFx0aWYgKGFyZy5oYXNPd25Qcm9wZXJ0eShrKSkge1xuXHRcdFx0XHRcdFx0b2JqW2tdID0gYXJnW2tdO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG9iajtcblx0XHR9LFxuXG5cdFx0Ly8gZGVmaW5lIHNvbWUgcmVhc29uYWJsZSBkZWZhdWx0cyBmb3IgdGhpcyBzd2VldCBwbHVnaW5cblx0XHRkZWZhdWx0cyA9IHtcblx0XHRcdGF1dG9EaXNhYmxlOiBmYWxzZVxuXHRcdH07XG5cblxuXHR2YXJcblx0Ly8gc2F2ZSBhIHJlZmVyZW5jZSB0byB0aGUgcGxheWVyIGluc3RhbmNlXG5cdFx0cGxheWVyID0gdGhpcyxcblx0XHRzdGF0ZSA9IGZhbHNlLFxuXG5cdFx0Ly8gbWVyZ2Ugb3B0aW9ucyBhbmQgZGVmYXVsdHNcblx0XHRzZXR0aW5ncyA9IGV4dGVuZCh7fSwgZGVmYXVsdHMsIG9wdGlvbnMgfHwge30pO1xuXG5cdC8vIGRpc2FibGUgLyBlbmFibGUgbWV0aG9kc1xuXHRwbGF5ZXIuZGlzYWJsZVByb2dyZXNzID0ge1xuXHRcdGRpc2FibGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0c3RhdGUgPSB0cnVlO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub2ZmKFwiZm9jdXNcIik7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vZmYoXCJtb3VzZWRvd25cIik7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vZmYoXCJ0b3VjaHN0YXJ0XCIpO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub2ZmKFwiY2xpY2tcIik7XG5cdFx0fSxcblx0XHRlbmFibGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0c3RhdGUgPSBmYWxzZTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9uKFwiZm9jdXNcIiwgcGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIuaGFuZGxlRm9jdXMpO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub24oXCJtb3VzZWRvd25cIiwgcGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIuaGFuZGxlTW91c2VEb3duKTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9uKFwidG91Y2hzdGFydFwiLCBwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5oYW5kbGVNb3VzZURvd24pO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub24oXCJjbGlja1wiLCBwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5oYW5kbGVDbGljayk7XG5cdFx0fSxcblx0XHRnZXRTdGF0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gc3RhdGU7XG5cdFx0fVxuXHR9O1xuXG5cdGlmIChzZXR0aW5ncy5hdXRvRGlzYWJsZSkge1xuXHRcdHBsYXllci5kaXNhYmxlUHJvZ3Jlc3MuZGlzYWJsZSgpO1xuXHR9XG59O1xuXG4vKipcbiAqIOaJk+eCuVxuICogQHBhcmFtIHtbdHlwZV19IG9wdGlvbnMgW2Rlc2NyaXB0aW9uXVxuICogcmV0dXJuIHtbdHlwZV19ICBbZGVzY3JpcHRpb25dXG4gKi9cbmNvbnN0IG1hcmtlcnMgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdC8vZGVmYXVsdCBzZXR0aW5nXG5cdHZhciBkZWZhdWx0U2V0dGluZyA9IHtcblx0XHRtYXJrZXJTdHlsZToge1xuXHRcdFx0J3dpZHRoJzogJzhweCcsXG5cdFx0XHQnYm9yZGVyLXJhZGl1cyc6ICcyMCUnLFxuXHRcdFx0J2JhY2tncm91bmQtY29sb3InOiAncmdiYSgyNTUsMCwwLC41KSdcblx0XHR9LFxuXHRcdG1hcmtlclRpcDoge1xuXHRcdFx0ZGlzcGxheTogdHJ1ZSxcblx0XHRcdHRleHQ6IGZ1bmN0aW9uKG1hcmtlcikge1xuXHRcdFx0XHRyZXR1cm4gbWFya2VyLnRleHQ7XG5cdFx0XHR9LFxuXHRcdFx0dGltZTogZnVuY3Rpb24obWFya2VyKSB7XG5cdFx0XHRcdHJldHVybiBtYXJrZXIudGltZTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdGJyZWFrT3ZlcmxheToge1xuXHRcdFx0ZGlzcGxheTogZmFsc2UsXG5cdFx0XHRkaXNwbGF5VGltZTogMyxcblx0XHRcdHRleHQ6IGZ1bmN0aW9uKG1hcmtlcikge1xuXHRcdFx0XHRyZXR1cm4gXCJCcmVhayBvdmVybGF5OiBcIiArIG1hcmtlci5vdmVybGF5VGV4dDtcblx0XHRcdH0sXG5cdFx0XHRzdHlsZToge1xuXHRcdFx0XHQnd2lkdGgnOiAnMTAwJScsXG5cdFx0XHRcdCdoZWlnaHQnOiAnMjAlJyxcblx0XHRcdFx0J2JhY2tncm91bmQtY29sb3InOiAncmdiYSgwLDAsMCwwLjcpJyxcblx0XHRcdFx0J2NvbG9yJzogJ3doaXRlJyxcblx0XHRcdFx0J2ZvbnQtc2l6ZSc6ICcxN3B4J1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0b25NYXJrZXJDbGljazogZnVuY3Rpb24obWFya2VyKSB7fSxcblx0XHRvbk1hcmtlclJlYWNoZWQ6IGZ1bmN0aW9uKG1hcmtlcikge30sXG5cdFx0bWFya2VyczogW11cblx0fTtcblxuXHQvLyBjcmVhdGUgYSBub24tY29sbGlkaW5nIHJhbmRvbSBudW1iZXJcblx0ZnVuY3Rpb24gZ2VuZXJhdGVVVUlEKCkge1xuXHRcdHZhciBkID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cdFx0dmFyIHV1aWQgPSAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlKC9beHldL2csIGZ1bmN0aW9uKGMpIHtcblx0XHRcdHZhciByID0gKGQgKyBNYXRoLnJhbmRvbSgpICogMTYpICUgMTYgfCAwO1xuXHRcdFx0ZCA9IE1hdGguZmxvb3IoZCAvIDE2KTtcblx0XHRcdHJldHVybiAoYyA9PSAneCcgPyByIDogKHIgJiAweDMgfCAweDgpKS50b1N0cmluZygxNik7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHV1aWQ7XG5cdH07XG5cdC8qKlxuXHQgKiByZWdpc3RlciB0aGUgbWFya2VycyBwbHVnaW4gKGRlcGVuZGVudCBvbiBqcXVlcnkpXG5cdCAqL1xuXHR2YXIgc2V0dGluZyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0U2V0dGluZywgb3B0aW9ucyksXG5cdFx0bWFya2Vyc01hcCA9IHt9LFxuXHRcdG1hcmtlcnNMaXN0ID0gW10sIC8vIGxpc3Qgb2YgbWFya2VycyBzb3J0ZWQgYnkgdGltZVxuXHRcdHZpZGVvV3JhcHBlciA9ICQodGhpcy5lbCgpKSxcblx0XHRjdXJyZW50TWFya2VySW5kZXggPSAtMSxcblx0XHRwbGF5ZXIgPSB0aGlzLFxuXHRcdG1hcmtlclRpcCA9IG51bGwsXG5cdFx0YnJlYWtPdmVybGF5ID0gbnVsbCxcblx0XHRvdmVybGF5SW5kZXggPSAtMTtcblxuXHRmdW5jdGlvbiBzb3J0TWFya2Vyc0xpc3QoKSB7XG5cdFx0Ly8gc29ydCB0aGUgbGlzdCBieSB0aW1lIGluIGFzYyBvcmRlclxuXHRcdG1hcmtlcnNMaXN0LnNvcnQoZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0cmV0dXJuIHNldHRpbmcubWFya2VyVGlwLnRpbWUoYSkgLSBzZXR0aW5nLm1hcmtlclRpcC50aW1lKGIpO1xuXHRcdH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gYWRkTWFya2VycyhuZXdNYXJrZXJzKSB7XG5cdFx0Ly8gY3JlYXRlIHRoZSBtYXJrZXJzXG5cdFx0JC5lYWNoKG5ld01hcmtlcnMsIGZ1bmN0aW9uKGluZGV4LCBtYXJrZXIpIHtcblx0XHRcdG1hcmtlci5rZXkgPSBnZW5lcmF0ZVVVSUQoKTtcblxuXHRcdFx0dmlkZW9XcmFwcGVyLmZpbmQoJy52anMtcHJvZ3Jlc3MtY29udHJvbCAudmpzLXNsaWRlcicpLmFwcGVuZChcblx0XHRcdFx0Y3JlYXRlTWFya2VyRGl2KG1hcmtlcikpO1xuXG5cdFx0XHQvLyBzdG9yZSBtYXJrZXIgaW4gYW4gaW50ZXJuYWwgaGFzaCBtYXBcblx0XHRcdG1hcmtlcnNNYXBbbWFya2VyLmtleV0gPSBtYXJrZXI7XG5cdFx0XHRtYXJrZXJzTGlzdC5wdXNoKG1hcmtlcik7XG5cdFx0fSk7XG5cblx0XHRzb3J0TWFya2Vyc0xpc3QoKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGdldFBvc2l0aW9uKG1hcmtlcikge1xuXHRcdHJldHVybiAoc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXIpIC8gcGxheWVyLmR1cmF0aW9uKCkpICogMTAwXG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVNYXJrZXJEaXYobWFya2VyLCBkdXJhdGlvbikge1xuXHRcdHZhciBtYXJrZXJEaXYgPSAkKFwiPGRpdiBjbGFzcz0ndmpzLW1hcmtlcic+PC9kaXY+XCIpXG5cdFx0bWFya2VyRGl2LmNzcyhzZXR0aW5nLm1hcmtlclN0eWxlKVxuXHRcdFx0LmNzcyh7XG5cdFx0XHRcdC8vIFwibWFyZ2luLWxlZnRcIjogLXBhcnNlRmxvYXQobWFya2VyRGl2LmNzcyhcIndpZHRoXCIpKSAvIDIgKyAncHgnLFxuXHRcdFx0XHRcImxlZnRcIjogZ2V0UG9zaXRpb24obWFya2VyKSArICclJ1xuXHRcdFx0fSlcblx0XHRcdC5hdHRyKFwiZGF0YS1tYXJrZXIta2V5XCIsIG1hcmtlci5rZXkpXG5cdFx0XHQuYXR0cihcImRhdGEtbWFya2VyLXRpbWVcIiwgc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXIpKTtcblxuXHRcdC8vIGFkZCB1c2VyLWRlZmluZWQgY2xhc3MgdG8gbWFya2VyXG5cdFx0aWYgKG1hcmtlci5jbGFzcykge1xuXHRcdFx0bWFya2VyRGl2LmFkZENsYXNzKG1hcmtlci5jbGFzcyk7XG5cdFx0fVxuXG5cdFx0Ly8gYmluZCBjbGljayBldmVudCB0byBzZWVrIHRvIG1hcmtlciB0aW1lXG5cdFx0bWFya2VyRGl2Lm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcblxuXHRcdFx0dmFyIHByZXZlbnREZWZhdWx0ID0gZmFsc2U7XG5cdFx0XHRpZiAodHlwZW9mIHNldHRpbmcub25NYXJrZXJDbGljayA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRcdC8vIGlmIHJldHVybiBmYWxzZSwgcHJldmVudCBkZWZhdWx0IGJlaGF2aW9yXG5cdFx0XHRcdHByZXZlbnREZWZhdWx0ID0gc2V0dGluZy5vbk1hcmtlckNsaWNrKG1hcmtlcikgPT0gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdGlmICghcHJldmVudERlZmF1bHQpIHtcblx0XHRcdFx0dmFyIGtleSA9ICQodGhpcykuZGF0YSgnbWFya2VyLWtleScpO1xuXHRcdFx0XHRwbGF5ZXIuY3VycmVudFRpbWUoc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTWFwW2tleV0pKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdGlmIChzZXR0aW5nLm1hcmtlclRpcC5kaXNwbGF5KSB7XG5cdFx0XHRyZWdpc3Rlck1hcmtlclRpcEhhbmRsZXIobWFya2VyRGl2KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gbWFya2VyRGl2O1xuXHR9XG5cblx0ZnVuY3Rpb24gdXBkYXRlTWFya2VycygpIHtcblx0XHQvLyB1cGRhdGUgVUkgZm9yIG1hcmtlcnMgd2hvc2UgdGltZSBjaGFuZ2VkXG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG1hcmtlcnNMaXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgbWFya2VyID0gbWFya2Vyc0xpc3RbaV07XG5cdFx0XHR2YXIgbWFya2VyRGl2ID0gdmlkZW9XcmFwcGVyLmZpbmQoXCIudmpzLW1hcmtlcltkYXRhLW1hcmtlci1rZXk9J1wiICsgbWFya2VyLmtleSArIFwiJ11cIik7XG5cdFx0XHR2YXIgbWFya2VyVGltZSA9IHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2VyKTtcblxuXHRcdFx0aWYgKG1hcmtlckRpdi5kYXRhKCdtYXJrZXItdGltZScpICE9IG1hcmtlclRpbWUpIHtcblx0XHRcdFx0bWFya2VyRGl2LmNzcyh7XG5cdFx0XHRcdFx0XHRcImxlZnRcIjogZ2V0UG9zaXRpb24obWFya2VyKSArICclJ1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0LmF0dHIoXCJkYXRhLW1hcmtlci10aW1lXCIsIG1hcmtlclRpbWUpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRzb3J0TWFya2Vyc0xpc3QoKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHJlbW92ZU1hcmtlcnMoaW5kZXhBcnJheSkge1xuXHRcdC8vIHJlc2V0IG92ZXJsYXlcblx0XHRpZiAoYnJlYWtPdmVybGF5KSB7XG5cdFx0XHRvdmVybGF5SW5kZXggPSAtMTtcblx0XHRcdGJyZWFrT3ZlcmxheS5jc3MoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuXHRcdH1cblx0XHRjdXJyZW50TWFya2VySW5kZXggPSAtMTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgaW5kZXhBcnJheS5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGluZGV4ID0gaW5kZXhBcnJheVtpXTtcblx0XHRcdHZhciBtYXJrZXIgPSBtYXJrZXJzTGlzdFtpbmRleF07XG5cdFx0XHRpZiAobWFya2VyKSB7XG5cdFx0XHRcdC8vIGRlbGV0ZSBmcm9tIG1lbW9yeVxuXHRcdFx0XHRkZWxldGUgbWFya2Vyc01hcFttYXJrZXIua2V5XTtcblx0XHRcdFx0bWFya2Vyc0xpc3RbaW5kZXhdID0gbnVsbDtcblxuXHRcdFx0XHQvLyBkZWxldGUgZnJvbSBkb21cblx0XHRcdFx0dmlkZW9XcmFwcGVyLmZpbmQoXCIudmpzLW1hcmtlcltkYXRhLW1hcmtlci1rZXk9J1wiICsgbWFya2VyLmtleSArIFwiJ11cIikucmVtb3ZlKCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gY2xlYW4gdXAgYXJyYXlcblx0XHRmb3IgKHZhciBpID0gbWFya2Vyc0xpc3QubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcblx0XHRcdGlmIChtYXJrZXJzTGlzdFtpXSA9PT0gbnVsbCkge1xuXHRcdFx0XHRtYXJrZXJzTGlzdC5zcGxpY2UoaSwgMSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gc29ydCBhZ2FpblxuXHRcdHNvcnRNYXJrZXJzTGlzdCgpO1xuXHR9XG5cblxuXHQvLyBhdHRhY2ggaG92ZXIgZXZlbnQgaGFuZGxlclxuXHRmdW5jdGlvbiByZWdpc3Rlck1hcmtlclRpcEhhbmRsZXIobWFya2VyRGl2KSB7XG5cblx0XHRtYXJrZXJEaXYub24oJ21vdXNlb3ZlcicsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIG1hcmtlciA9IG1hcmtlcnNNYXBbJCh0aGlzKS5kYXRhKCdtYXJrZXIta2V5JyldO1xuXG5cdFx0XHRtYXJrZXJUaXAuZmluZCgnLnZqcy10aXAtaW5uZXInKS5odG1sKHNldHRpbmcubWFya2VyVGlwLnRleHQobWFya2VyKSk7XG5cblx0XHRcdC8vIG1hcmdpbi1sZWZ0IG5lZWRzIHRvIG1pbnVzIHRoZSBwYWRkaW5nIGxlbmd0aCB0byBhbGlnbiBjb3JyZWN0bHkgd2l0aCB0aGUgbWFya2VyXG5cdFx0XHRtYXJrZXJUaXAuY3NzKHtcblx0XHRcdFx0XCJsZWZ0XCI6IGdldFBvc2l0aW9uKG1hcmtlcikgKyAnJScsXG5cdFx0XHRcdFwibWFyZ2luLWxlZnRcIjogLXBhcnNlRmxvYXQobWFya2VyVGlwLmNzcyhcIndpZHRoXCIpKSAvIDIgLSA1ICsgJ3B4Jyxcblx0XHRcdFx0XCJ2aXNpYmlsaXR5XCI6IFwidmlzaWJsZVwiXG5cdFx0XHR9KTtcblxuXHRcdH0pLm9uKCdtb3VzZW91dCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0bWFya2VyVGlwLmNzcyhcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBpbml0aWFsaXplTWFya2VyVGlwKCkge1xuXHRcdG1hcmtlclRpcCA9ICQoXCI8ZGl2IGNsYXNzPSd2anMtdGlwJz48ZGl2IGNsYXNzPSd2anMtdGlwLWFycm93Jz48L2Rpdj48ZGl2IGNsYXNzPSd2anMtdGlwLWlubmVyJz48L2Rpdj48L2Rpdj5cIik7XG5cdFx0dmlkZW9XcmFwcGVyLmZpbmQoJy52anMtcHJvZ3Jlc3MtY29udHJvbCAudmpzLXNsaWRlcicpLmFwcGVuZChtYXJrZXJUaXApO1xuXHR9XG5cblx0Ly8gc2hvdyBvciBoaWRlIGJyZWFrIG92ZXJsYXlzXG5cdGZ1bmN0aW9uIHVwZGF0ZUJyZWFrT3ZlcmxheSgpIHtcblx0XHRpZiAoIXNldHRpbmcuYnJlYWtPdmVybGF5LmRpc3BsYXkgfHwgY3VycmVudE1hcmtlckluZGV4IDwgMCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHZhciBjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdHZhciBtYXJrZXIgPSBtYXJrZXJzTGlzdFtjdXJyZW50TWFya2VySW5kZXhdO1xuXHRcdHZhciBtYXJrZXJUaW1lID0gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXIpO1xuXG5cdFx0aWYgKGN1cnJlbnRUaW1lID49IG1hcmtlclRpbWUgJiZcblx0XHRcdGN1cnJlbnRUaW1lIDw9IChtYXJrZXJUaW1lICsgc2V0dGluZy5icmVha092ZXJsYXkuZGlzcGxheVRpbWUpKSB7XG5cdFx0XHRpZiAob3ZlcmxheUluZGV4ICE9IGN1cnJlbnRNYXJrZXJJbmRleCkge1xuXHRcdFx0XHRvdmVybGF5SW5kZXggPSBjdXJyZW50TWFya2VySW5kZXg7XG5cdFx0XHRcdGJyZWFrT3ZlcmxheS5maW5kKCcudmpzLWJyZWFrLW92ZXJsYXktdGV4dCcpLmh0bWwoc2V0dGluZy5icmVha092ZXJsYXkudGV4dChtYXJrZXIpKTtcblx0XHRcdH1cblxuXHRcdFx0YnJlYWtPdmVybGF5LmNzcygndmlzaWJpbGl0eScsIFwidmlzaWJsZVwiKTtcblxuXHRcdH0gZWxzZSB7XG5cdFx0XHRvdmVybGF5SW5kZXggPSAtMTtcblx0XHRcdGJyZWFrT3ZlcmxheS5jc3MoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuXHRcdH1cblx0fVxuXG5cdC8vIHByb2JsZW0gd2hlbiB0aGUgbmV4dCBtYXJrZXIgaXMgd2l0aGluIHRoZSBvdmVybGF5IGRpc3BsYXkgdGltZSBmcm9tIHRoZSBwcmV2aW91cyBtYXJrZXJcblx0ZnVuY3Rpb24gaW5pdGlhbGl6ZU92ZXJsYXkoKSB7XG5cdFx0YnJlYWtPdmVybGF5ID0gJChcIjxkaXYgY2xhc3M9J3Zqcy1icmVhay1vdmVybGF5Jz48ZGl2IGNsYXNzPSd2anMtYnJlYWstb3ZlcmxheS10ZXh0Jz48L2Rpdj48L2Rpdj5cIilcblx0XHRcdC5jc3Moc2V0dGluZy5icmVha092ZXJsYXkuc3R5bGUpO1xuXHRcdHZpZGVvV3JhcHBlci5hcHBlbmQoYnJlYWtPdmVybGF5KTtcblx0XHRvdmVybGF5SW5kZXggPSAtMTtcblx0fVxuXG5cdGZ1bmN0aW9uIG9uVGltZVVwZGF0ZSgpIHtcblx0XHRvblVwZGF0ZU1hcmtlcigpO1xuXHRcdHVwZGF0ZUJyZWFrT3ZlcmxheSgpO1xuXHR9XG5cblx0ZnVuY3Rpb24gb25VcGRhdGVNYXJrZXIoKSB7XG5cdFx0Lypcblx0XHQgICAgY2hlY2sgbWFya2VyIHJlYWNoZWQgaW4gYmV0d2VlbiBtYXJrZXJzXG5cdFx0ICAgIHRoZSBsb2dpYyBoZXJlIGlzIHRoYXQgaXQgdHJpZ2dlcnMgYSBuZXcgbWFya2VyIHJlYWNoZWQgZXZlbnQgb25seSBpZiB0aGUgcGxheWVyIFxuXHRcdCAgICBlbnRlcnMgYSBuZXcgbWFya2VyIHJhbmdlIChlLmcuIGZyb20gbWFya2VyIDEgdG8gbWFya2VyIDIpLiBUaHVzLCBpZiBwbGF5ZXIgaXMgb24gbWFya2VyIDEgYW5kIHVzZXIgY2xpY2tlZCBvbiBtYXJrZXIgMSBhZ2Fpbiwgbm8gbmV3IHJlYWNoZWQgZXZlbnQgaXMgdHJpZ2dlcmVkKVxuXHRcdCovXG5cblx0XHR2YXIgZ2V0TmV4dE1hcmtlclRpbWUgPSBmdW5jdGlvbihpbmRleCkge1xuXHRcdFx0aWYgKGluZGV4IDwgbWFya2Vyc0xpc3QubGVuZ3RoIC0gMSkge1xuXHRcdFx0XHRyZXR1cm4gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTGlzdFtpbmRleCArIDFdKTtcblx0XHRcdH1cblx0XHRcdC8vIG5leHQgbWFya2VyIHRpbWUgb2YgbGFzdCBtYXJrZXIgd291bGQgYmUgZW5kIG9mIHZpZGVvIHRpbWVcblx0XHRcdHJldHVybiBwbGF5ZXIuZHVyYXRpb24oKTtcblx0XHR9XG5cdFx0dmFyIGN1cnJlbnRUaW1lID0gcGxheWVyLmN1cnJlbnRUaW1lKCk7XG5cdFx0dmFyIG5ld01hcmtlckluZGV4O1xuXG5cdFx0aWYgKGN1cnJlbnRNYXJrZXJJbmRleCAhPSAtMSkge1xuXHRcdFx0Ly8gY2hlY2sgaWYgc3RheWluZyBhdCBzYW1lIG1hcmtlclxuXHRcdFx0dmFyIG5leHRNYXJrZXJUaW1lID0gZ2V0TmV4dE1hcmtlclRpbWUoY3VycmVudE1hcmtlckluZGV4KTtcblx0XHRcdGlmIChjdXJyZW50VGltZSA+PSBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcnNMaXN0W2N1cnJlbnRNYXJrZXJJbmRleF0pICYmXG5cdFx0XHRcdGN1cnJlbnRUaW1lIDwgbmV4dE1hcmtlclRpbWUpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBjaGVjayBmb3IgZW5kaW5nIChhdCB0aGUgZW5kIGN1cnJlbnQgdGltZSBlcXVhbHMgcGxheWVyIGR1cmF0aW9uKVxuXHRcdFx0aWYgKGN1cnJlbnRNYXJrZXJJbmRleCA9PT0gbWFya2Vyc0xpc3QubGVuZ3RoIC0gMSAmJlxuXHRcdFx0XHRjdXJyZW50VGltZSA9PT0gcGxheWVyLmR1cmF0aW9uKCkpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIGNoZWNrIGZpcnN0IG1hcmtlciwgbm8gbWFya2VyIGlzIHNlbGVjdGVkXG5cdFx0aWYgKG1hcmtlcnNMaXN0Lmxlbmd0aCA+IDAgJiZcblx0XHRcdGN1cnJlbnRUaW1lIDwgc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTGlzdFswXSkpIHtcblx0XHRcdG5ld01hcmtlckluZGV4ID0gLTE7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIGxvb2sgZm9yIG5ldyBpbmRleFxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBtYXJrZXJzTGlzdC5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRuZXh0TWFya2VyVGltZSA9IGdldE5leHRNYXJrZXJUaW1lKGkpO1xuXG5cdFx0XHRcdGlmIChjdXJyZW50VGltZSA+PSBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcnNMaXN0W2ldKSAmJlxuXHRcdFx0XHRcdGN1cnJlbnRUaW1lIDwgbmV4dE1hcmtlclRpbWUpIHtcblx0XHRcdFx0XHRuZXdNYXJrZXJJbmRleCA9IGk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBzZXQgbmV3IG1hcmtlciBpbmRleFxuXHRcdGlmIChuZXdNYXJrZXJJbmRleCAhPSBjdXJyZW50TWFya2VySW5kZXgpIHtcblx0XHRcdC8vIHRyaWdnZXIgZXZlbnRcblx0XHRcdGlmIChuZXdNYXJrZXJJbmRleCAhPSAtMSAmJiBvcHRpb25zLm9uTWFya2VyUmVhY2hlZCkge1xuXHRcdFx0XHRvcHRpb25zLm9uTWFya2VyUmVhY2hlZChtYXJrZXJzTGlzdFtuZXdNYXJrZXJJbmRleF0pO1xuXHRcdFx0fVxuXHRcdFx0Y3VycmVudE1hcmtlckluZGV4ID0gbmV3TWFya2VySW5kZXg7XG5cdFx0fVxuXG5cdH1cblxuXHQvLyBzZXR1cCB0aGUgd2hvbGUgdGhpbmdcblx0ZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcblx0XHRpZiAoc2V0dGluZy5tYXJrZXJUaXAuZGlzcGxheSkge1xuXHRcdFx0aW5pdGlhbGl6ZU1hcmtlclRpcCgpO1xuXHRcdH1cblxuXHRcdC8vIHJlbW92ZSBleGlzdGluZyBtYXJrZXJzIGlmIGFscmVhZHkgaW5pdGlhbGl6ZWRcblx0XHRwbGF5ZXIubWFya2Vycy5yZW1vdmVBbGwoKTtcblx0XHRhZGRNYXJrZXJzKG9wdGlvbnMubWFya2Vycyk7XG5cblx0XHRpZiAoc2V0dGluZy5icmVha092ZXJsYXkuZGlzcGxheSkge1xuXHRcdFx0aW5pdGlhbGl6ZU92ZXJsYXkoKTtcblx0XHR9XG5cdFx0b25UaW1lVXBkYXRlKCk7XG5cdFx0cGxheWVyLm9uKFwidGltZXVwZGF0ZVwiLCBvblRpbWVVcGRhdGUpO1xuXHR9XG5cblx0Ly8gc2V0dXAgdGhlIHBsdWdpbiBhZnRlciB3ZSBsb2FkZWQgdmlkZW8ncyBtZXRhIGRhdGFcblx0cGxheWVyLm9uKFwibG9hZGVkbWV0YWRhdGFcIiwgZnVuY3Rpb24oKSB7XG5cdFx0aW5pdGlhbGl6ZSgpO1xuXHR9KTtcblxuXHQvLyBleHBvc2VkIHBsdWdpbiBBUElcblx0cGxheWVyLm1hcmtlcnMgPSB7XG5cdFx0Z2V0TWFya2VyczogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gbWFya2Vyc0xpc3Q7XG5cdFx0fSxcblx0XHRuZXh0OiBmdW5jdGlvbigpIHtcblx0XHRcdC8vIGdvIHRvIHRoZSBuZXh0IG1hcmtlciBmcm9tIGN1cnJlbnQgdGltZXN0YW1wXG5cdFx0XHR2YXIgY3VycmVudFRpbWUgPSBwbGF5ZXIuY3VycmVudFRpbWUoKTtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbWFya2Vyc0xpc3QubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0dmFyIG1hcmtlclRpbWUgPSBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcnNMaXN0W2ldKTtcblx0XHRcdFx0aWYgKG1hcmtlclRpbWUgPiBjdXJyZW50VGltZSkge1xuXHRcdFx0XHRcdHBsYXllci5jdXJyZW50VGltZShtYXJrZXJUaW1lKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0cHJldjogZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBnbyB0byBwcmV2aW91cyBtYXJrZXJcblx0XHRcdHZhciBjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdFx0Zm9yICh2YXIgaSA9IG1hcmtlcnNMaXN0Lmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRcdHZhciBtYXJrZXJUaW1lID0gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTGlzdFtpXSk7XG5cdFx0XHRcdC8vIGFkZCBhIHRocmVzaG9sZFxuXHRcdFx0XHRpZiAobWFya2VyVGltZSArIDAuNSA8IGN1cnJlbnRUaW1lKSB7XG5cdFx0XHRcdFx0cGxheWVyLmN1cnJlbnRUaW1lKG1hcmtlclRpbWUpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRhZGQ6IGZ1bmN0aW9uKG5ld01hcmtlcnMpIHtcblx0XHRcdC8vIGFkZCBuZXcgbWFya2VycyBnaXZlbiBhbiBhcnJheSBvZiBpbmRleFxuXHRcdFx0YWRkTWFya2VycyhuZXdNYXJrZXJzKTtcblx0XHR9LFxuXHRcdHJlbW92ZTogZnVuY3Rpb24oaW5kZXhBcnJheSkge1xuXHRcdFx0Ly8gcmVtb3ZlIG1hcmtlcnMgZ2l2ZW4gYW4gYXJyYXkgb2YgaW5kZXhcblx0XHRcdHJlbW92ZU1hcmtlcnMoaW5kZXhBcnJheSk7XG5cdFx0fSxcblx0XHRyZW1vdmVBbGw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGluZGV4QXJyYXkgPSBbXTtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbWFya2Vyc0xpc3QubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aW5kZXhBcnJheS5wdXNoKGkpO1xuXHRcdFx0fVxuXHRcdFx0cmVtb3ZlTWFya2VycyhpbmRleEFycmF5KTtcblx0XHR9LFxuXHRcdHVwZGF0ZVRpbWU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gbm90aWZ5IHRoZSBwbHVnaW4gdG8gdXBkYXRlIHRoZSBVSSBmb3IgY2hhbmdlcyBpbiBtYXJrZXIgdGltZXMgXG5cdFx0XHR1cGRhdGVNYXJrZXJzKCk7XG5cdFx0fSxcblx0XHRyZXNldDogZnVuY3Rpb24obmV3TWFya2Vycykge1xuXHRcdFx0Ly8gcmVtb3ZlIGFsbCB0aGUgZXhpc3RpbmcgbWFya2VycyBhbmQgYWRkIG5ldyBvbmVzXG5cdFx0XHRwbGF5ZXIubWFya2Vycy5yZW1vdmVBbGwoKTtcblx0XHRcdGFkZE1hcmtlcnMobmV3TWFya2Vycyk7XG5cdFx0fSxcblx0XHRkZXN0cm95OiBmdW5jdGlvbigpIHtcblx0XHRcdC8vIHVucmVnaXN0ZXIgdGhlIHBsdWdpbnMgYW5kIGNsZWFuIHVwIGV2ZW4gaGFuZGxlcnNcblx0XHRcdHBsYXllci5tYXJrZXJzLnJlbW92ZUFsbCgpO1xuXHRcdFx0YnJlYWtPdmVybGF5LnJlbW92ZSgpO1xuXHRcdFx0bWFya2VyVGlwLnJlbW92ZSgpO1xuXHRcdFx0cGxheWVyLm9mZihcInRpbWV1cGRhdGVcIiwgdXBkYXRlQnJlYWtPdmVybGF5KTtcblx0XHRcdGRlbGV0ZSBwbGF5ZXIubWFya2Vycztcblx0XHR9LFxuXHR9O1xufTtcblxuLyoqXG4gKiDmsLTljbBcbiAqIEBwYXJhbSB7W3R5cGVdfSBvcHRpb25zIFtkZXNjcmlwdGlvbl1cbiAqIHJldHVybiB7W3R5cGVdfSAgW2Rlc2NyaXB0aW9uXVxuICovXG5jb25zdCB3YXRlck1hcmsgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdHZhciBkZWZhdWx0cyA9IHtcblx0XHRcdGZpbGU6ICdPd25lZF9TdGFtcC5wbmcnLFxuXHRcdFx0eHBvczogMCxcblx0XHRcdHlwb3M6IDAsXG5cdFx0XHR4cmVwZWF0OiAwLFxuXHRcdFx0b3BhY2l0eTogMTAwLFxuXHRcdFx0Y2xpY2thYmxlOiBmYWxzZSxcblx0XHRcdHVybDogXCJcIixcblx0XHRcdGNsYXNzTmFtZTogJ3Zqcy13YXRlcm1hcmsnLFxuXHRcdFx0dGV4dDogZmFsc2UsXG5cdFx0XHRkZWJ1ZzogZmFsc2Vcblx0XHR9LFxuXHRcdGV4dGVuZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGFyZ3MsIHRhcmdldCwgaSwgb2JqZWN0LCBwcm9wZXJ0eTtcblx0XHRcdGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuXHRcdFx0dGFyZ2V0ID0gYXJncy5zaGlmdCgpIHx8IHt9O1xuXHRcdFx0Zm9yIChpIGluIGFyZ3MpIHtcblx0XHRcdFx0b2JqZWN0ID0gYXJnc1tpXTtcblx0XHRcdFx0Zm9yIChwcm9wZXJ0eSBpbiBvYmplY3QpIHtcblx0XHRcdFx0XHRpZiAob2JqZWN0Lmhhc093blByb3BlcnR5KHByb3BlcnR5KSkge1xuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBvYmplY3RbcHJvcGVydHldID09PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRcdFx0XHR0YXJnZXRbcHJvcGVydHldID0gZXh0ZW5kKHRhcmdldFtwcm9wZXJ0eV0sIG9iamVjdFtwcm9wZXJ0eV0pO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0W3Byb3BlcnR5XSA9IG9iamVjdFtwcm9wZXJ0eV07XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGFyZ2V0O1xuXHRcdH07XG5cblx0Ly8hIGdsb2JhbCB2YXJpYmxlIGNvbnRhaW5pbmcgcmVmZXJlbmNlIHRvIHRoZSBET00gZWxlbWVudFxuXHR2YXIgZGl2O1xuXG5cblx0aWYgKHNldHRpbmdzLmRlYnVnKSBjb25zb2xlLmxvZygnd2F0ZXJtYXJrOiBSZWdpc3RlciBpbml0Jyk7XG5cblx0dmFyIG9wdGlvbnMsIHBsYXllciwgdmlkZW8sIGltZywgbGluaztcblx0b3B0aW9ucyA9IGV4dGVuZChkZWZhdWx0cywgc2V0dGluZ3MpO1xuXG5cdC8qIEdyYWIgdGhlIG5lY2Vzc2FyeSBET00gZWxlbWVudHMgKi9cblx0cGxheWVyID0gdGhpcy5lbCgpO1xuXHR2aWRlbyA9IHRoaXMuZWwoKS5nZXRFbGVtZW50c0J5VGFnTmFtZSgndmlkZW8nKVswXTtcblxuXHQvLyBjcmVhdGUgdGhlIHdhdGVybWFyayBlbGVtZW50XG5cdGlmICghZGl2KSB7XG5cdFx0ZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0ZGl2LmNsYXNzTmFtZSA9IG9wdGlvbnMuY2xhc3NOYW1lO1xuXHR9IGVsc2Uge1xuXHRcdC8vISBpZiBkaXYgYWxyZWFkeSBleGlzdHMsIGVtcHR5IGl0XG5cdFx0ZGl2LmlubmVySFRNTCA9ICcnO1xuXHR9XG5cblx0Ly8gaWYgdGV4dCBpcyBzZXQsIGRpc3BsYXkgdGV4dFxuXHRpZiAob3B0aW9ucy50ZXh0KVxuXHRcdGRpdi50ZXh0Q29udGVudCA9IG9wdGlvbnMudGV4dDtcblxuXHQvLyBpZiBpbWcgaXMgc2V0LCBhZGQgaW1nXG5cdGlmIChvcHRpb25zLmZpbGUpIHtcblx0XHRpbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcblx0XHRkaXYuYXBwZW5kQ2hpbGQoaW1nKTtcblx0XHRpbWcuc3JjID0gb3B0aW9ucy5maWxlO1xuXHR9XG5cblx0Ly9pbWcuc3R5bGUuYm90dG9tID0gXCIwXCI7XG5cdC8vaW1nLnN0eWxlLnJpZ2h0ID0gXCIwXCI7XG5cdGlmICgob3B0aW9ucy55cG9zID09PSAwKSAmJiAob3B0aW9ucy54cG9zID09PSAwKSkgLy8gVG9wIGxlZnRcblx0e1xuXHRcdGRpdi5zdHlsZS50b3AgPSBcIjBcIjtcblx0XHRkaXYuc3R5bGUubGVmdCA9IFwiMFwiO1xuXHR9IGVsc2UgaWYgKChvcHRpb25zLnlwb3MgPT09IDApICYmIChvcHRpb25zLnhwb3MgPT09IDEwMCkpIC8vIFRvcCByaWdodFxuXHR7XG5cdFx0ZGl2LnN0eWxlLnRvcCA9IFwiMFwiO1xuXHRcdGRpdi5zdHlsZS5yaWdodCA9IFwiMFwiO1xuXHR9IGVsc2UgaWYgKChvcHRpb25zLnlwb3MgPT09IDEwMCkgJiYgKG9wdGlvbnMueHBvcyA9PT0gMTAwKSkgLy8gQm90dG9tIHJpZ2h0XG5cdHtcblx0XHRkaXYuc3R5bGUuYm90dG9tID0gXCIwXCI7XG5cdFx0ZGl2LnN0eWxlLnJpZ2h0ID0gXCIwXCI7XG5cdH0gZWxzZSBpZiAoKG9wdGlvbnMueXBvcyA9PT0gMTAwKSAmJiAob3B0aW9ucy54cG9zID09PSAwKSkgLy8gQm90dG9tIGxlZnRcblx0e1xuXHRcdGRpdi5zdHlsZS5ib3R0b20gPSBcIjBcIjtcblx0XHRkaXYuc3R5bGUubGVmdCA9IFwiMFwiO1xuXHR9IGVsc2UgaWYgKChvcHRpb25zLnlwb3MgPT09IDUwKSAmJiAob3B0aW9ucy54cG9zID09PSA1MCkpIC8vIENlbnRlclxuXHR7XG5cdFx0aWYgKG9wdGlvbnMuZGVidWcpIGNvbnNvbGUubG9nKCd3YXRlcm1hcms6IHBsYXllcjonICsgcGxheWVyLndpZHRoICsgJ3gnICsgcGxheWVyLmhlaWdodCk7XG5cdFx0aWYgKG9wdGlvbnMuZGVidWcpIGNvbnNvbGUubG9nKCd3YXRlcm1hcms6IHZpZGVvOicgKyB2aWRlby52aWRlb1dpZHRoICsgJ3gnICsgdmlkZW8udmlkZW9IZWlnaHQpO1xuXHRcdGlmIChvcHRpb25zLmRlYnVnKSBjb25zb2xlLmxvZygnd2F0ZXJtYXJrOiBpbWFnZTonICsgaW1nLndpZHRoICsgJ3gnICsgaW1nLmhlaWdodCk7XG5cdFx0ZGl2LnN0eWxlLnRvcCA9ICh0aGlzLmhlaWdodCgpIC8gMikgKyBcInB4XCI7XG5cdFx0ZGl2LnN0eWxlLmxlZnQgPSAodGhpcy53aWR0aCgpIC8gMikgKyBcInB4XCI7XG5cdH1cblx0ZGl2LnN0eWxlLm9wYWNpdHkgPSBvcHRpb25zLm9wYWNpdHk7XG5cblx0Ly9kaXYuc3R5bGUuYmFja2dyb3VuZEltYWdlID0gXCJ1cmwoXCIrb3B0aW9ucy5maWxlK1wiKVwiO1xuXHQvL2Rpdi5zdHlsZS5iYWNrZ3JvdW5kUG9zaXRpb24ueCA9IG9wdGlvbnMueHBvcytcIiVcIjtcblx0Ly9kaXYuc3R5bGUuYmFja2dyb3VuZFBvc2l0aW9uLnkgPSBvcHRpb25zLnlwb3MrXCIlXCI7XG5cdC8vZGl2LnN0eWxlLmJhY2tncm91bmRSZXBlYXQgPSBvcHRpb25zLnhyZXBlYXQ7XG5cdC8vZGl2LnN0eWxlLm9wYWNpdHkgPSAob3B0aW9ucy5vcGFjaXR5LzEwMCk7XG5cblx0Ly9pZiB1c2VyIHdhbnRzIHdhdGVybWFyayB0byBiZSBjbGlja2FibGUsIGFkZCBhbmNob3IgZWxlbVxuXHQvL3RvZG86IGNoZWNrIGlmIG9wdGlvbnMudXJsIGlzIGFuIGFjdHVhbCB1cmw/XG5cdGlmIChvcHRpb25zLmNsaWNrYWJsZSAmJiBvcHRpb25zLnVybCAhPT0gXCJcIikge1xuXHRcdGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYVwiKTtcblx0XHRsaW5rLmhyZWYgPSBvcHRpb25zLnVybDtcblx0XHRsaW5rLnRhcmdldCA9IFwiX2JsYW5rXCI7XG5cdFx0bGluay5hcHBlbmRDaGlsZChkaXYpO1xuXHRcdC8vYWRkIGNsaWNrYWJsZSB3YXRlcm1hcmsgdG8gdGhlIHBsYXllclxuXHRcdHBsYXllci5hcHBlbmRDaGlsZChsaW5rKTtcblx0fSBlbHNlIHtcblx0XHQvL2FkZCBub3JtYWwgd2F0ZXJtYXJrIHRvIHRoZSBwbGF5ZXJcblx0XHRwbGF5ZXIuYXBwZW5kQ2hpbGQoZGl2KTtcblx0fVxuXG5cdGlmIChvcHRpb25zLmRlYnVnKSBjb25zb2xlLmxvZygnd2F0ZXJtYXJrOiBSZWdpc3RlciBlbmQnKTtcbn07XG5cbi8vIFJlZ2lzdGVyIHRoZSBwbHVnaW4gd2l0aCB2aWRlby5qcy5cbnZpZGVvanMucGx1Z2luKCdvcGVuJywgb3Blbik7XG52aWRlb2pzLnBsdWdpbigndmlkZW9Kc1Jlc29sdXRpb25Td2l0Y2hlcicsIHZpZGVvSnNSZXNvbHV0aW9uU3dpdGNoZXIpO1xudmlkZW9qcy5wbHVnaW4oJ2Rpc2FibGVQcm9ncmVzcycsIGRpc2FibGVQcm9ncmVzcyk7XG52aWRlb2pzLnBsdWdpbignbWFya2VycycsIG1hcmtlcnMpO1xudmlkZW9qcy5wbHVnaW4oJ3dhdGVyTWFyaycsIHdhdGVyTWFyayk7XG5cbi8vIEluY2x1ZGUgdGhlIHZlcnNpb24gbnVtYmVyLlxub3Blbi5WRVJTSU9OID0gJ19fVkVSU0lPTl9fJztcblxuZXhwb3J0IGRlZmF1bHQgb3BlbjsiXX0=

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

// 分辨率
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

// 禁用滚动条拖动
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

// 打点
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

// 水印
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvb3Blbi9Eb2N1bWVudHMvV29yay9Tb3VyY2VUcmVlL3Zqcy1vcGVuL3NyYy9wbHVnaW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7dUJDQW9CLFVBQVU7Ozs7O0FBRzlCLElBQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQzs7Ozs7Ozs7Ozs7OztBQWFwQixJQUFNLGFBQWEsR0FBRyxTQUFoQixhQUFhLENBQUksTUFBTSxFQUFFLE9BQU8sRUFBSztBQUMxQyxPQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0NBRTVCLENBQUM7Ozs7Ozs7Ozs7Ozs7O0FBY0YsSUFBTSxJQUFJLEdBQUcsU0FBUCxJQUFJLENBQVksT0FBTyxFQUFFOzs7QUFDOUIsS0FBSSxDQUFDLEtBQUssQ0FBQyxZQUFNO0FBQ2hCLGVBQWEsUUFBTyxxQkFBUSxZQUFZLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7RUFDN0QsQ0FBQyxDQUFDO0NBQ0gsQ0FBQzs7O0FBR0YsSUFBTSx5QkFBeUIsR0FBRyxtQ0FBUyxPQUFPLEVBQUU7Ozs7Ozs7QUFPbkQsS0FBSSxRQUFRLEdBQUcscUJBQVEsWUFBWSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUM7S0FDckQsTUFBTSxHQUFHLElBQUk7S0FDYixVQUFVLEdBQUcsRUFBRTtLQUNmLGNBQWMsR0FBRyxFQUFFO0tBQ25CLHNCQUFzQixHQUFHLEVBQUUsQ0FBQzs7Ozs7OztBQU83QixPQUFNLENBQUMsU0FBUyxHQUFHLFVBQVMsR0FBRyxFQUFFOztBQUVoQyxNQUFJLENBQUMsR0FBRyxFQUFFO0FBQ1QsVUFBTyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7R0FDcEI7OztBQUdELEtBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVMsTUFBTSxFQUFFO0FBQ2pDLE9BQUk7QUFDSCxXQUFRLE1BQU0sQ0FB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QUM7QUFDbkMscUJBQVEsTUFBTSxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQzs7O0FBR3ZDLElBQUksQ0FBQyxPQUFPLEdBQUcsYUFBYSxDQUFDOztxQkFFZCxJQUFJIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImltcG9ydCB2aWRlb2pzIGZyb20gJ3ZpZGVvLmpzJztcblxuLy8gRGVmYXVsdCBvcHRpb25zIGZvciB0aGUgcGx1Z2luLlxuY29uc3QgZGVmYXVsdHMgPSB7fTtcblxuLyoqXG4gKiBGdW5jdGlvbiB0byBpbnZva2Ugd2hlbiB0aGUgcGxheWVyIGlzIHJlYWR5LlxuICpcbiAqIFRoaXMgaXMgYSBncmVhdCBwbGFjZSBmb3IgeW91ciBwbHVnaW4gdG8gaW5pdGlhbGl6ZSBpdHNlbGYuIFdoZW4gdGhpc1xuICogZnVuY3Rpb24gaXMgY2FsbGVkLCB0aGUgcGxheWVyIHdpbGwgaGF2ZSBpdHMgRE9NIGFuZCBjaGlsZCBjb21wb25lbnRzXG4gKiBpbiBwbGFjZS5cbiAqXG4gKiBAZnVuY3Rpb24gb25QbGF5ZXJSZWFkeVxuICogQHBhcmFtICAgIHtQbGF5ZXJ9IHBsYXllclxuICogQHBhcmFtICAgIHtPYmplY3R9IFtvcHRpb25zPXt9XVxuICovXG5jb25zdCBvblBsYXllclJlYWR5ID0gKHBsYXllciwgb3B0aW9ucykgPT4ge1xuXHRwbGF5ZXIuYWRkQ2xhc3MoJ3Zqcy1vcGVuJyk7XG5cbn07XG5cbi8qKlxuICogQSB2aWRlby5qcyBwbHVnaW4uXG4gKlxuICogSW4gdGhlIHBsdWdpbiBmdW5jdGlvbiwgdGhlIHZhbHVlIG9mIGB0aGlzYCBpcyBhIHZpZGVvLmpzIGBQbGF5ZXJgXG4gKiBpbnN0YW5jZS4gWW91IGNhbm5vdCByZWx5IG9uIHRoZSBwbGF5ZXIgYmVpbmcgaW4gYSBcInJlYWR5XCIgc3RhdGUgaGVyZSxcbiAqIGRlcGVuZGluZyBvbiBob3cgdGhlIHBsdWdpbiBpcyBpbnZva2VkLiBUaGlzIG1heSBvciBtYXkgbm90IGJlIGltcG9ydGFudFxuICogdG8geW91OyBpZiBub3QsIHJlbW92ZSB0aGUgd2FpdCBmb3IgXCJyZWFkeVwiIVxuICpcbiAqIEBmdW5jdGlvbiBvcGVuXG4gKiBAcGFyYW0gICAge09iamVjdH0gW29wdGlvbnM9e31dXG4gKiAgICAgICAgICAgQW4gb2JqZWN0IG9mIG9wdGlvbnMgbGVmdCB0byB0aGUgcGx1Z2luIGF1dGhvciB0byBkZWZpbmUuXG4gKi9cbmNvbnN0IG9wZW4gPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdHRoaXMucmVhZHkoKCkgPT4ge1xuXHRcdG9uUGxheWVyUmVhZHkodGhpcywgdmlkZW9qcy5tZXJnZU9wdGlvbnMoZGVmYXVsdHMsIG9wdGlvbnMpKTtcblx0fSk7XG59O1xuXG4vLyDliIbovqjnjodcbmNvbnN0IHZpZGVvSnNSZXNvbHV0aW9uU3dpdGNoZXIgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cblx0LyoqXG5cdCAqIEluaXRpYWxpemUgdGhlIHBsdWdpbi5cblx0ICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXSBjb25maWd1cmF0aW9uIGZvciB0aGUgcGx1Z2luXG5cdCAqL1xuXG5cdHZhciBzZXR0aW5ncyA9IHZpZGVvanMubWVyZ2VPcHRpb25zKGRlZmF1bHRzLCBvcHRpb25zKSxcblx0XHRwbGF5ZXIgPSB0aGlzLFxuXHRcdGdyb3VwZWRTcmMgPSB7fSxcblx0XHRjdXJyZW50U291cmNlcyA9IHt9LFxuXHRcdGN1cnJlbnRSZXNvbHV0aW9uU3RhdGUgPSB7fTtcblxuXHQvKipcblx0ICogVXBkYXRlcyBwbGF5ZXIgc291cmNlcyBvciByZXR1cm5zIGN1cnJlbnQgc291cmNlIFVSTFxuXHQgKiBAcGFyYW0gICB7QXJyYXl9ICBbc3JjXSBhcnJheSBvZiBzb3VyY2VzIFt7c3JjOiAnJywgdHlwZTogJycsIGxhYmVsOiAnJywgcmVzOiAnJ31dXG5cdCAqIEByZXR1cm5zIHtPYmplY3R8U3RyaW5nfEFycmF5fSB2aWRlb2pzIHBsYXllciBvYmplY3QgaWYgdXNlZCBhcyBzZXR0ZXIgb3IgY3VycmVudCBzb3VyY2UgVVJMLCBvYmplY3QsIG9yIGFycmF5IG9mIHNvdXJjZXNcblx0ICovXG5cdHBsYXllci51cGRhdGVTcmMgPSBmdW5jdGlvbihzcmMpIHtcblx0XHQvL1JldHVybiBjdXJyZW50IHNyYyBpZiBzcmMgaXMgbm90IGdpdmVuXG5cdFx0aWYgKCFzcmMpIHtcblx0XHRcdHJldHVybiBwbGF5ZXIuc3JjKCk7XG5cdFx0fVxuXG5cdFx0Ly8gT25seSBhZGQgdGhvc2Ugc291cmNlcyB3aGljaCB3ZSBjYW4gKG1heWJlKSBwbGF5XG5cdFx0c3JjID0gc3JjLmZpbHRlcihmdW5jdGlvbihzb3VyY2UpIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHJldHVybiAocGxheWVyLmNhblBsYXlUeXBlKHNvdXJjZS50eXBlKSAhPT0gJycpO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHQvLyBJZiBhIFRlY2ggZG9lc24ndCB5ZXQgaGF2ZSBjYW5QbGF5VHlwZSBqdXN0IGFkZCBpdFxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHQvL1NvcnQgc291cmNlc1xuXHRcdHRoaXMuY3VycmVudFNvdXJjZXMgPSBzcmMuc29ydChjb21wYXJlUmVzb2x1dGlvbnMpO1xuXHRcdHRoaXMuZ3JvdXBlZFNyYyA9IGJ1Y2tldFNvdXJjZXModGhpcy5jdXJyZW50U291cmNlcyk7XG5cdFx0Ly8gUGljayBvbmUgYnkgZGVmYXVsdFxuXHRcdHZhciBjaG9zZW4gPSBjaG9vc2VTcmModGhpcy5ncm91cGVkU3JjLCB0aGlzLmN1cnJlbnRTb3VyY2VzKTtcblx0XHR0aGlzLmN1cnJlbnRSZXNvbHV0aW9uU3RhdGUgPSB7XG5cdFx0XHRsYWJlbDogY2hvc2VuLmxhYmVsLFxuXHRcdFx0c291cmNlczogY2hvc2VuLnNvdXJjZXNcblx0XHR9O1xuXG5cdFx0cGxheWVyLnRyaWdnZXIoJ3VwZGF0ZVNvdXJjZXMnKTtcblx0XHRwbGF5ZXIuc2V0U291cmNlc1Nhbml0aXplZChjaG9zZW4uc291cmNlcywgY2hvc2VuLmxhYmVsKTtcblx0XHRwbGF5ZXIudHJpZ2dlcigncmVzb2x1dGlvbmNoYW5nZScpO1xuXHRcdHJldHVybiBwbGF5ZXI7XG5cdH07XG5cblx0LyoqXG5cdCAqIFJldHVybnMgY3VycmVudCByZXNvbHV0aW9uIG9yIHNldHMgb25lIHdoZW4gbGFiZWwgaXMgc3BlY2lmaWVkXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSAgIFtsYWJlbF0gICAgICAgICBsYWJlbCBuYW1lXG5cdCAqIEBwYXJhbSB7RnVuY3Rpb259IFtjdXN0b21Tb3VyY2VQaWNrZXJdIGN1c3RvbSBmdW5jdGlvbiB0byBjaG9vc2Ugc291cmNlLiBUYWtlcyAyIGFyZ3VtZW50czogc291cmNlcywgbGFiZWwuIE11c3QgcmV0dXJuIHBsYXllciBvYmplY3QuXG5cdCAqIEByZXR1cm5zIHtPYmplY3R9ICAgY3VycmVudCByZXNvbHV0aW9uIG9iamVjdCB7bGFiZWw6ICcnLCBzb3VyY2VzOiBbXX0gaWYgdXNlZCBhcyBnZXR0ZXIgb3IgcGxheWVyIG9iamVjdCBpZiB1c2VkIGFzIHNldHRlclxuXHQgKi9cblx0cGxheWVyLmN1cnJlbnRSZXNvbHV0aW9uID0gZnVuY3Rpb24obGFiZWwsIGN1c3RvbVNvdXJjZVBpY2tlcikge1xuXHRcdGlmIChsYWJlbCA9PSBudWxsKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5jdXJyZW50UmVzb2x1dGlvblN0YXRlO1xuXHRcdH1cblxuXHRcdC8vIExvb2t1cCBzb3VyY2VzIGZvciBsYWJlbFxuXHRcdGlmICghdGhpcy5ncm91cGVkU3JjIHx8ICF0aGlzLmdyb3VwZWRTcmMubGFiZWwgfHwgIXRoaXMuZ3JvdXBlZFNyYy5sYWJlbFtsYWJlbF0pIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dmFyIHNvdXJjZXMgPSB0aGlzLmdyb3VwZWRTcmMubGFiZWxbbGFiZWxdO1xuXHRcdC8vIFJlbWVtYmVyIHBsYXllciBzdGF0ZVxuXHRcdHZhciBjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdHZhciBpc1BhdXNlZCA9IHBsYXllci5wYXVzZWQoKTtcblxuXHRcdC8vIEhpZGUgYmlnUGxheUJ1dHRvblxuXHRcdGlmICghaXNQYXVzZWQgJiYgdGhpcy5wbGF5ZXJfLm9wdGlvbnNfLmJpZ1BsYXlCdXR0b24pIHtcblx0XHRcdHRoaXMucGxheWVyXy5iaWdQbGF5QnV0dG9uLmhpZGUoKTtcblx0XHR9XG5cblx0XHQvLyBDaGFuZ2UgcGxheWVyIHNvdXJjZSBhbmQgd2FpdCBmb3IgbG9hZGVkZGF0YSBldmVudCwgdGhlbiBwbGF5IHZpZGVvXG5cdFx0Ly8gbG9hZGVkbWV0YWRhdGEgZG9lc24ndCB3b3JrIHJpZ2h0IG5vdyBmb3IgZmxhc2guXG5cdFx0Ly8gUHJvYmFibHkgYmVjYXVzZSBvZiBodHRwczovL2dpdGh1Yi5jb20vdmlkZW9qcy92aWRlby1qcy1zd2YvaXNzdWVzLzEyNFxuXHRcdC8vIElmIHBsYXllciBwcmVsb2FkIGlzICdub25lJyBhbmQgdGhlbiBsb2FkZWRkYXRhIG5vdCBmaXJlZC4gU28sIHdlIG5lZWQgdGltZXVwZGF0ZSBldmVudCBmb3Igc2VlayBoYW5kbGUgKHRpbWV1cGRhdGUgZG9lc24ndCB3b3JrIHByb3Blcmx5IHdpdGggZmxhc2gpXG5cdFx0dmFyIGhhbmRsZVNlZWtFdmVudCA9ICdsb2FkZWRkYXRhJztcblx0XHRpZiAodGhpcy5wbGF5ZXJfLnRlY2hOYW1lXyAhPT0gJ1lvdXR1YmUnICYmIHRoaXMucGxheWVyXy5wcmVsb2FkKCkgPT09ICdub25lJyAmJiB0aGlzLnBsYXllcl8udGVjaE5hbWVfICE9PSAnRmxhc2gnKSB7XG5cdFx0XHRoYW5kbGVTZWVrRXZlbnQgPSAndGltZXVwZGF0ZSc7XG5cdFx0fVxuXHRcdHBsYXllclxuXHRcdFx0LnNldFNvdXJjZXNTYW5pdGl6ZWQoc291cmNlcywgbGFiZWwsIGN1c3RvbVNvdXJjZVBpY2tlciB8fCBzZXR0aW5ncy5jdXN0b21Tb3VyY2VQaWNrZXIpXG5cdFx0XHQub25lKGhhbmRsZVNlZWtFdmVudCwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHBsYXllci5jdXJyZW50VGltZShjdXJyZW50VGltZSk7XG5cdFx0XHRcdHBsYXllci5oYW5kbGVUZWNoU2Vla2VkXygpO1xuXHRcdFx0XHRpZiAoIWlzUGF1c2VkKSB7XG5cdFx0XHRcdFx0Ly8gU3RhcnQgcGxheWluZyBhbmQgaGlkZSBsb2FkaW5nU3Bpbm5lciAoZmxhc2ggaXNzdWUgPylcblx0XHRcdFx0XHRwbGF5ZXIucGxheSgpLmhhbmRsZVRlY2hTZWVrZWRfKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cGxheWVyLnRyaWdnZXIoJ3Jlc29sdXRpb25jaGFuZ2UnKTtcblx0XHRcdH0pO1xuXHRcdHJldHVybiBwbGF5ZXI7XG5cdH07XG5cblx0LyoqXG5cdCAqIFJldHVybnMgZ3JvdXBlZCBzb3VyY2VzIGJ5IGxhYmVsLCByZXNvbHV0aW9uIGFuZCB0eXBlXG5cdCAqIEByZXR1cm5zIHtPYmplY3R9IGdyb3VwZWQgc291cmNlczogeyBsYWJlbDogeyBrZXk6IFtdIH0sIHJlczogeyBrZXk6IFtdIH0sIHR5cGU6IHsga2V5OiBbXSB9IH1cblx0ICovXG5cdHBsYXllci5nZXRHcm91cGVkU3JjID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuZ3JvdXBlZFNyYztcblx0fTtcblxuXHRwbGF5ZXIuc2V0U291cmNlc1Nhbml0aXplZCA9IGZ1bmN0aW9uKHNvdXJjZXMsIGxhYmVsLCBjdXN0b21Tb3VyY2VQaWNrZXIpIHtcblx0XHR0aGlzLmN1cnJlbnRSZXNvbHV0aW9uU3RhdGUgPSB7XG5cdFx0XHRsYWJlbDogbGFiZWwsXG5cdFx0XHRzb3VyY2VzOiBzb3VyY2VzXG5cdFx0fTtcblx0XHRpZiAodHlwZW9mIGN1c3RvbVNvdXJjZVBpY2tlciA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0cmV0dXJuIGN1c3RvbVNvdXJjZVBpY2tlcihwbGF5ZXIsIHNvdXJjZXMsIGxhYmVsKTtcblx0XHR9XG5cdFx0cGxheWVyLnNyYyhzb3VyY2VzLm1hcChmdW5jdGlvbihzcmMpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHNyYzogc3JjLnNyYyxcblx0XHRcdFx0dHlwZTogc3JjLnR5cGUsXG5cdFx0XHRcdHJlczogc3JjLnJlc1xuXHRcdFx0fTtcblx0XHR9KSk7XG5cdFx0cmV0dXJuIHBsYXllcjtcblx0fTtcblxuXHQvKipcblx0ICogTWV0aG9kIHVzZWQgZm9yIHNvcnRpbmcgbGlzdCBvZiBzb3VyY2VzXG5cdCAqIEBwYXJhbSAgIHtPYmplY3R9IGEgLSBzb3VyY2Ugb2JqZWN0IHdpdGggcmVzIHByb3BlcnR5XG5cdCAqIEBwYXJhbSAgIHtPYmplY3R9IGIgLSBzb3VyY2Ugb2JqZWN0IHdpdGggcmVzIHByb3BlcnR5XG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IHJlc3VsdCBvZiBjb21wYXJhdGlvblxuXHQgKi9cblx0ZnVuY3Rpb24gY29tcGFyZVJlc29sdXRpb25zKGEsIGIpIHtcblx0XHRpZiAoIWEucmVzIHx8ICFiLnJlcykge1xuXHRcdFx0cmV0dXJuIDA7XG5cdFx0fVxuXHRcdHJldHVybiAoK2IucmVzKSAtICgrYS5yZXMpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEdyb3VwIHNvdXJjZXMgYnkgbGFiZWwsIHJlc29sdXRpb24gYW5kIHR5cGVcblx0ICogQHBhcmFtICAge0FycmF5fSAgc3JjIEFycmF5IG9mIHNvdXJjZXNcblx0ICogQHJldHVybnMge09iamVjdH0gZ3JvdXBlZCBzb3VyY2VzOiB7IGxhYmVsOiB7IGtleTogW10gfSwgcmVzOiB7IGtleTogW10gfSwgdHlwZTogeyBrZXk6IFtdIH0gfVxuXHQgKi9cblx0ZnVuY3Rpb24gYnVja2V0U291cmNlcyhzcmMpIHtcblx0XHR2YXIgcmVzb2x1dGlvbnMgPSB7XG5cdFx0XHRsYWJlbDoge30sXG5cdFx0XHRyZXM6IHt9LFxuXHRcdFx0dHlwZToge31cblx0XHR9O1xuXHRcdHNyYy5tYXAoZnVuY3Rpb24oc291cmNlKSB7XG5cdFx0XHRpbml0UmVzb2x1dGlvbktleShyZXNvbHV0aW9ucywgJ2xhYmVsJywgc291cmNlKTtcblx0XHRcdGluaXRSZXNvbHV0aW9uS2V5KHJlc29sdXRpb25zLCAncmVzJywgc291cmNlKTtcblx0XHRcdGluaXRSZXNvbHV0aW9uS2V5KHJlc29sdXRpb25zLCAndHlwZScsIHNvdXJjZSk7XG5cblx0XHRcdGFwcGVuZFNvdXJjZVRvS2V5KHJlc29sdXRpb25zLCAnbGFiZWwnLCBzb3VyY2UpO1xuXHRcdFx0YXBwZW5kU291cmNlVG9LZXkocmVzb2x1dGlvbnMsICdyZXMnLCBzb3VyY2UpO1xuXHRcdFx0YXBwZW5kU291cmNlVG9LZXkocmVzb2x1dGlvbnMsICd0eXBlJywgc291cmNlKTtcblx0XHR9KTtcblx0XHRyZXR1cm4gcmVzb2x1dGlvbnM7XG5cdH1cblxuXHRmdW5jdGlvbiBpbml0UmVzb2x1dGlvbktleShyZXNvbHV0aW9ucywga2V5LCBzb3VyY2UpIHtcblx0XHRpZiAocmVzb2x1dGlvbnNba2V5XVtzb3VyY2Vba2V5XV0gPT0gbnVsbCkge1xuXHRcdFx0cmVzb2x1dGlvbnNba2V5XVtzb3VyY2Vba2V5XV0gPSBbXTtcblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiBhcHBlbmRTb3VyY2VUb0tleShyZXNvbHV0aW9ucywga2V5LCBzb3VyY2UpIHtcblx0XHRyZXNvbHV0aW9uc1trZXldW3NvdXJjZVtrZXldXS5wdXNoKHNvdXJjZSk7XG5cdH1cblxuXHQvKipcblx0ICogQ2hvb3NlIHNyYyBpZiBvcHRpb24uZGVmYXVsdCBpcyBzcGVjaWZpZWRcblx0ICogQHBhcmFtICAge09iamVjdH0gZ3JvdXBlZFNyYyB7cmVzOiB7IGtleTogW10gfX1cblx0ICogQHBhcmFtICAge0FycmF5fSAgc3JjIEFycmF5IG9mIHNvdXJjZXMgc29ydGVkIGJ5IHJlc29sdXRpb24gdXNlZCB0byBmaW5kIGhpZ2ggYW5kIGxvdyByZXNcblx0ICogQHJldHVybnMge09iamVjdH0ge3Jlczogc3RyaW5nLCBzb3VyY2VzOiBbXX1cblx0ICovXG5cdGZ1bmN0aW9uIGNob29zZVNyYyhncm91cGVkU3JjLCBzcmMpIHtcblx0XHR2YXIgc2VsZWN0ZWRSZXMgPSBzZXR0aW5nc1snZGVmYXVsdCddOyAvLyB1c2UgYXJyYXkgYWNjZXNzIGFzIGRlZmF1bHQgaXMgYSByZXNlcnZlZCBrZXl3b3JkXG5cdFx0dmFyIHNlbGVjdGVkTGFiZWwgPSAnJztcblx0XHRpZiAoc2VsZWN0ZWRSZXMgPT09ICdoaWdoJykge1xuXHRcdFx0c2VsZWN0ZWRSZXMgPSBzcmNbMF0ucmVzO1xuXHRcdFx0c2VsZWN0ZWRMYWJlbCA9IHNyY1swXS5sYWJlbDtcblx0XHR9IGVsc2UgaWYgKHNlbGVjdGVkUmVzID09PSAnbG93JyB8fCBzZWxlY3RlZFJlcyA9PSBudWxsIHx8ICFncm91cGVkU3JjLnJlc1tzZWxlY3RlZFJlc10pIHtcblx0XHRcdC8vIFNlbGVjdCBsb3ctcmVzIGlmIGRlZmF1bHQgaXMgbG93IG9yIG5vdCBzZXRcblx0XHRcdHNlbGVjdGVkUmVzID0gc3JjW3NyYy5sZW5ndGggLSAxXS5yZXM7XG5cdFx0XHRzZWxlY3RlZExhYmVsID0gc3JjW3NyYy5sZW5ndGggLSAxXS5sYWJlbDtcblx0XHR9IGVsc2UgaWYgKGdyb3VwZWRTcmMucmVzW3NlbGVjdGVkUmVzXSkge1xuXHRcdFx0c2VsZWN0ZWRMYWJlbCA9IGdyb3VwZWRTcmMucmVzW3NlbGVjdGVkUmVzXVswXS5sYWJlbDtcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzOiBzZWxlY3RlZFJlcyxcblx0XHRcdGxhYmVsOiBzZWxlY3RlZExhYmVsLFxuXHRcdFx0c291cmNlczogZ3JvdXBlZFNyYy5yZXNbc2VsZWN0ZWRSZXNdXG5cdFx0fTtcblx0fVxuXG5cdGZ1bmN0aW9uIGluaXRSZXNvbHV0aW9uRm9yWXQocGxheWVyKSB7XG5cdFx0Ly8gTWFwIHlvdXR1YmUgcXVhbGl0aWVzIG5hbWVzXG5cdFx0dmFyIF95dHMgPSB7XG5cdFx0XHRoaWdocmVzOiB7XG5cdFx0XHRcdHJlczogMTA4MCxcblx0XHRcdFx0bGFiZWw6ICcxMDgwJyxcblx0XHRcdFx0eXQ6ICdoaWdocmVzJ1xuXHRcdFx0fSxcblx0XHRcdGhkMTA4MDoge1xuXHRcdFx0XHRyZXM6IDEwODAsXG5cdFx0XHRcdGxhYmVsOiAnMTA4MCcsXG5cdFx0XHRcdHl0OiAnaGQxMDgwJ1xuXHRcdFx0fSxcblx0XHRcdGhkNzIwOiB7XG5cdFx0XHRcdHJlczogNzIwLFxuXHRcdFx0XHRsYWJlbDogJzcyMCcsXG5cdFx0XHRcdHl0OiAnaGQ3MjAnXG5cdFx0XHR9LFxuXHRcdFx0bGFyZ2U6IHtcblx0XHRcdFx0cmVzOiA0ODAsXG5cdFx0XHRcdGxhYmVsOiAnNDgwJyxcblx0XHRcdFx0eXQ6ICdsYXJnZSdcblx0XHRcdH0sXG5cdFx0XHRtZWRpdW06IHtcblx0XHRcdFx0cmVzOiAzNjAsXG5cdFx0XHRcdGxhYmVsOiAnMzYwJyxcblx0XHRcdFx0eXQ6ICdtZWRpdW0nXG5cdFx0XHR9LFxuXHRcdFx0c21hbGw6IHtcblx0XHRcdFx0cmVzOiAyNDAsXG5cdFx0XHRcdGxhYmVsOiAnMjQwJyxcblx0XHRcdFx0eXQ6ICdzbWFsbCdcblx0XHRcdH0sXG5cdFx0XHR0aW55OiB7XG5cdFx0XHRcdHJlczogMTQ0LFxuXHRcdFx0XHRsYWJlbDogJzE0NCcsXG5cdFx0XHRcdHl0OiAndGlueSdcblx0XHRcdH0sXG5cdFx0XHRhdXRvOiB7XG5cdFx0XHRcdHJlczogMCxcblx0XHRcdFx0bGFiZWw6ICdhdXRvJyxcblx0XHRcdFx0eXQ6ICdhdXRvJ1xuXHRcdFx0fVxuXHRcdH07XG5cdFx0Ly8gT3ZlcndyaXRlIGRlZmF1bHQgc291cmNlUGlja2VyIGZ1bmN0aW9uXG5cdFx0dmFyIF9jdXN0b21Tb3VyY2VQaWNrZXIgPSBmdW5jdGlvbihfcGxheWVyLCBfc291cmNlcywgX2xhYmVsKSB7XG5cdFx0XHQvLyBOb3RlIHRoYXQgc2V0UGxheWViYWNrUXVhbGl0eSBpcyBhIHN1Z2dlc3Rpb24uIFlUIGRvZXMgbm90IGFsd2F5cyBvYmV5IGl0LlxuXHRcdFx0cGxheWVyLnRlY2hfLnl0UGxheWVyLnNldFBsYXliYWNrUXVhbGl0eShfc291cmNlc1swXS5feXQpO1xuXHRcdFx0cGxheWVyLnRyaWdnZXIoJ3VwZGF0ZVNvdXJjZXMnKTtcblx0XHRcdHJldHVybiBwbGF5ZXI7XG5cdFx0fTtcblx0XHRzZXR0aW5ncy5jdXN0b21Tb3VyY2VQaWNrZXIgPSBfY3VzdG9tU291cmNlUGlja2VyO1xuXG5cdFx0Ly8gSW5pdCByZXNvbHV0aW9uXG5cdFx0cGxheWVyLnRlY2hfLnl0UGxheWVyLnNldFBsYXliYWNrUXVhbGl0eSgnYXV0bycpO1xuXG5cdFx0Ly8gVGhpcyBpcyB0cmlnZ2VyZWQgd2hlbiB0aGUgcmVzb2x1dGlvbiBhY3R1YWxseSBjaGFuZ2VzXG5cdFx0cGxheWVyLnRlY2hfLnl0UGxheWVyLmFkZEV2ZW50TGlzdGVuZXIoJ29uUGxheWJhY2tRdWFsaXR5Q2hhbmdlJywgZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdGZvciAodmFyIHJlcyBpbiBfeXRzKSB7XG5cdFx0XHRcdGlmIChyZXMueXQgPT09IGV2ZW50LmRhdGEpIHtcblx0XHRcdFx0XHRwbGF5ZXIuY3VycmVudFJlc29sdXRpb24ocmVzLmxhYmVsLCBfY3VzdG9tU291cmNlUGlja2VyKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdC8vIFdlIG11c3Qgd2FpdCBmb3IgcGxheSBldmVudFxuXHRcdHBsYXllci5vbmUoJ3BsYXknLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBxdWFsaXRpZXMgPSBwbGF5ZXIudGVjaF8ueXRQbGF5ZXIuZ2V0QXZhaWxhYmxlUXVhbGl0eUxldmVscygpO1xuXHRcdFx0dmFyIF9zb3VyY2VzID0gW107XG5cblx0XHRcdHF1YWxpdGllcy5tYXAoZnVuY3Rpb24ocSkge1xuXHRcdFx0XHRfc291cmNlcy5wdXNoKHtcblx0XHRcdFx0XHRzcmM6IHBsYXllci5zcmMoKS5zcmMsXG5cdFx0XHRcdFx0dHlwZTogcGxheWVyLnNyYygpLnR5cGUsXG5cdFx0XHRcdFx0bGFiZWw6IF95dHNbcV0ubGFiZWwsXG5cdFx0XHRcdFx0cmVzOiBfeXRzW3FdLnJlcyxcblx0XHRcdFx0XHRfeXQ6IF95dHNbcV0ueXRcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0cGxheWVyLmdyb3VwZWRTcmMgPSBidWNrZXRTb3VyY2VzKF9zb3VyY2VzKTtcblx0XHRcdHZhciBjaG9zZW4gPSB7XG5cdFx0XHRcdGxhYmVsOiAnYXV0bycsXG5cdFx0XHRcdHJlczogMCxcblx0XHRcdFx0c291cmNlczogcGxheWVyLmdyb3VwZWRTcmMubGFiZWwuYXV0b1xuXHRcdFx0fTtcblxuXHRcdFx0dGhpcy5jdXJyZW50UmVzb2x1dGlvblN0YXRlID0ge1xuXHRcdFx0XHRsYWJlbDogY2hvc2VuLmxhYmVsLFxuXHRcdFx0XHRzb3VyY2VzOiBjaG9zZW4uc291cmNlc1xuXHRcdFx0fTtcblxuXHRcdFx0cGxheWVyLnRyaWdnZXIoJ3VwZGF0ZVNvdXJjZXMnKTtcblx0XHRcdHBsYXllci5zZXRTb3VyY2VzU2FuaXRpemVkKGNob3Nlbi5zb3VyY2VzLCBjaG9zZW4ubGFiZWwsIF9jdXN0b21Tb3VyY2VQaWNrZXIpO1xuXHRcdH0pO1xuXHR9XG5cblx0cGxheWVyLnJlYWR5KGZ1bmN0aW9uKCkge1xuXHRcdGlmIChzZXR0aW5ncy51aSkge1xuXHRcdFx0dmFyIG1lbnVCdXR0b24gPSBuZXcgUmVzb2x1dGlvbk1lbnVCdXR0b24ocGxheWVyLCBzZXR0aW5ncyk7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5yZXNvbHV0aW9uU3dpdGNoZXIgPSBwbGF5ZXIuY29udHJvbEJhci5lbF8uaW5zZXJ0QmVmb3JlKG1lbnVCdXR0b24uZWxfLCBwbGF5ZXIuY29udHJvbEJhci5nZXRDaGlsZCgnZnVsbHNjcmVlblRvZ2dsZScpLmVsXyk7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5yZXNvbHV0aW9uU3dpdGNoZXIuZGlzcG9zZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR0aGlzLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcyk7XG5cdFx0XHR9O1xuXHRcdH1cblx0XHRpZiAocGxheWVyLm9wdGlvbnNfLnNvdXJjZXMubGVuZ3RoID4gMSkge1xuXHRcdFx0Ly8gdGVjaDogSHRtbDUgYW5kIEZsYXNoXG5cdFx0XHQvLyBDcmVhdGUgcmVzb2x1dGlvbiBzd2l0Y2hlciBmb3IgdmlkZW9zIGZvcm0gPHNvdXJjZT4gdGFnIGluc2lkZSA8dmlkZW8+XG5cdFx0XHRwbGF5ZXIudXBkYXRlU3JjKHBsYXllci5vcHRpb25zXy5zb3VyY2VzKTtcblx0XHR9XG5cblx0XHRpZiAocGxheWVyLnRlY2hOYW1lXyA9PT0gJ1lvdXR1YmUnKSB7XG5cdFx0XHQvLyB0ZWNoOiBZb3VUdWJlXG5cdFx0XHRpbml0UmVzb2x1dGlvbkZvcll0KHBsYXllcik7XG5cdFx0fVxuXHR9KTtcblxuXHR2YXIgdmlkZW9Kc1Jlc29sdXRpb25Td2l0Y2hlcixcblx0XHRkZWZhdWx0cyA9IHtcblx0XHRcdHVpOiB0cnVlXG5cdFx0fTtcblxuXHQvKlxuXHQgKiBSZXNvbHV0aW9uIG1lbnUgaXRlbVxuXHQgKi9cblx0dmFyIE1lbnVJdGVtID0gdmlkZW9qcy5nZXRDb21wb25lbnQoJ01lbnVJdGVtJyk7XG5cdHZhciBSZXNvbHV0aW9uTWVudUl0ZW0gPSB2aWRlb2pzLmV4dGVuZChNZW51SXRlbSwge1xuXHRcdGNvbnN0cnVjdG9yOiBmdW5jdGlvbihwbGF5ZXIsIG9wdGlvbnMpIHtcblx0XHRcdG9wdGlvbnMuc2VsZWN0YWJsZSA9IHRydWU7XG5cdFx0XHQvLyBTZXRzIHRoaXMucGxheWVyXywgdGhpcy5vcHRpb25zXyBhbmQgaW5pdGlhbGl6ZXMgdGhlIGNvbXBvbmVudFxuXHRcdFx0TWVudUl0ZW0uY2FsbCh0aGlzLCBwbGF5ZXIsIG9wdGlvbnMpO1xuXHRcdFx0dGhpcy5zcmMgPSBvcHRpb25zLnNyYztcblxuXHRcdFx0cGxheWVyLm9uKCdyZXNvbHV0aW9uY2hhbmdlJywgdmlkZW9qcy5iaW5kKHRoaXMsIHRoaXMudXBkYXRlKSk7XG5cdFx0fVxuXHR9KTtcblx0UmVzb2x1dGlvbk1lbnVJdGVtLnByb3RvdHlwZS5oYW5kbGVDbGljayA9IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0TWVudUl0ZW0ucHJvdG90eXBlLmhhbmRsZUNsaWNrLmNhbGwodGhpcywgZXZlbnQpO1xuXHRcdHRoaXMucGxheWVyXy5jdXJyZW50UmVzb2x1dGlvbih0aGlzLm9wdGlvbnNfLmxhYmVsKTtcblx0fTtcblx0UmVzb2x1dGlvbk1lbnVJdGVtLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZWN0aW9uID0gdGhpcy5wbGF5ZXJfLmN1cnJlbnRSZXNvbHV0aW9uKCk7XG5cdFx0dGhpcy5zZWxlY3RlZCh0aGlzLm9wdGlvbnNfLmxhYmVsID09PSBzZWxlY3Rpb24ubGFiZWwpO1xuXHR9O1xuXHRNZW51SXRlbS5yZWdpc3RlckNvbXBvbmVudCgnUmVzb2x1dGlvbk1lbnVJdGVtJywgUmVzb2x1dGlvbk1lbnVJdGVtKTtcblxuXHQvKlxuXHQgKiBSZXNvbHV0aW9uIG1lbnUgYnV0dG9uXG5cdCAqL1xuXHR2YXIgTWVudUJ1dHRvbiA9IHZpZGVvanMuZ2V0Q29tcG9uZW50KCdNZW51QnV0dG9uJyk7XG5cdHZhciBSZXNvbHV0aW9uTWVudUJ1dHRvbiA9IHZpZGVvanMuZXh0ZW5kKE1lbnVCdXR0b24sIHtcblx0XHRjb25zdHJ1Y3RvcjogZnVuY3Rpb24ocGxheWVyLCBvcHRpb25zKSB7XG5cdFx0XHR0aGlzLmxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuXHRcdFx0b3B0aW9ucy5sYWJlbCA9ICdRdWFsaXR5Jztcblx0XHRcdC8vIFNldHMgdGhpcy5wbGF5ZXJfLCB0aGlzLm9wdGlvbnNfIGFuZCBpbml0aWFsaXplcyB0aGUgY29tcG9uZW50XG5cdFx0XHRNZW51QnV0dG9uLmNhbGwodGhpcywgcGxheWVyLCBvcHRpb25zKTtcblx0XHRcdHRoaXMuZWwoKS5zZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnLCAnUXVhbGl0eScpO1xuXHRcdFx0dGhpcy5jb250cm9sVGV4dCgnUXVhbGl0eScpO1xuXG5cdFx0XHRpZiAob3B0aW9ucy5keW5hbWljTGFiZWwpIHtcblx0XHRcdFx0dmlkZW9qcy5hZGRDbGFzcyh0aGlzLmxhYmVsLCAndmpzLXJlc29sdXRpb24tYnV0dG9uLWxhYmVsJyk7XG5cdFx0XHRcdHRoaXMuZWwoKS5hcHBlbmRDaGlsZCh0aGlzLmxhYmVsKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZhciBzdGF0aWNMYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0XHRcdFx0dmlkZW9qcy5hZGRDbGFzcyhzdGF0aWNMYWJlbCwgJ3Zqcy1tZW51LWljb24nKTtcblx0XHRcdFx0dGhpcy5lbCgpLmFwcGVuZENoaWxkKHN0YXRpY0xhYmVsKTtcblx0XHRcdH1cblx0XHRcdHBsYXllci5vbigndXBkYXRlU291cmNlcycsIHZpZGVvanMuYmluZCh0aGlzLCB0aGlzLnVwZGF0ZSkpO1xuXHRcdH1cblx0fSk7XG5cdFJlc29sdXRpb25NZW51QnV0dG9uLnByb3RvdHlwZS5jcmVhdGVJdGVtcyA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBtZW51SXRlbXMgPSBbXTtcblx0XHR2YXIgbGFiZWxzID0gKHRoaXMuc291cmNlcyAmJiB0aGlzLnNvdXJjZXMubGFiZWwpIHx8IHt9O1xuXG5cdFx0Ly8gRklYTUUgb3JkZXIgaXMgbm90IGd1YXJhbnRlZWQgaGVyZS5cblx0XHRmb3IgKHZhciBrZXkgaW4gbGFiZWxzKSB7XG5cdFx0XHRpZiAobGFiZWxzLmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdFx0bWVudUl0ZW1zLnB1c2gobmV3IFJlc29sdXRpb25NZW51SXRlbShcblx0XHRcdFx0XHR0aGlzLnBsYXllcl8sIHtcblx0XHRcdFx0XHRcdGxhYmVsOiBrZXksXG5cdFx0XHRcdFx0XHRzcmM6IGxhYmVsc1trZXldLFxuXHRcdFx0XHRcdFx0c2VsZWN0ZWQ6IGtleSA9PT0gKHRoaXMuY3VycmVudFNlbGVjdGlvbiA/IHRoaXMuY3VycmVudFNlbGVjdGlvbi5sYWJlbCA6IGZhbHNlKVxuXHRcdFx0XHRcdH0pKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIG1lbnVJdGVtcztcblx0fTtcblx0UmVzb2x1dGlvbk1lbnVCdXR0b24ucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuc291cmNlcyA9IHRoaXMucGxheWVyXy5nZXRHcm91cGVkU3JjKCk7XG5cdFx0dGhpcy5jdXJyZW50U2VsZWN0aW9uID0gdGhpcy5wbGF5ZXJfLmN1cnJlbnRSZXNvbHV0aW9uKCk7XG5cdFx0dGhpcy5sYWJlbC5pbm5lckhUTUwgPSB0aGlzLmN1cnJlbnRTZWxlY3Rpb24gPyB0aGlzLmN1cnJlbnRTZWxlY3Rpb24ubGFiZWwgOiAnJztcblx0XHRyZXR1cm4gTWVudUJ1dHRvbi5wcm90b3R5cGUudXBkYXRlLmNhbGwodGhpcyk7XG5cdH07XG5cdFJlc29sdXRpb25NZW51QnV0dG9uLnByb3RvdHlwZS5idWlsZENTU0NsYXNzID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIE1lbnVCdXR0b24ucHJvdG90eXBlLmJ1aWxkQ1NTQ2xhc3MuY2FsbCh0aGlzKSArICcgdmpzLXJlc29sdXRpb24tYnV0dG9uJztcblx0fTtcblx0TWVudUJ1dHRvbi5yZWdpc3RlckNvbXBvbmVudCgnUmVzb2x1dGlvbk1lbnVCdXR0b24nLCBSZXNvbHV0aW9uTWVudUJ1dHRvbik7XG5cblxuXG59O1xuXG4vLyDnpoHnlKjmu5rliqjmnaHmi5bliqhcbmNvbnN0IGRpc2FibGVQcm9ncmVzcyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0dmFyXG5cdC8qKlxuXHQgKiBDb3BpZXMgcHJvcGVydGllcyBmcm9tIG9uZSBvciBtb3JlIG9iamVjdHMgb250byBhbiBvcmlnaW5hbC5cblx0ICovXG5cdFx0ZXh0ZW5kID0gZnVuY3Rpb24ob2JqIC8qLCBhcmcxLCBhcmcyLCAuLi4gKi8gKSB7XG5cdFx0XHR2YXIgYXJnLCBpLCBrO1xuXHRcdFx0Zm9yIChpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRhcmcgPSBhcmd1bWVudHNbaV07XG5cdFx0XHRcdGZvciAoayBpbiBhcmcpIHtcblx0XHRcdFx0XHRpZiAoYXJnLmhhc093blByb3BlcnR5KGspKSB7XG5cdFx0XHRcdFx0XHRvYmpba10gPSBhcmdba107XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gb2JqO1xuXHRcdH0sXG5cblx0XHQvLyBkZWZpbmUgc29tZSByZWFzb25hYmxlIGRlZmF1bHRzIGZvciB0aGlzIHN3ZWV0IHBsdWdpblxuXHRcdGRlZmF1bHRzID0ge1xuXHRcdFx0YXV0b0Rpc2FibGU6IGZhbHNlXG5cdFx0fTtcblxuXG5cdHZhclxuXHQvLyBzYXZlIGEgcmVmZXJlbmNlIHRvIHRoZSBwbGF5ZXIgaW5zdGFuY2Vcblx0XHRwbGF5ZXIgPSB0aGlzLFxuXHRcdHN0YXRlID0gZmFsc2UsXG5cblx0XHQvLyBtZXJnZSBvcHRpb25zIGFuZCBkZWZhdWx0c1xuXHRcdHNldHRpbmdzID0gZXh0ZW5kKHt9LCBkZWZhdWx0cywgb3B0aW9ucyB8fCB7fSk7XG5cblx0Ly8gZGlzYWJsZSAvIGVuYWJsZSBtZXRob2RzXG5cdHBsYXllci5kaXNhYmxlUHJvZ3Jlc3MgPSB7XG5cdFx0ZGlzYWJsZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRzdGF0ZSA9IHRydWU7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vZmYoXCJmb2N1c1wiKTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9mZihcIm1vdXNlZG93blwiKTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9mZihcInRvdWNoc3RhcnRcIik7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vZmYoXCJjbGlja1wiKTtcblx0XHR9LFxuXHRcdGVuYWJsZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRzdGF0ZSA9IGZhbHNlO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub24oXCJmb2N1c1wiLCBwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5oYW5kbGVGb2N1cyk7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vbihcIm1vdXNlZG93blwiLCBwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5oYW5kbGVNb3VzZURvd24pO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub24oXCJ0b3VjaHN0YXJ0XCIsIHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLmhhbmRsZU1vdXNlRG93bik7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vbihcImNsaWNrXCIsIHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLmhhbmRsZUNsaWNrKTtcblx0XHR9LFxuXHRcdGdldFN0YXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBzdGF0ZTtcblx0XHR9XG5cdH07XG5cblx0aWYgKHNldHRpbmdzLmF1dG9EaXNhYmxlKSB7XG5cdFx0cGxheWVyLmRpc2FibGVQcm9ncmVzcy5kaXNhYmxlKCk7XG5cdH1cbn07XG5cbi8vIOaJk+eCuVxuY29uc3QgbWFya2VycyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0Ly9kZWZhdWx0IHNldHRpbmdcblx0dmFyIGRlZmF1bHRTZXR0aW5nID0ge1xuXHRcdG1hcmtlclN0eWxlOiB7XG5cdFx0XHQnd2lkdGgnOiAnOHB4Jyxcblx0XHRcdCdib3JkZXItcmFkaXVzJzogJzIwJScsXG5cdFx0XHQnYmFja2dyb3VuZC1jb2xvcic6ICdyZ2JhKDI1NSwwLDAsLjUpJ1xuXHRcdH0sXG5cdFx0bWFya2VyVGlwOiB7XG5cdFx0XHRkaXNwbGF5OiB0cnVlLFxuXHRcdFx0dGV4dDogZnVuY3Rpb24obWFya2VyKSB7XG5cdFx0XHRcdHJldHVybiBtYXJrZXIudGV4dDtcblx0XHRcdH0sXG5cdFx0XHR0aW1lOiBmdW5jdGlvbihtYXJrZXIpIHtcblx0XHRcdFx0cmV0dXJuIG1hcmtlci50aW1lO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0YnJlYWtPdmVybGF5OiB7XG5cdFx0XHRkaXNwbGF5OiBmYWxzZSxcblx0XHRcdGRpc3BsYXlUaW1lOiAzLFxuXHRcdFx0dGV4dDogZnVuY3Rpb24obWFya2VyKSB7XG5cdFx0XHRcdHJldHVybiBcIkJyZWFrIG92ZXJsYXk6IFwiICsgbWFya2VyLm92ZXJsYXlUZXh0O1xuXHRcdFx0fSxcblx0XHRcdHN0eWxlOiB7XG5cdFx0XHRcdCd3aWR0aCc6ICcxMDAlJyxcblx0XHRcdFx0J2hlaWdodCc6ICcyMCUnLFxuXHRcdFx0XHQnYmFja2dyb3VuZC1jb2xvcic6ICdyZ2JhKDAsMCwwLDAuNyknLFxuXHRcdFx0XHQnY29sb3InOiAnd2hpdGUnLFxuXHRcdFx0XHQnZm9udC1zaXplJzogJzE3cHgnXG5cdFx0XHR9XG5cdFx0fSxcblx0XHRvbk1hcmtlckNsaWNrOiBmdW5jdGlvbihtYXJrZXIpIHt9LFxuXHRcdG9uTWFya2VyUmVhY2hlZDogZnVuY3Rpb24obWFya2VyKSB7fSxcblx0XHRtYXJrZXJzOiBbXVxuXHR9O1xuXG5cdC8vIGNyZWF0ZSBhIG5vbi1jb2xsaWRpbmcgcmFuZG9tIG51bWJlclxuXHRmdW5jdGlvbiBnZW5lcmF0ZVVVSUQoKSB7XG5cdFx0dmFyIGQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblx0XHR2YXIgdXVpZCA9ICd4eHh4eHh4eC14eHh4LTR4eHgteXh4eC14eHh4eHh4eHh4eHgnLnJlcGxhY2UoL1t4eV0vZywgZnVuY3Rpb24oYykge1xuXHRcdFx0dmFyIHIgPSAoZCArIE1hdGgucmFuZG9tKCkgKiAxNikgJSAxNiB8IDA7XG5cdFx0XHRkID0gTWF0aC5mbG9vcihkIC8gMTYpO1xuXHRcdFx0cmV0dXJuIChjID09ICd4JyA/IHIgOiAociAmIDB4MyB8IDB4OCkpLnRvU3RyaW5nKDE2KTtcblx0XHR9KTtcblx0XHRyZXR1cm4gdXVpZDtcblx0fTtcblxuXHQvKipcblx0ICogcmVnaXN0ZXIgdGhlIG1hcmtlcnMgcGx1Z2luIChkZXBlbmRlbnQgb24ganF1ZXJ5KVxuXHQgKi9cblx0dmFyIHNldHRpbmcgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZGVmYXVsdFNldHRpbmcsIG9wdGlvbnMpLFxuXHRcdG1hcmtlcnNNYXAgPSB7fSxcblx0XHRtYXJrZXJzTGlzdCA9IFtdLCAvLyBsaXN0IG9mIG1hcmtlcnMgc29ydGVkIGJ5IHRpbWVcblx0XHR2aWRlb1dyYXBwZXIgPSAkKHRoaXMuZWwoKSksXG5cdFx0Y3VycmVudE1hcmtlckluZGV4ID0gLTEsXG5cdFx0cGxheWVyID0gdGhpcyxcblx0XHRtYXJrZXJUaXAgPSBudWxsLFxuXHRcdGJyZWFrT3ZlcmxheSA9IG51bGwsXG5cdFx0b3ZlcmxheUluZGV4ID0gLTE7XG5cblx0ZnVuY3Rpb24gc29ydE1hcmtlcnNMaXN0KCkge1xuXHRcdC8vIHNvcnQgdGhlIGxpc3QgYnkgdGltZSBpbiBhc2Mgb3JkZXJcblx0XHRtYXJrZXJzTGlzdC5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdHJldHVybiBzZXR0aW5nLm1hcmtlclRpcC50aW1lKGEpIC0gc2V0dGluZy5tYXJrZXJUaXAudGltZShiKTtcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIGFkZE1hcmtlcnMobmV3TWFya2Vycykge1xuXHRcdC8vIGNyZWF0ZSB0aGUgbWFya2Vyc1xuXHRcdCQuZWFjaChuZXdNYXJrZXJzLCBmdW5jdGlvbihpbmRleCwgbWFya2VyKSB7XG5cdFx0XHRtYXJrZXIua2V5ID0gZ2VuZXJhdGVVVUlEKCk7XG5cblx0XHRcdHZpZGVvV3JhcHBlci5maW5kKCcudmpzLXByb2dyZXNzLWNvbnRyb2wgLnZqcy1zbGlkZXInKS5hcHBlbmQoXG5cdFx0XHRcdGNyZWF0ZU1hcmtlckRpdihtYXJrZXIpKTtcblxuXHRcdFx0Ly8gc3RvcmUgbWFya2VyIGluIGFuIGludGVybmFsIGhhc2ggbWFwXG5cdFx0XHRtYXJrZXJzTWFwW21hcmtlci5rZXldID0gbWFya2VyO1xuXHRcdFx0bWFya2Vyc0xpc3QucHVzaChtYXJrZXIpO1xuXHRcdH0pO1xuXG5cdFx0c29ydE1hcmtlcnNMaXN0KCk7XG5cdH1cblxuXHRmdW5jdGlvbiBnZXRQb3NpdGlvbihtYXJrZXIpIHtcblx0XHRyZXR1cm4gKHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2VyKSAvIHBsYXllci5kdXJhdGlvbigpKSAqIDEwMFxuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlTWFya2VyRGl2KG1hcmtlciwgZHVyYXRpb24pIHtcblx0XHR2YXIgbWFya2VyRGl2ID0gJChcIjxkaXYgY2xhc3M9J3Zqcy1tYXJrZXInPjwvZGl2PlwiKVxuXHRcdG1hcmtlckRpdi5jc3Moc2V0dGluZy5tYXJrZXJTdHlsZSlcblx0XHRcdC5jc3Moe1xuXHRcdFx0XHQvLyBcIm1hcmdpbi1sZWZ0XCI6IC1wYXJzZUZsb2F0KG1hcmtlckRpdi5jc3MoXCJ3aWR0aFwiKSkgLyAyICsgJ3B4Jyxcblx0XHRcdFx0XCJsZWZ0XCI6IGdldFBvc2l0aW9uKG1hcmtlcikgKyAnJSdcblx0XHRcdH0pXG5cdFx0XHQuYXR0cihcImRhdGEtbWFya2VyLWtleVwiLCBtYXJrZXIua2V5KVxuXHRcdFx0LmF0dHIoXCJkYXRhLW1hcmtlci10aW1lXCIsIHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2VyKSk7XG5cblx0XHQvLyBhZGQgdXNlci1kZWZpbmVkIGNsYXNzIHRvIG1hcmtlclxuXHRcdGlmIChtYXJrZXIuY2xhc3MpIHtcblx0XHRcdG1hcmtlckRpdi5hZGRDbGFzcyhtYXJrZXIuY2xhc3MpO1xuXHRcdH1cblxuXHRcdC8vIGJpbmQgY2xpY2sgZXZlbnQgdG8gc2VlayB0byBtYXJrZXIgdGltZVxuXHRcdG1hcmtlckRpdi5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG5cblx0XHRcdHZhciBwcmV2ZW50RGVmYXVsdCA9IGZhbHNlO1xuXHRcdFx0aWYgKHR5cGVvZiBzZXR0aW5nLm9uTWFya2VyQ2xpY2sgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0XHQvLyBpZiByZXR1cm4gZmFsc2UsIHByZXZlbnQgZGVmYXVsdCBiZWhhdmlvclxuXHRcdFx0XHRwcmV2ZW50RGVmYXVsdCA9IHNldHRpbmcub25NYXJrZXJDbGljayhtYXJrZXIpID09IGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIXByZXZlbnREZWZhdWx0KSB7XG5cdFx0XHRcdHZhciBrZXkgPSAkKHRoaXMpLmRhdGEoJ21hcmtlci1rZXknKTtcblx0XHRcdFx0cGxheWVyLmN1cnJlbnRUaW1lKHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2Vyc01hcFtrZXldKSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRpZiAoc2V0dGluZy5tYXJrZXJUaXAuZGlzcGxheSkge1xuXHRcdFx0cmVnaXN0ZXJNYXJrZXJUaXBIYW5kbGVyKG1hcmtlckRpdik7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG1hcmtlckRpdjtcblx0fVxuXG5cdGZ1bmN0aW9uIHVwZGF0ZU1hcmtlcnMoKSB7XG5cdFx0Ly8gdXBkYXRlIFVJIGZvciBtYXJrZXJzIHdob3NlIHRpbWUgY2hhbmdlZFxuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBtYXJrZXJzTGlzdC5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIG1hcmtlciA9IG1hcmtlcnNMaXN0W2ldO1xuXHRcdFx0dmFyIG1hcmtlckRpdiA9IHZpZGVvV3JhcHBlci5maW5kKFwiLnZqcy1tYXJrZXJbZGF0YS1tYXJrZXIta2V5PSdcIiArIG1hcmtlci5rZXkgKyBcIiddXCIpO1xuXHRcdFx0dmFyIG1hcmtlclRpbWUgPSBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcik7XG5cblx0XHRcdGlmIChtYXJrZXJEaXYuZGF0YSgnbWFya2VyLXRpbWUnKSAhPSBtYXJrZXJUaW1lKSB7XG5cdFx0XHRcdG1hcmtlckRpdi5jc3Moe1xuXHRcdFx0XHRcdFx0XCJsZWZ0XCI6IGdldFBvc2l0aW9uKG1hcmtlcikgKyAnJSdcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC5hdHRyKFwiZGF0YS1tYXJrZXItdGltZVwiLCBtYXJrZXJUaW1lKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0c29ydE1hcmtlcnNMaXN0KCk7XG5cdH1cblxuXHRmdW5jdGlvbiByZW1vdmVNYXJrZXJzKGluZGV4QXJyYXkpIHtcblx0XHQvLyByZXNldCBvdmVybGF5XG5cdFx0aWYgKGJyZWFrT3ZlcmxheSkge1xuXHRcdFx0b3ZlcmxheUluZGV4ID0gLTE7XG5cdFx0XHRicmVha092ZXJsYXkuY3NzKFwidmlzaWJpbGl0eVwiLCBcImhpZGRlblwiKTtcblx0XHR9XG5cdFx0Y3VycmVudE1hcmtlckluZGV4ID0gLTE7XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGluZGV4QXJyYXkubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBpbmRleCA9IGluZGV4QXJyYXlbaV07XG5cdFx0XHR2YXIgbWFya2VyID0gbWFya2Vyc0xpc3RbaW5kZXhdO1xuXHRcdFx0aWYgKG1hcmtlcikge1xuXHRcdFx0XHQvLyBkZWxldGUgZnJvbSBtZW1vcnlcblx0XHRcdFx0ZGVsZXRlIG1hcmtlcnNNYXBbbWFya2VyLmtleV07XG5cdFx0XHRcdG1hcmtlcnNMaXN0W2luZGV4XSA9IG51bGw7XG5cblx0XHRcdFx0Ly8gZGVsZXRlIGZyb20gZG9tXG5cdFx0XHRcdHZpZGVvV3JhcHBlci5maW5kKFwiLnZqcy1tYXJrZXJbZGF0YS1tYXJrZXIta2V5PSdcIiArIG1hcmtlci5rZXkgKyBcIiddXCIpLnJlbW92ZSgpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIGNsZWFuIHVwIGFycmF5XG5cdFx0Zm9yICh2YXIgaSA9IG1hcmtlcnNMaXN0Lmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRpZiAobWFya2Vyc0xpc3RbaV0gPT09IG51bGwpIHtcblx0XHRcdFx0bWFya2Vyc0xpc3Quc3BsaWNlKGksIDEpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIHNvcnQgYWdhaW5cblx0XHRzb3J0TWFya2Vyc0xpc3QoKTtcblx0fVxuXG5cblx0Ly8gYXR0YWNoIGhvdmVyIGV2ZW50IGhhbmRsZXJcblx0ZnVuY3Rpb24gcmVnaXN0ZXJNYXJrZXJUaXBIYW5kbGVyKG1hcmtlckRpdikge1xuXG5cdFx0bWFya2VyRGl2Lm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBtYXJrZXIgPSBtYXJrZXJzTWFwWyQodGhpcykuZGF0YSgnbWFya2VyLWtleScpXTtcblxuXHRcdFx0bWFya2VyVGlwLmZpbmQoJy52anMtdGlwLWlubmVyJykuaHRtbChzZXR0aW5nLm1hcmtlclRpcC50ZXh0KG1hcmtlcikpO1xuXG5cdFx0XHQvLyBtYXJnaW4tbGVmdCBuZWVkcyB0byBtaW51cyB0aGUgcGFkZGluZyBsZW5ndGggdG8gYWxpZ24gY29ycmVjdGx5IHdpdGggdGhlIG1hcmtlclxuXHRcdFx0bWFya2VyVGlwLmNzcyh7XG5cdFx0XHRcdFwibGVmdFwiOiBnZXRQb3NpdGlvbihtYXJrZXIpICsgJyUnLFxuXHRcdFx0XHRcIm1hcmdpbi1sZWZ0XCI6IC1wYXJzZUZsb2F0KG1hcmtlclRpcC5jc3MoXCJ3aWR0aFwiKSkgLyAyIC0gNSArICdweCcsXG5cdFx0XHRcdFwidmlzaWJpbGl0eVwiOiBcInZpc2libGVcIlxuXHRcdFx0fSk7XG5cblx0XHR9KS5vbignbW91c2VvdXQnLCBmdW5jdGlvbigpIHtcblx0XHRcdG1hcmtlclRpcC5jc3MoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuXHRcdH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5pdGlhbGl6ZU1hcmtlclRpcCgpIHtcblx0XHRtYXJrZXJUaXAgPSAkKFwiPGRpdiBjbGFzcz0ndmpzLXRpcCc+PGRpdiBjbGFzcz0ndmpzLXRpcC1hcnJvdyc+PC9kaXY+PGRpdiBjbGFzcz0ndmpzLXRpcC1pbm5lcic+PC9kaXY+PC9kaXY+XCIpO1xuXHRcdHZpZGVvV3JhcHBlci5maW5kKCcudmpzLXByb2dyZXNzLWNvbnRyb2wgLnZqcy1zbGlkZXInKS5hcHBlbmQobWFya2VyVGlwKTtcblx0fVxuXG5cdC8vIHNob3cgb3IgaGlkZSBicmVhayBvdmVybGF5c1xuXHRmdW5jdGlvbiB1cGRhdGVCcmVha092ZXJsYXkoKSB7XG5cdFx0aWYgKCFzZXR0aW5nLmJyZWFrT3ZlcmxheS5kaXNwbGF5IHx8IGN1cnJlbnRNYXJrZXJJbmRleCA8IDApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR2YXIgY3VycmVudFRpbWUgPSBwbGF5ZXIuY3VycmVudFRpbWUoKTtcblx0XHR2YXIgbWFya2VyID0gbWFya2Vyc0xpc3RbY3VycmVudE1hcmtlckluZGV4XTtcblx0XHR2YXIgbWFya2VyVGltZSA9IHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2VyKTtcblxuXHRcdGlmIChjdXJyZW50VGltZSA+PSBtYXJrZXJUaW1lICYmXG5cdFx0XHRjdXJyZW50VGltZSA8PSAobWFya2VyVGltZSArIHNldHRpbmcuYnJlYWtPdmVybGF5LmRpc3BsYXlUaW1lKSkge1xuXHRcdFx0aWYgKG92ZXJsYXlJbmRleCAhPSBjdXJyZW50TWFya2VySW5kZXgpIHtcblx0XHRcdFx0b3ZlcmxheUluZGV4ID0gY3VycmVudE1hcmtlckluZGV4O1xuXHRcdFx0XHRicmVha092ZXJsYXkuZmluZCgnLnZqcy1icmVhay1vdmVybGF5LXRleHQnKS5odG1sKHNldHRpbmcuYnJlYWtPdmVybGF5LnRleHQobWFya2VyKSk7XG5cdFx0XHR9XG5cblx0XHRcdGJyZWFrT3ZlcmxheS5jc3MoJ3Zpc2liaWxpdHknLCBcInZpc2libGVcIik7XG5cblx0XHR9IGVsc2Uge1xuXHRcdFx0b3ZlcmxheUluZGV4ID0gLTE7XG5cdFx0XHRicmVha092ZXJsYXkuY3NzKFwidmlzaWJpbGl0eVwiLCBcImhpZGRlblwiKTtcblx0XHR9XG5cdH1cblxuXHQvLyBwcm9ibGVtIHdoZW4gdGhlIG5leHQgbWFya2VyIGlzIHdpdGhpbiB0aGUgb3ZlcmxheSBkaXNwbGF5IHRpbWUgZnJvbSB0aGUgcHJldmlvdXMgbWFya2VyXG5cdGZ1bmN0aW9uIGluaXRpYWxpemVPdmVybGF5KCkge1xuXHRcdGJyZWFrT3ZlcmxheSA9ICQoXCI8ZGl2IGNsYXNzPSd2anMtYnJlYWstb3ZlcmxheSc+PGRpdiBjbGFzcz0ndmpzLWJyZWFrLW92ZXJsYXktdGV4dCc+PC9kaXY+PC9kaXY+XCIpXG5cdFx0XHQuY3NzKHNldHRpbmcuYnJlYWtPdmVybGF5LnN0eWxlKTtcblx0XHR2aWRlb1dyYXBwZXIuYXBwZW5kKGJyZWFrT3ZlcmxheSk7XG5cdFx0b3ZlcmxheUluZGV4ID0gLTE7XG5cdH1cblxuXHRmdW5jdGlvbiBvblRpbWVVcGRhdGUoKSB7XG5cdFx0b25VcGRhdGVNYXJrZXIoKTtcblx0XHR1cGRhdGVCcmVha092ZXJsYXkoKTtcblx0fVxuXG5cdGZ1bmN0aW9uIG9uVXBkYXRlTWFya2VyKCkge1xuXHRcdC8qXG5cdFx0ICAgIGNoZWNrIG1hcmtlciByZWFjaGVkIGluIGJldHdlZW4gbWFya2Vyc1xuXHRcdCAgICB0aGUgbG9naWMgaGVyZSBpcyB0aGF0IGl0IHRyaWdnZXJzIGEgbmV3IG1hcmtlciByZWFjaGVkIGV2ZW50IG9ubHkgaWYgdGhlIHBsYXllciBcblx0XHQgICAgZW50ZXJzIGEgbmV3IG1hcmtlciByYW5nZSAoZS5nLiBmcm9tIG1hcmtlciAxIHRvIG1hcmtlciAyKS4gVGh1cywgaWYgcGxheWVyIGlzIG9uIG1hcmtlciAxIGFuZCB1c2VyIGNsaWNrZWQgb24gbWFya2VyIDEgYWdhaW4sIG5vIG5ldyByZWFjaGVkIGV2ZW50IGlzIHRyaWdnZXJlZClcblx0XHQqL1xuXG5cdFx0dmFyIGdldE5leHRNYXJrZXJUaW1lID0gZnVuY3Rpb24oaW5kZXgpIHtcblx0XHRcdGlmIChpbmRleCA8IG1hcmtlcnNMaXN0Lmxlbmd0aCAtIDEpIHtcblx0XHRcdFx0cmV0dXJuIHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2Vyc0xpc3RbaW5kZXggKyAxXSk7XG5cdFx0XHR9XG5cdFx0XHQvLyBuZXh0IG1hcmtlciB0aW1lIG9mIGxhc3QgbWFya2VyIHdvdWxkIGJlIGVuZCBvZiB2aWRlbyB0aW1lXG5cdFx0XHRyZXR1cm4gcGxheWVyLmR1cmF0aW9uKCk7XG5cdFx0fVxuXHRcdHZhciBjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdHZhciBuZXdNYXJrZXJJbmRleDtcblxuXHRcdGlmIChjdXJyZW50TWFya2VySW5kZXggIT0gLTEpIHtcblx0XHRcdC8vIGNoZWNrIGlmIHN0YXlpbmcgYXQgc2FtZSBtYXJrZXJcblx0XHRcdHZhciBuZXh0TWFya2VyVGltZSA9IGdldE5leHRNYXJrZXJUaW1lKGN1cnJlbnRNYXJrZXJJbmRleCk7XG5cdFx0XHRpZiAoY3VycmVudFRpbWUgPj0gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTGlzdFtjdXJyZW50TWFya2VySW5kZXhdKSAmJlxuXHRcdFx0XHRjdXJyZW50VGltZSA8IG5leHRNYXJrZXJUaW1lKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gY2hlY2sgZm9yIGVuZGluZyAoYXQgdGhlIGVuZCBjdXJyZW50IHRpbWUgZXF1YWxzIHBsYXllciBkdXJhdGlvbilcblx0XHRcdGlmIChjdXJyZW50TWFya2VySW5kZXggPT09IG1hcmtlcnNMaXN0Lmxlbmd0aCAtIDEgJiZcblx0XHRcdFx0Y3VycmVudFRpbWUgPT09IHBsYXllci5kdXJhdGlvbigpKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBjaGVjayBmaXJzdCBtYXJrZXIsIG5vIG1hcmtlciBpcyBzZWxlY3RlZFxuXHRcdGlmIChtYXJrZXJzTGlzdC5sZW5ndGggPiAwICYmXG5cdFx0XHRjdXJyZW50VGltZSA8IHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2Vyc0xpc3RbMF0pKSB7XG5cdFx0XHRuZXdNYXJrZXJJbmRleCA9IC0xO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBsb29rIGZvciBuZXcgaW5kZXhcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbWFya2Vyc0xpc3QubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0bmV4dE1hcmtlclRpbWUgPSBnZXROZXh0TWFya2VyVGltZShpKTtcblxuXHRcdFx0XHRpZiAoY3VycmVudFRpbWUgPj0gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTGlzdFtpXSkgJiZcblx0XHRcdFx0XHRjdXJyZW50VGltZSA8IG5leHRNYXJrZXJUaW1lKSB7XG5cdFx0XHRcdFx0bmV3TWFya2VySW5kZXggPSBpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gc2V0IG5ldyBtYXJrZXIgaW5kZXhcblx0XHRpZiAobmV3TWFya2VySW5kZXggIT0gY3VycmVudE1hcmtlckluZGV4KSB7XG5cdFx0XHQvLyB0cmlnZ2VyIGV2ZW50XG5cdFx0XHRpZiAobmV3TWFya2VySW5kZXggIT0gLTEgJiYgb3B0aW9ucy5vbk1hcmtlclJlYWNoZWQpIHtcblx0XHRcdFx0b3B0aW9ucy5vbk1hcmtlclJlYWNoZWQobWFya2Vyc0xpc3RbbmV3TWFya2VySW5kZXhdKTtcblx0XHRcdH1cblx0XHRcdGN1cnJlbnRNYXJrZXJJbmRleCA9IG5ld01hcmtlckluZGV4O1xuXHRcdH1cblxuXHR9XG5cblx0Ly8gc2V0dXAgdGhlIHdob2xlIHRoaW5nXG5cdGZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XG5cdFx0aWYgKHNldHRpbmcubWFya2VyVGlwLmRpc3BsYXkpIHtcblx0XHRcdGluaXRpYWxpemVNYXJrZXJUaXAoKTtcblx0XHR9XG5cblx0XHQvLyByZW1vdmUgZXhpc3RpbmcgbWFya2VycyBpZiBhbHJlYWR5IGluaXRpYWxpemVkXG5cdFx0cGxheWVyLm1hcmtlcnMucmVtb3ZlQWxsKCk7XG5cdFx0YWRkTWFya2VycyhvcHRpb25zLm1hcmtlcnMpO1xuXG5cdFx0aWYgKHNldHRpbmcuYnJlYWtPdmVybGF5LmRpc3BsYXkpIHtcblx0XHRcdGluaXRpYWxpemVPdmVybGF5KCk7XG5cdFx0fVxuXHRcdG9uVGltZVVwZGF0ZSgpO1xuXHRcdHBsYXllci5vbihcInRpbWV1cGRhdGVcIiwgb25UaW1lVXBkYXRlKTtcblx0fVxuXG5cdC8vIHNldHVwIHRoZSBwbHVnaW4gYWZ0ZXIgd2UgbG9hZGVkIHZpZGVvJ3MgbWV0YSBkYXRhXG5cdHBsYXllci5vbihcImxvYWRlZG1ldGFkYXRhXCIsIGZ1bmN0aW9uKCkge1xuXHRcdGluaXRpYWxpemUoKTtcblx0fSk7XG5cblx0Ly8gZXhwb3NlZCBwbHVnaW4gQVBJXG5cdHBsYXllci5tYXJrZXJzID0ge1xuXHRcdGdldE1hcmtlcnM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIG1hcmtlcnNMaXN0O1xuXHRcdH0sXG5cdFx0bmV4dDogZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBnbyB0byB0aGUgbmV4dCBtYXJrZXIgZnJvbSBjdXJyZW50IHRpbWVzdGFtcFxuXHRcdFx0dmFyIGN1cnJlbnRUaW1lID0gcGxheWVyLmN1cnJlbnRUaW1lKCk7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG1hcmtlcnNMaXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHZhciBtYXJrZXJUaW1lID0gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTGlzdFtpXSk7XG5cdFx0XHRcdGlmIChtYXJrZXJUaW1lID4gY3VycmVudFRpbWUpIHtcblx0XHRcdFx0XHRwbGF5ZXIuY3VycmVudFRpbWUobWFya2VyVGltZSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXHRcdHByZXY6IGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gZ28gdG8gcHJldmlvdXMgbWFya2VyXG5cdFx0XHR2YXIgY3VycmVudFRpbWUgPSBwbGF5ZXIuY3VycmVudFRpbWUoKTtcblx0XHRcdGZvciAodmFyIGkgPSBtYXJrZXJzTGlzdC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0XHR2YXIgbWFya2VyVGltZSA9IHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2Vyc0xpc3RbaV0pO1xuXHRcdFx0XHQvLyBhZGQgYSB0aHJlc2hvbGRcblx0XHRcdFx0aWYgKG1hcmtlclRpbWUgKyAwLjUgPCBjdXJyZW50VGltZSkge1xuXHRcdFx0XHRcdHBsYXllci5jdXJyZW50VGltZShtYXJrZXJUaW1lKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0YWRkOiBmdW5jdGlvbihuZXdNYXJrZXJzKSB7XG5cdFx0XHQvLyBhZGQgbmV3IG1hcmtlcnMgZ2l2ZW4gYW4gYXJyYXkgb2YgaW5kZXhcblx0XHRcdGFkZE1hcmtlcnMobmV3TWFya2Vycyk7XG5cdFx0fSxcblx0XHRyZW1vdmU6IGZ1bmN0aW9uKGluZGV4QXJyYXkpIHtcblx0XHRcdC8vIHJlbW92ZSBtYXJrZXJzIGdpdmVuIGFuIGFycmF5IG9mIGluZGV4XG5cdFx0XHRyZW1vdmVNYXJrZXJzKGluZGV4QXJyYXkpO1xuXHRcdH0sXG5cdFx0cmVtb3ZlQWxsOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBpbmRleEFycmF5ID0gW107XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG1hcmtlcnNMaXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGluZGV4QXJyYXkucHVzaChpKTtcblx0XHRcdH1cblx0XHRcdHJlbW92ZU1hcmtlcnMoaW5kZXhBcnJheSk7XG5cdFx0fSxcblx0XHR1cGRhdGVUaW1lOiBmdW5jdGlvbigpIHtcblx0XHRcdC8vIG5vdGlmeSB0aGUgcGx1Z2luIHRvIHVwZGF0ZSB0aGUgVUkgZm9yIGNoYW5nZXMgaW4gbWFya2VyIHRpbWVzIFxuXHRcdFx0dXBkYXRlTWFya2VycygpO1xuXHRcdH0sXG5cdFx0cmVzZXQ6IGZ1bmN0aW9uKG5ld01hcmtlcnMpIHtcblx0XHRcdC8vIHJlbW92ZSBhbGwgdGhlIGV4aXN0aW5nIG1hcmtlcnMgYW5kIGFkZCBuZXcgb25lc1xuXHRcdFx0cGxheWVyLm1hcmtlcnMucmVtb3ZlQWxsKCk7XG5cdFx0XHRhZGRNYXJrZXJzKG5ld01hcmtlcnMpO1xuXHRcdH0sXG5cdFx0ZGVzdHJveTogZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyB1bnJlZ2lzdGVyIHRoZSBwbHVnaW5zIGFuZCBjbGVhbiB1cCBldmVuIGhhbmRsZXJzXG5cdFx0XHRwbGF5ZXIubWFya2Vycy5yZW1vdmVBbGwoKTtcblx0XHRcdGJyZWFrT3ZlcmxheS5yZW1vdmUoKTtcblx0XHRcdG1hcmtlclRpcC5yZW1vdmUoKTtcblx0XHRcdHBsYXllci5vZmYoXCJ0aW1ldXBkYXRlXCIsIHVwZGF0ZUJyZWFrT3ZlcmxheSk7XG5cdFx0XHRkZWxldGUgcGxheWVyLm1hcmtlcnM7XG5cdFx0fSxcblx0fTtcblxufTtcblxuLy8g5rC05Y2wXG5jb25zdCB3YXRlck1hcmsgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdHZhciBkZWZhdWx0cyA9IHtcblx0XHRcdGZpbGU6ICdPd25lZF9TdGFtcC5wbmcnLFxuXHRcdFx0eHBvczogMCxcblx0XHRcdHlwb3M6IDAsXG5cdFx0XHR4cmVwZWF0OiAwLFxuXHRcdFx0b3BhY2l0eTogMTAwLFxuXHRcdFx0Y2xpY2thYmxlOiBmYWxzZSxcblx0XHRcdHVybDogXCJcIixcblx0XHRcdGNsYXNzTmFtZTogJ3Zqcy13YXRlcm1hcmsnLFxuXHRcdFx0dGV4dDogZmFsc2UsXG5cdFx0XHRkZWJ1ZzogZmFsc2Vcblx0XHR9LFxuXHRcdGV4dGVuZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGFyZ3MsIHRhcmdldCwgaSwgb2JqZWN0LCBwcm9wZXJ0eTtcblx0XHRcdGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuXHRcdFx0dGFyZ2V0ID0gYXJncy5zaGlmdCgpIHx8IHt9O1xuXHRcdFx0Zm9yIChpIGluIGFyZ3MpIHtcblx0XHRcdFx0b2JqZWN0ID0gYXJnc1tpXTtcblx0XHRcdFx0Zm9yIChwcm9wZXJ0eSBpbiBvYmplY3QpIHtcblx0XHRcdFx0XHRpZiAob2JqZWN0Lmhhc093blByb3BlcnR5KHByb3BlcnR5KSkge1xuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBvYmplY3RbcHJvcGVydHldID09PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRcdFx0XHR0YXJnZXRbcHJvcGVydHldID0gZXh0ZW5kKHRhcmdldFtwcm9wZXJ0eV0sIG9iamVjdFtwcm9wZXJ0eV0pO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0W3Byb3BlcnR5XSA9IG9iamVjdFtwcm9wZXJ0eV07XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGFyZ2V0O1xuXHRcdH07XG5cblx0Ly8hIGdsb2JhbCB2YXJpYmxlIGNvbnRhaW5pbmcgcmVmZXJlbmNlIHRvIHRoZSBET00gZWxlbWVudFxuXHR2YXIgZGl2O1xuXG5cblx0aWYgKHNldHRpbmdzLmRlYnVnKSBjb25zb2xlLmxvZygnd2F0ZXJtYXJrOiBSZWdpc3RlciBpbml0Jyk7XG5cblx0dmFyIG9wdGlvbnMsIHBsYXllciwgdmlkZW8sIGltZywgbGluaztcblx0b3B0aW9ucyA9IGV4dGVuZChkZWZhdWx0cywgc2V0dGluZ3MpO1xuXG5cdC8qIEdyYWIgdGhlIG5lY2Vzc2FyeSBET00gZWxlbWVudHMgKi9cblx0cGxheWVyID0gdGhpcy5lbCgpO1xuXHR2aWRlbyA9IHRoaXMuZWwoKS5nZXRFbGVtZW50c0J5VGFnTmFtZSgndmlkZW8nKVswXTtcblxuXHQvLyBjcmVhdGUgdGhlIHdhdGVybWFyayBlbGVtZW50XG5cdGlmICghZGl2KSB7XG5cdFx0ZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0ZGl2LmNsYXNzTmFtZSA9IG9wdGlvbnMuY2xhc3NOYW1lO1xuXHR9IGVsc2Uge1xuXHRcdC8vISBpZiBkaXYgYWxyZWFkeSBleGlzdHMsIGVtcHR5IGl0XG5cdFx0ZGl2LmlubmVySFRNTCA9ICcnO1xuXHR9XG5cblx0Ly8gaWYgdGV4dCBpcyBzZXQsIGRpc3BsYXkgdGV4dFxuXHRpZiAob3B0aW9ucy50ZXh0KVxuXHRcdGRpdi50ZXh0Q29udGVudCA9IG9wdGlvbnMudGV4dDtcblxuXHQvLyBpZiBpbWcgaXMgc2V0LCBhZGQgaW1nXG5cdGlmIChvcHRpb25zLmZpbGUpIHtcblx0XHRpbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcblx0XHRkaXYuYXBwZW5kQ2hpbGQoaW1nKTtcblx0XHRpbWcuc3JjID0gb3B0aW9ucy5maWxlO1xuXHR9XG5cblx0Ly9pbWcuc3R5bGUuYm90dG9tID0gXCIwXCI7XG5cdC8vaW1nLnN0eWxlLnJpZ2h0ID0gXCIwXCI7XG5cdGlmICgob3B0aW9ucy55cG9zID09PSAwKSAmJiAob3B0aW9ucy54cG9zID09PSAwKSkgLy8gVG9wIGxlZnRcblx0e1xuXHRcdGRpdi5zdHlsZS50b3AgPSBcIjBcIjtcblx0XHRkaXYuc3R5bGUubGVmdCA9IFwiMFwiO1xuXHR9IGVsc2UgaWYgKChvcHRpb25zLnlwb3MgPT09IDApICYmIChvcHRpb25zLnhwb3MgPT09IDEwMCkpIC8vIFRvcCByaWdodFxuXHR7XG5cdFx0ZGl2LnN0eWxlLnRvcCA9IFwiMFwiO1xuXHRcdGRpdi5zdHlsZS5yaWdodCA9IFwiMFwiO1xuXHR9IGVsc2UgaWYgKChvcHRpb25zLnlwb3MgPT09IDEwMCkgJiYgKG9wdGlvbnMueHBvcyA9PT0gMTAwKSkgLy8gQm90dG9tIHJpZ2h0XG5cdHtcblx0XHRkaXYuc3R5bGUuYm90dG9tID0gXCIwXCI7XG5cdFx0ZGl2LnN0eWxlLnJpZ2h0ID0gXCIwXCI7XG5cdH0gZWxzZSBpZiAoKG9wdGlvbnMueXBvcyA9PT0gMTAwKSAmJiAob3B0aW9ucy54cG9zID09PSAwKSkgLy8gQm90dG9tIGxlZnRcblx0e1xuXHRcdGRpdi5zdHlsZS5ib3R0b20gPSBcIjBcIjtcblx0XHRkaXYuc3R5bGUubGVmdCA9IFwiMFwiO1xuXHR9IGVsc2UgaWYgKChvcHRpb25zLnlwb3MgPT09IDUwKSAmJiAob3B0aW9ucy54cG9zID09PSA1MCkpIC8vIENlbnRlclxuXHR7XG5cdFx0aWYgKG9wdGlvbnMuZGVidWcpIGNvbnNvbGUubG9nKCd3YXRlcm1hcms6IHBsYXllcjonICsgcGxheWVyLndpZHRoICsgJ3gnICsgcGxheWVyLmhlaWdodCk7XG5cdFx0aWYgKG9wdGlvbnMuZGVidWcpIGNvbnNvbGUubG9nKCd3YXRlcm1hcms6IHZpZGVvOicgKyB2aWRlby52aWRlb1dpZHRoICsgJ3gnICsgdmlkZW8udmlkZW9IZWlnaHQpO1xuXHRcdGlmIChvcHRpb25zLmRlYnVnKSBjb25zb2xlLmxvZygnd2F0ZXJtYXJrOiBpbWFnZTonICsgaW1nLndpZHRoICsgJ3gnICsgaW1nLmhlaWdodCk7XG5cdFx0ZGl2LnN0eWxlLnRvcCA9ICh0aGlzLmhlaWdodCgpIC8gMikgKyBcInB4XCI7XG5cdFx0ZGl2LnN0eWxlLmxlZnQgPSAodGhpcy53aWR0aCgpIC8gMikgKyBcInB4XCI7XG5cdH1cblx0ZGl2LnN0eWxlLm9wYWNpdHkgPSBvcHRpb25zLm9wYWNpdHk7XG5cblx0Ly9kaXYuc3R5bGUuYmFja2dyb3VuZEltYWdlID0gXCJ1cmwoXCIrb3B0aW9ucy5maWxlK1wiKVwiO1xuXHQvL2Rpdi5zdHlsZS5iYWNrZ3JvdW5kUG9zaXRpb24ueCA9IG9wdGlvbnMueHBvcytcIiVcIjtcblx0Ly9kaXYuc3R5bGUuYmFja2dyb3VuZFBvc2l0aW9uLnkgPSBvcHRpb25zLnlwb3MrXCIlXCI7XG5cdC8vZGl2LnN0eWxlLmJhY2tncm91bmRSZXBlYXQgPSBvcHRpb25zLnhyZXBlYXQ7XG5cdC8vZGl2LnN0eWxlLm9wYWNpdHkgPSAob3B0aW9ucy5vcGFjaXR5LzEwMCk7XG5cblx0Ly9pZiB1c2VyIHdhbnRzIHdhdGVybWFyayB0byBiZSBjbGlja2FibGUsIGFkZCBhbmNob3IgZWxlbVxuXHQvL3RvZG86IGNoZWNrIGlmIG9wdGlvbnMudXJsIGlzIGFuIGFjdHVhbCB1cmw/XG5cdGlmIChvcHRpb25zLmNsaWNrYWJsZSAmJiBvcHRpb25zLnVybCAhPT0gXCJcIikge1xuXHRcdGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYVwiKTtcblx0XHRsaW5rLmhyZWYgPSBvcHRpb25zLnVybDtcblx0XHRsaW5rLnRhcmdldCA9IFwiX2JsYW5rXCI7XG5cdFx0bGluay5hcHBlbmRDaGlsZChkaXYpO1xuXHRcdC8vYWRkIGNsaWNrYWJsZSB3YXRlcm1hcmsgdG8gdGhlIHBsYXllclxuXHRcdHBsYXllci5hcHBlbmRDaGlsZChsaW5rKTtcblx0fSBlbHNlIHtcblx0XHQvL2FkZCBub3JtYWwgd2F0ZXJtYXJrIHRvIHRoZSBwbGF5ZXJcblx0XHRwbGF5ZXIuYXBwZW5kQ2hpbGQoZGl2KTtcblx0fVxuXG5cdGlmIChvcHRpb25zLmRlYnVnKSBjb25zb2xlLmxvZygnd2F0ZXJtYXJrOiBSZWdpc3RlciBlbmQnKTtcblxufTtcblxuLy8gUmVnaXN0ZXIgdGhlIHBsdWdpbiB3aXRoIHZpZGVvLmpzLlxudmlkZW9qcy5wbHVnaW4oJ29wZW4nLCBvcGVuKTtcbnZpZGVvanMucGx1Z2luKCd2aWRlb0pzUmVzb2x1dGlvblN3aXRjaGVyJywgdmlkZW9Kc1Jlc29sdXRpb25Td2l0Y2hlcik7XG52aWRlb2pzLnBsdWdpbignZGlzYWJsZVByb2dyZXNzJywgZGlzYWJsZVByb2dyZXNzKTtcbnZpZGVvanMucGx1Z2luKCdtYXJrZXJzJywgbWFya2Vycyk7XG52aWRlb2pzLnBsdWdpbignd2F0ZXJNYXJrJywgd2F0ZXJNYXJrKTtcblxuLy8gSW5jbHVkZSB0aGUgdmVyc2lvbiBudW1iZXIuXG5vcGVuLlZFUlNJT04gPSAnX19WRVJTSU9OX18nO1xuXG5leHBvcnQgZGVmYXVsdCBvcGVuOyJdfQ==

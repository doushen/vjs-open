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
	var lt = 0;
	var fx = -1;
	// show or hide break overlays
	function updateBreakOverlay() {
		if (!setting.breakOverlay.display || currentMarkerIndex < 0) {
			return;
		}

		var currentTime = player.currentTime();
		var marker = markersList[currentMarkerIndex];
		var markerTime = setting.markerTip.time(marker);
		var ct = currentTime - markerTime;

		if (ct >= 0 && ct < 1 && fx != currentMarkerIndex) {
			fx = currentMarkerIndex;
			lt = currentTime + setting.breakOverlay.displayTime;
		}

		if (currentTime >= markerTime && currentTime <= lt) {
			if (overlayIndex != currentMarkerIndex) {
				overlayIndex = currentMarkerIndex;
				breakOverlay.find('.vjs-break-overlay-text').html(setting.breakOverlay.text(marker));
			}

			breakOverlay.css('visibility', "visible");
		} else {
			overlayIndex = -1;
			breakOverlay.css("visibility", "hidden");
			lt = 0;
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

// /**
//  * 截图
//  * @param {[type]} options [description]
//  * return {[type]}  [description]
//  */
// const snapshot = function(options) {
// // 	"use strict";

// 	// globals
// 	var player = this;
// 	var video = player.el().querySelector('video');
// 	var container, scale;
// 	//FIXME: add some kind of assert for video, if flash is used it's not working

// 	//TODO: add better prefix for all new css class, probably vjs-snapshot
// 	//TODO: break this large file up into smaller ones, e.g. container, ...
// 	//TODO: make it possible to drag boxes also from bottom right to top left

// 	function updateScale(){
// 		var rect = video.getBoundingClientRect();
// 		var scalew = canvas_draw.el().width / rect.width;
// 		var scaleh = canvas_draw.el().height / rect.height;
// 		scale = Math.max(Math.max(scalew, scaleh), 1);
// 		scale_txt.el().innerHTML = (Math.round(1/scale*100)/100) +"x";
// 	}

// 	// take snapshot of video and show all drawing elements
// 	// added to player object to be callable from outside, e.g. shortcut
// 	player.snap = function(){
// 		player.pause();
// 		// loose keyboard focus
// 		player.el().blur();
// 		// switch control bar to drawing controls
// 		player.controlBar.hide();
// 		drawCtrl.show();
// 		// display canvas
// 		parent.show();

// 		// canvas for drawing, it's separate from snapshot because of delete
// 		canvas_draw.el().width = video.videoWidth;
// 		canvas_draw.el().height = video.videoHeight;
// 		context_draw.strokeStyle = color.el().value;
// 		context_draw.lineWidth = size.el().value / 2;
// 		context_draw.lineCap = "round";
// 		// calculate scale
// 		updateScale();

// 		// background canvas containing snapshot from video
// 		canvas_bg.el().width = video.videoWidth;
// 		canvas_bg.el().height = video.videoHeight;
// 		context_bg.drawImage(video, 0, 0);

// 		// still fit into player element
// 		var rect = video.getBoundingClientRect(); // use bounding rect instead of player.width/height because of fullscreen
// 		canvas_draw.el().style.maxWidth  = rect.width  +"px";
// 		canvas_draw.el().style.maxHeight = rect.height +"px";
// 		canvas_bg.el().style.maxWidth  = rect.width  +"px";
// 		canvas_bg.el().style.maxHeight = rect.height +"px";
// 	};
// 	// camera icon on normal player control bar
// 	var snap_btn = player.controlBar.addChild('button');
// 	snap_btn.addClass("vjs-snapshot-button");
// 	snap_btn.el().title = "Take snapshot";
// 	snap_btn.on('click', player.snap);

// 	// drawing controls

// 	// add canvas parent container before draw control bar, so bar gets on top
// 	var parent = player.addChild(
// 		new videojs.Component(player, {
// 			el: videojs.Component.prototype.createEl(null, {
// 				className: 'vjs-canvas-parent' /*TODO*/
// 			}),
// 		})
// 	);

// 	//draw control bar
// 	var drawCtrl = player.addChild(
// 		new videojs.Component(player, {
// 			el: videojs.Component.prototype.createEl(null, {
// 				className: 'vjs-control-bar vjs-drawing-ctrl',
// 			}),
// 		})
// 	);
// 	drawCtrl.hide();

// 	// choose color, used everywhere: painting, border color of cropbox, ...
// 	var color = drawCtrl.addChild(
// 		new videojs.Component(player, {
// 			el: videojs.Component.prototype.createEl('input', {
// 				className: 'vjs-control', type: 'color', value: '#df4b26', title: 'color'
// 			}),
// 		})
// 	);
// 	color.on('change', function(e){
// 		context_draw.strokeStyle = color.el().value;
// 	});

// 	// choose size, used everywhere: line width, text size
// 	var size = drawCtrl.addChild(
// 		new videojs.Component(player, {
// 			el: videojs.Component.prototype.createEl('input', {
// 				className: 'vjs-control', type: 'number', value: '10', title: 'line width, text size, ...'
// 			}),
// 		})
// 	);
// 	size.on('keydown', function(e){ // don't fire player shortcuts when size input has focus
// 		e.stopPropagation();
// 	});
// 	size.on('change', function(e){
// 		context_draw.lineWidth = size.el().value / 2;
// 	});

// 	var tool = 'brush';
// 	function toolChange(event){
// 		var active_tool = drawCtrl.el().querySelector('.vjs-tool-active');
// 		active_tool.classList.remove('vjs-tool-active');
// 		event.target.classList.add('vjs-tool-active');
// 		tool = event.target.dataset.value;
// 		// always hide cropbox, textbox is hidden automatically as it blurs
// 		cropbox.hide();
// 	}
// 	videojs.ToolButton = videojs.Button.extend({
// 		init: function(p, options) {
// 			videojs.Button.call(this, p, options);

// 			this.addClass("vjs-drawing-"+ options.tool);
// 			this.el().dataset.value = options.tool;
// 			this.el().title = options.title;

// 			this.on('click', toolChange);
// 		}
// 	});
// 	var brush  = drawCtrl.addChild(new videojs.ToolButton(player, {tool: "brush", title: "freehand drawing"}));
// 	brush.addClass("vjs-tool-active");
// 	var rect   = drawCtrl.addChild(new videojs.ToolButton(player, {tool: "rect",  title: "draw rectangle from top left to bottom right"}));
// 	var crop   = drawCtrl.addChild(new videojs.ToolButton(player, {tool: "crop",  title: "select area and click selection to crop"}));
// 	var text   = drawCtrl.addChild(new videojs.ToolButton(player, {tool: "text",  title: "select area, type message and then click somewhere else"}));
// 	var eraser = drawCtrl.addChild(new videojs.ToolButton(player, {tool: "eraser",title: "erase drawing in clicked location"}));

// 	var scaler = drawCtrl.addChild(
// 		new videojs.Component(player, {
// 			el: videojs.Component.prototype.createEl(null, {
// 				className: 'vjs-control vjs-drawing-scaler', title: 'scale image'
// 			})
// 		})
// 	);
// 	scaler.on('click', function(e){
// 		var w = canvas_draw.el().width, h = canvas_draw.el().height;
// 		var scalew = window.prompt("Current image size is "+w+"x"+h+" . New width?", w);
// 		scalew = parseInt(scalew, 10);
// 		if(!isNaN(scalew)){
// 			var factor = scalew / w;
// 			var width  = factor * w |0;
// 			var height = factor * h |0;

// 			var r = scaleCropCanvas(0, 0, w, h, width, height, canvas_bg, context_bg);
// 			canvas_bg = r[0]; context_bg = r[1];
// 			r = scaleCropCanvas(0, 0, w, h, width, height, canvas_draw, context_draw);
// 			canvas_draw = r[0]; context_draw = r[1];
// 			updateScale();
// 		}
// 		// just ignore
// 	});

// 	function combineDrawing(encoding){
// 		//blit canvas and open new tab with image
// 		var canvas_tmp = document.createElement('canvas');
// 		canvas_tmp.width = canvas_draw.el().width;
// 		canvas_tmp.height = canvas_draw.el().height;
// 		var ctx_tmp = canvas_tmp.getContext("2d");
// 		ctx_tmp.drawImage(canvas_bg.el(), 0, 0);
// 		ctx_tmp.drawImage(canvas_draw.el(), 0, 0);
// 		window.open(canvas_tmp.toDataURL(encoding));
// 	}

// 	var dljpeg = drawCtrl.addChild(
// 		new videojs.Component(player, {
// 			el: videojs.Component.prototype.createEl(null, {
// 				className: 'vjs-control vjs-button', innerHTML: 'JPEG', title: 'open new tab with jpeg image'
// 			}),
// 		})
// 	);
// 	dljpeg.on('click', function(){ combineDrawing("image/jpeg"); });
// 	var dlpng = drawCtrl.addChild(
// 		new videojs.Component(player, {
// 			el: videojs.Component.prototype.createEl(null, {
// 				className: 'vjs-control vjs-button', innerHTML: 'PNG', title: 'open new tab with png image'
// 			}),
// 		})
// 	);
// 	dlpng.on('click', function(){ combineDrawing("image/png"); });

// 	// close button leading back to normal video play back
// 	var close = drawCtrl.addChild('button');
// 	close.addClass("vjs-drawing-close");
// 	close.el().title = "close screenshot and return to video";
// 	close.on('click', function(){
// 		// hide cropbox
// 		cropbox.hide();
// 		// hide all canvas stuff
// 		parent.hide();
// 		// switch back to normal player controls
// 		drawCtrl.hide();
// 		player.controlBar.show();
// 		player.el().focus();
// 	});

// 	// scale display
// 	var scale_txt = drawCtrl.addChild(
// 		new videojs.Component(player, {
// 			el: videojs.Component.prototype.createEl(null, {
// 				className: 'vjs-scale', innerHTML: '1', title: 'scale factor'
// 			}),
// 		})
// 	);

// 	// canvas stuff
// 	container = parent.addChild(
// 		new videojs.Component(player, {
// 			el: videojs.Component.prototype.createEl(null, {
// 				className: 'vjs-canvas-container' /*TODO*/
// 			}),
// 		})
// 	);
// 	var canvas_bg = container.addChild( //FIXME: it's quite silly to use a component here
// 		new videojs.Component(player, {
// 			el: videojs.Component.prototype.createEl('canvas', {
// 			}),
// 		})
// 	);
// 	var context_bg = canvas_bg.el().getContext("2d");
// 	var canvas_draw = container.addChild(
// 		new videojs.Component(player, {
// 			el: videojs.Component.prototype.createEl('canvas', {
// 			}),
// 		})
// 	);
// 	var context_draw = canvas_draw.el().getContext("2d");
// 	var canvas_rect = container.addChild(
// 		new videojs.Component(player, {
// 			el: videojs.Component.prototype.createEl('canvas', {
// 			}),
// 		})
// 	);
// 	canvas_rect.el().style.zIndex = "1"; // always on top of other canvas elements
// 	var context_rect = canvas_rect.el().getContext("2d");
// 	var cropbox = container.addChild(
// 		new videojs.Component(player, {
// 			el: videojs.Component.prototype.createEl('div', {
// 				innerHTML: "crop"
// 			}),
// 		})
// 	);
// 	cropbox.el().style.display = "flex";
// 	// crop handling, create new canvas and replace old one
// 	function scaleCropCanvas(left, top, width, height, newwidth, newheight, canvas, context){
// // 		var newcanvas = document.createElement('canvas');
// 		var newcanvas = new videojs.Component(player, { // FIXME: that's quite silly
// 			el: videojs.Component.prototype.createEl('canvas', {
// 			}),
// 		});
// 		var rect = player.el().getBoundingClientRect();
// 		newcanvas.el().style.maxWidth  = rect.width  +"px";
// 		newcanvas.el().style.maxHeight = rect.height +"px";

// 		newcanvas.el().width = newwidth;
// 		newcanvas.el().height = newheight;

// 		var ctx = newcanvas.el().getContext("2d");
// 		ctx.drawImage(canvas.el(),
// 			left, top, width, height,
// 			0, 0, newwidth, newheight
// 		);

// // 		container.replaceChild(newcanvas, canvas);
// 		container.removeChild(canvas);
// 		container.addChild(newcanvas);
// // 		canvas = newcanvas;
// 		ctx.lineCap = context.lineCap; // transfer context states
// 		ctx.strokeStyle = context.strokeStyle;
// 		ctx.lineWidth = context.lineWidth;
// // 		context = ctx;
// 		// javascript has no pass-by-reference -> do stupid stuff
// 		return [newcanvas, ctx];
// 	}
// 	cropbox.on('mousedown', function(e){
// 		var left   = scale * cropbox.el().offsetLeft  |0;
// 		var top    = scale * cropbox.el().offsetTop   |0;
// 		var width  = scale * cropbox.el().offsetWidth |0;
// 		var height = scale * cropbox.el().offsetHeight|0;
// 		var r = scaleCropCanvas(left, top, width, height, width, height, canvas_bg, context_bg);
// 		canvas_bg = r[0]; context_bg = r[1];
// 		r = scaleCropCanvas(left, top, width, height, width, height, canvas_draw, context_draw);
// 		canvas_draw = r[0]; context_draw = r[1];
// 		updateScale();

// 		cropbox.hide();
// 		e.stopPropagation(); //otherwise canvas below gets mousedown
// 	});

// 	var textbox = container.addChild(
// 		new videojs.Component(player, {
// 			el: videojs.Component.prototype.createEl('textarea', {
// 			}),
// 		})
// 	);
// 	textbox.on('keydown', function(e){ // don't fire player shortcuts when textbox has focus
// 		e.stopPropagation();
// 	});
// 	// draw text when textbox looses focus
// 	textbox.on('blur', function(e){
// 		context_draw.fillStyle = color.el().value;
// 		context_draw.font = (scale * size.el().value*2) +"px sans-serif";
// 		context_draw.textBaseline = "top";
// 		context_draw.fillText(textbox.el().value,
// 				scale*textbox.el().offsetLeft + scale,
// 				scale*textbox.el().offsetTop + scale); //+1 for border?
// 		//FIXME: there's still a minor shift when scale isn't 1, in firefox more and also when scale is 1
// 		textbox.hide();
// 		textbox.el().value = "";
// 	});

// 	parent.hide();
// 	canvas_rect.hide();
// 	cropbox.hide();
// 	textbox.hide();

// 	// TODO: draw functions
// 	var paint = false;
// 	container.on('mousedown', function(e){
// 		paint = true;
// 		var pos = container.el().getBoundingClientRect();
// 		var x = e.clientX - pos.left;
// 		var y = e.clientY - pos.top;
// 		switch(tool){
// 			case "brush":
// 				x *= scale; y *= scale;
// 				context_draw.beginPath();
// 				context_draw.moveTo(x-1, y);
// 				context_draw.lineTo(x, y);
// 				context_draw.stroke();
// 				break;
// 			case "rect":
// 				// rectangle is scaled when blitting, not when dragging
// 				canvas_rect.el().width = 0;
// 				canvas_rect.el().height = 0;
// 				canvas_rect.el().style.left = x + "px";
// 				canvas_rect.el().style.top = y + "px";
// 				canvas_rect.show();
// 				break;
// 			case "crop":
// 				cropbox.el().style.width = 0;
// 				cropbox.el().style.height = 0;
// 				cropbox.el().style.left = x + "px";
// 				cropbox.el().style.top = y + "px";

// 				cropbox.el().style.border = "1px dashed "+ color.el().value;
// 				cropbox.el().style.color = color.el().value;
// 				cropbox.show();
// 				break;
// 			case "text":
// 				// if shown already, loose focus and draw it first, otherwise it gets drawn at mousedown
// 				if(textbox.hasClass("vjs-hidden")){
// 					textbox.el().style.width = 0;
// 					textbox.el().style.height = 0;
// 					textbox.el().style.left = x + "px";
// 					textbox.el().style.top = y + "px";

// 					textbox.el().style.border = "1px dashed "+ color.el().value;
// 					textbox.el().style.color = color.el().value;
// 					textbox.el().style.font = (size.el().value*2) +"px sans-serif";
// 					textbox.show();
// 				}
// 				break;
// 			case "eraser":
// 				var s = size.el().value;
// 				context_draw.clearRect(scale*x - s/2, scale*y - s/2, s, s);
// 				break;
// 		}
// // 		e.preventDefault();
// 	});
// 	container.on('mousemove', function(e){
// 		if(paint){
// 			var pos = container.el().getBoundingClientRect();
// 			var x = e.clientX - pos.left;
// 			var y = e.clientY - pos.top;
// 			switch(tool){
// 				case "brush":
// 					context_draw.lineTo(scale * x, scale * y);
// 					context_draw.stroke();
// 					break;
// 				case "rect":
// 					context_rect.clearRect(0, 0, context_rect.canvas.width, context_rect.canvas.height);
// 					// this way it's only possible to drag to the right and down, mousedown sets top left
// 					canvas_rect.el().width = x - canvas_rect.el().offsetLeft; // resize canvas
// 					canvas_rect.el().height = y - canvas_rect.el().offsetTop;
// 					context_rect.strokeStyle = color.el().value; //looks like its reset when resizing canvas
// 					context_rect.lineWidth = size.el().value / scale; // scale lineWidth
// 					context_rect.strokeRect(0, 0, context_rect.canvas.width, context_rect.canvas.height);
// 					break;
// 				case "crop":
// 					cropbox.el().style.width = (x - cropbox.el().offsetLeft) +"px"; // resize
// 					cropbox.el().style.height = (y - cropbox.el().offsetTop) +"px";
// 					break;
// 				case "text":
// 					textbox.el().style.width = (x - textbox.el().offsetLeft) +"px"; // resize
// 					textbox.el().style.height = (y - textbox.el().offsetTop) +"px";
// 					break;
// 				case "eraser":
// 					var s = size.el().value;
// 					context_draw.clearRect(scale*x - s/2, scale*y - s/2, s, s);
// 					break;
// 			}
// 			e.preventDefault();
// 		}
// 	});
// 	function finish(){
// 		if(paint){
// 			paint = false;
// 			if(tool == "rect"){
// 				//blit canvas_rect on canvas, scaled
// 				context_draw.drawImage(canvas_rect.el(),
// 						scale*canvas_rect.el().offsetLeft, scale*canvas_rect.el().offsetTop,
// 						scale*context_rect.canvas.width, scale*context_rect.canvas.height);
// 				canvas_rect.hide();
// 			}else if(tool == "text"){
// 				player.el().blur();
// 				textbox.el().focus();
// 			}
// 		}
// 	}
// 	container.on('mouseup', finish);
// 	container.on('mouseleave', finish);
// };

/**
 * 记录 录音 截屏
 * @param {[type]} options [description]
 * return {[type]}  [description]
 */
var snapshot = {
	/**
  * Returns an object that captures the portions of player state relevant to
  * video playback. The result of this function can be passed to
  * restorePlayerSnapshot with a player to return the player to the state it
  * was in when this function was invoked.
  * @param {object} player The videojs player object
  */
	getPlayerSnapshot: function getPlayerSnapshot(player) {

		var currentTime = undefined;

		if (_videoJs2['default'].browser.IS_IOS && player.ads.isLive(player)) {
			// Record how far behind live we are
			if (player.seekable().length > 0) {
				currentTime = player.currentTime() - player.seekable().end(0);
			} else {
				currentTime = player.currentTime();
			}
		} else {
			currentTime = player.currentTime();
		}

		var tech = player.$('.vjs-tech');
		var tracks = player.remoteTextTracks ? player.remoteTextTracks() : [];
		var suppressedTracks = [];
		var snapshot = {
			ended: player.ended(),
			currentSrc: player.currentSrc(),
			src: player.src(),
			currentTime: currentTime,
			type: player.currentType()
		};

		if (tech) {
			snapshot.nativePoster = tech.poster;
			snapshot.style = tech.getAttribute('style');
		}

		for (var i = tracks.length - 1; i >= 0; i--) {
			var track = tracks[i];

			suppressedTracks.push({
				track: track,
				mode: track.mode
			});
			track.mode = 'disabled';
		}
		snapshot.suppressedTracks = suppressedTracks;

		return snapshot;
	},

	/**
  * Attempts to modify the specified player so that its state is equivalent to
  * the state of the snapshot.
  * @param {object} snapshot - the player state to apply
  */
	restorePlayerSnapshot: function restorePlayerSnapshot(player, snapshot) {

		if (player.ads.disableNextSnapshotRestore === true) {
			player.ads.disableNextSnapshotRestore = false;
			return;
		}

		// The playback tech
		var tech = player.$('.vjs-tech');

		// the number of[ remaining attempts to restore the snapshot
		var attempts = 20;

		var suppressedTracks = snapshot.suppressedTracks;
		var trackSnapshot = undefined;
		var restoreTracks = function restoreTracks() {
			for (var i = suppressedTracks.length; i > 0; i--) {
				trackSnapshot = suppressedTracks[i];
				trackSnapshot.track.mode = trackSnapshot.mode;
			}
		};

		// finish restoring the playback state
		var resume = function resume() {
			var currentTime = undefined;

			if (_videoJs2['default'].browser.IS_IOS && player.ads.isLive(player)) {
				if (snapshot.currentTime < 0) {
					// Playback was behind real time, so seek backwards to match
					if (player.seekable().length > 0) {
						currentTime = player.seekable().end(0) + snapshot.currentTime;
					} else {
						currentTime = player.currentTime();
					}
					player.currentTime(currentTime);
				}
			} else {
				player.currentTime(snapshot.ended ? player.duration() : snapshot.currentTime);
			}

			// Resume playback if this wasn't a postroll
			if (!snapshot.ended) {
				player.play();
			}
		};

		// determine if the video element has loaded enough of the snapshot source
		// to be ready to apply the rest of the state
		var tryToResume = function tryToResume() {

			// tryToResume can either have been called through the `contentcanplay`
			// event or fired through setTimeout.
			// When tryToResume is called, we should make sure to clear out the other
			// way it could've been called by removing the listener and clearing out
			// the timeout.
			player.off('contentcanplay', tryToResume);
			if (player.ads.tryToResumeTimeout_) {
				player.clearTimeout(player.ads.tryToResumeTimeout_);
				player.ads.tryToResumeTimeout_ = null;
			}

			// Tech may have changed depending on the differences in sources of the
			// original video and that of the ad
			tech = player.el().querySelector('.vjs-tech');

			if (tech.readyState > 1) {
				// some browsers and media aren't "seekable".
				// readyState greater than 1 allows for seeking without exceptions
				return resume();
			}

			if (tech.seekable === undefined) {
				// if the tech doesn't expose the seekable time ranges, try to
				// resume playback immediately
				return resume();
			}

			if (tech.seekable.length > 0) {
				// if some period of the video is seekable, resume playback
				return resume();
			}

			// delay a bit and then check again unless we're out of attempts
			if (attempts--) {
				window.setTimeout(tryToResume, 50);
			} else {
				try {
					resume();
				} catch (e) {
					_videoJs2['default'].log.warn('Failed to resume the content after an advertisement', e);
				}
			}
		};

		if (snapshot.nativePoster) {
			tech.poster = snapshot.nativePoster;
		}

		if ('style' in snapshot) {
			// overwrite all css style properties to restore state precisely
			tech.setAttribute('style', snapshot.style || '');
		}

		// Determine whether the player needs to be restored to its state
		// before ad playback began. With a custom ad display or burned-in
		// ads, the content player state hasn't been modified and so no
		// restoration is required

		if (player.ads.videoElementRecycled()) {
			// on ios7, fiddling with textTracks too early will cause safari to crash
			player.one('contentloadedmetadata', restoreTracks);

			// if the src changed for ad playback, reset it
			player.src({
				src: snapshot.currentSrc,
				type: snapshot.type
			});
			// safari requires a call to `load` to pick up a changed source
			player.load();
			// and then resume from the snapshots time once the original src has loaded
			// in some browsers (firefox) `canplay` may not fire correctly.
			// Reace the `canplay` event with a timeout.
			player.one('contentcanplay', tryToResume);
			player.ads.tryToResumeTimeout_ = player.setTimeout(tryToResume, 2000);
		} else if (!player.ended() || !snapshot.ended) {
			// if we didn't change the src, just restore the tracks
			restoreTracks();
			// the src didn't change and this wasn't a postroll
			// just resume playback at the current time.
			player.play();
		}
	}
};

// Register the plugin with video.js.
_videoJs2['default'].plugin('open', open);
_videoJs2['default'].plugin('videoJsResolutionSwitcher', videoJsResolutionSwitcher);
_videoJs2['default'].plugin('disableProgress', disableProgress);
_videoJs2['default'].plugin('markers', markers);
_videoJs2['default'].plugin('waterMark', waterMark);
_videoJs2['default'].plugin('snapshot', snapshot);

// Include the version number.
open.VERSION = '1.0.0';

exports['default'] = open;
module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvb3Blbi9Eb2N1bWVudHMvV29yay9Tb3VyY2VUcmVlL3Zqcy1vcGVuL3NyYy9wbHVnaW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7dUJDQW9CLFVBQVU7Ozs7O0FBSTlCLElBQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQzs7Ozs7Ozs7Ozs7OztBQWFwQixJQUFNLGFBQWEsR0FBRyxTQUFoQixhQUFhLENBQUksTUFBTSxFQUFFLE9BQU8sRUFBSztBQUMxQyxPQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0NBRTVCLENBQUM7Ozs7Ozs7Ozs7Ozs7O0FBY0YsSUFBTSxJQUFJLEdBQUcsU0FBUCxJQUFJLENBQVksT0FBTyxFQUFFOzs7QUFDOUIsS0FBSSxDQUFDLEtBQUssQ0FBQyxZQUFNO0FBQ2hCLGVBQWEsUUFBTyxxQkFBUSxZQUFZLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7RUFDN0QsQ0FBQyxDQUFDO0NBQ0gsQ0FBQzs7Ozs7OztBQU9GLElBQU0seUJBQXlCLEdBQUcsbUNBQVMsT0FBTyxFQUFFOzs7Ozs7O0FBT25ELEtBQUksUUFBUSxHQUFHLHFCQUFRLFlBQVksQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDO0tBQ3JELE1BQU0sR0FBRyxJQUFJO0tBQ2IsVUFBVSxHQUFHLEVBQUU7S0FDZixjQUFjLEdBQUcsRUFBRTtLQUNuQixzQkFBc0IsR0FBRyxFQUFFLENBQUM7Ozs7Ozs7QUFPN0IsT0FBTSxDQUFDLFNBQVMsR0FBRyxVQUFTLEdBQUcsRUFBRTs7QUFFaEMsTUFBSSxDQUFDLEdBQUcsRUFBRTtBQUNULFVBQU8sTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO0dBQ3BCOzs7QUFHRCxLQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFTLE1BQU0sRUFBRTtBQUNqQyxPQUFJO0FBQ0gsV0FBUSxNQUFN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QUcsRUFBRSxRQUFRLENBQUMsVUFBVTtBQUN4QixRQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7SUFDbkIsQ0FBQyxDQUFDOztBQUVILFNBQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQzs7OztBQUlkLFNBQU0sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsV0FBVyxDQUFDLENBQUM7QUFDMUMsU0FBTSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztHQUN0RSxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFOztBQUU5QyxnQkFBYSxFQUFFLENBQUM7OztBQUdoQixTQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7R0FDZDtFQUNEO0NBQ0QsQ0FBQzs7O0FBR0YscUJBQVEsTUFBTSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM3QixxQkFBUSxNQUFNLENBQUMsMkJBQTJCLEVBQUUseUJBQXlCLENBQUMsQ0FBQztBQUN2RSxxQkFBUSxNQUFNLENBQUMsaUJBQWlCLEVBQUUsZUFBZSxDQUFDLENBQUM7QUFDbkQscUJBQVEsTUFBTSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUNuQyxxQkFBUSxNQUFNLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQ3ZDLHFCQUFRLE1BQU0sQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUM7OztBQUdyQyxJQUFJLENBQUMsT0FBTyxHQUFHLGFBQWEsQ0FBQzs7cUJBRWQsSUFBSSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJpbXBvcnQgdmlkZW9qcyBmcm9tICd2aWRlby5qcyc7XG5cblxuLy8gRGVmYXVsdCBvcHRpb25zIGZvciB0aGUgcGx1Z2luLlxuY29uc3QgZGVmYXVsdHMgPSB7fTtcblxuLyoqXG4gKiBGdW5jdGlvbiB0byBpbnZva2Ugd2hlbiB0aGUgcGxheWVyIGlzIHJlYWR5LlxuICpcbiAqIFRoaXMgaXMgYSBncmVhdCBwbGFjZSBmb3IgeW91ciBwbHVnaW4gdG8gaW5pdGlhbGl6ZSBpdHNlbGYuIFdoZW4gdGhpc1xuICogZnVuY3Rpb24gaXMgY2FsbGVkLCB0aGUgcGxheWVyIHdpbGwgaGF2ZSBpdHMgRE9NIGFuZCBjaGlsZCBjb21wb25lbnRzXG4gKiBpbiBwbGFjZS5cbiAqXG4gKiBAZnVuY3Rpb24gb25QbGF5ZXJSZWFkeVxuICogQHBhcmFtICAgIHtQbGF5ZXJ9IHBsYXllclxuICogQHBhcmFtICAgIHtPYmplY3R9IFtvcHRpb25zPXt9XVxuICovXG5jb25zdCBvblBsYXllclJlYWR5ID0gKHBsYXllciwgb3B0aW9ucykgPT4ge1xuXHRwbGF5ZXIuYWRkQ2xhc3MoJ3Zqcy1vcGVuJyk7XG5cbn07XG5cbi8qKlxuICogQSB2aWRlby5qcyBwbHVnaW4uXG4gKlxuICogSW4gdGhlIHBsdWdpbiBmdW5jdGlvbiwgdGhlIHZhbHVlIG9mIGB0aGlzYCBpcyBhIHZpZGVvLmpzIGBQbGF5ZXJgXG4gKiBpbnN0YW5jZS4gWW91IGNhbm5vdCByZWx5IG9uIHRoZSBwbGF5ZXIgYmVpbmcgaW4gYSBcInJlYWR5XCIgc3RhdGUgaGVyZSxcbiAqIGRlcGVuZGluZyBvbiBob3cgdGhlIHBsdWdpbiBpcyBpbnZva2VkLiBUaGlzIG1heSBvciBtYXkgbm90IGJlIGltcG9ydGFudFxuICogdG8geW91OyBpZiBub3QsIHJlbW92ZSB0aGUgd2FpdCBmb3IgXCJyZWFkeVwiIVxuICpcbiAqIEBmdW5jdGlvbiBvcGVuXG4gKiBAcGFyYW0gICAge09iamVjdH0gW29wdGlvbnM9e31dXG4gKiAgICAgICAgICAgQW4gb2JqZWN0IG9mIG9wdGlvbnMgbGVmdCB0byB0aGUgcGx1Z2luIGF1dGhvciB0byBkZWZpbmUuXG4gKi9cbmNvbnN0IG9wZW4gPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdHRoaXMucmVhZHkoKCkgPT4ge1xuXHRcdG9uUGxheWVyUmVhZHkodGhpcywgdmlkZW9qcy5tZXJnZU9wdGlvbnMoZGVmYXVsdHMsIG9wdGlvbnMpKTtcblx0fSk7XG59O1xuXG4vKipcbiAqIOWIhui+qOeOh1xuICogQHBhcmFtIHtbdHlwZV19IG9wdGlvbnMgW2Rlc2NyaXB0aW9uXVxuICogcmV0dXJuIHtbdHlwZV19ICBbZGVzY3JpcHRpb25dXG4gKi9cbmNvbnN0IHZpZGVvSnNSZXNvbHV0aW9uU3dpdGNoZXIgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cblx0LyoqXG5cdCAqIEluaXRpYWxpemUgdGhlIHBsdWdpbi5cblx0ICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXSBjb25maWd1cmF0aW9uIGZvciB0aGUgcGx1Z2luXG5cdCAqL1xuXG5cdHZhciBzZXR0aW5ncyA9IHZpZGVvanMubWVyZ2VPcHRpb25zKGRlZmF1bHRzLCBvcHRpb25zKSxcblx0XHRwbGF5ZXIgPSB0aGlzLFxuXHRcdGdyb3VwZWRTcmMgPSB7fSxcblx0XHRjdXJyZW50U291cmNlcyA9IHt9LFxuXHRcdGN1cnJlbnRSZXNvbHV0aW9uU3RhdGUgPSB7fTtcblxuXHQvKipcblx0ICogVXBkYXRlcyBwbGF5ZXIgc291cmNlcyBvciByZXR1cm5zIGN1cnJlbnQgc291cmNlIFVSTFxuXHQgKiBAcGFyYW0gICB7QXJyYXl9ICBbc3JjXSBhcnJheSBvZiBzb3VyY2VzIFt7c3JjOiAnJywgdHlwZTogJycsIGxhYmVsOiAnJywgcmVzOiAnJ31dXG5cdCAqIEByZXR1cm5zIHtPYmplY3R8U3RyaW5nfEFycmF5fSB2aWRlb2pzIHBsYXllciBvYmplY3QgaWYgdXNlZCBhcyBzZXR0ZXIgb3IgY3VycmVudCBzb3VyY2UgVVJMLCBvYmplY3QsIG9yIGFycmF5IG9mIHNvdXJjZXNcblx0ICovXG5cdHBsYXllci51cGRhdGVTcmMgPSBmdW5jdGlvbihzcmMpIHtcblx0XHQvL1JldHVybiBjdXJyZW50IHNyYyBpZiBzcmMgaXMgbm90IGdpdmVuXG5cdFx0aWYgKCFzcmMpIHtcblx0XHRcdHJldHVybiBwbGF5ZXIuc3JjKCk7XG5cdFx0fVxuXG5cdFx0Ly8gT25seSBhZGQgdGhvc2Ugc291cmNlcyB3aGljaCB3ZSBjYW4gKG1heWJlKSBwbGF5XG5cdFx0c3JjID0gc3JjLmZpbHRlcihmdW5jdGlvbihzb3VyY2UpIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHJldHVybiAocGxheWVyLmNhblBsYXlUeXBlKHNvdXJjZS50eXBlKSAhPT0gJycpO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHQvLyBJZiBhIFRlY2ggZG9lc24ndCB5ZXQgaGF2ZSBjYW5QbGF5VHlwZSBqdXN0IGFkZCBpdFxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHQvL1NvcnQgc291cmNlc1xuXHRcdHRoaXMuY3VycmVudFNvdXJjZXMgPSBzcmMuc29ydChjb21wYXJlUmVzb2x1dGlvbnMpO1xuXHRcdHRoaXMuZ3JvdXBlZFNyYyA9IGJ1Y2tldFNvdXJjZXModGhpcy5jdXJyZW50U291cmNlcyk7XG5cdFx0Ly8gUGljayBvbmUgYnkgZGVmYXVsdFxuXHRcdHZhciBjaG9zZW4gPSBjaG9vc2VTcmModGhpcy5ncm91cGVkU3JjLCB0aGlzLmN1cnJlbnRTb3VyY2VzKTtcblx0XHR0aGlzLmN1cnJlbnRSZXNvbHV0aW9uU3RhdGUgPSB7XG5cdFx0XHRsYWJlbDogY2hvc2VuLmxhYmVsLFxuXHRcdFx0c291cmNlczogY2hvc2VuLnNvdXJjZXNcblx0XHR9O1xuXG5cdFx0cGxheWVyLnRyaWdnZXIoJ3VwZGF0ZVNvdXJjZXMnKTtcblx0XHRwbGF5ZXIuc2V0U291cmNlc1Nhbml0aXplZChjaG9zZW4uc291cmNlcywgY2hvc2VuLmxhYmVsKTtcblx0XHRwbGF5ZXIudHJpZ2dlcigncmVzb2x1dGlvbmNoYW5nZScpO1xuXHRcdHJldHVybiBwbGF5ZXI7XG5cdH07XG5cblx0LyoqXG5cdCAqIFJldHVybnMgY3VycmVudCByZXNvbHV0aW9uIG9yIHNldHMgb25lIHdoZW4gbGFiZWwgaXMgc3BlY2lmaWVkXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSAgIFtsYWJlbF0gICAgICAgICBsYWJlbCBuYW1lXG5cdCAqIEBwYXJhbSB7RnVuY3Rpb259IFtjdXN0b21Tb3VyY2VQaWNrZXJdIGN1c3RvbSBmdW5jdGlvbiB0byBjaG9vc2Ugc291cmNlLiBUYWtlcyAyIGFyZ3VtZW50czogc291cmNlcywgbGFiZWwuIE11c3QgcmV0dXJuIHBsYXllciBvYmplY3QuXG5cdCAqIEByZXR1cm5zIHtPYmplY3R9ICAgY3VycmVudCByZXNvbHV0aW9uIG9iamVjdCB7bGFiZWw6ICcnLCBzb3VyY2VzOiBbXX0gaWYgdXNlZCBhcyBnZXR0ZXIgb3IgcGxheWVyIG9iamVjdCBpZiB1c2VkIGFzIHNldHRlclxuXHQgKi9cblx0cGxheWVyLmN1cnJlbnRSZXNvbHV0aW9uID0gZnVuY3Rpb24obGFiZWwsIGN1c3RvbVNvdXJjZVBpY2tlcikge1xuXHRcdGlmIChsYWJlbCA9PSBudWxsKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5jdXJyZW50UmVzb2x1dGlvblN0YXRlO1xuXHRcdH1cblxuXHRcdC8vIExvb2t1cCBzb3VyY2VzIGZvciBsYWJlbFxuXHRcdGlmICghdGhpcy5ncm91cGVkU3JjIHx8ICF0aGlzLmdyb3VwZWRTcmMubGFiZWwgfHwgIXRoaXMuZ3JvdXBlZFNyYy5sYWJlbFtsYWJlbF0pIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dmFyIHNvdXJjZXMgPSB0aGlzLmdyb3VwZWRTcmMubGFiZWxbbGFiZWxdO1xuXHRcdC8vIFJlbWVtYmVyIHBsYXllciBzdGF0ZVxuXHRcdHZhciBjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdHZhciBpc1BhdXNlZCA9IHBsYXllci5wYXVzZWQoKTtcblxuXHRcdC8vIEhpZGUgYmlnUGxheUJ1dHRvblxuXHRcdGlmICghaXNQYXVzZWQgJiYgdGhpcy5wbGF5ZXJfLm9wdGlvbnNfLmJpZ1BsYXlCdXR0b24pIHtcblx0XHRcdHRoaXMucGxheWVyXy5iaWdQbGF5QnV0dG9uLmhpZGUoKTtcblx0XHR9XG5cblx0XHQvLyBDaGFuZ2UgcGxheWVyIHNvdXJjZSBhbmQgd2FpdCBmb3IgbG9hZGVkZGF0YSBldmVudCwgdGhlbiBwbGF5IHZpZGVvXG5cdFx0Ly8gbG9hZGVkbWV0YWRhdGEgZG9lc24ndCB3b3JrIHJpZ2h0IG5vdyBmb3IgZmxhc2guXG5cdFx0Ly8gUHJvYmFibHkgYmVjYXVzZSBvZiBodHRwczovL2dpdGh1Yi5jb20vdmlkZW9qcy92aWRlby1qcy1zd2YvaXNzdWVzLzEyNFxuXHRcdC8vIElmIHBsYXllciBwcmVsb2FkIGlzICdub25lJyBhbmQgdGhlbiBsb2FkZWRkYXRhIG5vdCBmaXJlZC4gU28sIHdlIG5lZWQgdGltZXVwZGF0ZSBldmVudCBmb3Igc2VlayBoYW5kbGUgKHRpbWV1cGRhdGUgZG9lc24ndCB3b3JrIHByb3Blcmx5IHdpdGggZmxhc2gpXG5cdFx0dmFyIGhhbmRsZVNlZWtFdmVudCA9ICdsb2FkZWRkYXRhJztcblx0XHRpZiAodGhpcy5wbGF5ZXJfLnRlY2hOYW1lXyAhPT0gJ1lvdXR1YmUnICYmIHRoaXMucGxheWVyXy5wcmVsb2FkKCkgPT09ICdub25lJyAmJiB0aGlzLnBsYXllcl8udGVjaE5hbWVfICE9PSAnRmxhc2gnKSB7XG5cdFx0XHRoYW5kbGVTZWVrRXZlbnQgPSAndGltZXVwZGF0ZSc7XG5cdFx0fVxuXHRcdHBsYXllclxuXHRcdFx0LnNldFNvdXJjZXNTYW5pdGl6ZWQoc291cmNlcywgbGFiZWwsIGN1c3RvbVNvdXJjZVBpY2tlciB8fCBzZXR0aW5ncy5jdXN0b21Tb3VyY2VQaWNrZXIpXG5cdFx0XHQub25lKGhhbmRsZVNlZWtFdmVudCwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHBsYXllci5jdXJyZW50VGltZShjdXJyZW50VGltZSk7XG5cdFx0XHRcdHBsYXllci5oYW5kbGVUZWNoU2Vla2VkXygpO1xuXHRcdFx0XHRpZiAoIWlzUGF1c2VkKSB7XG5cdFx0XHRcdFx0Ly8gU3RhcnQgcGxheWluZyBhbmQgaGlkZSBsb2FkaW5nU3Bpbm5lciAoZmxhc2ggaXNzdWUgPylcblx0XHRcdFx0XHRwbGF5ZXIucGxheSgpLmhhbmRsZVRlY2hTZWVrZWRfKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cGxheWVyLnRyaWdnZXIoJ3Jlc29sdXRpb25jaGFuZ2UnKTtcblx0XHRcdH0pO1xuXHRcdHJldHVybiBwbGF5ZXI7XG5cdH07XG5cblx0LyoqXG5cdCAqIFJldHVybnMgZ3JvdXBlZCBzb3VyY2VzIGJ5IGxhYmVsLCByZXNvbHV0aW9uIGFuZCB0eXBlXG5cdCAqIEByZXR1cm5zIHtPYmplY3R9IGdyb3VwZWQgc291cmNlczogeyBsYWJlbDogeyBrZXk6IFtdIH0sIHJlczogeyBrZXk6IFtdIH0sIHR5cGU6IHsga2V5OiBbXSB9IH1cblx0ICovXG5cdHBsYXllci5nZXRHcm91cGVkU3JjID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuZ3JvdXBlZFNyYztcblx0fTtcblx0cGxheWVyLnNldFNvdXJjZXNTYW5pdGl6ZWQgPSBmdW5jdGlvbihzb3VyY2VzLCBsYWJlbCwgY3VzdG9tU291cmNlUGlja2VyKSB7XG5cdFx0dGhpcy5jdXJyZW50UmVzb2x1dGlvblN0YXRlID0ge1xuXHRcdFx0bGFiZWw6IGxhYmVsLFxuXHRcdFx0c291cmNlczogc291cmNlc1xuXHRcdH07XG5cblx0XHRpZiAodHlwZW9mIGN1c3RvbVNvdXJjZVBpY2tlciA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0cmV0dXJuIGN1c3RvbVNvdXJjZVBpY2tlcihwbGF5ZXIsIHNvdXJjZXMsIGxhYmVsKTtcblx0XHR9XG5cdFx0cGxheWVyLnNyYyhzb3VyY2VzLm1hcChmdW5jdGlvbihzcmMpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHNyYzogc3JjLnNyYyxcblx0XHRcdFx0dHlwZTogc3JjLnR5cGUsXG5cdFx0XHRcdHJlczogc3JjLnJlc1xuXHRcdFx0fTtcblx0XHR9KSk7XG5cblx0XHQkKFwiLnZqcy1yZXNvbHV0aW9uLWJ1dHRvbi1sYWJlbFwiKS5odG1sKGxhYmVsKTtcblx0XHRyZXR1cm4gcGxheWVyO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBNZXRob2QgdXNlZCBmb3Igc29ydGluZyBsaXN0IG9mIHNvdXJjZXNcblx0ICogQHBhcmFtICAge09iamVjdH0gYSAtIHNvdXJjZSBvYmplY3Qgd2l0aCByZXMgcHJvcGVydHlcblx0ICogQHBhcmFtICAge09iamVjdH0gYiAtIHNvdXJjZSBvYmplY3Qgd2l0aCByZXMgcHJvcGVydHlcblx0ICogQHJldHVybnMge051bWJlcn0gcmVzdWx0IG9mIGNvbXBhcmF0aW9uXG5cdCAqL1xuXHRmdW5jdGlvbiBjb21wYXJlUmVzb2x1dGlvbnMoYSwgYikge1xuXHRcdGlmICghYS5yZXMgfHwgIWIucmVzKSB7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cdFx0cmV0dXJuICgrYi5yZXMpIC0gKCthLnJlcyk7XG5cdH1cblxuXHQvKipcblx0ICogR3JvdXAgc291cmNlcyBieSBsYWJlbCwgcmVzb2x1dGlvbiBhbmQgdHlwZVxuXHQgKiBAcGFyYW0gICB7QXJyYXl9ICBzcmMgQXJyYXkgb2Ygc291cmNlc1xuXHQgKiBAcmV0dXJucyB7T2JqZWN0fSBncm91cGVkIHNvdXJjZXM6IHsgbGFiZWw6IHsga2V5OiBbXSB9LCByZXM6IHsga2V5OiBbXSB9LCB0eXBlOiB7IGtleTogW10gfSB9XG5cdCAqL1xuXHRmdW5jdGlvbiBidWNrZXRTb3VyY2VzKHNyYykge1xuXHRcdHZhciByZXNvbHV0aW9ucyA9IHtcblx0XHRcdGxhYmVsOiB7fSxcblx0XHRcdHJlczoge30sXG5cdFx0XHR0eXBlOiB7fVxuXHRcdH07XG5cdFx0c3JjLm1hcChmdW5jdGlvbihzb3VyY2UpIHtcblx0XHRcdGluaXRSZXNvbHV0aW9uS2V5KHJlc29sdXRpb25zLCAnbGFiZWwnLCBzb3VyY2UpO1xuXHRcdFx0aW5pdFJlc29sdXRpb25LZXkocmVzb2x1dGlvbnMsICdyZXMnLCBzb3VyY2UpO1xuXHRcdFx0aW5pdFJlc29sdXRpb25LZXkocmVzb2x1dGlvbnMsICd0eXBlJywgc291cmNlKTtcblxuXHRcdFx0YXBwZW5kU291cmNlVG9LZXkocmVzb2x1dGlvbnMsICdsYWJlbCcsIHNvdXJjZSk7XG5cdFx0XHRhcHBlbmRTb3VyY2VUb0tleShyZXNvbHV0aW9ucywgJ3JlcycsIHNvdXJjZSk7XG5cdFx0XHRhcHBlbmRTb3VyY2VUb0tleShyZXNvbHV0aW9ucywgJ3R5cGUnLCBzb3VyY2UpO1xuXHRcdH0pO1xuXHRcdHJldHVybiByZXNvbHV0aW9ucztcblx0fVxuXG5cdGZ1bmN0aW9uIGluaXRSZXNvbHV0aW9uS2V5KHJlc29sdXRpb25zLCBrZXksIHNvdXJjZSkge1xuXHRcdGlmIChyZXNvbHV0aW9uc1trZXldW3NvdXJjZVtrZXldXSA9PSBudWxsKSB7XG5cdFx0XHRyZXNvbHV0aW9uc1trZXldW3NvdXJjZVtrZXldXSA9IFtdO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIGFwcGVuZFNvdXJjZVRvS2V5KHJlc29sdXRpb25zLCBrZXksIHNvdXJjZSkge1xuXHRcdHJlc29sdXRpb25zW2tleV1bc291cmNlW2tleV1dLnB1c2goc291cmNlKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDaG9vc2Ugc3JjIGlmIG9wdGlvbi5kZWZhdWx0IGlzIHNwZWNpZmllZFxuXHQgKiBAcGFyYW0gICB7T2JqZWN0fSBncm91cGVkU3JjIHtyZXM6IHsga2V5OiBbXSB9fVxuXHQgKiBAcGFyYW0gICB7QXJyYXl9ICBzcmMgQXJyYXkgb2Ygc291cmNlcyBzb3J0ZWQgYnkgcmVzb2x1dGlvbiB1c2VkIHRvIGZpbmQgaGlnaCBhbmQgbG93IHJlc1xuXHQgKiBAcmV0dXJucyB7T2JqZWN0fSB7cmVzOiBzdHJpbmcsIHNvdXJjZXM6IFtdfVxuXHQgKi9cblx0ZnVuY3Rpb24gY2hvb3NlU3JjKGdyb3VwZWRTcmMsIHNyYykge1xuXHRcdHZhciBzZWxlY3RlZFJlcyA9IHNldHRpbmdzWydkZWZhdWx0J107IC8vIHVzZSBhcnJheSBhY2Nlc3MgYXMgZGVmYXVsdCBpcyBhIHJlc2VydmVkIGtleXdvcmRcblx0XHR2YXIgc2VsZWN0ZWRMYWJlbCA9ICcnO1xuXHRcdGlmIChzZWxlY3RlZFJlcyA9PT0gJ2hpZ2gnKSB7XG5cdFx0XHRzZWxlY3RlZFJlcyA9IHNyY1swXS5yZXM7XG5cdFx0XHRzZWxlY3RlZExhYmVsID0gc3JjWzBdLmxhYmVsO1xuXHRcdH0gZWxzZSBpZiAoc2VsZWN0ZWRSZXMgPT09ICdsb3cnIHx8IHNlbGVjdGVkUmVzID09IG51bGwgfHwgIWdyb3VwZWRTcmMucmVzW3NlbGVjdGVkUmVzXSkge1xuXHRcdFx0Ly8gU2VsZWN0IGxvdy1yZXMgaWYgZGVmYXVsdCBpcyBsb3cgb3Igbm90IHNldFxuXHRcdFx0c2VsZWN0ZWRSZXMgPSBzcmNbc3JjLmxlbmd0aCAtIDFdLnJlcztcblx0XHRcdHNlbGVjdGVkTGFiZWwgPSBzcmNbc3JjLmxlbmd0aCAtIDFdLmxhYmVsO1xuXHRcdH0gZWxzZSBpZiAoZ3JvdXBlZFNyYy5yZXNbc2VsZWN0ZWRSZXNdKSB7XG5cdFx0XHRzZWxlY3RlZExhYmVsID0gZ3JvdXBlZFNyYy5yZXNbc2VsZWN0ZWRSZXNdWzBdLmxhYmVsO1xuXHRcdH1cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzOiBzZWxlY3RlZFJlcyxcblx0XHRcdGxhYmVsOiBzZWxlY3RlZExhYmVsLFxuXHRcdFx0c291cmNlczogZ3JvdXBlZFNyYy5yZXNbc2VsZWN0ZWRSZXNdXG5cdFx0fTtcblx0fVxuXG5cdGZ1bmN0aW9uIGluaXRSZXNvbHV0aW9uRm9yWXQocGxheWVyKSB7XG5cdFx0Ly8gTWFwIHlvdXR1YmUgcXVhbGl0aWVzIG5hbWVzXG5cdFx0dmFyIF95dHMgPSB7XG5cdFx0XHRoaWdocmVzOiB7XG5cdFx0XHRcdHJlczogMTA4MCxcblx0XHRcdFx0bGFiZWw6ICcxMDgwJyxcblx0XHRcdFx0eXQ6ICdoaWdocmVzJ1xuXHRcdFx0fSxcblx0XHRcdGhkMTA4MDoge1xuXHRcdFx0XHRyZXM6IDEwODAsXG5cdFx0XHRcdGxhYmVsOiAnMTA4MCcsXG5cdFx0XHRcdHl0OiAnaGQxMDgwJ1xuXHRcdFx0fSxcblx0XHRcdGhkNzIwOiB7XG5cdFx0XHRcdHJlczogNzIwLFxuXHRcdFx0XHRsYWJlbDogJzcyMCcsXG5cdFx0XHRcdHl0OiAnaGQ3MjAnXG5cdFx0XHR9LFxuXHRcdFx0bGFyZ2U6IHtcblx0XHRcdFx0cmVzOiA0ODAsXG5cdFx0XHRcdGxhYmVsOiAnNDgwJyxcblx0XHRcdFx0eXQ6ICdsYXJnZSdcblx0XHRcdH0sXG5cdFx0XHRtZWRpdW06IHtcblx0XHRcdFx0cmVzOiAzNjAsXG5cdFx0XHRcdGxhYmVsOiAnMzYwJyxcblx0XHRcdFx0eXQ6ICdtZWRpdW0nXG5cdFx0XHR9LFxuXHRcdFx0c21hbGw6IHtcblx0XHRcdFx0cmVzOiAyNDAsXG5cdFx0XHRcdGxhYmVsOiAnMjQwJyxcblx0XHRcdFx0eXQ6ICdzbWFsbCdcblx0XHRcdH0sXG5cdFx0XHR0aW55OiB7XG5cdFx0XHRcdHJlczogMTQ0LFxuXHRcdFx0XHRsYWJlbDogJzE0NCcsXG5cdFx0XHRcdHl0OiAndGlueSdcblx0XHRcdH0sXG5cdFx0XHRhdXRvOiB7XG5cdFx0XHRcdHJlczogMCxcblx0XHRcdFx0bGFiZWw6ICdhdXRvJyxcblx0XHRcdFx0eXQ6ICdhdXRvJ1xuXHRcdFx0fVxuXHRcdH07XG5cdFx0Ly8gT3ZlcndyaXRlIGRlZmF1bHQgc291cmNlUGlja2VyIGZ1bmN0aW9uXG5cdFx0dmFyIF9jdXN0b21Tb3VyY2VQaWNrZXIgPSBmdW5jdGlvbihfcGxheWVyLCBfc291cmNlcywgX2xhYmVsKSB7XG5cdFx0XHQvLyBOb3RlIHRoYXQgc2V0UGxheWViYWNrUXVhbGl0eSBpcyBhIHN1Z2dlc3Rpb24uIFlUIGRvZXMgbm90IGFsd2F5cyBvYmV5IGl0LlxuXHRcdFx0cGxheWVyLnRlY2hfLnl0UGxheWVyLnNldFBsYXliYWNrUXVhbGl0eShfc291cmNlc1swXS5feXQpO1xuXHRcdFx0cGxheWVyLnRyaWdnZXIoJ3VwZGF0ZVNvdXJjZXMnKTtcblx0XHRcdHJldHVybiBwbGF5ZXI7XG5cdFx0fTtcblx0XHRzZXR0aW5ncy5jdXN0b21Tb3VyY2VQaWNrZXIgPSBfY3VzdG9tU291cmNlUGlja2VyO1xuXG5cdFx0Ly8gSW5pdCByZXNvbHV0aW9uXG5cdFx0cGxheWVyLnRlY2hfLnl0UGxheWVyLnNldFBsYXliYWNrUXVhbGl0eSgnYXV0bycpO1xuXG5cdFx0Ly8gVGhpcyBpcyB0cmlnZ2VyZWQgd2hlbiB0aGUgcmVzb2x1dGlvbiBhY3R1YWxseSBjaGFuZ2VzXG5cdFx0cGxheWVyLnRlY2hfLnl0UGxheWVyLmFkZEV2ZW50TGlzdGVuZXIoJ29uUGxheWJhY2tRdWFsaXR5Q2hhbmdlJywgZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdGZvciAodmFyIHJlcyBpbiBfeXRzKSB7XG5cdFx0XHRcdGlmIChyZXMueXQgPT09IGV2ZW50LmRhdGEpIHtcblx0XHRcdFx0XHRwbGF5ZXIuY3VycmVudFJlc29sdXRpb24ocmVzLmxhYmVsLCBfY3VzdG9tU291cmNlUGlja2VyKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdC8vIFdlIG11c3Qgd2FpdCBmb3IgcGxheSBldmVudFxuXHRcdHBsYXllci5vbmUoJ3BsYXknLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBxdWFsaXRpZXMgPSBwbGF5ZXIudGVjaF8ueXRQbGF5ZXIuZ2V0QXZhaWxhYmxlUXVhbGl0eUxldmVscygpO1xuXHRcdFx0dmFyIF9zb3VyY2VzID0gW107XG5cblx0XHRcdHF1YWxpdGllcy5tYXAoZnVuY3Rpb24ocSkge1xuXHRcdFx0XHRfc291cmNlcy5wdXNoKHtcblx0XHRcdFx0XHRzcmM6IHBsYXllci5zcmMoKS5zcmMsXG5cdFx0XHRcdFx0dHlwZTogcGxheWVyLnNyYygpLnR5cGUsXG5cdFx0XHRcdFx0bGFiZWw6IF95dHNbcV0ubGFiZWwsXG5cdFx0XHRcdFx0cmVzOiBfeXRzW3FdLnJlcyxcblx0XHRcdFx0XHRfeXQ6IF95dHNbcV0ueXRcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0cGxheWVyLmdyb3VwZWRTcmMgPSBidWNrZXRTb3VyY2VzKF9zb3VyY2VzKTtcblx0XHRcdHZhciBjaG9zZW4gPSB7XG5cdFx0XHRcdGxhYmVsOiAnYXV0bycsXG5cdFx0XHRcdHJlczogMCxcblx0XHRcdFx0c291cmNlczogcGxheWVyLmdyb3VwZWRTcmMubGFiZWwuYXV0b1xuXHRcdFx0fTtcblxuXHRcdFx0dGhpcy5jdXJyZW50UmVzb2x1dGlvblN0YXRlID0ge1xuXHRcdFx0XHRsYWJlbDogY2hvc2VuLmxhYmVsLFxuXHRcdFx0XHRzb3VyY2VzOiBjaG9zZW4uc291cmNlc1xuXHRcdFx0fTtcblxuXHRcdFx0cGxheWVyLnRyaWdnZXIoJ3VwZGF0ZVNvdXJjZXMnKTtcblx0XHRcdHBsYXllci5zZXRTb3VyY2VzU2FuaXRpemVkKGNob3Nlbi5zb3VyY2VzLCBjaG9zZW4ubGFiZWwsIF9jdXN0b21Tb3VyY2VQaWNrZXIpO1xuXHRcdH0pO1xuXHR9XG5cblx0cGxheWVyLnJlYWR5KGZ1bmN0aW9uKCkge1xuXHRcdGlmIChzZXR0aW5ncy51aSkge1xuXHRcdFx0dmFyIG1lbnVCdXR0b24gPSBuZXcgUmVzb2x1dGlvbk1lbnVCdXR0b24ocGxheWVyLCBzZXR0aW5ncyk7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5yZXNvbHV0aW9uU3dpdGNoZXIgPSBwbGF5ZXIuY29udHJvbEJhci5lbF8uaW5zZXJ0QmVmb3JlKG1lbnVCdXR0b24uZWxfLCBwbGF5ZXIuY29udHJvbEJhci5nZXRDaGlsZCgnZnVsbHNjcmVlblRvZ2dsZScpLmVsXyk7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5yZXNvbHV0aW9uU3dpdGNoZXIuZGlzcG9zZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR0aGlzLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcyk7XG5cdFx0XHR9O1xuXHRcdH1cblx0XHRpZiAocGxheWVyLm9wdGlvbnNfLnNvdXJjZXMubGVuZ3RoID4gMSkge1xuXHRcdFx0Ly8gdGVjaDogSHRtbDUgYW5kIEZsYXNoXG5cdFx0XHQvLyBDcmVhdGUgcmVzb2x1dGlvbiBzd2l0Y2hlciBmb3IgdmlkZW9zIGZvcm0gPHNvdXJjZT4gdGFnIGluc2lkZSA8dmlkZW8+XG5cdFx0XHRwbGF5ZXIudXBkYXRlU3JjKHBsYXllci5vcHRpb25zXy5zb3VyY2VzKTtcblx0XHR9XG5cblx0XHRpZiAocGxheWVyLnRlY2hOYW1lXyA9PT0gJ1lvdXR1YmUnKSB7XG5cdFx0XHQvLyB0ZWNoOiBZb3VUdWJlXG5cdFx0XHRpbml0UmVzb2x1dGlvbkZvcll0KHBsYXllcik7XG5cdFx0fVxuXHR9KTtcblxuXHR2YXIgdmlkZW9Kc1Jlc29sdXRpb25Td2l0Y2hlcixcblx0XHRkZWZhdWx0cyA9IHtcblx0XHRcdHVpOiB0cnVlXG5cdFx0fTtcblxuXHQvKlxuXHQgKiBSZXNvbHV0aW9uIG1lbnUgaXRlbVxuXHQgKi9cblx0dmFyIE1lbnVJdGVtID0gdmlkZW9qcy5nZXRDb21wb25lbnQoJ01lbnVJdGVtJyk7XG5cdHZhciBSZXNvbHV0aW9uTWVudUl0ZW0gPSB2aWRlb2pzLmV4dGVuZChNZW51SXRlbSwge1xuXHRcdGNvbnN0cnVjdG9yOiBmdW5jdGlvbihwbGF5ZXIsIG9wdGlvbnMpIHtcblx0XHRcdG9wdGlvbnMuc2VsZWN0YWJsZSA9IHRydWU7XG5cdFx0XHQvLyBTZXRzIHRoaXMucGxheWVyXywgdGhpcy5vcHRpb25zXyBhbmQgaW5pdGlhbGl6ZXMgdGhlIGNvbXBvbmVudFxuXHRcdFx0TWVudUl0ZW0uY2FsbCh0aGlzLCBwbGF5ZXIsIG9wdGlvbnMpO1xuXHRcdFx0dGhpcy5zcmMgPSBvcHRpb25zLnNyYztcblxuXHRcdFx0cGxheWVyLm9uKCdyZXNvbHV0aW9uY2hhbmdlJywgdmlkZW9qcy5iaW5kKHRoaXMsIHRoaXMudXBkYXRlKSk7XG5cdFx0fVxuXHR9KTtcblx0UmVzb2x1dGlvbk1lbnVJdGVtLnByb3RvdHlwZS5oYW5kbGVDbGljayA9IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0TWVudUl0ZW0ucHJvdG90eXBlLmhhbmRsZUNsaWNrLmNhbGwodGhpcywgZXZlbnQpO1xuXHRcdHRoaXMucGxheWVyXy5jdXJyZW50UmVzb2x1dGlvbih0aGlzLm9wdGlvbnNfLmxhYmVsKTtcblx0fTtcblx0UmVzb2x1dGlvbk1lbnVJdGVtLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZWN0aW9uID0gdGhpcy5wbGF5ZXJfLmN1cnJlbnRSZXNvbHV0aW9uKCk7XG5cdFx0dGhpcy5zZWxlY3RlZCh0aGlzLm9wdGlvbnNfLmxhYmVsID09PSBzZWxlY3Rpb24ubGFiZWwpO1xuXHR9O1xuXHRNZW51SXRlbS5yZWdpc3RlckNvbXBvbmVudCgnUmVzb2x1dGlvbk1lbnVJdGVtJywgUmVzb2x1dGlvbk1lbnVJdGVtKTtcblxuXHQvKlxuXHQgKiBSZXNvbHV0aW9uIG1lbnUgYnV0dG9uXG5cdCAqL1xuXHR2YXIgTWVudUJ1dHRvbiA9IHZpZGVvanMuZ2V0Q29tcG9uZW50KCdNZW51QnV0dG9uJyk7XG5cdHZhciBSZXNvbHV0aW9uTWVudUJ1dHRvbiA9IHZpZGVvanMuZXh0ZW5kKE1lbnVCdXR0b24sIHtcblx0XHRjb25zdHJ1Y3RvcjogZnVuY3Rpb24ocGxheWVyLCBvcHRpb25zKSB7XG5cdFx0XHR0aGlzLmxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuXHRcdFx0b3B0aW9ucy5sYWJlbCA9ICdRdWFsaXR5Jztcblx0XHRcdC8vIFNldHMgdGhpcy5wbGF5ZXJfLCB0aGlzLm9wdGlvbnNfIGFuZCBpbml0aWFsaXplcyB0aGUgY29tcG9uZW50XG5cdFx0XHRNZW51QnV0dG9uLmNhbGwodGhpcywgcGxheWVyLCBvcHRpb25zKTtcblx0XHRcdHRoaXMuZWwoKS5zZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnLCAnUXVhbGl0eScpO1xuXHRcdFx0dGhpcy5jb250cm9sVGV4dCgnUXVhbGl0eScpO1xuXG5cdFx0XHRpZiAob3B0aW9ucy5keW5hbWljTGFiZWwpIHtcblx0XHRcdFx0dmlkZW9qcy5hZGRDbGFzcyh0aGlzLmxhYmVsLCAndmpzLXJlc29sdXRpb24tYnV0dG9uLWxhYmVsJyk7XG5cdFx0XHRcdHRoaXMuZWwoKS5hcHBlbmRDaGlsZCh0aGlzLmxhYmVsKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZhciBzdGF0aWNMYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0XHRcdFx0dmlkZW9qcy5hZGRDbGFzcyhzdGF0aWNMYWJlbCwgJ3Zqcy1tZW51LWljb24nKTtcblx0XHRcdFx0dGhpcy5lbCgpLmFwcGVuZENoaWxkKHN0YXRpY0xhYmVsKTtcblx0XHRcdH1cblx0XHRcdHBsYXllci5vbigndXBkYXRlU291cmNlcycsIHZpZGVvanMuYmluZCh0aGlzLCB0aGlzLnVwZGF0ZSkpO1xuXHRcdH1cblx0fSk7XG5cdFJlc29sdXRpb25NZW51QnV0dG9uLnByb3RvdHlwZS5jcmVhdGVJdGVtcyA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBtZW51SXRlbXMgPSBbXTtcblx0XHR2YXIgbGFiZWxzID0gKHRoaXMuc291cmNlcyAmJiB0aGlzLnNvdXJjZXMubGFiZWwpIHx8IHt9O1xuXG5cdFx0Ly8gRklYTUUgb3JkZXIgaXMgbm90IGd1YXJhbnRlZWQgaGVyZS5cblx0XHRmb3IgKHZhciBrZXkgaW4gbGFiZWxzKSB7XG5cdFx0XHRpZiAobGFiZWxzLmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdFx0bWVudUl0ZW1zLnB1c2gobmV3IFJlc29sdXRpb25NZW51SXRlbShcblx0XHRcdFx0XHR0aGlzLnBsYXllcl8sIHtcblx0XHRcdFx0XHRcdGxhYmVsOiBrZXksXG5cdFx0XHRcdFx0XHRzcmM6IGxhYmVsc1trZXldLFxuXHRcdFx0XHRcdFx0c2VsZWN0ZWQ6IGtleSA9PT0gKHRoaXMuY3VycmVudFNlbGVjdGlvbiA/IHRoaXMuY3VycmVudFNlbGVjdGlvbi5sYWJlbCA6IGZhbHNlKVxuXHRcdFx0XHRcdH0pKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIG1lbnVJdGVtcztcblx0fTtcblx0UmVzb2x1dGlvbk1lbnVCdXR0b24ucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuc291cmNlcyA9IHRoaXMucGxheWVyXy5nZXRHcm91cGVkU3JjKCk7XG5cdFx0dGhpcy5jdXJyZW50U2VsZWN0aW9uID0gdGhpcy5wbGF5ZXJfLmN1cnJlbnRSZXNvbHV0aW9uKCk7XG5cdFx0dGhpcy5sYWJlbC5pbm5lckhUTUwgPSB0aGlzLmN1cnJlbnRTZWxlY3Rpb24gPyB0aGlzLmN1cnJlbnRTZWxlY3Rpb24ubGFiZWwgOiAnJztcblx0XHRyZXR1cm4gTWVudUJ1dHRvbi5wcm90b3R5cGUudXBkYXRlLmNhbGwodGhpcyk7XG5cdH07XG5cdFJlc29sdXRpb25NZW51QnV0dG9uLnByb3RvdHlwZS5idWlsZENTU0NsYXNzID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIE1lbnVCdXR0b24ucHJvdG90eXBlLmJ1aWxkQ1NTQ2xhc3MuY2FsbCh0aGlzKSArICcgdmpzLXJlc29sdXRpb24tYnV0dG9uJztcblx0fTtcblx0TWVudUJ1dHRvbi5yZWdpc3RlckNvbXBvbmVudCgnUmVzb2x1dGlvbk1lbnVCdXR0b24nLCBSZXNvbHV0aW9uTWVudUJ1dHRvbik7XG59O1xuXG4vKipcbiAqIOemgeeUqOa7muWKqOadoeaLluWKqFxuICogQHBhcmFtIHtbdHlwZV19IG9wdGlvbnMgW2Rlc2NyaXB0aW9uXVxuICogcmV0dXJuIHtbdHlwZV19ICBbZGVzY3JpcHRpb25dXG4gKi9cbmNvbnN0IGRpc2FibGVQcm9ncmVzcyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0dmFyXG5cdC8qKlxuXHQgKiBDb3BpZXMgcHJvcGVydGllcyBmcm9tIG9uZSBvciBtb3JlIG9iamVjdHMgb250byBhbiBvcmlnaW5hbC5cblx0ICovXG5cdFx0ZXh0ZW5kID0gZnVuY3Rpb24ob2JqIC8qLCBhcmcxLCBhcmcyLCAuLi4gKi8gKSB7XG5cdFx0XHR2YXIgYXJnLCBpLCBrO1xuXHRcdFx0Zm9yIChpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRhcmcgPSBhcmd1bWVudHNbaV07XG5cdFx0XHRcdGZvciAoayBpbiBhcmcpIHtcblx0XHRcdFx0XHRpZiAoYXJnLmhhc093blByb3BlcnR5KGspKSB7XG5cdFx0XHRcdFx0XHRvYmpba10gPSBhcmdba107XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gb2JqO1xuXHRcdH0sXG5cblx0XHQvLyBkZWZpbmUgc29tZSByZWFzb25hYmxlIGRlZmF1bHRzIGZvciB0aGlzIHN3ZWV0IHBsdWdpblxuXHRcdGRlZmF1bHRzID0ge1xuXHRcdFx0YXV0b0Rpc2FibGU6IGZhbHNlXG5cdFx0fTtcblxuXG5cdHZhclxuXHQvLyBzYXZlIGEgcmVmZXJlbmNlIHRvIHRoZSBwbGF5ZXIgaW5zdGFuY2Vcblx0XHRwbGF5ZXIgPSB0aGlzLFxuXHRcdHN0YXRlID0gZmFsc2UsXG5cblx0XHQvLyBtZXJnZSBvcHRpb25zIGFuZCBkZWZhdWx0c1xuXHRcdHNldHRpbmdzID0gZXh0ZW5kKHt9LCBkZWZhdWx0cywgb3B0aW9ucyB8fCB7fSk7XG5cblx0Ly8gZGlzYWJsZSAvIGVuYWJsZSBtZXRob2RzXG5cdHBsYXllci5kaXNhYmxlUHJvZ3Jlc3MgPSB7XG5cdFx0ZGlzYWJsZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRzdGF0ZSA9IHRydWU7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vZmYoXCJmb2N1c1wiKTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9mZihcIm1vdXNlZG93blwiKTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9mZihcInRvdWNoc3RhcnRcIik7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vZmYoXCJjbGlja1wiKTtcblx0XHR9LFxuXHRcdGVuYWJsZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRzdGF0ZSA9IGZhbHNlO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub24oXCJmb2N1c1wiLCBwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5oYW5kbGVGb2N1cyk7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vbihcIm1vdXNlZG93blwiLCBwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5oYW5kbGVNb3VzZURvd24pO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub24oXCJ0b3VjaHN0YXJ0XCIsIHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLmhhbmRsZU1vdXNlRG93bik7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vbihcImNsaWNrXCIsIHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLmhhbmRsZUNsaWNrKTtcblx0XHR9LFxuXHRcdGdldFN0YXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBzdGF0ZTtcblx0XHR9XG5cdH07XG5cblx0aWYgKHNldHRpbmdzLmF1dG9EaXNhYmxlKSB7XG5cdFx0cGxheWVyLmRpc2FibGVQcm9ncmVzcy5kaXNhYmxlKCk7XG5cdH1cbn07XG5cbi8qKlxuICog5omT54K5XG4gKiBAcGFyYW0ge1t0eXBlXX0gb3B0aW9ucyBbZGVzY3JpcHRpb25dXG4gKiByZXR1cm4ge1t0eXBlXX0gIFtkZXNjcmlwdGlvbl1cbiAqL1xuY29uc3QgbWFya2VycyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0Ly9kZWZhdWx0IHNldHRpbmdcblx0dmFyIGRlZmF1bHRTZXR0aW5nID0ge1xuXHRcdG1hcmtlclN0eWxlOiB7XG5cdFx0XHQnd2lkdGgnOiAnOHB4Jyxcblx0XHRcdCdib3JkZXItcmFkaXVzJzogJzIwJScsXG5cdFx0XHQnYmFja2dyb3VuZC1jb2xvcic6ICdyZ2JhKDI1NSwwLDAsLjUpJ1xuXHRcdH0sXG5cdFx0bWFya2VyVGlwOiB7XG5cdFx0XHRkaXNwbGF5OiB0cnVlLFxuXHRcdFx0dGV4dDogZnVuY3Rpb24obWFya2VyKSB7XG5cdFx0XHRcdHJldHVybiBtYXJrZXIudGV4dDtcblx0XHRcdH0sXG5cdFx0XHR0aW1lOiBmdW5jdGlvbihtYXJrZXIpIHtcblx0XHRcdFx0cmV0dXJuIG1hcmtlci50aW1lO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0YnJlYWtPdmVybGF5OiB7XG5cdFx0XHRkaXNwbGF5OiB0cnVlLFxuXHRcdFx0ZGlzcGxheVRpbWU6IDEsXG5cdFx0XHR0ZXh0OiBmdW5jdGlvbihtYXJrZXIpIHtcblx0XHRcdFx0cmV0dXJuIG1hcmtlci5vdmVybGF5VGV4dDtcblx0XHRcdH0sXG5cdFx0XHRzdHlsZToge1xuXHRcdFx0XHQnd2lkdGgnOiAnMTAwJScsXG5cdFx0XHRcdCdoZWlnaHQnOiAnY2FsYygxMDAlIC0gMzZweCknLFxuXHRcdFx0XHQnYmFja2dyb3VuZC1jb2xvcic6ICdyZ2JhKDAsMCwwLDAuNyknLFxuXHRcdFx0XHQnY29sb3InOiAnd2hpdGUnLFxuXHRcdFx0XHQnZm9udC1zaXplJzogJzE3cHgnXG5cdFx0XHR9XG5cdFx0fSxcblx0XHRvbk1hcmtlckNsaWNrOiBmdW5jdGlvbihtYXJrZXIpIHtcblx0XHRcdHJldHVybiBmYWxzZVxuXHRcdH0sXG5cdFx0b25NYXJrZXJSZWFjaGVkOiBmdW5jdGlvbihtYXJrZXIpIHt9LFxuXHRcdG1hcmtlcnM6IFtdXG5cdH07XG5cblx0Ly8gY3JlYXRlIGEgbm9uLWNvbGxpZGluZyByYW5kb20gbnVtYmVyXG5cdGZ1bmN0aW9uIGdlbmVyYXRlVVVJRCgpIHtcblx0XHR2YXIgZCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXHRcdHZhciB1dWlkID0gJ3h4eHh4eHh4LXh4eHgtNHh4eC15eHh4LXh4eHh4eHh4eHh4eCcucmVwbGFjZSgvW3h5XS9nLCBmdW5jdGlvbihjKSB7XG5cdFx0XHR2YXIgciA9IChkICsgTWF0aC5yYW5kb20oKSAqIDE2KSAlIDE2IHwgMDtcblx0XHRcdGQgPSBNYXRoLmZsb29yKGQgLyAxNik7XG5cdFx0XHRyZXR1cm4gKGMgPT0gJ3gnID8gciA6IChyICYgMHgzIHwgMHg4KSkudG9TdHJpbmcoMTYpO1xuXHRcdH0pO1xuXHRcdHJldHVybiB1dWlkO1xuXHR9O1xuXHQvKipcblx0ICogcmVnaXN0ZXIgdGhlIG1hcmtlcnMgcGx1Z2luIChkZXBlbmRlbnQgb24ganF1ZXJ5KVxuXHQgKi9cblx0dmFyIHNldHRpbmcgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZGVmYXVsdFNldHRpbmcsIG9wdGlvbnMpLFxuXHRcdG1hcmtlcnNNYXAgPSB7fSxcblx0XHRtYXJrZXJzTGlzdCA9IFtdLCAvLyBsaXN0IG9mIG1hcmtlcnMgc29ydGVkIGJ5IHRpbWVcblx0XHR2aWRlb1dyYXBwZXIgPSAkKHRoaXMuZWwoKSksXG5cdFx0Y3VycmVudE1hcmtlckluZGV4ID0gLTEsXG5cdFx0cGxheWVyID0gdGhpcyxcblx0XHRtYXJrZXJUaXAgPSBudWxsLFxuXHRcdGJyZWFrT3ZlcmxheSA9IG51bGwsXG5cdFx0b3ZlcmxheUluZGV4ID0gLTE7XG5cblx0ZnVuY3Rpb24gc29ydE1hcmtlcnNMaXN0KCkge1xuXHRcdC8vIHNvcnQgdGhlIGxpc3QgYnkgdGltZSBpbiBhc2Mgb3JkZXJcblx0XHRtYXJrZXJzTGlzdC5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdHJldHVybiBzZXR0aW5nLm1hcmtlclRpcC50aW1lKGEpIC0gc2V0dGluZy5tYXJrZXJUaXAudGltZShiKTtcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIGFkZE1hcmtlcnMobmV3TWFya2Vycykge1xuXHRcdC8vIGNyZWF0ZSB0aGUgbWFya2Vyc1xuXHRcdCQuZWFjaChuZXdNYXJrZXJzLCBmdW5jdGlvbihpbmRleCwgbWFya2VyKSB7XG5cdFx0XHRtYXJrZXIua2V5ID0gZ2VuZXJhdGVVVUlEKCk7XG5cblx0XHRcdHZpZGVvV3JhcHBlci5maW5kKCcudmpzLXByb2dyZXNzLWNvbnRyb2wnKS5hcHBlbmQoXG5cdFx0XHRcdGNyZWF0ZU1hcmtlckRpdihtYXJrZXIpKTtcblxuXHRcdFx0Ly8gc3RvcmUgbWFya2VyIGluIGFuIGludGVybmFsIGhhc2ggbWFwXG5cdFx0XHRtYXJrZXJzTWFwW21hcmtlci5rZXldID0gbWFya2VyO1xuXHRcdFx0bWFya2Vyc0xpc3QucHVzaChtYXJrZXIpO1xuXHRcdH0pO1xuXG5cdFx0c29ydE1hcmtlcnNMaXN0KCk7XG5cdH1cblxuXHRmdW5jdGlvbiBnZXRQb3NpdGlvbihtYXJrZXIpIHtcblx0XHRyZXR1cm4gKHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2VyKSAvIHBsYXllci5kdXJhdGlvbigpKSAqIDEwMFxuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlTWFya2VyRGl2KG1hcmtlciwgZHVyYXRpb24pIHtcblx0XHR2YXIgbWFya2VyRGl2ID0gJChcIjxkaXYgY2xhc3M9J3Zqcy1tYXJrZXInPjwvZGl2PlwiKTtcblx0XHR2YXIgbWFyZyA9IHBhcnNlSW50KHZpZGVvV3JhcHBlci5maW5kKCcudmpzLXByb2dyZXNzLWNvbnRyb2wgLnZqcy1zbGlkZXInKS5jc3MoJ21hcmdpbkxlZnQnKSk7XG5cdFx0bWFya2VyRGl2LmNzcyhzZXR0aW5nLm1hcmtlclN0eWxlKVxuXHRcdFx0LmNzcyh7XG5cdFx0XHRcdFwibWFyZ2luLWxlZnRcIjogbWFyZyAtIHBhcnNlRmxvYXQobWFya2VyRGl2LmNzcyhcIndpZHRoXCIpKSAvIDIgKyAncHgnLFxuXHRcdFx0XHRcImxlZnRcIjogZ2V0UG9zaXRpb24obWFya2VyKSArICclJ1xuXHRcdFx0fSlcblx0XHRcdC5hdHRyKFwiZGF0YS1tYXJrZXIta2V5XCIsIG1hcmtlci5rZXkpXG5cdFx0XHQuYXR0cihcImRhdGEtbWFya2VyLXRpbWVcIiwgc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXIpKTtcblxuXHRcdC8vIGFkZCB1c2VyLWRlZmluZWQgY2xhc3MgdG8gbWFya2VyXG5cdFx0aWYgKG1hcmtlci5jbGFzcykge1xuXHRcdFx0bWFya2VyRGl2LmFkZENsYXNzKG1hcmtlci5jbGFzcyk7XG5cdFx0fVxuXG5cdFx0Ly8gYmluZCBjbGljayBldmVudCB0byBzZWVrIHRvIG1hcmtlciB0aW1lXG5cdFx0bWFya2VyRGl2Lm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcblxuXHRcdFx0dmFyIHByZXZlbnREZWZhdWx0ID0gZmFsc2U7XG5cdFx0XHRpZiAodHlwZW9mIHNldHRpbmcub25NYXJrZXJDbGljayA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRcdC8vIGlmIHJldHVybiBmYWxzZSwgcHJldmVudCBkZWZhdWx0IGJlaGF2aW9yXG5cdFx0XHRcdHByZXZlbnREZWZhdWx0ID0gc2V0dGluZy5vbk1hcmtlckNsaWNrKG1hcmtlcikgPT0gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdGlmICghcHJldmVudERlZmF1bHQpIHtcblx0XHRcdFx0dmFyIGtleSA9ICQodGhpcykuZGF0YSgnbWFya2VyLWtleScpO1xuXHRcdFx0XHRwbGF5ZXIuY3VycmVudFRpbWUoc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTWFwW2tleV0pKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdGlmIChzZXR0aW5nLm1hcmtlclRpcC5kaXNwbGF5KSB7XG5cdFx0XHRyZWdpc3Rlck1hcmtlclRpcEhhbmRsZXIobWFya2VyRGl2KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gbWFya2VyRGl2O1xuXHR9XG5cblx0ZnVuY3Rpb24gdXBkYXRlTWFya2VycygpIHtcblx0XHQvLyB1cGRhdGUgVUkgZm9yIG1hcmtlcnMgd2hvc2UgdGltZSBjaGFuZ2VkXG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG1hcmtlcnNMaXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgbWFya2VyID0gbWFya2Vyc0xpc3RbaV07XG5cdFx0XHR2YXIgbWFya2VyRGl2ID0gdmlkZW9XcmFwcGVyLmZpbmQoXCIudmpzLW1hcmtlcltkYXRhLW1hcmtlci1rZXk9J1wiICsgbWFya2VyLmtleSArIFwiJ11cIik7XG5cdFx0XHR2YXIgbWFya2VyVGltZSA9IHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2VyKTtcblxuXHRcdFx0aWYgKG1hcmtlckRpdi5kYXRhKCdtYXJrZXItdGltZScpICE9IG1hcmtlclRpbWUpIHtcblx0XHRcdFx0bWFya2VyRGl2LmNzcyh7XG5cdFx0XHRcdFx0XHRcImxlZnRcIjogZ2V0UG9zaXRpb24obWFya2VyKSArICclJ1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0LmF0dHIoXCJkYXRhLW1hcmtlci10aW1lXCIsIG1hcmtlclRpbWUpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRzb3J0TWFya2Vyc0xpc3QoKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHJlbW92ZU1hcmtlcnMoaW5kZXhBcnJheSkge1xuXHRcdC8vIHJlc2V0IG92ZXJsYXlcblx0XHRpZiAoYnJlYWtPdmVybGF5KSB7XG5cdFx0XHRvdmVybGF5SW5kZXggPSAtMTtcblx0XHRcdGJyZWFrT3ZlcmxheS5jc3MoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuXHRcdH1cblx0XHRjdXJyZW50TWFya2VySW5kZXggPSAtMTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgaW5kZXhBcnJheS5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGluZGV4ID0gaW5kZXhBcnJheVtpXTtcblx0XHRcdHZhciBtYXJrZXIgPSBtYXJrZXJzTGlzdFtpbmRleF07XG5cdFx0XHRpZiAobWFya2VyKSB7XG5cdFx0XHRcdC8vIGRlbGV0ZSBmcm9tIG1lbW9yeVxuXHRcdFx0XHRkZWxldGUgbWFya2Vyc01hcFttYXJrZXIua2V5XTtcblx0XHRcdFx0bWFya2Vyc0xpc3RbaW5kZXhdID0gbnVsbDtcblxuXHRcdFx0XHQvLyBkZWxldGUgZnJvbSBkb21cblx0XHRcdFx0dmlkZW9XcmFwcGVyLmZpbmQoXCIudmpzLW1hcmtlcltkYXRhLW1hcmtlci1rZXk9J1wiICsgbWFya2VyLmtleSArIFwiJ11cIikucmVtb3ZlKCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gY2xlYW4gdXAgYXJyYXlcblx0XHRmb3IgKHZhciBpID0gbWFya2Vyc0xpc3QubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcblx0XHRcdGlmIChtYXJrZXJzTGlzdFtpXSA9PT0gbnVsbCkge1xuXHRcdFx0XHRtYXJrZXJzTGlzdC5zcGxpY2UoaSwgMSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gc29ydCBhZ2FpblxuXHRcdHNvcnRNYXJrZXJzTGlzdCgpO1xuXHR9XG5cblxuXHQvLyBhdHRhY2ggaG92ZXIgZXZlbnQgaGFuZGxlclxuXHRmdW5jdGlvbiByZWdpc3Rlck1hcmtlclRpcEhhbmRsZXIobWFya2VyRGl2KSB7XG5cblx0XHRtYXJrZXJEaXYub24oJ21vdXNlb3ZlcicsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIG1hcmtlciA9IG1hcmtlcnNNYXBbJCh0aGlzKS5kYXRhKCdtYXJrZXIta2V5JyldO1xuXG5cdFx0XHRtYXJrZXJUaXAuZmluZCgnLnZqcy10aXAtaW5uZXInKS5odG1sKHNldHRpbmcubWFya2VyVGlwLnRleHQobWFya2VyKSk7XG5cblx0XHRcdC8vIG1hcmdpbi1sZWZ0IG5lZWRzIHRvIG1pbnVzIHRoZSBwYWRkaW5nIGxlbmd0aCB0byBhbGlnbiBjb3JyZWN0bHkgd2l0aCB0aGUgbWFya2VyXG5cdFx0XHRtYXJrZXJUaXAuY3NzKHtcblx0XHRcdFx0XCJsZWZ0XCI6IGdldFBvc2l0aW9uKG1hcmtlcikgKyAnJScsXG5cdFx0XHRcdFwibWFyZ2luLWxlZnRcIjogLXBhcnNlRmxvYXQobWFya2VyVGlwLmNzcyhcIndpZHRoXCIpKSAvIDIgLSA1ICsgJ3B4Jyxcblx0XHRcdFx0XCJ2aXNpYmlsaXR5XCI6IFwidmlzaWJsZVwiXG5cdFx0XHR9KTtcblxuXHRcdH0pLm9uKCdtb3VzZW91dCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0bWFya2VyVGlwLmNzcyhcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBpbml0aWFsaXplTWFya2VyVGlwKCkge1xuXHRcdG1hcmtlclRpcCA9ICQoXCI8ZGl2IGNsYXNzPSd2anMtdGlwJz48ZGl2IGNsYXNzPSd2anMtdGlwLWFycm93Jz48L2Rpdj48ZGl2IGNsYXNzPSd2anMtdGlwLWlubmVyJz48L2Rpdj48L2Rpdj5cIik7XG5cdFx0dmlkZW9XcmFwcGVyLmZpbmQoJy52anMtcHJvZ3Jlc3MtY29udHJvbCcpLmFwcGVuZChtYXJrZXJUaXApO1xuXHR9XG5cdHZhciBsdCA9IDA7XG5cdHZhciBmeCA9IC0xO1xuXHQvLyBzaG93IG9yIGhpZGUgYnJlYWsgb3ZlcmxheXNcblx0ZnVuY3Rpb24gdXBkYXRlQnJlYWtPdmVybGF5KCkge1xuXHRcdGlmICghc2V0dGluZy5icmVha092ZXJsYXkuZGlzcGxheSB8fCBjdXJyZW50TWFya2VySW5kZXggPCAwKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIGN1cnJlbnRUaW1lID0gcGxheWVyLmN1cnJlbnRUaW1lKCk7XG5cdFx0dmFyIG1hcmtlciA9IG1hcmtlcnNMaXN0W2N1cnJlbnRNYXJrZXJJbmRleF07XG5cdFx0dmFyIG1hcmtlclRpbWUgPSBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcik7XG5cdFx0dmFyIGN0ID0gY3VycmVudFRpbWUgLSBtYXJrZXJUaW1lO1xuXG5cdFx0aWYgKGN0ID49IDAgJiYgY3QgPCAxICYmIGZ4ICE9IGN1cnJlbnRNYXJrZXJJbmRleCkge1xuXHRcdFx0ZnggPSBjdXJyZW50TWFya2VySW5kZXg7XG5cdFx0XHRsdCA9IGN1cnJlbnRUaW1lICsgc2V0dGluZy5icmVha092ZXJsYXkuZGlzcGxheVRpbWU7XG5cdFx0fVxuXG5cdFx0aWYgKGN1cnJlbnRUaW1lID49IG1hcmtlclRpbWUgJiZcblx0XHRcdGN1cnJlbnRUaW1lIDw9IGx0KSB7XG5cdFx0XHRpZiAob3ZlcmxheUluZGV4ICE9IGN1cnJlbnRNYXJrZXJJbmRleCkge1xuXHRcdFx0XHRvdmVybGF5SW5kZXggPSBjdXJyZW50TWFya2VySW5kZXg7XG5cdFx0XHRcdGJyZWFrT3ZlcmxheS5maW5kKCcudmpzLWJyZWFrLW92ZXJsYXktdGV4dCcpLmh0bWwoc2V0dGluZy5icmVha092ZXJsYXkudGV4dChtYXJrZXIpKTtcblx0XHRcdH1cblxuXHRcdFx0YnJlYWtPdmVybGF5LmNzcygndmlzaWJpbGl0eScsIFwidmlzaWJsZVwiKTtcblxuXHRcdH0gZWxzZSB7XG5cdFx0XHRvdmVybGF5SW5kZXggPSAtMTtcblx0XHRcdGJyZWFrT3ZlcmxheS5jc3MoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuXHRcdFx0bHQgPSAwO1xuXHRcdH1cblx0fVxuXG5cdC8vIHByb2JsZW0gd2hlbiB0aGUgbmV4dCBtYXJrZXIgaXMgd2l0aGluIHRoZSBvdmVybGF5IGRpc3BsYXkgdGltZSBmcm9tIHRoZSBwcmV2aW91cyBtYXJrZXJcblx0ZnVuY3Rpb24gaW5pdGlhbGl6ZU92ZXJsYXkoKSB7XG5cdFx0YnJlYWtPdmVybGF5ID0gJChcIjxkaXYgY2xhc3M9J3Zqcy1icmVhay1vdmVybGF5Jz48ZGl2IGNsYXNzPSd2anMtYnJlYWstb3ZlcmxheS10ZXh0Jz48L2Rpdj48L2Rpdj5cIilcblx0XHRcdC5jc3Moc2V0dGluZy5icmVha092ZXJsYXkuc3R5bGUpO1xuXHRcdHZpZGVvV3JhcHBlci5hcHBlbmQoYnJlYWtPdmVybGF5KTtcblx0XHRvdmVybGF5SW5kZXggPSAtMTtcblx0fVxuXG5cdGZ1bmN0aW9uIG9uVGltZVVwZGF0ZSgpIHtcblx0XHRvblVwZGF0ZU1hcmtlcigpO1xuXHRcdHVwZGF0ZUJyZWFrT3ZlcmxheSgpO1xuXHR9XG5cblx0ZnVuY3Rpb24gb25VcGRhdGVNYXJrZXIoKSB7XG5cdFx0Lypcblx0XHQgICAgY2hlY2sgbWFya2VyIHJlYWNoZWQgaW4gYmV0d2VlbiBtYXJrZXJzXG5cdFx0ICAgIHRoZSBsb2dpYyBoZXJlIGlzIHRoYXQgaXQgdHJpZ2dlcnMgYSBuZXcgbWFya2VyIHJlYWNoZWQgZXZlbnQgb25seSBpZiB0aGUgcGxheWVyIFxuXHRcdCAgICBlbnRlcnMgYSBuZXcgbWFya2VyIHJhbmdlIChlLmcuIGZyb20gbWFya2VyIDEgdG8gbWFya2VyIDIpLiBUaHVzLCBpZiBwbGF5ZXIgaXMgb24gbWFya2VyIDEgYW5kIHVzZXIgY2xpY2tlZCBvbiBtYXJrZXIgMSBhZ2Fpbiwgbm8gbmV3IHJlYWNoZWQgZXZlbnQgaXMgdHJpZ2dlcmVkKVxuXHRcdCovXG5cblx0XHR2YXIgZ2V0TmV4dE1hcmtlclRpbWUgPSBmdW5jdGlvbihpbmRleCkge1xuXHRcdFx0aWYgKGluZGV4IDwgbWFya2Vyc0xpc3QubGVuZ3RoIC0gMSkge1xuXHRcdFx0XHRyZXR1cm4gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTGlzdFtpbmRleCArIDFdKTtcblx0XHRcdH1cblx0XHRcdC8vIG5leHQgbWFya2VyIHRpbWUgb2YgbGFzdCBtYXJrZXIgd291bGQgYmUgZW5kIG9mIHZpZGVvIHRpbWVcblx0XHRcdHJldHVybiBwbGF5ZXIuZHVyYXRpb24oKTtcblx0XHR9XG5cdFx0dmFyIGN1cnJlbnRUaW1lID0gcGxheWVyLmN1cnJlbnRUaW1lKCk7XG5cdFx0dmFyIG5ld01hcmtlckluZGV4O1xuXG5cdFx0aWYgKGN1cnJlbnRNYXJrZXJJbmRleCAhPSAtMSkge1xuXHRcdFx0Ly8gY2hlY2sgaWYgc3RheWluZyBhdCBzYW1lIG1hcmtlclxuXHRcdFx0dmFyIG5leHRNYXJrZXJUaW1lID0gZ2V0TmV4dE1hcmtlclRpbWUoY3VycmVudE1hcmtlckluZGV4KTtcblx0XHRcdGlmIChjdXJyZW50VGltZSA+PSBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcnNMaXN0W2N1cnJlbnRNYXJrZXJJbmRleF0pICYmXG5cdFx0XHRcdGN1cnJlbnRUaW1lIDwgbmV4dE1hcmtlclRpbWUpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBjaGVjayBmb3IgZW5kaW5nIChhdCB0aGUgZW5kIGN1cnJlbnQgdGltZSBlcXVhbHMgcGxheWVyIGR1cmF0aW9uKVxuXHRcdFx0aWYgKGN1cnJlbnRNYXJrZXJJbmRleCA9PT0gbWFya2Vyc0xpc3QubGVuZ3RoIC0gMSAmJlxuXHRcdFx0XHRjdXJyZW50VGltZSA9PT0gcGxheWVyLmR1cmF0aW9uKCkpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIGNoZWNrIGZpcnN0IG1hcmtlciwgbm8gbWFya2VyIGlzIHNlbGVjdGVkXG5cdFx0aWYgKG1hcmtlcnNMaXN0Lmxlbmd0aCA+IDAgJiZcblx0XHRcdGN1cnJlbnRUaW1lIDwgc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTGlzdFswXSkpIHtcblx0XHRcdG5ld01hcmtlckluZGV4ID0gLTE7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIGxvb2sgZm9yIG5ldyBpbmRleFxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBtYXJrZXJzTGlzdC5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRuZXh0TWFya2VyVGltZSA9IGdldE5leHRNYXJrZXJUaW1lKGkpO1xuXG5cdFx0XHRcdGlmIChjdXJyZW50VGltZSA+PSBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcnNMaXN0W2ldKSAmJlxuXHRcdFx0XHRcdGN1cnJlbnRUaW1lIDwgbmV4dE1hcmtlclRpbWUpIHtcblx0XHRcdFx0XHRuZXdNYXJrZXJJbmRleCA9IGk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBzZXQgbmV3IG1hcmtlciBpbmRleFxuXHRcdGlmIChuZXdNYXJrZXJJbmRleCAhPSBjdXJyZW50TWFya2VySW5kZXgpIHtcblx0XHRcdC8vIHRyaWdnZXIgZXZlbnRcblx0XHRcdGlmIChuZXdNYXJrZXJJbmRleCAhPSAtMSAmJiBvcHRpb25zLm9uTWFya2VyUmVhY2hlZCkge1xuXHRcdFx0XHRvcHRpb25zLm9uTWFya2VyUmVhY2hlZChtYXJrZXJzTGlzdFtuZXdNYXJrZXJJbmRleF0pO1xuXHRcdFx0fVxuXHRcdFx0Y3VycmVudE1hcmtlckluZGV4ID0gbmV3TWFya2VySW5kZXg7XG5cdFx0fVxuXG5cdH1cblxuXHQvLyBzZXR1cCB0aGUgd2hvbGUgdGhpbmdcblx0ZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcblx0XHRpZiAoc2V0dGluZy5tYXJrZXJUaXAuZGlzcGxheSkge1xuXHRcdFx0aW5pdGlhbGl6ZU1hcmtlclRpcCgpO1xuXHRcdH1cblxuXHRcdC8vIHJlbW92ZSBleGlzdGluZyBtYXJrZXJzIGlmIGFscmVhZHkgaW5pdGlhbGl6ZWRcblx0XHRwbGF5ZXIubWFya2Vycy5yZW1vdmVBbGwoKTtcblx0XHRhZGRNYXJrZXJzKG9wdGlvbnMubWFya2Vycyk7XG5cblx0XHRpZiAoc2V0dGluZy5icmVha092ZXJsYXkuZGlzcGxheSkge1xuXHRcdFx0aW5pdGlhbGl6ZU92ZXJsYXkoKTtcblx0XHR9XG5cdFx0b25UaW1lVXBkYXRlKCk7XG5cdFx0cGxheWVyLm9uKFwidGltZXVwZGF0ZVwiLCBvblRpbWVVcGRhdGUpO1xuXHR9XG5cblx0Ly8gc2V0dXAgdGhlIHBsdWdpbiBhZnRlciB3ZSBsb2FkZWQgdmlkZW8ncyBtZXRhIGRhdGFcblx0cGxheWVyLm9uKFwibG9hZGVkbWV0YWRhdGFcIiwgZnVuY3Rpb24oKSB7XG5cdFx0aW5pdGlhbGl6ZSgpO1xuXHR9KTtcblxuXHQvLyBleHBvc2VkIHBsdWdpbiBBUElcblx0cGxheWVyLm1hcmtlcnMgPSB7XG5cdFx0Z2V0TWFya2VyczogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gbWFya2Vyc0xpc3Q7XG5cdFx0fSxcblx0XHRuZXh0OiBmdW5jdGlvbigpIHtcblx0XHRcdC8vIGdvIHRvIHRoZSBuZXh0IG1hcmtlciBmcm9tIGN1cnJlbnQgdGltZXN0YW1wXG5cdFx0XHR2YXIgY3VycmVudFRpbWUgPSBwbGF5ZXIuY3VycmVudFRpbWUoKTtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbWFya2Vyc0xpc3QubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0dmFyIG1hcmtlclRpbWUgPSBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcnNMaXN0W2ldKTtcblx0XHRcdFx0aWYgKG1hcmtlclRpbWUgPiBjdXJyZW50VGltZSkge1xuXHRcdFx0XHRcdHBsYXllci5jdXJyZW50VGltZShtYXJrZXJUaW1lKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0cHJldjogZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBnbyB0byBwcmV2aW91cyBtYXJrZXJcblx0XHRcdHZhciBjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdFx0Zm9yICh2YXIgaSA9IG1hcmtlcnNMaXN0Lmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRcdHZhciBtYXJrZXJUaW1lID0gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTGlzdFtpXSk7XG5cdFx0XHRcdC8vIGFkZCBhIHRocmVzaG9sZFxuXHRcdFx0XHRpZiAobWFya2VyVGltZSArIDAuNSA8IGN1cnJlbnRUaW1lKSB7XG5cdFx0XHRcdFx0cGxheWVyLmN1cnJlbnRUaW1lKG1hcmtlclRpbWUpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRhZGQ6IGZ1bmN0aW9uKG5ld01hcmtlcnMpIHtcblx0XHRcdC8vIGFkZCBuZXcgbWFya2VycyBnaXZlbiBhbiBhcnJheSBvZiBpbmRleFxuXHRcdFx0YWRkTWFya2VycyhuZXdNYXJrZXJzKTtcblx0XHR9LFxuXHRcdHJlbW92ZTogZnVuY3Rpb24oaW5kZXhBcnJheSkge1xuXHRcdFx0Ly8gcmVtb3ZlIG1hcmtlcnMgZ2l2ZW4gYW4gYXJyYXkgb2YgaW5kZXhcblx0XHRcdHJlbW92ZU1hcmtlcnMoaW5kZXhBcnJheSk7XG5cdFx0fSxcblx0XHRyZW1vdmVBbGw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGluZGV4QXJyYXkgPSBbXTtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbWFya2Vyc0xpc3QubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aW5kZXhBcnJheS5wdXNoKGkpO1xuXHRcdFx0fVxuXHRcdFx0cmVtb3ZlTWFya2VycyhpbmRleEFycmF5KTtcblx0XHR9LFxuXHRcdHVwZGF0ZVRpbWU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gbm90aWZ5IHRoZSBwbHVnaW4gdG8gdXBkYXRlIHRoZSBVSSBmb3IgY2hhbmdlcyBpbiBtYXJrZXIgdGltZXMgXG5cdFx0XHR1cGRhdGVNYXJrZXJzKCk7XG5cdFx0fSxcblx0XHRyZXNldDogZnVuY3Rpb24obmV3TWFya2Vycykge1xuXHRcdFx0Ly8gcmVtb3ZlIGFsbCB0aGUgZXhpc3RpbmcgbWFya2VycyBhbmQgYWRkIG5ldyBvbmVzXG5cdFx0XHRwbGF5ZXIubWFya2Vycy5yZW1vdmVBbGwoKTtcblx0XHRcdGFkZE1hcmtlcnMobmV3TWFya2Vycyk7XG5cdFx0fSxcblx0XHRkZXN0cm95OiBmdW5jdGlvbigpIHtcblx0XHRcdC8vIHVucmVnaXN0ZXIgdGhlIHBsdWdpbnMgYW5kIGNsZWFuIHVwIGV2ZW4gaGFuZGxlcnNcblx0XHRcdHBsYXllci5tYXJrZXJzLnJlbW92ZUFsbCgpO1xuXHRcdFx0YnJlYWtPdmVybGF5LnJlbW92ZSgpO1xuXHRcdFx0bWFya2VyVGlwLnJlbW92ZSgpO1xuXHRcdFx0cGxheWVyLm9mZihcInRpbWV1cGRhdGVcIiwgdXBkYXRlQnJlYWtPdmVybGF5KTtcblx0XHRcdGRlbGV0ZSBwbGF5ZXIubWFya2Vycztcblx0XHR9LFxuXHR9O1xufTtcblxuLyoqXG4gKiDmsLTljbBcbiAqIEBwYXJhbSB7W3R5cGVdfSBvcHRpb25zIFtkZXNjcmlwdGlvbl1cbiAqIHJldHVybiB7W3R5cGVdfSAgW2Rlc2NyaXB0aW9uXVxuICovXG5jb25zdCB3YXRlck1hcmsgPSBmdW5jdGlvbihzZXR0aW5ncykge1xuXHR2YXIgZGVmYXVsdHMgPSB7XG5cdFx0XHRmaWxlOiAnbG9nby5wbmcnLFxuXHRcdFx0eHBvczogMCxcblx0XHRcdHlwb3M6IDAsXG5cdFx0XHR4cmVwZWF0OiAwLFxuXHRcdFx0b3BhY2l0eTogMTAwLFxuXHRcdFx0Y2xpY2thYmxlOiBmYWxzZSxcblx0XHRcdHVybDogXCJcIixcblx0XHRcdGNsYXNzTmFtZTogJ3Zqcy13YXRlcm1hcmsnLFxuXHRcdFx0dGV4dDogZmFsc2UsXG5cdFx0XHRkZWJ1ZzogZmFsc2Vcblx0XHR9LFxuXHRcdGV4dGVuZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGFyZ3MsIHRhcmdldCwgaSwgb2JqZWN0LCBwcm9wZXJ0eTtcblx0XHRcdGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuXHRcdFx0dGFyZ2V0ID0gYXJncy5zaGlmdCgpIHx8IHt9O1xuXHRcdFx0Zm9yIChpIGluIGFyZ3MpIHtcblx0XHRcdFx0b2JqZWN0ID0gYXJnc1tpXTtcblx0XHRcdFx0Zm9yIChwcm9wZXJ0eSBpbiBvYmplY3QpIHtcblx0XHRcdFx0XHRpZiAob2JqZWN0Lmhhc093blByb3BlcnR5KHByb3BlcnR5KSkge1xuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBvYmplY3RbcHJvcGVydHldID09PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRcdFx0XHR0YXJnZXRbcHJvcGVydHldID0gZXh0ZW5kKHRhcmdldFtwcm9wZXJ0eV0sIG9iamVjdFtwcm9wZXJ0eV0pO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0W3Byb3BlcnR5XSA9IG9iamVjdFtwcm9wZXJ0eV07XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGFyZ2V0O1xuXHRcdH07XG5cblx0Ly8hIGdsb2JhbCB2YXJpYmxlIGNvbnRhaW5pbmcgcmVmZXJlbmNlIHRvIHRoZSBET00gZWxlbWVudFxuXHR2YXIgZGl2O1xuXG5cdC8vIHZhciBzZXR0aW5ncyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0cywgb3B0aW9ucyk7XG5cblx0aWYgKHNldHRpbmdzLmRlYnVnKSBjb25zb2xlLmxvZygnd2F0ZXJtYXJrOiBSZWdpc3RlciBpbml0Jyk7XG5cblx0dmFyIG9wdGlvbnMsIHBsYXllciwgdmlkZW8sIGltZywgbGluaztcblx0b3B0aW9ucyA9IGV4dGVuZChkZWZhdWx0cywgc2V0dGluZ3MpO1xuXG5cdC8qIEdyYWIgdGhlIG5lY2Vzc2FyeSBET00gZWxlbWVudHMgKi9cblx0cGxheWVyID0gdGhpcy5lbCgpO1xuXHR2aWRlbyA9IHRoaXMuZWwoKS5nZXRFbGVtZW50c0J5VGFnTmFtZSgndmlkZW8nKVswXTtcblxuXHQvLyBjcmVhdGUgdGhlIHdhdGVybWFyayBlbGVtZW50XG5cdGlmICghZGl2KSB7XG5cdFx0ZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0ZGl2LmNsYXNzTmFtZSA9IG9wdGlvbnMuY2xhc3NOYW1lO1xuXHR9IGVsc2Uge1xuXHRcdC8vISBpZiBkaXYgYWxyZWFkeSBleGlzdHMsIGVtcHR5IGl0XG5cdFx0ZGl2LmlubmVySFRNTCA9ICcnO1xuXHR9XG5cblx0Ly8gaWYgdGV4dCBpcyBzZXQsIGRpc3BsYXkgdGV4dFxuXHRpZiAob3B0aW9ucy50ZXh0KVxuXHRcdGRpdi50ZXh0Q29udGVudCA9IG9wdGlvbnMudGV4dDtcblxuXHQvLyBpZiBpbWcgaXMgc2V0LCBhZGQgaW1nXG5cdGlmIChvcHRpb25zLmZpbGUpIHtcblx0XHRpbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcblx0XHRkaXYuYXBwZW5kQ2hpbGQoaW1nKTtcblx0XHRkaXYuc3R5bGUuZGlzcGxheSA9IFwiaW5saW5lLWJsb2NrXCI7XG5cdFx0ZGl2LnN0eWxlLnBvc2l0aW9uID0gXCJhYnNvbHV0ZVwiO1xuXHRcdGRpdi5zdHlsZS56SW5kZXggPSAwO1xuXHRcdGltZy5zcmMgPSBvcHRpb25zLmZpbGU7XG5cdH1cblx0Ly9pbWcuc3R5bGUuYm90dG9tID0gXCIwXCI7XG5cdC8vaW1nLnN0eWxlLnJpZ2h0ID0gXCIwXCI7XG5cdGlmICgob3B0aW9ucy55cG9zID09PSAwKSAmJiAob3B0aW9ucy54cG9zID09PSAwKSkgLy8gVG9wIGxlZnRcblx0e1xuXHRcdGRpdi5zdHlsZS50b3AgPSBcIjBweFwiO1xuXHRcdGRpdi5zdHlsZS5sZWZ0ID0gXCIwcHhcIjtcblx0fSBlbHNlIGlmICgob3B0aW9ucy55cG9zID09PSAwKSAmJiAob3B0aW9ucy54cG9zID09PSAxMDApKSAvLyBUb3AgcmlnaHRcblx0e1xuXHRcdGRpdi5zdHlsZS50b3AgPSBcIjBweFwiO1xuXHRcdGRpdi5zdHlsZS5yaWdodCA9IFwiMHB4XCI7XG5cdH0gZWxzZSBpZiAoKG9wdGlvbnMueXBvcyA9PT0gMTAwKSAmJiAob3B0aW9ucy54cG9zID09PSAxMDApKSAvLyBCb3R0b20gcmlnaHRcblx0e1xuXHRcdGRpdi5zdHlsZS5ib3R0b20gPSBcIjBweFwiO1xuXHRcdGRpdi5zdHlsZS5yaWdodCA9IFwiMHB4XCI7XG5cdH0gZWxzZSBpZiAoKG9wdGlvbnMueXBvcyA9PT0gMTAwKSAmJiAob3B0aW9ucy54cG9zID09PSAwKSkgLy8gQm90dG9tIGxlZnRcblx0e1xuXHRcdGRpdi5zdHlsZS5ib3R0b20gPSBcIjBweFwiO1xuXHRcdGRpdi5zdHlsZS5sZWZ0ID0gXCIwcHhcIjtcblx0fSBlbHNlIGlmICgob3B0aW9ucy55cG9zID09PSA1MCkgJiYgKG9wdGlvbnMueHBvcyA9PT0gNTApKSAvLyBDZW50ZXJcblx0e1xuXHRcdGlmIChvcHRpb25zLmRlYnVnKSBjb25zb2xlLmxvZygnd2F0ZXJtYXJrOiBwbGF5ZXI6JyArIHBsYXllci53aWR0aCArICd4JyArIHBsYXllci5oZWlnaHQpO1xuXHRcdGlmIChvcHRpb25zLmRlYnVnKSBjb25zb2xlLmxvZygnd2F0ZXJtYXJrOiB2aWRlbzonICsgdmlkZW8udmlkZW9XaWR0aCArICd4JyArIHZpZGVvLnZpZGVvSGVpZ2h0KTtcblx0XHRpZiAob3B0aW9ucy5kZWJ1ZykgY29uc29sZS5sb2coJ3dhdGVybWFyazogaW1hZ2U6JyArIGltZy53aWR0aCArICd4JyArIGltZy5oZWlnaHQpO1xuXHRcdGRpdi5zdHlsZS50b3AgPSAodGhpcy5oZWlnaHQoKSAvIDIpICsgXCJweFwiO1xuXHRcdGRpdi5zdHlsZS5sZWZ0ID0gKHRoaXMud2lkdGgoKSAvIDIpICsgXCJweFwiO1xuXHR9XG5cdGRpdi5zdHlsZS5vcGFjaXR5ID0gb3B0aW9ucy5vcGFjaXR5O1xuXG5cdC8vZGl2LnN0eWxlLmJhY2tncm91bmRJbWFnZSA9IFwidXJsKFwiK29wdGlvbnMuZmlsZStcIilcIjtcblx0Ly9kaXYuc3R5bGUuYmFja2dyb3VuZFBvc2l0aW9uLnggPSBvcHRpb25zLnhwb3MrXCIlXCI7XG5cdC8vZGl2LnN0eWxlLmJhY2tncm91bmRQb3NpdGlvbi55ID0gb3B0aW9ucy55cG9zK1wiJVwiO1xuXHQvL2Rpdi5zdHlsZS5iYWNrZ3JvdW5kUmVwZWF0ID0gb3B0aW9ucy54cmVwZWF0O1xuXHQvL2Rpdi5zdHlsZS5vcGFjaXR5ID0gKG9wdGlvbnMub3BhY2l0eS8xMDApO1xuXG5cdC8vaWYgdXNlciB3YW50cyB3YXRlcm1hcmsgdG8gYmUgY2xpY2thYmxlLCBhZGQgYW5jaG9yIGVsZW1cblx0Ly90b2RvOiBjaGVjayBpZiBvcHRpb25zLnVybCBpcyBhbiBhY3R1YWwgdXJsP1xuXHRpZiAob3B0aW9ucy5jbGlja2FibGUgJiYgb3B0aW9ucy51cmwgIT09IFwiXCIpIHtcblx0XHRsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIik7XG5cdFx0bGluay5ocmVmID0gb3B0aW9ucy51cmw7XG5cdFx0bGluay50YXJnZXQgPSBcIl9ibGFua1wiO1xuXHRcdGxpbmsuYXBwZW5kQ2hpbGQoZGl2KTtcblx0XHQvL2FkZCBjbGlja2FibGUgd2F0ZXJtYXJrIHRvIHRoZSBwbGF5ZXJcblx0XHRwbGF5ZXIuYXBwZW5kQ2hpbGQobGluayk7XG5cdH0gZWxzZSB7XG5cdFx0Ly9hZGQgbm9ybWFsIHdhdGVybWFyayB0byB0aGUgcGxheWVyXG5cdFx0cGxheWVyLmFwcGVuZENoaWxkKGRpdik7XG5cdH1cblxuXHRpZiAob3B0aW9ucy5kZWJ1ZykgY29uc29sZS5sb2coJ3dhdGVybWFyazogUmVnaXN0ZXIgZW5kJyk7XG59O1xuXG4vLyAvKipcbi8vICAqIOaIquWbvlxuLy8gICogQHBhcmFtIHtbdHlwZV19IG9wdGlvbnMgW2Rlc2NyaXB0aW9uXVxuLy8gICogcmV0dXJuIHtbdHlwZV19ICBbZGVzY3JpcHRpb25dXG4vLyAgKi9cbi8vIGNvbnN0IHNuYXBzaG90ID0gZnVuY3Rpb24ob3B0aW9ucykge1xuLy8gLy8gXHRcInVzZSBzdHJpY3RcIjtcblxuLy8gXHQvLyBnbG9iYWxzXG4vLyBcdHZhciBwbGF5ZXIgPSB0aGlzO1xuLy8gXHR2YXIgdmlkZW8gPSBwbGF5ZXIuZWwoKS5xdWVyeVNlbGVjdG9yKCd2aWRlbycpO1xuLy8gXHR2YXIgY29udGFpbmVyLCBzY2FsZTtcbi8vIFx0Ly9GSVhNRTogYWRkIHNvbWUga2luZCBvZiBhc3NlcnQgZm9yIHZpZGVvLCBpZiBmbGFzaCBpcyB1c2VkIGl0J3Mgbm90IHdvcmtpbmdcblxuLy8gXHQvL1RPRE86IGFkZCBiZXR0ZXIgcHJlZml4IGZvciBhbGwgbmV3IGNzcyBjbGFzcywgcHJvYmFibHkgdmpzLXNuYXBzaG90XG4vLyBcdC8vVE9ETzogYnJlYWsgdGhpcyBsYXJnZSBmaWxlIHVwIGludG8gc21hbGxlciBvbmVzLCBlLmcuIGNvbnRhaW5lciwgLi4uXG4vLyBcdC8vVE9ETzogbWFrZSBpdCBwb3NzaWJsZSB0byBkcmFnIGJveGVzIGFsc28gZnJvbSBib3R0b20gcmlnaHQgdG8gdG9wIGxlZnRcblxuLy8gXHRmdW5jdGlvbiB1cGRhdGVTY2FsZSgpe1xuLy8gXHRcdHZhciByZWN0ID0gdmlkZW8uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4vLyBcdFx0dmFyIHNjYWxldyA9IGNhbnZhc19kcmF3LmVsKCkud2lkdGggLyByZWN0LndpZHRoO1xuLy8gXHRcdHZhciBzY2FsZWggPSBjYW52YXNfZHJhdy5lbCgpLmhlaWdodCAvIHJlY3QuaGVpZ2h0O1xuLy8gXHRcdHNjYWxlID0gTWF0aC5tYXgoTWF0aC5tYXgoc2NhbGV3LCBzY2FsZWgpLCAxKTtcbi8vIFx0XHRzY2FsZV90eHQuZWwoKS5pbm5lckhUTUwgPSAoTWF0aC5yb3VuZCgxL3NjYWxlKjEwMCkvMTAwKSArXCJ4XCI7XG4vLyBcdH1cblxuLy8gXHQvLyB0YWtlIHNuYXBzaG90IG9mIHZpZGVvIGFuZCBzaG93IGFsbCBkcmF3aW5nIGVsZW1lbnRzXG4vLyBcdC8vIGFkZGVkIHRvIHBsYXllciBvYmplY3QgdG8gYmUgY2FsbGFibGUgZnJvbSBvdXRzaWRlLCBlLmcuIHNob3J0Y3V0XG4vLyBcdHBsYXllci5zbmFwID0gZnVuY3Rpb24oKXtcbi8vIFx0XHRwbGF5ZXIucGF1c2UoKTtcbi8vIFx0XHQvLyBsb29zZSBrZXlib2FyZCBmb2N1c1xuLy8gXHRcdHBsYXllci5lbCgpLmJsdXIoKTtcbi8vIFx0XHQvLyBzd2l0Y2ggY29udHJvbCBiYXIgdG8gZHJhd2luZyBjb250cm9sc1xuLy8gXHRcdHBsYXllci5jb250cm9sQmFyLmhpZGUoKTtcbi8vIFx0XHRkcmF3Q3RybC5zaG93KCk7XG4vLyBcdFx0Ly8gZGlzcGxheSBjYW52YXNcbi8vIFx0XHRwYXJlbnQuc2hvdygpO1xuXG4vLyBcdFx0Ly8gY2FudmFzIGZvciBkcmF3aW5nLCBpdCdzIHNlcGFyYXRlIGZyb20gc25hcHNob3QgYmVjYXVzZSBvZiBkZWxldGVcbi8vIFx0XHRjYW52YXNfZHJhdy5lbCgpLndpZHRoID0gdmlkZW8udmlkZW9XaWR0aDtcbi8vIFx0XHRjYW52YXNfZHJhdy5lbCgpLmhlaWdodCA9IHZpZGVvLnZpZGVvSGVpZ2h0O1xuLy8gXHRcdGNvbnRleHRfZHJhdy5zdHJva2VTdHlsZSA9IGNvbG9yLmVsKCkudmFsdWU7XG4vLyBcdFx0Y29udGV4dF9kcmF3LmxpbmVXaWR0aCA9IHNpemUuZWwoKS52YWx1ZSAvIDI7XG4vLyBcdFx0Y29udGV4dF9kcmF3LmxpbmVDYXAgPSBcInJvdW5kXCI7XG4vLyBcdFx0Ly8gY2FsY3VsYXRlIHNjYWxlXG4vLyBcdFx0dXBkYXRlU2NhbGUoKTtcblxuLy8gXHRcdC8vIGJhY2tncm91bmQgY2FudmFzIGNvbnRhaW5pbmcgc25hcHNob3QgZnJvbSB2aWRlb1xuLy8gXHRcdGNhbnZhc19iZy5lbCgpLndpZHRoID0gdmlkZW8udmlkZW9XaWR0aDtcbi8vIFx0XHRjYW52YXNfYmcuZWwoKS5oZWlnaHQgPSB2aWRlby52aWRlb0hlaWdodDtcbi8vIFx0XHRjb250ZXh0X2JnLmRyYXdJbWFnZSh2aWRlbywgMCwgMCk7XG5cbi8vIFx0XHQvLyBzdGlsbCBmaXQgaW50byBwbGF5ZXIgZWxlbWVudFxuLy8gXHRcdHZhciByZWN0ID0gdmlkZW8uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7IC8vIHVzZSBib3VuZGluZyByZWN0IGluc3RlYWQgb2YgcGxheWVyLndpZHRoL2hlaWdodCBiZWNhdXNlIG9mIGZ1bGxzY3JlZW5cbi8vIFx0XHRjYW52YXNfZHJhdy5lbCgpLnN0eWxlLm1heFdpZHRoICA9IHJlY3Qud2lkdGggICtcInB4XCI7XG4vLyBcdFx0Y2FudmFzX2RyYXcuZWwoKS5zdHlsZS5tYXhIZWlnaHQgPSByZWN0LmhlaWdodCArXCJweFwiO1xuLy8gXHRcdGNhbnZhc19iZy5lbCgpLnN0eWxlLm1heFdpZHRoICA9IHJlY3Qud2lkdGggICtcInB4XCI7XG4vLyBcdFx0Y2FudmFzX2JnLmVsKCkuc3R5bGUubWF4SGVpZ2h0ID0gcmVjdC5oZWlnaHQgK1wicHhcIjtcbi8vIFx0fTtcbi8vIFx0Ly8gY2FtZXJhIGljb24gb24gbm9ybWFsIHBsYXllciBjb250cm9sIGJhclxuLy8gXHR2YXIgc25hcF9idG4gPSBwbGF5ZXIuY29udHJvbEJhci5hZGRDaGlsZCgnYnV0dG9uJyk7XG4vLyBcdHNuYXBfYnRuLmFkZENsYXNzKFwidmpzLXNuYXBzaG90LWJ1dHRvblwiKTtcbi8vIFx0c25hcF9idG4uZWwoKS50aXRsZSA9IFwiVGFrZSBzbmFwc2hvdFwiO1xuLy8gXHRzbmFwX2J0bi5vbignY2xpY2snLCBwbGF5ZXIuc25hcCk7XG5cbi8vIFx0Ly8gZHJhd2luZyBjb250cm9sc1xuXG4vLyBcdC8vIGFkZCBjYW52YXMgcGFyZW50IGNvbnRhaW5lciBiZWZvcmUgZHJhdyBjb250cm9sIGJhciwgc28gYmFyIGdldHMgb24gdG9wXG4vLyBcdHZhciBwYXJlbnQgPSBwbGF5ZXIuYWRkQ2hpbGQoXG4vLyBcdFx0bmV3IHZpZGVvanMuQ29tcG9uZW50KHBsYXllciwge1xuLy8gXHRcdFx0ZWw6IHZpZGVvanMuQ29tcG9uZW50LnByb3RvdHlwZS5jcmVhdGVFbChudWxsLCB7XG4vLyBcdFx0XHRcdGNsYXNzTmFtZTogJ3Zqcy1jYW52YXMtcGFyZW50JyAvKlRPRE8qL1xuLy8gXHRcdFx0fSksXG4vLyBcdFx0fSlcbi8vIFx0KTtcblxuLy8gXHQvL2RyYXcgY29udHJvbCBiYXJcbi8vIFx0dmFyIGRyYXdDdHJsID0gcGxheWVyLmFkZENoaWxkKFxuLy8gXHRcdG5ldyB2aWRlb2pzLkNvbXBvbmVudChwbGF5ZXIsIHtcbi8vIFx0XHRcdGVsOiB2aWRlb2pzLkNvbXBvbmVudC5wcm90b3R5cGUuY3JlYXRlRWwobnVsbCwge1xuLy8gXHRcdFx0XHRjbGFzc05hbWU6ICd2anMtY29udHJvbC1iYXIgdmpzLWRyYXdpbmctY3RybCcsXG4vLyBcdFx0XHR9KSxcbi8vIFx0XHR9KVxuLy8gXHQpO1xuLy8gXHRkcmF3Q3RybC5oaWRlKCk7XG5cbi8vIFx0Ly8gY2hvb3NlIGNvbG9yLCB1c2VkIGV2ZXJ5d2hlcmU6IHBhaW50aW5nLCBib3JkZXIgY29sb3Igb2YgY3JvcGJveCwgLi4uXG4vLyBcdHZhciBjb2xvciA9IGRyYXdDdHJsLmFkZENoaWxkKFxuLy8gXHRcdG5ldyB2aWRlb2pzLkNvbXBvbmVudChwbGF5ZXIsIHtcbi8vIFx0XHRcdGVsOiB2aWRlb2pzLkNvbXBvbmVudC5wcm90b3R5cGUuY3JlYXRlRWwoJ2lucHV0Jywge1xuLy8gXHRcdFx0XHRjbGFzc05hbWU6ICd2anMtY29udHJvbCcsIHR5cGU6ICdjb2xvcicsIHZhbHVlOiAnI2RmNGIyNicsIHRpdGxlOiAnY29sb3InXG4vLyBcdFx0XHR9KSxcbi8vIFx0XHR9KVxuLy8gXHQpO1xuLy8gXHRjb2xvci5vbignY2hhbmdlJywgZnVuY3Rpb24oZSl7XG4vLyBcdFx0Y29udGV4dF9kcmF3LnN0cm9rZVN0eWxlID0gY29sb3IuZWwoKS52YWx1ZTtcbi8vIFx0fSk7XG5cbi8vIFx0Ly8gY2hvb3NlIHNpemUsIHVzZWQgZXZlcnl3aGVyZTogbGluZSB3aWR0aCwgdGV4dCBzaXplXG4vLyBcdHZhciBzaXplID0gZHJhd0N0cmwuYWRkQ2hpbGQoXG4vLyBcdFx0bmV3IHZpZGVvanMuQ29tcG9uZW50KHBsYXllciwge1xuLy8gXHRcdFx0ZWw6IHZpZGVvanMuQ29tcG9uZW50LnByb3RvdHlwZS5jcmVhdGVFbCgnaW5wdXQnLCB7XG4vLyBcdFx0XHRcdGNsYXNzTmFtZTogJ3Zqcy1jb250cm9sJywgdHlwZTogJ251bWJlcicsIHZhbHVlOiAnMTAnLCB0aXRsZTogJ2xpbmUgd2lkdGgsIHRleHQgc2l6ZSwgLi4uJ1xuLy8gXHRcdFx0fSksXG4vLyBcdFx0fSlcbi8vIFx0KTtcbi8vIFx0c2l6ZS5vbigna2V5ZG93bicsIGZ1bmN0aW9uKGUpeyAvLyBkb24ndCBmaXJlIHBsYXllciBzaG9ydGN1dHMgd2hlbiBzaXplIGlucHV0IGhhcyBmb2N1c1xuLy8gXHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4vLyBcdH0pO1xuLy8gXHRzaXplLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbihlKXtcbi8vIFx0XHRjb250ZXh0X2RyYXcubGluZVdpZHRoID0gc2l6ZS5lbCgpLnZhbHVlIC8gMjtcbi8vIFx0fSk7XG5cbi8vIFx0dmFyIHRvb2wgPSAnYnJ1c2gnO1xuLy8gXHRmdW5jdGlvbiB0b29sQ2hhbmdlKGV2ZW50KXtcbi8vIFx0XHR2YXIgYWN0aXZlX3Rvb2wgPSBkcmF3Q3RybC5lbCgpLnF1ZXJ5U2VsZWN0b3IoJy52anMtdG9vbC1hY3RpdmUnKTtcbi8vIFx0XHRhY3RpdmVfdG9vbC5jbGFzc0xpc3QucmVtb3ZlKCd2anMtdG9vbC1hY3RpdmUnKTtcbi8vIFx0XHRldmVudC50YXJnZXQuY2xhc3NMaXN0LmFkZCgndmpzLXRvb2wtYWN0aXZlJyk7XG4vLyBcdFx0dG9vbCA9IGV2ZW50LnRhcmdldC5kYXRhc2V0LnZhbHVlO1xuLy8gXHRcdC8vIGFsd2F5cyBoaWRlIGNyb3Bib3gsIHRleHRib3ggaXMgaGlkZGVuIGF1dG9tYXRpY2FsbHkgYXMgaXQgYmx1cnNcbi8vIFx0XHRjcm9wYm94LmhpZGUoKTtcbi8vIFx0fVxuLy8gXHR2aWRlb2pzLlRvb2xCdXR0b24gPSB2aWRlb2pzLkJ1dHRvbi5leHRlbmQoe1xuLy8gXHRcdGluaXQ6IGZ1bmN0aW9uKHAsIG9wdGlvbnMpIHtcbi8vIFx0XHRcdHZpZGVvanMuQnV0dG9uLmNhbGwodGhpcywgcCwgb3B0aW9ucyk7XG5cbi8vIFx0XHRcdHRoaXMuYWRkQ2xhc3MoXCJ2anMtZHJhd2luZy1cIisgb3B0aW9ucy50b29sKTtcbi8vIFx0XHRcdHRoaXMuZWwoKS5kYXRhc2V0LnZhbHVlID0gb3B0aW9ucy50b29sO1xuLy8gXHRcdFx0dGhpcy5lbCgpLnRpdGxlID0gb3B0aW9ucy50aXRsZTtcblxuLy8gXHRcdFx0dGhpcy5vbignY2xpY2snLCB0b29sQ2hhbmdlKTtcbi8vIFx0XHR9XG4vLyBcdH0pO1xuLy8gXHR2YXIgYnJ1c2ggID0gZHJhd0N0cmwuYWRkQ2hpbGQobmV3IHZpZGVvanMuVG9vbEJ1dHRvbihwbGF5ZXIsIHt0b29sOiBcImJydXNoXCIsIHRpdGxlOiBcImZyZWVoYW5kIGRyYXdpbmdcIn0pKTtcbi8vIFx0YnJ1c2guYWRkQ2xhc3MoXCJ2anMtdG9vbC1hY3RpdmVcIik7XG4vLyBcdHZhciByZWN0ICAgPSBkcmF3Q3RybC5hZGRDaGlsZChuZXcgdmlkZW9qcy5Ub29sQnV0dG9uKHBsYXllciwge3Rvb2w6IFwicmVjdFwiLCAgdGl0bGU6IFwiZHJhdyByZWN0YW5nbGUgZnJvbSB0b3AgbGVmdCB0byBib3R0b20gcmlnaHRcIn0pKTtcbi8vIFx0dmFyIGNyb3AgICA9IGRyYXdDdHJsLmFkZENoaWxkKG5ldyB2aWRlb2pzLlRvb2xCdXR0b24ocGxheWVyLCB7dG9vbDogXCJjcm9wXCIsICB0aXRsZTogXCJzZWxlY3QgYXJlYSBhbmQgY2xpY2sgc2VsZWN0aW9uIHRvIGNyb3BcIn0pKTtcbi8vIFx0dmFyIHRleHQgICA9IGRyYXdDdHJsLmFkZENoaWxkKG5ldyB2aWRlb2pzLlRvb2xCdXR0b24ocGxheWVyLCB7dG9vbDogXCJ0ZXh0XCIsICB0aXRsZTogXCJzZWxlY3QgYXJlYSwgdHlwZSBtZXNzYWdlIGFuZCB0aGVuIGNsaWNrIHNvbWV3aGVyZSBlbHNlXCJ9KSk7XG4vLyBcdHZhciBlcmFzZXIgPSBkcmF3Q3RybC5hZGRDaGlsZChuZXcgdmlkZW9qcy5Ub29sQnV0dG9uKHBsYXllciwge3Rvb2w6IFwiZXJhc2VyXCIsdGl0bGU6IFwiZXJhc2UgZHJhd2luZyBpbiBjbGlja2VkIGxvY2F0aW9uXCJ9KSk7XG5cbi8vIFx0dmFyIHNjYWxlciA9IGRyYXdDdHJsLmFkZENoaWxkKFxuLy8gXHRcdG5ldyB2aWRlb2pzLkNvbXBvbmVudChwbGF5ZXIsIHtcbi8vIFx0XHRcdGVsOiB2aWRlb2pzLkNvbXBvbmVudC5wcm90b3R5cGUuY3JlYXRlRWwobnVsbCwge1xuLy8gXHRcdFx0XHRjbGFzc05hbWU6ICd2anMtY29udHJvbCB2anMtZHJhd2luZy1zY2FsZXInLCB0aXRsZTogJ3NjYWxlIGltYWdlJ1xuLy8gXHRcdFx0fSlcbi8vIFx0XHR9KVxuLy8gXHQpO1xuLy8gXHRzY2FsZXIub24oJ2NsaWNrJywgZnVuY3Rpb24oZSl7XG4vLyBcdFx0dmFyIHcgPSBjYW52YXNfZHJhdy5lbCgpLndpZHRoLCBoID0gY2FudmFzX2RyYXcuZWwoKS5oZWlnaHQ7XG4vLyBcdFx0dmFyIHNjYWxldyA9IHdpbmRvdy5wcm9tcHQoXCJDdXJyZW50IGltYWdlIHNpemUgaXMgXCIrdytcInhcIitoK1wiIC4gTmV3IHdpZHRoP1wiLCB3KTtcbi8vIFx0XHRzY2FsZXcgPSBwYXJzZUludChzY2FsZXcsIDEwKTtcbi8vIFx0XHRpZighaXNOYU4oc2NhbGV3KSl7XG4vLyBcdFx0XHR2YXIgZmFjdG9yID0gc2NhbGV3IC8gdztcbi8vIFx0XHRcdHZhciB3aWR0aCAgPSBmYWN0b3IgKiB3IHwwO1xuLy8gXHRcdFx0dmFyIGhlaWdodCA9IGZhY3RvciAqIGggfDA7XG5cbi8vIFx0XHRcdHZhciByID0gc2NhbGVDcm9wQ2FudmFzKDAsIDAsIHcsIGgsIHdpZHRoLCBoZWlnaHQsIGNhbnZhc19iZywgY29udGV4dF9iZyk7XG4vLyBcdFx0XHRjYW52YXNfYmcgPSByWzBdOyBjb250ZXh0X2JnID0gclsxXTtcbi8vIFx0XHRcdHIgPSBzY2FsZUNyb3BDYW52YXMoMCwgMCwgdywgaCwgd2lkdGgsIGhlaWdodCwgY2FudmFzX2RyYXcsIGNvbnRleHRfZHJhdyk7XG4vLyBcdFx0XHRjYW52YXNfZHJhdyA9IHJbMF07IGNvbnRleHRfZHJhdyA9IHJbMV07XG4vLyBcdFx0XHR1cGRhdGVTY2FsZSgpO1xuLy8gXHRcdH1cbi8vIFx0XHQvLyBqdXN0IGlnbm9yZVxuLy8gXHR9KTtcblxuLy8gXHRmdW5jdGlvbiBjb21iaW5lRHJhd2luZyhlbmNvZGluZyl7XG4vLyBcdFx0Ly9ibGl0IGNhbnZhcyBhbmQgb3BlbiBuZXcgdGFiIHdpdGggaW1hZ2Vcbi8vIFx0XHR2YXIgY2FudmFzX3RtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuLy8gXHRcdGNhbnZhc190bXAud2lkdGggPSBjYW52YXNfZHJhdy5lbCgpLndpZHRoO1xuLy8gXHRcdGNhbnZhc190bXAuaGVpZ2h0ID0gY2FudmFzX2RyYXcuZWwoKS5oZWlnaHQ7XG4vLyBcdFx0dmFyIGN0eF90bXAgPSBjYW52YXNfdG1wLmdldENvbnRleHQoXCIyZFwiKTtcbi8vIFx0XHRjdHhfdG1wLmRyYXdJbWFnZShjYW52YXNfYmcuZWwoKSwgMCwgMCk7XG4vLyBcdFx0Y3R4X3RtcC5kcmF3SW1hZ2UoY2FudmFzX2RyYXcuZWwoKSwgMCwgMCk7XG4vLyBcdFx0d2luZG93Lm9wZW4oY2FudmFzX3RtcC50b0RhdGFVUkwoZW5jb2RpbmcpKTtcbi8vIFx0fVxuXG4vLyBcdHZhciBkbGpwZWcgPSBkcmF3Q3RybC5hZGRDaGlsZChcbi8vIFx0XHRuZXcgdmlkZW9qcy5Db21wb25lbnQocGxheWVyLCB7XG4vLyBcdFx0XHRlbDogdmlkZW9qcy5Db21wb25lbnQucHJvdG90eXBlLmNyZWF0ZUVsKG51bGwsIHtcbi8vIFx0XHRcdFx0Y2xhc3NOYW1lOiAndmpzLWNvbnRyb2wgdmpzLWJ1dHRvbicsIGlubmVySFRNTDogJ0pQRUcnLCB0aXRsZTogJ29wZW4gbmV3IHRhYiB3aXRoIGpwZWcgaW1hZ2UnXG4vLyBcdFx0XHR9KSxcbi8vIFx0XHR9KVxuLy8gXHQpO1xuLy8gXHRkbGpwZWcub24oJ2NsaWNrJywgZnVuY3Rpb24oKXsgY29tYmluZURyYXdpbmcoXCJpbWFnZS9qcGVnXCIpOyB9KTtcbi8vIFx0dmFyIGRscG5nID0gZHJhd0N0cmwuYWRkQ2hpbGQoXG4vLyBcdFx0bmV3IHZpZGVvanMuQ29tcG9uZW50KHBsYXllciwge1xuLy8gXHRcdFx0ZWw6IHZpZGVvanMuQ29tcG9uZW50LnByb3RvdHlwZS5jcmVhdGVFbChudWxsLCB7XG4vLyBcdFx0XHRcdGNsYXNzTmFtZTogJ3Zqcy1jb250cm9sIHZqcy1idXR0b24nLCBpbm5lckhUTUw6ICdQTkcnLCB0aXRsZTogJ29wZW4gbmV3IHRhYiB3aXRoIHBuZyBpbWFnZSdcbi8vIFx0XHRcdH0pLFxuLy8gXHRcdH0pXG4vLyBcdCk7XG4vLyBcdGRscG5nLm9uKCdjbGljaycsIGZ1bmN0aW9uKCl7IGNvbWJpbmVEcmF3aW5nKFwiaW1hZ2UvcG5nXCIpOyB9KTtcblxuLy8gXHQvLyBjbG9zZSBidXR0b24gbGVhZGluZyBiYWNrIHRvIG5vcm1hbCB2aWRlbyBwbGF5IGJhY2tcbi8vIFx0dmFyIGNsb3NlID0gZHJhd0N0cmwuYWRkQ2hpbGQoJ2J1dHRvbicpO1xuLy8gXHRjbG9zZS5hZGRDbGFzcyhcInZqcy1kcmF3aW5nLWNsb3NlXCIpO1xuLy8gXHRjbG9zZS5lbCgpLnRpdGxlID0gXCJjbG9zZSBzY3JlZW5zaG90IGFuZCByZXR1cm4gdG8gdmlkZW9cIjtcbi8vIFx0Y2xvc2Uub24oJ2NsaWNrJywgZnVuY3Rpb24oKXtcbi8vIFx0XHQvLyBoaWRlIGNyb3Bib3hcbi8vIFx0XHRjcm9wYm94LmhpZGUoKTtcbi8vIFx0XHQvLyBoaWRlIGFsbCBjYW52YXMgc3R1ZmZcbi8vIFx0XHRwYXJlbnQuaGlkZSgpO1xuLy8gXHRcdC8vIHN3aXRjaCBiYWNrIHRvIG5vcm1hbCBwbGF5ZXIgY29udHJvbHNcbi8vIFx0XHRkcmF3Q3RybC5oaWRlKCk7XG4vLyBcdFx0cGxheWVyLmNvbnRyb2xCYXIuc2hvdygpO1xuLy8gXHRcdHBsYXllci5lbCgpLmZvY3VzKCk7XG4vLyBcdH0pO1xuXG4vLyBcdC8vIHNjYWxlIGRpc3BsYXlcbi8vIFx0dmFyIHNjYWxlX3R4dCA9IGRyYXdDdHJsLmFkZENoaWxkKFxuLy8gXHRcdG5ldyB2aWRlb2pzLkNvbXBvbmVudChwbGF5ZXIsIHtcbi8vIFx0XHRcdGVsOiB2aWRlb2pzLkNvbXBvbmVudC5wcm90b3R5cGUuY3JlYXRlRWwobnVsbCwge1xuLy8gXHRcdFx0XHRjbGFzc05hbWU6ICd2anMtc2NhbGUnLCBpbm5lckhUTUw6ICcxJywgdGl0bGU6ICdzY2FsZSBmYWN0b3InXG4vLyBcdFx0XHR9KSxcbi8vIFx0XHR9KVxuLy8gXHQpO1xuXG4vLyBcdC8vIGNhbnZhcyBzdHVmZlxuLy8gXHRjb250YWluZXIgPSBwYXJlbnQuYWRkQ2hpbGQoXG4vLyBcdFx0bmV3IHZpZGVvanMuQ29tcG9uZW50KHBsYXllciwge1xuLy8gXHRcdFx0ZWw6IHZpZGVvanMuQ29tcG9uZW50LnByb3RvdHlwZS5jcmVhdGVFbChudWxsLCB7XG4vLyBcdFx0XHRcdGNsYXNzTmFtZTogJ3Zqcy1jYW52YXMtY29udGFpbmVyJyAvKlRPRE8qL1xuLy8gXHRcdFx0fSksXG4vLyBcdFx0fSlcbi8vIFx0KTtcbi8vIFx0dmFyIGNhbnZhc19iZyA9IGNvbnRhaW5lci5hZGRDaGlsZCggLy9GSVhNRTogaXQncyBxdWl0ZSBzaWxseSB0byB1c2UgYSBjb21wb25lbnQgaGVyZVxuLy8gXHRcdG5ldyB2aWRlb2pzLkNvbXBvbmVudChwbGF5ZXIsIHtcbi8vIFx0XHRcdGVsOiB2aWRlb2pzLkNvbXBvbmVudC5wcm90b3R5cGUuY3JlYXRlRWwoJ2NhbnZhcycsIHtcbi8vIFx0XHRcdH0pLFxuLy8gXHRcdH0pXG4vLyBcdCk7XG4vLyBcdHZhciBjb250ZXh0X2JnID0gY2FudmFzX2JnLmVsKCkuZ2V0Q29udGV4dChcIjJkXCIpO1xuLy8gXHR2YXIgY2FudmFzX2RyYXcgPSBjb250YWluZXIuYWRkQ2hpbGQoXG4vLyBcdFx0bmV3IHZpZGVvanMuQ29tcG9uZW50KHBsYXllciwge1xuLy8gXHRcdFx0ZWw6IHZpZGVvanMuQ29tcG9uZW50LnByb3RvdHlwZS5jcmVhdGVFbCgnY2FudmFzJywge1xuLy8gXHRcdFx0fSksXG4vLyBcdFx0fSlcbi8vIFx0KTtcbi8vIFx0dmFyIGNvbnRleHRfZHJhdyA9IGNhbnZhc19kcmF3LmVsKCkuZ2V0Q29udGV4dChcIjJkXCIpO1xuLy8gXHR2YXIgY2FudmFzX3JlY3QgPSBjb250YWluZXIuYWRkQ2hpbGQoXG4vLyBcdFx0bmV3IHZpZGVvanMuQ29tcG9uZW50KHBsYXllciwge1xuLy8gXHRcdFx0ZWw6IHZpZGVvanMuQ29tcG9uZW50LnByb3RvdHlwZS5jcmVhdGVFbCgnY2FudmFzJywge1xuLy8gXHRcdFx0fSksXG4vLyBcdFx0fSlcbi8vIFx0KTtcbi8vIFx0Y2FudmFzX3JlY3QuZWwoKS5zdHlsZS56SW5kZXggPSBcIjFcIjsgLy8gYWx3YXlzIG9uIHRvcCBvZiBvdGhlciBjYW52YXMgZWxlbWVudHNcbi8vIFx0dmFyIGNvbnRleHRfcmVjdCA9IGNhbnZhc19yZWN0LmVsKCkuZ2V0Q29udGV4dChcIjJkXCIpO1xuLy8gXHR2YXIgY3JvcGJveCA9IGNvbnRhaW5lci5hZGRDaGlsZChcbi8vIFx0XHRuZXcgdmlkZW9qcy5Db21wb25lbnQocGxheWVyLCB7XG4vLyBcdFx0XHRlbDogdmlkZW9qcy5Db21wb25lbnQucHJvdG90eXBlLmNyZWF0ZUVsKCdkaXYnLCB7XG4vLyBcdFx0XHRcdGlubmVySFRNTDogXCJjcm9wXCJcbi8vIFx0XHRcdH0pLFxuLy8gXHRcdH0pXG4vLyBcdCk7XG4vLyBcdGNyb3Bib3guZWwoKS5zdHlsZS5kaXNwbGF5ID0gXCJmbGV4XCI7XG4vLyBcdC8vIGNyb3AgaGFuZGxpbmcsIGNyZWF0ZSBuZXcgY2FudmFzIGFuZCByZXBsYWNlIG9sZCBvbmVcbi8vIFx0ZnVuY3Rpb24gc2NhbGVDcm9wQ2FudmFzKGxlZnQsIHRvcCwgd2lkdGgsIGhlaWdodCwgbmV3d2lkdGgsIG5ld2hlaWdodCwgY2FudmFzLCBjb250ZXh0KXtcbi8vIC8vIFx0XHR2YXIgbmV3Y2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4vLyBcdFx0dmFyIG5ld2NhbnZhcyA9IG5ldyB2aWRlb2pzLkNvbXBvbmVudChwbGF5ZXIsIHsgLy8gRklYTUU6IHRoYXQncyBxdWl0ZSBzaWxseVxuLy8gXHRcdFx0ZWw6IHZpZGVvanMuQ29tcG9uZW50LnByb3RvdHlwZS5jcmVhdGVFbCgnY2FudmFzJywge1xuLy8gXHRcdFx0fSksXG4vLyBcdFx0fSk7XG4vLyBcdFx0dmFyIHJlY3QgPSBwbGF5ZXIuZWwoKS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbi8vIFx0XHRuZXdjYW52YXMuZWwoKS5zdHlsZS5tYXhXaWR0aCAgPSByZWN0LndpZHRoICArXCJweFwiO1xuLy8gXHRcdG5ld2NhbnZhcy5lbCgpLnN0eWxlLm1heEhlaWdodCA9IHJlY3QuaGVpZ2h0ICtcInB4XCI7XG5cbi8vIFx0XHRuZXdjYW52YXMuZWwoKS53aWR0aCA9IG5ld3dpZHRoO1xuLy8gXHRcdG5ld2NhbnZhcy5lbCgpLmhlaWdodCA9IG5ld2hlaWdodDtcblxuLy8gXHRcdHZhciBjdHggPSBuZXdjYW52YXMuZWwoKS5nZXRDb250ZXh0KFwiMmRcIik7XG4vLyBcdFx0Y3R4LmRyYXdJbWFnZShjYW52YXMuZWwoKSxcbi8vIFx0XHRcdGxlZnQsIHRvcCwgd2lkdGgsIGhlaWdodCxcbi8vIFx0XHRcdDAsIDAsIG5ld3dpZHRoLCBuZXdoZWlnaHRcbi8vIFx0XHQpO1xuXG4vLyAvLyBcdFx0Y29udGFpbmVyLnJlcGxhY2VDaGlsZChuZXdjYW52YXMsIGNhbnZhcyk7XG4vLyBcdFx0Y29udGFpbmVyLnJlbW92ZUNoaWxkKGNhbnZhcyk7XG4vLyBcdFx0Y29udGFpbmVyLmFkZENoaWxkKG5ld2NhbnZhcyk7XG4vLyAvLyBcdFx0Y2FudmFzID0gbmV3Y2FudmFzO1xuLy8gXHRcdGN0eC5saW5lQ2FwID0gY29udGV4dC5saW5lQ2FwOyAvLyB0cmFuc2ZlciBjb250ZXh0IHN0YXRlc1xuLy8gXHRcdGN0eC5zdHJva2VTdHlsZSA9IGNvbnRleHQuc3Ryb2tlU3R5bGU7XG4vLyBcdFx0Y3R4LmxpbmVXaWR0aCA9IGNvbnRleHQubGluZVdpZHRoO1xuLy8gLy8gXHRcdGNvbnRleHQgPSBjdHg7XG4vLyBcdFx0Ly8gamF2YXNjcmlwdCBoYXMgbm8gcGFzcy1ieS1yZWZlcmVuY2UgLT4gZG8gc3R1cGlkIHN0dWZmXG4vLyBcdFx0cmV0dXJuIFtuZXdjYW52YXMsIGN0eF07XG4vLyBcdH1cbi8vIFx0Y3JvcGJveC5vbignbW91c2Vkb3duJywgZnVuY3Rpb24oZSl7XG4vLyBcdFx0dmFyIGxlZnQgICA9IHNjYWxlICogY3JvcGJveC5lbCgpLm9mZnNldExlZnQgIHwwO1xuLy8gXHRcdHZhciB0b3AgICAgPSBzY2FsZSAqIGNyb3Bib3guZWwoKS5vZmZzZXRUb3AgICB8MDtcbi8vIFx0XHR2YXIgd2lkdGggID0gc2NhbGUgKiBjcm9wYm94LmVsKCkub2Zmc2V0V2lkdGggfDA7XG4vLyBcdFx0dmFyIGhlaWdodCA9IHNjYWxlICogY3JvcGJveC5lbCgpLm9mZnNldEhlaWdodHwwO1xuLy8gXHRcdHZhciByID0gc2NhbGVDcm9wQ2FudmFzKGxlZnQsIHRvcCwgd2lkdGgsIGhlaWdodCwgd2lkdGgsIGhlaWdodCwgY2FudmFzX2JnLCBjb250ZXh0X2JnKTtcbi8vIFx0XHRjYW52YXNfYmcgPSByWzBdOyBjb250ZXh0X2JnID0gclsxXTtcbi8vIFx0XHRyID0gc2NhbGVDcm9wQ2FudmFzKGxlZnQsIHRvcCwgd2lkdGgsIGhlaWdodCwgd2lkdGgsIGhlaWdodCwgY2FudmFzX2RyYXcsIGNvbnRleHRfZHJhdyk7XG4vLyBcdFx0Y2FudmFzX2RyYXcgPSByWzBdOyBjb250ZXh0X2RyYXcgPSByWzFdO1xuLy8gXHRcdHVwZGF0ZVNjYWxlKCk7XG5cbi8vIFx0XHRjcm9wYm94LmhpZGUoKTtcbi8vIFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpOyAvL290aGVyd2lzZSBjYW52YXMgYmVsb3cgZ2V0cyBtb3VzZWRvd25cbi8vIFx0fSk7XG5cbi8vIFx0dmFyIHRleHRib3ggPSBjb250YWluZXIuYWRkQ2hpbGQoXG4vLyBcdFx0bmV3IHZpZGVvanMuQ29tcG9uZW50KHBsYXllciwge1xuLy8gXHRcdFx0ZWw6IHZpZGVvanMuQ29tcG9uZW50LnByb3RvdHlwZS5jcmVhdGVFbCgndGV4dGFyZWEnLCB7XG4vLyBcdFx0XHR9KSxcbi8vIFx0XHR9KVxuLy8gXHQpO1xuLy8gXHR0ZXh0Ym94Lm9uKCdrZXlkb3duJywgZnVuY3Rpb24oZSl7IC8vIGRvbid0IGZpcmUgcGxheWVyIHNob3J0Y3V0cyB3aGVuIHRleHRib3ggaGFzIGZvY3VzXG4vLyBcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcbi8vIFx0fSk7XG4vLyBcdC8vIGRyYXcgdGV4dCB3aGVuIHRleHRib3ggbG9vc2VzIGZvY3VzXG4vLyBcdHRleHRib3gub24oJ2JsdXInLCBmdW5jdGlvbihlKXtcbi8vIFx0XHRjb250ZXh0X2RyYXcuZmlsbFN0eWxlID0gY29sb3IuZWwoKS52YWx1ZTtcbi8vIFx0XHRjb250ZXh0X2RyYXcuZm9udCA9IChzY2FsZSAqIHNpemUuZWwoKS52YWx1ZSoyKSArXCJweCBzYW5zLXNlcmlmXCI7XG4vLyBcdFx0Y29udGV4dF9kcmF3LnRleHRCYXNlbGluZSA9IFwidG9wXCI7XG4vLyBcdFx0Y29udGV4dF9kcmF3LmZpbGxUZXh0KHRleHRib3guZWwoKS52YWx1ZSxcbi8vIFx0XHRcdFx0c2NhbGUqdGV4dGJveC5lbCgpLm9mZnNldExlZnQgKyBzY2FsZSxcbi8vIFx0XHRcdFx0c2NhbGUqdGV4dGJveC5lbCgpLm9mZnNldFRvcCArIHNjYWxlKTsgLy8rMSBmb3IgYm9yZGVyP1xuLy8gXHRcdC8vRklYTUU6IHRoZXJlJ3Mgc3RpbGwgYSBtaW5vciBzaGlmdCB3aGVuIHNjYWxlIGlzbid0IDEsIGluIGZpcmVmb3ggbW9yZSBhbmQgYWxzbyB3aGVuIHNjYWxlIGlzIDFcbi8vIFx0XHR0ZXh0Ym94LmhpZGUoKTtcbi8vIFx0XHR0ZXh0Ym94LmVsKCkudmFsdWUgPSBcIlwiO1xuLy8gXHR9KTtcblxuLy8gXHRwYXJlbnQuaGlkZSgpO1xuLy8gXHRjYW52YXNfcmVjdC5oaWRlKCk7XG4vLyBcdGNyb3Bib3guaGlkZSgpO1xuLy8gXHR0ZXh0Ym94LmhpZGUoKTtcblxuLy8gXHQvLyBUT0RPOiBkcmF3IGZ1bmN0aW9uc1xuLy8gXHR2YXIgcGFpbnQgPSBmYWxzZTtcbi8vIFx0Y29udGFpbmVyLm9uKCdtb3VzZWRvd24nLCBmdW5jdGlvbihlKXtcbi8vIFx0XHRwYWludCA9IHRydWU7XG4vLyBcdFx0dmFyIHBvcyA9IGNvbnRhaW5lci5lbCgpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuLy8gXHRcdHZhciB4ID0gZS5jbGllbnRYIC0gcG9zLmxlZnQ7XG4vLyBcdFx0dmFyIHkgPSBlLmNsaWVudFkgLSBwb3MudG9wO1xuLy8gXHRcdHN3aXRjaCh0b29sKXtcbi8vIFx0XHRcdGNhc2UgXCJicnVzaFwiOlxuLy8gXHRcdFx0XHR4ICo9IHNjYWxlOyB5ICo9IHNjYWxlO1xuLy8gXHRcdFx0XHRjb250ZXh0X2RyYXcuYmVnaW5QYXRoKCk7XG4vLyBcdFx0XHRcdGNvbnRleHRfZHJhdy5tb3ZlVG8oeC0xLCB5KTtcbi8vIFx0XHRcdFx0Y29udGV4dF9kcmF3LmxpbmVUbyh4LCB5KTtcbi8vIFx0XHRcdFx0Y29udGV4dF9kcmF3LnN0cm9rZSgpO1xuLy8gXHRcdFx0XHRicmVhaztcbi8vIFx0XHRcdGNhc2UgXCJyZWN0XCI6XG4vLyBcdFx0XHRcdC8vIHJlY3RhbmdsZSBpcyBzY2FsZWQgd2hlbiBibGl0dGluZywgbm90IHdoZW4gZHJhZ2dpbmdcbi8vIFx0XHRcdFx0Y2FudmFzX3JlY3QuZWwoKS53aWR0aCA9IDA7XG4vLyBcdFx0XHRcdGNhbnZhc19yZWN0LmVsKCkuaGVpZ2h0ID0gMDtcbi8vIFx0XHRcdFx0Y2FudmFzX3JlY3QuZWwoKS5zdHlsZS5sZWZ0ID0geCArIFwicHhcIjtcbi8vIFx0XHRcdFx0Y2FudmFzX3JlY3QuZWwoKS5zdHlsZS50b3AgPSB5ICsgXCJweFwiO1xuLy8gXHRcdFx0XHRjYW52YXNfcmVjdC5zaG93KCk7XG4vLyBcdFx0XHRcdGJyZWFrO1xuLy8gXHRcdFx0Y2FzZSBcImNyb3BcIjpcbi8vIFx0XHRcdFx0Y3JvcGJveC5lbCgpLnN0eWxlLndpZHRoID0gMDtcbi8vIFx0XHRcdFx0Y3JvcGJveC5lbCgpLnN0eWxlLmhlaWdodCA9IDA7XG4vLyBcdFx0XHRcdGNyb3Bib3guZWwoKS5zdHlsZS5sZWZ0ID0geCArIFwicHhcIjtcbi8vIFx0XHRcdFx0Y3JvcGJveC5lbCgpLnN0eWxlLnRvcCA9IHkgKyBcInB4XCI7XG5cbi8vIFx0XHRcdFx0Y3JvcGJveC5lbCgpLnN0eWxlLmJvcmRlciA9IFwiMXB4IGRhc2hlZCBcIisgY29sb3IuZWwoKS52YWx1ZTtcbi8vIFx0XHRcdFx0Y3JvcGJveC5lbCgpLnN0eWxlLmNvbG9yID0gY29sb3IuZWwoKS52YWx1ZTtcbi8vIFx0XHRcdFx0Y3JvcGJveC5zaG93KCk7XG4vLyBcdFx0XHRcdGJyZWFrO1xuLy8gXHRcdFx0Y2FzZSBcInRleHRcIjpcbi8vIFx0XHRcdFx0Ly8gaWYgc2hvd24gYWxyZWFkeSwgbG9vc2UgZm9jdXMgYW5kIGRyYXcgaXQgZmlyc3QsIG90aGVyd2lzZSBpdCBnZXRzIGRyYXduIGF0IG1vdXNlZG93blxuLy8gXHRcdFx0XHRpZih0ZXh0Ym94Lmhhc0NsYXNzKFwidmpzLWhpZGRlblwiKSl7XG4vLyBcdFx0XHRcdFx0dGV4dGJveC5lbCgpLnN0eWxlLndpZHRoID0gMDtcbi8vIFx0XHRcdFx0XHR0ZXh0Ym94LmVsKCkuc3R5bGUuaGVpZ2h0ID0gMDtcbi8vIFx0XHRcdFx0XHR0ZXh0Ym94LmVsKCkuc3R5bGUubGVmdCA9IHggKyBcInB4XCI7XG4vLyBcdFx0XHRcdFx0dGV4dGJveC5lbCgpLnN0eWxlLnRvcCA9IHkgKyBcInB4XCI7XG5cbi8vIFx0XHRcdFx0XHR0ZXh0Ym94LmVsKCkuc3R5bGUuYm9yZGVyID0gXCIxcHggZGFzaGVkIFwiKyBjb2xvci5lbCgpLnZhbHVlO1xuLy8gXHRcdFx0XHRcdHRleHRib3guZWwoKS5zdHlsZS5jb2xvciA9IGNvbG9yLmVsKCkudmFsdWU7XG4vLyBcdFx0XHRcdFx0dGV4dGJveC5lbCgpLnN0eWxlLmZvbnQgPSAoc2l6ZS5lbCgpLnZhbHVlKjIpICtcInB4IHNhbnMtc2VyaWZcIjtcbi8vIFx0XHRcdFx0XHR0ZXh0Ym94LnNob3coKTtcbi8vIFx0XHRcdFx0fVxuLy8gXHRcdFx0XHRicmVhaztcbi8vIFx0XHRcdGNhc2UgXCJlcmFzZXJcIjpcbi8vIFx0XHRcdFx0dmFyIHMgPSBzaXplLmVsKCkudmFsdWU7XG4vLyBcdFx0XHRcdGNvbnRleHRfZHJhdy5jbGVhclJlY3Qoc2NhbGUqeCAtIHMvMiwgc2NhbGUqeSAtIHMvMiwgcywgcyk7XG4vLyBcdFx0XHRcdGJyZWFrO1xuLy8gXHRcdH1cbi8vIC8vIFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG4vLyBcdH0pO1xuLy8gXHRjb250YWluZXIub24oJ21vdXNlbW92ZScsIGZ1bmN0aW9uKGUpe1xuLy8gXHRcdGlmKHBhaW50KXtcbi8vIFx0XHRcdHZhciBwb3MgPSBjb250YWluZXIuZWwoKS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbi8vIFx0XHRcdHZhciB4ID0gZS5jbGllbnRYIC0gcG9zLmxlZnQ7XG4vLyBcdFx0XHR2YXIgeSA9IGUuY2xpZW50WSAtIHBvcy50b3A7XG4vLyBcdFx0XHRzd2l0Y2godG9vbCl7XG4vLyBcdFx0XHRcdGNhc2UgXCJicnVzaFwiOlxuLy8gXHRcdFx0XHRcdGNvbnRleHRfZHJhdy5saW5lVG8oc2NhbGUgKiB4LCBzY2FsZSAqIHkpO1xuLy8gXHRcdFx0XHRcdGNvbnRleHRfZHJhdy5zdHJva2UoKTtcbi8vIFx0XHRcdFx0XHRicmVhaztcbi8vIFx0XHRcdFx0Y2FzZSBcInJlY3RcIjpcbi8vIFx0XHRcdFx0XHRjb250ZXh0X3JlY3QuY2xlYXJSZWN0KDAsIDAsIGNvbnRleHRfcmVjdC5jYW52YXMud2lkdGgsIGNvbnRleHRfcmVjdC5jYW52YXMuaGVpZ2h0KTtcbi8vIFx0XHRcdFx0XHQvLyB0aGlzIHdheSBpdCdzIG9ubHkgcG9zc2libGUgdG8gZHJhZyB0byB0aGUgcmlnaHQgYW5kIGRvd24sIG1vdXNlZG93biBzZXRzIHRvcCBsZWZ0XG4vLyBcdFx0XHRcdFx0Y2FudmFzX3JlY3QuZWwoKS53aWR0aCA9IHggLSBjYW52YXNfcmVjdC5lbCgpLm9mZnNldExlZnQ7IC8vIHJlc2l6ZSBjYW52YXNcbi8vIFx0XHRcdFx0XHRjYW52YXNfcmVjdC5lbCgpLmhlaWdodCA9IHkgLSBjYW52YXNfcmVjdC5lbCgpLm9mZnNldFRvcDtcbi8vIFx0XHRcdFx0XHRjb250ZXh0X3JlY3Quc3Ryb2tlU3R5bGUgPSBjb2xvci5lbCgpLnZhbHVlOyAvL2xvb2tzIGxpa2UgaXRzIHJlc2V0IHdoZW4gcmVzaXppbmcgY2FudmFzXG4vLyBcdFx0XHRcdFx0Y29udGV4dF9yZWN0LmxpbmVXaWR0aCA9IHNpemUuZWwoKS52YWx1ZSAvIHNjYWxlOyAvLyBzY2FsZSBsaW5lV2lkdGhcbi8vIFx0XHRcdFx0XHRjb250ZXh0X3JlY3Quc3Ryb2tlUmVjdCgwLCAwLCBjb250ZXh0X3JlY3QuY2FudmFzLndpZHRoLCBjb250ZXh0X3JlY3QuY2FudmFzLmhlaWdodCk7XG4vLyBcdFx0XHRcdFx0YnJlYWs7XG4vLyBcdFx0XHRcdGNhc2UgXCJjcm9wXCI6XG4vLyBcdFx0XHRcdFx0Y3JvcGJveC5lbCgpLnN0eWxlLndpZHRoID0gKHggLSBjcm9wYm94LmVsKCkub2Zmc2V0TGVmdCkgK1wicHhcIjsgLy8gcmVzaXplXG4vLyBcdFx0XHRcdFx0Y3JvcGJveC5lbCgpLnN0eWxlLmhlaWdodCA9ICh5IC0gY3JvcGJveC5lbCgpLm9mZnNldFRvcCkgK1wicHhcIjtcbi8vIFx0XHRcdFx0XHRicmVhaztcbi8vIFx0XHRcdFx0Y2FzZSBcInRleHRcIjpcbi8vIFx0XHRcdFx0XHR0ZXh0Ym94LmVsKCkuc3R5bGUud2lkdGggPSAoeCAtIHRleHRib3guZWwoKS5vZmZzZXRMZWZ0KSArXCJweFwiOyAvLyByZXNpemVcbi8vIFx0XHRcdFx0XHR0ZXh0Ym94LmVsKCkuc3R5bGUuaGVpZ2h0ID0gKHkgLSB0ZXh0Ym94LmVsKCkub2Zmc2V0VG9wKSArXCJweFwiO1xuLy8gXHRcdFx0XHRcdGJyZWFrO1xuLy8gXHRcdFx0XHRjYXNlIFwiZXJhc2VyXCI6XG4vLyBcdFx0XHRcdFx0dmFyIHMgPSBzaXplLmVsKCkudmFsdWU7XG4vLyBcdFx0XHRcdFx0Y29udGV4dF9kcmF3LmNsZWFyUmVjdChzY2FsZSp4IC0gcy8yLCBzY2FsZSp5IC0gcy8yLCBzLCBzKTtcbi8vIFx0XHRcdFx0XHRicmVhaztcbi8vIFx0XHRcdH1cbi8vIFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcbi8vIFx0XHR9XG4vLyBcdH0pO1xuLy8gXHRmdW5jdGlvbiBmaW5pc2goKXtcbi8vIFx0XHRpZihwYWludCl7XG4vLyBcdFx0XHRwYWludCA9IGZhbHNlO1xuLy8gXHRcdFx0aWYodG9vbCA9PSBcInJlY3RcIil7XG4vLyBcdFx0XHRcdC8vYmxpdCBjYW52YXNfcmVjdCBvbiBjYW52YXMsIHNjYWxlZFxuLy8gXHRcdFx0XHRjb250ZXh0X2RyYXcuZHJhd0ltYWdlKGNhbnZhc19yZWN0LmVsKCksXG4vLyBcdFx0XHRcdFx0XHRzY2FsZSpjYW52YXNfcmVjdC5lbCgpLm9mZnNldExlZnQsIHNjYWxlKmNhbnZhc19yZWN0LmVsKCkub2Zmc2V0VG9wLFxuLy8gXHRcdFx0XHRcdFx0c2NhbGUqY29udGV4dF9yZWN0LmNhbnZhcy53aWR0aCwgc2NhbGUqY29udGV4dF9yZWN0LmNhbnZhcy5oZWlnaHQpO1xuLy8gXHRcdFx0XHRjYW52YXNfcmVjdC5oaWRlKCk7XG4vLyBcdFx0XHR9ZWxzZSBpZih0b29sID09IFwidGV4dFwiKXtcbi8vIFx0XHRcdFx0cGxheWVyLmVsKCkuYmx1cigpO1xuLy8gXHRcdFx0XHR0ZXh0Ym94LmVsKCkuZm9jdXMoKTtcbi8vIFx0XHRcdH1cbi8vIFx0XHR9XG4vLyBcdH1cbi8vIFx0Y29udGFpbmVyLm9uKCdtb3VzZXVwJywgZmluaXNoKTtcbi8vIFx0Y29udGFpbmVyLm9uKCdtb3VzZWxlYXZlJywgZmluaXNoKTtcbi8vIH07XG5cbi8qKlxuICog6K6w5b2VIOW9lemfsyDmiKrlsY9cbiAqIEBwYXJhbSB7W3R5cGVdfSBvcHRpb25zIFtkZXNjcmlwdGlvbl1cbiAqIHJldHVybiB7W3R5cGVdfSAgW2Rlc2NyaXB0aW9uXVxuICovXG52YXIgc25hcHNob3QgPSB7XG5cdC8qKlxuXHQgKiBSZXR1cm5zIGFuIG9iamVjdCB0aGF0IGNhcHR1cmVzIHRoZSBwb3J0aW9ucyBvZiBwbGF5ZXIgc3RhdGUgcmVsZXZhbnQgdG9cblx0ICogdmlkZW8gcGxheWJhY2suIFRoZSByZXN1bHQgb2YgdGhpcyBmdW5jdGlvbiBjYW4gYmUgcGFzc2VkIHRvXG5cdCAqIHJlc3RvcmVQbGF5ZXJTbmFwc2hvdCB3aXRoIGEgcGxheWVyIHRvIHJldHVybiB0aGUgcGxheWVyIHRvIHRoZSBzdGF0ZSBpdFxuXHQgKiB3YXMgaW4gd2hlbiB0aGlzIGZ1bmN0aW9uIHdhcyBpbnZva2VkLlxuXHQgKiBAcGFyYW0ge29iamVjdH0gcGxheWVyIFRoZSB2aWRlb2pzIHBsYXllciBvYmplY3Rcblx0ICovXG5cdGdldFBsYXllclNuYXBzaG90OiBmdW5jdGlvbihwbGF5ZXIpIHtcblxuXHRcdGxldCBjdXJyZW50VGltZTtcblxuXHRcdGlmICh2aWRlb2pzLmJyb3dzZXIuSVNfSU9TICYmIHBsYXllci5hZHMuaXNMaXZlKHBsYXllcikpIHtcblx0XHRcdC8vIFJlY29yZCBob3cgZmFyIGJlaGluZCBsaXZlIHdlIGFyZVxuXHRcdFx0aWYgKHBsYXllci5zZWVrYWJsZSgpLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0Y3VycmVudFRpbWUgPSBwbGF5ZXIuY3VycmVudFRpbWUoKSAtIHBsYXllci5zZWVrYWJsZSgpLmVuZCgwKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGN1cnJlbnRUaW1lID0gcGxheWVyLmN1cnJlbnRUaW1lKCk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGN1cnJlbnRUaW1lID0gcGxheWVyLmN1cnJlbnRUaW1lKCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdGVjaCA9IHBsYXllci4kKCcudmpzLXRlY2gnKTtcblx0XHRjb25zdCB0cmFja3MgPSBwbGF5ZXIucmVtb3RlVGV4dFRyYWNrcyA/IHBsYXllci5yZW1vdGVUZXh0VHJhY2tzKCkgOiBbXTtcblx0XHRjb25zdCBzdXBwcmVzc2VkVHJhY2tzID0gW107XG5cdFx0Y29uc3Qgc25hcHNob3QgPSB7XG5cdFx0XHRlbmRlZDogcGxheWVyLmVuZGVkKCksXG5cdFx0XHRjdXJyZW50U3JjOiBwbGF5ZXIuY3VycmVudFNyYygpLFxuXHRcdFx0c3JjOiBwbGF5ZXIuc3JjKCksXG5cdFx0XHRjdXJyZW50VGltZSxcblx0XHRcdHR5cGU6IHBsYXllci5jdXJyZW50VHlwZSgpXG5cdFx0fTtcblxuXHRcdGlmICh0ZWNoKSB7XG5cdFx0XHRzbmFwc2hvdC5uYXRpdmVQb3N0ZXIgPSB0ZWNoLnBvc3Rlcjtcblx0XHRcdHNuYXBzaG90LnN0eWxlID0gdGVjaC5nZXRBdHRyaWJ1dGUoJ3N0eWxlJyk7XG5cdFx0fVxuXG5cdFx0Zm9yIChsZXQgaSA9IHRyYWNrcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0Y29uc3QgdHJhY2sgPSB0cmFja3NbaV07XG5cblx0XHRcdHN1cHByZXNzZWRUcmFja3MucHVzaCh7XG5cdFx0XHRcdHRyYWNrLFxuXHRcdFx0XHRtb2RlOiB0cmFjay5tb2RlXG5cdFx0XHR9KTtcblx0XHRcdHRyYWNrLm1vZGUgPSAnZGlzYWJsZWQnO1xuXHRcdH1cblx0XHRzbmFwc2hvdC5zdXBwcmVzc2VkVHJhY2tzID0gc3VwcHJlc3NlZFRyYWNrcztcblxuXHRcdHJldHVybiBzbmFwc2hvdDtcblx0fSxcblxuXHQvKipcblx0ICogQXR0ZW1wdHMgdG8gbW9kaWZ5IHRoZSBzcGVjaWZpZWQgcGxheWVyIHNvIHRoYXQgaXRzIHN0YXRlIGlzIGVxdWl2YWxlbnQgdG9cblx0ICogdGhlIHN0YXRlIG9mIHRoZSBzbmFwc2hvdC5cblx0ICogQHBhcmFtIHtvYmplY3R9IHNuYXBzaG90IC0gdGhlIHBsYXllciBzdGF0ZSB0byBhcHBseVxuXHQgKi9cblx0cmVzdG9yZVBsYXllclNuYXBzaG90OiBmdW5jdGlvbihwbGF5ZXIsIHNuYXBzaG90KSB7XG5cblx0XHRpZiAocGxheWVyLmFkcy5kaXNhYmxlTmV4dFNuYXBzaG90UmVzdG9yZSA9PT0gdHJ1ZSkge1xuXHRcdFx0cGxheWVyLmFkcy5kaXNhYmxlTmV4dFNuYXBzaG90UmVzdG9yZSA9IGZhbHNlO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIFRoZSBwbGF5YmFjayB0ZWNoXG5cdFx0bGV0IHRlY2ggPSBwbGF5ZXIuJCgnLnZqcy10ZWNoJyk7XG5cblx0XHQvLyB0aGUgbnVtYmVyIG9mWyByZW1haW5pbmcgYXR0ZW1wdHMgdG8gcmVzdG9yZSB0aGUgc25hcHNob3Rcblx0XHRsZXQgYXR0ZW1wdHMgPSAyMDtcblxuXHRcdGNvbnN0IHN1cHByZXNzZWRUcmFja3MgPSBzbmFwc2hvdC5zdXBwcmVzc2VkVHJhY2tzO1xuXHRcdGxldCB0cmFja1NuYXBzaG90O1xuXHRcdGxldCByZXN0b3JlVHJhY2tzID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRmb3IgKGxldCBpID0gc3VwcHJlc3NlZFRyYWNrcy5sZW5ndGg7IGkgPiAwOyBpLS0pIHtcblx0XHRcdFx0dHJhY2tTbmFwc2hvdCA9IHN1cHByZXNzZWRUcmFja3NbaV07XG5cdFx0XHRcdHRyYWNrU25hcHNob3QudHJhY2subW9kZSA9IHRyYWNrU25hcHNob3QubW9kZTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0Ly8gZmluaXNoIHJlc3RvcmluZyB0aGUgcGxheWJhY2sgc3RhdGVcblx0XHRjb25zdCByZXN1bWUgPSBmdW5jdGlvbigpIHtcblx0XHRcdGxldCBjdXJyZW50VGltZTtcblxuXHRcdFx0aWYgKHZpZGVvanMuYnJvd3Nlci5JU19JT1MgJiYgcGxheWVyLmFkcy5pc0xpdmUocGxheWVyKSkge1xuXHRcdFx0XHRpZiAoc25hcHNob3QuY3VycmVudFRpbWUgPCAwKSB7XG5cdFx0XHRcdFx0Ly8gUGxheWJhY2sgd2FzIGJlaGluZCByZWFsIHRpbWUsIHNvIHNlZWsgYmFja3dhcmRzIHRvIG1hdGNoXG5cdFx0XHRcdFx0aWYgKHBsYXllci5zZWVrYWJsZSgpLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRcdGN1cnJlbnRUaW1lID0gcGxheWVyLnNlZWthYmxlKCkuZW5kKDApICsgc25hcHNob3QuY3VycmVudFRpbWU7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGN1cnJlbnRUaW1lID0gcGxheWVyLmN1cnJlbnRUaW1lKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHBsYXllci5jdXJyZW50VGltZShjdXJyZW50VGltZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHBsYXllci5jdXJyZW50VGltZShzbmFwc2hvdC5lbmRlZCA/IHBsYXllci5kdXJhdGlvbigpIDogc25hcHNob3QuY3VycmVudFRpbWUpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBSZXN1bWUgcGxheWJhY2sgaWYgdGhpcyB3YXNuJ3QgYSBwb3N0cm9sbFxuXHRcdFx0aWYgKCFzbmFwc2hvdC5lbmRlZCkge1xuXHRcdFx0XHRwbGF5ZXIucGxheSgpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQvLyBkZXRlcm1pbmUgaWYgdGhlIHZpZGVvIGVsZW1lbnQgaGFzIGxvYWRlZCBlbm91Z2ggb2YgdGhlIHNuYXBzaG90IHNvdXJjZVxuXHRcdC8vIHRvIGJlIHJlYWR5IHRvIGFwcGx5IHRoZSByZXN0IG9mIHRoZSBzdGF0ZVxuXHRcdGNvbnN0IHRyeVRvUmVzdW1lID0gZnVuY3Rpb24oKSB7XG5cblx0XHRcdC8vIHRyeVRvUmVzdW1lIGNhbiBlaXRoZXIgaGF2ZSBiZWVuIGNhbGxlZCB0aHJvdWdoIHRoZSBgY29udGVudGNhbnBsYXlgXG5cdFx0XHQvLyBldmVudCBvciBmaXJlZCB0aHJvdWdoIHNldFRpbWVvdXQuXG5cdFx0XHQvLyBXaGVuIHRyeVRvUmVzdW1lIGlzIGNhbGxlZCwgd2Ugc2hvdWxkIG1ha2Ugc3VyZSB0byBjbGVhciBvdXQgdGhlIG90aGVyXG5cdFx0XHQvLyB3YXkgaXQgY291bGQndmUgYmVlbiBjYWxsZWQgYnkgcmVtb3ZpbmcgdGhlIGxpc3RlbmVyIGFuZCBjbGVhcmluZyBvdXRcblx0XHRcdC8vIHRoZSB0aW1lb3V0LlxuXHRcdFx0cGxheWVyLm9mZignY29udGVudGNhbnBsYXknLCB0cnlUb1Jlc3VtZSk7XG5cdFx0XHRpZiAocGxheWVyLmFkcy50cnlUb1Jlc3VtZVRpbWVvdXRfKSB7XG5cdFx0XHRcdHBsYXllci5jbGVhclRpbWVvdXQocGxheWVyLmFkcy50cnlUb1Jlc3VtZVRpbWVvdXRfKTtcblx0XHRcdFx0cGxheWVyLmFkcy50cnlUb1Jlc3VtZVRpbWVvdXRfID0gbnVsbDtcblx0XHRcdH1cblxuXHRcdFx0Ly8gVGVjaCBtYXkgaGF2ZSBjaGFuZ2VkIGRlcGVuZGluZyBvbiB0aGUgZGlmZmVyZW5jZXMgaW4gc291cmNlcyBvZiB0aGVcblx0XHRcdC8vIG9yaWdpbmFsIHZpZGVvIGFuZCB0aGF0IG9mIHRoZSBhZFxuXHRcdFx0dGVjaCA9IHBsYXllci5lbCgpLnF1ZXJ5U2VsZWN0b3IoJy52anMtdGVjaCcpO1xuXG5cdFx0XHRpZiAodGVjaC5yZWFkeVN0YXRlID4gMSkge1xuXHRcdFx0XHQvLyBzb21lIGJyb3dzZXJzIGFuZCBtZWRpYSBhcmVuJ3QgXCJzZWVrYWJsZVwiLlxuXHRcdFx0XHQvLyByZWFkeVN0YXRlIGdyZWF0ZXIgdGhhbiAxIGFsbG93cyBmb3Igc2Vla2luZyB3aXRob3V0IGV4Y2VwdGlvbnNcblx0XHRcdFx0cmV0dXJuIHJlc3VtZSgpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodGVjaC5zZWVrYWJsZSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdC8vIGlmIHRoZSB0ZWNoIGRvZXNuJ3QgZXhwb3NlIHRoZSBzZWVrYWJsZSB0aW1lIHJhbmdlcywgdHJ5IHRvXG5cdFx0XHRcdC8vIHJlc3VtZSBwbGF5YmFjayBpbW1lZGlhdGVseVxuXHRcdFx0XHRyZXR1cm4gcmVzdW1lKCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0ZWNoLnNlZWthYmxlLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0Ly8gaWYgc29tZSBwZXJpb2Qgb2YgdGhlIHZpZGVvIGlzIHNlZWthYmxlLCByZXN1bWUgcGxheWJhY2tcblx0XHRcdFx0cmV0dXJuIHJlc3VtZSgpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBkZWxheSBhIGJpdCBhbmQgdGhlbiBjaGVjayBhZ2FpbiB1bmxlc3Mgd2UncmUgb3V0IG9mIGF0dGVtcHRzXG5cdFx0XHRpZiAoYXR0ZW1wdHMtLSkge1xuXHRcdFx0XHR3aW5kb3cuc2V0VGltZW91dCh0cnlUb1Jlc3VtZSwgNTApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRyZXN1bWUoKTtcblx0XHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRcdHZpZGVvanMubG9nLndhcm4oJ0ZhaWxlZCB0byByZXN1bWUgdGhlIGNvbnRlbnQgYWZ0ZXIgYW4gYWR2ZXJ0aXNlbWVudCcsIGUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdGlmIChzbmFwc2hvdC5uYXRpdmVQb3N0ZXIpIHtcblx0XHRcdHRlY2gucG9zdGVyID0gc25hcHNob3QubmF0aXZlUG9zdGVyO1xuXHRcdH1cblxuXHRcdGlmICgnc3R5bGUnIGluIHNuYXBzaG90KSB7XG5cdFx0XHQvLyBvdmVyd3JpdGUgYWxsIGNzcyBzdHlsZSBwcm9wZXJ0aWVzIHRvIHJlc3RvcmUgc3RhdGUgcHJlY2lzZWx5XG5cdFx0XHR0ZWNoLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCBzbmFwc2hvdC5zdHlsZSB8fCAnJyk7XG5cdFx0fVxuXG5cdFx0Ly8gRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIHBsYXllciBuZWVkcyB0byBiZSByZXN0b3JlZCB0byBpdHMgc3RhdGVcblx0XHQvLyBiZWZvcmUgYWQgcGxheWJhY2sgYmVnYW4uIFdpdGggYSBjdXN0b20gYWQgZGlzcGxheSBvciBidXJuZWQtaW5cblx0XHQvLyBhZHMsIHRoZSBjb250ZW50IHBsYXllciBzdGF0ZSBoYXNuJ3QgYmVlbiBtb2RpZmllZCBhbmQgc28gbm9cblx0XHQvLyByZXN0b3JhdGlvbiBpcyByZXF1aXJlZFxuXG5cdFx0aWYgKHBsYXllci5hZHMudmlkZW9FbGVtZW50UmVjeWNsZWQoKSkge1xuXHRcdFx0Ly8gb24gaW9zNywgZmlkZGxpbmcgd2l0aCB0ZXh0VHJhY2tzIHRvbyBlYXJseSB3aWxsIGNhdXNlIHNhZmFyaSB0byBjcmFzaFxuXHRcdFx0cGxheWVyLm9uZSgnY29udGVudGxvYWRlZG1ldGFkYXRhJywgcmVzdG9yZVRyYWNrcyk7XG5cblx0XHRcdC8vIGlmIHRoZSBzcmMgY2hhbmdlZCBmb3IgYWQgcGxheWJhY2ssIHJlc2V0IGl0XG5cdFx0XHRwbGF5ZXIuc3JjKHtcblx0XHRcdFx0c3JjOiBzbmFwc2hvdC5jdXJyZW50U3JjLFxuXHRcdFx0XHR0eXBlOiBzbmFwc2hvdC50eXBlXG5cdFx0XHR9KTtcblx0XHRcdC8vIHNhZmFyaSByZXF1aXJlcyBhIGNhbGwgdG8gYGxvYWRgIHRvIHBpY2sgdXAgYSBjaGFuZ2VkIHNvdXJjZVxuXHRcdFx0cGxheWVyLmxvYWQoKTtcblx0XHRcdC8vIGFuZCB0aGVuIHJlc3VtZSBmcm9tIHRoZSBzbmFwc2hvdHMgdGltZSBvbmNlIHRoZSBvcmlnaW5hbCBzcmMgaGFzIGxvYWRlZFxuXHRcdFx0Ly8gaW4gc29tZSBicm93c2VycyAoZmlyZWZveCkgYGNhbnBsYXlgIG1heSBub3QgZmlyZSBjb3JyZWN0bHkuXG5cdFx0XHQvLyBSZWFjZSB0aGUgYGNhbnBsYXlgIGV2ZW50IHdpdGggYSB0aW1lb3V0LlxuXHRcdFx0cGxheWVyLm9uZSgnY29udGVudGNhbnBsYXknLCB0cnlUb1Jlc3VtZSk7XG5cdFx0XHRwbGF5ZXIuYWRzLnRyeVRvUmVzdW1lVGltZW91dF8gPSBwbGF5ZXIuc2V0VGltZW91dCh0cnlUb1Jlc3VtZSwgMjAwMCk7XG5cdFx0fSBlbHNlIGlmICghcGxheWVyLmVuZGVkKCkgfHwgIXNuYXBzaG90LmVuZGVkKSB7XG5cdFx0XHQvLyBpZiB3ZSBkaWRuJ3QgY2hhbmdlIHRoZSBzcmMsIGp1c3QgcmVzdG9yZSB0aGUgdHJhY2tzXG5cdFx0XHRyZXN0b3JlVHJhY2tzKCk7XG5cdFx0XHQvLyB0aGUgc3JjIGRpZG4ndCBjaGFuZ2UgYW5kIHRoaXMgd2Fzbid0IGEgcG9zdHJvbGxcblx0XHRcdC8vIGp1c3QgcmVzdW1lIHBsYXliYWNrIGF0IHRoZSBjdXJyZW50IHRpbWUuXG5cdFx0XHRwbGF5ZXIucGxheSgpO1xuXHRcdH1cblx0fVxufTtcblxuLy8gUmVnaXN0ZXIgdGhlIHBsdWdpbiB3aXRoIHZpZGVvLmpzLlxudmlkZW9qcy5wbHVnaW4oJ29wZW4nLCBvcGVuKTtcbnZpZGVvanMucGx1Z2luKCd2aWRlb0pzUmVzb2x1dGlvblN3aXRjaGVyJywgdmlkZW9Kc1Jlc29sdXRpb25Td2l0Y2hlcik7XG52aWRlb2pzLnBsdWdpbignZGlzYWJsZVByb2dyZXNzJywgZGlzYWJsZVByb2dyZXNzKTtcbnZpZGVvanMucGx1Z2luKCdtYXJrZXJzJywgbWFya2Vycyk7XG52aWRlb2pzLnBsdWdpbignd2F0ZXJNYXJrJywgd2F0ZXJNYXJrKTtcbnZpZGVvanMucGx1Z2luKCdzbmFwc2hvdCcsIHNuYXBzaG90KTtcblxuLy8gSW5jbHVkZSB0aGUgdmVyc2lvbiBudW1iZXIuXG5vcGVuLlZFUlNJT04gPSAnX19WRVJTSU9OX18nO1xuXG5leHBvcnQgZGVmYXVsdCBvcGVuOyJdfQ==

(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"min-document":1}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
(function (global){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _globalDocument = require('global/document');

var _globalDocument2 = _interopRequireDefault(_globalDocument);

var _qunit = (typeof window !== "undefined" ? window['QUnit'] : typeof global !== "undefined" ? global['QUnit'] : null);

var _qunit2 = _interopRequireDefault(_qunit);

var _sinon = (typeof window !== "undefined" ? window['sinon'] : typeof global !== "undefined" ? global['sinon'] : null);

var _sinon2 = _interopRequireDefault(_sinon);

var _videoJs = (typeof window !== "undefined" ? window['videojs'] : typeof global !== "undefined" ? global['videojs'] : null);

var _videoJs2 = _interopRequireDefault(_videoJs);

var _srcPlugin = require('../src/plugin');

var _srcPlugin2 = _interopRequireDefault(_srcPlugin);

var Player = _videoJs2['default'].getComponent('Player');

_qunit2['default'].test('the environment is sane', function (assert) {
  assert.strictEqual(typeof Array.isArray, 'function', 'es5 exists');
  assert.strictEqual(typeof _sinon2['default'], 'object', 'sinon exists');
  assert.strictEqual(typeof _videoJs2['default'], 'function', 'videojs exists');
  assert.strictEqual(typeof _srcPlugin2['default'], 'function', 'plugin is a function');
});

_qunit2['default'].module('videojs-open', {

  beforeEach: function beforeEach() {

    // Mock the environment's timers because certain things - particularly
    // player readiness - are asynchronous in video.js 5. This MUST come
    // before any player is created; otherwise, timers could get created
    // with the actual timer methods!
    this.clock = _sinon2['default'].useFakeTimers();

    this.fixture = _globalDocument2['default'].getElementById('qunit-fixture');
    this.video = _globalDocument2['default'].createElement('video');
    this.fixture.appendChild(this.video);
    this.player = (0, _videoJs2['default'])(this.video);
  },

  afterEach: function afterEach() {
    this.player.dispose();
    this.clock.restore();
  }
});

_qunit2['default'].test('registers itself with video.js', function (assert) {
  assert.expect(2);

  assert.strictEqual(Player.prototype.open, _srcPlugin2['default'], 'videojs-open plugin was registered');

  this.player.open();

  // Tick the clock forward enough to trigger the player to be "ready".
  this.clock.tick(1);

  assert.ok(this.player.hasClass('vjs-open'), 'the plugin adds a class to the player');
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../src/plugin":3,"global/document":2}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2dsb2JhbC9kb2N1bWVudC5qcyIsIi9Vc2Vycy9vcGVuL0RvY3VtZW50cy9Xb3JrL1NvdXJjZVRyZWUvdmpzLW9wZW4vc3JjL3BsdWdpbi5qcyIsIi9Vc2Vycy9vcGVuL0RvY3VtZW50cy9Xb3JrL1NvdXJjZVRyZWUvdmpzLW9wZW4vdGVzdC9wbHVnaW4udGVzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOzs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozt1QkNmb0IsVUFBVTs7Ozs7QUFHOUIsSUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDOzs7Ozs7Ozs7Ozs7O0FBYXBCLElBQU0sYUFBYSxHQUFHLFNBQWhCLGFBQWEsQ0FBSSxNQUFNLEVBQUUsT0FBTyxFQUFLO0FBQzFDLE9BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7Q0FFNUIsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7QUFjRixJQUFNLElBQUksR0FBRyxTQUFQLElBQUksQ0FBWSxPQUFPLEVBQUU7OztBQUM5QixLQUFJLENBQUMsS0FBSyxDQUFDLFlBQU07QUFDaEIsZUFBYSxRQUFPLHFCQUFRLFlBQVksQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztFQUM3RCxDQUFDLENBQUM7Q0FDSCxDQUFDOzs7QUFHRixJQUFNLHlCQUF5QixHQUFHLG1DQUFTLE9BQU8sRUFBRTs7Ozs7OztBQU9uRCxLQUFJLFFBQVEsR0FBRyxxQkFBUSxZQUFZLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQztLQUNyRCxNQUFNLEdBQUcsSUFBSTtLQUNiLFVBQVUsR0FBRyxFQUFFO0tBQ2YsY0FBYyxH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QUUsQ0FBQzs7QUFFbkMsUUFBSSxDQUFDLE9BQU8sR0FBRyw0QkFBUyxjQUFjLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDeEQsUUFBSSxDQUFDLEtBQUssR0FBRyw0QkFBUyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDN0MsUUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3JDLFFBQUksQ0FBQyxNQUFNLEdBQUcsMEJBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0dBQ25DOztBQUVELFdBQVMsRUFBQSxxQkFBRztBQUNWLFFBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDdEIsUUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztHQUN0QjtDQUNGLENBQUMsQ0FBQzs7QUFFSCxtQkFBTSxJQUFJLENBQUMsZ0NBQWdDLEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDNUQsUUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFakIsUUFBTSxDQUFDLFdBQVcsQ0FDaEIsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLDBCQUVyQixvQ0FBb0MsQ0FDckMsQ0FBQzs7QUFFRixNQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDOzs7QUFHbkIsTUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRW5CLFFBQU0sQ0FBQyxFQUFFLENBQ1AsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQ2hDLHVDQUF1QyxDQUN4QyxDQUFDO0NBQ0gsQ0FBQyxDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIiIsInZhciB0b3BMZXZlbCA9IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDpcbiAgICB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHt9XG52YXIgbWluRG9jID0gcmVxdWlyZSgnbWluLWRvY3VtZW50Jyk7XG5cbmlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBkb2N1bWVudDtcbn0gZWxzZSB7XG4gICAgdmFyIGRvY2N5ID0gdG9wTGV2ZWxbJ19fR0xPQkFMX0RPQ1VNRU5UX0NBQ0hFQDQnXTtcblxuICAgIGlmICghZG9jY3kpIHtcbiAgICAgICAgZG9jY3kgPSB0b3BMZXZlbFsnX19HTE9CQUxfRE9DVU1FTlRfQ0FDSEVANCddID0gbWluRG9jO1xuICAgIH1cblxuICAgIG1vZHVsZS5leHBvcnRzID0gZG9jY3k7XG59XG4iLCJpbXBvcnQgdmlkZW9qcyBmcm9tICd2aWRlby5qcyc7XG5cbi8vIERlZmF1bHQgb3B0aW9ucyBmb3IgdGhlIHBsdWdpbi5cbmNvbnN0IGRlZmF1bHRzID0ge307XG5cbi8qKlxuICogRnVuY3Rpb24gdG8gaW52b2tlIHdoZW4gdGhlIHBsYXllciBpcyByZWFkeS5cbiAqXG4gKiBUaGlzIGlzIGEgZ3JlYXQgcGxhY2UgZm9yIHlvdXIgcGx1Z2luIHRvIGluaXRpYWxpemUgaXRzZWxmLiBXaGVuIHRoaXNcbiAqIGZ1bmN0aW9uIGlzIGNhbGxlZCwgdGhlIHBsYXllciB3aWxsIGhhdmUgaXRzIERPTSBhbmQgY2hpbGQgY29tcG9uZW50c1xuICogaW4gcGxhY2UuXG4gKlxuICogQGZ1bmN0aW9uIG9uUGxheWVyUmVhZHlcbiAqIEBwYXJhbSAgICB7UGxheWVyfSBwbGF5ZXJcbiAqIEBwYXJhbSAgICB7T2JqZWN0fSBbb3B0aW9ucz17fV1cbiAqL1xuY29uc3Qgb25QbGF5ZXJSZWFkeSA9IChwbGF5ZXIsIG9wdGlvbnMpID0+IHtcblx0cGxheWVyLmFkZENsYXNzKCd2anMtb3BlbicpO1xuXG59O1xuXG4vKipcbiAqIEEgdmlkZW8uanMgcGx1Z2luLlxuICpcbiAqIEluIHRoZSBwbHVnaW4gZnVuY3Rpb24sIHRoZSB2YWx1ZSBvZiBgdGhpc2AgaXMgYSB2aWRlby5qcyBgUGxheWVyYFxuICogaW5zdGFuY2UuIFlvdSBjYW5ub3QgcmVseSBvbiB0aGUgcGxheWVyIGJlaW5nIGluIGEgXCJyZWFkeVwiIHN0YXRlIGhlcmUsXG4gKiBkZXBlbmRpbmcgb24gaG93IHRoZSBwbHVnaW4gaXMgaW52b2tlZC4gVGhpcyBtYXkgb3IgbWF5IG5vdCBiZSBpbXBvcnRhbnRcbiAqIHRvIHlvdTsgaWYgbm90LCByZW1vdmUgdGhlIHdhaXQgZm9yIFwicmVhZHlcIiFcbiAqXG4gKiBAZnVuY3Rpb24gb3BlblxuICogQHBhcmFtICAgIHtPYmplY3R9IFtvcHRpb25zPXt9XVxuICogICAgICAgICAgIEFuIG9iamVjdCBvZiBvcHRpb25zIGxlZnQgdG8gdGhlIHBsdWdpbiBhdXRob3IgdG8gZGVmaW5lLlxuICovXG5jb25zdCBvcGVuID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHR0aGlzLnJlYWR5KCgpID0+IHtcblx0XHRvblBsYXllclJlYWR5KHRoaXMsIHZpZGVvanMubWVyZ2VPcHRpb25zKGRlZmF1bHRzLCBvcHRpb25zKSk7XG5cdH0pO1xufTtcblxuLy8g5YiG6L6o546HXG5jb25zdCB2aWRlb0pzUmVzb2x1dGlvblN3aXRjaGVyID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXG5cdC8qKlxuXHQgKiBJbml0aWFsaXplIHRoZSBwbHVnaW4uXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uc10gY29uZmlndXJhdGlvbiBmb3IgdGhlIHBsdWdpblxuXHQgKi9cblxuXHR2YXIgc2V0dGluZ3MgPSB2aWRlb2pzLm1lcmdlT3B0aW9ucyhkZWZhdWx0cywgb3B0aW9ucyksXG5cdFx0cGxheWVyID0gdGhpcyxcblx0XHRncm91cGVkU3JjID0ge30sXG5cdFx0Y3VycmVudFNvdXJjZXMgPSB7fSxcblx0XHRjdXJyZW50UmVzb2x1dGlvblN0YXRlID0ge307XG5cblx0LyoqXG5cdCAqIFVwZGF0ZXMgcGxheWVyIHNvdXJjZXMgb3IgcmV0dXJucyBjdXJyZW50IHNvdXJjZSBVUkxcblx0ICogQHBhcmFtICAge0FycmF5fSAgW3NyY10gYXJyYXkgb2Ygc291cmNlcyBbe3NyYzogJycsIHR5cGU6ICcnLCBsYWJlbDogJycsIHJlczogJyd9XVxuXHQgKiBAcmV0dXJucyB7T2JqZWN0fFN0cmluZ3xBcnJheX0gdmlkZW9qcyBwbGF5ZXIgb2JqZWN0IGlmIHVzZWQgYXMgc2V0dGVyIG9yIGN1cnJlbnQgc291cmNlIFVSTCwgb2JqZWN0LCBvciBhcnJheSBvZiBzb3VyY2VzXG5cdCAqL1xuXHRwbGF5ZXIudXBkYXRlU3JjID0gZnVuY3Rpb24oc3JjKSB7XG5cdFx0Ly9SZXR1cm4gY3VycmVudCBzcmMgaWYgc3JjIGlzIG5vdCBnaXZlblxuXHRcdGlmICghc3JjKSB7XG5cdFx0XHRyZXR1cm4gcGxheWVyLnNyYygpO1xuXHRcdH1cblxuXHRcdC8vIE9ubHkgYWRkIHRob3NlIHNvdXJjZXMgd2hpY2ggd2UgY2FuIChtYXliZSkgcGxheVxuXHRcdHNyYyA9IHNyYy5maWx0ZXIoZnVuY3Rpb24oc291cmNlKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRyZXR1cm4gKHBsYXllci5jYW5QbGF5VHlwZShzb3VyY2UudHlwZSkgIT09ICcnKTtcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0Ly8gSWYgYSBUZWNoIGRvZXNuJ3QgeWV0IGhhdmUgY2FuUGxheVR5cGUganVzdCBhZGQgaXRcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0Ly9Tb3J0IHNvdXJjZXNcblx0XHR0aGlzLmN1cnJlbnRTb3VyY2VzID0gc3JjLnNvcnQoY29tcGFyZVJlc29sdXRpb25zKTtcblx0XHR0aGlzLmdyb3VwZWRTcmMgPSBidWNrZXRTb3VyY2VzKHRoaXMuY3VycmVudFNvdXJjZXMpO1xuXHRcdC8vIFBpY2sgb25lIGJ5IGRlZmF1bHRcblx0XHR2YXIgY2hvc2VuID0gY2hvb3NlU3JjKHRoaXMuZ3JvdXBlZFNyYywgdGhpcy5jdXJyZW50U291cmNlcyk7XG5cdFx0dGhpcy5jdXJyZW50UmVzb2x1dGlvblN0YXRlID0ge1xuXHRcdFx0bGFiZWw6IGNob3Nlbi5sYWJlbCxcblx0XHRcdHNvdXJjZXM6IGNob3Nlbi5zb3VyY2VzXG5cdFx0fTtcblxuXHRcdHBsYXllci50cmlnZ2VyKCd1cGRhdGVTb3VyY2VzJyk7XG5cdFx0cGxheWVyLnNldFNvdXJjZXNTYW5pdGl6ZWQoY2hvc2VuLnNvdXJjZXMsIGNob3Nlbi5sYWJlbCk7XG5cdFx0cGxheWVyLnRyaWdnZXIoJ3Jlc29sdXRpb25jaGFuZ2UnKTtcblx0XHRyZXR1cm4gcGxheWVyO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGN1cnJlbnQgcmVzb2x1dGlvbiBvciBzZXRzIG9uZSB3aGVuIGxhYmVsIGlzIHNwZWNpZmllZFxuXHQgKiBAcGFyYW0ge1N0cmluZ30gICBbbGFiZWxdICAgICAgICAgbGFiZWwgbmFtZVxuXHQgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY3VzdG9tU291cmNlUGlja2VyXSBjdXN0b20gZnVuY3Rpb24gdG8gY2hvb3NlIHNvdXJjZS4gVGFrZXMgMiBhcmd1bWVudHM6IHNvdXJjZXMsIGxhYmVsLiBNdXN0IHJldHVybiBwbGF5ZXIgb2JqZWN0LlxuXHQgKiBAcmV0dXJucyB7T2JqZWN0fSAgIGN1cnJlbnQgcmVzb2x1dGlvbiBvYmplY3Qge2xhYmVsOiAnJywgc291cmNlczogW119IGlmIHVzZWQgYXMgZ2V0dGVyIG9yIHBsYXllciBvYmplY3QgaWYgdXNlZCBhcyBzZXR0ZXJcblx0ICovXG5cdHBsYXllci5jdXJyZW50UmVzb2x1dGlvbiA9IGZ1bmN0aW9uKGxhYmVsLCBjdXN0b21Tb3VyY2VQaWNrZXIpIHtcblx0XHRpZiAobGFiZWwgPT0gbnVsbCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuY3VycmVudFJlc29sdXRpb25TdGF0ZTtcblx0XHR9XG5cblx0XHQvLyBMb29rdXAgc291cmNlcyBmb3IgbGFiZWxcblx0XHRpZiAoIXRoaXMuZ3JvdXBlZFNyYyB8fCAhdGhpcy5ncm91cGVkU3JjLmxhYmVsIHx8ICF0aGlzLmdyb3VwZWRTcmMubGFiZWxbbGFiZWxdKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHZhciBzb3VyY2VzID0gdGhpcy5ncm91cGVkU3JjLmxhYmVsW2xhYmVsXTtcblx0XHQvLyBSZW1lbWJlciBwbGF5ZXIgc3RhdGVcblx0XHR2YXIgY3VycmVudFRpbWUgPSBwbGF5ZXIuY3VycmVudFRpbWUoKTtcblx0XHR2YXIgaXNQYXVzZWQgPSBwbGF5ZXIucGF1c2VkKCk7XG5cblx0XHQvLyBIaWRlIGJpZ1BsYXlCdXR0b25cblx0XHRpZiAoIWlzUGF1c2VkICYmIHRoaXMucGxheWVyXy5vcHRpb25zXy5iaWdQbGF5QnV0dG9uKSB7XG5cdFx0XHR0aGlzLnBsYXllcl8uYmlnUGxheUJ1dHRvbi5oaWRlKCk7XG5cdFx0fVxuXG5cdFx0Ly8gQ2hhbmdlIHBsYXllciBzb3VyY2UgYW5kIHdhaXQgZm9yIGxvYWRlZGRhdGEgZXZlbnQsIHRoZW4gcGxheSB2aWRlb1xuXHRcdC8vIGxvYWRlZG1ldGFkYXRhIGRvZXNuJ3Qgd29yayByaWdodCBub3cgZm9yIGZsYXNoLlxuXHRcdC8vIFByb2JhYmx5IGJlY2F1c2Ugb2YgaHR0cHM6Ly9naXRodWIuY29tL3ZpZGVvanMvdmlkZW8tanMtc3dmL2lzc3Vlcy8xMjRcblx0XHQvLyBJZiBwbGF5ZXIgcHJlbG9hZCBpcyAnbm9uZScgYW5kIHRoZW4gbG9hZGVkZGF0YSBub3QgZmlyZWQuIFNvLCB3ZSBuZWVkIHRpbWV1cGRhdGUgZXZlbnQgZm9yIHNlZWsgaGFuZGxlICh0aW1ldXBkYXRlIGRvZXNuJ3Qgd29yayBwcm9wZXJseSB3aXRoIGZsYXNoKVxuXHRcdHZhciBoYW5kbGVTZWVrRXZlbnQgPSAnbG9hZGVkZGF0YSc7XG5cdFx0aWYgKHRoaXMucGxheWVyXy50ZWNoTmFtZV8gIT09ICdZb3V0dWJlJyAmJiB0aGlzLnBsYXllcl8ucHJlbG9hZCgpID09PSAnbm9uZScgJiYgdGhpcy5wbGF5ZXJfLnRlY2hOYW1lXyAhPT0gJ0ZsYXNoJykge1xuXHRcdFx0aGFuZGxlU2Vla0V2ZW50ID0gJ3RpbWV1cGRhdGUnO1xuXHRcdH1cblx0XHRwbGF5ZXJcblx0XHRcdC5zZXRTb3VyY2VzU2FuaXRpemVkKHNvdXJjZXMsIGxhYmVsLCBjdXN0b21Tb3VyY2VQaWNrZXIgfHwgc2V0dGluZ3MuY3VzdG9tU291cmNlUGlja2VyKVxuXHRcdFx0Lm9uZShoYW5kbGVTZWVrRXZlbnQsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRwbGF5ZXIuY3VycmVudFRpbWUoY3VycmVudFRpbWUpO1xuXHRcdFx0XHRwbGF5ZXIuaGFuZGxlVGVjaFNlZWtlZF8oKTtcblx0XHRcdFx0aWYgKCFpc1BhdXNlZCkge1xuXHRcdFx0XHRcdC8vIFN0YXJ0IHBsYXlpbmcgYW5kIGhpZGUgbG9hZGluZ1NwaW5uZXIgKGZsYXNoIGlzc3VlID8pXG5cdFx0XHRcdFx0cGxheWVyLnBsYXkoKS5oYW5kbGVUZWNoU2Vla2VkXygpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHBsYXllci50cmlnZ2VyKCdyZXNvbHV0aW9uY2hhbmdlJyk7XG5cdFx0XHR9KTtcblx0XHRyZXR1cm4gcGxheWVyO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGdyb3VwZWQgc291cmNlcyBieSBsYWJlbCwgcmVzb2x1dGlvbiBhbmQgdHlwZVxuXHQgKiBAcmV0dXJucyB7T2JqZWN0fSBncm91cGVkIHNvdXJjZXM6IHsgbGFiZWw6IHsga2V5OiBbXSB9LCByZXM6IHsga2V5OiBbXSB9LCB0eXBlOiB7IGtleTogW10gfSB9XG5cdCAqL1xuXHRwbGF5ZXIuZ2V0R3JvdXBlZFNyYyA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLmdyb3VwZWRTcmM7XG5cdH07XG5cblx0cGxheWVyLnNldFNvdXJjZXNTYW5pdGl6ZWQgPSBmdW5jdGlvbihzb3VyY2VzLCBsYWJlbCwgY3VzdG9tU291cmNlUGlja2VyKSB7XG5cdFx0dGhpcy5jdXJyZW50UmVzb2x1dGlvblN0YXRlID0ge1xuXHRcdFx0bGFiZWw6IGxhYmVsLFxuXHRcdFx0c291cmNlczogc291cmNlc1xuXHRcdH07XG5cdFx0aWYgKHR5cGVvZiBjdXN0b21Tb3VyY2VQaWNrZXIgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdHJldHVybiBjdXN0b21Tb3VyY2VQaWNrZXIocGxheWVyLCBzb3VyY2VzLCBsYWJlbCk7XG5cdFx0fVxuXHRcdHBsYXllci5zcmMoc291cmNlcy5tYXAoZnVuY3Rpb24oc3JjKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRzcmM6IHNyYy5zcmMsXG5cdFx0XHRcdHR5cGU6IHNyYy50eXBlLFxuXHRcdFx0XHRyZXM6IHNyYy5yZXNcblx0XHRcdH07XG5cdFx0fSkpO1xuXHRcdHJldHVybiBwbGF5ZXI7XG5cdH07XG5cblx0LyoqXG5cdCAqIE1ldGhvZCB1c2VkIGZvciBzb3J0aW5nIGxpc3Qgb2Ygc291cmNlc1xuXHQgKiBAcGFyYW0gICB7T2JqZWN0fSBhIC0gc291cmNlIG9iamVjdCB3aXRoIHJlcyBwcm9wZXJ0eVxuXHQgKiBAcGFyYW0gICB7T2JqZWN0fSBiIC0gc291cmNlIG9iamVjdCB3aXRoIHJlcyBwcm9wZXJ0eVxuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSByZXN1bHQgb2YgY29tcGFyYXRpb25cblx0ICovXG5cdGZ1bmN0aW9uIGNvbXBhcmVSZXNvbHV0aW9ucyhhLCBiKSB7XG5cdFx0aWYgKCFhLnJlcyB8fCAhYi5yZXMpIHtcblx0XHRcdHJldHVybiAwO1xuXHRcdH1cblx0XHRyZXR1cm4gKCtiLnJlcykgLSAoK2EucmVzKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBHcm91cCBzb3VyY2VzIGJ5IGxhYmVsLCByZXNvbHV0aW9uIGFuZCB0eXBlXG5cdCAqIEBwYXJhbSAgIHtBcnJheX0gIHNyYyBBcnJheSBvZiBzb3VyY2VzXG5cdCAqIEByZXR1cm5zIHtPYmplY3R9IGdyb3VwZWQgc291cmNlczogeyBsYWJlbDogeyBrZXk6IFtdIH0sIHJlczogeyBrZXk6IFtdIH0sIHR5cGU6IHsga2V5OiBbXSB9IH1cblx0ICovXG5cdGZ1bmN0aW9uIGJ1Y2tldFNvdXJjZXMoc3JjKSB7XG5cdFx0dmFyIHJlc29sdXRpb25zID0ge1xuXHRcdFx0bGFiZWw6IHt9LFxuXHRcdFx0cmVzOiB7fSxcblx0XHRcdHR5cGU6IHt9XG5cdFx0fTtcblx0XHRzcmMubWFwKGZ1bmN0aW9uKHNvdXJjZSkge1xuXHRcdFx0aW5pdFJlc29sdXRpb25LZXkocmVzb2x1dGlvbnMsICdsYWJlbCcsIHNvdXJjZSk7XG5cdFx0XHRpbml0UmVzb2x1dGlvbktleShyZXNvbHV0aW9ucywgJ3JlcycsIHNvdXJjZSk7XG5cdFx0XHRpbml0UmVzb2x1dGlvbktleShyZXNvbHV0aW9ucywgJ3R5cGUnLCBzb3VyY2UpO1xuXG5cdFx0XHRhcHBlbmRTb3VyY2VUb0tleShyZXNvbHV0aW9ucywgJ2xhYmVsJywgc291cmNlKTtcblx0XHRcdGFwcGVuZFNvdXJjZVRvS2V5KHJlc29sdXRpb25zLCAncmVzJywgc291cmNlKTtcblx0XHRcdGFwcGVuZFNvdXJjZVRvS2V5KHJlc29sdXRpb25zLCAndHlwZScsIHNvdXJjZSk7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHJlc29sdXRpb25zO1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5pdFJlc29sdXRpb25LZXkocmVzb2x1dGlvbnMsIGtleSwgc291cmNlKSB7XG5cdFx0aWYgKHJlc29sdXRpb25zW2tleV1bc291cmNlW2tleV1dID09IG51bGwpIHtcblx0XHRcdHJlc29sdXRpb25zW2tleV1bc291cmNlW2tleV1dID0gW107XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gYXBwZW5kU291cmNlVG9LZXkocmVzb2x1dGlvbnMsIGtleSwgc291cmNlKSB7XG5cdFx0cmVzb2x1dGlvbnNba2V5XVtzb3VyY2Vba2V5XV0ucHVzaChzb3VyY2UpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENob29zZSBzcmMgaWYgb3B0aW9uLmRlZmF1bHQgaXMgc3BlY2lmaWVkXG5cdCAqIEBwYXJhbSAgIHtPYmplY3R9IGdyb3VwZWRTcmMge3JlczogeyBrZXk6IFtdIH19XG5cdCAqIEBwYXJhbSAgIHtBcnJheX0gIHNyYyBBcnJheSBvZiBzb3VyY2VzIHNvcnRlZCBieSByZXNvbHV0aW9uIHVzZWQgdG8gZmluZCBoaWdoIGFuZCBsb3cgcmVzXG5cdCAqIEByZXR1cm5zIHtPYmplY3R9IHtyZXM6IHN0cmluZywgc291cmNlczogW119XG5cdCAqL1xuXHRmdW5jdGlvbiBjaG9vc2VTcmMoZ3JvdXBlZFNyYywgc3JjKSB7XG5cdFx0dmFyIHNlbGVjdGVkUmVzID0gc2V0dGluZ3NbJ2RlZmF1bHQnXTsgLy8gdXNlIGFycmF5IGFjY2VzcyBhcyBkZWZhdWx0IGlzIGEgcmVzZXJ2ZWQga2V5d29yZFxuXHRcdHZhciBzZWxlY3RlZExhYmVsID0gJyc7XG5cdFx0aWYgKHNlbGVjdGVkUmVzID09PSAnaGlnaCcpIHtcblx0XHRcdHNlbGVjdGVkUmVzID0gc3JjWzBdLnJlcztcblx0XHRcdHNlbGVjdGVkTGFiZWwgPSBzcmNbMF0ubGFiZWw7XG5cdFx0fSBlbHNlIGlmIChzZWxlY3RlZFJlcyA9PT0gJ2xvdycgfHwgc2VsZWN0ZWRSZXMgPT0gbnVsbCB8fCAhZ3JvdXBlZFNyYy5yZXNbc2VsZWN0ZWRSZXNdKSB7XG5cdFx0XHQvLyBTZWxlY3QgbG93LXJlcyBpZiBkZWZhdWx0IGlzIGxvdyBvciBub3Qgc2V0XG5cdFx0XHRzZWxlY3RlZFJlcyA9IHNyY1tzcmMubGVuZ3RoIC0gMV0ucmVzO1xuXHRcdFx0c2VsZWN0ZWRMYWJlbCA9IHNyY1tzcmMubGVuZ3RoIC0gMV0ubGFiZWw7XG5cdFx0fSBlbHNlIGlmIChncm91cGVkU3JjLnJlc1tzZWxlY3RlZFJlc10pIHtcblx0XHRcdHNlbGVjdGVkTGFiZWwgPSBncm91cGVkU3JjLnJlc1tzZWxlY3RlZFJlc11bMF0ubGFiZWw7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlczogc2VsZWN0ZWRSZXMsXG5cdFx0XHRsYWJlbDogc2VsZWN0ZWRMYWJlbCxcblx0XHRcdHNvdXJjZXM6IGdyb3VwZWRTcmMucmVzW3NlbGVjdGVkUmVzXVxuXHRcdH07XG5cdH1cblxuXHRmdW5jdGlvbiBpbml0UmVzb2x1dGlvbkZvcll0KHBsYXllcikge1xuXHRcdC8vIE1hcCB5b3V0dWJlIHF1YWxpdGllcyBuYW1lc1xuXHRcdHZhciBfeXRzID0ge1xuXHRcdFx0aGlnaHJlczoge1xuXHRcdFx0XHRyZXM6IDEwODAsXG5cdFx0XHRcdGxhYmVsOiAnMTA4MCcsXG5cdFx0XHRcdHl0OiAnaGlnaHJlcydcblx0XHRcdH0sXG5cdFx0XHRoZDEwODA6IHtcblx0XHRcdFx0cmVzOiAxMDgwLFxuXHRcdFx0XHRsYWJlbDogJzEwODAnLFxuXHRcdFx0XHR5dDogJ2hkMTA4MCdcblx0XHRcdH0sXG5cdFx0XHRoZDcyMDoge1xuXHRcdFx0XHRyZXM6IDcyMCxcblx0XHRcdFx0bGFiZWw6ICc3MjAnLFxuXHRcdFx0XHR5dDogJ2hkNzIwJ1xuXHRcdFx0fSxcblx0XHRcdGxhcmdlOiB7XG5cdFx0XHRcdHJlczogNDgwLFxuXHRcdFx0XHRsYWJlbDogJzQ4MCcsXG5cdFx0XHRcdHl0OiAnbGFyZ2UnXG5cdFx0XHR9LFxuXHRcdFx0bWVkaXVtOiB7XG5cdFx0XHRcdHJlczogMzYwLFxuXHRcdFx0XHRsYWJlbDogJzM2MCcsXG5cdFx0XHRcdHl0OiAnbWVkaXVtJ1xuXHRcdFx0fSxcblx0XHRcdHNtYWxsOiB7XG5cdFx0XHRcdHJlczogMjQwLFxuXHRcdFx0XHRsYWJlbDogJzI0MCcsXG5cdFx0XHRcdHl0OiAnc21hbGwnXG5cdFx0XHR9LFxuXHRcdFx0dGlueToge1xuXHRcdFx0XHRyZXM6IDE0NCxcblx0XHRcdFx0bGFiZWw6ICcxNDQnLFxuXHRcdFx0XHR5dDogJ3RpbnknXG5cdFx0XHR9LFxuXHRcdFx0YXV0bzoge1xuXHRcdFx0XHRyZXM6IDAsXG5cdFx0XHRcdGxhYmVsOiAnYXV0bycsXG5cdFx0XHRcdHl0OiAnYXV0bydcblx0XHRcdH1cblx0XHR9O1xuXHRcdC8vIE92ZXJ3cml0ZSBkZWZhdWx0IHNvdXJjZVBpY2tlciBmdW5jdGlvblxuXHRcdHZhciBfY3VzdG9tU291cmNlUGlja2VyID0gZnVuY3Rpb24oX3BsYXllciwgX3NvdXJjZXMsIF9sYWJlbCkge1xuXHRcdFx0Ly8gTm90ZSB0aGF0IHNldFBsYXllYmFja1F1YWxpdHkgaXMgYSBzdWdnZXN0aW9uLiBZVCBkb2VzIG5vdCBhbHdheXMgb2JleSBpdC5cblx0XHRcdHBsYXllci50ZWNoXy55dFBsYXllci5zZXRQbGF5YmFja1F1YWxpdHkoX3NvdXJjZXNbMF0uX3l0KTtcblx0XHRcdHBsYXllci50cmlnZ2VyKCd1cGRhdGVTb3VyY2VzJyk7XG5cdFx0XHRyZXR1cm4gcGxheWVyO1xuXHRcdH07XG5cdFx0c2V0dGluZ3MuY3VzdG9tU291cmNlUGlja2VyID0gX2N1c3RvbVNvdXJjZVBpY2tlcjtcblxuXHRcdC8vIEluaXQgcmVzb2x1dGlvblxuXHRcdHBsYXllci50ZWNoXy55dFBsYXllci5zZXRQbGF5YmFja1F1YWxpdHkoJ2F1dG8nKTtcblxuXHRcdC8vIFRoaXMgaXMgdHJpZ2dlcmVkIHdoZW4gdGhlIHJlc29sdXRpb24gYWN0dWFsbHkgY2hhbmdlc1xuXHRcdHBsYXllci50ZWNoXy55dFBsYXllci5hZGRFdmVudExpc3RlbmVyKCdvblBsYXliYWNrUXVhbGl0eUNoYW5nZScsIGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0XHRmb3IgKHZhciByZXMgaW4gX3l0cykge1xuXHRcdFx0XHRpZiAocmVzLnl0ID09PSBldmVudC5kYXRhKSB7XG5cdFx0XHRcdFx0cGxheWVyLmN1cnJlbnRSZXNvbHV0aW9uKHJlcy5sYWJlbCwgX2N1c3RvbVNvdXJjZVBpY2tlcik7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQvLyBXZSBtdXN0IHdhaXQgZm9yIHBsYXkgZXZlbnRcblx0XHRwbGF5ZXIub25lKCdwbGF5JywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgcXVhbGl0aWVzID0gcGxheWVyLnRlY2hfLnl0UGxheWVyLmdldEF2YWlsYWJsZVF1YWxpdHlMZXZlbHMoKTtcblx0XHRcdHZhciBfc291cmNlcyA9IFtdO1xuXG5cdFx0XHRxdWFsaXRpZXMubWFwKGZ1bmN0aW9uKHEpIHtcblx0XHRcdFx0X3NvdXJjZXMucHVzaCh7XG5cdFx0XHRcdFx0c3JjOiBwbGF5ZXIuc3JjKCkuc3JjLFxuXHRcdFx0XHRcdHR5cGU6IHBsYXllci5zcmMoKS50eXBlLFxuXHRcdFx0XHRcdGxhYmVsOiBfeXRzW3FdLmxhYmVsLFxuXHRcdFx0XHRcdHJlczogX3l0c1txXS5yZXMsXG5cdFx0XHRcdFx0X3l0OiBfeXRzW3FdLnl0XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cblx0XHRcdHBsYXllci5ncm91cGVkU3JjID0gYnVja2V0U291cmNlcyhfc291cmNlcyk7XG5cdFx0XHR2YXIgY2hvc2VuID0ge1xuXHRcdFx0XHRsYWJlbDogJ2F1dG8nLFxuXHRcdFx0XHRyZXM6IDAsXG5cdFx0XHRcdHNvdXJjZXM6IHBsYXllci5ncm91cGVkU3JjLmxhYmVsLmF1dG9cblx0XHRcdH07XG5cblx0XHRcdHRoaXMuY3VycmVudFJlc29sdXRpb25TdGF0ZSA9IHtcblx0XHRcdFx0bGFiZWw6IGNob3Nlbi5sYWJlbCxcblx0XHRcdFx0c291cmNlczogY2hvc2VuLnNvdXJjZXNcblx0XHRcdH07XG5cblx0XHRcdHBsYXllci50cmlnZ2VyKCd1cGRhdGVTb3VyY2VzJyk7XG5cdFx0XHRwbGF5ZXIuc2V0U291cmNlc1Nhbml0aXplZChjaG9zZW4uc291cmNlcywgY2hvc2VuLmxhYmVsLCBfY3VzdG9tU291cmNlUGlja2VyKTtcblx0XHR9KTtcblx0fVxuXG5cdHBsYXllci5yZWFkeShmdW5jdGlvbigpIHtcblx0XHRpZiAoc2V0dGluZ3MudWkpIHtcblx0XHRcdHZhciBtZW51QnV0dG9uID0gbmV3IFJlc29sdXRpb25NZW51QnV0dG9uKHBsYXllciwgc2V0dGluZ3MpO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucmVzb2x1dGlvblN3aXRjaGVyID0gcGxheWVyLmNvbnRyb2xCYXIuZWxfLmluc2VydEJlZm9yZShtZW51QnV0dG9uLmVsXywgcGxheWVyLmNvbnRyb2xCYXIuZ2V0Q2hpbGQoJ2Z1bGxzY3JlZW5Ub2dnbGUnKS5lbF8pO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucmVzb2x1dGlvblN3aXRjaGVyLmRpc3Bvc2UgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0dGhpcy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMpO1xuXHRcdFx0fTtcblx0XHR9XG5cdFx0aWYgKHBsYXllci5vcHRpb25zXy5zb3VyY2VzLmxlbmd0aCA+IDEpIHtcblx0XHRcdC8vIHRlY2g6IEh0bWw1IGFuZCBGbGFzaFxuXHRcdFx0Ly8gQ3JlYXRlIHJlc29sdXRpb24gc3dpdGNoZXIgZm9yIHZpZGVvcyBmb3JtIDxzb3VyY2U+IHRhZyBpbnNpZGUgPHZpZGVvPlxuXHRcdFx0cGxheWVyLnVwZGF0ZVNyYyhwbGF5ZXIub3B0aW9uc18uc291cmNlcyk7XG5cdFx0fVxuXG5cdFx0aWYgKHBsYXllci50ZWNoTmFtZV8gPT09ICdZb3V0dWJlJykge1xuXHRcdFx0Ly8gdGVjaDogWW91VHViZVxuXHRcdFx0aW5pdFJlc29sdXRpb25Gb3JZdChwbGF5ZXIpO1xuXHRcdH1cblx0fSk7XG5cblx0dmFyIHZpZGVvSnNSZXNvbHV0aW9uU3dpdGNoZXIsXG5cdFx0ZGVmYXVsdHMgPSB7XG5cdFx0XHR1aTogdHJ1ZVxuXHRcdH07XG5cblx0Lypcblx0ICogUmVzb2x1dGlvbiBtZW51IGl0ZW1cblx0ICovXG5cdHZhciBNZW51SXRlbSA9IHZpZGVvanMuZ2V0Q29tcG9uZW50KCdNZW51SXRlbScpO1xuXHR2YXIgUmVzb2x1dGlvbk1lbnVJdGVtID0gdmlkZW9qcy5leHRlbmQoTWVudUl0ZW0sIHtcblx0XHRjb25zdHJ1Y3RvcjogZnVuY3Rpb24ocGxheWVyLCBvcHRpb25zKSB7XG5cdFx0XHRvcHRpb25zLnNlbGVjdGFibGUgPSB0cnVlO1xuXHRcdFx0Ly8gU2V0cyB0aGlzLnBsYXllcl8sIHRoaXMub3B0aW9uc18gYW5kIGluaXRpYWxpemVzIHRoZSBjb21wb25lbnRcblx0XHRcdE1lbnVJdGVtLmNhbGwodGhpcywgcGxheWVyLCBvcHRpb25zKTtcblx0XHRcdHRoaXMuc3JjID0gb3B0aW9ucy5zcmM7XG5cblx0XHRcdHBsYXllci5vbigncmVzb2x1dGlvbmNoYW5nZScsIHZpZGVvanMuYmluZCh0aGlzLCB0aGlzLnVwZGF0ZSkpO1xuXHRcdH1cblx0fSk7XG5cdFJlc29sdXRpb25NZW51SXRlbS5wcm90b3R5cGUuaGFuZGxlQ2xpY2sgPSBmdW5jdGlvbihldmVudCkge1xuXHRcdE1lbnVJdGVtLnByb3RvdHlwZS5oYW5kbGVDbGljay5jYWxsKHRoaXMsIGV2ZW50KTtcblx0XHR0aGlzLnBsYXllcl8uY3VycmVudFJlc29sdXRpb24odGhpcy5vcHRpb25zXy5sYWJlbCk7XG5cdH07XG5cdFJlc29sdXRpb25NZW51SXRlbS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGVjdGlvbiA9IHRoaXMucGxheWVyXy5jdXJyZW50UmVzb2x1dGlvbigpO1xuXHRcdHRoaXMuc2VsZWN0ZWQodGhpcy5vcHRpb25zXy5sYWJlbCA9PT0gc2VsZWN0aW9uLmxhYmVsKTtcblx0fTtcblx0TWVudUl0ZW0ucmVnaXN0ZXJDb21wb25lbnQoJ1Jlc29sdXRpb25NZW51SXRlbScsIFJlc29sdXRpb25NZW51SXRlbSk7XG5cblx0Lypcblx0ICogUmVzb2x1dGlvbiBtZW51IGJ1dHRvblxuXHQgKi9cblx0dmFyIE1lbnVCdXR0b24gPSB2aWRlb2pzLmdldENvbXBvbmVudCgnTWVudUJ1dHRvbicpO1xuXHR2YXIgUmVzb2x1dGlvbk1lbnVCdXR0b24gPSB2aWRlb2pzLmV4dGVuZChNZW51QnV0dG9uLCB7XG5cdFx0Y29uc3RydWN0b3I6IGZ1bmN0aW9uKHBsYXllciwgb3B0aW9ucykge1xuXHRcdFx0dGhpcy5sYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0XHRcdG9wdGlvbnMubGFiZWwgPSAnUXVhbGl0eSc7XG5cdFx0XHQvLyBTZXRzIHRoaXMucGxheWVyXywgdGhpcy5vcHRpb25zXyBhbmQgaW5pdGlhbGl6ZXMgdGhlIGNvbXBvbmVudFxuXHRcdFx0TWVudUJ1dHRvbi5jYWxsKHRoaXMsIHBsYXllciwgb3B0aW9ucyk7XG5cdFx0XHR0aGlzLmVsKCkuc2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJywgJ1F1YWxpdHknKTtcblx0XHRcdHRoaXMuY29udHJvbFRleHQoJ1F1YWxpdHknKTtcblxuXHRcdFx0aWYgKG9wdGlvbnMuZHluYW1pY0xhYmVsKSB7XG5cdFx0XHRcdHZpZGVvanMuYWRkQ2xhc3ModGhpcy5sYWJlbCwgJ3Zqcy1yZXNvbHV0aW9uLWJ1dHRvbi1sYWJlbCcpO1xuXHRcdFx0XHR0aGlzLmVsKCkuYXBwZW5kQ2hpbGQodGhpcy5sYWJlbCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2YXIgc3RhdGljTGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cdFx0XHRcdHZpZGVvanMuYWRkQ2xhc3Moc3RhdGljTGFiZWwsICd2anMtbWVudS1pY29uJyk7XG5cdFx0XHRcdHRoaXMuZWwoKS5hcHBlbmRDaGlsZChzdGF0aWNMYWJlbCk7XG5cdFx0XHR9XG5cdFx0XHRwbGF5ZXIub24oJ3VwZGF0ZVNvdXJjZXMnLCB2aWRlb2pzLmJpbmQodGhpcywgdGhpcy51cGRhdGUpKTtcblx0XHR9XG5cdH0pO1xuXHRSZXNvbHV0aW9uTWVudUJ1dHRvbi5wcm90b3R5cGUuY3JlYXRlSXRlbXMgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgbWVudUl0ZW1zID0gW107XG5cdFx0dmFyIGxhYmVscyA9ICh0aGlzLnNvdXJjZXMgJiYgdGhpcy5zb3VyY2VzLmxhYmVsKSB8fCB7fTtcblxuXHRcdC8vIEZJWE1FIG9yZGVyIGlzIG5vdCBndWFyYW50ZWVkIGhlcmUuXG5cdFx0Zm9yICh2YXIga2V5IGluIGxhYmVscykge1xuXHRcdFx0aWYgKGxhYmVscy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHRcdG1lbnVJdGVtcy5wdXNoKG5ldyBSZXNvbHV0aW9uTWVudUl0ZW0oXG5cdFx0XHRcdFx0dGhpcy5wbGF5ZXJfLCB7XG5cdFx0XHRcdFx0XHRsYWJlbDoga2V5LFxuXHRcdFx0XHRcdFx0c3JjOiBsYWJlbHNba2V5XSxcblx0XHRcdFx0XHRcdHNlbGVjdGVkOiBrZXkgPT09ICh0aGlzLmN1cnJlbnRTZWxlY3Rpb24gPyB0aGlzLmN1cnJlbnRTZWxlY3Rpb24ubGFiZWwgOiBmYWxzZSlcblx0XHRcdFx0XHR9KSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBtZW51SXRlbXM7XG5cdH07XG5cdFJlc29sdXRpb25NZW51QnV0dG9uLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnNvdXJjZXMgPSB0aGlzLnBsYXllcl8uZ2V0R3JvdXBlZFNyYygpO1xuXHRcdHRoaXMuY3VycmVudFNlbGVjdGlvbiA9IHRoaXMucGxheWVyXy5jdXJyZW50UmVzb2x1dGlvbigpO1xuXHRcdHRoaXMubGFiZWwuaW5uZXJIVE1MID0gdGhpcy5jdXJyZW50U2VsZWN0aW9uID8gdGhpcy5jdXJyZW50U2VsZWN0aW9uLmxhYmVsIDogJyc7XG5cdFx0cmV0dXJuIE1lbnVCdXR0b24ucHJvdG90eXBlLnVwZGF0ZS5jYWxsKHRoaXMpO1xuXHR9O1xuXHRSZXNvbHV0aW9uTWVudUJ1dHRvbi5wcm90b3R5cGUuYnVpbGRDU1NDbGFzcyA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBNZW51QnV0dG9uLnByb3RvdHlwZS5idWlsZENTU0NsYXNzLmNhbGwodGhpcykgKyAnIHZqcy1yZXNvbHV0aW9uLWJ1dHRvbic7XG5cdH07XG5cdE1lbnVCdXR0b24ucmVnaXN0ZXJDb21wb25lbnQoJ1Jlc29sdXRpb25NZW51QnV0dG9uJywgUmVzb2x1dGlvbk1lbnVCdXR0b24pO1xuXG5cblxufTtcblxuLy8g56aB55So5rua5Yqo5p2h5ouW5YqoXG5jb25zdCBkaXNhYmxlUHJvZ3Jlc3MgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdHZhclxuXHQvKipcblx0ICogQ29waWVzIHByb3BlcnRpZXMgZnJvbSBvbmUgb3IgbW9yZSBvYmplY3RzIG9udG8gYW4gb3JpZ2luYWwuXG5cdCAqL1xuXHRcdGV4dGVuZCA9IGZ1bmN0aW9uKG9iaiAvKiwgYXJnMSwgYXJnMiwgLi4uICovICkge1xuXHRcdFx0dmFyIGFyZywgaSwgaztcblx0XHRcdGZvciAoaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0YXJnID0gYXJndW1lbnRzW2ldO1xuXHRcdFx0XHRmb3IgKGsgaW4gYXJnKSB7XG5cdFx0XHRcdFx0aWYgKGFyZy5oYXNPd25Qcm9wZXJ0eShrKSkge1xuXHRcdFx0XHRcdFx0b2JqW2tdID0gYXJnW2tdO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG9iajtcblx0XHR9LFxuXG5cdFx0Ly8gZGVmaW5lIHNvbWUgcmVhc29uYWJsZSBkZWZhdWx0cyBmb3IgdGhpcyBzd2VldCBwbHVnaW5cblx0XHRkZWZhdWx0cyA9IHtcblx0XHRcdGF1dG9EaXNhYmxlOiBmYWxzZVxuXHRcdH07XG5cblxuXHR2YXJcblx0Ly8gc2F2ZSBhIHJlZmVyZW5jZSB0byB0aGUgcGxheWVyIGluc3RhbmNlXG5cdFx0cGxheWVyID0gdGhpcyxcblx0XHRzdGF0ZSA9IGZhbHNlLFxuXG5cdFx0Ly8gbWVyZ2Ugb3B0aW9ucyBhbmQgZGVmYXVsdHNcblx0XHRzZXR0aW5ncyA9IGV4dGVuZCh7fSwgZGVmYXVsdHMsIG9wdGlvbnMgfHwge30pO1xuXG5cdC8vIGRpc2FibGUgLyBlbmFibGUgbWV0aG9kc1xuXHRwbGF5ZXIuZGlzYWJsZVByb2dyZXNzID0ge1xuXHRcdGRpc2FibGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0c3RhdGUgPSB0cnVlO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub2ZmKFwiZm9jdXNcIik7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vZmYoXCJtb3VzZWRvd25cIik7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vZmYoXCJ0b3VjaHN0YXJ0XCIpO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub2ZmKFwiY2xpY2tcIik7XG5cdFx0fSxcblx0XHRlbmFibGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0c3RhdGUgPSBmYWxzZTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9uKFwiZm9jdXNcIiwgcGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIuaGFuZGxlRm9jdXMpO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub24oXCJtb3VzZWRvd25cIiwgcGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIuaGFuZGxlTW91c2VEb3duKTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9uKFwidG91Y2hzdGFydFwiLCBwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5oYW5kbGVNb3VzZURvd24pO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub24oXCJjbGlja1wiLCBwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5oYW5kbGVDbGljayk7XG5cdFx0fSxcblx0XHRnZXRTdGF0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gc3RhdGU7XG5cdFx0fVxuXHR9O1xuXG5cdGlmIChzZXR0aW5ncy5hdXRvRGlzYWJsZSkge1xuXHRcdHBsYXllci5kaXNhYmxlUHJvZ3Jlc3MuZGlzYWJsZSgpO1xuXHR9XG59O1xuXG4vLyDmiZPngrlcbmNvbnN0IG1hcmtlcnMgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdC8vZGVmYXVsdCBzZXR0aW5nXG5cdHZhciBkZWZhdWx0U2V0dGluZyA9IHtcblx0XHRtYXJrZXJTdHlsZToge1xuXHRcdFx0J3dpZHRoJzogJzhweCcsXG5cdFx0XHQnYm9yZGVyLXJhZGl1cyc6ICcyMCUnLFxuXHRcdFx0J2JhY2tncm91bmQtY29sb3InOiAncmdiYSgyNTUsMCwwLC41KSdcblx0XHR9LFxuXHRcdG1hcmtlclRpcDoge1xuXHRcdFx0ZGlzcGxheTogdHJ1ZSxcblx0XHRcdHRleHQ6IGZ1bmN0aW9uKG1hcmtlcikge1xuXHRcdFx0XHRyZXR1cm4gbWFya2VyLnRleHQ7XG5cdFx0XHR9LFxuXHRcdFx0dGltZTogZnVuY3Rpb24obWFya2VyKSB7XG5cdFx0XHRcdHJldHVybiBtYXJrZXIudGltZTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdGJyZWFrT3ZlcmxheToge1xuXHRcdFx0ZGlzcGxheTogZmFsc2UsXG5cdFx0XHRkaXNwbGF5VGltZTogMyxcblx0XHRcdHRleHQ6IGZ1bmN0aW9uKG1hcmtlcikge1xuXHRcdFx0XHRyZXR1cm4gXCJCcmVhayBvdmVybGF5OiBcIiArIG1hcmtlci5vdmVybGF5VGV4dDtcblx0XHRcdH0sXG5cdFx0XHRzdHlsZToge1xuXHRcdFx0XHQnd2lkdGgnOiAnMTAwJScsXG5cdFx0XHRcdCdoZWlnaHQnOiAnMjAlJyxcblx0XHRcdFx0J2JhY2tncm91bmQtY29sb3InOiAncmdiYSgwLDAsMCwwLjcpJyxcblx0XHRcdFx0J2NvbG9yJzogJ3doaXRlJyxcblx0XHRcdFx0J2ZvbnQtc2l6ZSc6ICcxN3B4J1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0b25NYXJrZXJDbGljazogZnVuY3Rpb24obWFya2VyKSB7fSxcblx0XHRvbk1hcmtlclJlYWNoZWQ6IGZ1bmN0aW9uKG1hcmtlcikge30sXG5cdFx0bWFya2VyczogW11cblx0fTtcblxuXHQvLyBjcmVhdGUgYSBub24tY29sbGlkaW5nIHJhbmRvbSBudW1iZXJcblx0ZnVuY3Rpb24gZ2VuZXJhdGVVVUlEKCkge1xuXHRcdHZhciBkID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cdFx0dmFyIHV1aWQgPSAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlKC9beHldL2csIGZ1bmN0aW9uKGMpIHtcblx0XHRcdHZhciByID0gKGQgKyBNYXRoLnJhbmRvbSgpICogMTYpICUgMTYgfCAwO1xuXHRcdFx0ZCA9IE1hdGguZmxvb3IoZCAvIDE2KTtcblx0XHRcdHJldHVybiAoYyA9PSAneCcgPyByIDogKHIgJiAweDMgfCAweDgpKS50b1N0cmluZygxNik7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHV1aWQ7XG5cdH07XG5cblx0LyoqXG5cdCAqIHJlZ2lzdGVyIHRoZSBtYXJrZXJzIHBsdWdpbiAoZGVwZW5kZW50IG9uIGpxdWVyeSlcblx0ICovXG5cdHZhciBzZXR0aW5nID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRTZXR0aW5nLCBvcHRpb25zKSxcblx0XHRtYXJrZXJzTWFwID0ge30sXG5cdFx0bWFya2Vyc0xpc3QgPSBbXSwgLy8gbGlzdCBvZiBtYXJrZXJzIHNvcnRlZCBieSB0aW1lXG5cdFx0dmlkZW9XcmFwcGVyID0gJCh0aGlzLmVsKCkpLFxuXHRcdGN1cnJlbnRNYXJrZXJJbmRleCA9IC0xLFxuXHRcdHBsYXllciA9IHRoaXMsXG5cdFx0bWFya2VyVGlwID0gbnVsbCxcblx0XHRicmVha092ZXJsYXkgPSBudWxsLFxuXHRcdG92ZXJsYXlJbmRleCA9IC0xO1xuXG5cdGZ1bmN0aW9uIHNvcnRNYXJrZXJzTGlzdCgpIHtcblx0XHQvLyBzb3J0IHRoZSBsaXN0IGJ5IHRpbWUgaW4gYXNjIG9yZGVyXG5cdFx0bWFya2Vyc0xpc3Quc29ydChmdW5jdGlvbihhLCBiKSB7XG5cdFx0XHRyZXR1cm4gc2V0dGluZy5tYXJrZXJUaXAudGltZShhKSAtIHNldHRpbmcubWFya2VyVGlwLnRpbWUoYik7XG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBhZGRNYXJrZXJzKG5ld01hcmtlcnMpIHtcblx0XHQvLyBjcmVhdGUgdGhlIG1hcmtlcnNcblx0XHQkLmVhY2gobmV3TWFya2VycywgZnVuY3Rpb24oaW5kZXgsIG1hcmtlcikge1xuXHRcdFx0bWFya2VyLmtleSA9IGdlbmVyYXRlVVVJRCgpO1xuXG5cdFx0XHR2aWRlb1dyYXBwZXIuZmluZCgnLnZqcy1wcm9ncmVzcy1jb250cm9sIC52anMtc2xpZGVyJykuYXBwZW5kKFxuXHRcdFx0XHRjcmVhdGVNYXJrZXJEaXYobWFya2VyKSk7XG5cblx0XHRcdC8vIHN0b3JlIG1hcmtlciBpbiBhbiBpbnRlcm5hbCBoYXNoIG1hcFxuXHRcdFx0bWFya2Vyc01hcFttYXJrZXIua2V5XSA9IG1hcmtlcjtcblx0XHRcdG1hcmtlcnNMaXN0LnB1c2gobWFya2VyKTtcblx0XHR9KTtcblxuXHRcdHNvcnRNYXJrZXJzTGlzdCgpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0UG9zaXRpb24obWFya2VyKSB7XG5cdFx0cmV0dXJuIChzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcikgLyBwbGF5ZXIuZHVyYXRpb24oKSkgKiAxMDBcblx0fVxuXG5cdGZ1bmN0aW9uIGNyZWF0ZU1hcmtlckRpdihtYXJrZXIsIGR1cmF0aW9uKSB7XG5cdFx0dmFyIG1hcmtlckRpdiA9ICQoXCI8ZGl2IGNsYXNzPSd2anMtbWFya2VyJz48L2Rpdj5cIilcblx0XHRtYXJrZXJEaXYuY3NzKHNldHRpbmcubWFya2VyU3R5bGUpXG5cdFx0XHQuY3NzKHtcblx0XHRcdFx0Ly8gXCJtYXJnaW4tbGVmdFwiOiAtcGFyc2VGbG9hdChtYXJrZXJEaXYuY3NzKFwid2lkdGhcIikpIC8gMiArICdweCcsXG5cdFx0XHRcdFwibGVmdFwiOiBnZXRQb3NpdGlvbihtYXJrZXIpICsgJyUnXG5cdFx0XHR9KVxuXHRcdFx0LmF0dHIoXCJkYXRhLW1hcmtlci1rZXlcIiwgbWFya2VyLmtleSlcblx0XHRcdC5hdHRyKFwiZGF0YS1tYXJrZXItdGltZVwiLCBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcikpO1xuXG5cdFx0Ly8gYWRkIHVzZXItZGVmaW5lZCBjbGFzcyB0byBtYXJrZXJcblx0XHRpZiAobWFya2VyLmNsYXNzKSB7XG5cdFx0XHRtYXJrZXJEaXYuYWRkQ2xhc3MobWFya2VyLmNsYXNzKTtcblx0XHR9XG5cblx0XHQvLyBiaW5kIGNsaWNrIGV2ZW50IHRvIHNlZWsgdG8gbWFya2VyIHRpbWVcblx0XHRtYXJrZXJEaXYub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuXG5cdFx0XHR2YXIgcHJldmVudERlZmF1bHQgPSBmYWxzZTtcblx0XHRcdGlmICh0eXBlb2Ygc2V0dGluZy5vbk1hcmtlckNsaWNrID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0Ly8gaWYgcmV0dXJuIGZhbHNlLCBwcmV2ZW50IGRlZmF1bHQgYmVoYXZpb3Jcblx0XHRcdFx0cHJldmVudERlZmF1bHQgPSBzZXR0aW5nLm9uTWFya2VyQ2xpY2sobWFya2VyKSA9PSBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCFwcmV2ZW50RGVmYXVsdCkge1xuXHRcdFx0XHR2YXIga2V5ID0gJCh0aGlzKS5kYXRhKCdtYXJrZXIta2V5Jyk7XG5cdFx0XHRcdHBsYXllci5jdXJyZW50VGltZShzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcnNNYXBba2V5XSkpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0aWYgKHNldHRpbmcubWFya2VyVGlwLmRpc3BsYXkpIHtcblx0XHRcdHJlZ2lzdGVyTWFya2VyVGlwSGFuZGxlcihtYXJrZXJEaXYpO1xuXHRcdH1cblxuXHRcdHJldHVybiBtYXJrZXJEaXY7XG5cdH1cblxuXHRmdW5jdGlvbiB1cGRhdGVNYXJrZXJzKCkge1xuXHRcdC8vIHVwZGF0ZSBVSSBmb3IgbWFya2VycyB3aG9zZSB0aW1lIGNoYW5nZWRcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbWFya2Vyc0xpc3QubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBtYXJrZXIgPSBtYXJrZXJzTGlzdFtpXTtcblx0XHRcdHZhciBtYXJrZXJEaXYgPSB2aWRlb1dyYXBwZXIuZmluZChcIi52anMtbWFya2VyW2RhdGEtbWFya2VyLWtleT0nXCIgKyBtYXJrZXIua2V5ICsgXCInXVwiKTtcblx0XHRcdHZhciBtYXJrZXJUaW1lID0gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXIpO1xuXG5cdFx0XHRpZiAobWFya2VyRGl2LmRhdGEoJ21hcmtlci10aW1lJykgIT0gbWFya2VyVGltZSkge1xuXHRcdFx0XHRtYXJrZXJEaXYuY3NzKHtcblx0XHRcdFx0XHRcdFwibGVmdFwiOiBnZXRQb3NpdGlvbihtYXJrZXIpICsgJyUnXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQuYXR0cihcImRhdGEtbWFya2VyLXRpbWVcIiwgbWFya2VyVGltZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHNvcnRNYXJrZXJzTGlzdCgpO1xuXHR9XG5cblx0ZnVuY3Rpb24gcmVtb3ZlTWFya2VycyhpbmRleEFycmF5KSB7XG5cdFx0Ly8gcmVzZXQgb3ZlcmxheVxuXHRcdGlmIChicmVha092ZXJsYXkpIHtcblx0XHRcdG92ZXJsYXlJbmRleCA9IC0xO1xuXHRcdFx0YnJlYWtPdmVybGF5LmNzcyhcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG5cdFx0fVxuXHRcdGN1cnJlbnRNYXJrZXJJbmRleCA9IC0xO1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBpbmRleEFycmF5Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgaW5kZXggPSBpbmRleEFycmF5W2ldO1xuXHRcdFx0dmFyIG1hcmtlciA9IG1hcmtlcnNMaXN0W2luZGV4XTtcblx0XHRcdGlmIChtYXJrZXIpIHtcblx0XHRcdFx0Ly8gZGVsZXRlIGZyb20gbWVtb3J5XG5cdFx0XHRcdGRlbGV0ZSBtYXJrZXJzTWFwW21hcmtlci5rZXldO1xuXHRcdFx0XHRtYXJrZXJzTGlzdFtpbmRleF0gPSBudWxsO1xuXG5cdFx0XHRcdC8vIGRlbGV0ZSBmcm9tIGRvbVxuXHRcdFx0XHR2aWRlb1dyYXBwZXIuZmluZChcIi52anMtbWFya2VyW2RhdGEtbWFya2VyLWtleT0nXCIgKyBtYXJrZXIua2V5ICsgXCInXVwiKS5yZW1vdmUoKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBjbGVhbiB1cCBhcnJheVxuXHRcdGZvciAodmFyIGkgPSBtYXJrZXJzTGlzdC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0aWYgKG1hcmtlcnNMaXN0W2ldID09PSBudWxsKSB7XG5cdFx0XHRcdG1hcmtlcnNMaXN0LnNwbGljZShpLCAxKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBzb3J0IGFnYWluXG5cdFx0c29ydE1hcmtlcnNMaXN0KCk7XG5cdH1cblxuXG5cdC8vIGF0dGFjaCBob3ZlciBldmVudCBoYW5kbGVyXG5cdGZ1bmN0aW9uIHJlZ2lzdGVyTWFya2VyVGlwSGFuZGxlcihtYXJrZXJEaXYpIHtcblxuXHRcdG1hcmtlckRpdi5vbignbW91c2VvdmVyJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbWFya2VyID0gbWFya2Vyc01hcFskKHRoaXMpLmRhdGEoJ21hcmtlci1rZXknKV07XG5cblx0XHRcdG1hcmtlclRpcC5maW5kKCcudmpzLXRpcC1pbm5lcicpLmh0bWwoc2V0dGluZy5tYXJrZXJUaXAudGV4dChtYXJrZXIpKTtcblxuXHRcdFx0Ly8gbWFyZ2luLWxlZnQgbmVlZHMgdG8gbWludXMgdGhlIHBhZGRpbmcgbGVuZ3RoIHRvIGFsaWduIGNvcnJlY3RseSB3aXRoIHRoZSBtYXJrZXJcblx0XHRcdG1hcmtlclRpcC5jc3Moe1xuXHRcdFx0XHRcImxlZnRcIjogZ2V0UG9zaXRpb24obWFya2VyKSArICclJyxcblx0XHRcdFx0XCJtYXJnaW4tbGVmdFwiOiAtcGFyc2VGbG9hdChtYXJrZXJUaXAuY3NzKFwid2lkdGhcIikpIC8gMiAtIDUgKyAncHgnLFxuXHRcdFx0XHRcInZpc2liaWxpdHlcIjogXCJ2aXNpYmxlXCJcblx0XHRcdH0pO1xuXG5cdFx0fSkub24oJ21vdXNlb3V0JywgZnVuY3Rpb24oKSB7XG5cdFx0XHRtYXJrZXJUaXAuY3NzKFwidmlzaWJpbGl0eVwiLCBcImhpZGRlblwiKTtcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIGluaXRpYWxpemVNYXJrZXJUaXAoKSB7XG5cdFx0bWFya2VyVGlwID0gJChcIjxkaXYgY2xhc3M9J3Zqcy10aXAnPjxkaXYgY2xhc3M9J3Zqcy10aXAtYXJyb3cnPjwvZGl2PjxkaXYgY2xhc3M9J3Zqcy10aXAtaW5uZXInPjwvZGl2PjwvZGl2PlwiKTtcblx0XHR2aWRlb1dyYXBwZXIuZmluZCgnLnZqcy1wcm9ncmVzcy1jb250cm9sIC52anMtc2xpZGVyJykuYXBwZW5kKG1hcmtlclRpcCk7XG5cdH1cblxuXHQvLyBzaG93IG9yIGhpZGUgYnJlYWsgb3ZlcmxheXNcblx0ZnVuY3Rpb24gdXBkYXRlQnJlYWtPdmVybGF5KCkge1xuXHRcdGlmICghc2V0dGluZy5icmVha092ZXJsYXkuZGlzcGxheSB8fCBjdXJyZW50TWFya2VySW5kZXggPCAwKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIGN1cnJlbnRUaW1lID0gcGxheWVyLmN1cnJlbnRUaW1lKCk7XG5cdFx0dmFyIG1hcmtlciA9IG1hcmtlcnNMaXN0W2N1cnJlbnRNYXJrZXJJbmRleF07XG5cdFx0dmFyIG1hcmtlclRpbWUgPSBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcik7XG5cblx0XHRpZiAoY3VycmVudFRpbWUgPj0gbWFya2VyVGltZSAmJlxuXHRcdFx0Y3VycmVudFRpbWUgPD0gKG1hcmtlclRpbWUgKyBzZXR0aW5nLmJyZWFrT3ZlcmxheS5kaXNwbGF5VGltZSkpIHtcblx0XHRcdGlmIChvdmVybGF5SW5kZXggIT0gY3VycmVudE1hcmtlckluZGV4KSB7XG5cdFx0XHRcdG92ZXJsYXlJbmRleCA9IGN1cnJlbnRNYXJrZXJJbmRleDtcblx0XHRcdFx0YnJlYWtPdmVybGF5LmZpbmQoJy52anMtYnJlYWstb3ZlcmxheS10ZXh0JykuaHRtbChzZXR0aW5nLmJyZWFrT3ZlcmxheS50ZXh0KG1hcmtlcikpO1xuXHRcdFx0fVxuXG5cdFx0XHRicmVha092ZXJsYXkuY3NzKCd2aXNpYmlsaXR5JywgXCJ2aXNpYmxlXCIpO1xuXG5cdFx0fSBlbHNlIHtcblx0XHRcdG92ZXJsYXlJbmRleCA9IC0xO1xuXHRcdFx0YnJlYWtPdmVybGF5LmNzcyhcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG5cdFx0fVxuXHR9XG5cblx0Ly8gcHJvYmxlbSB3aGVuIHRoZSBuZXh0IG1hcmtlciBpcyB3aXRoaW4gdGhlIG92ZXJsYXkgZGlzcGxheSB0aW1lIGZyb20gdGhlIHByZXZpb3VzIG1hcmtlclxuXHRmdW5jdGlvbiBpbml0aWFsaXplT3ZlcmxheSgpIHtcblx0XHRicmVha092ZXJsYXkgPSAkKFwiPGRpdiBjbGFzcz0ndmpzLWJyZWFrLW92ZXJsYXknPjxkaXYgY2xhc3M9J3Zqcy1icmVhay1vdmVybGF5LXRleHQnPjwvZGl2PjwvZGl2PlwiKVxuXHRcdFx0LmNzcyhzZXR0aW5nLmJyZWFrT3ZlcmxheS5zdHlsZSk7XG5cdFx0dmlkZW9XcmFwcGVyLmFwcGVuZChicmVha092ZXJsYXkpO1xuXHRcdG92ZXJsYXlJbmRleCA9IC0xO1xuXHR9XG5cblx0ZnVuY3Rpb24gb25UaW1lVXBkYXRlKCkge1xuXHRcdG9uVXBkYXRlTWFya2VyKCk7XG5cdFx0dXBkYXRlQnJlYWtPdmVybGF5KCk7XG5cdH1cblxuXHRmdW5jdGlvbiBvblVwZGF0ZU1hcmtlcigpIHtcblx0XHQvKlxuXHRcdCAgICBjaGVjayBtYXJrZXIgcmVhY2hlZCBpbiBiZXR3ZWVuIG1hcmtlcnNcblx0XHQgICAgdGhlIGxvZ2ljIGhlcmUgaXMgdGhhdCBpdCB0cmlnZ2VycyBhIG5ldyBtYXJrZXIgcmVhY2hlZCBldmVudCBvbmx5IGlmIHRoZSBwbGF5ZXIgXG5cdFx0ICAgIGVudGVycyBhIG5ldyBtYXJrZXIgcmFuZ2UgKGUuZy4gZnJvbSBtYXJrZXIgMSB0byBtYXJrZXIgMikuIFRodXMsIGlmIHBsYXllciBpcyBvbiBtYXJrZXIgMSBhbmQgdXNlciBjbGlja2VkIG9uIG1hcmtlciAxIGFnYWluLCBubyBuZXcgcmVhY2hlZCBldmVudCBpcyB0cmlnZ2VyZWQpXG5cdFx0Ki9cblxuXHRcdHZhciBnZXROZXh0TWFya2VyVGltZSA9IGZ1bmN0aW9uKGluZGV4KSB7XG5cdFx0XHRpZiAoaW5kZXggPCBtYXJrZXJzTGlzdC5sZW5ndGggLSAxKSB7XG5cdFx0XHRcdHJldHVybiBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcnNMaXN0W2luZGV4ICsgMV0pO1xuXHRcdFx0fVxuXHRcdFx0Ly8gbmV4dCBtYXJrZXIgdGltZSBvZiBsYXN0IG1hcmtlciB3b3VsZCBiZSBlbmQgb2YgdmlkZW8gdGltZVxuXHRcdFx0cmV0dXJuIHBsYXllci5kdXJhdGlvbigpO1xuXHRcdH1cblx0XHR2YXIgY3VycmVudFRpbWUgPSBwbGF5ZXIuY3VycmVudFRpbWUoKTtcblx0XHR2YXIgbmV3TWFya2VySW5kZXg7XG5cblx0XHRpZiAoY3VycmVudE1hcmtlckluZGV4ICE9IC0xKSB7XG5cdFx0XHQvLyBjaGVjayBpZiBzdGF5aW5nIGF0IHNhbWUgbWFya2VyXG5cdFx0XHR2YXIgbmV4dE1hcmtlclRpbWUgPSBnZXROZXh0TWFya2VyVGltZShjdXJyZW50TWFya2VySW5kZXgpO1xuXHRcdFx0aWYgKGN1cnJlbnRUaW1lID49IHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2Vyc0xpc3RbY3VycmVudE1hcmtlckluZGV4XSkgJiZcblx0XHRcdFx0Y3VycmVudFRpbWUgPCBuZXh0TWFya2VyVGltZSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIGNoZWNrIGZvciBlbmRpbmcgKGF0IHRoZSBlbmQgY3VycmVudCB0aW1lIGVxdWFscyBwbGF5ZXIgZHVyYXRpb24pXG5cdFx0XHRpZiAoY3VycmVudE1hcmtlckluZGV4ID09PSBtYXJrZXJzTGlzdC5sZW5ndGggLSAxICYmXG5cdFx0XHRcdGN1cnJlbnRUaW1lID09PSBwbGF5ZXIuZHVyYXRpb24oKSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gY2hlY2sgZmlyc3QgbWFya2VyLCBubyBtYXJrZXIgaXMgc2VsZWN0ZWRcblx0XHRpZiAobWFya2Vyc0xpc3QubGVuZ3RoID4gMCAmJlxuXHRcdFx0Y3VycmVudFRpbWUgPCBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcnNMaXN0WzBdKSkge1xuXHRcdFx0bmV3TWFya2VySW5kZXggPSAtMTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gbG9vayBmb3IgbmV3IGluZGV4XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG1hcmtlcnNMaXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdG5leHRNYXJrZXJUaW1lID0gZ2V0TmV4dE1hcmtlclRpbWUoaSk7XG5cblx0XHRcdFx0aWYgKGN1cnJlbnRUaW1lID49IHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2Vyc0xpc3RbaV0pICYmXG5cdFx0XHRcdFx0Y3VycmVudFRpbWUgPCBuZXh0TWFya2VyVGltZSkge1xuXHRcdFx0XHRcdG5ld01hcmtlckluZGV4ID0gaTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIHNldCBuZXcgbWFya2VyIGluZGV4XG5cdFx0aWYgKG5ld01hcmtlckluZGV4ICE9IGN1cnJlbnRNYXJrZXJJbmRleCkge1xuXHRcdFx0Ly8gdHJpZ2dlciBldmVudFxuXHRcdFx0aWYgKG5ld01hcmtlckluZGV4ICE9IC0xICYmIG9wdGlvbnMub25NYXJrZXJSZWFjaGVkKSB7XG5cdFx0XHRcdG9wdGlvbnMub25NYXJrZXJSZWFjaGVkKG1hcmtlcnNMaXN0W25ld01hcmtlckluZGV4XSk7XG5cdFx0XHR9XG5cdFx0XHRjdXJyZW50TWFya2VySW5kZXggPSBuZXdNYXJrZXJJbmRleDtcblx0XHR9XG5cblx0fVxuXG5cdC8vIHNldHVwIHRoZSB3aG9sZSB0aGluZ1xuXHRmdW5jdGlvbiBpbml0aWFsaXplKCkge1xuXHRcdGlmIChzZXR0aW5nLm1hcmtlclRpcC5kaXNwbGF5KSB7XG5cdFx0XHRpbml0aWFsaXplTWFya2VyVGlwKCk7XG5cdFx0fVxuXG5cdFx0Ly8gcmVtb3ZlIGV4aXN0aW5nIG1hcmtlcnMgaWYgYWxyZWFkeSBpbml0aWFsaXplZFxuXHRcdHBsYXllci5tYXJrZXJzLnJlbW92ZUFsbCgpO1xuXHRcdGFkZE1hcmtlcnMob3B0aW9ucy5tYXJrZXJzKTtcblxuXHRcdGlmIChzZXR0aW5nLmJyZWFrT3ZlcmxheS5kaXNwbGF5KSB7XG5cdFx0XHRpbml0aWFsaXplT3ZlcmxheSgpO1xuXHRcdH1cblx0XHRvblRpbWVVcGRhdGUoKTtcblx0XHRwbGF5ZXIub24oXCJ0aW1ldXBkYXRlXCIsIG9uVGltZVVwZGF0ZSk7XG5cdH1cblxuXHQvLyBzZXR1cCB0aGUgcGx1Z2luIGFmdGVyIHdlIGxvYWRlZCB2aWRlbydzIG1ldGEgZGF0YVxuXHRwbGF5ZXIub24oXCJsb2FkZWRtZXRhZGF0YVwiLCBmdW5jdGlvbigpIHtcblx0XHRpbml0aWFsaXplKCk7XG5cdH0pO1xuXG5cdC8vIGV4cG9zZWQgcGx1Z2luIEFQSVxuXHRwbGF5ZXIubWFya2VycyA9IHtcblx0XHRnZXRNYXJrZXJzOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBtYXJrZXJzTGlzdDtcblx0XHR9LFxuXHRcdG5leHQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gZ28gdG8gdGhlIG5leHQgbWFya2VyIGZyb20gY3VycmVudCB0aW1lc3RhbXBcblx0XHRcdHZhciBjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBtYXJrZXJzTGlzdC5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHR2YXIgbWFya2VyVGltZSA9IHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2Vyc0xpc3RbaV0pO1xuXHRcdFx0XHRpZiAobWFya2VyVGltZSA+IGN1cnJlbnRUaW1lKSB7XG5cdFx0XHRcdFx0cGxheWVyLmN1cnJlbnRUaW1lKG1hcmtlclRpbWUpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRwcmV2OiBmdW5jdGlvbigpIHtcblx0XHRcdC8vIGdvIHRvIHByZXZpb3VzIG1hcmtlclxuXHRcdFx0dmFyIGN1cnJlbnRUaW1lID0gcGxheWVyLmN1cnJlbnRUaW1lKCk7XG5cdFx0XHRmb3IgKHZhciBpID0gbWFya2Vyc0xpc3QubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcblx0XHRcdFx0dmFyIG1hcmtlclRpbWUgPSBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcnNMaXN0W2ldKTtcblx0XHRcdFx0Ly8gYWRkIGEgdGhyZXNob2xkXG5cdFx0XHRcdGlmIChtYXJrZXJUaW1lICsgMC41IDwgY3VycmVudFRpbWUpIHtcblx0XHRcdFx0XHRwbGF5ZXIuY3VycmVudFRpbWUobWFya2VyVGltZSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXHRcdGFkZDogZnVuY3Rpb24obmV3TWFya2Vycykge1xuXHRcdFx0Ly8gYWRkIG5ldyBtYXJrZXJzIGdpdmVuIGFuIGFycmF5IG9mIGluZGV4XG5cdFx0XHRhZGRNYXJrZXJzKG5ld01hcmtlcnMpO1xuXHRcdH0sXG5cdFx0cmVtb3ZlOiBmdW5jdGlvbihpbmRleEFycmF5KSB7XG5cdFx0XHQvLyByZW1vdmUgbWFya2VycyBnaXZlbiBhbiBhcnJheSBvZiBpbmRleFxuXHRcdFx0cmVtb3ZlTWFya2VycyhpbmRleEFycmF5KTtcblx0XHR9LFxuXHRcdHJlbW92ZUFsbDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgaW5kZXhBcnJheSA9IFtdO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBtYXJrZXJzTGlzdC5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpbmRleEFycmF5LnB1c2goaSk7XG5cdFx0XHR9XG5cdFx0XHRyZW1vdmVNYXJrZXJzKGluZGV4QXJyYXkpO1xuXHRcdH0sXG5cdFx0dXBkYXRlVGltZTogZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBub3RpZnkgdGhlIHBsdWdpbiB0byB1cGRhdGUgdGhlIFVJIGZvciBjaGFuZ2VzIGluIG1hcmtlciB0aW1lcyBcblx0XHRcdHVwZGF0ZU1hcmtlcnMoKTtcblx0XHR9LFxuXHRcdHJlc2V0OiBmdW5jdGlvbihuZXdNYXJrZXJzKSB7XG5cdFx0XHQvLyByZW1vdmUgYWxsIHRoZSBleGlzdGluZyBtYXJrZXJzIGFuZCBhZGQgbmV3IG9uZXNcblx0XHRcdHBsYXllci5tYXJrZXJzLnJlbW92ZUFsbCgpO1xuXHRcdFx0YWRkTWFya2VycyhuZXdNYXJrZXJzKTtcblx0XHR9LFxuXHRcdGRlc3Ryb3k6IGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gdW5yZWdpc3RlciB0aGUgcGx1Z2lucyBhbmQgY2xlYW4gdXAgZXZlbiBoYW5kbGVyc1xuXHRcdFx0cGxheWVyLm1hcmtlcnMucmVtb3ZlQWxsKCk7XG5cdFx0XHRicmVha092ZXJsYXkucmVtb3ZlKCk7XG5cdFx0XHRtYXJrZXJUaXAucmVtb3ZlKCk7XG5cdFx0XHRwbGF5ZXIub2ZmKFwidGltZXVwZGF0ZVwiLCB1cGRhdGVCcmVha092ZXJsYXkpO1xuXHRcdFx0ZGVsZXRlIHBsYXllci5tYXJrZXJzO1xuXHRcdH0sXG5cdH07XG5cbn07XG5cbi8vIOawtOWNsFxuY29uc3Qgd2F0ZXJNYXJrID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHR2YXIgZGVmYXVsdHMgPSB7XG5cdFx0XHRmaWxlOiAnT3duZWRfU3RhbXAucG5nJyxcblx0XHRcdHhwb3M6IDAsXG5cdFx0XHR5cG9zOiAwLFxuXHRcdFx0eHJlcGVhdDogMCxcblx0XHRcdG9wYWNpdHk6IDEwMCxcblx0XHRcdGNsaWNrYWJsZTogZmFsc2UsXG5cdFx0XHR1cmw6IFwiXCIsXG5cdFx0XHRjbGFzc05hbWU6ICd2anMtd2F0ZXJtYXJrJyxcblx0XHRcdHRleHQ6IGZhbHNlLFxuXHRcdFx0ZGVidWc6IGZhbHNlXG5cdFx0fSxcblx0XHRleHRlbmQgPSBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBhcmdzLCB0YXJnZXQsIGksIG9iamVjdCwgcHJvcGVydHk7XG5cdFx0XHRhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcblx0XHRcdHRhcmdldCA9IGFyZ3Muc2hpZnQoKSB8fCB7fTtcblx0XHRcdGZvciAoaSBpbiBhcmdzKSB7XG5cdFx0XHRcdG9iamVjdCA9IGFyZ3NbaV07XG5cdFx0XHRcdGZvciAocHJvcGVydHkgaW4gb2JqZWN0KSB7XG5cdFx0XHRcdFx0aWYgKG9iamVjdC5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpIHtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2Ygb2JqZWN0W3Byb3BlcnR5XSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0W3Byb3BlcnR5XSA9IGV4dGVuZCh0YXJnZXRbcHJvcGVydHldLCBvYmplY3RbcHJvcGVydHldKTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHRhcmdldFtwcm9wZXJ0eV0gPSBvYmplY3RbcHJvcGVydHldO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRhcmdldDtcblx0XHR9O1xuXG5cdC8vISBnbG9iYWwgdmFyaWJsZSBjb250YWluaW5nIHJlZmVyZW5jZSB0byB0aGUgRE9NIGVsZW1lbnRcblx0dmFyIGRpdjtcblxuXG5cdGlmIChzZXR0aW5ncy5kZWJ1ZykgY29uc29sZS5sb2coJ3dhdGVybWFyazogUmVnaXN0ZXIgaW5pdCcpO1xuXG5cdHZhciBvcHRpb25zLCBwbGF5ZXIsIHZpZGVvLCBpbWcsIGxpbms7XG5cdG9wdGlvbnMgPSBleHRlbmQoZGVmYXVsdHMsIHNldHRpbmdzKTtcblxuXHQvKiBHcmFiIHRoZSBuZWNlc3NhcnkgRE9NIGVsZW1lbnRzICovXG5cdHBsYXllciA9IHRoaXMuZWwoKTtcblx0dmlkZW8gPSB0aGlzLmVsKCkuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3ZpZGVvJylbMF07XG5cblx0Ly8gY3JlYXRlIHRoZSB3YXRlcm1hcmsgZWxlbWVudFxuXHRpZiAoIWRpdikge1xuXHRcdGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdGRpdi5jbGFzc05hbWUgPSBvcHRpb25zLmNsYXNzTmFtZTtcblx0fSBlbHNlIHtcblx0XHQvLyEgaWYgZGl2IGFscmVhZHkgZXhpc3RzLCBlbXB0eSBpdFxuXHRcdGRpdi5pbm5lckhUTUwgPSAnJztcblx0fVxuXG5cdC8vIGlmIHRleHQgaXMgc2V0LCBkaXNwbGF5IHRleHRcblx0aWYgKG9wdGlvbnMudGV4dClcblx0XHRkaXYudGV4dENvbnRlbnQgPSBvcHRpb25zLnRleHQ7XG5cblx0Ly8gaWYgaW1nIGlzIHNldCwgYWRkIGltZ1xuXHRpZiAob3B0aW9ucy5maWxlKSB7XG5cdFx0aW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG5cdFx0ZGl2LmFwcGVuZENoaWxkKGltZyk7XG5cdFx0aW1nLnNyYyA9IG9wdGlvbnMuZmlsZTtcblx0fVxuXG5cdC8vaW1nLnN0eWxlLmJvdHRvbSA9IFwiMFwiO1xuXHQvL2ltZy5zdHlsZS5yaWdodCA9IFwiMFwiO1xuXHRpZiAoKG9wdGlvbnMueXBvcyA9PT0gMCkgJiYgKG9wdGlvbnMueHBvcyA9PT0gMCkpIC8vIFRvcCBsZWZ0XG5cdHtcblx0XHRkaXYuc3R5bGUudG9wID0gXCIwXCI7XG5cdFx0ZGl2LnN0eWxlLmxlZnQgPSBcIjBcIjtcblx0fSBlbHNlIGlmICgob3B0aW9ucy55cG9zID09PSAwKSAmJiAob3B0aW9ucy54cG9zID09PSAxMDApKSAvLyBUb3AgcmlnaHRcblx0e1xuXHRcdGRpdi5zdHlsZS50b3AgPSBcIjBcIjtcblx0XHRkaXYuc3R5bGUucmlnaHQgPSBcIjBcIjtcblx0fSBlbHNlIGlmICgob3B0aW9ucy55cG9zID09PSAxMDApICYmIChvcHRpb25zLnhwb3MgPT09IDEwMCkpIC8vIEJvdHRvbSByaWdodFxuXHR7XG5cdFx0ZGl2LnN0eWxlLmJvdHRvbSA9IFwiMFwiO1xuXHRcdGRpdi5zdHlsZS5yaWdodCA9IFwiMFwiO1xuXHR9IGVsc2UgaWYgKChvcHRpb25zLnlwb3MgPT09IDEwMCkgJiYgKG9wdGlvbnMueHBvcyA9PT0gMCkpIC8vIEJvdHRvbSBsZWZ0XG5cdHtcblx0XHRkaXYuc3R5bGUuYm90dG9tID0gXCIwXCI7XG5cdFx0ZGl2LnN0eWxlLmxlZnQgPSBcIjBcIjtcblx0fSBlbHNlIGlmICgob3B0aW9ucy55cG9zID09PSA1MCkgJiYgKG9wdGlvbnMueHBvcyA9PT0gNTApKSAvLyBDZW50ZXJcblx0e1xuXHRcdGlmIChvcHRpb25zLmRlYnVnKSBjb25zb2xlLmxvZygnd2F0ZXJtYXJrOiBwbGF5ZXI6JyArIHBsYXllci53aWR0aCArICd4JyArIHBsYXllci5oZWlnaHQpO1xuXHRcdGlmIChvcHRpb25zLmRlYnVnKSBjb25zb2xlLmxvZygnd2F0ZXJtYXJrOiB2aWRlbzonICsgdmlkZW8udmlkZW9XaWR0aCArICd4JyArIHZpZGVvLnZpZGVvSGVpZ2h0KTtcblx0XHRpZiAob3B0aW9ucy5kZWJ1ZykgY29uc29sZS5sb2coJ3dhdGVybWFyazogaW1hZ2U6JyArIGltZy53aWR0aCArICd4JyArIGltZy5oZWlnaHQpO1xuXHRcdGRpdi5zdHlsZS50b3AgPSAodGhpcy5oZWlnaHQoKSAvIDIpICsgXCJweFwiO1xuXHRcdGRpdi5zdHlsZS5sZWZ0ID0gKHRoaXMud2lkdGgoKSAvIDIpICsgXCJweFwiO1xuXHR9XG5cdGRpdi5zdHlsZS5vcGFjaXR5ID0gb3B0aW9ucy5vcGFjaXR5O1xuXG5cdC8vZGl2LnN0eWxlLmJhY2tncm91bmRJbWFnZSA9IFwidXJsKFwiK29wdGlvbnMuZmlsZStcIilcIjtcblx0Ly9kaXYuc3R5bGUuYmFja2dyb3VuZFBvc2l0aW9uLnggPSBvcHRpb25zLnhwb3MrXCIlXCI7XG5cdC8vZGl2LnN0eWxlLmJhY2tncm91bmRQb3NpdGlvbi55ID0gb3B0aW9ucy55cG9zK1wiJVwiO1xuXHQvL2Rpdi5zdHlsZS5iYWNrZ3JvdW5kUmVwZWF0ID0gb3B0aW9ucy54cmVwZWF0O1xuXHQvL2Rpdi5zdHlsZS5vcGFjaXR5ID0gKG9wdGlvbnMub3BhY2l0eS8xMDApO1xuXG5cdC8vaWYgdXNlciB3YW50cyB3YXRlcm1hcmsgdG8gYmUgY2xpY2thYmxlLCBhZGQgYW5jaG9yIGVsZW1cblx0Ly90b2RvOiBjaGVjayBpZiBvcHRpb25zLnVybCBpcyBhbiBhY3R1YWwgdXJsP1xuXHRpZiAob3B0aW9ucy5jbGlja2FibGUgJiYgb3B0aW9ucy51cmwgIT09IFwiXCIpIHtcblx0XHRsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIik7XG5cdFx0bGluay5ocmVmID0gb3B0aW9ucy51cmw7XG5cdFx0bGluay50YXJnZXQgPSBcIl9ibGFua1wiO1xuXHRcdGxpbmsuYXBwZW5kQ2hpbGQoZGl2KTtcblx0XHQvL2FkZCBjbGlja2FibGUgd2F0ZXJtYXJrIHRvIHRoZSBwbGF5ZXJcblx0XHRwbGF5ZXIuYXBwZW5kQ2hpbGQobGluayk7XG5cdH0gZWxzZSB7XG5cdFx0Ly9hZGQgbm9ybWFsIHdhdGVybWFyayB0byB0aGUgcGxheWVyXG5cdFx0cGxheWVyLmFwcGVuZENoaWxkKGRpdik7XG5cdH1cblxuXHRpZiAob3B0aW9ucy5kZWJ1ZykgY29uc29sZS5sb2coJ3dhdGVybWFyazogUmVnaXN0ZXIgZW5kJyk7XG5cbn07XG5cbi8vIFJlZ2lzdGVyIHRoZSBwbHVnaW4gd2l0aCB2aWRlby5qcy5cbnZpZGVvanMucGx1Z2luKCdvcGVuJywgb3Blbik7XG52aWRlb2pzLnBsdWdpbigndmlkZW9Kc1Jlc29sdXRpb25Td2l0Y2hlcicsIHZpZGVvSnNSZXNvbHV0aW9uU3dpdGNoZXIpO1xudmlkZW9qcy5wbHVnaW4oJ2Rpc2FibGVQcm9ncmVzcycsIGRpc2FibGVQcm9ncmVzcyk7XG52aWRlb2pzLnBsdWdpbignbWFya2VycycsIG1hcmtlcnMpO1xudmlkZW9qcy5wbHVnaW4oJ3dhdGVyTWFyaycsIHdhdGVyTWFyayk7XG5cbi8vIEluY2x1ZGUgdGhlIHZlcnNpb24gbnVtYmVyLlxub3Blbi5WRVJTSU9OID0gJ19fVkVSU0lPTl9fJztcblxuZXhwb3J0IGRlZmF1bHQgb3BlbjsiLCJpbXBvcnQgZG9jdW1lbnQgZnJvbSAnZ2xvYmFsL2RvY3VtZW50JztcblxuaW1wb3J0IFFVbml0IGZyb20gJ3F1bml0JztcbmltcG9ydCBzaW5vbiBmcm9tICdzaW5vbic7XG5pbXBvcnQgdmlkZW9qcyBmcm9tICd2aWRlby5qcyc7XG5cbmltcG9ydCBwbHVnaW4gZnJvbSAnLi4vc3JjL3BsdWdpbic7XG5cbmNvbnN0IFBsYXllciA9IHZpZGVvanMuZ2V0Q29tcG9uZW50KCdQbGF5ZXInKTtcblxuUVVuaXQudGVzdCgndGhlIGVudmlyb25tZW50IGlzIHNhbmUnLCBmdW5jdGlvbihhc3NlcnQpIHtcbiAgYXNzZXJ0LnN0cmljdEVxdWFsKHR5cGVvZiBBcnJheS5pc0FycmF5LCAnZnVuY3Rpb24nLCAnZXM1IGV4aXN0cycpO1xuICBhc3NlcnQuc3RyaWN0RXF1YWwodHlwZW9mIHNpbm9uLCAnb2JqZWN0JywgJ3Npbm9uIGV4aXN0cycpO1xuICBhc3NlcnQuc3RyaWN0RXF1YWwodHlwZW9mIHZpZGVvanMsICdmdW5jdGlvbicsICd2aWRlb2pzIGV4aXN0cycpO1xuICBhc3NlcnQuc3RyaWN0RXF1YWwodHlwZW9mIHBsdWdpbiwgJ2Z1bmN0aW9uJywgJ3BsdWdpbiBpcyBhIGZ1bmN0aW9uJyk7XG59KTtcblxuUVVuaXQubW9kdWxlKCd2aWRlb2pzLW9wZW4nLCB7XG5cbiAgYmVmb3JlRWFjaCgpIHtcblxuICAgIC8vIE1vY2sgdGhlIGVudmlyb25tZW50J3MgdGltZXJzIGJlY2F1c2UgY2VydGFpbiB0aGluZ3MgLSBwYXJ0aWN1bGFybHlcbiAgICAvLyBwbGF5ZXIgcmVhZGluZXNzIC0gYXJlIGFzeW5jaHJvbm91cyBpbiB2aWRlby5qcyA1LiBUaGlzIE1VU1QgY29tZVxuICAgIC8vIGJlZm9yZSBhbnkgcGxheWVyIGlzIGNyZWF0ZWQ7IG90aGVyd2lzZSwgdGltZXJzIGNvdWxkIGdldCBjcmVhdGVkXG4gICAgLy8gd2l0aCB0aGUgYWN0dWFsIHRpbWVyIG1ldGhvZHMhXG4gICAgdGhpcy5jbG9jayA9IHNpbm9uLnVzZUZha2VUaW1lcnMoKTtcblxuICAgIHRoaXMuZml4dHVyZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdxdW5pdC1maXh0dXJlJyk7XG4gICAgdGhpcy52aWRlbyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3ZpZGVvJyk7XG4gICAgdGhpcy5maXh0dXJlLmFwcGVuZENoaWxkKHRoaXMudmlkZW8pO1xuICAgIHRoaXMucGxheWVyID0gdmlkZW9qcyh0aGlzLnZpZGVvKTtcbiAgfSxcblxuICBhZnRlckVhY2goKSB7XG4gICAgdGhpcy5wbGF5ZXIuZGlzcG9zZSgpO1xuICAgIHRoaXMuY2xvY2sucmVzdG9yZSgpO1xuICB9XG59KTtcblxuUVVuaXQudGVzdCgncmVnaXN0ZXJzIGl0c2VsZiB3aXRoIHZpZGVvLmpzJywgZnVuY3Rpb24oYXNzZXJ0KSB7XG4gIGFzc2VydC5leHBlY3QoMik7XG5cbiAgYXNzZXJ0LnN0cmljdEVxdWFsKFxuICAgIFBsYXllci5wcm90b3R5cGUub3BlbixcbiAgICBwbHVnaW4sXG4gICAgJ3ZpZGVvanMtb3BlbiBwbHVnaW4gd2FzIHJlZ2lzdGVyZWQnXG4gICk7XG5cbiAgdGhpcy5wbGF5ZXIub3BlbigpO1xuXG4gIC8vIFRpY2sgdGhlIGNsb2NrIGZvcndhcmQgZW5vdWdoIHRvIHRyaWdnZXIgdGhlIHBsYXllciB0byBiZSBcInJlYWR5XCIuXG4gIHRoaXMuY2xvY2sudGljaygxKTtcblxuICBhc3NlcnQub2soXG4gICAgdGhpcy5wbGF5ZXIuaGFzQ2xhc3MoJ3Zqcy1vcGVuJyksXG4gICAgJ3RoZSBwbHVnaW4gYWRkcyBhIGNsYXNzIHRvIHRoZSBwbGF5ZXInXG4gICk7XG59KTtcbiJdfQ==

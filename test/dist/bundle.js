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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2dsb2JhbC9kb2N1bWVudC5qcyIsIi9Vc2Vycy9vcGVuL0RvY3VtZW50cy9Xb3JrL1NvdXJjZVRyZWUvdmpzLW9wZW4vc3JjL3BsdWdpbi5qcyIsIi9Vc2Vycy9vcGVuL0RvY3VtZW50cy9Xb3JrL1NvdXJjZVRyZWUvdmpzLW9wZW4vdGVzdC9wbHVnaW4udGVzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOzs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozt1QkNmb0IsVUFBVTs7Ozs7QUFHOUIsSUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDOzs7Ozs7Ozs7Ozs7O0FBYXBCLElBQU0sYUFBYSxHQUFHLFNBQWhCLGFBQWEsQ0FBSSxNQUFNLEVBQUUsT0FBTyxFQUFLO0FBQzFDLE9BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7Q0FFNUIsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7QUFjRixJQUFNLElBQUksR0FBRyxTQUFQLElBQUksQ0FBWSxPQUFPLEVBQUU7OztBQUM5QixLQUFJLENBQUMsS0FBSyxDQUFDLFlBQU07QUFDaEIsZUFBYSxRQUFPLHFCQUFRLFlBQVksQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztFQUM3RCxDQUFDLENBQUM7Q0FDSCxDQUFDOzs7Ozs7O0FBT0YsSUFBTSx5QkFBeUIsR0FBRyxtQ0FBUyxPQUFPLEVBQUU7Ozs7Ozs7QUFPbkQsS0FBSSxRQUFRLEdBQUcscUJBQVEsWUFBWSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUM7S0FDckQsTUFBTSxHQUFHLElBQUk7S0FDYixVQUFVLEdBQUcsRUFBRTtLQUNmLGNB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YyxFQUFFOztBQUUzQixZQUFVLEVBQUEsc0JBQUc7Ozs7OztBQU1YLFFBQUksQ0FBQyxLQUFLLEdBQUcsbUJBQU0sYUFBYSxFQUFFLENBQUM7O0FBRW5DLFFBQUksQ0FBQyxPQUFPLEdBQUcsNEJBQVMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3hELFFBQUksQ0FBQyxLQUFLLEdBQUcsNEJBQVMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzdDLFFBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNyQyxRQUFJLENBQUMsTUFBTSxHQUFHLDBCQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztHQUNuQzs7QUFFRCxXQUFTLEVBQUEscUJBQUc7QUFDVixRQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ3RCLFFBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7R0FDdEI7Q0FDRixDQUFDLENBQUM7O0FBRUgsbUJBQU0sSUFBSSxDQUFDLGdDQUFnQyxFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQzVELFFBQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRWpCLFFBQU0sQ0FBQyxXQUFXLENBQ2hCLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSwwQkFFckIsb0NBQW9DLENBQ3JDLENBQUM7O0FBRUYsTUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQzs7O0FBR25CLE1BQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVuQixRQUFNLENBQUMsRUFBRSxDQUNQLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUNoQyx1Q0FBdUMsQ0FDeEMsQ0FBQztDQUNILENBQUMsQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIiLCJ2YXIgdG9wTGV2ZWwgPSB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6XG4gICAgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB7fVxudmFyIG1pbkRvYyA9IHJlcXVpcmUoJ21pbi1kb2N1bWVudCcpO1xuXG5pZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZG9jdW1lbnQ7XG59IGVsc2Uge1xuICAgIHZhciBkb2NjeSA9IHRvcExldmVsWydfX0dMT0JBTF9ET0NVTUVOVF9DQUNIRUA0J107XG5cbiAgICBpZiAoIWRvY2N5KSB7XG4gICAgICAgIGRvY2N5ID0gdG9wTGV2ZWxbJ19fR0xPQkFMX0RPQ1VNRU5UX0NBQ0hFQDQnXSA9IG1pbkRvYztcbiAgICB9XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGRvY2N5O1xufVxuIiwiaW1wb3J0IHZpZGVvanMgZnJvbSAndmlkZW8uanMnO1xuXG4vLyBEZWZhdWx0IG9wdGlvbnMgZm9yIHRoZSBwbHVnaW4uXG5jb25zdCBkZWZhdWx0cyA9IHt9O1xuXG4vKipcbiAqIEZ1bmN0aW9uIHRvIGludm9rZSB3aGVuIHRoZSBwbGF5ZXIgaXMgcmVhZHkuXG4gKlxuICogVGhpcyBpcyBhIGdyZWF0IHBsYWNlIGZvciB5b3VyIHBsdWdpbiB0byBpbml0aWFsaXplIGl0c2VsZi4gV2hlbiB0aGlzXG4gKiBmdW5jdGlvbiBpcyBjYWxsZWQsIHRoZSBwbGF5ZXIgd2lsbCBoYXZlIGl0cyBET00gYW5kIGNoaWxkIGNvbXBvbmVudHNcbiAqIGluIHBsYWNlLlxuICpcbiAqIEBmdW5jdGlvbiBvblBsYXllclJlYWR5XG4gKiBAcGFyYW0gICAge1BsYXllcn0gcGxheWVyXG4gKiBAcGFyYW0gICAge09iamVjdH0gW29wdGlvbnM9e31dXG4gKi9cbmNvbnN0IG9uUGxheWVyUmVhZHkgPSAocGxheWVyLCBvcHRpb25zKSA9PiB7XG5cdHBsYXllci5hZGRDbGFzcygndmpzLW9wZW4nKTtcblxufTtcblxuLyoqXG4gKiBBIHZpZGVvLmpzIHBsdWdpbi5cbiAqXG4gKiBJbiB0aGUgcGx1Z2luIGZ1bmN0aW9uLCB0aGUgdmFsdWUgb2YgYHRoaXNgIGlzIGEgdmlkZW8uanMgYFBsYXllcmBcbiAqIGluc3RhbmNlLiBZb3UgY2Fubm90IHJlbHkgb24gdGhlIHBsYXllciBiZWluZyBpbiBhIFwicmVhZHlcIiBzdGF0ZSBoZXJlLFxuICogZGVwZW5kaW5nIG9uIGhvdyB0aGUgcGx1Z2luIGlzIGludm9rZWQuIFRoaXMgbWF5IG9yIG1heSBub3QgYmUgaW1wb3J0YW50XG4gKiB0byB5b3U7IGlmIG5vdCwgcmVtb3ZlIHRoZSB3YWl0IGZvciBcInJlYWR5XCIhXG4gKlxuICogQGZ1bmN0aW9uIG9wZW5cbiAqIEBwYXJhbSAgICB7T2JqZWN0fSBbb3B0aW9ucz17fV1cbiAqICAgICAgICAgICBBbiBvYmplY3Qgb2Ygb3B0aW9ucyBsZWZ0IHRvIHRoZSBwbHVnaW4gYXV0aG9yIHRvIGRlZmluZS5cbiAqL1xuY29uc3Qgb3BlbiA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0dGhpcy5yZWFkeSgoKSA9PiB7XG5cdFx0b25QbGF5ZXJSZWFkeSh0aGlzLCB2aWRlb2pzLm1lcmdlT3B0aW9ucyhkZWZhdWx0cywgb3B0aW9ucykpO1xuXHR9KTtcbn07XG5cbi8qKlxuICog5YiG6L6o546HXG4gKiBAcGFyYW0ge1t0eXBlXX0gb3B0aW9ucyBbZGVzY3JpcHRpb25dXG4gKiByZXR1cm4ge1t0eXBlXX0gIFtkZXNjcmlwdGlvbl1cbiAqL1xuY29uc3QgdmlkZW9Kc1Jlc29sdXRpb25Td2l0Y2hlciA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblxuXHQvKipcblx0ICogSW5pdGlhbGl6ZSB0aGUgcGx1Z2luLlxuXHQgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSBwbHVnaW5cblx0ICovXG5cblx0dmFyIHNldHRpbmdzID0gdmlkZW9qcy5tZXJnZU9wdGlvbnMoZGVmYXVsdHMsIG9wdGlvbnMpLFxuXHRcdHBsYXllciA9IHRoaXMsXG5cdFx0Z3JvdXBlZFNyYyA9IHt9LFxuXHRcdGN1cnJlbnRTb3VyY2VzID0ge30sXG5cdFx0Y3VycmVudFJlc29sdXRpb25TdGF0ZSA9IHt9O1xuXG5cdC8qKlxuXHQgKiBVcGRhdGVzIHBsYXllciBzb3VyY2VzIG9yIHJldHVybnMgY3VycmVudCBzb3VyY2UgVVJMXG5cdCAqIEBwYXJhbSAgIHtBcnJheX0gIFtzcmNdIGFycmF5IG9mIHNvdXJjZXMgW3tzcmM6ICcnLCB0eXBlOiAnJywgbGFiZWw6ICcnLCByZXM6ICcnfV1cblx0ICogQHJldHVybnMge09iamVjdHxTdHJpbmd8QXJyYXl9IHZpZGVvanMgcGxheWVyIG9iamVjdCBpZiB1c2VkIGFzIHNldHRlciBvciBjdXJyZW50IHNvdXJjZSBVUkwsIG9iamVjdCwgb3IgYXJyYXkgb2Ygc291cmNlc1xuXHQgKi9cblx0cGxheWVyLnVwZGF0ZVNyYyA9IGZ1bmN0aW9uKHNyYykge1xuXHRcdC8vUmV0dXJuIGN1cnJlbnQgc3JjIGlmIHNyYyBpcyBub3QgZ2l2ZW5cblx0XHRpZiAoIXNyYykge1xuXHRcdFx0cmV0dXJuIHBsYXllci5zcmMoKTtcblx0XHR9XG5cblx0XHQvLyBPbmx5IGFkZCB0aG9zZSBzb3VyY2VzIHdoaWNoIHdlIGNhbiAobWF5YmUpIHBsYXlcblx0XHRzcmMgPSBzcmMuZmlsdGVyKGZ1bmN0aW9uKHNvdXJjZSkge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0cmV0dXJuIChwbGF5ZXIuY2FuUGxheVR5cGUoc291cmNlLnR5cGUpICE9PSAnJyk7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdC8vIElmIGEgVGVjaCBkb2Vzbid0IHlldCBoYXZlIGNhblBsYXlUeXBlIGp1c3QgYWRkIGl0XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdC8vU29ydCBzb3VyY2VzXG5cdFx0dGhpcy5jdXJyZW50U291cmNlcyA9IHNyYy5zb3J0KGNvbXBhcmVSZXNvbHV0aW9ucyk7XG5cdFx0dGhpcy5ncm91cGVkU3JjID0gYnVja2V0U291cmNlcyh0aGlzLmN1cnJlbnRTb3VyY2VzKTtcblx0XHQvLyBQaWNrIG9uZSBieSBkZWZhdWx0XG5cdFx0dmFyIGNob3NlbiA9IGNob29zZVNyYyh0aGlzLmdyb3VwZWRTcmMsIHRoaXMuY3VycmVudFNvdXJjZXMpO1xuXHRcdHRoaXMuY3VycmVudFJlc29sdXRpb25TdGF0ZSA9IHtcblx0XHRcdGxhYmVsOiBjaG9zZW4ubGFiZWwsXG5cdFx0XHRzb3VyY2VzOiBjaG9zZW4uc291cmNlc1xuXHRcdH07XG5cblx0XHRwbGF5ZXIudHJpZ2dlcigndXBkYXRlU291cmNlcycpO1xuXHRcdHBsYXllci5zZXRTb3VyY2VzU2FuaXRpemVkKGNob3Nlbi5zb3VyY2VzLCBjaG9zZW4ubGFiZWwpO1xuXHRcdHBsYXllci50cmlnZ2VyKCdyZXNvbHV0aW9uY2hhbmdlJyk7XG5cdFx0cmV0dXJuIHBsYXllcjtcblx0fTtcblxuXHQvKipcblx0ICogUmV0dXJucyBjdXJyZW50IHJlc29sdXRpb24gb3Igc2V0cyBvbmUgd2hlbiBsYWJlbCBpcyBzcGVjaWZpZWRcblx0ICogQHBhcmFtIHtTdHJpbmd9ICAgW2xhYmVsXSAgICAgICAgIGxhYmVsIG5hbWVcblx0ICogQHBhcmFtIHtGdW5jdGlvbn0gW2N1c3RvbVNvdXJjZVBpY2tlcl0gY3VzdG9tIGZ1bmN0aW9uIHRvIGNob29zZSBzb3VyY2UuIFRha2VzIDIgYXJndW1lbnRzOiBzb3VyY2VzLCBsYWJlbC4gTXVzdCByZXR1cm4gcGxheWVyIG9iamVjdC5cblx0ICogQHJldHVybnMge09iamVjdH0gICBjdXJyZW50IHJlc29sdXRpb24gb2JqZWN0IHtsYWJlbDogJycsIHNvdXJjZXM6IFtdfSBpZiB1c2VkIGFzIGdldHRlciBvciBwbGF5ZXIgb2JqZWN0IGlmIHVzZWQgYXMgc2V0dGVyXG5cdCAqL1xuXHRwbGF5ZXIuY3VycmVudFJlc29sdXRpb24gPSBmdW5jdGlvbihsYWJlbCwgY3VzdG9tU291cmNlUGlja2VyKSB7XG5cdFx0aWYgKGxhYmVsID09IG51bGwpIHtcblx0XHRcdHJldHVybiB0aGlzLmN1cnJlbnRSZXNvbHV0aW9uU3RhdGU7XG5cdFx0fVxuXG5cdFx0Ly8gTG9va3VwIHNvdXJjZXMgZm9yIGxhYmVsXG5cdFx0aWYgKCF0aGlzLmdyb3VwZWRTcmMgfHwgIXRoaXMuZ3JvdXBlZFNyYy5sYWJlbCB8fCAhdGhpcy5ncm91cGVkU3JjLmxhYmVsW2xhYmVsXSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR2YXIgc291cmNlcyA9IHRoaXMuZ3JvdXBlZFNyYy5sYWJlbFtsYWJlbF07XG5cdFx0Ly8gUmVtZW1iZXIgcGxheWVyIHN0YXRlXG5cdFx0dmFyIGN1cnJlbnRUaW1lID0gcGxheWVyLmN1cnJlbnRUaW1lKCk7XG5cdFx0dmFyIGlzUGF1c2VkID0gcGxheWVyLnBhdXNlZCgpO1xuXG5cdFx0Ly8gSGlkZSBiaWdQbGF5QnV0dG9uXG5cdFx0aWYgKCFpc1BhdXNlZCAmJiB0aGlzLnBsYXllcl8ub3B0aW9uc18uYmlnUGxheUJ1dHRvbikge1xuXHRcdFx0dGhpcy5wbGF5ZXJfLmJpZ1BsYXlCdXR0b24uaGlkZSgpO1xuXHRcdH1cblxuXHRcdC8vIENoYW5nZSBwbGF5ZXIgc291cmNlIGFuZCB3YWl0IGZvciBsb2FkZWRkYXRhIGV2ZW50LCB0aGVuIHBsYXkgdmlkZW9cblx0XHQvLyBsb2FkZWRtZXRhZGF0YSBkb2Vzbid0IHdvcmsgcmlnaHQgbm93IGZvciBmbGFzaC5cblx0XHQvLyBQcm9iYWJseSBiZWNhdXNlIG9mIGh0dHBzOi8vZ2l0aHViLmNvbS92aWRlb2pzL3ZpZGVvLWpzLXN3Zi9pc3N1ZXMvMTI0XG5cdFx0Ly8gSWYgcGxheWVyIHByZWxvYWQgaXMgJ25vbmUnIGFuZCB0aGVuIGxvYWRlZGRhdGEgbm90IGZpcmVkLiBTbywgd2UgbmVlZCB0aW1ldXBkYXRlIGV2ZW50IGZvciBzZWVrIGhhbmRsZSAodGltZXVwZGF0ZSBkb2Vzbid0IHdvcmsgcHJvcGVybHkgd2l0aCBmbGFzaClcblx0XHR2YXIgaGFuZGxlU2Vla0V2ZW50ID0gJ2xvYWRlZGRhdGEnO1xuXHRcdGlmICh0aGlzLnBsYXllcl8udGVjaE5hbWVfICE9PSAnWW91dHViZScgJiYgdGhpcy5wbGF5ZXJfLnByZWxvYWQoKSA9PT0gJ25vbmUnICYmIHRoaXMucGxheWVyXy50ZWNoTmFtZV8gIT09ICdGbGFzaCcpIHtcblx0XHRcdGhhbmRsZVNlZWtFdmVudCA9ICd0aW1ldXBkYXRlJztcblx0XHR9XG5cdFx0cGxheWVyXG5cdFx0XHQuc2V0U291cmNlc1Nhbml0aXplZChzb3VyY2VzLCBsYWJlbCwgY3VzdG9tU291cmNlUGlja2VyIHx8IHNldHRpbmdzLmN1c3RvbVNvdXJjZVBpY2tlcilcblx0XHRcdC5vbmUoaGFuZGxlU2Vla0V2ZW50LCBmdW5jdGlvbigpIHtcblx0XHRcdFx0cGxheWVyLmN1cnJlbnRUaW1lKGN1cnJlbnRUaW1lKTtcblx0XHRcdFx0cGxheWVyLmhhbmRsZVRlY2hTZWVrZWRfKCk7XG5cdFx0XHRcdGlmICghaXNQYXVzZWQpIHtcblx0XHRcdFx0XHQvLyBTdGFydCBwbGF5aW5nIGFuZCBoaWRlIGxvYWRpbmdTcGlubmVyIChmbGFzaCBpc3N1ZSA/KVxuXHRcdFx0XHRcdHBsYXllci5wbGF5KCkuaGFuZGxlVGVjaFNlZWtlZF8oKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRwbGF5ZXIudHJpZ2dlcigncmVzb2x1dGlvbmNoYW5nZScpO1xuXHRcdFx0fSk7XG5cdFx0cmV0dXJuIHBsYXllcjtcblx0fTtcblxuXHQvKipcblx0ICogUmV0dXJucyBncm91cGVkIHNvdXJjZXMgYnkgbGFiZWwsIHJlc29sdXRpb24gYW5kIHR5cGVcblx0ICogQHJldHVybnMge09iamVjdH0gZ3JvdXBlZCBzb3VyY2VzOiB7IGxhYmVsOiB7IGtleTogW10gfSwgcmVzOiB7IGtleTogW10gfSwgdHlwZTogeyBrZXk6IFtdIH0gfVxuXHQgKi9cblx0cGxheWVyLmdldEdyb3VwZWRTcmMgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5ncm91cGVkU3JjO1xuXHR9O1xuXHRwbGF5ZXIuc2V0U291cmNlc1Nhbml0aXplZCA9IGZ1bmN0aW9uKHNvdXJjZXMsIGxhYmVsLCBjdXN0b21Tb3VyY2VQaWNrZXIpIHtcblx0XHR0aGlzLmN1cnJlbnRSZXNvbHV0aW9uU3RhdGUgPSB7XG5cdFx0XHRsYWJlbDogbGFiZWwsXG5cdFx0XHRzb3VyY2VzOiBzb3VyY2VzXG5cdFx0fTtcblxuXHRcdGlmICh0eXBlb2YgY3VzdG9tU291cmNlUGlja2VyID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRyZXR1cm4gY3VzdG9tU291cmNlUGlja2VyKHBsYXllciwgc291cmNlcywgbGFiZWwpO1xuXHRcdH1cblx0XHRwbGF5ZXIuc3JjKHNvdXJjZXMubWFwKGZ1bmN0aW9uKHNyYykge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0c3JjOiBzcmMuc3JjLFxuXHRcdFx0XHR0eXBlOiBzcmMudHlwZSxcblx0XHRcdFx0cmVzOiBzcmMucmVzXG5cdFx0XHR9O1xuXHRcdH0pKTtcblxuXHRcdCQoXCIudmpzLXJlc29sdXRpb24tYnV0dG9uLWxhYmVsXCIpLmh0bWwobGFiZWwpO1xuXHRcdHJldHVybiBwbGF5ZXI7XG5cdH07XG5cblx0LyoqXG5cdCAqIE1ldGhvZCB1c2VkIGZvciBzb3J0aW5nIGxpc3Qgb2Ygc291cmNlc1xuXHQgKiBAcGFyYW0gICB7T2JqZWN0fSBhIC0gc291cmNlIG9iamVjdCB3aXRoIHJlcyBwcm9wZXJ0eVxuXHQgKiBAcGFyYW0gICB7T2JqZWN0fSBiIC0gc291cmNlIG9iamVjdCB3aXRoIHJlcyBwcm9wZXJ0eVxuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSByZXN1bHQgb2YgY29tcGFyYXRpb25cblx0ICovXG5cdGZ1bmN0aW9uIGNvbXBhcmVSZXNvbHV0aW9ucyhhLCBiKSB7XG5cdFx0aWYgKCFhLnJlcyB8fCAhYi5yZXMpIHtcblx0XHRcdHJldHVybiAwO1xuXHRcdH1cblx0XHRyZXR1cm4gKCtiLnJlcykgLSAoK2EucmVzKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBHcm91cCBzb3VyY2VzIGJ5IGxhYmVsLCByZXNvbHV0aW9uIGFuZCB0eXBlXG5cdCAqIEBwYXJhbSAgIHtBcnJheX0gIHNyYyBBcnJheSBvZiBzb3VyY2VzXG5cdCAqIEByZXR1cm5zIHtPYmplY3R9IGdyb3VwZWQgc291cmNlczogeyBsYWJlbDogeyBrZXk6IFtdIH0sIHJlczogeyBrZXk6IFtdIH0sIHR5cGU6IHsga2V5OiBbXSB9IH1cblx0ICovXG5cdGZ1bmN0aW9uIGJ1Y2tldFNvdXJjZXMoc3JjKSB7XG5cdFx0dmFyIHJlc29sdXRpb25zID0ge1xuXHRcdFx0bGFiZWw6IHt9LFxuXHRcdFx0cmVzOiB7fSxcblx0XHRcdHR5cGU6IHt9XG5cdFx0fTtcblx0XHRzcmMubWFwKGZ1bmN0aW9uKHNvdXJjZSkge1xuXHRcdFx0aW5pdFJlc29sdXRpb25LZXkocmVzb2x1dGlvbnMsICdsYWJlbCcsIHNvdXJjZSk7XG5cdFx0XHRpbml0UmVzb2x1dGlvbktleShyZXNvbHV0aW9ucywgJ3JlcycsIHNvdXJjZSk7XG5cdFx0XHRpbml0UmVzb2x1dGlvbktleShyZXNvbHV0aW9ucywgJ3R5cGUnLCBzb3VyY2UpO1xuXG5cdFx0XHRhcHBlbmRTb3VyY2VUb0tleShyZXNvbHV0aW9ucywgJ2xhYmVsJywgc291cmNlKTtcblx0XHRcdGFwcGVuZFNvdXJjZVRvS2V5KHJlc29sdXRpb25zLCAncmVzJywgc291cmNlKTtcblx0XHRcdGFwcGVuZFNvdXJjZVRvS2V5KHJlc29sdXRpb25zLCAndHlwZScsIHNvdXJjZSk7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHJlc29sdXRpb25zO1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5pdFJlc29sdXRpb25LZXkocmVzb2x1dGlvbnMsIGtleSwgc291cmNlKSB7XG5cdFx0aWYgKHJlc29sdXRpb25zW2tleV1bc291cmNlW2tleV1dID09IG51bGwpIHtcblx0XHRcdHJlc29sdXRpb25zW2tleV1bc291cmNlW2tleV1dID0gW107XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gYXBwZW5kU291cmNlVG9LZXkocmVzb2x1dGlvbnMsIGtleSwgc291cmNlKSB7XG5cdFx0cmVzb2x1dGlvbnNba2V5XVtzb3VyY2Vba2V5XV0ucHVzaChzb3VyY2UpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENob29zZSBzcmMgaWYgb3B0aW9uLmRlZmF1bHQgaXMgc3BlY2lmaWVkXG5cdCAqIEBwYXJhbSAgIHtPYmplY3R9IGdyb3VwZWRTcmMge3JlczogeyBrZXk6IFtdIH19XG5cdCAqIEBwYXJhbSAgIHtBcnJheX0gIHNyYyBBcnJheSBvZiBzb3VyY2VzIHNvcnRlZCBieSByZXNvbHV0aW9uIHVzZWQgdG8gZmluZCBoaWdoIGFuZCBsb3cgcmVzXG5cdCAqIEByZXR1cm5zIHtPYmplY3R9IHtyZXM6IHN0cmluZywgc291cmNlczogW119XG5cdCAqL1xuXHRmdW5jdGlvbiBjaG9vc2VTcmMoZ3JvdXBlZFNyYywgc3JjKSB7XG5cdFx0dmFyIHNlbGVjdGVkUmVzID0gc2V0dGluZ3NbJ2RlZmF1bHQnXTsgLy8gdXNlIGFycmF5IGFjY2VzcyBhcyBkZWZhdWx0IGlzIGEgcmVzZXJ2ZWQga2V5d29yZFxuXHRcdHZhciBzZWxlY3RlZExhYmVsID0gJyc7XG5cdFx0aWYgKHNlbGVjdGVkUmVzID09PSAnaGlnaCcpIHtcblx0XHRcdHNlbGVjdGVkUmVzID0gc3JjWzBdLnJlcztcblx0XHRcdHNlbGVjdGVkTGFiZWwgPSBzcmNbMF0ubGFiZWw7XG5cdFx0fSBlbHNlIGlmIChzZWxlY3RlZFJlcyA9PT0gJ2xvdycgfHwgc2VsZWN0ZWRSZXMgPT0gbnVsbCB8fCAhZ3JvdXBlZFNyYy5yZXNbc2VsZWN0ZWRSZXNdKSB7XG5cdFx0XHQvLyBTZWxlY3QgbG93LXJlcyBpZiBkZWZhdWx0IGlzIGxvdyBvciBub3Qgc2V0XG5cdFx0XHRzZWxlY3RlZFJlcyA9IHNyY1tzcmMubGVuZ3RoIC0gMV0ucmVzO1xuXHRcdFx0c2VsZWN0ZWRMYWJlbCA9IHNyY1tzcmMubGVuZ3RoIC0gMV0ubGFiZWw7XG5cdFx0fSBlbHNlIGlmIChncm91cGVkU3JjLnJlc1tzZWxlY3RlZFJlc10pIHtcblx0XHRcdHNlbGVjdGVkTGFiZWwgPSBncm91cGVkU3JjLnJlc1tzZWxlY3RlZFJlc11bMF0ubGFiZWw7XG5cdFx0fVxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXM6IHNlbGVjdGVkUmVzLFxuXHRcdFx0bGFiZWw6IHNlbGVjdGVkTGFiZWwsXG5cdFx0XHRzb3VyY2VzOiBncm91cGVkU3JjLnJlc1tzZWxlY3RlZFJlc11cblx0XHR9O1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5pdFJlc29sdXRpb25Gb3JZdChwbGF5ZXIpIHtcblx0XHQvLyBNYXAgeW91dHViZSBxdWFsaXRpZXMgbmFtZXNcblx0XHR2YXIgX3l0cyA9IHtcblx0XHRcdGhpZ2hyZXM6IHtcblx0XHRcdFx0cmVzOiAxMDgwLFxuXHRcdFx0XHRsYWJlbDogJzEwODAnLFxuXHRcdFx0XHR5dDogJ2hpZ2hyZXMnXG5cdFx0XHR9LFxuXHRcdFx0aGQxMDgwOiB7XG5cdFx0XHRcdHJlczogMTA4MCxcblx0XHRcdFx0bGFiZWw6ICcxMDgwJyxcblx0XHRcdFx0eXQ6ICdoZDEwODAnXG5cdFx0XHR9LFxuXHRcdFx0aGQ3MjA6IHtcblx0XHRcdFx0cmVzOiA3MjAsXG5cdFx0XHRcdGxhYmVsOiAnNzIwJyxcblx0XHRcdFx0eXQ6ICdoZDcyMCdcblx0XHRcdH0sXG5cdFx0XHRsYXJnZToge1xuXHRcdFx0XHRyZXM6IDQ4MCxcblx0XHRcdFx0bGFiZWw6ICc0ODAnLFxuXHRcdFx0XHR5dDogJ2xhcmdlJ1xuXHRcdFx0fSxcblx0XHRcdG1lZGl1bToge1xuXHRcdFx0XHRyZXM6IDM2MCxcblx0XHRcdFx0bGFiZWw6ICczNjAnLFxuXHRcdFx0XHR5dDogJ21lZGl1bSdcblx0XHRcdH0sXG5cdFx0XHRzbWFsbDoge1xuXHRcdFx0XHRyZXM6IDI0MCxcblx0XHRcdFx0bGFiZWw6ICcyNDAnLFxuXHRcdFx0XHR5dDogJ3NtYWxsJ1xuXHRcdFx0fSxcblx0XHRcdHRpbnk6IHtcblx0XHRcdFx0cmVzOiAxNDQsXG5cdFx0XHRcdGxhYmVsOiAnMTQ0Jyxcblx0XHRcdFx0eXQ6ICd0aW55J1xuXHRcdFx0fSxcblx0XHRcdGF1dG86IHtcblx0XHRcdFx0cmVzOiAwLFxuXHRcdFx0XHRsYWJlbDogJ2F1dG8nLFxuXHRcdFx0XHR5dDogJ2F1dG8nXG5cdFx0XHR9XG5cdFx0fTtcblx0XHQvLyBPdmVyd3JpdGUgZGVmYXVsdCBzb3VyY2VQaWNrZXIgZnVuY3Rpb25cblx0XHR2YXIgX2N1c3RvbVNvdXJjZVBpY2tlciA9IGZ1bmN0aW9uKF9wbGF5ZXIsIF9zb3VyY2VzLCBfbGFiZWwpIHtcblx0XHRcdC8vIE5vdGUgdGhhdCBzZXRQbGF5ZWJhY2tRdWFsaXR5IGlzIGEgc3VnZ2VzdGlvbi4gWVQgZG9lcyBub3QgYWx3YXlzIG9iZXkgaXQuXG5cdFx0XHRwbGF5ZXIudGVjaF8ueXRQbGF5ZXIuc2V0UGxheWJhY2tRdWFsaXR5KF9zb3VyY2VzWzBdLl95dCk7XG5cdFx0XHRwbGF5ZXIudHJpZ2dlcigndXBkYXRlU291cmNlcycpO1xuXHRcdFx0cmV0dXJuIHBsYXllcjtcblx0XHR9O1xuXHRcdHNldHRpbmdzLmN1c3RvbVNvdXJjZVBpY2tlciA9IF9jdXN0b21Tb3VyY2VQaWNrZXI7XG5cblx0XHQvLyBJbml0IHJlc29sdXRpb25cblx0XHRwbGF5ZXIudGVjaF8ueXRQbGF5ZXIuc2V0UGxheWJhY2tRdWFsaXR5KCdhdXRvJyk7XG5cblx0XHQvLyBUaGlzIGlzIHRyaWdnZXJlZCB3aGVuIHRoZSByZXNvbHV0aW9uIGFjdHVhbGx5IGNoYW5nZXNcblx0XHRwbGF5ZXIudGVjaF8ueXRQbGF5ZXIuYWRkRXZlbnRMaXN0ZW5lcignb25QbGF5YmFja1F1YWxpdHlDaGFuZ2UnLCBmdW5jdGlvbihldmVudCkge1xuXHRcdFx0Zm9yICh2YXIgcmVzIGluIF95dHMpIHtcblx0XHRcdFx0aWYgKHJlcy55dCA9PT0gZXZlbnQuZGF0YSkge1xuXHRcdFx0XHRcdHBsYXllci5jdXJyZW50UmVzb2x1dGlvbihyZXMubGFiZWwsIF9jdXN0b21Tb3VyY2VQaWNrZXIpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0Ly8gV2UgbXVzdCB3YWl0IGZvciBwbGF5IGV2ZW50XG5cdFx0cGxheWVyLm9uZSgncGxheScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHF1YWxpdGllcyA9IHBsYXllci50ZWNoXy55dFBsYXllci5nZXRBdmFpbGFibGVRdWFsaXR5TGV2ZWxzKCk7XG5cdFx0XHR2YXIgX3NvdXJjZXMgPSBbXTtcblxuXHRcdFx0cXVhbGl0aWVzLm1hcChmdW5jdGlvbihxKSB7XG5cdFx0XHRcdF9zb3VyY2VzLnB1c2goe1xuXHRcdFx0XHRcdHNyYzogcGxheWVyLnNyYygpLnNyYyxcblx0XHRcdFx0XHR0eXBlOiBwbGF5ZXIuc3JjKCkudHlwZSxcblx0XHRcdFx0XHRsYWJlbDogX3l0c1txXS5sYWJlbCxcblx0XHRcdFx0XHRyZXM6IF95dHNbcV0ucmVzLFxuXHRcdFx0XHRcdF95dDogX3l0c1txXS55dFxuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXG5cdFx0XHRwbGF5ZXIuZ3JvdXBlZFNyYyA9IGJ1Y2tldFNvdXJjZXMoX3NvdXJjZXMpO1xuXHRcdFx0dmFyIGNob3NlbiA9IHtcblx0XHRcdFx0bGFiZWw6ICdhdXRvJyxcblx0XHRcdFx0cmVzOiAwLFxuXHRcdFx0XHRzb3VyY2VzOiBwbGF5ZXIuZ3JvdXBlZFNyYy5sYWJlbC5hdXRvXG5cdFx0XHR9O1xuXG5cdFx0XHR0aGlzLmN1cnJlbnRSZXNvbHV0aW9uU3RhdGUgPSB7XG5cdFx0XHRcdGxhYmVsOiBjaG9zZW4ubGFiZWwsXG5cdFx0XHRcdHNvdXJjZXM6IGNob3Nlbi5zb3VyY2VzXG5cdFx0XHR9O1xuXG5cdFx0XHRwbGF5ZXIudHJpZ2dlcigndXBkYXRlU291cmNlcycpO1xuXHRcdFx0cGxheWVyLnNldFNvdXJjZXNTYW5pdGl6ZWQoY2hvc2VuLnNvdXJjZXMsIGNob3Nlbi5sYWJlbCwgX2N1c3RvbVNvdXJjZVBpY2tlcik7XG5cdFx0fSk7XG5cdH1cblxuXHRwbGF5ZXIucmVhZHkoZnVuY3Rpb24oKSB7XG5cdFx0aWYgKHNldHRpbmdzLnVpKSB7XG5cdFx0XHR2YXIgbWVudUJ1dHRvbiA9IG5ldyBSZXNvbHV0aW9uTWVudUJ1dHRvbihwbGF5ZXIsIHNldHRpbmdzKTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnJlc29sdXRpb25Td2l0Y2hlciA9IHBsYXllci5jb250cm9sQmFyLmVsXy5pbnNlcnRCZWZvcmUobWVudUJ1dHRvbi5lbF8sIHBsYXllci5jb250cm9sQmFyLmdldENoaWxkKCdmdWxsc2NyZWVuVG9nZ2xlJykuZWxfKTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnJlc29sdXRpb25Td2l0Y2hlci5kaXNwb3NlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHRoaXMucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzKTtcblx0XHRcdH07XG5cdFx0fVxuXHRcdGlmIChwbGF5ZXIub3B0aW9uc18uc291cmNlcy5sZW5ndGggPiAxKSB7XG5cdFx0XHQvLyB0ZWNoOiBIdG1sNSBhbmQgRmxhc2hcblx0XHRcdC8vIENyZWF0ZSByZXNvbHV0aW9uIHN3aXRjaGVyIGZvciB2aWRlb3MgZm9ybSA8c291cmNlPiB0YWcgaW5zaWRlIDx2aWRlbz5cblx0XHRcdHBsYXllci51cGRhdGVTcmMocGxheWVyLm9wdGlvbnNfLnNvdXJjZXMpO1xuXHRcdH1cblxuXHRcdGlmIChwbGF5ZXIudGVjaE5hbWVfID09PSAnWW91dHViZScpIHtcblx0XHRcdC8vIHRlY2g6IFlvdVR1YmVcblx0XHRcdGluaXRSZXNvbHV0aW9uRm9yWXQocGxheWVyKTtcblx0XHR9XG5cdH0pO1xuXG5cdHZhciB2aWRlb0pzUmVzb2x1dGlvblN3aXRjaGVyLFxuXHRcdGRlZmF1bHRzID0ge1xuXHRcdFx0dWk6IHRydWVcblx0XHR9O1xuXG5cdC8qXG5cdCAqIFJlc29sdXRpb24gbWVudSBpdGVtXG5cdCAqL1xuXHR2YXIgTWVudUl0ZW0gPSB2aWRlb2pzLmdldENvbXBvbmVudCgnTWVudUl0ZW0nKTtcblx0dmFyIFJlc29sdXRpb25NZW51SXRlbSA9IHZpZGVvanMuZXh0ZW5kKE1lbnVJdGVtLCB7XG5cdFx0Y29uc3RydWN0b3I6IGZ1bmN0aW9uKHBsYXllciwgb3B0aW9ucykge1xuXHRcdFx0b3B0aW9ucy5zZWxlY3RhYmxlID0gdHJ1ZTtcblx0XHRcdC8vIFNldHMgdGhpcy5wbGF5ZXJfLCB0aGlzLm9wdGlvbnNfIGFuZCBpbml0aWFsaXplcyB0aGUgY29tcG9uZW50XG5cdFx0XHRNZW51SXRlbS5jYWxsKHRoaXMsIHBsYXllciwgb3B0aW9ucyk7XG5cdFx0XHR0aGlzLnNyYyA9IG9wdGlvbnMuc3JjO1xuXG5cdFx0XHRwbGF5ZXIub24oJ3Jlc29sdXRpb25jaGFuZ2UnLCB2aWRlb2pzLmJpbmQodGhpcywgdGhpcy51cGRhdGUpKTtcblx0XHR9XG5cdH0pO1xuXHRSZXNvbHV0aW9uTWVudUl0ZW0ucHJvdG90eXBlLmhhbmRsZUNsaWNrID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRNZW51SXRlbS5wcm90b3R5cGUuaGFuZGxlQ2xpY2suY2FsbCh0aGlzLCBldmVudCk7XG5cdFx0dGhpcy5wbGF5ZXJfLmN1cnJlbnRSZXNvbHV0aW9uKHRoaXMub3B0aW9uc18ubGFiZWwpO1xuXHR9O1xuXHRSZXNvbHV0aW9uTWVudUl0ZW0ucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxlY3Rpb24gPSB0aGlzLnBsYXllcl8uY3VycmVudFJlc29sdXRpb24oKTtcblx0XHR0aGlzLnNlbGVjdGVkKHRoaXMub3B0aW9uc18ubGFiZWwgPT09IHNlbGVjdGlvbi5sYWJlbCk7XG5cdH07XG5cdE1lbnVJdGVtLnJlZ2lzdGVyQ29tcG9uZW50KCdSZXNvbHV0aW9uTWVudUl0ZW0nLCBSZXNvbHV0aW9uTWVudUl0ZW0pO1xuXG5cdC8qXG5cdCAqIFJlc29sdXRpb24gbWVudSBidXR0b25cblx0ICovXG5cdHZhciBNZW51QnV0dG9uID0gdmlkZW9qcy5nZXRDb21wb25lbnQoJ01lbnVCdXR0b24nKTtcblx0dmFyIFJlc29sdXRpb25NZW51QnV0dG9uID0gdmlkZW9qcy5leHRlbmQoTWVudUJ1dHRvbiwge1xuXHRcdGNvbnN0cnVjdG9yOiBmdW5jdGlvbihwbGF5ZXIsIG9wdGlvbnMpIHtcblx0XHRcdHRoaXMubGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cdFx0XHRvcHRpb25zLmxhYmVsID0gJ1F1YWxpdHknO1xuXHRcdFx0Ly8gU2V0cyB0aGlzLnBsYXllcl8sIHRoaXMub3B0aW9uc18gYW5kIGluaXRpYWxpemVzIHRoZSBjb21wb25lbnRcblx0XHRcdE1lbnVCdXR0b24uY2FsbCh0aGlzLCBwbGF5ZXIsIG9wdGlvbnMpO1xuXHRcdFx0dGhpcy5lbCgpLnNldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcsICdRdWFsaXR5Jyk7XG5cdFx0XHR0aGlzLmNvbnRyb2xUZXh0KCdRdWFsaXR5Jyk7XG5cblx0XHRcdGlmIChvcHRpb25zLmR5bmFtaWNMYWJlbCkge1xuXHRcdFx0XHR2aWRlb2pzLmFkZENsYXNzKHRoaXMubGFiZWwsICd2anMtcmVzb2x1dGlvbi1idXR0b24tbGFiZWwnKTtcblx0XHRcdFx0dGhpcy5lbCgpLmFwcGVuZENoaWxkKHRoaXMubGFiZWwpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dmFyIHN0YXRpY0xhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuXHRcdFx0XHR2aWRlb2pzLmFkZENsYXNzKHN0YXRpY0xhYmVsLCAndmpzLW1lbnUtaWNvbicpO1xuXHRcdFx0XHR0aGlzLmVsKCkuYXBwZW5kQ2hpbGQoc3RhdGljTGFiZWwpO1xuXHRcdFx0fVxuXHRcdFx0cGxheWVyLm9uKCd1cGRhdGVTb3VyY2VzJywgdmlkZW9qcy5iaW5kKHRoaXMsIHRoaXMudXBkYXRlKSk7XG5cdFx0fVxuXHR9KTtcblx0UmVzb2x1dGlvbk1lbnVCdXR0b24ucHJvdG90eXBlLmNyZWF0ZUl0ZW1zID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIG1lbnVJdGVtcyA9IFtdO1xuXHRcdHZhciBsYWJlbHMgPSAodGhpcy5zb3VyY2VzICYmIHRoaXMuc291cmNlcy5sYWJlbCkgfHwge307XG5cblx0XHQvLyBGSVhNRSBvcmRlciBpcyBub3QgZ3VhcmFudGVlZCBoZXJlLlxuXHRcdGZvciAodmFyIGtleSBpbiBsYWJlbHMpIHtcblx0XHRcdGlmIChsYWJlbHMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuXHRcdFx0XHRtZW51SXRlbXMucHVzaChuZXcgUmVzb2x1dGlvbk1lbnVJdGVtKFxuXHRcdFx0XHRcdHRoaXMucGxheWVyXywge1xuXHRcdFx0XHRcdFx0bGFiZWw6IGtleSxcblx0XHRcdFx0XHRcdHNyYzogbGFiZWxzW2tleV0sXG5cdFx0XHRcdFx0XHRzZWxlY3RlZDoga2V5ID09PSAodGhpcy5jdXJyZW50U2VsZWN0aW9uID8gdGhpcy5jdXJyZW50U2VsZWN0aW9uLmxhYmVsIDogZmFsc2UpXG5cdFx0XHRcdFx0fSkpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gbWVudUl0ZW1zO1xuXHR9O1xuXHRSZXNvbHV0aW9uTWVudUJ1dHRvbi5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5zb3VyY2VzID0gdGhpcy5wbGF5ZXJfLmdldEdyb3VwZWRTcmMoKTtcblx0XHR0aGlzLmN1cnJlbnRTZWxlY3Rpb24gPSB0aGlzLnBsYXllcl8uY3VycmVudFJlc29sdXRpb24oKTtcblx0XHR0aGlzLmxhYmVsLmlubmVySFRNTCA9IHRoaXMuY3VycmVudFNlbGVjdGlvbiA/IHRoaXMuY3VycmVudFNlbGVjdGlvbi5sYWJlbCA6ICcnO1xuXHRcdHJldHVybiBNZW51QnV0dG9uLnByb3RvdHlwZS51cGRhdGUuY2FsbCh0aGlzKTtcblx0fTtcblx0UmVzb2x1dGlvbk1lbnVCdXR0b24ucHJvdG90eXBlLmJ1aWxkQ1NTQ2xhc3MgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gTWVudUJ1dHRvbi5wcm90b3R5cGUuYnVpbGRDU1NDbGFzcy5jYWxsKHRoaXMpICsgJyB2anMtcmVzb2x1dGlvbi1idXR0b24nO1xuXHR9O1xuXHRNZW51QnV0dG9uLnJlZ2lzdGVyQ29tcG9uZW50KCdSZXNvbHV0aW9uTWVudUJ1dHRvbicsIFJlc29sdXRpb25NZW51QnV0dG9uKTtcbn07XG5cbi8qKlxuICog56aB55So5rua5Yqo5p2h5ouW5YqoXG4gKiBAcGFyYW0ge1t0eXBlXX0gb3B0aW9ucyBbZGVzY3JpcHRpb25dXG4gKiByZXR1cm4ge1t0eXBlXX0gIFtkZXNjcmlwdGlvbl1cbiAqL1xuY29uc3QgZGlzYWJsZVByb2dyZXNzID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHR2YXJcblx0LyoqXG5cdCAqIENvcGllcyBwcm9wZXJ0aWVzIGZyb20gb25lIG9yIG1vcmUgb2JqZWN0cyBvbnRvIGFuIG9yaWdpbmFsLlxuXHQgKi9cblx0XHRleHRlbmQgPSBmdW5jdGlvbihvYmogLyosIGFyZzEsIGFyZzIsIC4uLiAqLyApIHtcblx0XHRcdHZhciBhcmcsIGksIGs7XG5cdFx0XHRmb3IgKGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGFyZyA9IGFyZ3VtZW50c1tpXTtcblx0XHRcdFx0Zm9yIChrIGluIGFyZykge1xuXHRcdFx0XHRcdGlmIChhcmcuaGFzT3duUHJvcGVydHkoaykpIHtcblx0XHRcdFx0XHRcdG9ialtrXSA9IGFyZ1trXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBvYmo7XG5cdFx0fSxcblxuXHRcdC8vIGRlZmluZSBzb21lIHJlYXNvbmFibGUgZGVmYXVsdHMgZm9yIHRoaXMgc3dlZXQgcGx1Z2luXG5cdFx0ZGVmYXVsdHMgPSB7XG5cdFx0XHRhdXRvRGlzYWJsZTogZmFsc2Vcblx0XHR9O1xuXG5cblx0dmFyXG5cdC8vIHNhdmUgYSByZWZlcmVuY2UgdG8gdGhlIHBsYXllciBpbnN0YW5jZVxuXHRcdHBsYXllciA9IHRoaXMsXG5cdFx0c3RhdGUgPSBmYWxzZSxcblxuXHRcdC8vIG1lcmdlIG9wdGlvbnMgYW5kIGRlZmF1bHRzXG5cdFx0c2V0dGluZ3MgPSBleHRlbmQoe30sIGRlZmF1bHRzLCBvcHRpb25zIHx8IHt9KTtcblxuXHQvLyBkaXNhYmxlIC8gZW5hYmxlIG1ldGhvZHNcblx0cGxheWVyLmRpc2FibGVQcm9ncmVzcyA9IHtcblx0XHRkaXNhYmxlOiBmdW5jdGlvbigpIHtcblx0XHRcdHN0YXRlID0gdHJ1ZTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9mZihcImZvY3VzXCIpO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub2ZmKFwibW91c2Vkb3duXCIpO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub2ZmKFwidG91Y2hzdGFydFwiKTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9mZihcImNsaWNrXCIpO1xuXHRcdH0sXG5cdFx0ZW5hYmxlOiBmdW5jdGlvbigpIHtcblx0XHRcdHN0YXRlID0gZmFsc2U7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vbihcImZvY3VzXCIsIHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLmhhbmRsZUZvY3VzKTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9uKFwibW91c2Vkb3duXCIsIHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLmhhbmRsZU1vdXNlRG93bik7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vbihcInRvdWNoc3RhcnRcIiwgcGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIuaGFuZGxlTW91c2VEb3duKTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9uKFwiY2xpY2tcIiwgcGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIuaGFuZGxlQ2xpY2spO1xuXHRcdH0sXG5cdFx0Z2V0U3RhdGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHN0YXRlO1xuXHRcdH1cblx0fTtcblxuXHRpZiAoc2V0dGluZ3MuYXV0b0Rpc2FibGUpIHtcblx0XHRwbGF5ZXIuZGlzYWJsZVByb2dyZXNzLmRpc2FibGUoKTtcblx0fVxufTtcblxuLyoqXG4gKiDmiZPngrlcbiAqIEBwYXJhbSB7W3R5cGVdfSBvcHRpb25zIFtkZXNjcmlwdGlvbl1cbiAqIHJldHVybiB7W3R5cGVdfSAgW2Rlc2NyaXB0aW9uXVxuICovXG5jb25zdCBtYXJrZXJzID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHQvL2RlZmF1bHQgc2V0dGluZ1xuXHR2YXIgZGVmYXVsdFNldHRpbmcgPSB7XG5cdFx0bWFya2VyU3R5bGU6IHtcblx0XHRcdCd3aWR0aCc6ICc4cHgnLFxuXHRcdFx0J2JvcmRlci1yYWRpdXMnOiAnMjAlJyxcblx0XHRcdCdiYWNrZ3JvdW5kLWNvbG9yJzogJ3JnYmEoMjU1LDAsMCwuNSknXG5cdFx0fSxcblx0XHRtYXJrZXJUaXA6IHtcblx0XHRcdGRpc3BsYXk6IHRydWUsXG5cdFx0XHR0ZXh0OiBmdW5jdGlvbihtYXJrZXIpIHtcblx0XHRcdFx0cmV0dXJuIG1hcmtlci50ZXh0O1xuXHRcdFx0fSxcblx0XHRcdHRpbWU6IGZ1bmN0aW9uKG1hcmtlcikge1xuXHRcdFx0XHRyZXR1cm4gbWFya2VyLnRpbWU7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRicmVha092ZXJsYXk6IHtcblx0XHRcdGRpc3BsYXk6IGZhbHNlLFxuXHRcdFx0ZGlzcGxheVRpbWU6IDMsXG5cdFx0XHR0ZXh0OiBmdW5jdGlvbihtYXJrZXIpIHtcblx0XHRcdFx0cmV0dXJuIFwiQnJlYWsgb3ZlcmxheTogXCIgKyBtYXJrZXIub3ZlcmxheVRleHQ7XG5cdFx0XHR9LFxuXHRcdFx0c3R5bGU6IHtcblx0XHRcdFx0J3dpZHRoJzogJzEwMCUnLFxuXHRcdFx0XHQnaGVpZ2h0JzogJzIwJScsXG5cdFx0XHRcdCdiYWNrZ3JvdW5kLWNvbG9yJzogJ3JnYmEoMCwwLDAsMC43KScsXG5cdFx0XHRcdCdjb2xvcic6ICd3aGl0ZScsXG5cdFx0XHRcdCdmb250LXNpemUnOiAnMTdweCdcblx0XHRcdH1cblx0XHR9LFxuXHRcdG9uTWFya2VyQ2xpY2s6IGZ1bmN0aW9uKG1hcmtlcikge30sXG5cdFx0b25NYXJrZXJSZWFjaGVkOiBmdW5jdGlvbihtYXJrZXIpIHt9LFxuXHRcdG1hcmtlcnM6IFtdXG5cdH07XG5cblx0Ly8gY3JlYXRlIGEgbm9uLWNvbGxpZGluZyByYW5kb20gbnVtYmVyXG5cdGZ1bmN0aW9uIGdlbmVyYXRlVVVJRCgpIHtcblx0XHR2YXIgZCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXHRcdHZhciB1dWlkID0gJ3h4eHh4eHh4LXh4eHgtNHh4eC15eHh4LXh4eHh4eHh4eHh4eCcucmVwbGFjZSgvW3h5XS9nLCBmdW5jdGlvbihjKSB7XG5cdFx0XHR2YXIgciA9IChkICsgTWF0aC5yYW5kb20oKSAqIDE2KSAlIDE2IHwgMDtcblx0XHRcdGQgPSBNYXRoLmZsb29yKGQgLyAxNik7XG5cdFx0XHRyZXR1cm4gKGMgPT0gJ3gnID8gciA6IChyICYgMHgzIHwgMHg4KSkudG9TdHJpbmcoMTYpO1xuXHRcdH0pO1xuXHRcdHJldHVybiB1dWlkO1xuXHR9O1xuXHQvKipcblx0ICogcmVnaXN0ZXIgdGhlIG1hcmtlcnMgcGx1Z2luIChkZXBlbmRlbnQgb24ganF1ZXJ5KVxuXHQgKi9cblx0dmFyIHNldHRpbmcgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZGVmYXVsdFNldHRpbmcsIG9wdGlvbnMpLFxuXHRcdG1hcmtlcnNNYXAgPSB7fSxcblx0XHRtYXJrZXJzTGlzdCA9IFtdLCAvLyBsaXN0IG9mIG1hcmtlcnMgc29ydGVkIGJ5IHRpbWVcblx0XHR2aWRlb1dyYXBwZXIgPSAkKHRoaXMuZWwoKSksXG5cdFx0Y3VycmVudE1hcmtlckluZGV4ID0gLTEsXG5cdFx0cGxheWVyID0gdGhpcyxcblx0XHRtYXJrZXJUaXAgPSBudWxsLFxuXHRcdGJyZWFrT3ZlcmxheSA9IG51bGwsXG5cdFx0b3ZlcmxheUluZGV4ID0gLTE7XG5cblx0ZnVuY3Rpb24gc29ydE1hcmtlcnNMaXN0KCkge1xuXHRcdC8vIHNvcnQgdGhlIGxpc3QgYnkgdGltZSBpbiBhc2Mgb3JkZXJcblx0XHRtYXJrZXJzTGlzdC5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdHJldHVybiBzZXR0aW5nLm1hcmtlclRpcC50aW1lKGEpIC0gc2V0dGluZy5tYXJrZXJUaXAudGltZShiKTtcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIGFkZE1hcmtlcnMobmV3TWFya2Vycykge1xuXHRcdC8vIGNyZWF0ZSB0aGUgbWFya2Vyc1xuXHRcdCQuZWFjaChuZXdNYXJrZXJzLCBmdW5jdGlvbihpbmRleCwgbWFya2VyKSB7XG5cdFx0XHRtYXJrZXIua2V5ID0gZ2VuZXJhdGVVVUlEKCk7XG5cblx0XHRcdHZpZGVvV3JhcHBlci5maW5kKCcudmpzLXByb2dyZXNzLWNvbnRyb2wgLnZqcy1zbGlkZXInKS5hcHBlbmQoXG5cdFx0XHRcdGNyZWF0ZU1hcmtlckRpdihtYXJrZXIpKTtcblxuXHRcdFx0Ly8gc3RvcmUgbWFya2VyIGluIGFuIGludGVybmFsIGhhc2ggbWFwXG5cdFx0XHRtYXJrZXJzTWFwW21hcmtlci5rZXldID0gbWFya2VyO1xuXHRcdFx0bWFya2Vyc0xpc3QucHVzaChtYXJrZXIpO1xuXHRcdH0pO1xuXG5cdFx0c29ydE1hcmtlcnNMaXN0KCk7XG5cdH1cblxuXHRmdW5jdGlvbiBnZXRQb3NpdGlvbihtYXJrZXIpIHtcblx0XHRyZXR1cm4gKHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2VyKSAvIHBsYXllci5kdXJhdGlvbigpKSAqIDEwMFxuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlTWFya2VyRGl2KG1hcmtlciwgZHVyYXRpb24pIHtcblx0XHR2YXIgbWFya2VyRGl2ID0gJChcIjxkaXYgY2xhc3M9J3Zqcy1tYXJrZXInPjwvZGl2PlwiKVxuXHRcdG1hcmtlckRpdi5jc3Moc2V0dGluZy5tYXJrZXJTdHlsZSlcblx0XHRcdC5jc3Moe1xuXHRcdFx0XHQvLyBcIm1hcmdpbi1sZWZ0XCI6IC1wYXJzZUZsb2F0KG1hcmtlckRpdi5jc3MoXCJ3aWR0aFwiKSkgLyAyICsgJ3B4Jyxcblx0XHRcdFx0XCJsZWZ0XCI6IGdldFBvc2l0aW9uKG1hcmtlcikgKyAnJSdcblx0XHRcdH0pXG5cdFx0XHQuYXR0cihcImRhdGEtbWFya2VyLWtleVwiLCBtYXJrZXIua2V5KVxuXHRcdFx0LmF0dHIoXCJkYXRhLW1hcmtlci10aW1lXCIsIHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2VyKSk7XG5cblx0XHQvLyBhZGQgdXNlci1kZWZpbmVkIGNsYXNzIHRvIG1hcmtlclxuXHRcdGlmIChtYXJrZXIuY2xhc3MpIHtcblx0XHRcdG1hcmtlckRpdi5hZGRDbGFzcyhtYXJrZXIuY2xhc3MpO1xuXHRcdH1cblxuXHRcdC8vIGJpbmQgY2xpY2sgZXZlbnQgdG8gc2VlayB0byBtYXJrZXIgdGltZVxuXHRcdG1hcmtlckRpdi5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG5cblx0XHRcdHZhciBwcmV2ZW50RGVmYXVsdCA9IGZhbHNlO1xuXHRcdFx0aWYgKHR5cGVvZiBzZXR0aW5nLm9uTWFya2VyQ2xpY2sgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0XHQvLyBpZiByZXR1cm4gZmFsc2UsIHByZXZlbnQgZGVmYXVsdCBiZWhhdmlvclxuXHRcdFx0XHRwcmV2ZW50RGVmYXVsdCA9IHNldHRpbmcub25NYXJrZXJDbGljayhtYXJrZXIpID09IGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIXByZXZlbnREZWZhdWx0KSB7XG5cdFx0XHRcdHZhciBrZXkgPSAkKHRoaXMpLmRhdGEoJ21hcmtlci1rZXknKTtcblx0XHRcdFx0cGxheWVyLmN1cnJlbnRUaW1lKHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2Vyc01hcFtrZXldKSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRpZiAoc2V0dGluZy5tYXJrZXJUaXAuZGlzcGxheSkge1xuXHRcdFx0cmVnaXN0ZXJNYXJrZXJUaXBIYW5kbGVyKG1hcmtlckRpdik7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG1hcmtlckRpdjtcblx0fVxuXG5cdGZ1bmN0aW9uIHVwZGF0ZU1hcmtlcnMoKSB7XG5cdFx0Ly8gdXBkYXRlIFVJIGZvciBtYXJrZXJzIHdob3NlIHRpbWUgY2hhbmdlZFxuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBtYXJrZXJzTGlzdC5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIG1hcmtlciA9IG1hcmtlcnNMaXN0W2ldO1xuXHRcdFx0dmFyIG1hcmtlckRpdiA9IHZpZGVvV3JhcHBlci5maW5kKFwiLnZqcy1tYXJrZXJbZGF0YS1tYXJrZXIta2V5PSdcIiArIG1hcmtlci5rZXkgKyBcIiddXCIpO1xuXHRcdFx0dmFyIG1hcmtlclRpbWUgPSBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcik7XG5cblx0XHRcdGlmIChtYXJrZXJEaXYuZGF0YSgnbWFya2VyLXRpbWUnKSAhPSBtYXJrZXJUaW1lKSB7XG5cdFx0XHRcdG1hcmtlckRpdi5jc3Moe1xuXHRcdFx0XHRcdFx0XCJsZWZ0XCI6IGdldFBvc2l0aW9uKG1hcmtlcikgKyAnJSdcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC5hdHRyKFwiZGF0YS1tYXJrZXItdGltZVwiLCBtYXJrZXJUaW1lKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0c29ydE1hcmtlcnNMaXN0KCk7XG5cdH1cblxuXHRmdW5jdGlvbiByZW1vdmVNYXJrZXJzKGluZGV4QXJyYXkpIHtcblx0XHQvLyByZXNldCBvdmVybGF5XG5cdFx0aWYgKGJyZWFrT3ZlcmxheSkge1xuXHRcdFx0b3ZlcmxheUluZGV4ID0gLTE7XG5cdFx0XHRicmVha092ZXJsYXkuY3NzKFwidmlzaWJpbGl0eVwiLCBcImhpZGRlblwiKTtcblx0XHR9XG5cdFx0Y3VycmVudE1hcmtlckluZGV4ID0gLTE7XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGluZGV4QXJyYXkubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBpbmRleCA9IGluZGV4QXJyYXlbaV07XG5cdFx0XHR2YXIgbWFya2VyID0gbWFya2Vyc0xpc3RbaW5kZXhdO1xuXHRcdFx0aWYgKG1hcmtlcikge1xuXHRcdFx0XHQvLyBkZWxldGUgZnJvbSBtZW1vcnlcblx0XHRcdFx0ZGVsZXRlIG1hcmtlcnNNYXBbbWFya2VyLmtleV07XG5cdFx0XHRcdG1hcmtlcnNMaXN0W2luZGV4XSA9IG51bGw7XG5cblx0XHRcdFx0Ly8gZGVsZXRlIGZyb20gZG9tXG5cdFx0XHRcdHZpZGVvV3JhcHBlci5maW5kKFwiLnZqcy1tYXJrZXJbZGF0YS1tYXJrZXIta2V5PSdcIiArIG1hcmtlci5rZXkgKyBcIiddXCIpLnJlbW92ZSgpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIGNsZWFuIHVwIGFycmF5XG5cdFx0Zm9yICh2YXIgaSA9IG1hcmtlcnNMaXN0Lmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRpZiAobWFya2Vyc0xpc3RbaV0gPT09IG51bGwpIHtcblx0XHRcdFx0bWFya2Vyc0xpc3Quc3BsaWNlKGksIDEpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIHNvcnQgYWdhaW5cblx0XHRzb3J0TWFya2Vyc0xpc3QoKTtcblx0fVxuXG5cblx0Ly8gYXR0YWNoIGhvdmVyIGV2ZW50IGhhbmRsZXJcblx0ZnVuY3Rpb24gcmVnaXN0ZXJNYXJrZXJUaXBIYW5kbGVyKG1hcmtlckRpdikge1xuXG5cdFx0bWFya2VyRGl2Lm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBtYXJrZXIgPSBtYXJrZXJzTWFwWyQodGhpcykuZGF0YSgnbWFya2VyLWtleScpXTtcblxuXHRcdFx0bWFya2VyVGlwLmZpbmQoJy52anMtdGlwLWlubmVyJykuaHRtbChzZXR0aW5nLm1hcmtlclRpcC50ZXh0KG1hcmtlcikpO1xuXG5cdFx0XHQvLyBtYXJnaW4tbGVmdCBuZWVkcyB0byBtaW51cyB0aGUgcGFkZGluZyBsZW5ndGggdG8gYWxpZ24gY29ycmVjdGx5IHdpdGggdGhlIG1hcmtlclxuXHRcdFx0bWFya2VyVGlwLmNzcyh7XG5cdFx0XHRcdFwibGVmdFwiOiBnZXRQb3NpdGlvbihtYXJrZXIpICsgJyUnLFxuXHRcdFx0XHRcIm1hcmdpbi1sZWZ0XCI6IC1wYXJzZUZsb2F0KG1hcmtlclRpcC5jc3MoXCJ3aWR0aFwiKSkgLyAyIC0gNSArICdweCcsXG5cdFx0XHRcdFwidmlzaWJpbGl0eVwiOiBcInZpc2libGVcIlxuXHRcdFx0fSk7XG5cblx0XHR9KS5vbignbW91c2VvdXQnLCBmdW5jdGlvbigpIHtcblx0XHRcdG1hcmtlclRpcC5jc3MoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuXHRcdH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5pdGlhbGl6ZU1hcmtlclRpcCgpIHtcblx0XHRtYXJrZXJUaXAgPSAkKFwiPGRpdiBjbGFzcz0ndmpzLXRpcCc+PGRpdiBjbGFzcz0ndmpzLXRpcC1hcnJvdyc+PC9kaXY+PGRpdiBjbGFzcz0ndmpzLXRpcC1pbm5lcic+PC9kaXY+PC9kaXY+XCIpO1xuXHRcdHZpZGVvV3JhcHBlci5maW5kKCcudmpzLXByb2dyZXNzLWNvbnRyb2wgLnZqcy1zbGlkZXInKS5hcHBlbmQobWFya2VyVGlwKTtcblx0fVxuXG5cdC8vIHNob3cgb3IgaGlkZSBicmVhayBvdmVybGF5c1xuXHRmdW5jdGlvbiB1cGRhdGVCcmVha092ZXJsYXkoKSB7XG5cdFx0aWYgKCFzZXR0aW5nLmJyZWFrT3ZlcmxheS5kaXNwbGF5IHx8IGN1cnJlbnRNYXJrZXJJbmRleCA8IDApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR2YXIgY3VycmVudFRpbWUgPSBwbGF5ZXIuY3VycmVudFRpbWUoKTtcblx0XHR2YXIgbWFya2VyID0gbWFya2Vyc0xpc3RbY3VycmVudE1hcmtlckluZGV4XTtcblx0XHR2YXIgbWFya2VyVGltZSA9IHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2VyKTtcblxuXHRcdGlmIChjdXJyZW50VGltZSA+PSBtYXJrZXJUaW1lICYmXG5cdFx0XHRjdXJyZW50VGltZSA8PSAobWFya2VyVGltZSArIHNldHRpbmcuYnJlYWtPdmVybGF5LmRpc3BsYXlUaW1lKSkge1xuXHRcdFx0aWYgKG92ZXJsYXlJbmRleCAhPSBjdXJyZW50TWFya2VySW5kZXgpIHtcblx0XHRcdFx0b3ZlcmxheUluZGV4ID0gY3VycmVudE1hcmtlckluZGV4O1xuXHRcdFx0XHRicmVha092ZXJsYXkuZmluZCgnLnZqcy1icmVhay1vdmVybGF5LXRleHQnKS5odG1sKHNldHRpbmcuYnJlYWtPdmVybGF5LnRleHQobWFya2VyKSk7XG5cdFx0XHR9XG5cblx0XHRcdGJyZWFrT3ZlcmxheS5jc3MoJ3Zpc2liaWxpdHknLCBcInZpc2libGVcIik7XG5cblx0XHR9IGVsc2Uge1xuXHRcdFx0b3ZlcmxheUluZGV4ID0gLTE7XG5cdFx0XHRicmVha092ZXJsYXkuY3NzKFwidmlzaWJpbGl0eVwiLCBcImhpZGRlblwiKTtcblx0XHR9XG5cdH1cblxuXHQvLyBwcm9ibGVtIHdoZW4gdGhlIG5leHQgbWFya2VyIGlzIHdpdGhpbiB0aGUgb3ZlcmxheSBkaXNwbGF5IHRpbWUgZnJvbSB0aGUgcHJldmlvdXMgbWFya2VyXG5cdGZ1bmN0aW9uIGluaXRpYWxpemVPdmVybGF5KCkge1xuXHRcdGJyZWFrT3ZlcmxheSA9ICQoXCI8ZGl2IGNsYXNzPSd2anMtYnJlYWstb3ZlcmxheSc+PGRpdiBjbGFzcz0ndmpzLWJyZWFrLW92ZXJsYXktdGV4dCc+PC9kaXY+PC9kaXY+XCIpXG5cdFx0XHQuY3NzKHNldHRpbmcuYnJlYWtPdmVybGF5LnN0eWxlKTtcblx0XHR2aWRlb1dyYXBwZXIuYXBwZW5kKGJyZWFrT3ZlcmxheSk7XG5cdFx0b3ZlcmxheUluZGV4ID0gLTE7XG5cdH1cblxuXHRmdW5jdGlvbiBvblRpbWVVcGRhdGUoKSB7XG5cdFx0b25VcGRhdGVNYXJrZXIoKTtcblx0XHR1cGRhdGVCcmVha092ZXJsYXkoKTtcblx0fVxuXG5cdGZ1bmN0aW9uIG9uVXBkYXRlTWFya2VyKCkge1xuXHRcdC8qXG5cdFx0ICAgIGNoZWNrIG1hcmtlciByZWFjaGVkIGluIGJldHdlZW4gbWFya2Vyc1xuXHRcdCAgICB0aGUgbG9naWMgaGVyZSBpcyB0aGF0IGl0IHRyaWdnZXJzIGEgbmV3IG1hcmtlciByZWFjaGVkIGV2ZW50IG9ubHkgaWYgdGhlIHBsYXllciBcblx0XHQgICAgZW50ZXJzIGEgbmV3IG1hcmtlciByYW5nZSAoZS5nLiBmcm9tIG1hcmtlciAxIHRvIG1hcmtlciAyKS4gVGh1cywgaWYgcGxheWVyIGlzIG9uIG1hcmtlciAxIGFuZCB1c2VyIGNsaWNrZWQgb24gbWFya2VyIDEgYWdhaW4sIG5vIG5ldyByZWFjaGVkIGV2ZW50IGlzIHRyaWdnZXJlZClcblx0XHQqL1xuXG5cdFx0dmFyIGdldE5leHRNYXJrZXJUaW1lID0gZnVuY3Rpb24oaW5kZXgpIHtcblx0XHRcdGlmIChpbmRleCA8IG1hcmtlcnNMaXN0Lmxlbmd0aCAtIDEpIHtcblx0XHRcdFx0cmV0dXJuIHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2Vyc0xpc3RbaW5kZXggKyAxXSk7XG5cdFx0XHR9XG5cdFx0XHQvLyBuZXh0IG1hcmtlciB0aW1lIG9mIGxhc3QgbWFya2VyIHdvdWxkIGJlIGVuZCBvZiB2aWRlbyB0aW1lXG5cdFx0XHRyZXR1cm4gcGxheWVyLmR1cmF0aW9uKCk7XG5cdFx0fVxuXHRcdHZhciBjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdHZhciBuZXdNYXJrZXJJbmRleDtcblxuXHRcdGlmIChjdXJyZW50TWFya2VySW5kZXggIT0gLTEpIHtcblx0XHRcdC8vIGNoZWNrIGlmIHN0YXlpbmcgYXQgc2FtZSBtYXJrZXJcblx0XHRcdHZhciBuZXh0TWFya2VyVGltZSA9IGdldE5leHRNYXJrZXJUaW1lKGN1cnJlbnRNYXJrZXJJbmRleCk7XG5cdFx0XHRpZiAoY3VycmVudFRpbWUgPj0gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTGlzdFtjdXJyZW50TWFya2VySW5kZXhdKSAmJlxuXHRcdFx0XHRjdXJyZW50VGltZSA8IG5leHRNYXJrZXJUaW1lKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gY2hlY2sgZm9yIGVuZGluZyAoYXQgdGhlIGVuZCBjdXJyZW50IHRpbWUgZXF1YWxzIHBsYXllciBkdXJhdGlvbilcblx0XHRcdGlmIChjdXJyZW50TWFya2VySW5kZXggPT09IG1hcmtlcnNMaXN0Lmxlbmd0aCAtIDEgJiZcblx0XHRcdFx0Y3VycmVudFRpbWUgPT09IHBsYXllci5kdXJhdGlvbigpKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBjaGVjayBmaXJzdCBtYXJrZXIsIG5vIG1hcmtlciBpcyBzZWxlY3RlZFxuXHRcdGlmIChtYXJrZXJzTGlzdC5sZW5ndGggPiAwICYmXG5cdFx0XHRjdXJyZW50VGltZSA8IHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2Vyc0xpc3RbMF0pKSB7XG5cdFx0XHRuZXdNYXJrZXJJbmRleCA9IC0xO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBsb29rIGZvciBuZXcgaW5kZXhcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbWFya2Vyc0xpc3QubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0bmV4dE1hcmtlclRpbWUgPSBnZXROZXh0TWFya2VyVGltZShpKTtcblxuXHRcdFx0XHRpZiAoY3VycmVudFRpbWUgPj0gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTGlzdFtpXSkgJiZcblx0XHRcdFx0XHRjdXJyZW50VGltZSA8IG5leHRNYXJrZXJUaW1lKSB7XG5cdFx0XHRcdFx0bmV3TWFya2VySW5kZXggPSBpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gc2V0IG5ldyBtYXJrZXIgaW5kZXhcblx0XHRpZiAobmV3TWFya2VySW5kZXggIT0gY3VycmVudE1hcmtlckluZGV4KSB7XG5cdFx0XHQvLyB0cmlnZ2VyIGV2ZW50XG5cdFx0XHRpZiAobmV3TWFya2VySW5kZXggIT0gLTEgJiYgb3B0aW9ucy5vbk1hcmtlclJlYWNoZWQpIHtcblx0XHRcdFx0b3B0aW9ucy5vbk1hcmtlclJlYWNoZWQobWFya2Vyc0xpc3RbbmV3TWFya2VySW5kZXhdKTtcblx0XHRcdH1cblx0XHRcdGN1cnJlbnRNYXJrZXJJbmRleCA9IG5ld01hcmtlckluZGV4O1xuXHRcdH1cblxuXHR9XG5cblx0Ly8gc2V0dXAgdGhlIHdob2xlIHRoaW5nXG5cdGZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XG5cdFx0aWYgKHNldHRpbmcubWFya2VyVGlwLmRpc3BsYXkpIHtcblx0XHRcdGluaXRpYWxpemVNYXJrZXJUaXAoKTtcblx0XHR9XG5cblx0XHQvLyByZW1vdmUgZXhpc3RpbmcgbWFya2VycyBpZiBhbHJlYWR5IGluaXRpYWxpemVkXG5cdFx0cGxheWVyLm1hcmtlcnMucmVtb3ZlQWxsKCk7XG5cdFx0YWRkTWFya2VycyhvcHRpb25zLm1hcmtlcnMpO1xuXG5cdFx0aWYgKHNldHRpbmcuYnJlYWtPdmVybGF5LmRpc3BsYXkpIHtcblx0XHRcdGluaXRpYWxpemVPdmVybGF5KCk7XG5cdFx0fVxuXHRcdG9uVGltZVVwZGF0ZSgpO1xuXHRcdHBsYXllci5vbihcInRpbWV1cGRhdGVcIiwgb25UaW1lVXBkYXRlKTtcblx0fVxuXG5cdC8vIHNldHVwIHRoZSBwbHVnaW4gYWZ0ZXIgd2UgbG9hZGVkIHZpZGVvJ3MgbWV0YSBkYXRhXG5cdHBsYXllci5vbihcImxvYWRlZG1ldGFkYXRhXCIsIGZ1bmN0aW9uKCkge1xuXHRcdGluaXRpYWxpemUoKTtcblx0fSk7XG5cblx0Ly8gZXhwb3NlZCBwbHVnaW4gQVBJXG5cdHBsYXllci5tYXJrZXJzID0ge1xuXHRcdGdldE1hcmtlcnM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIG1hcmtlcnNMaXN0O1xuXHRcdH0sXG5cdFx0bmV4dDogZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBnbyB0byB0aGUgbmV4dCBtYXJrZXIgZnJvbSBjdXJyZW50IHRpbWVzdGFtcFxuXHRcdFx0dmFyIGN1cnJlbnRUaW1lID0gcGxheWVyLmN1cnJlbnRUaW1lKCk7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG1hcmtlcnNMaXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHZhciBtYXJrZXJUaW1lID0gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTGlzdFtpXSk7XG5cdFx0XHRcdGlmIChtYXJrZXJUaW1lID4gY3VycmVudFRpbWUpIHtcblx0XHRcdFx0XHRwbGF5ZXIuY3VycmVudFRpbWUobWFya2VyVGltZSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXHRcdHByZXY6IGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gZ28gdG8gcHJldmlvdXMgbWFya2VyXG5cdFx0XHR2YXIgY3VycmVudFRpbWUgPSBwbGF5ZXIuY3VycmVudFRpbWUoKTtcblx0XHRcdGZvciAodmFyIGkgPSBtYXJrZXJzTGlzdC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0XHR2YXIgbWFya2VyVGltZSA9IHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2Vyc0xpc3RbaV0pO1xuXHRcdFx0XHQvLyBhZGQgYSB0aHJlc2hvbGRcblx0XHRcdFx0aWYgKG1hcmtlclRpbWUgKyAwLjUgPCBjdXJyZW50VGltZSkge1xuXHRcdFx0XHRcdHBsYXllci5jdXJyZW50VGltZShtYXJrZXJUaW1lKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0YWRkOiBmdW5jdGlvbihuZXdNYXJrZXJzKSB7XG5cdFx0XHQvLyBhZGQgbmV3IG1hcmtlcnMgZ2l2ZW4gYW4gYXJyYXkgb2YgaW5kZXhcblx0XHRcdGFkZE1hcmtlcnMobmV3TWFya2Vycyk7XG5cdFx0fSxcblx0XHRyZW1vdmU6IGZ1bmN0aW9uKGluZGV4QXJyYXkpIHtcblx0XHRcdC8vIHJlbW92ZSBtYXJrZXJzIGdpdmVuIGFuIGFycmF5IG9mIGluZGV4XG5cdFx0XHRyZW1vdmVNYXJrZXJzKGluZGV4QXJyYXkpO1xuXHRcdH0sXG5cdFx0cmVtb3ZlQWxsOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBpbmRleEFycmF5ID0gW107XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG1hcmtlcnNMaXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGluZGV4QXJyYXkucHVzaChpKTtcblx0XHRcdH1cblx0XHRcdHJlbW92ZU1hcmtlcnMoaW5kZXhBcnJheSk7XG5cdFx0fSxcblx0XHR1cGRhdGVUaW1lOiBmdW5jdGlvbigpIHtcblx0XHRcdC8vIG5vdGlmeSB0aGUgcGx1Z2luIHRvIHVwZGF0ZSB0aGUgVUkgZm9yIGNoYW5nZXMgaW4gbWFya2VyIHRpbWVzIFxuXHRcdFx0dXBkYXRlTWFya2VycygpO1xuXHRcdH0sXG5cdFx0cmVzZXQ6IGZ1bmN0aW9uKG5ld01hcmtlcnMpIHtcblx0XHRcdC8vIHJlbW92ZSBhbGwgdGhlIGV4aXN0aW5nIG1hcmtlcnMgYW5kIGFkZCBuZXcgb25lc1xuXHRcdFx0cGxheWVyLm1hcmtlcnMucmVtb3ZlQWxsKCk7XG5cdFx0XHRhZGRNYXJrZXJzKG5ld01hcmtlcnMpO1xuXHRcdH0sXG5cdFx0ZGVzdHJveTogZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyB1bnJlZ2lzdGVyIHRoZSBwbHVnaW5zIGFuZCBjbGVhbiB1cCBldmVuIGhhbmRsZXJzXG5cdFx0XHRwbGF5ZXIubWFya2Vycy5yZW1vdmVBbGwoKTtcblx0XHRcdGJyZWFrT3ZlcmxheS5yZW1vdmUoKTtcblx0XHRcdG1hcmtlclRpcC5yZW1vdmUoKTtcblx0XHRcdHBsYXllci5vZmYoXCJ0aW1ldXBkYXRlXCIsIHVwZGF0ZUJyZWFrT3ZlcmxheSk7XG5cdFx0XHRkZWxldGUgcGxheWVyLm1hcmtlcnM7XG5cdFx0fSxcblx0fTtcbn07XG5cbi8qKlxuICog5rC05Y2wXG4gKiBAcGFyYW0ge1t0eXBlXX0gb3B0aW9ucyBbZGVzY3JpcHRpb25dXG4gKiByZXR1cm4ge1t0eXBlXX0gIFtkZXNjcmlwdGlvbl1cbiAqL1xuY29uc3Qgd2F0ZXJNYXJrID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHR2YXIgZGVmYXVsdHMgPSB7XG5cdFx0XHRmaWxlOiAnT3duZWRfU3RhbXAucG5nJyxcblx0XHRcdHhwb3M6IDAsXG5cdFx0XHR5cG9zOiAwLFxuXHRcdFx0eHJlcGVhdDogMCxcblx0XHRcdG9wYWNpdHk6IDEwMCxcblx0XHRcdGNsaWNrYWJsZTogZmFsc2UsXG5cdFx0XHR1cmw6IFwiXCIsXG5cdFx0XHRjbGFzc05hbWU6ICd2anMtd2F0ZXJtYXJrJyxcblx0XHRcdHRleHQ6IGZhbHNlLFxuXHRcdFx0ZGVidWc6IGZhbHNlXG5cdFx0fSxcblx0XHRleHRlbmQgPSBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBhcmdzLCB0YXJnZXQsIGksIG9iamVjdCwgcHJvcGVydHk7XG5cdFx0XHRhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcblx0XHRcdHRhcmdldCA9IGFyZ3Muc2hpZnQoKSB8fCB7fTtcblx0XHRcdGZvciAoaSBpbiBhcmdzKSB7XG5cdFx0XHRcdG9iamVjdCA9IGFyZ3NbaV07XG5cdFx0XHRcdGZvciAocHJvcGVydHkgaW4gb2JqZWN0KSB7XG5cdFx0XHRcdFx0aWYgKG9iamVjdC5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpIHtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2Ygb2JqZWN0W3Byb3BlcnR5XSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0W3Byb3BlcnR5XSA9IGV4dGVuZCh0YXJnZXRbcHJvcGVydHldLCBvYmplY3RbcHJvcGVydHldKTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHRhcmdldFtwcm9wZXJ0eV0gPSBvYmplY3RbcHJvcGVydHldO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRhcmdldDtcblx0XHR9O1xuXG5cdC8vISBnbG9iYWwgdmFyaWJsZSBjb250YWluaW5nIHJlZmVyZW5jZSB0byB0aGUgRE9NIGVsZW1lbnRcblx0dmFyIGRpdjtcblxuXG5cdGlmIChzZXR0aW5ncy5kZWJ1ZykgY29uc29sZS5sb2coJ3dhdGVybWFyazogUmVnaXN0ZXIgaW5pdCcpO1xuXG5cdHZhciBvcHRpb25zLCBwbGF5ZXIsIHZpZGVvLCBpbWcsIGxpbms7XG5cdG9wdGlvbnMgPSBleHRlbmQoZGVmYXVsdHMsIHNldHRpbmdzKTtcblxuXHQvKiBHcmFiIHRoZSBuZWNlc3NhcnkgRE9NIGVsZW1lbnRzICovXG5cdHBsYXllciA9IHRoaXMuZWwoKTtcblx0dmlkZW8gPSB0aGlzLmVsKCkuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3ZpZGVvJylbMF07XG5cblx0Ly8gY3JlYXRlIHRoZSB3YXRlcm1hcmsgZWxlbWVudFxuXHRpZiAoIWRpdikge1xuXHRcdGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdGRpdi5jbGFzc05hbWUgPSBvcHRpb25zLmNsYXNzTmFtZTtcblx0fSBlbHNlIHtcblx0XHQvLyEgaWYgZGl2IGFscmVhZHkgZXhpc3RzLCBlbXB0eSBpdFxuXHRcdGRpdi5pbm5lckhUTUwgPSAnJztcblx0fVxuXG5cdC8vIGlmIHRleHQgaXMgc2V0LCBkaXNwbGF5IHRleHRcblx0aWYgKG9wdGlvbnMudGV4dClcblx0XHRkaXYudGV4dENvbnRlbnQgPSBvcHRpb25zLnRleHQ7XG5cblx0Ly8gaWYgaW1nIGlzIHNldCwgYWRkIGltZ1xuXHRpZiAob3B0aW9ucy5maWxlKSB7XG5cdFx0aW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG5cdFx0ZGl2LmFwcGVuZENoaWxkKGltZyk7XG5cdFx0aW1nLnNyYyA9IG9wdGlvbnMuZmlsZTtcblx0fVxuXG5cdC8vaW1nLnN0eWxlLmJvdHRvbSA9IFwiMFwiO1xuXHQvL2ltZy5zdHlsZS5yaWdodCA9IFwiMFwiO1xuXHRpZiAoKG9wdGlvbnMueXBvcyA9PT0gMCkgJiYgKG9wdGlvbnMueHBvcyA9PT0gMCkpIC8vIFRvcCBsZWZ0XG5cdHtcblx0XHRkaXYuc3R5bGUudG9wID0gXCIwXCI7XG5cdFx0ZGl2LnN0eWxlLmxlZnQgPSBcIjBcIjtcblx0fSBlbHNlIGlmICgob3B0aW9ucy55cG9zID09PSAwKSAmJiAob3B0aW9ucy54cG9zID09PSAxMDApKSAvLyBUb3AgcmlnaHRcblx0e1xuXHRcdGRpdi5zdHlsZS50b3AgPSBcIjBcIjtcblx0XHRkaXYuc3R5bGUucmlnaHQgPSBcIjBcIjtcblx0fSBlbHNlIGlmICgob3B0aW9ucy55cG9zID09PSAxMDApICYmIChvcHRpb25zLnhwb3MgPT09IDEwMCkpIC8vIEJvdHRvbSByaWdodFxuXHR7XG5cdFx0ZGl2LnN0eWxlLmJvdHRvbSA9IFwiMFwiO1xuXHRcdGRpdi5zdHlsZS5yaWdodCA9IFwiMFwiO1xuXHR9IGVsc2UgaWYgKChvcHRpb25zLnlwb3MgPT09IDEwMCkgJiYgKG9wdGlvbnMueHBvcyA9PT0gMCkpIC8vIEJvdHRvbSBsZWZ0XG5cdHtcblx0XHRkaXYuc3R5bGUuYm90dG9tID0gXCIwXCI7XG5cdFx0ZGl2LnN0eWxlLmxlZnQgPSBcIjBcIjtcblx0fSBlbHNlIGlmICgob3B0aW9ucy55cG9zID09PSA1MCkgJiYgKG9wdGlvbnMueHBvcyA9PT0gNTApKSAvLyBDZW50ZXJcblx0e1xuXHRcdGlmIChvcHRpb25zLmRlYnVnKSBjb25zb2xlLmxvZygnd2F0ZXJtYXJrOiBwbGF5ZXI6JyArIHBsYXllci53aWR0aCArICd4JyArIHBsYXllci5oZWlnaHQpO1xuXHRcdGlmIChvcHRpb25zLmRlYnVnKSBjb25zb2xlLmxvZygnd2F0ZXJtYXJrOiB2aWRlbzonICsgdmlkZW8udmlkZW9XaWR0aCArICd4JyArIHZpZGVvLnZpZGVvSGVpZ2h0KTtcblx0XHRpZiAob3B0aW9ucy5kZWJ1ZykgY29uc29sZS5sb2coJ3dhdGVybWFyazogaW1hZ2U6JyArIGltZy53aWR0aCArICd4JyArIGltZy5oZWlnaHQpO1xuXHRcdGRpdi5zdHlsZS50b3AgPSAodGhpcy5oZWlnaHQoKSAvIDIpICsgXCJweFwiO1xuXHRcdGRpdi5zdHlsZS5sZWZ0ID0gKHRoaXMud2lkdGgoKSAvIDIpICsgXCJweFwiO1xuXHR9XG5cdGRpdi5zdHlsZS5vcGFjaXR5ID0gb3B0aW9ucy5vcGFjaXR5O1xuXG5cdC8vZGl2LnN0eWxlLmJhY2tncm91bmRJbWFnZSA9IFwidXJsKFwiK29wdGlvbnMuZmlsZStcIilcIjtcblx0Ly9kaXYuc3R5bGUuYmFja2dyb3VuZFBvc2l0aW9uLnggPSBvcHRpb25zLnhwb3MrXCIlXCI7XG5cdC8vZGl2LnN0eWxlLmJhY2tncm91bmRQb3NpdGlvbi55ID0gb3B0aW9ucy55cG9zK1wiJVwiO1xuXHQvL2Rpdi5zdHlsZS5iYWNrZ3JvdW5kUmVwZWF0ID0gb3B0aW9ucy54cmVwZWF0O1xuXHQvL2Rpdi5zdHlsZS5vcGFjaXR5ID0gKG9wdGlvbnMub3BhY2l0eS8xMDApO1xuXG5cdC8vaWYgdXNlciB3YW50cyB3YXRlcm1hcmsgdG8gYmUgY2xpY2thYmxlLCBhZGQgYW5jaG9yIGVsZW1cblx0Ly90b2RvOiBjaGVjayBpZiBvcHRpb25zLnVybCBpcyBhbiBhY3R1YWwgdXJsP1xuXHRpZiAob3B0aW9ucy5jbGlja2FibGUgJiYgb3B0aW9ucy51cmwgIT09IFwiXCIpIHtcblx0XHRsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIik7XG5cdFx0bGluay5ocmVmID0gb3B0aW9ucy51cmw7XG5cdFx0bGluay50YXJnZXQgPSBcIl9ibGFua1wiO1xuXHRcdGxpbmsuYXBwZW5kQ2hpbGQoZGl2KTtcblx0XHQvL2FkZCBjbGlja2FibGUgd2F0ZXJtYXJrIHRvIHRoZSBwbGF5ZXJcblx0XHRwbGF5ZXIuYXBwZW5kQ2hpbGQobGluayk7XG5cdH0gZWxzZSB7XG5cdFx0Ly9hZGQgbm9ybWFsIHdhdGVybWFyayB0byB0aGUgcGxheWVyXG5cdFx0cGxheWVyLmFwcGVuZENoaWxkKGRpdik7XG5cdH1cblxuXHRpZiAob3B0aW9ucy5kZWJ1ZykgY29uc29sZS5sb2coJ3dhdGVybWFyazogUmVnaXN0ZXIgZW5kJyk7XG59O1xuXG4vLyBSZWdpc3RlciB0aGUgcGx1Z2luIHdpdGggdmlkZW8uanMuXG52aWRlb2pzLnBsdWdpbignb3BlbicsIG9wZW4pO1xudmlkZW9qcy5wbHVnaW4oJ3ZpZGVvSnNSZXNvbHV0aW9uU3dpdGNoZXInLCB2aWRlb0pzUmVzb2x1dGlvblN3aXRjaGVyKTtcbnZpZGVvanMucGx1Z2luKCdkaXNhYmxlUHJvZ3Jlc3MnLCBkaXNhYmxlUHJvZ3Jlc3MpO1xudmlkZW9qcy5wbHVnaW4oJ21hcmtlcnMnLCBtYXJrZXJzKTtcbnZpZGVvanMucGx1Z2luKCd3YXRlck1hcmsnLCB3YXRlck1hcmspO1xuXG4vLyBJbmNsdWRlIHRoZSB2ZXJzaW9uIG51bWJlci5cbm9wZW4uVkVSU0lPTiA9ICdfX1ZFUlNJT05fXyc7XG5cbmV4cG9ydCBkZWZhdWx0IG9wZW47IiwiaW1wb3J0IGRvY3VtZW50IGZyb20gJ2dsb2JhbC9kb2N1bWVudCc7XG5cbmltcG9ydCBRVW5pdCBmcm9tICdxdW5pdCc7XG5pbXBvcnQgc2lub24gZnJvbSAnc2lub24nO1xuaW1wb3J0IHZpZGVvanMgZnJvbSAndmlkZW8uanMnO1xuXG5pbXBvcnQgcGx1Z2luIGZyb20gJy4uL3NyYy9wbHVnaW4nO1xuXG5jb25zdCBQbGF5ZXIgPSB2aWRlb2pzLmdldENvbXBvbmVudCgnUGxheWVyJyk7XG5cblFVbml0LnRlc3QoJ3RoZSBlbnZpcm9ubWVudCBpcyBzYW5lJywgZnVuY3Rpb24oYXNzZXJ0KSB7XG4gIGFzc2VydC5zdHJpY3RFcXVhbCh0eXBlb2YgQXJyYXkuaXNBcnJheSwgJ2Z1bmN0aW9uJywgJ2VzNSBleGlzdHMnKTtcbiAgYXNzZXJ0LnN0cmljdEVxdWFsKHR5cGVvZiBzaW5vbiwgJ29iamVjdCcsICdzaW5vbiBleGlzdHMnKTtcbiAgYXNzZXJ0LnN0cmljdEVxdWFsKHR5cGVvZiB2aWRlb2pzLCAnZnVuY3Rpb24nLCAndmlkZW9qcyBleGlzdHMnKTtcbiAgYXNzZXJ0LnN0cmljdEVxdWFsKHR5cGVvZiBwbHVnaW4sICdmdW5jdGlvbicsICdwbHVnaW4gaXMgYSBmdW5jdGlvbicpO1xufSk7XG5cblFVbml0Lm1vZHVsZSgndmlkZW9qcy1vcGVuJywge1xuXG4gIGJlZm9yZUVhY2goKSB7XG5cbiAgICAvLyBNb2NrIHRoZSBlbnZpcm9ubWVudCdzIHRpbWVycyBiZWNhdXNlIGNlcnRhaW4gdGhpbmdzIC0gcGFydGljdWxhcmx5XG4gICAgLy8gcGxheWVyIHJlYWRpbmVzcyAtIGFyZSBhc3luY2hyb25vdXMgaW4gdmlkZW8uanMgNS4gVGhpcyBNVVNUIGNvbWVcbiAgICAvLyBiZWZvcmUgYW55IHBsYXllciBpcyBjcmVhdGVkOyBvdGhlcndpc2UsIHRpbWVycyBjb3VsZCBnZXQgY3JlYXRlZFxuICAgIC8vIHdpdGggdGhlIGFjdHVhbCB0aW1lciBtZXRob2RzIVxuICAgIHRoaXMuY2xvY2sgPSBzaW5vbi51c2VGYWtlVGltZXJzKCk7XG5cbiAgICB0aGlzLmZpeHR1cmUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncXVuaXQtZml4dHVyZScpO1xuICAgIHRoaXMudmlkZW8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd2aWRlbycpO1xuICAgIHRoaXMuZml4dHVyZS5hcHBlbmRDaGlsZCh0aGlzLnZpZGVvKTtcbiAgICB0aGlzLnBsYXllciA9IHZpZGVvanModGhpcy52aWRlbyk7XG4gIH0sXG5cbiAgYWZ0ZXJFYWNoKCkge1xuICAgIHRoaXMucGxheWVyLmRpc3Bvc2UoKTtcbiAgICB0aGlzLmNsb2NrLnJlc3RvcmUoKTtcbiAgfVxufSk7XG5cblFVbml0LnRlc3QoJ3JlZ2lzdGVycyBpdHNlbGYgd2l0aCB2aWRlby5qcycsIGZ1bmN0aW9uKGFzc2VydCkge1xuICBhc3NlcnQuZXhwZWN0KDIpO1xuXG4gIGFzc2VydC5zdHJpY3RFcXVhbChcbiAgICBQbGF5ZXIucHJvdG90eXBlLm9wZW4sXG4gICAgcGx1Z2luLFxuICAgICd2aWRlb2pzLW9wZW4gcGx1Z2luIHdhcyByZWdpc3RlcmVkJ1xuICApO1xuXG4gIHRoaXMucGxheWVyLm9wZW4oKTtcblxuICAvLyBUaWNrIHRoZSBjbG9jayBmb3J3YXJkIGVub3VnaCB0byB0cmlnZ2VyIHRoZSBwbGF5ZXIgdG8gYmUgXCJyZWFkeVwiLlxuICB0aGlzLmNsb2NrLnRpY2soMSk7XG5cbiAgYXNzZXJ0Lm9rKFxuICAgIHRoaXMucGxheWVyLmhhc0NsYXNzKCd2anMtb3BlbicpLFxuICAgICd0aGUgcGx1Z2luIGFkZHMgYSBjbGFzcyB0byB0aGUgcGxheWVyJ1xuICApO1xufSk7XG4iXX0=

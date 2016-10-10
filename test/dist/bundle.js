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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2dsb2JhbC9kb2N1bWVudC5qcyIsIi9Vc2Vycy9vcGVuL0RvY3VtZW50cy9Xb3JrL1NvdXJjZVRyZWUvdmpzLW9wZW4vc3JjL3BsdWdpbi5qcyIsIi9Vc2Vycy9vcGVuL0RvY3VtZW50cy9Xb3JrL1NvdXJjZVRyZWUvdmpzLW9wZW4vdGVzdC9wbHVnaW4udGVzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOzs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozt1QkNmb0IsVUFBVTs7Ozs7QUFHOUIsSUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDOzs7Ozs7Ozs7Ozs7O0FBYXBCLElBQU0sYUFBYSxHQUFHLFNBQWhCLGFBQWEsQ0FBSSxNQUFNLEVBQUUsT0FBTyxFQUFLO0FBQzFDLE9BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7Q0FFNUIsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7QUFjRixJQUFNLElBQUksR0FBRyxTQUFQLElBQUksQ0FBWSxPQUFPLEVBQUU7OztBQUM5QixLQUFJLENBQUMsS0FBSyxDQUFDLFlBQU07QUFDaEIsZUFBYSxRQUFPLHFCQUFRLFlBQVksQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztFQUM3RCxDQUFDLENBQUM7Q0FDSCxDQUFDOzs7Ozs7O0FBT0YsSUFBTSx5QkFBeUIsR0FBRyxtQ0FBUyxPQUFPLEVBQUU7Ozs7Ozs7QUFPbkQsS0FBSSxRQUFRLEdBQUcscUJBQVEsWUFBWSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUM7S0FDckQsTUFBTSxHQUFHLElBQUk7S0FDYixVQUFVLEdBQUcsRUFBRTtLQUNmLGNB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QUNyQixLQUFHLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUM7RUFDdkI7Ozs7QUFJRCxLQUFJLEFBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLElBQU0sT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLEFBQUM7QUFDaEQ7QUFDQyxNQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7QUFDcEIsTUFBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDO0dBQ3JCLE1BQU0sSUFBSSxBQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFNLE9BQU8sQ0FBQyxJQUFJLEtBQUssR0FBRyxBQUFDO0FBQ3pEO0FBQ0MsTUFBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO0FBQ3BCLE1BQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQztHQUN0QixNQUFNLElBQUksQUFBQyxPQUFPLENBQUMsSUFBSSxLQUFLLEdBQUcsSUFBTSxPQUFPLENBQUMsSUFBSSxLQUFLLEdBQUcsQUFBQztBQUMzRDtBQUNDLE1BQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQztBQUN2QixNQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUM7R0FDdEIsTUFBTSxJQUFJLEFBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxHQUFHLElBQU0sT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLEFBQUM7QUFDekQ7QUFDQyxNQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUM7QUFDdkIsTUFBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDO0dBQ3JCLE1BQU0sSUFBSSxBQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssRUFBRSxJQUFNLE9BQU8sQ0FBQyxJQUFJLEtBQUssRUFBRSxBQUFDO0FBQ3pEO0FBQ0MsT0FBSSxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEdBQUcsTUFBTSxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzFGLE9BQUksT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixHQUFHLEtBQUssQ0FBQyxVQUFVLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNqRyxPQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsR0FBRyxHQUFHLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDbkYsTUFBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsQUFBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFJLElBQUksQ0FBQztBQUMzQyxNQUFHLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxBQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEdBQUksSUFBSSxDQUFDO0dBQzNDO0FBQ0QsSUFBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQzs7Ozs7Ozs7OztBQVVwQyxLQUFJLE9BQU8sQ0FBQyxTQUFTLElBQUksT0FBTyxDQUFDLEdBQUcsS0FBSyxFQUFFLEVBQUU7QUFDNUMsTUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDbkMsTUFBSSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDO0FBQ3hCLE1BQUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDO0FBQ3ZCLE1BQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7O0FBRXRCLFFBQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDekIsTUFBTTs7QUFFTixRQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQ3hCOztBQUVELEtBQUksT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUM7Q0FFMUQsQ0FBQzs7O0FBR0YscUJBQVEsTUFBTSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM3QixxQkFBUSxNQUFNLENBQUMsMkJBQTJCLEVBQUUseUJBQXlCLENBQUMsQ0FBQztBQUN2RSxxQkFBUSxNQUFNLENBQUMsaUJBQWlCLEVBQUUsZUFBZSxDQUFDLENBQUM7QUFDbkQscUJBQVEsTUFBTSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUNuQyxxQkFBUSxNQUFNLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDOzs7QUFHdkMsSUFBSSxDQUFDLE9BQU8sR0FBRyxhQUFhLENBQUM7O3FCQUVkLElBQUk7Ozs7Ozs7Ozs7OzhCQ2pnQ0UsaUJBQWlCOzs7O3FCQUVwQixPQUFPOzs7O3FCQUNQLE9BQU87Ozs7dUJBQ0wsVUFBVTs7Ozt5QkFFWCxlQUFlOzs7O0FBRWxDLElBQU0sTUFBTSxHQUFHLHFCQUFRLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQzs7QUFFOUMsbUJBQU0sSUFBSSxDQUFDLHlCQUF5QixFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQ3JELFFBQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxLQUFLLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLENBQUMsQ0FBQztBQUNuRSxRQUFNLENBQUMsV0FBVyxDQUFDLHlCQUFZLEVBQUUsUUFBUSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0FBQzNELFFBQU0sQ0FBQyxXQUFXLENBQUMsMkJBQWMsRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztBQUNqRSxRQUFNLENBQUMsV0FBVyxDQUFDLDZCQUFhLEVBQUUsVUFBVSxFQUFFLHNCQUFzQixDQUFDLENBQUM7Q0FDdkUsQ0FBQyxDQUFDOztBQUVILG1CQUFNLE1BQU0sQ0FBQyxjQUFjLEVBQUU7O0FBRTNCLFlBQVUsRUFBQSxzQkFBRzs7Ozs7O0FBTVgsUUFBSSxDQUFDLEtBQUssR0FBRyxtQkFBTSxhQUFhLEVBQUUsQ0FBQzs7QUFFbkMsUUFBSSxDQUFDLE9BQU8sR0FBRyw0QkFBUyxjQUFjLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDeEQsUUFBSSxDQUFDLEtBQUssR0FBRyw0QkFBUyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDN0MsUUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3JDLFFBQUksQ0FBQyxNQUFNLEdBQUcsMEJBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0dBQ25DOztBQUVELFdBQVMsRUFBQSxxQkFBRztBQUNWLFFBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDdEIsUUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztHQUN0QjtDQUNGLENBQUMsQ0FBQzs7QUFFSCxtQkFBTSxJQUFJLENBQUMsZ0NBQWdDLEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDNUQsUUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFakIsUUFBTSxDQUFDLFdBQVcsQ0FDaEIsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLDBCQUVyQixvQ0FBb0MsQ0FDckMsQ0FBQzs7QUFFRixNQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDOzs7QUFHbkIsTUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRW5CLFFBQU0sQ0FBQyxFQUFFLENBQ1AsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQ2hDLHVDQUF1QyxDQUN4QyxDQUFDO0NBQ0gsQ0FBQyxDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIiIsInZhciB0b3BMZXZlbCA9IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDpcbiAgICB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHt9XG52YXIgbWluRG9jID0gcmVxdWlyZSgnbWluLWRvY3VtZW50Jyk7XG5cbmlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBkb2N1bWVudDtcbn0gZWxzZSB7XG4gICAgdmFyIGRvY2N5ID0gdG9wTGV2ZWxbJ19fR0xPQkFMX0RPQ1VNRU5UX0NBQ0hFQDQnXTtcblxuICAgIGlmICghZG9jY3kpIHtcbiAgICAgICAgZG9jY3kgPSB0b3BMZXZlbFsnX19HTE9CQUxfRE9DVU1FTlRfQ0FDSEVANCddID0gbWluRG9jO1xuICAgIH1cblxuICAgIG1vZHVsZS5leHBvcnRzID0gZG9jY3k7XG59XG4iLCJpbXBvcnQgdmlkZW9qcyBmcm9tICd2aWRlby5qcyc7XG5cbi8vIERlZmF1bHQgb3B0aW9ucyBmb3IgdGhlIHBsdWdpbi5cbmNvbnN0IGRlZmF1bHRzID0ge307XG5cbi8qKlxuICogRnVuY3Rpb24gdG8gaW52b2tlIHdoZW4gdGhlIHBsYXllciBpcyByZWFkeS5cbiAqXG4gKiBUaGlzIGlzIGEgZ3JlYXQgcGxhY2UgZm9yIHlvdXIgcGx1Z2luIHRvIGluaXRpYWxpemUgaXRzZWxmLiBXaGVuIHRoaXNcbiAqIGZ1bmN0aW9uIGlzIGNhbGxlZCwgdGhlIHBsYXllciB3aWxsIGhhdmUgaXRzIERPTSBhbmQgY2hpbGQgY29tcG9uZW50c1xuICogaW4gcGxhY2UuXG4gKlxuICogQGZ1bmN0aW9uIG9uUGxheWVyUmVhZHlcbiAqIEBwYXJhbSAgICB7UGxheWVyfSBwbGF5ZXJcbiAqIEBwYXJhbSAgICB7T2JqZWN0fSBbb3B0aW9ucz17fV1cbiAqL1xuY29uc3Qgb25QbGF5ZXJSZWFkeSA9IChwbGF5ZXIsIG9wdGlvbnMpID0+IHtcblx0cGxheWVyLmFkZENsYXNzKCd2anMtb3BlbicpO1xuXG59O1xuXG4vKipcbiAqIEEgdmlkZW8uanMgcGx1Z2luLlxuICpcbiAqIEluIHRoZSBwbHVnaW4gZnVuY3Rpb24sIHRoZSB2YWx1ZSBvZiBgdGhpc2AgaXMgYSB2aWRlby5qcyBgUGxheWVyYFxuICogaW5zdGFuY2UuIFlvdSBjYW5ub3QgcmVseSBvbiB0aGUgcGxheWVyIGJlaW5nIGluIGEgXCJyZWFkeVwiIHN0YXRlIGhlcmUsXG4gKiBkZXBlbmRpbmcgb24gaG93IHRoZSBwbHVnaW4gaXMgaW52b2tlZC4gVGhpcyBtYXkgb3IgbWF5IG5vdCBiZSBpbXBvcnRhbnRcbiAqIHRvIHlvdTsgaWYgbm90LCByZW1vdmUgdGhlIHdhaXQgZm9yIFwicmVhZHlcIiFcbiAqXG4gKiBAZnVuY3Rpb24gb3BlblxuICogQHBhcmFtICAgIHtPYmplY3R9IFtvcHRpb25zPXt9XVxuICogICAgICAgICAgIEFuIG9iamVjdCBvZiBvcHRpb25zIGxlZnQgdG8gdGhlIHBsdWdpbiBhdXRob3IgdG8gZGVmaW5lLlxuICovXG5jb25zdCBvcGVuID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHR0aGlzLnJlYWR5KCgpID0+IHtcblx0XHRvblBsYXllclJlYWR5KHRoaXMsIHZpZGVvanMubWVyZ2VPcHRpb25zKGRlZmF1bHRzLCBvcHRpb25zKSk7XG5cdH0pO1xufTtcblxuLyoqXG4gKiDliIbovqjnjodcbiAqIEBwYXJhbSB7W3R5cGVdfSBvcHRpb25zIFtkZXNjcmlwdGlvbl1cbiAqIHJldHVybiB7W3R5cGVdfSAgW2Rlc2NyaXB0aW9uXVxuICovXG5jb25zdCB2aWRlb0pzUmVzb2x1dGlvblN3aXRjaGVyID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXG5cdC8qKlxuXHQgKiBJbml0aWFsaXplIHRoZSBwbHVnaW4uXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uc10gY29uZmlndXJhdGlvbiBmb3IgdGhlIHBsdWdpblxuXHQgKi9cblxuXHR2YXIgc2V0dGluZ3MgPSB2aWRlb2pzLm1lcmdlT3B0aW9ucyhkZWZhdWx0cywgb3B0aW9ucyksXG5cdFx0cGxheWVyID0gdGhpcyxcblx0XHRncm91cGVkU3JjID0ge30sXG5cdFx0Y3VycmVudFNvdXJjZXMgPSB7fSxcblx0XHRjdXJyZW50UmVzb2x1dGlvblN0YXRlID0ge307XG5cblx0LyoqXG5cdCAqIFVwZGF0ZXMgcGxheWVyIHNvdXJjZXMgb3IgcmV0dXJucyBjdXJyZW50IHNvdXJjZSBVUkxcblx0ICogQHBhcmFtICAge0FycmF5fSAgW3NyY10gYXJyYXkgb2Ygc291cmNlcyBbe3NyYzogJycsIHR5cGU6ICcnLCBsYWJlbDogJycsIHJlczogJyd9XVxuXHQgKiBAcmV0dXJucyB7T2JqZWN0fFN0cmluZ3xBcnJheX0gdmlkZW9qcyBwbGF5ZXIgb2JqZWN0IGlmIHVzZWQgYXMgc2V0dGVyIG9yIGN1cnJlbnQgc291cmNlIFVSTCwgb2JqZWN0LCBvciBhcnJheSBvZiBzb3VyY2VzXG5cdCAqL1xuXHRwbGF5ZXIudXBkYXRlU3JjID0gZnVuY3Rpb24oc3JjKSB7XG5cdFx0Ly9SZXR1cm4gY3VycmVudCBzcmMgaWYgc3JjIGlzIG5vdCBnaXZlblxuXHRcdGlmICghc3JjKSB7XG5cdFx0XHRyZXR1cm4gcGxheWVyLnNyYygpO1xuXHRcdH1cblxuXHRcdC8vIE9ubHkgYWRkIHRob3NlIHNvdXJjZXMgd2hpY2ggd2UgY2FuIChtYXliZSkgcGxheVxuXHRcdHNyYyA9IHNyYy5maWx0ZXIoZnVuY3Rpb24oc291cmNlKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRyZXR1cm4gKHBsYXllci5jYW5QbGF5VHlwZShzb3VyY2UudHlwZSkgIT09ICcnKTtcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0Ly8gSWYgYSBUZWNoIGRvZXNuJ3QgeWV0IGhhdmUgY2FuUGxheVR5cGUganVzdCBhZGQgaXRcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0Ly9Tb3J0IHNvdXJjZXNcblx0XHR0aGlzLmN1cnJlbnRTb3VyY2VzID0gc3JjLnNvcnQoY29tcGFyZVJlc29sdXRpb25zKTtcblx0XHR0aGlzLmdyb3VwZWRTcmMgPSBidWNrZXRTb3VyY2VzKHRoaXMuY3VycmVudFNvdXJjZXMpO1xuXHRcdC8vIFBpY2sgb25lIGJ5IGRlZmF1bHRcblx0XHR2YXIgY2hvc2VuID0gY2hvb3NlU3JjKHRoaXMuZ3JvdXBlZFNyYywgdGhpcy5jdXJyZW50U291cmNlcyk7XG5cdFx0dGhpcy5jdXJyZW50UmVzb2x1dGlvblN0YXRlID0ge1xuXHRcdFx0bGFiZWw6IGNob3Nlbi5sYWJlbCxcblx0XHRcdHNvdXJjZXM6IGNob3Nlbi5zb3VyY2VzXG5cdFx0fTtcblxuXHRcdHBsYXllci50cmlnZ2VyKCd1cGRhdGVTb3VyY2VzJyk7XG5cdFx0cGxheWVyLnNldFNvdXJjZXNTYW5pdGl6ZWQoY2hvc2VuLnNvdXJjZXMsIGNob3Nlbi5sYWJlbCk7XG5cdFx0cGxheWVyLnRyaWdnZXIoJ3Jlc29sdXRpb25jaGFuZ2UnKTtcblx0XHRyZXR1cm4gcGxheWVyO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGN1cnJlbnQgcmVzb2x1dGlvbiBvciBzZXRzIG9uZSB3aGVuIGxhYmVsIGlzIHNwZWNpZmllZFxuXHQgKiBAcGFyYW0ge1N0cmluZ30gICBbbGFiZWxdICAgICAgICAgbGFiZWwgbmFtZVxuXHQgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY3VzdG9tU291cmNlUGlja2VyXSBjdXN0b20gZnVuY3Rpb24gdG8gY2hvb3NlIHNvdXJjZS4gVGFrZXMgMiBhcmd1bWVudHM6IHNvdXJjZXMsIGxhYmVsLiBNdXN0IHJldHVybiBwbGF5ZXIgb2JqZWN0LlxuXHQgKiBAcmV0dXJucyB7T2JqZWN0fSAgIGN1cnJlbnQgcmVzb2x1dGlvbiBvYmplY3Qge2xhYmVsOiAnJywgc291cmNlczogW119IGlmIHVzZWQgYXMgZ2V0dGVyIG9yIHBsYXllciBvYmplY3QgaWYgdXNlZCBhcyBzZXR0ZXJcblx0ICovXG5cdHBsYXllci5jdXJyZW50UmVzb2x1dGlvbiA9IGZ1bmN0aW9uKGxhYmVsLCBjdXN0b21Tb3VyY2VQaWNrZXIpIHtcblx0XHRpZiAobGFiZWwgPT0gbnVsbCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuY3VycmVudFJlc29sdXRpb25TdGF0ZTtcblx0XHR9XG5cblx0XHQvLyBMb29rdXAgc291cmNlcyBmb3IgbGFiZWxcblx0XHRpZiAoIXRoaXMuZ3JvdXBlZFNyYyB8fCAhdGhpcy5ncm91cGVkU3JjLmxhYmVsIHx8ICF0aGlzLmdyb3VwZWRTcmMubGFiZWxbbGFiZWxdKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHZhciBzb3VyY2VzID0gdGhpcy5ncm91cGVkU3JjLmxhYmVsW2xhYmVsXTtcblx0XHQvLyBSZW1lbWJlciBwbGF5ZXIgc3RhdGVcblx0XHR2YXIgY3VycmVudFRpbWUgPSBwbGF5ZXIuY3VycmVudFRpbWUoKTtcblx0XHR2YXIgaXNQYXVzZWQgPSBwbGF5ZXIucGF1c2VkKCk7XG5cblx0XHQvLyBIaWRlIGJpZ1BsYXlCdXR0b25cblx0XHRpZiAoIWlzUGF1c2VkICYmIHRoaXMucGxheWVyXy5vcHRpb25zXy5iaWdQbGF5QnV0dG9uKSB7XG5cdFx0XHR0aGlzLnBsYXllcl8uYmlnUGxheUJ1dHRvbi5oaWRlKCk7XG5cdFx0fVxuXG5cdFx0Ly8gQ2hhbmdlIHBsYXllciBzb3VyY2UgYW5kIHdhaXQgZm9yIGxvYWRlZGRhdGEgZXZlbnQsIHRoZW4gcGxheSB2aWRlb1xuXHRcdC8vIGxvYWRlZG1ldGFkYXRhIGRvZXNuJ3Qgd29yayByaWdodCBub3cgZm9yIGZsYXNoLlxuXHRcdC8vIFByb2JhYmx5IGJlY2F1c2Ugb2YgaHR0cHM6Ly9naXRodWIuY29tL3ZpZGVvanMvdmlkZW8tanMtc3dmL2lzc3Vlcy8xMjRcblx0XHQvLyBJZiBwbGF5ZXIgcHJlbG9hZCBpcyAnbm9uZScgYW5kIHRoZW4gbG9hZGVkZGF0YSBub3QgZmlyZWQuIFNvLCB3ZSBuZWVkIHRpbWV1cGRhdGUgZXZlbnQgZm9yIHNlZWsgaGFuZGxlICh0aW1ldXBkYXRlIGRvZXNuJ3Qgd29yayBwcm9wZXJseSB3aXRoIGZsYXNoKVxuXHRcdHZhciBoYW5kbGVTZWVrRXZlbnQgPSAnbG9hZGVkZGF0YSc7XG5cdFx0aWYgKHRoaXMucGxheWVyXy50ZWNoTmFtZV8gIT09ICdZb3V0dWJlJyAmJiB0aGlzLnBsYXllcl8ucHJlbG9hZCgpID09PSAnbm9uZScgJiYgdGhpcy5wbGF5ZXJfLnRlY2hOYW1lXyAhPT0gJ0ZsYXNoJykge1xuXHRcdFx0aGFuZGxlU2Vla0V2ZW50ID0gJ3RpbWV1cGRhdGUnO1xuXHRcdH1cblx0XHRwbGF5ZXJcblx0XHRcdC5zZXRTb3VyY2VzU2FuaXRpemVkKHNvdXJjZXMsIGxhYmVsLCBjdXN0b21Tb3VyY2VQaWNrZXIgfHwgc2V0dGluZ3MuY3VzdG9tU291cmNlUGlja2VyKVxuXHRcdFx0Lm9uZShoYW5kbGVTZWVrRXZlbnQsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRwbGF5ZXIuY3VycmVudFRpbWUoY3VycmVudFRpbWUpO1xuXHRcdFx0XHRwbGF5ZXIuaGFuZGxlVGVjaFNlZWtlZF8oKTtcblx0XHRcdFx0aWYgKCFpc1BhdXNlZCkge1xuXHRcdFx0XHRcdC8vIFN0YXJ0IHBsYXlpbmcgYW5kIGhpZGUgbG9hZGluZ1NwaW5uZXIgKGZsYXNoIGlzc3VlID8pXG5cdFx0XHRcdFx0cGxheWVyLnBsYXkoKS5oYW5kbGVUZWNoU2Vla2VkXygpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHBsYXllci50cmlnZ2VyKCdyZXNvbHV0aW9uY2hhbmdlJyk7XG5cdFx0XHR9KTtcblx0XHRyZXR1cm4gcGxheWVyO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGdyb3VwZWQgc291cmNlcyBieSBsYWJlbCwgcmVzb2x1dGlvbiBhbmQgdHlwZVxuXHQgKiBAcmV0dXJucyB7T2JqZWN0fSBncm91cGVkIHNvdXJjZXM6IHsgbGFiZWw6IHsga2V5OiBbXSB9LCByZXM6IHsga2V5OiBbXSB9LCB0eXBlOiB7IGtleTogW10gfSB9XG5cdCAqL1xuXHRwbGF5ZXIuZ2V0R3JvdXBlZFNyYyA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLmdyb3VwZWRTcmM7XG5cdH07XG5cblx0cGxheWVyLnNldFNvdXJjZXNTYW5pdGl6ZWQgPSBmdW5jdGlvbihzb3VyY2VzLCBsYWJlbCwgY3VzdG9tU291cmNlUGlja2VyKSB7XG5cdFx0dGhpcy5jdXJyZW50UmVzb2x1dGlvblN0YXRlID0ge1xuXHRcdFx0bGFiZWw6IGxhYmVsLFxuXHRcdFx0c291cmNlczogc291cmNlc1xuXHRcdH07XG5cdFx0aWYgKHR5cGVvZiBjdXN0b21Tb3VyY2VQaWNrZXIgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdHJldHVybiBjdXN0b21Tb3VyY2VQaWNrZXIocGxheWVyLCBzb3VyY2VzLCBsYWJlbCk7XG5cdFx0fVxuXHRcdHBsYXllci5zcmMoc291cmNlcy5tYXAoZnVuY3Rpb24oc3JjKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRzcmM6IHNyYy5zcmMsXG5cdFx0XHRcdHR5cGU6IHNyYy50eXBlLFxuXHRcdFx0XHRyZXM6IHNyYy5yZXNcblx0XHRcdH07XG5cdFx0fSkpO1xuXHRcdHJldHVybiBwbGF5ZXI7XG5cdH07XG5cblx0LyoqXG5cdCAqIE1ldGhvZCB1c2VkIGZvciBzb3J0aW5nIGxpc3Qgb2Ygc291cmNlc1xuXHQgKiBAcGFyYW0gICB7T2JqZWN0fSBhIC0gc291cmNlIG9iamVjdCB3aXRoIHJlcyBwcm9wZXJ0eVxuXHQgKiBAcGFyYW0gICB7T2JqZWN0fSBiIC0gc291cmNlIG9iamVjdCB3aXRoIHJlcyBwcm9wZXJ0eVxuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSByZXN1bHQgb2YgY29tcGFyYXRpb25cblx0ICovXG5cdGZ1bmN0aW9uIGNvbXBhcmVSZXNvbHV0aW9ucyhhLCBiKSB7XG5cdFx0aWYgKCFhLnJlcyB8fCAhYi5yZXMpIHtcblx0XHRcdHJldHVybiAwO1xuXHRcdH1cblx0XHRyZXR1cm4gKCtiLnJlcykgLSAoK2EucmVzKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBHcm91cCBzb3VyY2VzIGJ5IGxhYmVsLCByZXNvbHV0aW9uIGFuZCB0eXBlXG5cdCAqIEBwYXJhbSAgIHtBcnJheX0gIHNyYyBBcnJheSBvZiBzb3VyY2VzXG5cdCAqIEByZXR1cm5zIHtPYmplY3R9IGdyb3VwZWQgc291cmNlczogeyBsYWJlbDogeyBrZXk6IFtdIH0sIHJlczogeyBrZXk6IFtdIH0sIHR5cGU6IHsga2V5OiBbXSB9IH1cblx0ICovXG5cdGZ1bmN0aW9uIGJ1Y2tldFNvdXJjZXMoc3JjKSB7XG5cdFx0dmFyIHJlc29sdXRpb25zID0ge1xuXHRcdFx0bGFiZWw6IHt9LFxuXHRcdFx0cmVzOiB7fSxcblx0XHRcdHR5cGU6IHt9XG5cdFx0fTtcblx0XHRzcmMubWFwKGZ1bmN0aW9uKHNvdXJjZSkge1xuXHRcdFx0aW5pdFJlc29sdXRpb25LZXkocmVzb2x1dGlvbnMsICdsYWJlbCcsIHNvdXJjZSk7XG5cdFx0XHRpbml0UmVzb2x1dGlvbktleShyZXNvbHV0aW9ucywgJ3JlcycsIHNvdXJjZSk7XG5cdFx0XHRpbml0UmVzb2x1dGlvbktleShyZXNvbHV0aW9ucywgJ3R5cGUnLCBzb3VyY2UpO1xuXG5cdFx0XHRhcHBlbmRTb3VyY2VUb0tleShyZXNvbHV0aW9ucywgJ2xhYmVsJywgc291cmNlKTtcblx0XHRcdGFwcGVuZFNvdXJjZVRvS2V5KHJlc29sdXRpb25zLCAncmVzJywgc291cmNlKTtcblx0XHRcdGFwcGVuZFNvdXJjZVRvS2V5KHJlc29sdXRpb25zLCAndHlwZScsIHNvdXJjZSk7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHJlc29sdXRpb25zO1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5pdFJlc29sdXRpb25LZXkocmVzb2x1dGlvbnMsIGtleSwgc291cmNlKSB7XG5cdFx0aWYgKHJlc29sdXRpb25zW2tleV1bc291cmNlW2tleV1dID09IG51bGwpIHtcblx0XHRcdHJlc29sdXRpb25zW2tleV1bc291cmNlW2tleV1dID0gW107XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gYXBwZW5kU291cmNlVG9LZXkocmVzb2x1dGlvbnMsIGtleSwgc291cmNlKSB7XG5cdFx0cmVzb2x1dGlvbnNba2V5XVtzb3VyY2Vba2V5XV0ucHVzaChzb3VyY2UpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENob29zZSBzcmMgaWYgb3B0aW9uLmRlZmF1bHQgaXMgc3BlY2lmaWVkXG5cdCAqIEBwYXJhbSAgIHtPYmplY3R9IGdyb3VwZWRTcmMge3JlczogeyBrZXk6IFtdIH19XG5cdCAqIEBwYXJhbSAgIHtBcnJheX0gIHNyYyBBcnJheSBvZiBzb3VyY2VzIHNvcnRlZCBieSByZXNvbHV0aW9uIHVzZWQgdG8gZmluZCBoaWdoIGFuZCBsb3cgcmVzXG5cdCAqIEByZXR1cm5zIHtPYmplY3R9IHtyZXM6IHN0cmluZywgc291cmNlczogW119XG5cdCAqL1xuXHRmdW5jdGlvbiBjaG9vc2VTcmMoZ3JvdXBlZFNyYywgc3JjKSB7XG5cdFx0dmFyIHNlbGVjdGVkUmVzID0gc2V0dGluZ3NbJ2RlZmF1bHQnXTsgLy8gdXNlIGFycmF5IGFjY2VzcyBhcyBkZWZhdWx0IGlzIGEgcmVzZXJ2ZWQga2V5d29yZFxuXHRcdHZhciBzZWxlY3RlZExhYmVsID0gJyc7XG5cdFx0aWYgKHNlbGVjdGVkUmVzID09PSAnaGlnaCcpIHtcblx0XHRcdHNlbGVjdGVkUmVzID0gc3JjWzBdLnJlcztcblx0XHRcdHNlbGVjdGVkTGFiZWwgPSBzcmNbMF0ubGFiZWw7XG5cdFx0fSBlbHNlIGlmIChzZWxlY3RlZFJlcyA9PT0gJ2xvdycgfHwgc2VsZWN0ZWRSZXMgPT0gbnVsbCB8fCAhZ3JvdXBlZFNyYy5yZXNbc2VsZWN0ZWRSZXNdKSB7XG5cdFx0XHQvLyBTZWxlY3QgbG93LXJlcyBpZiBkZWZhdWx0IGlzIGxvdyBvciBub3Qgc2V0XG5cdFx0XHRzZWxlY3RlZFJlcyA9IHNyY1tzcmMubGVuZ3RoIC0gMV0ucmVzO1xuXHRcdFx0c2VsZWN0ZWRMYWJlbCA9IHNyY1tzcmMubGVuZ3RoIC0gMV0ubGFiZWw7XG5cdFx0fSBlbHNlIGlmIChncm91cGVkU3JjLnJlc1tzZWxlY3RlZFJlc10pIHtcblx0XHRcdHNlbGVjdGVkTGFiZWwgPSBncm91cGVkU3JjLnJlc1tzZWxlY3RlZFJlc11bMF0ubGFiZWw7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlczogc2VsZWN0ZWRSZXMsXG5cdFx0XHRsYWJlbDogc2VsZWN0ZWRMYWJlbCxcblx0XHRcdHNvdXJjZXM6IGdyb3VwZWRTcmMucmVzW3NlbGVjdGVkUmVzXVxuXHRcdH07XG5cdH1cblxuXHRmdW5jdGlvbiBpbml0UmVzb2x1dGlvbkZvcll0KHBsYXllcikge1xuXHRcdC8vIE1hcCB5b3V0dWJlIHF1YWxpdGllcyBuYW1lc1xuXHRcdHZhciBfeXRzID0ge1xuXHRcdFx0aGlnaHJlczoge1xuXHRcdFx0XHRyZXM6IDEwODAsXG5cdFx0XHRcdGxhYmVsOiAnMTA4MCcsXG5cdFx0XHRcdHl0OiAnaGlnaHJlcydcblx0XHRcdH0sXG5cdFx0XHRoZDEwODA6IHtcblx0XHRcdFx0cmVzOiAxMDgwLFxuXHRcdFx0XHRsYWJlbDogJzEwODAnLFxuXHRcdFx0XHR5dDogJ2hkMTA4MCdcblx0XHRcdH0sXG5cdFx0XHRoZDcyMDoge1xuXHRcdFx0XHRyZXM6IDcyMCxcblx0XHRcdFx0bGFiZWw6ICc3MjAnLFxuXHRcdFx0XHR5dDogJ2hkNzIwJ1xuXHRcdFx0fSxcblx0XHRcdGxhcmdlOiB7XG5cdFx0XHRcdHJlczogNDgwLFxuXHRcdFx0XHRsYWJlbDogJzQ4MCcsXG5cdFx0XHRcdHl0OiAnbGFyZ2UnXG5cdFx0XHR9LFxuXHRcdFx0bWVkaXVtOiB7XG5cdFx0XHRcdHJlczogMzYwLFxuXHRcdFx0XHRsYWJlbDogJzM2MCcsXG5cdFx0XHRcdHl0OiAnbWVkaXVtJ1xuXHRcdFx0fSxcblx0XHRcdHNtYWxsOiB7XG5cdFx0XHRcdHJlczogMjQwLFxuXHRcdFx0XHRsYWJlbDogJzI0MCcsXG5cdFx0XHRcdHl0OiAnc21hbGwnXG5cdFx0XHR9LFxuXHRcdFx0dGlueToge1xuXHRcdFx0XHRyZXM6IDE0NCxcblx0XHRcdFx0bGFiZWw6ICcxNDQnLFxuXHRcdFx0XHR5dDogJ3RpbnknXG5cdFx0XHR9LFxuXHRcdFx0YXV0bzoge1xuXHRcdFx0XHRyZXM6IDAsXG5cdFx0XHRcdGxhYmVsOiAnYXV0bycsXG5cdFx0XHRcdHl0OiAnYXV0bydcblx0XHRcdH1cblx0XHR9O1xuXHRcdC8vIE92ZXJ3cml0ZSBkZWZhdWx0IHNvdXJjZVBpY2tlciBmdW5jdGlvblxuXHRcdHZhciBfY3VzdG9tU291cmNlUGlja2VyID0gZnVuY3Rpb24oX3BsYXllciwgX3NvdXJjZXMsIF9sYWJlbCkge1xuXHRcdFx0Ly8gTm90ZSB0aGF0IHNldFBsYXllYmFja1F1YWxpdHkgaXMgYSBzdWdnZXN0aW9uLiBZVCBkb2VzIG5vdCBhbHdheXMgb2JleSBpdC5cblx0XHRcdHBsYXllci50ZWNoXy55dFBsYXllci5zZXRQbGF5YmFja1F1YWxpdHkoX3NvdXJjZXNbMF0uX3l0KTtcblx0XHRcdHBsYXllci50cmlnZ2VyKCd1cGRhdGVTb3VyY2VzJyk7XG5cdFx0XHRyZXR1cm4gcGxheWVyO1xuXHRcdH07XG5cdFx0c2V0dGluZ3MuY3VzdG9tU291cmNlUGlja2VyID0gX2N1c3RvbVNvdXJjZVBpY2tlcjtcblxuXHRcdC8vIEluaXQgcmVzb2x1dGlvblxuXHRcdHBsYXllci50ZWNoXy55dFBsYXllci5zZXRQbGF5YmFja1F1YWxpdHkoJ2F1dG8nKTtcblxuXHRcdC8vIFRoaXMgaXMgdHJpZ2dlcmVkIHdoZW4gdGhlIHJlc29sdXRpb24gYWN0dWFsbHkgY2hhbmdlc1xuXHRcdHBsYXllci50ZWNoXy55dFBsYXllci5hZGRFdmVudExpc3RlbmVyKCdvblBsYXliYWNrUXVhbGl0eUNoYW5nZScsIGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0XHRmb3IgKHZhciByZXMgaW4gX3l0cykge1xuXHRcdFx0XHRpZiAocmVzLnl0ID09PSBldmVudC5kYXRhKSB7XG5cdFx0XHRcdFx0cGxheWVyLmN1cnJlbnRSZXNvbHV0aW9uKHJlcy5sYWJlbCwgX2N1c3RvbVNvdXJjZVBpY2tlcik7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQvLyBXZSBtdXN0IHdhaXQgZm9yIHBsYXkgZXZlbnRcblx0XHRwbGF5ZXIub25lKCdwbGF5JywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgcXVhbGl0aWVzID0gcGxheWVyLnRlY2hfLnl0UGxheWVyLmdldEF2YWlsYWJsZVF1YWxpdHlMZXZlbHMoKTtcblx0XHRcdHZhciBfc291cmNlcyA9IFtdO1xuXG5cdFx0XHRxdWFsaXRpZXMubWFwKGZ1bmN0aW9uKHEpIHtcblx0XHRcdFx0X3NvdXJjZXMucHVzaCh7XG5cdFx0XHRcdFx0c3JjOiBwbGF5ZXIuc3JjKCkuc3JjLFxuXHRcdFx0XHRcdHR5cGU6IHBsYXllci5zcmMoKS50eXBlLFxuXHRcdFx0XHRcdGxhYmVsOiBfeXRzW3FdLmxhYmVsLFxuXHRcdFx0XHRcdHJlczogX3l0c1txXS5yZXMsXG5cdFx0XHRcdFx0X3l0OiBfeXRzW3FdLnl0XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cblx0XHRcdHBsYXllci5ncm91cGVkU3JjID0gYnVja2V0U291cmNlcyhfc291cmNlcyk7XG5cdFx0XHR2YXIgY2hvc2VuID0ge1xuXHRcdFx0XHRsYWJlbDogJ2F1dG8nLFxuXHRcdFx0XHRyZXM6IDAsXG5cdFx0XHRcdHNvdXJjZXM6IHBsYXllci5ncm91cGVkU3JjLmxhYmVsLmF1dG9cblx0XHRcdH07XG5cblx0XHRcdHRoaXMuY3VycmVudFJlc29sdXRpb25TdGF0ZSA9IHtcblx0XHRcdFx0bGFiZWw6IGNob3Nlbi5sYWJlbCxcblx0XHRcdFx0c291cmNlczogY2hvc2VuLnNvdXJjZXNcblx0XHRcdH07XG5cblx0XHRcdHBsYXllci50cmlnZ2VyKCd1cGRhdGVTb3VyY2VzJyk7XG5cdFx0XHRwbGF5ZXIuc2V0U291cmNlc1Nhbml0aXplZChjaG9zZW4uc291cmNlcywgY2hvc2VuLmxhYmVsLCBfY3VzdG9tU291cmNlUGlja2VyKTtcblx0XHR9KTtcblx0fVxuXG5cdHBsYXllci5yZWFkeShmdW5jdGlvbigpIHtcblx0XHRpZiAoc2V0dGluZ3MudWkpIHtcblx0XHRcdHZhciBtZW51QnV0dG9uID0gbmV3IFJlc29sdXRpb25NZW51QnV0dG9uKHBsYXllciwgc2V0dGluZ3MpO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucmVzb2x1dGlvblN3aXRjaGVyID0gcGxheWVyLmNvbnRyb2xCYXIuZWxfLmluc2VydEJlZm9yZShtZW51QnV0dG9uLmVsXywgcGxheWVyLmNvbnRyb2xCYXIuZ2V0Q2hpbGQoJ2Z1bGxzY3JlZW5Ub2dnbGUnKS5lbF8pO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucmVzb2x1dGlvblN3aXRjaGVyLmRpc3Bvc2UgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0dGhpcy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMpO1xuXHRcdFx0fTtcblx0XHR9XG5cdFx0aWYgKHBsYXllci5vcHRpb25zXy5zb3VyY2VzLmxlbmd0aCA+IDEpIHtcblx0XHRcdC8vIHRlY2g6IEh0bWw1IGFuZCBGbGFzaFxuXHRcdFx0Ly8gQ3JlYXRlIHJlc29sdXRpb24gc3dpdGNoZXIgZm9yIHZpZGVvcyBmb3JtIDxzb3VyY2U+IHRhZyBpbnNpZGUgPHZpZGVvPlxuXHRcdFx0cGxheWVyLnVwZGF0ZVNyYyhwbGF5ZXIub3B0aW9uc18uc291cmNlcyk7XG5cdFx0fVxuXG5cdFx0aWYgKHBsYXllci50ZWNoTmFtZV8gPT09ICdZb3V0dWJlJykge1xuXHRcdFx0Ly8gdGVjaDogWW91VHViZVxuXHRcdFx0aW5pdFJlc29sdXRpb25Gb3JZdChwbGF5ZXIpO1xuXHRcdH1cblx0fSk7XG5cblx0dmFyIHZpZGVvSnNSZXNvbHV0aW9uU3dpdGNoZXIsXG5cdFx0ZGVmYXVsdHMgPSB7XG5cdFx0XHR1aTogdHJ1ZVxuXHRcdH07XG5cblx0Lypcblx0ICogUmVzb2x1dGlvbiBtZW51IGl0ZW1cblx0ICovXG5cdHZhciBNZW51SXRlbSA9IHZpZGVvanMuZ2V0Q29tcG9uZW50KCdNZW51SXRlbScpO1xuXHR2YXIgUmVzb2x1dGlvbk1lbnVJdGVtID0gdmlkZW9qcy5leHRlbmQoTWVudUl0ZW0sIHtcblx0XHRjb25zdHJ1Y3RvcjogZnVuY3Rpb24ocGxheWVyLCBvcHRpb25zKSB7XG5cdFx0XHRvcHRpb25zLnNlbGVjdGFibGUgPSB0cnVlO1xuXHRcdFx0Ly8gU2V0cyB0aGlzLnBsYXllcl8sIHRoaXMub3B0aW9uc18gYW5kIGluaXRpYWxpemVzIHRoZSBjb21wb25lbnRcblx0XHRcdE1lbnVJdGVtLmNhbGwodGhpcywgcGxheWVyLCBvcHRpb25zKTtcblx0XHRcdHRoaXMuc3JjID0gb3B0aW9ucy5zcmM7XG5cblx0XHRcdHBsYXllci5vbigncmVzb2x1dGlvbmNoYW5nZScsIHZpZGVvanMuYmluZCh0aGlzLCB0aGlzLnVwZGF0ZSkpO1xuXHRcdH1cblx0fSk7XG5cdFJlc29sdXRpb25NZW51SXRlbS5wcm90b3R5cGUuaGFuZGxlQ2xpY2sgPSBmdW5jdGlvbihldmVudCkge1xuXHRcdE1lbnVJdGVtLnByb3RvdHlwZS5oYW5kbGVDbGljay5jYWxsKHRoaXMsIGV2ZW50KTtcblx0XHR0aGlzLnBsYXllcl8uY3VycmVudFJlc29sdXRpb24odGhpcy5vcHRpb25zXy5sYWJlbCk7XG5cdH07XG5cdFJlc29sdXRpb25NZW51SXRlbS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGVjdGlvbiA9IHRoaXMucGxheWVyXy5jdXJyZW50UmVzb2x1dGlvbigpO1xuXHRcdHRoaXMuc2VsZWN0ZWQodGhpcy5vcHRpb25zXy5sYWJlbCA9PT0gc2VsZWN0aW9uLmxhYmVsKTtcblx0fTtcblx0TWVudUl0ZW0ucmVnaXN0ZXJDb21wb25lbnQoJ1Jlc29sdXRpb25NZW51SXRlbScsIFJlc29sdXRpb25NZW51SXRlbSk7XG5cblx0Lypcblx0ICogUmVzb2x1dGlvbiBtZW51IGJ1dHRvblxuXHQgKi9cblx0dmFyIE1lbnVCdXR0b24gPSB2aWRlb2pzLmdldENvbXBvbmVudCgnTWVudUJ1dHRvbicpO1xuXHR2YXIgUmVzb2x1dGlvbk1lbnVCdXR0b24gPSB2aWRlb2pzLmV4dGVuZChNZW51QnV0dG9uLCB7XG5cdFx0Y29uc3RydWN0b3I6IGZ1bmN0aW9uKHBsYXllciwgb3B0aW9ucykge1xuXHRcdFx0dGhpcy5sYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0XHRcdG9wdGlvbnMubGFiZWwgPSAnUXVhbGl0eSc7XG5cdFx0XHQvLyBTZXRzIHRoaXMucGxheWVyXywgdGhpcy5vcHRpb25zXyBhbmQgaW5pdGlhbGl6ZXMgdGhlIGNvbXBvbmVudFxuXHRcdFx0TWVudUJ1dHRvbi5jYWxsKHRoaXMsIHBsYXllciwgb3B0aW9ucyk7XG5cdFx0XHR0aGlzLmVsKCkuc2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJywgJ1F1YWxpdHknKTtcblx0XHRcdHRoaXMuY29udHJvbFRleHQoJ1F1YWxpdHknKTtcblxuXHRcdFx0aWYgKG9wdGlvbnMuZHluYW1pY0xhYmVsKSB7XG5cdFx0XHRcdHZpZGVvanMuYWRkQ2xhc3ModGhpcy5sYWJlbCwgJ3Zqcy1yZXNvbHV0aW9uLWJ1dHRvbi1sYWJlbCcpO1xuXHRcdFx0XHR0aGlzLmVsKCkuYXBwZW5kQ2hpbGQodGhpcy5sYWJlbCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2YXIgc3RhdGljTGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cdFx0XHRcdHZpZGVvanMuYWRkQ2xhc3Moc3RhdGljTGFiZWwsICd2anMtbWVudS1pY29uJyk7XG5cdFx0XHRcdHRoaXMuZWwoKS5hcHBlbmRDaGlsZChzdGF0aWNMYWJlbCk7XG5cdFx0XHR9XG5cdFx0XHRwbGF5ZXIub24oJ3VwZGF0ZVNvdXJjZXMnLCB2aWRlb2pzLmJpbmQodGhpcywgdGhpcy51cGRhdGUpKTtcblx0XHR9XG5cdH0pO1xuXHRSZXNvbHV0aW9uTWVudUJ1dHRvbi5wcm90b3R5cGUuY3JlYXRlSXRlbXMgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgbWVudUl0ZW1zID0gW107XG5cdFx0dmFyIGxhYmVscyA9ICh0aGlzLnNvdXJjZXMgJiYgdGhpcy5zb3VyY2VzLmxhYmVsKSB8fCB7fTtcblxuXHRcdC8vIEZJWE1FIG9yZGVyIGlzIG5vdCBndWFyYW50ZWVkIGhlcmUuXG5cdFx0Zm9yICh2YXIga2V5IGluIGxhYmVscykge1xuXHRcdFx0aWYgKGxhYmVscy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHRcdG1lbnVJdGVtcy5wdXNoKG5ldyBSZXNvbHV0aW9uTWVudUl0ZW0oXG5cdFx0XHRcdFx0dGhpcy5wbGF5ZXJfLCB7XG5cdFx0XHRcdFx0XHRsYWJlbDoga2V5LFxuXHRcdFx0XHRcdFx0c3JjOiBsYWJlbHNba2V5XSxcblx0XHRcdFx0XHRcdHNlbGVjdGVkOiBrZXkgPT09ICh0aGlzLmN1cnJlbnRTZWxlY3Rpb24gPyB0aGlzLmN1cnJlbnRTZWxlY3Rpb24ubGFiZWwgOiBmYWxzZSlcblx0XHRcdFx0XHR9KSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBtZW51SXRlbXM7XG5cdH07XG5cdFJlc29sdXRpb25NZW51QnV0dG9uLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnNvdXJjZXMgPSB0aGlzLnBsYXllcl8uZ2V0R3JvdXBlZFNyYygpO1xuXHRcdHRoaXMuY3VycmVudFNlbGVjdGlvbiA9IHRoaXMucGxheWVyXy5jdXJyZW50UmVzb2x1dGlvbigpO1xuXHRcdHRoaXMubGFiZWwuaW5uZXJIVE1MID0gdGhpcy5jdXJyZW50U2VsZWN0aW9uID8gdGhpcy5jdXJyZW50U2VsZWN0aW9uLmxhYmVsIDogJyc7XG5cdFx0cmV0dXJuIE1lbnVCdXR0b24ucHJvdG90eXBlLnVwZGF0ZS5jYWxsKHRoaXMpO1xuXHR9O1xuXHRSZXNvbHV0aW9uTWVudUJ1dHRvbi5wcm90b3R5cGUuYnVpbGRDU1NDbGFzcyA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBNZW51QnV0dG9uLnByb3RvdHlwZS5idWlsZENTU0NsYXNzLmNhbGwodGhpcykgKyAnIHZqcy1yZXNvbHV0aW9uLWJ1dHRvbic7XG5cdH07XG5cdE1lbnVCdXR0b24ucmVnaXN0ZXJDb21wb25lbnQoJ1Jlc29sdXRpb25NZW51QnV0dG9uJywgUmVzb2x1dGlvbk1lbnVCdXR0b24pO1xuXG5cblxufTtcblxuLyoqXG4gKiDnpoHnlKjmu5rliqjmnaHmi5bliqhcbiAqIEBwYXJhbSB7W3R5cGVdfSBvcHRpb25zIFtkZXNjcmlwdGlvbl1cbiAqIHJldHVybiB7W3R5cGVdfSAgW2Rlc2NyaXB0aW9uXVxuICovXG5jb25zdCBkaXNhYmxlUHJvZ3Jlc3MgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdHZhclxuXHQvKipcblx0ICogQ29waWVzIHByb3BlcnRpZXMgZnJvbSBvbmUgb3IgbW9yZSBvYmplY3RzIG9udG8gYW4gb3JpZ2luYWwuXG5cdCAqL1xuXHRcdGV4dGVuZCA9IGZ1bmN0aW9uKG9iaiAvKiwgYXJnMSwgYXJnMiwgLi4uICovICkge1xuXHRcdFx0dmFyIGFyZywgaSwgaztcblx0XHRcdGZvciAoaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0YXJnID0gYXJndW1lbnRzW2ldO1xuXHRcdFx0XHRmb3IgKGsgaW4gYXJnKSB7XG5cdFx0XHRcdFx0aWYgKGFyZy5oYXNPd25Qcm9wZXJ0eShrKSkge1xuXHRcdFx0XHRcdFx0b2JqW2tdID0gYXJnW2tdO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG9iajtcblx0XHR9LFxuXG5cdFx0Ly8gZGVmaW5lIHNvbWUgcmVhc29uYWJsZSBkZWZhdWx0cyBmb3IgdGhpcyBzd2VldCBwbHVnaW5cblx0XHRkZWZhdWx0cyA9IHtcblx0XHRcdGF1dG9EaXNhYmxlOiBmYWxzZVxuXHRcdH07XG5cblxuXHR2YXJcblx0Ly8gc2F2ZSBhIHJlZmVyZW5jZSB0byB0aGUgcGxheWVyIGluc3RhbmNlXG5cdFx0cGxheWVyID0gdGhpcyxcblx0XHRzdGF0ZSA9IGZhbHNlLFxuXG5cdFx0Ly8gbWVyZ2Ugb3B0aW9ucyBhbmQgZGVmYXVsdHNcblx0XHRzZXR0aW5ncyA9IGV4dGVuZCh7fSwgZGVmYXVsdHMsIG9wdGlvbnMgfHwge30pO1xuXG5cdC8vIGRpc2FibGUgLyBlbmFibGUgbWV0aG9kc1xuXHRwbGF5ZXIuZGlzYWJsZVByb2dyZXNzID0ge1xuXHRcdGRpc2FibGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0c3RhdGUgPSB0cnVlO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub2ZmKFwiZm9jdXNcIik7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vZmYoXCJtb3VzZWRvd25cIik7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vZmYoXCJ0b3VjaHN0YXJ0XCIpO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub2ZmKFwiY2xpY2tcIik7XG5cdFx0fSxcblx0XHRlbmFibGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0c3RhdGUgPSBmYWxzZTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9uKFwiZm9jdXNcIiwgcGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIuaGFuZGxlRm9jdXMpO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub24oXCJtb3VzZWRvd25cIiwgcGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIuaGFuZGxlTW91c2VEb3duKTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9uKFwidG91Y2hzdGFydFwiLCBwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5oYW5kbGVNb3VzZURvd24pO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub24oXCJjbGlja1wiLCBwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5oYW5kbGVDbGljayk7XG5cdFx0fSxcblx0XHRnZXRTdGF0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gc3RhdGU7XG5cdFx0fVxuXHR9O1xuXG5cdGlmIChzZXR0aW5ncy5hdXRvRGlzYWJsZSkge1xuXHRcdHBsYXllci5kaXNhYmxlUHJvZ3Jlc3MuZGlzYWJsZSgpO1xuXHR9XG59O1xuXG4vKipcbiAqIOaJk+eCuVxuICogQHBhcmFtIHtbdHlwZV19IG9wdGlvbnMgW2Rlc2NyaXB0aW9uXVxuICogcmV0dXJuIHtbdHlwZV19ICBbZGVzY3JpcHRpb25dXG4gKi9cbmNvbnN0IG1hcmtlcnMgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdC8vZGVmYXVsdCBzZXR0aW5nXG5cdHZhciBkZWZhdWx0U2V0dGluZyA9IHtcblx0XHRtYXJrZXJTdHlsZToge1xuXHRcdFx0J3dpZHRoJzogJzhweCcsXG5cdFx0XHQnYm9yZGVyLXJhZGl1cyc6ICcyMCUnLFxuXHRcdFx0J2JhY2tncm91bmQtY29sb3InOiAncmdiYSgyNTUsMCwwLC41KSdcblx0XHR9LFxuXHRcdG1hcmtlclRpcDoge1xuXHRcdFx0ZGlzcGxheTogdHJ1ZSxcblx0XHRcdHRleHQ6IGZ1bmN0aW9uKG1hcmtlcikge1xuXHRcdFx0XHRyZXR1cm4gbWFya2VyLnRleHQ7XG5cdFx0XHR9LFxuXHRcdFx0dGltZTogZnVuY3Rpb24obWFya2VyKSB7XG5cdFx0XHRcdHJldHVybiBtYXJrZXIudGltZTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdGJyZWFrT3ZlcmxheToge1xuXHRcdFx0ZGlzcGxheTogZmFsc2UsXG5cdFx0XHRkaXNwbGF5VGltZTogMyxcblx0XHRcdHRleHQ6IGZ1bmN0aW9uKG1hcmtlcikge1xuXHRcdFx0XHRyZXR1cm4gXCJCcmVhayBvdmVybGF5OiBcIiArIG1hcmtlci5vdmVybGF5VGV4dDtcblx0XHRcdH0sXG5cdFx0XHRzdHlsZToge1xuXHRcdFx0XHQnd2lkdGgnOiAnMTAwJScsXG5cdFx0XHRcdCdoZWlnaHQnOiAnMjAlJyxcblx0XHRcdFx0J2JhY2tncm91bmQtY29sb3InOiAncmdiYSgwLDAsMCwwLjcpJyxcblx0XHRcdFx0J2NvbG9yJzogJ3doaXRlJyxcblx0XHRcdFx0J2ZvbnQtc2l6ZSc6ICcxN3B4J1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0b25NYXJrZXJDbGljazogZnVuY3Rpb24obWFya2VyKSB7fSxcblx0XHRvbk1hcmtlclJlYWNoZWQ6IGZ1bmN0aW9uKG1hcmtlcikge30sXG5cdFx0bWFya2VyczogW11cblx0fTtcblxuXHQvLyBjcmVhdGUgYSBub24tY29sbGlkaW5nIHJhbmRvbSBudW1iZXJcblx0ZnVuY3Rpb24gZ2VuZXJhdGVVVUlEKCkge1xuXHRcdHZhciBkID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cdFx0dmFyIHV1aWQgPSAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlKC9beHldL2csIGZ1bmN0aW9uKGMpIHtcblx0XHRcdHZhciByID0gKGQgKyBNYXRoLnJhbmRvbSgpICogMTYpICUgMTYgfCAwO1xuXHRcdFx0ZCA9IE1hdGguZmxvb3IoZCAvIDE2KTtcblx0XHRcdHJldHVybiAoYyA9PSAneCcgPyByIDogKHIgJiAweDMgfCAweDgpKS50b1N0cmluZygxNik7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHV1aWQ7XG5cdH07XG5cdC8qKlxuXHQgKiByZWdpc3RlciB0aGUgbWFya2VycyBwbHVnaW4gKGRlcGVuZGVudCBvbiBqcXVlcnkpXG5cdCAqL1xuXHR2YXIgc2V0dGluZyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0U2V0dGluZywgb3B0aW9ucyksXG5cdFx0bWFya2Vyc01hcCA9IHt9LFxuXHRcdG1hcmtlcnNMaXN0ID0gW10sIC8vIGxpc3Qgb2YgbWFya2VycyBzb3J0ZWQgYnkgdGltZVxuXHRcdHZpZGVvV3JhcHBlciA9ICQodGhpcy5lbCgpKSxcblx0XHRjdXJyZW50TWFya2VySW5kZXggPSAtMSxcblx0XHRwbGF5ZXIgPSB0aGlzLFxuXHRcdG1hcmtlclRpcCA9IG51bGwsXG5cdFx0YnJlYWtPdmVybGF5ID0gbnVsbCxcblx0XHRvdmVybGF5SW5kZXggPSAtMTtcblxuXHRmdW5jdGlvbiBzb3J0TWFya2Vyc0xpc3QoKSB7XG5cdFx0Ly8gc29ydCB0aGUgbGlzdCBieSB0aW1lIGluIGFzYyBvcmRlclxuXHRcdG1hcmtlcnNMaXN0LnNvcnQoZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0cmV0dXJuIHNldHRpbmcubWFya2VyVGlwLnRpbWUoYSkgLSBzZXR0aW5nLm1hcmtlclRpcC50aW1lKGIpO1xuXHRcdH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gYWRkTWFya2VycyhuZXdNYXJrZXJzKSB7XG5cdFx0Ly8gY3JlYXRlIHRoZSBtYXJrZXJzXG5cdFx0JC5lYWNoKG5ld01hcmtlcnMsIGZ1bmN0aW9uKGluZGV4LCBtYXJrZXIpIHtcblx0XHRcdG1hcmtlci5rZXkgPSBnZW5lcmF0ZVVVSUQoKTtcblxuXHRcdFx0dmlkZW9XcmFwcGVyLmZpbmQoJy52anMtcHJvZ3Jlc3MtY29udHJvbCAudmpzLXNsaWRlcicpLmFwcGVuZChcblx0XHRcdFx0Y3JlYXRlTWFya2VyRGl2KG1hcmtlcikpO1xuXG5cdFx0XHQvLyBzdG9yZSBtYXJrZXIgaW4gYW4gaW50ZXJuYWwgaGFzaCBtYXBcblx0XHRcdG1hcmtlcnNNYXBbbWFya2VyLmtleV0gPSBtYXJrZXI7XG5cdFx0XHRtYXJrZXJzTGlzdC5wdXNoKG1hcmtlcik7XG5cdFx0fSk7XG5cblx0XHRzb3J0TWFya2Vyc0xpc3QoKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGdldFBvc2l0aW9uKG1hcmtlcikge1xuXHRcdHJldHVybiAoc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXIpIC8gcGxheWVyLmR1cmF0aW9uKCkpICogMTAwXG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVNYXJrZXJEaXYobWFya2VyLCBkdXJhdGlvbikge1xuXHRcdHZhciBtYXJrZXJEaXYgPSAkKFwiPGRpdiBjbGFzcz0ndmpzLW1hcmtlcic+PC9kaXY+XCIpXG5cdFx0bWFya2VyRGl2LmNzcyhzZXR0aW5nLm1hcmtlclN0eWxlKVxuXHRcdFx0LmNzcyh7XG5cdFx0XHRcdC8vIFwibWFyZ2luLWxlZnRcIjogLXBhcnNlRmxvYXQobWFya2VyRGl2LmNzcyhcIndpZHRoXCIpKSAvIDIgKyAncHgnLFxuXHRcdFx0XHRcImxlZnRcIjogZ2V0UG9zaXRpb24obWFya2VyKSArICclJ1xuXHRcdFx0fSlcblx0XHRcdC5hdHRyKFwiZGF0YS1tYXJrZXIta2V5XCIsIG1hcmtlci5rZXkpXG5cdFx0XHQuYXR0cihcImRhdGEtbWFya2VyLXRpbWVcIiwgc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXIpKTtcblxuXHRcdC8vIGFkZCB1c2VyLWRlZmluZWQgY2xhc3MgdG8gbWFya2VyXG5cdFx0aWYgKG1hcmtlci5jbGFzcykge1xuXHRcdFx0bWFya2VyRGl2LmFkZENsYXNzKG1hcmtlci5jbGFzcyk7XG5cdFx0fVxuXG5cdFx0Ly8gYmluZCBjbGljayBldmVudCB0byBzZWVrIHRvIG1hcmtlciB0aW1lXG5cdFx0bWFya2VyRGl2Lm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcblxuXHRcdFx0dmFyIHByZXZlbnREZWZhdWx0ID0gZmFsc2U7XG5cdFx0XHRpZiAodHlwZW9mIHNldHRpbmcub25NYXJrZXJDbGljayA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRcdC8vIGlmIHJldHVybiBmYWxzZSwgcHJldmVudCBkZWZhdWx0IGJlaGF2aW9yXG5cdFx0XHRcdHByZXZlbnREZWZhdWx0ID0gc2V0dGluZy5vbk1hcmtlckNsaWNrKG1hcmtlcikgPT0gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdGlmICghcHJldmVudERlZmF1bHQpIHtcblx0XHRcdFx0dmFyIGtleSA9ICQodGhpcykuZGF0YSgnbWFya2VyLWtleScpO1xuXHRcdFx0XHRwbGF5ZXIuY3VycmVudFRpbWUoc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTWFwW2tleV0pKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdGlmIChzZXR0aW5nLm1hcmtlclRpcC5kaXNwbGF5KSB7XG5cdFx0XHRyZWdpc3Rlck1hcmtlclRpcEhhbmRsZXIobWFya2VyRGl2KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gbWFya2VyRGl2O1xuXHR9XG5cblx0ZnVuY3Rpb24gdXBkYXRlTWFya2VycygpIHtcblx0XHQvLyB1cGRhdGUgVUkgZm9yIG1hcmtlcnMgd2hvc2UgdGltZSBjaGFuZ2VkXG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG1hcmtlcnNMaXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgbWFya2VyID0gbWFya2Vyc0xpc3RbaV07XG5cdFx0XHR2YXIgbWFya2VyRGl2ID0gdmlkZW9XcmFwcGVyLmZpbmQoXCIudmpzLW1hcmtlcltkYXRhLW1hcmtlci1rZXk9J1wiICsgbWFya2VyLmtleSArIFwiJ11cIik7XG5cdFx0XHR2YXIgbWFya2VyVGltZSA9IHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2VyKTtcblxuXHRcdFx0aWYgKG1hcmtlckRpdi5kYXRhKCdtYXJrZXItdGltZScpICE9IG1hcmtlclRpbWUpIHtcblx0XHRcdFx0bWFya2VyRGl2LmNzcyh7XG5cdFx0XHRcdFx0XHRcImxlZnRcIjogZ2V0UG9zaXRpb24obWFya2VyKSArICclJ1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0LmF0dHIoXCJkYXRhLW1hcmtlci10aW1lXCIsIG1hcmtlclRpbWUpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRzb3J0TWFya2Vyc0xpc3QoKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHJlbW92ZU1hcmtlcnMoaW5kZXhBcnJheSkge1xuXHRcdC8vIHJlc2V0IG92ZXJsYXlcblx0XHRpZiAoYnJlYWtPdmVybGF5KSB7XG5cdFx0XHRvdmVybGF5SW5kZXggPSAtMTtcblx0XHRcdGJyZWFrT3ZlcmxheS5jc3MoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuXHRcdH1cblx0XHRjdXJyZW50TWFya2VySW5kZXggPSAtMTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgaW5kZXhBcnJheS5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGluZGV4ID0gaW5kZXhBcnJheVtpXTtcblx0XHRcdHZhciBtYXJrZXIgPSBtYXJrZXJzTGlzdFtpbmRleF07XG5cdFx0XHRpZiAobWFya2VyKSB7XG5cdFx0XHRcdC8vIGRlbGV0ZSBmcm9tIG1lbW9yeVxuXHRcdFx0XHRkZWxldGUgbWFya2Vyc01hcFttYXJrZXIua2V5XTtcblx0XHRcdFx0bWFya2Vyc0xpc3RbaW5kZXhdID0gbnVsbDtcblxuXHRcdFx0XHQvLyBkZWxldGUgZnJvbSBkb21cblx0XHRcdFx0dmlkZW9XcmFwcGVyLmZpbmQoXCIudmpzLW1hcmtlcltkYXRhLW1hcmtlci1rZXk9J1wiICsgbWFya2VyLmtleSArIFwiJ11cIikucmVtb3ZlKCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gY2xlYW4gdXAgYXJyYXlcblx0XHRmb3IgKHZhciBpID0gbWFya2Vyc0xpc3QubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcblx0XHRcdGlmIChtYXJrZXJzTGlzdFtpXSA9PT0gbnVsbCkge1xuXHRcdFx0XHRtYXJrZXJzTGlzdC5zcGxpY2UoaSwgMSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gc29ydCBhZ2FpblxuXHRcdHNvcnRNYXJrZXJzTGlzdCgpO1xuXHR9XG5cblxuXHQvLyBhdHRhY2ggaG92ZXIgZXZlbnQgaGFuZGxlclxuXHRmdW5jdGlvbiByZWdpc3Rlck1hcmtlclRpcEhhbmRsZXIobWFya2VyRGl2KSB7XG5cblx0XHRtYXJrZXJEaXYub24oJ21vdXNlb3ZlcicsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIG1hcmtlciA9IG1hcmtlcnNNYXBbJCh0aGlzKS5kYXRhKCdtYXJrZXIta2V5JyldO1xuXG5cdFx0XHRtYXJrZXJUaXAuZmluZCgnLnZqcy10aXAtaW5uZXInKS5odG1sKHNldHRpbmcubWFya2VyVGlwLnRleHQobWFya2VyKSk7XG5cblx0XHRcdC8vIG1hcmdpbi1sZWZ0IG5lZWRzIHRvIG1pbnVzIHRoZSBwYWRkaW5nIGxlbmd0aCB0byBhbGlnbiBjb3JyZWN0bHkgd2l0aCB0aGUgbWFya2VyXG5cdFx0XHRtYXJrZXJUaXAuY3NzKHtcblx0XHRcdFx0XCJsZWZ0XCI6IGdldFBvc2l0aW9uKG1hcmtlcikgKyAnJScsXG5cdFx0XHRcdFwibWFyZ2luLWxlZnRcIjogLXBhcnNlRmxvYXQobWFya2VyVGlwLmNzcyhcIndpZHRoXCIpKSAvIDIgLSA1ICsgJ3B4Jyxcblx0XHRcdFx0XCJ2aXNpYmlsaXR5XCI6IFwidmlzaWJsZVwiXG5cdFx0XHR9KTtcblxuXHRcdH0pLm9uKCdtb3VzZW91dCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0bWFya2VyVGlwLmNzcyhcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBpbml0aWFsaXplTWFya2VyVGlwKCkge1xuXHRcdG1hcmtlclRpcCA9ICQoXCI8ZGl2IGNsYXNzPSd2anMtdGlwJz48ZGl2IGNsYXNzPSd2anMtdGlwLWFycm93Jz48L2Rpdj48ZGl2IGNsYXNzPSd2anMtdGlwLWlubmVyJz48L2Rpdj48L2Rpdj5cIik7XG5cdFx0dmlkZW9XcmFwcGVyLmZpbmQoJy52anMtcHJvZ3Jlc3MtY29udHJvbCAudmpzLXNsaWRlcicpLmFwcGVuZChtYXJrZXJUaXApO1xuXHR9XG5cblx0Ly8gc2hvdyBvciBoaWRlIGJyZWFrIG92ZXJsYXlzXG5cdGZ1bmN0aW9uIHVwZGF0ZUJyZWFrT3ZlcmxheSgpIHtcblx0XHRpZiAoIXNldHRpbmcuYnJlYWtPdmVybGF5LmRpc3BsYXkgfHwgY3VycmVudE1hcmtlckluZGV4IDwgMCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHZhciBjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdHZhciBtYXJrZXIgPSBtYXJrZXJzTGlzdFtjdXJyZW50TWFya2VySW5kZXhdO1xuXHRcdHZhciBtYXJrZXJUaW1lID0gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXIpO1xuXG5cdFx0aWYgKGN1cnJlbnRUaW1lID49IG1hcmtlclRpbWUgJiZcblx0XHRcdGN1cnJlbnRUaW1lIDw9IChtYXJrZXJUaW1lICsgc2V0dGluZy5icmVha092ZXJsYXkuZGlzcGxheVRpbWUpKSB7XG5cdFx0XHRpZiAob3ZlcmxheUluZGV4ICE9IGN1cnJlbnRNYXJrZXJJbmRleCkge1xuXHRcdFx0XHRvdmVybGF5SW5kZXggPSBjdXJyZW50TWFya2VySW5kZXg7XG5cdFx0XHRcdGJyZWFrT3ZlcmxheS5maW5kKCcudmpzLWJyZWFrLW92ZXJsYXktdGV4dCcpLmh0bWwoc2V0dGluZy5icmVha092ZXJsYXkudGV4dChtYXJrZXIpKTtcblx0XHRcdH1cblxuXHRcdFx0YnJlYWtPdmVybGF5LmNzcygndmlzaWJpbGl0eScsIFwidmlzaWJsZVwiKTtcblxuXHRcdH0gZWxzZSB7XG5cdFx0XHRvdmVybGF5SW5kZXggPSAtMTtcblx0XHRcdGJyZWFrT3ZlcmxheS5jc3MoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuXHRcdH1cblx0fVxuXG5cdC8vIHByb2JsZW0gd2hlbiB0aGUgbmV4dCBtYXJrZXIgaXMgd2l0aGluIHRoZSBvdmVybGF5IGRpc3BsYXkgdGltZSBmcm9tIHRoZSBwcmV2aW91cyBtYXJrZXJcblx0ZnVuY3Rpb24gaW5pdGlhbGl6ZU92ZXJsYXkoKSB7XG5cdFx0YnJlYWtPdmVybGF5ID0gJChcIjxkaXYgY2xhc3M9J3Zqcy1icmVhay1vdmVybGF5Jz48ZGl2IGNsYXNzPSd2anMtYnJlYWstb3ZlcmxheS10ZXh0Jz48L2Rpdj48L2Rpdj5cIilcblx0XHRcdC5jc3Moc2V0dGluZy5icmVha092ZXJsYXkuc3R5bGUpO1xuXHRcdHZpZGVvV3JhcHBlci5hcHBlbmQoYnJlYWtPdmVybGF5KTtcblx0XHRvdmVybGF5SW5kZXggPSAtMTtcblx0fVxuXG5cdGZ1bmN0aW9uIG9uVGltZVVwZGF0ZSgpIHtcblx0XHRvblVwZGF0ZU1hcmtlcigpO1xuXHRcdHVwZGF0ZUJyZWFrT3ZlcmxheSgpO1xuXHR9XG5cblx0ZnVuY3Rpb24gb25VcGRhdGVNYXJrZXIoKSB7XG5cdFx0Lypcblx0XHQgICAgY2hlY2sgbWFya2VyIHJlYWNoZWQgaW4gYmV0d2VlbiBtYXJrZXJzXG5cdFx0ICAgIHRoZSBsb2dpYyBoZXJlIGlzIHRoYXQgaXQgdHJpZ2dlcnMgYSBuZXcgbWFya2VyIHJlYWNoZWQgZXZlbnQgb25seSBpZiB0aGUgcGxheWVyIFxuXHRcdCAgICBlbnRlcnMgYSBuZXcgbWFya2VyIHJhbmdlIChlLmcuIGZyb20gbWFya2VyIDEgdG8gbWFya2VyIDIpLiBUaHVzLCBpZiBwbGF5ZXIgaXMgb24gbWFya2VyIDEgYW5kIHVzZXIgY2xpY2tlZCBvbiBtYXJrZXIgMSBhZ2Fpbiwgbm8gbmV3IHJlYWNoZWQgZXZlbnQgaXMgdHJpZ2dlcmVkKVxuXHRcdCovXG5cblx0XHR2YXIgZ2V0TmV4dE1hcmtlclRpbWUgPSBmdW5jdGlvbihpbmRleCkge1xuXHRcdFx0aWYgKGluZGV4IDwgbWFya2Vyc0xpc3QubGVuZ3RoIC0gMSkge1xuXHRcdFx0XHRyZXR1cm4gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTGlzdFtpbmRleCArIDFdKTtcblx0XHRcdH1cblx0XHRcdC8vIG5leHQgbWFya2VyIHRpbWUgb2YgbGFzdCBtYXJrZXIgd291bGQgYmUgZW5kIG9mIHZpZGVvIHRpbWVcblx0XHRcdHJldHVybiBwbGF5ZXIuZHVyYXRpb24oKTtcblx0XHR9XG5cdFx0dmFyIGN1cnJlbnRUaW1lID0gcGxheWVyLmN1cnJlbnRUaW1lKCk7XG5cdFx0dmFyIG5ld01hcmtlckluZGV4O1xuXG5cdFx0aWYgKGN1cnJlbnRNYXJrZXJJbmRleCAhPSAtMSkge1xuXHRcdFx0Ly8gY2hlY2sgaWYgc3RheWluZyBhdCBzYW1lIG1hcmtlclxuXHRcdFx0dmFyIG5leHRNYXJrZXJUaW1lID0gZ2V0TmV4dE1hcmtlclRpbWUoY3VycmVudE1hcmtlckluZGV4KTtcblx0XHRcdGlmIChjdXJyZW50VGltZSA+PSBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcnNMaXN0W2N1cnJlbnRNYXJrZXJJbmRleF0pICYmXG5cdFx0XHRcdGN1cnJlbnRUaW1lIDwgbmV4dE1hcmtlclRpbWUpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBjaGVjayBmb3IgZW5kaW5nIChhdCB0aGUgZW5kIGN1cnJlbnQgdGltZSBlcXVhbHMgcGxheWVyIGR1cmF0aW9uKVxuXHRcdFx0aWYgKGN1cnJlbnRNYXJrZXJJbmRleCA9PT0gbWFya2Vyc0xpc3QubGVuZ3RoIC0gMSAmJlxuXHRcdFx0XHRjdXJyZW50VGltZSA9PT0gcGxheWVyLmR1cmF0aW9uKCkpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIGNoZWNrIGZpcnN0IG1hcmtlciwgbm8gbWFya2VyIGlzIHNlbGVjdGVkXG5cdFx0aWYgKG1hcmtlcnNMaXN0Lmxlbmd0aCA+IDAgJiZcblx0XHRcdGN1cnJlbnRUaW1lIDwgc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTGlzdFswXSkpIHtcblx0XHRcdG5ld01hcmtlckluZGV4ID0gLTE7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIGxvb2sgZm9yIG5ldyBpbmRleFxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBtYXJrZXJzTGlzdC5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRuZXh0TWFya2VyVGltZSA9IGdldE5leHRNYXJrZXJUaW1lKGkpO1xuXG5cdFx0XHRcdGlmIChjdXJyZW50VGltZSA+PSBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcnNMaXN0W2ldKSAmJlxuXHRcdFx0XHRcdGN1cnJlbnRUaW1lIDwgbmV4dE1hcmtlclRpbWUpIHtcblx0XHRcdFx0XHRuZXdNYXJrZXJJbmRleCA9IGk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBzZXQgbmV3IG1hcmtlciBpbmRleFxuXHRcdGlmIChuZXdNYXJrZXJJbmRleCAhPSBjdXJyZW50TWFya2VySW5kZXgpIHtcblx0XHRcdC8vIHRyaWdnZXIgZXZlbnRcblx0XHRcdGlmIChuZXdNYXJrZXJJbmRleCAhPSAtMSAmJiBvcHRpb25zLm9uTWFya2VyUmVhY2hlZCkge1xuXHRcdFx0XHRvcHRpb25zLm9uTWFya2VyUmVhY2hlZChtYXJrZXJzTGlzdFtuZXdNYXJrZXJJbmRleF0pO1xuXHRcdFx0fVxuXHRcdFx0Y3VycmVudE1hcmtlckluZGV4ID0gbmV3TWFya2VySW5kZXg7XG5cdFx0fVxuXG5cdH1cblxuXHQvLyBzZXR1cCB0aGUgd2hvbGUgdGhpbmdcblx0ZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcblx0XHRpZiAoc2V0dGluZy5tYXJrZXJUaXAuZGlzcGxheSkge1xuXHRcdFx0aW5pdGlhbGl6ZU1hcmtlclRpcCgpO1xuXHRcdH1cblxuXHRcdC8vIHJlbW92ZSBleGlzdGluZyBtYXJrZXJzIGlmIGFscmVhZHkgaW5pdGlhbGl6ZWRcblx0XHRwbGF5ZXIubWFya2Vycy5yZW1vdmVBbGwoKTtcblx0XHRhZGRNYXJrZXJzKG9wdGlvbnMubWFya2Vycyk7XG5cblx0XHRpZiAoc2V0dGluZy5icmVha092ZXJsYXkuZGlzcGxheSkge1xuXHRcdFx0aW5pdGlhbGl6ZU92ZXJsYXkoKTtcblx0XHR9XG5cdFx0b25UaW1lVXBkYXRlKCk7XG5cdFx0cGxheWVyLm9uKFwidGltZXVwZGF0ZVwiLCBvblRpbWVVcGRhdGUpO1xuXHR9XG5cblx0Ly8gc2V0dXAgdGhlIHBsdWdpbiBhZnRlciB3ZSBsb2FkZWQgdmlkZW8ncyBtZXRhIGRhdGFcblx0cGxheWVyLm9uKFwibG9hZGVkbWV0YWRhdGFcIiwgZnVuY3Rpb24oKSB7XG5cdFx0aW5pdGlhbGl6ZSgpO1xuXHR9KTtcblxuXHQvLyBleHBvc2VkIHBsdWdpbiBBUElcblx0cGxheWVyLm1hcmtlcnMgPSB7XG5cdFx0Z2V0TWFya2VyczogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gbWFya2Vyc0xpc3Q7XG5cdFx0fSxcblx0XHRuZXh0OiBmdW5jdGlvbigpIHtcblx0XHRcdC8vIGdvIHRvIHRoZSBuZXh0IG1hcmtlciBmcm9tIGN1cnJlbnQgdGltZXN0YW1wXG5cdFx0XHR2YXIgY3VycmVudFRpbWUgPSBwbGF5ZXIuY3VycmVudFRpbWUoKTtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbWFya2Vyc0xpc3QubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0dmFyIG1hcmtlclRpbWUgPSBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcnNMaXN0W2ldKTtcblx0XHRcdFx0aWYgKG1hcmtlclRpbWUgPiBjdXJyZW50VGltZSkge1xuXHRcdFx0XHRcdHBsYXllci5jdXJyZW50VGltZShtYXJrZXJUaW1lKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0cHJldjogZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBnbyB0byBwcmV2aW91cyBtYXJrZXJcblx0XHRcdHZhciBjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdFx0Zm9yICh2YXIgaSA9IG1hcmtlcnNMaXN0Lmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRcdHZhciBtYXJrZXJUaW1lID0gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTGlzdFtpXSk7XG5cdFx0XHRcdC8vIGFkZCBhIHRocmVzaG9sZFxuXHRcdFx0XHRpZiAobWFya2VyVGltZSArIDAuNSA8IGN1cnJlbnRUaW1lKSB7XG5cdFx0XHRcdFx0cGxheWVyLmN1cnJlbnRUaW1lKG1hcmtlclRpbWUpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRhZGQ6IGZ1bmN0aW9uKG5ld01hcmtlcnMpIHtcblx0XHRcdC8vIGFkZCBuZXcgbWFya2VycyBnaXZlbiBhbiBhcnJheSBvZiBpbmRleFxuXHRcdFx0YWRkTWFya2VycyhuZXdNYXJrZXJzKTtcblx0XHR9LFxuXHRcdHJlbW92ZTogZnVuY3Rpb24oaW5kZXhBcnJheSkge1xuXHRcdFx0Ly8gcmVtb3ZlIG1hcmtlcnMgZ2l2ZW4gYW4gYXJyYXkgb2YgaW5kZXhcblx0XHRcdHJlbW92ZU1hcmtlcnMoaW5kZXhBcnJheSk7XG5cdFx0fSxcblx0XHRyZW1vdmVBbGw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGluZGV4QXJyYXkgPSBbXTtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbWFya2Vyc0xpc3QubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aW5kZXhBcnJheS5wdXNoKGkpO1xuXHRcdFx0fVxuXHRcdFx0cmVtb3ZlTWFya2VycyhpbmRleEFycmF5KTtcblx0XHR9LFxuXHRcdHVwZGF0ZVRpbWU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gbm90aWZ5IHRoZSBwbHVnaW4gdG8gdXBkYXRlIHRoZSBVSSBmb3IgY2hhbmdlcyBpbiBtYXJrZXIgdGltZXMgXG5cdFx0XHR1cGRhdGVNYXJrZXJzKCk7XG5cdFx0fSxcblx0XHRyZXNldDogZnVuY3Rpb24obmV3TWFya2Vycykge1xuXHRcdFx0Ly8gcmVtb3ZlIGFsbCB0aGUgZXhpc3RpbmcgbWFya2VycyBhbmQgYWRkIG5ldyBvbmVzXG5cdFx0XHRwbGF5ZXIubWFya2Vycy5yZW1vdmVBbGwoKTtcblx0XHRcdGFkZE1hcmtlcnMobmV3TWFya2Vycyk7XG5cdFx0fSxcblx0XHRkZXN0cm95OiBmdW5jdGlvbigpIHtcblx0XHRcdC8vIHVucmVnaXN0ZXIgdGhlIHBsdWdpbnMgYW5kIGNsZWFuIHVwIGV2ZW4gaGFuZGxlcnNcblx0XHRcdHBsYXllci5tYXJrZXJzLnJlbW92ZUFsbCgpO1xuXHRcdFx0YnJlYWtPdmVybGF5LnJlbW92ZSgpO1xuXHRcdFx0bWFya2VyVGlwLnJlbW92ZSgpO1xuXHRcdFx0cGxheWVyLm9mZihcInRpbWV1cGRhdGVcIiwgdXBkYXRlQnJlYWtPdmVybGF5KTtcblx0XHRcdGRlbGV0ZSBwbGF5ZXIubWFya2Vycztcblx0XHR9LFxuXHR9O1xuXG59O1xuXG4vKipcbiAqIOawtOWNsFxuICogQHBhcmFtIHtbdHlwZV19IG9wdGlvbnMgW2Rlc2NyaXB0aW9uXVxuICogcmV0dXJuIHtbdHlwZV19ICBbZGVzY3JpcHRpb25dXG4gKi9cbmNvbnN0IHdhdGVyTWFyayA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0dmFyIGRlZmF1bHRzID0ge1xuXHRcdFx0ZmlsZTogJ093bmVkX1N0YW1wLnBuZycsXG5cdFx0XHR4cG9zOiAwLFxuXHRcdFx0eXBvczogMCxcblx0XHRcdHhyZXBlYXQ6IDAsXG5cdFx0XHRvcGFjaXR5OiAxMDAsXG5cdFx0XHRjbGlja2FibGU6IGZhbHNlLFxuXHRcdFx0dXJsOiBcIlwiLFxuXHRcdFx0Y2xhc3NOYW1lOiAndmpzLXdhdGVybWFyaycsXG5cdFx0XHR0ZXh0OiBmYWxzZSxcblx0XHRcdGRlYnVnOiBmYWxzZVxuXHRcdH0sXG5cdFx0ZXh0ZW5kID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgYXJncywgdGFyZ2V0LCBpLCBvYmplY3QsIHByb3BlcnR5O1xuXHRcdFx0YXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG5cdFx0XHR0YXJnZXQgPSBhcmdzLnNoaWZ0KCkgfHwge307XG5cdFx0XHRmb3IgKGkgaW4gYXJncykge1xuXHRcdFx0XHRvYmplY3QgPSBhcmdzW2ldO1xuXHRcdFx0XHRmb3IgKHByb3BlcnR5IGluIG9iamVjdCkge1xuXHRcdFx0XHRcdGlmIChvYmplY3QuaGFzT3duUHJvcGVydHkocHJvcGVydHkpKSB7XG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIG9iamVjdFtwcm9wZXJ0eV0gPT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdFx0XHRcdHRhcmdldFtwcm9wZXJ0eV0gPSBleHRlbmQodGFyZ2V0W3Byb3BlcnR5XSwgb2JqZWN0W3Byb3BlcnR5XSk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHR0YXJnZXRbcHJvcGVydHldID0gb2JqZWN0W3Byb3BlcnR5XTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiB0YXJnZXQ7XG5cdFx0fTtcblxuXHQvLyEgZ2xvYmFsIHZhcmlibGUgY29udGFpbmluZyByZWZlcmVuY2UgdG8gdGhlIERPTSBlbGVtZW50XG5cdHZhciBkaXY7XG5cblxuXHRpZiAoc2V0dGluZ3MuZGVidWcpIGNvbnNvbGUubG9nKCd3YXRlcm1hcms6IFJlZ2lzdGVyIGluaXQnKTtcblxuXHR2YXIgb3B0aW9ucywgcGxheWVyLCB2aWRlbywgaW1nLCBsaW5rO1xuXHRvcHRpb25zID0gZXh0ZW5kKGRlZmF1bHRzLCBzZXR0aW5ncyk7XG5cblx0LyogR3JhYiB0aGUgbmVjZXNzYXJ5IERPTSBlbGVtZW50cyAqL1xuXHRwbGF5ZXIgPSB0aGlzLmVsKCk7XG5cdHZpZGVvID0gdGhpcy5lbCgpLmdldEVsZW1lbnRzQnlUYWdOYW1lKCd2aWRlbycpWzBdO1xuXG5cdC8vIGNyZWF0ZSB0aGUgd2F0ZXJtYXJrIGVsZW1lbnRcblx0aWYgKCFkaXYpIHtcblx0XHRkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRkaXYuY2xhc3NOYW1lID0gb3B0aW9ucy5jbGFzc05hbWU7XG5cdH0gZWxzZSB7XG5cdFx0Ly8hIGlmIGRpdiBhbHJlYWR5IGV4aXN0cywgZW1wdHkgaXRcblx0XHRkaXYuaW5uZXJIVE1MID0gJyc7XG5cdH1cblxuXHQvLyBpZiB0ZXh0IGlzIHNldCwgZGlzcGxheSB0ZXh0XG5cdGlmIChvcHRpb25zLnRleHQpXG5cdFx0ZGl2LnRleHRDb250ZW50ID0gb3B0aW9ucy50ZXh0O1xuXG5cdC8vIGlmIGltZyBpcyBzZXQsIGFkZCBpbWdcblx0aWYgKG9wdGlvbnMuZmlsZSkge1xuXHRcdGltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuXHRcdGRpdi5hcHBlbmRDaGlsZChpbWcpO1xuXHRcdGltZy5zcmMgPSBvcHRpb25zLmZpbGU7XG5cdH1cblxuXHQvL2ltZy5zdHlsZS5ib3R0b20gPSBcIjBcIjtcblx0Ly9pbWcuc3R5bGUucmlnaHQgPSBcIjBcIjtcblx0aWYgKChvcHRpb25zLnlwb3MgPT09IDApICYmIChvcHRpb25zLnhwb3MgPT09IDApKSAvLyBUb3AgbGVmdFxuXHR7XG5cdFx0ZGl2LnN0eWxlLnRvcCA9IFwiMFwiO1xuXHRcdGRpdi5zdHlsZS5sZWZ0ID0gXCIwXCI7XG5cdH0gZWxzZSBpZiAoKG9wdGlvbnMueXBvcyA9PT0gMCkgJiYgKG9wdGlvbnMueHBvcyA9PT0gMTAwKSkgLy8gVG9wIHJpZ2h0XG5cdHtcblx0XHRkaXYuc3R5bGUudG9wID0gXCIwXCI7XG5cdFx0ZGl2LnN0eWxlLnJpZ2h0ID0gXCIwXCI7XG5cdH0gZWxzZSBpZiAoKG9wdGlvbnMueXBvcyA9PT0gMTAwKSAmJiAob3B0aW9ucy54cG9zID09PSAxMDApKSAvLyBCb3R0b20gcmlnaHRcblx0e1xuXHRcdGRpdi5zdHlsZS5ib3R0b20gPSBcIjBcIjtcblx0XHRkaXYuc3R5bGUucmlnaHQgPSBcIjBcIjtcblx0fSBlbHNlIGlmICgob3B0aW9ucy55cG9zID09PSAxMDApICYmIChvcHRpb25zLnhwb3MgPT09IDApKSAvLyBCb3R0b20gbGVmdFxuXHR7XG5cdFx0ZGl2LnN0eWxlLmJvdHRvbSA9IFwiMFwiO1xuXHRcdGRpdi5zdHlsZS5sZWZ0ID0gXCIwXCI7XG5cdH0gZWxzZSBpZiAoKG9wdGlvbnMueXBvcyA9PT0gNTApICYmIChvcHRpb25zLnhwb3MgPT09IDUwKSkgLy8gQ2VudGVyXG5cdHtcblx0XHRpZiAob3B0aW9ucy5kZWJ1ZykgY29uc29sZS5sb2coJ3dhdGVybWFyazogcGxheWVyOicgKyBwbGF5ZXIud2lkdGggKyAneCcgKyBwbGF5ZXIuaGVpZ2h0KTtcblx0XHRpZiAob3B0aW9ucy5kZWJ1ZykgY29uc29sZS5sb2coJ3dhdGVybWFyazogdmlkZW86JyArIHZpZGVvLnZpZGVvV2lkdGggKyAneCcgKyB2aWRlby52aWRlb0hlaWdodCk7XG5cdFx0aWYgKG9wdGlvbnMuZGVidWcpIGNvbnNvbGUubG9nKCd3YXRlcm1hcms6IGltYWdlOicgKyBpbWcud2lkdGggKyAneCcgKyBpbWcuaGVpZ2h0KTtcblx0XHRkaXYuc3R5bGUudG9wID0gKHRoaXMuaGVpZ2h0KCkgLyAyKSArIFwicHhcIjtcblx0XHRkaXYuc3R5bGUubGVmdCA9ICh0aGlzLndpZHRoKCkgLyAyKSArIFwicHhcIjtcblx0fVxuXHRkaXYuc3R5bGUub3BhY2l0eSA9IG9wdGlvbnMub3BhY2l0eTtcblxuXHQvL2Rpdi5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2UgPSBcInVybChcIitvcHRpb25zLmZpbGUrXCIpXCI7XG5cdC8vZGl2LnN0eWxlLmJhY2tncm91bmRQb3NpdGlvbi54ID0gb3B0aW9ucy54cG9zK1wiJVwiO1xuXHQvL2Rpdi5zdHlsZS5iYWNrZ3JvdW5kUG9zaXRpb24ueSA9IG9wdGlvbnMueXBvcytcIiVcIjtcblx0Ly9kaXYuc3R5bGUuYmFja2dyb3VuZFJlcGVhdCA9IG9wdGlvbnMueHJlcGVhdDtcblx0Ly9kaXYuc3R5bGUub3BhY2l0eSA9IChvcHRpb25zLm9wYWNpdHkvMTAwKTtcblxuXHQvL2lmIHVzZXIgd2FudHMgd2F0ZXJtYXJrIHRvIGJlIGNsaWNrYWJsZSwgYWRkIGFuY2hvciBlbGVtXG5cdC8vdG9kbzogY2hlY2sgaWYgb3B0aW9ucy51cmwgaXMgYW4gYWN0dWFsIHVybD9cblx0aWYgKG9wdGlvbnMuY2xpY2thYmxlICYmIG9wdGlvbnMudXJsICE9PSBcIlwiKSB7XG5cdFx0bGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xuXHRcdGxpbmsuaHJlZiA9IG9wdGlvbnMudXJsO1xuXHRcdGxpbmsudGFyZ2V0ID0gXCJfYmxhbmtcIjtcblx0XHRsaW5rLmFwcGVuZENoaWxkKGRpdik7XG5cdFx0Ly9hZGQgY2xpY2thYmxlIHdhdGVybWFyayB0byB0aGUgcGxheWVyXG5cdFx0cGxheWVyLmFwcGVuZENoaWxkKGxpbmspO1xuXHR9IGVsc2Uge1xuXHRcdC8vYWRkIG5vcm1hbCB3YXRlcm1hcmsgdG8gdGhlIHBsYXllclxuXHRcdHBsYXllci5hcHBlbmRDaGlsZChkaXYpO1xuXHR9XG5cblx0aWYgKG9wdGlvbnMuZGVidWcpIGNvbnNvbGUubG9nKCd3YXRlcm1hcms6IFJlZ2lzdGVyIGVuZCcpO1xuXG59O1xuXG4vLyBSZWdpc3RlciB0aGUgcGx1Z2luIHdpdGggdmlkZW8uanMuXG52aWRlb2pzLnBsdWdpbignb3BlbicsIG9wZW4pO1xudmlkZW9qcy5wbHVnaW4oJ3ZpZGVvSnNSZXNvbHV0aW9uU3dpdGNoZXInLCB2aWRlb0pzUmVzb2x1dGlvblN3aXRjaGVyKTtcbnZpZGVvanMucGx1Z2luKCdkaXNhYmxlUHJvZ3Jlc3MnLCBkaXNhYmxlUHJvZ3Jlc3MpO1xudmlkZW9qcy5wbHVnaW4oJ21hcmtlcnMnLCBtYXJrZXJzKTtcbnZpZGVvanMucGx1Z2luKCd3YXRlck1hcmsnLCB3YXRlck1hcmspO1xuXG4vLyBJbmNsdWRlIHRoZSB2ZXJzaW9uIG51bWJlci5cbm9wZW4uVkVSU0lPTiA9ICdfX1ZFUlNJT05fXyc7XG5cbmV4cG9ydCBkZWZhdWx0IG9wZW47IiwiaW1wb3J0IGRvY3VtZW50IGZyb20gJ2dsb2JhbC9kb2N1bWVudCc7XG5cbmltcG9ydCBRVW5pdCBmcm9tICdxdW5pdCc7XG5pbXBvcnQgc2lub24gZnJvbSAnc2lub24nO1xuaW1wb3J0IHZpZGVvanMgZnJvbSAndmlkZW8uanMnO1xuXG5pbXBvcnQgcGx1Z2luIGZyb20gJy4uL3NyYy9wbHVnaW4nO1xuXG5jb25zdCBQbGF5ZXIgPSB2aWRlb2pzLmdldENvbXBvbmVudCgnUGxheWVyJyk7XG5cblFVbml0LnRlc3QoJ3RoZSBlbnZpcm9ubWVudCBpcyBzYW5lJywgZnVuY3Rpb24oYXNzZXJ0KSB7XG4gIGFzc2VydC5zdHJpY3RFcXVhbCh0eXBlb2YgQXJyYXkuaXNBcnJheSwgJ2Z1bmN0aW9uJywgJ2VzNSBleGlzdHMnKTtcbiAgYXNzZXJ0LnN0cmljdEVxdWFsKHR5cGVvZiBzaW5vbiwgJ29iamVjdCcsICdzaW5vbiBleGlzdHMnKTtcbiAgYXNzZXJ0LnN0cmljdEVxdWFsKHR5cGVvZiB2aWRlb2pzLCAnZnVuY3Rpb24nLCAndmlkZW9qcyBleGlzdHMnKTtcbiAgYXNzZXJ0LnN0cmljdEVxdWFsKHR5cGVvZiBwbHVnaW4sICdmdW5jdGlvbicsICdwbHVnaW4gaXMgYSBmdW5jdGlvbicpO1xufSk7XG5cblFVbml0Lm1vZHVsZSgndmlkZW9qcy1vcGVuJywge1xuXG4gIGJlZm9yZUVhY2goKSB7XG5cbiAgICAvLyBNb2NrIHRoZSBlbnZpcm9ubWVudCdzIHRpbWVycyBiZWNhdXNlIGNlcnRhaW4gdGhpbmdzIC0gcGFydGljdWxhcmx5XG4gICAgLy8gcGxheWVyIHJlYWRpbmVzcyAtIGFyZSBhc3luY2hyb25vdXMgaW4gdmlkZW8uanMgNS4gVGhpcyBNVVNUIGNvbWVcbiAgICAvLyBiZWZvcmUgYW55IHBsYXllciBpcyBjcmVhdGVkOyBvdGhlcndpc2UsIHRpbWVycyBjb3VsZCBnZXQgY3JlYXRlZFxuICAgIC8vIHdpdGggdGhlIGFjdHVhbCB0aW1lciBtZXRob2RzIVxuICAgIHRoaXMuY2xvY2sgPSBzaW5vbi51c2VGYWtlVGltZXJzKCk7XG5cbiAgICB0aGlzLmZpeHR1cmUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncXVuaXQtZml4dHVyZScpO1xuICAgIHRoaXMudmlkZW8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd2aWRlbycpO1xuICAgIHRoaXMuZml4dHVyZS5hcHBlbmRDaGlsZCh0aGlzLnZpZGVvKTtcbiAgICB0aGlzLnBsYXllciA9IHZpZGVvanModGhpcy52aWRlbyk7XG4gIH0sXG5cbiAgYWZ0ZXJFYWNoKCkge1xuICAgIHRoaXMucGxheWVyLmRpc3Bvc2UoKTtcbiAgICB0aGlzLmNsb2NrLnJlc3RvcmUoKTtcbiAgfVxufSk7XG5cblFVbml0LnRlc3QoJ3JlZ2lzdGVycyBpdHNlbGYgd2l0aCB2aWRlby5qcycsIGZ1bmN0aW9uKGFzc2VydCkge1xuICBhc3NlcnQuZXhwZWN0KDIpO1xuXG4gIGFzc2VydC5zdHJpY3RFcXVhbChcbiAgICBQbGF5ZXIucHJvdG90eXBlLm9wZW4sXG4gICAgcGx1Z2luLFxuICAgICd2aWRlb2pzLW9wZW4gcGx1Z2luIHdhcyByZWdpc3RlcmVkJ1xuICApO1xuXG4gIHRoaXMucGxheWVyLm9wZW4oKTtcblxuICAvLyBUaWNrIHRoZSBjbG9jayBmb3J3YXJkIGVub3VnaCB0byB0cmlnZ2VyIHRoZSBwbGF5ZXIgdG8gYmUgXCJyZWFkeVwiLlxuICB0aGlzLmNsb2NrLnRpY2soMSk7XG5cbiAgYXNzZXJ0Lm9rKFxuICAgIHRoaXMucGxheWVyLmhhc0NsYXNzKCd2anMtb3BlbicpLFxuICAgICd0aGUgcGx1Z2luIGFkZHMgYSBjbGFzcyB0byB0aGUgcGxheWVyJ1xuICApO1xufSk7XG4iXX0=

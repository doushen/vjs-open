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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2dsb2JhbC9kb2N1bWVudC5qcyIsIi9Vc2Vycy9vcGVuL0RvY3VtZW50cy9Xb3JrL1NvdXJjZVRyZWUvdmpzLW9wZW4vc3JjL3BsdWdpbi5qcyIsIi9Vc2Vycy9vcGVuL0RvY3VtZW50cy9Xb3JrL1NvdXJjZVRyZWUvdmpzLW9wZW4vdGVzdC9wbHVnaW4udGVzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOzs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozt1QkNmb0IsVUFBVTs7Ozs7QUFJOUIsSUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDOzs7Ozs7Ozs7Ozs7O0FBYXBCLElBQU0sYUFBYSxHQUFHLFNBQWhCLGFBQWEsQ0FBSSxNQUFNLEVBQUUsT0FBTyxFQUFLO0FBQzFDLE9BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7Q0FFNUIsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7QUFjRixJQUFNLElBQUksR0FBRyxTQUFQLElBQUksQ0FBWSxPQUFPLEVBQUU7OztBQUM5QixLQUFJLENBQUMsS0FBSyxDQUFDLFlBQU07QUFDaEIsZUFBYSxRQUFPLHFCQUFRLFlBQVksQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztFQUM3RCxDQUFDLENBQUM7Q0FDSCxDQUFDOzs7Ozs7O0FBT0YsSUFBTSx5QkFBeUIsR0FBRyxtQ0FBUyxPQUFPLEVBQUU7Ozs7Ozs7QUFPbkQsS0FBSSxRQUFRLEdBQUcscUJBQVEsWUFBWSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUM7S0FDckQsTUFBTSxHQUFHLElBQUk7S0FDYixVQUFVLEdBQUcsRUFBRTtLQUNmLGNB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QUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ3RCLFFBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7R0FDdEI7Q0FDRixDQUFDLENBQUM7O0FBRUgsbUJBQU0sSUFBSSxDQUFDLGdDQUFnQyxFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQzVELFFBQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRWpCLFFBQU0sQ0FBQyxXQUFXLENBQ2hCLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSwwQkFFckIsb0NBQW9DLENBQ3JDLENBQUM7O0FBRUYsTUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQzs7O0FBR25CLE1BQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVuQixRQUFNLENBQUMsRUFBRSxDQUNQLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUNoQyx1Q0FBdUMsQ0FDeEMsQ0FBQztDQUNILENBQUMsQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIiLCJ2YXIgdG9wTGV2ZWwgPSB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6XG4gICAgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB7fVxudmFyIG1pbkRvYyA9IHJlcXVpcmUoJ21pbi1kb2N1bWVudCcpO1xuXG5pZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZG9jdW1lbnQ7XG59IGVsc2Uge1xuICAgIHZhciBkb2NjeSA9IHRvcExldmVsWydfX0dMT0JBTF9ET0NVTUVOVF9DQUNIRUA0J107XG5cbiAgICBpZiAoIWRvY2N5KSB7XG4gICAgICAgIGRvY2N5ID0gdG9wTGV2ZWxbJ19fR0xPQkFMX0RPQ1VNRU5UX0NBQ0hFQDQnXSA9IG1pbkRvYztcbiAgICB9XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGRvY2N5O1xufVxuIiwiaW1wb3J0IHZpZGVvanMgZnJvbSAndmlkZW8uanMnO1xuXG5cbi8vIERlZmF1bHQgb3B0aW9ucyBmb3IgdGhlIHBsdWdpbi5cbmNvbnN0IGRlZmF1bHRzID0ge307XG5cbi8qKlxuICogRnVuY3Rpb24gdG8gaW52b2tlIHdoZW4gdGhlIHBsYXllciBpcyByZWFkeS5cbiAqXG4gKiBUaGlzIGlzIGEgZ3JlYXQgcGxhY2UgZm9yIHlvdXIgcGx1Z2luIHRvIGluaXRpYWxpemUgaXRzZWxmLiBXaGVuIHRoaXNcbiAqIGZ1bmN0aW9uIGlzIGNhbGxlZCwgdGhlIHBsYXllciB3aWxsIGhhdmUgaXRzIERPTSBhbmQgY2hpbGQgY29tcG9uZW50c1xuICogaW4gcGxhY2UuXG4gKlxuICogQGZ1bmN0aW9uIG9uUGxheWVyUmVhZHlcbiAqIEBwYXJhbSAgICB7UGxheWVyfSBwbGF5ZXJcbiAqIEBwYXJhbSAgICB7T2JqZWN0fSBbb3B0aW9ucz17fV1cbiAqL1xuY29uc3Qgb25QbGF5ZXJSZWFkeSA9IChwbGF5ZXIsIG9wdGlvbnMpID0+IHtcblx0cGxheWVyLmFkZENsYXNzKCd2anMtb3BlbicpO1xuXG59O1xuXG4vKipcbiAqIEEgdmlkZW8uanMgcGx1Z2luLlxuICpcbiAqIEluIHRoZSBwbHVnaW4gZnVuY3Rpb24sIHRoZSB2YWx1ZSBvZiBgdGhpc2AgaXMgYSB2aWRlby5qcyBgUGxheWVyYFxuICogaW5zdGFuY2UuIFlvdSBjYW5ub3QgcmVseSBvbiB0aGUgcGxheWVyIGJlaW5nIGluIGEgXCJyZWFkeVwiIHN0YXRlIGhlcmUsXG4gKiBkZXBlbmRpbmcgb24gaG93IHRoZSBwbHVnaW4gaXMgaW52b2tlZC4gVGhpcyBtYXkgb3IgbWF5IG5vdCBiZSBpbXBvcnRhbnRcbiAqIHRvIHlvdTsgaWYgbm90LCByZW1vdmUgdGhlIHdhaXQgZm9yIFwicmVhZHlcIiFcbiAqXG4gKiBAZnVuY3Rpb24gb3BlblxuICogQHBhcmFtICAgIHtPYmplY3R9IFtvcHRpb25zPXt9XVxuICogICAgICAgICAgIEFuIG9iamVjdCBvZiBvcHRpb25zIGxlZnQgdG8gdGhlIHBsdWdpbiBhdXRob3IgdG8gZGVmaW5lLlxuICovXG5jb25zdCBvcGVuID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHR0aGlzLnJlYWR5KCgpID0+IHtcblx0XHRvblBsYXllclJlYWR5KHRoaXMsIHZpZGVvanMubWVyZ2VPcHRpb25zKGRlZmF1bHRzLCBvcHRpb25zKSk7XG5cdH0pO1xufTtcblxuLyoqXG4gKiDliIbovqjnjodcbiAqIEBwYXJhbSB7W3R5cGVdfSBvcHRpb25zIFtkZXNjcmlwdGlvbl1cbiAqIHJldHVybiB7W3R5cGVdfSAgW2Rlc2NyaXB0aW9uXVxuICovXG5jb25zdCB2aWRlb0pzUmVzb2x1dGlvblN3aXRjaGVyID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXG5cdC8qKlxuXHQgKiBJbml0aWFsaXplIHRoZSBwbHVnaW4uXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uc10gY29uZmlndXJhdGlvbiBmb3IgdGhlIHBsdWdpblxuXHQgKi9cblxuXHR2YXIgc2V0dGluZ3MgPSB2aWRlb2pzLm1lcmdlT3B0aW9ucyhkZWZhdWx0cywgb3B0aW9ucyksXG5cdFx0cGxheWVyID0gdGhpcyxcblx0XHRncm91cGVkU3JjID0ge30sXG5cdFx0Y3VycmVudFNvdXJjZXMgPSB7fSxcblx0XHRjdXJyZW50UmVzb2x1dGlvblN0YXRlID0ge307XG5cblx0LyoqXG5cdCAqIFVwZGF0ZXMgcGxheWVyIHNvdXJjZXMgb3IgcmV0dXJucyBjdXJyZW50IHNvdXJjZSBVUkxcblx0ICogQHBhcmFtICAge0FycmF5fSAgW3NyY10gYXJyYXkgb2Ygc291cmNlcyBbe3NyYzogJycsIHR5cGU6ICcnLCBsYWJlbDogJycsIHJlczogJyd9XVxuXHQgKiBAcmV0dXJucyB7T2JqZWN0fFN0cmluZ3xBcnJheX0gdmlkZW9qcyBwbGF5ZXIgb2JqZWN0IGlmIHVzZWQgYXMgc2V0dGVyIG9yIGN1cnJlbnQgc291cmNlIFVSTCwgb2JqZWN0LCBvciBhcnJheSBvZiBzb3VyY2VzXG5cdCAqL1xuXHRwbGF5ZXIudXBkYXRlU3JjID0gZnVuY3Rpb24oc3JjKSB7XG5cdFx0Ly9SZXR1cm4gY3VycmVudCBzcmMgaWYgc3JjIGlzIG5vdCBnaXZlblxuXHRcdGlmICghc3JjKSB7XG5cdFx0XHRyZXR1cm4gcGxheWVyLnNyYygpO1xuXHRcdH1cblxuXHRcdC8vIE9ubHkgYWRkIHRob3NlIHNvdXJjZXMgd2hpY2ggd2UgY2FuIChtYXliZSkgcGxheVxuXHRcdHNyYyA9IHNyYy5maWx0ZXIoZnVuY3Rpb24oc291cmNlKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRyZXR1cm4gKHBsYXllci5jYW5QbGF5VHlwZShzb3VyY2UudHlwZSkgIT09ICcnKTtcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0Ly8gSWYgYSBUZWNoIGRvZXNuJ3QgeWV0IGhhdmUgY2FuUGxheVR5cGUganVzdCBhZGQgaXRcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0Ly9Tb3J0IHNvdXJjZXNcblx0XHR0aGlzLmN1cnJlbnRTb3VyY2VzID0gc3JjLnNvcnQoY29tcGFyZVJlc29sdXRpb25zKTtcblx0XHR0aGlzLmdyb3VwZWRTcmMgPSBidWNrZXRTb3VyY2VzKHRoaXMuY3VycmVudFNvdXJjZXMpO1xuXHRcdC8vIFBpY2sgb25lIGJ5IGRlZmF1bHRcblx0XHR2YXIgY2hvc2VuID0gY2hvb3NlU3JjKHRoaXMuZ3JvdXBlZFNyYywgdGhpcy5jdXJyZW50U291cmNlcyk7XG5cdFx0dGhpcy5jdXJyZW50UmVzb2x1dGlvblN0YXRlID0ge1xuXHRcdFx0bGFiZWw6IGNob3Nlbi5sYWJlbCxcblx0XHRcdHNvdXJjZXM6IGNob3Nlbi5zb3VyY2VzXG5cdFx0fTtcblxuXHRcdHBsYXllci50cmlnZ2VyKCd1cGRhdGVTb3VyY2VzJyk7XG5cdFx0cGxheWVyLnNldFNvdXJjZXNTYW5pdGl6ZWQoY2hvc2VuLnNvdXJjZXMsIGNob3Nlbi5sYWJlbCk7XG5cdFx0cGxheWVyLnRyaWdnZXIoJ3Jlc29sdXRpb25jaGFuZ2UnKTtcblx0XHRyZXR1cm4gcGxheWVyO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGN1cnJlbnQgcmVzb2x1dGlvbiBvciBzZXRzIG9uZSB3aGVuIGxhYmVsIGlzIHNwZWNpZmllZFxuXHQgKiBAcGFyYW0ge1N0cmluZ30gICBbbGFiZWxdICAgICAgICAgbGFiZWwgbmFtZVxuXHQgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY3VzdG9tU291cmNlUGlja2VyXSBjdXN0b20gZnVuY3Rpb24gdG8gY2hvb3NlIHNvdXJjZS4gVGFrZXMgMiBhcmd1bWVudHM6IHNvdXJjZXMsIGxhYmVsLiBNdXN0IHJldHVybiBwbGF5ZXIgb2JqZWN0LlxuXHQgKiBAcmV0dXJucyB7T2JqZWN0fSAgIGN1cnJlbnQgcmVzb2x1dGlvbiBvYmplY3Qge2xhYmVsOiAnJywgc291cmNlczogW119IGlmIHVzZWQgYXMgZ2V0dGVyIG9yIHBsYXllciBvYmplY3QgaWYgdXNlZCBhcyBzZXR0ZXJcblx0ICovXG5cdHBsYXllci5jdXJyZW50UmVzb2x1dGlvbiA9IGZ1bmN0aW9uKGxhYmVsLCBjdXN0b21Tb3VyY2VQaWNrZXIpIHtcblx0XHRpZiAobGFiZWwgPT0gbnVsbCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuY3VycmVudFJlc29sdXRpb25TdGF0ZTtcblx0XHR9XG5cblx0XHQvLyBMb29rdXAgc291cmNlcyBmb3IgbGFiZWxcblx0XHRpZiAoIXRoaXMuZ3JvdXBlZFNyYyB8fCAhdGhpcy5ncm91cGVkU3JjLmxhYmVsIHx8ICF0aGlzLmdyb3VwZWRTcmMubGFiZWxbbGFiZWxdKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHZhciBzb3VyY2VzID0gdGhpcy5ncm91cGVkU3JjLmxhYmVsW2xhYmVsXTtcblx0XHQvLyBSZW1lbWJlciBwbGF5ZXIgc3RhdGVcblx0XHR2YXIgY3VycmVudFRpbWUgPSBwbGF5ZXIuY3VycmVudFRpbWUoKTtcblx0XHR2YXIgaXNQYXVzZWQgPSBwbGF5ZXIucGF1c2VkKCk7XG5cblx0XHQvLyBIaWRlIGJpZ1BsYXlCdXR0b25cblx0XHRpZiAoIWlzUGF1c2VkICYmIHRoaXMucGxheWVyXy5vcHRpb25zXy5iaWdQbGF5QnV0dG9uKSB7XG5cdFx0XHR0aGlzLnBsYXllcl8uYmlnUGxheUJ1dHRvbi5oaWRlKCk7XG5cdFx0fVxuXG5cdFx0Ly8gQ2hhbmdlIHBsYXllciBzb3VyY2UgYW5kIHdhaXQgZm9yIGxvYWRlZGRhdGEgZXZlbnQsIHRoZW4gcGxheSB2aWRlb1xuXHRcdC8vIGxvYWRlZG1ldGFkYXRhIGRvZXNuJ3Qgd29yayByaWdodCBub3cgZm9yIGZsYXNoLlxuXHRcdC8vIFByb2JhYmx5IGJlY2F1c2Ugb2YgaHR0cHM6Ly9naXRodWIuY29tL3ZpZGVvanMvdmlkZW8tanMtc3dmL2lzc3Vlcy8xMjRcblx0XHQvLyBJZiBwbGF5ZXIgcHJlbG9hZCBpcyAnbm9uZScgYW5kIHRoZW4gbG9hZGVkZGF0YSBub3QgZmlyZWQuIFNvLCB3ZSBuZWVkIHRpbWV1cGRhdGUgZXZlbnQgZm9yIHNlZWsgaGFuZGxlICh0aW1ldXBkYXRlIGRvZXNuJ3Qgd29yayBwcm9wZXJseSB3aXRoIGZsYXNoKVxuXHRcdHZhciBoYW5kbGVTZWVrRXZlbnQgPSAnbG9hZGVkZGF0YSc7XG5cdFx0aWYgKHRoaXMucGxheWVyXy50ZWNoTmFtZV8gIT09ICdZb3V0dWJlJyAmJiB0aGlzLnBsYXllcl8ucHJlbG9hZCgpID09PSAnbm9uZScgJiYgdGhpcy5wbGF5ZXJfLnRlY2hOYW1lXyAhPT0gJ0ZsYXNoJykge1xuXHRcdFx0aGFuZGxlU2Vla0V2ZW50ID0gJ3RpbWV1cGRhdGUnO1xuXHRcdH1cblx0XHRwbGF5ZXJcblx0XHRcdC5zZXRTb3VyY2VzU2FuaXRpemVkKHNvdXJjZXMsIGxhYmVsLCBjdXN0b21Tb3VyY2VQaWNrZXIgfHwgc2V0dGluZ3MuY3VzdG9tU291cmNlUGlja2VyKVxuXHRcdFx0Lm9uZShoYW5kbGVTZWVrRXZlbnQsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRwbGF5ZXIuY3VycmVudFRpbWUoY3VycmVudFRpbWUpO1xuXHRcdFx0XHRwbGF5ZXIuaGFuZGxlVGVjaFNlZWtlZF8oKTtcblx0XHRcdFx0aWYgKCFpc1BhdXNlZCkge1xuXHRcdFx0XHRcdC8vIFN0YXJ0IHBsYXlpbmcgYW5kIGhpZGUgbG9hZGluZ1NwaW5uZXIgKGZsYXNoIGlzc3VlID8pXG5cdFx0XHRcdFx0cGxheWVyLnBsYXkoKS5oYW5kbGVUZWNoU2Vla2VkXygpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHBsYXllci50cmlnZ2VyKCdyZXNvbHV0aW9uY2hhbmdlJyk7XG5cdFx0XHR9KTtcblx0XHRyZXR1cm4gcGxheWVyO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGdyb3VwZWQgc291cmNlcyBieSBsYWJlbCwgcmVzb2x1dGlvbiBhbmQgdHlwZVxuXHQgKiBAcmV0dXJucyB7T2JqZWN0fSBncm91cGVkIHNvdXJjZXM6IHsgbGFiZWw6IHsga2V5OiBbXSB9LCByZXM6IHsga2V5OiBbXSB9LCB0eXBlOiB7IGtleTogW10gfSB9XG5cdCAqL1xuXHRwbGF5ZXIuZ2V0R3JvdXBlZFNyYyA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLmdyb3VwZWRTcmM7XG5cdH07XG5cdHBsYXllci5zZXRTb3VyY2VzU2FuaXRpemVkID0gZnVuY3Rpb24oc291cmNlcywgbGFiZWwsIGN1c3RvbVNvdXJjZVBpY2tlcikge1xuXHRcdHRoaXMuY3VycmVudFJlc29sdXRpb25TdGF0ZSA9IHtcblx0XHRcdGxhYmVsOiBsYWJlbCxcblx0XHRcdHNvdXJjZXM6IHNvdXJjZXNcblx0XHR9O1xuXG5cdFx0aWYgKHR5cGVvZiBjdXN0b21Tb3VyY2VQaWNrZXIgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdHJldHVybiBjdXN0b21Tb3VyY2VQaWNrZXIocGxheWVyLCBzb3VyY2VzLCBsYWJlbCk7XG5cdFx0fVxuXHRcdHBsYXllci5zcmMoc291cmNlcy5tYXAoZnVuY3Rpb24oc3JjKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRzcmM6IHNyYy5zcmMsXG5cdFx0XHRcdHR5cGU6IHNyYy50eXBlLFxuXHRcdFx0XHRyZXM6IHNyYy5yZXNcblx0XHRcdH07XG5cdFx0fSkpO1xuXG5cdFx0JChcIi52anMtcmVzb2x1dGlvbi1idXR0b24tbGFiZWxcIikuaHRtbChsYWJlbCk7XG5cdFx0cmV0dXJuIHBsYXllcjtcblx0fTtcblxuXHQvKipcblx0ICogTWV0aG9kIHVzZWQgZm9yIHNvcnRpbmcgbGlzdCBvZiBzb3VyY2VzXG5cdCAqIEBwYXJhbSAgIHtPYmplY3R9IGEgLSBzb3VyY2Ugb2JqZWN0IHdpdGggcmVzIHByb3BlcnR5XG5cdCAqIEBwYXJhbSAgIHtPYmplY3R9IGIgLSBzb3VyY2Ugb2JqZWN0IHdpdGggcmVzIHByb3BlcnR5XG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IHJlc3VsdCBvZiBjb21wYXJhdGlvblxuXHQgKi9cblx0ZnVuY3Rpb24gY29tcGFyZVJlc29sdXRpb25zKGEsIGIpIHtcblx0XHRpZiAoIWEucmVzIHx8ICFiLnJlcykge1xuXHRcdFx0cmV0dXJuIDA7XG5cdFx0fVxuXHRcdHJldHVybiAoK2IucmVzKSAtICgrYS5yZXMpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEdyb3VwIHNvdXJjZXMgYnkgbGFiZWwsIHJlc29sdXRpb24gYW5kIHR5cGVcblx0ICogQHBhcmFtICAge0FycmF5fSAgc3JjIEFycmF5IG9mIHNvdXJjZXNcblx0ICogQHJldHVybnMge09iamVjdH0gZ3JvdXBlZCBzb3VyY2VzOiB7IGxhYmVsOiB7IGtleTogW10gfSwgcmVzOiB7IGtleTogW10gfSwgdHlwZTogeyBrZXk6IFtdIH0gfVxuXHQgKi9cblx0ZnVuY3Rpb24gYnVja2V0U291cmNlcyhzcmMpIHtcblx0XHR2YXIgcmVzb2x1dGlvbnMgPSB7XG5cdFx0XHRsYWJlbDoge30sXG5cdFx0XHRyZXM6IHt9LFxuXHRcdFx0dHlwZToge31cblx0XHR9O1xuXHRcdHNyYy5tYXAoZnVuY3Rpb24oc291cmNlKSB7XG5cdFx0XHRpbml0UmVzb2x1dGlvbktleShyZXNvbHV0aW9ucywgJ2xhYmVsJywgc291cmNlKTtcblx0XHRcdGluaXRSZXNvbHV0aW9uS2V5KHJlc29sdXRpb25zLCAncmVzJywgc291cmNlKTtcblx0XHRcdGluaXRSZXNvbHV0aW9uS2V5KHJlc29sdXRpb25zLCAndHlwZScsIHNvdXJjZSk7XG5cblx0XHRcdGFwcGVuZFNvdXJjZVRvS2V5KHJlc29sdXRpb25zLCAnbGFiZWwnLCBzb3VyY2UpO1xuXHRcdFx0YXBwZW5kU291cmNlVG9LZXkocmVzb2x1dGlvbnMsICdyZXMnLCBzb3VyY2UpO1xuXHRcdFx0YXBwZW5kU291cmNlVG9LZXkocmVzb2x1dGlvbnMsICd0eXBlJywgc291cmNlKTtcblx0XHR9KTtcblx0XHRyZXR1cm4gcmVzb2x1dGlvbnM7XG5cdH1cblxuXHRmdW5jdGlvbiBpbml0UmVzb2x1dGlvbktleShyZXNvbHV0aW9ucywga2V5LCBzb3VyY2UpIHtcblx0XHRpZiAocmVzb2x1dGlvbnNba2V5XVtzb3VyY2Vba2V5XV0gPT0gbnVsbCkge1xuXHRcdFx0cmVzb2x1dGlvbnNba2V5XVtzb3VyY2Vba2V5XV0gPSBbXTtcblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiBhcHBlbmRTb3VyY2VUb0tleShyZXNvbHV0aW9ucywga2V5LCBzb3VyY2UpIHtcblx0XHRyZXNvbHV0aW9uc1trZXldW3NvdXJjZVtrZXldXS5wdXNoKHNvdXJjZSk7XG5cdH1cblxuXHQvKipcblx0ICogQ2hvb3NlIHNyYyBpZiBvcHRpb24uZGVmYXVsdCBpcyBzcGVjaWZpZWRcblx0ICogQHBhcmFtICAge09iamVjdH0gZ3JvdXBlZFNyYyB7cmVzOiB7IGtleTogW10gfX1cblx0ICogQHBhcmFtICAge0FycmF5fSAgc3JjIEFycmF5IG9mIHNvdXJjZXMgc29ydGVkIGJ5IHJlc29sdXRpb24gdXNlZCB0byBmaW5kIGhpZ2ggYW5kIGxvdyByZXNcblx0ICogQHJldHVybnMge09iamVjdH0ge3Jlczogc3RyaW5nLCBzb3VyY2VzOiBbXX1cblx0ICovXG5cdGZ1bmN0aW9uIGNob29zZVNyYyhncm91cGVkU3JjLCBzcmMpIHtcblx0XHR2YXIgc2VsZWN0ZWRSZXMgPSBzZXR0aW5nc1snZGVmYXVsdCddOyAvLyB1c2UgYXJyYXkgYWNjZXNzIGFzIGRlZmF1bHQgaXMgYSByZXNlcnZlZCBrZXl3b3JkXG5cdFx0dmFyIHNlbGVjdGVkTGFiZWwgPSAnJztcblx0XHRpZiAoc2VsZWN0ZWRSZXMgPT09ICdoaWdoJykge1xuXHRcdFx0c2VsZWN0ZWRSZXMgPSBzcmNbMF0ucmVzO1xuXHRcdFx0c2VsZWN0ZWRMYWJlbCA9IHNyY1swXS5sYWJlbDtcblx0XHR9IGVsc2UgaWYgKHNlbGVjdGVkUmVzID09PSAnbG93JyB8fCBzZWxlY3RlZFJlcyA9PSBudWxsIHx8ICFncm91cGVkU3JjLnJlc1tzZWxlY3RlZFJlc10pIHtcblx0XHRcdC8vIFNlbGVjdCBsb3ctcmVzIGlmIGRlZmF1bHQgaXMgbG93IG9yIG5vdCBzZXRcblx0XHRcdHNlbGVjdGVkUmVzID0gc3JjW3NyYy5sZW5ndGggLSAxXS5yZXM7XG5cdFx0XHRzZWxlY3RlZExhYmVsID0gc3JjW3NyYy5sZW5ndGggLSAxXS5sYWJlbDtcblx0XHR9IGVsc2UgaWYgKGdyb3VwZWRTcmMucmVzW3NlbGVjdGVkUmVzXSkge1xuXHRcdFx0c2VsZWN0ZWRMYWJlbCA9IGdyb3VwZWRTcmMucmVzW3NlbGVjdGVkUmVzXVswXS5sYWJlbDtcblx0XHR9XG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlczogc2VsZWN0ZWRSZXMsXG5cdFx0XHRsYWJlbDogc2VsZWN0ZWRMYWJlbCxcblx0XHRcdHNvdXJjZXM6IGdyb3VwZWRTcmMucmVzW3NlbGVjdGVkUmVzXVxuXHRcdH07XG5cdH1cblxuXHRmdW5jdGlvbiBpbml0UmVzb2x1dGlvbkZvcll0KHBsYXllcikge1xuXHRcdC8vIE1hcCB5b3V0dWJlIHF1YWxpdGllcyBuYW1lc1xuXHRcdHZhciBfeXRzID0ge1xuXHRcdFx0aGlnaHJlczoge1xuXHRcdFx0XHRyZXM6IDEwODAsXG5cdFx0XHRcdGxhYmVsOiAnMTA4MCcsXG5cdFx0XHRcdHl0OiAnaGlnaHJlcydcblx0XHRcdH0sXG5cdFx0XHRoZDEwODA6IHtcblx0XHRcdFx0cmVzOiAxMDgwLFxuXHRcdFx0XHRsYWJlbDogJzEwODAnLFxuXHRcdFx0XHR5dDogJ2hkMTA4MCdcblx0XHRcdH0sXG5cdFx0XHRoZDcyMDoge1xuXHRcdFx0XHRyZXM6IDcyMCxcblx0XHRcdFx0bGFiZWw6ICc3MjAnLFxuXHRcdFx0XHR5dDogJ2hkNzIwJ1xuXHRcdFx0fSxcblx0XHRcdGxhcmdlOiB7XG5cdFx0XHRcdHJlczogNDgwLFxuXHRcdFx0XHRsYWJlbDogJzQ4MCcsXG5cdFx0XHRcdHl0OiAnbGFyZ2UnXG5cdFx0XHR9LFxuXHRcdFx0bWVkaXVtOiB7XG5cdFx0XHRcdHJlczogMzYwLFxuXHRcdFx0XHRsYWJlbDogJzM2MCcsXG5cdFx0XHRcdHl0OiAnbWVkaXVtJ1xuXHRcdFx0fSxcblx0XHRcdHNtYWxsOiB7XG5cdFx0XHRcdHJlczogMjQwLFxuXHRcdFx0XHRsYWJlbDogJzI0MCcsXG5cdFx0XHRcdHl0OiAnc21hbGwnXG5cdFx0XHR9LFxuXHRcdFx0dGlueToge1xuXHRcdFx0XHRyZXM6IDE0NCxcblx0XHRcdFx0bGFiZWw6ICcxNDQnLFxuXHRcdFx0XHR5dDogJ3RpbnknXG5cdFx0XHR9LFxuXHRcdFx0YXV0bzoge1xuXHRcdFx0XHRyZXM6IDAsXG5cdFx0XHRcdGxhYmVsOiAnYXV0bycsXG5cdFx0XHRcdHl0OiAnYXV0bydcblx0XHRcdH1cblx0XHR9O1xuXHRcdC8vIE92ZXJ3cml0ZSBkZWZhdWx0IHNvdXJjZVBpY2tlciBmdW5jdGlvblxuXHRcdHZhciBfY3VzdG9tU291cmNlUGlja2VyID0gZnVuY3Rpb24oX3BsYXllciwgX3NvdXJjZXMsIF9sYWJlbCkge1xuXHRcdFx0Ly8gTm90ZSB0aGF0IHNldFBsYXllYmFja1F1YWxpdHkgaXMgYSBzdWdnZXN0aW9uLiBZVCBkb2VzIG5vdCBhbHdheXMgb2JleSBpdC5cblx0XHRcdHBsYXllci50ZWNoXy55dFBsYXllci5zZXRQbGF5YmFja1F1YWxpdHkoX3NvdXJjZXNbMF0uX3l0KTtcblx0XHRcdHBsYXllci50cmlnZ2VyKCd1cGRhdGVTb3VyY2VzJyk7XG5cdFx0XHRyZXR1cm4gcGxheWVyO1xuXHRcdH07XG5cdFx0c2V0dGluZ3MuY3VzdG9tU291cmNlUGlja2VyID0gX2N1c3RvbVNvdXJjZVBpY2tlcjtcblxuXHRcdC8vIEluaXQgcmVzb2x1dGlvblxuXHRcdHBsYXllci50ZWNoXy55dFBsYXllci5zZXRQbGF5YmFja1F1YWxpdHkoJ2F1dG8nKTtcblxuXHRcdC8vIFRoaXMgaXMgdHJpZ2dlcmVkIHdoZW4gdGhlIHJlc29sdXRpb24gYWN0dWFsbHkgY2hhbmdlc1xuXHRcdHBsYXllci50ZWNoXy55dFBsYXllci5hZGRFdmVudExpc3RlbmVyKCdvblBsYXliYWNrUXVhbGl0eUNoYW5nZScsIGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0XHRmb3IgKHZhciByZXMgaW4gX3l0cykge1xuXHRcdFx0XHRpZiAocmVzLnl0ID09PSBldmVudC5kYXRhKSB7XG5cdFx0XHRcdFx0cGxheWVyLmN1cnJlbnRSZXNvbHV0aW9uKHJlcy5sYWJlbCwgX2N1c3RvbVNvdXJjZVBpY2tlcik7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQvLyBXZSBtdXN0IHdhaXQgZm9yIHBsYXkgZXZlbnRcblx0XHRwbGF5ZXIub25lKCdwbGF5JywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgcXVhbGl0aWVzID0gcGxheWVyLnRlY2hfLnl0UGxheWVyLmdldEF2YWlsYWJsZVF1YWxpdHlMZXZlbHMoKTtcblx0XHRcdHZhciBfc291cmNlcyA9IFtdO1xuXG5cdFx0XHRxdWFsaXRpZXMubWFwKGZ1bmN0aW9uKHEpIHtcblx0XHRcdFx0X3NvdXJjZXMucHVzaCh7XG5cdFx0XHRcdFx0c3JjOiBwbGF5ZXIuc3JjKCkuc3JjLFxuXHRcdFx0XHRcdHR5cGU6IHBsYXllci5zcmMoKS50eXBlLFxuXHRcdFx0XHRcdGxhYmVsOiBfeXRzW3FdLmxhYmVsLFxuXHRcdFx0XHRcdHJlczogX3l0c1txXS5yZXMsXG5cdFx0XHRcdFx0X3l0OiBfeXRzW3FdLnl0XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cblx0XHRcdHBsYXllci5ncm91cGVkU3JjID0gYnVja2V0U291cmNlcyhfc291cmNlcyk7XG5cdFx0XHR2YXIgY2hvc2VuID0ge1xuXHRcdFx0XHRsYWJlbDogJ2F1dG8nLFxuXHRcdFx0XHRyZXM6IDAsXG5cdFx0XHRcdHNvdXJjZXM6IHBsYXllci5ncm91cGVkU3JjLmxhYmVsLmF1dG9cblx0XHRcdH07XG5cblx0XHRcdHRoaXMuY3VycmVudFJlc29sdXRpb25TdGF0ZSA9IHtcblx0XHRcdFx0bGFiZWw6IGNob3Nlbi5sYWJlbCxcblx0XHRcdFx0c291cmNlczogY2hvc2VuLnNvdXJjZXNcblx0XHRcdH07XG5cblx0XHRcdHBsYXllci50cmlnZ2VyKCd1cGRhdGVTb3VyY2VzJyk7XG5cdFx0XHRwbGF5ZXIuc2V0U291cmNlc1Nhbml0aXplZChjaG9zZW4uc291cmNlcywgY2hvc2VuLmxhYmVsLCBfY3VzdG9tU291cmNlUGlja2VyKTtcblx0XHR9KTtcblx0fVxuXG5cdHBsYXllci5yZWFkeShmdW5jdGlvbigpIHtcblx0XHRpZiAoc2V0dGluZ3MudWkpIHtcblx0XHRcdHZhciBtZW51QnV0dG9uID0gbmV3IFJlc29sdXRpb25NZW51QnV0dG9uKHBsYXllciwgc2V0dGluZ3MpO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucmVzb2x1dGlvblN3aXRjaGVyID0gcGxheWVyLmNvbnRyb2xCYXIuZWxfLmluc2VydEJlZm9yZShtZW51QnV0dG9uLmVsXywgcGxheWVyLmNvbnRyb2xCYXIuZ2V0Q2hpbGQoJ2Z1bGxzY3JlZW5Ub2dnbGUnKS5lbF8pO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucmVzb2x1dGlvblN3aXRjaGVyLmRpc3Bvc2UgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0dGhpcy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMpO1xuXHRcdFx0fTtcblx0XHR9XG5cdFx0aWYgKHBsYXllci5vcHRpb25zXy5zb3VyY2VzLmxlbmd0aCA+IDEpIHtcblx0XHRcdC8vIHRlY2g6IEh0bWw1IGFuZCBGbGFzaFxuXHRcdFx0Ly8gQ3JlYXRlIHJlc29sdXRpb24gc3dpdGNoZXIgZm9yIHZpZGVvcyBmb3JtIDxzb3VyY2U+IHRhZyBpbnNpZGUgPHZpZGVvPlxuXHRcdFx0cGxheWVyLnVwZGF0ZVNyYyhwbGF5ZXIub3B0aW9uc18uc291cmNlcyk7XG5cdFx0fVxuXG5cdFx0aWYgKHBsYXllci50ZWNoTmFtZV8gPT09ICdZb3V0dWJlJykge1xuXHRcdFx0Ly8gdGVjaDogWW91VHViZVxuXHRcdFx0aW5pdFJlc29sdXRpb25Gb3JZdChwbGF5ZXIpO1xuXHRcdH1cblx0fSk7XG5cblx0dmFyIHZpZGVvSnNSZXNvbHV0aW9uU3dpdGNoZXIsXG5cdFx0ZGVmYXVsdHMgPSB7XG5cdFx0XHR1aTogdHJ1ZVxuXHRcdH07XG5cblx0Lypcblx0ICogUmVzb2x1dGlvbiBtZW51IGl0ZW1cblx0ICovXG5cdHZhciBNZW51SXRlbSA9IHZpZGVvanMuZ2V0Q29tcG9uZW50KCdNZW51SXRlbScpO1xuXHR2YXIgUmVzb2x1dGlvbk1lbnVJdGVtID0gdmlkZW9qcy5leHRlbmQoTWVudUl0ZW0sIHtcblx0XHRjb25zdHJ1Y3RvcjogZnVuY3Rpb24ocGxheWVyLCBvcHRpb25zKSB7XG5cdFx0XHRvcHRpb25zLnNlbGVjdGFibGUgPSB0cnVlO1xuXHRcdFx0Ly8gU2V0cyB0aGlzLnBsYXllcl8sIHRoaXMub3B0aW9uc18gYW5kIGluaXRpYWxpemVzIHRoZSBjb21wb25lbnRcblx0XHRcdE1lbnVJdGVtLmNhbGwodGhpcywgcGxheWVyLCBvcHRpb25zKTtcblx0XHRcdHRoaXMuc3JjID0gb3B0aW9ucy5zcmM7XG5cblx0XHRcdHBsYXllci5vbigncmVzb2x1dGlvbmNoYW5nZScsIHZpZGVvanMuYmluZCh0aGlzLCB0aGlzLnVwZGF0ZSkpO1xuXHRcdH1cblx0fSk7XG5cdFJlc29sdXRpb25NZW51SXRlbS5wcm90b3R5cGUuaGFuZGxlQ2xpY2sgPSBmdW5jdGlvbihldmVudCkge1xuXHRcdE1lbnVJdGVtLnByb3RvdHlwZS5oYW5kbGVDbGljay5jYWxsKHRoaXMsIGV2ZW50KTtcblx0XHR0aGlzLnBsYXllcl8uY3VycmVudFJlc29sdXRpb24odGhpcy5vcHRpb25zXy5sYWJlbCk7XG5cdH07XG5cdFJlc29sdXRpb25NZW51SXRlbS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGVjdGlvbiA9IHRoaXMucGxheWVyXy5jdXJyZW50UmVzb2x1dGlvbigpO1xuXHRcdHRoaXMuc2VsZWN0ZWQodGhpcy5vcHRpb25zXy5sYWJlbCA9PT0gc2VsZWN0aW9uLmxhYmVsKTtcblx0fTtcblx0TWVudUl0ZW0ucmVnaXN0ZXJDb21wb25lbnQoJ1Jlc29sdXRpb25NZW51SXRlbScsIFJlc29sdXRpb25NZW51SXRlbSk7XG5cblx0Lypcblx0ICogUmVzb2x1dGlvbiBtZW51IGJ1dHRvblxuXHQgKi9cblx0dmFyIE1lbnVCdXR0b24gPSB2aWRlb2pzLmdldENvbXBvbmVudCgnTWVudUJ1dHRvbicpO1xuXHR2YXIgUmVzb2x1dGlvbk1lbnVCdXR0b24gPSB2aWRlb2pzLmV4dGVuZChNZW51QnV0dG9uLCB7XG5cdFx0Y29uc3RydWN0b3I6IGZ1bmN0aW9uKHBsYXllciwgb3B0aW9ucykge1xuXHRcdFx0dGhpcy5sYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0XHRcdG9wdGlvbnMubGFiZWwgPSAnUXVhbGl0eSc7XG5cdFx0XHQvLyBTZXRzIHRoaXMucGxheWVyXywgdGhpcy5vcHRpb25zXyBhbmQgaW5pdGlhbGl6ZXMgdGhlIGNvbXBvbmVudFxuXHRcdFx0TWVudUJ1dHRvbi5jYWxsKHRoaXMsIHBsYXllciwgb3B0aW9ucyk7XG5cdFx0XHR0aGlzLmVsKCkuc2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJywgJ1F1YWxpdHknKTtcblx0XHRcdHRoaXMuY29udHJvbFRleHQoJ1F1YWxpdHknKTtcblxuXHRcdFx0aWYgKG9wdGlvbnMuZHluYW1pY0xhYmVsKSB7XG5cdFx0XHRcdHZpZGVvanMuYWRkQ2xhc3ModGhpcy5sYWJlbCwgJ3Zqcy1yZXNvbHV0aW9uLWJ1dHRvbi1sYWJlbCcpO1xuXHRcdFx0XHR0aGlzLmVsKCkuYXBwZW5kQ2hpbGQodGhpcy5sYWJlbCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2YXIgc3RhdGljTGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cdFx0XHRcdHZpZGVvanMuYWRkQ2xhc3Moc3RhdGljTGFiZWwsICd2anMtbWVudS1pY29uJyk7XG5cdFx0XHRcdHRoaXMuZWwoKS5hcHBlbmRDaGlsZChzdGF0aWNMYWJlbCk7XG5cdFx0XHR9XG5cdFx0XHRwbGF5ZXIub24oJ3VwZGF0ZVNvdXJjZXMnLCB2aWRlb2pzLmJpbmQodGhpcywgdGhpcy51cGRhdGUpKTtcblx0XHR9XG5cdH0pO1xuXHRSZXNvbHV0aW9uTWVudUJ1dHRvbi5wcm90b3R5cGUuY3JlYXRlSXRlbXMgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgbWVudUl0ZW1zID0gW107XG5cdFx0dmFyIGxhYmVscyA9ICh0aGlzLnNvdXJjZXMgJiYgdGhpcy5zb3VyY2VzLmxhYmVsKSB8fCB7fTtcblxuXHRcdC8vIEZJWE1FIG9yZGVyIGlzIG5vdCBndWFyYW50ZWVkIGhlcmUuXG5cdFx0Zm9yICh2YXIga2V5IGluIGxhYmVscykge1xuXHRcdFx0aWYgKGxhYmVscy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHRcdG1lbnVJdGVtcy5wdXNoKG5ldyBSZXNvbHV0aW9uTWVudUl0ZW0oXG5cdFx0XHRcdFx0dGhpcy5wbGF5ZXJfLCB7XG5cdFx0XHRcdFx0XHRsYWJlbDoga2V5LFxuXHRcdFx0XHRcdFx0c3JjOiBsYWJlbHNba2V5XSxcblx0XHRcdFx0XHRcdHNlbGVjdGVkOiBrZXkgPT09ICh0aGlzLmN1cnJlbnRTZWxlY3Rpb24gPyB0aGlzLmN1cnJlbnRTZWxlY3Rpb24ubGFiZWwgOiBmYWxzZSlcblx0XHRcdFx0XHR9KSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBtZW51SXRlbXM7XG5cdH07XG5cdFJlc29sdXRpb25NZW51QnV0dG9uLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnNvdXJjZXMgPSB0aGlzLnBsYXllcl8uZ2V0R3JvdXBlZFNyYygpO1xuXHRcdHRoaXMuY3VycmVudFNlbGVjdGlvbiA9IHRoaXMucGxheWVyXy5jdXJyZW50UmVzb2x1dGlvbigpO1xuXHRcdHRoaXMubGFiZWwuaW5uZXJIVE1MID0gdGhpcy5jdXJyZW50U2VsZWN0aW9uID8gdGhpcy5jdXJyZW50U2VsZWN0aW9uLmxhYmVsIDogJyc7XG5cdFx0cmV0dXJuIE1lbnVCdXR0b24ucHJvdG90eXBlLnVwZGF0ZS5jYWxsKHRoaXMpO1xuXHR9O1xuXHRSZXNvbHV0aW9uTWVudUJ1dHRvbi5wcm90b3R5cGUuYnVpbGRDU1NDbGFzcyA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBNZW51QnV0dG9uLnByb3RvdHlwZS5idWlsZENTU0NsYXNzLmNhbGwodGhpcykgKyAnIHZqcy1yZXNvbHV0aW9uLWJ1dHRvbic7XG5cdH07XG5cdE1lbnVCdXR0b24ucmVnaXN0ZXJDb21wb25lbnQoJ1Jlc29sdXRpb25NZW51QnV0dG9uJywgUmVzb2x1dGlvbk1lbnVCdXR0b24pO1xufTtcblxuLyoqXG4gKiDnpoHnlKjmu5rliqjmnaHmi5bliqhcbiAqIEBwYXJhbSB7W3R5cGVdfSBvcHRpb25zIFtkZXNjcmlwdGlvbl1cbiAqIHJldHVybiB7W3R5cGVdfSAgW2Rlc2NyaXB0aW9uXVxuICovXG5jb25zdCBkaXNhYmxlUHJvZ3Jlc3MgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdHZhclxuXHQvKipcblx0ICogQ29waWVzIHByb3BlcnRpZXMgZnJvbSBvbmUgb3IgbW9yZSBvYmplY3RzIG9udG8gYW4gb3JpZ2luYWwuXG5cdCAqL1xuXHRcdGV4dGVuZCA9IGZ1bmN0aW9uKG9iaiAvKiwgYXJnMSwgYXJnMiwgLi4uICovICkge1xuXHRcdFx0dmFyIGFyZywgaSwgaztcblx0XHRcdGZvciAoaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0YXJnID0gYXJndW1lbnRzW2ldO1xuXHRcdFx0XHRmb3IgKGsgaW4gYXJnKSB7XG5cdFx0XHRcdFx0aWYgKGFyZy5oYXNPd25Qcm9wZXJ0eShrKSkge1xuXHRcdFx0XHRcdFx0b2JqW2tdID0gYXJnW2tdO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG9iajtcblx0XHR9LFxuXG5cdFx0Ly8gZGVmaW5lIHNvbWUgcmVhc29uYWJsZSBkZWZhdWx0cyBmb3IgdGhpcyBzd2VldCBwbHVnaW5cblx0XHRkZWZhdWx0cyA9IHtcblx0XHRcdGF1dG9EaXNhYmxlOiBmYWxzZVxuXHRcdH07XG5cblxuXHR2YXJcblx0Ly8gc2F2ZSBhIHJlZmVyZW5jZSB0byB0aGUgcGxheWVyIGluc3RhbmNlXG5cdFx0cGxheWVyID0gdGhpcyxcblx0XHRzdGF0ZSA9IGZhbHNlLFxuXG5cdFx0Ly8gbWVyZ2Ugb3B0aW9ucyBhbmQgZGVmYXVsdHNcblx0XHRzZXR0aW5ncyA9IGV4dGVuZCh7fSwgZGVmYXVsdHMsIG9wdGlvbnMgfHwge30pO1xuXG5cdC8vIGRpc2FibGUgLyBlbmFibGUgbWV0aG9kc1xuXHRwbGF5ZXIuZGlzYWJsZVByb2dyZXNzID0ge1xuXHRcdGRpc2FibGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0c3RhdGUgPSB0cnVlO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub2ZmKFwiZm9jdXNcIik7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vZmYoXCJtb3VzZWRvd25cIik7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vZmYoXCJ0b3VjaHN0YXJ0XCIpO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub2ZmKFwiY2xpY2tcIik7XG5cdFx0fSxcblx0XHRlbmFibGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0c3RhdGUgPSBmYWxzZTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9uKFwiZm9jdXNcIiwgcGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIuaGFuZGxlRm9jdXMpO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub24oXCJtb3VzZWRvd25cIiwgcGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIuaGFuZGxlTW91c2VEb3duKTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9uKFwidG91Y2hzdGFydFwiLCBwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5oYW5kbGVNb3VzZURvd24pO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub24oXCJjbGlja1wiLCBwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5oYW5kbGVDbGljayk7XG5cdFx0fSxcblx0XHRnZXRTdGF0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gc3RhdGU7XG5cdFx0fVxuXHR9O1xuXG5cdGlmIChzZXR0aW5ncy5hdXRvRGlzYWJsZSkge1xuXHRcdHBsYXllci5kaXNhYmxlUHJvZ3Jlc3MuZGlzYWJsZSgpO1xuXHR9XG59O1xuXG4vKipcbiAqIOaJk+eCuVxuICogQHBhcmFtIHtbdHlwZV19IG9wdGlvbnMgW2Rlc2NyaXB0aW9uXVxuICogcmV0dXJuIHtbdHlwZV19ICBbZGVzY3JpcHRpb25dXG4gKi9cbmNvbnN0IG1hcmtlcnMgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdC8vZGVmYXVsdCBzZXR0aW5nXG5cdHZhciBkZWZhdWx0U2V0dGluZyA9IHtcblx0XHRtYXJrZXJTdHlsZToge1xuXHRcdFx0J3dpZHRoJzogJzhweCcsXG5cdFx0XHQnYm9yZGVyLXJhZGl1cyc6ICcyMCUnLFxuXHRcdFx0J2JhY2tncm91bmQtY29sb3InOiAncmdiYSgyNTUsMCwwLC41KSdcblx0XHR9LFxuXHRcdG1hcmtlclRpcDoge1xuXHRcdFx0ZGlzcGxheTogdHJ1ZSxcblx0XHRcdHRleHQ6IGZ1bmN0aW9uKG1hcmtlcikge1xuXHRcdFx0XHRyZXR1cm4gbWFya2VyLnRleHQ7XG5cdFx0XHR9LFxuXHRcdFx0dGltZTogZnVuY3Rpb24obWFya2VyKSB7XG5cdFx0XHRcdHJldHVybiBtYXJrZXIudGltZTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdGJyZWFrT3ZlcmxheToge1xuXHRcdFx0ZGlzcGxheTogdHJ1ZSxcblx0XHRcdGRpc3BsYXlUaW1lOiAxLFxuXHRcdFx0dGV4dDogZnVuY3Rpb24obWFya2VyKSB7XG5cdFx0XHRcdHJldHVybiBtYXJrZXIub3ZlcmxheVRleHQ7XG5cdFx0XHR9LFxuXHRcdFx0c3R5bGU6IHtcblx0XHRcdFx0J3dpZHRoJzogJzEwMCUnLFxuXHRcdFx0XHQnaGVpZ2h0JzogJ2NhbGMoMTAwJSAtIDM2cHgpJyxcblx0XHRcdFx0J2JhY2tncm91bmQtY29sb3InOiAncmdiYSgwLDAsMCwwLjcpJyxcblx0XHRcdFx0J2NvbG9yJzogJ3doaXRlJyxcblx0XHRcdFx0J2ZvbnQtc2l6ZSc6ICcxN3B4J1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0b25NYXJrZXJDbGljazogZnVuY3Rpb24obWFya2VyKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2Vcblx0XHR9LFxuXHRcdG9uTWFya2VyUmVhY2hlZDogZnVuY3Rpb24obWFya2VyKSB7fSxcblx0XHRtYXJrZXJzOiBbXVxuXHR9O1xuXG5cdC8vIGNyZWF0ZSBhIG5vbi1jb2xsaWRpbmcgcmFuZG9tIG51bWJlclxuXHRmdW5jdGlvbiBnZW5lcmF0ZVVVSUQoKSB7XG5cdFx0dmFyIGQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblx0XHR2YXIgdXVpZCA9ICd4eHh4eHh4eC14eHh4LTR4eHgteXh4eC14eHh4eHh4eHh4eHgnLnJlcGxhY2UoL1t4eV0vZywgZnVuY3Rpb24oYykge1xuXHRcdFx0dmFyIHIgPSAoZCArIE1hdGgucmFuZG9tKCkgKiAxNikgJSAxNiB8IDA7XG5cdFx0XHRkID0gTWF0aC5mbG9vcihkIC8gMTYpO1xuXHRcdFx0cmV0dXJuIChjID09ICd4JyA/IHIgOiAociAmIDB4MyB8IDB4OCkpLnRvU3RyaW5nKDE2KTtcblx0XHR9KTtcblx0XHRyZXR1cm4gdXVpZDtcblx0fTtcblx0LyoqXG5cdCAqIHJlZ2lzdGVyIHRoZSBtYXJrZXJzIHBsdWdpbiAoZGVwZW5kZW50IG9uIGpxdWVyeSlcblx0ICovXG5cdHZhciBzZXR0aW5nID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRTZXR0aW5nLCBvcHRpb25zKSxcblx0XHRtYXJrZXJzTWFwID0ge30sXG5cdFx0bWFya2Vyc0xpc3QgPSBbXSwgLy8gbGlzdCBvZiBtYXJrZXJzIHNvcnRlZCBieSB0aW1lXG5cdFx0dmlkZW9XcmFwcGVyID0gJCh0aGlzLmVsKCkpLFxuXHRcdGN1cnJlbnRNYXJrZXJJbmRleCA9IC0xLFxuXHRcdHBsYXllciA9IHRoaXMsXG5cdFx0bWFya2VyVGlwID0gbnVsbCxcblx0XHRicmVha092ZXJsYXkgPSBudWxsLFxuXHRcdG92ZXJsYXlJbmRleCA9IC0xO1xuXG5cdGZ1bmN0aW9uIHNvcnRNYXJrZXJzTGlzdCgpIHtcblx0XHQvLyBzb3J0IHRoZSBsaXN0IGJ5IHRpbWUgaW4gYXNjIG9yZGVyXG5cdFx0bWFya2Vyc0xpc3Quc29ydChmdW5jdGlvbihhLCBiKSB7XG5cdFx0XHRyZXR1cm4gc2V0dGluZy5tYXJrZXJUaXAudGltZShhKSAtIHNldHRpbmcubWFya2VyVGlwLnRpbWUoYik7XG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBhZGRNYXJrZXJzKG5ld01hcmtlcnMpIHtcblx0XHQvLyBjcmVhdGUgdGhlIG1hcmtlcnNcblx0XHQkLmVhY2gobmV3TWFya2VycywgZnVuY3Rpb24oaW5kZXgsIG1hcmtlcikge1xuXHRcdFx0bWFya2VyLmtleSA9IGdlbmVyYXRlVVVJRCgpO1xuXG5cdFx0XHR2aWRlb1dyYXBwZXIuZmluZCgnLnZqcy1wcm9ncmVzcy1jb250cm9sJykuYXBwZW5kKFxuXHRcdFx0XHRjcmVhdGVNYXJrZXJEaXYobWFya2VyKSk7XG5cblx0XHRcdC8vIHN0b3JlIG1hcmtlciBpbiBhbiBpbnRlcm5hbCBoYXNoIG1hcFxuXHRcdFx0bWFya2Vyc01hcFttYXJrZXIua2V5XSA9IG1hcmtlcjtcblx0XHRcdG1hcmtlcnNMaXN0LnB1c2gobWFya2VyKTtcblx0XHR9KTtcblxuXHRcdHNvcnRNYXJrZXJzTGlzdCgpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0UG9zaXRpb24obWFya2VyKSB7XG5cdFx0cmV0dXJuIChzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcikgLyBwbGF5ZXIuZHVyYXRpb24oKSkgKiAxMDBcblx0fVxuXG5cdGZ1bmN0aW9uIGNyZWF0ZU1hcmtlckRpdihtYXJrZXIsIGR1cmF0aW9uKSB7XG5cdFx0dmFyIG1hcmtlckRpdiA9ICQoXCI8ZGl2IGNsYXNzPSd2anMtbWFya2VyJz48L2Rpdj5cIik7XG5cdFx0dmFyIG1hcmcgPSBwYXJzZUludCh2aWRlb1dyYXBwZXIuZmluZCgnLnZqcy1wcm9ncmVzcy1jb250cm9sIC52anMtc2xpZGVyJykuY3NzKCdtYXJnaW5MZWZ0JykpO1xuXHRcdG1hcmtlckRpdi5jc3Moc2V0dGluZy5tYXJrZXJTdHlsZSlcblx0XHRcdC5jc3Moe1xuXHRcdFx0XHRcIm1hcmdpbi1sZWZ0XCI6IG1hcmcgLSBwYXJzZUZsb2F0KG1hcmtlckRpdi5jc3MoXCJ3aWR0aFwiKSkgLyAyICsgJ3B4Jyxcblx0XHRcdFx0XCJsZWZ0XCI6IGdldFBvc2l0aW9uKG1hcmtlcikgKyAnJSdcblx0XHRcdH0pXG5cdFx0XHQuYXR0cihcImRhdGEtbWFya2VyLWtleVwiLCBtYXJrZXIua2V5KVxuXHRcdFx0LmF0dHIoXCJkYXRhLW1hcmtlci10aW1lXCIsIHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2VyKSk7XG5cblx0XHQvLyBhZGQgdXNlci1kZWZpbmVkIGNsYXNzIHRvIG1hcmtlclxuXHRcdGlmIChtYXJrZXIuY2xhc3MpIHtcblx0XHRcdG1hcmtlckRpdi5hZGRDbGFzcyhtYXJrZXIuY2xhc3MpO1xuXHRcdH1cblxuXHRcdC8vIGJpbmQgY2xpY2sgZXZlbnQgdG8gc2VlayB0byBtYXJrZXIgdGltZVxuXHRcdG1hcmtlckRpdi5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG5cblx0XHRcdHZhciBwcmV2ZW50RGVmYXVsdCA9IGZhbHNlO1xuXHRcdFx0aWYgKHR5cGVvZiBzZXR0aW5nLm9uTWFya2VyQ2xpY2sgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0XHQvLyBpZiByZXR1cm4gZmFsc2UsIHByZXZlbnQgZGVmYXVsdCBiZWhhdmlvclxuXHRcdFx0XHRwcmV2ZW50RGVmYXVsdCA9IHNldHRpbmcub25NYXJrZXJDbGljayhtYXJrZXIpID09IGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIXByZXZlbnREZWZhdWx0KSB7XG5cdFx0XHRcdHZhciBrZXkgPSAkKHRoaXMpLmRhdGEoJ21hcmtlci1rZXknKTtcblx0XHRcdFx0cGxheWVyLmN1cnJlbnRUaW1lKHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2Vyc01hcFtrZXldKSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRpZiAoc2V0dGluZy5tYXJrZXJUaXAuZGlzcGxheSkge1xuXHRcdFx0cmVnaXN0ZXJNYXJrZXJUaXBIYW5kbGVyKG1hcmtlckRpdik7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG1hcmtlckRpdjtcblx0fVxuXG5cdGZ1bmN0aW9uIHVwZGF0ZU1hcmtlcnMoKSB7XG5cdFx0Ly8gdXBkYXRlIFVJIGZvciBtYXJrZXJzIHdob3NlIHRpbWUgY2hhbmdlZFxuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBtYXJrZXJzTGlzdC5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIG1hcmtlciA9IG1hcmtlcnNMaXN0W2ldO1xuXHRcdFx0dmFyIG1hcmtlckRpdiA9IHZpZGVvV3JhcHBlci5maW5kKFwiLnZqcy1tYXJrZXJbZGF0YS1tYXJrZXIta2V5PSdcIiArIG1hcmtlci5rZXkgKyBcIiddXCIpO1xuXHRcdFx0dmFyIG1hcmtlclRpbWUgPSBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcik7XG5cblx0XHRcdGlmIChtYXJrZXJEaXYuZGF0YSgnbWFya2VyLXRpbWUnKSAhPSBtYXJrZXJUaW1lKSB7XG5cdFx0XHRcdG1hcmtlckRpdi5jc3Moe1xuXHRcdFx0XHRcdFx0XCJsZWZ0XCI6IGdldFBvc2l0aW9uKG1hcmtlcikgKyAnJSdcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC5hdHRyKFwiZGF0YS1tYXJrZXItdGltZVwiLCBtYXJrZXJUaW1lKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0c29ydE1hcmtlcnNMaXN0KCk7XG5cdH1cblxuXHRmdW5jdGlvbiByZW1vdmVNYXJrZXJzKGluZGV4QXJyYXkpIHtcblx0XHQvLyByZXNldCBvdmVybGF5XG5cdFx0aWYgKGJyZWFrT3ZlcmxheSkge1xuXHRcdFx0b3ZlcmxheUluZGV4ID0gLTE7XG5cdFx0XHRicmVha092ZXJsYXkuY3NzKFwidmlzaWJpbGl0eVwiLCBcImhpZGRlblwiKTtcblx0XHR9XG5cdFx0Y3VycmVudE1hcmtlckluZGV4ID0gLTE7XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGluZGV4QXJyYXkubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBpbmRleCA9IGluZGV4QXJyYXlbaV07XG5cdFx0XHR2YXIgbWFya2VyID0gbWFya2Vyc0xpc3RbaW5kZXhdO1xuXHRcdFx0aWYgKG1hcmtlcikge1xuXHRcdFx0XHQvLyBkZWxldGUgZnJvbSBtZW1vcnlcblx0XHRcdFx0ZGVsZXRlIG1hcmtlcnNNYXBbbWFya2VyLmtleV07XG5cdFx0XHRcdG1hcmtlcnNMaXN0W2luZGV4XSA9IG51bGw7XG5cblx0XHRcdFx0Ly8gZGVsZXRlIGZyb20gZG9tXG5cdFx0XHRcdHZpZGVvV3JhcHBlci5maW5kKFwiLnZqcy1tYXJrZXJbZGF0YS1tYXJrZXIta2V5PSdcIiArIG1hcmtlci5rZXkgKyBcIiddXCIpLnJlbW92ZSgpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIGNsZWFuIHVwIGFycmF5XG5cdFx0Zm9yICh2YXIgaSA9IG1hcmtlcnNMaXN0Lmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRpZiAobWFya2Vyc0xpc3RbaV0gPT09IG51bGwpIHtcblx0XHRcdFx0bWFya2Vyc0xpc3Quc3BsaWNlKGksIDEpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIHNvcnQgYWdhaW5cblx0XHRzb3J0TWFya2Vyc0xpc3QoKTtcblx0fVxuXG5cblx0Ly8gYXR0YWNoIGhvdmVyIGV2ZW50IGhhbmRsZXJcblx0ZnVuY3Rpb24gcmVnaXN0ZXJNYXJrZXJUaXBIYW5kbGVyKG1hcmtlckRpdikge1xuXG5cdFx0bWFya2VyRGl2Lm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBtYXJrZXIgPSBtYXJrZXJzTWFwWyQodGhpcykuZGF0YSgnbWFya2VyLWtleScpXTtcblxuXHRcdFx0bWFya2VyVGlwLmZpbmQoJy52anMtdGlwLWlubmVyJykuaHRtbChzZXR0aW5nLm1hcmtlclRpcC50ZXh0KG1hcmtlcikpO1xuXG5cdFx0XHQvLyBtYXJnaW4tbGVmdCBuZWVkcyB0byBtaW51cyB0aGUgcGFkZGluZyBsZW5ndGggdG8gYWxpZ24gY29ycmVjdGx5IHdpdGggdGhlIG1hcmtlclxuXHRcdFx0bWFya2VyVGlwLmNzcyh7XG5cdFx0XHRcdFwibGVmdFwiOiBnZXRQb3NpdGlvbihtYXJrZXIpICsgJyUnLFxuXHRcdFx0XHRcIm1hcmdpbi1sZWZ0XCI6IC1wYXJzZUZsb2F0KG1hcmtlclRpcC5jc3MoXCJ3aWR0aFwiKSkgLyAyIC0gNSArICdweCcsXG5cdFx0XHRcdFwidmlzaWJpbGl0eVwiOiBcInZpc2libGVcIlxuXHRcdFx0fSk7XG5cblx0XHR9KS5vbignbW91c2VvdXQnLCBmdW5jdGlvbigpIHtcblx0XHRcdG1hcmtlclRpcC5jc3MoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuXHRcdH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5pdGlhbGl6ZU1hcmtlclRpcCgpIHtcblx0XHRtYXJrZXJUaXAgPSAkKFwiPGRpdiBjbGFzcz0ndmpzLXRpcCc+PGRpdiBjbGFzcz0ndmpzLXRpcC1hcnJvdyc+PC9kaXY+PGRpdiBjbGFzcz0ndmpzLXRpcC1pbm5lcic+PC9kaXY+PC9kaXY+XCIpO1xuXHRcdHZpZGVvV3JhcHBlci5maW5kKCcudmpzLXByb2dyZXNzLWNvbnRyb2wnKS5hcHBlbmQobWFya2VyVGlwKTtcblx0fVxuXHR2YXIgbHQgPSAwO1xuXHR2YXIgZnggPSAtMTtcblx0Ly8gc2hvdyBvciBoaWRlIGJyZWFrIG92ZXJsYXlzXG5cdGZ1bmN0aW9uIHVwZGF0ZUJyZWFrT3ZlcmxheSgpIHtcblx0XHRpZiAoIXNldHRpbmcuYnJlYWtPdmVybGF5LmRpc3BsYXkgfHwgY3VycmVudE1hcmtlckluZGV4IDwgMCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHZhciBjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdHZhciBtYXJrZXIgPSBtYXJrZXJzTGlzdFtjdXJyZW50TWFya2VySW5kZXhdO1xuXHRcdHZhciBtYXJrZXJUaW1lID0gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXIpO1xuXHRcdHZhciBjdCA9IGN1cnJlbnRUaW1lIC0gbWFya2VyVGltZTtcblxuXHRcdGlmIChjdCA+PSAwICYmIGN0IDwgMSAmJiBmeCAhPSBjdXJyZW50TWFya2VySW5kZXgpIHtcblx0XHRcdGZ4ID0gY3VycmVudE1hcmtlckluZGV4O1xuXHRcdFx0bHQgPSBjdXJyZW50VGltZSArIHNldHRpbmcuYnJlYWtPdmVybGF5LmRpc3BsYXlUaW1lO1xuXHRcdH1cblxuXHRcdGlmIChjdXJyZW50VGltZSA+PSBtYXJrZXJUaW1lICYmXG5cdFx0XHRjdXJyZW50VGltZSA8PSBsdCkge1xuXHRcdFx0aWYgKG92ZXJsYXlJbmRleCAhPSBjdXJyZW50TWFya2VySW5kZXgpIHtcblx0XHRcdFx0b3ZlcmxheUluZGV4ID0gY3VycmVudE1hcmtlckluZGV4O1xuXHRcdFx0XHRicmVha092ZXJsYXkuZmluZCgnLnZqcy1icmVhay1vdmVybGF5LXRleHQnKS5odG1sKHNldHRpbmcuYnJlYWtPdmVybGF5LnRleHQobWFya2VyKSk7XG5cdFx0XHR9XG5cblx0XHRcdGJyZWFrT3ZlcmxheS5jc3MoJ3Zpc2liaWxpdHknLCBcInZpc2libGVcIik7XG5cblx0XHR9IGVsc2Uge1xuXHRcdFx0b3ZlcmxheUluZGV4ID0gLTE7XG5cdFx0XHRicmVha092ZXJsYXkuY3NzKFwidmlzaWJpbGl0eVwiLCBcImhpZGRlblwiKTtcblx0XHRcdGx0ID0gMDtcblx0XHR9XG5cdH1cblxuXHQvLyBwcm9ibGVtIHdoZW4gdGhlIG5leHQgbWFya2VyIGlzIHdpdGhpbiB0aGUgb3ZlcmxheSBkaXNwbGF5IHRpbWUgZnJvbSB0aGUgcHJldmlvdXMgbWFya2VyXG5cdGZ1bmN0aW9uIGluaXRpYWxpemVPdmVybGF5KCkge1xuXHRcdGJyZWFrT3ZlcmxheSA9ICQoXCI8ZGl2IGNsYXNzPSd2anMtYnJlYWstb3ZlcmxheSc+PGRpdiBjbGFzcz0ndmpzLWJyZWFrLW92ZXJsYXktdGV4dCc+PC9kaXY+PC9kaXY+XCIpXG5cdFx0XHQuY3NzKHNldHRpbmcuYnJlYWtPdmVybGF5LnN0eWxlKTtcblx0XHR2aWRlb1dyYXBwZXIuYXBwZW5kKGJyZWFrT3ZlcmxheSk7XG5cdFx0b3ZlcmxheUluZGV4ID0gLTE7XG5cdH1cblxuXHRmdW5jdGlvbiBvblRpbWVVcGRhdGUoKSB7XG5cdFx0b25VcGRhdGVNYXJrZXIoKTtcblx0XHR1cGRhdGVCcmVha092ZXJsYXkoKTtcblx0fVxuXG5cdGZ1bmN0aW9uIG9uVXBkYXRlTWFya2VyKCkge1xuXHRcdC8qXG5cdFx0ICAgIGNoZWNrIG1hcmtlciByZWFjaGVkIGluIGJldHdlZW4gbWFya2Vyc1xuXHRcdCAgICB0aGUgbG9naWMgaGVyZSBpcyB0aGF0IGl0IHRyaWdnZXJzIGEgbmV3IG1hcmtlciByZWFjaGVkIGV2ZW50IG9ubHkgaWYgdGhlIHBsYXllciBcblx0XHQgICAgZW50ZXJzIGEgbmV3IG1hcmtlciByYW5nZSAoZS5nLiBmcm9tIG1hcmtlciAxIHRvIG1hcmtlciAyKS4gVGh1cywgaWYgcGxheWVyIGlzIG9uIG1hcmtlciAxIGFuZCB1c2VyIGNsaWNrZWQgb24gbWFya2VyIDEgYWdhaW4sIG5vIG5ldyByZWFjaGVkIGV2ZW50IGlzIHRyaWdnZXJlZClcblx0XHQqL1xuXG5cdFx0dmFyIGdldE5leHRNYXJrZXJUaW1lID0gZnVuY3Rpb24oaW5kZXgpIHtcblx0XHRcdGlmIChpbmRleCA8IG1hcmtlcnNMaXN0Lmxlbmd0aCAtIDEpIHtcblx0XHRcdFx0cmV0dXJuIHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2Vyc0xpc3RbaW5kZXggKyAxXSk7XG5cdFx0XHR9XG5cdFx0XHQvLyBuZXh0IG1hcmtlciB0aW1lIG9mIGxhc3QgbWFya2VyIHdvdWxkIGJlIGVuZCBvZiB2aWRlbyB0aW1lXG5cdFx0XHRyZXR1cm4gcGxheWVyLmR1cmF0aW9uKCk7XG5cdFx0fVxuXHRcdHZhciBjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdHZhciBuZXdNYXJrZXJJbmRleDtcblxuXHRcdGlmIChjdXJyZW50TWFya2VySW5kZXggIT0gLTEpIHtcblx0XHRcdC8vIGNoZWNrIGlmIHN0YXlpbmcgYXQgc2FtZSBtYXJrZXJcblx0XHRcdHZhciBuZXh0TWFya2VyVGltZSA9IGdldE5leHRNYXJrZXJUaW1lKGN1cnJlbnRNYXJrZXJJbmRleCk7XG5cdFx0XHRpZiAoY3VycmVudFRpbWUgPj0gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTGlzdFtjdXJyZW50TWFya2VySW5kZXhdKSAmJlxuXHRcdFx0XHRjdXJyZW50VGltZSA8IG5leHRNYXJrZXJUaW1lKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gY2hlY2sgZm9yIGVuZGluZyAoYXQgdGhlIGVuZCBjdXJyZW50IHRpbWUgZXF1YWxzIHBsYXllciBkdXJhdGlvbilcblx0XHRcdGlmIChjdXJyZW50TWFya2VySW5kZXggPT09IG1hcmtlcnNMaXN0Lmxlbmd0aCAtIDEgJiZcblx0XHRcdFx0Y3VycmVudFRpbWUgPT09IHBsYXllci5kdXJhdGlvbigpKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBjaGVjayBmaXJzdCBtYXJrZXIsIG5vIG1hcmtlciBpcyBzZWxlY3RlZFxuXHRcdGlmIChtYXJrZXJzTGlzdC5sZW5ndGggPiAwICYmXG5cdFx0XHRjdXJyZW50VGltZSA8IHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2Vyc0xpc3RbMF0pKSB7XG5cdFx0XHRuZXdNYXJrZXJJbmRleCA9IC0xO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBsb29rIGZvciBuZXcgaW5kZXhcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbWFya2Vyc0xpc3QubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0bmV4dE1hcmtlclRpbWUgPSBnZXROZXh0TWFya2VyVGltZShpKTtcblxuXHRcdFx0XHRpZiAoY3VycmVudFRpbWUgPj0gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTGlzdFtpXSkgJiZcblx0XHRcdFx0XHRjdXJyZW50VGltZSA8IG5leHRNYXJrZXJUaW1lKSB7XG5cdFx0XHRcdFx0bmV3TWFya2VySW5kZXggPSBpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gc2V0IG5ldyBtYXJrZXIgaW5kZXhcblx0XHRpZiAobmV3TWFya2VySW5kZXggIT0gY3VycmVudE1hcmtlckluZGV4KSB7XG5cdFx0XHQvLyB0cmlnZ2VyIGV2ZW50XG5cdFx0XHRpZiAobmV3TWFya2VySW5kZXggIT0gLTEgJiYgb3B0aW9ucy5vbk1hcmtlclJlYWNoZWQpIHtcblx0XHRcdFx0b3B0aW9ucy5vbk1hcmtlclJlYWNoZWQobWFya2Vyc0xpc3RbbmV3TWFya2VySW5kZXhdKTtcblx0XHRcdH1cblx0XHRcdGN1cnJlbnRNYXJrZXJJbmRleCA9IG5ld01hcmtlckluZGV4O1xuXHRcdH1cblxuXHR9XG5cblx0Ly8gc2V0dXAgdGhlIHdob2xlIHRoaW5nXG5cdGZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XG5cdFx0aWYgKHNldHRpbmcubWFya2VyVGlwLmRpc3BsYXkpIHtcblx0XHRcdGluaXRpYWxpemVNYXJrZXJUaXAoKTtcblx0XHR9XG5cblx0XHQvLyByZW1vdmUgZXhpc3RpbmcgbWFya2VycyBpZiBhbHJlYWR5IGluaXRpYWxpemVkXG5cdFx0cGxheWVyLm1hcmtlcnMucmVtb3ZlQWxsKCk7XG5cdFx0YWRkTWFya2VycyhvcHRpb25zLm1hcmtlcnMpO1xuXG5cdFx0aWYgKHNldHRpbmcuYnJlYWtPdmVybGF5LmRpc3BsYXkpIHtcblx0XHRcdGluaXRpYWxpemVPdmVybGF5KCk7XG5cdFx0fVxuXHRcdG9uVGltZVVwZGF0ZSgpO1xuXHRcdHBsYXllci5vbihcInRpbWV1cGRhdGVcIiwgb25UaW1lVXBkYXRlKTtcblx0fVxuXG5cdC8vIHNldHVwIHRoZSBwbHVnaW4gYWZ0ZXIgd2UgbG9hZGVkIHZpZGVvJ3MgbWV0YSBkYXRhXG5cdHBsYXllci5vbihcImxvYWRlZG1ldGFkYXRhXCIsIGZ1bmN0aW9uKCkge1xuXHRcdGluaXRpYWxpemUoKTtcblx0fSk7XG5cblx0Ly8gZXhwb3NlZCBwbHVnaW4gQVBJXG5cdHBsYXllci5tYXJrZXJzID0ge1xuXHRcdGdldE1hcmtlcnM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIG1hcmtlcnNMaXN0O1xuXHRcdH0sXG5cdFx0bmV4dDogZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBnbyB0byB0aGUgbmV4dCBtYXJrZXIgZnJvbSBjdXJyZW50IHRpbWVzdGFtcFxuXHRcdFx0dmFyIGN1cnJlbnRUaW1lID0gcGxheWVyLmN1cnJlbnRUaW1lKCk7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG1hcmtlcnNMaXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHZhciBtYXJrZXJUaW1lID0gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTGlzdFtpXSk7XG5cdFx0XHRcdGlmIChtYXJrZXJUaW1lID4gY3VycmVudFRpbWUpIHtcblx0XHRcdFx0XHRwbGF5ZXIuY3VycmVudFRpbWUobWFya2VyVGltZSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXHRcdHByZXY6IGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gZ28gdG8gcHJldmlvdXMgbWFya2VyXG5cdFx0XHR2YXIgY3VycmVudFRpbWUgPSBwbGF5ZXIuY3VycmVudFRpbWUoKTtcblx0XHRcdGZvciAodmFyIGkgPSBtYXJrZXJzTGlzdC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0XHR2YXIgbWFya2VyVGltZSA9IHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2Vyc0xpc3RbaV0pO1xuXHRcdFx0XHQvLyBhZGQgYSB0aHJlc2hvbGRcblx0XHRcdFx0aWYgKG1hcmtlclRpbWUgKyAwLjUgPCBjdXJyZW50VGltZSkge1xuXHRcdFx0XHRcdHBsYXllci5jdXJyZW50VGltZShtYXJrZXJUaW1lKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0YWRkOiBmdW5jdGlvbihuZXdNYXJrZXJzKSB7XG5cdFx0XHQvLyBhZGQgbmV3IG1hcmtlcnMgZ2l2ZW4gYW4gYXJyYXkgb2YgaW5kZXhcblx0XHRcdGFkZE1hcmtlcnMobmV3TWFya2Vycyk7XG5cdFx0fSxcblx0XHRyZW1vdmU6IGZ1bmN0aW9uKGluZGV4QXJyYXkpIHtcblx0XHRcdC8vIHJlbW92ZSBtYXJrZXJzIGdpdmVuIGFuIGFycmF5IG9mIGluZGV4XG5cdFx0XHRyZW1vdmVNYXJrZXJzKGluZGV4QXJyYXkpO1xuXHRcdH0sXG5cdFx0cmVtb3ZlQWxsOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBpbmRleEFycmF5ID0gW107XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG1hcmtlcnNMaXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGluZGV4QXJyYXkucHVzaChpKTtcblx0XHRcdH1cblx0XHRcdHJlbW92ZU1hcmtlcnMoaW5kZXhBcnJheSk7XG5cdFx0fSxcblx0XHR1cGRhdGVUaW1lOiBmdW5jdGlvbigpIHtcblx0XHRcdC8vIG5vdGlmeSB0aGUgcGx1Z2luIHRvIHVwZGF0ZSB0aGUgVUkgZm9yIGNoYW5nZXMgaW4gbWFya2VyIHRpbWVzIFxuXHRcdFx0dXBkYXRlTWFya2VycygpO1xuXHRcdH0sXG5cdFx0cmVzZXQ6IGZ1bmN0aW9uKG5ld01hcmtlcnMpIHtcblx0XHRcdC8vIHJlbW92ZSBhbGwgdGhlIGV4aXN0aW5nIG1hcmtlcnMgYW5kIGFkZCBuZXcgb25lc1xuXHRcdFx0cGxheWVyLm1hcmtlcnMucmVtb3ZlQWxsKCk7XG5cdFx0XHRhZGRNYXJrZXJzKG5ld01hcmtlcnMpO1xuXHRcdH0sXG5cdFx0ZGVzdHJveTogZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyB1bnJlZ2lzdGVyIHRoZSBwbHVnaW5zIGFuZCBjbGVhbiB1cCBldmVuIGhhbmRsZXJzXG5cdFx0XHRwbGF5ZXIubWFya2Vycy5yZW1vdmVBbGwoKTtcblx0XHRcdGJyZWFrT3ZlcmxheS5yZW1vdmUoKTtcblx0XHRcdG1hcmtlclRpcC5yZW1vdmUoKTtcblx0XHRcdHBsYXllci5vZmYoXCJ0aW1ldXBkYXRlXCIsIHVwZGF0ZUJyZWFrT3ZlcmxheSk7XG5cdFx0XHRkZWxldGUgcGxheWVyLm1hcmtlcnM7XG5cdFx0fSxcblx0fTtcbn07XG5cbi8qKlxuICog5rC05Y2wXG4gKiBAcGFyYW0ge1t0eXBlXX0gb3B0aW9ucyBbZGVzY3JpcHRpb25dXG4gKiByZXR1cm4ge1t0eXBlXX0gIFtkZXNjcmlwdGlvbl1cbiAqL1xuY29uc3Qgd2F0ZXJNYXJrID0gZnVuY3Rpb24oc2V0dGluZ3MpIHtcblx0dmFyIGRlZmF1bHRzID0ge1xuXHRcdFx0ZmlsZTogJ2xvZ28ucG5nJyxcblx0XHRcdHhwb3M6IDAsXG5cdFx0XHR5cG9zOiAwLFxuXHRcdFx0eHJlcGVhdDogMCxcblx0XHRcdG9wYWNpdHk6IDEwMCxcblx0XHRcdGNsaWNrYWJsZTogZmFsc2UsXG5cdFx0XHR1cmw6IFwiXCIsXG5cdFx0XHRjbGFzc05hbWU6ICd2anMtd2F0ZXJtYXJrJyxcblx0XHRcdHRleHQ6IGZhbHNlLFxuXHRcdFx0ZGVidWc6IGZhbHNlXG5cdFx0fSxcblx0XHRleHRlbmQgPSBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBhcmdzLCB0YXJnZXQsIGksIG9iamVjdCwgcHJvcGVydHk7XG5cdFx0XHRhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcblx0XHRcdHRhcmdldCA9IGFyZ3Muc2hpZnQoKSB8fCB7fTtcblx0XHRcdGZvciAoaSBpbiBhcmdzKSB7XG5cdFx0XHRcdG9iamVjdCA9IGFyZ3NbaV07XG5cdFx0XHRcdGZvciAocHJvcGVydHkgaW4gb2JqZWN0KSB7XG5cdFx0XHRcdFx0aWYgKG9iamVjdC5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpIHtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2Ygb2JqZWN0W3Byb3BlcnR5XSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0W3Byb3BlcnR5XSA9IGV4dGVuZCh0YXJnZXRbcHJvcGVydHldLCBvYmplY3RbcHJvcGVydHldKTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHRhcmdldFtwcm9wZXJ0eV0gPSBvYmplY3RbcHJvcGVydHldO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRhcmdldDtcblx0XHR9O1xuXG5cdC8vISBnbG9iYWwgdmFyaWJsZSBjb250YWluaW5nIHJlZmVyZW5jZSB0byB0aGUgRE9NIGVsZW1lbnRcblx0dmFyIGRpdjtcblxuXHQvLyB2YXIgc2V0dGluZ3MgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuXG5cdGlmIChzZXR0aW5ncy5kZWJ1ZykgY29uc29sZS5sb2coJ3dhdGVybWFyazogUmVnaXN0ZXIgaW5pdCcpO1xuXG5cdHZhciBvcHRpb25zLCBwbGF5ZXIsIHZpZGVvLCBpbWcsIGxpbms7XG5cdG9wdGlvbnMgPSBleHRlbmQoZGVmYXVsdHMsIHNldHRpbmdzKTtcblxuXHQvKiBHcmFiIHRoZSBuZWNlc3NhcnkgRE9NIGVsZW1lbnRzICovXG5cdHBsYXllciA9IHRoaXMuZWwoKTtcblx0dmlkZW8gPSB0aGlzLmVsKCkuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3ZpZGVvJylbMF07XG5cblx0Ly8gY3JlYXRlIHRoZSB3YXRlcm1hcmsgZWxlbWVudFxuXHRpZiAoIWRpdikge1xuXHRcdGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdGRpdi5jbGFzc05hbWUgPSBvcHRpb25zLmNsYXNzTmFtZTtcblx0fSBlbHNlIHtcblx0XHQvLyEgaWYgZGl2IGFscmVhZHkgZXhpc3RzLCBlbXB0eSBpdFxuXHRcdGRpdi5pbm5lckhUTUwgPSAnJztcblx0fVxuXG5cdC8vIGlmIHRleHQgaXMgc2V0LCBkaXNwbGF5IHRleHRcblx0aWYgKG9wdGlvbnMudGV4dClcblx0XHRkaXYudGV4dENvbnRlbnQgPSBvcHRpb25zLnRleHQ7XG5cblx0Ly8gaWYgaW1nIGlzIHNldCwgYWRkIGltZ1xuXHRpZiAob3B0aW9ucy5maWxlKSB7XG5cdFx0aW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG5cdFx0ZGl2LmFwcGVuZENoaWxkKGltZyk7XG5cdFx0ZGl2LnN0eWxlLmRpc3BsYXkgPSBcImlubGluZS1ibG9ja1wiO1xuXHRcdGRpdi5zdHlsZS5wb3NpdGlvbiA9IFwiYWJzb2x1dGVcIjtcblx0XHRkaXYuc3R5bGUuekluZGV4ID0gMDtcblx0XHRpbWcuc3JjID0gb3B0aW9ucy5maWxlO1xuXHR9XG5cdC8vaW1nLnN0eWxlLmJvdHRvbSA9IFwiMFwiO1xuXHQvL2ltZy5zdHlsZS5yaWdodCA9IFwiMFwiO1xuXHRpZiAoKG9wdGlvbnMueXBvcyA9PT0gMCkgJiYgKG9wdGlvbnMueHBvcyA9PT0gMCkpIC8vIFRvcCBsZWZ0XG5cdHtcblx0XHRkaXYuc3R5bGUudG9wID0gXCIwcHhcIjtcblx0XHRkaXYuc3R5bGUubGVmdCA9IFwiMHB4XCI7XG5cdH0gZWxzZSBpZiAoKG9wdGlvbnMueXBvcyA9PT0gMCkgJiYgKG9wdGlvbnMueHBvcyA9PT0gMTAwKSkgLy8gVG9wIHJpZ2h0XG5cdHtcblx0XHRkaXYuc3R5bGUudG9wID0gXCIwcHhcIjtcblx0XHRkaXYuc3R5bGUucmlnaHQgPSBcIjBweFwiO1xuXHR9IGVsc2UgaWYgKChvcHRpb25zLnlwb3MgPT09IDEwMCkgJiYgKG9wdGlvbnMueHBvcyA9PT0gMTAwKSkgLy8gQm90dG9tIHJpZ2h0XG5cdHtcblx0XHRkaXYuc3R5bGUuYm90dG9tID0gXCIwcHhcIjtcblx0XHRkaXYuc3R5bGUucmlnaHQgPSBcIjBweFwiO1xuXHR9IGVsc2UgaWYgKChvcHRpb25zLnlwb3MgPT09IDEwMCkgJiYgKG9wdGlvbnMueHBvcyA9PT0gMCkpIC8vIEJvdHRvbSBsZWZ0XG5cdHtcblx0XHRkaXYuc3R5bGUuYm90dG9tID0gXCIwcHhcIjtcblx0XHRkaXYuc3R5bGUubGVmdCA9IFwiMHB4XCI7XG5cdH0gZWxzZSBpZiAoKG9wdGlvbnMueXBvcyA9PT0gNTApICYmIChvcHRpb25zLnhwb3MgPT09IDUwKSkgLy8gQ2VudGVyXG5cdHtcblx0XHRpZiAob3B0aW9ucy5kZWJ1ZykgY29uc29sZS5sb2coJ3dhdGVybWFyazogcGxheWVyOicgKyBwbGF5ZXIud2lkdGggKyAneCcgKyBwbGF5ZXIuaGVpZ2h0KTtcblx0XHRpZiAob3B0aW9ucy5kZWJ1ZykgY29uc29sZS5sb2coJ3dhdGVybWFyazogdmlkZW86JyArIHZpZGVvLnZpZGVvV2lkdGggKyAneCcgKyB2aWRlby52aWRlb0hlaWdodCk7XG5cdFx0aWYgKG9wdGlvbnMuZGVidWcpIGNvbnNvbGUubG9nKCd3YXRlcm1hcms6IGltYWdlOicgKyBpbWcud2lkdGggKyAneCcgKyBpbWcuaGVpZ2h0KTtcblx0XHRkaXYuc3R5bGUudG9wID0gKHRoaXMuaGVpZ2h0KCkgLyAyKSArIFwicHhcIjtcblx0XHRkaXYuc3R5bGUubGVmdCA9ICh0aGlzLndpZHRoKCkgLyAyKSArIFwicHhcIjtcblx0fVxuXHRkaXYuc3R5bGUub3BhY2l0eSA9IG9wdGlvbnMub3BhY2l0eTtcblxuXHQvL2Rpdi5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2UgPSBcInVybChcIitvcHRpb25zLmZpbGUrXCIpXCI7XG5cdC8vZGl2LnN0eWxlLmJhY2tncm91bmRQb3NpdGlvbi54ID0gb3B0aW9ucy54cG9zK1wiJVwiO1xuXHQvL2Rpdi5zdHlsZS5iYWNrZ3JvdW5kUG9zaXRpb24ueSA9IG9wdGlvbnMueXBvcytcIiVcIjtcblx0Ly9kaXYuc3R5bGUuYmFja2dyb3VuZFJlcGVhdCA9IG9wdGlvbnMueHJlcGVhdDtcblx0Ly9kaXYuc3R5bGUub3BhY2l0eSA9IChvcHRpb25zLm9wYWNpdHkvMTAwKTtcblxuXHQvL2lmIHVzZXIgd2FudHMgd2F0ZXJtYXJrIHRvIGJlIGNsaWNrYWJsZSwgYWRkIGFuY2hvciBlbGVtXG5cdC8vdG9kbzogY2hlY2sgaWYgb3B0aW9ucy51cmwgaXMgYW4gYWN0dWFsIHVybD9cblx0aWYgKG9wdGlvbnMuY2xpY2thYmxlICYmIG9wdGlvbnMudXJsICE9PSBcIlwiKSB7XG5cdFx0bGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xuXHRcdGxpbmsuaHJlZiA9IG9wdGlvbnMudXJsO1xuXHRcdGxpbmsudGFyZ2V0ID0gXCJfYmxhbmtcIjtcblx0XHRsaW5rLmFwcGVuZENoaWxkKGRpdik7XG5cdFx0Ly9hZGQgY2xpY2thYmxlIHdhdGVybWFyayB0byB0aGUgcGxheWVyXG5cdFx0cGxheWVyLmFwcGVuZENoaWxkKGxpbmspO1xuXHR9IGVsc2Uge1xuXHRcdC8vYWRkIG5vcm1hbCB3YXRlcm1hcmsgdG8gdGhlIHBsYXllclxuXHRcdHBsYXllci5hcHBlbmRDaGlsZChkaXYpO1xuXHR9XG5cblx0aWYgKG9wdGlvbnMuZGVidWcpIGNvbnNvbGUubG9nKCd3YXRlcm1hcms6IFJlZ2lzdGVyIGVuZCcpO1xufTtcblxuLy8gLyoqXG4vLyAgKiDmiKrlm75cbi8vICAqIEBwYXJhbSB7W3R5cGVdfSBvcHRpb25zIFtkZXNjcmlwdGlvbl1cbi8vICAqIHJldHVybiB7W3R5cGVdfSAgW2Rlc2NyaXB0aW9uXVxuLy8gICovXG4vLyBjb25zdCBzbmFwc2hvdCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbi8vIC8vIFx0XCJ1c2Ugc3RyaWN0XCI7XG5cbi8vIFx0Ly8gZ2xvYmFsc1xuLy8gXHR2YXIgcGxheWVyID0gdGhpcztcbi8vIFx0dmFyIHZpZGVvID0gcGxheWVyLmVsKCkucXVlcnlTZWxlY3RvcigndmlkZW8nKTtcbi8vIFx0dmFyIGNvbnRhaW5lciwgc2NhbGU7XG4vLyBcdC8vRklYTUU6IGFkZCBzb21lIGtpbmQgb2YgYXNzZXJ0IGZvciB2aWRlbywgaWYgZmxhc2ggaXMgdXNlZCBpdCdzIG5vdCB3b3JraW5nXG5cbi8vIFx0Ly9UT0RPOiBhZGQgYmV0dGVyIHByZWZpeCBmb3IgYWxsIG5ldyBjc3MgY2xhc3MsIHByb2JhYmx5IHZqcy1zbmFwc2hvdFxuLy8gXHQvL1RPRE86IGJyZWFrIHRoaXMgbGFyZ2UgZmlsZSB1cCBpbnRvIHNtYWxsZXIgb25lcywgZS5nLiBjb250YWluZXIsIC4uLlxuLy8gXHQvL1RPRE86IG1ha2UgaXQgcG9zc2libGUgdG8gZHJhZyBib3hlcyBhbHNvIGZyb20gYm90dG9tIHJpZ2h0IHRvIHRvcCBsZWZ0XG5cbi8vIFx0ZnVuY3Rpb24gdXBkYXRlU2NhbGUoKXtcbi8vIFx0XHR2YXIgcmVjdCA9IHZpZGVvLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuLy8gXHRcdHZhciBzY2FsZXcgPSBjYW52YXNfZHJhdy5lbCgpLndpZHRoIC8gcmVjdC53aWR0aDtcbi8vIFx0XHR2YXIgc2NhbGVoID0gY2FudmFzX2RyYXcuZWwoKS5oZWlnaHQgLyByZWN0LmhlaWdodDtcbi8vIFx0XHRzY2FsZSA9IE1hdGgubWF4KE1hdGgubWF4KHNjYWxldywgc2NhbGVoKSwgMSk7XG4vLyBcdFx0c2NhbGVfdHh0LmVsKCkuaW5uZXJIVE1MID0gKE1hdGgucm91bmQoMS9zY2FsZSoxMDApLzEwMCkgK1wieFwiO1xuLy8gXHR9XG5cbi8vIFx0Ly8gdGFrZSBzbmFwc2hvdCBvZiB2aWRlbyBhbmQgc2hvdyBhbGwgZHJhd2luZyBlbGVtZW50c1xuLy8gXHQvLyBhZGRlZCB0byBwbGF5ZXIgb2JqZWN0IHRvIGJlIGNhbGxhYmxlIGZyb20gb3V0c2lkZSwgZS5nLiBzaG9ydGN1dFxuLy8gXHRwbGF5ZXIuc25hcCA9IGZ1bmN0aW9uKCl7XG4vLyBcdFx0cGxheWVyLnBhdXNlKCk7XG4vLyBcdFx0Ly8gbG9vc2Uga2V5Ym9hcmQgZm9jdXNcbi8vIFx0XHRwbGF5ZXIuZWwoKS5ibHVyKCk7XG4vLyBcdFx0Ly8gc3dpdGNoIGNvbnRyb2wgYmFyIHRvIGRyYXdpbmcgY29udHJvbHNcbi8vIFx0XHRwbGF5ZXIuY29udHJvbEJhci5oaWRlKCk7XG4vLyBcdFx0ZHJhd0N0cmwuc2hvdygpO1xuLy8gXHRcdC8vIGRpc3BsYXkgY2FudmFzXG4vLyBcdFx0cGFyZW50LnNob3coKTtcblxuLy8gXHRcdC8vIGNhbnZhcyBmb3IgZHJhd2luZywgaXQncyBzZXBhcmF0ZSBmcm9tIHNuYXBzaG90IGJlY2F1c2Ugb2YgZGVsZXRlXG4vLyBcdFx0Y2FudmFzX2RyYXcuZWwoKS53aWR0aCA9IHZpZGVvLnZpZGVvV2lkdGg7XG4vLyBcdFx0Y2FudmFzX2RyYXcuZWwoKS5oZWlnaHQgPSB2aWRlby52aWRlb0hlaWdodDtcbi8vIFx0XHRjb250ZXh0X2RyYXcuc3Ryb2tlU3R5bGUgPSBjb2xvci5lbCgpLnZhbHVlO1xuLy8gXHRcdGNvbnRleHRfZHJhdy5saW5lV2lkdGggPSBzaXplLmVsKCkudmFsdWUgLyAyO1xuLy8gXHRcdGNvbnRleHRfZHJhdy5saW5lQ2FwID0gXCJyb3VuZFwiO1xuLy8gXHRcdC8vIGNhbGN1bGF0ZSBzY2FsZVxuLy8gXHRcdHVwZGF0ZVNjYWxlKCk7XG5cbi8vIFx0XHQvLyBiYWNrZ3JvdW5kIGNhbnZhcyBjb250YWluaW5nIHNuYXBzaG90IGZyb20gdmlkZW9cbi8vIFx0XHRjYW52YXNfYmcuZWwoKS53aWR0aCA9IHZpZGVvLnZpZGVvV2lkdGg7XG4vLyBcdFx0Y2FudmFzX2JnLmVsKCkuaGVpZ2h0ID0gdmlkZW8udmlkZW9IZWlnaHQ7XG4vLyBcdFx0Y29udGV4dF9iZy5kcmF3SW1hZ2UodmlkZW8sIDAsIDApO1xuXG4vLyBcdFx0Ly8gc3RpbGwgZml0IGludG8gcGxheWVyIGVsZW1lbnRcbi8vIFx0XHR2YXIgcmVjdCA9IHZpZGVvLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpOyAvLyB1c2UgYm91bmRpbmcgcmVjdCBpbnN0ZWFkIG9mIHBsYXllci53aWR0aC9oZWlnaHQgYmVjYXVzZSBvZiBmdWxsc2NyZWVuXG4vLyBcdFx0Y2FudmFzX2RyYXcuZWwoKS5zdHlsZS5tYXhXaWR0aCAgPSByZWN0LndpZHRoICArXCJweFwiO1xuLy8gXHRcdGNhbnZhc19kcmF3LmVsKCkuc3R5bGUubWF4SGVpZ2h0ID0gcmVjdC5oZWlnaHQgK1wicHhcIjtcbi8vIFx0XHRjYW52YXNfYmcuZWwoKS5zdHlsZS5tYXhXaWR0aCAgPSByZWN0LndpZHRoICArXCJweFwiO1xuLy8gXHRcdGNhbnZhc19iZy5lbCgpLnN0eWxlLm1heEhlaWdodCA9IHJlY3QuaGVpZ2h0ICtcInB4XCI7XG4vLyBcdH07XG4vLyBcdC8vIGNhbWVyYSBpY29uIG9uIG5vcm1hbCBwbGF5ZXIgY29udHJvbCBiYXJcbi8vIFx0dmFyIHNuYXBfYnRuID0gcGxheWVyLmNvbnRyb2xCYXIuYWRkQ2hpbGQoJ2J1dHRvbicpO1xuLy8gXHRzbmFwX2J0bi5hZGRDbGFzcyhcInZqcy1zbmFwc2hvdC1idXR0b25cIik7XG4vLyBcdHNuYXBfYnRuLmVsKCkudGl0bGUgPSBcIlRha2Ugc25hcHNob3RcIjtcbi8vIFx0c25hcF9idG4ub24oJ2NsaWNrJywgcGxheWVyLnNuYXApO1xuXG4vLyBcdC8vIGRyYXdpbmcgY29udHJvbHNcblxuLy8gXHQvLyBhZGQgY2FudmFzIHBhcmVudCBjb250YWluZXIgYmVmb3JlIGRyYXcgY29udHJvbCBiYXIsIHNvIGJhciBnZXRzIG9uIHRvcFxuLy8gXHR2YXIgcGFyZW50ID0gcGxheWVyLmFkZENoaWxkKFxuLy8gXHRcdG5ldyB2aWRlb2pzLkNvbXBvbmVudChwbGF5ZXIsIHtcbi8vIFx0XHRcdGVsOiB2aWRlb2pzLkNvbXBvbmVudC5wcm90b3R5cGUuY3JlYXRlRWwobnVsbCwge1xuLy8gXHRcdFx0XHRjbGFzc05hbWU6ICd2anMtY2FudmFzLXBhcmVudCcgLypUT0RPKi9cbi8vIFx0XHRcdH0pLFxuLy8gXHRcdH0pXG4vLyBcdCk7XG5cbi8vIFx0Ly9kcmF3IGNvbnRyb2wgYmFyXG4vLyBcdHZhciBkcmF3Q3RybCA9IHBsYXllci5hZGRDaGlsZChcbi8vIFx0XHRuZXcgdmlkZW9qcy5Db21wb25lbnQocGxheWVyLCB7XG4vLyBcdFx0XHRlbDogdmlkZW9qcy5Db21wb25lbnQucHJvdG90eXBlLmNyZWF0ZUVsKG51bGwsIHtcbi8vIFx0XHRcdFx0Y2xhc3NOYW1lOiAndmpzLWNvbnRyb2wtYmFyIHZqcy1kcmF3aW5nLWN0cmwnLFxuLy8gXHRcdFx0fSksXG4vLyBcdFx0fSlcbi8vIFx0KTtcbi8vIFx0ZHJhd0N0cmwuaGlkZSgpO1xuXG4vLyBcdC8vIGNob29zZSBjb2xvciwgdXNlZCBldmVyeXdoZXJlOiBwYWludGluZywgYm9yZGVyIGNvbG9yIG9mIGNyb3Bib3gsIC4uLlxuLy8gXHR2YXIgY29sb3IgPSBkcmF3Q3RybC5hZGRDaGlsZChcbi8vIFx0XHRuZXcgdmlkZW9qcy5Db21wb25lbnQocGxheWVyLCB7XG4vLyBcdFx0XHRlbDogdmlkZW9qcy5Db21wb25lbnQucHJvdG90eXBlLmNyZWF0ZUVsKCdpbnB1dCcsIHtcbi8vIFx0XHRcdFx0Y2xhc3NOYW1lOiAndmpzLWNvbnRyb2wnLCB0eXBlOiAnY29sb3InLCB2YWx1ZTogJyNkZjRiMjYnLCB0aXRsZTogJ2NvbG9yJ1xuLy8gXHRcdFx0fSksXG4vLyBcdFx0fSlcbi8vIFx0KTtcbi8vIFx0Y29sb3Iub24oJ2NoYW5nZScsIGZ1bmN0aW9uKGUpe1xuLy8gXHRcdGNvbnRleHRfZHJhdy5zdHJva2VTdHlsZSA9IGNvbG9yLmVsKCkudmFsdWU7XG4vLyBcdH0pO1xuXG4vLyBcdC8vIGNob29zZSBzaXplLCB1c2VkIGV2ZXJ5d2hlcmU6IGxpbmUgd2lkdGgsIHRleHQgc2l6ZVxuLy8gXHR2YXIgc2l6ZSA9IGRyYXdDdHJsLmFkZENoaWxkKFxuLy8gXHRcdG5ldyB2aWRlb2pzLkNvbXBvbmVudChwbGF5ZXIsIHtcbi8vIFx0XHRcdGVsOiB2aWRlb2pzLkNvbXBvbmVudC5wcm90b3R5cGUuY3JlYXRlRWwoJ2lucHV0Jywge1xuLy8gXHRcdFx0XHRjbGFzc05hbWU6ICd2anMtY29udHJvbCcsIHR5cGU6ICdudW1iZXInLCB2YWx1ZTogJzEwJywgdGl0bGU6ICdsaW5lIHdpZHRoLCB0ZXh0IHNpemUsIC4uLidcbi8vIFx0XHRcdH0pLFxuLy8gXHRcdH0pXG4vLyBcdCk7XG4vLyBcdHNpemUub24oJ2tleWRvd24nLCBmdW5jdGlvbihlKXsgLy8gZG9uJ3QgZmlyZSBwbGF5ZXIgc2hvcnRjdXRzIHdoZW4gc2l6ZSBpbnB1dCBoYXMgZm9jdXNcbi8vIFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuLy8gXHR9KTtcbi8vIFx0c2l6ZS5vbignY2hhbmdlJywgZnVuY3Rpb24oZSl7XG4vLyBcdFx0Y29udGV4dF9kcmF3LmxpbmVXaWR0aCA9IHNpemUuZWwoKS52YWx1ZSAvIDI7XG4vLyBcdH0pO1xuXG4vLyBcdHZhciB0b29sID0gJ2JydXNoJztcbi8vIFx0ZnVuY3Rpb24gdG9vbENoYW5nZShldmVudCl7XG4vLyBcdFx0dmFyIGFjdGl2ZV90b29sID0gZHJhd0N0cmwuZWwoKS5xdWVyeVNlbGVjdG9yKCcudmpzLXRvb2wtYWN0aXZlJyk7XG4vLyBcdFx0YWN0aXZlX3Rvb2wuY2xhc3NMaXN0LnJlbW92ZSgndmpzLXRvb2wtYWN0aXZlJyk7XG4vLyBcdFx0ZXZlbnQudGFyZ2V0LmNsYXNzTGlzdC5hZGQoJ3Zqcy10b29sLWFjdGl2ZScpO1xuLy8gXHRcdHRvb2wgPSBldmVudC50YXJnZXQuZGF0YXNldC52YWx1ZTtcbi8vIFx0XHQvLyBhbHdheXMgaGlkZSBjcm9wYm94LCB0ZXh0Ym94IGlzIGhpZGRlbiBhdXRvbWF0aWNhbGx5IGFzIGl0IGJsdXJzXG4vLyBcdFx0Y3JvcGJveC5oaWRlKCk7XG4vLyBcdH1cbi8vIFx0dmlkZW9qcy5Ub29sQnV0dG9uID0gdmlkZW9qcy5CdXR0b24uZXh0ZW5kKHtcbi8vIFx0XHRpbml0OiBmdW5jdGlvbihwLCBvcHRpb25zKSB7XG4vLyBcdFx0XHR2aWRlb2pzLkJ1dHRvbi5jYWxsKHRoaXMsIHAsIG9wdGlvbnMpO1xuXG4vLyBcdFx0XHR0aGlzLmFkZENsYXNzKFwidmpzLWRyYXdpbmctXCIrIG9wdGlvbnMudG9vbCk7XG4vLyBcdFx0XHR0aGlzLmVsKCkuZGF0YXNldC52YWx1ZSA9IG9wdGlvbnMudG9vbDtcbi8vIFx0XHRcdHRoaXMuZWwoKS50aXRsZSA9IG9wdGlvbnMudGl0bGU7XG5cbi8vIFx0XHRcdHRoaXMub24oJ2NsaWNrJywgdG9vbENoYW5nZSk7XG4vLyBcdFx0fVxuLy8gXHR9KTtcbi8vIFx0dmFyIGJydXNoICA9IGRyYXdDdHJsLmFkZENoaWxkKG5ldyB2aWRlb2pzLlRvb2xCdXR0b24ocGxheWVyLCB7dG9vbDogXCJicnVzaFwiLCB0aXRsZTogXCJmcmVlaGFuZCBkcmF3aW5nXCJ9KSk7XG4vLyBcdGJydXNoLmFkZENsYXNzKFwidmpzLXRvb2wtYWN0aXZlXCIpO1xuLy8gXHR2YXIgcmVjdCAgID0gZHJhd0N0cmwuYWRkQ2hpbGQobmV3IHZpZGVvanMuVG9vbEJ1dHRvbihwbGF5ZXIsIHt0b29sOiBcInJlY3RcIiwgIHRpdGxlOiBcImRyYXcgcmVjdGFuZ2xlIGZyb20gdG9wIGxlZnQgdG8gYm90dG9tIHJpZ2h0XCJ9KSk7XG4vLyBcdHZhciBjcm9wICAgPSBkcmF3Q3RybC5hZGRDaGlsZChuZXcgdmlkZW9qcy5Ub29sQnV0dG9uKHBsYXllciwge3Rvb2w6IFwiY3JvcFwiLCAgdGl0bGU6IFwic2VsZWN0IGFyZWEgYW5kIGNsaWNrIHNlbGVjdGlvbiB0byBjcm9wXCJ9KSk7XG4vLyBcdHZhciB0ZXh0ICAgPSBkcmF3Q3RybC5hZGRDaGlsZChuZXcgdmlkZW9qcy5Ub29sQnV0dG9uKHBsYXllciwge3Rvb2w6IFwidGV4dFwiLCAgdGl0bGU6IFwic2VsZWN0IGFyZWEsIHR5cGUgbWVzc2FnZSBhbmQgdGhlbiBjbGljayBzb21ld2hlcmUgZWxzZVwifSkpO1xuLy8gXHR2YXIgZXJhc2VyID0gZHJhd0N0cmwuYWRkQ2hpbGQobmV3IHZpZGVvanMuVG9vbEJ1dHRvbihwbGF5ZXIsIHt0b29sOiBcImVyYXNlclwiLHRpdGxlOiBcImVyYXNlIGRyYXdpbmcgaW4gY2xpY2tlZCBsb2NhdGlvblwifSkpO1xuXG4vLyBcdHZhciBzY2FsZXIgPSBkcmF3Q3RybC5hZGRDaGlsZChcbi8vIFx0XHRuZXcgdmlkZW9qcy5Db21wb25lbnQocGxheWVyLCB7XG4vLyBcdFx0XHRlbDogdmlkZW9qcy5Db21wb25lbnQucHJvdG90eXBlLmNyZWF0ZUVsKG51bGwsIHtcbi8vIFx0XHRcdFx0Y2xhc3NOYW1lOiAndmpzLWNvbnRyb2wgdmpzLWRyYXdpbmctc2NhbGVyJywgdGl0bGU6ICdzY2FsZSBpbWFnZSdcbi8vIFx0XHRcdH0pXG4vLyBcdFx0fSlcbi8vIFx0KTtcbi8vIFx0c2NhbGVyLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpe1xuLy8gXHRcdHZhciB3ID0gY2FudmFzX2RyYXcuZWwoKS53aWR0aCwgaCA9IGNhbnZhc19kcmF3LmVsKCkuaGVpZ2h0O1xuLy8gXHRcdHZhciBzY2FsZXcgPSB3aW5kb3cucHJvbXB0KFwiQ3VycmVudCBpbWFnZSBzaXplIGlzIFwiK3crXCJ4XCIraCtcIiAuIE5ldyB3aWR0aD9cIiwgdyk7XG4vLyBcdFx0c2NhbGV3ID0gcGFyc2VJbnQoc2NhbGV3LCAxMCk7XG4vLyBcdFx0aWYoIWlzTmFOKHNjYWxldykpe1xuLy8gXHRcdFx0dmFyIGZhY3RvciA9IHNjYWxldyAvIHc7XG4vLyBcdFx0XHR2YXIgd2lkdGggID0gZmFjdG9yICogdyB8MDtcbi8vIFx0XHRcdHZhciBoZWlnaHQgPSBmYWN0b3IgKiBoIHwwO1xuXG4vLyBcdFx0XHR2YXIgciA9IHNjYWxlQ3JvcENhbnZhcygwLCAwLCB3LCBoLCB3aWR0aCwgaGVpZ2h0LCBjYW52YXNfYmcsIGNvbnRleHRfYmcpO1xuLy8gXHRcdFx0Y2FudmFzX2JnID0gclswXTsgY29udGV4dF9iZyA9IHJbMV07XG4vLyBcdFx0XHRyID0gc2NhbGVDcm9wQ2FudmFzKDAsIDAsIHcsIGgsIHdpZHRoLCBoZWlnaHQsIGNhbnZhc19kcmF3LCBjb250ZXh0X2RyYXcpO1xuLy8gXHRcdFx0Y2FudmFzX2RyYXcgPSByWzBdOyBjb250ZXh0X2RyYXcgPSByWzFdO1xuLy8gXHRcdFx0dXBkYXRlU2NhbGUoKTtcbi8vIFx0XHR9XG4vLyBcdFx0Ly8ganVzdCBpZ25vcmVcbi8vIFx0fSk7XG5cbi8vIFx0ZnVuY3Rpb24gY29tYmluZURyYXdpbmcoZW5jb2Rpbmcpe1xuLy8gXHRcdC8vYmxpdCBjYW52YXMgYW5kIG9wZW4gbmV3IHRhYiB3aXRoIGltYWdlXG4vLyBcdFx0dmFyIGNhbnZhc190bXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbi8vIFx0XHRjYW52YXNfdG1wLndpZHRoID0gY2FudmFzX2RyYXcuZWwoKS53aWR0aDtcbi8vIFx0XHRjYW52YXNfdG1wLmhlaWdodCA9IGNhbnZhc19kcmF3LmVsKCkuaGVpZ2h0O1xuLy8gXHRcdHZhciBjdHhfdG1wID0gY2FudmFzX3RtcC5nZXRDb250ZXh0KFwiMmRcIik7XG4vLyBcdFx0Y3R4X3RtcC5kcmF3SW1hZ2UoY2FudmFzX2JnLmVsKCksIDAsIDApO1xuLy8gXHRcdGN0eF90bXAuZHJhd0ltYWdlKGNhbnZhc19kcmF3LmVsKCksIDAsIDApO1xuLy8gXHRcdHdpbmRvdy5vcGVuKGNhbnZhc190bXAudG9EYXRhVVJMKGVuY29kaW5nKSk7XG4vLyBcdH1cblxuLy8gXHR2YXIgZGxqcGVnID0gZHJhd0N0cmwuYWRkQ2hpbGQoXG4vLyBcdFx0bmV3IHZpZGVvanMuQ29tcG9uZW50KHBsYXllciwge1xuLy8gXHRcdFx0ZWw6IHZpZGVvanMuQ29tcG9uZW50LnByb3RvdHlwZS5jcmVhdGVFbChudWxsLCB7XG4vLyBcdFx0XHRcdGNsYXNzTmFtZTogJ3Zqcy1jb250cm9sIHZqcy1idXR0b24nLCBpbm5lckhUTUw6ICdKUEVHJywgdGl0bGU6ICdvcGVuIG5ldyB0YWIgd2l0aCBqcGVnIGltYWdlJ1xuLy8gXHRcdFx0fSksXG4vLyBcdFx0fSlcbi8vIFx0KTtcbi8vIFx0ZGxqcGVnLm9uKCdjbGljaycsIGZ1bmN0aW9uKCl7IGNvbWJpbmVEcmF3aW5nKFwiaW1hZ2UvanBlZ1wiKTsgfSk7XG4vLyBcdHZhciBkbHBuZyA9IGRyYXdDdHJsLmFkZENoaWxkKFxuLy8gXHRcdG5ldyB2aWRlb2pzLkNvbXBvbmVudChwbGF5ZXIsIHtcbi8vIFx0XHRcdGVsOiB2aWRlb2pzLkNvbXBvbmVudC5wcm90b3R5cGUuY3JlYXRlRWwobnVsbCwge1xuLy8gXHRcdFx0XHRjbGFzc05hbWU6ICd2anMtY29udHJvbCB2anMtYnV0dG9uJywgaW5uZXJIVE1MOiAnUE5HJywgdGl0bGU6ICdvcGVuIG5ldyB0YWIgd2l0aCBwbmcgaW1hZ2UnXG4vLyBcdFx0XHR9KSxcbi8vIFx0XHR9KVxuLy8gXHQpO1xuLy8gXHRkbHBuZy5vbignY2xpY2snLCBmdW5jdGlvbigpeyBjb21iaW5lRHJhd2luZyhcImltYWdlL3BuZ1wiKTsgfSk7XG5cbi8vIFx0Ly8gY2xvc2UgYnV0dG9uIGxlYWRpbmcgYmFjayB0byBub3JtYWwgdmlkZW8gcGxheSBiYWNrXG4vLyBcdHZhciBjbG9zZSA9IGRyYXdDdHJsLmFkZENoaWxkKCdidXR0b24nKTtcbi8vIFx0Y2xvc2UuYWRkQ2xhc3MoXCJ2anMtZHJhd2luZy1jbG9zZVwiKTtcbi8vIFx0Y2xvc2UuZWwoKS50aXRsZSA9IFwiY2xvc2Ugc2NyZWVuc2hvdCBhbmQgcmV0dXJuIHRvIHZpZGVvXCI7XG4vLyBcdGNsb3NlLm9uKCdjbGljaycsIGZ1bmN0aW9uKCl7XG4vLyBcdFx0Ly8gaGlkZSBjcm9wYm94XG4vLyBcdFx0Y3JvcGJveC5oaWRlKCk7XG4vLyBcdFx0Ly8gaGlkZSBhbGwgY2FudmFzIHN0dWZmXG4vLyBcdFx0cGFyZW50LmhpZGUoKTtcbi8vIFx0XHQvLyBzd2l0Y2ggYmFjayB0byBub3JtYWwgcGxheWVyIGNvbnRyb2xzXG4vLyBcdFx0ZHJhd0N0cmwuaGlkZSgpO1xuLy8gXHRcdHBsYXllci5jb250cm9sQmFyLnNob3coKTtcbi8vIFx0XHRwbGF5ZXIuZWwoKS5mb2N1cygpO1xuLy8gXHR9KTtcblxuLy8gXHQvLyBzY2FsZSBkaXNwbGF5XG4vLyBcdHZhciBzY2FsZV90eHQgPSBkcmF3Q3RybC5hZGRDaGlsZChcbi8vIFx0XHRuZXcgdmlkZW9qcy5Db21wb25lbnQocGxheWVyLCB7XG4vLyBcdFx0XHRlbDogdmlkZW9qcy5Db21wb25lbnQucHJvdG90eXBlLmNyZWF0ZUVsKG51bGwsIHtcbi8vIFx0XHRcdFx0Y2xhc3NOYW1lOiAndmpzLXNjYWxlJywgaW5uZXJIVE1MOiAnMScsIHRpdGxlOiAnc2NhbGUgZmFjdG9yJ1xuLy8gXHRcdFx0fSksXG4vLyBcdFx0fSlcbi8vIFx0KTtcblxuLy8gXHQvLyBjYW52YXMgc3R1ZmZcbi8vIFx0Y29udGFpbmVyID0gcGFyZW50LmFkZENoaWxkKFxuLy8gXHRcdG5ldyB2aWRlb2pzLkNvbXBvbmVudChwbGF5ZXIsIHtcbi8vIFx0XHRcdGVsOiB2aWRlb2pzLkNvbXBvbmVudC5wcm90b3R5cGUuY3JlYXRlRWwobnVsbCwge1xuLy8gXHRcdFx0XHRjbGFzc05hbWU6ICd2anMtY2FudmFzLWNvbnRhaW5lcicgLypUT0RPKi9cbi8vIFx0XHRcdH0pLFxuLy8gXHRcdH0pXG4vLyBcdCk7XG4vLyBcdHZhciBjYW52YXNfYmcgPSBjb250YWluZXIuYWRkQ2hpbGQoIC8vRklYTUU6IGl0J3MgcXVpdGUgc2lsbHkgdG8gdXNlIGEgY29tcG9uZW50IGhlcmVcbi8vIFx0XHRuZXcgdmlkZW9qcy5Db21wb25lbnQocGxheWVyLCB7XG4vLyBcdFx0XHRlbDogdmlkZW9qcy5Db21wb25lbnQucHJvdG90eXBlLmNyZWF0ZUVsKCdjYW52YXMnLCB7XG4vLyBcdFx0XHR9KSxcbi8vIFx0XHR9KVxuLy8gXHQpO1xuLy8gXHR2YXIgY29udGV4dF9iZyA9IGNhbnZhc19iZy5lbCgpLmdldENvbnRleHQoXCIyZFwiKTtcbi8vIFx0dmFyIGNhbnZhc19kcmF3ID0gY29udGFpbmVyLmFkZENoaWxkKFxuLy8gXHRcdG5ldyB2aWRlb2pzLkNvbXBvbmVudChwbGF5ZXIsIHtcbi8vIFx0XHRcdGVsOiB2aWRlb2pzLkNvbXBvbmVudC5wcm90b3R5cGUuY3JlYXRlRWwoJ2NhbnZhcycsIHtcbi8vIFx0XHRcdH0pLFxuLy8gXHRcdH0pXG4vLyBcdCk7XG4vLyBcdHZhciBjb250ZXh0X2RyYXcgPSBjYW52YXNfZHJhdy5lbCgpLmdldENvbnRleHQoXCIyZFwiKTtcbi8vIFx0dmFyIGNhbnZhc19yZWN0ID0gY29udGFpbmVyLmFkZENoaWxkKFxuLy8gXHRcdG5ldyB2aWRlb2pzLkNvbXBvbmVudChwbGF5ZXIsIHtcbi8vIFx0XHRcdGVsOiB2aWRlb2pzLkNvbXBvbmVudC5wcm90b3R5cGUuY3JlYXRlRWwoJ2NhbnZhcycsIHtcbi8vIFx0XHRcdH0pLFxuLy8gXHRcdH0pXG4vLyBcdCk7XG4vLyBcdGNhbnZhc19yZWN0LmVsKCkuc3R5bGUuekluZGV4ID0gXCIxXCI7IC8vIGFsd2F5cyBvbiB0b3Agb2Ygb3RoZXIgY2FudmFzIGVsZW1lbnRzXG4vLyBcdHZhciBjb250ZXh0X3JlY3QgPSBjYW52YXNfcmVjdC5lbCgpLmdldENvbnRleHQoXCIyZFwiKTtcbi8vIFx0dmFyIGNyb3Bib3ggPSBjb250YWluZXIuYWRkQ2hpbGQoXG4vLyBcdFx0bmV3IHZpZGVvanMuQ29tcG9uZW50KHBsYXllciwge1xuLy8gXHRcdFx0ZWw6IHZpZGVvanMuQ29tcG9uZW50LnByb3RvdHlwZS5jcmVhdGVFbCgnZGl2Jywge1xuLy8gXHRcdFx0XHRpbm5lckhUTUw6IFwiY3JvcFwiXG4vLyBcdFx0XHR9KSxcbi8vIFx0XHR9KVxuLy8gXHQpO1xuLy8gXHRjcm9wYm94LmVsKCkuc3R5bGUuZGlzcGxheSA9IFwiZmxleFwiO1xuLy8gXHQvLyBjcm9wIGhhbmRsaW5nLCBjcmVhdGUgbmV3IGNhbnZhcyBhbmQgcmVwbGFjZSBvbGQgb25lXG4vLyBcdGZ1bmN0aW9uIHNjYWxlQ3JvcENhbnZhcyhsZWZ0LCB0b3AsIHdpZHRoLCBoZWlnaHQsIG5ld3dpZHRoLCBuZXdoZWlnaHQsIGNhbnZhcywgY29udGV4dCl7XG4vLyAvLyBcdFx0dmFyIG5ld2NhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuLy8gXHRcdHZhciBuZXdjYW52YXMgPSBuZXcgdmlkZW9qcy5Db21wb25lbnQocGxheWVyLCB7IC8vIEZJWE1FOiB0aGF0J3MgcXVpdGUgc2lsbHlcbi8vIFx0XHRcdGVsOiB2aWRlb2pzLkNvbXBvbmVudC5wcm90b3R5cGUuY3JlYXRlRWwoJ2NhbnZhcycsIHtcbi8vIFx0XHRcdH0pLFxuLy8gXHRcdH0pO1xuLy8gXHRcdHZhciByZWN0ID0gcGxheWVyLmVsKCkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4vLyBcdFx0bmV3Y2FudmFzLmVsKCkuc3R5bGUubWF4V2lkdGggID0gcmVjdC53aWR0aCAgK1wicHhcIjtcbi8vIFx0XHRuZXdjYW52YXMuZWwoKS5zdHlsZS5tYXhIZWlnaHQgPSByZWN0LmhlaWdodCArXCJweFwiO1xuXG4vLyBcdFx0bmV3Y2FudmFzLmVsKCkud2lkdGggPSBuZXd3aWR0aDtcbi8vIFx0XHRuZXdjYW52YXMuZWwoKS5oZWlnaHQgPSBuZXdoZWlnaHQ7XG5cbi8vIFx0XHR2YXIgY3R4ID0gbmV3Y2FudmFzLmVsKCkuZ2V0Q29udGV4dChcIjJkXCIpO1xuLy8gXHRcdGN0eC5kcmF3SW1hZ2UoY2FudmFzLmVsKCksXG4vLyBcdFx0XHRsZWZ0LCB0b3AsIHdpZHRoLCBoZWlnaHQsXG4vLyBcdFx0XHQwLCAwLCBuZXd3aWR0aCwgbmV3aGVpZ2h0XG4vLyBcdFx0KTtcblxuLy8gLy8gXHRcdGNvbnRhaW5lci5yZXBsYWNlQ2hpbGQobmV3Y2FudmFzLCBjYW52YXMpO1xuLy8gXHRcdGNvbnRhaW5lci5yZW1vdmVDaGlsZChjYW52YXMpO1xuLy8gXHRcdGNvbnRhaW5lci5hZGRDaGlsZChuZXdjYW52YXMpO1xuLy8gLy8gXHRcdGNhbnZhcyA9IG5ld2NhbnZhcztcbi8vIFx0XHRjdHgubGluZUNhcCA9IGNvbnRleHQubGluZUNhcDsgLy8gdHJhbnNmZXIgY29udGV4dCBzdGF0ZXNcbi8vIFx0XHRjdHguc3Ryb2tlU3R5bGUgPSBjb250ZXh0LnN0cm9rZVN0eWxlO1xuLy8gXHRcdGN0eC5saW5lV2lkdGggPSBjb250ZXh0LmxpbmVXaWR0aDtcbi8vIC8vIFx0XHRjb250ZXh0ID0gY3R4O1xuLy8gXHRcdC8vIGphdmFzY3JpcHQgaGFzIG5vIHBhc3MtYnktcmVmZXJlbmNlIC0+IGRvIHN0dXBpZCBzdHVmZlxuLy8gXHRcdHJldHVybiBbbmV3Y2FudmFzLCBjdHhdO1xuLy8gXHR9XG4vLyBcdGNyb3Bib3gub24oJ21vdXNlZG93bicsIGZ1bmN0aW9uKGUpe1xuLy8gXHRcdHZhciBsZWZ0ICAgPSBzY2FsZSAqIGNyb3Bib3guZWwoKS5vZmZzZXRMZWZ0ICB8MDtcbi8vIFx0XHR2YXIgdG9wICAgID0gc2NhbGUgKiBjcm9wYm94LmVsKCkub2Zmc2V0VG9wICAgfDA7XG4vLyBcdFx0dmFyIHdpZHRoICA9IHNjYWxlICogY3JvcGJveC5lbCgpLm9mZnNldFdpZHRoIHwwO1xuLy8gXHRcdHZhciBoZWlnaHQgPSBzY2FsZSAqIGNyb3Bib3guZWwoKS5vZmZzZXRIZWlnaHR8MDtcbi8vIFx0XHR2YXIgciA9IHNjYWxlQ3JvcENhbnZhcyhsZWZ0LCB0b3AsIHdpZHRoLCBoZWlnaHQsIHdpZHRoLCBoZWlnaHQsIGNhbnZhc19iZywgY29udGV4dF9iZyk7XG4vLyBcdFx0Y2FudmFzX2JnID0gclswXTsgY29udGV4dF9iZyA9IHJbMV07XG4vLyBcdFx0ciA9IHNjYWxlQ3JvcENhbnZhcyhsZWZ0LCB0b3AsIHdpZHRoLCBoZWlnaHQsIHdpZHRoLCBoZWlnaHQsIGNhbnZhc19kcmF3LCBjb250ZXh0X2RyYXcpO1xuLy8gXHRcdGNhbnZhc19kcmF3ID0gclswXTsgY29udGV4dF9kcmF3ID0gclsxXTtcbi8vIFx0XHR1cGRhdGVTY2FsZSgpO1xuXG4vLyBcdFx0Y3JvcGJveC5oaWRlKCk7XG4vLyBcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTsgLy9vdGhlcndpc2UgY2FudmFzIGJlbG93IGdldHMgbW91c2Vkb3duXG4vLyBcdH0pO1xuXG4vLyBcdHZhciB0ZXh0Ym94ID0gY29udGFpbmVyLmFkZENoaWxkKFxuLy8gXHRcdG5ldyB2aWRlb2pzLkNvbXBvbmVudChwbGF5ZXIsIHtcbi8vIFx0XHRcdGVsOiB2aWRlb2pzLkNvbXBvbmVudC5wcm90b3R5cGUuY3JlYXRlRWwoJ3RleHRhcmVhJywge1xuLy8gXHRcdFx0fSksXG4vLyBcdFx0fSlcbi8vIFx0KTtcbi8vIFx0dGV4dGJveC5vbigna2V5ZG93bicsIGZ1bmN0aW9uKGUpeyAvLyBkb24ndCBmaXJlIHBsYXllciBzaG9ydGN1dHMgd2hlbiB0ZXh0Ym94IGhhcyBmb2N1c1xuLy8gXHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4vLyBcdH0pO1xuLy8gXHQvLyBkcmF3IHRleHQgd2hlbiB0ZXh0Ym94IGxvb3NlcyBmb2N1c1xuLy8gXHR0ZXh0Ym94Lm9uKCdibHVyJywgZnVuY3Rpb24oZSl7XG4vLyBcdFx0Y29udGV4dF9kcmF3LmZpbGxTdHlsZSA9IGNvbG9yLmVsKCkudmFsdWU7XG4vLyBcdFx0Y29udGV4dF9kcmF3LmZvbnQgPSAoc2NhbGUgKiBzaXplLmVsKCkudmFsdWUqMikgK1wicHggc2Fucy1zZXJpZlwiO1xuLy8gXHRcdGNvbnRleHRfZHJhdy50ZXh0QmFzZWxpbmUgPSBcInRvcFwiO1xuLy8gXHRcdGNvbnRleHRfZHJhdy5maWxsVGV4dCh0ZXh0Ym94LmVsKCkudmFsdWUsXG4vLyBcdFx0XHRcdHNjYWxlKnRleHRib3guZWwoKS5vZmZzZXRMZWZ0ICsgc2NhbGUsXG4vLyBcdFx0XHRcdHNjYWxlKnRleHRib3guZWwoKS5vZmZzZXRUb3AgKyBzY2FsZSk7IC8vKzEgZm9yIGJvcmRlcj9cbi8vIFx0XHQvL0ZJWE1FOiB0aGVyZSdzIHN0aWxsIGEgbWlub3Igc2hpZnQgd2hlbiBzY2FsZSBpc24ndCAxLCBpbiBmaXJlZm94IG1vcmUgYW5kIGFsc28gd2hlbiBzY2FsZSBpcyAxXG4vLyBcdFx0dGV4dGJveC5oaWRlKCk7XG4vLyBcdFx0dGV4dGJveC5lbCgpLnZhbHVlID0gXCJcIjtcbi8vIFx0fSk7XG5cbi8vIFx0cGFyZW50LmhpZGUoKTtcbi8vIFx0Y2FudmFzX3JlY3QuaGlkZSgpO1xuLy8gXHRjcm9wYm94LmhpZGUoKTtcbi8vIFx0dGV4dGJveC5oaWRlKCk7XG5cbi8vIFx0Ly8gVE9ETzogZHJhdyBmdW5jdGlvbnNcbi8vIFx0dmFyIHBhaW50ID0gZmFsc2U7XG4vLyBcdGNvbnRhaW5lci5vbignbW91c2Vkb3duJywgZnVuY3Rpb24oZSl7XG4vLyBcdFx0cGFpbnQgPSB0cnVlO1xuLy8gXHRcdHZhciBwb3MgPSBjb250YWluZXIuZWwoKS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbi8vIFx0XHR2YXIgeCA9IGUuY2xpZW50WCAtIHBvcy5sZWZ0O1xuLy8gXHRcdHZhciB5ID0gZS5jbGllbnRZIC0gcG9zLnRvcDtcbi8vIFx0XHRzd2l0Y2godG9vbCl7XG4vLyBcdFx0XHRjYXNlIFwiYnJ1c2hcIjpcbi8vIFx0XHRcdFx0eCAqPSBzY2FsZTsgeSAqPSBzY2FsZTtcbi8vIFx0XHRcdFx0Y29udGV4dF9kcmF3LmJlZ2luUGF0aCgpO1xuLy8gXHRcdFx0XHRjb250ZXh0X2RyYXcubW92ZVRvKHgtMSwgeSk7XG4vLyBcdFx0XHRcdGNvbnRleHRfZHJhdy5saW5lVG8oeCwgeSk7XG4vLyBcdFx0XHRcdGNvbnRleHRfZHJhdy5zdHJva2UoKTtcbi8vIFx0XHRcdFx0YnJlYWs7XG4vLyBcdFx0XHRjYXNlIFwicmVjdFwiOlxuLy8gXHRcdFx0XHQvLyByZWN0YW5nbGUgaXMgc2NhbGVkIHdoZW4gYmxpdHRpbmcsIG5vdCB3aGVuIGRyYWdnaW5nXG4vLyBcdFx0XHRcdGNhbnZhc19yZWN0LmVsKCkud2lkdGggPSAwO1xuLy8gXHRcdFx0XHRjYW52YXNfcmVjdC5lbCgpLmhlaWdodCA9IDA7XG4vLyBcdFx0XHRcdGNhbnZhc19yZWN0LmVsKCkuc3R5bGUubGVmdCA9IHggKyBcInB4XCI7XG4vLyBcdFx0XHRcdGNhbnZhc19yZWN0LmVsKCkuc3R5bGUudG9wID0geSArIFwicHhcIjtcbi8vIFx0XHRcdFx0Y2FudmFzX3JlY3Quc2hvdygpO1xuLy8gXHRcdFx0XHRicmVhaztcbi8vIFx0XHRcdGNhc2UgXCJjcm9wXCI6XG4vLyBcdFx0XHRcdGNyb3Bib3guZWwoKS5zdHlsZS53aWR0aCA9IDA7XG4vLyBcdFx0XHRcdGNyb3Bib3guZWwoKS5zdHlsZS5oZWlnaHQgPSAwO1xuLy8gXHRcdFx0XHRjcm9wYm94LmVsKCkuc3R5bGUubGVmdCA9IHggKyBcInB4XCI7XG4vLyBcdFx0XHRcdGNyb3Bib3guZWwoKS5zdHlsZS50b3AgPSB5ICsgXCJweFwiO1xuXG4vLyBcdFx0XHRcdGNyb3Bib3guZWwoKS5zdHlsZS5ib3JkZXIgPSBcIjFweCBkYXNoZWQgXCIrIGNvbG9yLmVsKCkudmFsdWU7XG4vLyBcdFx0XHRcdGNyb3Bib3guZWwoKS5zdHlsZS5jb2xvciA9IGNvbG9yLmVsKCkudmFsdWU7XG4vLyBcdFx0XHRcdGNyb3Bib3guc2hvdygpO1xuLy8gXHRcdFx0XHRicmVhaztcbi8vIFx0XHRcdGNhc2UgXCJ0ZXh0XCI6XG4vLyBcdFx0XHRcdC8vIGlmIHNob3duIGFscmVhZHksIGxvb3NlIGZvY3VzIGFuZCBkcmF3IGl0IGZpcnN0LCBvdGhlcndpc2UgaXQgZ2V0cyBkcmF3biBhdCBtb3VzZWRvd25cbi8vIFx0XHRcdFx0aWYodGV4dGJveC5oYXNDbGFzcyhcInZqcy1oaWRkZW5cIikpe1xuLy8gXHRcdFx0XHRcdHRleHRib3guZWwoKS5zdHlsZS53aWR0aCA9IDA7XG4vLyBcdFx0XHRcdFx0dGV4dGJveC5lbCgpLnN0eWxlLmhlaWdodCA9IDA7XG4vLyBcdFx0XHRcdFx0dGV4dGJveC5lbCgpLnN0eWxlLmxlZnQgPSB4ICsgXCJweFwiO1xuLy8gXHRcdFx0XHRcdHRleHRib3guZWwoKS5zdHlsZS50b3AgPSB5ICsgXCJweFwiO1xuXG4vLyBcdFx0XHRcdFx0dGV4dGJveC5lbCgpLnN0eWxlLmJvcmRlciA9IFwiMXB4IGRhc2hlZCBcIisgY29sb3IuZWwoKS52YWx1ZTtcbi8vIFx0XHRcdFx0XHR0ZXh0Ym94LmVsKCkuc3R5bGUuY29sb3IgPSBjb2xvci5lbCgpLnZhbHVlO1xuLy8gXHRcdFx0XHRcdHRleHRib3guZWwoKS5zdHlsZS5mb250ID0gKHNpemUuZWwoKS52YWx1ZSoyKSArXCJweCBzYW5zLXNlcmlmXCI7XG4vLyBcdFx0XHRcdFx0dGV4dGJveC5zaG93KCk7XG4vLyBcdFx0XHRcdH1cbi8vIFx0XHRcdFx0YnJlYWs7XG4vLyBcdFx0XHRjYXNlIFwiZXJhc2VyXCI6XG4vLyBcdFx0XHRcdHZhciBzID0gc2l6ZS5lbCgpLnZhbHVlO1xuLy8gXHRcdFx0XHRjb250ZXh0X2RyYXcuY2xlYXJSZWN0KHNjYWxlKnggLSBzLzIsIHNjYWxlKnkgLSBzLzIsIHMsIHMpO1xuLy8gXHRcdFx0XHRicmVhaztcbi8vIFx0XHR9XG4vLyAvLyBcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuLy8gXHR9KTtcbi8vIFx0Y29udGFpbmVyLm9uKCdtb3VzZW1vdmUnLCBmdW5jdGlvbihlKXtcbi8vIFx0XHRpZihwYWludCl7XG4vLyBcdFx0XHR2YXIgcG9zID0gY29udGFpbmVyLmVsKCkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4vLyBcdFx0XHR2YXIgeCA9IGUuY2xpZW50WCAtIHBvcy5sZWZ0O1xuLy8gXHRcdFx0dmFyIHkgPSBlLmNsaWVudFkgLSBwb3MudG9wO1xuLy8gXHRcdFx0c3dpdGNoKHRvb2wpe1xuLy8gXHRcdFx0XHRjYXNlIFwiYnJ1c2hcIjpcbi8vIFx0XHRcdFx0XHRjb250ZXh0X2RyYXcubGluZVRvKHNjYWxlICogeCwgc2NhbGUgKiB5KTtcbi8vIFx0XHRcdFx0XHRjb250ZXh0X2RyYXcuc3Ryb2tlKCk7XG4vLyBcdFx0XHRcdFx0YnJlYWs7XG4vLyBcdFx0XHRcdGNhc2UgXCJyZWN0XCI6XG4vLyBcdFx0XHRcdFx0Y29udGV4dF9yZWN0LmNsZWFyUmVjdCgwLCAwLCBjb250ZXh0X3JlY3QuY2FudmFzLndpZHRoLCBjb250ZXh0X3JlY3QuY2FudmFzLmhlaWdodCk7XG4vLyBcdFx0XHRcdFx0Ly8gdGhpcyB3YXkgaXQncyBvbmx5IHBvc3NpYmxlIHRvIGRyYWcgdG8gdGhlIHJpZ2h0IGFuZCBkb3duLCBtb3VzZWRvd24gc2V0cyB0b3AgbGVmdFxuLy8gXHRcdFx0XHRcdGNhbnZhc19yZWN0LmVsKCkud2lkdGggPSB4IC0gY2FudmFzX3JlY3QuZWwoKS5vZmZzZXRMZWZ0OyAvLyByZXNpemUgY2FudmFzXG4vLyBcdFx0XHRcdFx0Y2FudmFzX3JlY3QuZWwoKS5oZWlnaHQgPSB5IC0gY2FudmFzX3JlY3QuZWwoKS5vZmZzZXRUb3A7XG4vLyBcdFx0XHRcdFx0Y29udGV4dF9yZWN0LnN0cm9rZVN0eWxlID0gY29sb3IuZWwoKS52YWx1ZTsgLy9sb29rcyBsaWtlIGl0cyByZXNldCB3aGVuIHJlc2l6aW5nIGNhbnZhc1xuLy8gXHRcdFx0XHRcdGNvbnRleHRfcmVjdC5saW5lV2lkdGggPSBzaXplLmVsKCkudmFsdWUgLyBzY2FsZTsgLy8gc2NhbGUgbGluZVdpZHRoXG4vLyBcdFx0XHRcdFx0Y29udGV4dF9yZWN0LnN0cm9rZVJlY3QoMCwgMCwgY29udGV4dF9yZWN0LmNhbnZhcy53aWR0aCwgY29udGV4dF9yZWN0LmNhbnZhcy5oZWlnaHQpO1xuLy8gXHRcdFx0XHRcdGJyZWFrO1xuLy8gXHRcdFx0XHRjYXNlIFwiY3JvcFwiOlxuLy8gXHRcdFx0XHRcdGNyb3Bib3guZWwoKS5zdHlsZS53aWR0aCA9ICh4IC0gY3JvcGJveC5lbCgpLm9mZnNldExlZnQpICtcInB4XCI7IC8vIHJlc2l6ZVxuLy8gXHRcdFx0XHRcdGNyb3Bib3guZWwoKS5zdHlsZS5oZWlnaHQgPSAoeSAtIGNyb3Bib3guZWwoKS5vZmZzZXRUb3ApICtcInB4XCI7XG4vLyBcdFx0XHRcdFx0YnJlYWs7XG4vLyBcdFx0XHRcdGNhc2UgXCJ0ZXh0XCI6XG4vLyBcdFx0XHRcdFx0dGV4dGJveC5lbCgpLnN0eWxlLndpZHRoID0gKHggLSB0ZXh0Ym94LmVsKCkub2Zmc2V0TGVmdCkgK1wicHhcIjsgLy8gcmVzaXplXG4vLyBcdFx0XHRcdFx0dGV4dGJveC5lbCgpLnN0eWxlLmhlaWdodCA9ICh5IC0gdGV4dGJveC5lbCgpLm9mZnNldFRvcCkgK1wicHhcIjtcbi8vIFx0XHRcdFx0XHRicmVhaztcbi8vIFx0XHRcdFx0Y2FzZSBcImVyYXNlclwiOlxuLy8gXHRcdFx0XHRcdHZhciBzID0gc2l6ZS5lbCgpLnZhbHVlO1xuLy8gXHRcdFx0XHRcdGNvbnRleHRfZHJhdy5jbGVhclJlY3Qoc2NhbGUqeCAtIHMvMiwgc2NhbGUqeSAtIHMvMiwgcywgcyk7XG4vLyBcdFx0XHRcdFx0YnJlYWs7XG4vLyBcdFx0XHR9XG4vLyBcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG4vLyBcdFx0fVxuLy8gXHR9KTtcbi8vIFx0ZnVuY3Rpb24gZmluaXNoKCl7XG4vLyBcdFx0aWYocGFpbnQpe1xuLy8gXHRcdFx0cGFpbnQgPSBmYWxzZTtcbi8vIFx0XHRcdGlmKHRvb2wgPT0gXCJyZWN0XCIpe1xuLy8gXHRcdFx0XHQvL2JsaXQgY2FudmFzX3JlY3Qgb24gY2FudmFzLCBzY2FsZWRcbi8vIFx0XHRcdFx0Y29udGV4dF9kcmF3LmRyYXdJbWFnZShjYW52YXNfcmVjdC5lbCgpLFxuLy8gXHRcdFx0XHRcdFx0c2NhbGUqY2FudmFzX3JlY3QuZWwoKS5vZmZzZXRMZWZ0LCBzY2FsZSpjYW52YXNfcmVjdC5lbCgpLm9mZnNldFRvcCxcbi8vIFx0XHRcdFx0XHRcdHNjYWxlKmNvbnRleHRfcmVjdC5jYW52YXMud2lkdGgsIHNjYWxlKmNvbnRleHRfcmVjdC5jYW52YXMuaGVpZ2h0KTtcbi8vIFx0XHRcdFx0Y2FudmFzX3JlY3QuaGlkZSgpO1xuLy8gXHRcdFx0fWVsc2UgaWYodG9vbCA9PSBcInRleHRcIil7XG4vLyBcdFx0XHRcdHBsYXllci5lbCgpLmJsdXIoKTtcbi8vIFx0XHRcdFx0dGV4dGJveC5lbCgpLmZvY3VzKCk7XG4vLyBcdFx0XHR9XG4vLyBcdFx0fVxuLy8gXHR9XG4vLyBcdGNvbnRhaW5lci5vbignbW91c2V1cCcsIGZpbmlzaCk7XG4vLyBcdGNvbnRhaW5lci5vbignbW91c2VsZWF2ZScsIGZpbmlzaCk7XG4vLyB9O1xuXG4vKipcbiAqIOiusOW9lSDlvZXpn7Mg5oiq5bGPXG4gKiBAcGFyYW0ge1t0eXBlXX0gb3B0aW9ucyBbZGVzY3JpcHRpb25dXG4gKiByZXR1cm4ge1t0eXBlXX0gIFtkZXNjcmlwdGlvbl1cbiAqL1xudmFyIHNuYXBzaG90ID0ge1xuXHQvKipcblx0ICogUmV0dXJucyBhbiBvYmplY3QgdGhhdCBjYXB0dXJlcyB0aGUgcG9ydGlvbnMgb2YgcGxheWVyIHN0YXRlIHJlbGV2YW50IHRvXG5cdCAqIHZpZGVvIHBsYXliYWNrLiBUaGUgcmVzdWx0IG9mIHRoaXMgZnVuY3Rpb24gY2FuIGJlIHBhc3NlZCB0b1xuXHQgKiByZXN0b3JlUGxheWVyU25hcHNob3Qgd2l0aCBhIHBsYXllciB0byByZXR1cm4gdGhlIHBsYXllciB0byB0aGUgc3RhdGUgaXRcblx0ICogd2FzIGluIHdoZW4gdGhpcyBmdW5jdGlvbiB3YXMgaW52b2tlZC5cblx0ICogQHBhcmFtIHtvYmplY3R9IHBsYXllciBUaGUgdmlkZW9qcyBwbGF5ZXIgb2JqZWN0XG5cdCAqL1xuXHRnZXRQbGF5ZXJTbmFwc2hvdDogZnVuY3Rpb24ocGxheWVyKSB7XG5cblx0XHRsZXQgY3VycmVudFRpbWU7XG5cblx0XHRpZiAodmlkZW9qcy5icm93c2VyLklTX0lPUyAmJiBwbGF5ZXIuYWRzLmlzTGl2ZShwbGF5ZXIpKSB7XG5cdFx0XHQvLyBSZWNvcmQgaG93IGZhciBiZWhpbmQgbGl2ZSB3ZSBhcmVcblx0XHRcdGlmIChwbGF5ZXIuc2Vla2FibGUoKS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdGN1cnJlbnRUaW1lID0gcGxheWVyLmN1cnJlbnRUaW1lKCkgLSBwbGF5ZXIuc2Vla2FibGUoKS5lbmQoMCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHRlY2ggPSBwbGF5ZXIuJCgnLnZqcy10ZWNoJyk7XG5cdFx0Y29uc3QgdHJhY2tzID0gcGxheWVyLnJlbW90ZVRleHRUcmFja3MgPyBwbGF5ZXIucmVtb3RlVGV4dFRyYWNrcygpIDogW107XG5cdFx0Y29uc3Qgc3VwcHJlc3NlZFRyYWNrcyA9IFtdO1xuXHRcdGNvbnN0IHNuYXBzaG90ID0ge1xuXHRcdFx0ZW5kZWQ6IHBsYXllci5lbmRlZCgpLFxuXHRcdFx0Y3VycmVudFNyYzogcGxheWVyLmN1cnJlbnRTcmMoKSxcblx0XHRcdHNyYzogcGxheWVyLnNyYygpLFxuXHRcdFx0Y3VycmVudFRpbWUsXG5cdFx0XHR0eXBlOiBwbGF5ZXIuY3VycmVudFR5cGUoKVxuXHRcdH07XG5cblx0XHRpZiAodGVjaCkge1xuXHRcdFx0c25hcHNob3QubmF0aXZlUG9zdGVyID0gdGVjaC5wb3N0ZXI7XG5cdFx0XHRzbmFwc2hvdC5zdHlsZSA9IHRlY2guZ2V0QXR0cmlidXRlKCdzdHlsZScpO1xuXHRcdH1cblxuXHRcdGZvciAobGV0IGkgPSB0cmFja3MubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcblx0XHRcdGNvbnN0IHRyYWNrID0gdHJhY2tzW2ldO1xuXG5cdFx0XHRzdXBwcmVzc2VkVHJhY2tzLnB1c2goe1xuXHRcdFx0XHR0cmFjayxcblx0XHRcdFx0bW9kZTogdHJhY2subW9kZVxuXHRcdFx0fSk7XG5cdFx0XHR0cmFjay5tb2RlID0gJ2Rpc2FibGVkJztcblx0XHR9XG5cdFx0c25hcHNob3Quc3VwcHJlc3NlZFRyYWNrcyA9IHN1cHByZXNzZWRUcmFja3M7XG5cblx0XHRyZXR1cm4gc25hcHNob3Q7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEF0dGVtcHRzIHRvIG1vZGlmeSB0aGUgc3BlY2lmaWVkIHBsYXllciBzbyB0aGF0IGl0cyBzdGF0ZSBpcyBlcXVpdmFsZW50IHRvXG5cdCAqIHRoZSBzdGF0ZSBvZiB0aGUgc25hcHNob3QuXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBzbmFwc2hvdCAtIHRoZSBwbGF5ZXIgc3RhdGUgdG8gYXBwbHlcblx0ICovXG5cdHJlc3RvcmVQbGF5ZXJTbmFwc2hvdDogZnVuY3Rpb24ocGxheWVyLCBzbmFwc2hvdCkge1xuXG5cdFx0aWYgKHBsYXllci5hZHMuZGlzYWJsZU5leHRTbmFwc2hvdFJlc3RvcmUgPT09IHRydWUpIHtcblx0XHRcdHBsYXllci5hZHMuZGlzYWJsZU5leHRTbmFwc2hvdFJlc3RvcmUgPSBmYWxzZTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBUaGUgcGxheWJhY2sgdGVjaFxuXHRcdGxldCB0ZWNoID0gcGxheWVyLiQoJy52anMtdGVjaCcpO1xuXG5cdFx0Ly8gdGhlIG51bWJlciBvZlsgcmVtYWluaW5nIGF0dGVtcHRzIHRvIHJlc3RvcmUgdGhlIHNuYXBzaG90XG5cdFx0bGV0IGF0dGVtcHRzID0gMjA7XG5cblx0XHRjb25zdCBzdXBwcmVzc2VkVHJhY2tzID0gc25hcHNob3Quc3VwcHJlc3NlZFRyYWNrcztcblx0XHRsZXQgdHJhY2tTbmFwc2hvdDtcblx0XHRsZXQgcmVzdG9yZVRyYWNrcyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0Zm9yIChsZXQgaSA9IHN1cHByZXNzZWRUcmFja3MubGVuZ3RoOyBpID4gMDsgaS0tKSB7XG5cdFx0XHRcdHRyYWNrU25hcHNob3QgPSBzdXBwcmVzc2VkVHJhY2tzW2ldO1xuXHRcdFx0XHR0cmFja1NuYXBzaG90LnRyYWNrLm1vZGUgPSB0cmFja1NuYXBzaG90Lm1vZGU7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdC8vIGZpbmlzaCByZXN0b3JpbmcgdGhlIHBsYXliYWNrIHN0YXRlXG5cdFx0Y29uc3QgcmVzdW1lID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRsZXQgY3VycmVudFRpbWU7XG5cblx0XHRcdGlmICh2aWRlb2pzLmJyb3dzZXIuSVNfSU9TICYmIHBsYXllci5hZHMuaXNMaXZlKHBsYXllcikpIHtcblx0XHRcdFx0aWYgKHNuYXBzaG90LmN1cnJlbnRUaW1lIDwgMCkge1xuXHRcdFx0XHRcdC8vIFBsYXliYWNrIHdhcyBiZWhpbmQgcmVhbCB0aW1lLCBzbyBzZWVrIGJhY2t3YXJkcyB0byBtYXRjaFxuXHRcdFx0XHRcdGlmIChwbGF5ZXIuc2Vla2FibGUoKS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0XHRjdXJyZW50VGltZSA9IHBsYXllci5zZWVrYWJsZSgpLmVuZCgwKSArIHNuYXBzaG90LmN1cnJlbnRUaW1lO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRwbGF5ZXIuY3VycmVudFRpbWUoY3VycmVudFRpbWUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwbGF5ZXIuY3VycmVudFRpbWUoc25hcHNob3QuZW5kZWQgPyBwbGF5ZXIuZHVyYXRpb24oKSA6IHNuYXBzaG90LmN1cnJlbnRUaW1lKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gUmVzdW1lIHBsYXliYWNrIGlmIHRoaXMgd2Fzbid0IGEgcG9zdHJvbGxcblx0XHRcdGlmICghc25hcHNob3QuZW5kZWQpIHtcblx0XHRcdFx0cGxheWVyLnBsYXkoKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0Ly8gZGV0ZXJtaW5lIGlmIHRoZSB2aWRlbyBlbGVtZW50IGhhcyBsb2FkZWQgZW5vdWdoIG9mIHRoZSBzbmFwc2hvdCBzb3VyY2Vcblx0XHQvLyB0byBiZSByZWFkeSB0byBhcHBseSB0aGUgcmVzdCBvZiB0aGUgc3RhdGVcblx0XHRjb25zdCB0cnlUb1Jlc3VtZSA9IGZ1bmN0aW9uKCkge1xuXG5cdFx0XHQvLyB0cnlUb1Jlc3VtZSBjYW4gZWl0aGVyIGhhdmUgYmVlbiBjYWxsZWQgdGhyb3VnaCB0aGUgYGNvbnRlbnRjYW5wbGF5YFxuXHRcdFx0Ly8gZXZlbnQgb3IgZmlyZWQgdGhyb3VnaCBzZXRUaW1lb3V0LlxuXHRcdFx0Ly8gV2hlbiB0cnlUb1Jlc3VtZSBpcyBjYWxsZWQsIHdlIHNob3VsZCBtYWtlIHN1cmUgdG8gY2xlYXIgb3V0IHRoZSBvdGhlclxuXHRcdFx0Ly8gd2F5IGl0IGNvdWxkJ3ZlIGJlZW4gY2FsbGVkIGJ5IHJlbW92aW5nIHRoZSBsaXN0ZW5lciBhbmQgY2xlYXJpbmcgb3V0XG5cdFx0XHQvLyB0aGUgdGltZW91dC5cblx0XHRcdHBsYXllci5vZmYoJ2NvbnRlbnRjYW5wbGF5JywgdHJ5VG9SZXN1bWUpO1xuXHRcdFx0aWYgKHBsYXllci5hZHMudHJ5VG9SZXN1bWVUaW1lb3V0Xykge1xuXHRcdFx0XHRwbGF5ZXIuY2xlYXJUaW1lb3V0KHBsYXllci5hZHMudHJ5VG9SZXN1bWVUaW1lb3V0Xyk7XG5cdFx0XHRcdHBsYXllci5hZHMudHJ5VG9SZXN1bWVUaW1lb3V0XyA9IG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFRlY2ggbWF5IGhhdmUgY2hhbmdlZCBkZXBlbmRpbmcgb24gdGhlIGRpZmZlcmVuY2VzIGluIHNvdXJjZXMgb2YgdGhlXG5cdFx0XHQvLyBvcmlnaW5hbCB2aWRlbyBhbmQgdGhhdCBvZiB0aGUgYWRcblx0XHRcdHRlY2ggPSBwbGF5ZXIuZWwoKS5xdWVyeVNlbGVjdG9yKCcudmpzLXRlY2gnKTtcblxuXHRcdFx0aWYgKHRlY2gucmVhZHlTdGF0ZSA+IDEpIHtcblx0XHRcdFx0Ly8gc29tZSBicm93c2VycyBhbmQgbWVkaWEgYXJlbid0IFwic2Vla2FibGVcIi5cblx0XHRcdFx0Ly8gcmVhZHlTdGF0ZSBncmVhdGVyIHRoYW4gMSBhbGxvd3MgZm9yIHNlZWtpbmcgd2l0aG91dCBleGNlcHRpb25zXG5cdFx0XHRcdHJldHVybiByZXN1bWUoKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHRlY2guc2Vla2FibGUgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHQvLyBpZiB0aGUgdGVjaCBkb2Vzbid0IGV4cG9zZSB0aGUgc2Vla2FibGUgdGltZSByYW5nZXMsIHRyeSB0b1xuXHRcdFx0XHQvLyByZXN1bWUgcGxheWJhY2sgaW1tZWRpYXRlbHlcblx0XHRcdFx0cmV0dXJuIHJlc3VtZSgpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodGVjaC5zZWVrYWJsZS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdC8vIGlmIHNvbWUgcGVyaW9kIG9mIHRoZSB2aWRlbyBpcyBzZWVrYWJsZSwgcmVzdW1lIHBsYXliYWNrXG5cdFx0XHRcdHJldHVybiByZXN1bWUoKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gZGVsYXkgYSBiaXQgYW5kIHRoZW4gY2hlY2sgYWdhaW4gdW5sZXNzIHdlJ3JlIG91dCBvZiBhdHRlbXB0c1xuXHRcdFx0aWYgKGF0dGVtcHRzLS0pIHtcblx0XHRcdFx0d2luZG93LnNldFRpbWVvdXQodHJ5VG9SZXN1bWUsIDUwKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0cmVzdW1lKCk7XG5cdFx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0XHR2aWRlb2pzLmxvZy53YXJuKCdGYWlsZWQgdG8gcmVzdW1lIHRoZSBjb250ZW50IGFmdGVyIGFuIGFkdmVydGlzZW1lbnQnLCBlKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRpZiAoc25hcHNob3QubmF0aXZlUG9zdGVyKSB7XG5cdFx0XHR0ZWNoLnBvc3RlciA9IHNuYXBzaG90Lm5hdGl2ZVBvc3Rlcjtcblx0XHR9XG5cblx0XHRpZiAoJ3N0eWxlJyBpbiBzbmFwc2hvdCkge1xuXHRcdFx0Ly8gb3ZlcndyaXRlIGFsbCBjc3Mgc3R5bGUgcHJvcGVydGllcyB0byByZXN0b3JlIHN0YXRlIHByZWNpc2VseVxuXHRcdFx0dGVjaC5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgc25hcHNob3Quc3R5bGUgfHwgJycpO1xuXHRcdH1cblxuXHRcdC8vIERldGVybWluZSB3aGV0aGVyIHRoZSBwbGF5ZXIgbmVlZHMgdG8gYmUgcmVzdG9yZWQgdG8gaXRzIHN0YXRlXG5cdFx0Ly8gYmVmb3JlIGFkIHBsYXliYWNrIGJlZ2FuLiBXaXRoIGEgY3VzdG9tIGFkIGRpc3BsYXkgb3IgYnVybmVkLWluXG5cdFx0Ly8gYWRzLCB0aGUgY29udGVudCBwbGF5ZXIgc3RhdGUgaGFzbid0IGJlZW4gbW9kaWZpZWQgYW5kIHNvIG5vXG5cdFx0Ly8gcmVzdG9yYXRpb24gaXMgcmVxdWlyZWRcblxuXHRcdGlmIChwbGF5ZXIuYWRzLnZpZGVvRWxlbWVudFJlY3ljbGVkKCkpIHtcblx0XHRcdC8vIG9uIGlvczcsIGZpZGRsaW5nIHdpdGggdGV4dFRyYWNrcyB0b28gZWFybHkgd2lsbCBjYXVzZSBzYWZhcmkgdG8gY3Jhc2hcblx0XHRcdHBsYXllci5vbmUoJ2NvbnRlbnRsb2FkZWRtZXRhZGF0YScsIHJlc3RvcmVUcmFja3MpO1xuXG5cdFx0XHQvLyBpZiB0aGUgc3JjIGNoYW5nZWQgZm9yIGFkIHBsYXliYWNrLCByZXNldCBpdFxuXHRcdFx0cGxheWVyLnNyYyh7XG5cdFx0XHRcdHNyYzogc25hcHNob3QuY3VycmVudFNyYyxcblx0XHRcdFx0dHlwZTogc25hcHNob3QudHlwZVxuXHRcdFx0fSk7XG5cdFx0XHQvLyBzYWZhcmkgcmVxdWlyZXMgYSBjYWxsIHRvIGBsb2FkYCB0byBwaWNrIHVwIGEgY2hhbmdlZCBzb3VyY2Vcblx0XHRcdHBsYXllci5sb2FkKCk7XG5cdFx0XHQvLyBhbmQgdGhlbiByZXN1bWUgZnJvbSB0aGUgc25hcHNob3RzIHRpbWUgb25jZSB0aGUgb3JpZ2luYWwgc3JjIGhhcyBsb2FkZWRcblx0XHRcdC8vIGluIHNvbWUgYnJvd3NlcnMgKGZpcmVmb3gpIGBjYW5wbGF5YCBtYXkgbm90IGZpcmUgY29ycmVjdGx5LlxuXHRcdFx0Ly8gUmVhY2UgdGhlIGBjYW5wbGF5YCBldmVudCB3aXRoIGEgdGltZW91dC5cblx0XHRcdHBsYXllci5vbmUoJ2NvbnRlbnRjYW5wbGF5JywgdHJ5VG9SZXN1bWUpO1xuXHRcdFx0cGxheWVyLmFkcy50cnlUb1Jlc3VtZVRpbWVvdXRfID0gcGxheWVyLnNldFRpbWVvdXQodHJ5VG9SZXN1bWUsIDIwMDApO1xuXHRcdH0gZWxzZSBpZiAoIXBsYXllci5lbmRlZCgpIHx8ICFzbmFwc2hvdC5lbmRlZCkge1xuXHRcdFx0Ly8gaWYgd2UgZGlkbid0IGNoYW5nZSB0aGUgc3JjLCBqdXN0IHJlc3RvcmUgdGhlIHRyYWNrc1xuXHRcdFx0cmVzdG9yZVRyYWNrcygpO1xuXHRcdFx0Ly8gdGhlIHNyYyBkaWRuJ3QgY2hhbmdlIGFuZCB0aGlzIHdhc24ndCBhIHBvc3Ryb2xsXG5cdFx0XHQvLyBqdXN0IHJlc3VtZSBwbGF5YmFjayBhdCB0aGUgY3VycmVudCB0aW1lLlxuXHRcdFx0cGxheWVyLnBsYXkoKTtcblx0XHR9XG5cdH1cbn07XG5cbi8vIFJlZ2lzdGVyIHRoZSBwbHVnaW4gd2l0aCB2aWRlby5qcy5cbnZpZGVvanMucGx1Z2luKCdvcGVuJywgb3Blbik7XG52aWRlb2pzLnBsdWdpbigndmlkZW9Kc1Jlc29sdXRpb25Td2l0Y2hlcicsIHZpZGVvSnNSZXNvbHV0aW9uU3dpdGNoZXIpO1xudmlkZW9qcy5wbHVnaW4oJ2Rpc2FibGVQcm9ncmVzcycsIGRpc2FibGVQcm9ncmVzcyk7XG52aWRlb2pzLnBsdWdpbignbWFya2VycycsIG1hcmtlcnMpO1xudmlkZW9qcy5wbHVnaW4oJ3dhdGVyTWFyaycsIHdhdGVyTWFyayk7XG52aWRlb2pzLnBsdWdpbignc25hcHNob3QnLCBzbmFwc2hvdCk7XG5cbi8vIEluY2x1ZGUgdGhlIHZlcnNpb24gbnVtYmVyLlxub3Blbi5WRVJTSU9OID0gJ19fVkVSU0lPTl9fJztcblxuZXhwb3J0IGRlZmF1bHQgb3BlbjsiLCJpbXBvcnQgZG9jdW1lbnQgZnJvbSAnZ2xvYmFsL2RvY3VtZW50JztcblxuaW1wb3J0IFFVbml0IGZyb20gJ3F1bml0JztcbmltcG9ydCBzaW5vbiBmcm9tICdzaW5vbic7XG5pbXBvcnQgdmlkZW9qcyBmcm9tICd2aWRlby5qcyc7XG5cbmltcG9ydCBwbHVnaW4gZnJvbSAnLi4vc3JjL3BsdWdpbic7XG5cbmNvbnN0IFBsYXllciA9IHZpZGVvanMuZ2V0Q29tcG9uZW50KCdQbGF5ZXInKTtcblxuUVVuaXQudGVzdCgndGhlIGVudmlyb25tZW50IGlzIHNhbmUnLCBmdW5jdGlvbihhc3NlcnQpIHtcbiAgYXNzZXJ0LnN0cmljdEVxdWFsKHR5cGVvZiBBcnJheS5pc0FycmF5LCAnZnVuY3Rpb24nLCAnZXM1IGV4aXN0cycpO1xuICBhc3NlcnQuc3RyaWN0RXF1YWwodHlwZW9mIHNpbm9uLCAnb2JqZWN0JywgJ3Npbm9uIGV4aXN0cycpO1xuICBhc3NlcnQuc3RyaWN0RXF1YWwodHlwZW9mIHZpZGVvanMsICdmdW5jdGlvbicsICd2aWRlb2pzIGV4aXN0cycpO1xuICBhc3NlcnQuc3RyaWN0RXF1YWwodHlwZW9mIHBsdWdpbiwgJ2Z1bmN0aW9uJywgJ3BsdWdpbiBpcyBhIGZ1bmN0aW9uJyk7XG59KTtcblxuUVVuaXQubW9kdWxlKCd2aWRlb2pzLW9wZW4nLCB7XG5cbiAgYmVmb3JlRWFjaCgpIHtcblxuICAgIC8vIE1vY2sgdGhlIGVudmlyb25tZW50J3MgdGltZXJzIGJlY2F1c2UgY2VydGFpbiB0aGluZ3MgLSBwYXJ0aWN1bGFybHlcbiAgICAvLyBwbGF5ZXIgcmVhZGluZXNzIC0gYXJlIGFzeW5jaHJvbm91cyBpbiB2aWRlby5qcyA1LiBUaGlzIE1VU1QgY29tZVxuICAgIC8vIGJlZm9yZSBhbnkgcGxheWVyIGlzIGNyZWF0ZWQ7IG90aGVyd2lzZSwgdGltZXJzIGNvdWxkIGdldCBjcmVhdGVkXG4gICAgLy8gd2l0aCB0aGUgYWN0dWFsIHRpbWVyIG1ldGhvZHMhXG4gICAgdGhpcy5jbG9jayA9IHNpbm9uLnVzZUZha2VUaW1lcnMoKTtcblxuICAgIHRoaXMuZml4dHVyZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdxdW5pdC1maXh0dXJlJyk7XG4gICAgdGhpcy52aWRlbyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3ZpZGVvJyk7XG4gICAgdGhpcy5maXh0dXJlLmFwcGVuZENoaWxkKHRoaXMudmlkZW8pO1xuICAgIHRoaXMucGxheWVyID0gdmlkZW9qcyh0aGlzLnZpZGVvKTtcbiAgfSxcblxuICBhZnRlckVhY2goKSB7XG4gICAgdGhpcy5wbGF5ZXIuZGlzcG9zZSgpO1xuICAgIHRoaXMuY2xvY2sucmVzdG9yZSgpO1xuICB9XG59KTtcblxuUVVuaXQudGVzdCgncmVnaXN0ZXJzIGl0c2VsZiB3aXRoIHZpZGVvLmpzJywgZnVuY3Rpb24oYXNzZXJ0KSB7XG4gIGFzc2VydC5leHBlY3QoMik7XG5cbiAgYXNzZXJ0LnN0cmljdEVxdWFsKFxuICAgIFBsYXllci5wcm90b3R5cGUub3BlbixcbiAgICBwbHVnaW4sXG4gICAgJ3ZpZGVvanMtb3BlbiBwbHVnaW4gd2FzIHJlZ2lzdGVyZWQnXG4gICk7XG5cbiAgdGhpcy5wbGF5ZXIub3BlbigpO1xuXG4gIC8vIFRpY2sgdGhlIGNsb2NrIGZvcndhcmQgZW5vdWdoIHRvIHRyaWdnZXIgdGhlIHBsYXllciB0byBiZSBcInJlYWR5XCIuXG4gIHRoaXMuY2xvY2sudGljaygxKTtcblxuICBhc3NlcnQub2soXG4gICAgdGhpcy5wbGF5ZXIuaGFzQ2xhc3MoJ3Zqcy1vcGVuJyksXG4gICAgJ3RoZSBwbHVnaW4gYWRkcyBhIGNsYXNzIHRvIHRoZSBwbGF5ZXInXG4gICk7XG59KTtcbiJdfQ==

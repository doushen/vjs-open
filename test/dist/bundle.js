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

		// if (overlayIndex == -1) {
		// 	// fx = currentMarkerIndex;
		// 	if(fx != currentMarkerIndex && lt == 0){
		// 		lt = currentTime + setting.breakOverlay.displayTime;
		// 		fx = currentMarkerIndex;
		// 	}
		// 	// else if(lt==0){
		// 	// 	fx = -1;
		// 	// }
		// 	//fx = currentMarkerIndex == markersList.length-1 ? -1 : currentMarkerIndex;
		// }
		// if(currentTime >= markerTime && currentTime <= markerTime + setting.breakOverlay.displayTime){
		// 	lt = markerTime + setting.breakOverlay.displayTime;
		// }
		// else{
		// 	lt = currentTime + setting.breakOverlay.displayTime;
		// }
		lt = markerTime + setting.breakOverlay.displayTime;
		//console.log("111lt:%s|cur:%s",lt, currentTime);
		// if(ct>0 && ct<1 && setting.breakOverlay.displayTime>0 && setting.breakOverlay.displayTime<1){
		// 	lt = currentTime + setting.breakOverlay.displayTime;
		// 	console.log("111lt:%s|cur:%s",lt, currentTime);
		// }else{
		// 	lt = markerTime + setting.breakOverlay.displayTime;
		// 	console.log("222lt:%s|cur:%s",lt, currentTime);
		// }

		// if(ct<0.5)
		// 	lt = markerTime + 0.5;
		// else
		// 	lt = currentTime + setting.breakOverlay.displayTime;

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
			// if(currentMarkerIndex == markersList.length-1)
			// 	fx = -2;
			// else
			// 	lt = 0;
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

var recordPoint = function recordPoint(options) {
	var settings = _videoJs2['default'].mergeOptions(defaults, options),
	    player = this,
	    timeTemp;
	this.on("timeupdate", playerTimeUpdate);
	this.on("ended", playerEnded);

	function playerTimeUpdate() {
		var cur = parseInt(player.currentTime());
		var isPaused = player.paused();
		if (cur != timeTemp) {
			timeTemp = cur;
			//console.log(cur%settings.secPerTime);
			if (cur == 0) {
				player.trigger('timeUpdate', { type: 'start', current: player.currentTime(), total: player.duration() });
			}
			if (settings.secPerTime > 0) {
				if (cur % settings.secPerTime == 0) {
					player.trigger('timeUpdate', { type: 'tick', current: player.currentTime(), total: player.duration() });
				}
			}
			if (settings.finishPct >= 0 && settings.finishPct <= 100) {
				var percent = player.currentTime() / player.duration();
				if (percent >= settings.finishPct / 100) {
					if (!settings.isFinish || settings.isFinish == undefined) {
						settings.isFinish = true;
						player.trigger('timeUpdate', { type: 'finish', current: player.currentTime(), total: player.duration() });
					}
				} else {
					settings.isFinish = false;
				}
			}
		}
	};

	function playerEnded() {
		player.trigger('timeUpdate', { type: 'ended', current: player.currentTime(), total: player.duration() });
	}
};

// Register the plugin with video.js.
_videoJs2['default'].plugin('open', open);
_videoJs2['default'].plugin('videoJsResolutionSwitcher', videoJsResolutionSwitcher);
_videoJs2['default'].plugin('disableProgress', disableProgress);
_videoJs2['default'].plugin('markers', markers);
_videoJs2['default'].plugin('waterMark', waterMark);
_videoJs2['default'].plugin('snapshot', snapshot);
_videoJs2['default'].plugin('recordPoint', recordPoint);

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2dsb2JhbC9kb2N1bWVudC5qcyIsIi9Vc2Vycy9vcGVuL0RvY3VtZW50cy9Xb3JrL1NvdXJjZVRyZWUvdmpzLW9wZW4vc3JjL3BsdWdpbi5qcyIsIi9Vc2Vycy9vcGVuL0RvY3VtZW50cy9Xb3JrL1NvdXJjZVRyZWUvdmpzLW9wZW4vdGVzdC9wbHVnaW4udGVzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOzs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozt1QkNmb0IsVUFBVTs7Ozs7QUFJOUIsSUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDOzs7Ozs7Ozs7Ozs7O0FBYXBCLElBQU0sYUFBYSxHQUFHLFNBQWhCLGFBQWEsQ0FBSSxNQUFNLEVBQUUsT0FBTyxFQUFLO0FBQzFDLE9BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7Q0FHNUIsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7QUFjRixJQUFNLElBQUksR0FBRyxTQUFQLElBQUksQ0FBWSxPQUFPLEVBQUU7OztBQUM5QixLQUFJLENBQUMsS0FBSyxDQUFDLFlBQU07QUFDaEIsZUFBYSxRQUFPLHFCQUFRLFlBQVksQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztFQUM3RCxDQUFDLENBQUM7Q0FDSCxDQUFDOzs7Ozs7O0FBT0YsSUFBTSx5QkFBeUIsR0FBRyxtQ0FBUyxPQUFPLEVBQUU7Ozs7Ozs7QUFPbkQsS0FBSSxRQUFRLEdBQUcscUJBQVEsWUFBWSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUM7S0FDckQsTUFBTSxHQUFHLElBQUk7S0FDYixVQUFVLEdBQUcsRUFBRTtLQUNmLGNBQWMsR0FBRyxFQUFFO0tBQ25CLHNCQUFzQixHQUFHLEVBQUUsQ0FBQzs7Ozs7OztBQU83QixPQUFNLENBQUMsU0FBUyxHQUFHLFVBQVMsR0FBRyxFQUFFOztBQUVoQyxNQUFJLENBQUMsR0FBRyxFQUFFO0FBQ1QsVUFBTyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7R0FDcEI7OztBQUdELEtBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVMsTUFBTSxFQUFFO0FBQ2pDLE9BQUk7QUFDSCxXQUFRLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBRTtJQUNoRCxDQUFDLE9BQU8sQ0FBQyxFQUFFOztBQUVYLFdBQU8sSUFBSSxDQUFDO0lBQ1o7R0FDRCxDQUFDLENBQUM7O0FBRUgsTUFBSSxDQUFDLGNBQWMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDbkQsTUFBSSxDQUFDLFVBQVUsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDOztBQUVyRCxNQUFJLE1BQU0sR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDN0QsTUFBSSxDQUFDLHNCQUFzQixHQUFHO0FBQzdCLFFBQUssRUFBRSxNQUFNLENBQUMsS0FBSztBQUNuQixVQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU87R0FDdkIsQ0FBQzs7QUFFRixRQUFNLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ2hDLFFBQU0sQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN6RCxRQUFNLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDbkMsU0FBTyxNQUFNLENBQUM7RUFDZCxDQUFDOzs7Ozs7OztBQVFGLE9BQU0sQ0FBQyxpQkFBaUIsR0FBRyxVQUFTLEtBQUssRUFBRSxrQkFBa0IsRUFBRTtBQUM5RCxNQUFJLEtBQUssSUFBSSxJQUFJLEVBQUU7QUFDbEIsVUFBTyxJQUFJLENBQUMsc0JBQXNCLENBQUM7R0FDbkM7OztBQUdELE1BQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRTtBQUNoRixVQUFPO0dBQ1A7QUFDRCxNQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQzs7QUFFM0MsTUFBSSxXQUFXLEdBQUcsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQ3ZDLE1BQUksUUFBUSxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQzs7O0FBRy9CLE1BQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFO0FBQ3JELE9BQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDO0dBQ2xDOzs7Ozs7QUFNRCxNQUFJLGVBQWUsR0FBRyxZQUFZLENBQUM7QUFDbkMsTUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsS0FBSyxTQUFTLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEtBQUssT0FBTyxFQUFFO0FBQ3BILGtCQUFlLEdBQUcsWUFBWSxDQUFDO0dBQy9CO0FBQ0QsUUFBTSxDQUNKLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsa0JBQWtCLElBQUksUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQ3RGLEdBQUcsQ0FBQyxlQUFlLEVBQUUsWUFBVztBQUNoQyxTQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ2hDLFNBQU0sQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0FBQzNCLE9BQUksQ0FBQyxRQUFRLEVBQUU7O0FBRWQsVUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDbEM7QUFDRCxTQUFNLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7R0FDbkMsQ0FBQyxDQUFDO0FBQ0osU0FBTyxNQUFNLENBQUM7RUFDZCxDQUFDOzs7Ozs7QUFNRixPQUFNLENBQUMsYUFBYSxHQUFHLFlBQVc7QUFDakMsU0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO0VBQ3ZCLENBQUM7QUFDRixPQUFNLENBQUMsbUJBQW1CLEdBQUcsVUFBUyxPQUFPLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFO0FBQ3pFLE1BQUksQ0FBQyxzQkFBc0IsR0FBRztBQUM3QixRQUFLLEVBQUUsS0FBSztBQUNaLFVBQU8sRUFBRSxPQUFPO0dBQ2hCLENBQUM7O0FBRUYsTUFBSSxPQUFPLGtCQUFrQixLQUFLLFVBQVUsRUFBRTtBQUM3QyxVQUFPLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7R0FDbEQ7QUFDRCxRQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBUyxHQUFHLEVBQUU7QUFDcEMsVUFBTztBQUNOLE9BQUcsRUFBRSxHQUFHLENBQUMsR0FBRztBQUNaLFFBQUksRUFBRSxHQUFHLENBQUMsSUFBSTtBQUNkLE9BQUcsRUFBRSxHQUFHLENBQUMsR0FBRztJQUNaLENBQUM7R0FDRixDQUFDLENBQUMsQ0FBQzs7QUFFSixHQUFDLENBQUMsOEJBQThCLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDOUMsU0FBTyxNQUFNLENBQUM7RUFDZCxDQUFDOzs7Ozs7OztBQVFGLFVBQVMsa0JBQWtCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUNqQyxNQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUU7QUFDckIsVUFBTyxDQUFDLENBQUM7R0FDVDtBQUNELFNBQU8sQUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxBQUFDLENBQUM7RUFDM0I7Ozs7Ozs7QUFPRCxVQUFTLGFBQWEsQ0FBQyxHQUFHLEVBQUU7QUFDM0IsTUFBSSxXQUFXLEdBQUc7QUFDakIsUUFBSyxFQUFFLEVBQUU7QUFDVCxNQUFHLEVBQUUsRUFBRTtBQUNQLE9BQUksRUFBRSxFQUFFO0dBQ1IsQ0FBQztBQUNGLEtBQUcsQ0FBQyxHQUFHLENBQUMsVUFBUyxNQUFNLEVBQUU7QUFDeEIsb0JBQWlCLENBQUMsV0FBVyxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztBQUNoRCxvQkFBaUIsQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQzlDLG9CQUFpQixDQUFDLFdBQVcsRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7O0FBRS9DLG9CQUFpQixDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDaEQsb0JBQWlCLENBQUMsV0FBVyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztBQUM5QyxvQkFBaUIsQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0dBQy9DLENBQUMsQ0FBQztBQUNILFNBQU8sV0FBVyxDQUFDO0VBQ25COztBQUVELFVBQVMsaUJBQWlCLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUU7QUFDcEQsTUFBSSxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxFQUFFO0FBQzFDLGNBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7R0FDbkM7RUFDRDs7QUFFRCxVQUFTLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFO0FBQ3BELGFBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7RUFDM0M7Ozs7Ozs7O0FBUUQsVUFBUyxTQUFTLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtBQUNuQyxNQUFJLFdBQVcsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDdEMsTUFBSSxhQUFhLEdBQUcsRUFBRSxDQUFDO0FBQ3ZCLE1BQUksV0FBVyxLQUFLLE1BQU0sRUFBRTtBQUMzQixjQUFXLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUN6QixnQkFBYSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7R0FDN0IsTUFBTSxJQUFJLFdBQVcsS0FBSyxLQUFLLElBQUksV0FBVyxJQUFJLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQUU7O0FBRXhGLGNBQVcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDdEMsZ0JBQWEsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7R0FDMUMsTUFBTSxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQUU7QUFDdkMsZ0JBQWEsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztHQUNyRDtBQUNELFNBQU87QUFDTixNQUFHLEVBQUUsV0FBVztBQUNoQixRQUFLLEVBQUUsYUFBYTtBQUNwQixVQUFPLEVBQUUsVUFBVSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUM7R0FDcEMsQ0FBQztFQUNGOztBQUVELFVBQVMsbUJBQW1CLENBQUMsTUFBTSxFQUFFOztBQUVwQyxNQUFJLElBQUksR0FBRztBQUNWLFVBQU8sRUFBRTtBQUNSLE9BQUcsRUFBRSxJQUFJO0FBQ1QsU0FBSyxFQUFFLE1BQU07QUFDYixNQUFFLEVBQUUsU0FBUztJQUNiO0FBQ0QsU0FBTSxFQUFFO0FBQ1AsT0FBRyxFQUFFLElBQUk7QUFDVCxTQUFLLEVBQUUsTUFBTTtBQUNiLE1BQUUsRUFBRSxRQUFRO0lBQ1o7QUFDRCxRQUFLLEVBQUU7QUFDTixPQUFHLEVBQUUsR0FBRztBQUNSLFNBQUssRUFBRSxLQUFLO0FBQ1osTUFBRSxFQUFFLE9BQU87SUFDWDtBQUNELFFBQUssRUFBRTtBQUNOLE9BQUcsRUFBRSxHQUFHO0FBQ1IsU0FBSyxFQUFFLEtBQUs7QUFDWixNQUFFLEVBQUUsT0FBTztJQUNYO0FBQ0QsU0FBTSxFQUFFO0FBQ1AsT0FBRyxFQUFFLEdBQUc7QUFDUixTQUFLLEVBQUUsS0FBSztBQUNaLE1BQUUsRUFBRSxRQUFRO0lBQ1o7QUFDRCxRQUFLLEVBQUU7QUFDTixPQUFHLEVBQUUsR0FBRztBQUNSLFNBQUssRUFBRSxLQUFLO0FBQ1osTUFBRSxFQUFFLE9BQU87SUFDWDtBQUNELE9BQUksRUFBRTtBQUNMLE9BQUcsRUFBRSxHQUFHO0FBQ1IsU0FBSyxFQUFFLEtBQUs7QUFDWixNQUFFLEVBQUUsTUFBTTtJQUNWO0FBQ0QsT0FBSSxFQUFFO0FBQ0wsT0FBRyxFQUFFLENBQUM7QUFDTixTQUFLLEVBQUUsTUFBTTtBQUNiLE1BQUUsRUFBRSxNQUFNO0lBQ1Y7R0FDRCxDQUFDOztBQUVGLE1BQUksbUJBQW1CLEdBQUcsU0FBdEIsbUJBQW1CLENBQVksT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUU7O0FBRTdELFNBQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUMxRCxTQUFNLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ2hDLFVBQU8sTUFBTSxDQUFDO0dBQ2QsQ0FBQztBQUNGLFVBQVEsQ0FBQyxrQkFBa0IsR0FBRyxtQkFBbUIsQ0FBQzs7O0FBR2xELFFBQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDOzs7QUFHakQsUUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMseUJBQXlCLEVBQUUsVUFBUyxLQUFLLEVBQUU7QUFDakYsUUFBSyxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7QUFDckIsUUFBSSxHQUFHLENBQUMsRUFBRSxLQUFLLEtBQUssQ0FBQyxJQUFJLEVBQUU7QUFDMUIsV0FBTSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztBQUN6RCxZQUFPO0tBQ1A7SUFDRDtHQUNELENBQUMsQ0FBQzs7O0FBR0gsUUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsWUFBVztBQUM3QixPQUFJLFNBQVMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO0FBQ2xFLE9BQUksUUFBUSxHQUFHLEVBQUUsQ0FBQzs7QUFFbEIsWUFBUyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBRTtBQUN6QixZQUFRLENBQUMsSUFBSSxDQUFDO0FBQ2IsUUFBRyxFQUFFLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHO0FBQ3JCLFNBQUksRUFBRSxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSTtBQUN2QixVQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDcEIsUUFBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQ2hCLFFBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtLQUNmLENBQUMsQ0FBQztJQUNILENBQUMsQ0FBQzs7QUFFSCxTQUFNLENBQUMsVUFBVSxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM1QyxPQUFJLE1BQU0sR0FBRztBQUNaLFNBQUssRUFBRSxNQUFNO0FBQ2IsT0FBRyxFQUFFLENBQUM7QUFDTixXQUFPLEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSTtJQUNyQyxDQUFDOztBQUVGLE9BQUksQ0FBQyxzQkFBc0IsR0FBRztBQUM3QixTQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUs7QUFDbkIsV0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPO0lBQ3ZCLENBQUM7O0FBRUYsU0FBTSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUNoQyxTQUFNLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLG1CQUFtQixDQUFDLENBQUM7R0FDOUUsQ0FBQyxDQUFDO0VBQ0g7O0FBRUQsT0FBTSxDQUFDLEtBQUssQ0FBQyxZQUFXO0FBQ3ZCLE1BQUksUUFBUSxDQUFDLEVBQUUsRUFBRTtBQUNoQixPQUFJLFVBQVUsR0FBRyxJQUFJLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztBQUM1RCxTQUFNLENBQUMsVUFBVSxDQUFDLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDOUksU0FBTSxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEdBQUcsWUFBVztBQUN6RCxRQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQyxDQUFDO0dBQ0Y7QUFDRCxNQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7OztBQUd2QyxTQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7R0FDMUM7O0FBRUQsTUFBSSxNQUFNLENBQUMsU0FBUyxLQUFLLFNBQVMsRUFBRTs7QUFFbkMsc0JBQW1CLENBQUMsTUFBTSxDQUFDLENBQUM7R0FDNUI7RUFDRCxDQUFDLENBQUM7O0FBRUgsS0FBSSx5QkFBeUI7S0FDNUIsUUFBUSxHQUFHO0FBQ1YsSUFBRSxFQUFFLElBQUk7RUFDUixDQUFDOzs7OztBQUtILEtBQUksUUFBUSxHQUFHLHFCQUFRLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNoRCxLQUFJLGtCQUFrQixHQUFHLHFCQUFRLE1BQU0sQ0FBQyxRQUFRLEVBQUU7QUFDakQsYUFBVyxFQUFFLHFCQUFTLE1BQU0sRUFBRSxPQUFPLEVBQUU7QUFDdEMsVUFBTyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7O0FBRTFCLFdBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztBQUNyQyxPQUFJLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7O0FBRXZCLFNBQU0sQ0FBQyxFQUFFLENBQUMsa0JBQWtCLEVBQUUscUJBQVEsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztHQUMvRDtFQUNELENBQUMsQ0FBQztBQUNILG1CQUFrQixDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsVUFBUyxLQUFLLEVBQUU7QUFDMUQsVUFBUSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztBQUNqRCxNQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7RUFDcEQsQ0FBQztBQUNGLG1CQUFrQixDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsWUFBVztBQUNoRCxNQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFLENBQUM7QUFDakQsTUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssS0FBSyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7RUFDdkQsQ0FBQztBQUNGLFNBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBb0IsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDOzs7OztBQUtyRSxLQUFJLFVBQVUsR0FBRyxxQkFBUSxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDcEQsS0FBSSxvQkFBb0IsR0FBRyxxQkFBUSxNQUFNLENBQUMsVUFBVSxFQUFFO0FBQ3JELGFBQVcsRUFBRSxxQkFBUyxNQUFNLEVBQUUsT0FBTyxFQUFFO0FBQ3RDLE9BQUksQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM1QyxVQUFPLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQzs7QUFFMUIsYUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ3ZDLE9BQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQ2hELE9BQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7O0FBRTVCLE9BQUksT0FBTyxDQUFDLFlBQVksRUFBRTtBQUN6Qix5QkFBUSxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSw2QkFBNkIsQ0FBQyxDQUFDO0FBQzVELFFBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xDLE1BQU07QUFDTixRQUFJLFdBQVcsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2pELHlCQUFRLFFBQVEsQ0FBQyxXQUFXLEVBQUUsZUFBZSxDQUFDLENBQUM7QUFDL0MsUUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNuQztBQUNELFNBQU0sQ0FBQyxFQUFFLENBQUMsZUFBZSxFQUFFLHFCQUFRLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7R0FDNUQ7RUFDRCxDQUFDLENBQUM7QUFDSCxxQkFBb0IsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFHLFlBQVc7QUFDdkQsTUFBSSxTQUFTLEdBQUcsRUFBRSxDQUFDO0FBQ25CLE1BQUksTUFBTSxHQUFHLEFBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSyxFQUFFLENBQUM7OztBQUd4RCxPQUFLLElBQUksR0FBRyxJQUFJLE1BQU0sRUFBRTtBQUN2QixPQUFJLE1BQU0sQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUU7QUFDL0IsYUFBUyxDQUFDLElBQUksQ0FBQyxJQUFJLGtCQUFrQixDQUNwQyxJQUFJLENBQUMsT0FBTyxFQUFFO0FBQ2IsVUFBSyxFQUFFLEdBQUc7QUFDVixRQUFHLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQztBQUNoQixhQUFRLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQSxBQUFDO0tBQy9FLENBQUMsQ0FBQyxDQUFDO0lBQ0w7R0FDRDtBQUNELFNBQU8sU0FBUyxDQUFDO0VBQ2pCLENBQUM7QUFDRixxQkFBb0IsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLFlBQVc7QUFDbEQsTUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDO0FBQzVDLE1BQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFLENBQUM7QUFDekQsTUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO0FBQ2hGLFNBQU8sVUFBVSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQzlDLENBQUM7QUFDRixxQkFBb0IsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFHLFlBQVc7QUFDekQsU0FBTyxVQUFVLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsd0JBQXdCLENBQUM7RUFDaEYsQ0FBQztBQUNGLFdBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxzQkFBc0IsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0NBQzNFLENBQUM7Ozs7Ozs7QUFPRixJQUFNLGVBQWUsR0FBRyxTQUFsQixlQUFlLENBQVksT0FBTyxFQUFFO0FBQ3pDOzs7O0FBSUMsT0FBTSxHQUFHLFNBQVQsTUFBTSxDQUFZLEdBQUcseUJBQTBCO0FBQzlDLE1BQUksR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDZCxPQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDdEMsTUFBRyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuQixRQUFLLENBQUMsSUFBSSxHQUFHLEVBQUU7QUFDZCxRQUFJLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDMUIsUUFBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNoQjtJQUNEO0dBQ0Q7QUFDRCxTQUFPLEdBQUcsQ0FBQztFQUNYOzs7O0FBR0QsU0FBUSxHQUFHO0FBQ1YsYUFBVyxFQUFFLEtBQUs7RUFDbEIsQ0FBQzs7QUFHSDs7QUFFQyxPQUFNLEdBQUcsSUFBSTtLQUNiLEtBQUssR0FBRyxLQUFLOzs7O0FBR2IsU0FBUSxHQUFHLE1BQU0sQ0FBQyxFQUFFLEVBQUUsUUFBUSxFQUFFLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQzs7O0FBR2hELE9BQU0sQ0FBQyxlQUFlLEdBQUc7QUFDeEIsU0FBTyxFQUFFLG1CQUFXO0FBQ25CLFFBQUssR0FBRyxJQUFJLENBQUM7QUFDYixTQUFNLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3ZELFNBQU0sQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDM0QsU0FBTSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUM1RCxTQUFNLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0dBQ3ZEO0FBQ0QsUUFBTSxFQUFFLGtCQUFXO0FBQ2xCLFFBQUssR0FBRyxLQUFLLENBQUM7QUFDZCxTQUFNLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDN0csU0FBTSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3JILFNBQU0sQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUN0SCxTQUFNLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7R0FDN0c7QUFDRCxVQUFRLEVBQUUsb0JBQVc7QUFDcEIsVUFBTyxLQUFLLENBQUM7R0FDYjtFQUNELENBQUM7O0FBRUYsS0FBSSxRQUFRLENBQUMsV0FBVyxFQUFFO0FBQ3pCLFFBQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7RUFDakM7Q0FDRCxDQUFDOzs7Ozs7O0FBT0YsSUFBTSxPQUFPLEdBQUcsU0FBVixPQUFPLENBQVksT0FBTyxFQUFFOztBQUVqQyxLQUFJLGNBQWMsR0FBRztBQUNwQixhQUFXLEVBQUU7QUFDWixVQUFPLEVBQUUsS0FBSztBQUNkLGtCQUFlLEVBQUUsS0FBSztBQUN0QixxQkFBa0IsRUFBRSxrQkFBa0I7R0FDdEM7QUFDRCxXQUFTLEVBQUU7QUFDVixVQUFPLEVBQUUsSUFBSTtBQUNiLE9BQUksRUFBRSxjQUFTLE1BQU0sRUFBRTtBQUN0QixXQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDbkI7QUFDRCxPQUFJLEVBQUUsY0FBUyxNQUFNLEVBQUU7QUFDdEIsV0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDO0lBQ25CO0dBQ0Q7QUFDRCxjQUFZLEVBQUU7QUFDYixVQUFPLEVBQUUsSUFBSTtBQUNiLGNBQVcsRUFBRSxDQUFDO0FBQ2QsT0FBSSxFQUFFLGNBQVMsTUFBTSxFQUFFO0FBQ3RCLFdBQU8sTUFBTSxDQUFDLFdBQVcsQ0FBQztJQUMxQjtBQUNELFFBQUssRUFBRTtBQUNOLFdBQU8sRUFBRSxNQUFNO0FBQ2YsWUFBUSxFQUFFLG1CQUFtQjtBQUM3QixzQkFBa0IsRUFBRSxpQkFBaUI7QUFDckMsV0FBTyxFQUFFLE9BQU87QUFDaEIsZUFBVyxFQUFFLE1BQU07SUFDbkI7R0FDRDtBQUNELGVBQWEsRUFBRSx1QkFBUyxNQUFNLEVBQUU7QUFDL0IsVUFBTyxLQUFLLENBQUE7R0FDWjtBQUNELGlCQUFlLEVBQUUseUJBQVMsTUFBTSxFQUFFLEVBQUU7QUFDcEMsU0FBTyxFQUFFLEVBQUU7RUFDWCxDQUFDOzs7QUFHRixVQUFTLFlBQVksR0FBRztBQUN2QixNQUFJLENBQUMsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQzdCLE1BQUksSUFBSSxHQUFHLHNDQUFzQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsVUFBUyxDQUFDLEVBQUU7QUFDOUUsT0FBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQSxHQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDMUMsSUFBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0FBQ3ZCLFVBQU8sQ0FBQyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsR0FBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztHQUNyRCxDQUFDLENBQUM7QUFDSCxTQUFPLElBQUksQ0FBQztFQUNaLENBQUM7Ozs7QUFJRixLQUFJLE9BQU8sR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsY0FBYyxFQUFFLE9BQU8sQ0FBQztLQUN4RCxVQUFVLEdBQUcsRUFBRTtLQUNmLFdBQVcsR0FBRyxFQUFFOztBQUNoQixhQUFZLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztLQUMzQixrQkFBa0IsR0FBRyxDQUFDLENBQUM7S0FDdkIsTUFBTSxHQUFHLElBQUk7S0FDYixTQUFTLEdBQUcsSUFBSTtLQUNoQixZQUFZLEdBQUcsSUFBSTtLQUNuQixZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUM7O0FBRW5CLFVBQVMsZUFBZSxHQUFHOztBQUUxQixhQUFXLENBQUMsSUFBSSxDQUFDLFVBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUMvQixVQUFPLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0dBQzdELENBQUMsQ0FBQztFQUNIOztBQUVELFVBQVMsVUFBVSxDQUFDLFVBQVUsRUFBRTs7QUFFL0IsR0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsVUFBUyxLQUFLLEVBQUUsTUFBTSxFQUFFO0FBQzFDLFNBQU0sQ0FBQyxHQUFHLEdBQUcsWUFBWSxFQUFFLENBQUM7O0FBRTVCLGVBQVksQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxNQUFNLENBQ2hELGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDOzs7QUFHMUIsYUFBVSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUM7QUFDaEMsY0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztHQUN6QixDQUFDLENBQUM7O0FBRUgsaUJBQWUsRUFBRSxDQUFDO0VBQ2xCOztBQUVELFVBQVMsV0FBVyxDQUFDLE1BQU0sRUFBRTtBQUM1QixTQUFPLEFBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxHQUFJLEdBQUcsQ0FBQTtFQUNqRTs7QUFFRCxVQUFTLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFO0FBQzFDLE1BQUksU0FBUyxHQUFHLENBQUMsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQ3BELE1BQUksSUFBSSxHQUFHLFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7QUFDOUYsV0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQ2hDLEdBQUcsQ0FBQztBQUNKLGdCQUFhLEVBQUUsSUFBSSxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUk7QUFDbkUsU0FBTSxFQUFFLFdBQVcsQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHO0dBQ2pDLENBQUMsQ0FDRCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUNuQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzs7O0FBRzNELE1BQUksTUFBTSxTQUFNLEVBQUU7QUFDakIsWUFBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLFNBQU0sQ0FBQyxDQUFDO0dBQ2pDOzs7QUFHRCxXQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxVQUFTLENBQUMsRUFBRTs7QUFFakMsT0FBSSxjQUFjLEdBQUcsS0FBSyxDQUFDO0FBQzNCLE9BQUksT0FBTyxPQUFPLENBQUMsYUFBYSxLQUFLLFVBQVUsRUFBRTs7QUFFaEQsa0JBQWMsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQztJQUN4RDs7QUFFRCxPQUFJLENBQUMsY0FBYyxFQUFFO0FBQ3BCLFFBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDckMsVUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVEO0dBQ0QsQ0FBQyxDQUFDOztBQUVILE1BQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUU7QUFDOUIsMkJBQXdCLENBQUMsU0FBUyxDQUFDLENBQUM7R0FDcEM7O0FBRUQsU0FBTyxTQUFTLENBQUM7RUFDakI7O0FBRUQsVUFBUyxhQUFhLEdBQUc7OztBQUd4QixPQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUM1QyxPQUFJLE1BQU0sR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUIsT0FBSSxTQUFTLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQywrQkFBK0IsR0FBRyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQ3ZGLE9BQUksVUFBVSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDOztBQUVoRCxPQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksVUFBVSxFQUFFO0FBQ2hELGFBQVMsQ0FBQyxHQUFHLENBQUM7QUFDWixXQUFNLEVBQUUsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUc7S0FDakMsQ0FBQyxDQUNELElBQUksQ0FBQyxrQkFBa0IsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUN2QztHQUNEO0FBQ0QsaUJBQWUsRUFBRSxDQUFDO0VBQ2xCOztBQUVELFVBQVMsYUFBYSxDQUFDLFVBQVUsRUFBRTs7QUFFbEMsTUFBSSxZQUFZLEVBQUU7QUFDakIsZUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ2xCLGVBQVksQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0dBQ3pDO0FBQ0Qsb0JBQWtCLEdBQUcsQ0FBQyxDQUFDLENBQUM7O0FBRXhCLE9BQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQzNDLE9BQUksS0FBSyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxQixPQUFJLE1BQU0sR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDaEMsT0FBSSxNQUFNLEVBQUU7O0FBRVgsV0FBTyxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzlCLGVBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUM7OztBQUcxQixnQkFBWSxDQUFDLElBQUksQ0FBQywrQkFBK0IsR0FBRyxNQUFNLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2hGO0dBQ0Q7OztBQUdELE9BQUssSUFBSSxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUNqRCxPQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUU7QUFDNUIsZUFBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDekI7R0FDRDs7O0FBR0QsaUJBQWUsRUFBRSxDQUFDO0VBQ2xCOzs7QUFJRCxVQUFTLHdCQUF3QixDQUFDLFNBQVMsRUFBRTs7QUFFNUMsV0FBUyxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsWUFBVztBQUNwQyxPQUFJLE1BQU0sR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDOztBQUVwRCxZQUFTLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7OztBQUd0RSxZQUFTLENBQUMsR0FBRyxDQUFDO0FBQ2IsVUFBTSxFQUFFLFdBQVcsQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHO0FBQ2pDLGlCQUFhLEVBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSTtBQUNqRSxnQkFBWSxFQUFFLFNBQVM7SUFDdkIsQ0FBQyxDQUFDO0dBRUgsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsWUFBVztBQUM1QixZQUFTLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQztHQUN0QyxDQUFDLENBQUM7RUFDSDs7QUFFRCxVQUFTLG1CQUFtQixHQUFHO0FBQzlCLFdBQVMsR0FBRyxDQUFDLENBQUMsK0ZBQStGLENBQUMsQ0FBQztBQUMvRyxjQUFZLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0VBQzdEO0FBQ0QsS0FBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ1gsS0FBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7O0FBRVosVUFBUyxrQkFBa0IsR0FBRztBQUM3QixNQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLElBQUksa0JBQWtCLEdBQUcsQ0FBQyxFQUFFO0FBQzVELFVBQU87R0FDUDs7QUFFRCxNQUFJLFdBQVcsR0FBRyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDdkMsTUFBSSxNQUFNLEdBQUcsV0FBVyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDN0MsTUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDaEQsTUFBSSxFQUFFLEdBQUcsV0FBVyxHQUFHLFVBQVUsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQW1CbEMsSUFBRSxHQUFHLFVBQVUsR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7O0FBZW5ELE1BQUksV0FBVyxJQUFJLFVBQVUsSUFDNUIsV0FBVyxJQUFJLEVBQUUsRUFBRTtBQUNuQixPQUFJLFlBQVksSUFBSSxrQkFBa0IsRUFBRTtBQUN2QyxnQkFBWSxHQUFHLGtCQUFrQixDQUFDO0FBQ2xDLGdCQUFZLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDckY7O0FBRUQsZUFBWSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUM7R0FFMUMsTUFBTTtBQUNOLGVBQVksR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNsQixlQUFZLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQztBQUN6QyxLQUFFLEdBQUcsQ0FBQyxDQUFDOzs7OztHQUtQO0VBQ0Q7OztBQUdELFVBQVMsaUJBQWlCLEdBQUc7QUFDNUIsY0FBWSxHQUFHLENBQUMsQ0FBQyxpRkFBaUYsQ0FBQyxDQUNqRyxHQUFHLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNsQyxjQUFZLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ2xDLGNBQVksR0FBRyxDQUFDLENBQUMsQ0FBQztFQUNsQjs7QUFFRCxVQUFTLFlBQVksR0FBRztBQUN2QixnQkFBYyxFQUFFLENBQUM7QUFDakIsb0JBQWtCLEVBQUUsQ0FBQztFQUNyQjs7QUFFRCxVQUFTLGNBQWMsR0FBRzs7Ozs7OztBQU96QixNQUFJLGlCQUFpQixHQUFHLFNBQXBCLGlCQUFpQixDQUFZLEtBQUssRUFBRTtBQUN2QyxPQUFJLEtBQUssR0FBRyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtBQUNuQyxXQUFPLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0RDs7QUFFRCxVQUFPLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztHQUN6QixDQUFBO0FBQ0QsTUFBSSxXQUFXLEdBQUcsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQ3ZDLE1BQUksY0FBYyxDQUFDOztBQUVuQixNQUFJLGtCQUFrQixJQUFJLENBQUMsQ0FBQyxFQUFFOztBQUU3QixPQUFJLGNBQWMsR0FBRyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQzNELE9BQUksV0FBVyxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLElBQ3pFLFdBQVcsR0FBRyxjQUFjLEVBQUU7QUFDOUIsV0FBTztJQUNQOzs7QUFHRCxPQUFJLGtCQUFrQixLQUFLLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUNoRCxXQUFXLEtBQUssTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFO0FBQ25DLFdBQU87SUFDUDtHQUNEOzs7QUFHRCxNQUFJLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUN6QixXQUFXLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDdEQsaUJBQWMsR0FBRyxDQUFDLENBQUMsQ0FBQztHQUNwQixNQUFNOztBQUVOLFFBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQzVDLGtCQUFjLEdBQUcsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRXRDLFFBQUksV0FBVyxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUN4RCxXQUFXLEdBQUcsY0FBYyxFQUFFO0FBQzlCLG1CQUFjLEdBQUcsQ0FBQyxDQUFDO0FBQ25CLFdBQU07S0FDTjtJQUNEO0dBQ0Q7OztBQUdELE1BQUksY0FBYyxJQUFJLGtCQUFrQixFQUFFOztBQUV6QyxPQUFJLGNBQWMsSUFBSSxDQUFDLENBQUMsSUFBSSxPQUFPLENBQUMsZUFBZSxFQUFFO0FBQ3BELFdBQU8sQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7SUFDckQ7QUFDRCxxQkFBa0IsR0FBRyxjQUFjLENBQUM7R0FDcEM7RUFFRDs7O0FBR0QsVUFBUyxVQUFVLEdBQUc7QUFDckIsTUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRTtBQUM5QixzQkFBbUIsRUFBRSxDQUFDO0dBQ3RCOzs7QUFHRCxRQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQzNCLFlBQVUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7O0FBRTVCLE1BQUksT0FBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUU7QUFDakMsb0JBQWlCLEVBQUUsQ0FBQztHQUNwQjtBQUNELGNBQVksRUFBRSxDQUFDO0FBQ2YsUUFBTSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUM7RUFDdEM7OztBQUdELE9BQU0sQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsWUFBVztBQUN0QyxZQUFVLEVBQUUsQ0FBQztFQUNiLENBQUMsQ0FBQzs7O0FBR0gsT0FBTSxDQUFDLE9BQU8sR0FBRztBQUNoQixZQUFVLEVBQUUsc0JBQVc7QUFDdEIsVUFBTyxXQUFXLENBQUM7R0FDbkI7QUFDRCxNQUFJLEVBQUUsZ0JBQVc7O0FBRWhCLE9BQUksV0FBVyxHQUFHLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUN2QyxRQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUM1QyxRQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RCxRQUFJLFVBQVUsR0FBRyxXQUFXLEVBQUU7QUFDN0IsV0FBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUMvQixXQUFNO0tBQ047SUFDRDtHQUNEO0FBQ0QsTUFBSSxFQUFFLGdCQUFXOztBQUVoQixPQUFJLFdBQVcsR0FBRyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDdkMsUUFBSyxJQUFJLENBQUMsR0FBRyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ2pELFFBQUksVUFBVSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUV4RCxRQUFJLFVBQVUsR0FBRyxHQUFHLEdBQUcsV0FBVyxFQUFFO0FBQ25DLFdBQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDL0IsV0FBTTtLQUNOO0lBQ0Q7R0FDRDtBQUNELEtBQUcsRUFBRSxhQUFTLFVBQVUsRUFBRTs7QUFFekIsYUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0dBQ3ZCO0FBQ0QsUUFBTSxFQUFFLGdCQUFTLFVBQVUsRUFBRTs7QUFFNUIsZ0JBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQztHQUMxQjtBQUNELFdBQVMsRUFBRSxxQkFBVztBQUNyQixPQUFJLFVBQVUsR0FBRyxFQUFFLENBQUM7QUFDcEIsUUFBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDNUMsY0FBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQjtBQUNELGdCQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7R0FDMUI7QUFDRCxZQUFVLEVBQUUsc0JBQVc7O0FBRXRCLGdCQUFhLEVBQUUsQ0FBQztHQUNoQjtBQUNELE9BQUssRUFBRSxlQUFTLFVBQVUsRUFBRTs7QUFFM0IsU0FBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUMzQixhQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7R0FDdkI7QUFDRCxTQUFPLEVBQUUsbUJBQVc7O0FBRW5CLFNBQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDM0IsZUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQ3RCLFlBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUNuQixTQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO0FBQzdDLFVBQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQztHQUN0QjtFQUNELENBQUM7Q0FDRixDQUFDOzs7Ozs7O0FBT0YsSUFBTSxTQUFTLEdBQUcsU0FBWixTQUFTLENBQVksUUFBUSxFQUFFO0FBQ3BDLEtBQUksUUFBUSxHQUFHO0FBQ2IsTUFBSSxFQUFFLFVBQVU7QUFDaEIsTUFBSSxFQUFFLENBQUM7QUFDUCxNQUFJLEVBQUUsQ0FBQztBQUNQLFNBQU8sRUFBRSxDQUFDO0FBQ1YsU0FBTyxFQUFFLEdBQUc7QUFDWixXQUFTLEVBQUUsS0FBSztBQUNoQixLQUFHLEVBQUUsRUFBRTtBQUNQLFdBQVMsRUFBRSxlQUFlO0FBQzFCLE1BQUksRUFBRSxLQUFLO0FBQ1gsT0FBSyxFQUFFLEtBQUs7RUFDWjtLQUNELE1BQU0sR0FBRyxTQUFULE1BQU0sR0FBYztBQUNuQixNQUFJLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUM7QUFDdEMsTUFBSSxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUM3QyxRQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQztBQUM1QixPQUFLLENBQUMsSUFBSSxJQUFJLEVBQUU7QUFDZixTQUFNLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pCLFFBQUssUUFBUSxJQUFJLE1BQU0sRUFBRTtBQUN4QixRQUFJLE1BQU0sQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUU7QUFDcEMsU0FBSSxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxRQUFRLEVBQUU7QUFDekMsWUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7TUFDOUQsTUFBTTtBQUNOLFlBQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7TUFDcEM7S0FDRDtJQUNEO0dBQ0Q7QUFDRCxTQUFPLE1BQU0sQ0FBQztFQUNkLENBQUM7OztBQUdILEtBQUksR0FBRyxDQUFDOzs7O0FBSVIsS0FBSSxRQUFRLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQzs7QUFFNUQsS0FBSSxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDO0FBQ3RDLFFBQU8sR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDOzs7QUFHckMsT0FBTSxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztBQUNuQixNQUFLLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzs7QUFHbkQsS0FBSSxDQUFDLEdBQUcsRUFBRTtBQUNULEtBQUcsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3BDLEtBQUcsQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztFQUNsQyxNQUFNOztBQUVOLEtBQUcsQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO0VBQ25COzs7QUFHRCxLQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQ2YsR0FBRyxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDOzs7QUFHaEMsS0FBSSxPQUFPLENBQUMsSUFBSSxFQUFFO0FBQ2pCLEtBQUcsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3BDLEtBQUcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDckIsS0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsY0FBYyxDQUFDO0FBQ25DLEtBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLFVBQVUsQ0FBQztBQUNoQyxLQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7QUFDckIsS0FBRyxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDO0VBQ3ZCOzs7QUFHRCxLQUFJLEFBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLElBQU0sT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLEFBQUM7QUFDaEQ7QUFDQyxNQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUM7QUFDdEIsTUFBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO0dBQ3ZCLE1BQU0sSUFBSSxBQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFNLE9BQU8sQ0FBQyxJQUFJLEtBQUssR0FBRyxBQUFDO0FBQ3pEO0FBQ0MsTUFBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDO0FBQ3RCLE1BQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztHQUN4QixNQUFNLElBQUksQUFBQyxPQUFPLENBQUMsSUFBSSxLQUFLLEdBQUcsSUFBTSxPQUFPLENBQUMsSUFBSSxLQUFLLEdBQUcsQUFBQztBQUMzRDtBQUNDLE1BQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztBQUN6QixNQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7R0FDeEIsTUFBTSxJQUFJLEFBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxHQUFHLElBQU0sT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLEFBQUM7QUFDekQ7QUFDQyxNQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7QUFDekIsTUFBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO0dBQ3ZCLE1BQU0sSUFBSSxBQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssRUFBRSxJQUFNLE9BQU8sQ0FBQyxJQUFJLEtBQUssRUFBRSxBQUFDO0FBQ3pEO0FBQ0MsT0FBSSxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEdBQUcsTUFBTSxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzFGLE9BQUksT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixHQUFHLEtBQUssQ0FBQyxVQUFVLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNqRyxPQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsR0FBRyxHQUFHLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDbkYsTUFBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsQUFBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFJLElBQUksQ0FBQztBQUMzQyxNQUFHLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxBQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEdBQUksSUFBSSxDQUFDO0dBQzNDO0FBQ0QsSUFBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQzs7Ozs7Ozs7OztBQVVwQyxLQUFJLE9BQU8sQ0FBQyxTQUFTLElBQUksT0FBTyxDQUFDLEdBQUcsS0FBSyxFQUFFLEVBQUU7QUFDNUMsTUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDbkMsTUFBSSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDO0FBQ3hCLE1BQUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDO0FBQ3ZCLE1BQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7O0FBRXRCLFFBQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDekIsTUFBTTs7QUFFTixRQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQ3hCOztBQUVELEtBQUksT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUM7Q0FDMUQsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUEyYkYsSUFBSSxRQUFRLEdBQUc7Ozs7Ozs7O0FBUWQsa0JBQWlCLEVBQUUsMkJBQVMsTUFBTSxFQUFFOztBQUVuQyxNQUFJLFdBQVcsWUFBQSxDQUFDOztBQUVoQixNQUFJLHFCQUFRLE9BQU8sQ0FBQyxNQUFNLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUU7O0FBRXhELE9BQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7QUFDakMsZUFBVyxHQUFHLE1BQU0sQ0FBQyxXQUFXLEVBQUUsR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzlELE1BQU07QUFDTixlQUFXLEdBQUcsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ25DO0dBQ0QsTUFBTTtBQUNOLGNBQVcsR0FBRyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUM7R0FDbkM7O0FBRUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNuQyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxDQUFDO0FBQ3hFLE1BQU0sZ0JBQWdCLEdBQUcsRUFBRSxDQUFDO0FBQzVCLE1BQU0sUUFBUSxHQUFHO0FBQ2hCLFFBQUssRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFO0FBQ3JCLGFBQVUsRUFBRSxNQUFNLENBQUMsVUFBVSxFQUFFO0FBQy9CLE1BQUcsRUFBRSxNQUFNLENBQUMsR0FBRyxFQUFFO0FBQ2pCLGNBQVcsRUFBWCxXQUFXO0FBQ1gsT0FBSSxFQUFFLE1BQU0sQ0FBQyxXQUFXLEVBQUU7R0FDMUIsQ0FBQzs7QUFFRixNQUFJLElBQUksRUFBRTtBQUNULFdBQVEsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztBQUNwQyxXQUFRLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7R0FDNUM7O0FBRUQsT0FBSyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQzVDLE9BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFeEIsbUJBQWdCLENBQUMsSUFBSSxDQUFDO0FBQ3JCLFNBQUssRUFBTCxLQUFLO0FBQ0wsUUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO0lBQ2hCLENBQUMsQ0FBQztBQUNILFFBQUssQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDO0dBQ3hCO0FBQ0QsVUFBUSxDQUFDLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDOztBQUU3QyxTQUFPLFFBQVEsQ0FBQztFQUNoQjs7Ozs7OztBQU9ELHNCQUFxQixFQUFFLCtCQUFTLE1BQU0sRUFBRSxRQUFRLEVBQUU7O0FBRWpELE1BQUksTUFBTSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsS0FBSyxJQUFJLEVBQUU7QUFDbkQsU0FBTSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsR0FBRyxLQUFLLENBQUM7QUFDOUMsVUFBTztHQUNQOzs7QUFHRCxNQUFJLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDOzs7QUFHakMsTUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDOztBQUVsQixNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQztBQUNuRCxNQUFJLGFBQWEsWUFBQSxDQUFDO0FBQ2xCLE1BQUksYUFBYSxHQUFHLFNBQWhCLGFBQWEsR0FBYztBQUM5QixRQUFLLElBQUksQ0FBQyxHQUFHLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ2pELGlCQUFhLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEMsaUJBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUM7SUFDOUM7R0FDRCxDQUFDOzs7QUFHRixNQUFNLE1BQU0sR0FBRyxTQUFULE1BQU0sR0FBYztBQUN6QixPQUFJLFdBQVcsWUFBQSxDQUFDOztBQUVoQixPQUFJLHFCQUFRLE9BQU8sQ0FBQyxNQUFNLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUU7QUFDeEQsUUFBSSxRQUFRLENBQUMsV0FBVyxHQUFHLENBQUMsRUFBRTs7QUFFN0IsU0FBSSxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtBQUNqQyxpQkFBVyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQztNQUM5RCxNQUFNO0FBQ04saUJBQVcsR0FBRyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUM7TUFDbkM7QUFDRCxXQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0tBQ2hDO0lBQ0QsTUFBTTtBQUNOLFVBQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzlFOzs7QUFHRCxPQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRTtBQUNwQixVQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDZDtHQUNELENBQUM7Ozs7QUFJRixNQUFNLFdBQVcsR0FBRyxTQUFkLFdBQVcsR0FBYzs7Ozs7OztBQU85QixTQUFNLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLFdBQVcsQ0FBQyxDQUFDO0FBQzFDLE9BQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRTtBQUNuQyxVQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUNwRCxVQUFNLENBQUMsR0FBRyxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQztJQUN0Qzs7OztBQUlELE9BQUksR0FBRyxNQUFNLENBQUMsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxDQUFDOztBQUU5QyxPQUFJLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFFOzs7QUFHeEIsV0FBTyxNQUFNLEVBQUUsQ0FBQztJQUNoQjs7QUFFRCxPQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssU0FBUyxFQUFFOzs7QUFHaEMsV0FBTyxNQUFNLEVBQUUsQ0FBQztJQUNoQjs7QUFFRCxPQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTs7QUFFN0IsV0FBTyxNQUFNLEVBQUUsQ0FBQztJQUNoQjs7O0FBR0QsT0FBSSxRQUFRLEVBQUUsRUFBRTtBQUNmLFVBQU0sQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ25DLE1BQU07QUFDTixRQUFJO0FBQ0gsV0FBTSxFQUFFLENBQUM7S0FDVCxDQUFDLE9BQU8sQ0FBQyxFQUFFO0FBQ1gsMEJBQVEsR0FBRyxDQUFDLElBQUksQ0FBQyxxREFBcUQsRUFBRSxDQUFDLENBQUMsQ0FBQztLQUMzRTtJQUNEO0dBQ0QsQ0FBQzs7QUFFRixNQUFJLFFBQVEsQ0FBQyxZQUFZLEVBQUU7QUFDMUIsT0FBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsWUFBWSxDQUFDO0dBQ3BDOztBQUVELE1BQUksT0FBTyxJQUFJLFFBQVEsRUFBRTs7QUFFeEIsT0FBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUMsQ0FBQztHQUNqRDs7Ozs7OztBQU9ELE1BQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxFQUFFOztBQUV0QyxTQUFNLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLGFBQWEsQ0FBQyxDQUFDOzs7QUFHbkQsU0FBTSxDQUFDLEdBQUcsQ0FBQztBQUNWLE9BQUcsRUFBRSxRQUFRLENBQUMsVUFBVTtBQUN4QixRQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7SUFDbkIsQ0FBQyxDQUFDOztBQUVILFNBQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQzs7OztBQUlkLFNBQU0sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsV0FBVyxDQUFDLENBQUM7QUFDMUMsU0FBTSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztHQUN0RSxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFOztBQUU5QyxnQkFBYSxFQUFFLENBQUM7OztBQUdoQixTQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7R0FDZDtFQUNEO0NBQ0QsQ0FBQzs7QUFFRixJQUFNLFdBQVcsR0FBRyxTQUFkLFdBQVcsQ0FBWSxPQUFPLEVBQUU7QUFDckMsS0FBSSxRQUFRLEdBQUcscUJBQVEsWUFBWSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUM7S0FBQyxNQUFNLEdBQUcsSUFBSTtLQUFDLFFBQVEsQ0FBQztBQUM5RSxLQUFJLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3hDLEtBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFDLFdBQVcsQ0FBQyxDQUFDOztBQUc3QixVQUFTLGdCQUFnQixHQUFHO0FBQzNCLE1BQUksR0FBRyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztBQUN6QyxNQUFJLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7QUFDL0IsTUFBRyxHQUFHLElBQUksUUFBUSxFQUFDO0FBQ2xCLFdBQVEsR0FBRyxHQUFHLENBQUM7O0FBRWYsT0FBRyxHQUFHLElBQUUsQ0FBQyxFQUFDO0FBQ1QsVUFBTSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUMsRUFBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsV0FBVyxFQUFFLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBQyxDQUFDLENBQUM7SUFDdEc7QUFDRCxPQUFHLFFBQVEsQ0FBQyxVQUFVLEdBQUMsQ0FBQyxFQUFDO0FBQ3hCLFFBQUcsR0FBRyxHQUFHLFFBQVEsQ0FBQyxVQUFVLElBQUUsQ0FBQyxFQUFDO0FBQy9CLFdBQU0sQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFDLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLFdBQVcsRUFBRSxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUMsQ0FBQyxDQUFDO0tBQ3JHO0lBQ0Q7QUFDRCxPQUFHLFFBQVEsQ0FBQyxTQUFTLElBQUUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxTQUFTLElBQUUsR0FBRyxFQUFDO0FBQ25ELFFBQUksT0FBTyxHQUFHLE1BQU0sQ0FBQyxXQUFXLEVBQUUsR0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDckQsUUFBRyxPQUFPLElBQUUsUUFBUSxDQUFDLFNBQVMsR0FBQyxHQUFHLEVBQUM7QUFDbEMsU0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLElBQUksUUFBUSxDQUFDLFFBQVEsSUFBSSxTQUFTLEVBQUM7QUFDdkQsY0FBUSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7QUFDekIsWUFBTSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUMsRUFBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsV0FBVyxFQUFFLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBQyxDQUFDLENBQUM7TUFDdkc7S0FDRCxNQUFJO0FBQ0osYUFBUSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7S0FDMUI7SUFDRDtHQUNEO0VBQ0QsQ0FBQzs7QUFFRixVQUFTLFdBQVcsR0FBRztBQUN0QixRQUFNLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBQyxFQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFDLENBQUMsQ0FBQztFQUN0RztDQUNELENBQUM7OztBQUdGLHFCQUFRLE1BQU0sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDN0IscUJBQVEsTUFBTSxDQUFDLDJCQUEyQixFQUFFLHlCQUF5QixDQUFDLENBQUM7QUFDdkUscUJBQVEsTUFBTSxDQUFDLGlCQUFpQixFQUFFLGVBQWUsQ0FBQyxDQUFDO0FBQ25ELHFCQUFRLE1BQU0sQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDbkMscUJBQVEsTUFBTSxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztBQUN2QyxxQkFBUSxNQUFNLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQ3JDLHFCQUFRLE1BQU0sQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUM7OztBQUczQyxJQUFJLENBQUMsT0FBTyxHQUFHLGFBQWEsQ0FBQzs7cUJBRWQsSUFBSTs7Ozs7Ozs7Ozs7OEJDOXNERSxpQkFBaUI7Ozs7cUJBRXBCLE9BQU87Ozs7cUJBQ1AsT0FBTzs7Ozt1QkFDTCxVQUFVOzs7O3lCQUVYLGVBQWU7Ozs7QUFFbEMsSUFBTSxNQUFNLEdBQUcscUJBQVEsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDOztBQUU5QyxtQkFBTSxJQUFJLENBQUMseUJBQXlCLEVBQUUsVUFBUyxNQUFNLEVBQUU7QUFDckQsUUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEtBQUssQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDO0FBQ25FLFFBQU0sQ0FBQyxXQUFXLENBQUMseUJBQVksRUFBRSxRQUFRLEVBQUUsY0FBYyxDQUFDLENBQUM7QUFDM0QsUUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBYyxFQUFFLFVBQVUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ2pFLFFBQU0sQ0FBQyxXQUFXLENBQUMsNkJBQWEsRUFBRSxVQUFVLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztDQUN2RSxDQUFDLENBQUM7O0FBRUgsbUJBQU0sTUFBTSxDQUFDLGNBQWMsRUFBRTs7QUFFM0IsWUFBVSxFQUFBLHNCQUFHOzs7Ozs7QUFNWCxRQUFJLENBQUMsS0FBSyxHQUFHLG1CQUFNLGFBQWEsRUFBRSxDQUFDOztBQUVuQyxRQUFJLENBQUMsT0FBTyxHQUFHLDRCQUFTLGNBQWMsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUN4RCxRQUFJLENBQUMsS0FBSyxHQUFHLDRCQUFTLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM3QyxRQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDckMsUUFBSSxDQUFDLE1BQU0sR0FBRywwQkFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7R0FDbkM7O0FBRUQsV0FBUyxFQUFBLHFCQUFHO0FBQ1YsUUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUN0QixRQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0dBQ3RCO0NBQ0YsQ0FBQyxDQUFDOztBQUVILG1CQUFNLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUM1RCxRQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVqQixRQUFNLENBQUMsV0FBVyxDQUNoQixNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksMEJBRXJCLG9DQUFvQyxDQUNyQyxDQUFDOztBQUVGLE1BQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7OztBQUduQixNQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFbkIsUUFBTSxDQUFDLEVBQUUsQ0FDUCxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFDaEMsdUNBQXVDLENBQ3hDLENBQUM7Q0FDSCxDQUFDLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiIiwidmFyIHRvcExldmVsID0gdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOlxuICAgIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDoge31cbnZhciBtaW5Eb2MgPSByZXF1aXJlKCdtaW4tZG9jdW1lbnQnKTtcblxuaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGRvY3VtZW50O1xufSBlbHNlIHtcbiAgICB2YXIgZG9jY3kgPSB0b3BMZXZlbFsnX19HTE9CQUxfRE9DVU1FTlRfQ0FDSEVANCddO1xuXG4gICAgaWYgKCFkb2NjeSkge1xuICAgICAgICBkb2NjeSA9IHRvcExldmVsWydfX0dMT0JBTF9ET0NVTUVOVF9DQUNIRUA0J10gPSBtaW5Eb2M7XG4gICAgfVxuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBkb2NjeTtcbn1cbiIsImltcG9ydCB2aWRlb2pzIGZyb20gJ3ZpZGVvLmpzJztcblxuXG4vLyBEZWZhdWx0IG9wdGlvbnMgZm9yIHRoZSBwbHVnaW4uXG5jb25zdCBkZWZhdWx0cyA9IHt9O1xuXG4vKipcbiAqIEZ1bmN0aW9uIHRvIGludm9rZSB3aGVuIHRoZSBwbGF5ZXIgaXMgcmVhZHkuXG4gKlxuICogVGhpcyBpcyBhIGdyZWF0IHBsYWNlIGZvciB5b3VyIHBsdWdpbiB0byBpbml0aWFsaXplIGl0c2VsZi4gV2hlbiB0aGlzXG4gKiBmdW5jdGlvbiBpcyBjYWxsZWQsIHRoZSBwbGF5ZXIgd2lsbCBoYXZlIGl0cyBET00gYW5kIGNoaWxkIGNvbXBvbmVudHNcbiAqIGluIHBsYWNlLlxuICpcbiAqIEBmdW5jdGlvbiBvblBsYXllclJlYWR5XG4gKiBAcGFyYW0gICAge1BsYXllcn0gcGxheWVyXG4gKiBAcGFyYW0gICAge09iamVjdH0gW29wdGlvbnM9e31dXG4gKi9cbmNvbnN0IG9uUGxheWVyUmVhZHkgPSAocGxheWVyLCBvcHRpb25zKSA9PiB7XG5cdHBsYXllci5hZGRDbGFzcygndmpzLW9wZW4nKTtcblx0XG5cbn07XG5cbi8qKlxuICogQSB2aWRlby5qcyBwbHVnaW4uXG4gKlxuICogSW4gdGhlIHBsdWdpbiBmdW5jdGlvbiwgdGhlIHZhbHVlIG9mIGB0aGlzYCBpcyBhIHZpZGVvLmpzIGBQbGF5ZXJgXG4gKiBpbnN0YW5jZS4gWW91IGNhbm5vdCByZWx5IG9uIHRoZSBwbGF5ZXIgYmVpbmcgaW4gYSBcInJlYWR5XCIgc3RhdGUgaGVyZSxcbiAqIGRlcGVuZGluZyBvbiBob3cgdGhlIHBsdWdpbiBpcyBpbnZva2VkLiBUaGlzIG1heSBvciBtYXkgbm90IGJlIGltcG9ydGFudFxuICogdG8geW91OyBpZiBub3QsIHJlbW92ZSB0aGUgd2FpdCBmb3IgXCJyZWFkeVwiIVxuICpcbiAqIEBmdW5jdGlvbiBvcGVuXG4gKiBAcGFyYW0gICAge09iamVjdH0gW29wdGlvbnM9e31dXG4gKiAgICAgICAgICAgQW4gb2JqZWN0IG9mIG9wdGlvbnMgbGVmdCB0byB0aGUgcGx1Z2luIGF1dGhvciB0byBkZWZpbmUuXG4gKi9cbmNvbnN0IG9wZW4gPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdHRoaXMucmVhZHkoKCkgPT4ge1xuXHRcdG9uUGxheWVyUmVhZHkodGhpcywgdmlkZW9qcy5tZXJnZU9wdGlvbnMoZGVmYXVsdHMsIG9wdGlvbnMpKTtcblx0fSk7XG59O1xuXG4vKipcbiAqIOWIhui+qOeOh1xuICogQHBhcmFtIHtbdHlwZV19IG9wdGlvbnMgW2Rlc2NyaXB0aW9uXVxuICogcmV0dXJuIHtbdHlwZV19ICBbZGVzY3JpcHRpb25dXG4gKi9cbmNvbnN0IHZpZGVvSnNSZXNvbHV0aW9uU3dpdGNoZXIgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cblx0LyoqXG5cdCAqIEluaXRpYWxpemUgdGhlIHBsdWdpbi5cblx0ICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXSBjb25maWd1cmF0aW9uIGZvciB0aGUgcGx1Z2luXG5cdCAqL1xuXG5cdHZhciBzZXR0aW5ncyA9IHZpZGVvanMubWVyZ2VPcHRpb25zKGRlZmF1bHRzLCBvcHRpb25zKSxcblx0XHRwbGF5ZXIgPSB0aGlzLFxuXHRcdGdyb3VwZWRTcmMgPSB7fSxcblx0XHRjdXJyZW50U291cmNlcyA9IHt9LFxuXHRcdGN1cnJlbnRSZXNvbHV0aW9uU3RhdGUgPSB7fTtcblxuXHQvKipcblx0ICogVXBkYXRlcyBwbGF5ZXIgc291cmNlcyBvciByZXR1cm5zIGN1cnJlbnQgc291cmNlIFVSTFxuXHQgKiBAcGFyYW0gICB7QXJyYXl9ICBbc3JjXSBhcnJheSBvZiBzb3VyY2VzIFt7c3JjOiAnJywgdHlwZTogJycsIGxhYmVsOiAnJywgcmVzOiAnJ31dXG5cdCAqIEByZXR1cm5zIHtPYmplY3R8U3RyaW5nfEFycmF5fSB2aWRlb2pzIHBsYXllciBvYmplY3QgaWYgdXNlZCBhcyBzZXR0ZXIgb3IgY3VycmVudCBzb3VyY2UgVVJMLCBvYmplY3QsIG9yIGFycmF5IG9mIHNvdXJjZXNcblx0ICovXG5cdHBsYXllci51cGRhdGVTcmMgPSBmdW5jdGlvbihzcmMpIHtcblx0XHQvL1JldHVybiBjdXJyZW50IHNyYyBpZiBzcmMgaXMgbm90IGdpdmVuXG5cdFx0aWYgKCFzcmMpIHtcblx0XHRcdHJldHVybiBwbGF5ZXIuc3JjKCk7XG5cdFx0fVxuXG5cdFx0Ly8gT25seSBhZGQgdGhvc2Ugc291cmNlcyB3aGljaCB3ZSBjYW4gKG1heWJlKSBwbGF5XG5cdFx0c3JjID0gc3JjLmZpbHRlcihmdW5jdGlvbihzb3VyY2UpIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHJldHVybiAocGxheWVyLmNhblBsYXlUeXBlKHNvdXJjZS50eXBlKSAhPT0gJycpO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHQvLyBJZiBhIFRlY2ggZG9lc24ndCB5ZXQgaGF2ZSBjYW5QbGF5VHlwZSBqdXN0IGFkZCBpdFxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHQvL1NvcnQgc291cmNlc1xuXHRcdHRoaXMuY3VycmVudFNvdXJjZXMgPSBzcmMuc29ydChjb21wYXJlUmVzb2x1dGlvbnMpO1xuXHRcdHRoaXMuZ3JvdXBlZFNyYyA9IGJ1Y2tldFNvdXJjZXModGhpcy5jdXJyZW50U291cmNlcyk7XG5cdFx0Ly8gUGljayBvbmUgYnkgZGVmYXVsdFxuXHRcdHZhciBjaG9zZW4gPSBjaG9vc2VTcmModGhpcy5ncm91cGVkU3JjLCB0aGlzLmN1cnJlbnRTb3VyY2VzKTtcblx0XHR0aGlzLmN1cnJlbnRSZXNvbHV0aW9uU3RhdGUgPSB7XG5cdFx0XHRsYWJlbDogY2hvc2VuLmxhYmVsLFxuXHRcdFx0c291cmNlczogY2hvc2VuLnNvdXJjZXNcblx0XHR9O1xuXG5cdFx0cGxheWVyLnRyaWdnZXIoJ3VwZGF0ZVNvdXJjZXMnKTtcblx0XHRwbGF5ZXIuc2V0U291cmNlc1Nhbml0aXplZChjaG9zZW4uc291cmNlcywgY2hvc2VuLmxhYmVsKTtcblx0XHRwbGF5ZXIudHJpZ2dlcigncmVzb2x1dGlvbmNoYW5nZScpO1xuXHRcdHJldHVybiBwbGF5ZXI7XG5cdH07XG5cblx0LyoqXG5cdCAqIFJldHVybnMgY3VycmVudCByZXNvbHV0aW9uIG9yIHNldHMgb25lIHdoZW4gbGFiZWwgaXMgc3BlY2lmaWVkXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSAgIFtsYWJlbF0gICAgICAgICBsYWJlbCBuYW1lXG5cdCAqIEBwYXJhbSB7RnVuY3Rpb259IFtjdXN0b21Tb3VyY2VQaWNrZXJdIGN1c3RvbSBmdW5jdGlvbiB0byBjaG9vc2Ugc291cmNlLiBUYWtlcyAyIGFyZ3VtZW50czogc291cmNlcywgbGFiZWwuIE11c3QgcmV0dXJuIHBsYXllciBvYmplY3QuXG5cdCAqIEByZXR1cm5zIHtPYmplY3R9ICAgY3VycmVudCByZXNvbHV0aW9uIG9iamVjdCB7bGFiZWw6ICcnLCBzb3VyY2VzOiBbXX0gaWYgdXNlZCBhcyBnZXR0ZXIgb3IgcGxheWVyIG9iamVjdCBpZiB1c2VkIGFzIHNldHRlclxuXHQgKi9cblx0cGxheWVyLmN1cnJlbnRSZXNvbHV0aW9uID0gZnVuY3Rpb24obGFiZWwsIGN1c3RvbVNvdXJjZVBpY2tlcikge1xuXHRcdGlmIChsYWJlbCA9PSBudWxsKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5jdXJyZW50UmVzb2x1dGlvblN0YXRlO1xuXHRcdH1cblxuXHRcdC8vIExvb2t1cCBzb3VyY2VzIGZvciBsYWJlbFxuXHRcdGlmICghdGhpcy5ncm91cGVkU3JjIHx8ICF0aGlzLmdyb3VwZWRTcmMubGFiZWwgfHwgIXRoaXMuZ3JvdXBlZFNyYy5sYWJlbFtsYWJlbF0pIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dmFyIHNvdXJjZXMgPSB0aGlzLmdyb3VwZWRTcmMubGFiZWxbbGFiZWxdO1xuXHRcdC8vIFJlbWVtYmVyIHBsYXllciBzdGF0ZVxuXHRcdHZhciBjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdHZhciBpc1BhdXNlZCA9IHBsYXllci5wYXVzZWQoKTtcblxuXHRcdC8vIEhpZGUgYmlnUGxheUJ1dHRvblxuXHRcdGlmICghaXNQYXVzZWQgJiYgdGhpcy5wbGF5ZXJfLm9wdGlvbnNfLmJpZ1BsYXlCdXR0b24pIHtcblx0XHRcdHRoaXMucGxheWVyXy5iaWdQbGF5QnV0dG9uLmhpZGUoKTtcblx0XHR9XG5cblx0XHQvLyBDaGFuZ2UgcGxheWVyIHNvdXJjZSBhbmQgd2FpdCBmb3IgbG9hZGVkZGF0YSBldmVudCwgdGhlbiBwbGF5IHZpZGVvXG5cdFx0Ly8gbG9hZGVkbWV0YWRhdGEgZG9lc24ndCB3b3JrIHJpZ2h0IG5vdyBmb3IgZmxhc2guXG5cdFx0Ly8gUHJvYmFibHkgYmVjYXVzZSBvZiBodHRwczovL2dpdGh1Yi5jb20vdmlkZW9qcy92aWRlby1qcy1zd2YvaXNzdWVzLzEyNFxuXHRcdC8vIElmIHBsYXllciBwcmVsb2FkIGlzICdub25lJyBhbmQgdGhlbiBsb2FkZWRkYXRhIG5vdCBmaXJlZC4gU28sIHdlIG5lZWQgdGltZXVwZGF0ZSBldmVudCBmb3Igc2VlayBoYW5kbGUgKHRpbWV1cGRhdGUgZG9lc24ndCB3b3JrIHByb3Blcmx5IHdpdGggZmxhc2gpXG5cdFx0dmFyIGhhbmRsZVNlZWtFdmVudCA9ICdsb2FkZWRkYXRhJztcblx0XHRpZiAodGhpcy5wbGF5ZXJfLnRlY2hOYW1lXyAhPT0gJ1lvdXR1YmUnICYmIHRoaXMucGxheWVyXy5wcmVsb2FkKCkgPT09ICdub25lJyAmJiB0aGlzLnBsYXllcl8udGVjaE5hbWVfICE9PSAnRmxhc2gnKSB7XG5cdFx0XHRoYW5kbGVTZWVrRXZlbnQgPSAndGltZXVwZGF0ZSc7XG5cdFx0fVxuXHRcdHBsYXllclxuXHRcdFx0LnNldFNvdXJjZXNTYW5pdGl6ZWQoc291cmNlcywgbGFiZWwsIGN1c3RvbVNvdXJjZVBpY2tlciB8fCBzZXR0aW5ncy5jdXN0b21Tb3VyY2VQaWNrZXIpXG5cdFx0XHQub25lKGhhbmRsZVNlZWtFdmVudCwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHBsYXllci5jdXJyZW50VGltZShjdXJyZW50VGltZSk7XG5cdFx0XHRcdHBsYXllci5oYW5kbGVUZWNoU2Vla2VkXygpO1xuXHRcdFx0XHRpZiAoIWlzUGF1c2VkKSB7XG5cdFx0XHRcdFx0Ly8gU3RhcnQgcGxheWluZyBhbmQgaGlkZSBsb2FkaW5nU3Bpbm5lciAoZmxhc2ggaXNzdWUgPylcblx0XHRcdFx0XHRwbGF5ZXIucGxheSgpLmhhbmRsZVRlY2hTZWVrZWRfKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cGxheWVyLnRyaWdnZXIoJ3Jlc29sdXRpb25jaGFuZ2UnKTtcblx0XHRcdH0pO1xuXHRcdHJldHVybiBwbGF5ZXI7XG5cdH07XG5cblx0LyoqXG5cdCAqIFJldHVybnMgZ3JvdXBlZCBzb3VyY2VzIGJ5IGxhYmVsLCByZXNvbHV0aW9uIGFuZCB0eXBlXG5cdCAqIEByZXR1cm5zIHtPYmplY3R9IGdyb3VwZWQgc291cmNlczogeyBsYWJlbDogeyBrZXk6IFtdIH0sIHJlczogeyBrZXk6IFtdIH0sIHR5cGU6IHsga2V5OiBbXSB9IH1cblx0ICovXG5cdHBsYXllci5nZXRHcm91cGVkU3JjID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuZ3JvdXBlZFNyYztcblx0fTtcblx0cGxheWVyLnNldFNvdXJjZXNTYW5pdGl6ZWQgPSBmdW5jdGlvbihzb3VyY2VzLCBsYWJlbCwgY3VzdG9tU291cmNlUGlja2VyKSB7XG5cdFx0dGhpcy5jdXJyZW50UmVzb2x1dGlvblN0YXRlID0ge1xuXHRcdFx0bGFiZWw6IGxhYmVsLFxuXHRcdFx0c291cmNlczogc291cmNlc1xuXHRcdH07XG5cblx0XHRpZiAodHlwZW9mIGN1c3RvbVNvdXJjZVBpY2tlciA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0cmV0dXJuIGN1c3RvbVNvdXJjZVBpY2tlcihwbGF5ZXIsIHNvdXJjZXMsIGxhYmVsKTtcblx0XHR9XG5cdFx0cGxheWVyLnNyYyhzb3VyY2VzLm1hcChmdW5jdGlvbihzcmMpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHNyYzogc3JjLnNyYyxcblx0XHRcdFx0dHlwZTogc3JjLnR5cGUsXG5cdFx0XHRcdHJlczogc3JjLnJlc1xuXHRcdFx0fTtcblx0XHR9KSk7XG5cblx0XHQkKFwiLnZqcy1yZXNvbHV0aW9uLWJ1dHRvbi1sYWJlbFwiKS5odG1sKGxhYmVsKTtcblx0XHRyZXR1cm4gcGxheWVyO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBNZXRob2QgdXNlZCBmb3Igc29ydGluZyBsaXN0IG9mIHNvdXJjZXNcblx0ICogQHBhcmFtICAge09iamVjdH0gYSAtIHNvdXJjZSBvYmplY3Qgd2l0aCByZXMgcHJvcGVydHlcblx0ICogQHBhcmFtICAge09iamVjdH0gYiAtIHNvdXJjZSBvYmplY3Qgd2l0aCByZXMgcHJvcGVydHlcblx0ICogQHJldHVybnMge051bWJlcn0gcmVzdWx0IG9mIGNvbXBhcmF0aW9uXG5cdCAqL1xuXHRmdW5jdGlvbiBjb21wYXJlUmVzb2x1dGlvbnMoYSwgYikge1xuXHRcdGlmICghYS5yZXMgfHwgIWIucmVzKSB7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cdFx0cmV0dXJuICgrYi5yZXMpIC0gKCthLnJlcyk7XG5cdH1cblxuXHQvKipcblx0ICogR3JvdXAgc291cmNlcyBieSBsYWJlbCwgcmVzb2x1dGlvbiBhbmQgdHlwZVxuXHQgKiBAcGFyYW0gICB7QXJyYXl9ICBzcmMgQXJyYXkgb2Ygc291cmNlc1xuXHQgKiBAcmV0dXJucyB7T2JqZWN0fSBncm91cGVkIHNvdXJjZXM6IHsgbGFiZWw6IHsga2V5OiBbXSB9LCByZXM6IHsga2V5OiBbXSB9LCB0eXBlOiB7IGtleTogW10gfSB9XG5cdCAqL1xuXHRmdW5jdGlvbiBidWNrZXRTb3VyY2VzKHNyYykge1xuXHRcdHZhciByZXNvbHV0aW9ucyA9IHtcblx0XHRcdGxhYmVsOiB7fSxcblx0XHRcdHJlczoge30sXG5cdFx0XHR0eXBlOiB7fVxuXHRcdH07XG5cdFx0c3JjLm1hcChmdW5jdGlvbihzb3VyY2UpIHtcblx0XHRcdGluaXRSZXNvbHV0aW9uS2V5KHJlc29sdXRpb25zLCAnbGFiZWwnLCBzb3VyY2UpO1xuXHRcdFx0aW5pdFJlc29sdXRpb25LZXkocmVzb2x1dGlvbnMsICdyZXMnLCBzb3VyY2UpO1xuXHRcdFx0aW5pdFJlc29sdXRpb25LZXkocmVzb2x1dGlvbnMsICd0eXBlJywgc291cmNlKTtcblxuXHRcdFx0YXBwZW5kU291cmNlVG9LZXkocmVzb2x1dGlvbnMsICdsYWJlbCcsIHNvdXJjZSk7XG5cdFx0XHRhcHBlbmRTb3VyY2VUb0tleShyZXNvbHV0aW9ucywgJ3JlcycsIHNvdXJjZSk7XG5cdFx0XHRhcHBlbmRTb3VyY2VUb0tleShyZXNvbHV0aW9ucywgJ3R5cGUnLCBzb3VyY2UpO1xuXHRcdH0pO1xuXHRcdHJldHVybiByZXNvbHV0aW9ucztcblx0fVxuXG5cdGZ1bmN0aW9uIGluaXRSZXNvbHV0aW9uS2V5KHJlc29sdXRpb25zLCBrZXksIHNvdXJjZSkge1xuXHRcdGlmIChyZXNvbHV0aW9uc1trZXldW3NvdXJjZVtrZXldXSA9PSBudWxsKSB7XG5cdFx0XHRyZXNvbHV0aW9uc1trZXldW3NvdXJjZVtrZXldXSA9IFtdO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIGFwcGVuZFNvdXJjZVRvS2V5KHJlc29sdXRpb25zLCBrZXksIHNvdXJjZSkge1xuXHRcdHJlc29sdXRpb25zW2tleV1bc291cmNlW2tleV1dLnB1c2goc291cmNlKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDaG9vc2Ugc3JjIGlmIG9wdGlvbi5kZWZhdWx0IGlzIHNwZWNpZmllZFxuXHQgKiBAcGFyYW0gICB7T2JqZWN0fSBncm91cGVkU3JjIHtyZXM6IHsga2V5OiBbXSB9fVxuXHQgKiBAcGFyYW0gICB7QXJyYXl9ICBzcmMgQXJyYXkgb2Ygc291cmNlcyBzb3J0ZWQgYnkgcmVzb2x1dGlvbiB1c2VkIHRvIGZpbmQgaGlnaCBhbmQgbG93IHJlc1xuXHQgKiBAcmV0dXJucyB7T2JqZWN0fSB7cmVzOiBzdHJpbmcsIHNvdXJjZXM6IFtdfVxuXHQgKi9cblx0ZnVuY3Rpb24gY2hvb3NlU3JjKGdyb3VwZWRTcmMsIHNyYykge1xuXHRcdHZhciBzZWxlY3RlZFJlcyA9IHNldHRpbmdzWydkZWZhdWx0J107IC8vIHVzZSBhcnJheSBhY2Nlc3MgYXMgZGVmYXVsdCBpcyBhIHJlc2VydmVkIGtleXdvcmRcblx0XHR2YXIgc2VsZWN0ZWRMYWJlbCA9ICcnO1xuXHRcdGlmIChzZWxlY3RlZFJlcyA9PT0gJ2hpZ2gnKSB7XG5cdFx0XHRzZWxlY3RlZFJlcyA9IHNyY1swXS5yZXM7XG5cdFx0XHRzZWxlY3RlZExhYmVsID0gc3JjWzBdLmxhYmVsO1xuXHRcdH0gZWxzZSBpZiAoc2VsZWN0ZWRSZXMgPT09ICdsb3cnIHx8IHNlbGVjdGVkUmVzID09IG51bGwgfHwgIWdyb3VwZWRTcmMucmVzW3NlbGVjdGVkUmVzXSkge1xuXHRcdFx0Ly8gU2VsZWN0IGxvdy1yZXMgaWYgZGVmYXVsdCBpcyBsb3cgb3Igbm90IHNldFxuXHRcdFx0c2VsZWN0ZWRSZXMgPSBzcmNbc3JjLmxlbmd0aCAtIDFdLnJlcztcblx0XHRcdHNlbGVjdGVkTGFiZWwgPSBzcmNbc3JjLmxlbmd0aCAtIDFdLmxhYmVsO1xuXHRcdH0gZWxzZSBpZiAoZ3JvdXBlZFNyYy5yZXNbc2VsZWN0ZWRSZXNdKSB7XG5cdFx0XHRzZWxlY3RlZExhYmVsID0gZ3JvdXBlZFNyYy5yZXNbc2VsZWN0ZWRSZXNdWzBdLmxhYmVsO1xuXHRcdH1cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzOiBzZWxlY3RlZFJlcyxcblx0XHRcdGxhYmVsOiBzZWxlY3RlZExhYmVsLFxuXHRcdFx0c291cmNlczogZ3JvdXBlZFNyYy5yZXNbc2VsZWN0ZWRSZXNdXG5cdFx0fTtcblx0fVxuXG5cdGZ1bmN0aW9uIGluaXRSZXNvbHV0aW9uRm9yWXQocGxheWVyKSB7XG5cdFx0Ly8gTWFwIHlvdXR1YmUgcXVhbGl0aWVzIG5hbWVzXG5cdFx0dmFyIF95dHMgPSB7XG5cdFx0XHRoaWdocmVzOiB7XG5cdFx0XHRcdHJlczogMTA4MCxcblx0XHRcdFx0bGFiZWw6ICcxMDgwJyxcblx0XHRcdFx0eXQ6ICdoaWdocmVzJ1xuXHRcdFx0fSxcblx0XHRcdGhkMTA4MDoge1xuXHRcdFx0XHRyZXM6IDEwODAsXG5cdFx0XHRcdGxhYmVsOiAnMTA4MCcsXG5cdFx0XHRcdHl0OiAnaGQxMDgwJ1xuXHRcdFx0fSxcblx0XHRcdGhkNzIwOiB7XG5cdFx0XHRcdHJlczogNzIwLFxuXHRcdFx0XHRsYWJlbDogJzcyMCcsXG5cdFx0XHRcdHl0OiAnaGQ3MjAnXG5cdFx0XHR9LFxuXHRcdFx0bGFyZ2U6IHtcblx0XHRcdFx0cmVzOiA0ODAsXG5cdFx0XHRcdGxhYmVsOiAnNDgwJyxcblx0XHRcdFx0eXQ6ICdsYXJnZSdcblx0XHRcdH0sXG5cdFx0XHRtZWRpdW06IHtcblx0XHRcdFx0cmVzOiAzNjAsXG5cdFx0XHRcdGxhYmVsOiAnMzYwJyxcblx0XHRcdFx0eXQ6ICdtZWRpdW0nXG5cdFx0XHR9LFxuXHRcdFx0c21hbGw6IHtcblx0XHRcdFx0cmVzOiAyNDAsXG5cdFx0XHRcdGxhYmVsOiAnMjQwJyxcblx0XHRcdFx0eXQ6ICdzbWFsbCdcblx0XHRcdH0sXG5cdFx0XHR0aW55OiB7XG5cdFx0XHRcdHJlczogMTQ0LFxuXHRcdFx0XHRsYWJlbDogJzE0NCcsXG5cdFx0XHRcdHl0OiAndGlueSdcblx0XHRcdH0sXG5cdFx0XHRhdXRvOiB7XG5cdFx0XHRcdHJlczogMCxcblx0XHRcdFx0bGFiZWw6ICdhdXRvJyxcblx0XHRcdFx0eXQ6ICdhdXRvJ1xuXHRcdFx0fVxuXHRcdH07XG5cdFx0Ly8gT3ZlcndyaXRlIGRlZmF1bHQgc291cmNlUGlja2VyIGZ1bmN0aW9uXG5cdFx0dmFyIF9jdXN0b21Tb3VyY2VQaWNrZXIgPSBmdW5jdGlvbihfcGxheWVyLCBfc291cmNlcywgX2xhYmVsKSB7XG5cdFx0XHQvLyBOb3RlIHRoYXQgc2V0UGxheWViYWNrUXVhbGl0eSBpcyBhIHN1Z2dlc3Rpb24uIFlUIGRvZXMgbm90IGFsd2F5cyBvYmV5IGl0LlxuXHRcdFx0cGxheWVyLnRlY2hfLnl0UGxheWVyLnNldFBsYXliYWNrUXVhbGl0eShfc291cmNlc1swXS5feXQpO1xuXHRcdFx0cGxheWVyLnRyaWdnZXIoJ3VwZGF0ZVNvdXJjZXMnKTtcblx0XHRcdHJldHVybiBwbGF5ZXI7XG5cdFx0fTtcblx0XHRzZXR0aW5ncy5jdXN0b21Tb3VyY2VQaWNrZXIgPSBfY3VzdG9tU291cmNlUGlja2VyO1xuXG5cdFx0Ly8gSW5pdCByZXNvbHV0aW9uXG5cdFx0cGxheWVyLnRlY2hfLnl0UGxheWVyLnNldFBsYXliYWNrUXVhbGl0eSgnYXV0bycpO1xuXG5cdFx0Ly8gVGhpcyBpcyB0cmlnZ2VyZWQgd2hlbiB0aGUgcmVzb2x1dGlvbiBhY3R1YWxseSBjaGFuZ2VzXG5cdFx0cGxheWVyLnRlY2hfLnl0UGxheWVyLmFkZEV2ZW50TGlzdGVuZXIoJ29uUGxheWJhY2tRdWFsaXR5Q2hhbmdlJywgZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdGZvciAodmFyIHJlcyBpbiBfeXRzKSB7XG5cdFx0XHRcdGlmIChyZXMueXQgPT09IGV2ZW50LmRhdGEpIHtcblx0XHRcdFx0XHRwbGF5ZXIuY3VycmVudFJlc29sdXRpb24ocmVzLmxhYmVsLCBfY3VzdG9tU291cmNlUGlja2VyKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdC8vIFdlIG11c3Qgd2FpdCBmb3IgcGxheSBldmVudFxuXHRcdHBsYXllci5vbmUoJ3BsYXknLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBxdWFsaXRpZXMgPSBwbGF5ZXIudGVjaF8ueXRQbGF5ZXIuZ2V0QXZhaWxhYmxlUXVhbGl0eUxldmVscygpO1xuXHRcdFx0dmFyIF9zb3VyY2VzID0gW107XG5cblx0XHRcdHF1YWxpdGllcy5tYXAoZnVuY3Rpb24ocSkge1xuXHRcdFx0XHRfc291cmNlcy5wdXNoKHtcblx0XHRcdFx0XHRzcmM6IHBsYXllci5zcmMoKS5zcmMsXG5cdFx0XHRcdFx0dHlwZTogcGxheWVyLnNyYygpLnR5cGUsXG5cdFx0XHRcdFx0bGFiZWw6IF95dHNbcV0ubGFiZWwsXG5cdFx0XHRcdFx0cmVzOiBfeXRzW3FdLnJlcyxcblx0XHRcdFx0XHRfeXQ6IF95dHNbcV0ueXRcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0cGxheWVyLmdyb3VwZWRTcmMgPSBidWNrZXRTb3VyY2VzKF9zb3VyY2VzKTtcblx0XHRcdHZhciBjaG9zZW4gPSB7XG5cdFx0XHRcdGxhYmVsOiAnYXV0bycsXG5cdFx0XHRcdHJlczogMCxcblx0XHRcdFx0c291cmNlczogcGxheWVyLmdyb3VwZWRTcmMubGFiZWwuYXV0b1xuXHRcdFx0fTtcblxuXHRcdFx0dGhpcy5jdXJyZW50UmVzb2x1dGlvblN0YXRlID0ge1xuXHRcdFx0XHRsYWJlbDogY2hvc2VuLmxhYmVsLFxuXHRcdFx0XHRzb3VyY2VzOiBjaG9zZW4uc291cmNlc1xuXHRcdFx0fTtcblxuXHRcdFx0cGxheWVyLnRyaWdnZXIoJ3VwZGF0ZVNvdXJjZXMnKTtcblx0XHRcdHBsYXllci5zZXRTb3VyY2VzU2FuaXRpemVkKGNob3Nlbi5zb3VyY2VzLCBjaG9zZW4ubGFiZWwsIF9jdXN0b21Tb3VyY2VQaWNrZXIpO1xuXHRcdH0pO1xuXHR9XG5cblx0cGxheWVyLnJlYWR5KGZ1bmN0aW9uKCkge1xuXHRcdGlmIChzZXR0aW5ncy51aSkge1xuXHRcdFx0dmFyIG1lbnVCdXR0b24gPSBuZXcgUmVzb2x1dGlvbk1lbnVCdXR0b24ocGxheWVyLCBzZXR0aW5ncyk7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5yZXNvbHV0aW9uU3dpdGNoZXIgPSBwbGF5ZXIuY29udHJvbEJhci5lbF8uaW5zZXJ0QmVmb3JlKG1lbnVCdXR0b24uZWxfLCBwbGF5ZXIuY29udHJvbEJhci5nZXRDaGlsZCgnZnVsbHNjcmVlblRvZ2dsZScpLmVsXyk7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5yZXNvbHV0aW9uU3dpdGNoZXIuZGlzcG9zZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR0aGlzLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcyk7XG5cdFx0XHR9O1xuXHRcdH1cblx0XHRpZiAocGxheWVyLm9wdGlvbnNfLnNvdXJjZXMubGVuZ3RoID4gMSkge1xuXHRcdFx0Ly8gdGVjaDogSHRtbDUgYW5kIEZsYXNoXG5cdFx0XHQvLyBDcmVhdGUgcmVzb2x1dGlvbiBzd2l0Y2hlciBmb3IgdmlkZW9zIGZvcm0gPHNvdXJjZT4gdGFnIGluc2lkZSA8dmlkZW8+XG5cdFx0XHRwbGF5ZXIudXBkYXRlU3JjKHBsYXllci5vcHRpb25zXy5zb3VyY2VzKTtcblx0XHR9XG5cblx0XHRpZiAocGxheWVyLnRlY2hOYW1lXyA9PT0gJ1lvdXR1YmUnKSB7XG5cdFx0XHQvLyB0ZWNoOiBZb3VUdWJlXG5cdFx0XHRpbml0UmVzb2x1dGlvbkZvcll0KHBsYXllcik7XG5cdFx0fVxuXHR9KTtcblxuXHR2YXIgdmlkZW9Kc1Jlc29sdXRpb25Td2l0Y2hlcixcblx0XHRkZWZhdWx0cyA9IHtcblx0XHRcdHVpOiB0cnVlXG5cdFx0fTtcblxuXHQvKlxuXHQgKiBSZXNvbHV0aW9uIG1lbnUgaXRlbVxuXHQgKi9cblx0dmFyIE1lbnVJdGVtID0gdmlkZW9qcy5nZXRDb21wb25lbnQoJ01lbnVJdGVtJyk7XG5cdHZhciBSZXNvbHV0aW9uTWVudUl0ZW0gPSB2aWRlb2pzLmV4dGVuZChNZW51SXRlbSwge1xuXHRcdGNvbnN0cnVjdG9yOiBmdW5jdGlvbihwbGF5ZXIsIG9wdGlvbnMpIHtcblx0XHRcdG9wdGlvbnMuc2VsZWN0YWJsZSA9IHRydWU7XG5cdFx0XHQvLyBTZXRzIHRoaXMucGxheWVyXywgdGhpcy5vcHRpb25zXyBhbmQgaW5pdGlhbGl6ZXMgdGhlIGNvbXBvbmVudFxuXHRcdFx0TWVudUl0ZW0uY2FsbCh0aGlzLCBwbGF5ZXIsIG9wdGlvbnMpO1xuXHRcdFx0dGhpcy5zcmMgPSBvcHRpb25zLnNyYztcblxuXHRcdFx0cGxheWVyLm9uKCdyZXNvbHV0aW9uY2hhbmdlJywgdmlkZW9qcy5iaW5kKHRoaXMsIHRoaXMudXBkYXRlKSk7XG5cdFx0fVxuXHR9KTtcblx0UmVzb2x1dGlvbk1lbnVJdGVtLnByb3RvdHlwZS5oYW5kbGVDbGljayA9IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0TWVudUl0ZW0ucHJvdG90eXBlLmhhbmRsZUNsaWNrLmNhbGwodGhpcywgZXZlbnQpO1xuXHRcdHRoaXMucGxheWVyXy5jdXJyZW50UmVzb2x1dGlvbih0aGlzLm9wdGlvbnNfLmxhYmVsKTtcblx0fTtcblx0UmVzb2x1dGlvbk1lbnVJdGVtLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZWN0aW9uID0gdGhpcy5wbGF5ZXJfLmN1cnJlbnRSZXNvbHV0aW9uKCk7XG5cdFx0dGhpcy5zZWxlY3RlZCh0aGlzLm9wdGlvbnNfLmxhYmVsID09PSBzZWxlY3Rpb24ubGFiZWwpO1xuXHR9O1xuXHRNZW51SXRlbS5yZWdpc3RlckNvbXBvbmVudCgnUmVzb2x1dGlvbk1lbnVJdGVtJywgUmVzb2x1dGlvbk1lbnVJdGVtKTtcblxuXHQvKlxuXHQgKiBSZXNvbHV0aW9uIG1lbnUgYnV0dG9uXG5cdCAqL1xuXHR2YXIgTWVudUJ1dHRvbiA9IHZpZGVvanMuZ2V0Q29tcG9uZW50KCdNZW51QnV0dG9uJyk7XG5cdHZhciBSZXNvbHV0aW9uTWVudUJ1dHRvbiA9IHZpZGVvanMuZXh0ZW5kKE1lbnVCdXR0b24sIHtcblx0XHRjb25zdHJ1Y3RvcjogZnVuY3Rpb24ocGxheWVyLCBvcHRpb25zKSB7XG5cdFx0XHR0aGlzLmxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuXHRcdFx0b3B0aW9ucy5sYWJlbCA9ICdRdWFsaXR5Jztcblx0XHRcdC8vIFNldHMgdGhpcy5wbGF5ZXJfLCB0aGlzLm9wdGlvbnNfIGFuZCBpbml0aWFsaXplcyB0aGUgY29tcG9uZW50XG5cdFx0XHRNZW51QnV0dG9uLmNhbGwodGhpcywgcGxheWVyLCBvcHRpb25zKTtcblx0XHRcdHRoaXMuZWwoKS5zZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnLCAnUXVhbGl0eScpO1xuXHRcdFx0dGhpcy5jb250cm9sVGV4dCgnUXVhbGl0eScpO1xuXG5cdFx0XHRpZiAob3B0aW9ucy5keW5hbWljTGFiZWwpIHtcblx0XHRcdFx0dmlkZW9qcy5hZGRDbGFzcyh0aGlzLmxhYmVsLCAndmpzLXJlc29sdXRpb24tYnV0dG9uLWxhYmVsJyk7XG5cdFx0XHRcdHRoaXMuZWwoKS5hcHBlbmRDaGlsZCh0aGlzLmxhYmVsKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZhciBzdGF0aWNMYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0XHRcdFx0dmlkZW9qcy5hZGRDbGFzcyhzdGF0aWNMYWJlbCwgJ3Zqcy1tZW51LWljb24nKTtcblx0XHRcdFx0dGhpcy5lbCgpLmFwcGVuZENoaWxkKHN0YXRpY0xhYmVsKTtcblx0XHRcdH1cblx0XHRcdHBsYXllci5vbigndXBkYXRlU291cmNlcycsIHZpZGVvanMuYmluZCh0aGlzLCB0aGlzLnVwZGF0ZSkpO1xuXHRcdH1cblx0fSk7XG5cdFJlc29sdXRpb25NZW51QnV0dG9uLnByb3RvdHlwZS5jcmVhdGVJdGVtcyA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBtZW51SXRlbXMgPSBbXTtcblx0XHR2YXIgbGFiZWxzID0gKHRoaXMuc291cmNlcyAmJiB0aGlzLnNvdXJjZXMubGFiZWwpIHx8IHt9O1xuXG5cdFx0Ly8gRklYTUUgb3JkZXIgaXMgbm90IGd1YXJhbnRlZWQgaGVyZS5cblx0XHRmb3IgKHZhciBrZXkgaW4gbGFiZWxzKSB7XG5cdFx0XHRpZiAobGFiZWxzLmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdFx0bWVudUl0ZW1zLnB1c2gobmV3IFJlc29sdXRpb25NZW51SXRlbShcblx0XHRcdFx0XHR0aGlzLnBsYXllcl8sIHtcblx0XHRcdFx0XHRcdGxhYmVsOiBrZXksXG5cdFx0XHRcdFx0XHRzcmM6IGxhYmVsc1trZXldLFxuXHRcdFx0XHRcdFx0c2VsZWN0ZWQ6IGtleSA9PT0gKHRoaXMuY3VycmVudFNlbGVjdGlvbiA/IHRoaXMuY3VycmVudFNlbGVjdGlvbi5sYWJlbCA6IGZhbHNlKVxuXHRcdFx0XHRcdH0pKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIG1lbnVJdGVtcztcblx0fTtcblx0UmVzb2x1dGlvbk1lbnVCdXR0b24ucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuc291cmNlcyA9IHRoaXMucGxheWVyXy5nZXRHcm91cGVkU3JjKCk7XG5cdFx0dGhpcy5jdXJyZW50U2VsZWN0aW9uID0gdGhpcy5wbGF5ZXJfLmN1cnJlbnRSZXNvbHV0aW9uKCk7XG5cdFx0dGhpcy5sYWJlbC5pbm5lckhUTUwgPSB0aGlzLmN1cnJlbnRTZWxlY3Rpb24gPyB0aGlzLmN1cnJlbnRTZWxlY3Rpb24ubGFiZWwgOiAnJztcblx0XHRyZXR1cm4gTWVudUJ1dHRvbi5wcm90b3R5cGUudXBkYXRlLmNhbGwodGhpcyk7XG5cdH07XG5cdFJlc29sdXRpb25NZW51QnV0dG9uLnByb3RvdHlwZS5idWlsZENTU0NsYXNzID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIE1lbnVCdXR0b24ucHJvdG90eXBlLmJ1aWxkQ1NTQ2xhc3MuY2FsbCh0aGlzKSArICcgdmpzLXJlc29sdXRpb24tYnV0dG9uJztcblx0fTtcblx0TWVudUJ1dHRvbi5yZWdpc3RlckNvbXBvbmVudCgnUmVzb2x1dGlvbk1lbnVCdXR0b24nLCBSZXNvbHV0aW9uTWVudUJ1dHRvbik7XG59O1xuXG4vKipcbiAqIOemgeeUqOa7muWKqOadoeaLluWKqFxuICogQHBhcmFtIHtbdHlwZV19IG9wdGlvbnMgW2Rlc2NyaXB0aW9uXVxuICogcmV0dXJuIHtbdHlwZV19ICBbZGVzY3JpcHRpb25dXG4gKi9cbmNvbnN0IGRpc2FibGVQcm9ncmVzcyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0dmFyXG5cdC8qKlxuXHQgKiBDb3BpZXMgcHJvcGVydGllcyBmcm9tIG9uZSBvciBtb3JlIG9iamVjdHMgb250byBhbiBvcmlnaW5hbC5cblx0ICovXG5cdFx0ZXh0ZW5kID0gZnVuY3Rpb24ob2JqIC8qLCBhcmcxLCBhcmcyLCAuLi4gKi8gKSB7XG5cdFx0XHR2YXIgYXJnLCBpLCBrO1xuXHRcdFx0Zm9yIChpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRhcmcgPSBhcmd1bWVudHNbaV07XG5cdFx0XHRcdGZvciAoayBpbiBhcmcpIHtcblx0XHRcdFx0XHRpZiAoYXJnLmhhc093blByb3BlcnR5KGspKSB7XG5cdFx0XHRcdFx0XHRvYmpba10gPSBhcmdba107XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gb2JqO1xuXHRcdH0sXG5cblx0XHQvLyBkZWZpbmUgc29tZSByZWFzb25hYmxlIGRlZmF1bHRzIGZvciB0aGlzIHN3ZWV0IHBsdWdpblxuXHRcdGRlZmF1bHRzID0ge1xuXHRcdFx0YXV0b0Rpc2FibGU6IGZhbHNlXG5cdFx0fTtcblxuXG5cdHZhclxuXHQvLyBzYXZlIGEgcmVmZXJlbmNlIHRvIHRoZSBwbGF5ZXIgaW5zdGFuY2Vcblx0XHRwbGF5ZXIgPSB0aGlzLFxuXHRcdHN0YXRlID0gZmFsc2UsXG5cblx0XHQvLyBtZXJnZSBvcHRpb25zIGFuZCBkZWZhdWx0c1xuXHRcdHNldHRpbmdzID0gZXh0ZW5kKHt9LCBkZWZhdWx0cywgb3B0aW9ucyB8fCB7fSk7XG5cblx0Ly8gZGlzYWJsZSAvIGVuYWJsZSBtZXRob2RzXG5cdHBsYXllci5kaXNhYmxlUHJvZ3Jlc3MgPSB7XG5cdFx0ZGlzYWJsZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRzdGF0ZSA9IHRydWU7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vZmYoXCJmb2N1c1wiKTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9mZihcIm1vdXNlZG93blwiKTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9mZihcInRvdWNoc3RhcnRcIik7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vZmYoXCJjbGlja1wiKTtcblx0XHR9LFxuXHRcdGVuYWJsZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRzdGF0ZSA9IGZhbHNlO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub24oXCJmb2N1c1wiLCBwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5oYW5kbGVGb2N1cyk7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vbihcIm1vdXNlZG93blwiLCBwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5oYW5kbGVNb3VzZURvd24pO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub24oXCJ0b3VjaHN0YXJ0XCIsIHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLmhhbmRsZU1vdXNlRG93bik7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vbihcImNsaWNrXCIsIHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLmhhbmRsZUNsaWNrKTtcblx0XHR9LFxuXHRcdGdldFN0YXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBzdGF0ZTtcblx0XHR9XG5cdH07XG5cblx0aWYgKHNldHRpbmdzLmF1dG9EaXNhYmxlKSB7XG5cdFx0cGxheWVyLmRpc2FibGVQcm9ncmVzcy5kaXNhYmxlKCk7XG5cdH1cbn07XG5cbi8qKlxuICog5omT54K5XG4gKiBAcGFyYW0ge1t0eXBlXX0gb3B0aW9ucyBbZGVzY3JpcHRpb25dXG4gKiByZXR1cm4ge1t0eXBlXX0gIFtkZXNjcmlwdGlvbl1cbiAqL1xuY29uc3QgbWFya2VycyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0Ly9kZWZhdWx0IHNldHRpbmdcblx0dmFyIGRlZmF1bHRTZXR0aW5nID0ge1xuXHRcdG1hcmtlclN0eWxlOiB7XG5cdFx0XHQnd2lkdGgnOiAnOHB4Jyxcblx0XHRcdCdib3JkZXItcmFkaXVzJzogJzIwJScsXG5cdFx0XHQnYmFja2dyb3VuZC1jb2xvcic6ICdyZ2JhKDI1NSwwLDAsLjUpJ1xuXHRcdH0sXG5cdFx0bWFya2VyVGlwOiB7XG5cdFx0XHRkaXNwbGF5OiB0cnVlLFxuXHRcdFx0dGV4dDogZnVuY3Rpb24obWFya2VyKSB7XG5cdFx0XHRcdHJldHVybiBtYXJrZXIudGV4dDtcblx0XHRcdH0sXG5cdFx0XHR0aW1lOiBmdW5jdGlvbihtYXJrZXIpIHtcblx0XHRcdFx0cmV0dXJuIG1hcmtlci50aW1lO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0YnJlYWtPdmVybGF5OiB7XG5cdFx0XHRkaXNwbGF5OiB0cnVlLFxuXHRcdFx0ZGlzcGxheVRpbWU6IDEsXG5cdFx0XHR0ZXh0OiBmdW5jdGlvbihtYXJrZXIpIHtcblx0XHRcdFx0cmV0dXJuIG1hcmtlci5vdmVybGF5VGV4dDtcblx0XHRcdH0sXG5cdFx0XHRzdHlsZToge1xuXHRcdFx0XHQnd2lkdGgnOiAnMTAwJScsXG5cdFx0XHRcdCdoZWlnaHQnOiAnY2FsYygxMDAlIC0gMzZweCknLFxuXHRcdFx0XHQnYmFja2dyb3VuZC1jb2xvcic6ICdyZ2JhKDAsMCwwLDAuNyknLFxuXHRcdFx0XHQnY29sb3InOiAnd2hpdGUnLFxuXHRcdFx0XHQnZm9udC1zaXplJzogJzE3cHgnXG5cdFx0XHR9XG5cdFx0fSxcblx0XHRvbk1hcmtlckNsaWNrOiBmdW5jdGlvbihtYXJrZXIpIHtcblx0XHRcdHJldHVybiBmYWxzZVxuXHRcdH0sXG5cdFx0b25NYXJrZXJSZWFjaGVkOiBmdW5jdGlvbihtYXJrZXIpIHt9LFxuXHRcdG1hcmtlcnM6IFtdXG5cdH07XG5cblx0Ly8gY3JlYXRlIGEgbm9uLWNvbGxpZGluZyByYW5kb20gbnVtYmVyXG5cdGZ1bmN0aW9uIGdlbmVyYXRlVVVJRCgpIHtcblx0XHR2YXIgZCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXHRcdHZhciB1dWlkID0gJ3h4eHh4eHh4LXh4eHgtNHh4eC15eHh4LXh4eHh4eHh4eHh4eCcucmVwbGFjZSgvW3h5XS9nLCBmdW5jdGlvbihjKSB7XG5cdFx0XHR2YXIgciA9IChkICsgTWF0aC5yYW5kb20oKSAqIDE2KSAlIDE2IHwgMDtcblx0XHRcdGQgPSBNYXRoLmZsb29yKGQgLyAxNik7XG5cdFx0XHRyZXR1cm4gKGMgPT0gJ3gnID8gciA6IChyICYgMHgzIHwgMHg4KSkudG9TdHJpbmcoMTYpO1xuXHRcdH0pO1xuXHRcdHJldHVybiB1dWlkO1xuXHR9O1xuXHQvKipcblx0ICogcmVnaXN0ZXIgdGhlIG1hcmtlcnMgcGx1Z2luIChkZXBlbmRlbnQgb24ganF1ZXJ5KVxuXHQgKi9cblx0dmFyIHNldHRpbmcgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZGVmYXVsdFNldHRpbmcsIG9wdGlvbnMpLFxuXHRcdG1hcmtlcnNNYXAgPSB7fSxcblx0XHRtYXJrZXJzTGlzdCA9IFtdLCAvLyBsaXN0IG9mIG1hcmtlcnMgc29ydGVkIGJ5IHRpbWVcblx0XHR2aWRlb1dyYXBwZXIgPSAkKHRoaXMuZWwoKSksXG5cdFx0Y3VycmVudE1hcmtlckluZGV4ID0gLTEsXG5cdFx0cGxheWVyID0gdGhpcyxcblx0XHRtYXJrZXJUaXAgPSBudWxsLFxuXHRcdGJyZWFrT3ZlcmxheSA9IG51bGwsXG5cdFx0b3ZlcmxheUluZGV4ID0gLTE7XG5cblx0ZnVuY3Rpb24gc29ydE1hcmtlcnNMaXN0KCkge1xuXHRcdC8vIHNvcnQgdGhlIGxpc3QgYnkgdGltZSBpbiBhc2Mgb3JkZXJcblx0XHRtYXJrZXJzTGlzdC5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdHJldHVybiBzZXR0aW5nLm1hcmtlclRpcC50aW1lKGEpIC0gc2V0dGluZy5tYXJrZXJUaXAudGltZShiKTtcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIGFkZE1hcmtlcnMobmV3TWFya2Vycykge1xuXHRcdC8vIGNyZWF0ZSB0aGUgbWFya2Vyc1xuXHRcdCQuZWFjaChuZXdNYXJrZXJzLCBmdW5jdGlvbihpbmRleCwgbWFya2VyKSB7XG5cdFx0XHRtYXJrZXIua2V5ID0gZ2VuZXJhdGVVVUlEKCk7XG5cblx0XHRcdHZpZGVvV3JhcHBlci5maW5kKCcudmpzLXByb2dyZXNzLWNvbnRyb2wnKS5hcHBlbmQoXG5cdFx0XHRcdGNyZWF0ZU1hcmtlckRpdihtYXJrZXIpKTtcblxuXHRcdFx0Ly8gc3RvcmUgbWFya2VyIGluIGFuIGludGVybmFsIGhhc2ggbWFwXG5cdFx0XHRtYXJrZXJzTWFwW21hcmtlci5rZXldID0gbWFya2VyO1xuXHRcdFx0bWFya2Vyc0xpc3QucHVzaChtYXJrZXIpO1xuXHRcdH0pO1xuXG5cdFx0c29ydE1hcmtlcnNMaXN0KCk7XG5cdH1cblxuXHRmdW5jdGlvbiBnZXRQb3NpdGlvbihtYXJrZXIpIHtcblx0XHRyZXR1cm4gKHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2VyKSAvIHBsYXllci5kdXJhdGlvbigpKSAqIDEwMFxuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlTWFya2VyRGl2KG1hcmtlciwgZHVyYXRpb24pIHtcblx0XHR2YXIgbWFya2VyRGl2ID0gJChcIjxkaXYgY2xhc3M9J3Zqcy1tYXJrZXInPjwvZGl2PlwiKTtcblx0XHR2YXIgbWFyZyA9IHBhcnNlSW50KHZpZGVvV3JhcHBlci5maW5kKCcudmpzLXByb2dyZXNzLWNvbnRyb2wgLnZqcy1zbGlkZXInKS5jc3MoJ21hcmdpbkxlZnQnKSk7XG5cdFx0bWFya2VyRGl2LmNzcyhzZXR0aW5nLm1hcmtlclN0eWxlKVxuXHRcdFx0LmNzcyh7XG5cdFx0XHRcdFwibWFyZ2luLWxlZnRcIjogbWFyZyAtIHBhcnNlRmxvYXQobWFya2VyRGl2LmNzcyhcIndpZHRoXCIpKSAvIDIgKyAncHgnLFxuXHRcdFx0XHRcImxlZnRcIjogZ2V0UG9zaXRpb24obWFya2VyKSArICclJ1xuXHRcdFx0fSlcblx0XHRcdC5hdHRyKFwiZGF0YS1tYXJrZXIta2V5XCIsIG1hcmtlci5rZXkpXG5cdFx0XHQuYXR0cihcImRhdGEtbWFya2VyLXRpbWVcIiwgc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXIpKTtcblxuXHRcdC8vIGFkZCB1c2VyLWRlZmluZWQgY2xhc3MgdG8gbWFya2VyXG5cdFx0aWYgKG1hcmtlci5jbGFzcykge1xuXHRcdFx0bWFya2VyRGl2LmFkZENsYXNzKG1hcmtlci5jbGFzcyk7XG5cdFx0fVxuXG5cdFx0Ly8gYmluZCBjbGljayBldmVudCB0byBzZWVrIHRvIG1hcmtlciB0aW1lXG5cdFx0bWFya2VyRGl2Lm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcblxuXHRcdFx0dmFyIHByZXZlbnREZWZhdWx0ID0gZmFsc2U7XG5cdFx0XHRpZiAodHlwZW9mIHNldHRpbmcub25NYXJrZXJDbGljayA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRcdC8vIGlmIHJldHVybiBmYWxzZSwgcHJldmVudCBkZWZhdWx0IGJlaGF2aW9yXG5cdFx0XHRcdHByZXZlbnREZWZhdWx0ID0gc2V0dGluZy5vbk1hcmtlckNsaWNrKG1hcmtlcikgPT0gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdGlmICghcHJldmVudERlZmF1bHQpIHtcblx0XHRcdFx0dmFyIGtleSA9ICQodGhpcykuZGF0YSgnbWFya2VyLWtleScpO1xuXHRcdFx0XHRwbGF5ZXIuY3VycmVudFRpbWUoc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTWFwW2tleV0pKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdGlmIChzZXR0aW5nLm1hcmtlclRpcC5kaXNwbGF5KSB7XG5cdFx0XHRyZWdpc3Rlck1hcmtlclRpcEhhbmRsZXIobWFya2VyRGl2KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gbWFya2VyRGl2O1xuXHR9XG5cblx0ZnVuY3Rpb24gdXBkYXRlTWFya2VycygpIHtcblx0XHQvLyB1cGRhdGUgVUkgZm9yIG1hcmtlcnMgd2hvc2UgdGltZSBjaGFuZ2VkXG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG1hcmtlcnNMaXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgbWFya2VyID0gbWFya2Vyc0xpc3RbaV07XG5cdFx0XHR2YXIgbWFya2VyRGl2ID0gdmlkZW9XcmFwcGVyLmZpbmQoXCIudmpzLW1hcmtlcltkYXRhLW1hcmtlci1rZXk9J1wiICsgbWFya2VyLmtleSArIFwiJ11cIik7XG5cdFx0XHR2YXIgbWFya2VyVGltZSA9IHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2VyKTtcblxuXHRcdFx0aWYgKG1hcmtlckRpdi5kYXRhKCdtYXJrZXItdGltZScpICE9IG1hcmtlclRpbWUpIHtcblx0XHRcdFx0bWFya2VyRGl2LmNzcyh7XG5cdFx0XHRcdFx0XHRcImxlZnRcIjogZ2V0UG9zaXRpb24obWFya2VyKSArICclJ1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0LmF0dHIoXCJkYXRhLW1hcmtlci10aW1lXCIsIG1hcmtlclRpbWUpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRzb3J0TWFya2Vyc0xpc3QoKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHJlbW92ZU1hcmtlcnMoaW5kZXhBcnJheSkge1xuXHRcdC8vIHJlc2V0IG92ZXJsYXlcblx0XHRpZiAoYnJlYWtPdmVybGF5KSB7XG5cdFx0XHRvdmVybGF5SW5kZXggPSAtMTtcblx0XHRcdGJyZWFrT3ZlcmxheS5jc3MoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuXHRcdH1cblx0XHRjdXJyZW50TWFya2VySW5kZXggPSAtMTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgaW5kZXhBcnJheS5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGluZGV4ID0gaW5kZXhBcnJheVtpXTtcblx0XHRcdHZhciBtYXJrZXIgPSBtYXJrZXJzTGlzdFtpbmRleF07XG5cdFx0XHRpZiAobWFya2VyKSB7XG5cdFx0XHRcdC8vIGRlbGV0ZSBmcm9tIG1lbW9yeVxuXHRcdFx0XHRkZWxldGUgbWFya2Vyc01hcFttYXJrZXIua2V5XTtcblx0XHRcdFx0bWFya2Vyc0xpc3RbaW5kZXhdID0gbnVsbDtcblxuXHRcdFx0XHQvLyBkZWxldGUgZnJvbSBkb21cblx0XHRcdFx0dmlkZW9XcmFwcGVyLmZpbmQoXCIudmpzLW1hcmtlcltkYXRhLW1hcmtlci1rZXk9J1wiICsgbWFya2VyLmtleSArIFwiJ11cIikucmVtb3ZlKCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gY2xlYW4gdXAgYXJyYXlcblx0XHRmb3IgKHZhciBpID0gbWFya2Vyc0xpc3QubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcblx0XHRcdGlmIChtYXJrZXJzTGlzdFtpXSA9PT0gbnVsbCkge1xuXHRcdFx0XHRtYXJrZXJzTGlzdC5zcGxpY2UoaSwgMSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gc29ydCBhZ2FpblxuXHRcdHNvcnRNYXJrZXJzTGlzdCgpO1xuXHR9XG5cblxuXHQvLyBhdHRhY2ggaG92ZXIgZXZlbnQgaGFuZGxlclxuXHRmdW5jdGlvbiByZWdpc3Rlck1hcmtlclRpcEhhbmRsZXIobWFya2VyRGl2KSB7XG5cblx0XHRtYXJrZXJEaXYub24oJ21vdXNlb3ZlcicsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIG1hcmtlciA9IG1hcmtlcnNNYXBbJCh0aGlzKS5kYXRhKCdtYXJrZXIta2V5JyldO1xuXG5cdFx0XHRtYXJrZXJUaXAuZmluZCgnLnZqcy10aXAtaW5uZXInKS5odG1sKHNldHRpbmcubWFya2VyVGlwLnRleHQobWFya2VyKSk7XG5cblx0XHRcdC8vIG1hcmdpbi1sZWZ0IG5lZWRzIHRvIG1pbnVzIHRoZSBwYWRkaW5nIGxlbmd0aCB0byBhbGlnbiBjb3JyZWN0bHkgd2l0aCB0aGUgbWFya2VyXG5cdFx0XHRtYXJrZXJUaXAuY3NzKHtcblx0XHRcdFx0XCJsZWZ0XCI6IGdldFBvc2l0aW9uKG1hcmtlcikgKyAnJScsXG5cdFx0XHRcdFwibWFyZ2luLWxlZnRcIjogLXBhcnNlRmxvYXQobWFya2VyVGlwLmNzcyhcIndpZHRoXCIpKSAvIDIgLSA1ICsgJ3B4Jyxcblx0XHRcdFx0XCJ2aXNpYmlsaXR5XCI6IFwidmlzaWJsZVwiXG5cdFx0XHR9KTtcblxuXHRcdH0pLm9uKCdtb3VzZW91dCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0bWFya2VyVGlwLmNzcyhcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBpbml0aWFsaXplTWFya2VyVGlwKCkge1xuXHRcdG1hcmtlclRpcCA9ICQoXCI8ZGl2IGNsYXNzPSd2anMtdGlwJz48ZGl2IGNsYXNzPSd2anMtdGlwLWFycm93Jz48L2Rpdj48ZGl2IGNsYXNzPSd2anMtdGlwLWlubmVyJz48L2Rpdj48L2Rpdj5cIik7XG5cdFx0dmlkZW9XcmFwcGVyLmZpbmQoJy52anMtcHJvZ3Jlc3MtY29udHJvbCcpLmFwcGVuZChtYXJrZXJUaXApO1xuXHR9XG5cdHZhciBsdCA9IDA7XG5cdHZhciBmeCA9IC0xO1xuXHQvLyBzaG93IG9yIGhpZGUgYnJlYWsgb3ZlcmxheXNcblx0ZnVuY3Rpb24gdXBkYXRlQnJlYWtPdmVybGF5KCkge1xuXHRcdGlmICghc2V0dGluZy5icmVha092ZXJsYXkuZGlzcGxheSB8fCBjdXJyZW50TWFya2VySW5kZXggPCAwKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIGN1cnJlbnRUaW1lID0gcGxheWVyLmN1cnJlbnRUaW1lKCk7XG5cdFx0dmFyIG1hcmtlciA9IG1hcmtlcnNMaXN0W2N1cnJlbnRNYXJrZXJJbmRleF07XG5cdFx0dmFyIG1hcmtlclRpbWUgPSBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcik7XG5cdFx0dmFyIGN0ID0gY3VycmVudFRpbWUgLSBtYXJrZXJUaW1lO1xuXHRcdFxuXHRcdC8vIGlmIChvdmVybGF5SW5kZXggPT0gLTEpIHtcblx0XHQvLyBcdC8vIGZ4ID0gY3VycmVudE1hcmtlckluZGV4O1xuXHRcdC8vIFx0aWYoZnggIT0gY3VycmVudE1hcmtlckluZGV4ICYmIGx0ID09IDApe1xuXHRcdC8vIFx0XHRsdCA9IGN1cnJlbnRUaW1lICsgc2V0dGluZy5icmVha092ZXJsYXkuZGlzcGxheVRpbWU7XG5cdFx0Ly8gXHRcdGZ4ID0gY3VycmVudE1hcmtlckluZGV4O1xuXHRcdC8vIFx0fVxuXHRcdC8vIFx0Ly8gZWxzZSBpZihsdD09MCl7XG5cdFx0Ly8gXHQvLyBcdGZ4ID0gLTE7XG5cdFx0Ly8gXHQvLyB9XG5cdFx0Ly8gXHQvL2Z4ID0gY3VycmVudE1hcmtlckluZGV4ID09IG1hcmtlcnNMaXN0Lmxlbmd0aC0xID8gLTEgOiBjdXJyZW50TWFya2VySW5kZXg7XG5cdFx0Ly8gfVxuXHRcdC8vIGlmKGN1cnJlbnRUaW1lID49IG1hcmtlclRpbWUgJiYgY3VycmVudFRpbWUgPD0gbWFya2VyVGltZSArIHNldHRpbmcuYnJlYWtPdmVybGF5LmRpc3BsYXlUaW1lKXtcblx0XHQvLyBcdGx0ID0gbWFya2VyVGltZSArIHNldHRpbmcuYnJlYWtPdmVybGF5LmRpc3BsYXlUaW1lO1xuXHRcdC8vIH1cblx0XHQvLyBlbHNle1xuXHRcdC8vIFx0bHQgPSBjdXJyZW50VGltZSArIHNldHRpbmcuYnJlYWtPdmVybGF5LmRpc3BsYXlUaW1lO1xuXHRcdC8vIH1cblx0XHRsdCA9IG1hcmtlclRpbWUgKyBzZXR0aW5nLmJyZWFrT3ZlcmxheS5kaXNwbGF5VGltZTtcblx0XHQvL2NvbnNvbGUubG9nKFwiMTExbHQ6JXN8Y3VyOiVzXCIsbHQsIGN1cnJlbnRUaW1lKTtcblx0XHQvLyBpZihjdD4wICYmIGN0PDEgJiYgc2V0dGluZy5icmVha092ZXJsYXkuZGlzcGxheVRpbWU+MCAmJiBzZXR0aW5nLmJyZWFrT3ZlcmxheS5kaXNwbGF5VGltZTwxKXtcblx0XHQvLyBcdGx0ID0gY3VycmVudFRpbWUgKyBzZXR0aW5nLmJyZWFrT3ZlcmxheS5kaXNwbGF5VGltZTtcblx0XHQvLyBcdGNvbnNvbGUubG9nKFwiMTExbHQ6JXN8Y3VyOiVzXCIsbHQsIGN1cnJlbnRUaW1lKTtcblx0XHQvLyB9ZWxzZXtcblx0XHQvLyBcdGx0ID0gbWFya2VyVGltZSArIHNldHRpbmcuYnJlYWtPdmVybGF5LmRpc3BsYXlUaW1lO1xuXHRcdC8vIFx0Y29uc29sZS5sb2coXCIyMjJsdDolc3xjdXI6JXNcIixsdCwgY3VycmVudFRpbWUpO1xuXHRcdC8vIH1cblx0XHRcblx0XHQvLyBpZihjdDwwLjUpXG5cdFx0Ly8gXHRsdCA9IG1hcmtlclRpbWUgKyAwLjU7XG5cdFx0Ly8gZWxzZVxuXHRcdC8vIFx0bHQgPSBjdXJyZW50VGltZSArIHNldHRpbmcuYnJlYWtPdmVybGF5LmRpc3BsYXlUaW1lO1xuXG5cdFx0aWYgKGN1cnJlbnRUaW1lID49IG1hcmtlclRpbWUgJiZcblx0XHRcdGN1cnJlbnRUaW1lIDw9IGx0KSB7XG5cdFx0XHRpZiAob3ZlcmxheUluZGV4ICE9IGN1cnJlbnRNYXJrZXJJbmRleCkge1xuXHRcdFx0XHRvdmVybGF5SW5kZXggPSBjdXJyZW50TWFya2VySW5kZXg7XG5cdFx0XHRcdGJyZWFrT3ZlcmxheS5maW5kKCcudmpzLWJyZWFrLW92ZXJsYXktdGV4dCcpLmh0bWwoc2V0dGluZy5icmVha092ZXJsYXkudGV4dChtYXJrZXIpKTtcblx0XHRcdH1cblxuXHRcdFx0YnJlYWtPdmVybGF5LmNzcygndmlzaWJpbGl0eScsIFwidmlzaWJsZVwiKTtcblxuXHRcdH0gZWxzZSB7XG5cdFx0XHRvdmVybGF5SW5kZXggPSAtMTtcblx0XHRcdGJyZWFrT3ZlcmxheS5jc3MoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuXHRcdFx0bHQgPSAwO1xuXHRcdFx0Ly8gaWYoY3VycmVudE1hcmtlckluZGV4ID09IG1hcmtlcnNMaXN0Lmxlbmd0aC0xKVxuXHRcdFx0Ly8gXHRmeCA9IC0yO1xuXHRcdFx0Ly8gZWxzZVxuXHRcdFx0Ly8gXHRsdCA9IDA7XG5cdFx0fVxuXHR9XG5cblx0Ly8gcHJvYmxlbSB3aGVuIHRoZSBuZXh0IG1hcmtlciBpcyB3aXRoaW4gdGhlIG92ZXJsYXkgZGlzcGxheSB0aW1lIGZyb20gdGhlIHByZXZpb3VzIG1hcmtlclxuXHRmdW5jdGlvbiBpbml0aWFsaXplT3ZlcmxheSgpIHtcblx0XHRicmVha092ZXJsYXkgPSAkKFwiPGRpdiBjbGFzcz0ndmpzLWJyZWFrLW92ZXJsYXknPjxkaXYgY2xhc3M9J3Zqcy1icmVhay1vdmVybGF5LXRleHQnPjwvZGl2PjwvZGl2PlwiKVxuXHRcdFx0LmNzcyhzZXR0aW5nLmJyZWFrT3ZlcmxheS5zdHlsZSk7XG5cdFx0dmlkZW9XcmFwcGVyLmFwcGVuZChicmVha092ZXJsYXkpO1xuXHRcdG92ZXJsYXlJbmRleCA9IC0xO1xuXHR9XG5cblx0ZnVuY3Rpb24gb25UaW1lVXBkYXRlKCkge1xuXHRcdG9uVXBkYXRlTWFya2VyKCk7XG5cdFx0dXBkYXRlQnJlYWtPdmVybGF5KCk7XG5cdH1cblxuXHRmdW5jdGlvbiBvblVwZGF0ZU1hcmtlcigpIHtcblx0XHQvKlxuXHRcdCAgICBjaGVjayBtYXJrZXIgcmVhY2hlZCBpbiBiZXR3ZWVuIG1hcmtlcnNcblx0XHQgICAgdGhlIGxvZ2ljIGhlcmUgaXMgdGhhdCBpdCB0cmlnZ2VycyBhIG5ldyBtYXJrZXIgcmVhY2hlZCBldmVudCBvbmx5IGlmIHRoZSBwbGF5ZXIgXG5cdFx0ICAgIGVudGVycyBhIG5ldyBtYXJrZXIgcmFuZ2UgKGUuZy4gZnJvbSBtYXJrZXIgMSB0byBtYXJrZXIgMikuIFRodXMsIGlmIHBsYXllciBpcyBvbiBtYXJrZXIgMSBhbmQgdXNlciBjbGlja2VkIG9uIG1hcmtlciAxIGFnYWluLCBubyBuZXcgcmVhY2hlZCBldmVudCBpcyB0cmlnZ2VyZWQpXG5cdFx0Ki9cblxuXHRcdHZhciBnZXROZXh0TWFya2VyVGltZSA9IGZ1bmN0aW9uKGluZGV4KSB7XG5cdFx0XHRpZiAoaW5kZXggPCBtYXJrZXJzTGlzdC5sZW5ndGggLSAxKSB7XG5cdFx0XHRcdHJldHVybiBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcnNMaXN0W2luZGV4ICsgMV0pO1xuXHRcdFx0fVxuXHRcdFx0Ly8gbmV4dCBtYXJrZXIgdGltZSBvZiBsYXN0IG1hcmtlciB3b3VsZCBiZSBlbmQgb2YgdmlkZW8gdGltZVxuXHRcdFx0cmV0dXJuIHBsYXllci5kdXJhdGlvbigpO1xuXHRcdH1cblx0XHR2YXIgY3VycmVudFRpbWUgPSBwbGF5ZXIuY3VycmVudFRpbWUoKTtcblx0XHR2YXIgbmV3TWFya2VySW5kZXg7XG5cblx0XHRpZiAoY3VycmVudE1hcmtlckluZGV4ICE9IC0xKSB7XG5cdFx0XHQvLyBjaGVjayBpZiBzdGF5aW5nIGF0IHNhbWUgbWFya2VyXG5cdFx0XHR2YXIgbmV4dE1hcmtlclRpbWUgPSBnZXROZXh0TWFya2VyVGltZShjdXJyZW50TWFya2VySW5kZXgpO1xuXHRcdFx0aWYgKGN1cnJlbnRUaW1lID49IHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2Vyc0xpc3RbY3VycmVudE1hcmtlckluZGV4XSkgJiZcblx0XHRcdFx0Y3VycmVudFRpbWUgPCBuZXh0TWFya2VyVGltZSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIGNoZWNrIGZvciBlbmRpbmcgKGF0IHRoZSBlbmQgY3VycmVudCB0aW1lIGVxdWFscyBwbGF5ZXIgZHVyYXRpb24pXG5cdFx0XHRpZiAoY3VycmVudE1hcmtlckluZGV4ID09PSBtYXJrZXJzTGlzdC5sZW5ndGggLSAxICYmXG5cdFx0XHRcdGN1cnJlbnRUaW1lID09PSBwbGF5ZXIuZHVyYXRpb24oKSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gY2hlY2sgZmlyc3QgbWFya2VyLCBubyBtYXJrZXIgaXMgc2VsZWN0ZWRcblx0XHRpZiAobWFya2Vyc0xpc3QubGVuZ3RoID4gMCAmJlxuXHRcdFx0Y3VycmVudFRpbWUgPCBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcnNMaXN0WzBdKSkge1xuXHRcdFx0bmV3TWFya2VySW5kZXggPSAtMTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gbG9vayBmb3IgbmV3IGluZGV4XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG1hcmtlcnNMaXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdG5leHRNYXJrZXJUaW1lID0gZ2V0TmV4dE1hcmtlclRpbWUoaSk7XG5cblx0XHRcdFx0aWYgKGN1cnJlbnRUaW1lID49IHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2Vyc0xpc3RbaV0pICYmXG5cdFx0XHRcdFx0Y3VycmVudFRpbWUgPCBuZXh0TWFya2VyVGltZSkge1xuXHRcdFx0XHRcdG5ld01hcmtlckluZGV4ID0gaTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIHNldCBuZXcgbWFya2VyIGluZGV4XG5cdFx0aWYgKG5ld01hcmtlckluZGV4ICE9IGN1cnJlbnRNYXJrZXJJbmRleCkge1xuXHRcdFx0Ly8gdHJpZ2dlciBldmVudFxuXHRcdFx0aWYgKG5ld01hcmtlckluZGV4ICE9IC0xICYmIG9wdGlvbnMub25NYXJrZXJSZWFjaGVkKSB7XG5cdFx0XHRcdG9wdGlvbnMub25NYXJrZXJSZWFjaGVkKG1hcmtlcnNMaXN0W25ld01hcmtlckluZGV4XSk7XG5cdFx0XHR9XG5cdFx0XHRjdXJyZW50TWFya2VySW5kZXggPSBuZXdNYXJrZXJJbmRleDtcblx0XHR9XG5cblx0fVxuXG5cdC8vIHNldHVwIHRoZSB3aG9sZSB0aGluZ1xuXHRmdW5jdGlvbiBpbml0aWFsaXplKCkge1xuXHRcdGlmIChzZXR0aW5nLm1hcmtlclRpcC5kaXNwbGF5KSB7XG5cdFx0XHRpbml0aWFsaXplTWFya2VyVGlwKCk7XG5cdFx0fVxuXG5cdFx0Ly8gcmVtb3ZlIGV4aXN0aW5nIG1hcmtlcnMgaWYgYWxyZWFkeSBpbml0aWFsaXplZFxuXHRcdHBsYXllci5tYXJrZXJzLnJlbW92ZUFsbCgpO1xuXHRcdGFkZE1hcmtlcnMob3B0aW9ucy5tYXJrZXJzKTtcblxuXHRcdGlmIChzZXR0aW5nLmJyZWFrT3ZlcmxheS5kaXNwbGF5KSB7XG5cdFx0XHRpbml0aWFsaXplT3ZlcmxheSgpO1xuXHRcdH1cblx0XHRvblRpbWVVcGRhdGUoKTtcblx0XHRwbGF5ZXIub24oXCJ0aW1ldXBkYXRlXCIsIG9uVGltZVVwZGF0ZSk7XG5cdH1cblxuXHQvLyBzZXR1cCB0aGUgcGx1Z2luIGFmdGVyIHdlIGxvYWRlZCB2aWRlbydzIG1ldGEgZGF0YVxuXHRwbGF5ZXIub24oXCJsb2FkZWRtZXRhZGF0YVwiLCBmdW5jdGlvbigpIHtcblx0XHRpbml0aWFsaXplKCk7XG5cdH0pO1xuXG5cdC8vIGV4cG9zZWQgcGx1Z2luIEFQSVxuXHRwbGF5ZXIubWFya2VycyA9IHtcblx0XHRnZXRNYXJrZXJzOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBtYXJrZXJzTGlzdDtcblx0XHR9LFxuXHRcdG5leHQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gZ28gdG8gdGhlIG5leHQgbWFya2VyIGZyb20gY3VycmVudCB0aW1lc3RhbXBcblx0XHRcdHZhciBjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBtYXJrZXJzTGlzdC5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHR2YXIgbWFya2VyVGltZSA9IHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2Vyc0xpc3RbaV0pO1xuXHRcdFx0XHRpZiAobWFya2VyVGltZSA+IGN1cnJlbnRUaW1lKSB7XG5cdFx0XHRcdFx0cGxheWVyLmN1cnJlbnRUaW1lKG1hcmtlclRpbWUpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRwcmV2OiBmdW5jdGlvbigpIHtcblx0XHRcdC8vIGdvIHRvIHByZXZpb3VzIG1hcmtlclxuXHRcdFx0dmFyIGN1cnJlbnRUaW1lID0gcGxheWVyLmN1cnJlbnRUaW1lKCk7XG5cdFx0XHRmb3IgKHZhciBpID0gbWFya2Vyc0xpc3QubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcblx0XHRcdFx0dmFyIG1hcmtlclRpbWUgPSBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcnNMaXN0W2ldKTtcblx0XHRcdFx0Ly8gYWRkIGEgdGhyZXNob2xkXG5cdFx0XHRcdGlmIChtYXJrZXJUaW1lICsgMC41IDwgY3VycmVudFRpbWUpIHtcblx0XHRcdFx0XHRwbGF5ZXIuY3VycmVudFRpbWUobWFya2VyVGltZSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXHRcdGFkZDogZnVuY3Rpb24obmV3TWFya2Vycykge1xuXHRcdFx0Ly8gYWRkIG5ldyBtYXJrZXJzIGdpdmVuIGFuIGFycmF5IG9mIGluZGV4XG5cdFx0XHRhZGRNYXJrZXJzKG5ld01hcmtlcnMpO1xuXHRcdH0sXG5cdFx0cmVtb3ZlOiBmdW5jdGlvbihpbmRleEFycmF5KSB7XG5cdFx0XHQvLyByZW1vdmUgbWFya2VycyBnaXZlbiBhbiBhcnJheSBvZiBpbmRleFxuXHRcdFx0cmVtb3ZlTWFya2VycyhpbmRleEFycmF5KTtcblx0XHR9LFxuXHRcdHJlbW92ZUFsbDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgaW5kZXhBcnJheSA9IFtdO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBtYXJrZXJzTGlzdC5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpbmRleEFycmF5LnB1c2goaSk7XG5cdFx0XHR9XG5cdFx0XHRyZW1vdmVNYXJrZXJzKGluZGV4QXJyYXkpO1xuXHRcdH0sXG5cdFx0dXBkYXRlVGltZTogZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBub3RpZnkgdGhlIHBsdWdpbiB0byB1cGRhdGUgdGhlIFVJIGZvciBjaGFuZ2VzIGluIG1hcmtlciB0aW1lcyBcblx0XHRcdHVwZGF0ZU1hcmtlcnMoKTtcblx0XHR9LFxuXHRcdHJlc2V0OiBmdW5jdGlvbihuZXdNYXJrZXJzKSB7XG5cdFx0XHQvLyByZW1vdmUgYWxsIHRoZSBleGlzdGluZyBtYXJrZXJzIGFuZCBhZGQgbmV3IG9uZXNcblx0XHRcdHBsYXllci5tYXJrZXJzLnJlbW92ZUFsbCgpO1xuXHRcdFx0YWRkTWFya2VycyhuZXdNYXJrZXJzKTtcblx0XHR9LFxuXHRcdGRlc3Ryb3k6IGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gdW5yZWdpc3RlciB0aGUgcGx1Z2lucyBhbmQgY2xlYW4gdXAgZXZlbiBoYW5kbGVyc1xuXHRcdFx0cGxheWVyLm1hcmtlcnMucmVtb3ZlQWxsKCk7XG5cdFx0XHRicmVha092ZXJsYXkucmVtb3ZlKCk7XG5cdFx0XHRtYXJrZXJUaXAucmVtb3ZlKCk7XG5cdFx0XHRwbGF5ZXIub2ZmKFwidGltZXVwZGF0ZVwiLCB1cGRhdGVCcmVha092ZXJsYXkpO1xuXHRcdFx0ZGVsZXRlIHBsYXllci5tYXJrZXJzO1xuXHRcdH0sXG5cdH07XG59O1xuXG4vKipcbiAqIOawtOWNsFxuICogQHBhcmFtIHtbdHlwZV19IG9wdGlvbnMgW2Rlc2NyaXB0aW9uXVxuICogcmV0dXJuIHtbdHlwZV19ICBbZGVzY3JpcHRpb25dXG4gKi9cbmNvbnN0IHdhdGVyTWFyayA9IGZ1bmN0aW9uKHNldHRpbmdzKSB7XG5cdHZhciBkZWZhdWx0cyA9IHtcblx0XHRcdGZpbGU6ICdsb2dvLnBuZycsXG5cdFx0XHR4cG9zOiAwLFxuXHRcdFx0eXBvczogMCxcblx0XHRcdHhyZXBlYXQ6IDAsXG5cdFx0XHRvcGFjaXR5OiAxMDAsXG5cdFx0XHRjbGlja2FibGU6IGZhbHNlLFxuXHRcdFx0dXJsOiBcIlwiLFxuXHRcdFx0Y2xhc3NOYW1lOiAndmpzLXdhdGVybWFyaycsXG5cdFx0XHR0ZXh0OiBmYWxzZSxcblx0XHRcdGRlYnVnOiBmYWxzZVxuXHRcdH0sXG5cdFx0ZXh0ZW5kID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgYXJncywgdGFyZ2V0LCBpLCBvYmplY3QsIHByb3BlcnR5O1xuXHRcdFx0YXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG5cdFx0XHR0YXJnZXQgPSBhcmdzLnNoaWZ0KCkgfHwge307XG5cdFx0XHRmb3IgKGkgaW4gYXJncykge1xuXHRcdFx0XHRvYmplY3QgPSBhcmdzW2ldO1xuXHRcdFx0XHRmb3IgKHByb3BlcnR5IGluIG9iamVjdCkge1xuXHRcdFx0XHRcdGlmIChvYmplY3QuaGFzT3duUHJvcGVydHkocHJvcGVydHkpKSB7XG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIG9iamVjdFtwcm9wZXJ0eV0gPT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdFx0XHRcdHRhcmdldFtwcm9wZXJ0eV0gPSBleHRlbmQodGFyZ2V0W3Byb3BlcnR5XSwgb2JqZWN0W3Byb3BlcnR5XSk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHR0YXJnZXRbcHJvcGVydHldID0gb2JqZWN0W3Byb3BlcnR5XTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiB0YXJnZXQ7XG5cdFx0fTtcblxuXHQvLyEgZ2xvYmFsIHZhcmlibGUgY29udGFpbmluZyByZWZlcmVuY2UgdG8gdGhlIERPTSBlbGVtZW50XG5cdHZhciBkaXY7XG5cblx0Ly8gdmFyIHNldHRpbmdzID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBvcHRpb25zKTtcblxuXHRpZiAoc2V0dGluZ3MuZGVidWcpIGNvbnNvbGUubG9nKCd3YXRlcm1hcms6IFJlZ2lzdGVyIGluaXQnKTtcblxuXHR2YXIgb3B0aW9ucywgcGxheWVyLCB2aWRlbywgaW1nLCBsaW5rO1xuXHRvcHRpb25zID0gZXh0ZW5kKGRlZmF1bHRzLCBzZXR0aW5ncyk7XG5cblx0LyogR3JhYiB0aGUgbmVjZXNzYXJ5IERPTSBlbGVtZW50cyAqL1xuXHRwbGF5ZXIgPSB0aGlzLmVsKCk7XG5cdHZpZGVvID0gdGhpcy5lbCgpLmdldEVsZW1lbnRzQnlUYWdOYW1lKCd2aWRlbycpWzBdO1xuXG5cdC8vIGNyZWF0ZSB0aGUgd2F0ZXJtYXJrIGVsZW1lbnRcblx0aWYgKCFkaXYpIHtcblx0XHRkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRkaXYuY2xhc3NOYW1lID0gb3B0aW9ucy5jbGFzc05hbWU7XG5cdH0gZWxzZSB7XG5cdFx0Ly8hIGlmIGRpdiBhbHJlYWR5IGV4aXN0cywgZW1wdHkgaXRcblx0XHRkaXYuaW5uZXJIVE1MID0gJyc7XG5cdH1cblxuXHQvLyBpZiB0ZXh0IGlzIHNldCwgZGlzcGxheSB0ZXh0XG5cdGlmIChvcHRpb25zLnRleHQpXG5cdFx0ZGl2LnRleHRDb250ZW50ID0gb3B0aW9ucy50ZXh0O1xuXG5cdC8vIGlmIGltZyBpcyBzZXQsIGFkZCBpbWdcblx0aWYgKG9wdGlvbnMuZmlsZSkge1xuXHRcdGltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuXHRcdGRpdi5hcHBlbmRDaGlsZChpbWcpO1xuXHRcdGRpdi5zdHlsZS5kaXNwbGF5ID0gXCJpbmxpbmUtYmxvY2tcIjtcblx0XHRkaXYuc3R5bGUucG9zaXRpb24gPSBcImFic29sdXRlXCI7XG5cdFx0ZGl2LnN0eWxlLnpJbmRleCA9IDA7XG5cdFx0aW1nLnNyYyA9IG9wdGlvbnMuZmlsZTtcblx0fVxuXHQvL2ltZy5zdHlsZS5ib3R0b20gPSBcIjBcIjtcblx0Ly9pbWcuc3R5bGUucmlnaHQgPSBcIjBcIjtcblx0aWYgKChvcHRpb25zLnlwb3MgPT09IDApICYmIChvcHRpb25zLnhwb3MgPT09IDApKSAvLyBUb3AgbGVmdFxuXHR7XG5cdFx0ZGl2LnN0eWxlLnRvcCA9IFwiMHB4XCI7XG5cdFx0ZGl2LnN0eWxlLmxlZnQgPSBcIjBweFwiO1xuXHR9IGVsc2UgaWYgKChvcHRpb25zLnlwb3MgPT09IDApICYmIChvcHRpb25zLnhwb3MgPT09IDEwMCkpIC8vIFRvcCByaWdodFxuXHR7XG5cdFx0ZGl2LnN0eWxlLnRvcCA9IFwiMHB4XCI7XG5cdFx0ZGl2LnN0eWxlLnJpZ2h0ID0gXCIwcHhcIjtcblx0fSBlbHNlIGlmICgob3B0aW9ucy55cG9zID09PSAxMDApICYmIChvcHRpb25zLnhwb3MgPT09IDEwMCkpIC8vIEJvdHRvbSByaWdodFxuXHR7XG5cdFx0ZGl2LnN0eWxlLmJvdHRvbSA9IFwiMHB4XCI7XG5cdFx0ZGl2LnN0eWxlLnJpZ2h0ID0gXCIwcHhcIjtcblx0fSBlbHNlIGlmICgob3B0aW9ucy55cG9zID09PSAxMDApICYmIChvcHRpb25zLnhwb3MgPT09IDApKSAvLyBCb3R0b20gbGVmdFxuXHR7XG5cdFx0ZGl2LnN0eWxlLmJvdHRvbSA9IFwiMHB4XCI7XG5cdFx0ZGl2LnN0eWxlLmxlZnQgPSBcIjBweFwiO1xuXHR9IGVsc2UgaWYgKChvcHRpb25zLnlwb3MgPT09IDUwKSAmJiAob3B0aW9ucy54cG9zID09PSA1MCkpIC8vIENlbnRlclxuXHR7XG5cdFx0aWYgKG9wdGlvbnMuZGVidWcpIGNvbnNvbGUubG9nKCd3YXRlcm1hcms6IHBsYXllcjonICsgcGxheWVyLndpZHRoICsgJ3gnICsgcGxheWVyLmhlaWdodCk7XG5cdFx0aWYgKG9wdGlvbnMuZGVidWcpIGNvbnNvbGUubG9nKCd3YXRlcm1hcms6IHZpZGVvOicgKyB2aWRlby52aWRlb1dpZHRoICsgJ3gnICsgdmlkZW8udmlkZW9IZWlnaHQpO1xuXHRcdGlmIChvcHRpb25zLmRlYnVnKSBjb25zb2xlLmxvZygnd2F0ZXJtYXJrOiBpbWFnZTonICsgaW1nLndpZHRoICsgJ3gnICsgaW1nLmhlaWdodCk7XG5cdFx0ZGl2LnN0eWxlLnRvcCA9ICh0aGlzLmhlaWdodCgpIC8gMikgKyBcInB4XCI7XG5cdFx0ZGl2LnN0eWxlLmxlZnQgPSAodGhpcy53aWR0aCgpIC8gMikgKyBcInB4XCI7XG5cdH1cblx0ZGl2LnN0eWxlLm9wYWNpdHkgPSBvcHRpb25zLm9wYWNpdHk7XG5cblx0Ly9kaXYuc3R5bGUuYmFja2dyb3VuZEltYWdlID0gXCJ1cmwoXCIrb3B0aW9ucy5maWxlK1wiKVwiO1xuXHQvL2Rpdi5zdHlsZS5iYWNrZ3JvdW5kUG9zaXRpb24ueCA9IG9wdGlvbnMueHBvcytcIiVcIjtcblx0Ly9kaXYuc3R5bGUuYmFja2dyb3VuZFBvc2l0aW9uLnkgPSBvcHRpb25zLnlwb3MrXCIlXCI7XG5cdC8vZGl2LnN0eWxlLmJhY2tncm91bmRSZXBlYXQgPSBvcHRpb25zLnhyZXBlYXQ7XG5cdC8vZGl2LnN0eWxlLm9wYWNpdHkgPSAob3B0aW9ucy5vcGFjaXR5LzEwMCk7XG5cblx0Ly9pZiB1c2VyIHdhbnRzIHdhdGVybWFyayB0byBiZSBjbGlja2FibGUsIGFkZCBhbmNob3IgZWxlbVxuXHQvL3RvZG86IGNoZWNrIGlmIG9wdGlvbnMudXJsIGlzIGFuIGFjdHVhbCB1cmw/XG5cdGlmIChvcHRpb25zLmNsaWNrYWJsZSAmJiBvcHRpb25zLnVybCAhPT0gXCJcIikge1xuXHRcdGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYVwiKTtcblx0XHRsaW5rLmhyZWYgPSBvcHRpb25zLnVybDtcblx0XHRsaW5rLnRhcmdldCA9IFwiX2JsYW5rXCI7XG5cdFx0bGluay5hcHBlbmRDaGlsZChkaXYpO1xuXHRcdC8vYWRkIGNsaWNrYWJsZSB3YXRlcm1hcmsgdG8gdGhlIHBsYXllclxuXHRcdHBsYXllci5hcHBlbmRDaGlsZChsaW5rKTtcblx0fSBlbHNlIHtcblx0XHQvL2FkZCBub3JtYWwgd2F0ZXJtYXJrIHRvIHRoZSBwbGF5ZXJcblx0XHRwbGF5ZXIuYXBwZW5kQ2hpbGQoZGl2KTtcblx0fVxuXG5cdGlmIChvcHRpb25zLmRlYnVnKSBjb25zb2xlLmxvZygnd2F0ZXJtYXJrOiBSZWdpc3RlciBlbmQnKTtcbn07XG5cbi8vIC8qKlxuLy8gICog5oiq5Zu+XG4vLyAgKiBAcGFyYW0ge1t0eXBlXX0gb3B0aW9ucyBbZGVzY3JpcHRpb25dXG4vLyAgKiByZXR1cm4ge1t0eXBlXX0gIFtkZXNjcmlwdGlvbl1cbi8vICAqL1xuLy8gY29uc3Qgc25hcHNob3QgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4vLyAvLyBcdFwidXNlIHN0cmljdFwiO1xuXG4vLyBcdC8vIGdsb2JhbHNcbi8vIFx0dmFyIHBsYXllciA9IHRoaXM7XG4vLyBcdHZhciB2aWRlbyA9IHBsYXllci5lbCgpLnF1ZXJ5U2VsZWN0b3IoJ3ZpZGVvJyk7XG4vLyBcdHZhciBjb250YWluZXIsIHNjYWxlO1xuLy8gXHQvL0ZJWE1FOiBhZGQgc29tZSBraW5kIG9mIGFzc2VydCBmb3IgdmlkZW8sIGlmIGZsYXNoIGlzIHVzZWQgaXQncyBub3Qgd29ya2luZ1xuXG4vLyBcdC8vVE9ETzogYWRkIGJldHRlciBwcmVmaXggZm9yIGFsbCBuZXcgY3NzIGNsYXNzLCBwcm9iYWJseSB2anMtc25hcHNob3Rcbi8vIFx0Ly9UT0RPOiBicmVhayB0aGlzIGxhcmdlIGZpbGUgdXAgaW50byBzbWFsbGVyIG9uZXMsIGUuZy4gY29udGFpbmVyLCAuLi5cbi8vIFx0Ly9UT0RPOiBtYWtlIGl0IHBvc3NpYmxlIHRvIGRyYWcgYm94ZXMgYWxzbyBmcm9tIGJvdHRvbSByaWdodCB0byB0b3AgbGVmdFxuXG4vLyBcdGZ1bmN0aW9uIHVwZGF0ZVNjYWxlKCl7XG4vLyBcdFx0dmFyIHJlY3QgPSB2aWRlby5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbi8vIFx0XHR2YXIgc2NhbGV3ID0gY2FudmFzX2RyYXcuZWwoKS53aWR0aCAvIHJlY3Qud2lkdGg7XG4vLyBcdFx0dmFyIHNjYWxlaCA9IGNhbnZhc19kcmF3LmVsKCkuaGVpZ2h0IC8gcmVjdC5oZWlnaHQ7XG4vLyBcdFx0c2NhbGUgPSBNYXRoLm1heChNYXRoLm1heChzY2FsZXcsIHNjYWxlaCksIDEpO1xuLy8gXHRcdHNjYWxlX3R4dC5lbCgpLmlubmVySFRNTCA9IChNYXRoLnJvdW5kKDEvc2NhbGUqMTAwKS8xMDApICtcInhcIjtcbi8vIFx0fVxuXG4vLyBcdC8vIHRha2Ugc25hcHNob3Qgb2YgdmlkZW8gYW5kIHNob3cgYWxsIGRyYXdpbmcgZWxlbWVudHNcbi8vIFx0Ly8gYWRkZWQgdG8gcGxheWVyIG9iamVjdCB0byBiZSBjYWxsYWJsZSBmcm9tIG91dHNpZGUsIGUuZy4gc2hvcnRjdXRcbi8vIFx0cGxheWVyLnNuYXAgPSBmdW5jdGlvbigpe1xuLy8gXHRcdHBsYXllci5wYXVzZSgpO1xuLy8gXHRcdC8vIGxvb3NlIGtleWJvYXJkIGZvY3VzXG4vLyBcdFx0cGxheWVyLmVsKCkuYmx1cigpO1xuLy8gXHRcdC8vIHN3aXRjaCBjb250cm9sIGJhciB0byBkcmF3aW5nIGNvbnRyb2xzXG4vLyBcdFx0cGxheWVyLmNvbnRyb2xCYXIuaGlkZSgpO1xuLy8gXHRcdGRyYXdDdHJsLnNob3coKTtcbi8vIFx0XHQvLyBkaXNwbGF5IGNhbnZhc1xuLy8gXHRcdHBhcmVudC5zaG93KCk7XG5cbi8vIFx0XHQvLyBjYW52YXMgZm9yIGRyYXdpbmcsIGl0J3Mgc2VwYXJhdGUgZnJvbSBzbmFwc2hvdCBiZWNhdXNlIG9mIGRlbGV0ZVxuLy8gXHRcdGNhbnZhc19kcmF3LmVsKCkud2lkdGggPSB2aWRlby52aWRlb1dpZHRoO1xuLy8gXHRcdGNhbnZhc19kcmF3LmVsKCkuaGVpZ2h0ID0gdmlkZW8udmlkZW9IZWlnaHQ7XG4vLyBcdFx0Y29udGV4dF9kcmF3LnN0cm9rZVN0eWxlID0gY29sb3IuZWwoKS52YWx1ZTtcbi8vIFx0XHRjb250ZXh0X2RyYXcubGluZVdpZHRoID0gc2l6ZS5lbCgpLnZhbHVlIC8gMjtcbi8vIFx0XHRjb250ZXh0X2RyYXcubGluZUNhcCA9IFwicm91bmRcIjtcbi8vIFx0XHQvLyBjYWxjdWxhdGUgc2NhbGVcbi8vIFx0XHR1cGRhdGVTY2FsZSgpO1xuXG4vLyBcdFx0Ly8gYmFja2dyb3VuZCBjYW52YXMgY29udGFpbmluZyBzbmFwc2hvdCBmcm9tIHZpZGVvXG4vLyBcdFx0Y2FudmFzX2JnLmVsKCkud2lkdGggPSB2aWRlby52aWRlb1dpZHRoO1xuLy8gXHRcdGNhbnZhc19iZy5lbCgpLmhlaWdodCA9IHZpZGVvLnZpZGVvSGVpZ2h0O1xuLy8gXHRcdGNvbnRleHRfYmcuZHJhd0ltYWdlKHZpZGVvLCAwLCAwKTtcblxuLy8gXHRcdC8vIHN0aWxsIGZpdCBpbnRvIHBsYXllciBlbGVtZW50XG4vLyBcdFx0dmFyIHJlY3QgPSB2aWRlby5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTsgLy8gdXNlIGJvdW5kaW5nIHJlY3QgaW5zdGVhZCBvZiBwbGF5ZXIud2lkdGgvaGVpZ2h0IGJlY2F1c2Ugb2YgZnVsbHNjcmVlblxuLy8gXHRcdGNhbnZhc19kcmF3LmVsKCkuc3R5bGUubWF4V2lkdGggID0gcmVjdC53aWR0aCAgK1wicHhcIjtcbi8vIFx0XHRjYW52YXNfZHJhdy5lbCgpLnN0eWxlLm1heEhlaWdodCA9IHJlY3QuaGVpZ2h0ICtcInB4XCI7XG4vLyBcdFx0Y2FudmFzX2JnLmVsKCkuc3R5bGUubWF4V2lkdGggID0gcmVjdC53aWR0aCAgK1wicHhcIjtcbi8vIFx0XHRjYW52YXNfYmcuZWwoKS5zdHlsZS5tYXhIZWlnaHQgPSByZWN0LmhlaWdodCArXCJweFwiO1xuLy8gXHR9O1xuLy8gXHQvLyBjYW1lcmEgaWNvbiBvbiBub3JtYWwgcGxheWVyIGNvbnRyb2wgYmFyXG4vLyBcdHZhciBzbmFwX2J0biA9IHBsYXllci5jb250cm9sQmFyLmFkZENoaWxkKCdidXR0b24nKTtcbi8vIFx0c25hcF9idG4uYWRkQ2xhc3MoXCJ2anMtc25hcHNob3QtYnV0dG9uXCIpO1xuLy8gXHRzbmFwX2J0bi5lbCgpLnRpdGxlID0gXCJUYWtlIHNuYXBzaG90XCI7XG4vLyBcdHNuYXBfYnRuLm9uKCdjbGljaycsIHBsYXllci5zbmFwKTtcblxuLy8gXHQvLyBkcmF3aW5nIGNvbnRyb2xzXG5cbi8vIFx0Ly8gYWRkIGNhbnZhcyBwYXJlbnQgY29udGFpbmVyIGJlZm9yZSBkcmF3IGNvbnRyb2wgYmFyLCBzbyBiYXIgZ2V0cyBvbiB0b3Bcbi8vIFx0dmFyIHBhcmVudCA9IHBsYXllci5hZGRDaGlsZChcbi8vIFx0XHRuZXcgdmlkZW9qcy5Db21wb25lbnQocGxheWVyLCB7XG4vLyBcdFx0XHRlbDogdmlkZW9qcy5Db21wb25lbnQucHJvdG90eXBlLmNyZWF0ZUVsKG51bGwsIHtcbi8vIFx0XHRcdFx0Y2xhc3NOYW1lOiAndmpzLWNhbnZhcy1wYXJlbnQnIC8qVE9ETyovXG4vLyBcdFx0XHR9KSxcbi8vIFx0XHR9KVxuLy8gXHQpO1xuXG4vLyBcdC8vZHJhdyBjb250cm9sIGJhclxuLy8gXHR2YXIgZHJhd0N0cmwgPSBwbGF5ZXIuYWRkQ2hpbGQoXG4vLyBcdFx0bmV3IHZpZGVvanMuQ29tcG9uZW50KHBsYXllciwge1xuLy8gXHRcdFx0ZWw6IHZpZGVvanMuQ29tcG9uZW50LnByb3RvdHlwZS5jcmVhdGVFbChudWxsLCB7XG4vLyBcdFx0XHRcdGNsYXNzTmFtZTogJ3Zqcy1jb250cm9sLWJhciB2anMtZHJhd2luZy1jdHJsJyxcbi8vIFx0XHRcdH0pLFxuLy8gXHRcdH0pXG4vLyBcdCk7XG4vLyBcdGRyYXdDdHJsLmhpZGUoKTtcblxuLy8gXHQvLyBjaG9vc2UgY29sb3IsIHVzZWQgZXZlcnl3aGVyZTogcGFpbnRpbmcsIGJvcmRlciBjb2xvciBvZiBjcm9wYm94LCAuLi5cbi8vIFx0dmFyIGNvbG9yID0gZHJhd0N0cmwuYWRkQ2hpbGQoXG4vLyBcdFx0bmV3IHZpZGVvanMuQ29tcG9uZW50KHBsYXllciwge1xuLy8gXHRcdFx0ZWw6IHZpZGVvanMuQ29tcG9uZW50LnByb3RvdHlwZS5jcmVhdGVFbCgnaW5wdXQnLCB7XG4vLyBcdFx0XHRcdGNsYXNzTmFtZTogJ3Zqcy1jb250cm9sJywgdHlwZTogJ2NvbG9yJywgdmFsdWU6ICcjZGY0YjI2JywgdGl0bGU6ICdjb2xvcidcbi8vIFx0XHRcdH0pLFxuLy8gXHRcdH0pXG4vLyBcdCk7XG4vLyBcdGNvbG9yLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbihlKXtcbi8vIFx0XHRjb250ZXh0X2RyYXcuc3Ryb2tlU3R5bGUgPSBjb2xvci5lbCgpLnZhbHVlO1xuLy8gXHR9KTtcblxuLy8gXHQvLyBjaG9vc2Ugc2l6ZSwgdXNlZCBldmVyeXdoZXJlOiBsaW5lIHdpZHRoLCB0ZXh0IHNpemVcbi8vIFx0dmFyIHNpemUgPSBkcmF3Q3RybC5hZGRDaGlsZChcbi8vIFx0XHRuZXcgdmlkZW9qcy5Db21wb25lbnQocGxheWVyLCB7XG4vLyBcdFx0XHRlbDogdmlkZW9qcy5Db21wb25lbnQucHJvdG90eXBlLmNyZWF0ZUVsKCdpbnB1dCcsIHtcbi8vIFx0XHRcdFx0Y2xhc3NOYW1lOiAndmpzLWNvbnRyb2wnLCB0eXBlOiAnbnVtYmVyJywgdmFsdWU6ICcxMCcsIHRpdGxlOiAnbGluZSB3aWR0aCwgdGV4dCBzaXplLCAuLi4nXG4vLyBcdFx0XHR9KSxcbi8vIFx0XHR9KVxuLy8gXHQpO1xuLy8gXHRzaXplLm9uKCdrZXlkb3duJywgZnVuY3Rpb24oZSl7IC8vIGRvbid0IGZpcmUgcGxheWVyIHNob3J0Y3V0cyB3aGVuIHNpemUgaW5wdXQgaGFzIGZvY3VzXG4vLyBcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcbi8vIFx0fSk7XG4vLyBcdHNpemUub24oJ2NoYW5nZScsIGZ1bmN0aW9uKGUpe1xuLy8gXHRcdGNvbnRleHRfZHJhdy5saW5lV2lkdGggPSBzaXplLmVsKCkudmFsdWUgLyAyO1xuLy8gXHR9KTtcblxuLy8gXHR2YXIgdG9vbCA9ICdicnVzaCc7XG4vLyBcdGZ1bmN0aW9uIHRvb2xDaGFuZ2UoZXZlbnQpe1xuLy8gXHRcdHZhciBhY3RpdmVfdG9vbCA9IGRyYXdDdHJsLmVsKCkucXVlcnlTZWxlY3RvcignLnZqcy10b29sLWFjdGl2ZScpO1xuLy8gXHRcdGFjdGl2ZV90b29sLmNsYXNzTGlzdC5yZW1vdmUoJ3Zqcy10b29sLWFjdGl2ZScpO1xuLy8gXHRcdGV2ZW50LnRhcmdldC5jbGFzc0xpc3QuYWRkKCd2anMtdG9vbC1hY3RpdmUnKTtcbi8vIFx0XHR0b29sID0gZXZlbnQudGFyZ2V0LmRhdGFzZXQudmFsdWU7XG4vLyBcdFx0Ly8gYWx3YXlzIGhpZGUgY3JvcGJveCwgdGV4dGJveCBpcyBoaWRkZW4gYXV0b21hdGljYWxseSBhcyBpdCBibHVyc1xuLy8gXHRcdGNyb3Bib3guaGlkZSgpO1xuLy8gXHR9XG4vLyBcdHZpZGVvanMuVG9vbEJ1dHRvbiA9IHZpZGVvanMuQnV0dG9uLmV4dGVuZCh7XG4vLyBcdFx0aW5pdDogZnVuY3Rpb24ocCwgb3B0aW9ucykge1xuLy8gXHRcdFx0dmlkZW9qcy5CdXR0b24uY2FsbCh0aGlzLCBwLCBvcHRpb25zKTtcblxuLy8gXHRcdFx0dGhpcy5hZGRDbGFzcyhcInZqcy1kcmF3aW5nLVwiKyBvcHRpb25zLnRvb2wpO1xuLy8gXHRcdFx0dGhpcy5lbCgpLmRhdGFzZXQudmFsdWUgPSBvcHRpb25zLnRvb2w7XG4vLyBcdFx0XHR0aGlzLmVsKCkudGl0bGUgPSBvcHRpb25zLnRpdGxlO1xuXG4vLyBcdFx0XHR0aGlzLm9uKCdjbGljaycsIHRvb2xDaGFuZ2UpO1xuLy8gXHRcdH1cbi8vIFx0fSk7XG4vLyBcdHZhciBicnVzaCAgPSBkcmF3Q3RybC5hZGRDaGlsZChuZXcgdmlkZW9qcy5Ub29sQnV0dG9uKHBsYXllciwge3Rvb2w6IFwiYnJ1c2hcIiwgdGl0bGU6IFwiZnJlZWhhbmQgZHJhd2luZ1wifSkpO1xuLy8gXHRicnVzaC5hZGRDbGFzcyhcInZqcy10b29sLWFjdGl2ZVwiKTtcbi8vIFx0dmFyIHJlY3QgICA9IGRyYXdDdHJsLmFkZENoaWxkKG5ldyB2aWRlb2pzLlRvb2xCdXR0b24ocGxheWVyLCB7dG9vbDogXCJyZWN0XCIsICB0aXRsZTogXCJkcmF3IHJlY3RhbmdsZSBmcm9tIHRvcCBsZWZ0IHRvIGJvdHRvbSByaWdodFwifSkpO1xuLy8gXHR2YXIgY3JvcCAgID0gZHJhd0N0cmwuYWRkQ2hpbGQobmV3IHZpZGVvanMuVG9vbEJ1dHRvbihwbGF5ZXIsIHt0b29sOiBcImNyb3BcIiwgIHRpdGxlOiBcInNlbGVjdCBhcmVhIGFuZCBjbGljayBzZWxlY3Rpb24gdG8gY3JvcFwifSkpO1xuLy8gXHR2YXIgdGV4dCAgID0gZHJhd0N0cmwuYWRkQ2hpbGQobmV3IHZpZGVvanMuVG9vbEJ1dHRvbihwbGF5ZXIsIHt0b29sOiBcInRleHRcIiwgIHRpdGxlOiBcInNlbGVjdCBhcmVhLCB0eXBlIG1lc3NhZ2UgYW5kIHRoZW4gY2xpY2sgc29tZXdoZXJlIGVsc2VcIn0pKTtcbi8vIFx0dmFyIGVyYXNlciA9IGRyYXdDdHJsLmFkZENoaWxkKG5ldyB2aWRlb2pzLlRvb2xCdXR0b24ocGxheWVyLCB7dG9vbDogXCJlcmFzZXJcIix0aXRsZTogXCJlcmFzZSBkcmF3aW5nIGluIGNsaWNrZWQgbG9jYXRpb25cIn0pKTtcblxuLy8gXHR2YXIgc2NhbGVyID0gZHJhd0N0cmwuYWRkQ2hpbGQoXG4vLyBcdFx0bmV3IHZpZGVvanMuQ29tcG9uZW50KHBsYXllciwge1xuLy8gXHRcdFx0ZWw6IHZpZGVvanMuQ29tcG9uZW50LnByb3RvdHlwZS5jcmVhdGVFbChudWxsLCB7XG4vLyBcdFx0XHRcdGNsYXNzTmFtZTogJ3Zqcy1jb250cm9sIHZqcy1kcmF3aW5nLXNjYWxlcicsIHRpdGxlOiAnc2NhbGUgaW1hZ2UnXG4vLyBcdFx0XHR9KVxuLy8gXHRcdH0pXG4vLyBcdCk7XG4vLyBcdHNjYWxlci5vbignY2xpY2snLCBmdW5jdGlvbihlKXtcbi8vIFx0XHR2YXIgdyA9IGNhbnZhc19kcmF3LmVsKCkud2lkdGgsIGggPSBjYW52YXNfZHJhdy5lbCgpLmhlaWdodDtcbi8vIFx0XHR2YXIgc2NhbGV3ID0gd2luZG93LnByb21wdChcIkN1cnJlbnQgaW1hZ2Ugc2l6ZSBpcyBcIit3K1wieFwiK2grXCIgLiBOZXcgd2lkdGg/XCIsIHcpO1xuLy8gXHRcdHNjYWxldyA9IHBhcnNlSW50KHNjYWxldywgMTApO1xuLy8gXHRcdGlmKCFpc05hTihzY2FsZXcpKXtcbi8vIFx0XHRcdHZhciBmYWN0b3IgPSBzY2FsZXcgLyB3O1xuLy8gXHRcdFx0dmFyIHdpZHRoICA9IGZhY3RvciAqIHcgfDA7XG4vLyBcdFx0XHR2YXIgaGVpZ2h0ID0gZmFjdG9yICogaCB8MDtcblxuLy8gXHRcdFx0dmFyIHIgPSBzY2FsZUNyb3BDYW52YXMoMCwgMCwgdywgaCwgd2lkdGgsIGhlaWdodCwgY2FudmFzX2JnLCBjb250ZXh0X2JnKTtcbi8vIFx0XHRcdGNhbnZhc19iZyA9IHJbMF07IGNvbnRleHRfYmcgPSByWzFdO1xuLy8gXHRcdFx0ciA9IHNjYWxlQ3JvcENhbnZhcygwLCAwLCB3LCBoLCB3aWR0aCwgaGVpZ2h0LCBjYW52YXNfZHJhdywgY29udGV4dF9kcmF3KTtcbi8vIFx0XHRcdGNhbnZhc19kcmF3ID0gclswXTsgY29udGV4dF9kcmF3ID0gclsxXTtcbi8vIFx0XHRcdHVwZGF0ZVNjYWxlKCk7XG4vLyBcdFx0fVxuLy8gXHRcdC8vIGp1c3QgaWdub3JlXG4vLyBcdH0pO1xuXG4vLyBcdGZ1bmN0aW9uIGNvbWJpbmVEcmF3aW5nKGVuY29kaW5nKXtcbi8vIFx0XHQvL2JsaXQgY2FudmFzIGFuZCBvcGVuIG5ldyB0YWIgd2l0aCBpbWFnZVxuLy8gXHRcdHZhciBjYW52YXNfdG1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4vLyBcdFx0Y2FudmFzX3RtcC53aWR0aCA9IGNhbnZhc19kcmF3LmVsKCkud2lkdGg7XG4vLyBcdFx0Y2FudmFzX3RtcC5oZWlnaHQgPSBjYW52YXNfZHJhdy5lbCgpLmhlaWdodDtcbi8vIFx0XHR2YXIgY3R4X3RtcCA9IGNhbnZhc190bXAuZ2V0Q29udGV4dChcIjJkXCIpO1xuLy8gXHRcdGN0eF90bXAuZHJhd0ltYWdlKGNhbnZhc19iZy5lbCgpLCAwLCAwKTtcbi8vIFx0XHRjdHhfdG1wLmRyYXdJbWFnZShjYW52YXNfZHJhdy5lbCgpLCAwLCAwKTtcbi8vIFx0XHR3aW5kb3cub3BlbihjYW52YXNfdG1wLnRvRGF0YVVSTChlbmNvZGluZykpO1xuLy8gXHR9XG5cbi8vIFx0dmFyIGRsanBlZyA9IGRyYXdDdHJsLmFkZENoaWxkKFxuLy8gXHRcdG5ldyB2aWRlb2pzLkNvbXBvbmVudChwbGF5ZXIsIHtcbi8vIFx0XHRcdGVsOiB2aWRlb2pzLkNvbXBvbmVudC5wcm90b3R5cGUuY3JlYXRlRWwobnVsbCwge1xuLy8gXHRcdFx0XHRjbGFzc05hbWU6ICd2anMtY29udHJvbCB2anMtYnV0dG9uJywgaW5uZXJIVE1MOiAnSlBFRycsIHRpdGxlOiAnb3BlbiBuZXcgdGFiIHdpdGgganBlZyBpbWFnZSdcbi8vIFx0XHRcdH0pLFxuLy8gXHRcdH0pXG4vLyBcdCk7XG4vLyBcdGRsanBlZy5vbignY2xpY2snLCBmdW5jdGlvbigpeyBjb21iaW5lRHJhd2luZyhcImltYWdlL2pwZWdcIik7IH0pO1xuLy8gXHR2YXIgZGxwbmcgPSBkcmF3Q3RybC5hZGRDaGlsZChcbi8vIFx0XHRuZXcgdmlkZW9qcy5Db21wb25lbnQocGxheWVyLCB7XG4vLyBcdFx0XHRlbDogdmlkZW9qcy5Db21wb25lbnQucHJvdG90eXBlLmNyZWF0ZUVsKG51bGwsIHtcbi8vIFx0XHRcdFx0Y2xhc3NOYW1lOiAndmpzLWNvbnRyb2wgdmpzLWJ1dHRvbicsIGlubmVySFRNTDogJ1BORycsIHRpdGxlOiAnb3BlbiBuZXcgdGFiIHdpdGggcG5nIGltYWdlJ1xuLy8gXHRcdFx0fSksXG4vLyBcdFx0fSlcbi8vIFx0KTtcbi8vIFx0ZGxwbmcub24oJ2NsaWNrJywgZnVuY3Rpb24oKXsgY29tYmluZURyYXdpbmcoXCJpbWFnZS9wbmdcIik7IH0pO1xuXG4vLyBcdC8vIGNsb3NlIGJ1dHRvbiBsZWFkaW5nIGJhY2sgdG8gbm9ybWFsIHZpZGVvIHBsYXkgYmFja1xuLy8gXHR2YXIgY2xvc2UgPSBkcmF3Q3RybC5hZGRDaGlsZCgnYnV0dG9uJyk7XG4vLyBcdGNsb3NlLmFkZENsYXNzKFwidmpzLWRyYXdpbmctY2xvc2VcIik7XG4vLyBcdGNsb3NlLmVsKCkudGl0bGUgPSBcImNsb3NlIHNjcmVlbnNob3QgYW5kIHJldHVybiB0byB2aWRlb1wiO1xuLy8gXHRjbG9zZS5vbignY2xpY2snLCBmdW5jdGlvbigpe1xuLy8gXHRcdC8vIGhpZGUgY3JvcGJveFxuLy8gXHRcdGNyb3Bib3guaGlkZSgpO1xuLy8gXHRcdC8vIGhpZGUgYWxsIGNhbnZhcyBzdHVmZlxuLy8gXHRcdHBhcmVudC5oaWRlKCk7XG4vLyBcdFx0Ly8gc3dpdGNoIGJhY2sgdG8gbm9ybWFsIHBsYXllciBjb250cm9sc1xuLy8gXHRcdGRyYXdDdHJsLmhpZGUoKTtcbi8vIFx0XHRwbGF5ZXIuY29udHJvbEJhci5zaG93KCk7XG4vLyBcdFx0cGxheWVyLmVsKCkuZm9jdXMoKTtcbi8vIFx0fSk7XG5cbi8vIFx0Ly8gc2NhbGUgZGlzcGxheVxuLy8gXHR2YXIgc2NhbGVfdHh0ID0gZHJhd0N0cmwuYWRkQ2hpbGQoXG4vLyBcdFx0bmV3IHZpZGVvanMuQ29tcG9uZW50KHBsYXllciwge1xuLy8gXHRcdFx0ZWw6IHZpZGVvanMuQ29tcG9uZW50LnByb3RvdHlwZS5jcmVhdGVFbChudWxsLCB7XG4vLyBcdFx0XHRcdGNsYXNzTmFtZTogJ3Zqcy1zY2FsZScsIGlubmVySFRNTDogJzEnLCB0aXRsZTogJ3NjYWxlIGZhY3Rvcidcbi8vIFx0XHRcdH0pLFxuLy8gXHRcdH0pXG4vLyBcdCk7XG5cbi8vIFx0Ly8gY2FudmFzIHN0dWZmXG4vLyBcdGNvbnRhaW5lciA9IHBhcmVudC5hZGRDaGlsZChcbi8vIFx0XHRuZXcgdmlkZW9qcy5Db21wb25lbnQocGxheWVyLCB7XG4vLyBcdFx0XHRlbDogdmlkZW9qcy5Db21wb25lbnQucHJvdG90eXBlLmNyZWF0ZUVsKG51bGwsIHtcbi8vIFx0XHRcdFx0Y2xhc3NOYW1lOiAndmpzLWNhbnZhcy1jb250YWluZXInIC8qVE9ETyovXG4vLyBcdFx0XHR9KSxcbi8vIFx0XHR9KVxuLy8gXHQpO1xuLy8gXHR2YXIgY2FudmFzX2JnID0gY29udGFpbmVyLmFkZENoaWxkKCAvL0ZJWE1FOiBpdCdzIHF1aXRlIHNpbGx5IHRvIHVzZSBhIGNvbXBvbmVudCBoZXJlXG4vLyBcdFx0bmV3IHZpZGVvanMuQ29tcG9uZW50KHBsYXllciwge1xuLy8gXHRcdFx0ZWw6IHZpZGVvanMuQ29tcG9uZW50LnByb3RvdHlwZS5jcmVhdGVFbCgnY2FudmFzJywge1xuLy8gXHRcdFx0fSksXG4vLyBcdFx0fSlcbi8vIFx0KTtcbi8vIFx0dmFyIGNvbnRleHRfYmcgPSBjYW52YXNfYmcuZWwoKS5nZXRDb250ZXh0KFwiMmRcIik7XG4vLyBcdHZhciBjYW52YXNfZHJhdyA9IGNvbnRhaW5lci5hZGRDaGlsZChcbi8vIFx0XHRuZXcgdmlkZW9qcy5Db21wb25lbnQocGxheWVyLCB7XG4vLyBcdFx0XHRlbDogdmlkZW9qcy5Db21wb25lbnQucHJvdG90eXBlLmNyZWF0ZUVsKCdjYW52YXMnLCB7XG4vLyBcdFx0XHR9KSxcbi8vIFx0XHR9KVxuLy8gXHQpO1xuLy8gXHR2YXIgY29udGV4dF9kcmF3ID0gY2FudmFzX2RyYXcuZWwoKS5nZXRDb250ZXh0KFwiMmRcIik7XG4vLyBcdHZhciBjYW52YXNfcmVjdCA9IGNvbnRhaW5lci5hZGRDaGlsZChcbi8vIFx0XHRuZXcgdmlkZW9qcy5Db21wb25lbnQocGxheWVyLCB7XG4vLyBcdFx0XHRlbDogdmlkZW9qcy5Db21wb25lbnQucHJvdG90eXBlLmNyZWF0ZUVsKCdjYW52YXMnLCB7XG4vLyBcdFx0XHR9KSxcbi8vIFx0XHR9KVxuLy8gXHQpO1xuLy8gXHRjYW52YXNfcmVjdC5lbCgpLnN0eWxlLnpJbmRleCA9IFwiMVwiOyAvLyBhbHdheXMgb24gdG9wIG9mIG90aGVyIGNhbnZhcyBlbGVtZW50c1xuLy8gXHR2YXIgY29udGV4dF9yZWN0ID0gY2FudmFzX3JlY3QuZWwoKS5nZXRDb250ZXh0KFwiMmRcIik7XG4vLyBcdHZhciBjcm9wYm94ID0gY29udGFpbmVyLmFkZENoaWxkKFxuLy8gXHRcdG5ldyB2aWRlb2pzLkNvbXBvbmVudChwbGF5ZXIsIHtcbi8vIFx0XHRcdGVsOiB2aWRlb2pzLkNvbXBvbmVudC5wcm90b3R5cGUuY3JlYXRlRWwoJ2RpdicsIHtcbi8vIFx0XHRcdFx0aW5uZXJIVE1MOiBcImNyb3BcIlxuLy8gXHRcdFx0fSksXG4vLyBcdFx0fSlcbi8vIFx0KTtcbi8vIFx0Y3JvcGJveC5lbCgpLnN0eWxlLmRpc3BsYXkgPSBcImZsZXhcIjtcbi8vIFx0Ly8gY3JvcCBoYW5kbGluZywgY3JlYXRlIG5ldyBjYW52YXMgYW5kIHJlcGxhY2Ugb2xkIG9uZVxuLy8gXHRmdW5jdGlvbiBzY2FsZUNyb3BDYW52YXMobGVmdCwgdG9wLCB3aWR0aCwgaGVpZ2h0LCBuZXd3aWR0aCwgbmV3aGVpZ2h0LCBjYW52YXMsIGNvbnRleHQpe1xuLy8gLy8gXHRcdHZhciBuZXdjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbi8vIFx0XHR2YXIgbmV3Y2FudmFzID0gbmV3IHZpZGVvanMuQ29tcG9uZW50KHBsYXllciwgeyAvLyBGSVhNRTogdGhhdCdzIHF1aXRlIHNpbGx5XG4vLyBcdFx0XHRlbDogdmlkZW9qcy5Db21wb25lbnQucHJvdG90eXBlLmNyZWF0ZUVsKCdjYW52YXMnLCB7XG4vLyBcdFx0XHR9KSxcbi8vIFx0XHR9KTtcbi8vIFx0XHR2YXIgcmVjdCA9IHBsYXllci5lbCgpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuLy8gXHRcdG5ld2NhbnZhcy5lbCgpLnN0eWxlLm1heFdpZHRoICA9IHJlY3Qud2lkdGggICtcInB4XCI7XG4vLyBcdFx0bmV3Y2FudmFzLmVsKCkuc3R5bGUubWF4SGVpZ2h0ID0gcmVjdC5oZWlnaHQgK1wicHhcIjtcblxuLy8gXHRcdG5ld2NhbnZhcy5lbCgpLndpZHRoID0gbmV3d2lkdGg7XG4vLyBcdFx0bmV3Y2FudmFzLmVsKCkuaGVpZ2h0ID0gbmV3aGVpZ2h0O1xuXG4vLyBcdFx0dmFyIGN0eCA9IG5ld2NhbnZhcy5lbCgpLmdldENvbnRleHQoXCIyZFwiKTtcbi8vIFx0XHRjdHguZHJhd0ltYWdlKGNhbnZhcy5lbCgpLFxuLy8gXHRcdFx0bGVmdCwgdG9wLCB3aWR0aCwgaGVpZ2h0LFxuLy8gXHRcdFx0MCwgMCwgbmV3d2lkdGgsIG5ld2hlaWdodFxuLy8gXHRcdCk7XG5cbi8vIC8vIFx0XHRjb250YWluZXIucmVwbGFjZUNoaWxkKG5ld2NhbnZhcywgY2FudmFzKTtcbi8vIFx0XHRjb250YWluZXIucmVtb3ZlQ2hpbGQoY2FudmFzKTtcbi8vIFx0XHRjb250YWluZXIuYWRkQ2hpbGQobmV3Y2FudmFzKTtcbi8vIC8vIFx0XHRjYW52YXMgPSBuZXdjYW52YXM7XG4vLyBcdFx0Y3R4LmxpbmVDYXAgPSBjb250ZXh0LmxpbmVDYXA7IC8vIHRyYW5zZmVyIGNvbnRleHQgc3RhdGVzXG4vLyBcdFx0Y3R4LnN0cm9rZVN0eWxlID0gY29udGV4dC5zdHJva2VTdHlsZTtcbi8vIFx0XHRjdHgubGluZVdpZHRoID0gY29udGV4dC5saW5lV2lkdGg7XG4vLyAvLyBcdFx0Y29udGV4dCA9IGN0eDtcbi8vIFx0XHQvLyBqYXZhc2NyaXB0IGhhcyBubyBwYXNzLWJ5LXJlZmVyZW5jZSAtPiBkbyBzdHVwaWQgc3R1ZmZcbi8vIFx0XHRyZXR1cm4gW25ld2NhbnZhcywgY3R4XTtcbi8vIFx0fVxuLy8gXHRjcm9wYm94Lm9uKCdtb3VzZWRvd24nLCBmdW5jdGlvbihlKXtcbi8vIFx0XHR2YXIgbGVmdCAgID0gc2NhbGUgKiBjcm9wYm94LmVsKCkub2Zmc2V0TGVmdCAgfDA7XG4vLyBcdFx0dmFyIHRvcCAgICA9IHNjYWxlICogY3JvcGJveC5lbCgpLm9mZnNldFRvcCAgIHwwO1xuLy8gXHRcdHZhciB3aWR0aCAgPSBzY2FsZSAqIGNyb3Bib3guZWwoKS5vZmZzZXRXaWR0aCB8MDtcbi8vIFx0XHR2YXIgaGVpZ2h0ID0gc2NhbGUgKiBjcm9wYm94LmVsKCkub2Zmc2V0SGVpZ2h0fDA7XG4vLyBcdFx0dmFyIHIgPSBzY2FsZUNyb3BDYW52YXMobGVmdCwgdG9wLCB3aWR0aCwgaGVpZ2h0LCB3aWR0aCwgaGVpZ2h0LCBjYW52YXNfYmcsIGNvbnRleHRfYmcpO1xuLy8gXHRcdGNhbnZhc19iZyA9IHJbMF07IGNvbnRleHRfYmcgPSByWzFdO1xuLy8gXHRcdHIgPSBzY2FsZUNyb3BDYW52YXMobGVmdCwgdG9wLCB3aWR0aCwgaGVpZ2h0LCB3aWR0aCwgaGVpZ2h0LCBjYW52YXNfZHJhdywgY29udGV4dF9kcmF3KTtcbi8vIFx0XHRjYW52YXNfZHJhdyA9IHJbMF07IGNvbnRleHRfZHJhdyA9IHJbMV07XG4vLyBcdFx0dXBkYXRlU2NhbGUoKTtcblxuLy8gXHRcdGNyb3Bib3guaGlkZSgpO1xuLy8gXHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7IC8vb3RoZXJ3aXNlIGNhbnZhcyBiZWxvdyBnZXRzIG1vdXNlZG93blxuLy8gXHR9KTtcblxuLy8gXHR2YXIgdGV4dGJveCA9IGNvbnRhaW5lci5hZGRDaGlsZChcbi8vIFx0XHRuZXcgdmlkZW9qcy5Db21wb25lbnQocGxheWVyLCB7XG4vLyBcdFx0XHRlbDogdmlkZW9qcy5Db21wb25lbnQucHJvdG90eXBlLmNyZWF0ZUVsKCd0ZXh0YXJlYScsIHtcbi8vIFx0XHRcdH0pLFxuLy8gXHRcdH0pXG4vLyBcdCk7XG4vLyBcdHRleHRib3gub24oJ2tleWRvd24nLCBmdW5jdGlvbihlKXsgLy8gZG9uJ3QgZmlyZSBwbGF5ZXIgc2hvcnRjdXRzIHdoZW4gdGV4dGJveCBoYXMgZm9jdXNcbi8vIFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuLy8gXHR9KTtcbi8vIFx0Ly8gZHJhdyB0ZXh0IHdoZW4gdGV4dGJveCBsb29zZXMgZm9jdXNcbi8vIFx0dGV4dGJveC5vbignYmx1cicsIGZ1bmN0aW9uKGUpe1xuLy8gXHRcdGNvbnRleHRfZHJhdy5maWxsU3R5bGUgPSBjb2xvci5lbCgpLnZhbHVlO1xuLy8gXHRcdGNvbnRleHRfZHJhdy5mb250ID0gKHNjYWxlICogc2l6ZS5lbCgpLnZhbHVlKjIpICtcInB4IHNhbnMtc2VyaWZcIjtcbi8vIFx0XHRjb250ZXh0X2RyYXcudGV4dEJhc2VsaW5lID0gXCJ0b3BcIjtcbi8vIFx0XHRjb250ZXh0X2RyYXcuZmlsbFRleHQodGV4dGJveC5lbCgpLnZhbHVlLFxuLy8gXHRcdFx0XHRzY2FsZSp0ZXh0Ym94LmVsKCkub2Zmc2V0TGVmdCArIHNjYWxlLFxuLy8gXHRcdFx0XHRzY2FsZSp0ZXh0Ym94LmVsKCkub2Zmc2V0VG9wICsgc2NhbGUpOyAvLysxIGZvciBib3JkZXI/XG4vLyBcdFx0Ly9GSVhNRTogdGhlcmUncyBzdGlsbCBhIG1pbm9yIHNoaWZ0IHdoZW4gc2NhbGUgaXNuJ3QgMSwgaW4gZmlyZWZveCBtb3JlIGFuZCBhbHNvIHdoZW4gc2NhbGUgaXMgMVxuLy8gXHRcdHRleHRib3guaGlkZSgpO1xuLy8gXHRcdHRleHRib3guZWwoKS52YWx1ZSA9IFwiXCI7XG4vLyBcdH0pO1xuXG4vLyBcdHBhcmVudC5oaWRlKCk7XG4vLyBcdGNhbnZhc19yZWN0LmhpZGUoKTtcbi8vIFx0Y3JvcGJveC5oaWRlKCk7XG4vLyBcdHRleHRib3guaGlkZSgpO1xuXG4vLyBcdC8vIFRPRE86IGRyYXcgZnVuY3Rpb25zXG4vLyBcdHZhciBwYWludCA9IGZhbHNlO1xuLy8gXHRjb250YWluZXIub24oJ21vdXNlZG93bicsIGZ1bmN0aW9uKGUpe1xuLy8gXHRcdHBhaW50ID0gdHJ1ZTtcbi8vIFx0XHR2YXIgcG9zID0gY29udGFpbmVyLmVsKCkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4vLyBcdFx0dmFyIHggPSBlLmNsaWVudFggLSBwb3MubGVmdDtcbi8vIFx0XHR2YXIgeSA9IGUuY2xpZW50WSAtIHBvcy50b3A7XG4vLyBcdFx0c3dpdGNoKHRvb2wpe1xuLy8gXHRcdFx0Y2FzZSBcImJydXNoXCI6XG4vLyBcdFx0XHRcdHggKj0gc2NhbGU7IHkgKj0gc2NhbGU7XG4vLyBcdFx0XHRcdGNvbnRleHRfZHJhdy5iZWdpblBhdGgoKTtcbi8vIFx0XHRcdFx0Y29udGV4dF9kcmF3Lm1vdmVUbyh4LTEsIHkpO1xuLy8gXHRcdFx0XHRjb250ZXh0X2RyYXcubGluZVRvKHgsIHkpO1xuLy8gXHRcdFx0XHRjb250ZXh0X2RyYXcuc3Ryb2tlKCk7XG4vLyBcdFx0XHRcdGJyZWFrO1xuLy8gXHRcdFx0Y2FzZSBcInJlY3RcIjpcbi8vIFx0XHRcdFx0Ly8gcmVjdGFuZ2xlIGlzIHNjYWxlZCB3aGVuIGJsaXR0aW5nLCBub3Qgd2hlbiBkcmFnZ2luZ1xuLy8gXHRcdFx0XHRjYW52YXNfcmVjdC5lbCgpLndpZHRoID0gMDtcbi8vIFx0XHRcdFx0Y2FudmFzX3JlY3QuZWwoKS5oZWlnaHQgPSAwO1xuLy8gXHRcdFx0XHRjYW52YXNfcmVjdC5lbCgpLnN0eWxlLmxlZnQgPSB4ICsgXCJweFwiO1xuLy8gXHRcdFx0XHRjYW52YXNfcmVjdC5lbCgpLnN0eWxlLnRvcCA9IHkgKyBcInB4XCI7XG4vLyBcdFx0XHRcdGNhbnZhc19yZWN0LnNob3coKTtcbi8vIFx0XHRcdFx0YnJlYWs7XG4vLyBcdFx0XHRjYXNlIFwiY3JvcFwiOlxuLy8gXHRcdFx0XHRjcm9wYm94LmVsKCkuc3R5bGUud2lkdGggPSAwO1xuLy8gXHRcdFx0XHRjcm9wYm94LmVsKCkuc3R5bGUuaGVpZ2h0ID0gMDtcbi8vIFx0XHRcdFx0Y3JvcGJveC5lbCgpLnN0eWxlLmxlZnQgPSB4ICsgXCJweFwiO1xuLy8gXHRcdFx0XHRjcm9wYm94LmVsKCkuc3R5bGUudG9wID0geSArIFwicHhcIjtcblxuLy8gXHRcdFx0XHRjcm9wYm94LmVsKCkuc3R5bGUuYm9yZGVyID0gXCIxcHggZGFzaGVkIFwiKyBjb2xvci5lbCgpLnZhbHVlO1xuLy8gXHRcdFx0XHRjcm9wYm94LmVsKCkuc3R5bGUuY29sb3IgPSBjb2xvci5lbCgpLnZhbHVlO1xuLy8gXHRcdFx0XHRjcm9wYm94LnNob3coKTtcbi8vIFx0XHRcdFx0YnJlYWs7XG4vLyBcdFx0XHRjYXNlIFwidGV4dFwiOlxuLy8gXHRcdFx0XHQvLyBpZiBzaG93biBhbHJlYWR5LCBsb29zZSBmb2N1cyBhbmQgZHJhdyBpdCBmaXJzdCwgb3RoZXJ3aXNlIGl0IGdldHMgZHJhd24gYXQgbW91c2Vkb3duXG4vLyBcdFx0XHRcdGlmKHRleHRib3guaGFzQ2xhc3MoXCJ2anMtaGlkZGVuXCIpKXtcbi8vIFx0XHRcdFx0XHR0ZXh0Ym94LmVsKCkuc3R5bGUud2lkdGggPSAwO1xuLy8gXHRcdFx0XHRcdHRleHRib3guZWwoKS5zdHlsZS5oZWlnaHQgPSAwO1xuLy8gXHRcdFx0XHRcdHRleHRib3guZWwoKS5zdHlsZS5sZWZ0ID0geCArIFwicHhcIjtcbi8vIFx0XHRcdFx0XHR0ZXh0Ym94LmVsKCkuc3R5bGUudG9wID0geSArIFwicHhcIjtcblxuLy8gXHRcdFx0XHRcdHRleHRib3guZWwoKS5zdHlsZS5ib3JkZXIgPSBcIjFweCBkYXNoZWQgXCIrIGNvbG9yLmVsKCkudmFsdWU7XG4vLyBcdFx0XHRcdFx0dGV4dGJveC5lbCgpLnN0eWxlLmNvbG9yID0gY29sb3IuZWwoKS52YWx1ZTtcbi8vIFx0XHRcdFx0XHR0ZXh0Ym94LmVsKCkuc3R5bGUuZm9udCA9IChzaXplLmVsKCkudmFsdWUqMikgK1wicHggc2Fucy1zZXJpZlwiO1xuLy8gXHRcdFx0XHRcdHRleHRib3guc2hvdygpO1xuLy8gXHRcdFx0XHR9XG4vLyBcdFx0XHRcdGJyZWFrO1xuLy8gXHRcdFx0Y2FzZSBcImVyYXNlclwiOlxuLy8gXHRcdFx0XHR2YXIgcyA9IHNpemUuZWwoKS52YWx1ZTtcbi8vIFx0XHRcdFx0Y29udGV4dF9kcmF3LmNsZWFyUmVjdChzY2FsZSp4IC0gcy8yLCBzY2FsZSp5IC0gcy8yLCBzLCBzKTtcbi8vIFx0XHRcdFx0YnJlYWs7XG4vLyBcdFx0fVxuLy8gLy8gXHRcdGUucHJldmVudERlZmF1bHQoKTtcbi8vIFx0fSk7XG4vLyBcdGNvbnRhaW5lci5vbignbW91c2Vtb3ZlJywgZnVuY3Rpb24oZSl7XG4vLyBcdFx0aWYocGFpbnQpe1xuLy8gXHRcdFx0dmFyIHBvcyA9IGNvbnRhaW5lci5lbCgpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuLy8gXHRcdFx0dmFyIHggPSBlLmNsaWVudFggLSBwb3MubGVmdDtcbi8vIFx0XHRcdHZhciB5ID0gZS5jbGllbnRZIC0gcG9zLnRvcDtcbi8vIFx0XHRcdHN3aXRjaCh0b29sKXtcbi8vIFx0XHRcdFx0Y2FzZSBcImJydXNoXCI6XG4vLyBcdFx0XHRcdFx0Y29udGV4dF9kcmF3LmxpbmVUbyhzY2FsZSAqIHgsIHNjYWxlICogeSk7XG4vLyBcdFx0XHRcdFx0Y29udGV4dF9kcmF3LnN0cm9rZSgpO1xuLy8gXHRcdFx0XHRcdGJyZWFrO1xuLy8gXHRcdFx0XHRjYXNlIFwicmVjdFwiOlxuLy8gXHRcdFx0XHRcdGNvbnRleHRfcmVjdC5jbGVhclJlY3QoMCwgMCwgY29udGV4dF9yZWN0LmNhbnZhcy53aWR0aCwgY29udGV4dF9yZWN0LmNhbnZhcy5oZWlnaHQpO1xuLy8gXHRcdFx0XHRcdC8vIHRoaXMgd2F5IGl0J3Mgb25seSBwb3NzaWJsZSB0byBkcmFnIHRvIHRoZSByaWdodCBhbmQgZG93biwgbW91c2Vkb3duIHNldHMgdG9wIGxlZnRcbi8vIFx0XHRcdFx0XHRjYW52YXNfcmVjdC5lbCgpLndpZHRoID0geCAtIGNhbnZhc19yZWN0LmVsKCkub2Zmc2V0TGVmdDsgLy8gcmVzaXplIGNhbnZhc1xuLy8gXHRcdFx0XHRcdGNhbnZhc19yZWN0LmVsKCkuaGVpZ2h0ID0geSAtIGNhbnZhc19yZWN0LmVsKCkub2Zmc2V0VG9wO1xuLy8gXHRcdFx0XHRcdGNvbnRleHRfcmVjdC5zdHJva2VTdHlsZSA9IGNvbG9yLmVsKCkudmFsdWU7IC8vbG9va3MgbGlrZSBpdHMgcmVzZXQgd2hlbiByZXNpemluZyBjYW52YXNcbi8vIFx0XHRcdFx0XHRjb250ZXh0X3JlY3QubGluZVdpZHRoID0gc2l6ZS5lbCgpLnZhbHVlIC8gc2NhbGU7IC8vIHNjYWxlIGxpbmVXaWR0aFxuLy8gXHRcdFx0XHRcdGNvbnRleHRfcmVjdC5zdHJva2VSZWN0KDAsIDAsIGNvbnRleHRfcmVjdC5jYW52YXMud2lkdGgsIGNvbnRleHRfcmVjdC5jYW52YXMuaGVpZ2h0KTtcbi8vIFx0XHRcdFx0XHRicmVhaztcbi8vIFx0XHRcdFx0Y2FzZSBcImNyb3BcIjpcbi8vIFx0XHRcdFx0XHRjcm9wYm94LmVsKCkuc3R5bGUud2lkdGggPSAoeCAtIGNyb3Bib3guZWwoKS5vZmZzZXRMZWZ0KSArXCJweFwiOyAvLyByZXNpemVcbi8vIFx0XHRcdFx0XHRjcm9wYm94LmVsKCkuc3R5bGUuaGVpZ2h0ID0gKHkgLSBjcm9wYm94LmVsKCkub2Zmc2V0VG9wKSArXCJweFwiO1xuLy8gXHRcdFx0XHRcdGJyZWFrO1xuLy8gXHRcdFx0XHRjYXNlIFwidGV4dFwiOlxuLy8gXHRcdFx0XHRcdHRleHRib3guZWwoKS5zdHlsZS53aWR0aCA9ICh4IC0gdGV4dGJveC5lbCgpLm9mZnNldExlZnQpICtcInB4XCI7IC8vIHJlc2l6ZVxuLy8gXHRcdFx0XHRcdHRleHRib3guZWwoKS5zdHlsZS5oZWlnaHQgPSAoeSAtIHRleHRib3guZWwoKS5vZmZzZXRUb3ApICtcInB4XCI7XG4vLyBcdFx0XHRcdFx0YnJlYWs7XG4vLyBcdFx0XHRcdGNhc2UgXCJlcmFzZXJcIjpcbi8vIFx0XHRcdFx0XHR2YXIgcyA9IHNpemUuZWwoKS52YWx1ZTtcbi8vIFx0XHRcdFx0XHRjb250ZXh0X2RyYXcuY2xlYXJSZWN0KHNjYWxlKnggLSBzLzIsIHNjYWxlKnkgLSBzLzIsIHMsIHMpO1xuLy8gXHRcdFx0XHRcdGJyZWFrO1xuLy8gXHRcdFx0fVxuLy8gXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuLy8gXHRcdH1cbi8vIFx0fSk7XG4vLyBcdGZ1bmN0aW9uIGZpbmlzaCgpe1xuLy8gXHRcdGlmKHBhaW50KXtcbi8vIFx0XHRcdHBhaW50ID0gZmFsc2U7XG4vLyBcdFx0XHRpZih0b29sID09IFwicmVjdFwiKXtcbi8vIFx0XHRcdFx0Ly9ibGl0IGNhbnZhc19yZWN0IG9uIGNhbnZhcywgc2NhbGVkXG4vLyBcdFx0XHRcdGNvbnRleHRfZHJhdy5kcmF3SW1hZ2UoY2FudmFzX3JlY3QuZWwoKSxcbi8vIFx0XHRcdFx0XHRcdHNjYWxlKmNhbnZhc19yZWN0LmVsKCkub2Zmc2V0TGVmdCwgc2NhbGUqY2FudmFzX3JlY3QuZWwoKS5vZmZzZXRUb3AsXG4vLyBcdFx0XHRcdFx0XHRzY2FsZSpjb250ZXh0X3JlY3QuY2FudmFzLndpZHRoLCBzY2FsZSpjb250ZXh0X3JlY3QuY2FudmFzLmhlaWdodCk7XG4vLyBcdFx0XHRcdGNhbnZhc19yZWN0LmhpZGUoKTtcbi8vIFx0XHRcdH1lbHNlIGlmKHRvb2wgPT0gXCJ0ZXh0XCIpe1xuLy8gXHRcdFx0XHRwbGF5ZXIuZWwoKS5ibHVyKCk7XG4vLyBcdFx0XHRcdHRleHRib3guZWwoKS5mb2N1cygpO1xuLy8gXHRcdFx0fVxuLy8gXHRcdH1cbi8vIFx0fVxuLy8gXHRjb250YWluZXIub24oJ21vdXNldXAnLCBmaW5pc2gpO1xuLy8gXHRjb250YWluZXIub24oJ21vdXNlbGVhdmUnLCBmaW5pc2gpO1xuLy8gfTtcblxuLyoqXG4gKiDorrDlvZUg5b2V6Z+zIOaIquWxj1xuICogQHBhcmFtIHtbdHlwZV19IG9wdGlvbnMgW2Rlc2NyaXB0aW9uXVxuICogcmV0dXJuIHtbdHlwZV19ICBbZGVzY3JpcHRpb25dXG4gKi9cbnZhciBzbmFwc2hvdCA9IHtcblx0LyoqXG5cdCAqIFJldHVybnMgYW4gb2JqZWN0IHRoYXQgY2FwdHVyZXMgdGhlIHBvcnRpb25zIG9mIHBsYXllciBzdGF0ZSByZWxldmFudCB0b1xuXHQgKiB2aWRlbyBwbGF5YmFjay4gVGhlIHJlc3VsdCBvZiB0aGlzIGZ1bmN0aW9uIGNhbiBiZSBwYXNzZWQgdG9cblx0ICogcmVzdG9yZVBsYXllclNuYXBzaG90IHdpdGggYSBwbGF5ZXIgdG8gcmV0dXJuIHRoZSBwbGF5ZXIgdG8gdGhlIHN0YXRlIGl0XG5cdCAqIHdhcyBpbiB3aGVuIHRoaXMgZnVuY3Rpb24gd2FzIGludm9rZWQuXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBwbGF5ZXIgVGhlIHZpZGVvanMgcGxheWVyIG9iamVjdFxuXHQgKi9cblx0Z2V0UGxheWVyU25hcHNob3Q6IGZ1bmN0aW9uKHBsYXllcikge1xuXG5cdFx0bGV0IGN1cnJlbnRUaW1lO1xuXG5cdFx0aWYgKHZpZGVvanMuYnJvd3Nlci5JU19JT1MgJiYgcGxheWVyLmFkcy5pc0xpdmUocGxheWVyKSkge1xuXHRcdFx0Ly8gUmVjb3JkIGhvdyBmYXIgYmVoaW5kIGxpdmUgd2UgYXJlXG5cdFx0XHRpZiAocGxheWVyLnNlZWthYmxlKCkubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpIC0gcGxheWVyLnNlZWthYmxlKCkuZW5kKDApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y3VycmVudFRpbWUgPSBwbGF5ZXIuY3VycmVudFRpbWUoKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0Y3VycmVudFRpbWUgPSBwbGF5ZXIuY3VycmVudFRpbWUoKTtcblx0XHR9XG5cblx0XHRjb25zdCB0ZWNoID0gcGxheWVyLiQoJy52anMtdGVjaCcpO1xuXHRcdGNvbnN0IHRyYWNrcyA9IHBsYXllci5yZW1vdGVUZXh0VHJhY2tzID8gcGxheWVyLnJlbW90ZVRleHRUcmFja3MoKSA6IFtdO1xuXHRcdGNvbnN0IHN1cHByZXNzZWRUcmFja3MgPSBbXTtcblx0XHRjb25zdCBzbmFwc2hvdCA9IHtcblx0XHRcdGVuZGVkOiBwbGF5ZXIuZW5kZWQoKSxcblx0XHRcdGN1cnJlbnRTcmM6IHBsYXllci5jdXJyZW50U3JjKCksXG5cdFx0XHRzcmM6IHBsYXllci5zcmMoKSxcblx0XHRcdGN1cnJlbnRUaW1lLFxuXHRcdFx0dHlwZTogcGxheWVyLmN1cnJlbnRUeXBlKClcblx0XHR9O1xuXG5cdFx0aWYgKHRlY2gpIHtcblx0XHRcdHNuYXBzaG90Lm5hdGl2ZVBvc3RlciA9IHRlY2gucG9zdGVyO1xuXHRcdFx0c25hcHNob3Quc3R5bGUgPSB0ZWNoLmdldEF0dHJpYnV0ZSgnc3R5bGUnKTtcblx0XHR9XG5cblx0XHRmb3IgKGxldCBpID0gdHJhY2tzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRjb25zdCB0cmFjayA9IHRyYWNrc1tpXTtcblxuXHRcdFx0c3VwcHJlc3NlZFRyYWNrcy5wdXNoKHtcblx0XHRcdFx0dHJhY2ssXG5cdFx0XHRcdG1vZGU6IHRyYWNrLm1vZGVcblx0XHRcdH0pO1xuXHRcdFx0dHJhY2subW9kZSA9ICdkaXNhYmxlZCc7XG5cdFx0fVxuXHRcdHNuYXBzaG90LnN1cHByZXNzZWRUcmFja3MgPSBzdXBwcmVzc2VkVHJhY2tzO1xuXG5cdFx0cmV0dXJuIHNuYXBzaG90O1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBBdHRlbXB0cyB0byBtb2RpZnkgdGhlIHNwZWNpZmllZCBwbGF5ZXIgc28gdGhhdCBpdHMgc3RhdGUgaXMgZXF1aXZhbGVudCB0b1xuXHQgKiB0aGUgc3RhdGUgb2YgdGhlIHNuYXBzaG90LlxuXHQgKiBAcGFyYW0ge29iamVjdH0gc25hcHNob3QgLSB0aGUgcGxheWVyIHN0YXRlIHRvIGFwcGx5XG5cdCAqL1xuXHRyZXN0b3JlUGxheWVyU25hcHNob3Q6IGZ1bmN0aW9uKHBsYXllciwgc25hcHNob3QpIHtcblxuXHRcdGlmIChwbGF5ZXIuYWRzLmRpc2FibGVOZXh0U25hcHNob3RSZXN0b3JlID09PSB0cnVlKSB7XG5cdFx0XHRwbGF5ZXIuYWRzLmRpc2FibGVOZXh0U25hcHNob3RSZXN0b3JlID0gZmFsc2U7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gVGhlIHBsYXliYWNrIHRlY2hcblx0XHRsZXQgdGVjaCA9IHBsYXllci4kKCcudmpzLXRlY2gnKTtcblxuXHRcdC8vIHRoZSBudW1iZXIgb2ZbIHJlbWFpbmluZyBhdHRlbXB0cyB0byByZXN0b3JlIHRoZSBzbmFwc2hvdFxuXHRcdGxldCBhdHRlbXB0cyA9IDIwO1xuXG5cdFx0Y29uc3Qgc3VwcHJlc3NlZFRyYWNrcyA9IHNuYXBzaG90LnN1cHByZXNzZWRUcmFja3M7XG5cdFx0bGV0IHRyYWNrU25hcHNob3Q7XG5cdFx0bGV0IHJlc3RvcmVUcmFja3MgPSBmdW5jdGlvbigpIHtcblx0XHRcdGZvciAobGV0IGkgPSBzdXBwcmVzc2VkVHJhY2tzLmxlbmd0aDsgaSA+IDA7IGktLSkge1xuXHRcdFx0XHR0cmFja1NuYXBzaG90ID0gc3VwcHJlc3NlZFRyYWNrc1tpXTtcblx0XHRcdFx0dHJhY2tTbmFwc2hvdC50cmFjay5tb2RlID0gdHJhY2tTbmFwc2hvdC5tb2RlO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQvLyBmaW5pc2ggcmVzdG9yaW5nIHRoZSBwbGF5YmFjayBzdGF0ZVxuXHRcdGNvbnN0IHJlc3VtZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0bGV0IGN1cnJlbnRUaW1lO1xuXG5cdFx0XHRpZiAodmlkZW9qcy5icm93c2VyLklTX0lPUyAmJiBwbGF5ZXIuYWRzLmlzTGl2ZShwbGF5ZXIpKSB7XG5cdFx0XHRcdGlmIChzbmFwc2hvdC5jdXJyZW50VGltZSA8IDApIHtcblx0XHRcdFx0XHQvLyBQbGF5YmFjayB3YXMgYmVoaW5kIHJlYWwgdGltZSwgc28gc2VlayBiYWNrd2FyZHMgdG8gbWF0Y2hcblx0XHRcdFx0XHRpZiAocGxheWVyLnNlZWthYmxlKCkubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdFx0Y3VycmVudFRpbWUgPSBwbGF5ZXIuc2Vla2FibGUoKS5lbmQoMCkgKyBzbmFwc2hvdC5jdXJyZW50VGltZTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y3VycmVudFRpbWUgPSBwbGF5ZXIuY3VycmVudFRpbWUoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cGxheWVyLmN1cnJlbnRUaW1lKGN1cnJlbnRUaW1lKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cGxheWVyLmN1cnJlbnRUaW1lKHNuYXBzaG90LmVuZGVkID8gcGxheWVyLmR1cmF0aW9uKCkgOiBzbmFwc2hvdC5jdXJyZW50VGltZSk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFJlc3VtZSBwbGF5YmFjayBpZiB0aGlzIHdhc24ndCBhIHBvc3Ryb2xsXG5cdFx0XHRpZiAoIXNuYXBzaG90LmVuZGVkKSB7XG5cdFx0XHRcdHBsYXllci5wbGF5KCk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdC8vIGRldGVybWluZSBpZiB0aGUgdmlkZW8gZWxlbWVudCBoYXMgbG9hZGVkIGVub3VnaCBvZiB0aGUgc25hcHNob3Qgc291cmNlXG5cdFx0Ly8gdG8gYmUgcmVhZHkgdG8gYXBwbHkgdGhlIHJlc3Qgb2YgdGhlIHN0YXRlXG5cdFx0Y29uc3QgdHJ5VG9SZXN1bWUgPSBmdW5jdGlvbigpIHtcblxuXHRcdFx0Ly8gdHJ5VG9SZXN1bWUgY2FuIGVpdGhlciBoYXZlIGJlZW4gY2FsbGVkIHRocm91Z2ggdGhlIGBjb250ZW50Y2FucGxheWBcblx0XHRcdC8vIGV2ZW50IG9yIGZpcmVkIHRocm91Z2ggc2V0VGltZW91dC5cblx0XHRcdC8vIFdoZW4gdHJ5VG9SZXN1bWUgaXMgY2FsbGVkLCB3ZSBzaG91bGQgbWFrZSBzdXJlIHRvIGNsZWFyIG91dCB0aGUgb3RoZXJcblx0XHRcdC8vIHdheSBpdCBjb3VsZCd2ZSBiZWVuIGNhbGxlZCBieSByZW1vdmluZyB0aGUgbGlzdGVuZXIgYW5kIGNsZWFyaW5nIG91dFxuXHRcdFx0Ly8gdGhlIHRpbWVvdXQuXG5cdFx0XHRwbGF5ZXIub2ZmKCdjb250ZW50Y2FucGxheScsIHRyeVRvUmVzdW1lKTtcblx0XHRcdGlmIChwbGF5ZXIuYWRzLnRyeVRvUmVzdW1lVGltZW91dF8pIHtcblx0XHRcdFx0cGxheWVyLmNsZWFyVGltZW91dChwbGF5ZXIuYWRzLnRyeVRvUmVzdW1lVGltZW91dF8pO1xuXHRcdFx0XHRwbGF5ZXIuYWRzLnRyeVRvUmVzdW1lVGltZW91dF8gPSBudWxsO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBUZWNoIG1heSBoYXZlIGNoYW5nZWQgZGVwZW5kaW5nIG9uIHRoZSBkaWZmZXJlbmNlcyBpbiBzb3VyY2VzIG9mIHRoZVxuXHRcdFx0Ly8gb3JpZ2luYWwgdmlkZW8gYW5kIHRoYXQgb2YgdGhlIGFkXG5cdFx0XHR0ZWNoID0gcGxheWVyLmVsKCkucXVlcnlTZWxlY3RvcignLnZqcy10ZWNoJyk7XG5cblx0XHRcdGlmICh0ZWNoLnJlYWR5U3RhdGUgPiAxKSB7XG5cdFx0XHRcdC8vIHNvbWUgYnJvd3NlcnMgYW5kIG1lZGlhIGFyZW4ndCBcInNlZWthYmxlXCIuXG5cdFx0XHRcdC8vIHJlYWR5U3RhdGUgZ3JlYXRlciB0aGFuIDEgYWxsb3dzIGZvciBzZWVraW5nIHdpdGhvdXQgZXhjZXB0aW9uc1xuXHRcdFx0XHRyZXR1cm4gcmVzdW1lKCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0ZWNoLnNlZWthYmxlID09PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0Ly8gaWYgdGhlIHRlY2ggZG9lc24ndCBleHBvc2UgdGhlIHNlZWthYmxlIHRpbWUgcmFuZ2VzLCB0cnkgdG9cblx0XHRcdFx0Ly8gcmVzdW1lIHBsYXliYWNrIGltbWVkaWF0ZWx5XG5cdFx0XHRcdHJldHVybiByZXN1bWUoKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHRlY2guc2Vla2FibGUubGVuZ3RoID4gMCkge1xuXHRcdFx0XHQvLyBpZiBzb21lIHBlcmlvZCBvZiB0aGUgdmlkZW8gaXMgc2Vla2FibGUsIHJlc3VtZSBwbGF5YmFja1xuXHRcdFx0XHRyZXR1cm4gcmVzdW1lKCk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIGRlbGF5IGEgYml0IGFuZCB0aGVuIGNoZWNrIGFnYWluIHVubGVzcyB3ZSdyZSBvdXQgb2YgYXR0ZW1wdHNcblx0XHRcdGlmIChhdHRlbXB0cy0tKSB7XG5cdFx0XHRcdHdpbmRvdy5zZXRUaW1lb3V0KHRyeVRvUmVzdW1lLCA1MCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdHJlc3VtZSgpO1xuXHRcdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0dmlkZW9qcy5sb2cud2FybignRmFpbGVkIHRvIHJlc3VtZSB0aGUgY29udGVudCBhZnRlciBhbiBhZHZlcnRpc2VtZW50JywgZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0aWYgKHNuYXBzaG90Lm5hdGl2ZVBvc3Rlcikge1xuXHRcdFx0dGVjaC5wb3N0ZXIgPSBzbmFwc2hvdC5uYXRpdmVQb3N0ZXI7XG5cdFx0fVxuXG5cdFx0aWYgKCdzdHlsZScgaW4gc25hcHNob3QpIHtcblx0XHRcdC8vIG92ZXJ3cml0ZSBhbGwgY3NzIHN0eWxlIHByb3BlcnRpZXMgdG8gcmVzdG9yZSBzdGF0ZSBwcmVjaXNlbHlcblx0XHRcdHRlY2guc2V0QXR0cmlidXRlKCdzdHlsZScsIHNuYXBzaG90LnN0eWxlIHx8ICcnKTtcblx0XHR9XG5cblx0XHQvLyBEZXRlcm1pbmUgd2hldGhlciB0aGUgcGxheWVyIG5lZWRzIHRvIGJlIHJlc3RvcmVkIHRvIGl0cyBzdGF0ZVxuXHRcdC8vIGJlZm9yZSBhZCBwbGF5YmFjayBiZWdhbi4gV2l0aCBhIGN1c3RvbSBhZCBkaXNwbGF5IG9yIGJ1cm5lZC1pblxuXHRcdC8vIGFkcywgdGhlIGNvbnRlbnQgcGxheWVyIHN0YXRlIGhhc24ndCBiZWVuIG1vZGlmaWVkIGFuZCBzbyBub1xuXHRcdC8vIHJlc3RvcmF0aW9uIGlzIHJlcXVpcmVkXG5cblx0XHRpZiAocGxheWVyLmFkcy52aWRlb0VsZW1lbnRSZWN5Y2xlZCgpKSB7XG5cdFx0XHQvLyBvbiBpb3M3LCBmaWRkbGluZyB3aXRoIHRleHRUcmFja3MgdG9vIGVhcmx5IHdpbGwgY2F1c2Ugc2FmYXJpIHRvIGNyYXNoXG5cdFx0XHRwbGF5ZXIub25lKCdjb250ZW50bG9hZGVkbWV0YWRhdGEnLCByZXN0b3JlVHJhY2tzKTtcblxuXHRcdFx0Ly8gaWYgdGhlIHNyYyBjaGFuZ2VkIGZvciBhZCBwbGF5YmFjaywgcmVzZXQgaXRcblx0XHRcdHBsYXllci5zcmMoe1xuXHRcdFx0XHRzcmM6IHNuYXBzaG90LmN1cnJlbnRTcmMsXG5cdFx0XHRcdHR5cGU6IHNuYXBzaG90LnR5cGVcblx0XHRcdH0pO1xuXHRcdFx0Ly8gc2FmYXJpIHJlcXVpcmVzIGEgY2FsbCB0byBgbG9hZGAgdG8gcGljayB1cCBhIGNoYW5nZWQgc291cmNlXG5cdFx0XHRwbGF5ZXIubG9hZCgpO1xuXHRcdFx0Ly8gYW5kIHRoZW4gcmVzdW1lIGZyb20gdGhlIHNuYXBzaG90cyB0aW1lIG9uY2UgdGhlIG9yaWdpbmFsIHNyYyBoYXMgbG9hZGVkXG5cdFx0XHQvLyBpbiBzb21lIGJyb3dzZXJzIChmaXJlZm94KSBgY2FucGxheWAgbWF5IG5vdCBmaXJlIGNvcnJlY3RseS5cblx0XHRcdC8vIFJlYWNlIHRoZSBgY2FucGxheWAgZXZlbnQgd2l0aCBhIHRpbWVvdXQuXG5cdFx0XHRwbGF5ZXIub25lKCdjb250ZW50Y2FucGxheScsIHRyeVRvUmVzdW1lKTtcblx0XHRcdHBsYXllci5hZHMudHJ5VG9SZXN1bWVUaW1lb3V0XyA9IHBsYXllci5zZXRUaW1lb3V0KHRyeVRvUmVzdW1lLCAyMDAwKTtcblx0XHR9IGVsc2UgaWYgKCFwbGF5ZXIuZW5kZWQoKSB8fCAhc25hcHNob3QuZW5kZWQpIHtcblx0XHRcdC8vIGlmIHdlIGRpZG4ndCBjaGFuZ2UgdGhlIHNyYywganVzdCByZXN0b3JlIHRoZSB0cmFja3Ncblx0XHRcdHJlc3RvcmVUcmFja3MoKTtcblx0XHRcdC8vIHRoZSBzcmMgZGlkbid0IGNoYW5nZSBhbmQgdGhpcyB3YXNuJ3QgYSBwb3N0cm9sbFxuXHRcdFx0Ly8ganVzdCByZXN1bWUgcGxheWJhY2sgYXQgdGhlIGN1cnJlbnQgdGltZS5cblx0XHRcdHBsYXllci5wbGF5KCk7XG5cdFx0fVxuXHR9XG59O1xuXG5jb25zdCByZWNvcmRQb2ludCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0dmFyIHNldHRpbmdzID0gdmlkZW9qcy5tZXJnZU9wdGlvbnMoZGVmYXVsdHMsIG9wdGlvbnMpLHBsYXllciA9IHRoaXMsdGltZVRlbXA7XG5cdHRoaXMub24oXCJ0aW1ldXBkYXRlXCIsIHBsYXllclRpbWVVcGRhdGUpO1xuXHR0aGlzLm9uKFwiZW5kZWRcIixwbGF5ZXJFbmRlZCk7XG5cblxuXHRmdW5jdGlvbiBwbGF5ZXJUaW1lVXBkYXRlKCkge1xuXHRcdHZhciBjdXIgPSBwYXJzZUludChwbGF5ZXIuY3VycmVudFRpbWUoKSk7XG5cdFx0dmFyIGlzUGF1c2VkID0gcGxheWVyLnBhdXNlZCgpO1xuXHRcdGlmKGN1ciAhPSB0aW1lVGVtcCl7XG5cdFx0XHR0aW1lVGVtcCA9IGN1cjtcblx0XHRcdC8vY29uc29sZS5sb2coY3VyJXNldHRpbmdzLnNlY1BlclRpbWUpO1xuXHRcdFx0aWYoY3VyPT0wKXtcblx0XHRcdFx0cGxheWVyLnRyaWdnZXIoJ3RpbWVVcGRhdGUnLHt0eXBlOiAnc3RhcnQnLCBjdXJyZW50OiBwbGF5ZXIuY3VycmVudFRpbWUoKSwgdG90YWw6IHBsYXllci5kdXJhdGlvbigpfSk7XG5cdFx0XHR9XG5cdFx0XHRpZihzZXR0aW5ncy5zZWNQZXJUaW1lPjApe1xuXHRcdFx0XHRpZihjdXIgJSBzZXR0aW5ncy5zZWNQZXJUaW1lPT0wKXtcblx0XHRcdFx0XHRwbGF5ZXIudHJpZ2dlcigndGltZVVwZGF0ZScse3R5cGU6ICd0aWNrJywgY3VycmVudDogcGxheWVyLmN1cnJlbnRUaW1lKCksIHRvdGFsOiBwbGF5ZXIuZHVyYXRpb24oKX0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZihzZXR0aW5ncy5maW5pc2hQY3Q+PTAgJiYgc2V0dGluZ3MuZmluaXNoUGN0PD0xMDApe1xuXHRcdFx0XHR2YXIgcGVyY2VudCA9IHBsYXllci5jdXJyZW50VGltZSgpL3BsYXllci5kdXJhdGlvbigpO1xuXHRcdFx0XHRpZihwZXJjZW50Pj1zZXR0aW5ncy5maW5pc2hQY3QvMTAwKXtcblx0XHRcdFx0XHRpZighc2V0dGluZ3MuaXNGaW5pc2ggfHwgc2V0dGluZ3MuaXNGaW5pc2ggPT0gdW5kZWZpbmVkKXtcblx0XHRcdFx0XHRcdHNldHRpbmdzLmlzRmluaXNoID0gdHJ1ZTtcblx0XHRcdFx0XHRcdHBsYXllci50cmlnZ2VyKCd0aW1lVXBkYXRlJyx7dHlwZTogJ2ZpbmlzaCcsIGN1cnJlbnQ6IHBsYXllci5jdXJyZW50VGltZSgpLCB0b3RhbDogcGxheWVyLmR1cmF0aW9uKCl9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1lbHNle1xuXHRcdFx0XHRcdHNldHRpbmdzLmlzRmluaXNoID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0ZnVuY3Rpb24gcGxheWVyRW5kZWQoKSB7XG5cdFx0cGxheWVyLnRyaWdnZXIoJ3RpbWVVcGRhdGUnLHt0eXBlOiAnZW5kZWQnLCBjdXJyZW50OiBwbGF5ZXIuY3VycmVudFRpbWUoKSwgdG90YWw6IHBsYXllci5kdXJhdGlvbigpfSk7XG5cdH1cbn07XG5cbi8vIFJlZ2lzdGVyIHRoZSBwbHVnaW4gd2l0aCB2aWRlby5qcy5cbnZpZGVvanMucGx1Z2luKCdvcGVuJywgb3Blbik7XG52aWRlb2pzLnBsdWdpbigndmlkZW9Kc1Jlc29sdXRpb25Td2l0Y2hlcicsIHZpZGVvSnNSZXNvbHV0aW9uU3dpdGNoZXIpO1xudmlkZW9qcy5wbHVnaW4oJ2Rpc2FibGVQcm9ncmVzcycsIGRpc2FibGVQcm9ncmVzcyk7XG52aWRlb2pzLnBsdWdpbignbWFya2VycycsIG1hcmtlcnMpO1xudmlkZW9qcy5wbHVnaW4oJ3dhdGVyTWFyaycsIHdhdGVyTWFyayk7XG52aWRlb2pzLnBsdWdpbignc25hcHNob3QnLCBzbmFwc2hvdCk7XG52aWRlb2pzLnBsdWdpbigncmVjb3JkUG9pbnQnLCByZWNvcmRQb2ludCk7XG5cbi8vIEluY2x1ZGUgdGhlIHZlcnNpb24gbnVtYmVyLlxub3Blbi5WRVJTSU9OID0gJ19fVkVSU0lPTl9fJztcblxuZXhwb3J0IGRlZmF1bHQgb3BlbjsiLCJpbXBvcnQgZG9jdW1lbnQgZnJvbSAnZ2xvYmFsL2RvY3VtZW50JztcblxuaW1wb3J0IFFVbml0IGZyb20gJ3F1bml0JztcbmltcG9ydCBzaW5vbiBmcm9tICdzaW5vbic7XG5pbXBvcnQgdmlkZW9qcyBmcm9tICd2aWRlby5qcyc7XG5cbmltcG9ydCBwbHVnaW4gZnJvbSAnLi4vc3JjL3BsdWdpbic7XG5cbmNvbnN0IFBsYXllciA9IHZpZGVvanMuZ2V0Q29tcG9uZW50KCdQbGF5ZXInKTtcblxuUVVuaXQudGVzdCgndGhlIGVudmlyb25tZW50IGlzIHNhbmUnLCBmdW5jdGlvbihhc3NlcnQpIHtcbiAgYXNzZXJ0LnN0cmljdEVxdWFsKHR5cGVvZiBBcnJheS5pc0FycmF5LCAnZnVuY3Rpb24nLCAnZXM1IGV4aXN0cycpO1xuICBhc3NlcnQuc3RyaWN0RXF1YWwodHlwZW9mIHNpbm9uLCAnb2JqZWN0JywgJ3Npbm9uIGV4aXN0cycpO1xuICBhc3NlcnQuc3RyaWN0RXF1YWwodHlwZW9mIHZpZGVvanMsICdmdW5jdGlvbicsICd2aWRlb2pzIGV4aXN0cycpO1xuICBhc3NlcnQuc3RyaWN0RXF1YWwodHlwZW9mIHBsdWdpbiwgJ2Z1bmN0aW9uJywgJ3BsdWdpbiBpcyBhIGZ1bmN0aW9uJyk7XG59KTtcblxuUVVuaXQubW9kdWxlKCd2aWRlb2pzLW9wZW4nLCB7XG5cbiAgYmVmb3JlRWFjaCgpIHtcblxuICAgIC8vIE1vY2sgdGhlIGVudmlyb25tZW50J3MgdGltZXJzIGJlY2F1c2UgY2VydGFpbiB0aGluZ3MgLSBwYXJ0aWN1bGFybHlcbiAgICAvLyBwbGF5ZXIgcmVhZGluZXNzIC0gYXJlIGFzeW5jaHJvbm91cyBpbiB2aWRlby5qcyA1LiBUaGlzIE1VU1QgY29tZVxuICAgIC8vIGJlZm9yZSBhbnkgcGxheWVyIGlzIGNyZWF0ZWQ7IG90aGVyd2lzZSwgdGltZXJzIGNvdWxkIGdldCBjcmVhdGVkXG4gICAgLy8gd2l0aCB0aGUgYWN0dWFsIHRpbWVyIG1ldGhvZHMhXG4gICAgdGhpcy5jbG9jayA9IHNpbm9uLnVzZUZha2VUaW1lcnMoKTtcblxuICAgIHRoaXMuZml4dHVyZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdxdW5pdC1maXh0dXJlJyk7XG4gICAgdGhpcy52aWRlbyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3ZpZGVvJyk7XG4gICAgdGhpcy5maXh0dXJlLmFwcGVuZENoaWxkKHRoaXMudmlkZW8pO1xuICAgIHRoaXMucGxheWVyID0gdmlkZW9qcyh0aGlzLnZpZGVvKTtcbiAgfSxcblxuICBhZnRlckVhY2goKSB7XG4gICAgdGhpcy5wbGF5ZXIuZGlzcG9zZSgpO1xuICAgIHRoaXMuY2xvY2sucmVzdG9yZSgpO1xuICB9XG59KTtcblxuUVVuaXQudGVzdCgncmVnaXN0ZXJzIGl0c2VsZiB3aXRoIHZpZGVvLmpzJywgZnVuY3Rpb24oYXNzZXJ0KSB7XG4gIGFzc2VydC5leHBlY3QoMik7XG5cbiAgYXNzZXJ0LnN0cmljdEVxdWFsKFxuICAgIFBsYXllci5wcm90b3R5cGUub3BlbixcbiAgICBwbHVnaW4sXG4gICAgJ3ZpZGVvanMtb3BlbiBwbHVnaW4gd2FzIHJlZ2lzdGVyZWQnXG4gICk7XG5cbiAgdGhpcy5wbGF5ZXIub3BlbigpO1xuXG4gIC8vIFRpY2sgdGhlIGNsb2NrIGZvcndhcmQgZW5vdWdoIHRvIHRyaWdnZXIgdGhlIHBsYXllciB0byBiZSBcInJlYWR5XCIuXG4gIHRoaXMuY2xvY2sudGljaygxKTtcblxuICBhc3NlcnQub2soXG4gICAgdGhpcy5wbGF5ZXIuaGFzQ2xhc3MoJ3Zqcy1vcGVuJyksXG4gICAgJ3RoZSBwbHVnaW4gYWRkcyBhIGNsYXNzIHRvIHRoZSBwbGF5ZXInXG4gICk7XG59KTtcbiJdfQ==

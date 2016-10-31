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

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvb3Blbi9Eb2N1bWVudHMvV29yay9Tb3VyY2VUcmVlL3Zqcy1vcGVuL3NyYy9wbHVnaW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7dUJDQW9CLFVBQVU7Ozs7O0FBSTlCLElBQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQzs7Ozs7Ozs7Ozs7OztBQWFwQixJQUFNLGFBQWEsR0FBRyxTQUFoQixhQUFhLENBQUksTUFBTSxFQUFFLE9BQU8sRUFBSztBQUMxQyxPQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0NBRzVCLENBQUM7Ozs7Ozs7Ozs7Ozs7O0FBY0YsSUFBTSxJQUFJLEdBQUcsU0FBUCxJQUFJLENBQVksT0FBTyxFQUFFOzs7QUFDOUIsS0FBSSxDQUFDLEtBQUssQ0FBQyxZQUFNO0FBQ2hCLGVBQWEsUUFBTyxxQkFBUSxZQUFZLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7RUFDN0QsQ0FBQyxDQUFDO0NBQ0gsQ0FBQzs7Ozs7OztBQU9GLElBQU0seUJBQXlCLEdBQUcsbUNBQVMsT0FBTyxFQUFFOzs7Ozs7O0FBT25ELEtBQUksUUFBUSxHQUFHLHFCQUFRLFlBQVksQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDO0tBQ3JELE1BQU0sR0FBRyxJQUFJO0tBQ2IsVUFBVSxHQUFHLEVBQUU7S0FDZixjQUFjLEdBQUcsRUFBRTtLQUNuQixzQkFBc0IsR0FBRyxFQUFFLENBQUM7Ozs7Ozs7QUFPN0IsT0FBTSxDQUFDLFNBQVMsR0FBRyxVQUFTLEdBQUcsRUFBRTs7QUFFaEMsTUFBSSxDQUFDLEdBQUcsRUFBRTtBQUNULFVBQU8sTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO0dBQ3BCOzs7QUFHRCxLQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFTLE1BQU0sRUFBRTtBQUNqQyxPQUFJO0FBQ0gsV0FBUSxNQUFN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QUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBQyxDQUFDLENBQUM7RUFDdEc7Q0FDRCxDQUFDOzs7QUFHRixxQkFBUSxNQUFNLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzdCLHFCQUFRLE1BQU0sQ0FBQywyQkFBMkIsRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO0FBQ3ZFLHFCQUFRLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxlQUFlLENBQUMsQ0FBQztBQUNuRCxxQkFBUSxNQUFNLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ25DLHFCQUFRLE1BQU0sQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDdkMscUJBQVEsTUFBTSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztBQUNyQyxxQkFBUSxNQUFNLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDOzs7QUFHM0MsSUFBSSxDQUFDLE9BQU8sR0FBRyxhQUFhLENBQUM7O3FCQUVkLElBQUkiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IHZpZGVvanMgZnJvbSAndmlkZW8uanMnO1xuXG5cbi8vIERlZmF1bHQgb3B0aW9ucyBmb3IgdGhlIHBsdWdpbi5cbmNvbnN0IGRlZmF1bHRzID0ge307XG5cbi8qKlxuICogRnVuY3Rpb24gdG8gaW52b2tlIHdoZW4gdGhlIHBsYXllciBpcyByZWFkeS5cbiAqXG4gKiBUaGlzIGlzIGEgZ3JlYXQgcGxhY2UgZm9yIHlvdXIgcGx1Z2luIHRvIGluaXRpYWxpemUgaXRzZWxmLiBXaGVuIHRoaXNcbiAqIGZ1bmN0aW9uIGlzIGNhbGxlZCwgdGhlIHBsYXllciB3aWxsIGhhdmUgaXRzIERPTSBhbmQgY2hpbGQgY29tcG9uZW50c1xuICogaW4gcGxhY2UuXG4gKlxuICogQGZ1bmN0aW9uIG9uUGxheWVyUmVhZHlcbiAqIEBwYXJhbSAgICB7UGxheWVyfSBwbGF5ZXJcbiAqIEBwYXJhbSAgICB7T2JqZWN0fSBbb3B0aW9ucz17fV1cbiAqL1xuY29uc3Qgb25QbGF5ZXJSZWFkeSA9IChwbGF5ZXIsIG9wdGlvbnMpID0+IHtcblx0cGxheWVyLmFkZENsYXNzKCd2anMtb3BlbicpO1xuXHRcblxufTtcblxuLyoqXG4gKiBBIHZpZGVvLmpzIHBsdWdpbi5cbiAqXG4gKiBJbiB0aGUgcGx1Z2luIGZ1bmN0aW9uLCB0aGUgdmFsdWUgb2YgYHRoaXNgIGlzIGEgdmlkZW8uanMgYFBsYXllcmBcbiAqIGluc3RhbmNlLiBZb3UgY2Fubm90IHJlbHkgb24gdGhlIHBsYXllciBiZWluZyBpbiBhIFwicmVhZHlcIiBzdGF0ZSBoZXJlLFxuICogZGVwZW5kaW5nIG9uIGhvdyB0aGUgcGx1Z2luIGlzIGludm9rZWQuIFRoaXMgbWF5IG9yIG1heSBub3QgYmUgaW1wb3J0YW50XG4gKiB0byB5b3U7IGlmIG5vdCwgcmVtb3ZlIHRoZSB3YWl0IGZvciBcInJlYWR5XCIhXG4gKlxuICogQGZ1bmN0aW9uIG9wZW5cbiAqIEBwYXJhbSAgICB7T2JqZWN0fSBbb3B0aW9ucz17fV1cbiAqICAgICAgICAgICBBbiBvYmplY3Qgb2Ygb3B0aW9ucyBsZWZ0IHRvIHRoZSBwbHVnaW4gYXV0aG9yIHRvIGRlZmluZS5cbiAqL1xuY29uc3Qgb3BlbiA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0dGhpcy5yZWFkeSgoKSA9PiB7XG5cdFx0b25QbGF5ZXJSZWFkeSh0aGlzLCB2aWRlb2pzLm1lcmdlT3B0aW9ucyhkZWZhdWx0cywgb3B0aW9ucykpO1xuXHR9KTtcbn07XG5cbi8qKlxuICog5YiG6L6o546HXG4gKiBAcGFyYW0ge1t0eXBlXX0gb3B0aW9ucyBbZGVzY3JpcHRpb25dXG4gKiByZXR1cm4ge1t0eXBlXX0gIFtkZXNjcmlwdGlvbl1cbiAqL1xuY29uc3QgdmlkZW9Kc1Jlc29sdXRpb25Td2l0Y2hlciA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblxuXHQvKipcblx0ICogSW5pdGlhbGl6ZSB0aGUgcGx1Z2luLlxuXHQgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSBwbHVnaW5cblx0ICovXG5cblx0dmFyIHNldHRpbmdzID0gdmlkZW9qcy5tZXJnZU9wdGlvbnMoZGVmYXVsdHMsIG9wdGlvbnMpLFxuXHRcdHBsYXllciA9IHRoaXMsXG5cdFx0Z3JvdXBlZFNyYyA9IHt9LFxuXHRcdGN1cnJlbnRTb3VyY2VzID0ge30sXG5cdFx0Y3VycmVudFJlc29sdXRpb25TdGF0ZSA9IHt9O1xuXG5cdC8qKlxuXHQgKiBVcGRhdGVzIHBsYXllciBzb3VyY2VzIG9yIHJldHVybnMgY3VycmVudCBzb3VyY2UgVVJMXG5cdCAqIEBwYXJhbSAgIHtBcnJheX0gIFtzcmNdIGFycmF5IG9mIHNvdXJjZXMgW3tzcmM6ICcnLCB0eXBlOiAnJywgbGFiZWw6ICcnLCByZXM6ICcnfV1cblx0ICogQHJldHVybnMge09iamVjdHxTdHJpbmd8QXJyYXl9IHZpZGVvanMgcGxheWVyIG9iamVjdCBpZiB1c2VkIGFzIHNldHRlciBvciBjdXJyZW50IHNvdXJjZSBVUkwsIG9iamVjdCwgb3IgYXJyYXkgb2Ygc291cmNlc1xuXHQgKi9cblx0cGxheWVyLnVwZGF0ZVNyYyA9IGZ1bmN0aW9uKHNyYykge1xuXHRcdC8vUmV0dXJuIGN1cnJlbnQgc3JjIGlmIHNyYyBpcyBub3QgZ2l2ZW5cblx0XHRpZiAoIXNyYykge1xuXHRcdFx0cmV0dXJuIHBsYXllci5zcmMoKTtcblx0XHR9XG5cblx0XHQvLyBPbmx5IGFkZCB0aG9zZSBzb3VyY2VzIHdoaWNoIHdlIGNhbiAobWF5YmUpIHBsYXlcblx0XHRzcmMgPSBzcmMuZmlsdGVyKGZ1bmN0aW9uKHNvdXJjZSkge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0cmV0dXJuIChwbGF5ZXIuY2FuUGxheVR5cGUoc291cmNlLnR5cGUpICE9PSAnJyk7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdC8vIElmIGEgVGVjaCBkb2Vzbid0IHlldCBoYXZlIGNhblBsYXlUeXBlIGp1c3QgYWRkIGl0XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdC8vU29ydCBzb3VyY2VzXG5cdFx0dGhpcy5jdXJyZW50U291cmNlcyA9IHNyYy5zb3J0KGNvbXBhcmVSZXNvbHV0aW9ucyk7XG5cdFx0dGhpcy5ncm91cGVkU3JjID0gYnVja2V0U291cmNlcyh0aGlzLmN1cnJlbnRTb3VyY2VzKTtcblx0XHQvLyBQaWNrIG9uZSBieSBkZWZhdWx0XG5cdFx0dmFyIGNob3NlbiA9IGNob29zZVNyYyh0aGlzLmdyb3VwZWRTcmMsIHRoaXMuY3VycmVudFNvdXJjZXMpO1xuXHRcdHRoaXMuY3VycmVudFJlc29sdXRpb25TdGF0ZSA9IHtcblx0XHRcdGxhYmVsOiBjaG9zZW4ubGFiZWwsXG5cdFx0XHRzb3VyY2VzOiBjaG9zZW4uc291cmNlc1xuXHRcdH07XG5cblx0XHRwbGF5ZXIudHJpZ2dlcigndXBkYXRlU291cmNlcycpO1xuXHRcdHBsYXllci5zZXRTb3VyY2VzU2FuaXRpemVkKGNob3Nlbi5zb3VyY2VzLCBjaG9zZW4ubGFiZWwpO1xuXHRcdHBsYXllci50cmlnZ2VyKCdyZXNvbHV0aW9uY2hhbmdlJyk7XG5cdFx0cmV0dXJuIHBsYXllcjtcblx0fTtcblxuXHQvKipcblx0ICogUmV0dXJucyBjdXJyZW50IHJlc29sdXRpb24gb3Igc2V0cyBvbmUgd2hlbiBsYWJlbCBpcyBzcGVjaWZpZWRcblx0ICogQHBhcmFtIHtTdHJpbmd9ICAgW2xhYmVsXSAgICAgICAgIGxhYmVsIG5hbWVcblx0ICogQHBhcmFtIHtGdW5jdGlvbn0gW2N1c3RvbVNvdXJjZVBpY2tlcl0gY3VzdG9tIGZ1bmN0aW9uIHRvIGNob29zZSBzb3VyY2UuIFRha2VzIDIgYXJndW1lbnRzOiBzb3VyY2VzLCBsYWJlbC4gTXVzdCByZXR1cm4gcGxheWVyIG9iamVjdC5cblx0ICogQHJldHVybnMge09iamVjdH0gICBjdXJyZW50IHJlc29sdXRpb24gb2JqZWN0IHtsYWJlbDogJycsIHNvdXJjZXM6IFtdfSBpZiB1c2VkIGFzIGdldHRlciBvciBwbGF5ZXIgb2JqZWN0IGlmIHVzZWQgYXMgc2V0dGVyXG5cdCAqL1xuXHRwbGF5ZXIuY3VycmVudFJlc29sdXRpb24gPSBmdW5jdGlvbihsYWJlbCwgY3VzdG9tU291cmNlUGlja2VyKSB7XG5cdFx0aWYgKGxhYmVsID09IG51bGwpIHtcblx0XHRcdHJldHVybiB0aGlzLmN1cnJlbnRSZXNvbHV0aW9uU3RhdGU7XG5cdFx0fVxuXG5cdFx0Ly8gTG9va3VwIHNvdXJjZXMgZm9yIGxhYmVsXG5cdFx0aWYgKCF0aGlzLmdyb3VwZWRTcmMgfHwgIXRoaXMuZ3JvdXBlZFNyYy5sYWJlbCB8fCAhdGhpcy5ncm91cGVkU3JjLmxhYmVsW2xhYmVsXSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR2YXIgc291cmNlcyA9IHRoaXMuZ3JvdXBlZFNyYy5sYWJlbFtsYWJlbF07XG5cdFx0Ly8gUmVtZW1iZXIgcGxheWVyIHN0YXRlXG5cdFx0dmFyIGN1cnJlbnRUaW1lID0gcGxheWVyLmN1cnJlbnRUaW1lKCk7XG5cdFx0dmFyIGlzUGF1c2VkID0gcGxheWVyLnBhdXNlZCgpO1xuXG5cdFx0Ly8gSGlkZSBiaWdQbGF5QnV0dG9uXG5cdFx0aWYgKCFpc1BhdXNlZCAmJiB0aGlzLnBsYXllcl8ub3B0aW9uc18uYmlnUGxheUJ1dHRvbikge1xuXHRcdFx0dGhpcy5wbGF5ZXJfLmJpZ1BsYXlCdXR0b24uaGlkZSgpO1xuXHRcdH1cblxuXHRcdC8vIENoYW5nZSBwbGF5ZXIgc291cmNlIGFuZCB3YWl0IGZvciBsb2FkZWRkYXRhIGV2ZW50LCB0aGVuIHBsYXkgdmlkZW9cblx0XHQvLyBsb2FkZWRtZXRhZGF0YSBkb2Vzbid0IHdvcmsgcmlnaHQgbm93IGZvciBmbGFzaC5cblx0XHQvLyBQcm9iYWJseSBiZWNhdXNlIG9mIGh0dHBzOi8vZ2l0aHViLmNvbS92aWRlb2pzL3ZpZGVvLWpzLXN3Zi9pc3N1ZXMvMTI0XG5cdFx0Ly8gSWYgcGxheWVyIHByZWxvYWQgaXMgJ25vbmUnIGFuZCB0aGVuIGxvYWRlZGRhdGEgbm90IGZpcmVkLiBTbywgd2UgbmVlZCB0aW1ldXBkYXRlIGV2ZW50IGZvciBzZWVrIGhhbmRsZSAodGltZXVwZGF0ZSBkb2Vzbid0IHdvcmsgcHJvcGVybHkgd2l0aCBmbGFzaClcblx0XHR2YXIgaGFuZGxlU2Vla0V2ZW50ID0gJ2xvYWRlZGRhdGEnO1xuXHRcdGlmICh0aGlzLnBsYXllcl8udGVjaE5hbWVfICE9PSAnWW91dHViZScgJiYgdGhpcy5wbGF5ZXJfLnByZWxvYWQoKSA9PT0gJ25vbmUnICYmIHRoaXMucGxheWVyXy50ZWNoTmFtZV8gIT09ICdGbGFzaCcpIHtcblx0XHRcdGhhbmRsZVNlZWtFdmVudCA9ICd0aW1ldXBkYXRlJztcblx0XHR9XG5cdFx0cGxheWVyXG5cdFx0XHQuc2V0U291cmNlc1Nhbml0aXplZChzb3VyY2VzLCBsYWJlbCwgY3VzdG9tU291cmNlUGlja2VyIHx8IHNldHRpbmdzLmN1c3RvbVNvdXJjZVBpY2tlcilcblx0XHRcdC5vbmUoaGFuZGxlU2Vla0V2ZW50LCBmdW5jdGlvbigpIHtcblx0XHRcdFx0cGxheWVyLmN1cnJlbnRUaW1lKGN1cnJlbnRUaW1lKTtcblx0XHRcdFx0cGxheWVyLmhhbmRsZVRlY2hTZWVrZWRfKCk7XG5cdFx0XHRcdGlmICghaXNQYXVzZWQpIHtcblx0XHRcdFx0XHQvLyBTdGFydCBwbGF5aW5nIGFuZCBoaWRlIGxvYWRpbmdTcGlubmVyIChmbGFzaCBpc3N1ZSA/KVxuXHRcdFx0XHRcdHBsYXllci5wbGF5KCkuaGFuZGxlVGVjaFNlZWtlZF8oKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRwbGF5ZXIudHJpZ2dlcigncmVzb2x1dGlvbmNoYW5nZScpO1xuXHRcdFx0fSk7XG5cdFx0cmV0dXJuIHBsYXllcjtcblx0fTtcblxuXHQvKipcblx0ICogUmV0dXJucyBncm91cGVkIHNvdXJjZXMgYnkgbGFiZWwsIHJlc29sdXRpb24gYW5kIHR5cGVcblx0ICogQHJldHVybnMge09iamVjdH0gZ3JvdXBlZCBzb3VyY2VzOiB7IGxhYmVsOiB7IGtleTogW10gfSwgcmVzOiB7IGtleTogW10gfSwgdHlwZTogeyBrZXk6IFtdIH0gfVxuXHQgKi9cblx0cGxheWVyLmdldEdyb3VwZWRTcmMgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5ncm91cGVkU3JjO1xuXHR9O1xuXHRwbGF5ZXIuc2V0U291cmNlc1Nhbml0aXplZCA9IGZ1bmN0aW9uKHNvdXJjZXMsIGxhYmVsLCBjdXN0b21Tb3VyY2VQaWNrZXIpIHtcblx0XHR0aGlzLmN1cnJlbnRSZXNvbHV0aW9uU3RhdGUgPSB7XG5cdFx0XHRsYWJlbDogbGFiZWwsXG5cdFx0XHRzb3VyY2VzOiBzb3VyY2VzXG5cdFx0fTtcblxuXHRcdGlmICh0eXBlb2YgY3VzdG9tU291cmNlUGlja2VyID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRyZXR1cm4gY3VzdG9tU291cmNlUGlja2VyKHBsYXllciwgc291cmNlcywgbGFiZWwpO1xuXHRcdH1cblx0XHRwbGF5ZXIuc3JjKHNvdXJjZXMubWFwKGZ1bmN0aW9uKHNyYykge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0c3JjOiBzcmMuc3JjLFxuXHRcdFx0XHR0eXBlOiBzcmMudHlwZSxcblx0XHRcdFx0cmVzOiBzcmMucmVzXG5cdFx0XHR9O1xuXHRcdH0pKTtcblxuXHRcdCQoXCIudmpzLXJlc29sdXRpb24tYnV0dG9uLWxhYmVsXCIpLmh0bWwobGFiZWwpO1xuXHRcdHJldHVybiBwbGF5ZXI7XG5cdH07XG5cblx0LyoqXG5cdCAqIE1ldGhvZCB1c2VkIGZvciBzb3J0aW5nIGxpc3Qgb2Ygc291cmNlc1xuXHQgKiBAcGFyYW0gICB7T2JqZWN0fSBhIC0gc291cmNlIG9iamVjdCB3aXRoIHJlcyBwcm9wZXJ0eVxuXHQgKiBAcGFyYW0gICB7T2JqZWN0fSBiIC0gc291cmNlIG9iamVjdCB3aXRoIHJlcyBwcm9wZXJ0eVxuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSByZXN1bHQgb2YgY29tcGFyYXRpb25cblx0ICovXG5cdGZ1bmN0aW9uIGNvbXBhcmVSZXNvbHV0aW9ucyhhLCBiKSB7XG5cdFx0aWYgKCFhLnJlcyB8fCAhYi5yZXMpIHtcblx0XHRcdHJldHVybiAwO1xuXHRcdH1cblx0XHRyZXR1cm4gKCtiLnJlcykgLSAoK2EucmVzKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBHcm91cCBzb3VyY2VzIGJ5IGxhYmVsLCByZXNvbHV0aW9uIGFuZCB0eXBlXG5cdCAqIEBwYXJhbSAgIHtBcnJheX0gIHNyYyBBcnJheSBvZiBzb3VyY2VzXG5cdCAqIEByZXR1cm5zIHtPYmplY3R9IGdyb3VwZWQgc291cmNlczogeyBsYWJlbDogeyBrZXk6IFtdIH0sIHJlczogeyBrZXk6IFtdIH0sIHR5cGU6IHsga2V5OiBbXSB9IH1cblx0ICovXG5cdGZ1bmN0aW9uIGJ1Y2tldFNvdXJjZXMoc3JjKSB7XG5cdFx0dmFyIHJlc29sdXRpb25zID0ge1xuXHRcdFx0bGFiZWw6IHt9LFxuXHRcdFx0cmVzOiB7fSxcblx0XHRcdHR5cGU6IHt9XG5cdFx0fTtcblx0XHRzcmMubWFwKGZ1bmN0aW9uKHNvdXJjZSkge1xuXHRcdFx0aW5pdFJlc29sdXRpb25LZXkocmVzb2x1dGlvbnMsICdsYWJlbCcsIHNvdXJjZSk7XG5cdFx0XHRpbml0UmVzb2x1dGlvbktleShyZXNvbHV0aW9ucywgJ3JlcycsIHNvdXJjZSk7XG5cdFx0XHRpbml0UmVzb2x1dGlvbktleShyZXNvbHV0aW9ucywgJ3R5cGUnLCBzb3VyY2UpO1xuXG5cdFx0XHRhcHBlbmRTb3VyY2VUb0tleShyZXNvbHV0aW9ucywgJ2xhYmVsJywgc291cmNlKTtcblx0XHRcdGFwcGVuZFNvdXJjZVRvS2V5KHJlc29sdXRpb25zLCAncmVzJywgc291cmNlKTtcblx0XHRcdGFwcGVuZFNvdXJjZVRvS2V5KHJlc29sdXRpb25zLCAndHlwZScsIHNvdXJjZSk7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHJlc29sdXRpb25zO1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5pdFJlc29sdXRpb25LZXkocmVzb2x1dGlvbnMsIGtleSwgc291cmNlKSB7XG5cdFx0aWYgKHJlc29sdXRpb25zW2tleV1bc291cmNlW2tleV1dID09IG51bGwpIHtcblx0XHRcdHJlc29sdXRpb25zW2tleV1bc291cmNlW2tleV1dID0gW107XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gYXBwZW5kU291cmNlVG9LZXkocmVzb2x1dGlvbnMsIGtleSwgc291cmNlKSB7XG5cdFx0cmVzb2x1dGlvbnNba2V5XVtzb3VyY2Vba2V5XV0ucHVzaChzb3VyY2UpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENob29zZSBzcmMgaWYgb3B0aW9uLmRlZmF1bHQgaXMgc3BlY2lmaWVkXG5cdCAqIEBwYXJhbSAgIHtPYmplY3R9IGdyb3VwZWRTcmMge3JlczogeyBrZXk6IFtdIH19XG5cdCAqIEBwYXJhbSAgIHtBcnJheX0gIHNyYyBBcnJheSBvZiBzb3VyY2VzIHNvcnRlZCBieSByZXNvbHV0aW9uIHVzZWQgdG8gZmluZCBoaWdoIGFuZCBsb3cgcmVzXG5cdCAqIEByZXR1cm5zIHtPYmplY3R9IHtyZXM6IHN0cmluZywgc291cmNlczogW119XG5cdCAqL1xuXHRmdW5jdGlvbiBjaG9vc2VTcmMoZ3JvdXBlZFNyYywgc3JjKSB7XG5cdFx0dmFyIHNlbGVjdGVkUmVzID0gc2V0dGluZ3NbJ2RlZmF1bHQnXTsgLy8gdXNlIGFycmF5IGFjY2VzcyBhcyBkZWZhdWx0IGlzIGEgcmVzZXJ2ZWQga2V5d29yZFxuXHRcdHZhciBzZWxlY3RlZExhYmVsID0gJyc7XG5cdFx0aWYgKHNlbGVjdGVkUmVzID09PSAnaGlnaCcpIHtcblx0XHRcdHNlbGVjdGVkUmVzID0gc3JjWzBdLnJlcztcblx0XHRcdHNlbGVjdGVkTGFiZWwgPSBzcmNbMF0ubGFiZWw7XG5cdFx0fSBlbHNlIGlmIChzZWxlY3RlZFJlcyA9PT0gJ2xvdycgfHwgc2VsZWN0ZWRSZXMgPT0gbnVsbCB8fCAhZ3JvdXBlZFNyYy5yZXNbc2VsZWN0ZWRSZXNdKSB7XG5cdFx0XHQvLyBTZWxlY3QgbG93LXJlcyBpZiBkZWZhdWx0IGlzIGxvdyBvciBub3Qgc2V0XG5cdFx0XHRzZWxlY3RlZFJlcyA9IHNyY1tzcmMubGVuZ3RoIC0gMV0ucmVzO1xuXHRcdFx0c2VsZWN0ZWRMYWJlbCA9IHNyY1tzcmMubGVuZ3RoIC0gMV0ubGFiZWw7XG5cdFx0fSBlbHNlIGlmIChncm91cGVkU3JjLnJlc1tzZWxlY3RlZFJlc10pIHtcblx0XHRcdHNlbGVjdGVkTGFiZWwgPSBncm91cGVkU3JjLnJlc1tzZWxlY3RlZFJlc11bMF0ubGFiZWw7XG5cdFx0fVxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXM6IHNlbGVjdGVkUmVzLFxuXHRcdFx0bGFiZWw6IHNlbGVjdGVkTGFiZWwsXG5cdFx0XHRzb3VyY2VzOiBncm91cGVkU3JjLnJlc1tzZWxlY3RlZFJlc11cblx0XHR9O1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5pdFJlc29sdXRpb25Gb3JZdChwbGF5ZXIpIHtcblx0XHQvLyBNYXAgeW91dHViZSBxdWFsaXRpZXMgbmFtZXNcblx0XHR2YXIgX3l0cyA9IHtcblx0XHRcdGhpZ2hyZXM6IHtcblx0XHRcdFx0cmVzOiAxMDgwLFxuXHRcdFx0XHRsYWJlbDogJzEwODAnLFxuXHRcdFx0XHR5dDogJ2hpZ2hyZXMnXG5cdFx0XHR9LFxuXHRcdFx0aGQxMDgwOiB7XG5cdFx0XHRcdHJlczogMTA4MCxcblx0XHRcdFx0bGFiZWw6ICcxMDgwJyxcblx0XHRcdFx0eXQ6ICdoZDEwODAnXG5cdFx0XHR9LFxuXHRcdFx0aGQ3MjA6IHtcblx0XHRcdFx0cmVzOiA3MjAsXG5cdFx0XHRcdGxhYmVsOiAnNzIwJyxcblx0XHRcdFx0eXQ6ICdoZDcyMCdcblx0XHRcdH0sXG5cdFx0XHRsYXJnZToge1xuXHRcdFx0XHRyZXM6IDQ4MCxcblx0XHRcdFx0bGFiZWw6ICc0ODAnLFxuXHRcdFx0XHR5dDogJ2xhcmdlJ1xuXHRcdFx0fSxcblx0XHRcdG1lZGl1bToge1xuXHRcdFx0XHRyZXM6IDM2MCxcblx0XHRcdFx0bGFiZWw6ICczNjAnLFxuXHRcdFx0XHR5dDogJ21lZGl1bSdcblx0XHRcdH0sXG5cdFx0XHRzbWFsbDoge1xuXHRcdFx0XHRyZXM6IDI0MCxcblx0XHRcdFx0bGFiZWw6ICcyNDAnLFxuXHRcdFx0XHR5dDogJ3NtYWxsJ1xuXHRcdFx0fSxcblx0XHRcdHRpbnk6IHtcblx0XHRcdFx0cmVzOiAxNDQsXG5cdFx0XHRcdGxhYmVsOiAnMTQ0Jyxcblx0XHRcdFx0eXQ6ICd0aW55J1xuXHRcdFx0fSxcblx0XHRcdGF1dG86IHtcblx0XHRcdFx0cmVzOiAwLFxuXHRcdFx0XHRsYWJlbDogJ2F1dG8nLFxuXHRcdFx0XHR5dDogJ2F1dG8nXG5cdFx0XHR9XG5cdFx0fTtcblx0XHQvLyBPdmVyd3JpdGUgZGVmYXVsdCBzb3VyY2VQaWNrZXIgZnVuY3Rpb25cblx0XHR2YXIgX2N1c3RvbVNvdXJjZVBpY2tlciA9IGZ1bmN0aW9uKF9wbGF5ZXIsIF9zb3VyY2VzLCBfbGFiZWwpIHtcblx0XHRcdC8vIE5vdGUgdGhhdCBzZXRQbGF5ZWJhY2tRdWFsaXR5IGlzIGEgc3VnZ2VzdGlvbi4gWVQgZG9lcyBub3QgYWx3YXlzIG9iZXkgaXQuXG5cdFx0XHRwbGF5ZXIudGVjaF8ueXRQbGF5ZXIuc2V0UGxheWJhY2tRdWFsaXR5KF9zb3VyY2VzWzBdLl95dCk7XG5cdFx0XHRwbGF5ZXIudHJpZ2dlcigndXBkYXRlU291cmNlcycpO1xuXHRcdFx0cmV0dXJuIHBsYXllcjtcblx0XHR9O1xuXHRcdHNldHRpbmdzLmN1c3RvbVNvdXJjZVBpY2tlciA9IF9jdXN0b21Tb3VyY2VQaWNrZXI7XG5cblx0XHQvLyBJbml0IHJlc29sdXRpb25cblx0XHRwbGF5ZXIudGVjaF8ueXRQbGF5ZXIuc2V0UGxheWJhY2tRdWFsaXR5KCdhdXRvJyk7XG5cblx0XHQvLyBUaGlzIGlzIHRyaWdnZXJlZCB3aGVuIHRoZSByZXNvbHV0aW9uIGFjdHVhbGx5IGNoYW5nZXNcblx0XHRwbGF5ZXIudGVjaF8ueXRQbGF5ZXIuYWRkRXZlbnRMaXN0ZW5lcignb25QbGF5YmFja1F1YWxpdHlDaGFuZ2UnLCBmdW5jdGlvbihldmVudCkge1xuXHRcdFx0Zm9yICh2YXIgcmVzIGluIF95dHMpIHtcblx0XHRcdFx0aWYgKHJlcy55dCA9PT0gZXZlbnQuZGF0YSkge1xuXHRcdFx0XHRcdHBsYXllci5jdXJyZW50UmVzb2x1dGlvbihyZXMubGFiZWwsIF9jdXN0b21Tb3VyY2VQaWNrZXIpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0Ly8gV2UgbXVzdCB3YWl0IGZvciBwbGF5IGV2ZW50XG5cdFx0cGxheWVyLm9uZSgncGxheScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHF1YWxpdGllcyA9IHBsYXllci50ZWNoXy55dFBsYXllci5nZXRBdmFpbGFibGVRdWFsaXR5TGV2ZWxzKCk7XG5cdFx0XHR2YXIgX3NvdXJjZXMgPSBbXTtcblxuXHRcdFx0cXVhbGl0aWVzLm1hcChmdW5jdGlvbihxKSB7XG5cdFx0XHRcdF9zb3VyY2VzLnB1c2goe1xuXHRcdFx0XHRcdHNyYzogcGxheWVyLnNyYygpLnNyYyxcblx0XHRcdFx0XHR0eXBlOiBwbGF5ZXIuc3JjKCkudHlwZSxcblx0XHRcdFx0XHRsYWJlbDogX3l0c1txXS5sYWJlbCxcblx0XHRcdFx0XHRyZXM6IF95dHNbcV0ucmVzLFxuXHRcdFx0XHRcdF95dDogX3l0c1txXS55dFxuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXG5cdFx0XHRwbGF5ZXIuZ3JvdXBlZFNyYyA9IGJ1Y2tldFNvdXJjZXMoX3NvdXJjZXMpO1xuXHRcdFx0dmFyIGNob3NlbiA9IHtcblx0XHRcdFx0bGFiZWw6ICdhdXRvJyxcblx0XHRcdFx0cmVzOiAwLFxuXHRcdFx0XHRzb3VyY2VzOiBwbGF5ZXIuZ3JvdXBlZFNyYy5sYWJlbC5hdXRvXG5cdFx0XHR9O1xuXG5cdFx0XHR0aGlzLmN1cnJlbnRSZXNvbHV0aW9uU3RhdGUgPSB7XG5cdFx0XHRcdGxhYmVsOiBjaG9zZW4ubGFiZWwsXG5cdFx0XHRcdHNvdXJjZXM6IGNob3Nlbi5zb3VyY2VzXG5cdFx0XHR9O1xuXG5cdFx0XHRwbGF5ZXIudHJpZ2dlcigndXBkYXRlU291cmNlcycpO1xuXHRcdFx0cGxheWVyLnNldFNvdXJjZXNTYW5pdGl6ZWQoY2hvc2VuLnNvdXJjZXMsIGNob3Nlbi5sYWJlbCwgX2N1c3RvbVNvdXJjZVBpY2tlcik7XG5cdFx0fSk7XG5cdH1cblxuXHRwbGF5ZXIucmVhZHkoZnVuY3Rpb24oKSB7XG5cdFx0aWYgKHNldHRpbmdzLnVpKSB7XG5cdFx0XHR2YXIgbWVudUJ1dHRvbiA9IG5ldyBSZXNvbHV0aW9uTWVudUJ1dHRvbihwbGF5ZXIsIHNldHRpbmdzKTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnJlc29sdXRpb25Td2l0Y2hlciA9IHBsYXllci5jb250cm9sQmFyLmVsXy5pbnNlcnRCZWZvcmUobWVudUJ1dHRvbi5lbF8sIHBsYXllci5jb250cm9sQmFyLmdldENoaWxkKCdmdWxsc2NyZWVuVG9nZ2xlJykuZWxfKTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnJlc29sdXRpb25Td2l0Y2hlci5kaXNwb3NlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHRoaXMucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzKTtcblx0XHRcdH07XG5cdFx0fVxuXHRcdGlmIChwbGF5ZXIub3B0aW9uc18uc291cmNlcy5sZW5ndGggPiAxKSB7XG5cdFx0XHQvLyB0ZWNoOiBIdG1sNSBhbmQgRmxhc2hcblx0XHRcdC8vIENyZWF0ZSByZXNvbHV0aW9uIHN3aXRjaGVyIGZvciB2aWRlb3MgZm9ybSA8c291cmNlPiB0YWcgaW5zaWRlIDx2aWRlbz5cblx0XHRcdHBsYXllci51cGRhdGVTcmMocGxheWVyLm9wdGlvbnNfLnNvdXJjZXMpO1xuXHRcdH1cblxuXHRcdGlmIChwbGF5ZXIudGVjaE5hbWVfID09PSAnWW91dHViZScpIHtcblx0XHRcdC8vIHRlY2g6IFlvdVR1YmVcblx0XHRcdGluaXRSZXNvbHV0aW9uRm9yWXQocGxheWVyKTtcblx0XHR9XG5cdH0pO1xuXG5cdHZhciB2aWRlb0pzUmVzb2x1dGlvblN3aXRjaGVyLFxuXHRcdGRlZmF1bHRzID0ge1xuXHRcdFx0dWk6IHRydWVcblx0XHR9O1xuXG5cdC8qXG5cdCAqIFJlc29sdXRpb24gbWVudSBpdGVtXG5cdCAqL1xuXHR2YXIgTWVudUl0ZW0gPSB2aWRlb2pzLmdldENvbXBvbmVudCgnTWVudUl0ZW0nKTtcblx0dmFyIFJlc29sdXRpb25NZW51SXRlbSA9IHZpZGVvanMuZXh0ZW5kKE1lbnVJdGVtLCB7XG5cdFx0Y29uc3RydWN0b3I6IGZ1bmN0aW9uKHBsYXllciwgb3B0aW9ucykge1xuXHRcdFx0b3B0aW9ucy5zZWxlY3RhYmxlID0gdHJ1ZTtcblx0XHRcdC8vIFNldHMgdGhpcy5wbGF5ZXJfLCB0aGlzLm9wdGlvbnNfIGFuZCBpbml0aWFsaXplcyB0aGUgY29tcG9uZW50XG5cdFx0XHRNZW51SXRlbS5jYWxsKHRoaXMsIHBsYXllciwgb3B0aW9ucyk7XG5cdFx0XHR0aGlzLnNyYyA9IG9wdGlvbnMuc3JjO1xuXG5cdFx0XHRwbGF5ZXIub24oJ3Jlc29sdXRpb25jaGFuZ2UnLCB2aWRlb2pzLmJpbmQodGhpcywgdGhpcy51cGRhdGUpKTtcblx0XHR9XG5cdH0pO1xuXHRSZXNvbHV0aW9uTWVudUl0ZW0ucHJvdG90eXBlLmhhbmRsZUNsaWNrID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRNZW51SXRlbS5wcm90b3R5cGUuaGFuZGxlQ2xpY2suY2FsbCh0aGlzLCBldmVudCk7XG5cdFx0dGhpcy5wbGF5ZXJfLmN1cnJlbnRSZXNvbHV0aW9uKHRoaXMub3B0aW9uc18ubGFiZWwpO1xuXHR9O1xuXHRSZXNvbHV0aW9uTWVudUl0ZW0ucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxlY3Rpb24gPSB0aGlzLnBsYXllcl8uY3VycmVudFJlc29sdXRpb24oKTtcblx0XHR0aGlzLnNlbGVjdGVkKHRoaXMub3B0aW9uc18ubGFiZWwgPT09IHNlbGVjdGlvbi5sYWJlbCk7XG5cdH07XG5cdE1lbnVJdGVtLnJlZ2lzdGVyQ29tcG9uZW50KCdSZXNvbHV0aW9uTWVudUl0ZW0nLCBSZXNvbHV0aW9uTWVudUl0ZW0pO1xuXG5cdC8qXG5cdCAqIFJlc29sdXRpb24gbWVudSBidXR0b25cblx0ICovXG5cdHZhciBNZW51QnV0dG9uID0gdmlkZW9qcy5nZXRDb21wb25lbnQoJ01lbnVCdXR0b24nKTtcblx0dmFyIFJlc29sdXRpb25NZW51QnV0dG9uID0gdmlkZW9qcy5leHRlbmQoTWVudUJ1dHRvbiwge1xuXHRcdGNvbnN0cnVjdG9yOiBmdW5jdGlvbihwbGF5ZXIsIG9wdGlvbnMpIHtcblx0XHRcdHRoaXMubGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cdFx0XHRvcHRpb25zLmxhYmVsID0gJ1F1YWxpdHknO1xuXHRcdFx0Ly8gU2V0cyB0aGlzLnBsYXllcl8sIHRoaXMub3B0aW9uc18gYW5kIGluaXRpYWxpemVzIHRoZSBjb21wb25lbnRcblx0XHRcdE1lbnVCdXR0b24uY2FsbCh0aGlzLCBwbGF5ZXIsIG9wdGlvbnMpO1xuXHRcdFx0dGhpcy5lbCgpLnNldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcsICdRdWFsaXR5Jyk7XG5cdFx0XHR0aGlzLmNvbnRyb2xUZXh0KCdRdWFsaXR5Jyk7XG5cblx0XHRcdGlmIChvcHRpb25zLmR5bmFtaWNMYWJlbCkge1xuXHRcdFx0XHR2aWRlb2pzLmFkZENsYXNzKHRoaXMubGFiZWwsICd2anMtcmVzb2x1dGlvbi1idXR0b24tbGFiZWwnKTtcblx0XHRcdFx0dGhpcy5lbCgpLmFwcGVuZENoaWxkKHRoaXMubGFiZWwpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dmFyIHN0YXRpY0xhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuXHRcdFx0XHR2aWRlb2pzLmFkZENsYXNzKHN0YXRpY0xhYmVsLCAndmpzLW1lbnUtaWNvbicpO1xuXHRcdFx0XHR0aGlzLmVsKCkuYXBwZW5kQ2hpbGQoc3RhdGljTGFiZWwpO1xuXHRcdFx0fVxuXHRcdFx0cGxheWVyLm9uKCd1cGRhdGVTb3VyY2VzJywgdmlkZW9qcy5iaW5kKHRoaXMsIHRoaXMudXBkYXRlKSk7XG5cdFx0fVxuXHR9KTtcblx0UmVzb2x1dGlvbk1lbnVCdXR0b24ucHJvdG90eXBlLmNyZWF0ZUl0ZW1zID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIG1lbnVJdGVtcyA9IFtdO1xuXHRcdHZhciBsYWJlbHMgPSAodGhpcy5zb3VyY2VzICYmIHRoaXMuc291cmNlcy5sYWJlbCkgfHwge307XG5cblx0XHQvLyBGSVhNRSBvcmRlciBpcyBub3QgZ3VhcmFudGVlZCBoZXJlLlxuXHRcdGZvciAodmFyIGtleSBpbiBsYWJlbHMpIHtcblx0XHRcdGlmIChsYWJlbHMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuXHRcdFx0XHRtZW51SXRlbXMucHVzaChuZXcgUmVzb2x1dGlvbk1lbnVJdGVtKFxuXHRcdFx0XHRcdHRoaXMucGxheWVyXywge1xuXHRcdFx0XHRcdFx0bGFiZWw6IGtleSxcblx0XHRcdFx0XHRcdHNyYzogbGFiZWxzW2tleV0sXG5cdFx0XHRcdFx0XHRzZWxlY3RlZDoga2V5ID09PSAodGhpcy5jdXJyZW50U2VsZWN0aW9uID8gdGhpcy5jdXJyZW50U2VsZWN0aW9uLmxhYmVsIDogZmFsc2UpXG5cdFx0XHRcdFx0fSkpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gbWVudUl0ZW1zO1xuXHR9O1xuXHRSZXNvbHV0aW9uTWVudUJ1dHRvbi5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5zb3VyY2VzID0gdGhpcy5wbGF5ZXJfLmdldEdyb3VwZWRTcmMoKTtcblx0XHR0aGlzLmN1cnJlbnRTZWxlY3Rpb24gPSB0aGlzLnBsYXllcl8uY3VycmVudFJlc29sdXRpb24oKTtcblx0XHR0aGlzLmxhYmVsLmlubmVySFRNTCA9IHRoaXMuY3VycmVudFNlbGVjdGlvbiA/IHRoaXMuY3VycmVudFNlbGVjdGlvbi5sYWJlbCA6ICcnO1xuXHRcdHJldHVybiBNZW51QnV0dG9uLnByb3RvdHlwZS51cGRhdGUuY2FsbCh0aGlzKTtcblx0fTtcblx0UmVzb2x1dGlvbk1lbnVCdXR0b24ucHJvdG90eXBlLmJ1aWxkQ1NTQ2xhc3MgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gTWVudUJ1dHRvbi5wcm90b3R5cGUuYnVpbGRDU1NDbGFzcy5jYWxsKHRoaXMpICsgJyB2anMtcmVzb2x1dGlvbi1idXR0b24nO1xuXHR9O1xuXHRNZW51QnV0dG9uLnJlZ2lzdGVyQ29tcG9uZW50KCdSZXNvbHV0aW9uTWVudUJ1dHRvbicsIFJlc29sdXRpb25NZW51QnV0dG9uKTtcbn07XG5cbi8qKlxuICog56aB55So5rua5Yqo5p2h5ouW5YqoXG4gKiBAcGFyYW0ge1t0eXBlXX0gb3B0aW9ucyBbZGVzY3JpcHRpb25dXG4gKiByZXR1cm4ge1t0eXBlXX0gIFtkZXNjcmlwdGlvbl1cbiAqL1xuY29uc3QgZGlzYWJsZVByb2dyZXNzID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHR2YXJcblx0LyoqXG5cdCAqIENvcGllcyBwcm9wZXJ0aWVzIGZyb20gb25lIG9yIG1vcmUgb2JqZWN0cyBvbnRvIGFuIG9yaWdpbmFsLlxuXHQgKi9cblx0XHRleHRlbmQgPSBmdW5jdGlvbihvYmogLyosIGFyZzEsIGFyZzIsIC4uLiAqLyApIHtcblx0XHRcdHZhciBhcmcsIGksIGs7XG5cdFx0XHRmb3IgKGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGFyZyA9IGFyZ3VtZW50c1tpXTtcblx0XHRcdFx0Zm9yIChrIGluIGFyZykge1xuXHRcdFx0XHRcdGlmIChhcmcuaGFzT3duUHJvcGVydHkoaykpIHtcblx0XHRcdFx0XHRcdG9ialtrXSA9IGFyZ1trXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBvYmo7XG5cdFx0fSxcblxuXHRcdC8vIGRlZmluZSBzb21lIHJlYXNvbmFibGUgZGVmYXVsdHMgZm9yIHRoaXMgc3dlZXQgcGx1Z2luXG5cdFx0ZGVmYXVsdHMgPSB7XG5cdFx0XHRhdXRvRGlzYWJsZTogZmFsc2Vcblx0XHR9O1xuXG5cblx0dmFyXG5cdC8vIHNhdmUgYSByZWZlcmVuY2UgdG8gdGhlIHBsYXllciBpbnN0YW5jZVxuXHRcdHBsYXllciA9IHRoaXMsXG5cdFx0c3RhdGUgPSBmYWxzZSxcblxuXHRcdC8vIG1lcmdlIG9wdGlvbnMgYW5kIGRlZmF1bHRzXG5cdFx0c2V0dGluZ3MgPSBleHRlbmQoe30sIGRlZmF1bHRzLCBvcHRpb25zIHx8IHt9KTtcblxuXHQvLyBkaXNhYmxlIC8gZW5hYmxlIG1ldGhvZHNcblx0cGxheWVyLmRpc2FibGVQcm9ncmVzcyA9IHtcblx0XHRkaXNhYmxlOiBmdW5jdGlvbigpIHtcblx0XHRcdHN0YXRlID0gdHJ1ZTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9mZihcImZvY3VzXCIpO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub2ZmKFwibW91c2Vkb3duXCIpO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub2ZmKFwidG91Y2hzdGFydFwiKTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9mZihcImNsaWNrXCIpO1xuXHRcdH0sXG5cdFx0ZW5hYmxlOiBmdW5jdGlvbigpIHtcblx0XHRcdHN0YXRlID0gZmFsc2U7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vbihcImZvY3VzXCIsIHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLmhhbmRsZUZvY3VzKTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9uKFwibW91c2Vkb3duXCIsIHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLmhhbmRsZU1vdXNlRG93bik7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vbihcInRvdWNoc3RhcnRcIiwgcGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIuaGFuZGxlTW91c2VEb3duKTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9uKFwiY2xpY2tcIiwgcGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIuaGFuZGxlQ2xpY2spO1xuXHRcdH0sXG5cdFx0Z2V0U3RhdGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHN0YXRlO1xuXHRcdH1cblx0fTtcblxuXHRpZiAoc2V0dGluZ3MuYXV0b0Rpc2FibGUpIHtcblx0XHRwbGF5ZXIuZGlzYWJsZVByb2dyZXNzLmRpc2FibGUoKTtcblx0fVxufTtcblxuLyoqXG4gKiDmiZPngrlcbiAqIEBwYXJhbSB7W3R5cGVdfSBvcHRpb25zIFtkZXNjcmlwdGlvbl1cbiAqIHJldHVybiB7W3R5cGVdfSAgW2Rlc2NyaXB0aW9uXVxuICovXG5jb25zdCBtYXJrZXJzID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHQvL2RlZmF1bHQgc2V0dGluZ1xuXHR2YXIgZGVmYXVsdFNldHRpbmcgPSB7XG5cdFx0bWFya2VyU3R5bGU6IHtcblx0XHRcdCd3aWR0aCc6ICc4cHgnLFxuXHRcdFx0J2JvcmRlci1yYWRpdXMnOiAnMjAlJyxcblx0XHRcdCdiYWNrZ3JvdW5kLWNvbG9yJzogJ3JnYmEoMjU1LDAsMCwuNSknXG5cdFx0fSxcblx0XHRtYXJrZXJUaXA6IHtcblx0XHRcdGRpc3BsYXk6IHRydWUsXG5cdFx0XHR0ZXh0OiBmdW5jdGlvbihtYXJrZXIpIHtcblx0XHRcdFx0cmV0dXJuIG1hcmtlci50ZXh0O1xuXHRcdFx0fSxcblx0XHRcdHRpbWU6IGZ1bmN0aW9uKG1hcmtlcikge1xuXHRcdFx0XHRyZXR1cm4gbWFya2VyLnRpbWU7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRicmVha092ZXJsYXk6IHtcblx0XHRcdGRpc3BsYXk6IHRydWUsXG5cdFx0XHRkaXNwbGF5VGltZTogMSxcblx0XHRcdHRleHQ6IGZ1bmN0aW9uKG1hcmtlcikge1xuXHRcdFx0XHRyZXR1cm4gbWFya2VyLm92ZXJsYXlUZXh0O1xuXHRcdFx0fSxcblx0XHRcdHN0eWxlOiB7XG5cdFx0XHRcdCd3aWR0aCc6ICcxMDAlJyxcblx0XHRcdFx0J2hlaWdodCc6ICdjYWxjKDEwMCUgLSAzNnB4KScsXG5cdFx0XHRcdCdiYWNrZ3JvdW5kLWNvbG9yJzogJ3JnYmEoMCwwLDAsMC43KScsXG5cdFx0XHRcdCdjb2xvcic6ICd3aGl0ZScsXG5cdFx0XHRcdCdmb250LXNpemUnOiAnMTdweCdcblx0XHRcdH1cblx0XHR9LFxuXHRcdG9uTWFya2VyQ2xpY2s6IGZ1bmN0aW9uKG1hcmtlcikge1xuXHRcdFx0cmV0dXJuIGZhbHNlXG5cdFx0fSxcblx0XHRvbk1hcmtlclJlYWNoZWQ6IGZ1bmN0aW9uKG1hcmtlcikge30sXG5cdFx0bWFya2VyczogW11cblx0fTtcblxuXHQvLyBjcmVhdGUgYSBub24tY29sbGlkaW5nIHJhbmRvbSBudW1iZXJcblx0ZnVuY3Rpb24gZ2VuZXJhdGVVVUlEKCkge1xuXHRcdHZhciBkID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cdFx0dmFyIHV1aWQgPSAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlKC9beHldL2csIGZ1bmN0aW9uKGMpIHtcblx0XHRcdHZhciByID0gKGQgKyBNYXRoLnJhbmRvbSgpICogMTYpICUgMTYgfCAwO1xuXHRcdFx0ZCA9IE1hdGguZmxvb3IoZCAvIDE2KTtcblx0XHRcdHJldHVybiAoYyA9PSAneCcgPyByIDogKHIgJiAweDMgfCAweDgpKS50b1N0cmluZygxNik7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHV1aWQ7XG5cdH07XG5cdC8qKlxuXHQgKiByZWdpc3RlciB0aGUgbWFya2VycyBwbHVnaW4gKGRlcGVuZGVudCBvbiBqcXVlcnkpXG5cdCAqL1xuXHR2YXIgc2V0dGluZyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0U2V0dGluZywgb3B0aW9ucyksXG5cdFx0bWFya2Vyc01hcCA9IHt9LFxuXHRcdG1hcmtlcnNMaXN0ID0gW10sIC8vIGxpc3Qgb2YgbWFya2VycyBzb3J0ZWQgYnkgdGltZVxuXHRcdHZpZGVvV3JhcHBlciA9ICQodGhpcy5lbCgpKSxcblx0XHRjdXJyZW50TWFya2VySW5kZXggPSAtMSxcblx0XHRwbGF5ZXIgPSB0aGlzLFxuXHRcdG1hcmtlclRpcCA9IG51bGwsXG5cdFx0YnJlYWtPdmVybGF5ID0gbnVsbCxcblx0XHRvdmVybGF5SW5kZXggPSAtMTtcblxuXHRmdW5jdGlvbiBzb3J0TWFya2Vyc0xpc3QoKSB7XG5cdFx0Ly8gc29ydCB0aGUgbGlzdCBieSB0aW1lIGluIGFzYyBvcmRlclxuXHRcdG1hcmtlcnNMaXN0LnNvcnQoZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0cmV0dXJuIHNldHRpbmcubWFya2VyVGlwLnRpbWUoYSkgLSBzZXR0aW5nLm1hcmtlclRpcC50aW1lKGIpO1xuXHRcdH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gYWRkTWFya2VycyhuZXdNYXJrZXJzKSB7XG5cdFx0Ly8gY3JlYXRlIHRoZSBtYXJrZXJzXG5cdFx0JC5lYWNoKG5ld01hcmtlcnMsIGZ1bmN0aW9uKGluZGV4LCBtYXJrZXIpIHtcblx0XHRcdG1hcmtlci5rZXkgPSBnZW5lcmF0ZVVVSUQoKTtcblxuXHRcdFx0dmlkZW9XcmFwcGVyLmZpbmQoJy52anMtcHJvZ3Jlc3MtY29udHJvbCcpLmFwcGVuZChcblx0XHRcdFx0Y3JlYXRlTWFya2VyRGl2KG1hcmtlcikpO1xuXG5cdFx0XHQvLyBzdG9yZSBtYXJrZXIgaW4gYW4gaW50ZXJuYWwgaGFzaCBtYXBcblx0XHRcdG1hcmtlcnNNYXBbbWFya2VyLmtleV0gPSBtYXJrZXI7XG5cdFx0XHRtYXJrZXJzTGlzdC5wdXNoKG1hcmtlcik7XG5cdFx0fSk7XG5cblx0XHRzb3J0TWFya2Vyc0xpc3QoKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGdldFBvc2l0aW9uKG1hcmtlcikge1xuXHRcdHJldHVybiAoc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXIpIC8gcGxheWVyLmR1cmF0aW9uKCkpICogMTAwXG5cdH1cblxuXHRmdW5jdGlvbiBjcmVhdGVNYXJrZXJEaXYobWFya2VyLCBkdXJhdGlvbikge1xuXHRcdHZhciBtYXJrZXJEaXYgPSAkKFwiPGRpdiBjbGFzcz0ndmpzLW1hcmtlcic+PC9kaXY+XCIpO1xuXHRcdHZhciBtYXJnID0gcGFyc2VJbnQodmlkZW9XcmFwcGVyLmZpbmQoJy52anMtcHJvZ3Jlc3MtY29udHJvbCAudmpzLXNsaWRlcicpLmNzcygnbWFyZ2luTGVmdCcpKTtcblx0XHRtYXJrZXJEaXYuY3NzKHNldHRpbmcubWFya2VyU3R5bGUpXG5cdFx0XHQuY3NzKHtcblx0XHRcdFx0XCJtYXJnaW4tbGVmdFwiOiBtYXJnIC0gcGFyc2VGbG9hdChtYXJrZXJEaXYuY3NzKFwid2lkdGhcIikpIC8gMiArICdweCcsXG5cdFx0XHRcdFwibGVmdFwiOiBnZXRQb3NpdGlvbihtYXJrZXIpICsgJyUnXG5cdFx0XHR9KVxuXHRcdFx0LmF0dHIoXCJkYXRhLW1hcmtlci1rZXlcIiwgbWFya2VyLmtleSlcblx0XHRcdC5hdHRyKFwiZGF0YS1tYXJrZXItdGltZVwiLCBzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcikpO1xuXG5cdFx0Ly8gYWRkIHVzZXItZGVmaW5lZCBjbGFzcyB0byBtYXJrZXJcblx0XHRpZiAobWFya2VyLmNsYXNzKSB7XG5cdFx0XHRtYXJrZXJEaXYuYWRkQ2xhc3MobWFya2VyLmNsYXNzKTtcblx0XHR9XG5cblx0XHQvLyBiaW5kIGNsaWNrIGV2ZW50IHRvIHNlZWsgdG8gbWFya2VyIHRpbWVcblx0XHRtYXJrZXJEaXYub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuXG5cdFx0XHR2YXIgcHJldmVudERlZmF1bHQgPSBmYWxzZTtcblx0XHRcdGlmICh0eXBlb2Ygc2V0dGluZy5vbk1hcmtlckNsaWNrID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0Ly8gaWYgcmV0dXJuIGZhbHNlLCBwcmV2ZW50IGRlZmF1bHQgYmVoYXZpb3Jcblx0XHRcdFx0cHJldmVudERlZmF1bHQgPSBzZXR0aW5nLm9uTWFya2VyQ2xpY2sobWFya2VyKSA9PSBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCFwcmV2ZW50RGVmYXVsdCkge1xuXHRcdFx0XHR2YXIga2V5ID0gJCh0aGlzKS5kYXRhKCdtYXJrZXIta2V5Jyk7XG5cdFx0XHRcdHBsYXllci5jdXJyZW50VGltZShzZXR0aW5nLm1hcmtlclRpcC50aW1lKG1hcmtlcnNNYXBba2V5XSkpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0aWYgKHNldHRpbmcubWFya2VyVGlwLmRpc3BsYXkpIHtcblx0XHRcdHJlZ2lzdGVyTWFya2VyVGlwSGFuZGxlcihtYXJrZXJEaXYpO1xuXHRcdH1cblxuXHRcdHJldHVybiBtYXJrZXJEaXY7XG5cdH1cblxuXHRmdW5jdGlvbiB1cGRhdGVNYXJrZXJzKCkge1xuXHRcdC8vIHVwZGF0ZSBVSSBmb3IgbWFya2VycyB3aG9zZSB0aW1lIGNoYW5nZWRcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbWFya2Vyc0xpc3QubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBtYXJrZXIgPSBtYXJrZXJzTGlzdFtpXTtcblx0XHRcdHZhciBtYXJrZXJEaXYgPSB2aWRlb1dyYXBwZXIuZmluZChcIi52anMtbWFya2VyW2RhdGEtbWFya2VyLWtleT0nXCIgKyBtYXJrZXIua2V5ICsgXCInXVwiKTtcblx0XHRcdHZhciBtYXJrZXJUaW1lID0gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXIpO1xuXG5cdFx0XHRpZiAobWFya2VyRGl2LmRhdGEoJ21hcmtlci10aW1lJykgIT0gbWFya2VyVGltZSkge1xuXHRcdFx0XHRtYXJrZXJEaXYuY3NzKHtcblx0XHRcdFx0XHRcdFwibGVmdFwiOiBnZXRQb3NpdGlvbihtYXJrZXIpICsgJyUnXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQuYXR0cihcImRhdGEtbWFya2VyLXRpbWVcIiwgbWFya2VyVGltZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHNvcnRNYXJrZXJzTGlzdCgpO1xuXHR9XG5cblx0ZnVuY3Rpb24gcmVtb3ZlTWFya2VycyhpbmRleEFycmF5KSB7XG5cdFx0Ly8gcmVzZXQgb3ZlcmxheVxuXHRcdGlmIChicmVha092ZXJsYXkpIHtcblx0XHRcdG92ZXJsYXlJbmRleCA9IC0xO1xuXHRcdFx0YnJlYWtPdmVybGF5LmNzcyhcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG5cdFx0fVxuXHRcdGN1cnJlbnRNYXJrZXJJbmRleCA9IC0xO1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBpbmRleEFycmF5Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgaW5kZXggPSBpbmRleEFycmF5W2ldO1xuXHRcdFx0dmFyIG1hcmtlciA9IG1hcmtlcnNMaXN0W2luZGV4XTtcblx0XHRcdGlmIChtYXJrZXIpIHtcblx0XHRcdFx0Ly8gZGVsZXRlIGZyb20gbWVtb3J5XG5cdFx0XHRcdGRlbGV0ZSBtYXJrZXJzTWFwW21hcmtlci5rZXldO1xuXHRcdFx0XHRtYXJrZXJzTGlzdFtpbmRleF0gPSBudWxsO1xuXG5cdFx0XHRcdC8vIGRlbGV0ZSBmcm9tIGRvbVxuXHRcdFx0XHR2aWRlb1dyYXBwZXIuZmluZChcIi52anMtbWFya2VyW2RhdGEtbWFya2VyLWtleT0nXCIgKyBtYXJrZXIua2V5ICsgXCInXVwiKS5yZW1vdmUoKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBjbGVhbiB1cCBhcnJheVxuXHRcdGZvciAodmFyIGkgPSBtYXJrZXJzTGlzdC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0aWYgKG1hcmtlcnNMaXN0W2ldID09PSBudWxsKSB7XG5cdFx0XHRcdG1hcmtlcnNMaXN0LnNwbGljZShpLCAxKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBzb3J0IGFnYWluXG5cdFx0c29ydE1hcmtlcnNMaXN0KCk7XG5cdH1cblxuXG5cdC8vIGF0dGFjaCBob3ZlciBldmVudCBoYW5kbGVyXG5cdGZ1bmN0aW9uIHJlZ2lzdGVyTWFya2VyVGlwSGFuZGxlcihtYXJrZXJEaXYpIHtcblxuXHRcdG1hcmtlckRpdi5vbignbW91c2VvdmVyJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbWFya2VyID0gbWFya2Vyc01hcFskKHRoaXMpLmRhdGEoJ21hcmtlci1rZXknKV07XG5cblx0XHRcdG1hcmtlclRpcC5maW5kKCcudmpzLXRpcC1pbm5lcicpLmh0bWwoc2V0dGluZy5tYXJrZXJUaXAudGV4dChtYXJrZXIpKTtcblxuXHRcdFx0Ly8gbWFyZ2luLWxlZnQgbmVlZHMgdG8gbWludXMgdGhlIHBhZGRpbmcgbGVuZ3RoIHRvIGFsaWduIGNvcnJlY3RseSB3aXRoIHRoZSBtYXJrZXJcblx0XHRcdG1hcmtlclRpcC5jc3Moe1xuXHRcdFx0XHRcImxlZnRcIjogZ2V0UG9zaXRpb24obWFya2VyKSArICclJyxcblx0XHRcdFx0XCJtYXJnaW4tbGVmdFwiOiAtcGFyc2VGbG9hdChtYXJrZXJUaXAuY3NzKFwid2lkdGhcIikpIC8gMiAtIDUgKyAncHgnLFxuXHRcdFx0XHRcInZpc2liaWxpdHlcIjogXCJ2aXNpYmxlXCJcblx0XHRcdH0pO1xuXG5cdFx0fSkub24oJ21vdXNlb3V0JywgZnVuY3Rpb24oKSB7XG5cdFx0XHRtYXJrZXJUaXAuY3NzKFwidmlzaWJpbGl0eVwiLCBcImhpZGRlblwiKTtcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIGluaXRpYWxpemVNYXJrZXJUaXAoKSB7XG5cdFx0bWFya2VyVGlwID0gJChcIjxkaXYgY2xhc3M9J3Zqcy10aXAnPjxkaXYgY2xhc3M9J3Zqcy10aXAtYXJyb3cnPjwvZGl2PjxkaXYgY2xhc3M9J3Zqcy10aXAtaW5uZXInPjwvZGl2PjwvZGl2PlwiKTtcblx0XHR2aWRlb1dyYXBwZXIuZmluZCgnLnZqcy1wcm9ncmVzcy1jb250cm9sJykuYXBwZW5kKG1hcmtlclRpcCk7XG5cdH1cblx0dmFyIGx0ID0gMDtcblx0dmFyIGZ4ID0gLTE7XG5cdC8vIHNob3cgb3IgaGlkZSBicmVhayBvdmVybGF5c1xuXHRmdW5jdGlvbiB1cGRhdGVCcmVha092ZXJsYXkoKSB7XG5cdFx0aWYgKCFzZXR0aW5nLmJyZWFrT3ZlcmxheS5kaXNwbGF5IHx8IGN1cnJlbnRNYXJrZXJJbmRleCA8IDApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR2YXIgY3VycmVudFRpbWUgPSBwbGF5ZXIuY3VycmVudFRpbWUoKTtcblx0XHR2YXIgbWFya2VyID0gbWFya2Vyc0xpc3RbY3VycmVudE1hcmtlckluZGV4XTtcblx0XHR2YXIgbWFya2VyVGltZSA9IHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2VyKTtcblx0XHR2YXIgY3QgPSBjdXJyZW50VGltZSAtIG1hcmtlclRpbWU7XG5cdFx0XG5cdFx0Ly8gaWYgKG92ZXJsYXlJbmRleCA9PSAtMSkge1xuXHRcdC8vIFx0Ly8gZnggPSBjdXJyZW50TWFya2VySW5kZXg7XG5cdFx0Ly8gXHRpZihmeCAhPSBjdXJyZW50TWFya2VySW5kZXggJiYgbHQgPT0gMCl7XG5cdFx0Ly8gXHRcdGx0ID0gY3VycmVudFRpbWUgKyBzZXR0aW5nLmJyZWFrT3ZlcmxheS5kaXNwbGF5VGltZTtcblx0XHQvLyBcdFx0ZnggPSBjdXJyZW50TWFya2VySW5kZXg7XG5cdFx0Ly8gXHR9XG5cdFx0Ly8gXHQvLyBlbHNlIGlmKGx0PT0wKXtcblx0XHQvLyBcdC8vIFx0ZnggPSAtMTtcblx0XHQvLyBcdC8vIH1cblx0XHQvLyBcdC8vZnggPSBjdXJyZW50TWFya2VySW5kZXggPT0gbWFya2Vyc0xpc3QubGVuZ3RoLTEgPyAtMSA6IGN1cnJlbnRNYXJrZXJJbmRleDtcblx0XHQvLyB9XG5cdFx0Ly8gaWYoY3VycmVudFRpbWUgPj0gbWFya2VyVGltZSAmJiBjdXJyZW50VGltZSA8PSBtYXJrZXJUaW1lICsgc2V0dGluZy5icmVha092ZXJsYXkuZGlzcGxheVRpbWUpe1xuXHRcdC8vIFx0bHQgPSBtYXJrZXJUaW1lICsgc2V0dGluZy5icmVha092ZXJsYXkuZGlzcGxheVRpbWU7XG5cdFx0Ly8gfVxuXHRcdC8vIGVsc2V7XG5cdFx0Ly8gXHRsdCA9IGN1cnJlbnRUaW1lICsgc2V0dGluZy5icmVha092ZXJsYXkuZGlzcGxheVRpbWU7XG5cdFx0Ly8gfVxuXHRcdGx0ID0gbWFya2VyVGltZSArIHNldHRpbmcuYnJlYWtPdmVybGF5LmRpc3BsYXlUaW1lO1xuXHRcdC8vY29uc29sZS5sb2coXCIxMTFsdDolc3xjdXI6JXNcIixsdCwgY3VycmVudFRpbWUpO1xuXHRcdC8vIGlmKGN0PjAgJiYgY3Q8MSAmJiBzZXR0aW5nLmJyZWFrT3ZlcmxheS5kaXNwbGF5VGltZT4wICYmIHNldHRpbmcuYnJlYWtPdmVybGF5LmRpc3BsYXlUaW1lPDEpe1xuXHRcdC8vIFx0bHQgPSBjdXJyZW50VGltZSArIHNldHRpbmcuYnJlYWtPdmVybGF5LmRpc3BsYXlUaW1lO1xuXHRcdC8vIFx0Y29uc29sZS5sb2coXCIxMTFsdDolc3xjdXI6JXNcIixsdCwgY3VycmVudFRpbWUpO1xuXHRcdC8vIH1lbHNle1xuXHRcdC8vIFx0bHQgPSBtYXJrZXJUaW1lICsgc2V0dGluZy5icmVha092ZXJsYXkuZGlzcGxheVRpbWU7XG5cdFx0Ly8gXHRjb25zb2xlLmxvZyhcIjIyMmx0OiVzfGN1cjolc1wiLGx0LCBjdXJyZW50VGltZSk7XG5cdFx0Ly8gfVxuXHRcdFxuXHRcdC8vIGlmKGN0PDAuNSlcblx0XHQvLyBcdGx0ID0gbWFya2VyVGltZSArIDAuNTtcblx0XHQvLyBlbHNlXG5cdFx0Ly8gXHRsdCA9IGN1cnJlbnRUaW1lICsgc2V0dGluZy5icmVha092ZXJsYXkuZGlzcGxheVRpbWU7XG5cblx0XHRpZiAoY3VycmVudFRpbWUgPj0gbWFya2VyVGltZSAmJlxuXHRcdFx0Y3VycmVudFRpbWUgPD0gbHQpIHtcblx0XHRcdGlmIChvdmVybGF5SW5kZXggIT0gY3VycmVudE1hcmtlckluZGV4KSB7XG5cdFx0XHRcdG92ZXJsYXlJbmRleCA9IGN1cnJlbnRNYXJrZXJJbmRleDtcblx0XHRcdFx0YnJlYWtPdmVybGF5LmZpbmQoJy52anMtYnJlYWstb3ZlcmxheS10ZXh0JykuaHRtbChzZXR0aW5nLmJyZWFrT3ZlcmxheS50ZXh0KG1hcmtlcikpO1xuXHRcdFx0fVxuXG5cdFx0XHRicmVha092ZXJsYXkuY3NzKCd2aXNpYmlsaXR5JywgXCJ2aXNpYmxlXCIpO1xuXG5cdFx0fSBlbHNlIHtcblx0XHRcdG92ZXJsYXlJbmRleCA9IC0xO1xuXHRcdFx0YnJlYWtPdmVybGF5LmNzcyhcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG5cdFx0XHRsdCA9IDA7XG5cdFx0XHQvLyBpZihjdXJyZW50TWFya2VySW5kZXggPT0gbWFya2Vyc0xpc3QubGVuZ3RoLTEpXG5cdFx0XHQvLyBcdGZ4ID0gLTI7XG5cdFx0XHQvLyBlbHNlXG5cdFx0XHQvLyBcdGx0ID0gMDtcblx0XHR9XG5cdH1cblxuXHQvLyBwcm9ibGVtIHdoZW4gdGhlIG5leHQgbWFya2VyIGlzIHdpdGhpbiB0aGUgb3ZlcmxheSBkaXNwbGF5IHRpbWUgZnJvbSB0aGUgcHJldmlvdXMgbWFya2VyXG5cdGZ1bmN0aW9uIGluaXRpYWxpemVPdmVybGF5KCkge1xuXHRcdGJyZWFrT3ZlcmxheSA9ICQoXCI8ZGl2IGNsYXNzPSd2anMtYnJlYWstb3ZlcmxheSc+PGRpdiBjbGFzcz0ndmpzLWJyZWFrLW92ZXJsYXktdGV4dCc+PC9kaXY+PC9kaXY+XCIpXG5cdFx0XHQuY3NzKHNldHRpbmcuYnJlYWtPdmVybGF5LnN0eWxlKTtcblx0XHR2aWRlb1dyYXBwZXIuYXBwZW5kKGJyZWFrT3ZlcmxheSk7XG5cdFx0b3ZlcmxheUluZGV4ID0gLTE7XG5cdH1cblxuXHRmdW5jdGlvbiBvblRpbWVVcGRhdGUoKSB7XG5cdFx0b25VcGRhdGVNYXJrZXIoKTtcblx0XHR1cGRhdGVCcmVha092ZXJsYXkoKTtcblx0fVxuXG5cdGZ1bmN0aW9uIG9uVXBkYXRlTWFya2VyKCkge1xuXHRcdC8qXG5cdFx0ICAgIGNoZWNrIG1hcmtlciByZWFjaGVkIGluIGJldHdlZW4gbWFya2Vyc1xuXHRcdCAgICB0aGUgbG9naWMgaGVyZSBpcyB0aGF0IGl0IHRyaWdnZXJzIGEgbmV3IG1hcmtlciByZWFjaGVkIGV2ZW50IG9ubHkgaWYgdGhlIHBsYXllciBcblx0XHQgICAgZW50ZXJzIGEgbmV3IG1hcmtlciByYW5nZSAoZS5nLiBmcm9tIG1hcmtlciAxIHRvIG1hcmtlciAyKS4gVGh1cywgaWYgcGxheWVyIGlzIG9uIG1hcmtlciAxIGFuZCB1c2VyIGNsaWNrZWQgb24gbWFya2VyIDEgYWdhaW4sIG5vIG5ldyByZWFjaGVkIGV2ZW50IGlzIHRyaWdnZXJlZClcblx0XHQqL1xuXG5cdFx0dmFyIGdldE5leHRNYXJrZXJUaW1lID0gZnVuY3Rpb24oaW5kZXgpIHtcblx0XHRcdGlmIChpbmRleCA8IG1hcmtlcnNMaXN0Lmxlbmd0aCAtIDEpIHtcblx0XHRcdFx0cmV0dXJuIHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2Vyc0xpc3RbaW5kZXggKyAxXSk7XG5cdFx0XHR9XG5cdFx0XHQvLyBuZXh0IG1hcmtlciB0aW1lIG9mIGxhc3QgbWFya2VyIHdvdWxkIGJlIGVuZCBvZiB2aWRlbyB0aW1lXG5cdFx0XHRyZXR1cm4gcGxheWVyLmR1cmF0aW9uKCk7XG5cdFx0fVxuXHRcdHZhciBjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdHZhciBuZXdNYXJrZXJJbmRleDtcblxuXHRcdGlmIChjdXJyZW50TWFya2VySW5kZXggIT0gLTEpIHtcblx0XHRcdC8vIGNoZWNrIGlmIHN0YXlpbmcgYXQgc2FtZSBtYXJrZXJcblx0XHRcdHZhciBuZXh0TWFya2VyVGltZSA9IGdldE5leHRNYXJrZXJUaW1lKGN1cnJlbnRNYXJrZXJJbmRleCk7XG5cdFx0XHRpZiAoY3VycmVudFRpbWUgPj0gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTGlzdFtjdXJyZW50TWFya2VySW5kZXhdKSAmJlxuXHRcdFx0XHRjdXJyZW50VGltZSA8IG5leHRNYXJrZXJUaW1lKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gY2hlY2sgZm9yIGVuZGluZyAoYXQgdGhlIGVuZCBjdXJyZW50IHRpbWUgZXF1YWxzIHBsYXllciBkdXJhdGlvbilcblx0XHRcdGlmIChjdXJyZW50TWFya2VySW5kZXggPT09IG1hcmtlcnNMaXN0Lmxlbmd0aCAtIDEgJiZcblx0XHRcdFx0Y3VycmVudFRpbWUgPT09IHBsYXllci5kdXJhdGlvbigpKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBjaGVjayBmaXJzdCBtYXJrZXIsIG5vIG1hcmtlciBpcyBzZWxlY3RlZFxuXHRcdGlmIChtYXJrZXJzTGlzdC5sZW5ndGggPiAwICYmXG5cdFx0XHRjdXJyZW50VGltZSA8IHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2Vyc0xpc3RbMF0pKSB7XG5cdFx0XHRuZXdNYXJrZXJJbmRleCA9IC0xO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBsb29rIGZvciBuZXcgaW5kZXhcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbWFya2Vyc0xpc3QubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0bmV4dE1hcmtlclRpbWUgPSBnZXROZXh0TWFya2VyVGltZShpKTtcblxuXHRcdFx0XHRpZiAoY3VycmVudFRpbWUgPj0gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTGlzdFtpXSkgJiZcblx0XHRcdFx0XHRjdXJyZW50VGltZSA8IG5leHRNYXJrZXJUaW1lKSB7XG5cdFx0XHRcdFx0bmV3TWFya2VySW5kZXggPSBpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gc2V0IG5ldyBtYXJrZXIgaW5kZXhcblx0XHRpZiAobmV3TWFya2VySW5kZXggIT0gY3VycmVudE1hcmtlckluZGV4KSB7XG5cdFx0XHQvLyB0cmlnZ2VyIGV2ZW50XG5cdFx0XHRpZiAobmV3TWFya2VySW5kZXggIT0gLTEgJiYgb3B0aW9ucy5vbk1hcmtlclJlYWNoZWQpIHtcblx0XHRcdFx0b3B0aW9ucy5vbk1hcmtlclJlYWNoZWQobWFya2Vyc0xpc3RbbmV3TWFya2VySW5kZXhdKTtcblx0XHRcdH1cblx0XHRcdGN1cnJlbnRNYXJrZXJJbmRleCA9IG5ld01hcmtlckluZGV4O1xuXHRcdH1cblxuXHR9XG5cblx0Ly8gc2V0dXAgdGhlIHdob2xlIHRoaW5nXG5cdGZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XG5cdFx0aWYgKHNldHRpbmcubWFya2VyVGlwLmRpc3BsYXkpIHtcblx0XHRcdGluaXRpYWxpemVNYXJrZXJUaXAoKTtcblx0XHR9XG5cblx0XHQvLyByZW1vdmUgZXhpc3RpbmcgbWFya2VycyBpZiBhbHJlYWR5IGluaXRpYWxpemVkXG5cdFx0cGxheWVyLm1hcmtlcnMucmVtb3ZlQWxsKCk7XG5cdFx0YWRkTWFya2VycyhvcHRpb25zLm1hcmtlcnMpO1xuXG5cdFx0aWYgKHNldHRpbmcuYnJlYWtPdmVybGF5LmRpc3BsYXkpIHtcblx0XHRcdGluaXRpYWxpemVPdmVybGF5KCk7XG5cdFx0fVxuXHRcdG9uVGltZVVwZGF0ZSgpO1xuXHRcdHBsYXllci5vbihcInRpbWV1cGRhdGVcIiwgb25UaW1lVXBkYXRlKTtcblx0fVxuXG5cdC8vIHNldHVwIHRoZSBwbHVnaW4gYWZ0ZXIgd2UgbG9hZGVkIHZpZGVvJ3MgbWV0YSBkYXRhXG5cdHBsYXllci5vbihcImxvYWRlZG1ldGFkYXRhXCIsIGZ1bmN0aW9uKCkge1xuXHRcdGluaXRpYWxpemUoKTtcblx0fSk7XG5cblx0Ly8gZXhwb3NlZCBwbHVnaW4gQVBJXG5cdHBsYXllci5tYXJrZXJzID0ge1xuXHRcdGdldE1hcmtlcnM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIG1hcmtlcnNMaXN0O1xuXHRcdH0sXG5cdFx0bmV4dDogZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBnbyB0byB0aGUgbmV4dCBtYXJrZXIgZnJvbSBjdXJyZW50IHRpbWVzdGFtcFxuXHRcdFx0dmFyIGN1cnJlbnRUaW1lID0gcGxheWVyLmN1cnJlbnRUaW1lKCk7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG1hcmtlcnNMaXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHZhciBtYXJrZXJUaW1lID0gc2V0dGluZy5tYXJrZXJUaXAudGltZShtYXJrZXJzTGlzdFtpXSk7XG5cdFx0XHRcdGlmIChtYXJrZXJUaW1lID4gY3VycmVudFRpbWUpIHtcblx0XHRcdFx0XHRwbGF5ZXIuY3VycmVudFRpbWUobWFya2VyVGltZSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXHRcdHByZXY6IGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gZ28gdG8gcHJldmlvdXMgbWFya2VyXG5cdFx0XHR2YXIgY3VycmVudFRpbWUgPSBwbGF5ZXIuY3VycmVudFRpbWUoKTtcblx0XHRcdGZvciAodmFyIGkgPSBtYXJrZXJzTGlzdC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuXHRcdFx0XHR2YXIgbWFya2VyVGltZSA9IHNldHRpbmcubWFya2VyVGlwLnRpbWUobWFya2Vyc0xpc3RbaV0pO1xuXHRcdFx0XHQvLyBhZGQgYSB0aHJlc2hvbGRcblx0XHRcdFx0aWYgKG1hcmtlclRpbWUgKyAwLjUgPCBjdXJyZW50VGltZSkge1xuXHRcdFx0XHRcdHBsYXllci5jdXJyZW50VGltZShtYXJrZXJUaW1lKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0YWRkOiBmdW5jdGlvbihuZXdNYXJrZXJzKSB7XG5cdFx0XHQvLyBhZGQgbmV3IG1hcmtlcnMgZ2l2ZW4gYW4gYXJyYXkgb2YgaW5kZXhcblx0XHRcdGFkZE1hcmtlcnMobmV3TWFya2Vycyk7XG5cdFx0fSxcblx0XHRyZW1vdmU6IGZ1bmN0aW9uKGluZGV4QXJyYXkpIHtcblx0XHRcdC8vIHJlbW92ZSBtYXJrZXJzIGdpdmVuIGFuIGFycmF5IG9mIGluZGV4XG5cdFx0XHRyZW1vdmVNYXJrZXJzKGluZGV4QXJyYXkpO1xuXHRcdH0sXG5cdFx0cmVtb3ZlQWxsOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBpbmRleEFycmF5ID0gW107XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG1hcmtlcnNMaXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGluZGV4QXJyYXkucHVzaChpKTtcblx0XHRcdH1cblx0XHRcdHJlbW92ZU1hcmtlcnMoaW5kZXhBcnJheSk7XG5cdFx0fSxcblx0XHR1cGRhdGVUaW1lOiBmdW5jdGlvbigpIHtcblx0XHRcdC8vIG5vdGlmeSB0aGUgcGx1Z2luIHRvIHVwZGF0ZSB0aGUgVUkgZm9yIGNoYW5nZXMgaW4gbWFya2VyIHRpbWVzIFxuXHRcdFx0dXBkYXRlTWFya2VycygpO1xuXHRcdH0sXG5cdFx0cmVzZXQ6IGZ1bmN0aW9uKG5ld01hcmtlcnMpIHtcblx0XHRcdC8vIHJlbW92ZSBhbGwgdGhlIGV4aXN0aW5nIG1hcmtlcnMgYW5kIGFkZCBuZXcgb25lc1xuXHRcdFx0cGxheWVyLm1hcmtlcnMucmVtb3ZlQWxsKCk7XG5cdFx0XHRhZGRNYXJrZXJzKG5ld01hcmtlcnMpO1xuXHRcdH0sXG5cdFx0ZGVzdHJveTogZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyB1bnJlZ2lzdGVyIHRoZSBwbHVnaW5zIGFuZCBjbGVhbiB1cCBldmVuIGhhbmRsZXJzXG5cdFx0XHRwbGF5ZXIubWFya2Vycy5yZW1vdmVBbGwoKTtcblx0XHRcdGJyZWFrT3ZlcmxheS5yZW1vdmUoKTtcblx0XHRcdG1hcmtlclRpcC5yZW1vdmUoKTtcblx0XHRcdHBsYXllci5vZmYoXCJ0aW1ldXBkYXRlXCIsIHVwZGF0ZUJyZWFrT3ZlcmxheSk7XG5cdFx0XHRkZWxldGUgcGxheWVyLm1hcmtlcnM7XG5cdFx0fSxcblx0fTtcbn07XG5cbi8qKlxuICog5rC05Y2wXG4gKiBAcGFyYW0ge1t0eXBlXX0gb3B0aW9ucyBbZGVzY3JpcHRpb25dXG4gKiByZXR1cm4ge1t0eXBlXX0gIFtkZXNjcmlwdGlvbl1cbiAqL1xuY29uc3Qgd2F0ZXJNYXJrID0gZnVuY3Rpb24oc2V0dGluZ3MpIHtcblx0dmFyIGRlZmF1bHRzID0ge1xuXHRcdFx0ZmlsZTogJ2xvZ28ucG5nJyxcblx0XHRcdHhwb3M6IDAsXG5cdFx0XHR5cG9zOiAwLFxuXHRcdFx0eHJlcGVhdDogMCxcblx0XHRcdG9wYWNpdHk6IDEwMCxcblx0XHRcdGNsaWNrYWJsZTogZmFsc2UsXG5cdFx0XHR1cmw6IFwiXCIsXG5cdFx0XHRjbGFzc05hbWU6ICd2anMtd2F0ZXJtYXJrJyxcblx0XHRcdHRleHQ6IGZhbHNlLFxuXHRcdFx0ZGVidWc6IGZhbHNlXG5cdFx0fSxcblx0XHRleHRlbmQgPSBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBhcmdzLCB0YXJnZXQsIGksIG9iamVjdCwgcHJvcGVydHk7XG5cdFx0XHRhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcblx0XHRcdHRhcmdldCA9IGFyZ3Muc2hpZnQoKSB8fCB7fTtcblx0XHRcdGZvciAoaSBpbiBhcmdzKSB7XG5cdFx0XHRcdG9iamVjdCA9IGFyZ3NbaV07XG5cdFx0XHRcdGZvciAocHJvcGVydHkgaW4gb2JqZWN0KSB7XG5cdFx0XHRcdFx0aWYgKG9iamVjdC5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpIHtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2Ygb2JqZWN0W3Byb3BlcnR5XSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0W3Byb3BlcnR5XSA9IGV4dGVuZCh0YXJnZXRbcHJvcGVydHldLCBvYmplY3RbcHJvcGVydHldKTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHRhcmdldFtwcm9wZXJ0eV0gPSBvYmplY3RbcHJvcGVydHldO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRhcmdldDtcblx0XHR9O1xuXG5cdC8vISBnbG9iYWwgdmFyaWJsZSBjb250YWluaW5nIHJlZmVyZW5jZSB0byB0aGUgRE9NIGVsZW1lbnRcblx0dmFyIGRpdjtcblxuXHQvLyB2YXIgc2V0dGluZ3MgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuXG5cdGlmIChzZXR0aW5ncy5kZWJ1ZykgY29uc29sZS5sb2coJ3dhdGVybWFyazogUmVnaXN0ZXIgaW5pdCcpO1xuXG5cdHZhciBvcHRpb25zLCBwbGF5ZXIsIHZpZGVvLCBpbWcsIGxpbms7XG5cdG9wdGlvbnMgPSBleHRlbmQoZGVmYXVsdHMsIHNldHRpbmdzKTtcblxuXHQvKiBHcmFiIHRoZSBuZWNlc3NhcnkgRE9NIGVsZW1lbnRzICovXG5cdHBsYXllciA9IHRoaXMuZWwoKTtcblx0dmlkZW8gPSB0aGlzLmVsKCkuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3ZpZGVvJylbMF07XG5cblx0Ly8gY3JlYXRlIHRoZSB3YXRlcm1hcmsgZWxlbWVudFxuXHRpZiAoIWRpdikge1xuXHRcdGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdGRpdi5jbGFzc05hbWUgPSBvcHRpb25zLmNsYXNzTmFtZTtcblx0fSBlbHNlIHtcblx0XHQvLyEgaWYgZGl2IGFscmVhZHkgZXhpc3RzLCBlbXB0eSBpdFxuXHRcdGRpdi5pbm5lckhUTUwgPSAnJztcblx0fVxuXG5cdC8vIGlmIHRleHQgaXMgc2V0LCBkaXNwbGF5IHRleHRcblx0aWYgKG9wdGlvbnMudGV4dClcblx0XHRkaXYudGV4dENvbnRlbnQgPSBvcHRpb25zLnRleHQ7XG5cblx0Ly8gaWYgaW1nIGlzIHNldCwgYWRkIGltZ1xuXHRpZiAob3B0aW9ucy5maWxlKSB7XG5cdFx0aW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG5cdFx0ZGl2LmFwcGVuZENoaWxkKGltZyk7XG5cdFx0ZGl2LnN0eWxlLmRpc3BsYXkgPSBcImlubGluZS1ibG9ja1wiO1xuXHRcdGRpdi5zdHlsZS5wb3NpdGlvbiA9IFwiYWJzb2x1dGVcIjtcblx0XHRkaXYuc3R5bGUuekluZGV4ID0gMDtcblx0XHRpbWcuc3JjID0gb3B0aW9ucy5maWxlO1xuXHR9XG5cdC8vaW1nLnN0eWxlLmJvdHRvbSA9IFwiMFwiO1xuXHQvL2ltZy5zdHlsZS5yaWdodCA9IFwiMFwiO1xuXHRpZiAoKG9wdGlvbnMueXBvcyA9PT0gMCkgJiYgKG9wdGlvbnMueHBvcyA9PT0gMCkpIC8vIFRvcCBsZWZ0XG5cdHtcblx0XHRkaXYuc3R5bGUudG9wID0gXCIwcHhcIjtcblx0XHRkaXYuc3R5bGUubGVmdCA9IFwiMHB4XCI7XG5cdH0gZWxzZSBpZiAoKG9wdGlvbnMueXBvcyA9PT0gMCkgJiYgKG9wdGlvbnMueHBvcyA9PT0gMTAwKSkgLy8gVG9wIHJpZ2h0XG5cdHtcblx0XHRkaXYuc3R5bGUudG9wID0gXCIwcHhcIjtcblx0XHRkaXYuc3R5bGUucmlnaHQgPSBcIjBweFwiO1xuXHR9IGVsc2UgaWYgKChvcHRpb25zLnlwb3MgPT09IDEwMCkgJiYgKG9wdGlvbnMueHBvcyA9PT0gMTAwKSkgLy8gQm90dG9tIHJpZ2h0XG5cdHtcblx0XHRkaXYuc3R5bGUuYm90dG9tID0gXCIwcHhcIjtcblx0XHRkaXYuc3R5bGUucmlnaHQgPSBcIjBweFwiO1xuXHR9IGVsc2UgaWYgKChvcHRpb25zLnlwb3MgPT09IDEwMCkgJiYgKG9wdGlvbnMueHBvcyA9PT0gMCkpIC8vIEJvdHRvbSBsZWZ0XG5cdHtcblx0XHRkaXYuc3R5bGUuYm90dG9tID0gXCIwcHhcIjtcblx0XHRkaXYuc3R5bGUubGVmdCA9IFwiMHB4XCI7XG5cdH0gZWxzZSBpZiAoKG9wdGlvbnMueXBvcyA9PT0gNTApICYmIChvcHRpb25zLnhwb3MgPT09IDUwKSkgLy8gQ2VudGVyXG5cdHtcblx0XHRpZiAob3B0aW9ucy5kZWJ1ZykgY29uc29sZS5sb2coJ3dhdGVybWFyazogcGxheWVyOicgKyBwbGF5ZXIud2lkdGggKyAneCcgKyBwbGF5ZXIuaGVpZ2h0KTtcblx0XHRpZiAob3B0aW9ucy5kZWJ1ZykgY29uc29sZS5sb2coJ3dhdGVybWFyazogdmlkZW86JyArIHZpZGVvLnZpZGVvV2lkdGggKyAneCcgKyB2aWRlby52aWRlb0hlaWdodCk7XG5cdFx0aWYgKG9wdGlvbnMuZGVidWcpIGNvbnNvbGUubG9nKCd3YXRlcm1hcms6IGltYWdlOicgKyBpbWcud2lkdGggKyAneCcgKyBpbWcuaGVpZ2h0KTtcblx0XHRkaXYuc3R5bGUudG9wID0gKHRoaXMuaGVpZ2h0KCkgLyAyKSArIFwicHhcIjtcblx0XHRkaXYuc3R5bGUubGVmdCA9ICh0aGlzLndpZHRoKCkgLyAyKSArIFwicHhcIjtcblx0fVxuXHRkaXYuc3R5bGUub3BhY2l0eSA9IG9wdGlvbnMub3BhY2l0eTtcblxuXHQvL2Rpdi5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2UgPSBcInVybChcIitvcHRpb25zLmZpbGUrXCIpXCI7XG5cdC8vZGl2LnN0eWxlLmJhY2tncm91bmRQb3NpdGlvbi54ID0gb3B0aW9ucy54cG9zK1wiJVwiO1xuXHQvL2Rpdi5zdHlsZS5iYWNrZ3JvdW5kUG9zaXRpb24ueSA9IG9wdGlvbnMueXBvcytcIiVcIjtcblx0Ly9kaXYuc3R5bGUuYmFja2dyb3VuZFJlcGVhdCA9IG9wdGlvbnMueHJlcGVhdDtcblx0Ly9kaXYuc3R5bGUub3BhY2l0eSA9IChvcHRpb25zLm9wYWNpdHkvMTAwKTtcblxuXHQvL2lmIHVzZXIgd2FudHMgd2F0ZXJtYXJrIHRvIGJlIGNsaWNrYWJsZSwgYWRkIGFuY2hvciBlbGVtXG5cdC8vdG9kbzogY2hlY2sgaWYgb3B0aW9ucy51cmwgaXMgYW4gYWN0dWFsIHVybD9cblx0aWYgKG9wdGlvbnMuY2xpY2thYmxlICYmIG9wdGlvbnMudXJsICE9PSBcIlwiKSB7XG5cdFx0bGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xuXHRcdGxpbmsuaHJlZiA9IG9wdGlvbnMudXJsO1xuXHRcdGxpbmsudGFyZ2V0ID0gXCJfYmxhbmtcIjtcblx0XHRsaW5rLmFwcGVuZENoaWxkKGRpdik7XG5cdFx0Ly9hZGQgY2xpY2thYmxlIHdhdGVybWFyayB0byB0aGUgcGxheWVyXG5cdFx0cGxheWVyLmFwcGVuZENoaWxkKGxpbmspO1xuXHR9IGVsc2Uge1xuXHRcdC8vYWRkIG5vcm1hbCB3YXRlcm1hcmsgdG8gdGhlIHBsYXllclxuXHRcdHBsYXllci5hcHBlbmRDaGlsZChkaXYpO1xuXHR9XG5cblx0aWYgKG9wdGlvbnMuZGVidWcpIGNvbnNvbGUubG9nKCd3YXRlcm1hcms6IFJlZ2lzdGVyIGVuZCcpO1xufTtcblxuLy8gLyoqXG4vLyAgKiDmiKrlm75cbi8vICAqIEBwYXJhbSB7W3R5cGVdfSBvcHRpb25zIFtkZXNjcmlwdGlvbl1cbi8vICAqIHJldHVybiB7W3R5cGVdfSAgW2Rlc2NyaXB0aW9uXVxuLy8gICovXG4vLyBjb25zdCBzbmFwc2hvdCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbi8vIC8vIFx0XCJ1c2Ugc3RyaWN0XCI7XG5cbi8vIFx0Ly8gZ2xvYmFsc1xuLy8gXHR2YXIgcGxheWVyID0gdGhpcztcbi8vIFx0dmFyIHZpZGVvID0gcGxheWVyLmVsKCkucXVlcnlTZWxlY3RvcigndmlkZW8nKTtcbi8vIFx0dmFyIGNvbnRhaW5lciwgc2NhbGU7XG4vLyBcdC8vRklYTUU6IGFkZCBzb21lIGtpbmQgb2YgYXNzZXJ0IGZvciB2aWRlbywgaWYgZmxhc2ggaXMgdXNlZCBpdCdzIG5vdCB3b3JraW5nXG5cbi8vIFx0Ly9UT0RPOiBhZGQgYmV0dGVyIHByZWZpeCBmb3IgYWxsIG5ldyBjc3MgY2xhc3MsIHByb2JhYmx5IHZqcy1zbmFwc2hvdFxuLy8gXHQvL1RPRE86IGJyZWFrIHRoaXMgbGFyZ2UgZmlsZSB1cCBpbnRvIHNtYWxsZXIgb25lcywgZS5nLiBjb250YWluZXIsIC4uLlxuLy8gXHQvL1RPRE86IG1ha2UgaXQgcG9zc2libGUgdG8gZHJhZyBib3hlcyBhbHNvIGZyb20gYm90dG9tIHJpZ2h0IHRvIHRvcCBsZWZ0XG5cbi8vIFx0ZnVuY3Rpb24gdXBkYXRlU2NhbGUoKXtcbi8vIFx0XHR2YXIgcmVjdCA9IHZpZGVvLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuLy8gXHRcdHZhciBzY2FsZXcgPSBjYW52YXNfZHJhdy5lbCgpLndpZHRoIC8gcmVjdC53aWR0aDtcbi8vIFx0XHR2YXIgc2NhbGVoID0gY2FudmFzX2RyYXcuZWwoKS5oZWlnaHQgLyByZWN0LmhlaWdodDtcbi8vIFx0XHRzY2FsZSA9IE1hdGgubWF4KE1hdGgubWF4KHNjYWxldywgc2NhbGVoKSwgMSk7XG4vLyBcdFx0c2NhbGVfdHh0LmVsKCkuaW5uZXJIVE1MID0gKE1hdGgucm91bmQoMS9zY2FsZSoxMDApLzEwMCkgK1wieFwiO1xuLy8gXHR9XG5cbi8vIFx0Ly8gdGFrZSBzbmFwc2hvdCBvZiB2aWRlbyBhbmQgc2hvdyBhbGwgZHJhd2luZyBlbGVtZW50c1xuLy8gXHQvLyBhZGRlZCB0byBwbGF5ZXIgb2JqZWN0IHRvIGJlIGNhbGxhYmxlIGZyb20gb3V0c2lkZSwgZS5nLiBzaG9ydGN1dFxuLy8gXHRwbGF5ZXIuc25hcCA9IGZ1bmN0aW9uKCl7XG4vLyBcdFx0cGxheWVyLnBhdXNlKCk7XG4vLyBcdFx0Ly8gbG9vc2Uga2V5Ym9hcmQgZm9jdXNcbi8vIFx0XHRwbGF5ZXIuZWwoKS5ibHVyKCk7XG4vLyBcdFx0Ly8gc3dpdGNoIGNvbnRyb2wgYmFyIHRvIGRyYXdpbmcgY29udHJvbHNcbi8vIFx0XHRwbGF5ZXIuY29udHJvbEJhci5oaWRlKCk7XG4vLyBcdFx0ZHJhd0N0cmwuc2hvdygpO1xuLy8gXHRcdC8vIGRpc3BsYXkgY2FudmFzXG4vLyBcdFx0cGFyZW50LnNob3coKTtcblxuLy8gXHRcdC8vIGNhbnZhcyBmb3IgZHJhd2luZywgaXQncyBzZXBhcmF0ZSBmcm9tIHNuYXBzaG90IGJlY2F1c2Ugb2YgZGVsZXRlXG4vLyBcdFx0Y2FudmFzX2RyYXcuZWwoKS53aWR0aCA9IHZpZGVvLnZpZGVvV2lkdGg7XG4vLyBcdFx0Y2FudmFzX2RyYXcuZWwoKS5oZWlnaHQgPSB2aWRlby52aWRlb0hlaWdodDtcbi8vIFx0XHRjb250ZXh0X2RyYXcuc3Ryb2tlU3R5bGUgPSBjb2xvci5lbCgpLnZhbHVlO1xuLy8gXHRcdGNvbnRleHRfZHJhdy5saW5lV2lkdGggPSBzaXplLmVsKCkudmFsdWUgLyAyO1xuLy8gXHRcdGNvbnRleHRfZHJhdy5saW5lQ2FwID0gXCJyb3VuZFwiO1xuLy8gXHRcdC8vIGNhbGN1bGF0ZSBzY2FsZVxuLy8gXHRcdHVwZGF0ZVNjYWxlKCk7XG5cbi8vIFx0XHQvLyBiYWNrZ3JvdW5kIGNhbnZhcyBjb250YWluaW5nIHNuYXBzaG90IGZyb20gdmlkZW9cbi8vIFx0XHRjYW52YXNfYmcuZWwoKS53aWR0aCA9IHZpZGVvLnZpZGVvV2lkdGg7XG4vLyBcdFx0Y2FudmFzX2JnLmVsKCkuaGVpZ2h0ID0gdmlkZW8udmlkZW9IZWlnaHQ7XG4vLyBcdFx0Y29udGV4dF9iZy5kcmF3SW1hZ2UodmlkZW8sIDAsIDApO1xuXG4vLyBcdFx0Ly8gc3RpbGwgZml0IGludG8gcGxheWVyIGVsZW1lbnRcbi8vIFx0XHR2YXIgcmVjdCA9IHZpZGVvLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpOyAvLyB1c2UgYm91bmRpbmcgcmVjdCBpbnN0ZWFkIG9mIHBsYXllci53aWR0aC9oZWlnaHQgYmVjYXVzZSBvZiBmdWxsc2NyZWVuXG4vLyBcdFx0Y2FudmFzX2RyYXcuZWwoKS5zdHlsZS5tYXhXaWR0aCAgPSByZWN0LndpZHRoICArXCJweFwiO1xuLy8gXHRcdGNhbnZhc19kcmF3LmVsKCkuc3R5bGUubWF4SGVpZ2h0ID0gcmVjdC5oZWlnaHQgK1wicHhcIjtcbi8vIFx0XHRjYW52YXNfYmcuZWwoKS5zdHlsZS5tYXhXaWR0aCAgPSByZWN0LndpZHRoICArXCJweFwiO1xuLy8gXHRcdGNhbnZhc19iZy5lbCgpLnN0eWxlLm1heEhlaWdodCA9IHJlY3QuaGVpZ2h0ICtcInB4XCI7XG4vLyBcdH07XG4vLyBcdC8vIGNhbWVyYSBpY29uIG9uIG5vcm1hbCBwbGF5ZXIgY29udHJvbCBiYXJcbi8vIFx0dmFyIHNuYXBfYnRuID0gcGxheWVyLmNvbnRyb2xCYXIuYWRkQ2hpbGQoJ2J1dHRvbicpO1xuLy8gXHRzbmFwX2J0bi5hZGRDbGFzcyhcInZqcy1zbmFwc2hvdC1idXR0b25cIik7XG4vLyBcdHNuYXBfYnRuLmVsKCkudGl0bGUgPSBcIlRha2Ugc25hcHNob3RcIjtcbi8vIFx0c25hcF9idG4ub24oJ2NsaWNrJywgcGxheWVyLnNuYXApO1xuXG4vLyBcdC8vIGRyYXdpbmcgY29udHJvbHNcblxuLy8gXHQvLyBhZGQgY2FudmFzIHBhcmVudCBjb250YWluZXIgYmVmb3JlIGRyYXcgY29udHJvbCBiYXIsIHNvIGJhciBnZXRzIG9uIHRvcFxuLy8gXHR2YXIgcGFyZW50ID0gcGxheWVyLmFkZENoaWxkKFxuLy8gXHRcdG5ldyB2aWRlb2pzLkNvbXBvbmVudChwbGF5ZXIsIHtcbi8vIFx0XHRcdGVsOiB2aWRlb2pzLkNvbXBvbmVudC5wcm90b3R5cGUuY3JlYXRlRWwobnVsbCwge1xuLy8gXHRcdFx0XHRjbGFzc05hbWU6ICd2anMtY2FudmFzLXBhcmVudCcgLypUT0RPKi9cbi8vIFx0XHRcdH0pLFxuLy8gXHRcdH0pXG4vLyBcdCk7XG5cbi8vIFx0Ly9kcmF3IGNvbnRyb2wgYmFyXG4vLyBcdHZhciBkcmF3Q3RybCA9IHBsYXllci5hZGRDaGlsZChcbi8vIFx0XHRuZXcgdmlkZW9qcy5Db21wb25lbnQocGxheWVyLCB7XG4vLyBcdFx0XHRlbDogdmlkZW9qcy5Db21wb25lbnQucHJvdG90eXBlLmNyZWF0ZUVsKG51bGwsIHtcbi8vIFx0XHRcdFx0Y2xhc3NOYW1lOiAndmpzLWNvbnRyb2wtYmFyIHZqcy1kcmF3aW5nLWN0cmwnLFxuLy8gXHRcdFx0fSksXG4vLyBcdFx0fSlcbi8vIFx0KTtcbi8vIFx0ZHJhd0N0cmwuaGlkZSgpO1xuXG4vLyBcdC8vIGNob29zZSBjb2xvciwgdXNlZCBldmVyeXdoZXJlOiBwYWludGluZywgYm9yZGVyIGNvbG9yIG9mIGNyb3Bib3gsIC4uLlxuLy8gXHR2YXIgY29sb3IgPSBkcmF3Q3RybC5hZGRDaGlsZChcbi8vIFx0XHRuZXcgdmlkZW9qcy5Db21wb25lbnQocGxheWVyLCB7XG4vLyBcdFx0XHRlbDogdmlkZW9qcy5Db21wb25lbnQucHJvdG90eXBlLmNyZWF0ZUVsKCdpbnB1dCcsIHtcbi8vIFx0XHRcdFx0Y2xhc3NOYW1lOiAndmpzLWNvbnRyb2wnLCB0eXBlOiAnY29sb3InLCB2YWx1ZTogJyNkZjRiMjYnLCB0aXRsZTogJ2NvbG9yJ1xuLy8gXHRcdFx0fSksXG4vLyBcdFx0fSlcbi8vIFx0KTtcbi8vIFx0Y29sb3Iub24oJ2NoYW5nZScsIGZ1bmN0aW9uKGUpe1xuLy8gXHRcdGNvbnRleHRfZHJhdy5zdHJva2VTdHlsZSA9IGNvbG9yLmVsKCkudmFsdWU7XG4vLyBcdH0pO1xuXG4vLyBcdC8vIGNob29zZSBzaXplLCB1c2VkIGV2ZXJ5d2hlcmU6IGxpbmUgd2lkdGgsIHRleHQgc2l6ZVxuLy8gXHR2YXIgc2l6ZSA9IGRyYXdDdHJsLmFkZENoaWxkKFxuLy8gXHRcdG5ldyB2aWRlb2pzLkNvbXBvbmVudChwbGF5ZXIsIHtcbi8vIFx0XHRcdGVsOiB2aWRlb2pzLkNvbXBvbmVudC5wcm90b3R5cGUuY3JlYXRlRWwoJ2lucHV0Jywge1xuLy8gXHRcdFx0XHRjbGFzc05hbWU6ICd2anMtY29udHJvbCcsIHR5cGU6ICdudW1iZXInLCB2YWx1ZTogJzEwJywgdGl0bGU6ICdsaW5lIHdpZHRoLCB0ZXh0IHNpemUsIC4uLidcbi8vIFx0XHRcdH0pLFxuLy8gXHRcdH0pXG4vLyBcdCk7XG4vLyBcdHNpemUub24oJ2tleWRvd24nLCBmdW5jdGlvbihlKXsgLy8gZG9uJ3QgZmlyZSBwbGF5ZXIgc2hvcnRjdXRzIHdoZW4gc2l6ZSBpbnB1dCBoYXMgZm9jdXNcbi8vIFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuLy8gXHR9KTtcbi8vIFx0c2l6ZS5vbignY2hhbmdlJywgZnVuY3Rpb24oZSl7XG4vLyBcdFx0Y29udGV4dF9kcmF3LmxpbmVXaWR0aCA9IHNpemUuZWwoKS52YWx1ZSAvIDI7XG4vLyBcdH0pO1xuXG4vLyBcdHZhciB0b29sID0gJ2JydXNoJztcbi8vIFx0ZnVuY3Rpb24gdG9vbENoYW5nZShldmVudCl7XG4vLyBcdFx0dmFyIGFjdGl2ZV90b29sID0gZHJhd0N0cmwuZWwoKS5xdWVyeVNlbGVjdG9yKCcudmpzLXRvb2wtYWN0aXZlJyk7XG4vLyBcdFx0YWN0aXZlX3Rvb2wuY2xhc3NMaXN0LnJlbW92ZSgndmpzLXRvb2wtYWN0aXZlJyk7XG4vLyBcdFx0ZXZlbnQudGFyZ2V0LmNsYXNzTGlzdC5hZGQoJ3Zqcy10b29sLWFjdGl2ZScpO1xuLy8gXHRcdHRvb2wgPSBldmVudC50YXJnZXQuZGF0YXNldC52YWx1ZTtcbi8vIFx0XHQvLyBhbHdheXMgaGlkZSBjcm9wYm94LCB0ZXh0Ym94IGlzIGhpZGRlbiBhdXRvbWF0aWNhbGx5IGFzIGl0IGJsdXJzXG4vLyBcdFx0Y3JvcGJveC5oaWRlKCk7XG4vLyBcdH1cbi8vIFx0dmlkZW9qcy5Ub29sQnV0dG9uID0gdmlkZW9qcy5CdXR0b24uZXh0ZW5kKHtcbi8vIFx0XHRpbml0OiBmdW5jdGlvbihwLCBvcHRpb25zKSB7XG4vLyBcdFx0XHR2aWRlb2pzLkJ1dHRvbi5jYWxsKHRoaXMsIHAsIG9wdGlvbnMpO1xuXG4vLyBcdFx0XHR0aGlzLmFkZENsYXNzKFwidmpzLWRyYXdpbmctXCIrIG9wdGlvbnMudG9vbCk7XG4vLyBcdFx0XHR0aGlzLmVsKCkuZGF0YXNldC52YWx1ZSA9IG9wdGlvbnMudG9vbDtcbi8vIFx0XHRcdHRoaXMuZWwoKS50aXRsZSA9IG9wdGlvbnMudGl0bGU7XG5cbi8vIFx0XHRcdHRoaXMub24oJ2NsaWNrJywgdG9vbENoYW5nZSk7XG4vLyBcdFx0fVxuLy8gXHR9KTtcbi8vIFx0dmFyIGJydXNoICA9IGRyYXdDdHJsLmFkZENoaWxkKG5ldyB2aWRlb2pzLlRvb2xCdXR0b24ocGxheWVyLCB7dG9vbDogXCJicnVzaFwiLCB0aXRsZTogXCJmcmVlaGFuZCBkcmF3aW5nXCJ9KSk7XG4vLyBcdGJydXNoLmFkZENsYXNzKFwidmpzLXRvb2wtYWN0aXZlXCIpO1xuLy8gXHR2YXIgcmVjdCAgID0gZHJhd0N0cmwuYWRkQ2hpbGQobmV3IHZpZGVvanMuVG9vbEJ1dHRvbihwbGF5ZXIsIHt0b29sOiBcInJlY3RcIiwgIHRpdGxlOiBcImRyYXcgcmVjdGFuZ2xlIGZyb20gdG9wIGxlZnQgdG8gYm90dG9tIHJpZ2h0XCJ9KSk7XG4vLyBcdHZhciBjcm9wICAgPSBkcmF3Q3RybC5hZGRDaGlsZChuZXcgdmlkZW9qcy5Ub29sQnV0dG9uKHBsYXllciwge3Rvb2w6IFwiY3JvcFwiLCAgdGl0bGU6IFwic2VsZWN0IGFyZWEgYW5kIGNsaWNrIHNlbGVjdGlvbiB0byBjcm9wXCJ9KSk7XG4vLyBcdHZhciB0ZXh0ICAgPSBkcmF3Q3RybC5hZGRDaGlsZChuZXcgdmlkZW9qcy5Ub29sQnV0dG9uKHBsYXllciwge3Rvb2w6IFwidGV4dFwiLCAgdGl0bGU6IFwic2VsZWN0IGFyZWEsIHR5cGUgbWVzc2FnZSBhbmQgdGhlbiBjbGljayBzb21ld2hlcmUgZWxzZVwifSkpO1xuLy8gXHR2YXIgZXJhc2VyID0gZHJhd0N0cmwuYWRkQ2hpbGQobmV3IHZpZGVvanMuVG9vbEJ1dHRvbihwbGF5ZXIsIHt0b29sOiBcImVyYXNlclwiLHRpdGxlOiBcImVyYXNlIGRyYXdpbmcgaW4gY2xpY2tlZCBsb2NhdGlvblwifSkpO1xuXG4vLyBcdHZhciBzY2FsZXIgPSBkcmF3Q3RybC5hZGRDaGlsZChcbi8vIFx0XHRuZXcgdmlkZW9qcy5Db21wb25lbnQocGxheWVyLCB7XG4vLyBcdFx0XHRlbDogdmlkZW9qcy5Db21wb25lbnQucHJvdG90eXBlLmNyZWF0ZUVsKG51bGwsIHtcbi8vIFx0XHRcdFx0Y2xhc3NOYW1lOiAndmpzLWNvbnRyb2wgdmpzLWRyYXdpbmctc2NhbGVyJywgdGl0bGU6ICdzY2FsZSBpbWFnZSdcbi8vIFx0XHRcdH0pXG4vLyBcdFx0fSlcbi8vIFx0KTtcbi8vIFx0c2NhbGVyLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpe1xuLy8gXHRcdHZhciB3ID0gY2FudmFzX2RyYXcuZWwoKS53aWR0aCwgaCA9IGNhbnZhc19kcmF3LmVsKCkuaGVpZ2h0O1xuLy8gXHRcdHZhciBzY2FsZXcgPSB3aW5kb3cucHJvbXB0KFwiQ3VycmVudCBpbWFnZSBzaXplIGlzIFwiK3crXCJ4XCIraCtcIiAuIE5ldyB3aWR0aD9cIiwgdyk7XG4vLyBcdFx0c2NhbGV3ID0gcGFyc2VJbnQoc2NhbGV3LCAxMCk7XG4vLyBcdFx0aWYoIWlzTmFOKHNjYWxldykpe1xuLy8gXHRcdFx0dmFyIGZhY3RvciA9IHNjYWxldyAvIHc7XG4vLyBcdFx0XHR2YXIgd2lkdGggID0gZmFjdG9yICogdyB8MDtcbi8vIFx0XHRcdHZhciBoZWlnaHQgPSBmYWN0b3IgKiBoIHwwO1xuXG4vLyBcdFx0XHR2YXIgciA9IHNjYWxlQ3JvcENhbnZhcygwLCAwLCB3LCBoLCB3aWR0aCwgaGVpZ2h0LCBjYW52YXNfYmcsIGNvbnRleHRfYmcpO1xuLy8gXHRcdFx0Y2FudmFzX2JnID0gclswXTsgY29udGV4dF9iZyA9IHJbMV07XG4vLyBcdFx0XHRyID0gc2NhbGVDcm9wQ2FudmFzKDAsIDAsIHcsIGgsIHdpZHRoLCBoZWlnaHQsIGNhbnZhc19kcmF3LCBjb250ZXh0X2RyYXcpO1xuLy8gXHRcdFx0Y2FudmFzX2RyYXcgPSByWzBdOyBjb250ZXh0X2RyYXcgPSByWzFdO1xuLy8gXHRcdFx0dXBkYXRlU2NhbGUoKTtcbi8vIFx0XHR9XG4vLyBcdFx0Ly8ganVzdCBpZ25vcmVcbi8vIFx0fSk7XG5cbi8vIFx0ZnVuY3Rpb24gY29tYmluZURyYXdpbmcoZW5jb2Rpbmcpe1xuLy8gXHRcdC8vYmxpdCBjYW52YXMgYW5kIG9wZW4gbmV3IHRhYiB3aXRoIGltYWdlXG4vLyBcdFx0dmFyIGNhbnZhc190bXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbi8vIFx0XHRjYW52YXNfdG1wLndpZHRoID0gY2FudmFzX2RyYXcuZWwoKS53aWR0aDtcbi8vIFx0XHRjYW52YXNfdG1wLmhlaWdodCA9IGNhbnZhc19kcmF3LmVsKCkuaGVpZ2h0O1xuLy8gXHRcdHZhciBjdHhfdG1wID0gY2FudmFzX3RtcC5nZXRDb250ZXh0KFwiMmRcIik7XG4vLyBcdFx0Y3R4X3RtcC5kcmF3SW1hZ2UoY2FudmFzX2JnLmVsKCksIDAsIDApO1xuLy8gXHRcdGN0eF90bXAuZHJhd0ltYWdlKGNhbnZhc19kcmF3LmVsKCksIDAsIDApO1xuLy8gXHRcdHdpbmRvdy5vcGVuKGNhbnZhc190bXAudG9EYXRhVVJMKGVuY29kaW5nKSk7XG4vLyBcdH1cblxuLy8gXHR2YXIgZGxqcGVnID0gZHJhd0N0cmwuYWRkQ2hpbGQoXG4vLyBcdFx0bmV3IHZpZGVvanMuQ29tcG9uZW50KHBsYXllciwge1xuLy8gXHRcdFx0ZWw6IHZpZGVvanMuQ29tcG9uZW50LnByb3RvdHlwZS5jcmVhdGVFbChudWxsLCB7XG4vLyBcdFx0XHRcdGNsYXNzTmFtZTogJ3Zqcy1jb250cm9sIHZqcy1idXR0b24nLCBpbm5lckhUTUw6ICdKUEVHJywgdGl0bGU6ICdvcGVuIG5ldyB0YWIgd2l0aCBqcGVnIGltYWdlJ1xuLy8gXHRcdFx0fSksXG4vLyBcdFx0fSlcbi8vIFx0KTtcbi8vIFx0ZGxqcGVnLm9uKCdjbGljaycsIGZ1bmN0aW9uKCl7IGNvbWJpbmVEcmF3aW5nKFwiaW1hZ2UvanBlZ1wiKTsgfSk7XG4vLyBcdHZhciBkbHBuZyA9IGRyYXdDdHJsLmFkZENoaWxkKFxuLy8gXHRcdG5ldyB2aWRlb2pzLkNvbXBvbmVudChwbGF5ZXIsIHtcbi8vIFx0XHRcdGVsOiB2aWRlb2pzLkNvbXBvbmVudC5wcm90b3R5cGUuY3JlYXRlRWwobnVsbCwge1xuLy8gXHRcdFx0XHRjbGFzc05hbWU6ICd2anMtY29udHJvbCB2anMtYnV0dG9uJywgaW5uZXJIVE1MOiAnUE5HJywgdGl0bGU6ICdvcGVuIG5ldyB0YWIgd2l0aCBwbmcgaW1hZ2UnXG4vLyBcdFx0XHR9KSxcbi8vIFx0XHR9KVxuLy8gXHQpO1xuLy8gXHRkbHBuZy5vbignY2xpY2snLCBmdW5jdGlvbigpeyBjb21iaW5lRHJhd2luZyhcImltYWdlL3BuZ1wiKTsgfSk7XG5cbi8vIFx0Ly8gY2xvc2UgYnV0dG9uIGxlYWRpbmcgYmFjayB0byBub3JtYWwgdmlkZW8gcGxheSBiYWNrXG4vLyBcdHZhciBjbG9zZSA9IGRyYXdDdHJsLmFkZENoaWxkKCdidXR0b24nKTtcbi8vIFx0Y2xvc2UuYWRkQ2xhc3MoXCJ2anMtZHJhd2luZy1jbG9zZVwiKTtcbi8vIFx0Y2xvc2UuZWwoKS50aXRsZSA9IFwiY2xvc2Ugc2NyZWVuc2hvdCBhbmQgcmV0dXJuIHRvIHZpZGVvXCI7XG4vLyBcdGNsb3NlLm9uKCdjbGljaycsIGZ1bmN0aW9uKCl7XG4vLyBcdFx0Ly8gaGlkZSBjcm9wYm94XG4vLyBcdFx0Y3JvcGJveC5oaWRlKCk7XG4vLyBcdFx0Ly8gaGlkZSBhbGwgY2FudmFzIHN0dWZmXG4vLyBcdFx0cGFyZW50LmhpZGUoKTtcbi8vIFx0XHQvLyBzd2l0Y2ggYmFjayB0byBub3JtYWwgcGxheWVyIGNvbnRyb2xzXG4vLyBcdFx0ZHJhd0N0cmwuaGlkZSgpO1xuLy8gXHRcdHBsYXllci5jb250cm9sQmFyLnNob3coKTtcbi8vIFx0XHRwbGF5ZXIuZWwoKS5mb2N1cygpO1xuLy8gXHR9KTtcblxuLy8gXHQvLyBzY2FsZSBkaXNwbGF5XG4vLyBcdHZhciBzY2FsZV90eHQgPSBkcmF3Q3RybC5hZGRDaGlsZChcbi8vIFx0XHRuZXcgdmlkZW9qcy5Db21wb25lbnQocGxheWVyLCB7XG4vLyBcdFx0XHRlbDogdmlkZW9qcy5Db21wb25lbnQucHJvdG90eXBlLmNyZWF0ZUVsKG51bGwsIHtcbi8vIFx0XHRcdFx0Y2xhc3NOYW1lOiAndmpzLXNjYWxlJywgaW5uZXJIVE1MOiAnMScsIHRpdGxlOiAnc2NhbGUgZmFjdG9yJ1xuLy8gXHRcdFx0fSksXG4vLyBcdFx0fSlcbi8vIFx0KTtcblxuLy8gXHQvLyBjYW52YXMgc3R1ZmZcbi8vIFx0Y29udGFpbmVyID0gcGFyZW50LmFkZENoaWxkKFxuLy8gXHRcdG5ldyB2aWRlb2pzLkNvbXBvbmVudChwbGF5ZXIsIHtcbi8vIFx0XHRcdGVsOiB2aWRlb2pzLkNvbXBvbmVudC5wcm90b3R5cGUuY3JlYXRlRWwobnVsbCwge1xuLy8gXHRcdFx0XHRjbGFzc05hbWU6ICd2anMtY2FudmFzLWNvbnRhaW5lcicgLypUT0RPKi9cbi8vIFx0XHRcdH0pLFxuLy8gXHRcdH0pXG4vLyBcdCk7XG4vLyBcdHZhciBjYW52YXNfYmcgPSBjb250YWluZXIuYWRkQ2hpbGQoIC8vRklYTUU6IGl0J3MgcXVpdGUgc2lsbHkgdG8gdXNlIGEgY29tcG9uZW50IGhlcmVcbi8vIFx0XHRuZXcgdmlkZW9qcy5Db21wb25lbnQocGxheWVyLCB7XG4vLyBcdFx0XHRlbDogdmlkZW9qcy5Db21wb25lbnQucHJvdG90eXBlLmNyZWF0ZUVsKCdjYW52YXMnLCB7XG4vLyBcdFx0XHR9KSxcbi8vIFx0XHR9KVxuLy8gXHQpO1xuLy8gXHR2YXIgY29udGV4dF9iZyA9IGNhbnZhc19iZy5lbCgpLmdldENvbnRleHQoXCIyZFwiKTtcbi8vIFx0dmFyIGNhbnZhc19kcmF3ID0gY29udGFpbmVyLmFkZENoaWxkKFxuLy8gXHRcdG5ldyB2aWRlb2pzLkNvbXBvbmVudChwbGF5ZXIsIHtcbi8vIFx0XHRcdGVsOiB2aWRlb2pzLkNvbXBvbmVudC5wcm90b3R5cGUuY3JlYXRlRWwoJ2NhbnZhcycsIHtcbi8vIFx0XHRcdH0pLFxuLy8gXHRcdH0pXG4vLyBcdCk7XG4vLyBcdHZhciBjb250ZXh0X2RyYXcgPSBjYW52YXNfZHJhdy5lbCgpLmdldENvbnRleHQoXCIyZFwiKTtcbi8vIFx0dmFyIGNhbnZhc19yZWN0ID0gY29udGFpbmVyLmFkZENoaWxkKFxuLy8gXHRcdG5ldyB2aWRlb2pzLkNvbXBvbmVudChwbGF5ZXIsIHtcbi8vIFx0XHRcdGVsOiB2aWRlb2pzLkNvbXBvbmVudC5wcm90b3R5cGUuY3JlYXRlRWwoJ2NhbnZhcycsIHtcbi8vIFx0XHRcdH0pLFxuLy8gXHRcdH0pXG4vLyBcdCk7XG4vLyBcdGNhbnZhc19yZWN0LmVsKCkuc3R5bGUuekluZGV4ID0gXCIxXCI7IC8vIGFsd2F5cyBvbiB0b3Agb2Ygb3RoZXIgY2FudmFzIGVsZW1lbnRzXG4vLyBcdHZhciBjb250ZXh0X3JlY3QgPSBjYW52YXNfcmVjdC5lbCgpLmdldENvbnRleHQoXCIyZFwiKTtcbi8vIFx0dmFyIGNyb3Bib3ggPSBjb250YWluZXIuYWRkQ2hpbGQoXG4vLyBcdFx0bmV3IHZpZGVvanMuQ29tcG9uZW50KHBsYXllciwge1xuLy8gXHRcdFx0ZWw6IHZpZGVvanMuQ29tcG9uZW50LnByb3RvdHlwZS5jcmVhdGVFbCgnZGl2Jywge1xuLy8gXHRcdFx0XHRpbm5lckhUTUw6IFwiY3JvcFwiXG4vLyBcdFx0XHR9KSxcbi8vIFx0XHR9KVxuLy8gXHQpO1xuLy8gXHRjcm9wYm94LmVsKCkuc3R5bGUuZGlzcGxheSA9IFwiZmxleFwiO1xuLy8gXHQvLyBjcm9wIGhhbmRsaW5nLCBjcmVhdGUgbmV3IGNhbnZhcyBhbmQgcmVwbGFjZSBvbGQgb25lXG4vLyBcdGZ1bmN0aW9uIHNjYWxlQ3JvcENhbnZhcyhsZWZ0LCB0b3AsIHdpZHRoLCBoZWlnaHQsIG5ld3dpZHRoLCBuZXdoZWlnaHQsIGNhbnZhcywgY29udGV4dCl7XG4vLyAvLyBcdFx0dmFyIG5ld2NhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuLy8gXHRcdHZhciBuZXdjYW52YXMgPSBuZXcgdmlkZW9qcy5Db21wb25lbnQocGxheWVyLCB7IC8vIEZJWE1FOiB0aGF0J3MgcXVpdGUgc2lsbHlcbi8vIFx0XHRcdGVsOiB2aWRlb2pzLkNvbXBvbmVudC5wcm90b3R5cGUuY3JlYXRlRWwoJ2NhbnZhcycsIHtcbi8vIFx0XHRcdH0pLFxuLy8gXHRcdH0pO1xuLy8gXHRcdHZhciByZWN0ID0gcGxheWVyLmVsKCkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4vLyBcdFx0bmV3Y2FudmFzLmVsKCkuc3R5bGUubWF4V2lkdGggID0gcmVjdC53aWR0aCAgK1wicHhcIjtcbi8vIFx0XHRuZXdjYW52YXMuZWwoKS5zdHlsZS5tYXhIZWlnaHQgPSByZWN0LmhlaWdodCArXCJweFwiO1xuXG4vLyBcdFx0bmV3Y2FudmFzLmVsKCkud2lkdGggPSBuZXd3aWR0aDtcbi8vIFx0XHRuZXdjYW52YXMuZWwoKS5oZWlnaHQgPSBuZXdoZWlnaHQ7XG5cbi8vIFx0XHR2YXIgY3R4ID0gbmV3Y2FudmFzLmVsKCkuZ2V0Q29udGV4dChcIjJkXCIpO1xuLy8gXHRcdGN0eC5kcmF3SW1hZ2UoY2FudmFzLmVsKCksXG4vLyBcdFx0XHRsZWZ0LCB0b3AsIHdpZHRoLCBoZWlnaHQsXG4vLyBcdFx0XHQwLCAwLCBuZXd3aWR0aCwgbmV3aGVpZ2h0XG4vLyBcdFx0KTtcblxuLy8gLy8gXHRcdGNvbnRhaW5lci5yZXBsYWNlQ2hpbGQobmV3Y2FudmFzLCBjYW52YXMpO1xuLy8gXHRcdGNvbnRhaW5lci5yZW1vdmVDaGlsZChjYW52YXMpO1xuLy8gXHRcdGNvbnRhaW5lci5hZGRDaGlsZChuZXdjYW52YXMpO1xuLy8gLy8gXHRcdGNhbnZhcyA9IG5ld2NhbnZhcztcbi8vIFx0XHRjdHgubGluZUNhcCA9IGNvbnRleHQubGluZUNhcDsgLy8gdHJhbnNmZXIgY29udGV4dCBzdGF0ZXNcbi8vIFx0XHRjdHguc3Ryb2tlU3R5bGUgPSBjb250ZXh0LnN0cm9rZVN0eWxlO1xuLy8gXHRcdGN0eC5saW5lV2lkdGggPSBjb250ZXh0LmxpbmVXaWR0aDtcbi8vIC8vIFx0XHRjb250ZXh0ID0gY3R4O1xuLy8gXHRcdC8vIGphdmFzY3JpcHQgaGFzIG5vIHBhc3MtYnktcmVmZXJlbmNlIC0+IGRvIHN0dXBpZCBzdHVmZlxuLy8gXHRcdHJldHVybiBbbmV3Y2FudmFzLCBjdHhdO1xuLy8gXHR9XG4vLyBcdGNyb3Bib3gub24oJ21vdXNlZG93bicsIGZ1bmN0aW9uKGUpe1xuLy8gXHRcdHZhciBsZWZ0ICAgPSBzY2FsZSAqIGNyb3Bib3guZWwoKS5vZmZzZXRMZWZ0ICB8MDtcbi8vIFx0XHR2YXIgdG9wICAgID0gc2NhbGUgKiBjcm9wYm94LmVsKCkub2Zmc2V0VG9wICAgfDA7XG4vLyBcdFx0dmFyIHdpZHRoICA9IHNjYWxlICogY3JvcGJveC5lbCgpLm9mZnNldFdpZHRoIHwwO1xuLy8gXHRcdHZhciBoZWlnaHQgPSBzY2FsZSAqIGNyb3Bib3guZWwoKS5vZmZzZXRIZWlnaHR8MDtcbi8vIFx0XHR2YXIgciA9IHNjYWxlQ3JvcENhbnZhcyhsZWZ0LCB0b3AsIHdpZHRoLCBoZWlnaHQsIHdpZHRoLCBoZWlnaHQsIGNhbnZhc19iZywgY29udGV4dF9iZyk7XG4vLyBcdFx0Y2FudmFzX2JnID0gclswXTsgY29udGV4dF9iZyA9IHJbMV07XG4vLyBcdFx0ciA9IHNjYWxlQ3JvcENhbnZhcyhsZWZ0LCB0b3AsIHdpZHRoLCBoZWlnaHQsIHdpZHRoLCBoZWlnaHQsIGNhbnZhc19kcmF3LCBjb250ZXh0X2RyYXcpO1xuLy8gXHRcdGNhbnZhc19kcmF3ID0gclswXTsgY29udGV4dF9kcmF3ID0gclsxXTtcbi8vIFx0XHR1cGRhdGVTY2FsZSgpO1xuXG4vLyBcdFx0Y3JvcGJveC5oaWRlKCk7XG4vLyBcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTsgLy9vdGhlcndpc2UgY2FudmFzIGJlbG93IGdldHMgbW91c2Vkb3duXG4vLyBcdH0pO1xuXG4vLyBcdHZhciB0ZXh0Ym94ID0gY29udGFpbmVyLmFkZENoaWxkKFxuLy8gXHRcdG5ldyB2aWRlb2pzLkNvbXBvbmVudChwbGF5ZXIsIHtcbi8vIFx0XHRcdGVsOiB2aWRlb2pzLkNvbXBvbmVudC5wcm90b3R5cGUuY3JlYXRlRWwoJ3RleHRhcmVhJywge1xuLy8gXHRcdFx0fSksXG4vLyBcdFx0fSlcbi8vIFx0KTtcbi8vIFx0dGV4dGJveC5vbigna2V5ZG93bicsIGZ1bmN0aW9uKGUpeyAvLyBkb24ndCBmaXJlIHBsYXllciBzaG9ydGN1dHMgd2hlbiB0ZXh0Ym94IGhhcyBmb2N1c1xuLy8gXHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4vLyBcdH0pO1xuLy8gXHQvLyBkcmF3IHRleHQgd2hlbiB0ZXh0Ym94IGxvb3NlcyBmb2N1c1xuLy8gXHR0ZXh0Ym94Lm9uKCdibHVyJywgZnVuY3Rpb24oZSl7XG4vLyBcdFx0Y29udGV4dF9kcmF3LmZpbGxTdHlsZSA9IGNvbG9yLmVsKCkudmFsdWU7XG4vLyBcdFx0Y29udGV4dF9kcmF3LmZvbnQgPSAoc2NhbGUgKiBzaXplLmVsKCkudmFsdWUqMikgK1wicHggc2Fucy1zZXJpZlwiO1xuLy8gXHRcdGNvbnRleHRfZHJhdy50ZXh0QmFzZWxpbmUgPSBcInRvcFwiO1xuLy8gXHRcdGNvbnRleHRfZHJhdy5maWxsVGV4dCh0ZXh0Ym94LmVsKCkudmFsdWUsXG4vLyBcdFx0XHRcdHNjYWxlKnRleHRib3guZWwoKS5vZmZzZXRMZWZ0ICsgc2NhbGUsXG4vLyBcdFx0XHRcdHNjYWxlKnRleHRib3guZWwoKS5vZmZzZXRUb3AgKyBzY2FsZSk7IC8vKzEgZm9yIGJvcmRlcj9cbi8vIFx0XHQvL0ZJWE1FOiB0aGVyZSdzIHN0aWxsIGEgbWlub3Igc2hpZnQgd2hlbiBzY2FsZSBpc24ndCAxLCBpbiBmaXJlZm94IG1vcmUgYW5kIGFsc28gd2hlbiBzY2FsZSBpcyAxXG4vLyBcdFx0dGV4dGJveC5oaWRlKCk7XG4vLyBcdFx0dGV4dGJveC5lbCgpLnZhbHVlID0gXCJcIjtcbi8vIFx0fSk7XG5cbi8vIFx0cGFyZW50LmhpZGUoKTtcbi8vIFx0Y2FudmFzX3JlY3QuaGlkZSgpO1xuLy8gXHRjcm9wYm94LmhpZGUoKTtcbi8vIFx0dGV4dGJveC5oaWRlKCk7XG5cbi8vIFx0Ly8gVE9ETzogZHJhdyBmdW5jdGlvbnNcbi8vIFx0dmFyIHBhaW50ID0gZmFsc2U7XG4vLyBcdGNvbnRhaW5lci5vbignbW91c2Vkb3duJywgZnVuY3Rpb24oZSl7XG4vLyBcdFx0cGFpbnQgPSB0cnVlO1xuLy8gXHRcdHZhciBwb3MgPSBjb250YWluZXIuZWwoKS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbi8vIFx0XHR2YXIgeCA9IGUuY2xpZW50WCAtIHBvcy5sZWZ0O1xuLy8gXHRcdHZhciB5ID0gZS5jbGllbnRZIC0gcG9zLnRvcDtcbi8vIFx0XHRzd2l0Y2godG9vbCl7XG4vLyBcdFx0XHRjYXNlIFwiYnJ1c2hcIjpcbi8vIFx0XHRcdFx0eCAqPSBzY2FsZTsgeSAqPSBzY2FsZTtcbi8vIFx0XHRcdFx0Y29udGV4dF9kcmF3LmJlZ2luUGF0aCgpO1xuLy8gXHRcdFx0XHRjb250ZXh0X2RyYXcubW92ZVRvKHgtMSwgeSk7XG4vLyBcdFx0XHRcdGNvbnRleHRfZHJhdy5saW5lVG8oeCwgeSk7XG4vLyBcdFx0XHRcdGNvbnRleHRfZHJhdy5zdHJva2UoKTtcbi8vIFx0XHRcdFx0YnJlYWs7XG4vLyBcdFx0XHRjYXNlIFwicmVjdFwiOlxuLy8gXHRcdFx0XHQvLyByZWN0YW5nbGUgaXMgc2NhbGVkIHdoZW4gYmxpdHRpbmcsIG5vdCB3aGVuIGRyYWdnaW5nXG4vLyBcdFx0XHRcdGNhbnZhc19yZWN0LmVsKCkud2lkdGggPSAwO1xuLy8gXHRcdFx0XHRjYW52YXNfcmVjdC5lbCgpLmhlaWdodCA9IDA7XG4vLyBcdFx0XHRcdGNhbnZhc19yZWN0LmVsKCkuc3R5bGUubGVmdCA9IHggKyBcInB4XCI7XG4vLyBcdFx0XHRcdGNhbnZhc19yZWN0LmVsKCkuc3R5bGUudG9wID0geSArIFwicHhcIjtcbi8vIFx0XHRcdFx0Y2FudmFzX3JlY3Quc2hvdygpO1xuLy8gXHRcdFx0XHRicmVhaztcbi8vIFx0XHRcdGNhc2UgXCJjcm9wXCI6XG4vLyBcdFx0XHRcdGNyb3Bib3guZWwoKS5zdHlsZS53aWR0aCA9IDA7XG4vLyBcdFx0XHRcdGNyb3Bib3guZWwoKS5zdHlsZS5oZWlnaHQgPSAwO1xuLy8gXHRcdFx0XHRjcm9wYm94LmVsKCkuc3R5bGUubGVmdCA9IHggKyBcInB4XCI7XG4vLyBcdFx0XHRcdGNyb3Bib3guZWwoKS5zdHlsZS50b3AgPSB5ICsgXCJweFwiO1xuXG4vLyBcdFx0XHRcdGNyb3Bib3guZWwoKS5zdHlsZS5ib3JkZXIgPSBcIjFweCBkYXNoZWQgXCIrIGNvbG9yLmVsKCkudmFsdWU7XG4vLyBcdFx0XHRcdGNyb3Bib3guZWwoKS5zdHlsZS5jb2xvciA9IGNvbG9yLmVsKCkudmFsdWU7XG4vLyBcdFx0XHRcdGNyb3Bib3guc2hvdygpO1xuLy8gXHRcdFx0XHRicmVhaztcbi8vIFx0XHRcdGNhc2UgXCJ0ZXh0XCI6XG4vLyBcdFx0XHRcdC8vIGlmIHNob3duIGFscmVhZHksIGxvb3NlIGZvY3VzIGFuZCBkcmF3IGl0IGZpcnN0LCBvdGhlcndpc2UgaXQgZ2V0cyBkcmF3biBhdCBtb3VzZWRvd25cbi8vIFx0XHRcdFx0aWYodGV4dGJveC5oYXNDbGFzcyhcInZqcy1oaWRkZW5cIikpe1xuLy8gXHRcdFx0XHRcdHRleHRib3guZWwoKS5zdHlsZS53aWR0aCA9IDA7XG4vLyBcdFx0XHRcdFx0dGV4dGJveC5lbCgpLnN0eWxlLmhlaWdodCA9IDA7XG4vLyBcdFx0XHRcdFx0dGV4dGJveC5lbCgpLnN0eWxlLmxlZnQgPSB4ICsgXCJweFwiO1xuLy8gXHRcdFx0XHRcdHRleHRib3guZWwoKS5zdHlsZS50b3AgPSB5ICsgXCJweFwiO1xuXG4vLyBcdFx0XHRcdFx0dGV4dGJveC5lbCgpLnN0eWxlLmJvcmRlciA9IFwiMXB4IGRhc2hlZCBcIisgY29sb3IuZWwoKS52YWx1ZTtcbi8vIFx0XHRcdFx0XHR0ZXh0Ym94LmVsKCkuc3R5bGUuY29sb3IgPSBjb2xvci5lbCgpLnZhbHVlO1xuLy8gXHRcdFx0XHRcdHRleHRib3guZWwoKS5zdHlsZS5mb250ID0gKHNpemUuZWwoKS52YWx1ZSoyKSArXCJweCBzYW5zLXNlcmlmXCI7XG4vLyBcdFx0XHRcdFx0dGV4dGJveC5zaG93KCk7XG4vLyBcdFx0XHRcdH1cbi8vIFx0XHRcdFx0YnJlYWs7XG4vLyBcdFx0XHRjYXNlIFwiZXJhc2VyXCI6XG4vLyBcdFx0XHRcdHZhciBzID0gc2l6ZS5lbCgpLnZhbHVlO1xuLy8gXHRcdFx0XHRjb250ZXh0X2RyYXcuY2xlYXJSZWN0KHNjYWxlKnggLSBzLzIsIHNjYWxlKnkgLSBzLzIsIHMsIHMpO1xuLy8gXHRcdFx0XHRicmVhaztcbi8vIFx0XHR9XG4vLyAvLyBcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuLy8gXHR9KTtcbi8vIFx0Y29udGFpbmVyLm9uKCdtb3VzZW1vdmUnLCBmdW5jdGlvbihlKXtcbi8vIFx0XHRpZihwYWludCl7XG4vLyBcdFx0XHR2YXIgcG9zID0gY29udGFpbmVyLmVsKCkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4vLyBcdFx0XHR2YXIgeCA9IGUuY2xpZW50WCAtIHBvcy5sZWZ0O1xuLy8gXHRcdFx0dmFyIHkgPSBlLmNsaWVudFkgLSBwb3MudG9wO1xuLy8gXHRcdFx0c3dpdGNoKHRvb2wpe1xuLy8gXHRcdFx0XHRjYXNlIFwiYnJ1c2hcIjpcbi8vIFx0XHRcdFx0XHRjb250ZXh0X2RyYXcubGluZVRvKHNjYWxlICogeCwgc2NhbGUgKiB5KTtcbi8vIFx0XHRcdFx0XHRjb250ZXh0X2RyYXcuc3Ryb2tlKCk7XG4vLyBcdFx0XHRcdFx0YnJlYWs7XG4vLyBcdFx0XHRcdGNhc2UgXCJyZWN0XCI6XG4vLyBcdFx0XHRcdFx0Y29udGV4dF9yZWN0LmNsZWFyUmVjdCgwLCAwLCBjb250ZXh0X3JlY3QuY2FudmFzLndpZHRoLCBjb250ZXh0X3JlY3QuY2FudmFzLmhlaWdodCk7XG4vLyBcdFx0XHRcdFx0Ly8gdGhpcyB3YXkgaXQncyBvbmx5IHBvc3NpYmxlIHRvIGRyYWcgdG8gdGhlIHJpZ2h0IGFuZCBkb3duLCBtb3VzZWRvd24gc2V0cyB0b3AgbGVmdFxuLy8gXHRcdFx0XHRcdGNhbnZhc19yZWN0LmVsKCkud2lkdGggPSB4IC0gY2FudmFzX3JlY3QuZWwoKS5vZmZzZXRMZWZ0OyAvLyByZXNpemUgY2FudmFzXG4vLyBcdFx0XHRcdFx0Y2FudmFzX3JlY3QuZWwoKS5oZWlnaHQgPSB5IC0gY2FudmFzX3JlY3QuZWwoKS5vZmZzZXRUb3A7XG4vLyBcdFx0XHRcdFx0Y29udGV4dF9yZWN0LnN0cm9rZVN0eWxlID0gY29sb3IuZWwoKS52YWx1ZTsgLy9sb29rcyBsaWtlIGl0cyByZXNldCB3aGVuIHJlc2l6aW5nIGNhbnZhc1xuLy8gXHRcdFx0XHRcdGNvbnRleHRfcmVjdC5saW5lV2lkdGggPSBzaXplLmVsKCkudmFsdWUgLyBzY2FsZTsgLy8gc2NhbGUgbGluZVdpZHRoXG4vLyBcdFx0XHRcdFx0Y29udGV4dF9yZWN0LnN0cm9rZVJlY3QoMCwgMCwgY29udGV4dF9yZWN0LmNhbnZhcy53aWR0aCwgY29udGV4dF9yZWN0LmNhbnZhcy5oZWlnaHQpO1xuLy8gXHRcdFx0XHRcdGJyZWFrO1xuLy8gXHRcdFx0XHRjYXNlIFwiY3JvcFwiOlxuLy8gXHRcdFx0XHRcdGNyb3Bib3guZWwoKS5zdHlsZS53aWR0aCA9ICh4IC0gY3JvcGJveC5lbCgpLm9mZnNldExlZnQpICtcInB4XCI7IC8vIHJlc2l6ZVxuLy8gXHRcdFx0XHRcdGNyb3Bib3guZWwoKS5zdHlsZS5oZWlnaHQgPSAoeSAtIGNyb3Bib3guZWwoKS5vZmZzZXRUb3ApICtcInB4XCI7XG4vLyBcdFx0XHRcdFx0YnJlYWs7XG4vLyBcdFx0XHRcdGNhc2UgXCJ0ZXh0XCI6XG4vLyBcdFx0XHRcdFx0dGV4dGJveC5lbCgpLnN0eWxlLndpZHRoID0gKHggLSB0ZXh0Ym94LmVsKCkub2Zmc2V0TGVmdCkgK1wicHhcIjsgLy8gcmVzaXplXG4vLyBcdFx0XHRcdFx0dGV4dGJveC5lbCgpLnN0eWxlLmhlaWdodCA9ICh5IC0gdGV4dGJveC5lbCgpLm9mZnNldFRvcCkgK1wicHhcIjtcbi8vIFx0XHRcdFx0XHRicmVhaztcbi8vIFx0XHRcdFx0Y2FzZSBcImVyYXNlclwiOlxuLy8gXHRcdFx0XHRcdHZhciBzID0gc2l6ZS5lbCgpLnZhbHVlO1xuLy8gXHRcdFx0XHRcdGNvbnRleHRfZHJhdy5jbGVhclJlY3Qoc2NhbGUqeCAtIHMvMiwgc2NhbGUqeSAtIHMvMiwgcywgcyk7XG4vLyBcdFx0XHRcdFx0YnJlYWs7XG4vLyBcdFx0XHR9XG4vLyBcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG4vLyBcdFx0fVxuLy8gXHR9KTtcbi8vIFx0ZnVuY3Rpb24gZmluaXNoKCl7XG4vLyBcdFx0aWYocGFpbnQpe1xuLy8gXHRcdFx0cGFpbnQgPSBmYWxzZTtcbi8vIFx0XHRcdGlmKHRvb2wgPT0gXCJyZWN0XCIpe1xuLy8gXHRcdFx0XHQvL2JsaXQgY2FudmFzX3JlY3Qgb24gY2FudmFzLCBzY2FsZWRcbi8vIFx0XHRcdFx0Y29udGV4dF9kcmF3LmRyYXdJbWFnZShjYW52YXNfcmVjdC5lbCgpLFxuLy8gXHRcdFx0XHRcdFx0c2NhbGUqY2FudmFzX3JlY3QuZWwoKS5vZmZzZXRMZWZ0LCBzY2FsZSpjYW52YXNfcmVjdC5lbCgpLm9mZnNldFRvcCxcbi8vIFx0XHRcdFx0XHRcdHNjYWxlKmNvbnRleHRfcmVjdC5jYW52YXMud2lkdGgsIHNjYWxlKmNvbnRleHRfcmVjdC5jYW52YXMuaGVpZ2h0KTtcbi8vIFx0XHRcdFx0Y2FudmFzX3JlY3QuaGlkZSgpO1xuLy8gXHRcdFx0fWVsc2UgaWYodG9vbCA9PSBcInRleHRcIil7XG4vLyBcdFx0XHRcdHBsYXllci5lbCgpLmJsdXIoKTtcbi8vIFx0XHRcdFx0dGV4dGJveC5lbCgpLmZvY3VzKCk7XG4vLyBcdFx0XHR9XG4vLyBcdFx0fVxuLy8gXHR9XG4vLyBcdGNvbnRhaW5lci5vbignbW91c2V1cCcsIGZpbmlzaCk7XG4vLyBcdGNvbnRhaW5lci5vbignbW91c2VsZWF2ZScsIGZpbmlzaCk7XG4vLyB9O1xuXG4vKipcbiAqIOiusOW9lSDlvZXpn7Mg5oiq5bGPXG4gKiBAcGFyYW0ge1t0eXBlXX0gb3B0aW9ucyBbZGVzY3JpcHRpb25dXG4gKiByZXR1cm4ge1t0eXBlXX0gIFtkZXNjcmlwdGlvbl1cbiAqL1xudmFyIHNuYXBzaG90ID0ge1xuXHQvKipcblx0ICogUmV0dXJucyBhbiBvYmplY3QgdGhhdCBjYXB0dXJlcyB0aGUgcG9ydGlvbnMgb2YgcGxheWVyIHN0YXRlIHJlbGV2YW50IHRvXG5cdCAqIHZpZGVvIHBsYXliYWNrLiBUaGUgcmVzdWx0IG9mIHRoaXMgZnVuY3Rpb24gY2FuIGJlIHBhc3NlZCB0b1xuXHQgKiByZXN0b3JlUGxheWVyU25hcHNob3Qgd2l0aCBhIHBsYXllciB0byByZXR1cm4gdGhlIHBsYXllciB0byB0aGUgc3RhdGUgaXRcblx0ICogd2FzIGluIHdoZW4gdGhpcyBmdW5jdGlvbiB3YXMgaW52b2tlZC5cblx0ICogQHBhcmFtIHtvYmplY3R9IHBsYXllciBUaGUgdmlkZW9qcyBwbGF5ZXIgb2JqZWN0XG5cdCAqL1xuXHRnZXRQbGF5ZXJTbmFwc2hvdDogZnVuY3Rpb24ocGxheWVyKSB7XG5cblx0XHRsZXQgY3VycmVudFRpbWU7XG5cblx0XHRpZiAodmlkZW9qcy5icm93c2VyLklTX0lPUyAmJiBwbGF5ZXIuYWRzLmlzTGl2ZShwbGF5ZXIpKSB7XG5cdFx0XHQvLyBSZWNvcmQgaG93IGZhciBiZWhpbmQgbGl2ZSB3ZSBhcmVcblx0XHRcdGlmIChwbGF5ZXIuc2Vla2FibGUoKS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdGN1cnJlbnRUaW1lID0gcGxheWVyLmN1cnJlbnRUaW1lKCkgLSBwbGF5ZXIuc2Vla2FibGUoKS5lbmQoMCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHRlY2ggPSBwbGF5ZXIuJCgnLnZqcy10ZWNoJyk7XG5cdFx0Y29uc3QgdHJhY2tzID0gcGxheWVyLnJlbW90ZVRleHRUcmFja3MgPyBwbGF5ZXIucmVtb3RlVGV4dFRyYWNrcygpIDogW107XG5cdFx0Y29uc3Qgc3VwcHJlc3NlZFRyYWNrcyA9IFtdO1xuXHRcdGNvbnN0IHNuYXBzaG90ID0ge1xuXHRcdFx0ZW5kZWQ6IHBsYXllci5lbmRlZCgpLFxuXHRcdFx0Y3VycmVudFNyYzogcGxheWVyLmN1cnJlbnRTcmMoKSxcblx0XHRcdHNyYzogcGxheWVyLnNyYygpLFxuXHRcdFx0Y3VycmVudFRpbWUsXG5cdFx0XHR0eXBlOiBwbGF5ZXIuY3VycmVudFR5cGUoKVxuXHRcdH07XG5cblx0XHRpZiAodGVjaCkge1xuXHRcdFx0c25hcHNob3QubmF0aXZlUG9zdGVyID0gdGVjaC5wb3N0ZXI7XG5cdFx0XHRzbmFwc2hvdC5zdHlsZSA9IHRlY2guZ2V0QXR0cmlidXRlKCdzdHlsZScpO1xuXHRcdH1cblxuXHRcdGZvciAobGV0IGkgPSB0cmFja3MubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcblx0XHRcdGNvbnN0IHRyYWNrID0gdHJhY2tzW2ldO1xuXG5cdFx0XHRzdXBwcmVzc2VkVHJhY2tzLnB1c2goe1xuXHRcdFx0XHR0cmFjayxcblx0XHRcdFx0bW9kZTogdHJhY2subW9kZVxuXHRcdFx0fSk7XG5cdFx0XHR0cmFjay5tb2RlID0gJ2Rpc2FibGVkJztcblx0XHR9XG5cdFx0c25hcHNob3Quc3VwcHJlc3NlZFRyYWNrcyA9IHN1cHByZXNzZWRUcmFja3M7XG5cblx0XHRyZXR1cm4gc25hcHNob3Q7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEF0dGVtcHRzIHRvIG1vZGlmeSB0aGUgc3BlY2lmaWVkIHBsYXllciBzbyB0aGF0IGl0cyBzdGF0ZSBpcyBlcXVpdmFsZW50IHRvXG5cdCAqIHRoZSBzdGF0ZSBvZiB0aGUgc25hcHNob3QuXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBzbmFwc2hvdCAtIHRoZSBwbGF5ZXIgc3RhdGUgdG8gYXBwbHlcblx0ICovXG5cdHJlc3RvcmVQbGF5ZXJTbmFwc2hvdDogZnVuY3Rpb24ocGxheWVyLCBzbmFwc2hvdCkge1xuXG5cdFx0aWYgKHBsYXllci5hZHMuZGlzYWJsZU5leHRTbmFwc2hvdFJlc3RvcmUgPT09IHRydWUpIHtcblx0XHRcdHBsYXllci5hZHMuZGlzYWJsZU5leHRTbmFwc2hvdFJlc3RvcmUgPSBmYWxzZTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBUaGUgcGxheWJhY2sgdGVjaFxuXHRcdGxldCB0ZWNoID0gcGxheWVyLiQoJy52anMtdGVjaCcpO1xuXG5cdFx0Ly8gdGhlIG51bWJlciBvZlsgcmVtYWluaW5nIGF0dGVtcHRzIHRvIHJlc3RvcmUgdGhlIHNuYXBzaG90XG5cdFx0bGV0IGF0dGVtcHRzID0gMjA7XG5cblx0XHRjb25zdCBzdXBwcmVzc2VkVHJhY2tzID0gc25hcHNob3Quc3VwcHJlc3NlZFRyYWNrcztcblx0XHRsZXQgdHJhY2tTbmFwc2hvdDtcblx0XHRsZXQgcmVzdG9yZVRyYWNrcyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0Zm9yIChsZXQgaSA9IHN1cHByZXNzZWRUcmFja3MubGVuZ3RoOyBpID4gMDsgaS0tKSB7XG5cdFx0XHRcdHRyYWNrU25hcHNob3QgPSBzdXBwcmVzc2VkVHJhY2tzW2ldO1xuXHRcdFx0XHR0cmFja1NuYXBzaG90LnRyYWNrLm1vZGUgPSB0cmFja1NuYXBzaG90Lm1vZGU7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdC8vIGZpbmlzaCByZXN0b3JpbmcgdGhlIHBsYXliYWNrIHN0YXRlXG5cdFx0Y29uc3QgcmVzdW1lID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRsZXQgY3VycmVudFRpbWU7XG5cblx0XHRcdGlmICh2aWRlb2pzLmJyb3dzZXIuSVNfSU9TICYmIHBsYXllci5hZHMuaXNMaXZlKHBsYXllcikpIHtcblx0XHRcdFx0aWYgKHNuYXBzaG90LmN1cnJlbnRUaW1lIDwgMCkge1xuXHRcdFx0XHRcdC8vIFBsYXliYWNrIHdhcyBiZWhpbmQgcmVhbCB0aW1lLCBzbyBzZWVrIGJhY2t3YXJkcyB0byBtYXRjaFxuXHRcdFx0XHRcdGlmIChwbGF5ZXIuc2Vla2FibGUoKS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0XHRjdXJyZW50VGltZSA9IHBsYXllci5zZWVrYWJsZSgpLmVuZCgwKSArIHNuYXBzaG90LmN1cnJlbnRUaW1lO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRwbGF5ZXIuY3VycmVudFRpbWUoY3VycmVudFRpbWUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwbGF5ZXIuY3VycmVudFRpbWUoc25hcHNob3QuZW5kZWQgPyBwbGF5ZXIuZHVyYXRpb24oKSA6IHNuYXBzaG90LmN1cnJlbnRUaW1lKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gUmVzdW1lIHBsYXliYWNrIGlmIHRoaXMgd2Fzbid0IGEgcG9zdHJvbGxcblx0XHRcdGlmICghc25hcHNob3QuZW5kZWQpIHtcblx0XHRcdFx0cGxheWVyLnBsYXkoKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0Ly8gZGV0ZXJtaW5lIGlmIHRoZSB2aWRlbyBlbGVtZW50IGhhcyBsb2FkZWQgZW5vdWdoIG9mIHRoZSBzbmFwc2hvdCBzb3VyY2Vcblx0XHQvLyB0byBiZSByZWFkeSB0byBhcHBseSB0aGUgcmVzdCBvZiB0aGUgc3RhdGVcblx0XHRjb25zdCB0cnlUb1Jlc3VtZSA9IGZ1bmN0aW9uKCkge1xuXG5cdFx0XHQvLyB0cnlUb1Jlc3VtZSBjYW4gZWl0aGVyIGhhdmUgYmVlbiBjYWxsZWQgdGhyb3VnaCB0aGUgYGNvbnRlbnRjYW5wbGF5YFxuXHRcdFx0Ly8gZXZlbnQgb3IgZmlyZWQgdGhyb3VnaCBzZXRUaW1lb3V0LlxuXHRcdFx0Ly8gV2hlbiB0cnlUb1Jlc3VtZSBpcyBjYWxsZWQsIHdlIHNob3VsZCBtYWtlIHN1cmUgdG8gY2xlYXIgb3V0IHRoZSBvdGhlclxuXHRcdFx0Ly8gd2F5IGl0IGNvdWxkJ3ZlIGJlZW4gY2FsbGVkIGJ5IHJlbW92aW5nIHRoZSBsaXN0ZW5lciBhbmQgY2xlYXJpbmcgb3V0XG5cdFx0XHQvLyB0aGUgdGltZW91dC5cblx0XHRcdHBsYXllci5vZmYoJ2NvbnRlbnRjYW5wbGF5JywgdHJ5VG9SZXN1bWUpO1xuXHRcdFx0aWYgKHBsYXllci5hZHMudHJ5VG9SZXN1bWVUaW1lb3V0Xykge1xuXHRcdFx0XHRwbGF5ZXIuY2xlYXJUaW1lb3V0KHBsYXllci5hZHMudHJ5VG9SZXN1bWVUaW1lb3V0Xyk7XG5cdFx0XHRcdHBsYXllci5hZHMudHJ5VG9SZXN1bWVUaW1lb3V0XyA9IG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFRlY2ggbWF5IGhhdmUgY2hhbmdlZCBkZXBlbmRpbmcgb24gdGhlIGRpZmZlcmVuY2VzIGluIHNvdXJjZXMgb2YgdGhlXG5cdFx0XHQvLyBvcmlnaW5hbCB2aWRlbyBhbmQgdGhhdCBvZiB0aGUgYWRcblx0XHRcdHRlY2ggPSBwbGF5ZXIuZWwoKS5xdWVyeVNlbGVjdG9yKCcudmpzLXRlY2gnKTtcblxuXHRcdFx0aWYgKHRlY2gucmVhZHlTdGF0ZSA+IDEpIHtcblx0XHRcdFx0Ly8gc29tZSBicm93c2VycyBhbmQgbWVkaWEgYXJlbid0IFwic2Vla2FibGVcIi5cblx0XHRcdFx0Ly8gcmVhZHlTdGF0ZSBncmVhdGVyIHRoYW4gMSBhbGxvd3MgZm9yIHNlZWtpbmcgd2l0aG91dCBleGNlcHRpb25zXG5cdFx0XHRcdHJldHVybiByZXN1bWUoKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHRlY2guc2Vla2FibGUgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHQvLyBpZiB0aGUgdGVjaCBkb2Vzbid0IGV4cG9zZSB0aGUgc2Vla2FibGUgdGltZSByYW5nZXMsIHRyeSB0b1xuXHRcdFx0XHQvLyByZXN1bWUgcGxheWJhY2sgaW1tZWRpYXRlbHlcblx0XHRcdFx0cmV0dXJuIHJlc3VtZSgpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodGVjaC5zZWVrYWJsZS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdC8vIGlmIHNvbWUgcGVyaW9kIG9mIHRoZSB2aWRlbyBpcyBzZWVrYWJsZSwgcmVzdW1lIHBsYXliYWNrXG5cdFx0XHRcdHJldHVybiByZXN1bWUoKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gZGVsYXkgYSBiaXQgYW5kIHRoZW4gY2hlY2sgYWdhaW4gdW5sZXNzIHdlJ3JlIG91dCBvZiBhdHRlbXB0c1xuXHRcdFx0aWYgKGF0dGVtcHRzLS0pIHtcblx0XHRcdFx0d2luZG93LnNldFRpbWVvdXQodHJ5VG9SZXN1bWUsIDUwKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0cmVzdW1lKCk7XG5cdFx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0XHR2aWRlb2pzLmxvZy53YXJuKCdGYWlsZWQgdG8gcmVzdW1lIHRoZSBjb250ZW50IGFmdGVyIGFuIGFkdmVydGlzZW1lbnQnLCBlKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRpZiAoc25hcHNob3QubmF0aXZlUG9zdGVyKSB7XG5cdFx0XHR0ZWNoLnBvc3RlciA9IHNuYXBzaG90Lm5hdGl2ZVBvc3Rlcjtcblx0XHR9XG5cblx0XHRpZiAoJ3N0eWxlJyBpbiBzbmFwc2hvdCkge1xuXHRcdFx0Ly8gb3ZlcndyaXRlIGFsbCBjc3Mgc3R5bGUgcHJvcGVydGllcyB0byByZXN0b3JlIHN0YXRlIHByZWNpc2VseVxuXHRcdFx0dGVjaC5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgc25hcHNob3Quc3R5bGUgfHwgJycpO1xuXHRcdH1cblxuXHRcdC8vIERldGVybWluZSB3aGV0aGVyIHRoZSBwbGF5ZXIgbmVlZHMgdG8gYmUgcmVzdG9yZWQgdG8gaXRzIHN0YXRlXG5cdFx0Ly8gYmVmb3JlIGFkIHBsYXliYWNrIGJlZ2FuLiBXaXRoIGEgY3VzdG9tIGFkIGRpc3BsYXkgb3IgYnVybmVkLWluXG5cdFx0Ly8gYWRzLCB0aGUgY29udGVudCBwbGF5ZXIgc3RhdGUgaGFzbid0IGJlZW4gbW9kaWZpZWQgYW5kIHNvIG5vXG5cdFx0Ly8gcmVzdG9yYXRpb24gaXMgcmVxdWlyZWRcblxuXHRcdGlmIChwbGF5ZXIuYWRzLnZpZGVvRWxlbWVudFJlY3ljbGVkKCkpIHtcblx0XHRcdC8vIG9uIGlvczcsIGZpZGRsaW5nIHdpdGggdGV4dFRyYWNrcyB0b28gZWFybHkgd2lsbCBjYXVzZSBzYWZhcmkgdG8gY3Jhc2hcblx0XHRcdHBsYXllci5vbmUoJ2NvbnRlbnRsb2FkZWRtZXRhZGF0YScsIHJlc3RvcmVUcmFja3MpO1xuXG5cdFx0XHQvLyBpZiB0aGUgc3JjIGNoYW5nZWQgZm9yIGFkIHBsYXliYWNrLCByZXNldCBpdFxuXHRcdFx0cGxheWVyLnNyYyh7XG5cdFx0XHRcdHNyYzogc25hcHNob3QuY3VycmVudFNyYyxcblx0XHRcdFx0dHlwZTogc25hcHNob3QudHlwZVxuXHRcdFx0fSk7XG5cdFx0XHQvLyBzYWZhcmkgcmVxdWlyZXMgYSBjYWxsIHRvIGBsb2FkYCB0byBwaWNrIHVwIGEgY2hhbmdlZCBzb3VyY2Vcblx0XHRcdHBsYXllci5sb2FkKCk7XG5cdFx0XHQvLyBhbmQgdGhlbiByZXN1bWUgZnJvbSB0aGUgc25hcHNob3RzIHRpbWUgb25jZSB0aGUgb3JpZ2luYWwgc3JjIGhhcyBsb2FkZWRcblx0XHRcdC8vIGluIHNvbWUgYnJvd3NlcnMgKGZpcmVmb3gpIGBjYW5wbGF5YCBtYXkgbm90IGZpcmUgY29ycmVjdGx5LlxuXHRcdFx0Ly8gUmVhY2UgdGhlIGBjYW5wbGF5YCBldmVudCB3aXRoIGEgdGltZW91dC5cblx0XHRcdHBsYXllci5vbmUoJ2NvbnRlbnRjYW5wbGF5JywgdHJ5VG9SZXN1bWUpO1xuXHRcdFx0cGxheWVyLmFkcy50cnlUb1Jlc3VtZVRpbWVvdXRfID0gcGxheWVyLnNldFRpbWVvdXQodHJ5VG9SZXN1bWUsIDIwMDApO1xuXHRcdH0gZWxzZSBpZiAoIXBsYXllci5lbmRlZCgpIHx8ICFzbmFwc2hvdC5lbmRlZCkge1xuXHRcdFx0Ly8gaWYgd2UgZGlkbid0IGNoYW5nZSB0aGUgc3JjLCBqdXN0IHJlc3RvcmUgdGhlIHRyYWNrc1xuXHRcdFx0cmVzdG9yZVRyYWNrcygpO1xuXHRcdFx0Ly8gdGhlIHNyYyBkaWRuJ3QgY2hhbmdlIGFuZCB0aGlzIHdhc24ndCBhIHBvc3Ryb2xsXG5cdFx0XHQvLyBqdXN0IHJlc3VtZSBwbGF5YmFjayBhdCB0aGUgY3VycmVudCB0aW1lLlxuXHRcdFx0cGxheWVyLnBsYXkoKTtcblx0XHR9XG5cdH1cbn07XG5cbmNvbnN0IHJlY29yZFBvaW50ID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHR2YXIgc2V0dGluZ3MgPSB2aWRlb2pzLm1lcmdlT3B0aW9ucyhkZWZhdWx0cywgb3B0aW9ucykscGxheWVyID0gdGhpcyx0aW1lVGVtcDtcblx0dGhpcy5vbihcInRpbWV1cGRhdGVcIiwgcGxheWVyVGltZVVwZGF0ZSk7XG5cdHRoaXMub24oXCJlbmRlZFwiLHBsYXllckVuZGVkKTtcblxuXG5cdGZ1bmN0aW9uIHBsYXllclRpbWVVcGRhdGUoKSB7XG5cdFx0dmFyIGN1ciA9IHBhcnNlSW50KHBsYXllci5jdXJyZW50VGltZSgpKTtcblx0XHR2YXIgaXNQYXVzZWQgPSBwbGF5ZXIucGF1c2VkKCk7XG5cdFx0aWYoY3VyICE9IHRpbWVUZW1wKXtcblx0XHRcdHRpbWVUZW1wID0gY3VyO1xuXHRcdFx0Ly9jb25zb2xlLmxvZyhjdXIlc2V0dGluZ3Muc2VjUGVyVGltZSk7XG5cdFx0XHRpZihjdXI9PTApe1xuXHRcdFx0XHRwbGF5ZXIudHJpZ2dlcigndGltZVVwZGF0ZScse3R5cGU6ICdzdGFydCcsIGN1cnJlbnQ6IHBsYXllci5jdXJyZW50VGltZSgpLCB0b3RhbDogcGxheWVyLmR1cmF0aW9uKCl9KTtcblx0XHRcdH1cblx0XHRcdGlmKHNldHRpbmdzLnNlY1BlclRpbWU+MCl7XG5cdFx0XHRcdGlmKGN1ciAlIHNldHRpbmdzLnNlY1BlclRpbWU9PTApe1xuXHRcdFx0XHRcdHBsYXllci50cmlnZ2VyKCd0aW1lVXBkYXRlJyx7dHlwZTogJ3RpY2snLCBjdXJyZW50OiBwbGF5ZXIuY3VycmVudFRpbWUoKSwgdG90YWw6IHBsYXllci5kdXJhdGlvbigpfSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmKHNldHRpbmdzLmZpbmlzaFBjdD49MCAmJiBzZXR0aW5ncy5maW5pc2hQY3Q8PTEwMCl7XG5cdFx0XHRcdHZhciBwZXJjZW50ID0gcGxheWVyLmN1cnJlbnRUaW1lKCkvcGxheWVyLmR1cmF0aW9uKCk7XG5cdFx0XHRcdGlmKHBlcmNlbnQ+PXNldHRpbmdzLmZpbmlzaFBjdC8xMDApe1xuXHRcdFx0XHRcdGlmKCFzZXR0aW5ncy5pc0ZpbmlzaCB8fCBzZXR0aW5ncy5pc0ZpbmlzaCA9PSB1bmRlZmluZWQpe1xuXHRcdFx0XHRcdFx0c2V0dGluZ3MuaXNGaW5pc2ggPSB0cnVlO1xuXHRcdFx0XHRcdFx0cGxheWVyLnRyaWdnZXIoJ3RpbWVVcGRhdGUnLHt0eXBlOiAnZmluaXNoJywgY3VycmVudDogcGxheWVyLmN1cnJlbnRUaW1lKCksIHRvdGFsOiBwbGF5ZXIuZHVyYXRpb24oKX0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fWVsc2V7XG5cdFx0XHRcdFx0c2V0dGluZ3MuaXNGaW5pc2ggPSBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHRmdW5jdGlvbiBwbGF5ZXJFbmRlZCgpIHtcblx0XHRwbGF5ZXIudHJpZ2dlcigndGltZVVwZGF0ZScse3R5cGU6ICdlbmRlZCcsIGN1cnJlbnQ6IHBsYXllci5jdXJyZW50VGltZSgpLCB0b3RhbDogcGxheWVyLmR1cmF0aW9uKCl9KTtcblx0fVxufTtcblxuLy8gUmVnaXN0ZXIgdGhlIHBsdWdpbiB3aXRoIHZpZGVvLmpzLlxudmlkZW9qcy5wbHVnaW4oJ29wZW4nLCBvcGVuKTtcbnZpZGVvanMucGx1Z2luKCd2aWRlb0pzUmVzb2x1dGlvblN3aXRjaGVyJywgdmlkZW9Kc1Jlc29sdXRpb25Td2l0Y2hlcik7XG52aWRlb2pzLnBsdWdpbignZGlzYWJsZVByb2dyZXNzJywgZGlzYWJsZVByb2dyZXNzKTtcbnZpZGVvanMucGx1Z2luKCdtYXJrZXJzJywgbWFya2Vycyk7XG52aWRlb2pzLnBsdWdpbignd2F0ZXJNYXJrJywgd2F0ZXJNYXJrKTtcbnZpZGVvanMucGx1Z2luKCdzbmFwc2hvdCcsIHNuYXBzaG90KTtcbnZpZGVvanMucGx1Z2luKCdyZWNvcmRQb2ludCcsIHJlY29yZFBvaW50KTtcblxuLy8gSW5jbHVkZSB0aGUgdmVyc2lvbiBudW1iZXIuXG5vcGVuLlZFUlNJT04gPSAnX19WRVJTSU9OX18nO1xuXG5leHBvcnQgZGVmYXVsdCBvcGVuOyJdfQ==

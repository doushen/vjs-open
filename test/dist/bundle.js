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
			player.controlBar.progressControl.seekBar.off("mousedown");
			player.controlBar.progressControl.seekBar.off("touchstart");
			player.controlBar.progressControl.seekBar.off("click");
		},
		enable: function enable() {
			state = false;
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
// Register the plugin with video.js.
_videoJs2['default'].plugin('open', open);
_videoJs2['default'].plugin('videoJsResolutionSwitcher', videoJsResolutionSwitcher);
_videoJs2['default'].plugin('disableProgress', disableProgress);

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2dsb2JhbC9kb2N1bWVudC5qcyIsIi9Vc2Vycy9vcGVuL0RvY3VtZW50cy9Xb3JrL1NvdXJjZVRyZWUvdmpzLW9wZW4vc3JjL3BsdWdpbi5qcyIsIi9Vc2Vycy9vcGVuL0RvY3VtZW50cy9Xb3JrL1NvdXJjZVRyZWUvdmpzLW9wZW4vdGVzdC9wbHVnaW4udGVzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOzs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozt1QkNmb0IsVUFBVTs7Ozs7QUFHOUIsSUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDOzs7Ozs7Ozs7Ozs7O0FBYXBCLElBQU0sYUFBYSxHQUFHLFNBQWhCLGFBQWEsQ0FBSSxNQUFNLEVBQUUsT0FBTyxFQUFLO0FBQzFDLE9BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7Q0FFNUIsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7QUFjRixJQUFNLElBQUksR0FBRyxTQUFQLElBQUksQ0FBWSxPQUFPLEVBQUU7OztBQUM5QixLQUFJLENBQUMsS0FBSyxDQUFDLFlBQU07QUFDaEIsZUFBYSxRQUFPLHFCQUFRLFlBQVksQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztFQUM3RCxDQUFDLENBQUM7Q0FDSCxDQUFDOztBQUVGLElBQU0seUJBQXlCLEdBQUcsbUNBQVMsT0FBTyxFQUFFO0FBQ25ELEtBQUkseUJBQXlCO0tBQzVCLFFBQVEsR0FBRztBQUNWLElBQUUsRUFBRSxJQUFJO0VBQ1IsQ0FBQzs7Ozs7QUFLSCxLQUFJLFFBQVEsR0FBRyxxQkFBUSxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDaEQsS0FBSSxrQkFBa0IsR0FBRyxxQkFBUSxNQUFNLENBQUMsUUFBUSxFQUFFO0FBQ2pELGFBQVcsRUFBRSxxQkFBUyxNQUFNLEVBQUUsT0FBTyxFQUFFO0FBQ3RDLFVBQU8sQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDOztBQUUxQixXQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDckMsT0FBSSxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDOztBQUV2QixTQUFNLENBQUMsRUFBRSxDQUFDLGtCQUFrQixFQUFFLHFCQUFRLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7R0FDL0Q7RUFDRCxDQUFDLENBQUM7QUFDSCxtQkFBa0IsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFHLFVBQVMsS0FBSyxFQUFFO0FBQzFELFVBQVEsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDakQsTUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0VBQ3BELENBQUM7QUFDRixtQkFBa0IsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLFlBQVc7QUFDaEQsTUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0FBQ2pELE1BQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEtBQUssU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0VBQ3ZELENBQUM7QUFDRixTQUFRLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLEVBQUUsa0JBQWtCLENBQUMsQ0FBQzs7Ozs7QUFLckUsS0FBSSxVQUFVLEdBQUcscUJBQVEsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3BELEtBQUksb0JBQW9CLEdBQUcscUJBQVEsTUFBTSxDQUFDLFVBQVUsRUFBRTtBQUNyRCxhQUFXLEVBQUUscUJBQVMsTUFBTSxFQUFFLE9BQU8sRUFBRTtBQUN0QyxPQUFJLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDNUMsVUFBTyxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUM7O0FBRTFCLGFBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztBQUN2QyxPQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQztBQUNoRCxPQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDOztBQUU1QixPQUFJLE9BQU8sQ0FBQyxZQUFZLEVBQUU7QUFDekIseUJBQVEsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsNkJBQTZCLENBQUMsQ0FBQztBQUM1RCxRQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNsQyxNQUFNO0FBQ04sUUFBSSxXQUFXLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNqRCx5QkFBUSxRQUFRLENBQUMsV0FBVyxFQUFFLGVBQWUsQ0FBQyxDQUFDO0FBQy9DLFFBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDbkM7QUFDRCxTQUFNLENBQUMsRUFBRSxDQUFDLGVBQWUsRUFBRSxxQkFBUSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0dBQzVEO0VBQ0QsQ0FBQyxDQUFDO0FBQ0gscUJBQW9CLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBRyxZQUFXO0FBQ3ZELE1BQUksU0FBUyxHQUFHLEVBQUUsQ0FBQztBQUNuQixNQUFJLE1BQU0sR0FBRyxBQUFDLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUssRUFBRSxDQUFDOzs7QUFHeEQsT0FBSyxJQUFJLEdBQUcsSUFBSSxNQUFNLEVBQUU7QUFDdkIsT0FBSSxNQUFNLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQy9CLGFBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxrQkFBa0IsQ0FDcEMsSUFBSSxDQUFDLE9BQU8sRUFBRTtBQUNiLFVBQUssRUFBRSxHQUFHO0FBQ1YsUUFBRyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUM7QUFDaEIsYUFBUSxFQUFFLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssR0FBRyxLQUFLLENBQUEsQUFBQztLQUMvRSxDQUFDLENBQUMsQ0FBQztJQUNMO0dBQ0Q7QUFDRCxTQUFPLFNBQVMsQ0FBQztFQUNqQixDQUFDO0FBQ0YscUJBQW9CLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxZQUFXO0FBQ2xELE1BQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQztBQUM1QyxNQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0FBQ3pELE1BQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztBQUNoRixTQUFPLFVBQVUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUM5QyxDQUFDO0FBQ0YscUJBQW9CLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBRyxZQUFXO0FBQ3pELFNBQU8sVUFBVSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLHdCQUF3QixDQUFDO0VBQ2hGLENBQUM7QUFDRixXQUFVLENBQUMsaUJBQWlCLENBQUMsc0JBQXNCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQzs7Ozs7O0FBTTNFLEtBQUksUUFBUSxHQUFHLHFCQUFRLFlBQVksQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDO0tBQ3JELE1BQU0sR0FBRyxJQUFJO0tBQ2IsVUFBVSxHQUFHLEVBQUU7S0FDZixjQUFjLEdBQUcsRUFBRTtLQUNuQixzQkFBc0IsR0FBRyxFQUFFLENBQUM7Ozs7Ozs7QUFPN0IsT0FBTSxDQUFDLFNBQVMsR0FBRyxVQUFTLEdBQUcsRUFBRTs7QUFFaEMsTUFBSSxDQUFDLEdBQUcsRUFBRTtBQUNULFVBQU8sTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO0dBQ3BCOzs7QUFHRCxLQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFTLE1BQU0sRUFBRTtBQUNqQyxPQUFJO0FBQ0gsV0FBUSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUU7SUFDaEQsQ0FBQyxPQUFPLENBQUMsRUFBRTs7QUFFWCxXQUFPLElBQUksQ0FBQztJQUNaO0dBQ0QsQ0FBQyxDQUFDOztBQUVILE1BQUksQ0FBQyxjQUFjLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ25ELE1BQUksQ0FBQyxVQUFVLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQzs7QUFFckQsTUFBSSxNQUFNLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzdELE1BQUksQ0FBQyxzQkFBc0IsR0FBRztBQUM3QixRQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUs7QUFDbkIsVUFBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPO0dBQ3ZCLENBQUM7O0FBRUYsUUFBTSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUNoQyxRQUFNLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDekQsUUFBTSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ25DLFNBQU8sTUFBTSxDQUFDO0VBQ2QsQ0FBQzs7Ozs7Ozs7QUFRRixPQUFNLENBQUMsaUJBQWlCLEdBQUcsVUFBUyxLQUFLLEVBQUUsa0JBQWtCLEVBQUU7QUFDOUQsTUFBSSxLQUFLLElBQUksSUFBSSxFQUFFO0FBQ2xCLFVBQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDO0dBQ25DOzs7QUFHRCxNQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUU7QUFDaEYsVUFBTztHQUNQO0FBQ0QsTUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7O0FBRTNDLE1BQUksV0FBVyxHQUFHLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUN2QyxNQUFJLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7OztBQUcvQixNQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRTtBQUNyRCxPQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztHQUNsQzs7Ozs7O0FBTUQsTUFBSSxlQUFlLEdBQUcsWUFBWSxDQUFDO0FBQ25DLE1BQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEtBQUssU0FBUyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEtBQUssTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxLQUFLLE9BQU8sRUFBRTtBQUNwSCxrQkFBZSxHQUFHLFlBQVksQ0FBQztHQUMvQjtBQUNELFFBQU0sQ0FDSixtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixJQUFJLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUN0RixHQUFHLENBQUMsZUFBZSxFQUFFLFlBQVc7QUFDaEMsU0FBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNoQyxTQUFNLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztBQUMzQixPQUFJLENBQUMsUUFBUSxFQUFFOztBQUVkLFVBQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQ2xDO0FBQ0QsU0FBTSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0dBQ25DLENBQUMsQ0FBQztBQUNKLFNBQU8sTUFBTSxDQUFDO0VBQ2QsQ0FBQzs7Ozs7O0FBTUYsT0FBTSxDQUFDLGFBQWEsR0FBRyxZQUFXO0FBQ2pDLFNBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztFQUN2QixDQUFDOztBQUVGLE9BQU0sQ0FBQyxtQkFBbUIsR0FBRyxVQUFTLE9BQU8sRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUU7QUFDekUsTUFBSSxDQUFDLHNCQUFzQixHQUFHO0FBQzdCLFFBQUssRUFBRSxLQUFLO0FBQ1osVUFBTyxFQUFFLE9BQU87R0FDaEIsQ0FBQztBQUNGLE1BQUksT0FBTyxrQkFBa0IsS0FBSyxVQUFVLEVBQUU7QUFDN0MsVUFBTyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO0dBQ2xEO0FBQ0QsUUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVMsR0FBRyxFQUFFO0FBQ3BDLFVBQU87QUFDTixPQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUc7QUFDWixRQUFJLEVBQUUsR0FBRyxDQUFDLElBQUk7QUFDZCxPQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUc7SUFDWixDQUFDO0dBQ0YsQ0FBQyxDQUFDLENBQUM7QUFDSixTQUFPLE1BQU0sQ0FBQztFQUNkLENBQUM7Ozs7Ozs7O0FBUUYsVUFBUyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQ2pDLE1BQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRTtBQUNyQixVQUFPLENBQUMsQ0FBQztHQUNUO0FBQ0QsU0FBTyxBQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEFBQUMsQ0FBQztFQUMzQjs7Ozs7OztBQU9ELFVBQVMsYUFBYSxDQUFDLEdBQUcsRUFBRTtBQUMzQixNQUFJLFdBQVcsR0FBRztBQUNqQixRQUFLLEVBQUUsRUFBRTtBQUNULE1BQUcsRUFBRSxFQUFFO0FBQ1AsT0FBSSxFQUFFLEVBQUU7R0FDUixDQUFDO0FBQ0YsS0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFTLE1BQU0sRUFBRTtBQUN4QixvQkFBaUIsQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ2hELG9CQUFpQixDQUFDLFdBQVcsRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDOUMsb0JBQWlCLENBQUMsV0FBVyxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQzs7QUFFL0Msb0JBQWlCLENBQUMsV0FBVyxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztBQUNoRCxvQkFBaUIsQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQzlDLG9CQUFpQixDQUFDLFdBQVcsRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7R0FDL0MsQ0FBQyxDQUFDO0FBQ0gsU0FBTyxXQUFXLENBQUM7RUFDbkI7O0FBRUQsVUFBUyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRTtBQUNwRCxNQUFJLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxJQUFJLEVBQUU7QUFDMUMsY0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztHQUNuQztFQUNEOztBQUVELFVBQVMsaUJBQWlCLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUU7QUFDcEQsYUFBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztFQUMzQzs7Ozs7Ozs7QUFRRCxVQUFTLFNBQVMsQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO0FBQ25DLE1BQUksV0FBVyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN0QyxNQUFJLGFBQWEsR0FBRyxFQUFFLENBQUM7QUFDdkIsTUFBSSxXQUFXLEtBQUssTUFBTSxFQUFFO0FBQzNCLGNBQVcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ3pCLGdCQUFhLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztHQUM3QixNQUFNLElBQUksV0FBVyxLQUFLLEtBQUssSUFBSSxXQUFXLElBQUksSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRTs7QUFFeEYsY0FBVyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUN0QyxnQkFBYSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztHQUMxQyxNQUFNLElBQUksVUFBVSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRTtBQUN2QyxnQkFBYSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0dBQ3JEOztBQUVELFNBQU87QUFDTixNQUFHLEVBQUUsV0FBVztBQUNoQixRQUFLLEVBQUUsYUFBYTtBQUNwQixVQUFPLEVBQUUsVUFBVSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUM7R0FDcEMsQ0FBQztFQUNGOztBQUVELFVBQVMsbUJBQW1CLENBQUMsTUFBTSxFQUFFOztBQUVwQyxNQUFJLElBQUksR0FBRztBQUNWLFVBQU8sRUFBRTtBQUNSLE9BQUcsRUFBRSxJQUFJO0FBQ1QsU0FBSyxFQUFFLE1BQU07QUFDYixNQUFFLEVBQUUsU0FBUztJQUNiO0FBQ0QsU0FBTSxFQUFFO0FBQ1AsT0FBRyxFQUFFLElBQUk7QUFDVCxTQUFLLEVBQUUsTUFBTTtBQUNiLE1BQUUsRUFBRSxRQUFRO0lBQ1o7QUFDRCxRQUFLLEVBQUU7QUFDTixPQUFHLEVBQUUsR0FBRztBQUNSLFNBQUssRUFBRSxLQUFLO0FBQ1osTUFBRSxFQUFFLE9BQU87SUFDWDtBQUNELFFBQUssRUFBRTtBQUNOLE9BQUcsRUFBRSxHQUFHO0FBQ1IsU0FBSyxFQUFFLEtBQUs7QUFDWixNQUFFLEVBQUUsT0FBTztJQUNYO0FBQ0QsU0FBTSxFQUFFO0FBQ1AsT0FBRyxFQUFFLEdBQUc7QUFDUixTQUFLLEVBQUUsS0FBSztBQUNaLE1BQUUsRUFBRSxRQUFRO0lBQ1o7QUFDRCxRQUFLLEVBQUU7QUFDTixPQUFHLEVBQUUsR0FBRztBQUNSLFNBQUssRUFBRSxLQUFLO0FBQ1osTUFBRSxFQUFFLE9BQU87SUFDWDtBQUNELE9BQUksRUFBRTtBQUNMLE9BQUcsRUFBRSxHQUFHO0FBQ1IsU0FBSyxFQUFFLEtBQUs7QUFDWixNQUFFLEVBQUUsTUFBTTtJQUNWO0FBQ0QsT0FBSSxFQUFFO0FBQ0wsT0FBRyxFQUFFLENBQUM7QUFDTixTQUFLLEVBQUUsTUFBTTtBQUNiLE1BQUUsRUFBRSxNQUFNO0lBQ1Y7R0FDRCxDQUFDOztBQUVGLE1BQUksbUJBQW1CLEdBQUcsU0FBdEIsbUJBQW1CLENBQVksT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUU7O0FBRTdELFNBQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUMxRCxTQUFNLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ2hDLFVBQU8sTUFBTSxDQUFDO0dBQ2QsQ0FBQztBQUNGLFVBQVEsQ0FBQyxrQkFBa0IsR0FBRyxtQkFBbUIsQ0FBQzs7O0FBR2xELFFBQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDOzs7QUFHakQsUUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMseUJBQXlCLEVBQUUsVUFBUyxLQUFLLEVBQUU7QUFDakYsUUFBSyxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7QUFDckIsUUFBSSxHQUFHLENBQUMsRUFBRSxLQUFLLEtBQUssQ0FBQyxJQUFJLEVBQUU7QUFDMUIsV0FBTSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztBQUN6RCxZQUFPO0tBQ1A7SUFDRDtHQUNELENBQUMsQ0FBQzs7O0FBR0gsUUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsWUFBVztBQUM3QixPQUFJLFNBQVMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO0FBQ2xFLE9BQUksUUFBUSxHQUFHLEVBQUUsQ0FBQzs7QUFFbEIsWUFBUyxDQUFDLEdBQUcsQ0FBQyxVQUFTLENBQUMsRUFBRTtBQUN6QixZQUFRLENBQUMsSUFBSSxDQUFDO0FBQ2IsUUFBRyxFQUFFLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHO0FBQ3JCLFNBQUksRUFBRSxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSTtBQUN2QixVQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDcEIsUUFBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQ2hCLFFBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtLQUNmLENBQUMsQ0FBQztJQUNILENBQUMsQ0FBQzs7QUFFSCxTQUFNLENBQUMsVUFBVSxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM1QyxPQUFJLE1BQU0sR0FBRztBQUNaLFNBQUssRUFBRSxNQUFNO0FBQ2IsT0FBRyxFQUFFLENBQUM7QUFDTixXQUFPLEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSTtJQUNyQyxDQUFDOztBQUVGLE9BQUksQ0FBQyxzQkFBc0IsR0FBRztBQUM3QixTQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUs7QUFDbkIsV0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPO0lBQ3ZCLENBQUM7O0FBRUYsU0FBTSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUNoQyxTQUFNLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLG1CQUFtQixDQUFDLENBQUM7R0FDOUUsQ0FBQyxDQUFDO0VBQ0g7O0FBRUQsT0FBTSxDQUFDLEtBQUssQ0FBQyxZQUFXO0FBQ3ZCLE1BQUksUUFBUSxDQUFDLEVBQUUsRUFBRTtBQUNoQixPQUFJLFVBQVUsR0FBRyxJQUFJLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztBQUM1RCxTQUFNLENBQUMsVUFBVSxDQUFDLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDOUksU0FBTSxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEdBQUcsWUFBVztBQUN6RCxRQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQyxDQUFDO0dBQ0Y7QUFDRCxNQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7OztBQUd2QyxTQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7R0FDMUM7O0FBRUQsTUFBSSxNQUFNLENBQUMsU0FBUyxLQUFLLFNBQVMsRUFBRTs7QUFFbkMsc0JBQW1CLENBQUMsTUFBTSxDQUFDLENBQUM7R0FDNUI7RUFDRCxDQUFDLENBQUM7Q0FFSCxDQUFDOztBQUVGLElBQU0sZUFBZSxHQUFHLFNBQWxCLGVBQWUsQ0FBWSxPQUFPLEVBQUU7QUFDekM7Ozs7QUFJQyxPQUFNLEdBQUcsU0FBVCxNQUFNLENBQVksR0FBRyx5QkFBMEI7QUFDOUMsTUFBSSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNkLE9BQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUN0QyxNQUFHLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25CLFFBQUssQ0FBQyxJQUFJLEdBQUcsRUFBRTtBQUNkLFFBQUksR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUMxQixRQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2hCO0lBQ0Q7R0FDRDtBQUNELFNBQU8sR0FBRyxDQUFDO0VBQ1g7Ozs7QUFHRCxTQUFRLEdBQUc7QUFDVixhQUFXLEVBQUUsS0FBSztFQUNsQixDQUFDOztBQUdIOztBQUVDLE9BQU0sR0FBRyxJQUFJO0tBQ2IsS0FBSyxHQUFHLEtBQUs7Ozs7QUFHYixTQUFRLEdBQUcsTUFBTSxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDOzs7QUFHaEQsT0FBTSxDQUFDLGVBQWUsR0FBRztBQUN4QixTQUFPLEVBQUUsbUJBQVc7QUFDbkIsUUFBSyxHQUFHLElBQUksQ0FBQztBQUNiLFNBQU0sQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDM0QsU0FBTSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUM1RCxTQUFNLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0dBQ3ZEO0FBQ0QsUUFBTSxFQUFFLGtCQUFXO0FBQ2xCLFFBQUssR0FBRyxLQUFLLENBQUM7QUFDZCxTQUFNLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDckgsU0FBTSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3RILFNBQU0sQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztHQUM3RztBQUNELFVBQVEsRUFBRSxvQkFBVztBQUNwQixVQUFPLEtBQUssQ0FBQztHQUNiO0VBQ0QsQ0FBQzs7QUFFRixLQUFJLFFBQVEsQ0FBQyxXQUFXLEVBQUU7QUFDekIsUUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztFQUNqQztDQUNELENBQUM7O0FBRUYscUJBQVEsTUFBTSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM3QixxQkFBUSxNQUFNLENBQUMsMkJBQTJCLEVBQUUseUJBQXlCLENBQUMsQ0FBQztBQUN2RSxxQkFBUSxNQUFNLENBQUMsaUJBQWlCLEVBQUUsZUFBZSxDQUFDLENBQUM7OztBQUduRCxJQUFJLENBQUMsT0FBTyxHQUFHLGFBQWEsQ0FBQzs7cUJBRWQsSUFBSTs7Ozs7Ozs7Ozs7OEJDaGZFLGlCQUFpQjs7OztxQkFFcEIsT0FBTzs7OztxQkFDUCxPQUFPOzs7O3VCQUNMLFVBQVU7Ozs7eUJBRVgsZUFBZTs7OztBQUVsQyxJQUFNLE1BQU0sR0FBRyxxQkFBUSxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7O0FBRTlDLG1CQUFNLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxVQUFTLE1BQU0sRUFBRTtBQUNyRCxRQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sS0FBSyxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUM7QUFDbkUsUUFBTSxDQUFDLFdBQVcsQ0FBQyx5QkFBWSxFQUFFLFFBQVEsRUFBRSxjQUFjLENBQUMsQ0FBQztBQUMzRCxRQUFNLENBQUMsV0FBVyxDQUFDLDJCQUFjLEVBQUUsVUFBVSxFQUFFLGdCQUFnQixDQUFDLENBQUM7QUFDakUsUUFBTSxDQUFDLFdBQVcsQ0FBQyw2QkFBYSxFQUFFLFVBQVUsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO0NBQ3ZFLENBQUMsQ0FBQzs7QUFFSCxtQkFBTSxNQUFNLENBQUMsY0FBYyxFQUFFOztBQUUzQixZQUFVLEVBQUEsc0JBQUc7Ozs7OztBQU1YLFFBQUksQ0FBQyxLQUFLLEdBQUcsbUJBQU0sYUFBYSxFQUFFLENBQUM7O0FBRW5DLFFBQUksQ0FBQyxPQUFPLEdBQUcsNEJBQVMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3hELFFBQUksQ0FBQyxLQUFLLEdBQUcsNEJBQVMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzdDLFFBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNyQyxRQUFJLENBQUMsTUFBTSxHQUFHLDBCQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztHQUNuQzs7QUFFRCxXQUFTLEVBQUEscUJBQUc7QUFDVixRQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ3RCLFFBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7R0FDdEI7Q0FDRixDQUFDLENBQUM7O0FBRUgsbUJBQU0sSUFBSSxDQUFDLGdDQUFnQyxFQUFFLFVBQVMsTUFBTSxFQUFFO0FBQzVELFFBQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRWpCLFFBQU0sQ0FBQyxXQUFXLENBQ2hCLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSwwQkFFckIsb0NBQW9DLENBQ3JDLENBQUM7O0FBRUYsTUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQzs7O0FBR25CLE1BQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVuQixRQUFNLENBQUMsRUFBRSxDQUNQLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUNoQyx1Q0FBdUMsQ0FDeEMsQ0FBQztDQUNILENBQUMsQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIiLCJ2YXIgdG9wTGV2ZWwgPSB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6XG4gICAgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB7fVxudmFyIG1pbkRvYyA9IHJlcXVpcmUoJ21pbi1kb2N1bWVudCcpO1xuXG5pZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZG9jdW1lbnQ7XG59IGVsc2Uge1xuICAgIHZhciBkb2NjeSA9IHRvcExldmVsWydfX0dMT0JBTF9ET0NVTUVOVF9DQUNIRUA0J107XG5cbiAgICBpZiAoIWRvY2N5KSB7XG4gICAgICAgIGRvY2N5ID0gdG9wTGV2ZWxbJ19fR0xPQkFMX0RPQ1VNRU5UX0NBQ0hFQDQnXSA9IG1pbkRvYztcbiAgICB9XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGRvY2N5O1xufVxuIiwiaW1wb3J0IHZpZGVvanMgZnJvbSAndmlkZW8uanMnO1xuXG4vLyBEZWZhdWx0IG9wdGlvbnMgZm9yIHRoZSBwbHVnaW4uXG5jb25zdCBkZWZhdWx0cyA9IHt9O1xuXG4vKipcbiAqIEZ1bmN0aW9uIHRvIGludm9rZSB3aGVuIHRoZSBwbGF5ZXIgaXMgcmVhZHkuXG4gKlxuICogVGhpcyBpcyBhIGdyZWF0IHBsYWNlIGZvciB5b3VyIHBsdWdpbiB0byBpbml0aWFsaXplIGl0c2VsZi4gV2hlbiB0aGlzXG4gKiBmdW5jdGlvbiBpcyBjYWxsZWQsIHRoZSBwbGF5ZXIgd2lsbCBoYXZlIGl0cyBET00gYW5kIGNoaWxkIGNvbXBvbmVudHNcbiAqIGluIHBsYWNlLlxuICpcbiAqIEBmdW5jdGlvbiBvblBsYXllclJlYWR5XG4gKiBAcGFyYW0gICAge1BsYXllcn0gcGxheWVyXG4gKiBAcGFyYW0gICAge09iamVjdH0gW29wdGlvbnM9e31dXG4gKi9cbmNvbnN0IG9uUGxheWVyUmVhZHkgPSAocGxheWVyLCBvcHRpb25zKSA9PiB7XG5cdHBsYXllci5hZGRDbGFzcygndmpzLW9wZW4nKTtcblxufTtcblxuLyoqXG4gKiBBIHZpZGVvLmpzIHBsdWdpbi5cbiAqXG4gKiBJbiB0aGUgcGx1Z2luIGZ1bmN0aW9uLCB0aGUgdmFsdWUgb2YgYHRoaXNgIGlzIGEgdmlkZW8uanMgYFBsYXllcmBcbiAqIGluc3RhbmNlLiBZb3UgY2Fubm90IHJlbHkgb24gdGhlIHBsYXllciBiZWluZyBpbiBhIFwicmVhZHlcIiBzdGF0ZSBoZXJlLFxuICogZGVwZW5kaW5nIG9uIGhvdyB0aGUgcGx1Z2luIGlzIGludm9rZWQuIFRoaXMgbWF5IG9yIG1heSBub3QgYmUgaW1wb3J0YW50XG4gKiB0byB5b3U7IGlmIG5vdCwgcmVtb3ZlIHRoZSB3YWl0IGZvciBcInJlYWR5XCIhXG4gKlxuICogQGZ1bmN0aW9uIG9wZW5cbiAqIEBwYXJhbSAgICB7T2JqZWN0fSBbb3B0aW9ucz17fV1cbiAqICAgICAgICAgICBBbiBvYmplY3Qgb2Ygb3B0aW9ucyBsZWZ0IHRvIHRoZSBwbHVnaW4gYXV0aG9yIHRvIGRlZmluZS5cbiAqL1xuY29uc3Qgb3BlbiA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0dGhpcy5yZWFkeSgoKSA9PiB7XG5cdFx0b25QbGF5ZXJSZWFkeSh0aGlzLCB2aWRlb2pzLm1lcmdlT3B0aW9ucyhkZWZhdWx0cywgb3B0aW9ucykpO1xuXHR9KTtcbn07XG4vLyDliIbovqjnjodcbmNvbnN0IHZpZGVvSnNSZXNvbHV0aW9uU3dpdGNoZXIgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdHZhciB2aWRlb0pzUmVzb2x1dGlvblN3aXRjaGVyLFxuXHRcdGRlZmF1bHRzID0ge1xuXHRcdFx0dWk6IHRydWVcblx0XHR9O1xuXG5cdC8qXG5cdCAqIFJlc29sdXRpb24gbWVudSBpdGVtXG5cdCAqL1xuXHR2YXIgTWVudUl0ZW0gPSB2aWRlb2pzLmdldENvbXBvbmVudCgnTWVudUl0ZW0nKTtcblx0dmFyIFJlc29sdXRpb25NZW51SXRlbSA9IHZpZGVvanMuZXh0ZW5kKE1lbnVJdGVtLCB7XG5cdFx0Y29uc3RydWN0b3I6IGZ1bmN0aW9uKHBsYXllciwgb3B0aW9ucykge1xuXHRcdFx0b3B0aW9ucy5zZWxlY3RhYmxlID0gdHJ1ZTtcblx0XHRcdC8vIFNldHMgdGhpcy5wbGF5ZXJfLCB0aGlzLm9wdGlvbnNfIGFuZCBpbml0aWFsaXplcyB0aGUgY29tcG9uZW50XG5cdFx0XHRNZW51SXRlbS5jYWxsKHRoaXMsIHBsYXllciwgb3B0aW9ucyk7XG5cdFx0XHR0aGlzLnNyYyA9IG9wdGlvbnMuc3JjO1xuXG5cdFx0XHRwbGF5ZXIub24oJ3Jlc29sdXRpb25jaGFuZ2UnLCB2aWRlb2pzLmJpbmQodGhpcywgdGhpcy51cGRhdGUpKTtcblx0XHR9XG5cdH0pO1xuXHRSZXNvbHV0aW9uTWVudUl0ZW0ucHJvdG90eXBlLmhhbmRsZUNsaWNrID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRNZW51SXRlbS5wcm90b3R5cGUuaGFuZGxlQ2xpY2suY2FsbCh0aGlzLCBldmVudCk7XG5cdFx0dGhpcy5wbGF5ZXJfLmN1cnJlbnRSZXNvbHV0aW9uKHRoaXMub3B0aW9uc18ubGFiZWwpO1xuXHR9O1xuXHRSZXNvbHV0aW9uTWVudUl0ZW0ucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxlY3Rpb24gPSB0aGlzLnBsYXllcl8uY3VycmVudFJlc29sdXRpb24oKTtcblx0XHR0aGlzLnNlbGVjdGVkKHRoaXMub3B0aW9uc18ubGFiZWwgPT09IHNlbGVjdGlvbi5sYWJlbCk7XG5cdH07XG5cdE1lbnVJdGVtLnJlZ2lzdGVyQ29tcG9uZW50KCdSZXNvbHV0aW9uTWVudUl0ZW0nLCBSZXNvbHV0aW9uTWVudUl0ZW0pO1xuXG5cdC8qXG5cdCAqIFJlc29sdXRpb24gbWVudSBidXR0b25cblx0ICovXG5cdHZhciBNZW51QnV0dG9uID0gdmlkZW9qcy5nZXRDb21wb25lbnQoJ01lbnVCdXR0b24nKTtcblx0dmFyIFJlc29sdXRpb25NZW51QnV0dG9uID0gdmlkZW9qcy5leHRlbmQoTWVudUJ1dHRvbiwge1xuXHRcdGNvbnN0cnVjdG9yOiBmdW5jdGlvbihwbGF5ZXIsIG9wdGlvbnMpIHtcblx0XHRcdHRoaXMubGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cdFx0XHRvcHRpb25zLmxhYmVsID0gJ1F1YWxpdHknO1xuXHRcdFx0Ly8gU2V0cyB0aGlzLnBsYXllcl8sIHRoaXMub3B0aW9uc18gYW5kIGluaXRpYWxpemVzIHRoZSBjb21wb25lbnRcblx0XHRcdE1lbnVCdXR0b24uY2FsbCh0aGlzLCBwbGF5ZXIsIG9wdGlvbnMpO1xuXHRcdFx0dGhpcy5lbCgpLnNldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcsICdRdWFsaXR5Jyk7XG5cdFx0XHR0aGlzLmNvbnRyb2xUZXh0KCdRdWFsaXR5Jyk7XG5cblx0XHRcdGlmIChvcHRpb25zLmR5bmFtaWNMYWJlbCkge1xuXHRcdFx0XHR2aWRlb2pzLmFkZENsYXNzKHRoaXMubGFiZWwsICd2anMtcmVzb2x1dGlvbi1idXR0b24tbGFiZWwnKTtcblx0XHRcdFx0dGhpcy5lbCgpLmFwcGVuZENoaWxkKHRoaXMubGFiZWwpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dmFyIHN0YXRpY0xhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuXHRcdFx0XHR2aWRlb2pzLmFkZENsYXNzKHN0YXRpY0xhYmVsLCAndmpzLW1lbnUtaWNvbicpO1xuXHRcdFx0XHR0aGlzLmVsKCkuYXBwZW5kQ2hpbGQoc3RhdGljTGFiZWwpO1xuXHRcdFx0fVxuXHRcdFx0cGxheWVyLm9uKCd1cGRhdGVTb3VyY2VzJywgdmlkZW9qcy5iaW5kKHRoaXMsIHRoaXMudXBkYXRlKSk7XG5cdFx0fVxuXHR9KTtcblx0UmVzb2x1dGlvbk1lbnVCdXR0b24ucHJvdG90eXBlLmNyZWF0ZUl0ZW1zID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIG1lbnVJdGVtcyA9IFtdO1xuXHRcdHZhciBsYWJlbHMgPSAodGhpcy5zb3VyY2VzICYmIHRoaXMuc291cmNlcy5sYWJlbCkgfHwge307XG5cblx0XHQvLyBGSVhNRSBvcmRlciBpcyBub3QgZ3VhcmFudGVlZCBoZXJlLlxuXHRcdGZvciAodmFyIGtleSBpbiBsYWJlbHMpIHtcblx0XHRcdGlmIChsYWJlbHMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuXHRcdFx0XHRtZW51SXRlbXMucHVzaChuZXcgUmVzb2x1dGlvbk1lbnVJdGVtKFxuXHRcdFx0XHRcdHRoaXMucGxheWVyXywge1xuXHRcdFx0XHRcdFx0bGFiZWw6IGtleSxcblx0XHRcdFx0XHRcdHNyYzogbGFiZWxzW2tleV0sXG5cdFx0XHRcdFx0XHRzZWxlY3RlZDoga2V5ID09PSAodGhpcy5jdXJyZW50U2VsZWN0aW9uID8gdGhpcy5jdXJyZW50U2VsZWN0aW9uLmxhYmVsIDogZmFsc2UpXG5cdFx0XHRcdFx0fSkpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gbWVudUl0ZW1zO1xuXHR9O1xuXHRSZXNvbHV0aW9uTWVudUJ1dHRvbi5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5zb3VyY2VzID0gdGhpcy5wbGF5ZXJfLmdldEdyb3VwZWRTcmMoKTtcblx0XHR0aGlzLmN1cnJlbnRTZWxlY3Rpb24gPSB0aGlzLnBsYXllcl8uY3VycmVudFJlc29sdXRpb24oKTtcblx0XHR0aGlzLmxhYmVsLmlubmVySFRNTCA9IHRoaXMuY3VycmVudFNlbGVjdGlvbiA/IHRoaXMuY3VycmVudFNlbGVjdGlvbi5sYWJlbCA6ICcnO1xuXHRcdHJldHVybiBNZW51QnV0dG9uLnByb3RvdHlwZS51cGRhdGUuY2FsbCh0aGlzKTtcblx0fTtcblx0UmVzb2x1dGlvbk1lbnVCdXR0b24ucHJvdG90eXBlLmJ1aWxkQ1NTQ2xhc3MgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gTWVudUJ1dHRvbi5wcm90b3R5cGUuYnVpbGRDU1NDbGFzcy5jYWxsKHRoaXMpICsgJyB2anMtcmVzb2x1dGlvbi1idXR0b24nO1xuXHR9O1xuXHRNZW51QnV0dG9uLnJlZ2lzdGVyQ29tcG9uZW50KCdSZXNvbHV0aW9uTWVudUJ1dHRvbicsIFJlc29sdXRpb25NZW51QnV0dG9uKTtcblxuXHQvKipcblx0ICogSW5pdGlhbGl6ZSB0aGUgcGx1Z2luLlxuXHQgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSBwbHVnaW5cblx0ICovXG5cdHZhciBzZXR0aW5ncyA9IHZpZGVvanMubWVyZ2VPcHRpb25zKGRlZmF1bHRzLCBvcHRpb25zKSxcblx0XHRwbGF5ZXIgPSB0aGlzLFxuXHRcdGdyb3VwZWRTcmMgPSB7fSxcblx0XHRjdXJyZW50U291cmNlcyA9IHt9LFxuXHRcdGN1cnJlbnRSZXNvbHV0aW9uU3RhdGUgPSB7fTtcblxuXHQvKipcblx0ICogVXBkYXRlcyBwbGF5ZXIgc291cmNlcyBvciByZXR1cm5zIGN1cnJlbnQgc291cmNlIFVSTFxuXHQgKiBAcGFyYW0gICB7QXJyYXl9ICBbc3JjXSBhcnJheSBvZiBzb3VyY2VzIFt7c3JjOiAnJywgdHlwZTogJycsIGxhYmVsOiAnJywgcmVzOiAnJ31dXG5cdCAqIEByZXR1cm5zIHtPYmplY3R8U3RyaW5nfEFycmF5fSB2aWRlb2pzIHBsYXllciBvYmplY3QgaWYgdXNlZCBhcyBzZXR0ZXIgb3IgY3VycmVudCBzb3VyY2UgVVJMLCBvYmplY3QsIG9yIGFycmF5IG9mIHNvdXJjZXNcblx0ICovXG5cdHBsYXllci51cGRhdGVTcmMgPSBmdW5jdGlvbihzcmMpIHtcblx0XHQvL1JldHVybiBjdXJyZW50IHNyYyBpZiBzcmMgaXMgbm90IGdpdmVuXG5cdFx0aWYgKCFzcmMpIHtcblx0XHRcdHJldHVybiBwbGF5ZXIuc3JjKCk7XG5cdFx0fVxuXG5cdFx0Ly8gT25seSBhZGQgdGhvc2Ugc291cmNlcyB3aGljaCB3ZSBjYW4gKG1heWJlKSBwbGF5XG5cdFx0c3JjID0gc3JjLmZpbHRlcihmdW5jdGlvbihzb3VyY2UpIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHJldHVybiAocGxheWVyLmNhblBsYXlUeXBlKHNvdXJjZS50eXBlKSAhPT0gJycpO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHQvLyBJZiBhIFRlY2ggZG9lc24ndCB5ZXQgaGF2ZSBjYW5QbGF5VHlwZSBqdXN0IGFkZCBpdFxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHQvL1NvcnQgc291cmNlc1xuXHRcdHRoaXMuY3VycmVudFNvdXJjZXMgPSBzcmMuc29ydChjb21wYXJlUmVzb2x1dGlvbnMpO1xuXHRcdHRoaXMuZ3JvdXBlZFNyYyA9IGJ1Y2tldFNvdXJjZXModGhpcy5jdXJyZW50U291cmNlcyk7XG5cdFx0Ly8gUGljayBvbmUgYnkgZGVmYXVsdFxuXHRcdHZhciBjaG9zZW4gPSBjaG9vc2VTcmModGhpcy5ncm91cGVkU3JjLCB0aGlzLmN1cnJlbnRTb3VyY2VzKTtcblx0XHR0aGlzLmN1cnJlbnRSZXNvbHV0aW9uU3RhdGUgPSB7XG5cdFx0XHRsYWJlbDogY2hvc2VuLmxhYmVsLFxuXHRcdFx0c291cmNlczogY2hvc2VuLnNvdXJjZXNcblx0XHR9O1xuXG5cdFx0cGxheWVyLnRyaWdnZXIoJ3VwZGF0ZVNvdXJjZXMnKTtcblx0XHRwbGF5ZXIuc2V0U291cmNlc1Nhbml0aXplZChjaG9zZW4uc291cmNlcywgY2hvc2VuLmxhYmVsKTtcblx0XHRwbGF5ZXIudHJpZ2dlcigncmVzb2x1dGlvbmNoYW5nZScpO1xuXHRcdHJldHVybiBwbGF5ZXI7XG5cdH07XG5cblx0LyoqXG5cdCAqIFJldHVybnMgY3VycmVudCByZXNvbHV0aW9uIG9yIHNldHMgb25lIHdoZW4gbGFiZWwgaXMgc3BlY2lmaWVkXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSAgIFtsYWJlbF0gICAgICAgICBsYWJlbCBuYW1lXG5cdCAqIEBwYXJhbSB7RnVuY3Rpb259IFtjdXN0b21Tb3VyY2VQaWNrZXJdIGN1c3RvbSBmdW5jdGlvbiB0byBjaG9vc2Ugc291cmNlLiBUYWtlcyAyIGFyZ3VtZW50czogc291cmNlcywgbGFiZWwuIE11c3QgcmV0dXJuIHBsYXllciBvYmplY3QuXG5cdCAqIEByZXR1cm5zIHtPYmplY3R9ICAgY3VycmVudCByZXNvbHV0aW9uIG9iamVjdCB7bGFiZWw6ICcnLCBzb3VyY2VzOiBbXX0gaWYgdXNlZCBhcyBnZXR0ZXIgb3IgcGxheWVyIG9iamVjdCBpZiB1c2VkIGFzIHNldHRlclxuXHQgKi9cblx0cGxheWVyLmN1cnJlbnRSZXNvbHV0aW9uID0gZnVuY3Rpb24obGFiZWwsIGN1c3RvbVNvdXJjZVBpY2tlcikge1xuXHRcdGlmIChsYWJlbCA9PSBudWxsKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5jdXJyZW50UmVzb2x1dGlvblN0YXRlO1xuXHRcdH1cblxuXHRcdC8vIExvb2t1cCBzb3VyY2VzIGZvciBsYWJlbFxuXHRcdGlmICghdGhpcy5ncm91cGVkU3JjIHx8ICF0aGlzLmdyb3VwZWRTcmMubGFiZWwgfHwgIXRoaXMuZ3JvdXBlZFNyYy5sYWJlbFtsYWJlbF0pIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dmFyIHNvdXJjZXMgPSB0aGlzLmdyb3VwZWRTcmMubGFiZWxbbGFiZWxdO1xuXHRcdC8vIFJlbWVtYmVyIHBsYXllciBzdGF0ZVxuXHRcdHZhciBjdXJyZW50VGltZSA9IHBsYXllci5jdXJyZW50VGltZSgpO1xuXHRcdHZhciBpc1BhdXNlZCA9IHBsYXllci5wYXVzZWQoKTtcblxuXHRcdC8vIEhpZGUgYmlnUGxheUJ1dHRvblxuXHRcdGlmICghaXNQYXVzZWQgJiYgdGhpcy5wbGF5ZXJfLm9wdGlvbnNfLmJpZ1BsYXlCdXR0b24pIHtcblx0XHRcdHRoaXMucGxheWVyXy5iaWdQbGF5QnV0dG9uLmhpZGUoKTtcblx0XHR9XG5cblx0XHQvLyBDaGFuZ2UgcGxheWVyIHNvdXJjZSBhbmQgd2FpdCBmb3IgbG9hZGVkZGF0YSBldmVudCwgdGhlbiBwbGF5IHZpZGVvXG5cdFx0Ly8gbG9hZGVkbWV0YWRhdGEgZG9lc24ndCB3b3JrIHJpZ2h0IG5vdyBmb3IgZmxhc2guXG5cdFx0Ly8gUHJvYmFibHkgYmVjYXVzZSBvZiBodHRwczovL2dpdGh1Yi5jb20vdmlkZW9qcy92aWRlby1qcy1zd2YvaXNzdWVzLzEyNFxuXHRcdC8vIElmIHBsYXllciBwcmVsb2FkIGlzICdub25lJyBhbmQgdGhlbiBsb2FkZWRkYXRhIG5vdCBmaXJlZC4gU28sIHdlIG5lZWQgdGltZXVwZGF0ZSBldmVudCBmb3Igc2VlayBoYW5kbGUgKHRpbWV1cGRhdGUgZG9lc24ndCB3b3JrIHByb3Blcmx5IHdpdGggZmxhc2gpXG5cdFx0dmFyIGhhbmRsZVNlZWtFdmVudCA9ICdsb2FkZWRkYXRhJztcblx0XHRpZiAodGhpcy5wbGF5ZXJfLnRlY2hOYW1lXyAhPT0gJ1lvdXR1YmUnICYmIHRoaXMucGxheWVyXy5wcmVsb2FkKCkgPT09ICdub25lJyAmJiB0aGlzLnBsYXllcl8udGVjaE5hbWVfICE9PSAnRmxhc2gnKSB7XG5cdFx0XHRoYW5kbGVTZWVrRXZlbnQgPSAndGltZXVwZGF0ZSc7XG5cdFx0fVxuXHRcdHBsYXllclxuXHRcdFx0LnNldFNvdXJjZXNTYW5pdGl6ZWQoc291cmNlcywgbGFiZWwsIGN1c3RvbVNvdXJjZVBpY2tlciB8fCBzZXR0aW5ncy5jdXN0b21Tb3VyY2VQaWNrZXIpXG5cdFx0XHQub25lKGhhbmRsZVNlZWtFdmVudCwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHBsYXllci5jdXJyZW50VGltZShjdXJyZW50VGltZSk7XG5cdFx0XHRcdHBsYXllci5oYW5kbGVUZWNoU2Vla2VkXygpO1xuXHRcdFx0XHRpZiAoIWlzUGF1c2VkKSB7XG5cdFx0XHRcdFx0Ly8gU3RhcnQgcGxheWluZyBhbmQgaGlkZSBsb2FkaW5nU3Bpbm5lciAoZmxhc2ggaXNzdWUgPylcblx0XHRcdFx0XHRwbGF5ZXIucGxheSgpLmhhbmRsZVRlY2hTZWVrZWRfKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cGxheWVyLnRyaWdnZXIoJ3Jlc29sdXRpb25jaGFuZ2UnKTtcblx0XHRcdH0pO1xuXHRcdHJldHVybiBwbGF5ZXI7XG5cdH07XG5cblx0LyoqXG5cdCAqIFJldHVybnMgZ3JvdXBlZCBzb3VyY2VzIGJ5IGxhYmVsLCByZXNvbHV0aW9uIGFuZCB0eXBlXG5cdCAqIEByZXR1cm5zIHtPYmplY3R9IGdyb3VwZWQgc291cmNlczogeyBsYWJlbDogeyBrZXk6IFtdIH0sIHJlczogeyBrZXk6IFtdIH0sIHR5cGU6IHsga2V5OiBbXSB9IH1cblx0ICovXG5cdHBsYXllci5nZXRHcm91cGVkU3JjID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuZ3JvdXBlZFNyYztcblx0fTtcblxuXHRwbGF5ZXIuc2V0U291cmNlc1Nhbml0aXplZCA9IGZ1bmN0aW9uKHNvdXJjZXMsIGxhYmVsLCBjdXN0b21Tb3VyY2VQaWNrZXIpIHtcblx0XHR0aGlzLmN1cnJlbnRSZXNvbHV0aW9uU3RhdGUgPSB7XG5cdFx0XHRsYWJlbDogbGFiZWwsXG5cdFx0XHRzb3VyY2VzOiBzb3VyY2VzXG5cdFx0fTtcblx0XHRpZiAodHlwZW9mIGN1c3RvbVNvdXJjZVBpY2tlciA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0cmV0dXJuIGN1c3RvbVNvdXJjZVBpY2tlcihwbGF5ZXIsIHNvdXJjZXMsIGxhYmVsKTtcblx0XHR9XG5cdFx0cGxheWVyLnNyYyhzb3VyY2VzLm1hcChmdW5jdGlvbihzcmMpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHNyYzogc3JjLnNyYyxcblx0XHRcdFx0dHlwZTogc3JjLnR5cGUsXG5cdFx0XHRcdHJlczogc3JjLnJlc1xuXHRcdFx0fTtcblx0XHR9KSk7XG5cdFx0cmV0dXJuIHBsYXllcjtcblx0fTtcblxuXHQvKipcblx0ICogTWV0aG9kIHVzZWQgZm9yIHNvcnRpbmcgbGlzdCBvZiBzb3VyY2VzXG5cdCAqIEBwYXJhbSAgIHtPYmplY3R9IGEgLSBzb3VyY2Ugb2JqZWN0IHdpdGggcmVzIHByb3BlcnR5XG5cdCAqIEBwYXJhbSAgIHtPYmplY3R9IGIgLSBzb3VyY2Ugb2JqZWN0IHdpdGggcmVzIHByb3BlcnR5XG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IHJlc3VsdCBvZiBjb21wYXJhdGlvblxuXHQgKi9cblx0ZnVuY3Rpb24gY29tcGFyZVJlc29sdXRpb25zKGEsIGIpIHtcblx0XHRpZiAoIWEucmVzIHx8ICFiLnJlcykge1xuXHRcdFx0cmV0dXJuIDA7XG5cdFx0fVxuXHRcdHJldHVybiAoK2IucmVzKSAtICgrYS5yZXMpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEdyb3VwIHNvdXJjZXMgYnkgbGFiZWwsIHJlc29sdXRpb24gYW5kIHR5cGVcblx0ICogQHBhcmFtICAge0FycmF5fSAgc3JjIEFycmF5IG9mIHNvdXJjZXNcblx0ICogQHJldHVybnMge09iamVjdH0gZ3JvdXBlZCBzb3VyY2VzOiB7IGxhYmVsOiB7IGtleTogW10gfSwgcmVzOiB7IGtleTogW10gfSwgdHlwZTogeyBrZXk6IFtdIH0gfVxuXHQgKi9cblx0ZnVuY3Rpb24gYnVja2V0U291cmNlcyhzcmMpIHtcblx0XHR2YXIgcmVzb2x1dGlvbnMgPSB7XG5cdFx0XHRsYWJlbDoge30sXG5cdFx0XHRyZXM6IHt9LFxuXHRcdFx0dHlwZToge31cblx0XHR9O1xuXHRcdHNyYy5tYXAoZnVuY3Rpb24oc291cmNlKSB7XG5cdFx0XHRpbml0UmVzb2x1dGlvbktleShyZXNvbHV0aW9ucywgJ2xhYmVsJywgc291cmNlKTtcblx0XHRcdGluaXRSZXNvbHV0aW9uS2V5KHJlc29sdXRpb25zLCAncmVzJywgc291cmNlKTtcblx0XHRcdGluaXRSZXNvbHV0aW9uS2V5KHJlc29sdXRpb25zLCAndHlwZScsIHNvdXJjZSk7XG5cblx0XHRcdGFwcGVuZFNvdXJjZVRvS2V5KHJlc29sdXRpb25zLCAnbGFiZWwnLCBzb3VyY2UpO1xuXHRcdFx0YXBwZW5kU291cmNlVG9LZXkocmVzb2x1dGlvbnMsICdyZXMnLCBzb3VyY2UpO1xuXHRcdFx0YXBwZW5kU291cmNlVG9LZXkocmVzb2x1dGlvbnMsICd0eXBlJywgc291cmNlKTtcblx0XHR9KTtcblx0XHRyZXR1cm4gcmVzb2x1dGlvbnM7XG5cdH1cblxuXHRmdW5jdGlvbiBpbml0UmVzb2x1dGlvbktleShyZXNvbHV0aW9ucywga2V5LCBzb3VyY2UpIHtcblx0XHRpZiAocmVzb2x1dGlvbnNba2V5XVtzb3VyY2Vba2V5XV0gPT0gbnVsbCkge1xuXHRcdFx0cmVzb2x1dGlvbnNba2V5XVtzb3VyY2Vba2V5XV0gPSBbXTtcblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiBhcHBlbmRTb3VyY2VUb0tleShyZXNvbHV0aW9ucywga2V5LCBzb3VyY2UpIHtcblx0XHRyZXNvbHV0aW9uc1trZXldW3NvdXJjZVtrZXldXS5wdXNoKHNvdXJjZSk7XG5cdH1cblxuXHQvKipcblx0ICogQ2hvb3NlIHNyYyBpZiBvcHRpb24uZGVmYXVsdCBpcyBzcGVjaWZpZWRcblx0ICogQHBhcmFtICAge09iamVjdH0gZ3JvdXBlZFNyYyB7cmVzOiB7IGtleTogW10gfX1cblx0ICogQHBhcmFtICAge0FycmF5fSAgc3JjIEFycmF5IG9mIHNvdXJjZXMgc29ydGVkIGJ5IHJlc29sdXRpb24gdXNlZCB0byBmaW5kIGhpZ2ggYW5kIGxvdyByZXNcblx0ICogQHJldHVybnMge09iamVjdH0ge3Jlczogc3RyaW5nLCBzb3VyY2VzOiBbXX1cblx0ICovXG5cdGZ1bmN0aW9uIGNob29zZVNyYyhncm91cGVkU3JjLCBzcmMpIHtcblx0XHR2YXIgc2VsZWN0ZWRSZXMgPSBzZXR0aW5nc1snZGVmYXVsdCddOyAvLyB1c2UgYXJyYXkgYWNjZXNzIGFzIGRlZmF1bHQgaXMgYSByZXNlcnZlZCBrZXl3b3JkXG5cdFx0dmFyIHNlbGVjdGVkTGFiZWwgPSAnJztcblx0XHRpZiAoc2VsZWN0ZWRSZXMgPT09ICdoaWdoJykge1xuXHRcdFx0c2VsZWN0ZWRSZXMgPSBzcmNbMF0ucmVzO1xuXHRcdFx0c2VsZWN0ZWRMYWJlbCA9IHNyY1swXS5sYWJlbDtcblx0XHR9IGVsc2UgaWYgKHNlbGVjdGVkUmVzID09PSAnbG93JyB8fCBzZWxlY3RlZFJlcyA9PSBudWxsIHx8ICFncm91cGVkU3JjLnJlc1tzZWxlY3RlZFJlc10pIHtcblx0XHRcdC8vIFNlbGVjdCBsb3ctcmVzIGlmIGRlZmF1bHQgaXMgbG93IG9yIG5vdCBzZXRcblx0XHRcdHNlbGVjdGVkUmVzID0gc3JjW3NyYy5sZW5ndGggLSAxXS5yZXM7XG5cdFx0XHRzZWxlY3RlZExhYmVsID0gc3JjW3NyYy5sZW5ndGggLSAxXS5sYWJlbDtcblx0XHR9IGVsc2UgaWYgKGdyb3VwZWRTcmMucmVzW3NlbGVjdGVkUmVzXSkge1xuXHRcdFx0c2VsZWN0ZWRMYWJlbCA9IGdyb3VwZWRTcmMucmVzW3NlbGVjdGVkUmVzXVswXS5sYWJlbDtcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzOiBzZWxlY3RlZFJlcyxcblx0XHRcdGxhYmVsOiBzZWxlY3RlZExhYmVsLFxuXHRcdFx0c291cmNlczogZ3JvdXBlZFNyYy5yZXNbc2VsZWN0ZWRSZXNdXG5cdFx0fTtcblx0fVxuXG5cdGZ1bmN0aW9uIGluaXRSZXNvbHV0aW9uRm9yWXQocGxheWVyKSB7XG5cdFx0Ly8gTWFwIHlvdXR1YmUgcXVhbGl0aWVzIG5hbWVzXG5cdFx0dmFyIF95dHMgPSB7XG5cdFx0XHRoaWdocmVzOiB7XG5cdFx0XHRcdHJlczogMTA4MCxcblx0XHRcdFx0bGFiZWw6ICcxMDgwJyxcblx0XHRcdFx0eXQ6ICdoaWdocmVzJ1xuXHRcdFx0fSxcblx0XHRcdGhkMTA4MDoge1xuXHRcdFx0XHRyZXM6IDEwODAsXG5cdFx0XHRcdGxhYmVsOiAnMTA4MCcsXG5cdFx0XHRcdHl0OiAnaGQxMDgwJ1xuXHRcdFx0fSxcblx0XHRcdGhkNzIwOiB7XG5cdFx0XHRcdHJlczogNzIwLFxuXHRcdFx0XHRsYWJlbDogJzcyMCcsXG5cdFx0XHRcdHl0OiAnaGQ3MjAnXG5cdFx0XHR9LFxuXHRcdFx0bGFyZ2U6IHtcblx0XHRcdFx0cmVzOiA0ODAsXG5cdFx0XHRcdGxhYmVsOiAnNDgwJyxcblx0XHRcdFx0eXQ6ICdsYXJnZSdcblx0XHRcdH0sXG5cdFx0XHRtZWRpdW06IHtcblx0XHRcdFx0cmVzOiAzNjAsXG5cdFx0XHRcdGxhYmVsOiAnMzYwJyxcblx0XHRcdFx0eXQ6ICdtZWRpdW0nXG5cdFx0XHR9LFxuXHRcdFx0c21hbGw6IHtcblx0XHRcdFx0cmVzOiAyNDAsXG5cdFx0XHRcdGxhYmVsOiAnMjQwJyxcblx0XHRcdFx0eXQ6ICdzbWFsbCdcblx0XHRcdH0sXG5cdFx0XHR0aW55OiB7XG5cdFx0XHRcdHJlczogMTQ0LFxuXHRcdFx0XHRsYWJlbDogJzE0NCcsXG5cdFx0XHRcdHl0OiAndGlueSdcblx0XHRcdH0sXG5cdFx0XHRhdXRvOiB7XG5cdFx0XHRcdHJlczogMCxcblx0XHRcdFx0bGFiZWw6ICdhdXRvJyxcblx0XHRcdFx0eXQ6ICdhdXRvJ1xuXHRcdFx0fVxuXHRcdH07XG5cdFx0Ly8gT3ZlcndyaXRlIGRlZmF1bHQgc291cmNlUGlja2VyIGZ1bmN0aW9uXG5cdFx0dmFyIF9jdXN0b21Tb3VyY2VQaWNrZXIgPSBmdW5jdGlvbihfcGxheWVyLCBfc291cmNlcywgX2xhYmVsKSB7XG5cdFx0XHQvLyBOb3RlIHRoYXQgc2V0UGxheWViYWNrUXVhbGl0eSBpcyBhIHN1Z2dlc3Rpb24uIFlUIGRvZXMgbm90IGFsd2F5cyBvYmV5IGl0LlxuXHRcdFx0cGxheWVyLnRlY2hfLnl0UGxheWVyLnNldFBsYXliYWNrUXVhbGl0eShfc291cmNlc1swXS5feXQpO1xuXHRcdFx0cGxheWVyLnRyaWdnZXIoJ3VwZGF0ZVNvdXJjZXMnKTtcblx0XHRcdHJldHVybiBwbGF5ZXI7XG5cdFx0fTtcblx0XHRzZXR0aW5ncy5jdXN0b21Tb3VyY2VQaWNrZXIgPSBfY3VzdG9tU291cmNlUGlja2VyO1xuXG5cdFx0Ly8gSW5pdCByZXNvbHV0aW9uXG5cdFx0cGxheWVyLnRlY2hfLnl0UGxheWVyLnNldFBsYXliYWNrUXVhbGl0eSgnYXV0bycpO1xuXG5cdFx0Ly8gVGhpcyBpcyB0cmlnZ2VyZWQgd2hlbiB0aGUgcmVzb2x1dGlvbiBhY3R1YWxseSBjaGFuZ2VzXG5cdFx0cGxheWVyLnRlY2hfLnl0UGxheWVyLmFkZEV2ZW50TGlzdGVuZXIoJ29uUGxheWJhY2tRdWFsaXR5Q2hhbmdlJywgZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdGZvciAodmFyIHJlcyBpbiBfeXRzKSB7XG5cdFx0XHRcdGlmIChyZXMueXQgPT09IGV2ZW50LmRhdGEpIHtcblx0XHRcdFx0XHRwbGF5ZXIuY3VycmVudFJlc29sdXRpb24ocmVzLmxhYmVsLCBfY3VzdG9tU291cmNlUGlja2VyKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdC8vIFdlIG11c3Qgd2FpdCBmb3IgcGxheSBldmVudFxuXHRcdHBsYXllci5vbmUoJ3BsYXknLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBxdWFsaXRpZXMgPSBwbGF5ZXIudGVjaF8ueXRQbGF5ZXIuZ2V0QXZhaWxhYmxlUXVhbGl0eUxldmVscygpO1xuXHRcdFx0dmFyIF9zb3VyY2VzID0gW107XG5cblx0XHRcdHF1YWxpdGllcy5tYXAoZnVuY3Rpb24ocSkge1xuXHRcdFx0XHRfc291cmNlcy5wdXNoKHtcblx0XHRcdFx0XHRzcmM6IHBsYXllci5zcmMoKS5zcmMsXG5cdFx0XHRcdFx0dHlwZTogcGxheWVyLnNyYygpLnR5cGUsXG5cdFx0XHRcdFx0bGFiZWw6IF95dHNbcV0ubGFiZWwsXG5cdFx0XHRcdFx0cmVzOiBfeXRzW3FdLnJlcyxcblx0XHRcdFx0XHRfeXQ6IF95dHNbcV0ueXRcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0cGxheWVyLmdyb3VwZWRTcmMgPSBidWNrZXRTb3VyY2VzKF9zb3VyY2VzKTtcblx0XHRcdHZhciBjaG9zZW4gPSB7XG5cdFx0XHRcdGxhYmVsOiAnYXV0bycsXG5cdFx0XHRcdHJlczogMCxcblx0XHRcdFx0c291cmNlczogcGxheWVyLmdyb3VwZWRTcmMubGFiZWwuYXV0b1xuXHRcdFx0fTtcblxuXHRcdFx0dGhpcy5jdXJyZW50UmVzb2x1dGlvblN0YXRlID0ge1xuXHRcdFx0XHRsYWJlbDogY2hvc2VuLmxhYmVsLFxuXHRcdFx0XHRzb3VyY2VzOiBjaG9zZW4uc291cmNlc1xuXHRcdFx0fTtcblxuXHRcdFx0cGxheWVyLnRyaWdnZXIoJ3VwZGF0ZVNvdXJjZXMnKTtcblx0XHRcdHBsYXllci5zZXRTb3VyY2VzU2FuaXRpemVkKGNob3Nlbi5zb3VyY2VzLCBjaG9zZW4ubGFiZWwsIF9jdXN0b21Tb3VyY2VQaWNrZXIpO1xuXHRcdH0pO1xuXHR9XG5cblx0cGxheWVyLnJlYWR5KGZ1bmN0aW9uKCkge1xuXHRcdGlmIChzZXR0aW5ncy51aSkge1xuXHRcdFx0dmFyIG1lbnVCdXR0b24gPSBuZXcgUmVzb2x1dGlvbk1lbnVCdXR0b24ocGxheWVyLCBzZXR0aW5ncyk7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5yZXNvbHV0aW9uU3dpdGNoZXIgPSBwbGF5ZXIuY29udHJvbEJhci5lbF8uaW5zZXJ0QmVmb3JlKG1lbnVCdXR0b24uZWxfLCBwbGF5ZXIuY29udHJvbEJhci5nZXRDaGlsZCgnZnVsbHNjcmVlblRvZ2dsZScpLmVsXyk7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5yZXNvbHV0aW9uU3dpdGNoZXIuZGlzcG9zZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR0aGlzLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcyk7XG5cdFx0XHR9O1xuXHRcdH1cblx0XHRpZiAocGxheWVyLm9wdGlvbnNfLnNvdXJjZXMubGVuZ3RoID4gMSkge1xuXHRcdFx0Ly8gdGVjaDogSHRtbDUgYW5kIEZsYXNoXG5cdFx0XHQvLyBDcmVhdGUgcmVzb2x1dGlvbiBzd2l0Y2hlciBmb3IgdmlkZW9zIGZvcm0gPHNvdXJjZT4gdGFnIGluc2lkZSA8dmlkZW8+XG5cdFx0XHRwbGF5ZXIudXBkYXRlU3JjKHBsYXllci5vcHRpb25zXy5zb3VyY2VzKTtcblx0XHR9XG5cblx0XHRpZiAocGxheWVyLnRlY2hOYW1lXyA9PT0gJ1lvdXR1YmUnKSB7XG5cdFx0XHQvLyB0ZWNoOiBZb3VUdWJlXG5cdFx0XHRpbml0UmVzb2x1dGlvbkZvcll0KHBsYXllcik7XG5cdFx0fVxuXHR9KTtcblxufTtcbi8vIOemgeeUqOa7muWKqOadoeaLluWKqFxuY29uc3QgZGlzYWJsZVByb2dyZXNzID0gZnVuY3Rpb24ob3B0aW9ucykge1xuXHR2YXJcblx0LyoqXG5cdCAqIENvcGllcyBwcm9wZXJ0aWVzIGZyb20gb25lIG9yIG1vcmUgb2JqZWN0cyBvbnRvIGFuIG9yaWdpbmFsLlxuXHQgKi9cblx0XHRleHRlbmQgPSBmdW5jdGlvbihvYmogLyosIGFyZzEsIGFyZzIsIC4uLiAqLyApIHtcblx0XHRcdHZhciBhcmcsIGksIGs7XG5cdFx0XHRmb3IgKGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGFyZyA9IGFyZ3VtZW50c1tpXTtcblx0XHRcdFx0Zm9yIChrIGluIGFyZykge1xuXHRcdFx0XHRcdGlmIChhcmcuaGFzT3duUHJvcGVydHkoaykpIHtcblx0XHRcdFx0XHRcdG9ialtrXSA9IGFyZ1trXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBvYmo7XG5cdFx0fSxcblxuXHRcdC8vIGRlZmluZSBzb21lIHJlYXNvbmFibGUgZGVmYXVsdHMgZm9yIHRoaXMgc3dlZXQgcGx1Z2luXG5cdFx0ZGVmYXVsdHMgPSB7XG5cdFx0XHRhdXRvRGlzYWJsZTogZmFsc2Vcblx0XHR9O1xuXG5cblx0dmFyXG5cdC8vIHNhdmUgYSByZWZlcmVuY2UgdG8gdGhlIHBsYXllciBpbnN0YW5jZVxuXHRcdHBsYXllciA9IHRoaXMsXG5cdFx0c3RhdGUgPSBmYWxzZSxcblxuXHRcdC8vIG1lcmdlIG9wdGlvbnMgYW5kIGRlZmF1bHRzXG5cdFx0c2V0dGluZ3MgPSBleHRlbmQoe30sIGRlZmF1bHRzLCBvcHRpb25zIHx8IHt9KTtcblxuXHQvLyBkaXNhYmxlIC8gZW5hYmxlIG1ldGhvZHNcblx0cGxheWVyLmRpc2FibGVQcm9ncmVzcyA9IHtcblx0XHRkaXNhYmxlOiBmdW5jdGlvbigpIHtcblx0XHRcdHN0YXRlID0gdHJ1ZTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9mZihcIm1vdXNlZG93blwiKTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9mZihcInRvdWNoc3RhcnRcIik7XG5cdFx0XHRwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5vZmYoXCJjbGlja1wiKTtcblx0XHR9LFxuXHRcdGVuYWJsZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRzdGF0ZSA9IGZhbHNlO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub24oXCJtb3VzZWRvd25cIiwgcGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIuaGFuZGxlTW91c2VEb3duKTtcblx0XHRcdHBsYXllci5jb250cm9sQmFyLnByb2dyZXNzQ29udHJvbC5zZWVrQmFyLm9uKFwidG91Y2hzdGFydFwiLCBwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5oYW5kbGVNb3VzZURvd24pO1xuXHRcdFx0cGxheWVyLmNvbnRyb2xCYXIucHJvZ3Jlc3NDb250cm9sLnNlZWtCYXIub24oXCJjbGlja1wiLCBwbGF5ZXIuY29udHJvbEJhci5wcm9ncmVzc0NvbnRyb2wuc2Vla0Jhci5oYW5kbGVDbGljayk7XG5cdFx0fSxcblx0XHRnZXRTdGF0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gc3RhdGU7XG5cdFx0fVxuXHR9O1xuXG5cdGlmIChzZXR0aW5ncy5hdXRvRGlzYWJsZSkge1xuXHRcdHBsYXllci5kaXNhYmxlUHJvZ3Jlc3MuZGlzYWJsZSgpO1xuXHR9XG59O1xuLy8gUmVnaXN0ZXIgdGhlIHBsdWdpbiB3aXRoIHZpZGVvLmpzLlxudmlkZW9qcy5wbHVnaW4oJ29wZW4nLCBvcGVuKTtcbnZpZGVvanMucGx1Z2luKCd2aWRlb0pzUmVzb2x1dGlvblN3aXRjaGVyJywgdmlkZW9Kc1Jlc29sdXRpb25Td2l0Y2hlcik7XG52aWRlb2pzLnBsdWdpbignZGlzYWJsZVByb2dyZXNzJywgZGlzYWJsZVByb2dyZXNzKTtcblxuLy8gSW5jbHVkZSB0aGUgdmVyc2lvbiBudW1iZXIuXG5vcGVuLlZFUlNJT04gPSAnX19WRVJTSU9OX18nO1xuXG5leHBvcnQgZGVmYXVsdCBvcGVuOyIsImltcG9ydCBkb2N1bWVudCBmcm9tICdnbG9iYWwvZG9jdW1lbnQnO1xuXG5pbXBvcnQgUVVuaXQgZnJvbSAncXVuaXQnO1xuaW1wb3J0IHNpbm9uIGZyb20gJ3Npbm9uJztcbmltcG9ydCB2aWRlb2pzIGZyb20gJ3ZpZGVvLmpzJztcblxuaW1wb3J0IHBsdWdpbiBmcm9tICcuLi9zcmMvcGx1Z2luJztcblxuY29uc3QgUGxheWVyID0gdmlkZW9qcy5nZXRDb21wb25lbnQoJ1BsYXllcicpO1xuXG5RVW5pdC50ZXN0KCd0aGUgZW52aXJvbm1lbnQgaXMgc2FuZScsIGZ1bmN0aW9uKGFzc2VydCkge1xuICBhc3NlcnQuc3RyaWN0RXF1YWwodHlwZW9mIEFycmF5LmlzQXJyYXksICdmdW5jdGlvbicsICdlczUgZXhpc3RzJyk7XG4gIGFzc2VydC5zdHJpY3RFcXVhbCh0eXBlb2Ygc2lub24sICdvYmplY3QnLCAnc2lub24gZXhpc3RzJyk7XG4gIGFzc2VydC5zdHJpY3RFcXVhbCh0eXBlb2YgdmlkZW9qcywgJ2Z1bmN0aW9uJywgJ3ZpZGVvanMgZXhpc3RzJyk7XG4gIGFzc2VydC5zdHJpY3RFcXVhbCh0eXBlb2YgcGx1Z2luLCAnZnVuY3Rpb24nLCAncGx1Z2luIGlzIGEgZnVuY3Rpb24nKTtcbn0pO1xuXG5RVW5pdC5tb2R1bGUoJ3ZpZGVvanMtb3BlbicsIHtcblxuICBiZWZvcmVFYWNoKCkge1xuXG4gICAgLy8gTW9jayB0aGUgZW52aXJvbm1lbnQncyB0aW1lcnMgYmVjYXVzZSBjZXJ0YWluIHRoaW5ncyAtIHBhcnRpY3VsYXJseVxuICAgIC8vIHBsYXllciByZWFkaW5lc3MgLSBhcmUgYXN5bmNocm9ub3VzIGluIHZpZGVvLmpzIDUuIFRoaXMgTVVTVCBjb21lXG4gICAgLy8gYmVmb3JlIGFueSBwbGF5ZXIgaXMgY3JlYXRlZDsgb3RoZXJ3aXNlLCB0aW1lcnMgY291bGQgZ2V0IGNyZWF0ZWRcbiAgICAvLyB3aXRoIHRoZSBhY3R1YWwgdGltZXIgbWV0aG9kcyFcbiAgICB0aGlzLmNsb2NrID0gc2lub24udXNlRmFrZVRpbWVycygpO1xuXG4gICAgdGhpcy5maXh0dXJlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3F1bml0LWZpeHR1cmUnKTtcbiAgICB0aGlzLnZpZGVvID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndmlkZW8nKTtcbiAgICB0aGlzLmZpeHR1cmUuYXBwZW5kQ2hpbGQodGhpcy52aWRlbyk7XG4gICAgdGhpcy5wbGF5ZXIgPSB2aWRlb2pzKHRoaXMudmlkZW8pO1xuICB9LFxuXG4gIGFmdGVyRWFjaCgpIHtcbiAgICB0aGlzLnBsYXllci5kaXNwb3NlKCk7XG4gICAgdGhpcy5jbG9jay5yZXN0b3JlKCk7XG4gIH1cbn0pO1xuXG5RVW5pdC50ZXN0KCdyZWdpc3RlcnMgaXRzZWxmIHdpdGggdmlkZW8uanMnLCBmdW5jdGlvbihhc3NlcnQpIHtcbiAgYXNzZXJ0LmV4cGVjdCgyKTtcblxuICBhc3NlcnQuc3RyaWN0RXF1YWwoXG4gICAgUGxheWVyLnByb3RvdHlwZS5vcGVuLFxuICAgIHBsdWdpbixcbiAgICAndmlkZW9qcy1vcGVuIHBsdWdpbiB3YXMgcmVnaXN0ZXJlZCdcbiAgKTtcblxuICB0aGlzLnBsYXllci5vcGVuKCk7XG5cbiAgLy8gVGljayB0aGUgY2xvY2sgZm9yd2FyZCBlbm91Z2ggdG8gdHJpZ2dlciB0aGUgcGxheWVyIHRvIGJlIFwicmVhZHlcIi5cbiAgdGhpcy5jbG9jay50aWNrKDEpO1xuXG4gIGFzc2VydC5vayhcbiAgICB0aGlzLnBsYXllci5oYXNDbGFzcygndmpzLW9wZW4nKSxcbiAgICAndGhlIHBsdWdpbiBhZGRzIGEgY2xhc3MgdG8gdGhlIHBsYXllcidcbiAgKTtcbn0pO1xuIl19

# videojs-open

plugin for open

## Table of Contents

<!-- START doctoc -->
<!-- END doctoc -->
## Installation

```sh
npm install --save videojs-open
```

The npm installation is preferred, but Bower works, too.

```sh
bower install  --save videojs-open
```

## Usage

To include videojs-open and jQuery library on your website or web application, use any of the following methods.

### `<script>` Tag

This is the simplest case. Get the script in whatever way you prefer and include the plugin _after_ you include [video.js][videojs], so that the `videojs` global is available.

```html
<script src="//path/to/jquery.min.js"></script>
<script src="//path/to/video.min.js"></script>
<script src="//path/to/videojs-open.min.js"></script>
<script>
  var player = videojs('my-video');

  player.open();
</script>
```

### Browserify

When using with Browserify, install videojs-open via npm and `require` the plugin as you would any other module.

```js
var videojs = require('video.js');

// The actual plugin function is exported by this module, but it is also
// attached to the `Player.prototype`; so, there is no need to assign it
// to a variable.
require('videojs-open');

var player = videojs('my-video');

player.open();
```

### RequireJS/AMD

When using with RequireJS (or another AMD library), get the script in whatever way you prefer and `require` the plugin as you normally would:

```js
require(['video.js', 'videojs-open'], function(videojs) {
  var player = videojs('my-video');

  player.open();
});
```

## License

MIT. Copyright (c) open-liyanan &lt;20137848@qq.com&gt;


[videojs]: http://videojs.com/

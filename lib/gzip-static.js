var mime = require('mime');
var connect = require('connect');
var debug = require('debug')('connect:gzip-static');
var utils = connect.utils;
var fs = require('fs');
var path = require('path');

/*var debug = console.log.bind(console);*/

function setHeaders(res, name) {
  debug('content-type %s', name.mime_type);
  res.setHeader('Content-Type', name.mime_type + (name.charset ? '; charset=' + name.charset : ''));
  res.setHeader('Content-Encoding', 'gzip');
  res.setHeader('Vary', 'Accept-Encoding');
}

var names = {};

module.exports = function(root, options) {
  var static;

  options = options || {};
  static = connect.static(root, options);

  return function gzipStatic(req, res, next) {
    if ('GET' !== req.method && 'HEAD' !== req.method) {
      return next();
    }

    var acceptEncoding = req.headers['accept-encoding'] || '';
    if (! options.force && acceptEncoding.indexOf('gzip') === -1) {
      return static.call(this, req, res, next);
    }

    var name = names[req.url];
    if ( ! name) {
      name = {};
      name.orig = utils.parseUrl(req).pathname;
      name.gz = name.orig + '.gz';
      name.full = path.join(root, name.gz);
      name.mime_type = mime.lookup(name.orig);
      name.charset = mime.charsets.lookup(name.mime_type);

      names[req.url] = name;
    }

    fs.stat(name.full, function(err, stat) {
      var exists = !err && stat.isFile();
      if (exists) {
        req.url = name.gz;
        setHeaders(res, name);
      }
      debug('Sending %s', req.url);
      static.call(this, req, res, next);
    });
  };
};

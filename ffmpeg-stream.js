//https://github.com/phaux/node-ffmpeg-stream
var FF_PATH, Ffmpeg, P, PassThrough, debug, fs, spawn, tmpNameAsync;

P = require('bluebird');

fs = require('fs');

P.promisifyAll(fs);

PassThrough = require('stream').PassThrough;

spawn = require('child_process').spawn;

debug = () => {};//require('debug')('ffmpeg-stream');

tmpNameAsync = P.promisify(require('tmp').tmpName);

FF_PATH = process.env.FFMPEG_PATH || 'ffmpeg';

module.exports = Ffmpeg = (function() {
  function Ffmpeg(opts) {
    if (!(this instanceof Ffmpeg)) {
      return new Ffmpeg(opts);
    }
    this.opts = opts instanceof Object ? opts : {};
    this.proc = null;
    this.started = false;
    this.killed = false;
    this.io = [];
  }

  Ffmpeg.prototype.addio = function(type, file, opts) {
    var mode, ref, stream;
    if (file instanceof Object) {
      ref = {
        file: null,
        opts: file
      }, file = ref.file, opts = ref.opts;
    }
    if (!(opts instanceof Object)) {
      opts = {};
    }
    mode = (function() {
      switch (false) {
        case !file:
          return 'file';
        case !(!file && opts.buffer):
          return 'buffer';
        default:
          return 'stdio';
      }
    })();
    if (mode !== 'file') {
      stream = new PassThrough;
    }
    delete opts.buffer;
    this.io.push({
      type: type,
      mode: mode,
      file: file,
      opts: opts,
      stream: stream
    });
    return stream;
  };

  Ffmpeg.prototype.input = function(file, opts) {
    return this.addio('in', file, opts);
  };

  Ffmpeg.prototype.output = function(file, opts) {
    return this.addio('out', file, opts);
  };

  Ffmpeg.prototype.kill = function() {
    this.killed = true;
    if (this.proc) {
      return this.proc.kill('SIGKILL');
    }
  };

  Ffmpeg.prototype.run = function() {
    if (this.started) {
      return P.reject(new Error("Already started"));
    }
    this.started = true;
    this.cmd = [];
    this.stdio = ['ignore', 'ignore', 'pipe'];
    return P.resolve().then((function(_this) {
      return function() {
        var p;
        p = _this.io.filter(function(io) {
          return io.mode === 'buffer';
        }).map(function(io) {
          return tmpNameAsync({
            prefix: 'ffmpeg-'
          }).then(function(name) {
            return io.tmpfile = name;
          });
        });
        return P.all(p);
      };
    })(this)).then((function(_this) {
      return function() {
        var fd;
        fd = 3;
        return _this.io.filter(function(io) {
          return io.mode === 'stdio';
        }).forEach(function(io) {
          io.fd = fd++;
          return _this.stdio.push('pipe');
        });
      };
    })(this)).then((function(_this) {
      return function() {
        var mkcmd;
        mkcmd = function(type) {
          return function(io) {
            var o, ref, v;
            ref = io.opts;
            for (o in ref) {
              v = ref[o];
              if (v !== false) {
                _this.cmd.push("-" + o);
                if (v !== true) {
                  _this.cmd.push(v);
                }
              }
            }
            if (type === 'in') {
              _this.cmd.push('-i');
            }
            return _this.cmd.push((function() {
              switch (io.mode) {
                case 'file':
                  return io.file;
                case 'buffer':
                  return io.tmpfile;
                case 'stdio':
                  return "pipe:" + io.fd;
              }
            })());
          };
        };
        _this.io.filter(function(io) {
          return io.type === 'in';
        }).forEach(mkcmd('in'));
        return _this.io.filter(function(io) {
          return io.type === 'out';
        }).forEach(mkcmd('out'));
      };
    })(this)).then((function(_this) {
      return function() {
        var p;
        p = _this.io.filter(function(io) {
          return io.type === 'in' && io.mode === 'buffer';
        }).map(function(io) {
          return new P(function(ok, fail) {
            io.stream.pipe(fs.createWriteStream(io.tmpfile));
            io.stream.on('end', function() {
              debug("input buffered stream end");
              return ok();
            });
            return io.stream.on('error', function(err) {
              debug("input buffered stream error: " + err);
              return fail(err);
            });
          });
        });
        return P.all(p);
      };
    })(this)).then((function(_this) {
      return function() {
        return new P(function(ok, fail) {
          _this.last = '';
          _this.log = [];
          _this.section = 0;
          debug("spawn: " + FF_PATH + " " + (_this.cmd.join(' ')));
          _this.proc = spawn(FF_PATH, _this.cmd, {
            stdio: _this.stdio
          });
          if (_this.killed) {
            setTimeout(function() {
              return _this.proc.kill('SIGINT');
            });
          }
          _this.proc.stderr.setEncoding('utf8');
          _this.proc.stderr.on('data', function(data) {
            var buf, lines;
            buf = _this.last += data;
            lines = buf.split(/\r\n|\n|\r/);
            _this.last = lines.pop();
            return lines.forEach(function(line) {
              if (line.match(/^\s*$/)) {
                return;
              }
              if (!line.match(/^ /)) {
                _this.section++;
              }
              if (_this.section >= 2) {
                debug("log: " + line);
                return _this.log.push(line);
              }
            });
          });
          _this.proc.on('error', function(err) {
            debug("error: " + err);
            return fail(err);
          });
          _this.proc.on('exit', function(code, sig) {
            debug("exit: code=" + code + " sig=" + sig);
            if (!code || code === 255) {
              return ok();
            } else {
              _this.log.push(_this.last);
              return fail(new Error("Transcoding failed:\n  " + _this.log.join('\n  ')));
            }
          });
          return _this.io.filter(function(io) {
            return io.mode === 'stdio';
          }).forEach(function(io) {
            _this.proc.stdio[io.fd].on('error', function(err) {
              return debug(io.type + "put stream " + io.fd + " error: " + err);
            });
            _this.proc.stdio[io.fd].on('data', function(data) {
              return debug(io.type + "put stream " + io.fd + " data: " + data.length + " bytes");
            });
            _this.proc.stdio[io.fd].on('finish', function() {
              return debug(io.type + "put stream " + io.fd + " finish");
            });
            switch (io.type) {
              case 'in':
                return io.stream.pipe(_this.proc.stdio[io.fd]);
              case 'out':
                return _this.proc.stdio[io.fd].pipe(io.stream);
            }
          });
        });
      };
    })(this)).then((function(_this) {
      return function() {
        var p;
        p = _this.io.filter(function(io) {
          return io.type === 'out' && io.mode === 'buffer';
        }).map(function(io) {
          return new P(function(ok, fail) {
            var f;
            f = fs.createReadStream(io.tmpfile);
            f.pipe(io.stream);
            f.on('end', function() {
              debug("output buffered stream end");
              return ok();
            });
            return f.on('error', function(err) {
              debug("output buffered stream error: " + err);
              return fail(err);
            });
          });
        });
        return P.all(p);
      };
    })(this)).then((function(_this) {
      return function() {
        var p;
        return p = _this.io.filter(function(io) {
          return io.mode === 'buffer';
        }).map(function(io) {
          return fs.unlinkAsync(io.tmpfile);
        });
      };
    })(this)).then(function() {});
  };

  return Ffmpeg;

})();

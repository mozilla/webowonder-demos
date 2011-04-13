/*  Prototype JavaScript framework, version 1.7_rc2
 *  (c) 2005-2010 Sam Stephenson
 *
 *  Prototype is freely distributable under the terms of an MIT-style license.
 *  For details, see the Prototype web site: http://www.prototypejs.org/
 *
 *--------------------------------------------------------------------------*/

var Prototype = {

  Version: '1.7_rc2',

  Browser: (function(){
    var ua = navigator.userAgent;
    var isOpera = Object.prototype.toString.call(window.opera) == '[object Opera]';
    return {
      IE:             !!window.attachEvent && !isOpera,
      Opera:          isOpera,
      WebKit:         ua.indexOf('AppleWebKit/') > -1,
      Gecko:          ua.indexOf('Gecko') > -1 && ua.indexOf('KHTML') === -1,
      MobileSafari:   /Apple.*Mobile/.test(ua)
    }
  })(),

  BrowserFeatures: {
    XPath: !!document.evaluate,

    SelectorsAPI: !!document.querySelector,

    ElementExtensions: (function() {
      var constructor = window.Element || window.HTMLElement;
      return !!(constructor && constructor.prototype);
    })(),
    SpecificElementExtensions: (function() {
      if (typeof window.HTMLDivElement !== 'undefined')
        return true;

      var div = document.createElement('div'),
          form = document.createElement('form'),
          isSupported = false;

      if (div['__proto__'] && (div['__proto__'] !== form['__proto__'])) {
        isSupported = true;
      }

      div = form = null;

      return isSupported;
    })()
  },

  ScriptFragment: '<script[^>]*>([\\S\\s]*?)<\/script>',
  JSONFilter: /^\/\*-secure-([\s\S]*)\*\/\s*$/,

  emptyFunction: function() { },

  K: function(x) { return x }
};

if (Prototype.Browser.MobileSafari)
  Prototype.BrowserFeatures.SpecificElementExtensions = false;


var Abstract = { };


var Try = {
  these: function() {
    var returnValue;

    for (var i = 0, length = arguments.length; i < length; i++) {
      var lambda = arguments[i];
      try {
        returnValue = lambda();
        break;
      } catch (e) { }
    }

    return returnValue;
  }
};

/* Based on Alex Arnell's inheritance implementation. */

var Class = (function() {

  var IS_DONTENUM_BUGGY = (function(){
    for (var p in { toString: 1 }) {
      if (p === 'toString') return false;
    }
    return true;
  })();

  function subclass() {};
  function create() {
    var parent = null, properties = $A(arguments);
    if (Object.isFunction(properties[0]))
      parent = properties.shift();

    function klass() {
      this.initialize.apply(this, arguments);
    }

    Object.extend(klass, Class.Methods);
    klass.superclass = parent;
    klass.subclasses = [];

    if (parent) {
      subclass.prototype = parent.prototype;
      klass.prototype = new subclass;
      parent.subclasses.push(klass);
    }

    for (var i = 0, length = properties.length; i < length; i++)
      klass.addMethods(properties[i]);

    if (!klass.prototype.initialize)
      klass.prototype.initialize = Prototype.emptyFunction;

    klass.prototype.constructor = klass;
    return klass;
  }

  function addMethods(source) {
    var ancestor   = this.superclass && this.superclass.prototype,
        properties = Object.keys(source);

    if (IS_DONTENUM_BUGGY) {
      if (source.toString != Object.prototype.toString)
        properties.push("toString");
      if (source.valueOf != Object.prototype.valueOf)
        properties.push("valueOf");
    }

    for (var i = 0, length = properties.length; i < length; i++) {
      var property = properties[i], value = source[property];
      if (ancestor && Object.isFunction(value) &&
          value.argumentNames()[0] == "$super") {
        var method = value;
        value = (function(m) {
          return function() { return ancestor[m].apply(this, arguments); };
        })(property).wrap(method);

        value.valueOf = method.valueOf.bind(method);
        value.toString = method.toString.bind(method);
      }
      this.prototype[property] = value;
    }

    return this;
  }

  return {
    create: create,
    Methods: {
      addMethods: addMethods
    }
  };
})();
(function() {

  var _toString = Object.prototype.toString,
      NULL_TYPE = 'Null',
      UNDEFINED_TYPE = 'Undefined',
      BOOLEAN_TYPE = 'Boolean',
      NUMBER_TYPE = 'Number',
      STRING_TYPE = 'String',
      OBJECT_TYPE = 'Object',
      BOOLEAN_CLASS = '[object Boolean]',
      NUMBER_CLASS = '[object Number]',
      STRING_CLASS = '[object String]',
      ARRAY_CLASS = '[object Array]',
      NATIVE_JSON_STRINGIFY_SUPPORT = window.JSON &&
        typeof JSON.stringify === 'function' &&
        JSON.stringify(0) === '0' &&
        typeof JSON.stringify(Prototype.K) === 'undefined';

  function Type(o) {
    switch(o) {
      case null: return NULL_TYPE;
      case (void 0): return UNDEFINED_TYPE;
    }
    var type = typeof o;
    switch(type) {
      case 'boolean': return BOOLEAN_TYPE;
      case 'number':  return NUMBER_TYPE;
      case 'string':  return STRING_TYPE;
    }
    return OBJECT_TYPE;
  }

  function extend(destination, source) {
    for (var property in source)
      destination[property] = source[property];
    return destination;
  }

  function inspect(object) {
    try {
      if (isUndefined(object)) return 'undefined';
      if (object === null) return 'null';
      return object.inspect ? object.inspect() : String(object);
    } catch (e) {
      if (e instanceof RangeError) return '...';
      throw e;
    }
  }

  function toJSON(value) {
    return Str('', { '': value }, []);
  }

  function Str(key, holder, stack) {
    var value = holder[key],
        type = typeof value;

    if (Type(value) === OBJECT_TYPE && typeof value.toJSON === 'function') {
      value = value.toJSON(key);
    }

    var _class = _toString.call(value);

    switch (_class) {
      case NUMBER_CLASS:
      case BOOLEAN_CLASS:
      case STRING_CLASS:
        value = value.valueOf();
    }

    switch (value) {
      case null: return 'null';
      case true: return 'true';
      case false: return 'false';
    }

    type = typeof value;
    switch (type) {
      case 'string':
        return value.inspect(true);
      case 'number':
        return isFinite(value) ? String(value) : 'null';
      case 'object':

        for (var i = 0, length = stack.length; i < length; i++) {
          if (stack[i] === value) { throw new TypeError(); }
        }
        stack.push(value);

        var partial = [];
        if (_class === ARRAY_CLASS) {
          for (var i = 0, length = value.length; i < length; i++) {
            var str = Str(i, value, stack);
            partial.push(typeof str === 'undefined' ? 'null' : str);
          }
          partial = '[' + partial.join(',') + ']';
        } else {
          var keys = Object.keys(value);
          for (var i = 0, length = keys.length; i < length; i++) {
            var key = keys[i], str = Str(key, value, stack);
            if (typeof str !== "undefined") {
               partial.push(key.inspect(true)+ ':' + str);
             }
          }
          partial = '{' + partial.join(',') + '}';
        }
        stack.pop();
        return partial;
    }
  }

  function stringify(object) {
    return JSON.stringify(object);
  }

  function toQueryString(object) {
    return $H(object).toQueryString();
  }

  function toHTML(object) {
    return object && object.toHTML ? object.toHTML() : String.interpret(object);
  }

  function keys(object) {
    if (Type(object) !== OBJECT_TYPE) { throw new TypeError(); }
    var results = [];
    for (var property in object) {
      if (object.hasOwnProperty(property)) {
        results.push(property);
      }
    }
    return results;
  }

  function values(object) {
    var results = [];
    for (var property in object)
      results.push(object[property]);
    return results;
  }

  function clone(object) {
    return extend({ }, object);
  }

  function isElement(object) {
    return !!(object && object.nodeType == 1);
  }

  function isArray(object) {
    return _toString.call(object) === ARRAY_CLASS;
  }

  var hasNativeIsArray = (typeof Array.isArray == 'function')
    && Array.isArray([]) && !Array.isArray({});

  if (hasNativeIsArray) {
    isArray = Array.isArray;
  }

  function isHash(object) {
    return object instanceof Hash;
  }

  function isFunction(object) {
    return typeof object === "function";
  }

  function isString(object) {
    return _toString.call(object) === STRING_CLASS;
  }

  function isNumber(object) {
    return _toString.call(object) === NUMBER_CLASS;
  }

  function isUndefined(object) {
    return typeof object === "undefined";
  }

  extend(Object, {
    extend:        extend,
    inspect:       inspect,
    toJSON:        NATIVE_JSON_STRINGIFY_SUPPORT ? stringify : toJSON,
    toQueryString: toQueryString,
    toHTML:        toHTML,
    keys:          Object.keys || keys,
    values:        values,
    clone:         clone,
    isElement:     isElement,
    isArray:       isArray,
    isHash:        isHash,
    isFunction:    isFunction,
    isString:      isString,
    isNumber:      isNumber,
    isUndefined:   isUndefined
  });
})();
Object.extend(Function.prototype, (function() {
  var slice = Array.prototype.slice;

  function update(array, args) {
    var arrayLength = array.length, length = args.length;
    while (length--) array[arrayLength + length] = args[length];
    return array;
  }

  function merge(array, args) {
    array = slice.call(array, 0);
    return update(array, args);
  }

  function argumentNames() {
    var names = this.toString().match(/^[\s\(]*function[^(]*\(([^)]*)\)/)[1]
      .replace(/\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g, '')
      .replace(/\s+/g, '').split(',');
    return names.length == 1 && !names[0] ? [] : names;
  }

  function bind(context) {
    if (arguments.length < 2 && Object.isUndefined(arguments[0])) return this;
    var __method = this, args = slice.call(arguments, 1);
    return function() {
      var a = merge(args, arguments);
      return __method.apply(context, a);
    }
  }

  function bindAsEventListener(context) {
    var __method = this, args = slice.call(arguments, 1);
    return function(event) {
      var a = update([event || window.event], args);
      return __method.apply(context, a);
    }
  }

  function curry() {
    if (!arguments.length) return this;
    var __method = this, args = slice.call(arguments, 0);
    return function() {
      var a = merge(args, arguments);
      return __method.apply(this, a);
    }
  }

  function delay(timeout) {
    var __method = this, args = slice.call(arguments, 1);
    timeout = timeout * 1000;
    return window.setTimeout(function() {
      return __method.apply(__method, args);
    }, timeout);
  }

  function defer() {
    var args = update([0.01], arguments);
    return this.delay.apply(this, args);
  }

  function wrap(wrapper) {
    var __method = this;
    return function() {
      var a = update([__method.bind(this)], arguments);
      return wrapper.apply(this, a);
    }
  }

  function methodize() {
    if (this._methodized) return this._methodized;
    var __method = this;
    return this._methodized = function() {
      var a = update([this], arguments);
      return __method.apply(null, a);
    };
  }

  return {
    argumentNames:       argumentNames,
    bind:                bind,
    bindAsEventListener: bindAsEventListener,
    curry:               curry,
    delay:               delay,
    defer:               defer,
    wrap:                wrap,
    methodize:           methodize
  }
})());



(function(proto) {


  function toISOString() {
    return this.getUTCFullYear() + '-' +
      (this.getUTCMonth() + 1).toPaddedString(2) + '-' +
      this.getUTCDate().toPaddedString(2) + 'T' +
      this.getUTCHours().toPaddedString(2) + ':' +
      this.getUTCMinutes().toPaddedString(2) + ':' +
      this.getUTCSeconds().toPaddedString(2) + 'Z';
  }


  function toJSON() {
    return this.toISOString();
  }

  if (!proto.toISOString) proto.toISOString = toISOString;
  if (!proto.toJSON) proto.toJSON = toJSON;

})(Date.prototype);


RegExp.prototype.match = RegExp.prototype.test;

RegExp.escape = function(str) {
  return String(str).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
};
var PeriodicalExecuter = Class.create({
  initialize: function(callback, frequency) {
    this.callback = callback;
    this.frequency = frequency;
    this.currentlyExecuting = false;

    this.registerCallback();
  },

  registerCallback: function() {
    this.timer = setInterval(this.onTimerEvent.bind(this), this.frequency * 1000);
  },

  execute: function() {
    this.callback(this);
  },

  stop: function() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  },

  onTimerEvent: function() {
    if (!this.currentlyExecuting) {
      try {
        this.currentlyExecuting = true;
        this.execute();
        this.currentlyExecuting = false;
      } catch(e) {
        this.currentlyExecuting = false;
        throw e;
      }
    }
  }
});
Object.extend(String, {
  interpret: function(value) {
    return value == null ? '' : String(value);
  },
  specialChar: {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    '\\': '\\\\'
  }
});

Object.extend(String.prototype, (function() {
  var NATIVE_JSON_PARSE_SUPPORT = window.JSON &&
    typeof JSON.parse === 'function' &&
    JSON.parse('{"test": true}').test;

  function prepareReplacement(replacement) {
    if (Object.isFunction(replacement)) return replacement;
    var template = new Template(replacement);
    return function(match) { return template.evaluate(match) };
  }

  function gsub(pattern, replacement) {
    var result = '', source = this, match;
    replacement = prepareReplacement(replacement);

    if (Object.isString(pattern))
      pattern = RegExp.escape(pattern);

    if (!(pattern.length || pattern.source)) {
      replacement = replacement('');
      return replacement + source.split('').join(replacement) + replacement;
    }

    while (source.length > 0) {
      if (match = source.match(pattern)) {
        result += source.slice(0, match.index);
        result += String.interpret(replacement(match));
        source  = source.slice(match.index + match[0].length);
      } else {
        result += source, source = '';
      }
    }
    return result;
  }

  function sub(pattern, replacement, count) {
    replacement = prepareReplacement(replacement);
    count = Object.isUndefined(count) ? 1 : count;

    return this.gsub(pattern, function(match) {
      if (--count < 0) return match[0];
      return replacement(match);
    });
  }

  function scan(pattern, iterator) {
    this.gsub(pattern, iterator);
    return String(this);
  }

  function truncate(length, truncation) {
    length = length || 30;
    truncation = Object.isUndefined(truncation) ? '...' : truncation;
    return this.length > length ?
      this.slice(0, length - truncation.length) + truncation : String(this);
  }

  function strip() {
    return this.replace(/^\s+/, '').replace(/\s+$/, '');
  }

  function stripTags() {
    return this.replace(/<\w+(\s+("[^"]*"|'[^']*'|[^>])+)?>|<\/\w+>/gi, '');
  }

  function stripScripts() {
    return this.replace(new RegExp(Prototype.ScriptFragment, 'img'), '');
  }

  function extractScripts() {
    var matchAll = new RegExp(Prototype.ScriptFragment, 'img'),
        matchOne = new RegExp(Prototype.ScriptFragment, 'im');
    return (this.match(matchAll) || []).map(function(scriptTag) {
      return (scriptTag.match(matchOne) || ['', ''])[1];
    });
  }

  function evalScripts() {
    return this.extractScripts().map(function(script) { return eval(script) });
  }

  function escapeHTML() {
    return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function unescapeHTML() {
    return this.stripTags().replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
  }


  function toQueryParams(separator) {
    var match = this.strip().match(/([^?#]*)(#.*)?$/);
    if (!match) return { };

    return match[1].split(separator || '&').inject({ }, function(hash, pair) {
      if ((pair = pair.split('='))[0]) {
        var key = decodeURIComponent(pair.shift()),
            value = pair.length > 1 ? pair.join('=') : pair[0];

        if (value != undefined) value = decodeURIComponent(value);

        if (key in hash) {
          if (!Object.isArray(hash[key])) hash[key] = [hash[key]];
          hash[key].push(value);
        }
        else hash[key] = value;
      }
      return hash;
    });
  }

  function toArray() {
    return this.split('');
  }

  function succ() {
    return this.slice(0, this.length - 1) +
      String.fromCharCode(this.charCodeAt(this.length - 1) + 1);
  }

  function times(count) {
    return count < 1 ? '' : new Array(count + 1).join(this);
  }

  function camelize() {
    return this.replace(/-+(.)?/g, function(match, chr) {
      return chr ? chr.toUpperCase() : '';
    });
  }

  function capitalize() {
    return this.charAt(0).toUpperCase() + this.substring(1).toLowerCase();
  }

  function underscore() {
    return this.replace(/::/g, '/')
               .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
               .replace(/([a-z\d])([A-Z])/g, '$1_$2')
               .replace(/-/g, '_')
               .toLowerCase();
  }

  function dasherize() {
    return this.replace(/_/g, '-');
  }

  function inspect(useDoubleQuotes) {
    var escapedString = this.replace(/[\x00-\x1f\\]/g, function(character) {
      if (character in String.specialChar) {
        return String.specialChar[character];
      }
      return '\\u00' + character.charCodeAt().toPaddedString(2, 16);
    });
    if (useDoubleQuotes) return '"' + escapedString.replace(/"/g, '\\"') + '"';
    return "'" + escapedString.replace(/'/g, '\\\'') + "'";
  }

  function unfilterJSON(filter) {
    return this.replace(filter || Prototype.JSONFilter, '$1');
  }

  function isJSON() {
    var str = this;
    if (str.blank()) return false;
    str = str.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@');
    str = str.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']');
    str = str.replace(/(?:^|:|,)(?:\s*\[)+/g, '');
    return (/^[\],:{}\s]*$/).test(str);
  }

  function evalJSON(sanitize) {
    var json = this.unfilterJSON(),
        cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    if (cx.test(json)) {
      json = json.replace(cx, function (a) {
        return '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
      });
    }
    try {
      if (!sanitize || json.isJSON()) return eval('(' + json + ')');
    } catch (e) { }
    throw new SyntaxError('Badly formed JSON string: ' + this.inspect());
  }

  function parseJSON() {
    var json = this.unfilterJSON();
    return JSON.parse(json);
  }

  function include(pattern) {
    return this.indexOf(pattern) > -1;
  }

  function startsWith(pattern) {
    return this.lastIndexOf(pattern, 0) === 0;
  }

  function endsWith(pattern) {
    var d = this.length - pattern.length;
    return d >= 0 && this.indexOf(pattern, d) === d;
  }

  function empty() {
    return this == '';
  }

  function blank() {
    return /^\s*$/.test(this);
  }

  function interpolate(object, pattern) {
    return new Template(this, pattern).evaluate(object);
  }

  return {
    gsub:           gsub,
    sub:            sub,
    scan:           scan,
    truncate:       truncate,
    strip:          String.prototype.trim || strip,
    stripTags:      stripTags,
    stripScripts:   stripScripts,
    extractScripts: extractScripts,
    evalScripts:    evalScripts,
    escapeHTML:     escapeHTML,
    unescapeHTML:   unescapeHTML,
    toQueryParams:  toQueryParams,
    parseQuery:     toQueryParams,
    toArray:        toArray,
    succ:           succ,
    times:          times,
    camelize:       camelize,
    capitalize:     capitalize,
    underscore:     underscore,
    dasherize:      dasherize,
    inspect:        inspect,
    unfilterJSON:   unfilterJSON,
    isJSON:         isJSON,
    evalJSON:       NATIVE_JSON_PARSE_SUPPORT ? parseJSON : evalJSON,
    include:        include,
    startsWith:     startsWith,
    endsWith:       endsWith,
    empty:          empty,
    blank:          blank,
    interpolate:    interpolate
  };
})());

var Template = Class.create({
  initialize: function(template, pattern) {
    this.template = template.toString();
    this.pattern = pattern || Template.Pattern;
  },

  evaluate: function(object) {
    if (object && Object.isFunction(object.toTemplateReplacements))
      object = object.toTemplateReplacements();

    return this.template.gsub(this.pattern, function(match) {
      if (object == null) return (match[1] + '');

      var before = match[1] || '';
      if (before == '\\') return match[2];

      var ctx = object, expr = match[3],
          pattern = /^([^.[]+|\[((?:.*?[^\\])?)\])(\.|\[|$)/;

      match = pattern.exec(expr);
      if (match == null) return before;

      while (match != null) {
        var comp = match[1].startsWith('[') ? match[2].replace(/\\\\]/g, ']') : match[1];
        ctx = ctx[comp];
        if (null == ctx || '' == match[3]) break;
        expr = expr.substring('[' == match[3] ? match[1].length : match[0].length);
        match = pattern.exec(expr);
      }

      return before + String.interpret(ctx);
    });
  }
});
Template.Pattern = /(^|.|\r|\n)(#\{(.*?)\})/;

var $break = { };

var Enumerable = (function() {
  function each(iterator, context) {
    var index = 0;
    try {
      this._each(function(value) {
        iterator.call(context, value, index++);
      });
    } catch (e) {
      if (e != $break) throw e;
    }
    return this;
  }

  function eachSlice(number, iterator, context) {
    var index = -number, slices = [], array = this.toArray();
    if (number < 1) return array;
    while ((index += number) < array.length)
      slices.push(array.slice(index, index+number));
    return slices.collect(iterator, context);
  }

  function all(iterator, context) {
    iterator = iterator || Prototype.K;
    var result = true;
    this.each(function(value, index) {
      result = result && !!iterator.call(context, value, index);
      if (!result) throw $break;
    });
    return result;
  }

  function any(iterator, context) {
    iterator = iterator || Prototype.K;
    var result = false;
    this.each(function(value, index) {
      if (result = !!iterator.call(context, value, index))
        throw $break;
    });
    return result;
  }

  function collect(iterator, context) {
    iterator = iterator || Prototype.K;
    var results = [];
    this.each(function(value, index) {
      results.push(iterator.call(context, value, index));
    });
    return results;
  }

  function detect(iterator, context) {
    var result;
    this.each(function(value, index) {
      if (iterator.call(context, value, index)) {
        result = value;
        throw $break;
      }
    });
    return result;
  }

  function findAll(iterator, context) {
    var results = [];
    this.each(function(value, index) {
      if (iterator.call(context, value, index))
        results.push(value);
    });
    return results;
  }

  function grep(filter, iterator, context) {
    iterator = iterator || Prototype.K;
    var results = [];

    if (Object.isString(filter))
      filter = new RegExp(RegExp.escape(filter));

    this.each(function(value, index) {
      if (filter.match(value))
        results.push(iterator.call(context, value, index));
    });
    return results;
  }

  function include(object) {
    if (Object.isFunction(this.indexOf))
      if (this.indexOf(object) != -1) return true;

    var found = false;
    this.each(function(value) {
      if (value == object) {
        found = true;
        throw $break;
      }
    });
    return found;
  }

  function inGroupsOf(number, fillWith) {
    fillWith = Object.isUndefined(fillWith) ? null : fillWith;
    return this.eachSlice(number, function(slice) {
      while(slice.length < number) slice.push(fillWith);
      return slice;
    });
  }

  function inject(memo, iterator, context) {
    this.each(function(value, index) {
      memo = iterator.call(context, memo, value, index);
    });
    return memo;
  }

  function invoke(method) {
    var args = $A(arguments).slice(1);
    return this.map(function(value) {
      return value[method].apply(value, args);
    });
  }

  function max(iterator, context) {
    iterator = iterator || Prototype.K;
    var result;
    this.each(function(value, index) {
      value = iterator.call(context, value, index);
      if (result == null || value >= result)
        result = value;
    });
    return result;
  }

  function min(iterator, context) {
    iterator = iterator || Prototype.K;
    var result;
    this.each(function(value, index) {
      value = iterator.call(context, value, index);
      if (result == null || value < result)
        result = value;
    });
    return result;
  }

  function partition(iterator, context) {
    iterator = iterator || Prototype.K;
    var trues = [], falses = [];
    this.each(function(value, index) {
      (iterator.call(context, value, index) ?
        trues : falses).push(value);
    });
    return [trues, falses];
  }

  function pluck(property) {
    var results = [];
    this.each(function(value) {
      results.push(value[property]);
    });
    return results;
  }

  function reject(iterator, context) {
    var results = [];
    this.each(function(value, index) {
      if (!iterator.call(context, value, index))
        results.push(value);
    });
    return results;
  }

  function sortBy(iterator, context) {
    return this.map(function(value, index) {
      return {
        value: value,
        criteria: iterator.call(context, value, index)
      };
    }).sort(function(left, right) {
      var a = left.criteria, b = right.criteria;
      return a < b ? -1 : a > b ? 1 : 0;
    }).pluck('value');
  }

  function toArray() {
    return this.map();
  }

  function zip() {
    var iterator = Prototype.K, args = $A(arguments);
    if (Object.isFunction(args.last()))
      iterator = args.pop();

    var collections = [this].concat(args).map($A);
    return this.map(function(value, index) {
      return iterator(collections.pluck(index));
    });
  }

  function size() {
    return this.toArray().length;
  }

  function inspect() {
    return '#<Enumerable:' + this.toArray().inspect() + '>';
  }









  return {
    each:       each,
    eachSlice:  eachSlice,
    all:        all,
    every:      all,
    any:        any,
    some:       any,
    collect:    collect,
    map:        collect,
    detect:     detect,
    findAll:    findAll,
    select:     findAll,
    filter:     findAll,
    grep:       grep,
    include:    include,
    member:     include,
    inGroupsOf: inGroupsOf,
    inject:     inject,
    invoke:     invoke,
    max:        max,
    min:        min,
    partition:  partition,
    pluck:      pluck,
    reject:     reject,
    sortBy:     sortBy,
    toArray:    toArray,
    entries:    toArray,
    zip:        zip,
    size:       size,
    inspect:    inspect,
    find:       detect
  };
})();

function $A(iterable) {
  if (!iterable) return [];
  if ('toArray' in Object(iterable)) return iterable.toArray();
  var length = iterable.length || 0, results = new Array(length);
  while (length--) results[length] = iterable[length];
  return results;
}


function $w(string) {
  if (!Object.isString(string)) return [];
  string = string.strip();
  return string ? string.split(/\s+/) : [];
}

Array.from = $A;


(function() {
  var arrayProto = Array.prototype,
      slice = arrayProto.slice,
      _each = arrayProto.forEach; // use native browser JS 1.6 implementation if available

  function each(iterator) {
    for (var i = 0, length = this.length; i < length; i++)
      iterator(this[i]);
  }
  if (!_each) _each = each;

  function clear() {
    this.length = 0;
    return this;
  }

  function first() {
    return this[0];
  }

  function last() {
    return this[this.length - 1];
  }

  function compact() {
    return this.select(function(value) {
      return value != null;
    });
  }

  function flatten() {
    return this.inject([], function(array, value) {
      if (Object.isArray(value))
        return array.concat(value.flatten());
      array.push(value);
      return array;
    });
  }

  function without() {
    var values = slice.call(arguments, 0);
    return this.select(function(value) {
      return !values.include(value);
    });
  }

  function reverse(inline) {
    return (inline === false ? this.toArray() : this)._reverse();
  }

  function uniq(sorted) {
    return this.inject([], function(array, value, index) {
      if (0 == index || (sorted ? array.last() != value : !array.include(value)))
        array.push(value);
      return array;
    });
  }

  function intersect(array) {
    return this.uniq().findAll(function(item) {
      return array.detect(function(value) { return item === value });
    });
  }


  function clone() {
    return slice.call(this, 0);
  }

  function size() {
    return this.length;
  }

  function inspect() {
    return '[' + this.map(Object.inspect).join(', ') + ']';
  }

  function indexOf(item, i) {
    i || (i = 0);
    var length = this.length;
    if (i < 0) i = length + i;
    for (; i < length; i++)
      if (this[i] === item) return i;
    return -1;
  }

  function lastIndexOf(item, i) {
    i = isNaN(i) ? this.length : (i < 0 ? this.length + i : i) + 1;
    var n = this.slice(0, i).reverse().indexOf(item);
    return (n < 0) ? n : i - n - 1;
  }

  function concat() {
    var array = slice.call(this, 0), item;
    for (var i = 0, length = arguments.length; i < length; i++) {
      item = arguments[i];
      if (Object.isArray(item) && !('callee' in item)) {
        for (var j = 0, arrayLength = item.length; j < arrayLength; j++)
          array.push(item[j]);
      } else {
        array.push(item);
      }
    }
    return array;
  }

  Object.extend(arrayProto, Enumerable);

  if (!arrayProto._reverse)
    arrayProto._reverse = arrayProto.reverse;

  Object.extend(arrayProto, {
    _each:     _each,
    clear:     clear,
    first:     first,
    last:      last,
    compact:   compact,
    flatten:   flatten,
    without:   without,
    reverse:   reverse,
    uniq:      uniq,
    intersect: intersect,
    clone:     clone,
    toArray:   clone,
    size:      size,
    inspect:   inspect
  });

  var CONCAT_ARGUMENTS_BUGGY = (function() {
    return [].concat(arguments)[0][0] !== 1;
  })(1,2)

  if (CONCAT_ARGUMENTS_BUGGY) arrayProto.concat = concat;

  if (!arrayProto.indexOf) arrayProto.indexOf = indexOf;
  if (!arrayProto.lastIndexOf) arrayProto.lastIndexOf = lastIndexOf;
})();
function $H(object) {
  return new Hash(object);
};

var Hash = Class.create(Enumerable, (function() {
  function initialize(object) {
    this._object = Object.isHash(object) ? object.toObject() : Object.clone(object);
  }


  function _each(iterator) {
    for (var key in this._object) {
      var value = this._object[key], pair = [key, value];
      pair.key = key;
      pair.value = value;
      iterator(pair);
    }
  }

  function set(key, value) {
    return this._object[key] = value;
  }

  function get(key) {
    if (this._object[key] !== Object.prototype[key])
      return this._object[key];
  }

  function unset(key) {
    var value = this._object[key];
    delete this._object[key];
    return value;
  }

  function toObject() {
    return Object.clone(this._object);
  }



  function keys() {
    return this.pluck('key');
  }

  function values() {
    return this.pluck('value');
  }

  function index(value) {
    var match = this.detect(function(pair) {
      return pair.value === value;
    });
    return match && match.key;
  }

  function merge(object) {
    return this.clone().update(object);
  }

  function update(object) {
    return new Hash(object).inject(this, function(result, pair) {
      result.set(pair.key, pair.value);
      return result;
    });
  }

  function toQueryPair(key, value) {
    if (Object.isUndefined(value)) return key;
    return key + '=' + encodeURIComponent(String.interpret(value));
  }

  function toQueryString() {
    return this.inject([], function(results, pair) {
      var key = encodeURIComponent(pair.key), values = pair.value;

      if (values && typeof values == 'object') {
        if (Object.isArray(values))
          return results.concat(values.map(toQueryPair.curry(key)));
      } else results.push(toQueryPair(key, values));
      return results;
    }).join('&');
  }

  function inspect() {
    return '#<Hash:{' + this.map(function(pair) {
      return pair.map(Object.inspect).join(': ');
    }).join(', ') + '}>';
  }

  function clone() {
    return new Hash(this);
  }

  return {
    initialize:             initialize,
    _each:                  _each,
    set:                    set,
    get:                    get,
    unset:                  unset,
    toObject:               toObject,
    toTemplateReplacements: toObject,
    keys:                   keys,
    values:                 values,
    index:                  index,
    merge:                  merge,
    update:                 update,
    toQueryString:          toQueryString,
    inspect:                inspect,
    toJSON:                 toObject,
    clone:                  clone
  };
})());

Hash.from = $H;
Object.extend(Number.prototype, (function() {
  function toColorPart() {
    return this.toPaddedString(2, 16);
  }

  function succ() {
    return this + 1;
  }

  function times(iterator, context) {
    $R(0, this, true).each(iterator, context);
    return this;
  }

  function toPaddedString(length, radix) {
    var string = this.toString(radix || 10);
    return '0'.times(length - string.length) + string;
  }

  function abs() {
    return Math.abs(this);
  }

  function round() {
    return Math.round(this);
  }

  function ceil() {
    return Math.ceil(this);
  }

  function floor() {
    return Math.floor(this);
  }

  return {
    toColorPart:    toColorPart,
    succ:           succ,
    times:          times,
    toPaddedString: toPaddedString,
    abs:            abs,
    round:          round,
    ceil:           ceil,
    floor:          floor
  };
})());

function $R(start, end, exclusive) {
  return new ObjectRange(start, end, exclusive);
}

var ObjectRange = Class.create(Enumerable, (function() {
  function initialize(start, end, exclusive) {
    this.start = start;
    this.end = end;
    this.exclusive = exclusive;
  }

  function _each(iterator) {
    var value = this.start;
    while (this.include(value)) {
      iterator(value);
      value = value.succ();
    }
  }

  function include(value) {
    if (value < this.start)
      return false;
    if (this.exclusive)
      return value < this.end;
    return value <= this.end;
  }

  return {
    initialize: initialize,
    _each:      _each,
    include:    include
  };
})());



var Ajax = {
  getTransport: function() {
    return Try.these(
      function() {return new XMLHttpRequest()},
      function() {return new ActiveXObject('Msxml2.XMLHTTP')},
      function() {return new ActiveXObject('Microsoft.XMLHTTP')}
    ) || false;
  },

  activeRequestCount: 0
};

Ajax.Responders = {
  responders: [],

  _each: function(iterator) {
    this.responders._each(iterator);
  },

  register: function(responder) {
    if (!this.include(responder))
      this.responders.push(responder);
  },

  unregister: function(responder) {
    this.responders = this.responders.without(responder);
  },

  dispatch: function(callback, request, transport, json) {
    this.each(function(responder) {
      if (Object.isFunction(responder[callback])) {
        try {
          responder[callback].apply(responder, [request, transport, json]);
        } catch (e) { }
      }
    });
  }
};

Object.extend(Ajax.Responders, Enumerable);

Ajax.Responders.register({
  onCreate:   function() { Ajax.activeRequestCount++ },
  onComplete: function() { Ajax.activeRequestCount-- }
});
Ajax.Base = Class.create({
  initialize: function(options) {
    this.options = {
      method:       'post',
      asynchronous: true,
      contentType:  'application/x-www-form-urlencoded',
      encoding:     'UTF-8',
      parameters:   '',
      evalJSON:     true,
      evalJS:       true
    };
    Object.extend(this.options, options || { });

    this.options.method = this.options.method.toLowerCase();

    if (Object.isString(this.options.parameters))
      this.options.parameters = this.options.parameters.toQueryParams();
    else if (Object.isHash(this.options.parameters))
      this.options.parameters = this.options.parameters.toObject();
  }
});
Ajax.Request = Class.create(Ajax.Base, {
  _complete: false,

  initialize: function($super, url, options) {
    $super(options);
    this.transport = Ajax.getTransport();
    this.request(url);
  },

  request: function(url) {
    this.url = url;
    this.method = this.options.method;
    var params = Object.clone(this.options.parameters);

    if (!['get', 'post'].include(this.method)) {
      params['_method'] = this.method;
      this.method = 'post';
    }

    this.parameters = params;

    if (params = Object.toQueryString(params)) {
      if (this.method == 'get')
        this.url += (this.url.include('?') ? '&' : '?') + params;
      else if (/Konqueror|Safari|KHTML/.test(navigator.userAgent))
        params += '&_=';
    }

    try {
      var response = new Ajax.Response(this);
      if (this.options.onCreate) this.options.onCreate(response);
      Ajax.Responders.dispatch('onCreate', this, response);

      this.transport.open(this.method.toUpperCase(), this.url,
        this.options.asynchronous);

      if (this.options.asynchronous) this.respondToReadyState.bind(this).defer(1);

      this.transport.onreadystatechange = this.onStateChange.bind(this);
      this.setRequestHeaders();

      this.body = this.method == 'post' ? (this.options.postBody || params) : null;
      this.transport.send(this.body);

      /* Force Firefox to handle ready state 4 for synchronous requests */
      if (!this.options.asynchronous && this.transport.overrideMimeType)
        this.onStateChange();

    }
    catch (e) {
      this.dispatchException(e);
    }
  },

  onStateChange: function() {
    var readyState = this.transport.readyState;
    if (readyState > 1 && !((readyState == 4) && this._complete))
      this.respondToReadyState(this.transport.readyState);
  },

  setRequestHeaders: function() {
    var headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Prototype-Version': Prototype.Version,
      'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
    };

    if (this.method == 'post') {
      headers['Content-type'] = this.options.contentType +
        (this.options.encoding ? '; charset=' + this.options.encoding : '');

      /* Force "Connection: close" for older Mozilla browsers to work
       * around a bug where XMLHttpRequest sends an incorrect
       * Content-length header. See Mozilla Bugzilla #246651.
       */
      if (this.transport.overrideMimeType &&
          (navigator.userAgent.match(/Gecko\/(\d{4})/) || [0,2005])[1] < 2005)
            headers['Connection'] = 'close';
    }

    if (typeof this.options.requestHeaders == 'object') {
      var extras = this.options.requestHeaders;

      if (Object.isFunction(extras.push))
        for (var i = 0, length = extras.length; i < length; i += 2)
          headers[extras[i]] = extras[i+1];
      else
        $H(extras).each(function(pair) { headers[pair.key] = pair.value });
    }

    for (var name in headers)
      this.transport.setRequestHeader(name, headers[name]);
  },

  success: function() {
    var status = this.getStatus();
    return !status || (status >= 200 && status < 300);
  },

  getStatus: function() {
    try {
      return this.transport.status || 0;
    } catch (e) { return 0 }
  },

  respondToReadyState: function(readyState) {
    var state = Ajax.Request.Events[readyState], response = new Ajax.Response(this);

    if (state == 'Complete') {
      try {
        this._complete = true;
        (this.options['on' + response.status]
         || this.options['on' + (this.success() ? 'Success' : 'Failure')]
         || Prototype.emptyFunction)(response, response.headerJSON);
      } catch (e) {
        this.dispatchException(e);
      }

      var contentType = response.getHeader('Content-type');
      if (this.options.evalJS == 'force'
          || (this.options.evalJS && this.isSameOrigin() && contentType
          && contentType.match(/^\s*(text|application)\/(x-)?(java|ecma)script(;.*)?\s*$/i)))
        this.evalResponse();
    }

    try {
      (this.options['on' + state] || Prototype.emptyFunction)(response, response.headerJSON);
      Ajax.Responders.dispatch('on' + state, this, response, response.headerJSON);
    } catch (e) {
      this.dispatchException(e);
    }

    if (state == 'Complete') {
      this.transport.onreadystatechange = Prototype.emptyFunction;
    }
  },

  isSameOrigin: function() {
    var m = this.url.match(/^\s*https?:\/\/[^\/]*/);
    return !m || (m[0] == '#{protocol}//#{domain}#{port}'.interpolate({
      protocol: location.protocol,
      domain: document.domain,
      port: location.port ? ':' + location.port : ''
    }));
  },

  getHeader: function(name) {
    try {
      return this.transport.getResponseHeader(name) || null;
    } catch (e) { return null; }
  },

  evalResponse: function() {
    try {
      return eval((this.transport.responseText || '').unfilterJSON());
    } catch (e) {
      this.dispatchException(e);
    }
  },

  dispatchException: function(exception) {
    (this.options.onException || Prototype.emptyFunction)(this, exception);
    Ajax.Responders.dispatch('onException', this, exception);
  }
});

Ajax.Request.Events =
  ['Uninitialized', 'Loading', 'Loaded', 'Interactive', 'Complete'];








Ajax.Response = Class.create({
  initialize: function(request){
    this.request = request;
    var transport  = this.transport  = request.transport,
        readyState = this.readyState = transport.readyState;

    if ((readyState > 2 && !Prototype.Browser.IE) || readyState == 4) {
      this.status       = this.getStatus();
      this.statusText   = this.getStatusText();
      this.responseText = String.interpret(transport.responseText);
      this.headerJSON   = this._getHeaderJSON();
    }

    if (readyState == 4) {
      var xml = transport.responseXML;
      this.responseXML  = Object.isUndefined(xml) ? null : xml;
      this.responseJSON = this._getResponseJSON();
    }
  },

  status:      0,

  statusText: '',

  getStatus: Ajax.Request.prototype.getStatus,

  getStatusText: function() {
    try {
      return this.transport.statusText || '';
    } catch (e) { return '' }
  },

  getHeader: Ajax.Request.prototype.getHeader,

  getAllHeaders: function() {
    try {
      return this.getAllResponseHeaders();
    } catch (e) { return null }
  },

  getResponseHeader: function(name) {
    return this.transport.getResponseHeader(name);
  },

  getAllResponseHeaders: function() {
    return this.transport.getAllResponseHeaders();
  },

  _getHeaderJSON: function() {
    var json = this.getHeader('X-JSON');
    if (!json) return null;
    json = decodeURIComponent(escape(json));
    try {
      return json.evalJSON(this.request.options.sanitizeJSON ||
        !this.request.isSameOrigin());
    } catch (e) {
      this.request.dispatchException(e);
    }
  },

  _getResponseJSON: function() {
    var options = this.request.options;
    if (!options.evalJSON || (options.evalJSON != 'force' &&
      !(this.getHeader('Content-type') || '').include('application/json')) ||
        this.responseText.blank())
          return null;
    try {
      return this.responseText.evalJSON(options.sanitizeJSON ||
        !this.request.isSameOrigin());
    } catch (e) {
      this.request.dispatchException(e);
    }
  }
});

Ajax.Updater = Class.create(Ajax.Request, {
  initialize: function($super, container, url, options) {
    this.container = {
      success: (container.success || container),
      failure: (container.failure || (container.success ? null : container))
    };

    options = Object.clone(options);
    var onComplete = options.onComplete;
    options.onComplete = (function(response, json) {
      this.updateContent(response.responseText);
      if (Object.isFunction(onComplete)) onComplete(response, json);
    }).bind(this);

    $super(url, options);
  },

  updateContent: function(responseText) {
    var receiver = this.container[this.success() ? 'success' : 'failure'],
        options = this.options;

    if (!options.evalScripts) responseText = responseText.stripScripts();

    if (receiver = $(receiver)) {
      if (options.insertion) {
        if (Object.isString(options.insertion)) {
          var insertion = { }; insertion[options.insertion] = responseText;
          receiver.insert(insertion);
        }
        else options.insertion(receiver, responseText);
      }
      else receiver.update(responseText);
    }
  }
});

Ajax.PeriodicalUpdater = Class.create(Ajax.Base, {
  initialize: function($super, container, url, options) {
    $super(options);
    this.onComplete = this.options.onComplete;

    this.frequency = (this.options.frequency || 2);
    this.decay = (this.options.decay || 1);

    this.updater = { };
    this.container = container;
    this.url = url;

    this.start();
  },

  start: function() {
    this.options.onComplete = this.updateComplete.bind(this);
    this.onTimerEvent();
  },

  stop: function() {
    this.updater.options.onComplete = undefined;
    clearTimeout(this.timer);
    (this.onComplete || Prototype.emptyFunction).apply(this, arguments);
  },

  updateComplete: function(response) {
    if (this.options.decay) {
      this.decay = (response.responseText == this.lastText ?
        this.decay * this.options.decay : 1);

      this.lastText = response.responseText;
    }
    this.timer = this.onTimerEvent.bind(this).delay(this.decay * this.frequency);
  },

  onTimerEvent: function() {
    this.updater = new Ajax.Updater(this.container, this.url, this.options);
  }
});


function $(element) {
  if (arguments.length > 1) {
    for (var i = 0, elements = [], length = arguments.length; i < length; i++)
      elements.push($(arguments[i]));
    return elements;
  }
  if (Object.isString(element))
    element = document.getElementById(element);
  return Element.extend(element);
}

if (Prototype.BrowserFeatures.XPath) {
  document._getElementsByXPath = function(expression, parentElement) {
    var results = [];
    var query = document.evaluate(expression, $(parentElement) || document,
      null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (var i = 0, length = query.snapshotLength; i < length; i++)
      results.push(Element.extend(query.snapshotItem(i)));
    return results;
  };
}

/*--------------------------------------------------------------------------*/

if (!Node) var Node = { };

if (!Node.ELEMENT_NODE) {
  Object.extend(Node, {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12
  });
}



(function(global) {

  var HAS_EXTENDED_CREATE_ELEMENT_SYNTAX = (function(){
    try {
      var el = document.createElement('<input name="x">');
      return el.tagName.toLowerCase() === 'input' && el.name === 'x';
    }
    catch(err) {
      return false;
    }
  })();

  var element = global.Element;

  global.Element = function(tagName, attributes) {
    attributes = attributes || { };
    tagName = tagName.toLowerCase();
    var cache = Element.cache;
    if (HAS_EXTENDED_CREATE_ELEMENT_SYNTAX && attributes.name) {
      tagName = '<' + tagName + ' name="' + attributes.name + '">';
      delete attributes.name;
      return Element.writeAttribute(document.createElement(tagName), attributes);
    }
    if (!cache[tagName]) cache[tagName] = Element.extend(document.createElement(tagName));
    return Element.writeAttribute(cache[tagName].cloneNode(false), attributes);
  };

  Object.extend(global.Element, element || { });
  if (element) global.Element.prototype = element.prototype;

})(this);

Element.idCounter = 1;
Element.cache = { };

function purgeElement(element) {
  var uid = element._prototypeUID;
  if (uid) {
    Element.stopObserving(element);
    element._prototypeUID = void 0;
    delete Element.Storage[uid];
  }
}

Element.Methods = {
  visible: function(element) {
    return $(element).style.display != 'none';
  },

  toggle: function(element) {
    element = $(element);
    Element[Element.visible(element) ? 'hide' : 'show'](element);
    return element;
  },

  hide: function(element) {
    element = $(element);
    element.style.display = 'none';
    return element;
  },

  show: function(element) {
    element = $(element);
    element.style.display = '';
    return element;
  },

  remove: function(element) {
    element = $(element);
    element.parentNode.removeChild(element);
    return element;
  },

  update: (function(){

    var SELECT_ELEMENT_INNERHTML_BUGGY = (function(){
      var el = document.createElement("select"),
          isBuggy = true;
      el.innerHTML = "<option value=\"test\">test</option>";
      if (el.options && el.options[0]) {
        isBuggy = el.options[0].nodeName.toUpperCase() !== "OPTION";
      }
      el = null;
      return isBuggy;
    })();

    var TABLE_ELEMENT_INNERHTML_BUGGY = (function(){
      try {
        var el = document.createElement("table");
        if (el && el.tBodies) {
          el.innerHTML = "<tbody><tr><td>test</td></tr></tbody>";
          var isBuggy = typeof el.tBodies[0] == "undefined";
          el = null;
          return isBuggy;
        }
      } catch (e) {
        return true;
      }
    })();

    var SCRIPT_ELEMENT_REJECTS_TEXTNODE_APPENDING = (function () {
      var s = document.createElement("script"),
          isBuggy = false;
      try {
        s.appendChild(document.createTextNode(""));
        isBuggy = !s.firstChild ||
          s.firstChild && s.firstChild.nodeType !== 3;
      } catch (e) {
        isBuggy = true;
      }
      s = null;
      return isBuggy;
    })();

    function update(element, content) {
      element = $(element);

      var descendants = element.getElementsByTagName('*'),
       i = descendants.length;
      while (i--) purgeElement(descendants[i]);

      if (content && content.toElement)
        content = content.toElement();

      if (Object.isElement(content))
        return element.update().insert(content);

      content = Object.toHTML(content);

      var tagName = element.tagName.toUpperCase();

      if (tagName === 'SCRIPT' && SCRIPT_ELEMENT_REJECTS_TEXTNODE_APPENDING) {
        element.text = content;
        return element;
      }

      if (SELECT_ELEMENT_INNERHTML_BUGGY || TABLE_ELEMENT_INNERHTML_BUGGY) {
        if (tagName in Element._insertionTranslations.tags) {
          while (element.firstChild) {
            element.removeChild(element.firstChild);
          }
          Element._getContentFromAnonymousElement(tagName, content.stripScripts())
            .each(function(node) {
              element.appendChild(node)
            });
        }
        else {
          element.innerHTML = content.stripScripts();
        }
      }
      else {
        element.innerHTML = content.stripScripts();
      }

      content.evalScripts.bind(content).defer();
      return element;
    }

    return update;
  })(),

  replace: function(element, content) {
    element = $(element);
    if (content && content.toElement) content = content.toElement();
    else if (!Object.isElement(content)) {
      content = Object.toHTML(content);
      var range = element.ownerDocument.createRange();
      range.selectNode(element);
      content.evalScripts.bind(content).defer();
      content = range.createContextualFragment(content.stripScripts());
    }
    element.parentNode.replaceChild(content, element);
    return element;
  },

  insert: function(element, insertions) {
    element = $(element);

    if (Object.isString(insertions) || Object.isNumber(insertions) ||
        Object.isElement(insertions) || (insertions && (insertions.toElement || insertions.toHTML)))
          insertions = {bottom:insertions};

    var content, insert, tagName, childNodes;

    for (var position in insertions) {
      content  = insertions[position];
      position = position.toLowerCase();
      insert = Element._insertionTranslations[position];

      if (content && content.toElement) content = content.toElement();
      if (Object.isElement(content)) {
        insert(element, content);
        continue;
      }

      content = Object.toHTML(content);

      tagName = ((position == 'before' || position == 'after')
        ? element.parentNode : element).tagName.toUpperCase();

      childNodes = Element._getContentFromAnonymousElement(tagName, content.stripScripts());

      if (position == 'top' || position == 'after') childNodes.reverse();
      childNodes.each(insert.curry(element));

      content.evalScripts.bind(content).defer();
    }

    return element;
  },

  wrap: function(element, wrapper, attributes) {
    element = $(element);
    if (Object.isElement(wrapper))
      $(wrapper).writeAttribute(attributes || { });
    else if (Object.isString(wrapper)) wrapper = new Element(wrapper, attributes);
    else wrapper = new Element('div', wrapper);
    if (element.parentNode)
      element.parentNode.replaceChild(wrapper, element);
    wrapper.appendChild(element);
    return wrapper;
  },

  inspect: function(element) {
    element = $(element);
    var result = '<' + element.tagName.toLowerCase();
    $H({'id': 'id', 'className': 'class'}).each(function(pair) {
      var property = pair.first(),
          attribute = pair.last(),
          value = (element[property] || '').toString();
      if (value) result += ' ' + attribute + '=' + value.inspect(true);
    });
    return result + '>';
  },

  recursivelyCollect: function(element, property, maximumLength) {
    element = $(element);
    maximumLength = maximumLength || -1;
    var elements = [];

    while (element = element[property]) {
      if (element.nodeType == 1)
        elements.push(Element.extend(element));
      if (elements.length == maximumLength)
        break;
    }

    return elements;
  },

  ancestors: function(element) {
    return Element.recursivelyCollect(element, 'parentNode');
  },

  descendants: function(element) {
    return Element.select(element, "*");
  },

  firstDescendant: function(element) {
    element = $(element).firstChild;
    while (element && element.nodeType != 1) element = element.nextSibling;
    return $(element);
  },

  immediateDescendants: function(element) {
    var results = [], child = $(element).firstChild;
    while (child) {
      if (child.nodeType === 1) {
        results.push(Element.extend(child));
      }
      child = child.nextSibling;
    }
    return results;
  },

  previousSiblings: function(element, maximumLength) {
    return Element.recursivelyCollect(element, 'previousSibling');
  },

  nextSiblings: function(element) {
    return Element.recursivelyCollect(element, 'nextSibling');
  },

  siblings: function(element) {
    element = $(element);
    return Element.previousSiblings(element).reverse()
      .concat(Element.nextSiblings(element));
  },

  match: function(element, selector) {
    element = $(element);
    if (Object.isString(selector))
      return Prototype.Selector.match(element, selector);
    return selector.match(element);
  },

  up: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(element.parentNode);
    var ancestors = Element.ancestors(element);
    return Object.isNumber(expression) ? ancestors[expression] :
      Prototype.Selector.find(ancestors, expression, index);
  },

  down: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return Element.firstDescendant(element);
    return Object.isNumber(expression) ? Element.descendants(element)[expression] :
      Element.select(element, expression)[index || 0];
  },

  previous: function(element, expression, index) {
    element = $(element);
    if (Object.isNumber(expression)) index = expression, expression = false;
    if (!Object.isNumber(index)) index = 0;

    if (expression) {
      return Prototype.Selector.find(element.previousSiblings(), expression, index);
    } else {
      return element.recursivelyCollect("previousSibling", index + 1)[index];
    }
  },

  next: function(element, expression, index) {
    element = $(element);
    if (Object.isNumber(expression)) index = expression, expression = false;
    if (!Object.isNumber(index)) index = 0;

    if (expression) {
      return Prototype.Selector.find(element.nextSiblings(), expression, index);
    } else {
      var maximumLength = Object.isNumber(index) ? index + 1 : 1;
      return element.recursivelyCollect("nextSibling", index + 1)[index];
    }
  },


  select: function(element) {
    element = $(element);
    var expressions = Array.prototype.slice.call(arguments, 1).join(', ');
    return Prototype.Selector.select(expressions, element);
  },

  adjacent: function(element) {
    element = $(element);
    var expressions = Array.prototype.slice.call(arguments, 1).join(', ');
    return Prototype.Selector.select(expressions, element.parentNode).without(element);
  },

  identify: function(element) {
    element = $(element);
    var id = Element.readAttribute(element, 'id');
    if (id) return id;
    do { id = 'anonymous_element_' + Element.idCounter++ } while ($(id));
    Element.writeAttribute(element, 'id', id);
    return id;
  },

  readAttribute: function(element, name) {
    element = $(element);
    if (Prototype.Browser.IE) {
      var t = Element._attributeTranslations.read;
      if (t.values[name]) return t.values[name](element, name);
      if (t.names[name]) name = t.names[name];
      if (name.include(':')) {
        return (!element.attributes || !element.attributes[name]) ? null :
         element.attributes[name].value;
      }
    }
    return element.getAttribute(name);
  },

  writeAttribute: function(element, name, value) {
    element = $(element);
    var attributes = { }, t = Element._attributeTranslations.write;

    if (typeof name == 'object') attributes = name;
    else attributes[name] = Object.isUndefined(value) ? true : value;

    for (var attr in attributes) {
      name = t.names[attr] || attr;
      value = attributes[attr];
      if (t.values[attr]) name = t.values[attr](element, value);
      if (value === false || value === null)
        element.removeAttribute(name);
      else if (value === true)
        element.setAttribute(name, name);
      else element.setAttribute(name, value);
    }
    return element;
  },

  getHeight: function(element) {
    return Element.getDimensions(element).height;
  },

  getWidth: function(element) {
    return Element.getDimensions(element).width;
  },

  classNames: function(element) {
    return new Element.ClassNames(element);
  },

  hasClassName: function(element, className) {
    if (!(element = $(element))) return;
    var elementClassName = element.className;
    return (elementClassName.length > 0 && (elementClassName == className ||
      new RegExp("(^|\\s)" + className + "(\\s|$)").test(elementClassName)));
  },

  addClassName: function(element, className) {
    if (!(element = $(element))) return;
    if (!Element.hasClassName(element, className))
      element.className += (element.className ? ' ' : '') + className;
    return element;
  },

  removeClassName: function(element, className) {
    if (!(element = $(element))) return;
    element.className = element.className.replace(
      new RegExp("(^|\\s+)" + className + "(\\s+|$)"), ' ').strip();
    return element;
  },

  toggleClassName: function(element, className) {
    if (!(element = $(element))) return;
    return Element[Element.hasClassName(element, className) ?
      'removeClassName' : 'addClassName'](element, className);
  },

  cleanWhitespace: function(element) {
    element = $(element);
    var node = element.firstChild;
    while (node) {
      var nextNode = node.nextSibling;
      if (node.nodeType == 3 && !/\S/.test(node.nodeValue))
        element.removeChild(node);
      node = nextNode;
    }
    return element;
  },

  empty: function(element) {
    return $(element).innerHTML.blank();
  },

  descendantOf: function(element, ancestor) {
    element = $(element), ancestor = $(ancestor);

    if (element.compareDocumentPosition)
      return (element.compareDocumentPosition(ancestor) & 8) === 8;

    if (ancestor.contains)
      return ancestor.contains(element) && ancestor !== element;

    while (element = element.parentNode)
      if (element == ancestor) return true;

    return false;
  },

  scrollTo: function(element) {
    element = $(element);
    var pos = Element.cumulativeOffset(element);
    window.scrollTo(pos[0], pos[1]);
    return element;
  },

  getStyle: function(element, style) {
    element = $(element);
    style = style == 'float' ? 'cssFloat' : style.camelize();
    var value = element.style[style];
    if (!value || value == 'auto') {
      var css = document.defaultView.getComputedStyle(element, null);
      value = css ? css[style] : null;
    }
    if (style == 'opacity') return value ? parseFloat(value) : 1.0;
    return value == 'auto' ? null : value;
  },

  getOpacity: function(element) {
    return $(element).getStyle('opacity');
  },

  setStyle: function(element, styles) {
    element = $(element);
    var elementStyle = element.style, match;
    if (Object.isString(styles)) {
      element.style.cssText += ';' + styles;
      return styles.include('opacity') ?
        element.setOpacity(styles.match(/opacity:\s*(\d?\.?\d*)/)[1]) : element;
    }
    for (var property in styles)
      if (property == 'opacity') element.setOpacity(styles[property]);
      else
        elementStyle[(property == 'float' || property == 'cssFloat') ?
          (Object.isUndefined(elementStyle.styleFloat) ? 'cssFloat' : 'styleFloat') :
            property] = styles[property];

    return element;
  },

  setOpacity: function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1 || value === '') ? '' :
      (value < 0.00001) ? 0 : value;
    return element;
  },

  makePositioned: function(element) {
    element = $(element);
    var pos = Element.getStyle(element, 'position');
    if (pos == 'static' || !pos) {
      element._madePositioned = true;
      element.style.position = 'relative';
      if (Prototype.Browser.Opera) {
        element.style.top = 0;
        element.style.left = 0;
      }
    }
    return element;
  },

  undoPositioned: function(element) {
    element = $(element);
    if (element._madePositioned) {
      element._madePositioned = undefined;
      element.style.position =
        element.style.top =
        element.style.left =
        element.style.bottom =
        element.style.right = '';
    }
    return element;
  },

  makeClipping: function(element) {
    element = $(element);
    if (element._overflow) return element;
    element._overflow = Element.getStyle(element, 'overflow') || 'auto';
    if (element._overflow !== 'hidden')
      element.style.overflow = 'hidden';
    return element;
  },

  undoClipping: function(element) {
    element = $(element);
    if (!element._overflow) return element;
    element.style.overflow = element._overflow == 'auto' ? '' : element._overflow;
    element._overflow = null;
    return element;
  },

  cumulativeOffset: function(element) {
    var valueT = 0, valueL = 0;
    if (element.parentNode) {
      do {
        valueT += element.offsetTop  || 0;
        valueL += element.offsetLeft || 0;
        element = element.offsetParent;
      } while (element);
    }
    return Element._returnOffset(valueL, valueT);
  },

  positionedOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
      if (element) {
        if (element.tagName.toUpperCase() == 'BODY') break;
        var p = Element.getStyle(element, 'position');
        if (p !== 'static') break;
      }
    } while (element);
    return Element._returnOffset(valueL, valueT);
  },

  absolutize: function(element) {
    element = $(element);
    if (Element.getStyle(element, 'position') == 'absolute') return element;

    var offsets = Element.positionedOffset(element),
        top     = offsets[1],
        left    = offsets[0],
        width   = element.clientWidth,
        height  = element.clientHeight;

    element._originalLeft   = left - parseFloat(element.style.left  || 0);
    element._originalTop    = top  - parseFloat(element.style.top || 0);
    element._originalWidth  = element.style.width;
    element._originalHeight = element.style.height;

    element.style.position = 'absolute';
    element.style.top    = top + 'px';
    element.style.left   = left + 'px';
    element.style.width  = width + 'px';
    element.style.height = height + 'px';
    return element;
  },

  relativize: function(element) {
    element = $(element);
    if (Element.getStyle(element, 'position') == 'relative') return element;

    element.style.position = 'relative';
    var top  = parseFloat(element.style.top  || 0) - (element._originalTop || 0),
        left = parseFloat(element.style.left || 0) - (element._originalLeft || 0);

    element.style.top    = top + 'px';
    element.style.left   = left + 'px';
    element.style.height = element._originalHeight;
    element.style.width  = element._originalWidth;
    return element;
  },

  cumulativeScrollOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.scrollTop  || 0;
      valueL += element.scrollLeft || 0;
      element = element.parentNode;
    } while (element);
    return Element._returnOffset(valueL, valueT);
  },

  getOffsetParent: function(element) {
    if (element.offsetParent) return $(element.offsetParent);
    if (element == document.body) return $(element);

    while ((element = element.parentNode) && element != document.body)
      if (Element.getStyle(element, 'position') != 'static')
        return $(element);

    return $(document.body);
  },

  viewportOffset: function(forElement) {
    var valueT = 0,
        valueL = 0,
        element = forElement;

    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;

      if (element.offsetParent == document.body &&
        Element.getStyle(element, 'position') == 'absolute') break;

    } while (element = element.offsetParent);

    element = forElement;
    do {
      if (!Prototype.Browser.Opera || (element.tagName && (element.tagName.toUpperCase() == 'BODY'))) {
        valueT -= element.scrollTop  || 0;
        valueL -= element.scrollLeft || 0;
      }
    } while (element = element.parentNode);

    return Element._returnOffset(valueL, valueT);
  },

  clonePosition: function(element, source) {
    var options = Object.extend({
      setLeft:    true,
      setTop:     true,
      setWidth:   true,
      setHeight:  true,
      offsetTop:  0,
      offsetLeft: 0
    }, arguments[2] || { });

    source = $(source);
    var p = Element.viewportOffset(source), delta = [0, 0], parent = null;

    element = $(element);

    if (Element.getStyle(element, 'position') == 'absolute') {
      parent = Element.getOffsetParent(element);
      delta = Element.viewportOffset(parent);
    }

    if (parent == document.body) {
      delta[0] -= document.body.offsetLeft;
      delta[1] -= document.body.offsetTop;
    }

    if (options.setLeft)   element.style.left  = (p[0] - delta[0] + options.offsetLeft) + 'px';
    if (options.setTop)    element.style.top   = (p[1] - delta[1] + options.offsetTop) + 'px';
    if (options.setWidth)  element.style.width = source.offsetWidth + 'px';
    if (options.setHeight) element.style.height = source.offsetHeight + 'px';
    return element;
  }
};

Object.extend(Element.Methods, {
  getElementsBySelector: Element.Methods.select,

  childElements: Element.Methods.immediateDescendants
});

Element._attributeTranslations = {
  write: {
    names: {
      className: 'class',
      htmlFor:   'for'
    },
    values: { }
  }
};

if (Prototype.Browser.Opera) {
  Element.Methods.getStyle = Element.Methods.getStyle.wrap(
    function(proceed, element, style) {
      switch (style) {
        case 'left': case 'top': case 'right': case 'bottom':
          if (proceed(element, 'position') === 'static') return null;
        case 'height': case 'width':
          if (!Element.visible(element)) return null;

          var dim = parseInt(proceed(element, style), 10);

          if (dim !== element['offset' + style.capitalize()])
            return dim + 'px';

          var properties;
          if (style === 'height') {
            properties = ['border-top-width', 'padding-top',
             'padding-bottom', 'border-bottom-width'];
          }
          else {
            properties = ['border-left-width', 'padding-left',
             'padding-right', 'border-right-width'];
          }
          return properties.inject(dim, function(memo, property) {
            var val = proceed(element, property);
            return val === null ? memo : memo - parseInt(val, 10);
          }) + 'px';
        default: return proceed(element, style);
      }
    }
  );

  Element.Methods.readAttribute = Element.Methods.readAttribute.wrap(
    function(proceed, element, attribute) {
      if (attribute === 'title') return element.title;
      return proceed(element, attribute);
    }
  );
}

else if (Prototype.Browser.IE) {
  Element.Methods.getOffsetParent = Element.Methods.getOffsetParent.wrap(
    function(proceed, element) {
      element = $(element);
      if (!element.parentNode) return $(document.body);
      var position = element.getStyle('position');
      if (position !== 'static') return proceed(element);
      element.setStyle({ position: 'relative' });
      var value = proceed(element);
      element.setStyle({ position: position });
      return value;
    }
  );

  $w('positionedOffset viewportOffset').each(function(method) {
    Element.Methods[method] = Element.Methods[method].wrap(
      function(proceed, element) {
        element = $(element);
        if (!element.parentNode) return Element._returnOffset(0, 0);
        var position = element.getStyle('position');
        if (position !== 'static') return proceed(element);
        var offsetParent = element.getOffsetParent();
        if (offsetParent && offsetParent.getStyle('position') === 'fixed')
          offsetParent.setStyle({ zoom: 1 });
        element.setStyle({ position: 'relative' });
        var value = proceed(element);
        element.setStyle({ position: position });
        return value;
      }
    );
  });

  Element.Methods.getStyle = function(element, style) {
    element = $(element);
    style = (style == 'float' || style == 'cssFloat') ? 'styleFloat' : style.camelize();
    var value = element.style[style];
    if (!value && element.currentStyle) value = element.currentStyle[style];

    if (style == 'opacity') {
      if (value = (element.getStyle('filter') || '').match(/alpha\(opacity=(.*)\)/))
        if (value[1]) return parseFloat(value[1]) / 100;
      return 1.0;
    }

    if (value == 'auto') {
      if ((style == 'width' || style == 'height') && (element.getStyle('display') != 'none'))
        return element['offset' + style.capitalize()] + 'px';
      return null;
    }
    return value;
  };

  Element.Methods.setOpacity = function(element, value) {
    function stripAlpha(filter){
      return filter.replace(/alpha\([^\)]*\)/gi,'');
    }
    element = $(element);
    var currentStyle = element.currentStyle;
    if ((currentStyle && !currentStyle.hasLayout) ||
      (!currentStyle && element.style.zoom == 'normal'))
        element.style.zoom = 1;

    var filter = element.getStyle('filter'), style = element.style;
    if (value == 1 || value === '') {
      (filter = stripAlpha(filter)) ?
        style.filter = filter : style.removeAttribute('filter');
      return element;
    } else if (value < 0.00001) value = 0;
    style.filter = stripAlpha(filter) +
      'alpha(opacity=' + (value * 100) + ')';
    return element;
  };

  Element._attributeTranslations = (function(){

    var classProp = 'className',
        forProp = 'for',
        el = document.createElement('div');

    el.setAttribute(classProp, 'x');

    if (el.className !== 'x') {
      el.setAttribute('class', 'x');
      if (el.className === 'x') {
        classProp = 'class';
      }
    }
    el = null;

    el = document.createElement('label');
    el.setAttribute(forProp, 'x');
    if (el.htmlFor !== 'x') {
      el.setAttribute('htmlFor', 'x');
      if (el.htmlFor === 'x') {
        forProp = 'htmlFor';
      }
    }
    el = null;

    return {
      read: {
        names: {
          'class':      classProp,
          'className':  classProp,
          'for':        forProp,
          'htmlFor':    forProp
        },
        values: {
          _getAttr: function(element, attribute) {
            return element.getAttribute(attribute);
          },
          _getAttr2: function(element, attribute) {
            return element.getAttribute(attribute, 2);
          },
          _getAttrNode: function(element, attribute) {
            var node = element.getAttributeNode(attribute);
            return node ? node.value : "";
          },
          _getEv: (function(){

            var el = document.createElement('div'), f;
            el.onclick = Prototype.emptyFunction;
            var value = el.getAttribute('onclick');

            if (String(value).indexOf('{') > -1) {
              f = function(element, attribute) {
                attribute = element.getAttribute(attribute);
                if (!attribute) return null;
                attribute = attribute.toString();
                attribute = attribute.split('{')[1];
                attribute = attribute.split('}')[0];
                return attribute.strip();
              };
            }
            else if (value === '') {
              f = function(element, attribute) {
                attribute = element.getAttribute(attribute);
                if (!attribute) return null;
                return attribute.strip();
              };
            }
            el = null;
            return f;
          })(),
          _flag: function(element, attribute) {
            return $(element).hasAttribute(attribute) ? attribute : null;
          },
          style: function(element) {
            return element.style.cssText.toLowerCase();
          },
          title: function(element) {
            return element.title;
          }
        }
      }
    }
  })();

  Element._attributeTranslations.write = {
    names: Object.extend({
      cellpadding: 'cellPadding',
      cellspacing: 'cellSpacing'
    }, Element._attributeTranslations.read.names),
    values: {
      checked: function(element, value) {
        element.checked = !!value;
      },

      style: function(element, value) {
        element.style.cssText = value ? value : '';
      }
    }
  };

  Element._attributeTranslations.has = {};

  $w('colSpan rowSpan vAlign dateTime accessKey tabIndex ' +
      'encType maxLength readOnly longDesc frameBorder').each(function(attr) {
    Element._attributeTranslations.write.names[attr.toLowerCase()] = attr;
    Element._attributeTranslations.has[attr.toLowerCase()] = attr;
  });

  (function(v) {
    Object.extend(v, {
      href:        v._getAttr2,
      src:         v._getAttr2,
      type:        v._getAttr,
      action:      v._getAttrNode,
      disabled:    v._flag,
      checked:     v._flag,
      readonly:    v._flag,
      multiple:    v._flag,
      onload:      v._getEv,
      onunload:    v._getEv,
      onclick:     v._getEv,
      ondblclick:  v._getEv,
      onmousedown: v._getEv,
      onmouseup:   v._getEv,
      onmouseover: v._getEv,
      onmousemove: v._getEv,
      onmouseout:  v._getEv,
      onfocus:     v._getEv,
      onblur:      v._getEv,
      onkeypress:  v._getEv,
      onkeydown:   v._getEv,
      onkeyup:     v._getEv,
      onsubmit:    v._getEv,
      onreset:     v._getEv,
      onselect:    v._getEv,
      onchange:    v._getEv
    });
  })(Element._attributeTranslations.read.values);

  if (Prototype.BrowserFeatures.ElementExtensions) {
    (function() {
      function _descendants(element) {
        var nodes = element.getElementsByTagName('*'), results = [];
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.tagName !== "!") // Filter out comment nodes.
            results.push(node);
        return results;
      }

      Element.Methods.down = function(element, expression, index) {
        element = $(element);
        if (arguments.length == 1) return element.firstDescendant();
        return Object.isNumber(expression) ? _descendants(element)[expression] :
          Element.select(element, expression)[index || 0];
      }
    })();
  }

}

else if (Prototype.Browser.Gecko && /rv:1\.8\.0/.test(navigator.userAgent)) {
  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1) ? 0.999999 :
      (value === '') ? '' : (value < 0.00001) ? 0 : value;
    return element;
  };
}

else if (Prototype.Browser.WebKit) {
  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1 || value === '') ? '' :
      (value < 0.00001) ? 0 : value;

    if (value == 1)
      if (element.tagName.toUpperCase() == 'IMG' && element.width) {
        element.width++; element.width--;
      } else try {
        var n = document.createTextNode(' ');
        element.appendChild(n);
        element.removeChild(n);
      } catch (e) { }

    return element;
  };

  Element.Methods.cumulativeOffset = function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      if (element.offsetParent == document.body)
        if (Element.getStyle(element, 'position') == 'absolute') break;

      element = element.offsetParent;
    } while (element);

    return Element._returnOffset(valueL, valueT);
  };
}

if ('outerHTML' in document.documentElement) {
  Element.Methods.replace = function(element, content) {
    element = $(element);

    if (content && content.toElement) content = content.toElement();
    if (Object.isElement(content)) {
      element.parentNode.replaceChild(content, element);
      return element;
    }

    content = Object.toHTML(content);
    var parent = element.parentNode, tagName = parent.tagName.toUpperCase();

    if (Element._insertionTranslations.tags[tagName]) {
      var nextSibling = element.next(),
          fragments = Element._getContentFromAnonymousElement(tagName, content.stripScripts());
      parent.removeChild(element);
      if (nextSibling)
        fragments.each(function(node) { parent.insertBefore(node, nextSibling) });
      else
        fragments.each(function(node) { parent.appendChild(node) });
    }
    else element.outerHTML = content.stripScripts();

    content.evalScripts.bind(content).defer();
    return element;
  };
}

Element._returnOffset = function(l, t) {
  var result = [l, t];
  result.left = l;
  result.top = t;
  return result;
};

Element._getContentFromAnonymousElement = function(tagName, html) {
  var div = new Element('div'),
      t = Element._insertionTranslations.tags[tagName];
  if (t) {
    div.innerHTML = t[0] + html + t[1];
    for (var i = t[2]; i--; ) {
      div = div.firstChild;
    }
  }
  else {
    div.innerHTML = html;
  }
  return $A(div.childNodes);
};

Element._insertionTranslations = {
  before: function(element, node) {
    element.parentNode.insertBefore(node, element);
  },
  top: function(element, node) {
    element.insertBefore(node, element.firstChild);
  },
  bottom: function(element, node) {
    element.appendChild(node);
  },
  after: function(element, node) {
    element.parentNode.insertBefore(node, element.nextSibling);
  },
  tags: {
    TABLE:  ['<table>',                '</table>',                   1],
    TBODY:  ['<table><tbody>',         '</tbody></table>',           2],
    TR:     ['<table><tbody><tr>',     '</tr></tbody></table>',      3],
    TD:     ['<table><tbody><tr><td>', '</td></tr></tbody></table>', 4],
    SELECT: ['<select>',               '</select>',                  1]
  }
};

(function() {
  var tags = Element._insertionTranslations.tags;
  Object.extend(tags, {
    THEAD: tags.TBODY,
    TFOOT: tags.TBODY,
    TH:    tags.TD
  });
})();

Element.Methods.Simulated = {
  hasAttribute: function(element, attribute) {
    attribute = Element._attributeTranslations.has[attribute] || attribute;
    var node = $(element).getAttributeNode(attribute);
    return !!(node && node.specified);
  }
};

Element.Methods.ByTag = { };

Object.extend(Element, Element.Methods);

(function(div) {

  if (!Prototype.BrowserFeatures.ElementExtensions && div['__proto__']) {
    window.HTMLElement = { };
    window.HTMLElement.prototype = div['__proto__'];
    Prototype.BrowserFeatures.ElementExtensions = true;
  }

  div = null;

})(document.createElement('div'));

Element.extend = (function() {

  function checkDeficiency(tagName) {
    if (typeof window.Element != 'undefined') {
      var proto = window.Element.prototype;
      if (proto) {
        var id = '_' + (Math.random()+'').slice(2),
            el = document.createElement(tagName);
        proto[id] = 'x';
        var isBuggy = (el[id] !== 'x');
        delete proto[id];
        el = null;
        return isBuggy;
      }
    }
    return false;
  }

  function extendElementWith(element, methods) {
    for (var property in methods) {
      var value = methods[property];
      if (Object.isFunction(value) && !(property in element))
        element[property] = value.methodize();
    }
  }

  var HTMLOBJECTELEMENT_PROTOTYPE_BUGGY = checkDeficiency('object');

  if (Prototype.BrowserFeatures.SpecificElementExtensions) {
    if (HTMLOBJECTELEMENT_PROTOTYPE_BUGGY) {
      return function(element) {
        if (element && typeof element._extendedByPrototype == 'undefined') {
          var t = element.tagName;
          if (t && (/^(?:object|applet|embed)$/i.test(t))) {
            extendElementWith(element, Element.Methods);
            extendElementWith(element, Element.Methods.Simulated);
            extendElementWith(element, Element.Methods.ByTag[t.toUpperCase()]);
          }
        }
        return element;
      }
    }
    return Prototype.K;
  }

  var Methods = { }, ByTag = Element.Methods.ByTag;

  var extend = Object.extend(function(element) {
    if (!element || typeof element._extendedByPrototype != 'undefined' ||
        element.nodeType != 1 || element == window) return element;

    var methods = Object.clone(Methods),
        tagName = element.tagName.toUpperCase();

    if (ByTag[tagName]) Object.extend(methods, ByTag[tagName]);

    extendElementWith(element, methods);

    element._extendedByPrototype = Prototype.emptyFunction;
    return element;

  }, {
    refresh: function() {
      if (!Prototype.BrowserFeatures.ElementExtensions) {
        Object.extend(Methods, Element.Methods);
        Object.extend(Methods, Element.Methods.Simulated);
      }
    }
  });

  extend.refresh();
  return extend;
})();

if (document.documentElement.hasAttribute) {
  Element.hasAttribute = function(element, attribute) {
    return element.hasAttribute(attribute);
  };
}
else {
  Element.hasAttribute = Element.Methods.Simulated.hasAttribute;
}

Element.addMethods = function(methods) {
  var F = Prototype.BrowserFeatures, T = Element.Methods.ByTag;

  if (!methods) {
    Object.extend(Form, Form.Methods);
    Object.extend(Form.Element, Form.Element.Methods);
    Object.extend(Element.Methods.ByTag, {
      "FORM":     Object.clone(Form.Methods),
      "INPUT":    Object.clone(Form.Element.Methods),
      "SELECT":   Object.clone(Form.Element.Methods),
      "TEXTAREA": Object.clone(Form.Element.Methods)
    });
  }

  if (arguments.length == 2) {
    var tagName = methods;
    methods = arguments[1];
  }

  if (!tagName) Object.extend(Element.Methods, methods || { });
  else {
    if (Object.isArray(tagName)) tagName.each(extend);
    else extend(tagName);
  }

  function extend(tagName) {
    tagName = tagName.toUpperCase();
    if (!Element.Methods.ByTag[tagName])
      Element.Methods.ByTag[tagName] = { };
    Object.extend(Element.Methods.ByTag[tagName], methods);
  }

  function copy(methods, destination, onlyIfAbsent) {
    onlyIfAbsent = onlyIfAbsent || false;
    for (var property in methods) {
      var value = methods[property];
      if (!Object.isFunction(value)) continue;
      if (!onlyIfAbsent || !(property in destination))
        destination[property] = value.methodize();
    }
  }

  function findDOMClass(tagName) {
    var klass;
    var trans = {
      "OPTGROUP": "OptGroup", "TEXTAREA": "TextArea", "P": "Paragraph",
      "FIELDSET": "FieldSet", "UL": "UList", "OL": "OList", "DL": "DList",
      "DIR": "Directory", "H1": "Heading", "H2": "Heading", "H3": "Heading",
      "H4": "Heading", "H5": "Heading", "H6": "Heading", "Q": "Quote",
      "INS": "Mod", "DEL": "Mod", "A": "Anchor", "IMG": "Image", "CAPTION":
      "TableCaption", "COL": "TableCol", "COLGROUP": "TableCol", "THEAD":
      "TableSection", "TFOOT": "TableSection", "TBODY": "TableSection", "TR":
      "TableRow", "TH": "TableCell", "TD": "TableCell", "FRAMESET":
      "FrameSet", "IFRAME": "IFrame"
    };
    if (trans[tagName]) klass = 'HTML' + trans[tagName] + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName.capitalize() + 'Element';
    if (window[klass]) return window[klass];

    var element = document.createElement(tagName),
        proto = element['__proto__'] || element.constructor.prototype;

    element = null;
    return proto;
  }

  var elementPrototype = window.HTMLElement ? HTMLElement.prototype :
   Element.prototype;

  if (F.ElementExtensions) {
    copy(Element.Methods, elementPrototype);
    copy(Element.Methods.Simulated, elementPrototype, true);
  }

  if (F.SpecificElementExtensions) {
    for (var tag in Element.Methods.ByTag) {
      var klass = findDOMClass(tag);
      if (Object.isUndefined(klass)) continue;
      copy(T[tag], klass.prototype);
    }
  }

  Object.extend(Element, Element.Methods);
  delete Element.ByTag;

  if (Element.extend.refresh) Element.extend.refresh();
  Element.cache = { };
};


document.viewport = {

  getDimensions: function() {
    return { width: this.getWidth(), height: this.getHeight() };
  },

  getScrollOffsets: function() {
    return Element._returnOffset(
      window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft,
      window.pageYOffset || document.documentElement.scrollTop  || document.body.scrollTop);
  }
};

(function(viewport) {
  var B = Prototype.Browser, doc = document, element, property = {};

  function getRootElement() {
    if (B.WebKit && !doc.evaluate)
      return document;

    if (B.Opera && window.parseFloat(window.opera.version()) < 9.5)
      return document.body;

    return document.documentElement;
  }

  function define(D) {
    if (!element) element = getRootElement();

    property[D] = 'client' + D;

    viewport['get' + D] = function() { return element[property[D]] };
    return viewport['get' + D]();
  }

  viewport.getWidth  = define.curry('Width');

  viewport.getHeight = define.curry('Height');
})(document.viewport);


Element.Storage = {
  UID: 1
};

Element.addMethods({
  getStorage: function(element) {
    if (!(element = $(element))) return;

    var uid;
    if (element === window) {
      uid = 0;
    } else {
      if (typeof element._prototypeUID === "undefined")
        element._prototypeUID = Element.Storage.UID++;
      uid = element._prototypeUID;
    }

    if (!Element.Storage[uid])
      Element.Storage[uid] = $H();

    return Element.Storage[uid];
  },

  store: function(element, key, value) {
    if (!(element = $(element))) return;

    if (arguments.length === 2) {
      Element.getStorage(element).update(key);
    } else {
      Element.getStorage(element).set(key, value);
    }

    return element;
  },

  retrieve: function(element, key, defaultValue) {
    if (!(element = $(element))) return;
    var hash = Element.getStorage(element), value = hash.get(key);

    if (Object.isUndefined(value)) {
      hash.set(key, defaultValue);
      value = defaultValue;
    }

    return value;
  },

  clone: function(element, deep) {
    if (!(element = $(element))) return;
    var clone = element.cloneNode(deep);
    clone._prototypeUID = void 0;
    if (deep) {
      var descendants = Element.select(clone, '*'),
          i = descendants.length;
      while (i--) {
        descendants[i]._prototypeUID = void 0;
      }
    }
    return Element.extend(clone);
  },

  purge: function(element) {
    if (!(element = $(element))) return;
    purgeElement(element);

    var descendants = element.getElementsByTagName('*'),
     i = descendants.length;

    while (i--) purgeElement(descendants[i]);

    return null;
  }
});

(function() {

  function toDecimal(pctString) {
    var match = pctString.match(/^(\d+)%?$/i);
    if (!match) return null;
    return (Number(match[1]) / 100);
  }

  function getPixelValue(value, property) {
    if (Object.isElement(value)) {
      element = value;
      value = element.getStyle(property);
    }
    if (value === null) {
      return null;
    }

    if ((/^(?:-)?\d+(\.\d+)?(px)?$/i).test(value)) {
      return window.parseFloat(value);
    }

    if (/\d/.test(value) && element.runtimeStyle) {
      var style = element.style.left, rStyle = element.runtimeStyle.left;
      element.runtimeStyle.left = element.currentStyle.left;
      element.style.left = value || 0;
      value = element.style.pixelLeft;
      element.style.left = style;
      element.runtimeStyle.left = rStyle;

      return value;
    }

    if (value.include('%')) {
      var decimal = toDecimal(value);
      var whole;
      if (property.include('left') || property.include('right') ||
       property.include('width')) {
        whole = $(element.parentNode).measure('width');
      } else if (property.include('top') || property.include('bottom') ||
       property.include('height')) {
        whole = $(element.parentNode).measure('height');
      }

      return whole * decimal;
    }

    return 0;
  }

  function toCSSPixels(number) {
    if (Object.isString(number) && number.endsWith('px')) {
      return number;
    }
    return number + 'px';
  }

  function isDisplayed(element) {
    var originalElement = element;
    while (element && element.parentNode) {
      var display = element.getStyle('display');
      if (display === 'none') {
        return false;
      }
      element = $(element.parentNode);
    }
    return true;
  }

  var hasLayout = Prototype.K;
  if ('currentStyle' in document.documentElement) {
    hasLayout = function(element) {
      if (!element.currentStyle.hasLayout) {
        element.style.zoom = 1;
      }
      return element;
    };
  }

  function cssNameFor(key) {
    if (key.include('border')) key = key + '-width';
    return key.camelize();
  }

  Element.Layout = Class.create(Hash, {
    initialize: function($super, element, preCompute) {
      $super();
      this.element = $(element);

      Element.Layout.PROPERTIES.each( function(property) {
        this._set(property, null);
      }, this);

      if (preCompute) {
        this._preComputing = true;
        this._begin();
        Element.Layout.PROPERTIES.each( this._compute, this );
        this._end();
        this._preComputing = false;
      }
    },

    _set: function(property, value) {
      return Hash.prototype.set.call(this, property, value);
    },

    set: function(property, value) {
      throw "Properties of Element.Layout are read-only.";
    },

    get: function($super, property) {
      var value = $super(property);
      return value === null ? this._compute(property) : value;
    },

    _begin: function() {
      if (this._prepared) return;

      var element = this.element;
      if (isDisplayed(element)) {
        this._prepared = true;
        return;
      }

      var originalStyles = {
        position:   element.style.position   || '',
        width:      element.style.width      || '',
        visibility: element.style.visibility || '',
        display:    element.style.display    || ''
      };

      element.store('prototype_original_styles', originalStyles);

      var position = element.getStyle('position'),
       width = element.getStyle('width');

      element.setStyle({
        position:   'absolute',
        visibility: 'hidden',
        display:    'block'
      });

      var positionedWidth = element.getStyle('width');

      var newWidth;
      if (width && (positionedWidth === width)) {
        newWidth = getPixelValue(width);
      } else if (width && (position === 'absolute' || position === 'fixed')) {
        newWidth = getPixelValue(width);
      } else {
        var parent = element.parentNode, pLayout = $(parent).getLayout();

        newWidth = pLayout.get('width') -
         this.get('margin-left') -
         this.get('border-left') -
         this.get('padding-left') -
         this.get('padding-right') -
         this.get('border-right') -
         this.get('margin-right');
      }

      element.setStyle({ width: newWidth + 'px' });

      this._prepared = true;
    },

    _end: function() {
      var element = this.element;
      var originalStyles = element.retrieve('prototype_original_styles');
      element.store('prototype_original_styles', null);
      element.setStyle(originalStyles);
      this._prepared = false;
    },

    _compute: function(property) {
      var COMPUTATIONS = Element.Layout.COMPUTATIONS;
      if (!(property in COMPUTATIONS)) {
        throw "Property not found.";
      }
      return this._set(property, COMPUTATIONS[property].call(this, this.element));
    },

    toObject: function() {
      var args = $A(arguments);
      var keys = (args.length === 0) ? Element.Layout.PROPERTIES :
       args.join(' ').split(' ');
      var obj = {};
      keys.each( function(key) {
        if (!Element.Layout.PROPERTIES.include(key)) return;
        var value = this.get(key);
        if (value != null) obj[key] = value;
      }, this);
      return obj;
    },

    toHash: function() {
      var obj = this.toObject.apply(this, arguments);
      return new Hash(obj);
    },

    toCSS: function() {
      var args = $A(arguments);
      var keys = (args.length === 0) ? Element.Layout.PROPERTIES :
       args.join(' ').split(' ');
      var css = {};

      keys.each( function(key) {
        if (!Element.Layout.PROPERTIES.include(key)) return;
        if (Element.Layout.COMPOSITE_PROPERTIES.include(key)) return;

        var value = this.get(key);
        if (value != null) css[cssNameFor(key)] = value + 'px';
      }, this);
      return css;
    },

    inspect: function() {
      return "#<Element.Layout>";
    }
  });

  Object.extend(Element.Layout, {
    PROPERTIES: $w('height width top left right bottom border-left border-right border-top border-bottom padding-left padding-right padding-top padding-bottom margin-top margin-bottom margin-left margin-right padding-box-width padding-box-height border-box-width border-box-height margin-box-width margin-box-height'),

    COMPOSITE_PROPERTIES: $w('padding-box-width padding-box-height margin-box-width margin-box-height border-box-width border-box-height'),

    COMPUTATIONS: {
      'height': function(element) {
        if (!this._preComputing) this._begin();

        var bHeight = this.get('border-box-height');
        if (bHeight <= 0) return 0;

        var bTop = this.get('border-top'),
         bBottom = this.get('border-bottom');

        var pTop = this.get('padding-top'),
         pBottom = this.get('padding-bottom');

        if (!this._preComputing) this._end();

        return bHeight - bTop - bBottom - pTop - pBottom;
      },

      'width': function(element) {
        if (!this._preComputing) this._begin();

        var bWidth = this.get('border-box-width');
        if (bWidth <= 0) return 0;

        var bLeft = this.get('border-left'),
         bRight = this.get('border-right');

        var pLeft = this.get('padding-left'),
         pRight = this.get('padding-right');

        if (!this._preComputing) this._end();

        return bWidth - bLeft - bRight - pLeft - pRight;
      },

      'padding-box-height': function(element) {
        var height = this.get('height'),
         pTop = this.get('padding-top'),
         pBottom = this.get('padding-bottom');

        return height + pTop + pBottom;
      },

      'padding-box-width': function(element) {
        var width = this.get('width'),
         pLeft = this.get('padding-left'),
         pRight = this.get('padding-right');

        return width + pLeft + pRight;
      },

      'border-box-height': function(element) {
        return element.offsetHeight;
      },

      'border-box-width': function(element) {
        return element.offsetWidth;
      },

      'margin-box-height': function(element) {
        var bHeight = this.get('border-box-height'),
         mTop = this.get('margin-top'),
         mBottom = this.get('margin-bottom');

        if (bHeight <= 0) return 0;

        return bHeight + mTop + mBottom;
      },

      'margin-box-width': function(element) {
        var bWidth = this.get('border-box-width'),
         mLeft = this.get('margin-left'),
         mRight = this.get('margin-right');

        if (bWidth <= 0) return 0;

        return bWidth + mLeft + mRight;
      },

      'top': function(element) {
        var offset = element.positionedOffset();
        return offset.top;
      },

      'bottom': function(element) {
        var offset = element.positionedOffset(),
         parent = element.getOffsetParent(),
         pHeight = parent.measure('height');

        var mHeight = this.get('border-box-height');

        return pHeight - mHeight - offset.top;
      },

      'left': function(element) {
        var offset = element.positionedOffset();
        return offset.left;
      },

      'right': function(element) {
        var offset = element.positionedOffset(),
         parent = element.getOffsetParent(),
         pWidth = parent.measure('width');

        var mWidth = this.get('border-box-width');

        return pWidth - mWidth - offset.left;
      },

      'padding-top': function(element) {
        return getPixelValue(element, 'paddingTop');
      },

      'padding-bottom': function(element) {
        return getPixelValue(element, 'paddingBottom');
      },

      'padding-left': function(element) {
        return getPixelValue(element, 'paddingLeft');
      },

      'padding-right': function(element) {
        return getPixelValue(element, 'paddingRight');
      },

      'border-top': function(element) {
        return Object.isNumber(element.clientTop) ? element.clientTop :
         getPixelValue(element, 'borderTopWidth');
      },

      'border-bottom': function(element) {
        return Object.isNumber(element.clientBottom) ? element.clientBottom :
         getPixelValue(element, 'borderBottomWidth');
      },

      'border-left': function(element) {
        return Object.isNumber(element.clientLeft) ? element.clientLeft :
         getPixelValue(element, 'borderLeftWidth');
      },

      'border-right': function(element) {
        return Object.isNumber(element.clientRight) ? element.clientRight :
         getPixelValue(element, 'borderRightWidth');
      },

      'margin-top': function(element) {
        return getPixelValue(element, 'marginTop');
      },

      'margin-bottom': function(element) {
        return getPixelValue(element, 'marginBottom');
      },

      'margin-left': function(element) {
        return getPixelValue(element, 'marginLeft');
      },

      'margin-right': function(element) {
        return getPixelValue(element, 'marginRight');
      }
    }
  });

  if ('getBoundingClientRect' in document.documentElement) {
    Object.extend(Element.Layout.COMPUTATIONS, {
      'right': function(element) {
        var parent = hasLayout(element.getOffsetParent());
        var rect = element.getBoundingClientRect(),
         pRect = parent.getBoundingClientRect();

        return (pRect.right - rect.right).round();
      },

      'bottom': function(element) {
        var parent = hasLayout(element.getOffsetParent());
        var rect = element.getBoundingClientRect(),
         pRect = parent.getBoundingClientRect();

        return (pRect.bottom - rect.bottom).round();
      }
    });
  }

  Element.Offset = Class.create({
    initialize: function(left, top) {
      this.left = left.round();
      this.top  = top.round();

      this[0] = this.left;
      this[1] = this.top;
    },

    relativeTo: function(offset) {
      return new Element.Offset(
        this.left - offset.left,
        this.top  - offset.top
      );
    },

    inspect: function() {
      return "#<Element.Offset left: #{left} top: #{top}>".interpolate(this);
    },

    toString: function() {
      return "[#{left}, #{top}]".interpolate(this);
    },

    toArray: function() {
      return [this.left, this.top];
    }
  });

  function getLayout(element, preCompute) {
    return new Element.Layout(element, preCompute);
  }

  function measure(element, property) {
    return $(element).getLayout().get(property);
  }

  function getDimensions(element) {
    var layout = $(element).getLayout();
    return {
      width:  layout.get('width'),
      height: layout.get('height')
    };
  }

  function getOffsetParent(element) {
    if (isDetached(element)) return $(document.body);

    var isInline = (Element.getStyle(element, 'display') === 'inline');
    if (!isInline && element.offsetParent) return $(element.offsetParent);
    if (element === document.body) return $(element);

    while ((element = element.parentNode) && element !== document.body) {
      if (Element.getStyle(element, 'position') !== 'static') {
        return (element.nodeName === 'HTML') ? $(document.body) : $(element);
      }
    }

    return $(document.body);
  }


  function cumulativeOffset(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
    } while (element);
    return new Element.Offset(valueL, valueT);
  }

  function positionedOffset(element) {
    var layout = element.getLayout();

    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
      if (element) {
        if (isBody(element)) break;
        var p = Element.getStyle(element, 'position');
        if (p !== 'static') break;
      }
    } while (element);

    valueL -= layout.get('margin-top');
    valueT -= layout.get('margin-left');

    return new Element.Offset(valueL, valueT);
  }

  function cumulativeScrollOffset(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.scrollTop  || 0;
      valueL += element.scrollLeft || 0;
      element = element.parentNode;
    } while (element);
    return new Element.Offset(valueL, valueT);
  }

  function viewportOffset(forElement) {
    var valueT = 0, valueL = 0, docBody = document.body;

    var element = forElement;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      if (element.offsetParent == docBody &&
        Element.getStyle(element, 'position') == 'absolute') break;
    } while (element = element.offsetParent);

    element = forElement;
    do {
      if (element != docBody) {
        valueT -= element.scrollTop  || 0;
        valueL -= element.scrollLeft || 0;
      }
    } while (element = element.parentNode);
    return new Element.Offset(valueL, valueT);
  }

  function absolutize(element) {
    element = $(element);

    if (Element.getStyle(element, 'position') === 'absolute') {
      return element;
    }

    var offsetParent = getOffsetParent(element);
    var eOffset = element.viewportOffset(),
     pOffset = offsetParent.viewportOffset();

    var offset = eOffset.relativeTo(pOffset);
    var layout = element.getLayout();

    element.store('prototype_absolutize_original_styles', {
      left:   element.getStyle('left'),
      top:    element.getStyle('top'),
      width:  element.getStyle('width'),
      height: element.getStyle('height')
    });

    element.setStyle({
      position: 'absolute',
      top:    offset.top + 'px',
      left:   offset.left + 'px',
      width:  layout.get('width') + 'px',
      height: layout.get('height') + 'px'
    });

    return element;
  }

  function relativize(element) {
    element = $(element);
    if (Element.getStyle(element, 'position') === 'relative') {
      return element;
    }

    var originalStyles =
     element.retrieve('prototype_absolutize_original_styles');

    if (originalStyles) element.setStyle(originalStyles);
    return element;
  }

  Element.addMethods({
    getLayout:              getLayout,
    measure:                measure,
    getDimensions:          getDimensions,
    getOffsetParent:        getOffsetParent,
    cumulativeOffset:       cumulativeOffset,
    positionedOffset:       positionedOffset,
    cumulativeScrollOffset: cumulativeScrollOffset,
    viewportOffset:         viewportOffset,
    absolutize:             absolutize,
    relativize:             relativize
  });

  function isBody(element) {
    return element.nodeName.toUpperCase() === 'BODY';
  }

  function isDetached(element) {
    return element !== document.body &&
     !Element.descendantOf(element, document.body);
  }

  if ('getBoundingClientRect' in document.documentElement) {
    Element.addMethods({
      viewportOffset: function(element) {
        element = $(element);
        if (isDetached(element)) return new Element.Offset(0, 0);

        var rect  = element.getBoundingClientRect(),
         docEl = document.documentElement;
        return new Element.Offset(rect.left - docEl.clientLeft,
         rect.top - docEl.clientTop);
      },

      positionedOffset: function(element) {
        element = $(element);
        var parent = element.getOffsetParent();
        if (isDetached(element)) return new Element.Offset(0, 0);

        if (element.offsetParent &&
         element.offsetParent.nodeName.toUpperCase() === 'HTML') {
          return positionedOffset(element);
        }

        var eOffset = element.viewportOffset(),
         pOffset = isBody(parent) ? viewportOffset(parent) :
          parent.viewportOffset();
        var retOffset = eOffset.relativeTo(pOffset);

        var layout = element.getLayout();
        var top  = retOffset.top  - layout.get('margin-top');
        var left = retOffset.left - layout.get('margin-left');

        return new Element.Offset(left, top);
      }
    });
  }
})();
window.$$ = function() {
  var expression = $A(arguments).join(', ');
  return Prototype.Selector.select(expression, document);
};

Prototype.Selector = (function() {

  function select() {
    throw new Error('Method "Prototype.Selector.select" must be defined.');
  }

  function match() {
    throw new Error('Method "Prototype.Selector.match" must be defined.');
  }

  function find(elements, expression, index) {
    index = index || 0;
    var match = Prototype.Selector.match, length = elements.length, matchIndex = 0, i;

    for (i = 0; i < length; i++) {
      if (match(elements[i], expression) && index == matchIndex++) {
        return Element.extend(elements[i]);
      }
    }
  }

  function extendElements(elements) {
    for (var i = 0, length = elements.length; i < length; i++) {
      Element.extend(elements[i]);
    }
    return elements;
  }


  var K = Prototype.K;

  return {
    select: select,
    match: match,
    find: find,
    extendElements: (Element.extend === K) ? K : extendElements,
    extendElement: Element.extend
  };
})();
Prototype._original_property = window.Sizzle;
/*!
 * Sizzle CSS Selector Engine - v1.0
 *  Copyright 2009, The Dojo Foundation
 *  Released under the MIT, BSD, and GPL Licenses.
 *  More information: http://sizzlejs.com/
 */
(function(){

var chunker = /((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^[\]]*\]|['"][^'"]*['"]|[^[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?((?:.|\r|\n)*)/g,
  done = 0,
  toString = Object.prototype.toString,
  hasDuplicate = false,
  baseHasDuplicate = true;

[0, 0].sort(function(){
  baseHasDuplicate = false;
  return 0;
});

var Sizzle = function(selector, context, results, seed) {
  results = results || [];
  var origContext = context = context || document;

  if ( context.nodeType !== 1 && context.nodeType !== 9 ) {
    return [];
  }

  if ( !selector || typeof selector !== "string" ) {
    return results;
  }

  var parts = [], m, set, checkSet, check, mode, extra, prune = true, contextXML = isXML(context),
    soFar = selector;

  while ( (chunker.exec(""), m = chunker.exec(soFar)) !== null ) {
    soFar = m[3];

    parts.push( m[1] );

    if ( m[2] ) {
      extra = m[3];
      break;
    }
  }

  if ( parts.length > 1 && origPOS.exec( selector ) ) {
    if ( parts.length === 2 && Expr.relative[ parts[0] ] ) {
      set = posProcess( parts[0] + parts[1], context );
    } else {
      set = Expr.relative[ parts[0] ] ?
        [ context ] :
        Sizzle( parts.shift(), context );

      while ( parts.length ) {
        selector = parts.shift();

        if ( Expr.relative[ selector ] )
          selector += parts.shift();

        set = posProcess( selector, set );
      }
    }
  } else {
    if ( !seed && parts.length > 1 && context.nodeType === 9 && !contextXML &&
        Expr.match.ID.test(parts[0]) && !Expr.match.ID.test(parts[parts.length - 1]) ) {
      var ret = Sizzle.find( parts.shift(), context, contextXML );
      context = ret.expr ? Sizzle.filter( ret.expr, ret.set )[0] : ret.set[0];
    }

    if ( context ) {
      var ret = seed ?
        { expr: parts.pop(), set: makeArray(seed) } :
        Sizzle.find( parts.pop(), parts.length === 1 && (parts[0] === "~" || parts[0] === "+") && context.parentNode ? context.parentNode : context, contextXML );
      set = ret.expr ? Sizzle.filter( ret.expr, ret.set ) : ret.set;

      if ( parts.length > 0 ) {
        checkSet = makeArray(set);
      } else {
        prune = false;
      }

      while ( parts.length ) {
        var cur = parts.pop(), pop = cur;

        if ( !Expr.relative[ cur ] ) {
          cur = "";
        } else {
          pop = parts.pop();
        }

        if ( pop == null ) {
          pop = context;
        }

        Expr.relative[ cur ]( checkSet, pop, contextXML );
      }
    } else {
      checkSet = parts = [];
    }
  }

  if ( !checkSet ) {
    checkSet = set;
  }

  if ( !checkSet ) {
    throw "Syntax error, unrecognized expression: " + (cur || selector);
  }

  if ( toString.call(checkSet) === "[object Array]" ) {
    if ( !prune ) {
      results.push.apply( results, checkSet );
    } else if ( context && context.nodeType === 1 ) {
      for ( var i = 0; checkSet[i] != null; i++ ) {
        if ( checkSet[i] && (checkSet[i] === true || checkSet[i].nodeType === 1 && contains(context, checkSet[i])) ) {
          results.push( set[i] );
        }
      }
    } else {
      for ( var i = 0; checkSet[i] != null; i++ ) {
        if ( checkSet[i] && checkSet[i].nodeType === 1 ) {
          results.push( set[i] );
        }
      }
    }
  } else {
    makeArray( checkSet, results );
  }

  if ( extra ) {
    Sizzle( extra, origContext, results, seed );
    Sizzle.uniqueSort( results );
  }

  return results;
};

Sizzle.uniqueSort = function(results){
  if ( sortOrder ) {
    hasDuplicate = baseHasDuplicate;
    results.sort(sortOrder);

    if ( hasDuplicate ) {
      for ( var i = 1; i < results.length; i++ ) {
        if ( results[i] === results[i-1] ) {
          results.splice(i--, 1);
        }
      }
    }
  }

  return results;
};

Sizzle.matches = function(expr, set){
  return Sizzle(expr, null, null, set);
};

Sizzle.find = function(expr, context, isXML){
  var set, match;

  if ( !expr ) {
    return [];
  }

  for ( var i = 0, l = Expr.order.length; i < l; i++ ) {
    var type = Expr.order[i], match;

    if ( (match = Expr.leftMatch[ type ].exec( expr )) ) {
      var left = match[1];
      match.splice(1,1);

      if ( left.substr( left.length - 1 ) !== "\\" ) {
        match[1] = (match[1] || "").replace(/\\/g, "");
        set = Expr.find[ type ]( match, context, isXML );
        if ( set != null ) {
          expr = expr.replace( Expr.match[ type ], "" );
          break;
        }
      }
    }
  }

  if ( !set ) {
    set = context.getElementsByTagName("*");
  }

  return {set: set, expr: expr};
};

Sizzle.filter = function(expr, set, inplace, not){
  var old = expr, result = [], curLoop = set, match, anyFound,
    isXMLFilter = set && set[0] && isXML(set[0]);

  while ( expr && set.length ) {
    for ( var type in Expr.filter ) {
      if ( (match = Expr.match[ type ].exec( expr )) != null ) {
        var filter = Expr.filter[ type ], found, item;
        anyFound = false;

        if ( curLoop == result ) {
          result = [];
        }

        if ( Expr.preFilter[ type ] ) {
          match = Expr.preFilter[ type ]( match, curLoop, inplace, result, not, isXMLFilter );

          if ( !match ) {
            anyFound = found = true;
          } else if ( match === true ) {
            continue;
          }
        }

        if ( match ) {
          for ( var i = 0; (item = curLoop[i]) != null; i++ ) {
            if ( item ) {
              found = filter( item, match, i, curLoop );
              var pass = not ^ !!found;

              if ( inplace && found != null ) {
                if ( pass ) {
                  anyFound = true;
                } else {
                  curLoop[i] = false;
                }
              } else if ( pass ) {
                result.push( item );
                anyFound = true;
              }
            }
          }
        }

        if ( found !== undefined ) {
          if ( !inplace ) {
            curLoop = result;
          }

          expr = expr.replace( Expr.match[ type ], "" );

          if ( !anyFound ) {
            return [];
          }

          break;
        }
      }
    }

    if ( expr == old ) {
      if ( anyFound == null ) {
        throw "Syntax error, unrecognized expression: " + expr;
      } else {
        break;
      }
    }

    old = expr;
  }

  return curLoop;
};

var Expr = Sizzle.selectors = {
  order: [ "ID", "NAME", "TAG" ],
  match: {
    ID: /#((?:[\w\u00c0-\uFFFF-]|\\.)+)/,
    CLASS: /\.((?:[\w\u00c0-\uFFFF-]|\\.)+)/,
    NAME: /\[name=['"]*((?:[\w\u00c0-\uFFFF-]|\\.)+)['"]*\]/,
    ATTR: /\[\s*((?:[\w\u00c0-\uFFFF-]|\\.)+)\s*(?:(\S?=)\s*(['"]*)(.*?)\3|)\s*\]/,
    TAG: /^((?:[\w\u00c0-\uFFFF\*-]|\\.)+)/,
    CHILD: /:(only|nth|last|first)-child(?:\((even|odd|[\dn+-]*)\))?/,
    POS: /:(nth|eq|gt|lt|first|last|even|odd)(?:\((\d*)\))?(?=[^-]|$)/,
    PSEUDO: /:((?:[\w\u00c0-\uFFFF-]|\\.)+)(?:\((['"]*)((?:\([^\)]+\)|[^\2\(\)]*)+)\2\))?/
  },
  leftMatch: {},
  attrMap: {
    "class": "className",
    "for": "htmlFor"
  },
  attrHandle: {
    href: function(elem){
      return elem.getAttribute("href");
    }
  },
  relative: {
    "+": function(checkSet, part, isXML){
      var isPartStr = typeof part === "string",
        isTag = isPartStr && !/\W/.test(part),
        isPartStrNotTag = isPartStr && !isTag;

      if ( isTag && !isXML ) {
        part = part.toUpperCase();
      }

      for ( var i = 0, l = checkSet.length, elem; i < l; i++ ) {
        if ( (elem = checkSet[i]) ) {
          while ( (elem = elem.previousSibling) && elem.nodeType !== 1 ) {}

          checkSet[i] = isPartStrNotTag || elem && elem.nodeName === part ?
            elem || false :
            elem === part;
        }
      }

      if ( isPartStrNotTag ) {
        Sizzle.filter( part, checkSet, true );
      }
    },
    ">": function(checkSet, part, isXML){
      var isPartStr = typeof part === "string";

      if ( isPartStr && !/\W/.test(part) ) {
        part = isXML ? part : part.toUpperCase();

        for ( var i = 0, l = checkSet.length; i < l; i++ ) {
          var elem = checkSet[i];
          if ( elem ) {
            var parent = elem.parentNode;
            checkSet[i] = parent.nodeName === part ? parent : false;
          }
        }
      } else {
        for ( var i = 0, l = checkSet.length; i < l; i++ ) {
          var elem = checkSet[i];
          if ( elem ) {
            checkSet[i] = isPartStr ?
              elem.parentNode :
              elem.parentNode === part;
          }
        }

        if ( isPartStr ) {
          Sizzle.filter( part, checkSet, true );
        }
      }
    },
    "": function(checkSet, part, isXML){
      var doneName = done++, checkFn = dirCheck;

      if ( !/\W/.test(part) ) {
        var nodeCheck = part = isXML ? part : part.toUpperCase();
        checkFn = dirNodeCheck;
      }

      checkFn("parentNode", part, doneName, checkSet, nodeCheck, isXML);
    },
    "~": function(checkSet, part, isXML){
      var doneName = done++, checkFn = dirCheck;

      if ( typeof part === "string" && !/\W/.test(part) ) {
        var nodeCheck = part = isXML ? part : part.toUpperCase();
        checkFn = dirNodeCheck;
      }

      checkFn("previousSibling", part, doneName, checkSet, nodeCheck, isXML);
    }
  },
  find: {
    ID: function(match, context, isXML){
      if ( typeof context.getElementById !== "undefined" && !isXML ) {
        var m = context.getElementById(match[1]);
        return m ? [m] : [];
      }
    },
    NAME: function(match, context, isXML){
      if ( typeof context.getElementsByName !== "undefined" ) {
        var ret = [], results = context.getElementsByName(match[1]);

        for ( var i = 0, l = results.length; i < l; i++ ) {
          if ( results[i].getAttribute("name") === match[1] ) {
            ret.push( results[i] );
          }
        }

        return ret.length === 0 ? null : ret;
      }
    },
    TAG: function(match, context){
      return context.getElementsByTagName(match[1]);
    }
  },
  preFilter: {
    CLASS: function(match, curLoop, inplace, result, not, isXML){
      match = " " + match[1].replace(/\\/g, "") + " ";

      if ( isXML ) {
        return match;
      }

      for ( var i = 0, elem; (elem = curLoop[i]) != null; i++ ) {
        if ( elem ) {
          if ( not ^ (elem.className && (" " + elem.className + " ").indexOf(match) >= 0) ) {
            if ( !inplace )
              result.push( elem );
          } else if ( inplace ) {
            curLoop[i] = false;
          }
        }
      }

      return false;
    },
    ID: function(match){
      return match[1].replace(/\\/g, "");
    },
    TAG: function(match, curLoop){
      for ( var i = 0; curLoop[i] === false; i++ ){}
      return curLoop[i] && isXML(curLoop[i]) ? match[1] : match[1].toUpperCase();
    },
    CHILD: function(match){
      if ( match[1] == "nth" ) {
        var test = /(-?)(\d*)n((?:\+|-)?\d*)/.exec(
          match[2] == "even" && "2n" || match[2] == "odd" && "2n+1" ||
          !/\D/.test( match[2] ) && "0n+" + match[2] || match[2]);

        match[2] = (test[1] + (test[2] || 1)) - 0;
        match[3] = test[3] - 0;
      }

      match[0] = done++;

      return match;
    },
    ATTR: function(match, curLoop, inplace, result, not, isXML){
      var name = match[1].replace(/\\/g, "");

      if ( !isXML && Expr.attrMap[name] ) {
        match[1] = Expr.attrMap[name];
      }

      if ( match[2] === "~=" ) {
        match[4] = " " + match[4] + " ";
      }

      return match;
    },
    PSEUDO: function(match, curLoop, inplace, result, not){
      if ( match[1] === "not" ) {
        if ( ( chunker.exec(match[3]) || "" ).length > 1 || /^\w/.test(match[3]) ) {
          match[3] = Sizzle(match[3], null, null, curLoop);
        } else {
          var ret = Sizzle.filter(match[3], curLoop, inplace, true ^ not);
          if ( !inplace ) {
            result.push.apply( result, ret );
          }
          return false;
        }
      } else if ( Expr.match.POS.test( match[0] ) || Expr.match.CHILD.test( match[0] ) ) {
        return true;
      }

      return match;
    },
    POS: function(match){
      match.unshift( true );
      return match;
    }
  },
  filters: {
    enabled: function(elem){
      return elem.disabled === false && elem.type !== "hidden";
    },
    disabled: function(elem){
      return elem.disabled === true;
    },
    checked: function(elem){
      return elem.checked === true;
    },
    selected: function(elem){
      elem.parentNode.selectedIndex;
      return elem.selected === true;
    },
    parent: function(elem){
      return !!elem.firstChild;
    },
    empty: function(elem){
      return !elem.firstChild;
    },
    has: function(elem, i, match){
      return !!Sizzle( match[3], elem ).length;
    },
    header: function(elem){
      return /h\d/i.test( elem.nodeName );
    },
    text: function(elem){
      return "text" === elem.type;
    },
    radio: function(elem){
      return "radio" === elem.type;
    },
    checkbox: function(elem){
      return "checkbox" === elem.type;
    },
    file: function(elem){
      return "file" === elem.type;
    },
    password: function(elem){
      return "password" === elem.type;
    },
    submit: function(elem){
      return "submit" === elem.type;
    },
    image: function(elem){
      return "image" === elem.type;
    },
    reset: function(elem){
      return "reset" === elem.type;
    },
    button: function(elem){
      return "button" === elem.type || elem.nodeName.toUpperCase() === "BUTTON";
    },
    input: function(elem){
      return /input|select|textarea|button/i.test(elem.nodeName);
    }
  },
  setFilters: {
    first: function(elem, i){
      return i === 0;
    },
    last: function(elem, i, match, array){
      return i === array.length - 1;
    },
    even: function(elem, i){
      return i % 2 === 0;
    },
    odd: function(elem, i){
      return i % 2 === 1;
    },
    lt: function(elem, i, match){
      return i < match[3] - 0;
    },
    gt: function(elem, i, match){
      return i > match[3] - 0;
    },
    nth: function(elem, i, match){
      return match[3] - 0 == i;
    },
    eq: function(elem, i, match){
      return match[3] - 0 == i;
    }
  },
  filter: {
    PSEUDO: function(elem, match, i, array){
      var name = match[1], filter = Expr.filters[ name ];

      if ( filter ) {
        return filter( elem, i, match, array );
      } else if ( name === "contains" ) {
        return (elem.textContent || elem.innerText || "").indexOf(match[3]) >= 0;
      } else if ( name === "not" ) {
        var not = match[3];

        for ( var i = 0, l = not.length; i < l; i++ ) {
          if ( not[i] === elem ) {
            return false;
          }
        }

        return true;
      }
    },
    CHILD: function(elem, match){
      var type = match[1], node = elem;
      switch (type) {
        case 'only':
        case 'first':
          while ( (node = node.previousSibling) )  {
            if ( node.nodeType === 1 ) return false;
          }
          if ( type == 'first') return true;
          node = elem;
        case 'last':
          while ( (node = node.nextSibling) )  {
            if ( node.nodeType === 1 ) return false;
          }
          return true;
        case 'nth':
          var first = match[2], last = match[3];

          if ( first == 1 && last == 0 ) {
            return true;
          }

          var doneName = match[0],
            parent = elem.parentNode;

          if ( parent && (parent.sizcache !== doneName || !elem.nodeIndex) ) {
            var count = 0;
            for ( node = parent.firstChild; node; node = node.nextSibling ) {
              if ( node.nodeType === 1 ) {
                node.nodeIndex = ++count;
              }
            }
            parent.sizcache = doneName;
          }

          var diff = elem.nodeIndex - last;
          if ( first == 0 ) {
            return diff == 0;
          } else {
            return ( diff % first == 0 && diff / first >= 0 );
          }
      }
    },
    ID: function(elem, match){
      return elem.nodeType === 1 && elem.getAttribute("id") === match;
    },
    TAG: function(elem, match){
      return (match === "*" && elem.nodeType === 1) || elem.nodeName === match;
    },
    CLASS: function(elem, match){
      return (" " + (elem.className || elem.getAttribute("class")) + " ")
        .indexOf( match ) > -1;
    },
    ATTR: function(elem, match){
      var name = match[1],
        result = Expr.attrHandle[ name ] ?
          Expr.attrHandle[ name ]( elem ) :
          elem[ name ] != null ?
            elem[ name ] :
            elem.getAttribute( name ),
        value = result + "",
        type = match[2],
        check = match[4];

      return result == null ?
        type === "!=" :
        type === "=" ?
        value === check :
        type === "*=" ?
        value.indexOf(check) >= 0 :
        type === "~=" ?
        (" " + value + " ").indexOf(check) >= 0 :
        !check ?
        value && result !== false :
        type === "!=" ?
        value != check :
        type === "^=" ?
        value.indexOf(check) === 0 :
        type === "$=" ?
        value.substr(value.length - check.length) === check :
        type === "|=" ?
        value === check || value.substr(0, check.length + 1) === check + "-" :
        false;
    },
    POS: function(elem, match, i, array){
      var name = match[2], filter = Expr.setFilters[ name ];

      if ( filter ) {
        return filter( elem, i, match, array );
      }
    }
  }
};

var origPOS = Expr.match.POS;

for ( var type in Expr.match ) {
  Expr.match[ type ] = new RegExp( Expr.match[ type ].source + /(?![^\[]*\])(?![^\(]*\))/.source );
  Expr.leftMatch[ type ] = new RegExp( /(^(?:.|\r|\n)*?)/.source + Expr.match[ type ].source );
}

var makeArray = function(array, results) {
  array = Array.prototype.slice.call( array, 0 );

  if ( results ) {
    results.push.apply( results, array );
    return results;
  }

  return array;
};

try {
  Array.prototype.slice.call( document.documentElement.childNodes, 0 );

} catch(e){
  makeArray = function(array, results) {
    var ret = results || [];

    if ( toString.call(array) === "[object Array]" ) {
      Array.prototype.push.apply( ret, array );
    } else {
      if ( typeof array.length === "number" ) {
        for ( var i = 0, l = array.length; i < l; i++ ) {
          ret.push( array[i] );
        }
      } else {
        for ( var i = 0; array[i]; i++ ) {
          ret.push( array[i] );
        }
      }
    }

    return ret;
  };
}

var sortOrder;

if ( document.documentElement.compareDocumentPosition ) {
  sortOrder = function( a, b ) {
    if ( !a.compareDocumentPosition || !b.compareDocumentPosition ) {
      if ( a == b ) {
        hasDuplicate = true;
      }
      return 0;
    }

    var ret = a.compareDocumentPosition(b) & 4 ? -1 : a === b ? 0 : 1;
    if ( ret === 0 ) {
      hasDuplicate = true;
    }
    return ret;
  };
} else if ( "sourceIndex" in document.documentElement ) {
  sortOrder = function( a, b ) {
    if ( !a.sourceIndex || !b.sourceIndex ) {
      if ( a == b ) {
        hasDuplicate = true;
      }
      return 0;
    }

    var ret = a.sourceIndex - b.sourceIndex;
    if ( ret === 0 ) {
      hasDuplicate = true;
    }
    return ret;
  };
} else if ( document.createRange ) {
  sortOrder = function( a, b ) {
    if ( !a.ownerDocument || !b.ownerDocument ) {
      if ( a == b ) {
        hasDuplicate = true;
      }
      return 0;
    }

    var aRange = a.ownerDocument.createRange(), bRange = b.ownerDocument.createRange();
    aRange.setStart(a, 0);
    aRange.setEnd(a, 0);
    bRange.setStart(b, 0);
    bRange.setEnd(b, 0);
    var ret = aRange.compareBoundaryPoints(Range.START_TO_END, bRange);
    if ( ret === 0 ) {
      hasDuplicate = true;
    }
    return ret;
  };
}

(function(){
  var form = document.createElement("div"),
    id = "script" + (new Date).getTime();
  form.innerHTML = "<a name='" + id + "'/>";

  var root = document.documentElement;
  root.insertBefore( form, root.firstChild );

  if ( !!document.getElementById( id ) ) {
    Expr.find.ID = function(match, context, isXML){
      if ( typeof context.getElementById !== "undefined" && !isXML ) {
        var m = context.getElementById(match[1]);
        return m ? m.id === match[1] || typeof m.getAttributeNode !== "undefined" && m.getAttributeNode("id").nodeValue === match[1] ? [m] : undefined : [];
      }
    };

    Expr.filter.ID = function(elem, match){
      var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");
      return elem.nodeType === 1 && node && node.nodeValue === match;
    };
  }

  root.removeChild( form );
  root = form = null; // release memory in IE
})();

(function(){

  var div = document.createElement("div");
  div.appendChild( document.createComment("") );

  if ( div.getElementsByTagName("*").length > 0 ) {
    Expr.find.TAG = function(match, context){
      var results = context.getElementsByTagName(match[1]);

      if ( match[1] === "*" ) {
        var tmp = [];

        for ( var i = 0; results[i]; i++ ) {
          if ( results[i].nodeType === 1 ) {
            tmp.push( results[i] );
          }
        }

        results = tmp;
      }

      return results;
    };
  }

  div.innerHTML = "<a href='#'></a>";
  if ( div.firstChild && typeof div.firstChild.getAttribute !== "undefined" &&
      div.firstChild.getAttribute("href") !== "#" ) {
    Expr.attrHandle.href = function(elem){
      return elem.getAttribute("href", 2);
    };
  }

  div = null; // release memory in IE
})();

if ( document.querySelectorAll ) (function(){
  var oldSizzle = Sizzle, div = document.createElement("div");
  div.innerHTML = "<p class='TEST'></p>";

  if ( div.querySelectorAll && div.querySelectorAll(".TEST").length === 0 ) {
    return;
  }

  Sizzle = function(query, context, extra, seed){
    context = context || document;

    if ( !seed && context.nodeType === 9 && !isXML(context) ) {
      try {
        return makeArray( context.querySelectorAll(query), extra );
      } catch(e){}
    }

    return oldSizzle(query, context, extra, seed);
  };

  for ( var prop in oldSizzle ) {
    Sizzle[ prop ] = oldSizzle[ prop ];
  }

  div = null; // release memory in IE
})();

if ( document.getElementsByClassName && document.documentElement.getElementsByClassName ) (function(){
  var div = document.createElement("div");
  div.innerHTML = "<div class='test e'></div><div class='test'></div>";

  if ( div.getElementsByClassName("e").length === 0 )
    return;

  div.lastChild.className = "e";

  if ( div.getElementsByClassName("e").length === 1 )
    return;

  Expr.order.splice(1, 0, "CLASS");
  Expr.find.CLASS = function(match, context, isXML) {
    if ( typeof context.getElementsByClassName !== "undefined" && !isXML ) {
      return context.getElementsByClassName(match[1]);
    }
  };

  div = null; // release memory in IE
})();

function dirNodeCheck( dir, cur, doneName, checkSet, nodeCheck, isXML ) {
  var sibDir = dir == "previousSibling" && !isXML;
  for ( var i = 0, l = checkSet.length; i < l; i++ ) {
    var elem = checkSet[i];
    if ( elem ) {
      if ( sibDir && elem.nodeType === 1 ){
        elem.sizcache = doneName;
        elem.sizset = i;
      }
      elem = elem[dir];
      var match = false;

      while ( elem ) {
        if ( elem.sizcache === doneName ) {
          match = checkSet[elem.sizset];
          break;
        }

        if ( elem.nodeType === 1 && !isXML ){
          elem.sizcache = doneName;
          elem.sizset = i;
        }

        if ( elem.nodeName === cur ) {
          match = elem;
          break;
        }

        elem = elem[dir];
      }

      checkSet[i] = match;
    }
  }
}

function dirCheck( dir, cur, doneName, checkSet, nodeCheck, isXML ) {
  var sibDir = dir == "previousSibling" && !isXML;
  for ( var i = 0, l = checkSet.length; i < l; i++ ) {
    var elem = checkSet[i];
    if ( elem ) {
      if ( sibDir && elem.nodeType === 1 ) {
        elem.sizcache = doneName;
        elem.sizset = i;
      }
      elem = elem[dir];
      var match = false;

      while ( elem ) {
        if ( elem.sizcache === doneName ) {
          match = checkSet[elem.sizset];
          break;
        }

        if ( elem.nodeType === 1 ) {
          if ( !isXML ) {
            elem.sizcache = doneName;
            elem.sizset = i;
          }
          if ( typeof cur !== "string" ) {
            if ( elem === cur ) {
              match = true;
              break;
            }

          } else if ( Sizzle.filter( cur, [elem] ).length > 0 ) {
            match = elem;
            break;
          }
        }

        elem = elem[dir];
      }

      checkSet[i] = match;
    }
  }
}

var contains = document.compareDocumentPosition ?  function(a, b){
  return a.compareDocumentPosition(b) & 16;
} : function(a, b){
  return a !== b && (a.contains ? a.contains(b) : true);
};

var isXML = function(elem){
  return elem.nodeType === 9 && elem.documentElement.nodeName !== "HTML" ||
    !!elem.ownerDocument && elem.ownerDocument.documentElement.nodeName !== "HTML";
};

var posProcess = function(selector, context){
  var tmpSet = [], later = "", match,
    root = context.nodeType ? [context] : context;

  while ( (match = Expr.match.PSEUDO.exec( selector )) ) {
    later += match[0];
    selector = selector.replace( Expr.match.PSEUDO, "" );
  }

  selector = Expr.relative[selector] ? selector + "*" : selector;

  for ( var i = 0, l = root.length; i < l; i++ ) {
    Sizzle( selector, root[i], tmpSet );
  }

  return Sizzle.filter( later, tmpSet );
};


window.Sizzle = Sizzle;

})();

;(function(engine) {
  var extendElements = Prototype.Selector.extendElements;

  function select(selector, scope) {
    return extendElements(engine(selector, scope || document));
  }

  function match(element, selector) {
    return engine.matches(selector, [element]).length == 1;
  }

  Prototype.Selector.engine = engine;
  Prototype.Selector.select = select;
  Prototype.Selector.match = match;
})(Sizzle);

window.Sizzle = Prototype._original_property;
delete Prototype._original_property;

var Form = {
  reset: function(form) {
    form = $(form);
    form.reset();
    return form;
  },

  serializeElements: function(elements, options) {
    if (typeof options != 'object') options = { hash: !!options };
    else if (Object.isUndefined(options.hash)) options.hash = true;
    var key, value, submitted = false, submit = options.submit;

    var data = elements.inject({ }, function(result, element) {
      if (!element.disabled && element.name) {
        key = element.name; value = $(element).getValue();
        if (value != null && element.type != 'file' && (element.type != 'submit' || (!submitted &&
            submit !== false && (!submit || key == submit) && (submitted = true)))) {
          if (key in result) {
            if (!Object.isArray(result[key])) result[key] = [result[key]];
            result[key].push(value);
          }
          else result[key] = value;
        }
      }
      return result;
    });

    return options.hash ? data : Object.toQueryString(data);
  }
};

Form.Methods = {
  serialize: function(form, options) {
    return Form.serializeElements(Form.getElements(form), options);
  },

  getElements: function(form) {
    var elements = $(form).getElementsByTagName('*'),
        element,
        arr = [ ],
        serializers = Form.Element.Serializers;
    for (var i = 0; element = elements[i]; i++) {
      arr.push(element);
    }
    return arr.inject([], function(elements, child) {
      if (serializers[child.tagName.toLowerCase()])
        elements.push(Element.extend(child));
      return elements;
    })
  },

  getInputs: function(form, typeName, name) {
    form = $(form);
    var inputs = form.getElementsByTagName('input');

    if (!typeName && !name) return $A(inputs).map(Element.extend);

    for (var i = 0, matchingInputs = [], length = inputs.length; i < length; i++) {
      var input = inputs[i];
      if ((typeName && input.type != typeName) || (name && input.name != name))
        continue;
      matchingInputs.push(Element.extend(input));
    }

    return matchingInputs;
  },

  disable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('disable');
    return form;
  },

  enable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('enable');
    return form;
  },

  findFirstElement: function(form) {
    var elements = $(form).getElements().findAll(function(element) {
      return 'hidden' != element.type && !element.disabled;
    });
    var firstByIndex = elements.findAll(function(element) {
      return element.hasAttribute('tabIndex') && element.tabIndex >= 0;
    }).sortBy(function(element) { return element.tabIndex }).first();

    return firstByIndex ? firstByIndex : elements.find(function(element) {
      return /^(?:input|select|textarea)$/i.test(element.tagName);
    });
  },

  focusFirstElement: function(form) {
    form = $(form);
    form.findFirstElement().activate();
    return form;
  },

  request: function(form, options) {
    form = $(form), options = Object.clone(options || { });

    var params = options.parameters, action = form.readAttribute('action') || '';
    if (action.blank()) action = window.location.href;
    options.parameters = form.serialize(true);

    if (params) {
      if (Object.isString(params)) params = params.toQueryParams();
      Object.extend(options.parameters, params);
    }

    if (form.hasAttribute('method') && !options.method)
      options.method = form.method;

    return new Ajax.Request(action, options);
  }
};

/*--------------------------------------------------------------------------*/


Form.Element = {
  focus: function(element) {
    $(element).focus();
    return element;
  },

  select: function(element) {
    $(element).select();
    return element;
  }
};

Form.Element.Methods = {

  serialize: function(element) {
    element = $(element);
    if (!element.disabled && element.name) {
      var value = element.getValue();
      if (value != undefined) {
        var pair = { };
        pair[element.name] = value;
        return Object.toQueryString(pair);
      }
    }
    return '';
  },

  getValue: function(element) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    return Form.Element.Serializers[method](element);
  },

  setValue: function(element, value) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    Form.Element.Serializers[method](element, value);
    return element;
  },

  clear: function(element) {
    $(element).value = '';
    return element;
  },

  present: function(element) {
    return $(element).value != '';
  },

  activate: function(element) {
    element = $(element);
    try {
      element.focus();
      if (element.select && (element.tagName.toLowerCase() != 'input' ||
          !(/^(?:button|reset|submit)$/i.test(element.type))))
        element.select();
    } catch (e) { }
    return element;
  },

  disable: function(element) {
    element = $(element);
    element.disabled = true;
    return element;
  },

  enable: function(element) {
    element = $(element);
    element.disabled = false;
    return element;
  }
};

/*--------------------------------------------------------------------------*/

var Field = Form.Element;

var $F = Form.Element.Methods.getValue;

/*--------------------------------------------------------------------------*/

Form.Element.Serializers = {
  input: function(element, value) {
    switch (element.type.toLowerCase()) {
      case 'checkbox':
      case 'radio':
        return Form.Element.Serializers.inputSelector(element, value);
      default:
        return Form.Element.Serializers.textarea(element, value);
    }
  },

  inputSelector: function(element, value) {
    if (Object.isUndefined(value)) return element.checked ? element.value : null;
    else element.checked = !!value;
  },

  textarea: function(element, value) {
    if (Object.isUndefined(value)) return element.value;
    else element.value = value;
  },

  select: function(element, value) {
    if (Object.isUndefined(value))
      return this[element.type == 'select-one' ?
        'selectOne' : 'selectMany'](element);
    else {
      var opt, currentValue, single = !Object.isArray(value);
      for (var i = 0, length = element.length; i < length; i++) {
        opt = element.options[i];
        currentValue = this.optionValue(opt);
        if (single) {
          if (currentValue == value) {
            opt.selected = true;
            return;
          }
        }
        else opt.selected = value.include(currentValue);
      }
    }
  },

  selectOne: function(element) {
    var index = element.selectedIndex;
    return index >= 0 ? this.optionValue(element.options[index]) : null;
  },

  selectMany: function(element) {
    var values, length = element.length;
    if (!length) return null;

    for (var i = 0, values = []; i < length; i++) {
      var opt = element.options[i];
      if (opt.selected) values.push(this.optionValue(opt));
    }
    return values;
  },

  optionValue: function(opt) {
    return Element.extend(opt).hasAttribute('value') ? opt.value : opt.text;
  }
};

/*--------------------------------------------------------------------------*/


Abstract.TimedObserver = Class.create(PeriodicalExecuter, {
  initialize: function($super, element, frequency, callback) {
    $super(callback, frequency);
    this.element   = $(element);
    this.lastValue = this.getValue();
  },

  execute: function() {
    var value = this.getValue();
    if (Object.isString(this.lastValue) && Object.isString(value) ?
        this.lastValue != value : String(this.lastValue) != String(value)) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  }
});

Form.Element.Observer = Class.create(Abstract.TimedObserver, {
  getValue: function() {
    return Form.Element.getValue(this.element);
  }
});

Form.Observer = Class.create(Abstract.TimedObserver, {
  getValue: function() {
    return Form.serialize(this.element);
  }
});

/*--------------------------------------------------------------------------*/

Abstract.EventObserver = Class.create({
  initialize: function(element, callback) {
    this.element  = $(element);
    this.callback = callback;

    this.lastValue = this.getValue();
    if (this.element.tagName.toLowerCase() == 'form')
      this.registerFormCallbacks();
    else
      this.registerCallback(this.element);
  },

  onElementEvent: function() {
    var value = this.getValue();
    if (this.lastValue != value) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  },

  registerFormCallbacks: function() {
    Form.getElements(this.element).each(this.registerCallback, this);
  },

  registerCallback: function(element) {
    if (element.type) {
      switch (element.type.toLowerCase()) {
        case 'checkbox':
        case 'radio':
          Event.observe(element, 'click', this.onElementEvent.bind(this));
          break;
        default:
          Event.observe(element, 'change', this.onElementEvent.bind(this));
          break;
      }
    }
  }
});

Form.Element.EventObserver = Class.create(Abstract.EventObserver, {
  getValue: function() {
    return Form.Element.getValue(this.element);
  }
});

Form.EventObserver = Class.create(Abstract.EventObserver, {
  getValue: function() {
    return Form.serialize(this.element);
  }
});
(function() {

  var Event = {
    KEY_BACKSPACE: 8,
    KEY_TAB:       9,
    KEY_RETURN:   13,
    KEY_ESC:      27,
    KEY_LEFT:     37,
    KEY_UP:       38,
    KEY_RIGHT:    39,
    KEY_DOWN:     40,
    KEY_DELETE:   46,
    KEY_HOME:     36,
    KEY_END:      35,
    KEY_PAGEUP:   33,
    KEY_PAGEDOWN: 34,
    KEY_INSERT:   45,

    cache: {}
  };

  var docEl = document.documentElement;
  var MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED = 'onmouseenter' in docEl
    && 'onmouseleave' in docEl;

  var _isButton;
  if (Prototype.Browser.IE) {
    var buttonMap = { 0: 1, 1: 4, 2: 2 };
    _isButton = function(event, code) {
      return event.button === buttonMap[code];
    };
  } else if (Prototype.Browser.WebKit) {
    _isButton = function(event, code) {
      switch (code) {
        case 0: return event.which == 1 && !event.metaKey;
        case 1: return event.which == 1 && event.metaKey;
        default: return false;
      }
    };
  } else {
    _isButton = function(event, code) {
      return event.which ? (event.which === code + 1) : (event.button === code);
    };
  }

  function isLeftClick(event)   { return _isButton(event, 0) }

  function isMiddleClick(event) { return _isButton(event, 1) }

  function isRightClick(event)  { return _isButton(event, 2) }

  function element(event) {
    event = Event.extend(event);

    var node = event.target, type = event.type,
     currentTarget = event.currentTarget;

    if (currentTarget && currentTarget.tagName) {
      if (type === 'load' || type === 'error' ||
        (type === 'click' && currentTarget.tagName.toLowerCase() === 'input'
          && currentTarget.type === 'radio'))
            node = currentTarget;
    }

    if (node.nodeType == Node.TEXT_NODE)
      node = node.parentNode;

    return Element.extend(node);
  }

  function findElement(event, expression) {
    var element = Event.element(event);
    if (!expression) return element;
    while (element) {
      if (Object.isElement(element) && Prototype.Selector.match(element, expression)) {
        return Element.extend(element);
      }
      element = element.parentNode;
    }
  }

  function pointer(event) {
    return { x: pointerX(event), y: pointerY(event) };
  }

  function pointerX(event) {
    var docElement = document.documentElement,
     body = document.body || { scrollLeft: 0 };

    return event.pageX || (event.clientX +
      (docElement.scrollLeft || body.scrollLeft) -
      (docElement.clientLeft || 0));
  }

  function pointerY(event) {
    var docElement = document.documentElement,
     body = document.body || { scrollTop: 0 };

    return  event.pageY || (event.clientY +
       (docElement.scrollTop || body.scrollTop) -
       (docElement.clientTop || 0));
  }


  function stop(event) {
    Event.extend(event);
    event.preventDefault();
    event.stopPropagation();

    event.stopped = true;
  }

  Event.Methods = {
    isLeftClick: isLeftClick,
    isMiddleClick: isMiddleClick,
    isRightClick: isRightClick,

    element: element,
    findElement: findElement,

    pointer: pointer,
    pointerX: pointerX,
    pointerY: pointerY,

    stop: stop
  };


  var methods = Object.keys(Event.Methods).inject({ }, function(m, name) {
    m[name] = Event.Methods[name].methodize();
    return m;
  });

  if (Prototype.Browser.IE) {
    function _relatedTarget(event) {
      var element;
      switch (event.type) {
        case 'mouseover': element = event.fromElement; break;
        case 'mouseout':  element = event.toElement;   break;
        default: return null;
      }
      return Element.extend(element);
    }

    Object.extend(methods, {
      stopPropagation: function() { this.cancelBubble = true },
      preventDefault:  function() { this.returnValue = false },
      inspect: function() { return '[object Event]' }
    });

    Event.extend = function(event, element) {
      if (!event) return false;
      if (event._extendedByPrototype) return event;

      event._extendedByPrototype = Prototype.emptyFunction;
      var pointer = Event.pointer(event);

      Object.extend(event, {
        target: event.srcElement || element,
        relatedTarget: _relatedTarget(event),
        pageX:  pointer.x,
        pageY:  pointer.y
      });

      return Object.extend(event, methods);
    };
  } else {
    Event.prototype = window.Event.prototype || document.createEvent('HTMLEvents').__proto__;
    Object.extend(Event.prototype, methods);
    Event.extend = Prototype.K;
  }

  function _createResponder(element, eventName, handler) {
    var registry = Element.retrieve(element, 'prototype_event_registry');

    if (Object.isUndefined(registry)) {
      CACHE.push(element);
      registry = Element.retrieve(element, 'prototype_event_registry', $H());
    }

    var respondersForEvent = registry.get(eventName);
    if (Object.isUndefined(respondersForEvent)) {
      respondersForEvent = [];
      registry.set(eventName, respondersForEvent);
    }

    if (respondersForEvent.pluck('handler').include(handler)) return false;

    var responder;
    if (eventName.include(":")) {
      responder = function(event) {
        if (Object.isUndefined(event.eventName))
          return false;

        if (event.eventName !== eventName)
          return false;

        Event.extend(event, element);
        handler.call(element, event);
      };
    } else {
      if (!MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED &&
       (eventName === "mouseenter" || eventName === "mouseleave")) {
        if (eventName === "mouseenter" || eventName === "mouseleave") {
          responder = function(event) {
            Event.extend(event, element);

            var parent = event.relatedTarget;
            while (parent && parent !== element) {
              try { parent = parent.parentNode; }
              catch(e) { parent = element; }
            }

            if (parent === element) return;

            handler.call(element, event);
          };
        }
      } else {
        responder = function(event) {
          Event.extend(event, element);
          handler.call(element, event);
        };
      }
    }

    responder.handler = handler;
    respondersForEvent.push(responder);
    return responder;
  }

  function _destroyCache() {
    for (var i = 0, length = CACHE.length; i < length; i++) {
      Event.stopObserving(CACHE[i]);
      CACHE[i] = null;
    }
  }

  var CACHE = [];

  if (Prototype.Browser.IE)
    window.attachEvent('onunload', _destroyCache);

  if (Prototype.Browser.WebKit)
    window.addEventListener('unload', Prototype.emptyFunction, false);


  var _getDOMEventName = Prototype.K,
      translations = { mouseenter: "mouseover", mouseleave: "mouseout" };

  if (!MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED) {
    _getDOMEventName = function(eventName) {
      return (translations[eventName] || eventName);
    };
  }

  function observe(element, eventName, handler) {
    element = $(element);

    var responder = _createResponder(element, eventName, handler);

    if (!responder) return element;

    if (eventName.include(':')) {
      if (element.addEventListener)
        element.addEventListener("dataavailable", responder, false);
      else {
        element.attachEvent("ondataavailable", responder);
        element.attachEvent("onfilterchange", responder);
      }
    } else {
      var actualEventName = _getDOMEventName(eventName);

      if (element.addEventListener)
        element.addEventListener(actualEventName, responder, false);
      else
        element.attachEvent("on" + actualEventName, responder);
    }

    return element;
  }

  function stopObserving(element, eventName, handler) {
    element = $(element);

    var registry = Element.retrieve(element, 'prototype_event_registry');
    if (!registry) return element;

    if (!eventName) {
      registry.each( function(pair) {
        var eventName = pair.key;
        stopObserving(element, eventName);
      });
      return element;
    }

    var responders = registry.get(eventName);
    if (!responders) return element;

    if (!handler) {
      responders.each(function(r) {
        stopObserving(element, eventName, r.handler);
      });
      return element;
    }

    var responder = responders.find( function(r) { return r.handler === handler; });
    if (!responder) return element;

    if (eventName.include(':')) {
      if (element.removeEventListener)
        element.removeEventListener("dataavailable", responder, false);
      else {
        element.detachEvent("ondataavailable", responder);
        element.detachEvent("onfilterchange",  responder);
      }
    } else {
      var actualEventName = _getDOMEventName(eventName);
      if (element.removeEventListener)
        element.removeEventListener(actualEventName, responder, false);
      else
        element.detachEvent('on' + actualEventName, responder);
    }

    registry.set(eventName, responders.without(responder));

    return element;
  }

  function fire(element, eventName, memo, bubble) {
    element = $(element);

    if (Object.isUndefined(bubble))
      bubble = true;

    if (element == document && document.createEvent && !element.dispatchEvent)
      element = document.documentElement;

    var event;
    if (document.createEvent) {
      event = document.createEvent('HTMLEvents');
      event.initEvent('dataavailable', true, true);
    } else {
      event = document.createEventObject();
      event.eventType = bubble ? 'ondataavailable' : 'onfilterchange';
    }

    event.eventName = eventName;
    event.memo = memo || { };

    if (document.createEvent)
      element.dispatchEvent(event);
    else
      element.fireEvent(event.eventType, event);

    return Event.extend(event);
  }

  Event.Handler = Class.create({
    initialize: function(element, eventName, selector, callback) {
      this.element   = $(element);
      this.eventName = eventName;
      this.selector  = selector;
      this.callback  = callback;
      this.handler   = this.handleEvent.bind(this);
    },

    start: function() {
      Event.observe(this.element, this.eventName, this.handler);
      return this;
    },

    stop: function() {
      Event.stopObserving(this.element, this.eventName, this.handler);
      return this;
    },

    handleEvent: function(event) {
      var element = event.findElement(this.selector);
      if (element) this.callback.call(this.element, event, element);
    }
  });

  function on(element, eventName, selector, callback) {
    element = $(element);
    if (Object.isFunction(selector) && Object.isUndefined(callback)) {
      callback = selector, selector = null;
    }

    return new Event.Handler(element, eventName, selector, callback).start();
  }

  Object.extend(Event, Event.Methods);

  Object.extend(Event, {
    fire:          fire,
    observe:       observe,
    stopObserving: stopObserving,
    on:            on
  });

  Element.addMethods({
    fire:          fire,

    observe:       observe,

    stopObserving: stopObserving,

    on:            on
  });

  Object.extend(document, {
    fire:          fire.methodize(),

    observe:       observe.methodize(),

    stopObserving: stopObserving.methodize(),

    on:            on.methodize(),

    loaded:        false
  });

  if (window.Event) Object.extend(window.Event, Event);
  else window.Event = Event;
})();

(function() {
  /* Support for the DOMContentLoaded event is based on work by Dan Webb,
     Matthias Miller, Dean Edwards, John Resig, and Diego Perini. */

  var timer;

  function fireContentLoadedEvent() {
    if (document.loaded) return;
    if (timer) window.clearTimeout(timer);
    document.loaded = true;
    document.fire('dom:loaded');
  }

  function checkReadyState() {
    if (document.readyState === 'complete') {
      document.stopObserving('readystatechange', checkReadyState);
      fireContentLoadedEvent();
    }
  }

  function pollDoScroll() {
    try { document.documentElement.doScroll('left'); }
    catch(e) {
      timer = pollDoScroll.defer();
      return;
    }
    fireContentLoadedEvent();
  }

  if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', fireContentLoadedEvent, false);
  } else {
    document.observe('readystatechange', checkReadyState);
    if (window == top)
      timer = pollDoScroll.defer();
  }

  Event.observe(window, 'load', fireContentLoadedEvent);
})();

Element.addMethods();

/*------------------------------- DEPRECATED -------------------------------*/

Hash.toQueryString = Object.toQueryString;

var Toggle = { display: Element.toggle };

Element.Methods.childOf = Element.Methods.descendantOf;

var Insertion = {
  Before: function(element, content) {
    return Element.insert(element, {before:content});
  },

  Top: function(element, content) {
    return Element.insert(element, {top:content});
  },

  Bottom: function(element, content) {
    return Element.insert(element, {bottom:content});
  },

  After: function(element, content) {
    return Element.insert(element, {after:content});
  }
};

var $continue = new Error('"throw $continue" is deprecated, use "return" instead');

var Position = {
  includeScrollOffsets: false,

  prepare: function() {
    this.deltaX =  window.pageXOffset
                || document.documentElement.scrollLeft
                || document.body.scrollLeft
                || 0;
    this.deltaY =  window.pageYOffset
                || document.documentElement.scrollTop
                || document.body.scrollTop
                || 0;
  },

  within: function(element, x, y) {
    if (this.includeScrollOffsets)
      return this.withinIncludingScrolloffsets(element, x, y);
    this.xcomp = x;
    this.ycomp = y;
    this.offset = Element.cumulativeOffset(element);

    return (y >= this.offset[1] &&
            y <  this.offset[1] + element.offsetHeight &&
            x >= this.offset[0] &&
            x <  this.offset[0] + element.offsetWidth);
  },

  withinIncludingScrolloffsets: function(element, x, y) {
    var offsetcache = Element.cumulativeScrollOffset(element);

    this.xcomp = x + offsetcache[0] - this.deltaX;
    this.ycomp = y + offsetcache[1] - this.deltaY;
    this.offset = Element.cumulativeOffset(element);

    return (this.ycomp >= this.offset[1] &&
            this.ycomp <  this.offset[1] + element.offsetHeight &&
            this.xcomp >= this.offset[0] &&
            this.xcomp <  this.offset[0] + element.offsetWidth);
  },

  overlap: function(mode, element) {
    if (!mode) return 0;
    if (mode == 'vertical')
      return ((this.offset[1] + element.offsetHeight) - this.ycomp) /
        element.offsetHeight;
    if (mode == 'horizontal')
      return ((this.offset[0] + element.offsetWidth) - this.xcomp) /
        element.offsetWidth;
  },


  cumulativeOffset: Element.Methods.cumulativeOffset,

  positionedOffset: Element.Methods.positionedOffset,

  absolutize: function(element) {
    Position.prepare();
    return Element.absolutize(element);
  },

  relativize: function(element) {
    Position.prepare();
    return Element.relativize(element);
  },

  realOffset: Element.Methods.cumulativeScrollOffset,

  offsetParent: Element.Methods.getOffsetParent,

  page: Element.Methods.viewportOffset,

  clone: function(source, target, options) {
    options = options || { };
    return Element.clonePosition(target, source, options);
  }
};

/*--------------------------------------------------------------------------*/

if (!document.getElementsByClassName) document.getElementsByClassName = function(instanceMethods){
  function iter(name) {
    return name.blank() ? null : "[contains(concat(' ', @class, ' '), ' " + name + " ')]";
  }

  instanceMethods.getElementsByClassName = Prototype.BrowserFeatures.XPath ?
  function(element, className) {
    className = className.toString().strip();
    var cond = /\s/.test(className) ? $w(className).map(iter).join('') : iter(className);
    return cond ? document._getElementsByXPath('.//*' + cond, element) : [];
  } : function(element, className) {
    className = className.toString().strip();
    var elements = [], classNames = (/\s/.test(className) ? $w(className) : null);
    if (!classNames && !className) return elements;

    var nodes = $(element).getElementsByTagName('*');
    className = ' ' + className + ' ';

    for (var i = 0, child, cn; child = nodes[i]; i++) {
      if (child.className && (cn = ' ' + child.className + ' ') && (cn.include(className) ||
          (classNames && classNames.all(function(name) {
            return !name.toString().blank() && cn.include(' ' + name + ' ');
          }))))
        elements.push(Element.extend(child));
    }
    return elements;
  };

  return function(className, parentElement) {
    return $(parentElement || document.body).getElementsByClassName(className);
  };
}(Element.Methods);

/*--------------------------------------------------------------------------*/

Element.ClassNames = Class.create();
Element.ClassNames.prototype = {
  initialize: function(element) {
    this.element = $(element);
  },

  _each: function(iterator) {
    this.element.className.split(/\s+/).select(function(name) {
      return name.length > 0;
    })._each(iterator);
  },

  set: function(className) {
    this.element.className = className;
  },

  add: function(classNameToAdd) {
    if (this.include(classNameToAdd)) return;
    this.set($A(this).concat(classNameToAdd).join(' '));
  },

  remove: function(classNameToRemove) {
    if (!this.include(classNameToRemove)) return;
    this.set($A(this).without(classNameToRemove).join(' '));
  },

  toString: function() {
    return $A(this).join(' ');
  }
};

Object.extend(Element.ClassNames.prototype, Enumerable);

/*--------------------------------------------------------------------------*/

(function() {
  window.Selector = Class.create({
    initialize: function(expression) {
      this.expression = expression.strip();
    },

    findElements: function(rootElement) {
      return Prototype.Selector.select(this.expression, rootElement);
    },

    match: function(element) {
      return Prototype.Selector.match(element, this.expression);
    },

    toString: function() {
      return this.expression;
    },

    inspect: function() {
      return "#<Selector: " + this.expression + ">";
    }
  });

  Object.extend(Selector, {
    matchElements: function(elements, expression) {
      var match = Prototype.Selector.match,
          results = [];

      for (var i = 0, length = elements.length; i < length; i++) {
        var element = elements[i];
        if (match(element, expression)) {
          results.push(Element.extend(element));
        }
      }
      return results;
    },

    findElement: function(elements, expression, index) {
      index = index || 0;
      var matchIndex = 0, element;
      for (var i = 0, length = elements.length; i < length; i++) {
        element = elements[i];
        if (Prototype.Selector.match(element, expression) && index === matchIndex++) {
          return Element.extend(element);
        }
      }
    },

    findChildElements: function(element, expressions) {
      var selector = expressions.toArray().join(', ');
      return Prototype.Selector.select(selector, element || document);
    }
  });
})();
/**
 * Small Cookies JavaScript Helper
 *
 * Source code available at http://github.com/tdd/cookies-js-helper
 *
 * Copyright (c) 2010 Christophe Porteneuve <tdd@tddsworld.com>
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

(function(scope) {

  var _toString = Object.prototype.toString;
  function isDate(o)   { return '[object Date]'   == _toString.call(o); }
  function isRegExp(o) { return '[object RegExp]' == _toString.call(o); }
  
  var Cookie = {
    
    /**
     * Cookie.get(name) -> String | null
     * - name (String): The name of the cookie you want to fetch.
     *
     * Returns the cookie’s value for the passed name, or +null+ if the cookie
     * does not exist.
     */
    get: function get(name) {
      return Cookie.has(name) ? Cookie.list()[name] : null;
    },
    
    /**
     * Cookie.has(name) -> Boolean
     * - name (String): The name of the cookie you want to test the presence of.
     *
     * Returns whether the cookie for that name exists or not.
     */
    has: function has(name) {
      return new RegExp("(?:;\\s*|^)" + encodeURIComponent(name) + '=').test(document.cookie);
    },
    
    /**
     * Cookie.list([nameRegExp]) -> { name: value[, name: value …]}
     * - nameRegExp (RegExp) an optional `RegExp` to filter cookie names.  If anything but
     *   an actual `RegExp` is passed, this argument is ignored.
     *
     * Returns a key-value dictionary of existing cookies for the current page.
     * Note the ordering of names is basically browser-dependent (as in, JS-engine-dependent).
     */
    list: function list(nameRegExp) {
      var pairs = document.cookie.split('; '), pair, result = {};
      for (var index = 0, len = pairs.length; index < len; ++index) {
        pair = pairs[index].split('=');
        if (!isRegExp(nameRegExp) || nameRegExp.test(pair[0]))
          result[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
      }
      return result;
    },
    
    /**
     * Cookie.remove(name[, options]) -> String
     * - name (String): The name of the cookie you want to remove.
     * - options (Object): An optional set of settings for cookie removal. See Cookie.set for details.
     *
     * Removes the cookie value for the name you passed, honoring potential filtering options.
     * Returns the actual cookie string written to the underlying `document.cookie` property.
     */
    remove: function remove(name, options) {
      var opt2 = {};
      for (var key in (options || {})) opts2[key] = options[key];
      opt2.expires = new Date(0);
      opt2.maxAge = -1;
      return Cookie.set(name, null, opt2);
    },
    
    /**
     * Cookie.set(name, value, [, options]) -> String
     * - name (String): The name of the cookie you want to set.
     * - value (Object): The value for the cookie you want to set.  It will undergo a basic `toString()`
     *     transform, so if it's a complex object you likely want to, say, use its JSON representation instead.
     * - options (Object): An optional set of settings for cookie setting. See below.
     *
     * Sets a cookie for the name and value you passed, honoring potential filtering options.
     * Returns the actual cookie string written to the underlying `document.cookie` property.
     *
     * Possible options are:
     *
     * * `path` sets the path within the current domain. Defaults to the current path. Minimum is '/'.
     *   Ignored if blank.
     * * `domain` sets the (sub)domain this cookie pertains to. At the shortest, the current root
     *   domain (e.g. 'example.com'), but can also be any depth of subdomain up to the current one
     *   (e.g. 'www.demo.example.com'). Ignored if blank.
     * * `maxAge` / `max_age` / `max-age` is one way to define when the cookie should expire; this
     *   is a time-to-live in _seconds_. Any of the three keys is accepted, in this order of
     *   decreasing priority (first found key short-circuits the latter ones).
     * * `expires` is the traditional way of setting a cookie expiry, using an absolute GMT date/time
     *   string with an RFC2822 format (e.g. 'Tue, 02 Feb 2010 22:04:47 GMT').  You can also pass
     *   a `Date` object set appropriately, in which case its `toUTCString()` method will be used.
     * * `secure` defines whether the cookie should only be passed through HTTPS connections.  It's
     *   used as `Boolean`-equivalent (so zero, `null`, `undefined` and the empty string are all false).
     */
    set: function set(name, value, options) {
      options = options || {};
      var def = [encodeURIComponent(name) + '=' + encodeURIComponent(value)];
      if (options.path) def.push('path=' + options.path);
      if (options.domain) def.push('domain=' + options.path);
      var maxAge = 'maxAge' in options ? options.maxAge :
        ('max_age' in options ? options.max_age : options['max-age']), maxAgeNbr;
      if ('undefined' != typeof maxAge && 'null' != typeof maxAge && (!isNaN(maxAgeNbr = parseFloat(maxAge))))
        def.push('max-age=' + maxAgeNbr);
      var expires = isDate(options.expires) ? options.expires.toUTCString() : options.expires;
      if (expires) def.push('expires=' + expires);
      if (options.secure) def.push('secure');
      def = def.join('; ');
      document.cookie = def;
      return def;
    },
    
    /**
     * Cookie.test() -> Boolean
     * 
     * Tests whether cookies are enabled or not.
     */
    test: function test() {
      var key = '70ab3d396b85e670f25b93be05e027e4eb655b71', value = 'Élodie Jaubert'
      Cookie.remove(key);
      Cookie.set(key, value);
      var result = value == Cookie.get(key);
      Cookie.remove(key);
      return result;
    }
  };
  scope.Cookie = Cookie;
})(window);/*
* Copyright (c) 2006-2007 Erin Catto http://www.gphysics.com
*
* This software is provided 'as-is', without any express or implied
* warranty.  In no event will the authors be held liable for any damages
* arising from the use of this software.
* Permission is granted to anyone to use this software for any purpose,
* including commercial applications, and to alter it and redistribute it
* freely, subject to the following restrictions:
* 1. The origin of this software must not be misrepresented; you must not
* claim that you wrote the original software. If you use this software
* in a product, an acknowledgment in the product documentation would be
* appreciated but is not required.
* 2. Altered source versions must be plainly marked as such, and must not be
* misrepresented as being the original software.
* 3. This notice may not be removed or altered from any source distribution.
*
* Ported to to javascript by Jonas Wagner, 2010
*
*/
var a;function extend(b,c){for(var d in c)b[d]=c[d]};var b2Settings=function(){this.__varz();this.__constructor.apply(this,arguments)};b2Settings.prototype.__constructor=function(){};b2Settings.prototype.__varz=function(){};b2Settings.USHRT_MAX=65535;b2Settings.b2_pi=Math.PI;b2Settings.b2_maxManifoldPoints=2;b2Settings.b2_maxPolygonVertices=8;/*b2Settings.b2_maxProxies=512;*/b2Settings.b2_maxProxies=1024;b2Settings.b2_maxPairs=8*b2Settings.b2_maxProxies;b2Settings.b2_linearSlop=0.005;b2Settings.b2_angularSlop=2/180*b2Settings.b2_pi;b2Settings.b2_toiSlop=8*b2Settings.b2_linearSlop;
b2Settings.b2_maxTOIContactsPerIsland=32;b2Settings.b2_velocityThreshold=1;b2Settings.b2_maxLinearCorrection=0.2;b2Settings.b2_maxAngularCorrection=8/180*b2Settings.b2_pi;b2Settings.b2_maxLinearVelocity=200;b2Settings.b2_maxLinearVelocitySquared=b2Settings.b2_maxLinearVelocity*b2Settings.b2_maxLinearVelocity;b2Settings.b2_maxAngularVelocity=250;b2Settings.b2_maxAngularVelocitySquared=b2Settings.b2_maxAngularVelocity*b2Settings.b2_maxAngularVelocity;b2Settings.b2_contactBaumgarte=0.2;
b2Settings.b2_timeToSleep=0.5;b2Settings.b2_linearSleepTolerance=0.01;b2Settings.b2_angularSleepTolerance=2/180;b2Settings.b2Assert=function(b){b||(void 0).x++};var b2Vec2=function(b,c){if(arguments.length==2){this.x=b;this.y=c}};b2Vec2.Make=function(b,c){return new b2Vec2(b,c)};a=b2Vec2.prototype;a.x=0;a.y=0;a.SetZero=function(){this.y=this.x=0};a.Set=function(b,c){this.x=b;this.y=c};a.SetV=function(b){this.x=b.x;this.y=b.y};a.Negative=function(){return new b2Vec2(-this.x,-this.y)};a.Copy=function(){return new b2Vec2(this.x,this.y)};a.Add=function(b){this.x+=b.x;this.y+=b.y};a.Subtract=function(b){this.x-=b.x;this.y-=b.y};
a.Multiply=function(b){this.x*=b;this.y*=b};a.MulM=function(b){var c=this.x;this.x=b.col1.x*c+b.col2.x*this.y;this.y=b.col1.y*c+b.col2.y*this.y};a.MulTM=function(b){var c=b2Math.b2Dot(this,b.col1);this.y=b2Math.b2Dot(this,b.col2);this.x=c};a.CrossVF=function(b){var c=this.x;this.x=b*this.y;this.y=-b*c};a.CrossFV=function(b){var c=this.x;this.x=-b*this.y;this.y=b*c};a.MinV=function(b){this.x=this.x<b.x?this.x:b.x;this.y=this.y<b.y?this.y:b.y};
a.MaxV=function(b){this.x=this.x>b.x?this.x:b.x;this.y=this.y>b.y?this.y:b.y};a.Abs=function(){if(this.x<0)this.x=-this.x;if(this.y<0)this.y=-this.y};a.Length=function(){return Math.sqrt(this.x*this.x+this.y*this.y)};a.LengthSquared=function(){return this.x*this.x+this.y*this.y};a.Normalize=function(){var b=Math.sqrt(this.x*this.x+this.y*this.y);if(b<Number.MIN_VALUE)return 0;var c=1/b;this.x*=c;this.y*=c;return b};a.IsValid=function(){return b2Math.b2IsValid(this.x)&&b2Math.b2IsValid(this.y)};var b2BufferedPair=function(){this.__varz();this.__constructor.apply(this,arguments)};b2BufferedPair.prototype.__constructor=function(){};b2BufferedPair.prototype.__varz=function(){};b2BufferedPair.prototype.proxyId1=0;b2BufferedPair.prototype.proxyId2=0;var b2AABB=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2AABB.prototype;a.__constructor=function(){};a.__varz=function(){this.lowerBound=new b2Vec2;this.upperBound=new b2Vec2};a.lowerBound=new b2Vec2;a.upperBound=new b2Vec2;a.IsValid=function(){var b=this.upperBound.y-this.lowerBound.y;return b=(b=this.upperBound.x-this.lowerBound.x>=0&&b>=0)&&this.lowerBound.IsValid()&&this.upperBound.IsValid()};var b2Pair=function(){this.__varz();this.__constructor.apply(this,arguments)};b2Pair.prototype.__constructor=function(){};b2Pair.prototype.__varz=function(){};b2Pair.b2_nullPair=b2Settings.USHRT_MAX;b2Pair.b2_nullProxy=b2Settings.USHRT_MAX;b2Pair.b2_tableCapacity=b2Settings.b2_maxPairs;b2Pair.b2_tableMask=b2Pair.b2_tableCapacity-1;b2Pair.e_pairBuffered=1;b2Pair.e_pairRemoved=2;b2Pair.e_pairFinal=4;a=b2Pair.prototype;a.userData=null;a.proxyId1=0;a.proxyId2=0;a.next=0;a.status=0;
a.SetBuffered=function(){this.status|=b2Pair.e_pairBuffered};a.ClearBuffered=function(){this.status&=~b2Pair.e_pairBuffered};a.IsBuffered=function(){return(this.status&b2Pair.e_pairBuffered)==b2Pair.e_pairBuffered};a.SetRemoved=function(){this.status|=b2Pair.e_pairRemoved};a.ClearRemoved=function(){this.status&=~b2Pair.e_pairRemoved};a.IsRemoved=function(){return(this.status&b2Pair.e_pairRemoved)==b2Pair.e_pairRemoved};a.SetFinal=function(){this.status|=b2Pair.e_pairFinal};
a.IsFinal=function(){return(this.status&b2Pair.e_pairFinal)==b2Pair.e_pairFinal};var b2TimeStep=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2TimeStep.prototype;a.__constructor=function(){};a.__varz=function(){};a.dt=null;a.inv_dt=null;a.dtRatio=null;a.maxIterations=0;a.warmStarting=null;a.positionCorrection=null;var b2Manifold=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2Manifold.prototype;a.__constructor=function(){this.points=new Array(b2Settings.b2_maxManifoldPoints);for(var b=0;b<b2Settings.b2_maxManifoldPoints;b++)this.points[b]=new b2ManifoldPoint;this.normal=new b2Vec2};a.__varz=function(){};a.points=null;a.normal=null;a.pointCount=0;a.Reset=function(){for(var b=0;b<b2Settings.b2_maxManifoldPoints;b++)this.points[b].Reset();this.normal.SetZero();this.pointCount=0};
a.Set=function(b){this.pointCount=b.pointCount;for(var c=0;c<b2Settings.b2_maxManifoldPoints;c++)this.points[c].Set(b.points[c]);this.normal.SetV(b.normal)};var b2Point=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2Point.prototype;a.__constructor=function(){};a.__varz=function(){this.p=new b2Vec2};a.p=new b2Vec2;a.Support=function(){return this.p};a.GetFirstVertex=function(){return this.p};var b2Bound=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2Bound.prototype;a.__constructor=function(){};a.__varz=function(){};a.value=0;a.proxyId=0;a.stabbingCount=0;a.IsLower=function(){return(this.value&1)==0};a.IsUpper=function(){return(this.value&1)==1};a.Swap=function(b){var c=this.value,d=this.proxyId,e=this.stabbingCount;this.value=b.value;this.proxyId=b.proxyId;this.stabbingCount=b.stabbingCount;b.value=c;b.proxyId=d;b.stabbingCount=e};var b2Mat22=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2Mat22.prototype;a.__constructor=function(b,c,d){if(c!=null&&d!=null){this.col1.SetV(c);this.col2.SetV(d)}else{c=Math.cos(b);b=Math.sin(b);this.col1.x=c;this.col2.x=-b;this.col1.y=b;this.col2.y=c}};a.__varz=function(){this.col1=new b2Vec2;this.col2=new b2Vec2};a.col1=new b2Vec2;a.col2=new b2Vec2;a.Set=function(b){var c=Math.cos(b);b=Math.sin(b);this.col1.x=c;this.col2.x=-b;this.col1.y=b;this.col2.y=c};
a.SetVV=function(b,c){this.col1.SetV(b);this.col2.SetV(c)};a.Copy=function(){return new b2Mat22(0,this.col1,this.col2)};a.SetM=function(b){this.col1.SetV(b.col1);this.col2.SetV(b.col2)};a.AddM=function(b){this.col1.x+=b.col1.x;this.col1.y+=b.col1.y;this.col2.x+=b.col2.x;this.col2.y+=b.col2.y};a.SetIdentity=function(){this.col1.x=1;this.col2.x=0;this.col1.y=0;this.col2.y=1};a.SetZero=function(){this.col1.x=0;this.col2.x=0;this.col1.y=0;this.col2.y=0};
a.GetAngle=function(){return Math.atan2(this.col1.y,this.col1.x)};a.Invert=function(b){var c=this.col1.x,d=this.col2.x,e=this.col1.y,f=this.col2.y,g=c*f-d*e;g=1/g;b.col1.x=g*f;b.col2.x=-g*d;b.col1.y=-g*e;b.col2.y=g*c;return b};a.Solve=function(b,c,d){var e=this.col1.x,f=this.col2.x,g=this.col1.y,h=this.col2.y,i=e*h-f*g;i=1/i;b.x=i*(h*c-f*d);b.y=i*(e*d-g*c);return b};a.Abs=function(){this.col1.Abs();this.col2.Abs()};var b2BoundaryListener=function(){this.__varz();this.__constructor.apply(this,arguments)};b2BoundaryListener.prototype.__constructor=function(){};b2BoundaryListener.prototype.__varz=function(){};b2BoundaryListener.prototype.Violation=function(){};var b2MassData=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2MassData.prototype;a.__constructor=function(){};a.__varz=function(){this.center=new b2Vec2(0,0)};a.mass=0;a.center=new b2Vec2(0,0);a.I=0;var b2JointEdge=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2JointEdge.prototype;a.__constructor=function(){};a.__varz=function(){};a.other=null;a.joint=null;a.prev=null;a.next=null;var b2Collision=function(){this.__varz();this.__constructor.apply(this,arguments)};b2Collision.prototype.__constructor=function(){};b2Collision.prototype.__varz=function(){};b2Collision.b2_nullFeature=255;b2Collision.b2CollidePolyTempVec=new b2Vec2;
b2Collision.ClipSegmentToLine=function(b,c,d,e){var f,g=0;f=c[0];var h=f.v;f=c[1];var i=f.v,j=b2Math.b2Dot(d,h)-e;f=b2Math.b2Dot(d,i)-e;if(j<=0)b[g++]=c[0];if(f<=0)b[g++]=c[1];if(j*f<0){d=j/(j-f);f=b[g];f=f.v;f.x=h.x+d*(i.x-h.x);f.y=h.y+d*(i.y-h.y);f=b[g];f.id=(j>0?c[0]:c[1]).id;++g}return g};
b2Collision.EdgeSeparation=function(b,c,d,e,f){var g=b.m_vertices;b=b.m_normals;var h=e.m_vertexCount,i=e.m_vertices,j,k;j=c.R;k=b[d];b=j.col1.x*k.x+j.col2.x*k.y;e=j.col1.y*k.x+j.col2.y*k.y;j=f.R;var l=j.col1.x*b+j.col1.y*e;j=j.col2.x*b+j.col2.y*e;for(var m=0,n=Number.MAX_VALUE,o=0;o<h;++o){k=i[o];k=k.x*l+k.y*j;if(k<n){n=k;m=o}}k=g[d];j=c.R;d=c.position.x+(j.col1.x*k.x+j.col2.x*k.y);c=c.position.y+(j.col1.y*k.x+j.col2.y*k.y);k=i[m];j=f.R;g=f.position.x+(j.col1.x*k.x+j.col2.x*k.y);f=f.position.y+(j.col1.y*
k.x+j.col2.y*k.y);g-=d;f-=c;return g*b+f*e};
b2Collision.FindMaxSeparation=function(b,c,d,e,f){var g=c.m_vertexCount,h=c.m_normals,i,j;j=f.R;i=e.m_centroid;var k=f.position.x+(j.col1.x*i.x+j.col2.x*i.y),l=f.position.y+(j.col1.y*i.x+j.col2.y*i.y);j=d.R;i=c.m_centroid;k-=d.position.x+(j.col1.x*i.x+j.col2.x*i.y);l-=d.position.y+(j.col1.y*i.x+j.col2.y*i.y);j=k*d.R.col1.x+l*d.R.col1.y;l=k*d.R.col2.x+l*d.R.col2.y;k=0;for(var m=-Number.MAX_VALUE,n=0;n<g;++n){i=h[n];i=i.x*j+i.y*l;if(i>m){m=i;k=n}}h=b2Collision.EdgeSeparation(c,d,k,e,f);if(h>0)return h;
l=k-1>=0?k-1:g-1;m=b2Collision.EdgeSeparation(c,d,l,e,f);if(m>0)return m;n=k+1<g?k+1:0;var o=b2Collision.EdgeSeparation(c,d,n,e,f);if(o>0)return o;j=i=0;if(m>h&&m>o){j=-1;i=l;l=m}else if(o>h){j=1;i=n;l=o}else{b[0]=k;return h}for(;;){k=j==-1?i-1>=0?i-1:g-1:i+1<g?i+1:0;h=b2Collision.EdgeSeparation(c,d,k,e,f);if(h>0)return h;if(h>l){i=k;l=h}else break}b[0]=i;return l};
b2Collision.FindIncidentEdge=function(b,c,d,e,f,g){var h=c.m_normals,i=f.m_vertexCount;c=f.m_vertices;f=f.m_normals;var j;j=d.R;d=h[e];h=j.col1.x*d.x+j.col2.x*d.y;var k=j.col1.y*d.x+j.col2.y*d.y;j=g.R;d=j.col1.x*h+j.col1.y*k;k=j.col2.x*h+j.col2.y*k;h=d;j=0;for(var l=Number.MAX_VALUE,m=0;m<i;++m){d=f[m];d=h*d.x+k*d.y;if(d<l){l=d;j=m}}f=j;h=f+1<i?f+1:0;i=b[0];d=c[f];j=g.R;i.v.x=g.position.x+(j.col1.x*d.x+j.col2.x*d.y);i.v.y=g.position.y+(j.col1.y*d.x+j.col2.y*d.y);i.id.features.referenceEdge=e;i.id.features.incidentEdge=
f;i.id.features.incidentVertex=0;i=b[1];d=c[h];j=g.R;i.v.x=g.position.x+(j.col1.x*d.x+j.col2.x*d.y);i.v.y=g.position.y+(j.col1.y*d.x+j.col2.y*d.y);i.id.features.referenceEdge=e;i.id.features.incidentEdge=h;i.id.features.incidentVertex=1};
b2Collision.b2CollidePolygons=function(b,c,d,e,f){var g=b.pointCount=0,h=[g],i=b2Collision.FindMaxSeparation(h,c,d,e,f);g=h[0];if(!(i>0)){var j=0;h=[j];var k=b2Collision.FindMaxSeparation(h,e,f,c,d);j=h[0];if(!(k>0)){var l=new b2XForm,m=new b2XForm,n=0;h=0;if(k>0.98*i+0.001){i=e;e=c;l.Set(f);m.Set(d);n=j;h=1}else{i=c;e=e;l.Set(d);m.Set(f);n=g;h=0}c=[new ClipVertex,new ClipVertex];b2Collision.FindIncidentEdge(c,i,l,n,e,m);g=i.m_vertexCount;m=i.m_vertices;i=m[n];e=i.Copy();if(n+1<g){i=m[parseInt(n+
1)];i=i.Copy()}else{i=m[0];i=i.Copy()}b2Math.SubtractVV(i,e);g=b2Math.b2MulMV(l.R,b2Math.SubtractVV(i,e));g.Normalize();n=b2Math.b2CrossVF(g,1);e=b2Math.b2MulX(l,e);i=b2Math.b2MulX(l,i);l=b2Math.b2Dot(n,e);m=-b2Math.b2Dot(g,e);i=b2Math.b2Dot(g,i);j=[new ClipVertex,new ClipVertex];e=[new ClipVertex,new ClipVertex];k=0;k=b2Collision.ClipSegmentToLine(j,c,g.Negative(),m);if(!(k<2)){k=b2Collision.ClipSegmentToLine(e,j,g,i);if(!(k<2)){b.normal=h?n.Negative():n.Copy();for(m=g=0;m<b2Settings.b2_maxManifoldPoints;++m){c=
e[m];i=b2Math.b2Dot(n,c.v)-l;if(i<=0){j=b.points[g];j.separation=i;j.localPoint1=b2Math.b2MulXT(d,c.v);j.localPoint2=b2Math.b2MulXT(f,c.v);j.id.key=c.id._key;j.id.features.flip=h;++g}}b.pointCount=g}}}}};
b2Collision.b2CollideCircles=function(b,c,d,e,f){b.pointCount=0;var g,h;g=d.R;h=c.m_localPosition;var i=d.position.x+(g.col1.x*h.x+g.col2.x*h.y),j=d.position.y+(g.col1.y*h.x+g.col2.y*h.y);g=f.R;h=e.m_localPosition;var k=f.position.x+(g.col1.x*h.x+g.col2.x*h.y);g=f.position.y+(g.col1.y*h.x+g.col2.y*h.y);h=k-i;var l=g-j,m=h*h+l*l;c=c.m_radius;e=e.m_radius;var n=c+e;if(!(m>n*n)){if(m<Number.MIN_VALUE){m=-n;b.normal.Set(0,1)}else{var o=Math.sqrt(m);m=o-n;n=1/o;b.normal.x=n*h;b.normal.y=n*l}b.pointCount=
1;h=b.points[0];h.id.key=0;h.separation=m;i+=c*b.normal.x;j+=c*b.normal.y;k-=e*b.normal.x;g-=e*b.normal.y;b=0.5*(i+k);j=0.5*(j+g);i=b-d.position.x;k=j-d.position.y;h.localPoint1.x=i*d.R.col1.x+k*d.R.col1.y;h.localPoint1.y=i*d.R.col2.x+k*d.R.col2.y;i=b-f.position.x;k=j-f.position.y;h.localPoint2.x=i*f.R.col1.x+k*f.R.col1.y;h.localPoint2.y=i*f.R.col2.x+k*f.R.col2.y}};
b2Collision.b2CollidePolygonAndCircle=function(b,c,d,e,f){b.pointCount=0;var g,h,i,j,k,l;l=f.R;k=e.m_localPosition;j=f.position.x+(l.col1.x*k.x+l.col2.x*k.y);var m=f.position.y+(l.col1.y*k.x+l.col2.y*k.y);h=j-d.position.x;i=m-d.position.y;l=d.R;var n=h*l.col1.x+i*l.col1.y;l=h*l.col2.x+i*l.col2.y;var o=0,q=-Number.MAX_VALUE;e=e.m_radius;var r=c.m_vertexCount;g=c.m_vertices;c=c.m_normals;for(var s=0;s<r;++s){k=g[s];h=n-k.x;i=l-k.y;k=c[s];h=k.x*h+k.y*i;if(h>e)return;if(h>q){q=h;o=s}}if(q<Number.MIN_VALUE){b.pointCount=
1;k=c[o];l=d.R;b.normal.x=l.col1.x*k.x+l.col2.x*k.y;b.normal.y=l.col1.y*k.x+l.col2.y*k.y;g=b.points[0];g.id.features.incidentEdge=o;g.id.features.incidentVertex=b2Collision.b2_nullFeature;g.id.features.referenceEdge=0;g.id.features.flip=0;j=j-e*b.normal.x;b=m-e*b.normal.y;h=j-d.position.x;i=b-d.position.y;l=d.R;g.localPoint1.x=h*l.col1.x+i*l.col1.y;g.localPoint1.y=h*l.col2.x+i*l.col2.y;h=j-f.position.x;i=b-f.position.y;l=f.R;g.localPoint2.x=h*l.col1.x+i*l.col1.y;g.localPoint2.y=h*l.col2.x+i*l.col2.y;
g.separation=q-e}else{q=o;r=q+1<r?q+1:0;k=g[q];c=g[r];var v=c.x-k.x;s=c.y-k.y;var z=Math.sqrt(v*v+s*s);v/=z;s/=z;h=n-k.x;i=l-k.y;h=h*v+i*s;g=b.points[0];if(h<=0){i=k.x;k=k.y;g.id.features.incidentEdge=b2Collision.b2_nullFeature;g.id.features.incidentVertex=q}else if(h>=z){i=c.x;k=c.y;g.id.features.incidentEdge=b2Collision.b2_nullFeature;g.id.features.incidentVertex=r}else{i=v*h+k.x;k=s*h+k.y;g.id.features.incidentEdge=o;g.id.features.incidentVertex=0}h=n-i;i=l-k;n=Math.sqrt(h*h+i*i);h/=n;i/=n;if(!(n>
e)){b.pointCount=1;l=d.R;b.normal.x=l.col1.x*h+l.col2.x*i;b.normal.y=l.col1.y*h+l.col2.y*i;j=j-e*b.normal.x;b=m-e*b.normal.y;h=j-d.position.x;i=b-d.position.y;l=d.R;g.localPoint1.x=h*l.col1.x+i*l.col1.y;g.localPoint1.y=h*l.col2.x+i*l.col2.y;h=j-f.position.x;i=b-f.position.y;l=f.R;g.localPoint2.x=h*l.col1.x+i*l.col1.y;g.localPoint2.y=h*l.col2.x+i*l.col2.y;g.separation=n-e;g.id.features.referenceEdge=0;g.id.features.flip=0}}};
b2Collision.b2TestOverlap=function(b,c){var d=c.lowerBound,e=b.upperBound,f=d.x-e.x,g=d.y-e.y;d=b.lowerBound;e=c.upperBound;b=d.y-e.y;if(f>0||g>0)return false;if(d.x-e.x>0||b>0)return false;return true};var b2ContactListener=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2ContactListener.prototype;a.__constructor=function(){};a.__varz=function(){};a.Add=function(){};a.Persist=function(){};a.Remove=function(){};a.Result=function(){};var b2PairCallback=function(){this.__varz();this.__constructor.apply(this,arguments)};b2PairCallback.prototype.__constructor=function(){};b2PairCallback.prototype.__varz=function(){};b2PairCallback.prototype.PairAdded=function(){return null};b2PairCallback.prototype.PairRemoved=function(){};var b2JointDef=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2JointDef.prototype;a.__constructor=function(){this.type=b2Joint.e_unknownJoint;this.body2=this.body1=this.userData=null;this.collideConnected=false};a.__varz=function(){};a.type=0;a.userData=null;a.body1=null;a.body2=null;a.collideConnected=null;var b2Proxy=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2Proxy.prototype;a.__constructor=function(){};a.__varz=function(){this.lowerBounds=[parseInt(0),parseInt(0)];this.upperBounds=[parseInt(0),parseInt(0)]};a.lowerBounds=[parseInt(0),parseInt(0)];a.upperBounds=[parseInt(0),parseInt(0)];a.overlapCount=0;a.timeStamp=0;a.userData=null;a.GetNext=function(){return this.lowerBounds[0]};a.SetNext=function(b){this.lowerBounds[0]=b%65535};
a.IsValid=function(){return this.overlapCount!=b2BroadPhase.b2_invalid};var b2Color=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2Color.prototype;a.__constructor=function(b,c,d){this._r=parseInt(255*b2Math.b2Clamp(b,0,1));this._g=parseInt(255*b2Math.b2Clamp(c,0,1));this._b=parseInt(255*b2Math.b2Clamp(d,0,1))};a.__varz=function(){};a._r=0;a._g=0;a._b=0;a.Set=function(b,c,d){this._r=parseInt(255*b2Math.b2Clamp(b,0,1));this._g=parseInt(255*b2Math.b2Clamp(c,0,1));this._b=parseInt(255*b2Math.b2Clamp(d,0,1))};
a.set=function(b){this._r=parseInt(255*b2Math.b2Clamp(b,0,1))};a.set=function(b){this._g=parseInt(255*b2Math.b2Clamp(b,0,1))};a.set=function(b){this._b=parseInt(255*b2Math.b2Clamp(b,0,1))};a.get=function(){return this._r|this._g<<8|this._b<<16};var b2FilterData=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2FilterData.prototype;a.__constructor=function(){};a.__varz=function(){this.categoryBits=1;this.maskBits=65535};a.categoryBits=1;a.maskBits=65535;a.groupIndex=0;a.Copy=function(){var b=new b2FilterData;b.categoryBits=this.categoryBits;b.maskBits=this.maskBits;b.groupIndex=this.groupIndex;return b};var b2PairManager=function(){this.__varz();this.__constructor.apply(this,arguments)};
b2PairManager.prototype.__constructor=function(){var b=0;this.m_hashTable=new Array(b2Pair.b2_tableCapacity);for(b=0;b<b2Pair.b2_tableCapacity;++b)this.m_hashTable[b]=b2Pair.b2_nullPair;this.m_pairs=new Array(b2Settings.b2_maxPairs);for(b=0;b<b2Settings.b2_maxPairs;++b)this.m_pairs[b]=new b2Pair;this.m_pairBuffer=new Array(b2Settings.b2_maxPairs);for(b=0;b<b2Settings.b2_maxPairs;++b)this.m_pairBuffer[b]=new b2BufferedPair;for(b=0;b<b2Settings.b2_maxPairs;++b){this.m_pairs[b].proxyId1=b2Pair.b2_nullProxy;
this.m_pairs[b].proxyId2=b2Pair.b2_nullProxy;this.m_pairs[b].userData=null;this.m_pairs[b].status=0;this.m_pairs[b].next=b+1}this.m_pairs[parseInt(b2Settings.b2_maxPairs-1)].next=b2Pair.b2_nullPair;this.m_pairBufferCount=this.m_pairCount=0};b2PairManager.prototype.__varz=function(){};b2PairManager.Hash=function(b,c){b=c<<16&4294901760|b;b=~b+(b<<15&4294934528);b^=b>>12&1048575;b+=b<<2&4294967292;b^=b>>4&268435455;b*=2057;b^=(b>>16)%65535;return b};
b2PairManager.Equals=function(b,c,d){return b.proxyId1==c&&b.proxyId2==d};b2PairManager.EqualsPair=function(b,c){return b.proxyId1==c.proxyId1&&b.proxyId2==c.proxyId2};a=b2PairManager.prototype;a.m_broadPhase=null;a.m_callback=null;a.m_pairs=null;a.m_freePair=0;a.m_pairCount=0;a.m_pairBuffer=null;a.m_pairBufferCount=0;a.m_hashTable=null;
a.AddPair=function(b,c){if(b>c){var d=b;b=c;c=d}d=b2PairManager.Hash(b,c)&b2Pair.b2_tableMask;var e=e=this.FindHash(b,c,d);if(e!=null)return e;var f=this.m_freePair;e=this.m_pairs[f];this.m_freePair=e.next;e.proxyId1=b;e.proxyId2=c;e.status=0;e.userData=null;e.next=this.m_hashTable[d];this.m_hashTable[d]=f;++this.m_pairCount;return e};
a.RemovePair=function(b,c){if(b>c){var d=b;b=c;c=d}d=b2PairManager.Hash(b,c)&b2Pair.b2_tableMask;for(var e=this.m_hashTable[d],f=null;e!=b2Pair.b2_nullPair;)if(b2PairManager.Equals(this.m_pairs[e],b,c)){b=e;c=this.m_pairs[e];if(f)f.next=c.next;else this.m_hashTable[d]=c.next;c=this.m_pairs[b];d=c.userData;c.next=this.m_freePair;c.proxyId1=b2Pair.b2_nullProxy;c.proxyId2=b2Pair.b2_nullProxy;c.userData=null;c.status=0;this.m_freePair=b;--this.m_pairCount;return d}else{f=this.m_pairs[e];e=f.next}return null};
a.Find=function(b,c){if(b>c){var d=b;b=c;c=d}d=b2PairManager.Hash(b,c)&b2Pair.b2_tableMask;return this.FindHash(b,c,d)};a.FindHash=function(b,c,d){var e=this.m_hashTable[d];for(d=this.m_pairs[e];e!=b2Pair.b2_nullPair&&b2PairManager.Equals(d,b,c)==false;){e=d.next;d=this.m_pairs[e]}if(e==b2Pair.b2_nullPair)return null;return d};a.ValidateBuffer=function(){};a.ValidateTable=function(){};a.Initialize=function(b,c){this.m_broadPhase=b;this.m_callback=c};
a.AddBufferedPair=function(b,c){c=this.AddPair(b,c);if(c.IsBuffered()==false){c.SetBuffered();b=this.m_pairBuffer[this.m_pairBufferCount];b.proxyId1=c.proxyId1;b.proxyId2=c.proxyId2;++this.m_pairBufferCount}c.ClearRemoved();b2BroadPhase.s_validate&&this.ValidateBuffer()};
a.RemoveBufferedPair=function(b,c){c=this.Find(b,c);if(c!=null){if(c.IsBuffered()==false){c.SetBuffered();b=this.m_pairBuffer[this.m_pairBufferCount];b.proxyId1=c.proxyId1;b.proxyId2=c.proxyId2;++this.m_pairBufferCount}c.SetRemoved();b2BroadPhase.s_validate&&this.ValidateBuffer()}};
a.Commit=function(){var b,c=0,d=0,e=this.m_broadPhase.m_proxyPool;for(c=0;c<this.m_pairBufferCount;++c){b=this.m_pairBuffer[c];var f=this.Find(b.proxyId1,b.proxyId2);f.ClearBuffered();b=e[f.proxyId1];var g=e[f.proxyId2];if(f.IsRemoved()){f.IsFinal()==true&&this.m_callback.PairRemoved(b.userData,g.userData,f.userData);b=this.m_pairBuffer[d];b.proxyId1=f.proxyId1;b.proxyId2=f.proxyId2;++d}else if(f.IsFinal()==false){f.userData=this.m_callback.PairAdded(b.userData,g.userData);f.SetFinal()}}for(c=0;c<
d;++c){b=this.m_pairBuffer[c];this.RemovePair(b.proxyId1,b.proxyId2)}this.m_pairBufferCount=0;b2BroadPhase.s_validate&&this.ValidateTable()};var b2ContactSolver=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2ContactSolver.prototype;
a.__constructor=function(b,c,d,e){var f;this.m_step.dt=b.dt;this.m_step.inv_dt=b.inv_dt;this.m_step.maxIterations=b.maxIterations;this.m_allocator=e;b=0;var g;for(b=this.m_constraintCount=0;b<d;++b){f=c[b];this.m_constraintCount+=f.m_manifoldCount}for(b=0;b<this.m_constraintCount;b++)this.m_constraints[b]=new b2ContactConstraint;for(b=e=0;b<d;++b){f=c[b];var h=f.m_shape1.m_body,i=f.m_shape2.m_body,j=f.m_manifoldCount,k=f.GetManifolds(),l=f.m_friction;f=f.m_restitution;for(var m=h.m_linearVelocity.x,
n=h.m_linearVelocity.y,o=i.m_linearVelocity.x,q=i.m_linearVelocity.y,r=h.m_angularVelocity,s=i.m_angularVelocity,v=0;v<j;++v){var z=k[v],y=z.normal.x,t=z.normal.y,w=this.m_constraints[e];w.body1=h;w.body2=i;w.manifold=z;w.normal.x=y;w.normal.y=t;w.pointCount=z.pointCount;w.friction=l;w.restitution=f;for(var A=0;A<w.pointCount;++A){var u=z.points[A],x=w.points[A];x.normalImpulse=u.normalImpulse;x.tangentImpulse=u.tangentImpulse;x.separation=u.separation;x.positionImpulse=0;x.localAnchor1.SetV(u.localPoint1);
x.localAnchor2.SetV(u.localPoint2);var B;g=h.m_xf.R;var C=u.localPoint1.x-h.m_sweep.localCenter.x,E=u.localPoint1.y-h.m_sweep.localCenter.y;B=g.col1.x*C+g.col2.x*E;E=g.col1.y*C+g.col2.y*E;C=B;x.r1.Set(C,E);g=i.m_xf.R;var F=u.localPoint2.x-i.m_sweep.localCenter.x;u=u.localPoint2.y-i.m_sweep.localCenter.y;B=g.col1.x*F+g.col2.x*u;u=g.col1.y*F+g.col2.y*u;F=B;x.r2.Set(F,u);g=C*C+E*E;B=F*F+u*u;var H=C*y+E*t,D=F*y+u*t,G=h.m_invMass+i.m_invMass;G+=h.m_invI*(g-H*H)+i.m_invI*(B-D*D);x.normalMass=1/G;G=h.m_mass*
h.m_invMass+i.m_mass*i.m_invMass;G+=h.m_mass*h.m_invI*(g-H*H)+i.m_mass*i.m_invI*(B-D*D);x.equalizedMass=1/G;D=-y;H=C*t+E*D;D=F*t+u*D;G=h.m_invMass+i.m_invMass;G+=h.m_invI*(g-H*H)+i.m_invI*(B-D*D);x.tangentMass=1/G;x.velocityBias=0;if(x.separation>0)x.velocityBias=-60*x.separation;B=o+-s*u-m- -r*E;C=w.normal.x*B+w.normal.y*(q+s*F-n-r*C);if(C<-b2Settings.b2_velocityThreshold)x.velocityBias+=-w.restitution*C}++e}}};a.__varz=function(){this.m_step=new b2TimeStep;this.m_constraints=[]};a.m_step=new b2TimeStep;
a.m_allocator=null;a.m_constraints=[];a.m_constraintCount=0;
a.InitVelocityConstraints=function(b){for(var c=0;c<this.m_constraintCount;++c){var d=this.m_constraints[c],e=d.body1,f=d.body2,g=e.m_invMass,h=e.m_invI,i=f.m_invMass,j=f.m_invI,k=d.normal.x,l=d.normal.y,m=-k,n=0,o=0;if(b.warmStarting){o=d.pointCount;for(n=0;n<o;++n){var q=d.points[n];q.normalImpulse*=b.dtRatio;q.tangentImpulse*=b.dtRatio;var r=q.normalImpulse*k+q.tangentImpulse*l,s=q.normalImpulse*l+q.tangentImpulse*m;e.m_angularVelocity-=h*(q.r1.x*s-q.r1.y*r);e.m_linearVelocity.x-=g*r;e.m_linearVelocity.y-=
g*s;f.m_angularVelocity+=j*(q.r2.x*s-q.r2.y*r);f.m_linearVelocity.x+=i*r;f.m_linearVelocity.y+=i*s}}else{o=d.pointCount;for(n=0;n<o;++n){e=d.points[n];e.normalImpulse=0;e.tangentImpulse=0}}}};
a.SolveVelocityConstraints=function(){for(var b=0,c,d,e,f,g,h,i=0;i<this.m_constraintCount;++i){var j=this.m_constraints[i],k=j.body1,l=j.body2,m=k.m_angularVelocity,n=l.m_angularVelocity,o=k.m_linearVelocity,q=l.m_linearVelocity,r=k.m_invMass,s=k.m_invI,v=l.m_invMass,z=l.m_invI,y=j.normal.x,t=j.normal.y,w=-y,A=j.friction,u=j.pointCount;for(b=0;b<u;++b){c=j.points[b];d=q.x+-n*c.r2.y-o.x- -m*c.r1.y;e=q.y+n*c.r2.x-o.y-m*c.r1.x;f=d*y+e*t;f=-c.normalMass*(f-c.velocityBias);d=d*t+e*w;e=c.tangentMass*-d;
d=b2Math.b2Max(c.normalImpulse+f,0);f=d-c.normalImpulse;g=A*c.normalImpulse;g=b2Math.b2Clamp(c.tangentImpulse+e,-g,g);e=g-c.tangentImpulse;h=f*y+e*t;f=f*t+e*w;o.x-=r*h;o.y-=r*f;m-=s*(c.r1.x*f-c.r1.y*h);q.x+=v*h;q.y+=v*f;n+=z*(c.r2.x*f-c.r2.y*h);c.normalImpulse=d;c.tangentImpulse=g}k.m_angularVelocity=m;l.m_angularVelocity=n}};
a.FinalizeVelocityConstraints=function(){for(var b=0;b<this.m_constraintCount;++b)for(var c=this.m_constraints[b],d=c.manifold,e=0;e<c.pointCount;++e){var f=d.points[e],g=c.points[e];f.normalImpulse=g.normalImpulse;f.tangentImpulse=g.tangentImpulse}};
a.SolvePositionConstraints=function(b){for(var c=0,d,e,f=0;f<this.m_constraintCount;++f)for(var g=this.m_constraints[f],h=g.body1,i=g.body2,j=h.m_sweep.c,k=h.m_sweep.a,l=i.m_sweep.c,m=i.m_sweep.a,n=h.m_mass*h.m_invMass,o=h.m_mass*h.m_invI,q=i.m_mass*i.m_invMass,r=i.m_mass*i.m_invI,s=g.normal.x,v=g.normal.y,z=g.pointCount,y=0;y<z;++y){var t=g.points[y];d=h.m_xf.R;e=h.m_sweep.localCenter;var w=t.localAnchor1.x-e.x,A=t.localAnchor1.y-e.y;x=d.col1.x*w+d.col2.x*A;A=d.col1.y*w+d.col2.y*A;w=x;d=i.m_xf.R;
e=i.m_sweep.localCenter;var u=t.localAnchor2.x-e.x;e=t.localAnchor2.y-e.y;var x=d.col1.x*u+d.col2.x*e;e=d.col1.y*u+d.col2.y*e;u=x;d=(l.x+u-(j.x+w))*s+(l.y+e-(j.y+A))*v+t.separation;c=b2Math.b2Min(c,d);d=b*b2Math.b2Clamp(d+b2Settings.b2_linearSlop,-b2Settings.b2_maxLinearCorrection,0);d=-t.equalizedMass*d;x=t.positionImpulse;t.positionImpulse=b2Math.b2Max(x+d,0);d=t.positionImpulse-x;t=d*s;d=d*v;j.x-=n*t;j.y-=n*d;k-=o*(w*d-A*t);h.m_sweep.a=k;h.SynchronizeTransform();l.x+=q*t;l.y+=q*d;m+=r*(u*d-e*t);
i.m_sweep.a=m;i.SynchronizeTransform()}return c>=-1.5*b2Settings.b2_linearSlop};var b2BoundValues=function(){this.__varz();this.__constructor.apply(this,arguments)};b2BoundValues.prototype.__constructor=function(){};b2BoundValues.prototype.__varz=function(){this.lowerValues=[0,0];this.upperValues=[0,0]};b2BoundValues.prototype.lowerValues=[0,0];b2BoundValues.prototype.upperValues=[0,0];var Features=function(){this.__varz();this.__constructor.apply(this,arguments)};
Features.prototype={referenceEdge:function(){return this._referenceEdge},referenceEdge:function(b){this._referenceEdge=b;this._m_id._key=this._m_id._key&4294967040|this._referenceEdge&255},incidentEdge:function(){return this._incidentEdge},incidentEdge:function(b){this._incidentEdge=b;this._m_id._key=this._m_id._key&4294902015|this._incidentEdge<<8&65280},incidentVertex:function(b){this._incidentVertex=b;this._m_id._key=this._m_id._key&4278255615|this._incidentVertex<<16&16711680},incidentVertex:function(){return this._incidentVertex},
flip:function(b){this._flip=b;this._m_id._key=this._m_id._key&16777215|this._flip<<24&4278190080},flip:function(){return this._flip}};a=Features.prototype;a.__constructor=function(){};a.__varz=function(){};a._referenceEdge=0;a._incidentEdge=0;a._incidentVertex=0;a._flip=0;a._m_id=null;var b2MouseJointDef=function(){b2JointDef.prototype.__varz.call(this);this.__varz();this.__constructor.apply(this,arguments)};extend(b2MouseJointDef.prototype,b2JointDef.prototype);a=b2MouseJointDef.prototype;a._super=function(){b2JointDef.prototype.__constructor.apply(this,arguments)};a.__constructor=function(){this.type=b2Joint.e_mouseJoint;this.maxForce=0;this.frequencyHz=5;this.dampingRatio=0.7;this.timeStep=1/60};a.__varz=function(){this.target=new b2Vec2};a.target=new b2Vec2;a.maxForce=null;
a.frequencyHz=null;a.dampingRatio=null;a.timeStep=null;var b2ContactConstraintPoint=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2ContactConstraintPoint.prototype;a.__constructor=function(){};a.__varz=function(){this.localAnchor1=new b2Vec2;this.localAnchor2=new b2Vec2;this.r1=new b2Vec2;this.r2=new b2Vec2};a.localAnchor1=new b2Vec2;a.localAnchor2=new b2Vec2;a.r1=new b2Vec2;a.r2=new b2Vec2;a.normalImpulse=null;a.tangentImpulse=null;a.positionImpulse=null;a.normalMass=null;a.tangentMass=null;a.equalizedMass=null;a.separation=null;
a.velocityBias=null;var b2ContactRegister=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2ContactRegister.prototype;a.__constructor=function(){};a.__varz=function(){};a.createFcn=null;a.destroyFcn=null;a.primary=null;var b2DestructionListener=function(){this.__varz();this.__constructor.apply(this,arguments)};b2DestructionListener.prototype.__constructor=function(){};b2DestructionListener.prototype.__varz=function(){};b2DestructionListener.prototype.SayGoodbyeJoint=function(){};b2DestructionListener.prototype.SayGoodbyeShape=function(){};var b2PulleyJointDef=function(){b2JointDef.prototype.__varz.call(this);this.__varz();this.__constructor.apply(this,arguments)};extend(b2PulleyJointDef.prototype,b2JointDef.prototype);a=b2PulleyJointDef.prototype;a._super=function(){b2JointDef.prototype.__constructor.apply(this,arguments)};
a.__constructor=function(){this.type=b2Joint.e_pulleyJoint;this.groundAnchor1.Set(-1,1);this.groundAnchor2.Set(1,1);this.localAnchor1.Set(-1,0);this.localAnchor2.Set(1,0);this.maxLength2=this.length2=this.maxLength1=this.length1=0;this.ratio=1;this.collideConnected=true};a.__varz=function(){this.groundAnchor1=new b2Vec2;this.groundAnchor2=new b2Vec2;this.localAnchor1=new b2Vec2;this.localAnchor2=new b2Vec2};a.groundAnchor1=new b2Vec2;a.groundAnchor2=new b2Vec2;a.localAnchor1=new b2Vec2;
a.localAnchor2=new b2Vec2;a.length1=null;a.maxLength1=null;a.length2=null;a.maxLength2=null;a.ratio=null;
a.Initialize=function(b,c,d,e,f,g,h){this.body1=b;this.body2=c;this.groundAnchor1.SetV(d);this.groundAnchor2.SetV(e);this.localAnchor1=this.body1.GetLocalPoint(f);this.localAnchor2=this.body2.GetLocalPoint(g);b=f.x-d.x;d=f.y-d.y;this.length1=Math.sqrt(b*b+d*d);d=g.x-e.x;e=g.y-e.y;this.length2=Math.sqrt(d*d+e*e);this.ratio=h;h=this.length1+this.ratio*this.length2;this.maxLength1=h-this.ratio*b2PulleyJoint.b2_minPulleyLength;this.maxLength2=(h-b2PulleyJoint.b2_minPulleyLength)/this.ratio};var b2Jacobian=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2Jacobian.prototype;a.__constructor=function(){};a.__varz=function(){this.linear1=new b2Vec2;this.linear2=new b2Vec2};a.linear1=new b2Vec2;a.angular1=null;a.linear2=new b2Vec2;a.angular2=null;a.SetZero=function(){this.linear1.SetZero();this.angular1=0;this.linear2.SetZero();this.angular2=0};a.Set=function(b,c,d,e){this.linear1.SetV(b);this.angular1=c;this.linear2.SetV(d);this.angular2=e};
a.Compute=function(b,c,d,e){return this.linear1.x*b.x+this.linear1.y*b.y+this.angular1*c+(this.linear2.x*d.x+this.linear2.y*d.y)+this.angular2*e};var b2DebugDraw=function(){this.__varz();this.__constructor.apply(this,arguments)};b2DebugDraw.prototype.__constructor=function(){this.m_drawFlags=0};b2DebugDraw.prototype.__varz=function(){};b2DebugDraw.e_shapeBit=1;b2DebugDraw.e_jointBit=2;b2DebugDraw.e_coreShapeBit=4;b2DebugDraw.e_aabbBit=8;b2DebugDraw.e_obbBit=16;b2DebugDraw.e_pairBit=32;b2DebugDraw.e_centerOfMassBit=64;a=b2DebugDraw.prototype;a.m_drawFlags=0;a.m_sprite=null;a.m_drawScale=1;a.m_lineThickness=1;a.m_alpha=1;a.m_fillAlpha=1;
a.m_xformScale=1;a.SetFlags=function(b){this.m_drawFlags=b};a.GetFlags=function(){return this.m_drawFlags};a.AppendFlags=function(b){this.m_drawFlags|=b};a.ClearFlags=function(b){this.m_drawFlags&=~b};
a.DrawPolygon=function(b,c,d){this.m_sprite.graphics.lineStyle(this.m_lineThickness,d.color,this.m_alpha);this.m_sprite.graphics.moveTo(b[0].x*this.m_drawScale,b[0].y*this.m_drawScale);for(d=1;d<c;d++)this.m_sprite.graphics.lineTo(b[d].x*this.m_drawScale,b[d].y*this.m_drawScale);this.m_sprite.graphics.lineTo(b[0].x*this.m_drawScale,b[0].y*this.m_drawScale)};
a.DrawSolidPolygon=function(b,c,d){this.m_sprite.graphics.lineStyle(this.m_lineThickness,d.color,this.m_alpha);this.m_sprite.graphics.moveTo(b[0].x*this.m_drawScale,b[0].y*this.m_drawScale);this.m_sprite.graphics.beginFill(d.color,this.m_fillAlpha);for(d=1;d<c;d++)this.m_sprite.graphics.lineTo(b[d].x*this.m_drawScale,b[d].y*this.m_drawScale);this.m_sprite.graphics.lineTo(b[0].x*this.m_drawScale,b[0].y*this.m_drawScale);this.m_sprite.graphics.endFill()};
a.DrawCircle=function(b,c,d){this.m_sprite.graphics.lineStyle(this.m_lineThickness,d.color,this.m_alpha);this.m_sprite.graphics.drawCircle(b.x*this.m_drawScale,b.y*this.m_drawScale,c*this.m_drawScale)};
a.DrawSolidCircle=function(b,c,d,e){this.m_sprite.graphics.lineStyle(this.m_lineThickness,e.color,this.m_alpha);this.m_sprite.graphics.moveTo(0,0);this.m_sprite.graphics.beginFill(e.color,this.m_fillAlpha);this.m_sprite.graphics.drawCircle(b.x*this.m_drawScale,b.y*this.m_drawScale,c*this.m_drawScale);this.m_sprite.graphics.endFill();this.m_sprite.graphics.moveTo(b.x*this.m_drawScale,b.y*this.m_drawScale);this.m_sprite.graphics.lineTo((b.x+d.x*c)*this.m_drawScale,(b.y+d.y*c)*this.m_drawScale)};
a.DrawSegment=function(b,c,d){this.m_sprite.graphics.lineStyle(this.m_lineThickness,d.color,this.m_alpha);this.m_sprite.graphics.moveTo(b.x*this.m_drawScale,b.y*this.m_drawScale);this.m_sprite.graphics.lineTo(c.x*this.m_drawScale,c.y*this.m_drawScale)};
a.DrawXForm=function(b){this.m_sprite.graphics.lineStyle(this.m_lineThickness,16711680,this.m_alpha);this.m_sprite.graphics.moveTo(b.position.x*this.m_drawScale,b.position.y*this.m_drawScale);this.m_sprite.graphics.lineTo((b.position.x+this.m_xformScale*b.R.col1.x)*this.m_drawScale,(b.position.y+this.m_xformScale*b.R.col1.y)*this.m_drawScale);this.m_sprite.graphics.lineStyle(this.m_lineThickness,65280,this.m_alpha);this.m_sprite.graphics.moveTo(b.position.x*this.m_drawScale,b.position.y*this.m_drawScale);
this.m_sprite.graphics.lineTo((b.position.x+this.m_xformScale*b.R.col2.x)*this.m_drawScale,(b.position.y+this.m_xformScale*b.R.col2.y)*this.m_drawScale)};var b2ContactEdge=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2ContactEdge.prototype;a.__constructor=function(){};a.__varz=function(){};a.other=null;a.contact=null;a.prev=null;a.next=null;var b2Sweep=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2Sweep.prototype;a.__constructor=function(){};a.__varz=function(){this.localCenter=new b2Vec2;this.c0=new b2Vec2;this.c=new b2Vec2};a.localCenter=new b2Vec2;a.c0=new b2Vec2;a.c=new b2Vec2;a.a0=null;a.a=null;a.t0=null;
a.GetXForm=function(b,c){if(1-this.t0>Number.MIN_VALUE){c=(c-this.t0)/(1-this.t0);b.position.x=(1-c)*this.c0.x+c*this.c.x;b.position.y=(1-c)*this.c0.y+c*this.c.y;b.R.Set((1-c)*this.a0+c*this.a)}else{b.position.SetV(this.c);b.R.Set(this.a)}c=b.R;b.position.x-=c.col1.x*this.localCenter.x+c.col2.x*this.localCenter.y;b.position.y-=c.col1.y*this.localCenter.x+c.col2.y*this.localCenter.y};
a.Advance=function(b){if(this.t0<b&&1-this.t0>Number.MIN_VALUE){var c=(b-this.t0)/(1-this.t0);this.c0.x=(1-c)*this.c0.x+c*this.c.x;this.c0.y=(1-c)*this.c0.y+c*this.c.y;this.a0=(1-c)*this.a0+c*this.a;this.t0=b}};var b2ContactConstraint=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2ContactConstraint.prototype;a.__constructor=function(){this.points=new Array(b2Settings.b2_maxManifoldPoints);for(var b=0;b<b2Settings.b2_maxManifoldPoints;b++)this.points[b]=new b2ContactConstraintPoint};a.__varz=function(){this.normal=new b2Vec2};a.points=null;a.normal=new b2Vec2;a.manifold=null;a.body1=null;a.body2=null;a.friction=null;a.restitution=null;a.pointCount=0;var b2Distance=function(){this.__varz();this.__constructor.apply(this,arguments)};b2Distance.prototype.__constructor=function(){};b2Distance.prototype.__varz=function(){};b2Distance.g_GJK_Iterations=0;b2Distance.s_p1s=[new b2Vec2,new b2Vec2,new b2Vec2];b2Distance.s_p2s=[new b2Vec2,new b2Vec2,new b2Vec2];b2Distance.s_points=[new b2Vec2,new b2Vec2,new b2Vec2];b2Distance.gPoint=new b2Point;
b2Distance.ProcessTwo=function(b,c,d,e,f){var g=f[0];f=f[1];var h=d[0];d=d[1];var i=e[0];e=e[1];var j=-f.x,k=-f.y,l=g.x-f.x,m=g.y-f.y,n=Math.sqrt(l*l+m*m);l/=n;m/=n;j=j*l+k*m;if(j<=0||n<Number.MIN_VALUE){b.SetV(d);c.SetV(e);h.SetV(d);i.SetV(e);g.SetV(f);return 1}j/=n;b.x=d.x+j*(h.x-d.x);b.y=d.y+j*(h.y-d.y);c.x=e.x+j*(i.x-e.x);c.y=e.y+j*(i.y-e.y);return 2};
b2Distance.ProcessThree=function(b,c,d,e,f){var g=f[0],h=f[1],i=f[2];f=d[0];var j=d[1];d=d[2];var k=e[0],l=e[1];e=e[2];var m=g.x,n=g.y,o=h.x,q=h.y,r=i.x,s=i.y,v=o-m,z=q-n,y=r-m,t=s-n,w=r-o,A=s-q,u=-(m*y+n*t),x=r*y+s*t,B=-(o*w+q*A);w=r*w+s*A;if(x<=0&&w<=0){b.SetV(d);c.SetV(e);f.SetV(d);k.SetV(e);g.SetV(i);return 1}z=v*t-z*y;v=z*(m*q-n*o);o=z*(o*s-q*r);if(o<=0&&B>=0&&w>=0&&B+w>0){u=B/(B+w);b.x=j.x+u*(d.x-j.x);b.y=j.y+u*(d.y-j.y);c.x=l.x+u*(e.x-l.x);c.y=l.y+u*(e.y-l.y);f.SetV(d);k.SetV(e);g.SetV(i);
return 2}g=z*(r*n-s*m);if(g<=0&&u>=0&&x>=0&&u+x>0){u=u/(u+x);b.x=f.x+u*(d.x-f.x);b.y=f.y+u*(d.y-f.y);c.x=k.x+u*(e.x-k.x);c.y=k.y+u*(e.y-k.y);j.SetV(d);l.SetV(e);h.SetV(i);return 2}i=o+g+v;i=1/i;h=o*i;g=g*i;i=1-h-g;b.x=h*f.x+g*j.x+i*d.x;b.y=h*f.y+g*j.y+i*d.y;c.x=h*k.x+g*l.x+i*e.x;c.y=h*k.y+g*l.y+i*e.y;return 3};
b2Distance.InPoints=function(b,c,d){for(var e=100*Number.MIN_VALUE,f=0;f<d;++f){var g=c[f],h=Math.abs(b.x-g.x),i=Math.abs(b.y-g.y),j=Math.max(Math.abs(b.x),Math.abs(g.x));g=Math.max(Math.abs(b.y),Math.abs(g.y));if(h<e*(j+1)&&i<e*(g+1))return true}return false};
b2Distance.DistanceGeneric=function(b,c,d,e,f,g){var h,i=b2Distance.s_p1s,j=b2Distance.s_p2s,k=b2Distance.s_points,l=0;b.SetV(d.GetFirstVertex(e));c.SetV(f.GetFirstVertex(g));for(var m=0,n=0;n<20;++n){h=c.x-b.x;var o=c.y-b.y,q=d.Support(e,h,o),r=f.Support(g,-h,-o);m=h*h+o*o;var s=r.x-q.x,v=r.y-q.y;if(m-(h*s+o*v)<=0.01*m){if(l==0){b.SetV(q);c.SetV(r)}b2Distance.g_GJK_Iterations=n;return Math.sqrt(m)}switch(l){case 0:h=i[0];h.SetV(q);h=j[0];h.SetV(r);h=k[0];h.x=s;h.y=v;b.SetV(i[0]);c.SetV(j[0]);++l;
break;case 1:h=i[1];h.SetV(q);h=j[1];h.SetV(r);h=k[1];h.x=s;h.y=v;l=b2Distance.ProcessTwo(b,c,i,j,k);break;case 2:h=i[2];h.SetV(q);h=j[2];h.SetV(r);h=k[2];h.x=s;h.y=v;l=b2Distance.ProcessThree(b,c,i,j,k);break}if(l==3){b2Distance.g_GJK_Iterations=n;return 0}q=-Number.MAX_VALUE;for(r=0;r<l;++r){h=k[r];q=b2Math.b2Max(q,h.x*h.x+h.y*h.y)}if(l==3||m<=100*Number.MIN_VALUE*q){b2Distance.g_GJK_Iterations=n;h=c.x-b.x;o=c.y-b.y;m=h*h+o*o;return Math.sqrt(m)}}b2Distance.g_GJK_Iterations=20;return Math.sqrt(m)};
b2Distance.DistanceCC=function(b,c,d,e,f,g){var h,i;h=e.R;i=d.m_localPosition;var j=e.position.x+(h.col1.x*i.x+h.col2.x*i.y);e=e.position.y+(h.col1.y*i.x+h.col2.y*i.y);h=g.R;i=f.m_localPosition;var k=g.position.x+(h.col1.x*i.x+h.col2.x*i.y);g=g.position.y+(h.col1.y*i.x+h.col2.y*i.y);h=k-j;i=g-e;var l=h*h+i*i;d=d.m_radius-b2Settings.b2_toiSlop;f=f.m_radius-b2Settings.b2_toiSlop;var m=d+f;if(l>m*m){l=Math.sqrt(h*h+i*i);h/=l;i/=l;l=l-m;b.x=j+d*h;b.y=e+d*i;c.x=k-f*h;c.y=g-f*i;return l}else if(l>Number.MIN_VALUE*
Number.MIN_VALUE){l=Math.sqrt(h*h+i*i);h/=l;i/=l;b.x=j+d*h;b.y=e+d*i;c.x=b.x;c.y=b.y;return 0}b.x=j;b.y=e;c.x=b.x;c.y=b.y;return 0};
b2Distance.DistancePC=function(b,c,d,e,f,g){var h,i,j=b2Distance.gPoint;i=f.m_localPosition;h=g.R;j.p.x=g.position.x+(h.col1.x*i.x+h.col2.x*i.y);j.p.y=g.position.y+(h.col1.y*i.x+h.col2.y*i.y);d=b2Distance.DistanceGeneric(b,c,d,e,j,b2Math.b2XForm_identity);f=f.m_radius-b2Settings.b2_toiSlop;if(d>f){d-=f;e=c.x-b.x;b=c.y-b.y;g=Math.sqrt(e*e+b*b);e/=g;b/=g;c.x-=f*e;c.y-=f*b}else{d=0;c.x=b.x;c.y=b.y}return d};
b2Distance.Distance=function(b,c,d,e,f,g){var h=d.m_type,i=f.m_type;if(h==b2Shape.e_circleShape&&i==b2Shape.e_circleShape)return b2Distance.DistanceCC(b,c,d,e,f,g);if(h==b2Shape.e_polygonShape&&i==b2Shape.e_circleShape)return b2Distance.DistancePC(b,c,d,e,f,g);if(h==b2Shape.e_circleShape&&i==b2Shape.e_polygonShape)return b2Distance.DistancePC(c,b,f,g,d,e);if(h==b2Shape.e_polygonShape&&i==b2Shape.e_polygonShape)return b2Distance.DistanceGeneric(b,c,d,e,f,g);return 0};var b2Shape=function(){this.__varz();this.__constructor.apply(this,arguments)};b2Shape.prototype.__constructor=function(b){this.m_userData=b.userData;this.m_friction=b.friction;this.m_restitution=b.restitution;this.m_density=b.density;this.m_body=null;this.m_sweepRadius=0;this.m_next=null;this.m_proxyId=b2Pair.b2_nullProxy;this.m_filter=b.filter.Copy();this.m_isSensor=b.isSensor};b2Shape.prototype.__varz=function(){};b2Shape.e_unknownShape=-1;b2Shape.e_circleShape=0;b2Shape.e_polygonShape=1;
b2Shape.e_shapeTypeCount=2;b2Shape.e_hitCollide=1;b2Shape.e_missCollide=0;b2Shape.e_startsInsideCollide=-1;b2Shape.s_proxyAABB=new b2AABB;b2Shape.s_syncAABB=new b2AABB;b2Shape.s_resetAABB=new b2AABB;b2Shape.Create=function(b){switch(b.type){case b2Shape.e_circleShape:return new b2CircleShape(b);case b2Shape.e_polygonShape:return new b2PolygonShape(b);default:return null}};b2Shape.Destroy=function(){};a=b2Shape.prototype;a.m_type=0;a.m_next=null;a.m_body=null;a.m_sweepRadius=null;a.m_density=null;
a.m_friction=null;a.m_restitution=null;a.m_proxyId=0;a.m_filter=null;a.m_isSensor=null;a.m_userData=null;a.GetType=function(){return this.m_type};a.IsSensor=function(){return this.m_isSensor};a.SetFilterData=function(b){this.m_filter=b.Copy()};a.GetFilterData=function(){return this.m_filter.Copy()};a.GetBody=function(){return this.m_body};a.GetNext=function(){return this.m_next};a.GetUserData=function(){return this.m_userData};a.SetUserData=function(b){this.m_userData=b};a.TestPoint=function(){return false};
a.TestSegment=function(){return b2Shape.e_missCollide};a.ComputeAABB=function(){};a.ComputeSweptAABB=function(){};a.ComputeMass=function(){};a.GetSweepRadius=function(){return this.m_sweepRadius};a.GetFriction=function(){return this.m_friction};a.GetRestitution=function(){return this.m_restitution};a.CreateProxy=function(b,c){var d=b2Shape.s_proxyAABB;this.ComputeAABB(d,c);this.m_proxyId=b.InRange(d)?b.CreateProxy(d,this):b2Pair.b2_nullProxy};
a.DestroyProxy=function(b){if(this.m_proxyId!=b2Pair.b2_nullProxy){b.DestroyProxy(this.m_proxyId);this.m_proxyId=b2Pair.b2_nullProxy}};a.Synchronize=function(b,c,d){if(this.m_proxyId==b2Pair.b2_nullProxy)return false;var e=b2Shape.s_syncAABB;this.ComputeSweptAABB(e,c,d);if(b.InRange(e)){b.MoveProxy(this.m_proxyId,e);return true}else return false};
a.RefilterProxy=function(b,c){if(this.m_proxyId!=b2Pair.b2_nullProxy){b.DestroyProxy(this.m_proxyId);var d=b2Shape.s_resetAABB;this.ComputeAABB(d,c);this.m_proxyId=b.InRange(d)?b.CreateProxy(d,this):b2Pair.b2_nullProxy}};a.UpdateSweepRadius=function(){};var b2XForm=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2XForm.prototype;a.__constructor=function(b,c){if(b){this.position.SetV(b);this.R.SetM(c)}};a.__varz=function(){this.position=new b2Vec2;this.R=new b2Mat22};a.position=new b2Vec2;a.R=new b2Mat22;a.Initialize=function(b,c){this.position.SetV(b);this.R.SetM(c)};a.SetIdentity=function(){this.position.SetZero();this.R.SetIdentity()};a.Set=function(b){this.position.SetV(b.position);this.R.SetM(b.R)};var b2DistanceJointDef=function(){b2JointDef.prototype.__varz.call(this);this.__varz();this.__constructor.apply(this,arguments)};extend(b2DistanceJointDef.prototype,b2JointDef.prototype);a=b2DistanceJointDef.prototype;a._super=function(){b2JointDef.prototype.__constructor.apply(this,arguments)};a.__constructor=function(){this.type=b2Joint.e_distanceJoint;this.length=1;this.dampingRatio=this.frequencyHz=0};a.__varz=function(){this.localAnchor1=new b2Vec2;this.localAnchor2=new b2Vec2};
a.localAnchor1=new b2Vec2;a.localAnchor2=new b2Vec2;a.length=null;a.frequencyHz=null;a.dampingRatio=null;a.Initialize=function(b,c,d,e){this.body1=b;this.body2=c;this.localAnchor1.SetV(this.body1.GetLocalPoint(d));this.localAnchor2.SetV(this.body2.GetLocalPoint(e));b=e.x-d.x;d=e.y-d.y;this.length=Math.sqrt(b*b+d*d);this.dampingRatio=this.frequencyHz=0};var b2OBB=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2OBB.prototype;a.__constructor=function(){};a.__varz=function(){this.R=new b2Mat22;this.center=new b2Vec2;this.extents=new b2Vec2};a.R=new b2Mat22;a.center=new b2Vec2;a.extents=new b2Vec2;var b2BodyDef=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2BodyDef.prototype;a.__constructor=function(){this.massData.center.SetZero();this.massData.mass=0;this.massData.I=0;this.userData=null;this.position.Set(0,0);this.angularDamping=this.linearDamping=this.angle=0;this.allowSleep=true;this.isBullet=this.fixedRotation=this.isSleeping=false};a.__varz=function(){this.massData=new b2MassData;this.position=new b2Vec2};a.massData=new b2MassData;a.userData=null;a.position=new b2Vec2;
a.angle=null;a.linearDamping=null;a.angularDamping=null;a.allowSleep=null;a.isSleeping=null;a.fixedRotation=null;a.isBullet=null;var b2PrismaticJointDef=function(){b2JointDef.prototype.__varz.call(this);this.__varz();this.__constructor.apply(this,arguments)};extend(b2PrismaticJointDef.prototype,b2JointDef.prototype);a=b2PrismaticJointDef.prototype;a._super=function(){b2JointDef.prototype.__constructor.apply(this,arguments)};
a.__constructor=function(){this.type=b2Joint.e_prismaticJoint;this.localAxis1.Set(1,0);this.referenceAngle=0;this.enableLimit=false;this.upperTranslation=this.lowerTranslation=0;this.enableMotor=false;this.motorSpeed=this.maxMotorForce=0};a.__varz=function(){this.localAnchor1=new b2Vec2;this.localAnchor2=new b2Vec2;this.localAxis1=new b2Vec2};a.localAnchor1=new b2Vec2;a.localAnchor2=new b2Vec2;a.localAxis1=new b2Vec2;a.referenceAngle=null;a.enableLimit=null;a.lowerTranslation=null;
a.upperTranslation=null;a.enableMotor=null;a.maxMotorForce=null;a.motorSpeed=null;a.Initialize=function(b,c,d,e){this.body1=b;this.body2=c;this.localAnchor1=this.body1.GetLocalPoint(d);this.localAnchor2=this.body2.GetLocalPoint(d);this.localAxis1=this.body1.GetLocalVector(e);this.referenceAngle=this.body2.GetAngle()-this.body1.GetAngle()};var b2ContactID=function(){this.__varz();this.__constructor.apply(this,arguments)};b2ContactID.prototype={key:function(){return this._key},key:function(b){this._key=b;this.features._referenceEdge=this._key&255;this.features._incidentEdge=(this._key&65280)>>8&255;this.features._incidentVertex=(this._key&16711680)>>16&255;this.features._flip=(this._key&4278190080)>>24&255}};a=b2ContactID.prototype;a.__constructor=function(){this.features._m_id=this};a.__varz=function(){this.features=new Features};
a.features=new Features;a._key=0;a.Set=function(b){this.key=b._key};a.Copy=function(){var b=new b2ContactID;b.key=this._key;return b};var b2RevoluteJointDef=function(){b2JointDef.prototype.__varz.call(this);this.__varz();this.__constructor.apply(this,arguments)};extend(b2RevoluteJointDef.prototype,b2JointDef.prototype);a=b2RevoluteJointDef.prototype;a._super=function(){b2JointDef.prototype.__constructor.apply(this,arguments)};
a.__constructor=function(){this.type=b2Joint.e_revoluteJoint;this.localAnchor1.Set(0,0);this.localAnchor2.Set(0,0);this.motorSpeed=this.maxMotorTorque=this.upperAngle=this.lowerAngle=this.referenceAngle=0;this.enableMotor=this.enableLimit=false};a.__varz=function(){this.localAnchor1=new b2Vec2;this.localAnchor2=new b2Vec2};a.localAnchor1=new b2Vec2;a.localAnchor2=new b2Vec2;a.referenceAngle=null;a.enableLimit=null;a.lowerAngle=null;a.upperAngle=null;a.enableMotor=null;a.motorSpeed=null;
a.maxMotorTorque=null;a.Initialize=function(b,c,d){this.body1=b;this.body2=c;this.localAnchor1=this.body1.GetLocalPoint(d);this.localAnchor2=this.body2.GetLocalPoint(d);this.referenceAngle=this.body2.GetAngle()-this.body1.GetAngle()};var b2CircleShape=function(){b2Shape.prototype.__varz.call(this);this.__varz();this.__constructor.apply(this,arguments)};extend(b2CircleShape.prototype,b2Shape.prototype);a=b2CircleShape.prototype;a._super=function(){b2Shape.prototype.__constructor.apply(this,arguments)};a.__constructor=function(b){this._super(b);this.m_type=b2Shape.e_circleShape;this.m_localPosition.SetV(b.localPosition);this.m_radius=b.radius};a.__varz=function(){this.m_localPosition=new b2Vec2};a.m_localPosition=new b2Vec2;
a.m_radius=null;a.TestPoint=function(b,c){var d=b.R,e=b.position.x+(d.col1.x*this.m_localPosition.x+d.col2.x*this.m_localPosition.y);b=b.position.y+(d.col1.y*this.m_localPosition.x+d.col2.y*this.m_localPosition.y);e=c.x-e;b=c.y-b;return e*e+b*b<=this.m_radius*this.m_radius};
a.TestSegment=function(b,c,d,e,f){var g=b.R,h=e.p1.x-(b.position.x+(g.col1.x*this.m_localPosition.x+g.col2.x*this.m_localPosition.y));b=e.p1.y-(b.position.y+(g.col1.y*this.m_localPosition.x+g.col2.y*this.m_localPosition.y));var i=h*h+b*b-this.m_radius*this.m_radius;if(i<0){c[0]=0;return b2Shape.e_startsInsideCollide}g=e.p2.x-e.p1.x;e=e.p2.y-e.p1.y;var j=h*g+b*e,k=g*g+e*e;i=j*j-k*i;if(i<0||k<Number.MIN_VALUE)return b2Shape.e_missCollide;i=-(j+Math.sqrt(i));if(0<=i&&i<=f*k){i/=k;c[0]=i;d.x=h+i*g;d.y=
b+i*e;d.Normalize();return b2Shape.e_hitCollide}return b2Shape.e_missCollide};a.ComputeAABB=function(b,c){var d=c.R,e=c.position.x+(d.col1.x*this.m_localPosition.x+d.col2.x*this.m_localPosition.y);c=c.position.y+(d.col1.y*this.m_localPosition.x+d.col2.y*this.m_localPosition.y);b.lowerBound.Set(e-this.m_radius,c-this.m_radius);b.upperBound.Set(e+this.m_radius,c+this.m_radius)};
a.ComputeSweptAABB=function(b,c,d){var e;e=c.R;var f=c.position.x+(e.col1.x*this.m_localPosition.x+e.col2.x*this.m_localPosition.y);c=c.position.y+(e.col1.y*this.m_localPosition.x+e.col2.y*this.m_localPosition.y);e=d.R;var g=d.position.x+(e.col1.x*this.m_localPosition.x+e.col2.x*this.m_localPosition.y);d=d.position.y+(e.col1.y*this.m_localPosition.x+e.col2.y*this.m_localPosition.y);b.lowerBound.Set((f<g?f:g)-this.m_radius,(c<d?c:d)-this.m_radius);b.upperBound.Set((f>g?f:g)+this.m_radius,(c>d?c:d)+
this.m_radius)};a.ComputeMass=function(b){b.mass=this.m_density*b2Settings.b2_pi*this.m_radius*this.m_radius;b.center.SetV(this.m_localPosition);b.I=b.mass*(0.5*this.m_radius*this.m_radius+(this.m_localPosition.x*this.m_localPosition.x+this.m_localPosition.y*this.m_localPosition.y))};a.GetLocalPosition=function(){return this.m_localPosition};a.GetRadius=function(){return this.m_radius};
a.UpdateSweepRadius=function(b){var c=this.m_localPosition.x-b.x;b=this.m_localPosition.y-b.y;c=Math.sqrt(c*c+b*b);this.m_sweepRadius=c+this.m_radius-b2Settings.b2_toiSlop};var b2Joint=function(){this.__varz();this.__constructor.apply(this,arguments)};b2Joint.prototype.__constructor=function(b){this.m_type=b.type;this.m_next=this.m_prev=null;this.m_body1=b.body1;this.m_body2=b.body2;this.m_collideConnected=b.collideConnected;this.m_islandFlag=false;this.m_userData=b.userData};b2Joint.prototype.__varz=function(){this.m_node1=new b2JointEdge;this.m_node2=new b2JointEdge};b2Joint.e_unknownJoint=0;b2Joint.e_revoluteJoint=1;b2Joint.e_prismaticJoint=2;
b2Joint.e_distanceJoint=3;b2Joint.e_pulleyJoint=4;b2Joint.e_mouseJoint=5;b2Joint.e_gearJoint=6;b2Joint.e_inactiveLimit=0;b2Joint.e_atLowerLimit=1;b2Joint.e_atUpperLimit=2;b2Joint.e_equalLimits=3;
b2Joint.Create=function(b){var c=null;switch(b.type){case b2Joint.e_distanceJoint:c=new b2DistanceJoint(b);break;case b2Joint.e_mouseJoint:c=new b2MouseJoint(b);break;case b2Joint.e_prismaticJoint:c=new b2PrismaticJoint(b);break;case b2Joint.e_revoluteJoint:c=new b2RevoluteJoint(b);break;case b2Joint.e_pulleyJoint:c=new b2PulleyJoint(b);break;case b2Joint.e_gearJoint:c=new b2GearJoint(b);break;default:break}return c};b2Joint.Destroy=function(){};a=b2Joint.prototype;a.m_type=0;a.m_prev=null;
a.m_next=null;a.m_node1=new b2JointEdge;a.m_node2=new b2JointEdge;a.m_body1=null;a.m_body2=null;a.m_inv_dt=null;a.m_islandFlag=null;a.m_collideConnected=null;a.m_userData=null;a.GetType=function(){return this.m_type};a.GetAnchor1=function(){return null};a.GetAnchor2=function(){return null};a.GetReactionForce=function(){return null};a.GetReactionTorque=function(){return 0};a.GetBody1=function(){return this.m_body1};a.GetBody2=function(){return this.m_body2};a.GetNext=function(){return this.m_next};
a.GetUserData=function(){return this.m_userData};a.SetUserData=function(b){this.m_userData=b};a.InitVelocityConstraints=function(){};a.SolveVelocityConstraints=function(){};a.InitPositionConstraints=function(){};a.SolvePositionConstraints=function(){return false};var b2GearJoint=function(){b2Joint.prototype.__varz.call(this);this.__varz();this.__constructor.apply(this,arguments)};extend(b2GearJoint.prototype,b2Joint.prototype);a=b2GearJoint.prototype;a._super=function(){b2Joint.prototype.__constructor.apply(this,arguments)};
a.__constructor=function(b){this._super(b);var c=b.joint1.m_type,d=b.joint2.m_type;this.m_prismatic2=this.m_revolute2=this.m_prismatic1=this.m_revolute1=null;this.m_ground1=b.joint1.m_body1;this.m_body1=b.joint1.m_body2;if(c==b2Joint.e_revoluteJoint){this.m_revolute1=b.joint1;this.m_groundAnchor1.SetV(this.m_revolute1.m_localAnchor1);this.m_localAnchor1.SetV(this.m_revolute1.m_localAnchor2);c=this.m_revolute1.GetJointAngle()}else{this.m_prismatic1=b.joint1;this.m_groundAnchor1.SetV(this.m_prismatic1.m_localAnchor1);
this.m_localAnchor1.SetV(this.m_prismatic1.m_localAnchor2);c=this.m_prismatic1.GetJointTranslation()}this.m_ground2=b.joint2.m_body1;this.m_body2=b.joint2.m_body2;if(d==b2Joint.e_revoluteJoint){this.m_revolute2=b.joint2;this.m_groundAnchor2.SetV(this.m_revolute2.m_localAnchor1);this.m_localAnchor2.SetV(this.m_revolute2.m_localAnchor2);d=this.m_revolute2.GetJointAngle()}else{this.m_prismatic2=b.joint2;this.m_groundAnchor2.SetV(this.m_prismatic2.m_localAnchor1);this.m_localAnchor2.SetV(this.m_prismatic2.m_localAnchor2);
d=this.m_prismatic2.GetJointTranslation()}this.m_ratio=b.ratio;this.m_constant=c+this.m_ratio*d;this.m_force=0};a.__varz=function(){this.m_groundAnchor1=new b2Vec2;this.m_groundAnchor2=new b2Vec2;this.m_localAnchor1=new b2Vec2;this.m_localAnchor2=new b2Vec2;this.m_J=new b2Jacobian};a.m_ground1=null;a.m_ground2=null;a.m_revolute1=null;a.m_prismatic1=null;a.m_revolute2=null;a.m_prismatic2=null;a.m_groundAnchor1=new b2Vec2;a.m_groundAnchor2=new b2Vec2;a.m_localAnchor1=new b2Vec2;a.m_localAnchor2=new b2Vec2;
a.m_J=new b2Jacobian;a.m_constant=null;a.m_ratio=null;a.m_mass=null;a.m_force=null;a.GetAnchor1=function(){return this.m_body1.GetWorldPoint(this.m_localAnchor1)};a.GetAnchor2=function(){return this.m_body2.GetWorldPoint(this.m_localAnchor2)};a.GetReactionForce=function(){return new b2Vec2(this.m_force*this.m_J.linear2.x,this.m_force*this.m_J.linear2.y)};
a.GetReactionTorque=function(){var b=this.m_body2.m_xf.R,c=this.m_localAnchor1.x-this.m_body2.m_sweep.localCenter.x,d=this.m_localAnchor1.y-this.m_body2.m_sweep.localCenter.y,e=b.col1.x*c+b.col2.x*d;d=b.col1.y*c+b.col2.y*d;c=e;return e=this.m_force*this.m_J.angular2-(c*this.m_force*this.m_J.linear2.y-d*this.m_force*this.m_J.linear2.x)};a.GetRatio=function(){return this.m_ratio};
a.InitVelocityConstraints=function(b){var c=this.m_ground1,d=this.m_ground2,e=this.m_body1,f=this.m_body2,g,h,i,j,k,l=0;this.m_J.SetZero();if(this.m_revolute1){this.m_J.angular1=-1;l+=e.m_invI}else{j=c.m_xf.R;g=this.m_prismatic1.m_localXAxis1;c=j.col1.x*g.x+j.col2.x*g.y;g=j.col1.y*g.x+j.col2.y*g.y;j=e.m_xf.R;h=this.m_localAnchor1.x-e.m_sweep.localCenter.x;i=this.m_localAnchor1.y-e.m_sweep.localCenter.y;k=j.col1.x*h+j.col2.x*i;i=j.col1.y*h+j.col2.y*i;h=k;j=h*g-i*c;this.m_J.linear1.Set(-c,-g);this.m_J.angular1=
-j;l+=e.m_invMass+e.m_invI*j*j}if(this.m_revolute2){this.m_J.angular2=-this.m_ratio;l+=this.m_ratio*this.m_ratio*f.m_invI}else{j=d.m_xf.R;g=this.m_prismatic2.m_localXAxis1;c=j.col1.x*g.x+j.col2.x*g.y;g=j.col1.y*g.x+j.col2.y*g.y;j=f.m_xf.R;h=this.m_localAnchor2.x-f.m_sweep.localCenter.x;i=this.m_localAnchor2.y-f.m_sweep.localCenter.y;k=j.col1.x*h+j.col2.x*i;i=j.col1.y*h+j.col2.y*i;h=k;j=h*g-i*c;this.m_J.linear2.Set(-this.m_ratio*c,-this.m_ratio*g);this.m_J.angular2=-this.m_ratio*j;l+=this.m_ratio*
this.m_ratio*(f.m_invMass+f.m_invI*j*j)}this.m_mass=1/l;if(b.warmStarting){b=b.dt*this.m_force;e.m_linearVelocity.x+=e.m_invMass*b*this.m_J.linear1.x;e.m_linearVelocity.y+=e.m_invMass*b*this.m_J.linear1.y;e.m_angularVelocity+=e.m_invI*b*this.m_J.angular1;f.m_linearVelocity.x+=f.m_invMass*b*this.m_J.linear2.x;f.m_linearVelocity.y+=f.m_invMass*b*this.m_J.linear2.y;f.m_angularVelocity+=f.m_invI*b*this.m_J.angular2}else this.m_force=0};
a.SolveVelocityConstraints=function(b){var c=this.m_body1,d=this.m_body2,e=this.m_J.Compute(c.m_linearVelocity,c.m_angularVelocity,d.m_linearVelocity,d.m_angularVelocity);e=-b.inv_dt*this.m_mass*e;this.m_force+=e;b=b.dt*e;c.m_linearVelocity.x+=c.m_invMass*b*this.m_J.linear1.x;c.m_linearVelocity.y+=c.m_invMass*b*this.m_J.linear1.y;c.m_angularVelocity+=c.m_invI*b*this.m_J.angular1;d.m_linearVelocity.x+=d.m_invMass*b*this.m_J.linear2.x;d.m_linearVelocity.y+=d.m_invMass*b*this.m_J.linear2.y;d.m_angularVelocity+=
d.m_invI*b*this.m_J.angular2};
a.SolvePositionConstraints=function(){var b=this.m_body1,c=this.m_body2,d,e;d=this.m_revolute1?this.m_revolute1.GetJointAngle():this.m_prismatic1.GetJointTranslation();e=this.m_revolute2?this.m_revolute2.GetJointAngle():this.m_prismatic2.GetJointTranslation();d=-this.m_mass*(this.m_constant-(d+this.m_ratio*e));b.m_sweep.c.x+=b.m_invMass*d*this.m_J.linear1.x;b.m_sweep.c.y+=b.m_invMass*d*this.m_J.linear1.y;b.m_sweep.a+=b.m_invI*d*this.m_J.angular1;c.m_sweep.c.x+=c.m_invMass*d*this.m_J.linear2.x;c.m_sweep.c.y+=
c.m_invMass*d*this.m_J.linear2.y;c.m_sweep.a+=c.m_invI*d*this.m_J.angular2;b.SynchronizeTransform();c.SynchronizeTransform();return 0<b2Settings.b2_linearSlop};var b2GearJointDef=function(){b2JointDef.prototype.__varz.call(this);this.__varz();this.__constructor.apply(this,arguments)};extend(b2GearJointDef.prototype,b2JointDef.prototype);a=b2GearJointDef.prototype;a._super=function(){b2JointDef.prototype.__constructor.apply(this,arguments)};a.__constructor=function(){this.type=b2Joint.e_gearJoint;this.joint2=this.joint1=null;this.ratio=1};a.__varz=function(){};a.joint1=null;a.joint2=null;a.ratio=null;var b2BroadPhase=function(){this.__varz();this.__constructor.apply(this,arguments)};
b2BroadPhase.prototype.__constructor=function(b,c){var d=0;this.m_pairManager.Initialize(this,c);this.m_worldAABB=b;for(d=this.m_proxyCount=0;d<b2Settings.b2_maxProxies;d++){this.m_queryResults[d]=0;this.m_querySortKeys[d]=0}this.m_bounds=new Array(2);for(d=0;d<2;d++){this.m_bounds[d]=new Array(2*b2Settings.b2_maxProxies);for(c=0;c<2*b2Settings.b2_maxProxies;c++)this.m_bounds[d][c]=new b2Bound}d=b.upperBound.y-b.lowerBound.y;this.m_quantizationFactor.x=b2Settings.USHRT_MAX/(b.upperBound.x-b.lowerBound.x);
this.m_quantizationFactor.y=b2Settings.USHRT_MAX/d;for(d=0;d<b2Settings.b2_maxProxies-1;++d){b=new b2Proxy;this.m_proxyPool[d]=b;b.SetNext(d+1);b.timeStamp=0;b.overlapCount=b2BroadPhase.b2_invalid;b.userData=null}b=new b2Proxy;this.m_proxyPool[parseInt(b2Settings.b2_maxProxies-1)]=b;b.SetNext(b2Pair.b2_nullProxy);b.timeStamp=0;b.overlapCount=b2BroadPhase.b2_invalid;b.userData=null;this.m_freeProxy=0;this.m_timeStamp=1;this.m_queryResultCount=0};
b2BroadPhase.prototype.__varz=function(){this.m_pairManager=new b2PairManager;this.m_proxyPool=new Array(b2Settings.b2_maxPairs);this.m_bounds=new Array(2*b2Settings.b2_maxProxies);this.m_querySortKeys=new Array(b2Settings.b2_maxProxies);this.m_queryResults=new Array(b2Settings.b2_maxProxies);this.m_quantizationFactor=new b2Vec2};b2BroadPhase.s_validate=false;b2BroadPhase.b2_invalid=b2Settings.USHRT_MAX;b2BroadPhase.b2_nullEdge=b2Settings.USHRT_MAX;
b2BroadPhase.BinarySearch=function(b,c,d){var e=0;for(c=c-1;e<=c;){var f=Math.round((e+c)/2),g=b[f];if(g.value>d)c=f-1;else if(g.value<d)e=f+1;else return parseInt(f)}return parseInt(e)};a=b2BroadPhase.prototype;a.m_pairManager=new b2PairManager;a.m_proxyPool=new Array(b2Settings.b2_maxPairs);a.m_freeProxy=0;a.m_bounds=new Array(2*b2Settings.b2_maxProxies);a.m_querySortKeys=new Array(b2Settings.b2_maxProxies);a.m_queryResults=new Array(b2Settings.b2_maxProxies);a.m_queryResultCount=0;
a.m_worldAABB=null;a.m_quantizationFactor=new b2Vec2;a.m_proxyCount=0;a.m_timeStamp=0;
a.ComputeBounds=function(b,c,d){var e=d.lowerBound.x,f=d.lowerBound.y;e=b2Math.b2Min(e,this.m_worldAABB.upperBound.x);f=b2Math.b2Min(f,this.m_worldAABB.upperBound.y);e=b2Math.b2Max(e,this.m_worldAABB.lowerBound.x);f=b2Math.b2Max(f,this.m_worldAABB.lowerBound.y);var g=d.upperBound.x;d=d.upperBound.y;g=b2Math.b2Min(g,this.m_worldAABB.upperBound.x);d=b2Math.b2Min(d,this.m_worldAABB.upperBound.y);g=b2Math.b2Max(g,this.m_worldAABB.lowerBound.x);d=b2Math.b2Max(d,this.m_worldAABB.lowerBound.y);b[0]=parseInt(this.m_quantizationFactor.x*
(e-this.m_worldAABB.lowerBound.x))&b2Settings.USHRT_MAX-1;c[0]=parseInt(this.m_quantizationFactor.x*(g-this.m_worldAABB.lowerBound.x))%65535|1;b[1]=parseInt(this.m_quantizationFactor.y*(f-this.m_worldAABB.lowerBound.y))&b2Settings.USHRT_MAX-1;c[1]=parseInt(this.m_quantizationFactor.y*(d-this.m_worldAABB.lowerBound.y))%65535|1};
a.TestOverlapValidate=function(b,c){for(var d=0;d<2;++d){var e=this.m_bounds[d],f=e[b.lowerBounds[d]],g=e[c.upperBounds[d]];if(f.value>g.value)return false;f=e[b.upperBounds[d]];g=e[c.lowerBounds[d]];if(f.value<g.value)return false}return true};
a.Query=function(b,c,d,e,f,g,h){d=b2BroadPhase.BinarySearch(f,g,d);e=b2BroadPhase.BinarySearch(f,g,e);for(var i=d;i<e;++i){g=f[i];g.IsLower()&&this.IncrementOverlapCount(g.proxyId)}if(d>0){i=d-1;g=f[i];for(var j=g.stabbingCount;j>0;){g=f[i];if(g.IsLower())if(d<=this.m_proxyPool[g.proxyId].upperBounds[h]){this.IncrementOverlapCount(g.proxyId);--j}--i}}b[0]=d;c[0]=e};
a.IncrementOverlapCount=function(b){var c=this.m_proxyPool[b];if(c.timeStamp<this.m_timeStamp){c.timeStamp=this.m_timeStamp;c.overlapCount=1}else{c.overlapCount=2;this.m_queryResults[this.m_queryResultCount]=b;++this.m_queryResultCount}};a.IncrementTimeStamp=function(){if(this.m_timeStamp==b2Settings.USHRT_MAX){for(var b=0;b<b2Settings.b2_maxProxies;++b)this.m_proxyPool[b].timeStamp=0;this.m_timeStamp=1}else++this.m_timeStamp};
a.AddProxyResult=function(b,c,d,e){e=e(c.userData);if(!(e<0)){for(c=0;c<this.m_queryResultCount&&this.m_querySortKeys[c]<e;)c++;e=e;b=b;this.m_queryResultCount+=1;if(this.m_queryResultCount>d)this.m_queryResultCount=d;for(;c<this.m_queryResultCount;){d=this.m_querySortKeys[c];var f=this.m_queryResults[c];this.m_querySortKeys[c]=e;this.m_queryResults[c]=b;e=d;b=f;c++}}};
a.InRange=function(b){var c,d,e,f;c=b.lowerBound.x;d=b.lowerBound.y;c-=this.m_worldAABB.upperBound.x;d-=this.m_worldAABB.upperBound.y;e=this.m_worldAABB.lowerBound.x;f=this.m_worldAABB.lowerBound.y;e-=b.upperBound.x;f-=b.upperBound.y;c=b2Math.b2Max(c,e);d=b2Math.b2Max(d,f);return b2Math.b2Max(c,d)<0};a.GetProxy=function(b){var c=this.m_proxyPool[b];if(b==b2Pair.b2_nullProxy||c.IsValid()==false)return null;return c};
a.CreateProxy=function(b,c){var d=0,e,f=this.m_freeProxy;e=this.m_proxyPool[f];this.m_freeProxy=e.GetNext();e.overlapCount=0;e.userData=c;c=2*this.m_proxyCount;e=[];var g=[];this.ComputeBounds(e,g,b);for(b=0;b<2;++b){var h=this.m_bounds[b],i=0,j=0;i=[i];j=[j];this.Query(i,j,e[b],g[b],h,c,b);i=i[0];j=j[0];var k=[],l=0,m=c-j,n;for(l=0;l<m;l++){k[l]=new b2Bound;n=k[l];d=h[parseInt(j+l)];n.value=d.value;n.proxyId=d.proxyId;n.stabbingCount=d.stabbingCount}m=k.length;var o=j+2;for(l=0;l<m;l++){d=k[l];n=
h[parseInt(o+l)];n.value=d.value;n.proxyId=d.proxyId;n.stabbingCount=d.stabbingCount}k=[];m=j-i;for(l=0;l<m;l++){k[l]=new b2Bound;n=k[l];d=h[parseInt(i+l)];n.value=d.value;n.proxyId=d.proxyId;n.stabbingCount=d.stabbingCount}m=k.length;o=i+1;for(l=0;l<m;l++){d=k[l];n=h[parseInt(o+l)];n.value=d.value;n.proxyId=d.proxyId;n.stabbingCount=d.stabbingCount}++j;n=h[i];d=h[j];n.value=e[b];n.proxyId=f;d.value=g[b];d.proxyId=f;k=h[parseInt(i-1)];n.stabbingCount=i==0?0:k.stabbingCount;k=h[parseInt(j-1)];d.stabbingCount=
k.stabbingCount;for(d=i;d<j;++d){k=h[d];k.stabbingCount++}for(d=i;d<c+2;++d){n=h[d];i=this.m_proxyPool[n.proxyId];if(n.IsLower())i.lowerBounds[b]=d;else i.upperBounds[b]=d}}++this.m_proxyCount;for(c=0;c<this.m_queryResultCount;++c)this.m_pairManager.AddBufferedPair(f,this.m_queryResults[c]);this.m_pairManager.Commit();this.m_queryResultCount=0;this.IncrementTimeStamp();return f};
a.DestroyProxy=function(b){for(var c,d,e=this.m_proxyPool[b],f=2*this.m_proxyCount,g=0;g<2;++g){var h=this.m_bounds[g],i=e.lowerBounds[g],j=e.upperBounds[g];c=h[i];var k=c.value;d=h[j];var l=d.value,m=[],n=0,o=j-i-1;for(n=0;n<o;n++){m[n]=new b2Bound;c=m[n];d=h[parseInt(i+1+n)];c.value=d.value;c.proxyId=d.proxyId;c.stabbingCount=d.stabbingCount}o=m.length;var q=i;for(n=0;n<o;n++){d=m[n];c=h[parseInt(q+n)];c.value=d.value;c.proxyId=d.proxyId;c.stabbingCount=d.stabbingCount}m=[];o=f-j-1;for(n=0;n<o;n++){m[n]=
new b2Bound;c=m[n];d=h[parseInt(j+1+n)];c.value=d.value;c.proxyId=d.proxyId;c.stabbingCount=d.stabbingCount}o=m.length;q=j-1;for(n=0;n<o;n++){d=m[n];c=h[parseInt(q+n)];c.value=d.value;c.proxyId=d.proxyId;c.stabbingCount=d.stabbingCount}o=f-2;for(d=i;d<o;++d){c=h[d];m=this.m_proxyPool[c.proxyId];if(c.IsLower())m.lowerBounds[g]=d;else m.upperBounds[g]=d}o=j-1;for(i=i;i<o;++i){c=h[i];c.stabbingCount--}this.Query([0],[0],k,l,h,f-2,g)}for(c=0;c<this.m_queryResultCount;++c)this.m_pairManager.RemoveBufferedPair(b,
this.m_queryResults[c]);this.m_pairManager.Commit();this.m_queryResultCount=0;this.IncrementTimeStamp();e.userData=null;e.overlapCount=b2BroadPhase.b2_invalid;e.lowerBounds[0]=b2BroadPhase.b2_invalid;e.lowerBounds[1]=b2BroadPhase.b2_invalid;e.upperBounds[0]=b2BroadPhase.b2_invalid;e.upperBounds[1]=b2BroadPhase.b2_invalid;e.SetNext(this.m_freeProxy);this.m_freeProxy=b;--this.m_proxyCount};
a.MoveProxy=function(b,c){var d,e,f=0,g=0,h;d=0;if(!(b==b2Pair.b2_nullProxy||b2Settings.b2_maxProxies<=b))if(c.IsValid()!=false){var i=2*this.m_proxyCount,j=this.m_proxyPool[b],k=new b2BoundValues;this.ComputeBounds(k.lowerValues,k.upperValues,c);var l=new b2BoundValues;for(f=0;f<2;++f){c=this.m_bounds[f][j.lowerBounds[f]];l.lowerValues[f]=c.value;c=this.m_bounds[f][j.upperBounds[f]];l.upperValues[f]=c.value}for(f=0;f<2;++f){var m=this.m_bounds[f],n=j.lowerBounds[f],o=j.upperBounds[f],q=k.lowerValues[f],
r=k.upperValues[f];c=m[n];var s=q-c.value;c.value=q;c=m[o];var v=r-c.value;c.value=r;if(s<0)for(g=n;g>0&&q<m[parseInt(g-1)].value;){c=m[g];h=m[parseInt(g-1)];d=h.proxyId;e=this.m_proxyPool[h.proxyId];h.stabbingCount++;if(h.IsUpper()==true){this.TestOverlap(k,e)&&this.m_pairManager.AddBufferedPair(b,d);d=e.upperBounds;e=d[f];e++;d[f]=e;c.stabbingCount++}else{d=e.lowerBounds;e=d[f];e++;d[f]=e;c.stabbingCount--}d=j.lowerBounds;e=d[f];e--;d[f]=e;c.Swap(h);--g}if(v>0)for(g=o;g<i-1&&m[parseInt(g+1)].value<=
r;){c=m[g];h=m[parseInt(g+1)];d=h.proxyId;e=this.m_proxyPool[d];h.stabbingCount++;if(h.IsLower()==true){this.TestOverlap(k,e)&&this.m_pairManager.AddBufferedPair(b,d);d=e.lowerBounds;e=d[f];e--;d[f]=e;c.stabbingCount++}else{d=e.upperBounds;e=d[f];e--;d[f]=e;c.stabbingCount--}d=j.upperBounds;e=d[f];e++;d[f]=e;c.Swap(h);g++}if(s>0)for(g=n;g<i-1&&m[parseInt(g+1)].value<=q;){c=m[g];h=m[parseInt(g+1)];d=h.proxyId;e=this.m_proxyPool[d];h.stabbingCount--;if(h.IsUpper()){this.TestOverlap(l,e)&&this.m_pairManager.RemoveBufferedPair(b,
d);d=e.upperBounds;e=d[f];e--;d[f]=e;c.stabbingCount--}else{d=e.lowerBounds;e=d[f];e--;d[f]=e;c.stabbingCount++}d=j.lowerBounds;e=d[f];e++;d[f]=e;c.Swap(h);g++}if(v<0)for(g=o;g>0&&r<m[parseInt(g-1)].value;){c=m[g];h=m[parseInt(g-1)];d=h.proxyId;e=this.m_proxyPool[d];h.stabbingCount--;if(h.IsLower()==true){this.TestOverlap(l,e)&&this.m_pairManager.RemoveBufferedPair(b,d);d=e.lowerBounds;e=d[f];e++;d[f]=e;c.stabbingCount--}else{d=e.upperBounds;e=d[f];e++;d[f]=e;c.stabbingCount++}d=j.upperBounds;e=d[f];
e--;d[f]=e;c.Swap(h);g--}}}};a.Commit=function(){this.m_pairManager.Commit()};a.QueryAABB=function(b,c,d){var e=[],f=[];this.ComputeBounds(e,f,b);b=[0];var g=[0];this.Query(b,g,e[0],f[0],this.m_bounds[0],2*this.m_proxyCount,0);this.Query(b,g,e[1],f[1],this.m_bounds[1],2*this.m_proxyCount,1);for(f=e=0;f<this.m_queryResultCount&&e<d;++f,++e)c[f]=this.m_proxyPool[this.m_queryResults[f]].userData;this.m_queryResultCount=0;this.IncrementTimeStamp();return e};
a.Validate=function(){for(var b=0;b<2;++b)for(var c=this.m_bounds[b],d=2*this.m_proxyCount,e=0,f=0;f<d;++f)if(c[f].IsLower()==true)e++;else e--};
a.QuerySegment=function(b,c,d,e){var f=(b.p2.x-b.p1.x)*this.m_quantizationFactor.x,g=(b.p2.y-b.p1.y)*this.m_quantizationFactor.y,h=f<-Number.MIN_VALUE?-1:f>Number.MIN_VALUE?1:0,i=g<-Number.MIN_VALUE?-1:g>Number.MIN_VALUE?1:0,j=this.m_quantizationFactor.x*(b.p1.x-this.m_worldAABB.lowerBound.x);b=this.m_quantizationFactor.y*(b.p1.y-this.m_worldAABB.lowerBound.y);var k=[],l=[];k[0]=parseInt(j)&b2Settings.USHRT_MAX-1;k[1]=parseInt(b)&b2Settings.USHRT_MAX-1;l[0]=k[0]+1;l[1]=k[1]+1;var m=0,n=0,o=0;n=[0];
o=[0];this.Query(n,o,k[0],l[0],this.m_bounds[0],2*this.m_proxyCount,0);m=h>=0?o[0]-1:n[0];this.Query(n,o,k[1],l[1],this.m_bounds[1],2*this.m_proxyCount,1);n=i>=0?o[0]-1:n[0];if(e!=null){for(k=0;k<this.m_queryResultCount;k++)this.m_querySortKeys[k]=e(this.m_proxyPool[this.m_queryResults[k]].userData);for(k=0;k<this.m_queryResultCount-1;){l=this.m_querySortKeys[k];o=this.m_querySortKeys[k+1];if(l<0?o>=0:l>o&&o>=0){this.m_querySortKeys[k+1]=l;this.m_querySortKeys[k]=o;l=this.m_queryResults[k+1];this.m_queryResults[k+
1]=this.m_queryResults[k];this.m_queryResults[k]=l;k--;if(k==-1)k=1}else k++}for(;this.m_queryResultCount>0&&this.m_querySortKeys[this.m_queryResultCount-1]<0;)this.m_queryResultCount--}k=true;var q,r;if(m<0||m>=this.m_proxyCount*2)k=false;if(n<0||n>=this.m_proxyCount*2)k=false;if(k){if(h!=0){if(h>0){m++;if(m==this.m_proxyCount*2)k=false}else{m--;if(m<0)k=false}q=(this.m_bounds[0][m].value-j)/f}if(i!=0){if(i>0){n++;if(n==this.m_proxyCount*2)k=false}else{n--;if(n<0)k=false}r=(this.m_bounds[1][n].value-
b)/g}}for(;k;)if(i==0||h!=0&&q<r){if(q>1)break;if(h>0?this.m_bounds[0][m].IsLower():this.m_bounds[0][m].IsUpper()){o=this.m_bounds[0][m].proxyId;l=this.m_proxyPool[o];if(i>=0){if(l.lowerBounds[1]<=n-1&&l.upperBounds[1]>=n)if(e!=null)this.AddProxyResult(o,l,d,e);else{this.m_queryResults[this.m_queryResultCount]=o;++this.m_queryResultCount}}else if(l.lowerBounds[1]<=n&&l.upperBounds[1]>=n+1)if(e!=null)this.AddProxyResult(o,l,d,e);else{this.m_queryResults[this.m_queryResultCount]=o;++this.m_queryResultCount}}if(e!=
null&&this.m_queryResultCount==d&&this.m_queryResultCount>0&&q>this.m_querySortKeys[this.m_queryResultCount-1])break;if(h>0){m++;if(m==this.m_proxyCount*2)break}else{m--;if(m<0)break}q=(this.m_bounds[0][m].value-j)/f}else{if(r>1)break;if(i>0?this.m_bounds[1][n].IsLower():this.m_bounds[1][n].IsUpper()){o=this.m_bounds[1][n].proxyId;l=this.m_proxyPool[o];if(h>=0){if(l.lowerBounds[0]<=m-1&&l.upperBounds[0]>=m)if(e!=null)this.AddProxyResult(o,l,d,e);else{this.m_queryResults[this.m_queryResultCount]=o;
++this.m_queryResultCount}}else if(l.lowerBounds[0]<=m&&l.upperBounds[0]>=m+1)if(e!=null)this.AddProxyResult(o,l,d,e);else{this.m_queryResults[this.m_queryResultCount]=o;++this.m_queryResultCount}}if(e!=null&&this.m_queryResultCount==d&&this.m_queryResultCount>0&&r>this.m_querySortKeys[this.m_queryResultCount-1])break;if(i>0){n++;if(n==this.m_proxyCount*2)break}else{n--;if(n<0)break}r=(this.m_bounds[1][n].value-b)/g}for(k=e=0;k<this.m_queryResultCount&&e<d;++k,++e){l=this.m_proxyPool[this.m_queryResults[k]];
c[k]=l.userData}this.m_queryResultCount=0;this.IncrementTimeStamp();return e};a.TestOverlap=function(b,c){for(var d=0;d<2;++d){var e=this.m_bounds[d],f=e[c.upperBounds[d]];if(b.lowerValues[d]>f.value)return false;f=e[c.lowerBounds[d]];if(b.upperValues[d]<f.value)return false}return true};var b2TimeOfImpact=function(){this.__varz();this.__constructor.apply(this,arguments)};b2TimeOfImpact.prototype.__constructor=function(){};b2TimeOfImpact.prototype.__varz=function(){};b2TimeOfImpact.s_p1=new b2Vec2;b2TimeOfImpact.s_p2=new b2Vec2;b2TimeOfImpact.s_xf1=new b2XForm;b2TimeOfImpact.s_xf2=new b2XForm;
b2TimeOfImpact.TimeOfImpact=function(b,c,d,e){var f,g,h=b.m_sweepRadius,i=d.m_sweepRadius,j=c.t0,k=c.c.x-c.c0.x,l=c.c.y-c.c0.y,m=e.c.x-e.c0.x,n=e.c.y-e.c0.y,o=c.a-c.a0,q=e.a-e.a0,r=0,s=b2TimeOfImpact.s_p1,v=b2TimeOfImpact.s_p2,z=0,y=g=0,t=0;for(f=0;;){t=(1-r)*j+r;g=b2TimeOfImpact.s_xf1;y=b2TimeOfImpact.s_xf2;c.GetXForm(g,t);e.GetXForm(y,t);t=b2Distance.Distance(s,v,b,g,d,y);if(z==0)if(t>2*b2Settings.b2_toiSlop)f=1.5*b2Settings.b2_toiSlop;else{f=0.05*b2Settings.b2_toiSlop;g=t-0.5*b2Settings.b2_toiSlop;
f=f>g?f:g}if(t-f<0.05*b2Settings.b2_toiSlop||z==20)break;g=v.x-s.x;y=v.y-s.y;var w=Math.sqrt(g*g+y*y);g/=w;y/=w;g=g*(k-m)+y*(l-n)+(o<0?-o:o)*h+(q<0?-q:q)*i;if(g==0){r=1;break}t=r+(t-f)/g;if(t<0||1<t){r=1;break}if(t<(1+100*Number.MIN_VALUE)*r)break;r=t;++z}return r};var b2ShapeDef=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2ShapeDef.prototype;a.__constructor=function(){};a.__varz=function(){this.type=b2Shape.e_unknownShape;this.filter=new b2FilterData};a.type=b2Shape.e_unknownShape;a.userData=null;a.friction=0.2;a.restitution=0;a.density=0;a.isSensor=false;a.filter=new b2FilterData;var b2PolygonDef=function(){b2ShapeDef.prototype.__varz.call(this);this.__varz();this.__constructor.apply(this,arguments)};extend(b2PolygonDef.prototype,b2ShapeDef.prototype);b2PolygonDef.prototype._super=function(){b2ShapeDef.prototype.__constructor.apply(this,arguments)};b2PolygonDef.prototype.__constructor=function(){this.type=b2Shape.e_polygonShape;for(var b=this.vertexCount=0;b<b2Settings.b2_maxPolygonVertices;b++)this.vertices[b]=new b2Vec2};
b2PolygonDef.prototype.__varz=function(){this.vertices=new Array(b2Settings.b2_maxPolygonVertices)};b2PolygonDef.s_mat=new b2Mat22;b2PolygonDef.prototype.vertices=new Array(b2Settings.b2_maxPolygonVertices);b2PolygonDef.prototype.vertexCount=0;b2PolygonDef.prototype.SetAsBox=function(b,c){this.vertexCount=4;this.vertices[0].Set(-b,-c);this.vertices[1].Set(b,-c);this.vertices[2].Set(b,c);this.vertices[3].Set(-b,c)};
b2PolygonDef.prototype.SetAsOrientedBox=function(b,c,d,e){this.vertexCount=4;this.vertices[0].Set(-b,-c);this.vertices[1].Set(b,-c);this.vertices[2].Set(b,c);this.vertices[3].Set(-b,c);if(d){c=d;var f=b2PolygonDef.s_mat;f.Set(e);for(e=0;e<this.vertexCount;++e){d=this.vertices[e];b=c.x+(f.col1.x*d.x+f.col2.x*d.y);d.y=c.y+(f.col1.y*d.x+f.col2.y*d.y);d.x=b}}};var b2Contact=function(){this.__varz();this.__constructor.apply(this,arguments)};
b2Contact.prototype.__constructor=function(b,c){this.m_flags=0;if(!b||!c)this.m_shape2=this.m_shape1=null;else{if(b.IsSensor()||c.IsSensor())this.m_flags|=b2Contact.e_nonSolidFlag;this.m_shape1=b;this.m_shape2=c;this.m_manifoldCount=0;this.m_friction=Math.sqrt(this.m_shape1.m_friction*this.m_shape2.m_friction);this.m_restitution=b2Math.b2Max(this.m_shape1.m_restitution,this.m_shape2.m_restitution);this.m_next=this.m_prev=null;this.m_node1.contact=null;this.m_node1.prev=null;this.m_node1.next=null;
this.m_node1.other=null;this.m_node2.contact=null;this.m_node2.prev=null;this.m_node2.next=null;this.m_node2.other=null}};b2Contact.prototype.__varz=function(){this.m_node1=new b2ContactEdge;this.m_node2=new b2ContactEdge};b2Contact.e_nonSolidFlag=1;b2Contact.e_slowFlag=2;b2Contact.e_islandFlag=4;b2Contact.e_toiFlag=8;b2Contact.s_registers=null;b2Contact.s_initialized=false;
b2Contact.AddType=function(b,c,d,e){b2Contact.s_registers[d][e].createFcn=b;b2Contact.s_registers[d][e].destroyFcn=c;b2Contact.s_registers[d][e].primary=true;if(d!=e){b2Contact.s_registers[e][d].createFcn=b;b2Contact.s_registers[e][d].destroyFcn=c;b2Contact.s_registers[e][d].primary=false}};
b2Contact.InitializeRegisters=function(){b2Contact.s_registers=new Array(b2Shape.e_shapeTypeCount);for(var b=0;b<b2Shape.e_shapeTypeCount;b++){b2Contact.s_registers[b]=new Array(b2Shape.e_shapeTypeCount);for(var c=0;c<b2Shape.e_shapeTypeCount;c++)b2Contact.s_registers[b][c]=new b2ContactRegister}b2Contact.AddType(b2CircleContact.Create,b2CircleContact.Destroy,b2Shape.e_circleShape,b2Shape.e_circleShape);b2Contact.AddType(b2PolyAndCircleContact.Create,b2PolyAndCircleContact.Destroy,b2Shape.e_polygonShape,
b2Shape.e_circleShape);b2Contact.AddType(b2PolygonContact.Create,b2PolygonContact.Destroy,b2Shape.e_polygonShape,b2Shape.e_polygonShape)};b2Contact.Create=function(b,c,d){if(b2Contact.s_initialized==false){b2Contact.InitializeRegisters();b2Contact.s_initialized=true}var e=b2Contact.s_registers[b.m_type][c.m_type],f=e.createFcn;if(f!=null)if(e.primary)return f(b,c,d);else{b=f(c,b,d);for(c=0;c<b.m_manifoldCount;++c){d=b.GetManifolds()[c];d.normal=d.normal.Negative()}return b}else return null};
b2Contact.Destroy=function(b,c){if(b.m_manifoldCount>0){b.m_shape1.m_body.WakeUp();b.m_shape2.m_body.WakeUp()}var d=b2Contact.s_registers[b.m_shape1.m_type][b.m_shape2.m_type].destroyFcn;d(b,c)};a=b2Contact.prototype;a.m_flags=0;a.m_prev=null;a.m_next=null;a.m_node1=new b2ContactEdge;a.m_node2=new b2ContactEdge;a.m_shape1=null;a.m_shape2=null;a.m_manifoldCount=0;a.m_friction=null;a.m_restitution=null;a.m_toi=null;a.GetManifolds=function(){return null};a.GetManifoldCount=function(){return this.m_manifoldCount};
a.IsSolid=function(){return(this.m_flags&b2Contact.e_nonSolidFlag)==0};a.GetNext=function(){return this.m_next};a.GetShape1=function(){return this.m_shape1};a.GetShape2=function(){return this.m_shape2};a.Update=function(b){var c=this.m_manifoldCount;this.Evaluate(b);b=this.m_shape1.m_body;var d=this.m_shape2.m_body;if(this.m_manifoldCount==0&&c>0){b.WakeUp();d.WakeUp()}if(b.IsStatic()||b.IsBullet()||d.IsStatic()||d.IsBullet())this.m_flags&=~b2Contact.e_slowFlag;else this.m_flags|=b2Contact.e_slowFlag};
a.Evaluate=function(){};var b2DistanceJoint=function(){b2Joint.prototype.__varz.call(this);this.__varz();this.__constructor.apply(this,arguments)};extend(b2DistanceJoint.prototype,b2Joint.prototype);a=b2DistanceJoint.prototype;a._super=function(){b2Joint.prototype.__constructor.apply(this,arguments)};
a.__constructor=function(b){this._super(b);this.m_localAnchor1.SetV(b.localAnchor1);this.m_localAnchor2.SetV(b.localAnchor2);this.m_length=b.length;this.m_frequencyHz=b.frequencyHz;this.m_dampingRatio=b.dampingRatio;this.m_inv_dt=this.m_bias=this.m_gamma=this.m_impulse=0};a.__varz=function(){this.m_localAnchor1=new b2Vec2;this.m_localAnchor2=new b2Vec2;this.m_u=new b2Vec2};a.m_localAnchor1=new b2Vec2;a.m_localAnchor2=new b2Vec2;a.m_u=new b2Vec2;a.m_frequencyHz=null;a.m_dampingRatio=null;
a.m_gamma=null;a.m_bias=null;a.m_impulse=null;a.m_mass=null;a.m_length=null;
a.InitVelocityConstraints=function(b){var c,d;this.m_inv_dt=b.inv_dt;var e=this.m_body1,f=this.m_body2;c=e.m_xf.R;var g=this.m_localAnchor1.x-e.m_sweep.localCenter.x,h=this.m_localAnchor1.y-e.m_sweep.localCenter.y;d=c.col1.x*g+c.col2.x*h;h=c.col1.y*g+c.col2.y*h;g=d;c=f.m_xf.R;var i=this.m_localAnchor2.x-f.m_sweep.localCenter.x,j=this.m_localAnchor2.y-f.m_sweep.localCenter.y;d=c.col1.x*i+c.col2.x*j;j=c.col1.y*i+c.col2.y*j;i=d;this.m_u.x=f.m_sweep.c.x+i-e.m_sweep.c.x-g;this.m_u.y=f.m_sweep.c.y+j-e.m_sweep.c.y-
h;d=Math.sqrt(this.m_u.x*this.m_u.x+this.m_u.y*this.m_u.y);d>b2Settings.b2_linearSlop?this.m_u.Multiply(1/d):this.m_u.SetZero();c=g*this.m_u.y-h*this.m_u.x;var k=i*this.m_u.y-j*this.m_u.x;c=e.m_invMass+e.m_invI*c*c+f.m_invMass+f.m_invI*k*k;this.m_mass=1/c;if(this.m_frequencyHz>0){d=d-this.m_length;k=2*Math.PI*this.m_frequencyHz;var l=this.m_mass*k*k;this.m_gamma=1/(b.dt*(2*this.m_mass*this.m_dampingRatio*k+b.dt*l));this.m_bias=d*b.dt*l*this.m_gamma;this.m_mass=1/(c+this.m_gamma)}if(b.warmStarting){this.m_impulse*=
b.dtRatio;b=this.m_impulse*this.m_u.x;c=this.m_impulse*this.m_u.y;e.m_linearVelocity.x-=e.m_invMass*b;e.m_linearVelocity.y-=e.m_invMass*c;e.m_angularVelocity-=e.m_invI*(g*c-h*b);f.m_linearVelocity.x+=f.m_invMass*b;f.m_linearVelocity.y+=f.m_invMass*c;f.m_angularVelocity+=f.m_invI*(i*c-j*b)}else this.m_impulse=0};
a.SolveVelocityConstraints=function(){var b,c=this.m_body1,d=this.m_body2;b=c.m_xf.R;var e=this.m_localAnchor1.x-c.m_sweep.localCenter.x,f=this.m_localAnchor1.y-c.m_sweep.localCenter.y,g=b.col1.x*e+b.col2.x*f;f=b.col1.y*e+b.col2.y*f;e=g;b=d.m_xf.R;var h=this.m_localAnchor2.x-d.m_sweep.localCenter.x,i=this.m_localAnchor2.y-d.m_sweep.localCenter.y;g=b.col1.x*h+b.col2.x*i;i=b.col1.y*h+b.col2.y*i;h=g;g=-this.m_mass*(this.m_u.x*(d.m_linearVelocity.x+-d.m_angularVelocity*i-(c.m_linearVelocity.x+-c.m_angularVelocity*
f))+this.m_u.y*(d.m_linearVelocity.y+d.m_angularVelocity*h-(c.m_linearVelocity.y+c.m_angularVelocity*e))+this.m_bias+this.m_gamma*this.m_impulse);this.m_impulse+=g;b=g*this.m_u.x;g=g*this.m_u.y;c.m_linearVelocity.x-=c.m_invMass*b;c.m_linearVelocity.y-=c.m_invMass*g;c.m_angularVelocity-=c.m_invI*(e*g-f*b);d.m_linearVelocity.x+=d.m_invMass*b;d.m_linearVelocity.y+=d.m_invMass*g;d.m_angularVelocity+=d.m_invI*(h*g-i*b)};
a.SolvePositionConstraints=function(){var b;if(this.m_frequencyHz>0)return true;var c=this.m_body1,d=this.m_body2;b=c.m_xf.R;var e=this.m_localAnchor1.x-c.m_sweep.localCenter.x,f=this.m_localAnchor1.y-c.m_sweep.localCenter.y,g=b.col1.x*e+b.col2.x*f;f=b.col1.y*e+b.col2.y*f;e=g;b=d.m_xf.R;var h=this.m_localAnchor2.x-d.m_sweep.localCenter.x,i=this.m_localAnchor2.y-d.m_sweep.localCenter.y;g=b.col1.x*h+b.col2.x*i;i=b.col1.y*h+b.col2.y*i;h=g;g=d.m_sweep.c.x+h-c.m_sweep.c.x-e;var j=d.m_sweep.c.y+i-c.m_sweep.c.y-
f;b=Math.sqrt(g*g+j*j);g/=b;j/=b;b=b-this.m_length;b=b2Math.b2Clamp(b,-b2Settings.b2_maxLinearCorrection,b2Settings.b2_maxLinearCorrection);var k=-this.m_mass*b;this.m_u.Set(g,j);g=k*this.m_u.x;j=k*this.m_u.y;c.m_sweep.c.x-=c.m_invMass*g;c.m_sweep.c.y-=c.m_invMass*j;c.m_sweep.a-=c.m_invI*(e*j-f*g);d.m_sweep.c.x+=d.m_invMass*g;d.m_sweep.c.y+=d.m_invMass*j;d.m_sweep.a+=d.m_invI*(h*j-i*g);c.SynchronizeTransform();d.SynchronizeTransform();return b2Math.b2Abs(b)<b2Settings.b2_linearSlop};
a.GetAnchor1=function(){return this.m_body1.GetWorldPoint(this.m_localAnchor1)};a.GetAnchor2=function(){return this.m_body2.GetWorldPoint(this.m_localAnchor2)};a.GetReactionForce=function(){var b=new b2Vec2;b.SetV(this.m_u);b.Multiply(this.m_inv_dt*this.m_impulse);return b};a.GetReactionTorque=function(){return 0};var b2Body=function(){this.__varz();this.__constructor.apply(this,arguments)};
b2Body.prototype.__constructor=function(b,c){this.m_flags=0;if(b.isBullet)this.m_flags|=b2Body.e_bulletFlag;if(b.fixedRotation)this.m_flags|=b2Body.e_fixedRotationFlag;if(b.allowSleep)this.m_flags|=b2Body.e_allowSleepFlag;if(b.isSleeping)this.m_flags|=b2Body.e_sleepFlag;this.m_world=c;this.m_xf.position.SetV(b.position);this.m_xf.R.Set(b.angle);this.m_sweep.localCenter.SetV(b.massData.center);this.m_sweep.t0=1;this.m_sweep.a0=this.m_sweep.a=b.angle;c=this.m_xf.R;var d=this.m_sweep.localCenter;this.m_sweep.c.x=
c.col1.x*d.x+c.col2.x*d.y;this.m_sweep.c.y=c.col1.y*d.x+c.col2.y*d.y;this.m_sweep.c.x+=this.m_xf.position.x;this.m_sweep.c.y+=this.m_xf.position.y;this.m_sweep.c0.SetV(this.m_sweep.c);this.m_next=this.m_prev=this.m_contactList=this.m_jointList=null;this.m_linearDamping=b.linearDamping;this.m_angularDamping=b.angularDamping;this.m_force.Set(0,0);this.m_torque=0;this.m_linearVelocity.SetZero();this.m_invI=this.m_I=this.m_invMass=this.m_sleepTime=this.m_angularVelocity=0;this.m_mass=b.massData.mass;
if(this.m_mass>0)this.m_invMass=1/this.m_mass;if((this.m_flags&b2Body.e_fixedRotationFlag)==0)this.m_I=b.massData.I;if(this.m_I>0)this.m_invI=1/this.m_I;this.m_type=this.m_invMass==0&&this.m_invI==0?b2Body.e_staticType:b2Body.e_dynamicType;this.m_userData=b.userData;this.m_shapeList=null;this.m_shapeCount=0};b2Body.prototype.__varz=function(){this.m_xf=new b2XForm;this.m_sweep=new b2Sweep;this.m_linearVelocity=new b2Vec2;this.m_force=new b2Vec2};b2Body.e_frozenFlag=2;b2Body.e_islandFlag=4;
b2Body.e_sleepFlag=8;b2Body.e_allowSleepFlag=16;b2Body.e_bulletFlag=32;b2Body.e_fixedRotationFlag=64;b2Body.e_staticType=1;b2Body.e_dynamicType=2;b2Body.e_maxTypes=3;b2Body.s_massData=new b2MassData;b2Body.s_xf1=new b2XForm;a=b2Body.prototype;a.m_flags=0;a.m_type=0;a.m_xf=new b2XForm;a.m_sweep=new b2Sweep;a.m_linearVelocity=new b2Vec2;a.m_angularVelocity=null;a.m_force=new b2Vec2;a.m_torque=null;a.m_world=null;a.m_prev=null;a.m_next=null;a.m_shapeList=null;a.m_shapeCount=0;a.m_jointList=null;
a.m_contactList=null;a.m_mass=null;a.m_invMass=null;a.m_I=null;a.m_invI=null;a.m_linearDamping=null;a.m_angularDamping=null;a.m_sleepTime=null;a.m_userData=null;a.CreateShape=function(b){if(this.m_world.m_lock==true)return null;b=b2Shape.Create(b,this.m_world.m_blockAllocator);b.m_next=this.m_shapeList;this.m_shapeList=b;++this.m_shapeCount;b.m_body=this;b.CreateProxy(this.m_world.m_broadPhase,this.m_xf);b.UpdateSweepRadius(this.m_sweep.localCenter);return b};
a.DestroyShape=function(b){if(this.m_world.m_lock!=true){b.DestroyProxy(this.m_world.m_broadPhase);for(var c=this.m_shapeList;c!=null;){if(c==b)break;c=c.m_next}b.m_body=null;b.m_next=null;--this.m_shapeCount;b2Shape.Destroy(b,this.m_world.m_blockAllocator)}};
a.SetMass=function(b){if(this.m_world.m_lock!=true){this.m_invI=this.m_I=this.m_invMass=0;this.m_mass=b.mass;if(this.m_mass>0)this.m_invMass=1/this.m_mass;if((this.m_flags&b2Body.e_fixedRotationFlag)==0)this.m_I=b.I;if(this.m_I>0)this.m_invI=1/this.m_I;this.m_sweep.localCenter.SetV(b.center);b=this.m_xf.R;var c=this.m_sweep.localCenter;this.m_sweep.c.x=b.col1.x*c.x+b.col2.x*c.y;this.m_sweep.c.y=b.col1.y*c.x+b.col2.y*c.y;this.m_sweep.c.x+=this.m_xf.position.x;this.m_sweep.c.y+=this.m_xf.position.y;
this.m_sweep.c0.SetV(this.m_sweep.c);for(b=this.m_shapeList;b;b=b.m_next)b.UpdateSweepRadius(this.m_sweep.localCenter);b=this.m_type;this.m_type=this.m_invMass==0&&this.m_invI==0?b2Body.e_staticType:b2Body.e_dynamicType;if(b!=this.m_type)for(b=this.m_shapeList;b;b=b.m_next)b.RefilterProxy(this.m_world.m_broadPhase,this.m_xf)}};
a.SetMassFromShapes=function(){var b;if(this.m_world.m_lock!=true){var c=this.m_invI=this.m_I=this.m_invMass=this.m_mass=0,d=0,e=b2Body.s_massData;for(b=this.m_shapeList;b;b=b.m_next){b.ComputeMass(e);this.m_mass+=e.mass;c+=e.mass*e.center.x;d+=e.mass*e.center.y;this.m_I+=e.I}if(this.m_mass>0){this.m_invMass=1/this.m_mass;c*=this.m_invMass;d*=this.m_invMass}if(this.m_I>0&&(this.m_flags&b2Body.e_fixedRotationFlag)==0){this.m_I-=this.m_mass*(c*c+d*d);this.m_invI=1/this.m_I}else this.m_invI=this.m_I=
0;this.m_sweep.localCenter.Set(c,d);b=this.m_xf.R;c=this.m_sweep.localCenter;this.m_sweep.c.x=b.col1.x*c.x+b.col2.x*c.y;this.m_sweep.c.y=b.col1.y*c.x+b.col2.y*c.y;this.m_sweep.c.x+=this.m_xf.position.x;this.m_sweep.c.y+=this.m_xf.position.y;this.m_sweep.c0.SetV(this.m_sweep.c);for(b=this.m_shapeList;b;b=b.m_next)b.UpdateSweepRadius(this.m_sweep.localCenter);b=this.m_type;this.m_type=this.m_invMass==0&&this.m_invI==0?b2Body.e_staticType:b2Body.e_dynamicType;if(b!=this.m_type)for(b=this.m_shapeList;b;b=
b.m_next)b.RefilterProxy(this.m_world.m_broadPhase,this.m_xf)}};
a.SetXForm=function(b,c){if(this.m_world.m_lock==true)return true;if(this.IsFrozen())return false;this.m_xf.R.Set(c);this.m_xf.position.SetV(b);b=this.m_xf.R;var d=this.m_sweep.localCenter;this.m_sweep.c.x=b.col1.x*d.x+b.col2.x*d.y;this.m_sweep.c.y=b.col1.y*d.x+b.col2.y*d.y;this.m_sweep.c.x+=this.m_xf.position.x;this.m_sweep.c.y+=this.m_xf.position.y;this.m_sweep.c0.SetV(this.m_sweep.c);this.m_sweep.a0=this.m_sweep.a=c;b=false;for(c=this.m_shapeList;c;c=c.m_next)if(c.Synchronize(this.m_world.m_broadPhase,
this.m_xf,this.m_xf)==false){b=true;break}if(b==true){this.m_flags|=b2Body.e_frozenFlag;this.m_linearVelocity.SetZero();this.m_angularVelocity=0;for(c=this.m_shapeList;c;c=c.m_next)c.DestroyProxy(this.m_world.m_broadPhase);return false}this.m_world.m_broadPhase.Commit();return true};a.GetXForm=function(){return this.m_xf};a.GetPosition=function(){return this.m_xf.position};a.GetAngle=function(){return this.m_sweep.a};a.GetWorldCenter=function(){return this.m_sweep.c};a.GetLocalCenter=function(){return this.m_sweep.localCenter};
a.SetLinearVelocity=function(b){this.m_linearVelocity.SetV(b)};a.GetLinearVelocity=function(){return this.m_linearVelocity};a.SetAngularVelocity=function(b){this.m_angularVelocity=b};a.GetAngularVelocity=function(){return this.m_angularVelocity};a.ApplyForce=function(b,c){this.IsSleeping()&&this.WakeUp();this.m_force.x+=b.x;this.m_force.y+=b.y;this.m_torque+=(c.x-this.m_sweep.c.x)*b.y-(c.y-this.m_sweep.c.y)*b.x};a.ApplyTorque=function(b){this.IsSleeping()&&this.WakeUp();this.m_torque+=b};
a.ApplyImpulse=function(b,c){this.IsSleeping()&&this.WakeUp();this.m_linearVelocity.x+=this.m_invMass*b.x;this.m_linearVelocity.y+=this.m_invMass*b.y;this.m_angularVelocity+=this.m_invI*((c.x-this.m_sweep.c.x)*b.y-(c.y-this.m_sweep.c.y)*b.x)};a.GetMass=function(){return this.m_mass};a.GetInertia=function(){return this.m_I};a.GetWorldPoint=function(b){var c=this.m_xf.R;b=new b2Vec2(c.col1.x*b.x+c.col2.x*b.y,c.col1.y*b.x+c.col2.y*b.y);b.x+=this.m_xf.position.x;b.y+=this.m_xf.position.y;return b};
a.GetWorldVector=function(b){return b2Math.b2MulMV(this.m_xf.R,b)};a.GetLocalPoint=function(b){return b2Math.b2MulXT(this.m_xf,b)};a.GetLocalVector=function(b){return b2Math.b2MulTMV(this.m_xf.R,b)};a.GetLinearVelocityFromWorldPoint=function(b){return new b2Vec2(this.m_linearVelocity.x+this.m_angularVelocity*(b.y-this.m_sweep.c.y),this.m_linearVelocity.x-this.m_angularVelocity*(b.x-this.m_sweep.c.x))};
a.GetLinearVelocityFromLocalPoint=function(b){var c=this.m_xf.R;b=new b2Vec2(c.col1.x*b.x+c.col2.x*b.y,c.col1.y*b.x+c.col2.y*b.y);b.x+=this.m_xf.position.x;b.y+=this.m_xf.position.y;return new b2Vec2(this.m_linearVelocity.x+this.m_angularVelocity*(b.y-this.m_sweep.c.y),this.m_linearVelocity.x-this.m_angularVelocity*(b.x-this.m_sweep.c.x))};a.IsBullet=function(){return(this.m_flags&b2Body.e_bulletFlag)==b2Body.e_bulletFlag};
a.SetBullet=function(b){if(b)this.m_flags|=b2Body.e_bulletFlag;else this.m_flags&=~b2Body.e_bulletFlag};a.IsStatic=function(){return this.m_type==b2Body.e_staticType};a.IsDynamic=function(){return this.m_type==b2Body.e_dynamicType};a.IsFrozen=function(){return(this.m_flags&b2Body.e_frozenFlag)==b2Body.e_frozenFlag};a.IsSleeping=function(){return(this.m_flags&b2Body.e_sleepFlag)==b2Body.e_sleepFlag};
a.AllowSleeping=function(b){if(b)this.m_flags|=b2Body.e_allowSleepFlag;else{this.m_flags&=~b2Body.e_allowSleepFlag;this.WakeUp()}};a.WakeUp=function(){this.m_flags&=~b2Body.e_sleepFlag;this.m_sleepTime=0};a.PutToSleep=function(){this.m_flags|=b2Body.e_sleepFlag;this.m_sleepTime=0;this.m_linearVelocity.SetZero();this.m_angularVelocity=0;this.m_force.SetZero();this.m_torque=0};a.GetShapeList=function(){return this.m_shapeList};a.GetJointList=function(){return this.m_jointList};a.GetNext=function(){return this.m_next};
a.GetUserData=function(){return this.m_userData};a.SetUserData=function(b){this.m_userData=b};a.GetWorld=function(){return this.m_world};
a.SynchronizeShapes=function(){var b=b2Body.s_xf1;b.R.Set(this.m_sweep.a0);var c=b.R,d=this.m_sweep.localCenter;b.position.x=this.m_sweep.c0.x-(c.col1.x*d.x+c.col2.x*d.y);b.position.y=this.m_sweep.c0.y-(c.col1.y*d.x+c.col2.y*d.y);d=true;for(c=this.m_shapeList;c;c=c.m_next){d=c.Synchronize(this.m_world.m_broadPhase,b,this.m_xf);if(d==false)break}if(d==false){this.m_flags|=b2Body.e_frozenFlag;this.m_linearVelocity.SetZero();this.m_angularVelocity=0;for(c=this.m_shapeList;c;c=c.m_next)c.DestroyProxy(this.m_world.m_broadPhase);
return false}return true};a.SynchronizeTransform=function(){this.m_xf.R.Set(this.m_sweep.a);var b=this.m_xf.R,c=this.m_sweep.localCenter;this.m_xf.position.x=this.m_sweep.c.x-(b.col1.x*c.x+b.col2.x*c.y);this.m_xf.position.y=this.m_sweep.c.y-(b.col1.y*c.x+b.col2.y*c.y)};a.IsConnected=function(b){for(var c=this.m_jointList;c;c=c.next)if(c.other==b)return c.joint.m_collideConnected==false;return false};
a.Advance=function(b){this.m_sweep.Advance(b);this.m_sweep.c.SetV(this.m_sweep.c0);this.m_sweep.a=this.m_sweep.a0;this.SynchronizeTransform()};var b2ContactFilter=function(){this.__varz();this.__constructor.apply(this,arguments)};b2ContactFilter.prototype.__constructor=function(){};b2ContactFilter.prototype.__varz=function(){};b2ContactFilter.b2_defaultFilter=new b2ContactFilter;b2ContactFilter.prototype.ShouldCollide=function(b,c){b=b.GetFilterData();c=c.GetFilterData();if(b.groupIndex==c.groupIndex&&b.groupIndex!=0)return b.groupIndex>0;return(b.maskBits&c.categoryBits)!=0&&(b.categoryBits&c.maskBits)!=0};
b2ContactFilter.prototype.RayCollide=function(b,c){if(!b)return true;return this.ShouldCollide(b,c)};var b2PolygonShape=function(){b2Shape.prototype.__varz.call(this);this.__varz();this.__constructor.apply(this,arguments)};extend(b2PolygonShape.prototype,b2Shape.prototype);b2PolygonShape.prototype._super=function(){b2Shape.prototype.__constructor.apply(this,arguments)};
b2PolygonShape.prototype.__constructor=function(b){this._super(b);this.m_type=b2Shape.e_polygonShape;this.m_vertexCount=b.vertexCount;var c=0,d=c,e=c;for(c=0;c<this.m_vertexCount;++c)this.m_vertices[c]=b.vertices[c].Copy();for(c=0;c<this.m_vertexCount;++c){d=c;e=c+1<this.m_vertexCount?c+1:0;var f=this.m_vertices[e].x-this.m_vertices[d].x;d=this.m_vertices[e].y-this.m_vertices[d].y;e=Math.sqrt(f*f+d*d);this.m_normals[c]=new b2Vec2(d/e,-f/e)}this.m_centroid=b2PolygonShape.ComputeCentroid(b.vertices,
b.vertexCount);b2PolygonShape.ComputeOBB(this.m_obb,this.m_vertices,this.m_vertexCount);for(c=0;c<this.m_vertexCount;++c){d=c-1>=0?c-1:this.m_vertexCount-1;e=c;b=this.m_normals[d].x;f=this.m_normals[d].y;d=this.m_normals[e].x;e=this.m_normals[e].y;var g=this.m_vertices[c].x-this.m_centroid.x,h=this.m_vertices[c].y-this.m_centroid.y,i=b*g+f*h-b2Settings.b2_toiSlop;g=d*g+e*h-b2Settings.b2_toiSlop;h=1/(b*e-f*d);this.m_coreVertices[c]=new b2Vec2(h*(e*i-f*g)+this.m_centroid.x,h*(b*g-d*i)+this.m_centroid.y)}};
b2PolygonShape.prototype.__varz=function(){this.s_supportVec=new b2Vec2;this.m_obb=new b2OBB;this.m_vertices=new Array(b2Settings.b2_maxPolygonVertices);this.m_normals=new Array(b2Settings.b2_maxPolygonVertices);this.m_coreVertices=new Array(b2Settings.b2_maxPolygonVertices)};b2PolygonShape.s_computeMat=new b2Mat22;b2PolygonShape.s_sweptAABB1=new b2AABB;b2PolygonShape.s_sweptAABB2=new b2AABB;
b2PolygonShape.ComputeCentroid=function(b,c){for(var d=new b2Vec2,e=0,f=1/3,g=0;g<c;++g){var h=b[g],i=g+1<c?b[parseInt(g+1)]:b[0],j=0.5*((h.x-0)*(i.y-0)-(h.y-0)*(i.x-0));e+=j;d.x+=j*f*(0+h.x+i.x);d.y+=j*f*(0+h.y+i.y)}d.x*=1/e;d.y*=1/e;return d};
b2PolygonShape.ComputeOBB=function(b,c,d){var e=0,f=new Array(b2Settings.b2_maxPolygonVertices+1);for(e=0;e<d;++e)f[e]=c[e];f[d]=f[0];c=Number.MAX_VALUE;for(e=1;e<=d;++e){var g=f[parseInt(e-1)],h=f[e].x-g.x,i=f[e].y-g.y,j=Math.sqrt(h*h+i*i);h/=j;i/=j;for(var k=-i,l=h,m=j=Number.MAX_VALUE,n=-Number.MAX_VALUE,o=-Number.MAX_VALUE,q=0;q<d;++q){var r=f[q].x-g.x,s=f[q].y-g.y,v=h*r+i*s;r=k*r+l*s;if(v<j)j=v;if(r<m)m=r;if(v>n)n=v;if(r>o)o=r}q=(n-j)*(o-m);if(q<0.95*c){c=q;b.R.col1.x=h;b.R.col1.y=i;b.R.col2.x=
k;b.R.col2.y=l;h=0.5*(j+n);i=0.5*(m+o);k=b.R;b.center.x=g.x+(k.col1.x*h+k.col2.x*i);b.center.y=g.y+(k.col1.y*h+k.col2.y*i);b.extents.x=0.5*(n-j);b.extents.y=0.5*(o-m)}}};a=b2PolygonShape.prototype;a.s_supportVec=new b2Vec2;a.m_centroid=null;a.m_obb=new b2OBB;a.m_vertices=new Array(b2Settings.b2_maxPolygonVertices);a.m_normals=new Array(b2Settings.b2_maxPolygonVertices);a.m_coreVertices=new Array(b2Settings.b2_maxPolygonVertices);a.m_vertexCount=0;
a.TestPoint=function(b,c){var d;d=b.R;var e=c.x-b.position.x;b=c.y-b.position.y;c=e*d.col1.x+b*d.col1.y;for(var f=e*d.col2.x+b*d.col2.y,g=0;g<this.m_vertexCount;++g){d=this.m_vertices[g];e=c-d.x;b=f-d.y;d=this.m_normals[g];if(d.x*e+d.y*b>0)return false}return true};
a.TestSegment=function(b,c,d,e,f){var g=0;f=f;var h,i,j,k;h=e.p1.x-b.position.x;i=e.p1.y-b.position.y;j=b.R;var l=h*j.col1.x+i*j.col1.y,m=h*j.col2.x+i*j.col2.y;h=e.p2.x-b.position.x;i=e.p2.y-b.position.y;j=b.R;e=h*j.col1.x+i*j.col1.y-l;j=h*j.col2.x+i*j.col2.y-m;for(var n=-1,o=0;o<this.m_vertexCount;++o){k=this.m_vertices[o];h=k.x-l;i=k.y-m;k=this.m_normals[o];h=k.x*h+k.y*i;i=k.x*e+k.y*j;if(i<0&&h<g*i){g=h/i;n=o}else if(i>0&&h<f*i)f=h/i;if(f<g)return b2Shape.e_missCollide}if(n>=0){c[0]=g;j=b.R;k=this.m_normals[n];
d.x=j.col1.x*k.x+j.col2.x*k.y;d.y=j.col1.y*k.x+j.col2.y*k.y;return b2Shape.e_hitCollide}c[0]=0;return b2Shape.e_startsInsideCollide};
a.ComputeAABB=function(b,c){var d,e,f=b2PolygonShape.s_computeMat;d=c.R;e=this.m_obb.R.col1;f.col1.x=d.col1.x*e.x+d.col2.x*e.y;f.col1.y=d.col1.y*e.x+d.col2.y*e.y;e=this.m_obb.R.col2;f.col2.x=d.col1.x*e.x+d.col2.x*e.y;f.col2.y=d.col1.y*e.x+d.col2.y*e.y;f.Abs();e=this.m_obb.extents;var g=f.col1.x*e.x+f.col2.x*e.y;f=f.col1.y*e.x+f.col2.y*e.y;d=c.R;e=this.m_obb.center;var h=c.position.x+(d.col1.x*e.x+d.col2.x*e.y);c=c.position.y+(d.col1.y*e.x+d.col2.y*e.y);b.lowerBound.Set(h-g,c-f);b.upperBound.Set(h+
g,c+f)};a.ComputeSweptAABB=function(b,c,d){var e=b2PolygonShape.s_sweptAABB1,f=b2PolygonShape.s_sweptAABB2;this.ComputeAABB(e,c);this.ComputeAABB(f,d);b.lowerBound.Set(e.lowerBound.x<f.lowerBound.x?e.lowerBound.x:f.lowerBound.x,e.lowerBound.y<f.lowerBound.y?e.lowerBound.y:f.lowerBound.y);b.upperBound.Set(e.upperBound.x>f.upperBound.x?e.upperBound.x:f.upperBound.x,e.upperBound.y>f.upperBound.y?e.upperBound.y:f.upperBound.y)};
a.ComputeMass=function(b){for(var c=0,d=0,e=0,f=0,g=1/3,h=0;h<this.m_vertexCount;++h){var i=this.m_vertices[h],j=h+1<this.m_vertexCount?this.m_vertices[parseInt(h+1)]:this.m_vertices[0],k=i.x-0,l=i.y-0,m=j.x-0,n=j.y-0,o=k*n-l*m,q=0.5*o;e+=q;c+=q*g*(0+i.x+j.x);d+=q*g*(0+i.y+j.y);f+=o*(g*(0.25*(k*k+m*k+m*m)+(0*k+0*m))+0+(g*(0.25*(l*l+n*l+n*n)+(0*l+0*n))+0))}b.mass=this.m_density*e;c*=1/e;d*=1/e;b.center.Set(c,d);b.I=this.m_density*f};a.GetOBB=function(){return this.m_obb};a.GetCentroid=function(){return this.m_centroid};
a.GetVertexCount=function(){return this.m_vertexCount};a.GetVertices=function(){return this.m_vertices};a.GetCoreVertices=function(){return this.m_coreVertices};a.GetNormals=function(){return this.m_normals};a.GetFirstVertex=function(b){return b2Math.b2MulX(b,this.m_coreVertices[0])};a.Centroid=function(b){return b2Math.b2MulX(b,this.m_centroid)};
a.Support=function(b,c,d){var e;e=b.R;var f=c*e.col1.x+d*e.col1.y;e=c*e.col2.x+d*e.col2.y;c=0;d=this.m_coreVertices[0];for(var g=d.x*f+d.y*e,h=1;h<this.m_vertexCount;++h){d=this.m_coreVertices[h];d=d.x*f+d.y*e;if(d>g){c=h;g=d}}e=b.R;d=this.m_coreVertices[c];this.s_supportVec.x=b.position.x+(e.col1.x*d.x+e.col2.x*d.y);this.s_supportVec.y=b.position.y+(e.col1.y*d.x+e.col2.y*d.y);return this.s_supportVec};
a.UpdateSweepRadius=function(b){var c;for(var d=this.m_sweepRadius=0;d<this.m_vertexCount;++d){c=this.m_coreVertices[d];var e=c.x-b.x;c=c.y-b.y;e=Math.sqrt(e*e+c*c);if(e>this.m_sweepRadius)this.m_sweepRadius=e}};var b2ContactResult=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2ContactResult.prototype;a.__constructor=function(){};a.__varz=function(){this.position=new b2Vec2;this.normal=new b2Vec2;this.id=new b2ContactID};a.shape1=null;a.shape2=null;a.position=new b2Vec2;a.normal=new b2Vec2;a.normalImpulse=null;a.tangentImpulse=null;a.id=new b2ContactID;var b2Island=function(){this.__varz();this.__constructor.apply(this,arguments)};
b2Island.prototype.__constructor=function(b,c,d,e,f){var g=0;this.m_bodyCapacity=b;this.m_contactCapacity=c;this.m_jointCapacity=d;this.m_jointCount=this.m_contactCount=this.m_bodyCount=0;this.m_allocator=e;this.m_listener=f;this.m_bodies=new Array(b);for(g=0;g<b;g++)this.m_bodies[g]=null;this.m_contacts=new Array(c);for(g=0;g<c;g++)this.m_contacts[g]=null;this.m_joints=new Array(d);for(g=0;g<d;g++)this.m_joints[g]=null;this.m_positionIterationCount=0};b2Island.prototype.__varz=function(){};
b2Island.s_reportCR=new b2ContactResult;a=b2Island.prototype;a.m_allocator=null;a.m_listener=null;a.m_bodies=null;a.m_contacts=null;a.m_joints=null;a.m_bodyCount=0;a.m_jointCount=0;a.m_contactCount=0;a.m_bodyCapacity=0;a.m_contactCapacity=0;a.m_jointCapacity=0;a.m_positionIterationCount=0;a.Clear=function(){this.m_jointCount=this.m_contactCount=this.m_bodyCount=0};
a.Solve=function(b,c,d,e){var f=0,g;for(f=0;f<this.m_bodyCount;++f){g=this.m_bodies[f];if(!g.IsStatic()){g.m_linearVelocity.x+=b.dt*(c.x+g.m_invMass*g.m_force.x);g.m_linearVelocity.y+=b.dt*(c.y+g.m_invMass*g.m_force.y);g.m_angularVelocity+=b.dt*g.m_invI*g.m_torque;g.m_force.SetZero();g.m_torque=0;g.m_linearVelocity.Multiply(b2Math.b2Clamp(1-b.dt*g.m_linearDamping,0,1));g.m_angularVelocity*=b2Math.b2Clamp(1-b.dt*g.m_angularDamping,0,1);if(g.m_linearVelocity.LengthSquared()>b2Settings.b2_maxLinearVelocitySquared){g.m_linearVelocity.Normalize();
g.m_linearVelocity.x*=b2Settings.b2_maxLinearVelocity;g.m_linearVelocity.y*=b2Settings.b2_maxLinearVelocity}if(g.m_angularVelocity*g.m_angularVelocity>b2Settings.b2_maxAngularVelocitySquared)g.m_angularVelocity=g.m_angularVelocity<0?-b2Settings.b2_maxAngularVelocity:b2Settings.b2_maxAngularVelocity}}c=new b2ContactSolver(b,this.m_contacts,this.m_contactCount,this.m_allocator);c.InitVelocityConstraints(b);for(f=0;f<this.m_jointCount;++f){g=this.m_joints[f];g.InitVelocityConstraints(b)}for(f=0;f<b.maxIterations;++f){c.SolveVelocityConstraints();
for(var h=0;h<this.m_jointCount;++h){g=this.m_joints[h];g.SolveVelocityConstraints(b)}}c.FinalizeVelocityConstraints();for(f=0;f<this.m_bodyCount;++f){g=this.m_bodies[f];if(!g.IsStatic()){g.m_sweep.c0.SetV(g.m_sweep.c);g.m_sweep.a0=g.m_sweep.a;g.m_sweep.c.x+=b.dt*g.m_linearVelocity.x;g.m_sweep.c.y+=b.dt*g.m_linearVelocity.y;g.m_sweep.a+=b.dt*g.m_angularVelocity;g.SynchronizeTransform()}}if(d){for(f=0;f<this.m_jointCount;++f){g=this.m_joints[f];g.InitPositionConstraints()}for(this.m_positionIterationCount=
0;this.m_positionIterationCount<b.maxIterations;++this.m_positionIterationCount){d=c.SolvePositionConstraints(b2Settings.b2_contactBaumgarte);h=true;for(f=0;f<this.m_jointCount;++f){g=this.m_joints[f];g=g.SolvePositionConstraints();h=h&&g}if(d&&h)break}}this.Report(c.m_constraints);if(e){e=Number.MAX_VALUE;c=b2Settings.b2_linearSleepTolerance*b2Settings.b2_linearSleepTolerance;d=b2Settings.b2_angularSleepTolerance*b2Settings.b2_angularSleepTolerance;for(f=0;f<this.m_bodyCount;++f){g=this.m_bodies[f];
if(g.m_invMass!=0){if((g.m_flags&b2Body.e_allowSleepFlag)==0)e=g.m_sleepTime=0;if((g.m_flags&b2Body.e_allowSleepFlag)==0||g.m_angularVelocity*g.m_angularVelocity>d||b2Math.b2Dot(g.m_linearVelocity,g.m_linearVelocity)>c)e=g.m_sleepTime=0;else{g.m_sleepTime+=b.dt;e=b2Math.b2Min(e,g.m_sleepTime)}}}if(e>=b2Settings.b2_timeToSleep)for(f=0;f<this.m_bodyCount;++f){g=this.m_bodies[f];g.m_flags|=b2Body.e_sleepFlag;g.m_linearVelocity.SetZero();g.m_angularVelocity=0}}};
a.SolveTOI=function(b){var c=0,d=new b2ContactSolver(b,this.m_contacts,this.m_contactCount,this.m_allocator);for(c=0;c<b.maxIterations;++c)d.SolveVelocityConstraints();for(c=0;c<this.m_bodyCount;++c){var e=this.m_bodies[c];if(!e.IsStatic()){e.m_sweep.c0.SetV(e.m_sweep.c);e.m_sweep.a0=e.m_sweep.a;e.m_sweep.c.x+=b.dt*e.m_linearVelocity.x;e.m_sweep.c.y+=b.dt*e.m_linearVelocity.y;e.m_sweep.a+=b.dt*e.m_angularVelocity;e.SynchronizeTransform()}}for(c=0;c<b.maxIterations;++c)if(d.SolvePositionConstraints(0.75))break;
this.Report(d.m_constraints)};
a.Report=function(b){if(this.m_listener!=null)for(var c=0;c<this.m_contactCount;++c){var d=this.m_contacts[c],e=b[c],f=b2Island.s_reportCR;f.shape1=d.m_shape1;f.shape2=d.m_shape2;var g=f.shape1.m_body,h=d.m_manifoldCount;d=d.GetManifolds();for(var i=0;i<h;++i){var j=d[i];f.normal.SetV(j.normal);for(var k=0;k<j.pointCount;++k){var l=j.points[k],m=e.points[k];f.position=g.GetWorldPoint(l.localPoint1);f.normalImpulse=m.normalImpulse;f.tangentImpulse=m.tangentImpulse;f.id.key=l.id.key;this.m_listener.Result(f)}}}};
a.AddBody=function(b){this.m_bodies[this.m_bodyCount++]=b};a.AddContact=function(b){this.m_contacts[this.m_contactCount++]=b};a.AddJoint=function(b){this.m_joints[this.m_jointCount++]=b};var b2ManifoldPoint=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2ManifoldPoint.prototype;a.__constructor=function(){};a.__varz=function(){this.localPoint1=new b2Vec2;this.localPoint2=new b2Vec2;this.id=new b2ContactID};a.localPoint1=new b2Vec2;a.localPoint2=new b2Vec2;a.separation=null;a.normalImpulse=null;a.tangentImpulse=null;a.id=new b2ContactID;
a.Reset=function(){this.localPoint1.SetZero();this.localPoint2.SetZero();this.tangentImpulse=this.normalImpulse=this.separation=0;this.id.key=0};a.Set=function(b){this.localPoint1.SetV(b.localPoint1);this.localPoint2.SetV(b.localPoint2);this.separation=b.separation;this.normalImpulse=b.normalImpulse;this.tangentImpulse=b.tangentImpulse;this.id.key=b.id.key};var b2Math=function(){this.__varz();this.__constructor.apply(this,arguments)};b2Math.prototype.__constructor=function(){};b2Math.prototype.__varz=function(){};b2Math.b2Vec2_zero=new b2Vec2(0,0);b2Math.b2Mat22_identity=new b2Mat22(0,new b2Vec2(1,0),new b2Vec2(0,1));b2Math.b2XForm_identity=new b2XForm(b2Math.b2Vec2_zero,b2Math.b2Mat22_identity);b2Math.b2IsValid=function(b){return isFinite(b)};b2Math.b2Dot=function(b,c){return b.x*c.x+b.y*c.y};b2Math.b2CrossVV=function(b,c){return b.x*c.y-b.y*c.x};
b2Math.b2CrossVF=function(b,c){return new b2Vec2(c*b.y,-c*b.x)};b2Math.b2CrossFV=function(b,c){return new b2Vec2(-b*c.y,b*c.x)};b2Math.b2MulMV=function(b,c){return new b2Vec2(b.col1.x*c.x+b.col2.x*c.y,b.col1.y*c.x+b.col2.y*c.y)};b2Math.b2MulTMV=function(b,c){return new b2Vec2(b2Math.b2Dot(c,b.col1),b2Math.b2Dot(c,b.col2))};b2Math.b2MulX=function(b,c){c=b2Math.b2MulMV(b.R,c);c.x+=b.position.x;c.y+=b.position.y;return c};
b2Math.b2MulXT=function(b,c){c=b2Math.SubtractVV(c,b.position);var d=c.x*b.R.col1.x+c.y*b.R.col1.y;c.y=c.x*b.R.col2.x+c.y*b.R.col2.y;c.x=d;return c};b2Math.AddVV=function(b,c){return new b2Vec2(b.x+c.x,b.y+c.y)};b2Math.SubtractVV=function(b,c){return new b2Vec2(b.x-c.x,b.y-c.y)};b2Math.b2Distance=function(b,c){var d=b.x-c.x;b=b.y-c.y;return Math.sqrt(d*d+b*b)};b2Math.b2DistanceSquared=function(b,c){var d=b.x-c.x;b=b.y-c.y;return d*d+b*b};b2Math.MulFV=function(b,c){return new b2Vec2(b*c.x,b*c.y)};
b2Math.AddMM=function(b,c){return new b2Mat22(0,b2Math.AddVV(b.col1,c.col1),b2Math.AddVV(b.col2,c.col2))};b2Math.b2MulMM=function(b,c){return new b2Mat22(0,b2Math.b2MulMV(b,c.col1),b2Math.b2MulMV(b,c.col2))};b2Math.b2MulTMM=function(b,c){var d=new b2Vec2(b2Math.b2Dot(b.col1,c.col1),b2Math.b2Dot(b.col2,c.col1));b=new b2Vec2(b2Math.b2Dot(b.col1,c.col2),b2Math.b2Dot(b.col2,c.col2));return new b2Mat22(0,d,b)};b2Math.b2Abs=function(b){return b>0?b:-b};
b2Math.b2AbsV=function(b){return new b2Vec2(b2Math.b2Abs(b.x),b2Math.b2Abs(b.y))};b2Math.b2AbsM=function(b){return new b2Mat22(0,b2Math.b2AbsV(b.col1),b2Math.b2AbsV(b.col2))};b2Math.b2Min=function(b,c){return b<c?b:c};b2Math.b2MinV=function(b,c){return new b2Vec2(b2Math.b2Min(b.x,c.x),b2Math.b2Min(b.y,c.y))};b2Math.b2Max=function(b,c){return b>c?b:c};b2Math.b2MaxV=function(b,c){return new b2Vec2(b2Math.b2Max(b.x,c.x),b2Math.b2Max(b.y,c.y))};
b2Math.b2Clamp=function(b,c,d){return b2Math.b2Max(c,b2Math.b2Min(b,d))};b2Math.b2ClampV=function(b,c,d){return b2Math.b2MaxV(c,b2Math.b2MinV(b,d))};b2Math.b2Swap=function(b,c){var d=b[0];b[0]=c[0];c[0]=d};b2Math.b2Random=function(){return Math.random()*2-1};b2Math.b2RandomRange=function(b,c){var d=Math.random();return d=(c-b)*d+b};b2Math.b2NextPowerOfTwo=function(b){b|=b>>1&2147483647;b|=b>>2&1073741823;b|=b>>4&268435455;b|=b>>8&16777215;b|=b>>16&65535;return b+1};
b2Math.b2IsPowerOfTwo=function(b){return b>0&&(b&b-1)==0};var b2CircleDef=function(){b2ShapeDef.prototype.__varz.call(this);this.__varz();this.__constructor.apply(this,arguments)};extend(b2CircleDef.prototype,b2ShapeDef.prototype);a=b2CircleDef.prototype;a._super=function(){b2ShapeDef.prototype.__constructor.apply(this,arguments)};a.__constructor=function(){this.type=b2Shape.e_circleShape;this.radius=1};a.__varz=function(){this.localPosition=new b2Vec2(0,0)};a.localPosition=new b2Vec2(0,0);a.radius=null;var b2ContactPoint=function(){this.__varz();this.__constructor.apply(this,arguments)};a=b2ContactPoint.prototype;a.__constructor=function(){};a.__varz=function(){this.position=new b2Vec2;this.velocity=new b2Vec2;this.normal=new b2Vec2;this.id=new b2ContactID};a.shape1=null;a.shape2=null;a.position=new b2Vec2;a.velocity=new b2Vec2;a.normal=new b2Vec2;a.separation=null;a.friction=null;a.restitution=null;a.id=new b2ContactID;var b2PolygonContact=function(){b2Contact.prototype.__varz.call(this);this.__varz();this.__constructor.apply(this,arguments)};extend(b2PolygonContact.prototype,b2Contact.prototype);b2PolygonContact.prototype._super=function(){b2Contact.prototype.__constructor.apply(this,arguments)};b2PolygonContact.prototype.__constructor=function(b,c){this._super(b,c);this.m_manifold=this.m_manifolds[0];this.m_manifold.pointCount=0};
b2PolygonContact.prototype.__varz=function(){this.m0=new b2Manifold;this.m_manifolds=[new b2Manifold]};b2PolygonContact.s_evalCP=new b2ContactPoint;b2PolygonContact.Create=function(b,c){return new b2PolygonContact(b,c)};b2PolygonContact.Destroy=function(){};a=b2PolygonContact.prototype;a.m0=new b2Manifold;a.m_manifolds=[new b2Manifold];a.m_manifold=null;
a.Evaluate=function(b){var c,d,e,f=this.m_shape1.m_body,g=this.m_shape2.m_body,h,i=0;this.m0.Set(this.m_manifold);b2Collision.b2CollidePolygons(this.m_manifold,this.m_shape1,f.m_xf,this.m_shape2,g.m_xf);var j=[false,false];h=b2PolygonContact.s_evalCP;h.shape1=this.m_shape1;h.shape2=this.m_shape2;h.friction=this.m_friction;h.restitution=this.m_restitution;if(this.m_manifold.pointCount>0){for(i=0;i<this.m_manifold.pointCount;++i){var k=this.m_manifold.points[i];k.normalImpulse=0;k.tangentImpulse=0;
var l=false,m=k.id._key;for(c=0;c<this.m0.pointCount;++c)if(j[c]!=true){e=this.m0.points[c];if(e.id._key==m){j[c]=true;k.normalImpulse=e.normalImpulse;k.tangentImpulse=e.tangentImpulse;l=true;if(b!=null){h.position=f.GetWorldPoint(k.localPoint1);c=f.GetLinearVelocityFromLocalPoint(k.localPoint1);d=g.GetLinearVelocityFromLocalPoint(k.localPoint2);h.velocity.Set(d.x-c.x,d.y-c.y);h.normal.SetV(this.m_manifold.normal);h.separation=k.separation;h.id.key=m;b.Persist(h)}break}}if(l==false&&b!=null){h.position=
f.GetWorldPoint(k.localPoint1);c=f.GetLinearVelocityFromLocalPoint(k.localPoint1);d=g.GetLinearVelocityFromLocalPoint(k.localPoint2);h.velocity.Set(d.x-c.x,d.y-c.y);h.normal.SetV(this.m_manifold.normal);h.separation=k.separation;h.id.key=m;b.Add(h)}}this.m_manifoldCount=1}else this.m_manifoldCount=0;if(b!=null)for(i=0;i<this.m0.pointCount;++i)if(!j[i]){e=this.m0.points[i];h.position=f.GetWorldPoint(e.localPoint1);c=f.GetLinearVelocityFromLocalPoint(e.localPoint1);d=g.GetLinearVelocityFromLocalPoint(e.localPoint2);
h.velocity.Set(d.x-c.x,d.y-c.y);h.normal.SetV(this.m0.normal);h.separation=e.separation;h.id.key=e.id._key;b.Remove(h)}};a.GetManifolds=function(){return this.m_manifolds};var b2MouseJoint=function(){b2Joint.prototype.__varz.call(this);this.__varz();this.__constructor.apply(this,arguments)};extend(b2MouseJoint.prototype,b2Joint.prototype);a=b2MouseJoint.prototype;a._super=function(){b2Joint.prototype.__constructor.apply(this,arguments)};
a.__constructor=function(b){this._super(b);this.m_target.SetV(b.target);var c=this.m_target.x-this.m_body2.m_xf.position.x,d=this.m_target.y-this.m_body2.m_xf.position.y,e=this.m_body2.m_xf.R;this.m_localAnchor.x=c*e.col1.x+d*e.col1.y;this.m_localAnchor.y=c*e.col2.x+d*e.col2.y;this.m_maxForce=b.maxForce;this.m_impulse.SetZero();d=this.m_body2.m_mass;e=2*b2Settings.b2_pi*b.frequencyHz;c=2*d*b.dampingRatio*e;b=b.timeStep*d*e*e;this.m_gamma=1/(c+b);this.m_beta=b/(c+b)};
a.__varz=function(){this.K=new b2Mat22;this.K1=new b2Mat22;this.K2=new b2Mat22;this.m_localAnchor=new b2Vec2;this.m_target=new b2Vec2;this.m_impulse=new b2Vec2;this.m_mass=new b2Mat22;this.m_C=new b2Vec2};a.K=new b2Mat22;a.K1=new b2Mat22;a.K2=new b2Mat22;a.m_localAnchor=new b2Vec2;a.m_target=new b2Vec2;a.m_impulse=new b2Vec2;a.m_mass=new b2Mat22;a.m_C=new b2Vec2;a.m_maxForce=null;a.m_beta=null;a.m_gamma=null;a.GetAnchor1=function(){return this.m_target};a.GetAnchor2=function(){return this.m_body2.GetWorldPoint(this.m_localAnchor)};
a.GetReactionForce=function(){return this.m_impulse};a.GetReactionTorque=function(){return 0};a.SetTarget=function(b){this.m_body2.IsSleeping()&&this.m_body2.WakeUp();this.m_target=b};
a.InitVelocityConstraints=function(b){var c=this.m_body2,d;d=c.m_xf.R;var e=this.m_localAnchor.x-c.m_sweep.localCenter.x,f=this.m_localAnchor.y-c.m_sweep.localCenter.y,g=d.col1.x*e+d.col2.x*f;f=d.col1.y*e+d.col2.y*f;e=g;d=c.m_invMass;g=c.m_invI;this.K1.col1.x=d;this.K1.col2.x=0;this.K1.col1.y=0;this.K1.col2.y=d;this.K2.col1.x=g*f*f;this.K2.col2.x=-g*e*f;this.K2.col1.y=-g*e*f;this.K2.col2.y=g*e*e;this.K.SetM(this.K1);this.K.AddM(this.K2);this.K.col1.x+=this.m_gamma;this.K.col2.y+=this.m_gamma;this.K.Invert(this.m_mass);
this.m_C.x=c.m_sweep.c.x+e-this.m_target.x;this.m_C.y=c.m_sweep.c.y+f-this.m_target.y;c.m_angularVelocity*=0.98;var h=b.dt*this.m_impulse.x;b=b.dt*this.m_impulse.y;c.m_linearVelocity.x+=d*h;c.m_linearVelocity.y+=d*b;c.m_angularVelocity+=g*(e*b-f*h)};
a.SolveVelocityConstraints=function(b){var c=this.m_body2,d,e,f;d=c.m_xf.R;var g=this.m_localAnchor.x-c.m_sweep.localCenter.x,h=this.m_localAnchor.y-c.m_sweep.localCenter.y;e=d.col1.x*g+d.col2.x*h;h=d.col1.y*g+d.col2.y*h;g=e;e=c.m_linearVelocity.x+-c.m_angularVelocity*h;var i=c.m_linearVelocity.y+c.m_angularVelocity*g;d=this.m_mass;e=e+this.m_beta*b.inv_dt*this.m_C.x+this.m_gamma*b.dt*this.m_impulse.x;f=i+this.m_beta*b.inv_dt*this.m_C.y+this.m_gamma*b.dt*this.m_impulse.y;i=-b.inv_dt*(d.col1.x*e+d.col2.x*
f);d=-b.inv_dt*(d.col1.y*e+d.col2.y*f);e=this.m_impulse.x;f=this.m_impulse.y;this.m_impulse.x+=i;this.m_impulse.y+=d;i=this.m_impulse.Length();i>this.m_maxForce&&this.m_impulse.Multiply(this.m_maxForce/i);i=this.m_impulse.x-e;d=this.m_impulse.y-f;i=b.dt*i;b=b.dt*d;c.m_linearVelocity.x+=c.m_invMass*i;c.m_linearVelocity.y+=c.m_invMass*b;c.m_angularVelocity+=c.m_invI*(g*b-h*i)};a.SolvePositionConstraints=function(){return true};var b2CircleContact=function(){b2Contact.prototype.__varz.call(this);this.__varz();this.__constructor.apply(this,arguments)};extend(b2CircleContact.prototype,b2Contact.prototype);b2CircleContact.prototype._super=function(){b2Contact.prototype.__constructor.apply(this,arguments)};b2CircleContact.prototype.__constructor=function(b,c){this._super(b,c);this.m_manifold=this.m_manifolds[0];this.m_manifold.pointCount=0;b=this.m_manifold.points[0];b.normalImpulse=0;b.tangentImpulse=0};
b2CircleContact.prototype.__varz=function(){this.m_manifolds=[new b2Manifold];this.m0=new b2Manifold};b2CircleContact.s_evalCP=new b2ContactPoint;b2CircleContact.Create=function(b,c){return new b2CircleContact(b,c)};b2CircleContact.Destroy=function(){};a=b2CircleContact.prototype;a.m_manifolds=[new b2Manifold];a.m0=new b2Manifold;a.m_manifold=null;
a.Evaluate=function(b){var c,d,e;c=this.m_shape1.m_body;d=this.m_shape2.m_body;this.m0.Set(this.m_manifold);b2Collision.b2CollideCircles(this.m_manifold,this.m_shape1,c.m_xf,this.m_shape2,d.m_xf);var f=b2CircleContact.s_evalCP;f.shape1=this.m_shape1;f.shape2=this.m_shape2;f.friction=this.m_friction;f.restitution=this.m_restitution;if(this.m_manifold.pointCount>0){this.m_manifoldCount=1;var g=this.m_manifold.points[0];if(this.m0.pointCount==0){g.normalImpulse=0;g.tangentImpulse=0;if(b){f.position=
c.GetWorldPoint(g.localPoint1);c=c.GetLinearVelocityFromLocalPoint(g.localPoint1);d=d.GetLinearVelocityFromLocalPoint(g.localPoint2);f.velocity.Set(d.x-c.x,d.y-c.y);f.normal.SetV(this.m_manifold.normal);f.separation=g.separation;f.id.key=g.id._key;b.Add(f)}}else{e=this.m0.points[0];g.normalImpulse=e.normalImpulse;g.tangentImpulse=e.tangentImpulse;if(b){f.position=c.GetWorldPoint(g.localPoint1);c=c.GetLinearVelocityFromLocalPoint(g.localPoint1);d=d.GetLinearVelocityFromLocalPoint(g.localPoint2);f.velocity.Set(d.x-
c.x,d.y-c.y);f.normal.SetV(this.m_manifold.normal);f.separation=g.separation;f.id.key=g.id._key;b.Persist(f)}}}else{this.m_manifoldCount=0;if(this.m0.pointCount>0&&b){e=this.m0.points[0];f.position=c.GetWorldPoint(e.localPoint1);c=c.GetLinearVelocityFromLocalPoint(e.localPoint1);d=d.GetLinearVelocityFromLocalPoint(e.localPoint2);f.velocity.Set(d.x-c.x,d.y-c.y);f.normal.SetV(this.m0.normal);f.separation=e.separation;f.id.key=e.id._key;b.Remove(f)}}};a.GetManifolds=function(){return this.m_manifolds};var b2PulleyJoint=function(){b2Joint.prototype.__varz.call(this);this.__varz();this.__constructor.apply(this,arguments)};extend(b2PulleyJoint.prototype,b2Joint.prototype);b2PulleyJoint.prototype._super=function(){b2Joint.prototype.__constructor.apply(this,arguments)};
b2PulleyJoint.prototype.__constructor=function(b){this._super(b);this.m_ground=this.m_body1.m_world.m_groundBody;this.m_groundAnchor1.x=b.groundAnchor1.x-this.m_ground.m_xf.position.x;this.m_groundAnchor1.y=b.groundAnchor1.y-this.m_ground.m_xf.position.y;this.m_groundAnchor2.x=b.groundAnchor2.x-this.m_ground.m_xf.position.x;this.m_groundAnchor2.y=b.groundAnchor2.y-this.m_ground.m_xf.position.y;this.m_localAnchor1.SetV(b.localAnchor1);this.m_localAnchor2.SetV(b.localAnchor2);this.m_ratio=b.ratio;this.m_constant=
b.length1+this.m_ratio*b.length2;this.m_maxLength1=b2Math.b2Min(b.maxLength1,this.m_constant-this.m_ratio*b2PulleyJoint.b2_minPulleyLength);this.m_maxLength2=b2Math.b2Min(b.maxLength2,(this.m_constant-b2PulleyJoint.b2_minPulleyLength)/this.m_ratio);this.m_limitForce2=this.m_limitForce1=this.m_force=0};
b2PulleyJoint.prototype.__varz=function(){this.m_groundAnchor1=new b2Vec2;this.m_groundAnchor2=new b2Vec2;this.m_localAnchor1=new b2Vec2;this.m_localAnchor2=new b2Vec2;this.m_u1=new b2Vec2;this.m_u2=new b2Vec2};b2PulleyJoint.b2_minPulleyLength=2;a=b2PulleyJoint.prototype;a.m_ground=null;a.m_groundAnchor1=new b2Vec2;a.m_groundAnchor2=new b2Vec2;a.m_localAnchor1=new b2Vec2;a.m_localAnchor2=new b2Vec2;a.m_u1=new b2Vec2;a.m_u2=new b2Vec2;a.m_constant=null;a.m_ratio=null;a.m_maxLength1=null;
a.m_maxLength2=null;a.m_pulleyMass=null;a.m_limitMass1=null;a.m_limitMass2=null;a.m_force=null;a.m_limitForce1=null;a.m_limitForce2=null;a.m_positionImpulse=null;a.m_limitPositionImpulse1=null;a.m_limitPositionImpulse2=null;a.m_state=0;a.m_limitState1=0;a.m_limitState2=0;a.GetAnchor1=function(){return this.m_body1.GetWorldPoint(this.m_localAnchor1)};a.GetAnchor2=function(){return this.m_body2.GetWorldPoint(this.m_localAnchor2)};
a.GetReactionForce=function(){var b=this.m_u2.Copy();b.Multiply(this.m_force);return b};a.GetReactionTorque=function(){return 0};a.GetGroundAnchor1=function(){var b=this.m_ground.m_xf.position.Copy();b.Add(this.m_groundAnchor1);return b};a.GetGroundAnchor2=function(){var b=this.m_ground.m_xf.position.Copy();b.Add(this.m_groundAnchor2);return b};
a.GetLength1=function(){var b=this.m_body1.GetWorldPoint(this.m_localAnchor1),c=b.x-(this.m_ground.m_xf.position.x+this.m_groundAnchor1.x);b=b.y-(this.m_ground.m_xf.position.y+this.m_groundAnchor1.y);return Math.sqrt(c*c+b*b)};a.GetLength2=function(){var b=this.m_body2.GetWorldPoint(this.m_localAnchor2),c=b.x-(this.m_ground.m_xf.position.x+this.m_groundAnchor2.x);b=b.y-(this.m_ground.m_xf.position.y+this.m_groundAnchor2.y);return Math.sqrt(c*c+b*b)};a.GetRatio=function(){return this.m_ratio};
a.InitVelocityConstraints=function(b){var c=this.m_body1,d=this.m_body2,e;e=c.m_xf.R;var f=this.m_localAnchor1.x-c.m_sweep.localCenter.x,g=this.m_localAnchor1.y-c.m_sweep.localCenter.y,h=e.col1.x*f+e.col2.x*g;g=e.col1.y*f+e.col2.y*g;f=h;e=d.m_xf.R;var i=this.m_localAnchor2.x-d.m_sweep.localCenter.x,j=this.m_localAnchor2.y-d.m_sweep.localCenter.y;h=e.col1.x*i+e.col2.x*j;j=e.col1.y*i+e.col2.y*j;i=h;e=d.m_sweep.c.x+i;h=d.m_sweep.c.y+j;var k=this.m_ground.m_xf.position.x+this.m_groundAnchor2.x,l=this.m_ground.m_xf.position.y+
this.m_groundAnchor2.y;this.m_u1.Set(c.m_sweep.c.x+f-(this.m_ground.m_xf.position.x+this.m_groundAnchor1.x),c.m_sweep.c.y+g-(this.m_ground.m_xf.position.y+this.m_groundAnchor1.y));this.m_u2.Set(e-k,h-l);e=this.m_u1.Length();h=this.m_u2.Length();e>b2Settings.b2_linearSlop?this.m_u1.Multiply(1/e):this.m_u1.SetZero();h>b2Settings.b2_linearSlop?this.m_u2.Multiply(1/h):this.m_u2.SetZero();if(this.m_constant-e-this.m_ratio*h>0){this.m_state=b2Joint.e_inactiveLimit;this.m_force=0}else{this.m_state=b2Joint.e_atUpperLimit;
this.m_positionImpulse=0}if(e<this.m_maxLength1){this.m_limitState1=b2Joint.e_inactiveLimit;this.m_limitForce1=0}else{this.m_limitState1=b2Joint.e_atUpperLimit;this.m_limitPositionImpulse1=0}if(h<this.m_maxLength2){this.m_limitState2=b2Joint.e_inactiveLimit;this.m_limitForce2=0}else{this.m_limitState2=b2Joint.e_atUpperLimit;this.m_limitPositionImpulse2=0}e=f*this.m_u1.y-g*this.m_u1.x;h=i*this.m_u2.y-j*this.m_u2.x;this.m_limitMass1=c.m_invMass+c.m_invI*e*e;this.m_limitMass2=d.m_invMass+d.m_invI*h*
h;this.m_pulleyMass=this.m_limitMass1+this.m_ratio*this.m_ratio*this.m_limitMass2;this.m_limitMass1=1/this.m_limitMass1;this.m_limitMass2=1/this.m_limitMass2;this.m_pulleyMass=1/this.m_pulleyMass;if(b.warmStarting){e=b.dt*(-this.m_force-this.m_limitForce1)*this.m_u1.x;h=b.dt*(-this.m_force-this.m_limitForce1)*this.m_u1.y;k=b.dt*(-this.m_ratio*this.m_force-this.m_limitForce2)*this.m_u2.x;b=b.dt*(-this.m_ratio*this.m_force-this.m_limitForce2)*this.m_u2.y;c.m_linearVelocity.x+=c.m_invMass*e;c.m_linearVelocity.y+=
c.m_invMass*h;c.m_angularVelocity+=c.m_invI*(f*h-g*e);d.m_linearVelocity.x+=d.m_invMass*k;d.m_linearVelocity.y+=d.m_invMass*b;d.m_angularVelocity+=d.m_invI*(i*b-j*k)}else this.m_limitForce2=this.m_limitForce1=this.m_force=0};
a.SolveVelocityConstraints=function(b){var c=this.m_body1,d=this.m_body2,e;e=c.m_xf.R;var f=this.m_localAnchor1.x-c.m_sweep.localCenter.x,g=this.m_localAnchor1.y-c.m_sweep.localCenter.y,h=e.col1.x*f+e.col2.x*g;g=e.col1.y*f+e.col2.y*g;f=h;e=d.m_xf.R;var i=this.m_localAnchor2.x-d.m_sweep.localCenter.x,j=this.m_localAnchor2.y-d.m_sweep.localCenter.y;h=e.col1.x*i+e.col2.x*j;j=e.col1.y*i+e.col2.y*j;i=h;var k,l;if(this.m_state==b2Joint.e_atUpperLimit){e=c.m_linearVelocity.x+-c.m_angularVelocity*g;h=c.m_linearVelocity.y+
c.m_angularVelocity*f;k=d.m_linearVelocity.x+-d.m_angularVelocity*j;l=d.m_linearVelocity.y+d.m_angularVelocity*i;e=-(this.m_u1.x*e+this.m_u1.y*h)-this.m_ratio*(this.m_u2.x*k+this.m_u2.y*l);l=-b.inv_dt*this.m_pulleyMass*e;e=this.m_force;this.m_force=b2Math.b2Max(0,this.m_force+l);l=this.m_force-e;e=-b.dt*l*this.m_u1.x;h=-b.dt*l*this.m_u1.y;k=-b.dt*this.m_ratio*l*this.m_u2.x;l=-b.dt*this.m_ratio*l*this.m_u2.y;c.m_linearVelocity.x+=c.m_invMass*e;c.m_linearVelocity.y+=c.m_invMass*h;c.m_angularVelocity+=
c.m_invI*(f*h-g*e);d.m_linearVelocity.x+=d.m_invMass*k;d.m_linearVelocity.y+=d.m_invMass*l;d.m_angularVelocity+=d.m_invI*(i*l-j*k)}if(this.m_limitState1==b2Joint.e_atUpperLimit){e=c.m_linearVelocity.x+-c.m_angularVelocity*g;h=c.m_linearVelocity.y+c.m_angularVelocity*f;e=-(this.m_u1.x*e+this.m_u1.y*h);l=-b.inv_dt*this.m_limitMass1*e;e=this.m_limitForce1;this.m_limitForce1=b2Math.b2Max(0,this.m_limitForce1+l);l=this.m_limitForce1-e;e=-b.dt*l*this.m_u1.x;h=-b.dt*l*this.m_u1.y;c.m_linearVelocity.x+=c.m_invMass*
e;c.m_linearVelocity.y+=c.m_invMass*h;c.m_angularVelocity+=c.m_invI*(f*h-g*e)}if(this.m_limitState2==b2Joint.e_atUpperLimit){k=d.m_linearVelocity.x+-d.m_angularVelocity*j;l=d.m_linearVelocity.y+d.m_angularVelocity*i;e=-(this.m_u2.x*k+this.m_u2.y*l);l=-b.inv_dt*this.m_limitMass2*e;e=this.m_limitForce2;this.m_limitForce2=b2Math.b2Max(0,this.m_limitForce2+l);l=this.m_limitForce2-e;k=-b.dt*l*this.m_u2.x;l=-b.dt*l*this.m_u2.y;d.m_linearVelocity.x+=d.m_invMass*k;d.m_linearVelocity.y+=d.m_invMass*l;d.m_angularVelocity+=
d.m_invI*(i*l-j*k)}};
a.SolvePositionConstraints=function(){var b=this.m_body1,c=this.m_body2,d,e=this.m_ground.m_xf.position.x+this.m_groundAnchor1.x,f=this.m_ground.m_xf.position.y+this.m_groundAnchor1.y,g=this.m_ground.m_xf.position.x+this.m_groundAnchor2.x,h=this.m_ground.m_xf.position.y+this.m_groundAnchor2.y,i,j,k,l,m,n,o,q=0;if(this.m_state==b2Joint.e_atUpperLimit){d=b.m_xf.R;i=this.m_localAnchor1.x-b.m_sweep.localCenter.x;j=this.m_localAnchor1.y-b.m_sweep.localCenter.y;m=d.col1.x*i+d.col2.x*j;j=d.col1.y*i+d.col2.y*
j;i=m;d=c.m_xf.R;k=this.m_localAnchor2.x-c.m_sweep.localCenter.x;l=this.m_localAnchor2.y-c.m_sweep.localCenter.y;m=d.col1.x*k+d.col2.x*l;l=d.col1.y*k+d.col2.y*l;k=m;m=b.m_sweep.c.x+i;n=b.m_sweep.c.y+j;o=c.m_sweep.c.x+k;d=c.m_sweep.c.y+l;this.m_u1.Set(m-e,n-f);this.m_u2.Set(o-g,d-h);d=this.m_u1.Length();m=this.m_u2.Length();d>b2Settings.b2_linearSlop?this.m_u1.Multiply(1/d):this.m_u1.SetZero();m>b2Settings.b2_linearSlop?this.m_u2.Multiply(1/m):this.m_u2.SetZero();d=this.m_constant-d-this.m_ratio*m;
q=b2Math.b2Max(q,-d);d=b2Math.b2Clamp(d+b2Settings.b2_linearSlop,-b2Settings.b2_maxLinearCorrection,0);d=-this.m_pulleyMass*d;m=this.m_positionImpulse;this.m_positionImpulse=b2Math.b2Max(0,this.m_positionImpulse+d);d=this.m_positionImpulse-m;m=-d*this.m_u1.x;n=-d*this.m_u1.y;o=-this.m_ratio*d*this.m_u2.x;d=-this.m_ratio*d*this.m_u2.y;b.m_sweep.c.x+=b.m_invMass*m;b.m_sweep.c.y+=b.m_invMass*n;b.m_sweep.a+=b.m_invI*(i*n-j*m);c.m_sweep.c.x+=c.m_invMass*o;c.m_sweep.c.y+=c.m_invMass*d;c.m_sweep.a+=c.m_invI*
(k*d-l*o);b.SynchronizeTransform();c.SynchronizeTransform()}if(this.m_limitState1==b2Joint.e_atUpperLimit){d=b.m_xf.R;i=this.m_localAnchor1.x-b.m_sweep.localCenter.x;j=this.m_localAnchor1.y-b.m_sweep.localCenter.y;m=d.col1.x*i+d.col2.x*j;j=d.col1.y*i+d.col2.y*j;i=m;m=b.m_sweep.c.x+i;n=b.m_sweep.c.y+j;this.m_u1.Set(m-e,n-f);d=this.m_u1.Length();if(d>b2Settings.b2_linearSlop){this.m_u1.x*=1/d;this.m_u1.y*=1/d}else this.m_u1.SetZero();d=this.m_maxLength1-d;q=b2Math.b2Max(q,-d);d=b2Math.b2Clamp(d+b2Settings.b2_linearSlop,
-b2Settings.b2_maxLinearCorrection,0);d=-this.m_limitMass1*d;e=this.m_limitPositionImpulse1;this.m_limitPositionImpulse1=b2Math.b2Max(0,this.m_limitPositionImpulse1+d);d=this.m_limitPositionImpulse1-e;m=-d*this.m_u1.x;n=-d*this.m_u1.y;b.m_sweep.c.x+=b.m_invMass*m;b.m_sweep.c.y+=b.m_invMass*n;b.m_sweep.a+=b.m_invI*(i*n-j*m);b.SynchronizeTransform()}if(this.m_limitState2==b2Joint.e_atUpperLimit){d=c.m_xf.R;k=this.m_localAnchor2.x-c.m_sweep.localCenter.x;l=this.m_localAnchor2.y-c.m_sweep.localCenter.y;
m=d.col1.x*k+d.col2.x*l;l=d.col1.y*k+d.col2.y*l;k=m;o=c.m_sweep.c.x+k;d=c.m_sweep.c.y+l;this.m_u2.Set(o-g,d-h);m=this.m_u2.Length();if(m>b2Settings.b2_linearSlop){this.m_u2.x*=1/m;this.m_u2.y*=1/m}else this.m_u2.SetZero();d=this.m_maxLength2-m;q=b2Math.b2Max(q,-d);d=b2Math.b2Clamp(d+b2Settings.b2_linearSlop,-b2Settings.b2_maxLinearCorrection,0);d=-this.m_limitMass2*d;e=this.m_limitPositionImpulse2;this.m_limitPositionImpulse2=b2Math.b2Max(0,this.m_limitPositionImpulse2+d);d=this.m_limitPositionImpulse2-
e;o=-d*this.m_u2.x;d=-d*this.m_u2.y;c.m_sweep.c.x+=c.m_invMass*o;c.m_sweep.c.y+=c.m_invMass*d;c.m_sweep.a+=c.m_invI*(k*d-l*o);c.SynchronizeTransform()}return q<b2Settings.b2_linearSlop};var b2RevoluteJoint=function(){b2Joint.prototype.__varz.call(this);this.__varz();this.__constructor.apply(this,arguments)};extend(b2RevoluteJoint.prototype,b2Joint.prototype);b2RevoluteJoint.prototype._super=function(){b2Joint.prototype.__constructor.apply(this,arguments)};
b2RevoluteJoint.prototype.__constructor=function(b){this._super(b);this.m_localAnchor1.SetV(b.localAnchor1);this.m_localAnchor2.SetV(b.localAnchor2);this.m_referenceAngle=b.referenceAngle;this.m_pivotForce.Set(0,0);this.m_limitPositionImpulse=this.m_limitForce=this.m_motorForce=0;this.m_lowerAngle=b.lowerAngle;this.m_upperAngle=b.upperAngle;this.m_maxMotorTorque=b.maxMotorTorque;this.m_motorSpeed=b.motorSpeed;this.m_enableLimit=b.enableLimit;this.m_enableMotor=b.enableMotor};
b2RevoluteJoint.prototype.__varz=function(){this.K=new b2Mat22;this.K1=new b2Mat22;this.K2=new b2Mat22;this.K3=new b2Mat22;this.m_localAnchor1=new b2Vec2;this.m_localAnchor2=new b2Vec2;this.m_pivotForce=new b2Vec2;this.m_pivotMass=new b2Mat22};b2RevoluteJoint.tImpulse=new b2Vec2;a=b2RevoluteJoint.prototype;a.K=new b2Mat22;a.K1=new b2Mat22;a.K2=new b2Mat22;a.K3=new b2Mat22;a.m_localAnchor1=new b2Vec2;a.m_localAnchor2=new b2Vec2;a.m_pivotForce=new b2Vec2;a.m_motorForce=null;a.m_limitForce=null;
a.m_limitPositionImpulse=null;a.m_pivotMass=new b2Mat22;a.m_motorMass=null;a.m_enableMotor=null;a.m_maxMotorTorque=null;a.m_motorSpeed=null;a.m_enableLimit=null;a.m_referenceAngle=null;a.m_lowerAngle=null;a.m_upperAngle=null;a.m_limitState=0;a.GetAnchor1=function(){return this.m_body1.GetWorldPoint(this.m_localAnchor1)};a.GetAnchor2=function(){return this.m_body2.GetWorldPoint(this.m_localAnchor2)};a.GetReactionForce=function(){return this.m_pivotForce};a.GetReactionTorque=function(){return this.m_limitForce};
a.GetJointAngle=function(){return this.m_body2.m_sweep.a-this.m_body1.m_sweep.a-this.m_referenceAngle};a.GetJointSpeed=function(){return this.m_body2.m_angularVelocity-this.m_body1.m_angularVelocity};a.IsLimitEnabled=function(){return this.m_enableLimit};a.EnableLimit=function(b){this.m_enableLimit=b};a.GetLowerLimit=function(){return this.m_lowerAngle};a.GetUpperLimit=function(){return this.m_upperAngle};a.SetLimits=function(b,c){this.m_lowerAngle=b;this.m_upperAngle=c};a.IsMotorEnabled=function(){return this.m_enableMotor};
a.EnableMotor=function(b){this.m_enableMotor=b};a.SetMotorSpeed=function(b){this.m_motorSpeed=b};a.GetMotorSpeed=function(){return this.m_motorSpeed};a.SetMaxMotorTorque=function(b){this.m_maxMotorTorque=b};a.GetMotorTorque=function(){return this.m_motorForce};
a.InitVelocityConstraints=function(b){var c=this.m_body1,d=this.m_body2,e,f;e=c.m_xf.R;var g=this.m_localAnchor1.x-c.m_sweep.localCenter.x,h=this.m_localAnchor1.y-c.m_sweep.localCenter.y;f=e.col1.x*g+e.col2.x*h;h=e.col1.y*g+e.col2.y*h;g=f;e=d.m_xf.R;var i=this.m_localAnchor2.x-d.m_sweep.localCenter.x,j=this.m_localAnchor2.y-d.m_sweep.localCenter.y;f=e.col1.x*i+e.col2.x*j;j=e.col1.y*i+e.col2.y*j;i=f;e=c.m_invMass;f=d.m_invMass;var k=c.m_invI,l=d.m_invI;this.K1.col1.x=e+f;this.K1.col2.x=0;this.K1.col1.y=
0;this.K1.col2.y=e+f;this.K2.col1.x=k*h*h;this.K2.col2.x=-k*g*h;this.K2.col1.y=-k*g*h;this.K2.col2.y=k*g*g;this.K3.col1.x=l*j*j;this.K3.col2.x=-l*i*j;this.K3.col1.y=-l*i*j;this.K3.col2.y=l*i*i;this.K.SetM(this.K1);this.K.AddM(this.K2);this.K.AddM(this.K3);this.K.Invert(this.m_pivotMass);this.m_motorMass=1/(k+l);if(this.m_enableMotor==false)this.m_motorForce=0;if(this.m_enableLimit){var m=d.m_sweep.a-c.m_sweep.a-this.m_referenceAngle;if(b2Math.b2Abs(this.m_upperAngle-this.m_lowerAngle)<2*b2Settings.b2_angularSlop)this.m_limitState=
b2Joint.e_equalLimits;else if(m<=this.m_lowerAngle){if(this.m_limitState!=b2Joint.e_atLowerLimit)this.m_limitForce=0;this.m_limitState=b2Joint.e_atLowerLimit}else if(m>=this.m_upperAngle){if(this.m_limitState!=b2Joint.e_atUpperLimit)this.m_limitForce=0;this.m_limitState=b2Joint.e_atUpperLimit}else{this.m_limitState=b2Joint.e_inactiveLimit;this.m_limitForce=0}}else this.m_limitForce=0;if(b.warmStarting){c.m_linearVelocity.x-=b.dt*e*this.m_pivotForce.x;c.m_linearVelocity.y-=b.dt*e*this.m_pivotForce.y;
c.m_angularVelocity-=b.dt*k*(g*this.m_pivotForce.y-h*this.m_pivotForce.x+this.m_motorForce+this.m_limitForce);d.m_linearVelocity.x+=b.dt*f*this.m_pivotForce.x;d.m_linearVelocity.y+=b.dt*f*this.m_pivotForce.y;d.m_angularVelocity+=b.dt*l*(i*this.m_pivotForce.y-j*this.m_pivotForce.x+this.m_motorForce+this.m_limitForce)}else{this.m_pivotForce.SetZero();this.m_limitForce=this.m_motorForce=0}this.m_limitPositionImpulse=0};
a.SolveVelocityConstraints=function(b){var c=this.m_body1,d=this.m_body2,e,f;e=c.m_xf.R;var g=this.m_localAnchor1.x-c.m_sweep.localCenter.x,h=this.m_localAnchor1.y-c.m_sweep.localCenter.y;f=e.col1.x*g+e.col2.x*h;h=e.col1.y*g+e.col2.y*h;g=f;e=d.m_xf.R;var i=this.m_localAnchor2.x-d.m_sweep.localCenter.x,j=this.m_localAnchor2.y-d.m_sweep.localCenter.y;f=e.col1.x*i+e.col2.x*j;j=e.col1.y*i+e.col2.y*j;i=f;f=d.m_linearVelocity.x+-d.m_angularVelocity*j-c.m_linearVelocity.x- -c.m_angularVelocity*h;var k=d.m_linearVelocity.y+
d.m_angularVelocity*i-c.m_linearVelocity.y-c.m_angularVelocity*g;e=-b.inv_dt*(this.m_pivotMass.col1.x*f+this.m_pivotMass.col2.x*k);f=-b.inv_dt*(this.m_pivotMass.col1.y*f+this.m_pivotMass.col2.y*k);this.m_pivotForce.x+=e;this.m_pivotForce.y+=f;e=b.dt*e;f=b.dt*f;c.m_linearVelocity.x-=c.m_invMass*e;c.m_linearVelocity.y-=c.m_invMass*f;c.m_angularVelocity-=c.m_invI*(g*f-h*e);d.m_linearVelocity.x+=d.m_invMass*e;d.m_linearVelocity.y+=d.m_invMass*f;d.m_angularVelocity+=d.m_invI*(i*f-j*e);if(this.m_enableMotor&&
this.m_limitState!=b2Joint.e_equalLimits){g=-b.inv_dt*this.m_motorMass*(d.m_angularVelocity-c.m_angularVelocity-this.m_motorSpeed);h=this.m_motorForce;this.m_motorForce=b2Math.b2Clamp(this.m_motorForce+g,-this.m_maxMotorTorque,this.m_maxMotorTorque);g=this.m_motorForce-h;c.m_angularVelocity-=c.m_invI*b.dt*g;d.m_angularVelocity+=d.m_invI*b.dt*g}if(this.m_enableLimit&&this.m_limitState!=b2Joint.e_inactiveLimit){h=-b.inv_dt*this.m_motorMass*(d.m_angularVelocity-c.m_angularVelocity);if(this.m_limitState==
b2Joint.e_equalLimits)this.m_limitForce+=h;else if(this.m_limitState==b2Joint.e_atLowerLimit){g=this.m_limitForce;this.m_limitForce=b2Math.b2Max(this.m_limitForce+h,0);h=this.m_limitForce-g}else if(this.m_limitState==b2Joint.e_atUpperLimit){g=this.m_limitForce;this.m_limitForce=b2Math.b2Min(this.m_limitForce+h,0);h=this.m_limitForce-g}c.m_angularVelocity-=c.m_invI*b.dt*h;d.m_angularVelocity+=d.m_invI*b.dt*h}};
a.SolvePositionConstraints=function(){var b,c=this.m_body1,d=this.m_body2,e=0;e=c.m_xf.R;var f=this.m_localAnchor1.x-c.m_sweep.localCenter.x,g=this.m_localAnchor1.y-c.m_sweep.localCenter.y,h=e.col1.x*f+e.col2.x*g;g=e.col1.y*f+e.col2.y*g;f=h;e=d.m_xf.R;b=this.m_localAnchor2.x-d.m_sweep.localCenter.x;var i=this.m_localAnchor2.y-d.m_sweep.localCenter.y;h=e.col1.x*b+e.col2.x*i;i=e.col1.y*b+e.col2.y*i;b=h;h=d.m_sweep.c.x+b-(c.m_sweep.c.x+f);var j=d.m_sweep.c.y+i-(c.m_sweep.c.y+g);e=Math.sqrt(h*h+j*j);
var k=c.m_invMass,l=d.m_invMass,m=c.m_invI,n=d.m_invI;this.K1.col1.x=k+l;this.K1.col2.x=0;this.K1.col1.y=0;this.K1.col2.y=k+l;this.K2.col1.x=m*g*g;this.K2.col2.x=-m*f*g;this.K2.col1.y=-m*f*g;this.K2.col2.y=m*f*f;this.K3.col1.x=n*i*i;this.K3.col2.x=-n*b*i;this.K3.col1.y=-n*b*i;this.K3.col2.y=n*b*b;this.K.SetM(this.K1);this.K.AddM(this.K2);this.K.AddM(this.K3);this.K.Solve(b2RevoluteJoint.tImpulse,-h,-j);h=b2RevoluteJoint.tImpulse.x;j=b2RevoluteJoint.tImpulse.y;c.m_sweep.c.x-=c.m_invMass*h;c.m_sweep.c.y-=
c.m_invMass*j;c.m_sweep.a-=c.m_invI*(f*j-g*h);d.m_sweep.c.x+=d.m_invMass*h;d.m_sweep.c.y+=d.m_invMass*j;d.m_sweep.a+=d.m_invI*(b*j-i*h);c.SynchronizeTransform();d.SynchronizeTransform();f=0;if(this.m_enableLimit&&this.m_limitState!=b2Joint.e_inactiveLimit){b=d.m_sweep.a-c.m_sweep.a-this.m_referenceAngle;g=0;if(this.m_limitState==b2Joint.e_equalLimits){b=b2Math.b2Clamp(b,-b2Settings.b2_maxAngularCorrection,b2Settings.b2_maxAngularCorrection);g=-this.m_motorMass*b;f=b2Math.b2Abs(b)}else if(this.m_limitState==
b2Joint.e_atLowerLimit){b=b-this.m_lowerAngle;f=b2Math.b2Max(0,-b);b=b2Math.b2Clamp(b+b2Settings.b2_angularSlop,-b2Settings.b2_maxAngularCorrection,0);g=-this.m_motorMass*b;b=this.m_limitPositionImpulse;this.m_limitPositionImpulse=b2Math.b2Max(this.m_limitPositionImpulse+g,0);g=this.m_limitPositionImpulse-b}else if(this.m_limitState==b2Joint.e_atUpperLimit){b=b-this.m_upperAngle;f=b2Math.b2Max(0,b);b=b2Math.b2Clamp(b-b2Settings.b2_angularSlop,0,b2Settings.b2_maxAngularCorrection);g=-this.m_motorMass*
b;b=this.m_limitPositionImpulse;this.m_limitPositionImpulse=b2Math.b2Min(this.m_limitPositionImpulse+g,0);g=this.m_limitPositionImpulse-b}c.m_sweep.a-=c.m_invI*g;d.m_sweep.a+=d.m_invI*g;c.SynchronizeTransform();d.SynchronizeTransform()}return e<=b2Settings.b2_linearSlop&&f<=b2Settings.b2_angularSlop};var b2PrismaticJoint=function(){b2Joint.prototype.__varz.call(this);this.__varz();this.__constructor.apply(this,arguments)};extend(b2PrismaticJoint.prototype,b2Joint.prototype);a=b2PrismaticJoint.prototype;a._super=function(){b2Joint.prototype.__constructor.apply(this,arguments)};
a.__constructor=function(b){this._super(b);this.m_localAnchor1.SetV(b.localAnchor1);this.m_localAnchor2.SetV(b.localAnchor2);this.m_localXAxis1.SetV(b.localAxis1);this.m_localYAxis1.x=-this.m_localXAxis1.y;this.m_localYAxis1.y=this.m_localXAxis1.x;this.m_refAngle=b.referenceAngle;this.m_linearJacobian.SetZero();this.m_torque=this.m_angularMass=this.m_force=this.m_linearMass=0;this.m_motorJacobian.SetZero();this.m_limitPositionImpulse=this.m_limitForce=this.m_motorForce=this.m_motorMass=0;this.m_lowerTranslation=
b.lowerTranslation;this.m_upperTranslation=b.upperTranslation;this.m_maxMotorForce=b.maxMotorForce;this.m_motorSpeed=b.motorSpeed;this.m_enableLimit=b.enableLimit;this.m_enableMotor=b.enableMotor};a.__varz=function(){this.m_localAnchor1=new b2Vec2;this.m_localAnchor2=new b2Vec2;this.m_localXAxis1=new b2Vec2;this.m_localYAxis1=new b2Vec2;this.m_linearJacobian=new b2Jacobian;this.m_motorJacobian=new b2Jacobian};a.m_localAnchor1=new b2Vec2;a.m_localAnchor2=new b2Vec2;a.m_localXAxis1=new b2Vec2;
a.m_localYAxis1=new b2Vec2;a.m_refAngle=null;a.m_linearJacobian=new b2Jacobian;a.m_linearMass=null;a.m_force=null;a.m_angularMass=null;a.m_torque=null;a.m_motorJacobian=new b2Jacobian;a.m_motorMass=null;a.m_motorForce=null;a.m_limitForce=null;a.m_limitPositionImpulse=null;a.m_lowerTranslation=null;a.m_upperTranslation=null;a.m_maxMotorForce=null;a.m_motorSpeed=null;a.m_enableLimit=null;a.m_enableMotor=null;a.m_limitState=0;a.GetAnchor1=function(){return this.m_body1.GetWorldPoint(this.m_localAnchor1)};
a.GetAnchor2=function(){return this.m_body2.GetWorldPoint(this.m_localAnchor2)};
a.GetReactionForce=function(){var b=this.m_body1.m_xf.R;return new b2Vec2(this.m_limitForce*this.m_limitForce*(b.col1.x*this.m_localXAxis1.x+b.col2.x*this.m_localXAxis1.y)+this.m_force*this.m_force*(b.col1.x*this.m_localYAxis1.x+b.col2.x*this.m_localYAxis1.y),this.m_limitForce*this.m_limitForce*(b.col1.y*this.m_localXAxis1.x+b.col2.y*this.m_localXAxis1.y)+this.m_force*this.m_force*(b.col1.y*this.m_localYAxis1.x+b.col2.y*this.m_localYAxis1.y))};a.GetReactionTorque=function(){return this.m_torque};
a.GetJointTranslation=function(){var b=this.m_body1,c=this.m_body2,d=b.GetWorldPoint(this.m_localAnchor1),e=c.GetWorldPoint(this.m_localAnchor2);c=e.x-d.x;d=e.y-d.y;b=b.GetWorldVector(this.m_localXAxis1);return b.x*c+b.y*d};
a.GetJointSpeed=function(){var b=this.m_body1,c=this.m_body2,d;d=b.m_xf.R;var e=this.m_localAnchor1.x-b.m_sweep.localCenter.x,f=this.m_localAnchor1.y-b.m_sweep.localCenter.y,g=d.col1.x*e+d.col2.x*f;f=d.col1.y*e+d.col2.y*f;e=g;d=c.m_xf.R;var h=this.m_localAnchor2.x-c.m_sweep.localCenter.x,i=this.m_localAnchor2.y-c.m_sweep.localCenter.y;g=d.col1.x*h+d.col2.x*i;i=d.col1.y*h+d.col2.y*i;h=g;d=c.m_sweep.c.x+h-(b.m_sweep.c.x+e);g=c.m_sweep.c.y+i-(b.m_sweep.c.y+f);var j=b.GetWorldVector(this.m_localXAxis1),
k=b.m_linearVelocity,l=c.m_linearVelocity;b=b.m_angularVelocity;c=c.m_angularVelocity;return d*-b*j.y+g*b*j.x+(j.x*(l.x+-c*i-k.x- -b*f)+j.y*(l.y+c*h-k.y-b*e))};a.IsLimitEnabled=function(){return this.m_enableLimit};a.EnableLimit=function(b){this.m_enableLimit=b};a.GetLowerLimit=function(){return this.m_lowerTranslation};a.GetUpperLimit=function(){return this.m_upperTranslation};a.SetLimits=function(b,c){this.m_lowerTranslation=b;this.m_upperTranslation=c};a.IsMotorEnabled=function(){return this.m_enableMotor};
a.EnableMotor=function(b){this.m_enableMotor=b};a.SetMotorSpeed=function(b){this.m_motorSpeed=b};a.GetMotorSpeed=function(){return this.m_motorSpeed};a.SetMaxMotorForce=function(b){this.m_maxMotorForce=b};a.GetMotorForce=function(){return this.m_motorForce};
a.InitVelocityConstraints=function(b){var c=this.m_body1,d=this.m_body2,e,f;e=c.m_xf.R;var g=this.m_localAnchor1.x-c.m_sweep.localCenter.x,h=this.m_localAnchor1.y-c.m_sweep.localCenter.y;f=e.col1.x*g+e.col2.x*h;h=e.col1.y*g+e.col2.y*h;g=f;e=d.m_xf.R;var i=this.m_localAnchor2.x-d.m_sweep.localCenter.x,j=this.m_localAnchor2.y-d.m_sweep.localCenter.y;f=e.col1.x*i+e.col2.x*j;j=e.col1.y*i+e.col2.y*j;i=f;f=c.m_invMass;var k=d.m_invMass,l=c.m_invI,m=d.m_invI;e=c.m_xf.R;var n=e.col1.x*this.m_localYAxis1.x+
e.col2.x*this.m_localYAxis1.y;e=e.col1.y*this.m_localYAxis1.x+e.col2.y*this.m_localYAxis1.y;var o=d.m_sweep.c.x+i-c.m_sweep.c.x,q=d.m_sweep.c.y+j-c.m_sweep.c.y;this.m_linearJacobian.linear1.x=-n;this.m_linearJacobian.linear1.y=-e;this.m_linearJacobian.linear2.x=n;this.m_linearJacobian.linear2.y=e;this.m_linearJacobian.angular1=-(o*e-q*n);this.m_linearJacobian.angular2=i*e-j*n;this.m_linearMass=f+l*this.m_linearJacobian.angular1*this.m_linearJacobian.angular1+k+m*this.m_linearJacobian.angular2*this.m_linearJacobian.angular2;
this.m_linearMass=1/this.m_linearMass;this.m_angularMass=l+m;if(this.m_angularMass>Number.MIN_VALUE)this.m_angularMass=1/this.m_angularMass;if(this.m_enableLimit||this.m_enableMotor){e=c.m_xf.R;n=e.col1.x*this.m_localXAxis1.x+e.col2.x*this.m_localXAxis1.y;e=e.col1.y*this.m_localXAxis1.x+e.col2.y*this.m_localXAxis1.y;this.m_motorJacobian.linear1.x=-n;this.m_motorJacobian.linear1.y=-e;this.m_motorJacobian.linear2.x=n;this.m_motorJacobian.linear2.y=e;this.m_motorJacobian.angular1=-(o*e-q*n);this.m_motorJacobian.angular2=
i*e-j*n;this.m_motorMass=f+l*this.m_motorJacobian.angular1*this.m_motorJacobian.angular1+k+m*this.m_motorJacobian.angular2*this.m_motorJacobian.angular2;this.m_motorMass=1/this.m_motorMass;if(this.m_enableLimit){g=n*(o-g)+e*(q-h);if(b2Math.b2Abs(this.m_upperTranslation-this.m_lowerTranslation)<2*b2Settings.b2_linearSlop)this.m_limitState=b2Joint.e_equalLimits;else if(g<=this.m_lowerTranslation){if(this.m_limitState!=b2Joint.e_atLowerLimit)this.m_limitForce=0;this.m_limitState=b2Joint.e_atLowerLimit}else if(g>=
this.m_upperTranslation){if(this.m_limitState!=b2Joint.e_atUpperLimit)this.m_limitForce=0;this.m_limitState=b2Joint.e_atUpperLimit}else{this.m_limitState=b2Joint.e_inactiveLimit;this.m_limitForce=0}}}if(this.m_enableMotor==false)this.m_motorForce=0;if(this.m_enableLimit==false)this.m_limitForce=0;if(b.warmStarting){g=b.dt*(this.m_force*this.m_linearJacobian.linear1.y+(this.m_motorForce+this.m_limitForce)*this.m_motorJacobian.linear1.y);h=b.dt*(this.m_force*this.m_linearJacobian.linear2.x+(this.m_motorForce+
this.m_limitForce)*this.m_motorJacobian.linear2.x);i=b.dt*(this.m_force*this.m_linearJacobian.linear2.y+(this.m_motorForce+this.m_limitForce)*this.m_motorJacobian.linear2.y);j=b.dt*(this.m_force*this.m_linearJacobian.angular1-this.m_torque+(this.m_motorForce+this.m_limitForce)*this.m_motorJacobian.angular1);o=b.dt*(this.m_force*this.m_linearJacobian.angular2+this.m_torque+(this.m_motorForce+this.m_limitForce)*this.m_motorJacobian.angular2);c.m_linearVelocity.x+=f*b.dt*(this.m_force*this.m_linearJacobian.linear1.x+
(this.m_motorForce+this.m_limitForce)*this.m_motorJacobian.linear1.x);c.m_linearVelocity.y+=f*g;c.m_angularVelocity+=l*j;d.m_linearVelocity.x+=k*h;d.m_linearVelocity.y+=k*i;d.m_angularVelocity+=m*o}else this.m_motorForce=this.m_limitForce=this.m_torque=this.m_force=0;this.m_limitPositionImpulse=0};
a.SolveVelocityConstraints=function(b){var c=this.m_body1,d=this.m_body2,e=c.m_invMass,f=d.m_invMass,g=c.m_invI,h=d.m_invI,i;i=this.m_linearJacobian.Compute(c.m_linearVelocity,c.m_angularVelocity,d.m_linearVelocity,d.m_angularVelocity);i=-b.inv_dt*this.m_linearMass*i;this.m_force+=i;i=b.dt*i;c.m_linearVelocity.x+=e*i*this.m_linearJacobian.linear1.x;c.m_linearVelocity.y+=e*i*this.m_linearJacobian.linear1.y;c.m_angularVelocity+=g*i*this.m_linearJacobian.angular1;d.m_linearVelocity.x+=f*i*this.m_linearJacobian.linear2.x;
d.m_linearVelocity.y+=f*i*this.m_linearJacobian.linear2.y;d.m_angularVelocity+=h*i*this.m_linearJacobian.angular2;i=-b.inv_dt*this.m_angularMass*(d.m_angularVelocity-c.m_angularVelocity);this.m_torque+=i;i=b.dt*i;c.m_angularVelocity-=g*i;d.m_angularVelocity+=h*i;if(this.m_enableMotor&&this.m_limitState!=b2Joint.e_equalLimits){i=this.m_motorJacobian.Compute(c.m_linearVelocity,c.m_angularVelocity,d.m_linearVelocity,d.m_angularVelocity)-this.m_motorSpeed;i=-b.inv_dt*this.m_motorMass*i;var j=this.m_motorForce;
this.m_motorForce=b2Math.b2Clamp(this.m_motorForce+i,-this.m_maxMotorForce,this.m_maxMotorForce);i=this.m_motorForce-j;i=b.dt*i;c.m_linearVelocity.x+=e*i*this.m_motorJacobian.linear1.x;c.m_linearVelocity.y+=e*i*this.m_motorJacobian.linear1.y;c.m_angularVelocity+=g*i*this.m_motorJacobian.angular1;d.m_linearVelocity.x+=f*i*this.m_motorJacobian.linear2.x;d.m_linearVelocity.y+=f*i*this.m_motorJacobian.linear2.y;d.m_angularVelocity+=h*i*this.m_motorJacobian.angular2}if(this.m_enableLimit&&this.m_limitState!=
b2Joint.e_inactiveLimit){i=this.m_motorJacobian.Compute(c.m_linearVelocity,c.m_angularVelocity,d.m_linearVelocity,d.m_angularVelocity);j=-b.inv_dt*this.m_motorMass*i;if(this.m_limitState==b2Joint.e_equalLimits)this.m_limitForce+=j;else if(this.m_limitState==b2Joint.e_atLowerLimit){i=this.m_limitForce;this.m_limitForce=b2Math.b2Max(this.m_limitForce+j,0);j=this.m_limitForce-i}else if(this.m_limitState==b2Joint.e_atUpperLimit){i=this.m_limitForce;this.m_limitForce=b2Math.b2Min(this.m_limitForce+j,0);
j=this.m_limitForce-i}i=b.dt*j;c.m_linearVelocity.x+=e*i*this.m_motorJacobian.linear1.x;c.m_linearVelocity.y+=e*i*this.m_motorJacobian.linear1.y;c.m_angularVelocity+=g*i*this.m_motorJacobian.angular1;d.m_linearVelocity.x+=f*i*this.m_motorJacobian.linear2.x;d.m_linearVelocity.y+=f*i*this.m_motorJacobian.linear2.y;d.m_angularVelocity+=h*i*this.m_motorJacobian.angular2}};
a.SolvePositionConstraints=function(){var b,c,d=this.m_body1,e=this.m_body2,f=d.m_invMass,g=e.m_invMass,h=d.m_invI,i=e.m_invI,j,k;j=d.m_xf.R;var l=this.m_localAnchor1.x-d.m_sweep.localCenter.x,m=this.m_localAnchor1.y-d.m_sweep.localCenter.y;k=j.col1.x*l+j.col2.x*m;m=j.col1.y*l+j.col2.y*m;l=k;j=e.m_xf.R;var n=this.m_localAnchor2.x-e.m_sweep.localCenter.x;b=this.m_localAnchor2.y-e.m_sweep.localCenter.y;k=j.col1.x*n+j.col2.x*b;b=j.col1.y*n+j.col2.y*b;n=k;j=d.m_sweep.c.x+l;m=d.m_sweep.c.y+m;n=e.m_sweep.c.x+
n;b=e.m_sweep.c.y+b;n=n-j;b=b-m;j=d.m_xf.R;var o=(j.col1.x*this.m_localYAxis1.x+j.col2.x*this.m_localYAxis1.y)*n+(j.col1.y*this.m_localYAxis1.x+j.col2.y*this.m_localYAxis1.y)*b;o=b2Math.b2Clamp(o,-b2Settings.b2_maxLinearCorrection,b2Settings.b2_maxLinearCorrection);c=-this.m_linearMass*o;d.m_sweep.c.x+=f*c*this.m_linearJacobian.linear1.x;d.m_sweep.c.y+=f*c*this.m_linearJacobian.linear1.y;d.m_sweep.a+=h*c*this.m_linearJacobian.angular1;e.m_sweep.c.x+=g*c*this.m_linearJacobian.linear2.x;e.m_sweep.c.y+=
g*c*this.m_linearJacobian.linear2.y;e.m_sweep.a+=i*c*this.m_linearJacobian.angular2;o=b2Math.b2Abs(o);c=e.m_sweep.a-d.m_sweep.a-this.m_refAngle;c=b2Math.b2Clamp(c,-b2Settings.b2_maxAngularCorrection,b2Settings.b2_maxAngularCorrection);var q=-this.m_angularMass*c;d.m_sweep.a-=d.m_invI*q;e.m_sweep.a+=e.m_invI*q;d.SynchronizeTransform();e.SynchronizeTransform();q=b2Math.b2Abs(c);if(this.m_enableLimit&&this.m_limitState!=b2Joint.e_inactiveLimit){j=d.m_xf.R;l=this.m_localAnchor1.x-d.m_sweep.localCenter.x;
m=this.m_localAnchor1.y-d.m_sweep.localCenter.y;k=j.col1.x*l+j.col2.x*m;m=j.col1.y*l+j.col2.y*m;l=k;j=e.m_xf.R;n=this.m_localAnchor2.x-e.m_sweep.localCenter.x;b=this.m_localAnchor2.y-e.m_sweep.localCenter.y;k=j.col1.x*n+j.col2.x*b;b=j.col1.y*n+j.col2.y*b;n=k;j=d.m_sweep.c.x+l;m=d.m_sweep.c.y+m;n=e.m_sweep.c.x+n;b=e.m_sweep.c.y+b;n=n-j;b=b-m;j=d.m_xf.R;j=(j.col1.x*this.m_localXAxis1.x+j.col2.x*this.m_localXAxis1.y)*n+(j.col1.y*this.m_localXAxis1.x+j.col2.y*this.m_localXAxis1.y)*b;b=0;if(this.m_limitState==
b2Joint.e_equalLimits){b=b2Math.b2Clamp(j,-b2Settings.b2_maxLinearCorrection,b2Settings.b2_maxLinearCorrection);b=-this.m_motorMass*b;o=b2Math.b2Max(o,b2Math.b2Abs(c))}else if(this.m_limitState==b2Joint.e_atLowerLimit){b=j-this.m_lowerTranslation;o=b2Math.b2Max(o,-b);b=b2Math.b2Clamp(b+b2Settings.b2_linearSlop,-b2Settings.b2_maxLinearCorrection,0);b=-this.m_motorMass*b;c=this.m_limitPositionImpulse;this.m_limitPositionImpulse=b2Math.b2Max(this.m_limitPositionImpulse+b,0);b=this.m_limitPositionImpulse-
c}else if(this.m_limitState==b2Joint.e_atUpperLimit){b=j-this.m_upperTranslation;o=b2Math.b2Max(o,b);b=b2Math.b2Clamp(b-b2Settings.b2_linearSlop,0,b2Settings.b2_maxLinearCorrection);b=-this.m_motorMass*b;c=this.m_limitPositionImpulse;this.m_limitPositionImpulse=b2Math.b2Min(this.m_limitPositionImpulse+b,0);b=this.m_limitPositionImpulse-c}d.m_sweep.c.x+=f*b*this.m_motorJacobian.linear1.x;d.m_sweep.c.y+=f*b*this.m_motorJacobian.linear1.y;d.m_sweep.a+=h*b*this.m_motorJacobian.angular1;e.m_sweep.c.x+=
g*b*this.m_motorJacobian.linear2.x;e.m_sweep.c.y+=g*b*this.m_motorJacobian.linear2.y;e.m_sweep.a+=i*b*this.m_motorJacobian.angular2;d.SynchronizeTransform();e.SynchronizeTransform()}return o<=b2Settings.b2_linearSlop&&q<=b2Settings.b2_angularSlop};var ClipVertex=function(){this.__varz();this.__constructor.apply(this,arguments)};ClipVertex.prototype.__constructor=function(){};ClipVertex.prototype.__varz=function(){this.v=new b2Vec2;this.id=new b2ContactID};ClipVertex.prototype.v=new b2Vec2;ClipVertex.prototype.id=new b2ContactID;var b2NullContact=function(){b2Contact.prototype.__varz.call(this);this.__varz();this.__constructor.apply(this,arguments)};extend(b2NullContact.prototype,b2Contact.prototype);a=b2NullContact.prototype;a._super=function(){b2Contact.prototype.__constructor.apply(this,arguments)};a.__constructor=function(){};a.__varz=function(){};a.Evaluate=function(){};a.GetManifolds=function(){return null};var b2PolyAndCircleContact=function(){b2Contact.prototype.__varz.call(this);this.__varz();this.__constructor.apply(this,arguments)};extend(b2PolyAndCircleContact.prototype,b2Contact.prototype);b2PolyAndCircleContact.prototype._super=function(){b2Contact.prototype.__constructor.apply(this,arguments)};
b2PolyAndCircleContact.prototype.__constructor=function(b,c){this._super(b,c);this.m_manifold=this.m_manifolds[0];b2Settings.b2Assert(this.m_shape1.m_type==b2Shape.e_polygonShape);b2Settings.b2Assert(this.m_shape2.m_type==b2Shape.e_circleShape);this.m_manifold.pointCount=0;b=this.m_manifold.points[0];b.normalImpulse=0;b.tangentImpulse=0};b2PolyAndCircleContact.prototype.__varz=function(){this.m_manifolds=[new b2Manifold];this.m0=new b2Manifold};b2PolyAndCircleContact.s_evalCP=new b2ContactPoint;
b2PolyAndCircleContact.Create=function(b,c){return new b2PolyAndCircleContact(b,c)};b2PolyAndCircleContact.Destroy=function(){};a=b2PolyAndCircleContact.prototype;a.m_manifolds=[new b2Manifold];a.m0=new b2Manifold;a.m_manifold=null;
a.Evaluate=function(b){var c=0,d,e,f,g=this.m_shape1.m_body,h=this.m_shape2.m_body;this.m0.Set(this.m_manifold);b2Collision.b2CollidePolygonAndCircle(this.m_manifold,this.m_shape1,g.m_xf,this.m_shape2,h.m_xf);var i=[false,false],j=b2PolyAndCircleContact.s_evalCP;j.shape1=this.m_shape1;j.shape2=this.m_shape2;j.friction=this.m_friction;j.restitution=this.m_restitution;if(this.m_manifold.pointCount>0){for(c=0;c<this.m_manifold.pointCount;++c){var k=this.m_manifold.points[c];k.normalImpulse=0;k.tangentImpulse=
0;var l=false,m=k.id._key;for(d=0;d<this.m0.pointCount;++d)if(i[d]!=true){f=this.m0.points[d];if(f.id._key==m){i[d]=true;k.normalImpulse=f.normalImpulse;k.tangentImpulse=f.tangentImpulse;l=true;if(b!=null){j.position=g.GetWorldPoint(k.localPoint1);d=g.GetLinearVelocityFromLocalPoint(k.localPoint1);e=h.GetLinearVelocityFromLocalPoint(k.localPoint2);j.velocity.Set(e.x-d.x,e.y-d.y);j.normal.SetV(this.m_manifold.normal);j.separation=k.separation;j.id.key=m;b.Persist(j)}break}}if(l==false&&b!=null){j.position=
g.GetWorldPoint(k.localPoint1);d=g.GetLinearVelocityFromLocalPoint(k.localPoint1);e=h.GetLinearVelocityFromLocalPoint(k.localPoint2);j.velocity.Set(e.x-d.x,e.y-d.y);j.normal.SetV(this.m_manifold.normal);j.separation=k.separation;j.id.key=m;b.Add(j)}}this.m_manifoldCount=1}else this.m_manifoldCount=0;if(b!=null)for(c=0;c<this.m0.pointCount;++c)if(!i[c]){f=this.m0.points[c];j.position=g.GetWorldPoint(f.localPoint1);d=g.GetLinearVelocityFromLocalPoint(f.localPoint1);e=h.GetLinearVelocityFromLocalPoint(f.localPoint2);
j.velocity.Set(e.x-d.x,e.y-d.y);j.normal.SetV(this.m0.normal);j.separation=f.separation;j.id.key=f.id._key;b.Remove(j)}};a.GetManifolds=function(){return this.m_manifolds};var b2ContactManager=function(){b2PairCallback.prototype.__varz.call(this);this.__varz();this.__constructor.apply(this,arguments)};extend(b2ContactManager.prototype,b2PairCallback.prototype);b2ContactManager.prototype._super=function(){b2PairCallback.prototype.__constructor.apply(this,arguments)};b2ContactManager.prototype.__constructor=function(){this.m_world=null;this.m_destroyImmediate=false};b2ContactManager.prototype.__varz=function(){this.m_nullContact=new b2NullContact};
b2ContactManager.s_evalCP=new b2ContactPoint;a=b2ContactManager.prototype;a.m_world=null;a.m_nullContact=new b2NullContact;a.m_destroyImmediate=null;
a.PairAdded=function(b,c){b=b;c=c;var d=b.m_body,e=c.m_body;if(d.IsStatic()&&e.IsStatic())return this.m_nullContact;if(b.m_body==c.m_body)return this.m_nullContact;if(e.IsConnected(d))return this.m_nullContact;if(this.m_world.m_contactFilter!=null&&this.m_world.m_contactFilter.ShouldCollide(b,c)==false)return this.m_nullContact;var f=b2Contact.Create(b,c,this.m_world.m_blockAllocator);if(f==null)return this.m_nullContact;b=f.m_shape1;c=f.m_shape2;d=b.m_body;e=c.m_body;f.m_prev=null;f.m_next=this.m_world.m_contactList;
if(this.m_world.m_contactList!=null)this.m_world.m_contactList.m_prev=f;this.m_world.m_contactList=f;f.m_node1.contact=f;f.m_node1.other=e;f.m_node1.prev=null;f.m_node1.next=d.m_contactList;if(d.m_contactList!=null)d.m_contactList.prev=f.m_node1;d.m_contactList=f.m_node1;f.m_node2.contact=f;f.m_node2.other=d;f.m_node2.prev=null;f.m_node2.next=e.m_contactList;if(e.m_contactList!=null)e.m_contactList.prev=f.m_node2;e.m_contactList=f.m_node2;++this.m_world.m_contactCount;return f};
a.PairRemoved=function(b,c,d){d!=null&&d!=this.m_nullContact&&this.Destroy(d)};
a.Destroy=function(b){var c=b.m_shape1,d=b.m_shape2,e=b.m_manifoldCount;if(e>0&&this.m_world.m_contactListener){var f=c.m_body,g=d.m_body,h=b.GetManifolds(),i=b2ContactManager.s_evalCP;i.shape1=b.m_shape1;i.shape2=b.m_shape1;i.friction=b.m_friction;i.restitution=b.m_restitution;for(var j=0;j<e;++j){var k=h[j];i.normal.SetV(k.normal);for(var l=0;l<k.pointCount;++l){var m=k.points[l];i.position=f.GetWorldPoint(m.localPoint1);var n=f.GetLinearVelocityFromLocalPoint(m.localPoint1),o=g.GetLinearVelocityFromLocalPoint(m.localPoint2);
i.velocity.Set(o.x-n.x,o.y-n.y);i.separation=m.separation;i.id.key=m.id._key;this.m_world.m_contactListener.Remove(i)}}}if(b.m_prev)b.m_prev.m_next=b.m_next;if(b.m_next)b.m_next.m_prev=b.m_prev;if(b==this.m_world.m_contactList)this.m_world.m_contactList=b.m_next;c=c.m_body;d=d.m_body;if(b.m_node1.prev)b.m_node1.prev.next=b.m_node1.next;if(b.m_node1.next)b.m_node1.next.prev=b.m_node1.prev;if(b.m_node1==c.m_contactList)c.m_contactList=b.m_node1.next;if(b.m_node2.prev)b.m_node2.prev.next=b.m_node2.next;
if(b.m_node2.next)b.m_node2.next.prev=b.m_node2.prev;if(b.m_node2==d.m_contactList)d.m_contactList=b.m_node2.next;b2Contact.Destroy(b,this.m_world.m_blockAllocator);--this.m_world.m_contactCount};a.Collide=function(){for(var b=this.m_world.m_contactList;b;b=b.m_next){var c=b.m_shape2.m_body;b.m_shape1.m_body.IsSleeping()&&c.IsSleeping()||b.Update(this.m_world.m_contactListener)}};var b2World=function(){this.__varz();this.__constructor.apply(this,arguments)};
b2World.prototype.__constructor=function(b,c,d){this.m_boundaryListener=this.m_destructionListener=null;this.m_contactFilter=b2ContactFilter.b2_defaultFilter;this.m_jointList=this.m_contactList=this.m_bodyList=this.m_debugDraw=this.m_contactListener=null;this.m_jointCount=this.m_contactCount=this.m_bodyCount=0;b2World.m_positionCorrection=true;b2World.m_warmStarting=true;b2World.m_continuousPhysics=true;this.m_allowSleep=d;this.m_gravity=c;this.m_lock=false;this.m_inv_dt0=0;this.m_contactManager.m_world=
this;this.m_broadPhase=new b2BroadPhase(b,this.m_contactManager);this.m_groundBody=this.CreateBody(new b2BodyDef)};b2World.prototype.__varz=function(){this.m_raycastNormal=new b2Vec2;this.m_contactManager=new b2ContactManager};b2World.m_positionCorrection=null;b2World.m_warmStarting=null;b2World.m_continuousPhysics=null;b2World.s_jointColor=new b2Color(0.5,0.8,0.8);b2World.s_coreColor=new b2Color(0.9,0.6,0.6);b2World.s_xf=new b2XForm;a=b2World.prototype;a.m_raycastUserData=null;
a.m_raycastSegment=null;a.m_raycastNormal=new b2Vec2;a.m_blockAllocator=null;a.m_stackAllocator=null;a.m_lock=null;a.m_broadPhase=null;a.m_contactManager=new b2ContactManager;a.m_bodyList=null;a.m_jointList=null;a.m_contactList=null;a.m_bodyCount=0;a.m_contactCount=0;a.m_jointCount=0;a.m_gravity=null;a.m_allowSleep=null;a.m_groundBody=null;a.m_destructionListener=null;a.m_boundaryListener=null;a.m_contactFilter=null;a.m_contactListener=null;a.m_debugDraw=null;a.m_inv_dt0=null;
a.m_positionIterationCount=0;a.SetDestructionListener=function(b){this.m_destructionListener=b};a.SetBoundaryListener=function(b){this.m_boundaryListener=b};a.SetContactFilter=function(b){this.m_contactFilter=b};a.SetContactListener=function(b){this.m_contactListener=b};a.SetDebugDraw=function(b){this.m_debugDraw=b};a.Validate=function(){this.m_broadPhase.Validate()};a.GetProxyCount=function(){return this.m_broadPhase.m_proxyCount};a.GetPairCount=function(){return this.m_broadPhase.m_pairManager.m_pairCount};
a.CreateBody=function(b){if(this.m_lock==true)return null;b=new b2Body(b,this);b.m_prev=null;if(b.m_next=this.m_bodyList)this.m_bodyList.m_prev=b;this.m_bodyList=b;++this.m_bodyCount;return b};
a.DestroyBody=function(b){if(this.m_lock!=true){for(var c=b.m_jointList;c;){var d=c;c=c.next;this.m_destructionListener&&this.m_destructionListener.SayGoodbyeJoint(d.joint);this.DestroyJoint(d.joint)}for(c=b.m_shapeList;c;){d=c;c=c.m_next;this.m_destructionListener&&this.m_destructionListener.SayGoodbyeShape(d);d.DestroyProxy(this.m_broadPhase);b2Shape.Destroy(d,this.m_blockAllocator)}if(b.m_prev)b.m_prev.m_next=b.m_next;if(b.m_next)b.m_next.m_prev=b.m_prev;if(b==this.m_bodyList)this.m_bodyList=b.m_next;
--this.m_bodyCount}};
a.CreateJoint=function(b){var c=b2Joint.Create(b,this.m_blockAllocator);c.m_prev=null;if(c.m_next=this.m_jointList)this.m_jointList.m_prev=c;this.m_jointList=c;++this.m_jointCount;c.m_node1.joint=c;c.m_node1.other=c.m_body2;c.m_node1.prev=null;if(c.m_node1.next=c.m_body1.m_jointList)c.m_body1.m_jointList.prev=c.m_node1;c.m_body1.m_jointList=c.m_node1;c.m_node2.joint=c;c.m_node2.other=c.m_body1;c.m_node2.prev=null;if(c.m_node2.next=c.m_body2.m_jointList)c.m_body2.m_jointList.prev=c.m_node2;c.m_body2.m_jointList=
c.m_node2;if(b.collideConnected==false){b=b.body1.m_shapeCount<b.body2.m_shapeCount?b.body1:b.body2;for(var d=b.m_shapeList;d;d=d.m_next)d.RefilterProxy(this.m_broadPhase,b.m_xf)}return c};
a.DestroyJoint=function(b){var c=b.m_collideConnected;if(b.m_prev)b.m_prev.m_next=b.m_next;if(b.m_next)b.m_next.m_prev=b.m_prev;if(b==this.m_jointList)this.m_jointList=b.m_next;var d=b.m_body1,e=b.m_body2;d.WakeUp();e.WakeUp();if(b.m_node1.prev)b.m_node1.prev.next=b.m_node1.next;if(b.m_node1.next)b.m_node1.next.prev=b.m_node1.prev;if(b.m_node1==d.m_jointList)d.m_jointList=b.m_node1.next;b.m_node1.prev=null;b.m_node1.next=null;if(b.m_node2.prev)b.m_node2.prev.next=b.m_node2.next;if(b.m_node2.next)b.m_node2.next.prev=
b.m_node2.prev;if(b.m_node2==e.m_jointList)e.m_jointList=b.m_node2.next;b.m_node2.prev=null;b.m_node2.next=null;b2Joint.Destroy(b,this.m_blockAllocator);--this.m_jointCount;if(c==false){b=d.m_shapeCount<e.m_shapeCount?d:e;for(c=b.m_shapeList;c;c=c.m_next)c.RefilterProxy(this.m_broadPhase,b.m_xf)}};a.Refilter=function(b){b.RefilterProxy(this.m_broadPhase,b.m_body.m_xf)};a.SetWarmStarting=function(b){b2World.m_warmStarting=b};a.SetPositionCorrection=function(b){b2World.m_positionCorrection=b};
a.SetContinuousPhysics=function(b){b2World.m_continuousPhysics=b};a.GetBodyCount=function(){return this.m_bodyCount};a.GetJointCount=function(){return this.m_jointCount};a.GetContactCount=function(){return this.m_contactCount};a.SetGravity=function(b){this.m_gravity=b};a.GetGroundBody=function(){return this.m_groundBody};
a.Step=function(b,c){this.m_lock=true;var d=new b2TimeStep;d.dt=b;d.maxIterations=c;d.inv_dt=b>0?1/b:0;d.dtRatio=this.m_inv_dt0*b;d.positionCorrection=b2World.m_positionCorrection;d.warmStarting=b2World.m_warmStarting;this.m_contactManager.Collide();d.dt>0&&this.Solve(d);b2World.m_continuousPhysics&&d.dt>0&&this.SolveTOI(d);this.DrawDebugData();this.m_inv_dt0=d.inv_dt;this.m_lock=false};a.Query=function(b,c,d){var e=new Array(d);b=this.m_broadPhase.QueryAABB(b,e,d);for(d=0;d<b;++d)c[d]=e[d];return b};
a.Raycast=function(b,c,d,e,f){var g=new Array(d);this.m_raycastSegment=b;this.m_raycastUserData=f;f=0;f=e?this.m_broadPhase.QuerySegment(b,g,d,this.RaycastSortKey):this.m_broadPhase.QuerySegment(b,g,d,this.RaycastSortKey2);for(b=0;b<f;++b)c[b]=g[b];return f};a.RaycastOne=function(b,c,d,e,f){var g=new Array(1);e=this.Raycast(b,g,1,e,f);if(e==0)return null;e>1&&trace(e);g=g[0];e=g.GetBody().GetXForm();g.TestSegment(e,c,d,b,1);return g};a.GetBodyList=function(){return this.m_bodyList};
a.GetJointList=function(){return this.m_jointList};
a.Solve=function(b){var c;this.m_positionIterationCount=0;var d=new b2Island(this.m_bodyCount,this.m_contactCount,this.m_jointCount,this.m_stackAllocator,this.m_contactListener);for(c=this.m_bodyList;c;c=c.m_next)c.m_flags&=~b2Body.e_islandFlag;for(var e=this.m_contactList;e;e=e.m_next)e.m_flags&=~b2Contact.e_islandFlag;for(e=this.m_jointList;e;e=e.m_next)e.m_islandFlag=false;e=new Array(this.m_bodyCount);for(var f=this.m_bodyList;f;f=f.m_next)if(!(f.m_flags&(b2Body.e_islandFlag|b2Body.e_sleepFlag|
b2Body.e_frozenFlag)))if(!f.IsStatic()){d.Clear();var g=0;e[g++]=f;for(f.m_flags|=b2Body.e_islandFlag;g>0;){c=e[--g];d.AddBody(c);c.m_flags&=~b2Body.e_sleepFlag;if(!c.IsStatic()){for(var h,i=c.m_contactList;i;i=i.next)if(!(i.contact.m_flags&(b2Contact.e_islandFlag|b2Contact.e_nonSolidFlag)))if(i.contact.m_manifoldCount!=0){d.AddContact(i.contact);i.contact.m_flags|=b2Contact.e_islandFlag;h=i.other;if(!(h.m_flags&b2Body.e_islandFlag)){e[g++]=h;h.m_flags|=b2Body.e_islandFlag}}for(c=c.m_jointList;c;c=
c.next)if(c.joint.m_islandFlag!=true){d.AddJoint(c.joint);c.joint.m_islandFlag=true;h=c.other;if(!(h.m_flags&b2Body.e_islandFlag)){e[g++]=h;h.m_flags|=b2Body.e_islandFlag}}}}d.Solve(b,this.m_gravity,b2World.m_positionCorrection,this.m_allowSleep);if(d.m_positionIterationCount>this.m_positionIterationCount)this.m_positionIterationCount=d.m_positionIterationCount;for(g=0;g<d.m_bodyCount;++g){c=d.m_bodies[g];if(c.IsStatic())c.m_flags&=~b2Body.e_islandFlag}}for(c=this.m_bodyList;c;c=c.m_next)c.m_flags&
(b2Body.e_sleepFlag|b2Body.e_frozenFlag)||c.IsStatic()||c.SynchronizeShapes()==false&&this.m_boundaryListener!=null&&this.m_boundaryListener.Violation(c);this.m_broadPhase.Commit()};
a.SolveTOI=function(b){var c,d,e,f=new b2Island(this.m_bodyCount,b2Settings.b2_maxTOIContactsPerIsland,0,this.m_stackAllocator,this.m_contactListener),g=new Array(this.m_bodyCount);for(c=this.m_bodyList;c;c=c.m_next){c.m_flags&=~b2Body.e_islandFlag;c.m_sweep.t0=0}var h;for(h=this.m_contactList;h;h=h.m_next)h.m_flags&=~(b2Contact.e_toiFlag|b2Contact.e_islandFlag);for(;;){c=null;var i=1;for(h=this.m_contactList;h;h=h.m_next)if(!(h.m_flags&(b2Contact.e_slowFlag|b2Contact.e_nonSolidFlag))){d=1;if(h.m_flags&
b2Contact.e_toiFlag)d=h.m_toi;else{d=h.m_shape1;e=h.m_shape2;d=d.m_body;e=e.m_body;if((d.IsStatic()||d.IsSleeping())&&(e.IsStatic()||e.IsSleeping()))continue;var j=d.m_sweep.t0;if(d.m_sweep.t0<e.m_sweep.t0){j=e.m_sweep.t0;d.m_sweep.Advance(j)}else if(e.m_sweep.t0<d.m_sweep.t0){j=d.m_sweep.t0;e.m_sweep.Advance(j)}d=b2TimeOfImpact.TimeOfImpact(h.m_shape1,d.m_sweep,h.m_shape2,e.m_sweep);if(d>0&&d<1){d=(1-d)*j+d;if(d>1)d=1}h.m_toi=d;h.m_flags|=b2Contact.e_toiFlag}if(Number.MIN_VALUE<d&&d<i){c=h;i=d}}if(c==
null||1-100*Number.MIN_VALUE<i)break;d=c.m_shape1;e=c.m_shape2;d=d.m_body;e=e.m_body;d.Advance(i);e.Advance(i);c.Update(this.m_contactListener);c.m_flags&=~b2Contact.e_toiFlag;if(c.m_manifoldCount!=0){c=d;if(c.IsStatic())c=e;f.Clear();h=0;g[h++]=c;for(c.m_flags|=b2Body.e_islandFlag;h>0;){c=g[--h];f.AddBody(c);c.m_flags&=~b2Body.e_sleepFlag;if(!c.IsStatic())for(c=c.m_contactList;c;c=c.next)if(f.m_contactCount!=f.m_contactCapacity)if(!(c.contact.m_flags&(b2Contact.e_islandFlag|b2Contact.e_slowFlag|
b2Contact.e_nonSolidFlag)))if(c.contact.m_manifoldCount!=0){f.AddContact(c.contact);c.contact.m_flags|=b2Contact.e_islandFlag;d=c.other;if(!(d.m_flags&b2Body.e_islandFlag)){if(d.IsStatic()==false){d.Advance(i);d.WakeUp()}g[h++]=d;d.m_flags|=b2Body.e_islandFlag}}}h=new b2TimeStep;h.dt=(1-i)*b.dt;h.inv_dt=1/h.dt;h.maxIterations=b.maxIterations;f.SolveTOI(h);for(i=i=0;i<f.m_bodyCount;++i){c=f.m_bodies[i];c.m_flags&=~b2Body.e_islandFlag;if(!(c.m_flags&(b2Body.e_sleepFlag|b2Body.e_frozenFlag)))if(!c.IsStatic()){c.SynchronizeShapes()==
false&&this.m_boundaryListener!=null&&this.m_boundaryListener.Violation(c);for(c=c.m_contactList;c;c=c.next)c.contact.m_flags&=~b2Contact.e_toiFlag}}for(i=0;i<f.m_contactCount;++i){h=f.m_contacts[i];h.m_flags&=~(b2Contact.e_toiFlag|b2Contact.e_islandFlag)}this.m_broadPhase.Commit()}}};
a.DrawJoint=function(b){var c=b.m_body1,d=b.m_body2,e=c.m_xf.position,f=d.m_xf.position,g=b.GetAnchor1(),h=b.GetAnchor2(),i=b2World.s_jointColor;switch(b.m_type){case b2Joint.e_distanceJoint:this.m_debugDraw.DrawSegment(g,h,i);break;case b2Joint.e_pulleyJoint:c=b.GetGroundAnchor1();b=b.GetGroundAnchor2();this.m_debugDraw.DrawSegment(c,g,i);this.m_debugDraw.DrawSegment(b,h,i);this.m_debugDraw.DrawSegment(c,b,i);break;case b2Joint.e_mouseJoint:this.m_debugDraw.DrawSegment(g,h,i);break;default:c!=this.m_groundBody&&
this.m_debugDraw.DrawSegment(e,g,i);this.m_debugDraw.DrawSegment(g,h,i);d!=this.m_groundBody&&this.m_debugDraw.DrawSegment(f,h,i)}};
a.DrawShape=function(b,c,d,e){var f=b2World.s_coreColor;switch(b.m_type){case b2Shape.e_circleShape:var g=b2Math.b2MulX(c,b.m_localPosition);b=b.m_radius;this.m_debugDraw.DrawSolidCircle(g,b,c.R.col1,d);e&&this.m_debugDraw.DrawCircle(g,b-b2Settings.b2_toiSlop,f);break;case b2Shape.e_polygonShape:g=0;var h=b.GetVertexCount(),i=b.GetVertices(),j=new Array(b2Settings.b2_maxPolygonVertices);for(g=0;g<h;++g)j[g]=b2Math.b2MulX(c,i[g]);this.m_debugDraw.DrawSolidPolygon(j,h,d);if(e){d=b.GetCoreVertices();
for(g=0;g<h;++g)j[g]=b2Math.b2MulX(c,d[g]);this.m_debugDraw.DrawPolygon(j,h,f)}break}};
a.DrawDebugData=function(){if(this.m_debugDraw!=null){this.m_debugDraw.m_sprite.graphics.clear();var b=this.m_debugDraw.GetFlags(),c=0,d,e,f=new b2Vec2,g=new b2Vec2,h=new b2Vec2,i=new b2Color(0,0,0),j,k=new b2AABB,l=new b2AABB,m=[new b2Vec2,new b2Vec2,new b2Vec2,new b2Vec2];if(b&b2DebugDraw.e_shapeBit){c=(b&b2DebugDraw.e_coreShapeBit)==b2DebugDraw.e_coreShapeBit;for(d=this.m_bodyList;d;d=d.m_next){j=d.m_xf;for(e=d.GetShapeList();e;e=e.m_next)if(d.IsStatic())this.DrawShape(e,j,new b2Color(0.5,0.9,
0.5),c);else d.IsSleeping()?this.DrawShape(e,j,new b2Color(0.5,0.5,0.9),c):this.DrawShape(e,j,new b2Color(0.9,0.9,0.9),c)}}if(b&b2DebugDraw.e_jointBit)for(c=this.m_jointList;c;c=c.m_next)this.DrawJoint(c);if(b&b2DebugDraw.e_pairBit){d=this.m_broadPhase;f.Set(1/d.m_quantizationFactor.x,1/d.m_quantizationFactor.y);i.Set(0.9,0.9,0.3);for(c=0;c<b2Pair.b2_tableCapacity;++c)for(e=d.m_pairManager.m_hashTable[c];e!=b2Pair.b2_nullPair;){e=d.m_pairManager.m_pairs[e];j=d.m_proxyPool[e.proxyId1];var n=d.m_proxyPool[e.proxyId2];
k.lowerBound.x=d.m_worldAABB.lowerBound.x+f.x*d.m_bounds[0][j.lowerBounds[0]].value;k.lowerBound.y=d.m_worldAABB.lowerBound.y+f.y*d.m_bounds[1][j.lowerBounds[1]].value;k.upperBound.x=d.m_worldAABB.lowerBound.x+f.x*d.m_bounds[0][j.upperBounds[0]].value;k.upperBound.y=d.m_worldAABB.lowerBound.y+f.y*d.m_bounds[1][j.upperBounds[1]].value;l.lowerBound.x=d.m_worldAABB.lowerBound.x+f.x*d.m_bounds[0][n.lowerBounds[0]].value;l.lowerBound.y=d.m_worldAABB.lowerBound.y+f.y*d.m_bounds[1][n.lowerBounds[1]].value;
l.upperBound.x=d.m_worldAABB.lowerBound.x+f.x*d.m_bounds[0][n.upperBounds[0]].value;l.upperBound.y=d.m_worldAABB.lowerBound.y+f.y*d.m_bounds[1][n.upperBounds[1]].value;g.x=0.5*(k.lowerBound.x+k.upperBound.x);g.y=0.5*(k.lowerBound.y+k.upperBound.y);h.x=0.5*(l.lowerBound.x+l.upperBound.x);h.y=0.5*(l.lowerBound.y+l.upperBound.y);this.m_debugDraw.DrawSegment(g,h,i);e=e.next}}if(b&b2DebugDraw.e_aabbBit){d=this.m_broadPhase;g=d.m_worldAABB.lowerBound;h=d.m_worldAABB.upperBound;f.Set(1/d.m_quantizationFactor.x,
1/d.m_quantizationFactor.y);i.Set(0.9,0.3,0.9);for(c=0;c<b2Settings.b2_maxProxies;++c){l=d.m_proxyPool[c];if(l.IsValid()!=false){k.lowerBound.x=g.x+f.x*d.m_bounds[0][l.lowerBounds[0]].value;k.lowerBound.y=g.y+f.y*d.m_bounds[1][l.lowerBounds[1]].value;k.upperBound.x=g.x+f.x*d.m_bounds[0][l.upperBounds[0]].value;k.upperBound.y=g.y+f.y*d.m_bounds[1][l.upperBounds[1]].value;m[0].Set(k.lowerBound.x,k.lowerBound.y);m[1].Set(k.upperBound.x,k.lowerBound.y);m[2].Set(k.upperBound.x,k.upperBound.y);m[3].Set(k.lowerBound.x,
k.upperBound.y);this.m_debugDraw.DrawPolygon(m,4,i)}}m[0].Set(g.x,g.y);m[1].Set(h.x,g.y);m[2].Set(h.x,h.y);m[3].Set(g.x,h.y);this.m_debugDraw.DrawPolygon(m,4,new b2Color(0.3,0.9,0.9))}if(b&b2DebugDraw.e_obbBit){i.Set(0.5,0.3,0.5);for(d=this.m_bodyList;d;d=d.m_next){j=d.m_xf;for(e=d.GetShapeList();e;e=e.m_next)if(e.m_type==b2Shape.e_polygonShape){f=e.GetOBB();c=f.extents;m[0].Set(-c.x,-c.y);m[1].Set(c.x,-c.y);m[2].Set(c.x,c.y);m[3].Set(-c.x,c.y);for(c=0;c<4;++c){k=f.R;g=m[c];h=f.center.x+(k.col1.x*
g.x+k.col2.x*g.y);m[c].y=f.center.y+(k.col1.y*g.x+k.col2.y*g.y);m[c].x=h;k=j.R;h=j.position.x+(k.col1.x*g.x+k.col2.x*g.y);m[c].y=j.position.y+(k.col1.y*g.x+k.col2.y*g.y);m[c].x=h}this.m_debugDraw.DrawPolygon(m,4,i)}}}if(b&b2DebugDraw.e_centerOfMassBit)for(d=this.m_bodyList;d;d=d.m_next){j=b2World.s_xf;j.R=d.m_xf.R;j.position=d.GetWorldCenter();this.m_debugDraw.DrawXForm(j)}}};
a.RaycastSortKey=function(b){if(this.m_contactFilter&&!this.m_contactFilter.RayCollide(this.m_raycastUserData,b))return-1;var c=b.GetBody().GetXForm(),d=[0];if(b.TestSegment(c,d,this.m_raycastNormal,this.m_raycastSegment,1)==b2Shape.e_missCollide)return-1;return d[0]};
a.RaycastSortKey2=function(b){if(this.m_contactFilter&&!this.m_contactFilter.RayCollide(this.m_raycastUserData,b))return-1;var c=b.GetBody().GetXForm(),d=[0];if(b.TestSegment(c,d,this.m_raycastNormal,this.m_raycastSegment,1)!=b2Shape.e_hitCollide)return-1;return d[0]};var Rectangle = function(x, y, width, height) {
  this.x = x;
  this.y = y;
  
  this.width = width;
  this.height = height;
};

Rectangle.prototype.draw = function(context) {

  context.fillRect(this.x, this.y, this.width, this.height);

  context.addClearRectangle(this);

};CanvasRenderingContext2D.prototype.dashedLine = function (fromX, fromY, toX, toY, dashLength) {
  
  var gt = function(a, b) {
    return Math.abs(a) > Math.abs(b);
  };

  var A = toX - fromX,
      B = toY - fromY;
      
  var C = Math.sqrt(A * A + B * B),
      c = dashLength;

  var a = (c * A) / C,
      b = (c * B) / C;

  var x = a,
      y = b,
      line = true;

  this.moveTo(fromX, fromY);

  while (gt(A, x) || gt(B, y)) {
    
    if (line) {
      
      this.lineTo(fromX + x, fromY + y);
    
    } else {
      
      this.moveTo(fromX + x, fromY + y);
      
    }

    line = !line;

    x += a;
    y += b;
    
  }
  
  if (line) {
    
    this.lineTo(toX, toY);
  
  } else {
    
    this.moveTo(toX, toY);
    
  }
  
};

CanvasRenderingContext2D.prototype.clearRects = [];

CanvasRenderingContext2D.prototype.addClearRectangle = function(rectangle) {
  
  this.clearRects.push(rectangle);
  
};

CanvasRenderingContext2D.prototype.clearRectangles = function() {
  var i;

  for (i = 0; i < this.clearRects.length; i++) {
    
    this.clearRect(
      this.clearRects[i].x - 1, this.clearRects[i].y - 1, 
      this.clearRects[i].width + 2, this.clearRects[i].height + 2
    );
    
  }
};

CanvasRenderingContext2D.prototype.clearShadow = function() {
  
  this.shadowColor = "rgba(0, 0, 0, 0)";
  
};

Array.prototype.shuffle = function() { 
  var i = this.length; 
  
  if (i < 2) {
    return false;
  }
      
  do { 
    var zi = Math.floor(Math.random() * i); 
    var t = this[zi];
     
    this[zi] = this[--i];
    this[i] = t;
  } while (i);
  
  return true;
};

Date.prototype.getMonthName = function() {
  return ["January", "February", "March", "April", "May", "June",
          "July", "August", "September",
          "October", "November", "December"][this.getMonth()];
};

Date.prototype.getFormatHours = function() {
  if (this.getHours() === 12) {
    return 12;
  }

  return this.fullString(this.getHours() % 12);
};

Date.prototype.getFormatMinutes = function() {
  return this.fullString(this.getMinutes());
};

Date.prototype.fullString = function(value) {
  value = value.toString();

  if (value.length === 1) {
    return "0" + value;
  }

  return value;
};

Date.prototype.getDayTime = function() {
  if (this.getHours() > 11) { 
    return "PM";
  }

  return "AM";
};

function getAbsolutePosition(element) {
  var r = { x: element.offsetLeft, y: element.offsetTop };
  if (element.offsetParent) {
    var tmp = getAbsolutePosition(element.offsetParent);
    r.x += tmp.x;
    r.y += tmp.y;
  }
  return r;
}

function getRelativeCoordinates(event, reference) {

  var x, y, e, pos;
  event = event || window.event;

  var el = event.target || event.srcElement;

  if (!window.opera && typeof event.offsetX !== 'undefined') {
    // Use offset coordinates and find common offsetParent
    pos = { x: event.offsetX, y: event.offsetY };

    // Send the coordinates upwards through the offsetParent chain.
    e = el;
    while (e) {
      e.mouseX = pos.x;
      e.mouseY = pos.y;
      pos.x += e.offsetLeft;
      pos.y += e.offsetTop;
      e = e.offsetParent;
    }

    // Look for the coordinates starting from the reference element.
    e = reference;
    var offset = { x: 0, y: 0 };

    while (e) {

      if (typeof e.mouseX !== 'undefined') {
        x = e.mouseX - offset.x;
        y = e.mouseY - offset.y;
        break;
      }

      offset.x += e.offsetLeft;
      offset.y += e.offsetTop;
      e = e.offsetParent;
    }

    // Reset stored coordinates
    e = el;

    while (e) {

      e.mouseX = undefined;
      e.mouseY = undefined;
      e = e.offsetParent;

    }

  } else {

    // Use absolute coordinates
    pos = getAbsolutePosition(reference);
    x = event.pageX  - pos.x;
    y = event.pageY - pos.y;
  }

  // Subtract distance to middle
  return { x: x, y: y };
}

function testShadowOffsetTransform() {
  
  var canvas = document.createElement('canvas');
  canvas.width = canvas.height = 8;

  var context = canvas.getContext('2d');
  
  context.shadowColor = "rgba(255, 255, 255, 1.0)";
  context.shadowOffsetX = 4;
  
  context.translate(1.5, 1.5);
  context.rotate(Math.PI / 2);
  
  context.fillStyle = "#000000";
  context.fillRect(-2, -2, 4, 4);
  
  var imageData = context.getImageData(1, 5, 1, 1);
  
  //document.removeChild(canvas);
  
  return (imageData.data[0] === 255);
};

// requestAnim shim layer by Paul Irish
    window.requestAnimFrame = (function(){
      return  window.requestAnimationFrame       || 
              window.webkitRequestAnimationFrame || 
              window.mozRequestAnimationFrame    || 
              window.oRequestAnimationFrame      || 
              window.msRequestAnimationFrame     || 
              function(/* function */ callback, /* DOMElement */ element){
                window.setTimeout(callback, 25);
              };
    })();var Pattern = {};
Pattern.image = {};

Pattern.onload = null;
Pattern.loaded = 0;
Pattern.total = 0;

Pattern.onLoaded = function() {
  Pattern.loaded++;

  if (Pattern.loaded === Pattern.total) {
    if (Pattern.onload) {
      Pattern.onload();
    }
  }
};

Pattern.loadPattern = function(patterns) {
  var i,
      onImageLoad = function() {
        if (Pattern.context.createPattern) {
          Pattern[this.name] = Pattern.context.createPattern(this, "repeat");
          Pattern.onLoaded();
        }
      };

  Pattern.total = patterns.length;

  for (i = 0; i < patterns.length; i++) {
    var image = new Image();
    image.src = patterns[i].path;
    image.name = patterns[i].name;

    Pattern.image[patterns[i].name] = image;

    image.onload = onImageLoad;
  }
};var Event = Class.create({

  initialize: function(type) {
    this.type = type;
    this.parameter = null;
    this.mouseX = null;
    this.mouseY = null;
  }

});EventEngine = Class.create({
  
  initialize: function() {
    
    // startDrag, stopDrag, click, mouseDown, mouseUp, mouseMove

    this.listeners = [];
    this.state = {type: "unknown"};
    this.latestEvent = null;
    this.clickTimeout = null;

    this.clickTime = 250; // in milliseconds;

    var that = this;

    document.body.onmousedown = function(event) {that.onMouseDown.call(that, event);};
    document.body.onmouseup = function(event) {that.onMouseUp.call(that, event);};
    document.body.onmousemove = function(event) {that.onMouseMove.call(that, event);};

  },

  addListener: function(type, closure, thisArgument) {
    
    this.listeners.push({type: type, closure: closure, thisArgument: thisArgument});

  }, 

  removeListener: function(type, closure) {
    var i;

    for (i = 0; i < this.listeners.length; i++) {
      if (this.listeners[i].type === type && this.listeners[i].closure === closure) {
        this.listeners.splice(i, 1);
      }
    }
  },

  dispatchEvent: function(event) {
    var i;

    this.latestEvent = event;

    for (i = 0; i < this.listeners.length; i++) {
      if (this.listeners[i].type === event.type) {
        this.listeners[i].closure.call(this.listeners[i].thisArgument, event);
      }
    }
  },

  onMouseDown: function(event) {
    var coordinates = getRelativeCoordinates(event, $("editor"));

    var myEvent = new Event("mouseDown");
        myEvent.parameter = event;
        myEvent.mouseX = coordinates.x;
        myEvent.mouseY = coordinates.y;

    this.dispatchEvent(myEvent);

    this.state = {type: "down", x: coordinates.x, y: coordinates.y};

    var myScope = this;
    
    this.clickTimeoutID = setTimeout(
      
      function(coordinates, event) {
        myScope.onClickTimeout(coordinates, event);
      },
       
      this.clickTime, coordinates, event
    );
  }, 

  onMouseUp: function(event) {
    
    if (this.clickTimeoutID) {
      clearTimeout(this.clickTimeoutID);
      this.clickTimeoutID = null;
    }

    var type;

    if (this.state.type === "drag") {
      
      type = "stopDrag";
      
    } else if (this.state.type === "down") {
      
      type = "click";
      
    }

    var coordinates = getRelativeCoordinates(event, $("editor"));

    var myEvent = new Event(type);
        myEvent.parameter = event;
        myEvent.mouseX = coordinates.x;
        myEvent.mouseY = coordinates.y;

    this.state.type = "up";

    this.dispatchEvent(myEvent);
  },

  onMouseMove: function(event) {
    
    var coordinates = getRelativeCoordinates(event, $("editor"));
    
    var myEvent = new Event("mouseMove");
        myEvent.parameter = event;
        myEvent.mouseX = coordinates.x;
        myEvent.mouseY = coordinates.y;

    this.dispatchEvent(myEvent);

    if (this.state.type !== "up") {
      
      myEvent.type = "drag";
      this.dispatchEvent(myEvent);
      
    }

    if (this.state.type === "down") {
      var distance = (function(oldX, oldY, newX, newY) {
        
        var x = newX - oldX;
        var y = newY - oldY;

        return Math.sqrt(x * x + y * y);
      }(this.state.x, this.state.y, coordinates.x, coordinates.y));

      if (distance > 5) {
        
        this.onClickTimeout({x: this.state.x, y: this.state.y});

      }
    }
  },

  onClickTimeout: function(coordinates, event) {

    if (this.state.type !== "down") {
      return;
    }

    this.clickTimeoutID = null;

    this.state.type = "drag";

    var myEvent = new Event("startDrag");
        myEvent.parameter = event;
        myEvent.mouseX = coordinates.x;
        myEvent.mouseY = coordinates.y;

    this.dispatchEvent(myEvent);
  }

});var DisplayObject = Class.create({
  
  initialize: function() {
    this.x = null;
    this.y = null;

    this.width = null;
    this.height = null;

    this.parent = null;
  },

  hitTest: function(x, y) {
    if (x < this.x || y < this.y  || x > this.x + this.width || y > this.y + this.height) {
      return false;
    } else {
      return true;
    }
  }, 

  parentToLocal: function(point) {
    
    return {x: point.x - this.x, y: point.y - this.y};

  }

});var Brick = Class.create(DisplayObject, {
  
  initialize: function($super) {
    $super();

    this.x = 0;
    this.y = 0;
    
    this.rotation = 0;
    this.targetRotation = 0;
    this.rotateID = null;
    
    this.isVisible = true;
    this.isDraggable = true;
    this.isRemoveable = true;
    
    this.isPreview = false;
    this.isInFront = true;
    this.isDynamic = false;
    this.hasShadow = true;

    this.cell = {
      row: 0,
      col: 0
    };
  },
  
  update: function() {
    
  },

  draw: function(context) {
    
    if (this.isVisible) {

      if (this.rotation !== 0) { 
        this.applyRotation(context);
      }

      if (context.drawShadows && this.hasShadow && !this.isPreview) {
        this.applyShadow(context);
      }
      
      if (this.isPreview) {
        
        context.globalAlpha = .3;
        
      }

      this.drawShape(context);
      
      if (this.isPreview) {
        
        this.applyStyle(context);
        
      }

      if (this.rotateID) {
        this.applyClearing(context);
      }

      context.beginPath();

    }
  },

  reset: function() {
    
  },

  drawShape: function(context) {

    context.fillRect(0, 0, Brick.SIZE, Brick.SIZE);
    
    context.clearShadow();

    context.strokeRect(0, 0, Brick.SIZE, Brick.SIZE);

  },
  
  applyStyle: function(context) {
    
    context.fillStyle = Brick.FILL;
    context.strokeStyle = Brick.STROKE;
    
    context.lineJoing = "miter";
    context.lineWidth = 1;
    
  },

  applyShadow: function(context) {

    var shadowOffset = new b2Vec2(Math.cos(Math.PI / 4) * -Brick.SIZE / 4, Math.sin(Math.PI / 4) * Brick.SIZE / 4);
    
    // global
    if (shadowOffsetGetsTransformed) {
      
      shadowOffset = this.rotateVector(shadowOffset, -this.rotation);
      
    }

    context.shadowOffsetX = shadowOffset.x;
    context.shadowOffsetY = shadowOffset.y;

    context.shadowBlur = 5;
    context.shadowColor = "rgba(0, 0, 0, 0.5)";

  },

  applyScale: function(context) {
    
    context.translate(Brick.SIZE / 2, Brick.SIZE / 2);
    context.scale(1.1, 1.1);
    context.translate(- Brick.SIZE / 2, - Brick.SIZE / 2);

  },

  applyRotation: function(context) {

    context.translate(Brick.SIZE / 2, Brick.SIZE / 2);
    context.rotate(this.rotation);
    context.translate(- Brick.SIZE / 2, - Brick.SIZE / 2);

  },
  
  applyClearing: function(context) {
    
    var clearRectangle = new Rectangle(
      this.x - Brick.SIZE * 0.4, this.y - Brick.SIZE * 0.2, 
      Brick.SIZE * 1.6, Brick.SIZE * 1.6
    );
    
    context.addClearRectangle(clearRectangle);
  },

  drawGlobal: function(context) {

    var storeSize = Brick.SIZE;
    Brick.SIZE = Brick.BIG_SIZE;

    context.save();

      context.translate(this.x, this.y);
      this.applyStyle(context);
      this.draw(context);

    context.restore();

    this.applyClearing(context);

    Brick.SIZE = storeSize;
  },

  createBody: function(world) {
    var bodyDefinition = new b2BodyDef();

    bodyDefinition.position.Set(this.cell.col + 0.5, this.cell.row + 0.5);

    this.body = world.CreateBody(bodyDefinition);

    this.createShapes(this.body);

    this.body.SetMassFromShapes();
    
    this.setRotation(this.rotation);
  },
  
  createShapes: function(body) {
    
    var shapeDefinition = new b2PolygonDef();
    
    shapeDefinition.SetAsBox(0.5, 0.5);
    shapeDefinition.restitution = 0;
    shapeDefinition.friction = 0.9;

    body.CreateShape(shapeDefinition);
    
  },
  
  removeBody: function(world) {
    
    var bodyCount = world.m_bodyCount;

    world.DestroyBody(this.body);

    if (bodyCount === world.m_bodyCount) {
      //console.error("Body was not removed");
    }
    
  },
  
  moveToCell: function(cell) {
    
    this.cell = cell;
    
    if (this.body) {
    
      this.body.SetXForm(new b2Vec2(cell.col + 0.5, cell.row + 0.5), this.body.GetAngle());
    
    }
  },

  rotate: function(radian) {
    
    if (this.rotateID) {
      
      clearTimeout(this.rotateID);
      
      this.targetRotation += radian;
    
    } else {
    
      this.storedDynamic = this.isDynamic;
      this.isDynamic = true;
    
      this.parent.renderNew = true;
    
      this.targetRotation = this.rotation + radian;
      
    }
    
    var myScope = this;
    
    this.rotateID = setTimeout(function() {
      myScope.rotateTimeout();
    }, 30);
    
  },
  
  rotateTimeout: function() {
    
    this.rotation += (this.targetRotation - this.rotation) / 3;
    //this.rotation += 0.3;

    if (Math.abs(this.rotation - this.targetRotation) < 0.03) {
    //if (this.targetRotation - this.rotation < 0.03) {

      this.rotateStop();

    } else {

      var myScope = this;

      this.rotateID = setTimeout(function() {
        myScope.rotateTimeout();
      }, 30);
      
    }
    
  }, 
  
  rotateStop: function() {
    
    this.setRotation(this.targetRotation);
    
    this.isDynamic = this.storedDynamic;
    
    this.parent.renderNew = true;
    
    this.rotateID = null;
    
  },
  
  setRotation: function(radian) {
    
    if (this.body) {

      this.body.SetXForm(this.body.GetPosition(), radian);

      this.rotation = this.body.GetAngle();

    } else {

      this.rotation = radian;

    }
    
  },
  
  rotateVector: function(vector, angle) {
    return new b2Vec2(
      vector.x * Math.cos(angle) - vector.y * Math.sin(angle),
      vector.x * Math.sin(angle) + vector.y * Math.cos(angle)
    );
  }

});

Brick.SIZE = 28;
Brick.BIG_SIZE = 32;
Brick.TINY_SIZE = 12;

Brick.FILL = "#1E1E1E";
Brick.STROKE = "#F2E049";

Brick.prototype.type = "Brick";
var Kicker = Class.create(Brick, {

  drawShape: function(context) {

    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(1, 0);
    context.bezierCurveTo(1, Brick.SIZE / 2, Brick.SIZE / 2, Brick.SIZE - 1, Brick.SIZE, Brick.SIZE - 1);
    context.lineTo(Brick.SIZE, Brick.SIZE);
    context.lineTo(0, Brick.SIZE);
    context.lineTo(0, 0);
    context.closePath();
    
    context.fill();
    
    context.clearShadow();

    context.stroke();

  },

  createShapes: function(body) {
    var shapeDefinitions = [],
        numberOfSegments = 6, // must be even
        i;

    for (i = 0; i < numberOfSegments; i++) {
      shapeDefinitions[i] = new b2PolygonDef();
      shapeDefinitions[i].vertexCount = 4;
      shapeDefinitions[i].restitution = 0;
      shapeDefinitions[i].friction = 0.9;  
    }

    var angle = Math.PI / 2 / numberOfSegments;

    var circleVector = {x: -Math.cos(angle), y: Math.sin(angle)},
        lineVector = {x: -1.0, y: Math.tan(angle)};

    shapeDefinitions[0].vertexCount = 3;
    shapeDefinitions[0].vertices[0].Set(-0.5, -0.5);
    shapeDefinitions[0].vertices[1].Set(circleVector.x + 0.5, circleVector.y - 0.5);
    shapeDefinitions[0].vertices[2].Set(lineVector.x + 0.5, lineVector.y - 0.5);

    for (i = 1; i < numberOfSegments - 1; i++) {
      var newCircleVector = {x: -Math.cos((i + 1) * angle), y: Math.sin((i + 1) * angle)},
          newLineVector;

      if (i >= numberOfSegments / 2) {

        var n = numberOfSegments - i - 1;
        newLineVector = {x: -Math.tan(n * angle), y: 1.0};

      } else {

        newLineVector = {x: -1.0, y: Math.tan((i + 1) * angle)};
        
      }
      
      shapeDefinitions[i].vertices[0].Set(circleVector.x + 0.5, circleVector.y - 0.5);
      shapeDefinitions[i].vertices[1].Set(newCircleVector.x + 0.5, newCircleVector.y - 0.5);
      shapeDefinitions[i].vertices[2].Set(newLineVector.x + 0.5, newLineVector.y - 0.5);
      shapeDefinitions[i].vertices[3].Set(lineVector.x + 0.5, lineVector.y - 0.5);

      circleVector = newCircleVector;
      lineVector = newLineVector;
    }

    shapeDefinitions[numberOfSegments - 1].vertexCount = 3;
    shapeDefinitions[numberOfSegments - 1].vertices[0].Set(0.5, 0.5);
    shapeDefinitions[numberOfSegments - 1].vertices[1].Set(lineVector.x + 0.5, lineVector.y - 0.5);
    shapeDefinitions[numberOfSegments - 1].vertices[2].Set(circleVector.x + 0.5, circleVector.y - 0.5);
    
    for (i = 0; i < numberOfSegments; i++) {
      body.CreateShape(shapeDefinitions[i]);
    }

  }

});

Kicker.prototype.type = "Kicker";var Ramp = Class.create(Brick, {

  drawShape: function(context) {

    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(Brick.SIZE, Brick.SIZE);
    context.lineTo(0, Brick.SIZE);
    context.lineTo(0, 0);
    context.closePath();
    
    context.fill();

    context.clearShadow();

    context.stroke();

  },

  createShapes: function(body) {
    var shapeDefinition = new b2PolygonDef();

    shapeDefinition.vertexCount = 3;
    shapeDefinition.restitution = 0;
    shapeDefinition.friction = 0.9;  

    shapeDefinition.vertices[0].Set(-0.5, -0.5);
    shapeDefinition.vertices[1].Set(0.5, 0.5);
    shapeDefinition.vertices[2].Set(-0.5, 0.5);

    body.CreateShape(shapeDefinition);
    
  }
});

Ramp.prototype.type = "Ramp";var Curve = new Class.create(Brick, {

  drawShape: function(context) {

    context.beginPath();
    context.moveTo(0, 0);
    context.bezierCurveTo(Brick.SIZE / 2, 0,  Brick.SIZE, Brick.SIZE / 2, Brick.SIZE, Brick.SIZE);
    context.lineTo(0, Brick.SIZE);
    context.lineTo(0, 0);
    context.closePath();
     
    context.fill();
      
    context.clearShadow();

    context.stroke();

  },

  createShapes: function(body) {
    var shapeDefinition = new b2PolygonDef(),
      angle = Math.PI / 2 / 6,
      i, j;

    shapeDefinition.vertexCount = 8;
    shapeDefinition.restitution = 0;
    shapeDefinition.friction = 0.9;

    shapeDefinition.vertices[0].Set(-0.5, 0.5);

    for (i = 6, j = 0; i >= 0; i--, j++) {
      shapeDefinition.vertices[j].Set(Math.cos(angle * i) - 0.5, -Math.sin(angle * i) + 0.5);
    }

    shapeDefinition.vertices[7].Set(-0.5, 0.5);

    body.CreateShape(shapeDefinition);
    
  }

});

Curve.prototype.type = "Curve";var Line = Class.create(Brick, {

  drawShape: function(context) {

    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(Brick.SIZE, 0);
    context.lineTo(Brick.SIZE, Brick.SIZE / 7);
    context.lineTo(0, Brick.SIZE / 7);
    context.lineTo(0, 0);
    context.closePath();
  
    context.fill();
      
    context.clearShadow();

    context.stroke();

  },

  createShapes: function(body) {
    var shapeDefinition = new b2PolygonDef(),
        horizAlign = 0.01,
        vertAlign = 0.001;

    shapeDefinition.vertexCount = 8;
    shapeDefinition.restitution = 0;
    shapeDefinition.friction = 0.9;

    shapeDefinition.vertices[0].Set(-0.5, -0.5 + vertAlign);
    shapeDefinition.vertices[1].Set(-0.5 + horizAlign, -0.5);
    
    shapeDefinition.vertices[2].Set(0.5 - horizAlign, -0.5);
    shapeDefinition.vertices[3].Set(0.5, -0.5 + vertAlign);
    
    shapeDefinition.vertices[4].Set(0.5, -0.5 + 0.125 - vertAlign);
    shapeDefinition.vertices[5].Set(0.5 - horizAlign, -0.5 + 0.125);
    
    shapeDefinition.vertices[6].Set(-0.5 + horizAlign, -0.5 + 0.125);
    shapeDefinition.vertices[7].Set(-0.5, -0.5 + 0.125 - vertAlign);

    body.CreateShape(shapeDefinition);

  }

});

Line.prototype.type = "Line";var Exit = Class.create(Brick, {
  
  initialize: function($super) {
    $super();

    this.isDraggable = false;
    this.isRemoveable = false;
    
    this.isInFront = false;
    this.hasShadow = false;
  },

  drawShape: function(context) {
    var checkerBoardSize = 5,
        checkerSize = Brick.SIZE / checkerBoardSize,
        counter = 0,
        i, j;

    for (i = 0; i < checkerBoardSize; i++) {
      
      for (j = 0; j < checkerBoardSize; j++) {
        
        if (counter % 2 === 0) {
          context.fillRect(checkerSize * j, checkerSize * i, checkerSize, checkerSize);
        }
        
        counter++;
      }
      
    }
  },

  createShapes: function(body) {
    var shapeDefinition = new b2PolygonDef();

    shapeDefinition.vertexCount = 4;
    shapeDefinition.restitution = 0;
    shapeDefinition.friction = 0.9;  

    shapeDefinition.vertices[0].Set(0.3, 0.3);
    shapeDefinition.vertices[1].Set(-0.3, 0.3);
    shapeDefinition.vertices[2].Set(-0.3, -0.3);
    shapeDefinition.vertices[3].Set(0.3, -0.3);

    shapeDefinition.isSensor = true;

    body.CreateShape(shapeDefinition);

    var myScope = this;

    body.onCollision = function(contact) {
      myScope.onCollision(contact);
    };

  },

  onCollision: function(contact) {
    if (contact.shape1.GetBody().ballInstance || contact.shape2.GetBody().ballInstance) {
      
      this.parent.parent.onBallExit();
      
      if (this.parent.trackLength && this.parent.bricks.length > 2) {
        
        this.parent.validTrack = true;
        $('publishButton').addClassName('activePublish');
        $('publishButtonWarning').style.visibility = "hidden";
        
      }
      
    }
  },

  rotate: function() {
    return;
  }

});

Exit.prototype.type = "Exit";var Spring = new Class.create(Brick, {

  drawShape: function(context) {
    
    context.strokeStyle = context.fillStyle;
    context.lineWidth = 2;

    context.beginPath();
    
    context.moveTo(Brick.SIZE / 5, Brick.SIZE * 0.22);
    context.lineTo(Brick.SIZE * 4 / 5, Brick.SIZE * 0.07);
    
    context.moveTo(Brick.SIZE / 5, Brick.SIZE * 0.37);
    context.lineTo(Brick.SIZE * 4 / 5, Brick.SIZE * 0.22);
    
    context.moveTo(Brick.SIZE / 5, Brick.SIZE * 0.52);
    context.lineTo(Brick.SIZE * 4 / 5, Brick.SIZE * 0.37);
        
    context.stroke();
    
    
    context.fillRect(0, 0, Brick.SIZE, Brick.SIZE / 8);
    context.fillRect(0, Brick.SIZE / 2, Brick.SIZE, Brick.SIZE / 2);
    
    context.clearShadow();
    
    this.applyStyle(context);
    
    context.strokeRect(0, 0, Brick.SIZE, Brick.SIZE);
    
  },

  createBody: function($super, world) {
    
    $super(world);

    var myScope = this;

    this.body.onCollision = function(contact) {
      myScope.onCollision(contact);
    };
  },

  onCollision: function(contact) {
    var ball;
    
    if (contact.shape1.GetBody().ballInstance) {
      
      ball = contact.shape1.GetBody().ballInstance;
      
    } else if (contact.shape2.GetBody().ballInstance) {
      
      ball = contact.shape2.GetBody().ballInstance;
      
    } else {
      
      return;
      
    }
    
    var bodyPoint = this.body.GetPosition();
    var relativeContactPoint = new b2Vec2(
      contact.position.x - bodyPoint.x, 
      contact.position.y - bodyPoint.y
    );
    var contactPoint = this.rotateVector(relativeContactPoint, -this.body.GetAngle());
    
    if (contactPoint.x > - 0.5 && contactPoint.x < 0.5 && contactPoint.y > - 0.6 && contactPoint.y < - 0.4) {
    
      var springVector = new b2Vec2(0, -6);
    
      ball.impulseVector.Add(this.rotateVector(springVector, this.body.GetAngle()));
    }

  }

});

Spring.prototype.type = "Spring";var Boost = new Class.create(Brick, {
  
  initialize: function($super) {
    $super();

    this.isInFront = false;
    this.hasShadow = false;
  },

  drawShape: function(context) {
    
    // context.beginPath();
    // context.moveTo(Brick.SIZE / 7, Brick.SIZE / 7);
    // context.lineTo(Brick.SIZE * 2 / 7, Brick.SIZE / 7);
    // context.lineTo(Brick.SIZE * 4 / 7, Brick.SIZE / 2);
    // context.lineTo(Brick.SIZE * 2 / 7, Brick.SIZE * 6 / 7);
    // context.lineTo(Brick.SIZE / 7, Brick.SIZE * 6 / 7);
    // context.lineTo(Brick.SIZE * 3 / 7, Brick.SIZE / 2);
    // context.closePath();
    // 
    // context.fill();
    // 
    // context.beginPath();
    // context.moveTo(Brick.SIZE * 3 / 7, Brick.SIZE / 7);
    // context.lineTo(Brick.SIZE * 4 / 7, Brick.SIZE / 7);
    // context.lineTo(Brick.SIZE * 6 / 7, Brick.SIZE / 2);
    // context.lineTo(Brick.SIZE * 4 / 7, Brick.SIZE * 6 / 7);
    // context.lineTo(Brick.SIZE * 3 / 7, Brick.SIZE * 6 / 7);
    // context.lineTo(Brick.SIZE * 5 / 7, Brick.SIZE / 2);
    // context.closePath();
    // 
    // context.fill();
    
    context.beginPath();
    context.moveTo(Brick.SIZE / 7, Brick.SIZE * 3 / 14);
    context.lineTo(Brick.SIZE * 2 / 7, Brick.SIZE * 3 / 14);
    context.lineTo(Brick.SIZE * 4 / 7, Brick.SIZE / 2);
    context.lineTo(Brick.SIZE * 2 / 7, Brick.SIZE * 11 / 14);
    context.lineTo(Brick.SIZE / 7, Brick.SIZE * 11 / 14);
    context.lineTo(Brick.SIZE * 3 / 7, Brick.SIZE / 2);
    context.closePath();
    
    context.fill();
    
    context.beginPath();
    context.moveTo(Brick.SIZE * 3 / 7, Brick.SIZE * 3 / 14);
    context.lineTo(Brick.SIZE * 4 / 7, Brick.SIZE * 3 / 14);
    context.lineTo(Brick.SIZE * 6 / 7, Brick.SIZE / 2);
    context.lineTo(Brick.SIZE * 4 / 7, Brick.SIZE * 11 / 14);
    context.lineTo(Brick.SIZE * 3 / 7, Brick.SIZE * 11 / 14);
    context.lineTo(Brick.SIZE * 5 / 7, Brick.SIZE / 2);
    context.closePath();
    
    context.fill();
    
    // context.strokeStyle = context.fillStyle;
    // context.lineWidth = 2;
    // 
    // context.beginPath();
    // 
    // context.moveTo(Brick.SIZE / 5, Brick.SIZE / 5);
    // context.lineTo(Brick.SIZE * 2 / 5, Brick.SIZE / 2);
    // context.lineTo(Brick.SIZE / 5, Brick.SIZE * 4 / 5);
    // 
    // context.moveTo(Brick.SIZE * 2 / 5, Brick.SIZE / 5);
    // context.lineTo(Brick.SIZE * 3 / 5, Brick.SIZE / 2);
    // context.lineTo(Brick.SIZE * 2 / 5, Brick.SIZE * 4 / 5);
    // 
    // context.moveTo(Brick.SIZE * 3 / 5, Brick.SIZE / 5);
    // context.lineTo(Brick.SIZE * 4 / 5, Brick.SIZE / 2);
    // context.lineTo(Brick.SIZE * 3 / 5, Brick.SIZE * 4 / 5);
    // 
    // context.stroke();
  },

  createShapes: function(body) {
    var shapeDefinition = new b2PolygonDef();

    shapeDefinition.vertexCount = 4;
    shapeDefinition.restitution = 0;
    shapeDefinition.friction = 0.9;

    shapeDefinition.vertices[0].Set(-0.4, -0.4);
    shapeDefinition.vertices[1].Set(0.4, -0.4);
    shapeDefinition.vertices[2].Set(0.4, 0.4);
    shapeDefinition.vertices[3].Set(-0.4, 0.4);

    shapeDefinition.isSensor = true;

    // collides only with ball
    shapeDefinition.filter.maskBits = 0x0002;

    body.CreateShape(shapeDefinition);

    var myScope = this;

    body.whileCollision = function(contact) {
      myScope.whileCollision(contact);
    };
  },

  whileCollision: function(contact) {
    
    var ball;

    if (contact.shape1.GetBody().ballInstance) {
      
      ball = contact.shape1.GetBody().ballInstance;
      
    } else {
      
      ball = contact.shape2.GetBody().ballInstance;
      
    }

    var boostVector = new b2Vec2(.3, 0);
    
    ball.impulseVector.Add(this.rotateVector(boostVector, this.body.GetAngle()));

  }

});

Boost.prototype.type = "Boost";var Ball = Class.create(Brick, {
  
  initialize: function($super) {
    $super();
    
    this.impulseVector = new b2Vec2();
    this.positionVector = new b2Vec2();
    this.velocityVector = new b2Vec2();
    
    this.rollLength = 0;
    this.lastPosition = new b2Vec2();

    this.isDraggable = false;
    this.isRemoveable = false;
    
    this.isDynamic = true;
    this.hasShadow = false;
  },
  
  update: function() {
    
    if (this.impulseVector.Length() > 0) {
      
      this.body.ApplyImpulse(this.impulseVector, this.body.GetPosition());
      this.impulseVector.Set(0, 0);
      
    }
    
    if (this.positionVector.Length() > 0) {
      
      this.body.SetXForm(this.positionVector, this.body.GetAngle());
      this.body.SetLinearVelocity(this.velocityVector);
      
      this.lastPosition.Set(this.positionVector.x, this.positionVector.y);
      this.positionVector.Set(0, 0);
      
    }
    
    var difference = this.minus(this.lastPosition, this.body.GetPosition());
    this.rollLength += difference.Length();
    
    this.lastPosition.Set(this.body.GetPosition().x, this.body.GetPosition().y);
    
    if (this.rollLength > 9999) {
      this.rollLength = 9999;
    }
    
    $('lengthDisplay').update(this.getFormatString(this.rollLength));
    this.parent.trackLength = this.rollLength / 10;
    
  },
  
  minus: function(a, b) {
    return new b2Vec2(
      a.x - b.x,
      a.y - b.y
    );
  },
  
  getFormatString: function(number) {
    
    number = parseInt(number, 10).toString();
    
    while (number.length < 4) {
      number = "0" + number;
    }
    
    return number.toString();
  },
  
  reset: function() {
    this.rollLength = 0;
    
    this.lastPosition.Set(this.cell.col + 0.5, this.cell.row + 0.5);
    
    this.body.SetXForm(this.lastPosition, 0);
    
    this.body.SetLinearVelocity({x: 0, y: 0});
    this.body.SetAngularVelocity(0);
    
    this.impulseVector.Set(0, 0);
  },

  drawShape: function(context) {
    
    var position;
    
    if (this.body) {
    
      position = this.body.GetPosition();
      
      var x = this.x + (position.x - this.cell.col - Ball.radius) * Brick.SIZE,
          y = this.y + (position.y - this.cell.row - Ball.radius) * Brick.SIZE;

      context.addClearRectangle(new Rectangle(x, y, Ball.radius * 2 * Brick.SIZE, Ball.radius * 2 * Brick.SIZE));
      
    } else {
      
      position = { 
        x: this.cell.col + 0.5, 
        y: this.cell.row + 0.5
      };
      
    }

    context.save();

      context.translate((position.x - this.cell.col) * Brick.SIZE, (position.y - this.cell.row) * Brick.SIZE);
      
      if (this.body) {
        context.rotate(this.body.GetAngle());
      }
      
      context.fillStyle = "#800000";
      
      context.beginPath();
      context.arc(0, 0, Ball.radius * Brick.SIZE, 0, Math.PI * 2, true);
      context.lineTo(Ball.radius * Brick.SIZE, 0);
      
      context.fill();

    context.restore();

  },

  createShapes: function(body) {
    var shapeDefinition = new b2CircleDef();

    shapeDefinition.radius = Ball.radius;
    shapeDefinition.restitution = 0;
    shapeDefinition.density = 2;
    shapeDefinition.friction = 0.9;

    shapeDefinition.filter.categoryBits = 0x0002;

    body.CreateShape(shapeDefinition);
    body.SetMassFromShapes();
    
    body.ballInstance = this;

  },
  
  rotate: function() {
    return;
  }
  
});

Ball.prototype.type = "Ball";

Ball.radius = 0.25;var Breaker = new Class.create(Brick, {

  initialize: function($super) {
    $super();
    
    this.bodies = null;
    this.isBroken = false;
    
    this.timeoutID = 0;
    this.isDynamic = false;
    this.hasShadow = true;
    
    this.generateShapes();
  },

  reset: function() {
    
    this.isDynamic = false;
    this.isBroken = false;
    
    if (this.timeoutID) {
      
      clearTimeout(this.timeoutID);
      this.timeoutID = 0;
    
    }
    
    if (this.bodies) {
      
      this.removeBodies(this.world);
      
    }
    
    if (!this.body) {
      
      this.createBody(this.world);
      
    }
  },
  
  createBody: function($super, world) {
    
    this.world = world;
    
    $super(world);
    
    var myScope = this;
    
    this.body.onCollision = function(contact) {
      myScope.onCollision(contact);
    };
    
    this.body.afterCollision = function(contact) {
      myScope.afterCollision(contact);
    }
    
  },
  
  createBodies: function(world) {
    
    this.bodies = [];
    
    var i;

    for (i = 0; i < this.shapes.length; i++) {
      
      var bodyDefinition = new b2BodyDef();

      bodyDefinition.position.Set(this.cell.col + 0.5, this.cell.row + 0.5);

      var body = world.CreateBody(bodyDefinition);

      this.createShape(body, i);

      body.SetMassFromShapes();

      this.bodies.push(body);

    }
    
  },
  
  removeBody: function($super, world) {
    
    $super(world);
    
    if (this.bodies) {
      
      this.removeBodies(world);
      
    }
    
    this.body = null;
  },

  removeBodies: function(world) {

    var bodyCount = world.m_bodyCount,
        i;

    for (i = 0; i < this.bodies.length; i++) {
      world.DestroyBody(this.bodies[i]);
    }

    if (bodyCount === world.m_bodyCount) {
      console.error("Bodies were not removed");
    }
    
    this.bodies = null;

  },

  drawShape: function(context) {
    
    if (this.isBroken) {
      return;
    }
    
    var i, j, x, y, position;
    
    context.save();
  
    if (this.bodies) {
      context.clearShadow();
    }
    
    context.translate(-this.cell.col * Brick.SIZE, -this.cell.row * Brick.SIZE);

    for (i = 0; i < this.shapes.length; i++) {
  
      context.save();
        
        if (this.bodies) { 
          
          position = this.bodies[i].GetPosition();
          
        } else {
          
          position = {x: this.cell.col + 0.5, y: this.cell.row + 0.5};
          
        }
    
        context.translate(position.x * Brick.SIZE, position.y * Brick.SIZE);
        
        if (this.bodies) {
          context.rotate(this.bodies[i].GetAngle());
        }
  
        context.beginPath();

        context.moveTo(this.shapes[i][0].x * Brick.SIZE, this.shapes[i][0].y * Brick.SIZE);
      
        for (j = 1; j < this.shapes[i].length; j++) {

            context.lineTo(this.shapes[i][j].x * Brick.SIZE, this.shapes[i][j].y * Brick.SIZE);

        }
      
        context.closePath();
        
        context.fill();
        context.stroke();
  
      context.restore();
    
      if (this.bodies) {

        x = this.x + (position.x - this.cell.col - 0.7) * Brick.SIZE;
        y = this.y + (position.y - this.cell.row - 0.7) * Brick.SIZE;

        context.addClearRectangle(new Rectangle(x, y, Brick.SIZE * 1.4, Brick.SIZE * 1.4));

      }
  
    }
    
    context.restore();
    
  },
  
  createShape: function(body, index) {
    
    var shapeDefinition = new b2PolygonDef(),
        i;

    shapeDefinition.vertexCount = this.shapes[index].length;
    shapeDefinition.restitution = 0;
    shapeDefinition.friction = 0.9;

    for (i = 0; i < this.shapes[index].length; i++) {
    
      shapeDefinition.vertices[i] = this.shapes[index][i];
    
    }

    shapeDefinition.density = 2;

    // collides only with stage not ball
    shapeDefinition.filter.maskBits = 0x0001;

    body.CreateShape(shapeDefinition);
  },
  
  onCollision: function(contact) {
    
    if (this.timeoutID && (contact.shape1.GetBody().ballInstance || contact.shape2.GetBody().ballInstance)) {
      
      clearTimeout(this.timeoutID);
      this.timeoutID = 0;
    
    }
  },

  afterCollision: function(contact) {
    if (this.isBroken) {
      return;
    }
    
    if (contact.shape1.GetBody().ballInstance || contact.shape2.GetBody().ballInstance) {

      if (this.timeoutID) {

        clearTimeout(this.timeoutID);
        this.timeoutID = 0;

      }

      var myScope = this;

      this.timeoutID = setTimeout(function() {
        myScope.onTimeout();
      }, 200);
    }
  },
  
  onTimeout: function() {
    
    this.isDynamic = true;
    this.parent.renderNew = true;
    
    this.removeBody(this.world);
    this.createBodies(this.world);
    
    this.applyImpulse();
    
    var myScope = this;
    
    this.timeoutID = setTimeout(function() {
      myScope.removeBodies(myScope.world);
      myScope.isBroken = true;
    }, 500);
    
  },
  
  applyImpulse: function() {
    
    var i;
    
    var impulseVector = new b2Vec2(0, -Math.random());
    impulseVector = this.rotateVector(impulseVector, -Math.PI / 3);
    
    for (i = 0; i < this.bodies.length; i++) {
      
      this.bodies[i].ApplyImpulse(
        impulseVector, 
        this.bodies[i].GetPosition()
      );
      
      impulseVector = this.rotateVector(impulseVector, Math.PI / 3);
    }
  },
  
  generateShapes: function() {

    this.shapes = [];

    var middlePoint = new b2Vec2((Math.random() / 2) - 0.25, (Math.random() / 2) - 0.25),
        outlinePoints = [
          new b2Vec2(-0.5, (Math.random() / 2) - 0.25),

          new b2Vec2(-0.5, -0.5),

          new b2Vec2(-Math.random() / 2, -0.501),
          new b2Vec2(Math.random() / 2, -0.501),

          new b2Vec2(0.5, -0.5),

          new b2Vec2(0.501, (Math.random() / 2) - 0.25),

          new b2Vec2(0.5, 0.5),

          new b2Vec2(Math.random() / 2, 0.501),
          new b2Vec2(-Math.random() / 2, 0.501),

          new b2Vec2(-0.501, 0.5)
        ],
        vertexNumbers = [3, 2, 3, 3, 2, 3],
        counter = 0,
        i, j;
        
    vertexNumbers.shuffle();

    for (i = 0; i < 6; i++) {

      var shape = [];

      shape.push(middlePoint);

      for (j = 0; j < vertexNumbers[i]; j++) {

        shape.push(outlinePoints[counter % 10]);

        counter++;

      }

      counter--;

      this.shapes.push(shape);
    }
  },
  
  rotate: function() {
    return;
  }

});

Breaker.prototype.type = "Breaker";var Beamer = new Class.create(Brick, {
  
  initialize: function($super) {
    $super();
    
    this.partner = null;
    this.hasBeamed = false;
  },
  
  reset: function() {
    
    this.hasBeamed = false;
    
  },

  drawShape: function(context) {

    context.beginPath();

    context.moveTo(0, Brick.SIZE / 2);
    context.lineTo(Brick.SIZE / 5, Brick.SIZE / 2);
    
    context.bezierCurveTo(
      Brick.SIZE / 5, Brick.SIZE * 9 / 10, 
      Brick.SIZE * 4 / 5, Brick.SIZE * 9 / 10, 
      Brick.SIZE * 4 / 5, Brick.SIZE / 2
    );
    
    context.lineTo(Brick.SIZE, Brick.SIZE / 2);
    context.lineTo(Brick.SIZE, Brick.SIZE);
    context.lineTo(0, Brick.SIZE);
    
    context.closePath();
    
    context.fill();
    
    context.clearShadow();
    
    context.stroke();
  },

  createShapes: function(body) {
    var rect1Definition = new b2PolygonDef();

    rect1Definition.vertexCount = 3;
    rect1Definition.restitution = 0;
    rect1Definition.friction = 0.9;

    rect1Definition.vertices[0].Set(-0.5, 0);
    rect1Definition.vertices[1].Set(0.2, 0.5);
    rect1Definition.vertices[2].Set(-0.5, 0.5);
    
    body.CreateShape(rect1Definition);
    
    var rect2Definition = new b2PolygonDef();

    rect2Definition.vertexCount = 3;
    rect2Definition.restitution = 0;
    rect2Definition.friction = 0.9;

    rect2Definition.vertices[0].Set(0.5, 0);
    rect2Definition.vertices[1].Set(0.5, 0.5);
    rect2Definition.vertices[2].Set(-0.2, 0.5);
    
    body.CreateShape(rect2Definition);
    
    var sensorDefinition = new b2PolygonDef();

    sensorDefinition.vertexCount = 3;
    sensorDefinition.restitution = 0;
    sensorDefinition.friction = 0.9;

    sensorDefinition.vertices[0].Set(0, 0);
    sensorDefinition.vertices[1].Set(0.2, 0.2);
    sensorDefinition.vertices[2].Set(-0.2, 0.2);
    
    sensorDefinition.isSensor = true;
    
    // collides only with ball
    sensorDefinition.filter.maskBits = 0x0002;
    
    body.CreateShape(sensorDefinition);

    var myScope = this;

    body.onCollision = function(contact) {
      myScope.onCollision(contact);
    };
    
    body.afterCollision = function(contact) {
      myScope.afterCollision(contact);
    };
    
    this.divorce();
  },
  
  removeBody: function($super, world) {
    $super(world);
    
    if (this.partner) {
      
      this.partner.divorce();
      this.partner = null;
      
    } else if (this.parent.singles[this.pairType] === this) {
      
      this.parent.singles[this.pairType] = null;
      
    }
    
  },
  
  divorce: function() {
    
    this.partner = null;
    this.parent.findPartner(this);
    
  },

  onCollision: function(contact) {
    
    var ball;

    if (contact.shape1.m_isSensor) {
      
      ball = contact.shape2.GetBody().ballInstance;
      
    } else if (contact.shape2.m_isSensor) {
      
      ball = contact.shape1.GetBody().ballInstance;
      
    } else {
      
      return;
      
    }
    
    if (this.partner && !this.hasBeamed) {
      
      var positionOffset = this.rotateVector(new b2Vec2(0, -0.1), this.partner.rotation);
      
      ball.positionVector.Set(this.partner.cell.col + 0.5 + positionOffset.x, this.partner.cell.row + 0.5 + positionOffset.y);
      
      positionOffset.Multiply(10);
      positionOffset.Multiply(ball.body.GetLinearVelocity().Length());
      ball.velocityVector = positionOffset;
      
      //ball.velocityVector = this.rotateVector(ball.body.GetLinearVelocity(), this.partner.rotation - this.rotation + Math.PI);
      
      this.hasBeamed = this.partner.hasBeamed = true;
    }
  },
  
  afterCollision: function(contact) {
    
    if (this.hasBeamed && this.partner &&
      (contact.shape1.GetBody().ballInstance || contact.shape2.GetBody().ballInstance)) {
      
      this.hasBeamed = this.partner.hasBeamed = false;
    }
  }

});

Beamer.prototype.type = "Beamer";
Beamer.prototype.pairType = "Beamer";var OneWay = Class.create(Line, {
  
  initialize: function($super) {
    
    $super();
    
    this.isActive = false;
    
  },
  
  reset: function() {
    
    this.isActive = false;
    
  },

  drawShape: function($super, context) {
    
    $super(context);
    
    context.beginPath();
    context.moveTo(Brick.SIZE / 2, Brick.SIZE * 7 / 20);
    context.lineTo(Brick.SIZE * 7 / 10, Brick.SIZE * 13 / 20);
    context.lineTo(Brick.SIZE * 3 / 10, Brick.SIZE * 13 / 20);
    context.closePath();
    
    context.fill();

  },

  createShapes: function($super, body) {
    
    $super(body);
    
    var shapeDefinition = new b2PolygonDef();

    shapeDefinition.vertexCount = 4;
    shapeDefinition.restitution = 0;
    shapeDefinition.friction = 0.9;

    shapeDefinition.vertices[0].Set(-1.5, -0.45);
    shapeDefinition.vertices[1].Set(1.5, -0.45);
    shapeDefinition.vertices[2].Set(1.5, 0);
    shapeDefinition.vertices[3].Set(-1.5, 0);

    shapeDefinition.isSensor = true;

    // collides only with ball
    shapeDefinition.filter.maskBits = 0x0002;

    body.CreateShape(shapeDefinition);
    
    var myScope = this;
    
    body.beforeCollision = function(shape1, shape2) {
      return myScope.beforeCollision(shape1, shape2);
    };

    body.onCollision = function(contact) {
      myScope.onCollision(contact);
    };

    body.afterCollision = function(contact) {
      myScope.afterCollision(contact);
    };
  },

  removeBody: function($super, world) {
    $super(world);

  },
  
  beforeCollision: function(shape1, shape2) {
    
    if (shape1.GetBody().ballInstance && this.isActive) {
        
      return false;
      
    } else if (shape2.GetBody().ballInstance && this.isActive) {
        
      return false;
      
    }
    
    return true;
    
  },

  onCollision: function(contact) {

    if (contact.shape1.GetBody().ballInstance && contact.shape2.m_isSensor) {

      this.isActive = true;
      
    } else if (contact.shape2.GetBody().ballInstance && contact.shape1.m_isSensor) {
        
      this.isActive = true;
      
    }

  },

  afterCollision: function(contact) {
    
    if (contact.shape1.GetBody().ballInstance && contact.shape2.m_isSensor) { 
        
      this.isActive = false;
      
    } else if (contact.shape2.GetBody().ballInstance && contact.shape1.m_isSensor) {
        
      this.isActive = false;

    }

  }

});

OneWay.prototype.type = "OneWay";var Graviton = new Class.create(Brick, {

  initialize: function($super) {
    $super();
    
    this.isActive = false;
    this.timeoutID = 0;
    
    this.isDynamic = false;
    this.hasShadow = true;
  },

  reset: function() {
    
    this.isActive = false;
    
    if (this.timeoutID) {
    
      clearTimeout(this.timeoutID);
      this.timeoutID = 0;
      
    }
  },
  
  createBody: function($super, world) {
    
    $super(world);
    
    var myScope = this;
    
    this.body.onCollision = function(contact) {
      myScope.onCollision(contact);
    };
    
  },

  drawShape: function($super, context) {
    
    $super(context);

    context.beginPath();

    context.moveTo(Brick.SIZE / 2, Brick.SIZE / 7);
    context.lineTo(Brick.SIZE * 6 / 7, Brick.SIZE / 2);
    context.lineTo(Brick.SIZE * 5 / 7, Brick.SIZE / 2);
    context.lineTo(Brick.SIZE * 5 / 7, Brick.SIZE * 6 / 7);
    context.lineTo(Brick.SIZE * 2 / 7, Brick.SIZE * 6 / 7);
    context.lineTo(Brick.SIZE * 2 / 7, Brick.SIZE / 2);
    context.lineTo(Brick.SIZE / 7, Brick.SIZE / 2);
    
    context.closePath();

    if (this.isActive) {
      
      context.save();
      
      context.fillStyle = context.strokeStyle;
      context.fill();
      
      context.restore();

    } else {

      context.stroke();

    }

  },
  
  onCollision: function(contact) {
    
    if (contact.shape1.GetBody().ballInstance || contact.shape2.GetBody().ballInstance) {
      
      this.parent.setActiveGraviton(this);
      this.isActive = true;
      this.parent.renderNew = true;
      
      var myScope = this;
      
      this.timeoutID = setTimeout(function() {

        var gravity = new b2Vec2(0, -9.81),
            world = myScope.body.GetWorld();

        world.SetGravity(myScope.rotateVector(gravity, myScope.body.GetAngle()));

        myScope.timeoutID = 0;
        
      }, 50);
    }
  }

});

Graviton.prototype.type = "Graviton";Grid = Class.create(DisplayObject, {

  initialize: function($super) {
    $super();

    this.rows = 0;
    this.cols = 0;

    this.bricks = [];
    
    this.renderNew = false;
    
    this.renderStatics = false;
    this.renderDynamics = false;
  },

  draw: function(context) {
    
    this.drawStatics(context);
    this.drawDynamics(context);

  },
  
  drawStatics: function(context) {

    this.renderNew = false;

    this.setClipping(context);

      context.translate(this.x, this.y);

      this.drawStaticElements(context);

      this.drawFrame(context);

    this.releaseClipping(context);
    
  },
  
  drawDynamics: function(context) {
    this.setClipping(context);

      context.translate(this.x, this.y);

      this.renderDynamics = true;

      context.drawShadows = true;
      this.drawElements(context, true);

      this.renderDynamics = false;

    this.releaseClipping(context);
  },

  setClipping: function(context) {

    context.save();

    context.translate(0.5, 0.5);

      context.beginPath();
      context.moveTo(this.x - 2, this.y - 2);
      context.lineTo(this.x + this.width, this.y - 2);
      context.lineTo(this.x + this.width, this.y + this.height);
      context.lineTo(this.x - 2, this.y + this.height);
      context.closePath();

    context.translate(-0.5, -0.5);

    context.clip();
    
  },

  releaseClipping: function(context) {
    context.restore();
  },

  drawFrame: function(context) {
    
    context.save();

      context.translate(-0.5, -0.5);

      context.strokeStyle = "#2D2D2D";
      context.lineWidth = 2;

      context.strokeRect(0, 0, this.width, this.height);

    context.restore();

  },

  drawGrid: function (context) {

    context.strokeStyle = "#000000";
    context.lineWidth = 0.5;

    var i;
    
    for (i = 1; i < this.rows; i++) {
      
      context.beginPath();
      context.dashedLine(0, i * Brick.SIZE, this.cols * Brick.SIZE, i * Brick.SIZE, 3);
      context.closePath();
      
      context.stroke();

    }

    for (i = 1; i < this.cols; i++) {
      
      context.beginPath();
      context.dashedLine(i * Brick.SIZE, 0,  i * Brick.SIZE, this.rows * Brick.SIZE, 3);
      context.closePath();
      
      context.stroke();

    }

    context.beginPath();

  },

  drawFieldShadow: function(context) {

    context.save();

      context.beginPath();
      context.moveTo(- 10, 0);
      context.lineTo(this.width, 0);
      context.lineTo(this.width, this.height);
      context.lineTo(this.width + 10, this.height);
      context.lineTo(this.width + 10, - 10);
      context.lineTo(- 10, - 10);
      context.closePath();

      context.shadowOffsetX = -6;
      context.shadowOffsetY = 6;
      context.shadowBlur = 5;
      context.shadowColor = "rgba(0, 0, 0, 0.4)";

      context.fill();
    
    context.restore();

  },
  
  drawStaticElements: function(context) {
    
    // context.fillStyle = Pattern.fieldBackground;
    // context.fillRect(0, 0, this.width, this.height);
    
    this.drawGrid(context);
    this.drawFieldShadow(context);

    this.renderStatics = true;

    context.drawShadows = true;
    this.drawElements(context);

    context.drawShadows = false;
    this.drawElements(context);

    this.renderStatics = false;
    
  },

  drawElements: function(context) {

    if (this.bricks.length === 0) {
      return;
    }
    
    this.bricks[0].applyStyle(context);

    var i;

    for (i = 0; i < this.bricks.length; i++) {
      if ((this.bricks[i].isDynamic && this.renderDynamics) || 
          (!this.bricks[i].isDynamic && this.renderStatics)) {
      
        context.save();

          context.translate(this.bricks[i].cell.col * Brick.SIZE, this.bricks[i].cell.row * Brick.SIZE);
          this.bricks[i].draw(context);

        context.restore();
      }
    }

  },

  getCell: function(x, y) {
    if (x > 0 && y > 0 && x < this.width && y < this.height) {
      return {
        row: parseInt(y / Brick.SIZE, 10), 
        col: parseInt(x / Brick.SIZE, 10)
      };
    }
    
    return null;
  },
  
  checkCell: function(cell) {
    return (cell && cell.row >= 0 && cell.row < this.rows && cell.col >= 0 && cell.col < this.cols);
  },
  
  getCellBox: function(cell) {
    if (!this.checkCell(cell)) {
      return null;
    }
    
    return new Rectangle(
      this.x + cell.col * Brick.SIZE, this.y + cell.row * Brick.SIZE,
      Brick.SIZE, Brick.SIZE
    );
  },

  getBrickAt: function(cell) {
    var i;
    
    if (this.checkCell(cell)) {
      for (i = 0; i < this.bricks.length; i++) {
        if (this.bricks[i].cell.row === cell.row && this.bricks[i].cell.col === cell.col) {
          return this.bricks[i];
        }
      }
    }

    return null;
  },

  removeBrickAt: function(cell) {
    if (!this.checkCell(cell)) {
      return false;
    }
    
    var i;

    for (i = 0; i < this.bricks.length; i++) {
      
      if (this.bricks[i].cell.row === cell.row && this.bricks[i].cell.col === cell.col) {
          
        this.bricks.splice(i, 1);
        
        this.renderNew = true;
        
        return true;
      }
    }

    return true;
  },

  dropBrickAt: function(brick, cell) {
    
    if (!this.checkCell(cell)) {
      return false;
    }
    
    brick.cell = cell;
    
    return this.insertBrick(brick);
  },
  
  insertBrick: function(brick) {
    
    brick.parent = this;
    
    if (!this.removeBrickAt(brick.cell)) {
      return false;
    }
    
    brick.x = this.x + brick.cell.col * Brick.SIZE;
    brick.y = this.y + brick.cell.row * Brick.SIZE;
    
    brick.width = brick.height = Brick.SIZE;
    
    if (brick.isInFront) {
      
      this.bricks.push(brick);
      
    } else {
      
      this.bricks.unshift(brick);
      
    }
    
    this.renderNew = true;
    
    return true;
  }

});var Toolbox = Class.create(Grid, {
  
  initialize: function($super) {
    $super();

    this.rows = 15;
    this.cols = 3;

    this.width = Brick.SIZE * this.cols;
    this.height = Brick.SIZE * this.rows;
    
    this.brickCounter = 0;

  },

  addBrick: function(klass) {
    var brick = new klass();

    brick.cell = {row: this.brickCounter * 2 + 1, col: 1};
    brick.parent = this;

    this.dropBrickAt(brick, brick.cell);
    this.brickCounter++;
    
    if (brick.pairType) {
      var pairBrick = new klass();
      pairBrick.parent = this;
      
      pairBrick.setRotation(Math.PI);
      pairBrick.cell = brick.cell;
      this.bricks.push(pairBrick);
      
      brick.partner = pairBrick;
    }
    
    return brick;

  },
  
  addPreviewBrick: function(klass) {
    var brick = this.addBrick(klass);
    brick.isDraggable = false;
    brick.isPreview = true;
    
    if (brick.partner) {
      
      brick.partner.isDraggable = false;
      brick.partner.isPreview = true;
      
    }
  },
  
  onClick: function(mouseX, mouseY) {
    var cell = this.getCell(mouseX, mouseY),
        brick = this.getBrickAt(cell);

    if (brick && brick.isDraggable && this.parent.selectElement && this.parent.selectElement.brick === brick) {

      brick.rotate(Math.PI / 2);
      this.renderNew = true;
      
      if (brick.partner) {
        
        brick.partner.rotate(Math.PI / 2);
        
      }

    }

    this.select(cell);
  },

  onStartDrag: function(mouseX, mouseY) {
    var cell = this.getCell(mouseX, mouseY),
        brick = this.getBrickAt(cell);
    
    if (brick && brick.isDraggable) {

      var dragBrick = new (eval(brick.type))();
          dragBrick.rotation = brick.rotation;
          
      this.parent.dragBrick(dragBrick);
      
    }
    
    this.select(cell);
  },

  select: function(cell) {
    var brick = this.getBrickAt(cell),
        box = null;

    box = this.getCellBox(cell);
    
    if (brick && brick.isDraggable) {
      
      box.brick = brick;
      
    }
    
    this.parent.selectElement = box;
  }

});
var Field = Class.create(Grid, {
  
  initialize: function($super) {
    $super();

    this.rows = 15;
    this.cols = 10;

    this.width = Brick.SIZE * this.cols;
    this.height = Brick.SIZE * this.rows;

    this.bricks = [];
    this.singles = {};

    this.debugMode = false;

    this.trackLength = 0;
  },
  
  setup: function() {
    $('lengthDisplay').update("0000");
    this.trackLength = 0;

    this.initializeBox2D();

    this.clearTrack(true);
  },
  
  draw: function($super, context) {

    if (!this.debugMode) {
      
      $super(context);

    } else {

      this.drawBodies(context);

    }
  },
  
  drawStatics: function($super, context) {
    
    this.renderNew = false;
    
    if (this.parent.tweenMode) {
      
      this.setClipping(context);

        context.translate(this.x, this.y);

        context.save();

          context.translate(10, 0);
          this.drawFieldShadow(context);

        context.restore();

        context.save();

          context.translate(0, this.parent.fieldOffset);

          this.drawStaticElements(context);

        context.restore();

        this.parent.drawTweenMode(context);

        this.drawFrame(context);

      this.releaseClipping(context);
      
    } else {
      
      $super(context);
      
    }
    
  },
  
  drawBodies: function(context) {
    context.strokeStyle = "#FF0000";
    context.lineWidth = 1;

    context.save();

      context.translate(this.x, this.y);
      
      var body;

      for (body = this.world.GetBodyList(); body !== null; body = body.GetNext()) {
        this.drawBody(context, body);
      }
    
    context.restore();
    
    context.addClearRectangle(new Rectangle(
      this.x - Brick.SIZE, this.y - Brick.SIZE, 
      (this.cols + 2) * Brick.SIZE, (this.rows + 2) * Brick.SIZE
    ));
  },

  drawBody: function(context, body) {
    context.save();
      
      var position = body.GetPosition(),
        shape, i;

      context.translate(Brick.SIZE * position.x, Brick.SIZE * position.y);
      context.rotate(body.GetAngle());
      
      context.beginPath();

      context.moveTo(0, 0);
      context.lineTo(0, -Brick.SIZE / 2);
      
      for (shape = body.GetShapeList(); shape !== null; shape = shape.GetNext()) {

        if (shape.m_vertices && shape.m_vertices[0]) {
          context.moveTo(shape.m_vertices[0].x * Brick.SIZE, shape.m_vertices[0].y * Brick.SIZE);

          for (i = 1; i < shape.m_vertexCount; i++) {

            context.lineTo(shape.m_vertices[i].x * Brick.SIZE, shape.m_vertices[i].y * Brick.SIZE);

          } 

          context.lineTo(shape.m_vertices[0].x * Brick.SIZE, shape.m_vertices[0].y * Brick.SIZE);
          
        } else {
          
          context.moveTo(Ball.radius * Brick.SIZE, 0);
          context.arc(0, 0, Ball.radius * Brick.SIZE, 0, Math.PI * 2, true);
          
        }
      }

      context.stroke();

    context.restore();
  },

  initializeBox2D: function() {
    var worldBoundingBox = new b2AABB(),
        gravity = new b2Vec2(0, 9.81);

    worldBoundingBox.lowerBound.Set(-10, -10);
    worldBoundingBox.upperBound.Set(20, 25);

    this.world = new b2World(worldBoundingBox, gravity, true);

    this.createBorders();
    this.initContactListener();
    this.initContactFilter();

    this.intervalLength = 1 / 120;
  },

  startBox2D: function() {
    
    this.resetTrack();
    var myScope = this;

    this.world.SetGravity(new b2Vec2(0, 9.81));

    this.intervalID = setInterval(function() {
      myScope.calculateBox2D();
    }, this.intervalLength * 1000);

    $('lengthDisplay').update("0000");
    this.trackLength = 0;
  },

  stopBox2D: function() {
    if (this.intervalID) {
      clearInterval(this.intervalID);
    }
    
    this.intervalID = null;
  },

  calculateBox2D: function() {
    var i;
    
    for (i = 0; i < this.bricks.length; i++) {
      
      this.bricks[i].update();
      
    }

    this.world.Step(0.02, 20);
    
  },

  createBorders: function() {
    var bodyDefinition = new b2BodyDef(),
        body, i;

    bodyDefinition.position.Set(0, 0);

    body = this.world.CreateBody(bodyDefinition);
    
    var createBorderShape = function(pointA, pointB) {
      
      var shapeDefinition = new b2PolygonDef();
      shapeDefinition.vertexCount = 4;
      shapeDefinition.restitution = 0;
      shapeDefinition.friction = 0.9;
      
      shapeDefinition.vertices[0].Set(pointA.x, pointA.y);
      shapeDefinition.vertices[1].Set(pointB.x, pointA.y);
      shapeDefinition.vertices[2].Set(pointB.x, pointB.y);
      shapeDefinition.vertices[3].Set(pointA.x, pointB.y);
      
      return shapeDefinition;
    };
    
    var borderPoints = [
      {A: new b2Vec2(0, -1), B: new b2Vec2(this.cols, 0)},
      {A: new b2Vec2(this.cols, 0), B: new b2Vec2(this.cols + 1, this.rows)},
      {A: new b2Vec2(0, this.rows), B: new b2Vec2(this.cols, this.rows + 1)},
      {A: new b2Vec2(-1, 0), B: new b2Vec2(0, this.rows)}
    ]

    for (i = 0; i < 4; i++) {
      body.CreateShape(createBorderShape(
        borderPoints[i].A, borderPoints[i].B
      ));
    }

    body.SetMassFromShapes();
  },
  
  initContactListener: function() {
    
    var contactListener = new b2ContactListener();
    
    contactListener.Add = function(contact) {

      if (contact.shape1.GetBody().onCollision) {
        
        contact.shape1.GetBody().onCollision(contact);
        
      } else if (contact.shape2.GetBody().onCollision) {
        
        contact.shape2.GetBody().onCollision(contact);
        
      }
      
    };

    contactListener.Persist = function(contact) {

      if (contact.shape1.GetBody().whileCollision) {
        
        contact.shape1.GetBody().whileCollision(contact);
        
      } else if (contact.shape2.GetBody().whileCollision) {
        
        contact.shape2.GetBody().whileCollision(contact);
        
      }
      
    };

    contactListener.Remove = function(contact) {

      if (contact.shape1.GetBody().afterCollision) {
        
        contact.shape1.GetBody().afterCollision(contact);
        
      } else if (contact.shape2.GetBody().afterCollision) {
        
        contact.shape2.GetBody().afterCollision(contact);
        
      }
      
    };
    
    this.world.SetContactListener(contactListener);
    
  },
  
  initContactFilter: function() {
    
    var contactFilter = new b2ContactFilter();
    
    contactFilter.ShouldCollide = function(shape1, shape2) {
      
      if (shape1.GetBody().beforeCollision) {
        
        return shape1.GetBody().beforeCollision(shape1, shape2);
        
      } else if (shape2.GetBody().beforeCollision) {

        return shape2.GetBody().beforeCollision(shape1, shape2);

      }
      
      var filter1 = shape1.GetFilterData(),
          filter2 = shape2.GetFilterData();
      
      if (filter1.groupIndex === filter2.groupIndex && filter1.groupIndex !== 0) {
          return filter1.groupIndex > 0;
      }
      
      return (filter1.maskBits & filter2.categoryBits) !== 0 && (filter1.categoryBits & filter2.maskBits) !== 0;
      
    };
    
    this.world.SetContactFilter(contactFilter);
    
  },
  
  findPartner: function(brick) {
    
    if (this.singles[brick.pairType]) {
      
      if (this.singles[brick.pairType] === brick) {
        //console.log("self");
        return;
      }
      
      brick.partner = this.singles[brick.pairType];
      this.singles[brick.pairType].partner = brick;
      
      this.singles[brick.pairType] = null;
      
    } else {
      
      this.singles[brick.type] = brick;
      
    }
    
  },
  
  setActiveGraviton: function(graviton) {
    
    if (this.activeGraviton) {
      
      this.activeGraviton.isActive = false;
      
    }
    
    this.activeGraviton = graviton;
    
  },
  
  dropBrickAt: function($super, brick, cell) {

    if ($super(brick, cell)) {
      brick.createBody(this.world);
      
      this.validTrack = false;
      $('publishButton').removeClassName('activePublish');
    }
  },

  removeBrickAt: function($super, cell) {
    var brick = this.getBrickAt(cell);

    if (brick) {
      if ($super(cell)) {
        
        brick.removeBody(this.world);
        
        this.validTrack = false;
        $('publishButton').removeClassName('activePublish');
        
        return true;
        
      } else {

        return false;
        
      }
    }
    
    return true;
  },

  onClick: function(mouseX, mouseY) {
    
    var cell = this.getCell(mouseX, mouseY),
        brick = this.getBrickAt(cell);

    if (brick) {

      brick.rotate(Math.PI / 2);

      this.validTrack = false;
      $('publishButton').removeClassName('activePublish');

    } else if (cell && this.parent.selectElement && this.parent.selectElement.brick) {

      var dropBrick = new (eval(this.parent.selectElement.brick.type))();
          dropBrick.setRotation(this.parent.selectElement.brick.rotation);

      this.dropBrickAt(dropBrick, cell);

    }
    
    this.renderNew = true;
  },
  
  onStartDrag: function(mouseX, mouseY) {
    var brick = this.getBrickAt(this.getCell(mouseX, mouseY));

    if (brick) {

      if (brick.isDraggable) {
      
        brick.isVisible = false;
        this.renderNew = true;
        
        var draggedBrick = new (eval(brick.type))();
            draggedBrick.setRotation(brick.rotation);
            draggedBrick.origin = brick;
        
        this.parent.dragBrick(draggedBrick);
        
        this.validTrack = false;
        $('publishButton').removeClassName('activePublish');
      
      }
      
    } else {

      this.onDrag(mouseX, mouseY);
      this.parent.startDragBricking();
      
    }
  },
  
  onDrag: function(mouseX, mouseY) {
    
    var cell = this.getCell(mouseX, mouseY),
        brick = this.getBrickAt(cell);

    if (!cell || !this.parent.selectElement) {
      return;
    }
        
    if (this.parent.selectElement.brick) {
      
      if (brick && (!brick.isRemoveable ||
        (brick.type === this.parent.selectElement.brick.type && brick.rotation === this.parent.selectElement.brick.rotation))) {
        return;
      }

      var dropBrick = new (eval(this.parent.selectElement.brick.type))();
          dropBrick.setRotation(this.parent.selectElement.brick.rotation);

      this.dropBrickAt(dropBrick, cell);
      
    } else if (brick && brick.isRemoveable) {
      
      this.removeBrickAt(cell);
      
    }
    
    this.renderNew = true;
  },
  
  onStopDrag: function(event, dragBrick) {
    
    var cell = this.getCell(
      dragBrick.x - this.x + Brick.SIZE / 2,
      dragBrick.y - this.y + Brick.SIZE / 2
    );
    
    if (cell) {
      
      var brick = this.getBrickAt(cell);
    
      if (this.intervalID) {
      
        this.resetTrack();
      
      }
      
      if (brick && !brick.isRemoveable) {
        
        if (dragBrick.origin) {
          
          dragBrick.origin.isVisible = true;
          this.renderNew = true;
          
        }
        
      } else {
        
        if (brick && dragBrick.origin !== brick) {
          
          this.removeBrickAt(cell);
          
        }
        
        if (dragBrick.origin) {
          
          dragBrick.origin.x = this.x + cell.col * Brick.SIZE;
          dragBrick.origin.y = this.y + cell.row * Brick.SIZE;
          
          dragBrick.origin.moveToCell(cell);
          
          dragBrick.origin.isVisible = true;
          this.renderNew = true;
          
        } else {
        
          this.dropBrickAt(dragBrick, cell);
          
        }
        
      }
      
    } else if (dragBrick.origin) {
      
      if (dragBrick.isRemoveable) {
        
        this.removeBrickAt(dragBrick.origin.cell);
      
      } else {
        
        dragBrick.origin.isVisible = true;
        this.renderNew = true;
      
      }
        
    }
    
    this.validTrack = false;
    $('publishButton').removeClassName('activePublish');
  },
  
  resetTrack: function() {
    
    this.stopBox2D();
    
    this.renderNew = true;
    
    var i;
    
    for (i = 0; i < this.bricks.length; i++) {
      
      this.bricks[i].reset();
      
    }
  },
  
  setTrack: function(track) {
    
    var that = this, 
        p, b;
    
    this.clearTrack();    
    
    for (b in track.bricks) {
      
      if (track.bricks.hasOwnProperty(b)) {
        
        var brick = track.bricks[b];
    
        var dropBrick = new (eval(brick.type))();
    
        dropBrick.setRotation(brick.rotation * Math.PI / 2);
    
        this.dropBrickAt(
          dropBrick,
          {
            row: brick.row,
            col: brick.col
          }
        );
      }
    }
    
    if (track.pairs) {
      for (p = 0; p < track.pairs.length; p++) {
        
        var girl = this.getBrickAt(track.pairs[p].girl),
            boy = this.getBrickAt(track.pairs[p].boy);
            
        if (girl && boy && girl.pairType === boy.type) {
          
          girl.partner = boy;
          boy.partner = girl;
          
        }  
      }
    }
      
    return true;
  },
  
  getTrack: function() {
    
    this.resetTrack();
    
    var track = {
      bricks: {},
      pairs: []
    };
    
    var i, j;
    
    var getRotationAsNumber = function(radians) {
      var number = 0;
      
      while (radians - 0.5 > 0) {
        
        radians -= Math.PI / 2;
        number++;
        
      }
      
      return (number %= 4);
    };
      
    for (i = 0; i < this.bricks.length; i++) {
      
      var brick = this.bricks[i];
      
      track.bricks[brick.cell.row * this.cols + brick.cell.col] = {
        type: brick.type,
        rotation: getRotationAsNumber(brick.rotation),
        row: brick.cell.row,
        col: brick.cell.col
      };
      
      if (brick.pairType && brick.partner) {
        
        var isPushed = false;
        
        for (j = 0; j < track.pairs.length; j++) {
          
          if (track.pairs[j].girl === brick || track.pairs[j].boy === brick) {
            
            isPushed = true;
            break;
            
          }
          
        }
        
        if (!isPushed) {
          track.pairs.push({
            girl: {
              row: brick.cell.row,
              col: brick.cell.col
            },
            boy: {
              row: brick.partner.cell.row,
              col: brick.partner.cell.col
            }
          });
        }
      }
    }
    
    return track;
    
  },
  
  clearTrack: function(setBallAndExit) {
    
    this.resetTrack();
    
    var i;
    
    for (i = 0; i < this.bricks.length; i++) {
      
      this.bricks[i].removeBody(this.world);
      
    }
    
    this.bricks = [];
    this.singles = {};
    
    if (setBallAndExit) {
      
      this.dropBrickAt(new Ball(), {row: 0, col: 0});
      this.dropBrickAt(new Exit(), {row: (this.rows - 1), col: 0});
      
    }
    
  },

  getTrackImage: function(canvas) {

    this.resetTrack();

    var context = canvas.getContext("2d");
    var storeBrickSize = Brick.SIZE,
        i;
    Brick.SIZE = Brick.TINY_SIZE;

    canvas.width = Brick.SIZE * this.cols + 2;
    canvas.height = Brick.SIZE * this.rows + 2;

    context.save();

      context.translate(0.5, 0.5);

      context.lineWidth = 0.5;

      context.beginPath();

      for (i = 1; i < this.rows; i++) {
        
        context.dashedLine(0, Brick.SIZE * i, Brick.SIZE * this.cols, Brick.SIZE * i, 2);

      }

      for (i = 1; i < this.cols; i++) {

        context.dashedLine(Brick.SIZE * i, 0, Brick.SIZE * i, Brick.SIZE * this.rows, 2);

      }

      context.stroke();
      context.beginPath(); // Clear Context Buffer
      
      if (this.bricks.length) {

        this.bricks[0].applyStyle(context);
        context.lineWidth = 0.5;

        for (i = 0; i < this.bricks.length; i++) {
          context.save();

            context.translate(this.bricks[i].cell.col * Brick.SIZE, this.bricks[i].cell.row * Brick.SIZE);
            this.bricks[i].draw(context);

          context.restore();
        }
      }
      
      context.strokeStyle = "#000000";
      context.lineWidth = 1;

      //context.fillRect(0, 0, Brick.SIZE * this.cols, Brick.SIZE * this.rows);
      context.strokeRect(0, 0, Brick.SIZE * this.cols, Brick.SIZE * this.rows);

    context.restore();

    Brick.SIZE = storeBrickSize;

    return canvas.toDataURL("image/png");

  }

});
var Renderer = Class.create(DisplayObject, {
  
  initialize: function($super, staticCanvas, dynamicCanvas) {
    $super();

    this.staticCanvas = staticCanvas;
    this.dynamicCanvas = dynamicCanvas;

    this.staticContext = this.staticCanvas.getContext('2d');
    this.dynamicContext = this.dynamicCanvas.getContext('2d');

    this.initField();

    this.timeoutID = null;
    this.isAnimated = false;

    //this.staticImageData = null;
  },

  initField: function() {

    this.field = new Field();
    this.field.parent = this;
    this.field.x = 64;
    this.field.y = Brick.SIZE;
    this.field.setup();

  },

  initializeHTMLInterface: function() {},
  
  debug: function() {
    this.field.debugMode = !this.field.debugMode;
  },

  startRender: function() {
    
    if (!this.isAnimated) {
      
      this.isAnimated = true;
      this.animate();
      
    }
  },

  stopRender: function() {
    
    this.isAnimated = false;
    
  },

  quit: function() {
    this.stopRender();
    this.field.stopBox2D();

    if (this.timeoutID) {
      clearTimeout(this.timeoutID);
      this.timeoutID = null;
    }
  },

  init: function() {
    this.startRender();
  },

  onBallExit: function() {
    
    this.field.stopBox2D();
    
  }, 

  clearCanvas: function(canvas) {
    var context = canvas.getContext('2d');
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    context.beginPath();
  },
  
  animate: function() {
    
    if (this.isAnimated) {
      
      var myScope = this;
      
      requestAnimFrame(function() {
        myScope.animate();
      });
    }
    
    this.draw();
  },

  draw: function() {
    
    this.drawDynamics();
    this.drawStatics();
    
    // this.staticContext.putImageData(this.staticImageData, 0, 0);
    
    this.dynamicContext.getImageData(0, 0, 1, 1);
    
  },
  
  drawStatics: function() {
    
    if (this.field.renderNew) {
      
      this.staticContext.save();
      
        this.clearCanvas(this.staticCanvas);

        this.staticContext.translate(0.5, 0.5);
        this.field.drawStatics(this.staticContext);

        //this.staticImageData = this.staticContext.getImageData(0, 0, this.staticCanvas.width, this.staticCanvas.height);

      this.staticContext.restore();
    }
  },
  
  drawDynamics: function() {
    
    this.dynamicContext.save();
    
      this.clearDynamicCanvas();
      
      this.dynamicContext.translate(0.5, 0.5);
      
      this.field.drawDynamics(this.dynamicContext);
      
      
      if (this.field.debugMode) {
      
        this.field.draw(this.dynamicContext);
      
      }
    
    this.dynamicContext.restore();
  },
  
  clearDynamicCanvas: function() {
    
    this.dynamicContext.clearRectangles();
    
    this.dynamicContext.clearRects = [];
    
  }

});var Editor = Class.create(Renderer, {

  initialize: function($super, staticCanvas, dynamicCanvas, imageCanvas) {
    $super(staticCanvas, dynamicCanvas);

    this.imageCanvas = imageCanvas;

    this.baseToolbox = new Toolbox();
    this.baseToolbox.parent = this;
    this.baseToolbox.x = this.field.x + this.field.width + 3 * Brick.SIZE;
    this.baseToolbox.y = this.field.y;

    this.specialToolbox = new Toolbox();
    this.specialToolbox.parent = this;
    this.specialToolbox.x = this.baseToolbox.x + this.baseToolbox.width + Brick.SIZE;
    this.specialToolbox.y = this.baseToolbox.y;

    this.eventEngine = new EventEngine();
    this.dragElement = this.hoverElement = this.selectElement = null;

    this.setSize();
    this.addBricksToToolboxes();
    this.initializeHTMLInterface();
    
    // this.baseToolbox.onClick(1.5 * Brick.SIZE, 3.5 * Brick.SIZE);
  },

  quit: function($super) {
    $super();
    
    this.removeEventListening();
  },

  init: function($super) {
    $super();
    
    this.addEventListening();
    this.field.resetTrack();
  },

  setSize: function() {

    var width = this.specialToolbox.x + this.specialToolbox.width + 3,
        height = this.field.y + this.field.height + Brick.SIZE;

    this.width = this.staticCanvas.width = this.dynamicCanvas.width = width;
    this.height = this.staticCanvas.height = this.dynamicCanvas.height = height;

  },
  
  addEventListening: function() {

    this.eventEngine.addListener("click", this.onClick, this);
    this.eventEngine.addListener("mouseMove", this.onMouseMove, this);

    this.eventEngine.addListener("startDrag", this.onStartDrag, this);
    this.eventEngine.addListener("stopDrag", this.onStopDrag, this);
    
  },

  removeEventListening: function() {
    this.eventEngine.removeListener("click", this.onClick);
    this.eventEngine.removeListener("mouseMove", this.onMouseMove);

    this.eventEngine.removeListener("startDrag", this.onStartDrag);
    this.eventEngine.removeListener("stopDrag", this.onStopDrag);
  },
  
  addBricksToToolboxes: function() {
    
    var baseBricks = [Brick, Ramp, Kicker, Curve, Line],
      i;

    for (i = 0; i < baseBricks.length; i++) {
      this.baseToolbox.addBrick(baseBricks[i]);
    }

    var that = this;

    /*var request = new Ajax.Request('/unlocks', {
      method: 'get',
      requestHeaders: {Accept: 'application/json'},
      
      onSuccess: function(transport) {
        
        for (i = 5; i < transport.responseJSON.unlocks.length; i++) {
          that.specialToolbox.addBrick(eval(transport.responseJSON.unlocks[i]));
        }
        
        if (transport.responseJSON.locks) {
          that.specialToolbox.addPreviewBrick(eval(transport.responseJSON.locks[0]))
        }
      },
      
      onFailure: function(transport) {
        //console.log("AjaxError on loading unlocks!");
      }
    });*/

    jQuery.ajax({
      url: "http://marblerun.at" + '/unlocks',
      type: 'GET',
      headers: {
        "Accept": "application/json"
      },
      data: {
      },
      success: function(transport) {
        
        try {
          transport = JSON.parse(transport);
        } catch(error) {
          transport = transport;
        }

        for (i = 5; i < transport.unlocks.length; i++) {
          that.specialToolbox.addBrick(eval(transport.unlocks[i]));
        }
        
        if (transport.locks) {
          that.specialToolbox.addPreviewBrick(eval(transport.locks[0]))
        }
      },

      error: function(transport) {
        
      }
    });
  },
  
  initializeHTMLInterface: function($super) {
    var myScope = this;

    $('runButton').observe('click', function(event) {
      myScope.field.startBox2D();
    });

    $('clearButton').observe('click', function(event) {
      myScope.field.clearTrack(true);
    });

    $('publishButton').observe('click', function(event) {
      if ($('publishButton').hasClassName('activePublish') && myScope.field.validTrack) {

        myScope.publishTrack();
        $('publishButtonWarning').style.visibility = "hidden";
        
      } else {

        $('publishButtonWarning').style.visibility = "visible";

      }
    });
  },
  
  drawStatics: function() {
    
    if (this.field.renderNew || 
      this.baseToolbox.renderNew || this.specialToolbox.renderNew) {

        this.clearCanvas(this.staticCanvas);

        this.staticContext.save();

          this.staticContext.translate(0.5, 0.5);

          this.field.drawStatics(this.staticContext);
          
          this.baseToolbox.drawStatics(this.staticContext);
          this.specialToolbox.drawStatics(this.staticContext);

          // this.staticImageData = this.staticContext.getImageData(0, 0, this.staticCanvas.width, this.staticCanvas.height);

        this.staticContext.restore();
    }
  },
  
  drawDynamics: function() {
    
    this.dynamicContext.save();
      
      this.clearDynamicCanvas();
      
      
      this.dynamicContext.translate(0.5, 0.5);
      
      this.field.drawDynamics(this.dynamicContext);
      
      this.baseToolbox.drawDynamics(this.dynamicContext);
      this.specialToolbox.drawDynamics(this.dynamicContext);
      
      if (this.hoverElement) {
        
        this.dynamicContext.save();
        
          this.dynamicContext.fillStyle = "#333333";
          this.dynamicContext.globalAlpha = 0.15;
        
          this.hoverElement.draw(this.dynamicContext);
        
        this.dynamicContext.restore();
        
      }
      
      if (this.selectElement) {
        
        this.dynamicContext.save();
        
          this.dynamicContext.fillStyle = "#800000";
          this.dynamicContext.globalAlpha = 0.3;
        
          this.selectElement.draw(this.dynamicContext);
        
        this.dynamicContext.restore();
        
      }
      
      if (this.field.debugMode) {
      
        this.field.draw(this.dynamicContext);
      
      }
      
      if (this.dragElement) {
        
        this.dynamicContext.drawShadows = true;
        
        this.dragElement.drawGlobal(this.dynamicContext);
        
        this.dynamicContext.drawShadows = false;
        
      }
    
    this.dynamicContext.restore();
  },
  
  onClick: function(event) {
    
    if (this.field.hitTest(event.mouseX, event.mouseY)) {

      if (!this.field.intervalID) {

        this.field.onClick(event.mouseX - this.field.x, event.mouseY - this.field.y);

      }

      this.field.resetTrack();
      
    } else if (this.baseToolbox.hitTest(event.mouseX, event.mouseY)) {

      this.baseToolbox.onClick(event.mouseX - this.baseToolbox.x, event.mouseY - this.baseToolbox.y);

    } else if (this.specialToolbox.hitTest(event.mouseX, event.mouseY)) {

      this.specialToolbox.onClick(event.mouseX - this.specialToolbox.x, event.mouseY - this.specialToolbox.y);

    }
  },
  
  onMouseMove: function(event) {

    this.hoverElement = null;

    if (this.field.hitTest(event.mouseX, event.mouseY)) {

      this.hoverElement = this.getCellBox(this.field, event.mouseX, event.mouseY);

    } else if (this.baseToolbox.hitTest(event.mouseX, event.mouseY)) {

      this.hoverElement = this.getCellBox(this.baseToolbox, event.mouseX, event.mouseY);

    } else if (this.specialToolbox.hitTest(event.mouseX, event.mouseY)) {

      this.hoverElement = this.getCellBox(this.specialToolbox, event.mouseX, event.mouseY);

    }
  },
  
  getCellBox: function(grid, mouseX, mouseY) {
    return grid.getCellBox(
      grid.getCell(
        mouseX - grid.x, 
        mouseY - grid.y
      )
    );
  },
  
  onStartDrag: function(event) {

    this.field.resetTrack();

    if (this.field.hitTest(event.mouseX, event.mouseY)) {

      this.field.resetTrack();
      this.field.onStartDrag(event.mouseX - this.field.x, event.mouseY - this.field.y);

    } else if (this.baseToolbox.hitTest(event.mouseX, event.mouseY)) {

      this.baseToolbox.onStartDrag(event.mouseX - this.baseToolbox.x, event.mouseY - this.baseToolbox.y);

    } else if (this.specialToolbox.hitTest(event.mouseX, event.mouseY)) {

      this.specialToolbox.onStartDrag(event.mouseX - this.specialToolbox.x, event.mouseY - this.specialToolbox.y);

    }
  },

  onDrag: function(event) {

    if (this.dragElement && event.mouseX && event.mouseY) {
      
      this.dragElement.x = parseInt(event.mouseX - Brick.SIZE / 2, 10);
      this.dragElement.y = parseInt(event.mouseY - Brick.SIZE / 2, 10);
      
    }
  },
  
  dragBrick: function(brick) {

    var point = {x: this.eventEngine.latestEvent.mouseX, y: this.eventEngine.latestEvent.mouseY};

    brick.x = point.x - Brick.BIG_SIZE / 2;
    brick.y = point.y - Brick.BIG_SIZE / 2; 

    this.dragElement = brick;

    this.eventEngine.addListener("drag", this.onDrag, this);
  },
  
  startDragBricking: function() {
    
    this.eventEngine.addListener("drag", this.onDragBricking, this);
    
  },
  
  onDragBricking: function(event) {

    if (this.field.hitTest(event.mouseX, event.mouseY)) {

      this.field.onDrag(event.mouseX - this.field.x, event.mouseY - this.field.y);

    }

  },

  onStopDrag: function(event) {

    if (this.dragElement) {
      
      this.field.onStopDrag(event, this.dragElement);
      
      this.dragElement = null;
    
    }

    this.eventEngine.removeListener("drag", this.onDragBricking);
    this.eventEngine.removeListener("drag", this.onDrag);
  },

  publishTrack: function() {
    
    if (this.field.validTrack) {

      contentLoader.parseResponse({responseJSON: {mode: "load"}});

      var parameters = {},
          length = this.field.trackLength;

      parameters['track[json]'] = Object.toJSON(this.field.getTrack());
      parameters['track[length]'] = length;
      parameters['track[imagedata]'] = this.field.getTrackImage(this.imageCanvas);
      parameters['track[username]'] = $('userName').value;
      parameters['track[trackname]'] = $('trackName').value;

      /*var request = new Ajax.Request('/tracks', {
        method: 'post',
        parameters: parameters,
        requestHeaders: {Accept: 'application/json'},
        
        onSuccess: function(transport) {
          contentLoader.parseResponse(transport, true);
        },
        
        onFailure: function(transport) {
          contentLoader.parseResponse(transport, false);
        }
      });*/

      jQuery.ajax({
        url: "http://marblerun.at" + '/tracks',
        type: 'POST',
        headers: {
          "Accept": "application/json"
        },
        data: {
          'track[json]': Object.toJSON(this.field.getTrack()),
          'track[length]': length,
          'track[imagedata]': this.field.getTrackImage(this.imageCanvas),
          'track[username]': $('userName').value,
          'track[trackname]': $('trackName').value
        },
        success: function(transport) {
          contentLoader.parseResponse({ responseJSON: transport }, true);
        },

        error: function(transport) {
          contentLoader.parseResponse({ responseJSON: transport }, false);
        }
      });

      this.field.clearTrack(true);
    } 
  }
  
});var Showroom = Class.create(Renderer, {
  
  initialize: function($super, staticCanvas, dynamicCanvas) {
    $super(staticCanvas, dynamicCanvas);
    
    this.initializeHTMLInterface();

    this.trackID = null;
    this.autoMode = false;
    
    this.tweenMode = false;
    this.tweenDown = true;
    this.tweenStart = false;
    
    this.fieldOffset = 0;
    this.fieldImage = null;
    
  },

  quit: function($super) {
    $super();
    
    if (this.tweenTimeoutID) {
      clearTimeout(this.tweenTimeoutID);
      this.tweenTimeoutID = null;
      this.tweenMode = false;
    }
    
    $('showroomLikeButton').stopObserving();
    $('showroomFlagButton').stopObserving();
  },
  
  drawDynamics: function($super, context) {
    
    if (this.tweenMode) {
      
      this.clearDynamicCanvas();
      
    } else if (this.tweenStart) {
      
      this.tweenStart = false;
      
      if (this.tweenDown) {
      
        this.fadeTrack(trackStore.next(this.trackID));
      
      } else {
        
        this.fadeTrack(trackStore.previous(this.trackID));
        
      }
      
    } else {
      
      $super(context);
      
    }
    
  },
  
  drawTweenMode: function(context) {
    
    var offset;
    
    context.save();
    
      offset = this.fieldOffset + (this.field.height + Brick.SIZE) * (this.fieldOffset < 0 ? 1 : -1);
    
      context.translate(-0.5, offset - 0.5);
      
      context.drawImage(
        this.fieldImage,
        this.field.x, this.field.y, this.field.width, this.field.height,
        0, 0, this.field.width, this.field.height
      );
    
    context.restore();
    
    
    context.save();
    
      offset = this.fieldOffset + (this.fieldOffset > 0 ? -Brick.SIZE : this.field.height);
      
      context.translate(0, offset);
      
      this.drawInlay(context);
    
    context.restore();
    
  },
  
  drawInlay: function(context) {
    
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(this.field.width, 0);
    context.lineTo(this.field.width, Brick.SIZE);
    context.lineTo(0, Brick.SIZE);
    context.closePath();
    
    context.clip();
    
    
    context.fillStyle = Brick.FILL;
    context.strokeStyle = Brick.STROKE;
    context.lineWidth = 3;
    
    context.fillRect(0, 0, this.field.width, Brick.SIZE);
    
    
    context.beginPath();
    var i;
    
    for (i = 0; i < this.field.width + Brick.SIZE; i += Brick.SIZE / 3) {
      
      context.moveTo(i, 0);
      context.lineTo(i - Brick.SIZE, Brick.SIZE);
      
    }
    
    context.stroke();
    
    
    context.lineWidth = 1;
    context.beginPath();
    
    for (i = 1; i < this.field.cols; i++) {
      
      context.moveTo(i * Brick.SIZE, 0);
      context.lineTo(i * Brick.SIZE, Brick.SIZE);
      
    }
    
    context.stroke();
    
    context.beginPath();
    
  },

  onBallExit: function($super) {

    $super();

    if (this.autoMode) {

      if (trackStore.hasNext(this.trackID)) {

        this.tweenDown = true;
        this.fadeTrack(trackStore.next(this.trackID));

      } else {

        contentLoader.loadContent("/tracks/" + this.trackID + "/next", true);

      }

    }

  },

  parseTrack: function(data) {
    
    this.initField();
    
    this.trackID = data.id;
    this.field.setTrack(data.json);
    
    trackStore.loadNext(this.trackID);
    trackStore.loadPrevious(this.trackID);
    this.setLikeBlameButtons();

    if (this.autoMode && !this.tweenMode) {
      this.field.startBox2D();
    }
  },

  initializeHTMLInterface: function() {
    var myScope = this;

    $('showButton').observe('click', function(event) {
      myScope.field.startBox2D();
    });

    $('autoButton').observe('click', function(event) {
      $('autoButton').toggleClassName('active');

      myScope.autoMode = $('autoButton').hasClassName('active');
    });
    
    $('nextButton').observe('click', function(event) {

      if (trackStore.hasNext(myScope.trackID)) {
        myScope.tweenDown = true;
        myScope.tweenStart = true;
        return;
      }

      contentLoader.loadContent("/tracks/" + myScope.trackID + "/next");
    });

    $('previousButton').observe('click', function(event) {

      if (trackStore.hasPrevious(myScope.trackID)) {
        myScope.tweenDown = false;
        myScope.tweenStart = true;
        return;
      }

      contentLoader.loadContent("/tracks/" + myScope.trackID + "/previous");
    });
    
  },

  setLikeBlameButtons: function() {
    var myScope = this;

    if (Cookie.likedTracks.indexOf(this.trackID) === -1) {
      $('showroomLikeButton').observe('click', function() {
        myScope.like();
      });

      $('showroomLikeButton').setStyle({display: "block"});
    } else {

      $('showroomLikeButton').stopObserving();
      $('showroomLikeButton').setStyle({display: "none"});
    }

    if (Cookie.flagedTracks.indexOf(this.trackID) === -1) {
      $('showroomFlagButton').observe('click', function() {
        myScope.flag();
      });

      $('showroomFlag').setStyle({display: "block"});
    } else {
      $('showroomFlagButton').stopObserving();
      $('showroomFlag').setStyle({display: "none"});
    }
  },

  startRender: function($super) {
    $super();
    
    if (this.autoMode && !this.tweenTimeoutID) {

      this.field.startBox2D();

    }
  },

  like: function() {

    if (this.trackID) {
      var parameters = {};
      var myScope = this;

      parameters.likes = 1;
        
      /*var request = new Ajax.Request('/tracks/' + this.trackID, {
        method: 'put',
        parameters: parameters,
        requestHeaders: {Accept: 'application/json'},
        
        onSuccess: function(transport) {
          Cookie.likedTracks.push(myScope.trackID);
          Cookie.set('likes', JSON.stringify(Cookie.likedTracks), {maxAge: 60 * 60 * 24 * 365});

          $('tableLikes').update(parseInt($('tableLikes').innerHTML, 10) + 1);

          $('showroomLikeButton').setStyle({display: "none"});
        },
        
        onFailure: function(transport) {
          $('showroomLikeButton').setStyle({display: "none"});
        }
      });*/

      jQuery.ajax({
        url: "http://marblerun.at" + '/tracks/' + this.trackID,
        type: 'PUT',
        headers: {
          "Accept": "application/json"
        },
        data: {
          likes: 1
        },
        success: function(transport) {
          Cookie.likedTracks.push(myScope.trackID);
          Cookie.set('likes', JSON.stringify(Cookie.likedTracks), {maxAge: 60 * 60 * 24 * 365});

          $('tableLikes').update(parseInt($('tableLikes').innerHTML, 10) + 1);

          $('showroomLikeButton').setStyle({display: "none"});
        },

        error: function(transport) {
          $('showroomLikeButton').setStyle({display: "none"});
        }
      });
    }
  },

  flag: function() {
    if (this.trackID) {
      var parameters = {};
      var myScope = this;

      parameters.flags = 1;
        
      /*var request = new Ajax.Request('/tracks/' + this.trackID, {
        method: 'put',
        parameters: parameters,
        requestHeaders: {Accept: 'application/json'},
        
        onSuccess: function(transport) {
          Cookie.flagedTracks.push(myScope.trackID);
          Cookie.set('flags', JSON.stringify(Cookie.flagedTracks), {maxAge: 60 * 60 * 24 * 365});

          $('showroomFlag').setStyle({display: "none"});
        },
        
        onFailure: function(transport) {
          $('showroomFlag').setStyle({display: "none"});
        }
      });*/

      jQuery.ajax({
        url: "http://marblerun.at" + '/tracks/' + this.trackID,
        type: 'PUT',
        headers: {
          "Accept": "application/json"
        },
        data: {
          flags: 1
        },
        success: function(transport) {
          Cookie.flagedTracks.push(myScope.trackID);
          Cookie.set('flags', JSON.stringify(Cookie.flagedTracks), {maxAge: 60 * 60 * 24 * 365});

          $('showroomFlag').setStyle({display: "none"});
        },

        error: function(transport) {
          $('showroomFlag').setStyle({display: "none"});
        }
      });
    }
  },
  
  fadeTrack: function(trackID) {
    
    this.tweenPercent = 0;
    this.fieldOffset = this.totalHeight = (this.field.height + Brick.SIZE) * (this.tweenDown ? 1 : -1);
    
    this.fieldImage = new Image();
    var myScope = this;
    
    this.fieldImage.onload = function() {
      
      myScope.tweenMode = true;
      trackStore.loadTrack(trackID, contentLoader.parseResponse, contentLoader, true);
      myScope.tweenMode = true;
      myScope.tween();
      
    };
    
    this.fieldImage.src = this.staticCanvas.toDataURL("image/png");
  },
  
  tween: function() {
    
    this.field.renderNew = true;
    
    if (this.tweenPercent >= 1.0) {
      
      this.tweenMode = false;
      this.tweenTimeoutID = null;
      
      this.fieldOffset = 0;
      
      if (this.autoMode) {
        this.field.startBox2D();
      }
      
    } else {
    
      this.fieldOffset = (Math.cos(this.tweenPercent * Math.PI) + 1.0) / 2 * this.totalHeight;
      this.tweenPercent += 0.05;
      
      var myScope = this;
          
      this.tweenTimeoutID = setTimeout(function() {
      
        myScope.tween();
      
      }, 50);
      
    }
  }

});var Meter = Class.create(DisplayObject, {
  
  initialize: function($super, canvas) {
    $super();

    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.context.translate(0.5, 0.5);

    this.width = 218;
    this.height = 185;

    this.angle = - Math.PI / 4;
    this.targetAngle = null;
    this.timeINT = null;
  },

  setSize: function() {
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  },

  setRotation: function(percent) {
    clearTimeout(this.timeINT);
    this.targetAngle = percent * Math.PI / 2 - Math.PI / 4;

    var that = this;
    setTimeout(function() {that.calculateRotation();}, 1000);
  },

  calculateRotation: function() {
    this.angle += (this.targetAngle - this.angle) / 8;

    if (Math.abs(this.angle - this.targetAngle) < 0.01) {

      this.angle = this.targetAngle;
      this.draw();
      
      this.timeINT = null;

    } else {
      this.draw();

      var that = this;
      this.timeINT = setTimeout(function() {that.calculateRotation();}, 50);
    }
  },

  draw: function() {

    this.setSize();

    this.context.fillStyle = Pattern.meterBackground;
    this.context.fillRect(0, 0, this.width, this.height);

    this.context.save();

      this.context.translate(109, 120);
      this.context.rotate(this.angle);
      this.context.translate(-19, -65);

      this.context.drawImage(Pattern.image.meterPointer, 0, 0, 22, 92);

    this.context.restore();

    this.context.fillStyle = Pattern.meterForeground;
    this.context.fillRect(0, 0, this.width, this.height);

  }

});var SidebarController = Class.create({
  
  initialize: function() {
    
    this.meter = new Meter(meterCanvas);
    this.meter.setRotation(0.0);

    var thisClass = this;

    /*var request = new Ajax.PeriodicalUpdater('', '/tracks/info', {

      method: 'get',
      frequency: 6,
      decay: 1,

      onSuccess: function(transport) {thisClass.onInfoUpdate.call(thisClass, transport);},
      onFailure: function(transport) {
        console.error("Periodical Update failed!");
      }
    });*/

    jQuery.ajax({
      url: "http://marblerun.at" + '/tracks/info',
      type: 'GET',
      headers: {
        "Accept": "application/json"
      },
      data: {
      },
      success: function(transport) {
        thisClass.onInfoUpdate.call(thisClass, transport);
      },

      error: function(transport) {
        console.error("Periodical Update failed!");
      }
    });

    var request = setInterval(function() {
      jQuery.ajax({
        url: "http://marblerun.at" + '/tracks/info',
        type: 'GET',
        headers: {
          "Accept": "application/json"
        },
        data: {
        },
        success: function(transport) {
          thisClass.onInfoUpdate.call(thisClass, transport);
        },

        error: function(transport) {
          console.error("Periodical Update failed!");
        }
      });
    }, 6000);

    this.targetMeters = null;
    this.meters = 0;

  },

  onInfoUpdate: function(transport) {

    try {
      response = JSON.parse(transport);
    } catch(error) {
      response = transport;
    }

    this.meter.setRotation(response.percentage);

    this.setMeters(parseInt(response.total_length / 100, 10));

    this.setLatestTrack(response.latest_track);
  },

  setMeters: function(length) {
    
    this.targetMeters = length;

    var myScope = this;

    setTimeout(function() {
      myScope.updateMeters();
    }, 100);

  },

  updateMeters: function() {

    if (this.targetMeters - this.meters > 1) {

      this.meters += (this.targetMeters - this.meters) / 9;

      var myScope = this;

      setTimeout(function() {
        myScope.updateMeters();
      }, 50);
      
    } else {
    
      this.meters = this.targetMeters;  

    }

    var length = (parseInt(this.meters, 10).toString());

    while(length.length < 7) {
      length = "0" + length;
    }

    $('lengthMeter').update(length);

  },

  setLatestTrack: function(track) {

    $('lastTrackHolder').writeAttribute({onclick: 'contentLoader.loadContent(\'/tracks/' + track.id + '\', true)'});
    $('latestTrackReflection').writeAttribute({onclick: 'contentLoader.loadContent(\'/tracks/' + track.id + '\', true)'});

    var newTag = '<div><img width="122" height="182" src="';
    newTag += track.imagedata;
    newTag += '" /><div class="background"></div><div><div class="header">LATEST TRACK</div><div id="latestInfo">';
    newTag += track.trackname.toUpperCase() + "<br>";
    newTag += track.username.toUpperCase() + "<br>";
    newTag += (Math.round(track.length * 10) / 10).toString() + " METER";
    newTag += "</div></div></div>";

    $('lastTrackHolder').update(newTag);

  }

});var ContentLoader = Class.create({
  
  initialize: function() {

    this.visibleList = null;
    this.loadingInterval = null;
    this.oldMode = null;
    this.oldContent = null;

    this.setInitialScreen();

    this.editor = new Editor(staticCanvas, dynamicCanvas, imageCanvas);
    this.editor.x = editorPosition.left;
    this.editor.y = editorPosition.top;

    this.showroom = new Showroom(staticCanvas, dynamicCanvas);
    this.showroom.x = editorPosition.left;
    this.showroom.y = editorPosition.top;

    var thisClass = this;
      
    Pattern.context = meterCanvas.getContext("2d");
    Pattern.loadPattern([
      {name: "meterBackground", path: "./images/sidebar-meter-background.png"},
      {name: "meterForeground", path: "./images/sidebar-meter-foreground.png"},
      {name: "meterPointer", path: "./images/sidebar-meter-pointer.png"},
      {name: "fieldBackground", path: "./images/background-yellow.png"}
    ]);

    Pattern.onload = function() {
      sidebarController = new SidebarController();

      /* set page and search value on initial site call */
      var path = window.location.href;
      var strippedLink = path.substr(path.indexOf("/", 7))
      if (strippedLink.substr(0, 8) == "/tracks?") {

        strippedLink = strippedLink.substr(8);
        var params = strippedLink.split("&");

        for (var i = 0; i < params.length; i++) {
          
          var keyValue = params[i].split("=");

          var key = keyValue[0];
          var value = keyValue[1];

          if (key == "page") {
            currentPage = value;
          } else if (key == "search") {
            currentKeyWord = value;
            document.getElementById('searchField').value = value;
          } else if (key == "sorting") {
            currentSorting = value;
          }
        }
      }

      // dirty fix to remove not allowed xss request
      path = '/tracks/new';

      thisClass.loadContent(path);
    };

  }, 

  loadContent: function(path, setPath) {

    this.parseResponse({responseJSON: {mode: "load"}});

    if (path === "/about" || path === "/imprint" || path === "/contact") {

      this.parseResponse({responseJSON: {mode: path.substr(1)}}, setPath);
      return;

    } 

    var thisClass = this;

    /*var request = new Ajax.Request(path, {
      method: 'get',
      requestHeaders: {Accept: 'application/json'},

      onSuccess: function(transport) {
        thisClass.parseResponse.call(thisClass, transport, setPath);
      },

      onFailure: function(transport) {
        thisClass.parseResponse.call(thisClass, transport, false);
      }
    });*/

    jQuery.ajax({
      url: "http://marblerun.at" + path,
      type: 'GET',
      headers: {
        "Accept": "application/json"
      },
      data: {
      },
      success: function(transport) {
        
        try {
          transport = JSON.parse(transport);
        } catch(error) {
          transport = transport;
        }

        thisClass.parseResponse.call(thisClass, { responseJSON: transport }, setPath);
      },

      error: function(transport) {

        try {
          transport = JSON.parse(transport);
        } catch(error) {
          transport = transport;
        }

        thisClass.parseResponse.call(thisClass, { responseJSON: transport }, false);
      }
    });

  },

  parseResponse: function(jsonContent, setPath) {

    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
    }

    if (typeof(setPath) === "undefined") {
      setPath = true;
    }

    var content = jsonContent.responseJSON;
    var path;

    this.visibleList = [];
    
    if (content.mode != "show") {
      this.showroom.tweenMode = false;
    }

    if (this.oldContent) {
      this.oldContent.quit();
    }

    switch(content.mode) {
      
      case "build":
        this.oldContent = this.editor;
        this.createBuildMode(content);
        path = "/tracks/new";
      break;

      case "show":  
        this.oldContent = this.showroom;  
        this.createShowMode(content);
        trackStore.addTrack(content.track);
        path = "/tracks/" + content.track.id;
        setSwitchMode("none");
      break;

      case "overview":
        this.oldContent = null;
        this.createOverviewMode(content);
        path = "/tracks?page=" + currentPage;
      
        if (currentKeyWord.length > 0) {
          path += "&search=" + currentKeyWord;
        }

        if (currentSorting.length > 0) {
          path += "&sorting=" + currentSorting;
        }

      break;

      case "about":
      case "imprint":
      case "contact":
        this.oldContent = null;
        this.visibleList = [content.mode + "Page"];
        path = "/" + content.mode;
      break;

      case "load":
        this.oldContent = null;
        setPath = false;
        this.visibleList = ["loadingPage"];
        this.loadingInterval = setInterval(function() {
          $("loadingPage").toggleClassName("blink");
        }, 500);
      break;

      case "failure":
        this.oldContent = null;
        this.visibleList = ["errorPage"];
        $("errorMessage").update(content.message.toUpperCase());
      break;

    }

    this.oldMode = content.mode;

    setToggleElementsVisibility(this.visibleList);

    if (setPath) {
      //this.pushURL(path, jsonContent);
    }

    $('helpBox').setStyle({display: "none"});
    $('helpButton').removeClassName('active');

  },

  createBuildMode: function(content, visibleList) {

    setBuildTweetButton();
    setSwitchMode("build");

    this.editor.init();

    $('editor').setStyle({height: "560px"});

    this.visibleList = [
      "editorControlsTop", "editorControlsBottom", 
      "editorToolboxTop", "editorToolboxBottom", 
      "staticCanvas", "dynamicCanvas", "editorRuler"
    ];
    
  },

  createShowMode: function(content) {

    setTrackTweetButton(content.track.id);
    setSwitchMode("view");

    this.showroom.parseTrack(content.track);
    this.showroom.init();

    $('tableTrack').update(content.track.trackname.toUpperCase());
    $('tableBuilder').update(content.track.username.toUpperCase());
    $('tableLength').update((parseInt(content.track.length * 10, 10)) / 10 + " METER");
    $('tableDate').update(content.track.date);
    $('tableTime').update(content.track.time);
    $('tableLikes').update(content.track.likes);

    $('editor').setStyle({height: "520px"});

    this.visibleList = [
      "showroomControlsTop", "showroomControlsBottom",
      "showroomDetail", "staticCanvas", "dynamicCanvas"
    ];

  },

  createOverviewMode: function(content) {

    setSwitchMode("view");
    currentPage = content.current_page;

    $('overviewPageDisplay').update("" + content.current_page + " / " + content.total_pages);

    $('overviewPreviousButton').removeClassName("inactive");
    $('overviewNextButton').removeClassName("inactive");

    if (content.current_page <= 1) {

      $('overviewPreviousButton').addClassName("inactive");

    }

    if (content.current_page >= content.total_pages) {

      $('overviewNextButton').addClassName("inactive");

    } 
    
    
    var htmlString = "<ul>", i, next = null, previous = null;

    if (content.tracks.length == 0) {
      htmlString = '<p class="no-track-warning">No track found</p>';
    }

    for (i = 0; i < content.tracks.length; i++) {

      if (i === content.tracks.length - 1) {
        next = null;
      } else {
        next = content.tracks[i + 1].id;
      }

      trackStore.addTrack(content.tracks[i], next, previous);

      previous = content.tracks[i].id;

      var listString = "<li>";

      listString += '<a onclick="trackStore.loadTrack(' + content.tracks[i].id + ', contentLoader.parseResponse, contentLoader)"><img src="' + content.tracks[i].imagedata + '"></a>';
      listString += '<ul>';
      listString += '<li class="trackname">' + content.tracks[i].trackname + '</li>';
      listString += '<li class="username">' + content.tracks[i].username + '</li>';
      listString += '<li class="length">' + Math.round(content.tracks[i].length * 10) / 10 + ' Meter | LIKES ' + content.tracks[i].likes + '</li>';
      listString += '</ul>';

      listString += "</li>";

      htmlString += listString;
    }

    htmlString += "</ul>";

    $('overviewGrid').update(htmlString);

    this.visibleList = ["overviewControls", "overviewGrid"];
    
  }, 

  pushURL: function(path, content) {
    
    if (history && history.pushState) {
      
      history.pushState(content, "", path);

    }

  },

  onPopState: function(event) {

    this.parseResponse(event.state, false);

  },

  setInitialScreen: function() {
    
    if (!Cookie.get("isFirstVisit")) {
    
      $('firstVisitContainer').setStyle({visibility: "visible"});
      $('firstVisitText').setStyle({visibility: "visible"});
      $('firstVisitCloseButton').setStyle({visibility: "visible"});

      $('firstVisitCloseButton').observe('click', function(event) {
        $('firstVisitContainer').setStyle({visibility: "hidden"});
        $('firstVisitText').setStyle({visibility: "hidden"});
        $('firstVisitCloseButton').setStyle({visibility: "hidden"});
      });

    } else {

      $('firstVisitContainer').setStyle({visibility: "hidden"});
      $('firstVisitText').setStyle({visibility: "hidden"});
      $('firstVisitCloseButton').setStyle({visibility: "hidden"});
    }

    Cookie.set("isFirstVisit", true, {maxAge: 60 * 60 * 24 * 30 * 2});

    Cookie.likedTracks = JSON.parse(Cookie.get('likes')) || [];
    Cookie.flagedTracks = JSON.parse(Cookie.get('flags')) || [];

  }

});var TrackStore = Class.create({
  
  initialize: function() {
    this.tracks = {};
  },

  addTrack: function(track, next, previous) {

    if (this.tracks[track.id]) {
      if (next) {
        this.tracks[track.id].next = next;
      } 

      if (previous) {
        this.tracks[track.id].previous = previous;
      }

      return;
    }

    this.tracks[track.id] = {
      track: track,
      next: next,
      previous: previous
    }
  },

  getTrack: function(id) {
    if (!this.tracks[id]) {
      return null;
    } 
      
    return this.tracks[id].track;

  },

  loadTrack: function(id, callback, thisArgument, param) {

    if (this.tracks[id]) {
      if (callback) {
        callback.call(thisArgument, {responseJSON: {mode: "show", track: this.tracks[id].track}}, param);
        return;
      }
    }

    var thisClass = this;

    /*var request = new Ajax.Request("/tracks/" + id, {
      method: 'get',
      requestHeaders: {Accept: 'application/json'},

      onSuccess: function(transport) {
        thisClass.addTrack.call(thisClass, transport.responseJSON.track);

        if (callback) {
          callback.call(thisArgument, transport, param);
        }
      },

      onFailure: function(transport) {
      }

    });*/

    jQuery.ajax({
        url: "http://marblerun.at" + '/tracks/' + id,
        type: 'GET',
        headers: {
          "Accept": "application/json"
        },
        data: {
        },
        success: function(transport) {

          try {
            transport = JSON.parse(transport);
          } catch(error) {
            transport = transport;
          }
          
          thisClass.addTrack.call(thisClass, transport.track);

          if (callback) {
            callback.call(thisArgument, { responseJSON: transport }, param);
          }
        },

        error: function(transport) {
        }
      });

  },

  loadNext: function(id) {

    if (this.tracks[id] && this.tracks[id].next && this.tracks[this.tracks[id].next]) {
      return;
    }

    var thisClass = this;

    /*var request = new Ajax.Request("/tracks/" + id + "/next", {
      method: 'get',
      requestHeaders: {Accept: 'application/json'},

      onSuccess: function(transport) {
        thisClass.tracks[id].next = transport.responseJSON.track.id;
        thisClass.addTrack.call(thisClass, transport.responseJSON.track, null, id);
      },

      onFailure: function(transport) {
        thisClass.tracks[id].next = id;
      }

    });*/

    jQuery.ajax({
      url: "http://marblerun.at" + '/tracks/' + id + "/next",
      type: 'GET',
      headers: {
        "Accept": "application/json"
      },
      data: {
      },
      success: function(transport) {
        thisClass.tracks[id].next = transport.track.id;
        thisClass.addTrack.call(thisClass, transport.track, null, id);
      },

      error: function(transport) {
        thisClass.tracks[id].next = id;
      }
    });
  },

  loadPrevious: function(id) {
    if (this.tracks[id] && this.tracks[id].previous && this.tracks[this.tracks[id].previous]) {
      return;
    }

    var thisClass = this;

    /*var request = new Ajax.Request("/tracks/" + id + "/previous", {
      method: 'get',
      requestHeaders: {Accept: 'application/json'},

      onSuccess: function(transport) {
        thisClass.tracks[id].previous = transport.responseJSON.track.id;
        thisClass.addTrack.call(thisClass, transport.responseJSON.track, id, null);
      },

      onFailure: function(transport) {
        thisClass.tracks[id].previous = id;
      }

    });*/

    jQuery.ajax({
      url: "http://marblerun.at" + '/tracks/' + id + "/previous",
      type: 'GET',
      headers: {
        "Accept": "application/json"
      },
      data: {
      },
      success: function(transport) {
        thisClass.tracks[id].previous = transport.track.id;
        thisClass.addTrack.call(thisClass, transport.track, null, id);
      },

      error: function(transport) {
        thisClass.tracks[id].previous = id;
      }
    });
  },

  hasNext: function(id) {
    return (this.tracks[id].next !== null);
  },

  next: function(id) {
    if (this.hasNext(id)) {
      return this.tracks[id].next;
    }

    return null;
  },

  hasPrevious: function(id) {
    return (this.tracks[id].previous !== null);
  },

  previous: function(id) {
    if (this.hasPrevious(id)) {
      return this.tracks[id].previous;
    }

    return null;
  }

});
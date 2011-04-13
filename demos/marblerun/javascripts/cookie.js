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
})(window);
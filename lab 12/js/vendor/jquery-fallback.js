/**
 * CryptoPulse - Offline & Fallback jQuery Helper
 * Ensures complete application functionality if offline or CDN is unreachable.
 * If jQuery is loaded from CDN, this script yields to the official jQuery library.
 */
(function(window) {
  'use strict';

  if (window.jQuery) {
    // Official jQuery already present
    return;
  }

  console.info('[CryptoPulse] Loading local lightweight jQuery runtime fallback...');

  function JQ(selector, context) {
    if (!(this instanceof JQ)) {
      return new JQ(selector, context);
    }

    if (!selector) {
      this.elements = [];
      this.length = 0;
      return this;
    }

    if (typeof selector === 'function') {
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(selector, 1);
      } else {
        document.addEventListener('DOMContentLoaded', selector);
      }
      this.elements = [document];
      this.length = 1;
      return this;
    }

    if (selector instanceof JQ) {
      return selector;
    }

    if (selector.nodeType || selector === window) {
      this.elements = [selector];
      this.length = 1;
      return this;
    }

    if (Array.isArray(selector)) {
      this.elements = selector;
      this.length = selector.length;
      return this;
    }

    if (typeof selector === 'string') {
      const trimmed = selector.trim();
      if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
        const div = document.createElement('div');
        div.innerHTML = trimmed;
        this.elements = Array.from(div.children);
        this.length = this.elements.length;
        return this;
      }

      const root = context instanceof JQ ? context.elements[0] : (context || document);
      try {
        this.elements = Array.from(root.querySelectorAll(selector));
      } catch (err) {
        this.elements = [];
      }
      this.length = this.elements.length;
      return this;
    }

    this.elements = [];
    this.length = 0;
  }

  JQ.prototype = {
    constructor: JQ,

    each: function(callback) {
      this.elements.forEach((el, i) => callback.call(el, i, el));
      return this;
    },

    on: function(eventStr, selectorOrHandler, handler) {
      let isDelegated = typeof selectorOrHandler === 'string';
      let fn = isDelegated ? handler : selectorOrHandler;
      let targetSelector = isDelegated ? selectorOrHandler : null;

      const events = eventStr.split(' ');

      return this.each(function() {
        const el = this;
        events.forEach(ev => {
          if (!ev) return;
          const listener = function(e) {
            if (isDelegated) {
              const matchedTarget = e.target.closest(targetSelector);
              if (matchedTarget && el.contains(matchedTarget)) {
                fn.call(matchedTarget, e, e.detail);
              }
            } else {
              fn.call(el, e, e.detail);
            }
          };
          el.addEventListener(ev, listener);
        });
      });
    },

    off: function(eventStr, handler) {
      return this.each(function() {
        eventStr.split(' ').forEach(ev => {
          if (handler) this.removeEventListener(ev, handler);
        });
      });
    },

    trigger: function(eventName, data) {
      const ev = new CustomEvent(eventName, {
        bubbles: true,
        cancelable: true,
        detail: data
      });
      return this.each(function() {
        this.dispatchEvent(ev);
      });
    },

    find: function(selector) {
      const results = [];
      this.each(function() {
        if (this.querySelectorAll) {
          results.push(...Array.from(this.querySelectorAll(selector)));
        }
      });
      return new JQ(results);
    },

    closest: function(selector) {
      const results = [];
      this.each(function() {
        const match = this.closest ? this.closest(selector) : null;
        if (match && !results.includes(match)) results.push(match);
      });
      return new JQ(results);
    },

    parent: function() {
      const results = [];
      this.each(function() {
        if (this.parentElement && !results.includes(this.parentElement)) {
          results.push(this.parentElement);
        }
      });
      return new JQ(results);
    },

    children: function(selector) {
      const results = [];
      this.each(function() {
        Array.from(this.children).forEach(ch => {
          if (!selector || ch.matches(selector)) results.push(ch);
        });
      });
      return new JQ(results);
    },

    siblings: function(selector) {
      const results = [];
      this.each(function() {
        if (!this.parentElement) return;
        Array.from(this.parentElement.children).forEach(sib => {
          if (sib !== this && (!selector || sib.matches(selector))) {
            if (!results.includes(sib)) results.push(sib);
          }
        });
      });
      return new JQ(results);
    },

    html: function(content) {
      if (content === undefined) {
        return this.elements[0] ? this.elements[0].innerHTML : '';
      }
      return this.each(function() {
        this.innerHTML = content;
      });
    },

    text: function(content) {
      if (content === undefined) {
        return this.elements[0] ? this.elements[0].textContent : '';
      }
      return this.each(function() {
        this.textContent = content;
      });
    },

    val: function(content) {
      if (content === undefined) {
        return this.elements[0] ? this.elements[0].value : '';
      }
      return this.each(function() {
        this.value = content;
      });
    },

    attr: function(name, value) {
      if (value === undefined) {
        return this.elements[0] ? this.elements[0].getAttribute(name) : undefined;
      }
      return this.each(function() {
        this.setAttribute(name, value);
      });
    },

    removeAttr: function(name) {
      return this.each(function() {
        this.removeAttribute(name);
      });
    },

    data: function(key, value) {
      if (value === undefined) {
        if (!this.elements[0]) return undefined;
        return this.elements[0].dataset[key] !== undefined ? this.elements[0].dataset[key] : this.elements[0][`_data_${key}`];
      }
      return this.each(function() {
        this.dataset[key] = value;
        this[`_data_${key}`] = value;
      });
    },

    addClass: function(cls) {
      const classes = cls.split(' ').filter(Boolean);
      return this.each(function() {
        this.classList.add(...classes);
      });
    },

    removeClass: function(cls) {
      const classes = cls.split(' ').filter(Boolean);
      return this.each(function() {
        this.classList.remove(...classes);
      });
    },

    toggleClass: function(cls, state) {
      return this.each(function() {
        if (typeof state === 'boolean') {
          this.classList.toggle(cls, state);
        } else {
          this.classList.toggle(cls);
        }
      });
    },

    hasClass: function(cls) {
      return this.elements[0] ? this.elements[0].classList.contains(cls) : false;
    },

    css: function(prop, val) {
      if (typeof prop === 'string' && val === undefined) {
        return this.elements[0] ? window.getComputedStyle(this.elements[0])[prop] : '';
      }
      return this.each(function() {
        if (typeof prop === 'object') {
          Object.assign(this.style, prop);
        } else {
          this.style[prop] = val;
        }
      });
    },

    append: function(content) {
      return this.each(function() {
        if (typeof content === 'string') {
          this.insertAdjacentHTML('beforeend', content);
        } else if (content instanceof JQ) {
          content.elements.forEach(el => this.appendChild(el));
        } else if (content.nodeType) {
          this.appendChild(content);
        }
      });
    },

    prepend: function(content) {
      return this.each(function() {
        if (typeof content === 'string') {
          this.insertAdjacentHTML('afterbegin', content);
        } else if (content instanceof JQ) {
          content.elements.forEach(el => this.insertBefore(el, this.firstChild));
        } else if (content.nodeType) {
          this.insertBefore(content, this.firstChild);
        }
      });
    },

    empty: function() {
      return this.each(function() {
        this.innerHTML = '';
      });
    },

    remove: function() {
      return this.each(function() {
        if (this.parentNode) this.parentNode.removeChild(this);
      });
    },

    show: function() {
      return this.each(function() {
        this.style.display = '';
        if (window.getComputedStyle(this).display === 'none') {
          this.style.display = 'block';
        }
      });
    },

    hide: function() {
      return this.each(function() {
        this.style.display = 'none';
      });
    },

    fadeIn: function(duration = 300, callback) {
      return this.each(function() {
        this.style.opacity = '0';
        this.style.display = '';
        this.style.transition = `opacity ${duration}ms ease`;
        requestAnimationFrame(() => {
          this.style.opacity = '1';
        });
        setTimeout(() => {
          if (typeof callback === 'function') callback.call(this);
        }, duration);
      });
    },

    fadeOut: function(duration = 300, callback) {
      return this.each(function() {
        this.style.opacity = '1';
        this.style.transition = `opacity ${duration}ms ease`;
        requestAnimationFrame(() => {
          this.style.opacity = '0';
        });
        setTimeout(() => {
          this.style.display = 'none';
          if (typeof callback === 'function') callback.call(this);
        }, duration);
      });
    },

    slideDown: function(duration = 300, callback) {
      return this.each(function() {
        this.style.display = '';
        const prevOverflow = this.style.overflow;
        this.style.overflow = 'hidden';
        const height = this.scrollHeight;
        this.style.height = '0px';
        this.style.transition = `height ${duration}ms ease`;
        requestAnimationFrame(() => {
          this.style.height = height + 'px';
        });
        setTimeout(() => {
          this.style.height = '';
          this.style.overflow = prevOverflow;
          if (typeof callback === 'function') callback.call(this);
        }, duration);
      });
    },

    slideUp: function(duration = 300, callback) {
      return this.each(function() {
        const prevOverflow = this.style.overflow;
        this.style.overflow = 'hidden';
        this.style.height = this.scrollHeight + 'px';
        this.style.transition = `height ${duration}ms ease`;
        requestAnimationFrame(() => {
          this.style.height = '0px';
        });
        setTimeout(() => {
          this.style.display = 'none';
          this.style.height = '';
          this.style.overflow = prevOverflow;
          if (typeof callback === 'function') callback.call(this);
        }, duration);
      });
    }
  };

  // Static jQuery $.ajax Implementation
  JQ.ajax = function(options) {
    const opts = Object.assign({
      url: '',
      method: 'GET',
      type: 'GET',
      dataType: 'json',
      timeout: 10000,
      headers: {},
      data: null,
      beforeSend: null,
      success: null,
      error: null,
      complete: null
    }, options);

    const method = (opts.method || opts.type || 'GET').toUpperCase();
    const xhr = new XMLHttpRequest();

    const promise = new Promise((resolve, reject) => {
      xhr.open(method, opts.url, true);
      xhr.timeout = opts.timeout;

      if (opts.dataType === 'json') {
        xhr.setRequestHeader('Accept', 'application/json');
      }

      for (let header in opts.headers) {
        xhr.setRequestHeader(header, opts.headers[header]);
      }

      if (typeof opts.beforeSend === 'function') {
        opts.beforeSend(xhr, opts);
      }

      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          let responseData = xhr.responseText;
          if (opts.dataType === 'json') {
            try {
              responseData = JSON.parse(xhr.responseText);
            } catch (e) {
              console.warn('[$.ajax] JSON parse error, returning raw text.');
            }
          }
          if (typeof opts.success === 'function') {
            opts.success(responseData, 'success', xhr);
          }
          resolve(responseData);
        } else {
          const err = new Error(`HTTP Error ${xhr.status}: ${xhr.statusText}`);
          if (typeof opts.error === 'function') {
            opts.error(xhr, 'error', err);
          }
          reject(err);
        }
      };

      xhr.onerror = function() {
        const err = new Error('Network request failed');
        if (typeof opts.error === 'function') {
          opts.error(xhr, 'error', err);
        }
        reject(err);
      };

      xhr.ontimeout = function() {
        const err = new Error('Request timed out');
        if (typeof opts.error === 'function') {
          opts.error(xhr, 'timeout', err);
        }
        reject(err);
      };

      xhr.onloadend = function() {
        if (typeof opts.complete === 'function') {
          opts.complete(xhr, xhr.statusText);
        }
      };

      let sendPayload = opts.data;
      if (sendPayload && typeof sendPayload === 'object' && method !== 'GET') {
        sendPayload = JSON.stringify(sendPayload);
        xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
      }

      xhr.send(sendPayload);
    });

    // Provide .done(), .fail(), .always() promise chains
    promise.done = function(cb) {
      promise.then(data => cb(data, 'success', xhr));
      return promise;
    };
    promise.fail = function(cb) {
      promise.catch(err => cb(xhr, 'error', err));
      return promise;
    };
    promise.always = function(cb) {
      promise.finally(() => cb(xhr, xhr.statusText));
      return promise;
    };

    return promise;
  };

  JQ.getJSON = function(url, data, callback) {
    if (typeof data === 'function') {
      callback = data;
      data = undefined;
    }
    return JQ.ajax({
      url: url,
      dataType: 'json',
      data: data,
      success: callback
    });
  };

  window.$ = window.jQuery = JQ;
})(window);

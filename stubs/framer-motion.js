// Minimal framer-motion stub for web builds.
// Moti uses framer-motion on web — this stub renders children without
// animations so the build succeeds and the app loads.
'use strict';

var React = require('react');

var noop = function() {};

function makeMotionComponent(tag) {
  var Comp = React.forwardRef(function(props, ref) {
    var clean = {};
    var skip = {
      animate: 1, initial: 1, exit: 1, variants: 1, transition: 1,
      whileHover: 1, whileTap: 1, whileFocus: 1, whileDrag: 1,
      layout: 1, drag: 1, dragConstraints: 1, dragElastic: 1,
      onAnimationStart: 1, onAnimationComplete: 1, onUpdate: 1,
      style: 0, // keep style
    };
    Object.keys(props).forEach(function(k) {
      if (!skip[k]) clean[k] = props[k];
    });
    if (props.style) clean.style = props.style;
    if (ref) clean.ref = ref;
    return React.createElement(tag, clean, props.children);
  });
  Comp.displayName = 'motion.' + tag;
  return Comp;
}

// Only create components for known HTML tags, return null for symbols/internals
var tags = ['div','span','p','a','button','ul','li','ol','h1','h2','h3','h4','h5','h6',
  'nav','section','article','aside','header','footer','main','form','input','label',
  'img','svg','path','circle','rect','line','g'];

var motionCache = {};
tags.forEach(function(t) { motionCache[t] = makeMotionComponent(t); });

var motion = new Proxy(motionCache, {
  get: function(target, prop) {
    if (typeof prop === 'symbol') return undefined;
    if (prop === 'custom' || prop === 'create') {
      return function(Component) { return Component; };
    }
    if (target[prop]) return target[prop];
    return makeMotionComponent(prop);
  },
});

function AnimatePresence(props) {
  return props.children || null;
}
AnimatePresence.displayName = 'AnimatePresence';

function useAnimation() {
  return { start: noop, stop: noop, set: noop, subscribe: function() { return noop; } };
}

function useMotionValue(initial) {
  var val = initial;
  return {
    get: function() { return val; },
    set: function(v) { val = v; },
    on: function() { return noop; },
    destroy: noop,
    subscribe: function() { return noop; },
    getVelocity: function() { return 0; },
  };
}

function useTransform(value) {
  return useMotionValue(0);
}

function useSpring(initial) {
  return useMotionValue(typeof initial === 'number' ? initial : 0);
}

function useViewportScroll() {
  return {
    scrollX: useMotionValue(0),
    scrollY: useMotionValue(0),
    scrollXProgress: useMotionValue(0),
    scrollYProgress: useMotionValue(0),
  };
}

function useCycle(initial) { return [initial, noop]; }
function useReducedMotion() { return false; }
function usePresence() { return [true, noop]; }
function useIsPresent() { return true; }
function LazyMotion(props) { return props.children || null; }
function MotionConfig(props) { return props.children || null; }
function LayoutGroup(props) { return props.children || null; }

var Reorder = {
  Group: function(props) { return props.children || null; },
  Item: function(props) { return props.children || null; },
};

// moti's motify.tsx imports PresenceContext and calls useContext(PresenceContext).
// framer-motion defaults this to null (no AnimatePresence parent = always present).
var PresenceContext = React.createContext(null);

module.exports = {
  motion: motion,
  AnimatePresence: AnimatePresence,
  PresenceContext: PresenceContext,
  useAnimation: useAnimation,
  useMotionValue: useMotionValue,
  useTransform: useTransform,
  useSpring: useSpring,
  useViewportScroll: useViewportScroll,
  animate: noop,
  useCycle: useCycle,
  useReducedMotion: useReducedMotion,
  usePresence: usePresence,
  useIsPresent: useIsPresent,
  LazyMotion: LazyMotion,
  MotionConfig: MotionConfig,
  LayoutGroup: LayoutGroup,
  Reorder: Reorder,
  domAnimation: {},
  domMax: {},
};

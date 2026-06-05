const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Force supabase-js to use its CJS build — the .mjs ESM build contains
  // dynamic import() calls that break Metro's asyncRequire injection on web.
  if (moduleName === '@supabase/supabase-js') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/@supabase/supabase-js/dist/index.cjs'),
      type: 'sourceFile',
    };
  }
  // supabase-js v2.46+ optionally imports @opentelemetry/api — stub it out.
  if (moduleName === '@opentelemetry/api') {
    return { type: 'empty' };
  }
  // framer-motion has a tslib CJS/ESM interop bug with Metro web bundler.
  // Replace with a minimal stub so moti renders without animations on web.
  if (moduleName === 'framer-motion') {
    return {
      filePath: path.resolve(__dirname, 'stubs/framer-motion.js'),
      type: 'sourceFile',
    };
  }
  return originalResolveRequest
    ? originalResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

// Force framer-motion (and tslib) to use the CJS entry point —
// Metro's package-exports resolution picks tslib/modules/index.js which
// has a CJS/ESM interop bug when bundling framer-motion for web.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  tslib: path.resolve(__dirname, 'node_modules/tslib'),
};

// Exclude tslib from package-exports resolution so Metro always uses
// the main tslib.js CJS file, not the modules/index.js wrapper.
const defaultExportsFields = config.resolver.unstable_conditionNames || [];
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: './global.css' });

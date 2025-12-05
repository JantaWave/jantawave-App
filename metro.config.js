// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const resolveFrom = require('resolve-from'); // <-- Import resolve-from

// 1. Get the default Expo configuration
const config = getDefaultConfig(__dirname);

// 2. APPLY THE WEBRTC/RESOLVER FIX
// This logic resolves conflicts with 'event-target-shim' in modern Expo SDKs.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Check if the bundle is resolving "event-target-shim"
  if (moduleName.startsWith('event-target-shim')) {
    // Check if it's being resolved by a module that depends on the WebRTC version
    if (context.originModulePath.includes('react-native-webrtc')) {
      const updatedModuleName = moduleName.endsWith('/index')
        ? moduleName.replace('/index', '')
        : moduleName;

      // Force Metro to use the version that rn-webrtc requires
      const eventTargetShimPath = resolveFrom(context.originModulePath, updatedModuleName);

      return {
        filePath: eventTargetShimPath,
        type: 'sourceFile',
      };
    }
  }

  // Ensure you call the default resolver for everything else
  return context.resolveRequest(context, moduleName, platform);
};

// 3. APPLY THE NATIVEWIND WRAPPER
// The module.exports must wrap the modified config with NativeWind
module.exports = withNativeWind(config, { input: './global.css' });

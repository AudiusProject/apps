#import "AppDelegate.h"
#import "RNBootSplash.h"

#import <GoogleCast/GoogleCast.h>
#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <ReactAppDependencyProvider/RCTAppDependencyProvider.h>
#import <React/RCTRootView.h>
#import <React/RCTLinkingManager.h>
#import "RNNotifications.h"
#import <TiktokOpensdkReactNative-Bridging-Header.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application
   openURL:(NSURL *)url
   options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  BOOL handledByTikTokOpenSDK = [TiktokOpensdkReactNative handleOpenURL:url];
  BOOL handledByRNLinkingManager = [RCTLinkingManager application:application openURL:url options:options];
  return handledByTikTokOpenSDK || handledByRNLinkingManager;
}

// Only if your app is using [Universal Links](https://developer.apple.com/library/prerelease/ios/documentation/General/Conceptual/AppSearch/UniversalLinks.html).
- (BOOL)application:(UIApplication *)application continueUserActivity:(NSUserActivity *)userActivity
 restorationHandler:(void (^)(NSArray * _Nullable))restorationHandler
{
  BOOL handledByTikTokOpenSDK = [TiktokOpensdkReactNative handleUserActivity:userActivity];
  BOOL handledByRNLinkingManager = [RCTLinkingManager application:application
                  continueUserActivity:userActivity
                    restorationHandler:restorationHandler];
  return handledByTikTokOpenSDK || handledByRNLinkingManager;
}

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  [RNNotifications startMonitorNotifications];
  NSString *receiverAppID = @"222B31C8";
  GCKDiscoveryCriteria *criteria = [[GCKDiscoveryCriteria alloc] initWithApplicationID:receiverAppID];
  GCKCastOptions* options = [[GCKCastOptions alloc] initWithDiscoveryCriteria:criteria];
  // Allow our app to control chromecast volume
  options.physicalVolumeButtonsWillControlDeviceVolume = YES;
  // Prevent backgrounding from suspending sessions
  options.suspendSessionsWhenBackgrounded = NO;
  [GCKCastContext setSharedInstanceWithOptions:options];

  self.moduleName = @"AudiusReactNative";
  self.dependencyProvider = [RCTAppDependencyProvider new];
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};
  [super application:application didFinishLaunchingWithOptions:launchOptions];

  return YES;
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  // React Native 0.77 - explicitly set Metro URL
  NSURL *url = [NSURL URLWithString:@"http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false"];
  NSLog(@"[AppDelegate] DEBUG mode - Using Metro URL: %@", url);
  return url;
#else
  NSURL *url = [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
  NSLog(@"[AppDelegate] RELEASE mode - Using bundled file: %@", url);
  return url;
#endif
}

- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken {
  [RNNotifications didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error {
  [RNNotifications didFailToRegisterForRemoteNotificationsWithError:error];
}

- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo fetchCompletionHandler:(void (^)(UIBackgroundFetchResult result))completionHandler {
  [RNNotifications didReceiveBackgroundNotification:userInfo withCompletionHandler:completionHandler];
}

- (void)customizeRootView:(RCTRootView *)rootView {
  [super customizeRootView:rootView];
  [RNBootSplash initWithStoryboard:@"BootSplash" rootView:rootView]; // ⬅️ initialize the splash screen
}

@end

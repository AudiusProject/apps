#import "AppDelegate.h"
#import "RNBootSplash.h"
#import "SceneDelegate.h"
#import <CodePush/CodePush.h>

#import <GoogleCast/GoogleCast.h>
#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <ReactAppDependencyProvider/RCTAppDependencyProvider.h>
#import "RNNotifications.h"

@implementation AppDelegate {
  NSDictionary *_launchOptions;
  UIViewController *_rootViewController;
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

  // The window belongs to the scene, so React Native starts in SceneDelegate.
  self.automaticallyLoadReactNativeWindow = NO;
  _launchOptions = launchOptions;

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (UISceneConfiguration *)application:(UIApplication *)application
    configurationForConnectingSceneSession:(UISceneSession *)connectingSceneSession
                                   options:(UISceneConnectionOptions *)options
{
  UISceneConfiguration *configuration =
      [[UISceneConfiguration alloc] initWithName:@"Default Configuration" sessionRole:connectingSceneSession.role];
  configuration.delegateClass = [SceneDelegate class];
  return configuration;
}

- (UIWindow *)loadReactNativeWindowInScene:(UIWindowScene *)scene
                         connectionOptions:(UISceneConnectionOptions *)connectionOptions
{
  UIWindow *window = [[UIWindow alloc] initWithWindowScene:scene];

  // A reconnecting scene reuses the running app instead of mounting a second root.
  if (_rootViewController == nil) {
    NSDictionary *launchOptions = [self launchOptionsWithConnectionOptions:connectionOptions];
    UIView *rootView = [self.rootViewFactory viewWithModuleName:self.moduleName
                                              initialProperties:self.initialProps
                                                  launchOptions:launchOptions];
    _rootViewController = [self createRootViewController];
    [self setRootView:rootView toRootViewController:_rootViewController];
  }

  window.rootViewController = _rootViewController;
  // Native modules still read the window from the app delegate.
  self.window = window;
  [window makeKeyAndVisible];
  return window;
}

// Scene apps get the launch URL, user activity and notification through the
// connection options rather than launchOptions. Linking.getInitialURL and
// Notifications.getInitialNotification read them from the bridge's launchOptions.
- (NSDictionary *)launchOptionsWithConnectionOptions:(UISceneConnectionOptions *)connectionOptions
{
  NSMutableDictionary *launchOptions = [NSMutableDictionary dictionaryWithDictionary:_launchOptions ?: @{}];

  NSURL *url = connectionOptions.URLContexts.anyObject.URL;
  if (url != nil) {
    launchOptions[UIApplicationLaunchOptionsURLKey] = url;
  }

  NSUserActivity *userActivity = connectionOptions.userActivities.anyObject;
  if (userActivity != nil) {
    launchOptions[UIApplicationLaunchOptionsUserActivityDictionaryKey] = @{
      UIApplicationLaunchOptionsUserActivityTypeKey : userActivity.activityType,
      @"UIApplicationLaunchOptionsUserActivityKey" : userActivity,
    };
  }

  NSDictionary *notification = connectionOptions.notificationResponse.notification.request.content.userInfo;
  if (notification != nil && launchOptions[UIApplicationLaunchOptionsRemoteNotificationKey] == nil) {
    launchOptions[UIApplicationLaunchOptionsRemoteNotificationKey] = notification;
  }

  return launchOptions;
}

// Override customizeRootView for React Native 0.74+ with new architecture
- (void)customizeRootView:(RCTRootView *)rootView {
  [super customizeRootView:rootView];
  [RNBootSplash initWithStoryboard:@"BootSplash" rootView:rootView];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [CodePush bundleURL];
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

@end

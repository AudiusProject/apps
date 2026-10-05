#import "SceneDelegate.h"
#import "AppDelegate.h"

#import <React/RCTLinkingManager.h>
#import <TiktokOpensdkReactNative-Bridging-Header.h>

@implementation SceneDelegate

- (void)scene:(UIScene *)scene
    willConnectToSession:(UISceneSession *)session
                 options:(UISceneConnectionOptions *)connectionOptions
{
  if (![scene isKindOfClass:[UIWindowScene class]]) {
    return;
  }

  AppDelegate *appDelegate = (AppDelegate *)UIApplication.sharedApplication.delegate;
  self.window = [appDelegate loadReactNativeWindowInScene:(UIWindowScene *)scene connectionOptions:connectionOptions];

  // React Native reads the launch URL from launchOptions. TikTok still needs
  // to see it here.
  for (UIOpenURLContext *context in connectionOptions.URLContexts) {
    [TiktokOpensdkReactNative handleOpenURL:context.URL];
  }
  for (NSUserActivity *userActivity in connectionOptions.userActivities) {
    [TiktokOpensdkReactNative handleUserActivity:userActivity];
  }
}

- (void)scene:(UIScene *)scene openURLContexts:(NSSet<UIOpenURLContext *> *)URLContexts
{
  for (UIOpenURLContext *context in URLContexts) {
    [TiktokOpensdkReactNative handleOpenURL:context.URL];
    [RCTLinkingManager application:UIApplication.sharedApplication openURL:context.URL options:@{}];
  }
}

- (void)scene:(UIScene *)scene continueUserActivity:(NSUserActivity *)userActivity
{
  [TiktokOpensdkReactNative handleUserActivity:userActivity];
  [RCTLinkingManager application:UIApplication.sharedApplication
            continueUserActivity:userActivity
              restorationHandler:^(NSArray<id<UIUserActivityRestoring>> *_Nullable objects){}];
}

@end

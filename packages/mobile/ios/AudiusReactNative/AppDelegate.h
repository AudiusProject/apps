#import <RCTAppDelegate.h>
#import <UIKit/UIKit.h>

@interface AppDelegate : RCTAppDelegate

// Starts React Native in a window owned by the given scene. Called by
// SceneDelegate when the scene connects.
- (UIWindow *)loadReactNativeWindowInScene:(UIWindowScene *)scene
                         connectionOptions:(UISceneConnectionOptions *)connectionOptions;

@end

#import "AudiusHinge.h"

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

static NSString *const AudiusHingeDidChangeNotification = @"AudiusHingeDidChange";
static NSDictionary *latestHingeState = nil;

@interface AudiusHingeEmitter : RCTEventEmitter <RCTBridgeModule>
@end

@implementation AudiusHinge

+ (void)observeHingeForView:(UIView *)view
{
#if __IPHONE_OS_VERSION_MAX_ALLOWED >= 270100
  if (@available(iOS 27.1, *)) {
    UIHingeInteraction *interaction = [[UIHingeInteraction alloc]
        initWithUpdateHandler:^(UIHingeInteraction *_, UIHingeInteractionUpdate *update) {
          UIHinge *hinge = update.hinge;
          NSDictionary *state;
          if (hinge == nil) {
            state = @{@"available" : @NO};
          } else {
            NSString *status;
            switch (hinge.status) {
              case UIHingeStatusClosed:
                status = @"closed";
                break;
              case UIHingeStatusPartiallyOpen:
                status = @"partiallyOpen";
                break;
              case UIHingeStatusFullyOpen:
                status = @"fullyOpen";
                break;
              default:
                status = @"unknown";
                break;
            }
            state = @{
              @"available" : @YES,
              @"status" : status,
              @"angle" : @(hinge.angle * 180.0 / M_PI)
            };
          }
          latestHingeState = state;
          [[NSNotificationCenter defaultCenter] postNotificationName:AudiusHingeDidChangeNotification
                                                              object:nil
                                                            userInfo:state];
        }];
    [view addInteraction:interaction];
  }
#endif
}

@end

@implementation AudiusHingeEmitter {
  BOOL _hasListeners;
}

RCT_EXPORT_MODULE(AudiusHinge);

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[ @"hingeChanged" ];
}

- (void)startObserving
{
  _hasListeners = YES;
  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(hingeDidChange:)
                                               name:AudiusHingeDidChangeNotification
                                             object:nil];
}

- (void)stopObserving
{
  _hasListeners = NO;
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void)hingeDidChange:(NSNotification *)notification
{
  if (_hasListeners) {
    [self sendEventWithName:@"hingeChanged" body:notification.userInfo];
  }
}

RCT_EXPORT_METHOD(getState
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)
{
  resolve(latestHingeState ?: @{@"available" : @NO});
}

@end

package co.audius.app

import android.content.Intent
import android.os.Bundle
import com.bytedance.sdk.open.tiktok.TikTokOpenApiFactory
import com.bytedance.sdk.open.tiktok.TikTokOpenConfig
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.bridge.Arguments
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.cast.framework.CastContext
import com.zoontek.rnbars.RNBars
import com.zoontek.rnbootsplash.RNBootSplash

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is
   * used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "AudiusReactNative"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)


  override fun invokeDefaultOnBackPressed() {
    // Not calling super. invokeDefaultOnBackPressed() b/c it will close the app.
    // Instead, put the app in the backgroud to allow audio to keep playing.
    moveTaskToBack(true)
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    // Disable React Native inspector to workaround RN 0.77 crash
    System.setProperty("react.native.inspector.disable", "true")
    
    RNBootSplash.init(this, R.style.BootTheme)
    super.onCreate(null)
    RNBars.init(this, "light-content")
    TikTokOpenApiFactory.init(TikTokOpenConfig(BuildConfig.TIKTOK_APP_ID))

    // lazy load Google Cast context
    CastContext.getSharedInstance(this)
  }

  override fun onDestroy() {
    // Check if this is a configuration change (e.g. rotation)
    // If it is, we don't want to do cleanup since the activity will be recreated
    if (!isChangingConfigurations) {
      // Emit an event to React Native so we can handle cleanup in JS
      val params = Arguments.createMap()
      reactInstanceManager
        .currentReactContext
        ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        ?.emit("ForceQuitDetected", params)
    }
    super.onDestroy()
  }
}

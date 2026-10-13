package co.audius.app

import android.content.Intent
import android.os.Bundle
import android.util.Log
import com.bytedance.sdk.open.tiktok.TikTokOpenApiFactory
import com.bytedance.sdk.open.tiktok.TikTokOpenConfig
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.bridge.Arguments
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.cast.framework.CastContext
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
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

    initCastContext()
  }

  /**
   * Lazy load the Google Cast context. Cast depends on Google Play Services,
   * which is missing on de-Googled devices (e.g. GrapheneOS, F-Droid users),
   * where getSharedInstance throws and would crash the app on launch.
   * react-native-google-cast already no-ops when Play Services is unavailable.
   */
  private fun initCastContext() {
    val playServicesState =
      GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(this)
    if (playServicesState != ConnectionResult.SUCCESS) return
    try {
      CastContext.getSharedInstance(this)
    } catch (e: Exception) {
      Log.w("MainActivity", "Google Cast unavailable", e)
    }
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

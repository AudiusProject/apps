package co.audius.app

import android.content.Intent
import android.net.Uri
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
    // Check if this is an oauth deep link and redirect to browser
    if (handleOAuthDeepLink(intent)) {
      finish()
      return
    }
    
    RNBootSplash.init(this, R.style.BootTheme)
    super.onCreate(null)
    RNBars.init(this, "light-content")
    TikTokOpenApiFactory.init(TikTokOpenConfig(BuildConfig.TIKTOK_APP_ID))

    // lazy load Google Cast context
    CastContext.getSharedInstance(this)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    
    // Check if this is an oauth deep link and redirect to browser
    if (handleOAuthDeepLink(intent)) {
      finish()
      return
    }
  }

  /**
   * Handles oauth deep links by opening them in the browser instead of the app.
   * Returns true if the intent was an oauth route and was handled.
   */
  private fun handleOAuthDeepLink(intent: Intent?): Boolean {
    if (intent == null) return false
    
    val data: Uri? = intent.data
    if (data != null) {
      val path = data.path
      // If the path starts with /oauth, open in browser instead
      if (path != null && path.startsWith("/oauth")) {
        val browserIntent = Intent(Intent.ACTION_VIEW, data)
        browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        startActivity(browserIntent)
        return true
      }
    }
    
    return false
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

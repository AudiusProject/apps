package co.audius.app;

import android.util.Base64;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Derives hedgehog wallet keys with scrypt off the JS thread. */
public class ScryptModule extends ReactContextBaseJavaModule {
  private final ExecutorService executor = Executors.newSingleThreadExecutor();

  public ScryptModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @NonNull
  @Override
  public String getName() {
    return "AudiusScrypt";
  }

  @ReactMethod
  public void scrypt(
      String passwdBase64, String saltBase64, int n, int r, int p, int dkLen, Promise promise) {
    executor.execute(
        () -> {
          try {
            byte[] key =
                Scrypt.derive(
                    Base64.decode(passwdBase64, Base64.NO_WRAP),
                    Base64.decode(saltBase64, Base64.NO_WRAP),
                    n,
                    r,
                    p,
                    dkLen);
            promise.resolve(Base64.encodeToString(key, Base64.NO_WRAP));
          } catch (Exception e) {
            // The message never includes the inputs.
            promise.reject("scrypt_failed", e.getMessage());
          }
        });
  }

  @Override
  public void invalidate() {
    executor.shutdown();
    super.invalidate();
  }
}

package co.audius.app;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/** scrypt (RFC 7914) built on the platform SHA-256. */
public final class Scrypt {
  private Scrypt() {}

  public static byte[] derive(byte[] passwd, byte[] salt, int n, int r, int p, int dkLen)
      throws NoSuchAlgorithmException {
    if (n < 2 || (n & (n - 1)) != 0) {
      throw new IllegalArgumentException("N must be a power of 2 greater than 1");
    }
    if (r < 1 || p < 1 || dkLen < 1) {
      throw new IllegalArgumentException("r, p and dkLen must be positive");
    }
    if (n > Integer.MAX_VALUE / 128 / r || p > Integer.MAX_VALUE / 128 / r) {
      throw new IllegalArgumentException("Parameters are too large");
    }

    HmacSha256 hmac = new HmacSha256(passwd);
    int blockLen = 128 * r;
    byte[] b = pbkdf2(hmac, salt, p * blockLen);

    int words = 32 * r;
    int[] x = new int[words];
    int[] y = new int[words];
    int[] v = new int[words * n];
    int[] t = new int[16];
    for (int i = 0; i < p; i++) {
      roMix(b, i * blockLen, r, n, x, y, v, t);
    }
    return pbkdf2(hmac, b, dkLen);
  }

  private static void roMix(byte[] b, int off, int r, int n, int[] x, int[] y, int[] v, int[] t) {
    int words = 32 * r;
    for (int k = 0; k < words; k++) {
      int o = off + 4 * k;
      x[k] = (b[o] & 0xff) | (b[o + 1] & 0xff) << 8 | (b[o + 2] & 0xff) << 16 | (b[o + 3] & 0xff) << 24;
    }
    for (int i = 0; i < n; i++) {
      System.arraycopy(x, 0, v, i * words, words);
      blockMix(x, y, r, t);
    }
    int last = (2 * r - 1) * 16;
    for (int i = 0; i < n; i++) {
      int j = x[last] & (n - 1);
      int vo = j * words;
      for (int k = 0; k < words; k++) {
        x[k] ^= v[vo + k];
      }
      blockMix(x, y, r, t);
    }
    for (int k = 0; k < words; k++) {
      int o = off + 4 * k;
      int w = x[k];
      b[o] = (byte) w;
      b[o + 1] = (byte) (w >>> 8);
      b[o + 2] = (byte) (w >>> 16);
      b[o + 3] = (byte) (w >>> 24);
    }
  }

  // Mixes the 2r 64-byte blocks of x in place. y is scratch space of the same size.
  private static void blockMix(int[] x, int[] y, int r, int[] t) {
    System.arraycopy(x, (2 * r - 1) * 16, t, 0, 16);
    for (int i = 0; i < 2 * r; i++) {
      for (int k = 0; k < 16; k++) {
        t[k] ^= x[i * 16 + k];
      }
      salsa208(t);
      // Even blocks go to the first half, odd blocks to the second.
      int dest = (i % 2 == 0 ? i / 2 : r + i / 2) * 16;
      System.arraycopy(t, 0, y, dest, 16);
    }
    System.arraycopy(y, 0, x, 0, 32 * r);
  }

  private static void salsa208(int[] b) {
    int x0 = b[0], x1 = b[1], x2 = b[2], x3 = b[3], x4 = b[4], x5 = b[5], x6 = b[6], x7 = b[7];
    int x8 = b[8], x9 = b[9], x10 = b[10], x11 = b[11], x12 = b[12], x13 = b[13], x14 = b[14],
        x15 = b[15];
    for (int i = 0; i < 8; i += 2) {
      x4 ^= Integer.rotateLeft(x0 + x12, 7);
      x8 ^= Integer.rotateLeft(x4 + x0, 9);
      x12 ^= Integer.rotateLeft(x8 + x4, 13);
      x0 ^= Integer.rotateLeft(x12 + x8, 18);
      x9 ^= Integer.rotateLeft(x5 + x1, 7);
      x13 ^= Integer.rotateLeft(x9 + x5, 9);
      x1 ^= Integer.rotateLeft(x13 + x9, 13);
      x5 ^= Integer.rotateLeft(x1 + x13, 18);
      x14 ^= Integer.rotateLeft(x10 + x6, 7);
      x2 ^= Integer.rotateLeft(x14 + x10, 9);
      x6 ^= Integer.rotateLeft(x2 + x14, 13);
      x10 ^= Integer.rotateLeft(x6 + x2, 18);
      x3 ^= Integer.rotateLeft(x15 + x11, 7);
      x7 ^= Integer.rotateLeft(x3 + x15, 9);
      x11 ^= Integer.rotateLeft(x7 + x3, 13);
      x15 ^= Integer.rotateLeft(x11 + x7, 18);
      x1 ^= Integer.rotateLeft(x0 + x3, 7);
      x2 ^= Integer.rotateLeft(x1 + x0, 9);
      x3 ^= Integer.rotateLeft(x2 + x1, 13);
      x0 ^= Integer.rotateLeft(x3 + x2, 18);
      x6 ^= Integer.rotateLeft(x5 + x4, 7);
      x7 ^= Integer.rotateLeft(x6 + x5, 9);
      x4 ^= Integer.rotateLeft(x7 + x6, 13);
      x5 ^= Integer.rotateLeft(x4 + x7, 18);
      x11 ^= Integer.rotateLeft(x10 + x9, 7);
      x8 ^= Integer.rotateLeft(x11 + x10, 9);
      x9 ^= Integer.rotateLeft(x8 + x11, 13);
      x10 ^= Integer.rotateLeft(x9 + x8, 18);
      x12 ^= Integer.rotateLeft(x15 + x14, 7);
      x13 ^= Integer.rotateLeft(x12 + x15, 9);
      x14 ^= Integer.rotateLeft(x13 + x12, 13);
      x15 ^= Integer.rotateLeft(x14 + x13, 18);
    }
    b[0] += x0;
    b[1] += x1;
    b[2] += x2;
    b[3] += x3;
    b[4] += x4;
    b[5] += x5;
    b[6] += x6;
    b[7] += x7;
    b[8] += x8;
    b[9] += x9;
    b[10] += x10;
    b[11] += x11;
    b[12] += x12;
    b[13] += x13;
    b[14] += x14;
    b[15] += x15;
  }

  // PBKDF2-HMAC-SHA256 with one iteration, which is all scrypt uses.
  private static byte[] pbkdf2(HmacSha256 hmac, byte[] salt, int dkLen) {
    byte[] out = new byte[dkLen];
    byte[] counter = new byte[4];
    for (int i = 1, pos = 0; pos < dkLen; i++, pos += 32) {
      counter[0] = (byte) (i >>> 24);
      counter[1] = (byte) (i >>> 16);
      counter[2] = (byte) (i >>> 8);
      counter[3] = (byte) i;
      byte[] u = hmac.mac(salt, counter);
      System.arraycopy(u, 0, out, pos, Math.min(32, dkLen - pos));
    }
    return out;
  }

  // javax.crypto's SecretKeySpec rejects empty keys, so HMAC is built on MessageDigest.
  private static final class HmacSha256 {
    private final MessageDigest md;
    private final byte[] ipad = new byte[64];
    private final byte[] opad = new byte[64];

    HmacSha256(byte[] key) throws NoSuchAlgorithmException {
      md = MessageDigest.getInstance("SHA-256");
      if (key.length > 64) {
        key = md.digest(key);
      }
      for (int i = 0; i < 64; i++) {
        int k = i < key.length ? key[i] : 0;
        ipad[i] = (byte) (k ^ 0x36);
        opad[i] = (byte) (k ^ 0x5c);
      }
    }

    byte[] mac(byte[] a, byte[] b) {
      md.reset();
      md.update(ipad);
      md.update(a);
      md.update(b);
      byte[] inner = md.digest();
      md.update(opad);
      md.update(inner);
      return md.digest();
    }
  }
}

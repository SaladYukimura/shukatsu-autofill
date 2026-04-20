// AES-256-GCM encryption using Web Crypto API (no external libraries)
// Key derivation: PBKDF2 (100,000 iterations, SHA-256)
const Crypto = (() => {
  const PBKDF2_ITERATIONS = 100000;

  function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  async function deriveKey(password, saltBuffer) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBuffer, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  return {
    async encrypt(plaintext, password) {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(password, salt.buffer);
      const enc = new TextEncoder();
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(JSON.stringify(plaintext))
      );
      return {
        salt: bufferToBase64(salt.buffer),
        iv: bufferToBase64(iv.buffer),
        data: bufferToBase64(encrypted)
      };
    },

    async decrypt(payload, password) {
      const key = await deriveKey(password, base64ToBuffer(payload.salt));
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: base64ToBuffer(payload.iv) },
        key,
        base64ToBuffer(payload.data)
      );
      const dec = new TextDecoder();
      return JSON.parse(dec.decode(decrypted));
    },

    // Verify password by attempting decryption (throws on wrong password)
    async verify(payload, password) {
      try {
        await this.decrypt(payload, password);
        return true;
      } catch {
        return false;
      }
    }
  };
})();

import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('Frontend Form Validation & Security Helpers', () => {
  test('Email validator enforces valid RFC patterns', () => {
    const validEmails = ['user@docuvault.app', 'priya.sharma@family.com', 'doctor@hospital.org'];
    const invalidEmails = ['plainaddress', '@missingusername.com', 'user@.com'];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of validEmails) {
      assert.strictEqual(emailRegex.test(email), true);
    }
    for (const email of invalidEmails) {
      assert.strictEqual(emailRegex.test(email), false);
    }
  });

  test('PIN code validator requires 4-6 numeric digits', () => {
    const pinRegex = /^\d{4,6}$/;
    assert.strictEqual(pinRegex.test('1234'), true);
    assert.strictEqual(pinRegex.test('987654'), true);
    assert.strictEqual(pinRegex.test('123'), false);
    assert.strictEqual(pinRegex.test('abcd'), false);
  });

  test('Document expiry calculator classifies warning states correctly', () => {
    const getExpiryStatus = (daysUntilExpiry, isExpired) => {
      if (isExpired) return 'EXPIRED';
      if (daysUntilExpiry !== null && daysUntilExpiry <= 7) return 'CRITICAL';
      if (daysUntilExpiry !== null && daysUntilExpiry <= 30) return 'WARNING';
      return 'VALID';
    };

    assert.strictEqual(getExpiryStatus(5, false), 'CRITICAL');
    assert.strictEqual(getExpiryStatus(20, false), 'WARNING');
    assert.strictEqual(getExpiryStatus(100, false), 'VALID');
    assert.strictEqual(getExpiryStatus(-2, true), 'EXPIRED');
  });

  test('File size formatter calculates human-readable representations', () => {
    const formatSize = (bytes) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    assert.strictEqual(formatSize(500), '500 B');
    assert.strictEqual(formatSize(24500), '23.9 KB');
    assert.strictEqual(formatSize(2500000), '2.4 MB');
  });

  test('QR share URL parser extracts clean token from absolute links', () => {
    const extractToken = (rawInput) => {
      let clean = rawInput.trim();
      if (clean.includes('/share/')) {
        clean = clean.split('/share/').pop()?.split('?')[0] || clean;
      }
      return clean;
    };

    assert.strictEqual(extractToken('http://localhost:5173/share/token12345'), 'token12345');
    assert.strictEqual(extractToken('https://digivault.app/share/tokenABC?ref=qr'), 'tokenABC');
    assert.strictEqual(extractToken('simple_opaque_token'), 'simple_opaque_token');
  });
});

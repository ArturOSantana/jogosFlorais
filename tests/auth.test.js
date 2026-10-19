import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAdminEmail } from '../src/auth.js';

const admins = ['admin@example.com', 'second@example.com'];

test('maps the terezinha.santa username to the primary admin email', () => {
  assert.equal(resolveAdminEmail('terezinha.santa', admins, ['terezinha.santa', 'another.alias']), 'admin@example.com');
});
test('accepts each admin email and the configured alias', () => {
  assert.equal(resolveAdminEmail('second@example.com', admins), 'second@example.com');
  assert.equal(resolveAdminEmail('another.alias', admins, ['another.alias']), 'admin@example.com');
});
test('rejects unknown logins and usernames without a configured admin email', () => {
  assert.equal(resolveAdminEmail('not-an-admin', admins, ['another.alias']), '');
  assert.equal(resolveAdminEmail('terezinha.santa', [], ['another.alias']), '');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAnalyticsIdentity } from '../src/lib/analyticsIdentity';

function fixture(initial = 'anonymous-browser') {
  let current = initial;
  const calls: string[] = [];
  const controller = createAnalyticsIdentity({
    getDistinctId: () => current,
    reset: () => { calls.push('reset'); current = 'new-anonymous-browser'; },
    identify: id => { calls.push(`identify:${id}`); current = id; },
    capture: (event, props) => { calls.push(`${event}:${current}`); assert.ok(!props || !('email' in props)); },
  });
  return { controller, calls };
}
test('waits for auth before the initial pageview and buffered events', () => {
  const { controller, calls } = fixture();
  controller.ready(); controller.capture('account_opened');
  assert.deepEqual(calls, []);
  controller.setUser('user-a');
  assert.deepEqual(calls, ['identify:account:user-a', '$pageview:account:user-a', 'account_opened:account:user-a']);
});
test('restored signed-in identity is reused without duplicate identify or pageviews', () => {
  const { controller, calls } = fixture('account:user-a');
  controller.setUser('user-a'); controller.ready(); controller.setUser('user-a');
  assert.deepEqual(calls, ['$pageview:account:user-a']);
});
test('logout clears the identified account before guest events', () => {
  const { controller, calls } = fixture('account:user-a');
  controller.ready(); controller.setUser('user-a'); controller.setUser(null); controller.capture('guest_event');
  assert.deepEqual(calls.slice(1), ['reset', 'guest_event:new-anonymous-browser']);
});
test('switching accounts resets before identification so accounts cannot merge', () => {
  const { controller, calls } = fixture('account:user-a');
  controller.setUser('user-b'); controller.ready();
  assert.deepEqual(calls, ['reset', 'identify:account:user-b', '$pageview:account:user-b']);
});
test('expired persisted identity is reset before initial anonymous pageview', () => {
  const { controller, calls } = fixture('account:expired');
  controller.ready(); controller.setUser(null);
  assert.deepEqual(calls, ['reset', '$pageview:new-anonymous-browser']);
});
test('returning guest retains anonymous browser identity', () => {
  const { controller, calls } = fixture();
  controller.setUser(null); controller.ready(); controller.setUser(null);
  assert.deepEqual(calls, ['$pageview:anonymous-browser']);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFollowCamera, type FollowMap, type MapPoint } from '../src/utils/followCamera';

test('uses overlapping native eases aimed ahead, rather than jumping each frame', () => {
  const follow = createFollowCamera();
  const calls: Array<Parameters<FollowMap['easeTo']>[0]> = [];
  const map = { isMoving: () => calls.length > 0, easeTo: (options: Parameters<FollowMap['easeTo']>[0]) => calls.push(options) };
  for (let time = 0; time < 2000; time += 16) follow.update(map, t => [t / 1000, 0], time);
  assert.ok(calls.length >= 8 && calls.length <= 10);
  assert.ok(calls.every(call => call.duration > 200 && call.easeId === calls[0].easeId && call.noMoveStart));
  assert.deepEqual(calls[0].center, [0.8, 0]);
});
test('constant-speed camera motion has no periodic stop or catch-up across retargets', () => {
  const follow = createFollowCamera();
  let time = 0;
  let began = 0;
  let start: MapPoint = [0, 0];
  let target: MapPoint = [0, 0];
  let duration = 0;
  const cameraAt = (now: number): MapPoint => {
    const p = duration ? Math.min(1, (now - began) / duration) : 0;
    return [start[0] + (target[0] - start[0]) * p, 0];
  };
  const map: FollowMap = {
    isMoving: () => duration > 0 && time < began + duration,
    easeTo: options => { start = cameraAt(time); target = options.center; duration = options.duration; began = time; },
  };
  // Irregular frames cross both the old one-second and two-second boundaries.
  for (time = 0; time < 5000; time += time % 3 ? 17 : 33) {
    follow.update(map, future => [future * 0.001, 0], time);
    assert.ok(Math.abs(cameraAt(time)[0] - time * 0.001) < 1e-9);
  }
});
test('leaves user zoom/recenter animations alone until they finish', () => {
  const follow = createFollowCamera();
  let moving = true;
  let count = 0;
  const map: FollowMap = { isMoving: () => moving, easeTo: () => count++ };
  follow.update(map, () => [0, 0], 0);
  assert.equal(count, 0);
  moving = false;
  follow.update(map, () => [0, 0], 600);
  assert.equal(count, 1);
  follow.release(); moving = true;
  follow.update(map, () => [0, 0], 900);
  assert.equal(count, 1);
});

test('stationary or landed targets do not keep restarting camera animations', () => {
  const follow = createFollowCamera();
  let count = 0;
  const map: FollowMap = { isMoving: () => false, easeTo: () => count++ };
  for (let time = 0; time < 3000; time += 16) follow.update(map, () => [10, 20], time);
  assert.equal(count, 1);
});

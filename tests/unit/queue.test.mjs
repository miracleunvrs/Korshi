import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyFailure, afterFailure, enqueue } from '../../src/features/sync/queue.ts';

test('RLS and validation failures never become network retries', () => {
  assert.equal(classifyFailure({ code: '42501' }), 'auth');
  assert.equal(classifyFailure({ code: '23514' }), 'validation');
  assert.equal(classifyFailure({ code: '23505' }), 'conflict');
  assert.equal(classifyFailure({ code: 'P0001' }), 'validation');
  assert.equal(classifyFailure(new TypeError('Failed to fetch')), 'transient');
  assert.equal(classifyFailure(new Error('Unknown error')), 'permanent');
});
const action = { id: 'a', userId: 'u', complexId: 'c', mutation: {}, createdAt: '', attempts: 0, status: 'pending', nextAttemptAt: 0 };
test('retry budget retains blocked action and stable idempotency key', () => {
  let item = action;
  for(let i=0;i<5;i++) item = afterFailure(item, new TypeError('Failed to fetch'), 100);
  assert.equal(item.status, 'blocked');
  assert.equal(item.id, 'a');
  assert.equal(item.attempts, 5);
  assert.ok(item.nextAttemptAt > 100);
});
test('permanent failures block immediately', () => {
  assert.equal(afterFailure(action, { code: '42501' }).status, 'blocked');
});
test('queue rejects overflow without silently dropping old actions', () => {
  const queue = Array.from({length:100}, (_,i)=>({...action,id:String(i)}));
  assert.throws(()=>enqueue(queue, action), /заполнена/);
  assert.equal(enqueue([action], action).length, 1);
  assert.equal(queue.length, 100);
});

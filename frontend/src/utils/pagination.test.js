import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deleteAndRefreshPage, getPageAfterDeletion } from './pagination.js';

test('keeps the current page when it remains valid after deletion', () => {
  assert.equal(getPageAfterDeletion(2, { totalPages: 2 }), 2);
});

test('moves back when deleting the only item on the last page', () => {
  assert.equal(getPageAfterDeletion(2, { totalPages: 1 }), 1);
});

test('returns to page one when the collection becomes empty', () => {
  assert.equal(getPageAfterDeletion(1, { totalPages: 0 }), 1);
});

test('preserves the current page when pagination metadata is unavailable or invalid', () => {
  assert.equal(getPageAfterDeletion(3, undefined), 3);
  assert.equal(getPageAfterDeletion(3, { totalPages: '2' }), 3);
});

test('deletes, reloads the same filters through the caller, and returns the previous valid page', async () => {
  const calls = [];
  const result = await deleteAndRefreshPage(
    2,
    async () => calls.push('delete'),
    async (page) => {
      calls.push(`reload:${page}`);
      return { meta: { pagination: { totalPages: 1 } } };
    }
  );

  assert.deepEqual(calls, ['delete', 'reload:2']);
  assert.equal(result.nextPage, 1);
});

test('does not reload or change the page when deletion fails', async () => {
  let reloadCalled = false;
  await assert.rejects(
    deleteAndRefreshPage(
      2,
      async () => { throw new Error('delete failed'); },
      async () => { reloadCalled = true; return { meta: { pagination: { totalPages: 1 } } }; }
    ),
    /delete failed/
  );
  assert.equal(reloadCalled, false);
  assert.equal(getPageAfterDeletion(2, undefined), 2);
});

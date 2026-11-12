import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeVotes, monthlyTransactions } from '../../src/features/dashboard/summary.ts';

test('empty financial data produces no fabricated chart', () => {
  assert.deepEqual(monthlyTransactions([]), []);
});

test('monthly chart aggregates actual transactions and separates years', () => {
  const result = monthlyTransactions([
    { occurredOn: '2026-09-02', direction: 'income', amount: 100 },
    { occurredOn: '14.09.2026', direction: 'income', amount: 50 },
    { occurredOn: '2026-09-15', direction: 'expense', amount: 30 },
    { occurredOn: '2025-09-15', direction: 'income', amount: 10 },
  ]);
  assert.deepEqual(result.map(({key, income, expense}) => ({key, income, expense})), [
    { key:'2025-09', income:10, expense:0 }, { key:'2026-09', income:150, expense:30 },
  ]);
});

test('only currently open votes appear in the dashboard', () => {
  const base = { startsAt:'2026-09-01T00:00:00Z', endsAt:'2026-10-01T00:00:00Z', status:'active' };
  const votes = [base, {...base,status:'draft'}, {...base,startsAt:'2026-09-30T00:00:00Z'}, {...base,endsAt:'2026-09-20T00:00:00Z'}];
  assert.deepEqual(activeVotes(votes, Date.parse('2026-09-25T00:00:00Z')), [base]);
  assert.deepEqual(activeVotes([], Date.now()), []);
});

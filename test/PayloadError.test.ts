import { PayloadError } from '../public/PayloadError.ts';
import { TestHarness } from './TestHarness.ts';

const harness = new TestHarness();

// ── body is null or non-JSON ──────────────────────────────────────

harness.add('result is empty when body is undefined', () => {
  const error = new PayloadError({ statusCode: 400 });

  TestHarness.assertEqual(error.result, []);
});

harness.add('result is empty when body is not JSON', () => {
  const error = new PayloadError({ statusCode: 400, body: 'Internal Server Error' });

  TestHarness.assertEqual(error.result, []);
});

harness.add('result is empty when body has no errors key', () => {
  const error = new PayloadError({ statusCode: 400, body: JSON.stringify({ status: 400 }) });

  TestHarness.assertEqual(error.result, []);
});

harness.add('result is empty when errors array is empty', () => {
  const error = new PayloadError({ statusCode: 400, body: JSON.stringify({ errors: [] }) });

  TestHarness.assertEqual(error.result, []);
});

// ── base fields ───────────────────────────────────────────────────

harness.add('result populates name', () => {
  const error = new PayloadError({
    statusCode: 400,
    body: JSON.stringify({ errors: [{ name: 'ValidationError', message: 'The following field is invalid: title' }] }),
  });

  TestHarness.assertEqual(error.result.length, 1);
  TestHarness.assertEqual(error.result[0].name, 'ValidationError');
});

harness.add('result populates message', () => {
  const error = new PayloadError({
    statusCode: 403,
    body: JSON.stringify({ errors: [{ name: 'Forbidden', message: 'You are not allowed to perform this action.' }] }),
  });

  TestHarness.assertEqual(error.result[0].message, 'You are not allowed to perform this action.');
});

harness.add('result populates field for Mongoose validation items', () => {
  const error = new PayloadError({
    statusCode: 400,
    body: JSON.stringify({ errors: [{ message: 'Value must be unique', field: 'email' }] }),
  });

  TestHarness.assertEqual(error.result[0].field, 'email');
});

harness.add('name is undefined when absent', () => {
  const error = new PayloadError({
    statusCode: 400,
    body: JSON.stringify({ errors: [{ message: 'Something went wrong' }] }),
  });

  TestHarness.assertEqual(error.result[0].name, undefined);
});

harness.add('field is undefined when absent', () => {
  const error = new PayloadError({
    statusCode: 403,
    body: JSON.stringify({ errors: [{ name: 'Forbidden', message: 'No access.' }] }),
  });

  TestHarness.assertEqual(error.result[0].field, undefined);
});

// ── json escape hatch ─────────────────────────────────────────────

harness.add('json contains raw entry including data block', () => {
  const error = new PayloadError({
    statusCode: 400,
    body: JSON.stringify({
      errors: [{
        name: 'ValidationError',
        message: 'The following field is invalid: title',
        data: {
          collection: 'posts',
          errors: [{ message: 'Required', path: 'title' }],
        },
      }],
    }),
  });

  TestHarness.assertEqual('data' in error.result[0].json, true);
});

harness.add('json allows consumer to read data block', () => {
  const error = new PayloadError({
    statusCode: 400,
    body: JSON.stringify({
      errors: [{
        name: 'ValidationError',
        message: 'The following field is invalid: title',
        data: {
          collection: 'posts',
          errors: [{ message: 'Required', path: 'title' }],
        },
      }],
    }),
  });

  const data = error.result[0].json['data'] as Record<string, unknown>;

  TestHarness.assertEqual(data['collection'], 'posts');
});

// ── multiple errors ───────────────────────────────────────────────

harness.add('result contains one entry per errors[] item', () => {
  const error = new PayloadError({
    statusCode: 400,
    body: JSON.stringify({
      errors: [
        { name: 'Forbidden', message: 'No access.' },
        { message: 'Something went wrong' },
      ],
    }),
  });

  TestHarness.assertEqual(error.result.length, 2);
  TestHarness.assertEqual(error.result[0].name, 'Forbidden');
  TestHarness.assertEqual(error.result[1].name, undefined);
});

harness.add('null items in errors array are skipped', () => {
  const error = new PayloadError({
    statusCode: 400,
    body: JSON.stringify({
      errors: [
        null,
        { name: 'Forbidden', message: 'No access.' },
      ],
    }),
  });

  TestHarness.assertEqual(error.result.length, 1);
  TestHarness.assertEqual(error.result[0].name, 'Forbidden');
});

// ── body and serverStack passthrough ─────────────────────────────

harness.add('body is preserved verbatim', () => {
  const body = JSON.stringify({ errors: [{ name: 'Forbidden', message: 'No access.' }] });
  const error = new PayloadError({ statusCode: 403, body });

  TestHarness.assertEqual(error.body, body);
});

harness.add('serverStack is undefined when absent', () => {
  const error = new PayloadError({ statusCode: 400, body: JSON.stringify({ errors: [] }) });

  TestHarness.assertEqual(error.serverStack, undefined);
});

harness.add('serverStack is populated from body', () => {
  const error = new PayloadError({
    statusCode: 400,
    body: JSON.stringify({ errors: [], stack: 'Error\n    at Object.<anonymous>' }),
  });

  TestHarness.assertEqual(error.serverStack, 'Error\n    at Object.<anonymous>');
});

// ── statusCode and message ────────────────────────────────────────

harness.add('statusCode is set', () => {
  const error = new PayloadError({ statusCode: 422 });

  TestHarness.assertEqual(error.statusCode, 422);
});

harness.add('message defaults to status code message', () => {
  const error = new PayloadError({ statusCode: 404 });

  TestHarness.assertEqual(error.message, '[PayloadError] Request failed with status: 404');
});

export async function testPayloadError() {
  await harness.run('Running PayloadError tests...\n');
}

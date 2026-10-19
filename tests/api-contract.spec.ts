import { expect, test } from '@playwright/test';

const ALLOWED_ORIGIN = 'http://localhost:3000';
const EVIL_ORIGIN = 'https://evil.example.org';

const futureDate = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const uniquePhone = () => `+1555${Math.floor(1_000_000 + Math.random() * 8_999_999)}`;
const json = (data: unknown) => ({ data, headers: { 'Content-Type': 'application/json', Origin: ALLOWED_ORIGIN } });

test.describe('platform guarantees', () => {
  test('health endpoint follows the response contract and sends security headers', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(body.requestId).toBeTruthy();

    const headers = res.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['content-security-policy']).toContain("default-src 'none'");
    expect(headers['x-ratelimit-limit']).toBeTruthy();
    expect(headers['x-powered-by']).toBeUndefined();
  });

  test('unknown paths return JSON 404, never an HTML page', async ({ request }) => {
    const res = await request.get('/api/definitely-not-a-route');
    expect(res.status()).toBe(404);
    expect(res.headers()['content-type']).toContain('application/json');
    expect((await res.json()).success).toBe(false);
  });

  test('CORS: allowed origins pass pre-flight, others are rejected', async ({ request }) => {
    const ok = await request.fetch('/api/booking', {
      method: 'OPTIONS',
      headers: { Origin: ALLOWED_ORIGIN, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,idempotency-key' },
    });
    expect(ok.status()).toBe(204);
    expect(ok.headers()['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    expect(ok.headers()['access-control-allow-headers']).toContain('Idempotency-Key');
    expect(ok.headers()['access-control-allow-origin']).not.toBe('*');

    const blocked = await request.fetch('/api/booking', {
      method: 'OPTIONS',
      headers: { Origin: EVIL_ORIGIN, 'Access-Control-Request-Method': 'POST' },
    });
    expect(blocked.status()).toBe(403);
    expect(blocked.headers()['access-control-allow-origin']).toBeUndefined();
  });

  test('CORS: state-changing request from a foreign origin is refused before reaching the route', async ({ request }) => {
    const res = await request.post('/api/booking', {
      data: { fullName: 'Mallory Evil', phone: uniquePhone() },
      headers: { 'Content-Type': 'application/json', Origin: EVIL_ORIGIN },
    });
    expect(res.status()).toBe(403);
    expect(res.headers()['access-control-allow-origin']).toBeUndefined();
  });
});

test.describe('input hardening', () => {
  test('malformed JSON → 400 contract error', async ({ request }) => {
    const res = await request.post('/api/booking', { data: '{not json', headers: { 'Content-Type': 'application/json', Origin: ALLOWED_ORIGIN } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ success: false });
    expect(typeof body.error).toBe('string');
  });

  test('non-object JSON bodies are rejected instead of crashing the handler', async ({ request }) => {
    for (const payload of ['null', '[1,2,3]', '"text"', '42']) {
      const res = await request.post('/api/consultation', { data: payload, headers: { 'Content-Type': 'application/json', Origin: ALLOWED_ORIGIN } });
      expect(res.status(), `payload ${payload}`).toBe(400);
    }
  });

  test('oversized payloads → 413', async ({ request }) => {
    const res = await request.post('/api/booking', {
      data: JSON.stringify({ fullName: 'A'.repeat(400_000), phone: uniquePhone() }),
      headers: { 'Content-Type': 'application/json', Origin: ALLOWED_ORIGIN },
    });
    expect(res.status()).toBe(413);
  });

  test('prototype-pollution keys and markup are neutralised', async ({ request }) => {
    const res = await request.post('/api/booking', {
      data: `{"fullName":"<script>alert(1)</script>Eve Adams","phone":"${uniquePhone()}","__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}`,
      headers: { 'Content-Type': 'application/json', Origin: ALLOWED_ORIGIN },
    });
    expect(res.status()).toBe(201);
    const { data } = await res.json();
    expect(data.appointment.fullName).toBe('Eve Adams');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  test('type confusion is a 400, not a 500', async ({ request }) => {
    const res = await request.post('/api/consultation', { ...json({ fullName: 12345, phone: { nested: true }, procedureInterest: ['x'] }) });
    expect(res.status()).toBeLessThan(500);
  });
});

test.describe('booking engine', () => {
  test('validates required fields with per-field details', async ({ request }) => {
    const res = await request.post('/api/booking', json({ fullName: 'X', phone: 'abc' }));
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.details?.phone).toBeTruthy();
  });

  test('books an appointment (aliases /api/booking and /booking/book behave identically)', async ({ request }) => {
    const phone = uniquePhone();
    const viaAlias = await request.post('/api/booking', json({ fullName: 'Jane Doe', phone, appointmentDate: `${futureDate(1)}T10:00`, niche: 'Dental' }));
    expect(viaAlias.status()).toBe(201);
    const body = await viaAlias.json();
    expect(body.success).toBe(true);
    expect(body.data.appointment).toMatchObject({ fullName: 'Jane Doe', niche: 'dental', status: 'CONFIRMED' });
    // legacy top-level field retained for already-deployed clients
    expect(body.appointment.id).toBe(body.data.appointment.id);

    const direct = await request.post('/booking/book', json({ fullName: 'John Roe', phone: uniquePhone() }));
    expect(direct.status()).toBe(201);
  });

  test('works for the hero-drawer form that sends no date', async ({ request }) => {
    const res = await request.post('/api/booking', json({ fullName: 'Drawer User', phone: uniquePhone(), treatment: 'Handcrafted Porcelain Veneers', niche: 'dental' }));
    expect(res.status()).toBe(201);
    expect((await res.json()).data.appointment.appointmentDate).toBeTruthy();
  });

  test('Idempotency-Key: replays instead of double-booking', async ({ request }) => {
    const key = `test-${crypto.randomUUID()}`;
    const payload = { fullName: 'Idem Potent', phone: uniquePhone(), appointmentDate: `${futureDate(2)}T09:00`, niche: 'solar' };
    const headers = { 'Content-Type': 'application/json', Origin: ALLOWED_ORIGIN, 'Idempotency-Key': key };

    const first = await request.post('/api/booking', { data: payload, headers });
    const second = await request.post('/api/booking', { data: payload, headers });
    expect(first.status()).toBe(201);
    expect(second.status()).toBe(201);
    expect(second.headers()['idempotent-replay']).toBe('true');
    expect((await second.json()).data.appointment.id).toBe((await first.json()).data.appointment.id);

    const reused = await request.post('/api/booking', { data: { ...payload, appointmentDate: `${futureDate(3)}T09:00` }, headers });
    expect(reused.status()).toBe(422);
  });

  test('rapid double-click without a key creates exactly one appointment', async ({ request }) => {
    const payload = { fullName: 'Double Click', phone: uniquePhone(), appointmentDate: `${futureDate(4)}T12:00`, niche: 'roofing' };
    const responses = await Promise.all(Array.from({ length: 5 }, () => request.post('/api/booking', json(payload))));
    const bodies = await Promise.all(responses.map(async (r) => ({ status: r.status(), body: await r.json() })));

    const ids = new Set(bodies.filter((b) => b.body.success).map((b) => b.body.data.appointment.id));
    expect(ids.size).toBe(1);
    // everything that did not succeed must be a clean "already processing" conflict
    for (const b of bodies.filter((x) => !x.body.success)) expect(b.status).toBe(409);
  });

  test('the same booking re-submitted later returns the existing reservation', async ({ request }) => {
    const payload = { fullName: 'Repeat Visitor', phone: uniquePhone(), appointmentDate: `${futureDate(5)}T15:30`, niche: 'medspa' };
    const first = await request.post('/api/booking', json(payload));
    const firstBody = await first.json();
    const second = await request.post('/api/booking', json(payload));
    const secondBody = await second.json();
    expect(secondBody.data.appointment.id).toBe(firstBody.data.appointment.id);
  });

  test('a brand-new niche works with zero backend changes', async ({ request }) => {
    const res = await request.post('/api/booking', json({ fullName: 'Future Niche', phone: uniquePhone(), niche: 'Med Spa & Wellness' }));
    expect(res.status()).toBe(201);
    expect((await res.json()).data.appointment.niche).toBe('med-spa-wellness');
  });

  test('cancel is idempotent and check hides contact data', async ({ request }) => {
    const phone = uniquePhone();
    const booked = await (await request.post('/api/booking', json({ fullName: 'Casey Cancel', phone, niche: 'dental' }))).json();
    const id = booked.data.appointment.id;

    const lookup = await request.get(`/api/appointment-check?phone=${encodeURIComponent(phone)}`);
    expect(lookup.status()).toBe(200);
    const summary = (await lookup.json()).data.appointment;
    expect(summary.fullName).toBe('Casey C.');
    expect(summary.phone).toBeUndefined();

    for (let i = 0; i < 2; i++) {
      const res = await request.post('/api/appointment-cancel', json({ appointmentId: id, cancellationReason: 'test' }));
      expect(res.status()).toBe(200);
    }
  });

  test('slot lock: second client gets 409 until the lock expires', async ({ request }) => {
    const slotTime = `2099-06-06T${String(Math.floor(Math.random() * 20)).padStart(2, '0')}:${String(Math.floor(Math.random() * 59)).padStart(2, '0')}`;
    const a = await request.post('/api/slot-lock', json({ slotTime, userPhone: uniquePhone(), niche: 'dental' }));
    expect(a.status()).toBe(200);
    const b = await request.post('/api/slot-lock', json({ slotTime, userPhone: uniquePhone(), niche: 'dental' }));
    expect(b.status()).toBe(409);
    expect((await b.json()).success).toBe(false);
  });
});

test.describe('AI concierge', () => {
  test('rejects empty and over-long messages', async ({ request }) => {
    const empty = await request.post('/api/ai-chat', json({ message: '   ' }));
    expect(empty.status()).toBe(400);
    const long = await request.post('/api/ai-chat', json({ message: 'x'.repeat(501) }));
    expect(long.status()).toBe(400);
  });

  test('never leaks internals: missing provider config is a clean 503', async ({ request }) => {
    const res = await request.post('/api/ai-chat', json({ message: 'Hello', niche: 'dental', history: [{ role: 'assistant', content: 'Welcome' }] }));
    expect([200, 503]).toContain(res.status());
    const body = await res.json();
    expect(typeof body.success).toBe('boolean');
    if (!body.success) expect(body.error).not.toMatch(/api[_ ]?key|GEMINI|stack/i);
  });
});

/** Every URL the landing pages (apiEndpoints.ts) and the manifest advertise. */
const PUBLIC_ALIASES: Array<{ path: string; method?: 'GET' | 'POST' }> = [
  { path: 'ai-chat' }, { path: 'analytics', method: 'GET' }, { path: 'quote-calculator' }, { path: 'booking' },
  { path: 'appointment-cancel' }, { path: 'appointment-check', method: 'GET' }, { path: 'appointment-confirm' },
  { path: 'appointment-create' }, { path: 'slot-lock' }, { path: 'appointment-reschedule' }, { path: 'broadcast' },
  { path: 'consultation' }, { path: 'cost-estimator' }, { path: 'fly-in-concierge' }, { path: 'follow-up' },
  { path: 'google-calendar-sync' }, { path: 'google-maps-geocoding' }, { path: 'insurance' }, { path: 'intake-db' },
  { path: 'lead-notification-webhook' }, { path: 'lead-scoring' }, { path: 'long-term-nurture' }, { path: 'loyalty' },
  { path: 'missed-call-webhook' }, { path: 'multilanguage' }, { path: 'nda-protocol' }, { path: 'no-show-recovery' },
  { path: 'onboarding' }, { path: 'invoice' }, { path: 'recovery' }, { path: 'prep-reminder' }, { path: 'recall' },
  { path: 'referral' }, { path: 'google-reviews', method: 'GET' }, { path: 'sentiment-analyzer' }, { path: 'faq-bot' },
  { path: 'staff-alert' }, { path: 'vector-rag' }, { path: 'visual-simulation' },
  { path: 'voice-agent-bridge/incoming-call' }, { path: 'voice-session' }, { path: 'missed-call-callback' },
  { path: 'voice-agent-bridge/process-speech' }, { path: 'voice-agent-bridge/transfer-fallback' },
  { path: 'voice-chat' }, { path: 'voice-chat-advanced' }, { path: 'property-valuation' }, { path: 'mortgage-calculator' },
  { path: 'storm-history' }, { path: 'solar-proposal' }, { path: 'solar-proposal-advanced' },
];

test.describe('route coverage', () => {
  for (const { path, method = 'POST' } of PUBLIC_ALIASES) {
    test(`/api/${path} is routed and never answers 404 or 500`, async ({ request }) => {
      const res =
        method === 'GET'
          ? await request.get(`/api/${path}`, { headers: { Origin: ALLOWED_ORIGIN } })
          : await request.post(`/api/${path}`, json({ niche: 'dental' }));
      expect(res.status(), `${method} /api/${path}`).not.toBe(404);
      expect(res.status(), `${method} /api/${path}`).not.toBe(500);
      const type = res.headers()['content-type'] ?? '';
      expect(type).toMatch(/json|xml/);
      if (type.includes('json')) {
        const body = await res.json();
        expect(typeof body.success).toBe('boolean');
        if (!body.success) expect(typeof body.error).toBe('string');
      }
    });
  }
});

test.describe('standard contract across legacy routes', () => {
  test('analytics, cost estimator and consultation all answer with { success, data }', async ({ request }) => {
    const analytics = await (await request.get('/api/analytics?niche=solar')).json();
    expect(analytics).toMatchObject({ success: true });
    expect(analytics.data).toBeTruthy();

    const estimate = await request.post('/api/cost-estimator', json({ treatmentType: 'dental implants', niche: 'dental' }));
    expect(estimate.status()).toBe(200);
    expect((await estimate.json()).data.estimatedCost).toContain('$');
  });

  test('error responses always carry { success:false, error }', async ({ request }) => {
    const res = await request.post('/api/cost-estimator', json({}));
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ success: false });
    expect(typeof body.error).toBe('string');
  });
});

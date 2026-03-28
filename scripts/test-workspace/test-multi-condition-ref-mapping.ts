/**
 * Regression test for MultiCondition UI slot → API slot mapping (no network).
 * Run: npm run test:workspace:mapping
 */
import { buildMultiConditionFilledEntries } from '../../src/lib/workspace/buildMultiConditionFilledEntries';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function run() {
  const start = 'https://example.com/start.jpg';

  // 1) Start only → slot 0
  let e = buildMultiConditionFilledEntries({
    refImageUrl: start,
    additionalImageUrls: [],
    endRefUrl: null,
  });
  assert(e.length === 1 && e[0].slotIndex === 0, 'Start-only should be single slot 0');

  // 2) Start + first additional (Key 2) — no referenceImage2Url prepend, only additionalRefUrls[0]
  e = buildMultiConditionFilledEntries({
    refImageUrl: start,
    additionalImageUrls: ['https://example.com/key2.jpg'],
    endRefUrl: null,
  });
  assert(e.length === 2, 'Start + Key2');
  assert(e[1].slotIndex === 1 && e[1].url.includes('key2'), 'additional[0] → slot 1');

  // 3) End frame must use endRefUrl (slot 4), not additional[0]
  e = buildMultiConditionFilledEntries({
    refImageUrl: start,
    additionalImageUrls: [],
    endRefUrl: 'https://example.com/end.jpg',
  });
  assert(e.some((x) => x.slotIndex === 4 && x.url.includes('end')), 'endRefUrl → slot 4');

  // 4) Page composes allAdditionalUrls as [referenceImage2Url?, ...additionalRefUrls]
  // So ref2 image becomes additionalImageUrls[0] → API slot 1 (not End)
  e = buildMultiConditionFilledEntries({
    refImageUrl: start,
    additionalImageUrls: ['https://example.com/ref2-as-first-additional.jpg'],
    endRefUrl: 'https://example.com/real-end.jpg',
  });
  const slot1 = e.find((x) => x.slotIndex === 1);
  const slot4 = e.find((x) => x.slotIndex === 4);
  assert(slot1?.url.includes('ref2-as-first'), 'prepended ref2 → slot 1');
  assert(slot4?.url.includes('real-end'), 'endingRefImageUrl → slot 4');

  // 5) Five distinct slots filled
  e = buildMultiConditionFilledEntries({
    refImageUrl: 'https://a/s',
    additionalImageUrls: ['https://a/k2', 'https://a/k3', 'https://a/k4'],
    endRefUrl: 'https://a/e',
  });
  assert(e.length === 5, 'five slots');
  const idx = e.map((x) => x.slotIndex).sort((a, b) => a - b);
  assert(idx.join(',') === '0,1,2,3,4', 'slots 0–4');

  console.log('✅ test-multi-condition-ref-mapping: all assertions passed');
}

run();

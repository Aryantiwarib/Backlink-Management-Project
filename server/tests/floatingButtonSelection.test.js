import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

describe('LINKORA — Floating Generate Mail Button & Selection Logic', () => {
  const getProspectId = (p) => String(p?._id || p?.id || p || '');

  test('correctly resolves ID from prospect objects whether id or _id is present', () => {
    const pWithId = { id: 'prospect_123', prospectDomain: 'sitea.com' };
    const pWithUnderscoreId = { _id: 'prospect_456', prospectDomain: 'siteb.com' };
    const pWithBoth = { id: 'prospect_789', _id: 'prospect_789', prospectDomain: 'sitec.com' };
    const pString = 'prospect_999';

    assert.equal(getProspectId(pWithId), 'prospect_123');
    assert.equal(getProspectId(pWithUnderscoreId), 'prospect_456');
    assert.equal(getProspectId(pWithBoth), 'prospect_789');
    assert.equal(getProspectId(pString), 'prospect_999');
  });

  test('selection set logic correctly tracks single and multiple prospect selections', () => {
    const prospects = [
      { _id: '6740001', domain: 'alpha.com' },
      { _id: '6740002', domain: 'beta.com' },
      { _id: '6740003', domain: 'gamma.com' }
    ];

    let selectedIds = new Set();

    // Toggle 1st prospect
    const toggle = (id, set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    };

    // Select 1
    selectedIds = toggle(getProspectId(prospects[0]), selectedIds);
    assert.equal(selectedIds.size, 1);
    assert.ok(selectedIds.has('6740001'));

    // Filter selected prospects
    let selectedList = prospects.filter((p) => selectedIds.has(getProspectId(p)));
    assert.equal(selectedList.length, 1);
    assert.equal(selectedList[0].domain, 'alpha.com');

    // Select 2nd and 3rd (multiple)
    selectedIds = toggle(getProspectId(prospects[1]), selectedIds);
    selectedIds = toggle(getProspectId(prospects[2]), selectedIds);
    assert.equal(selectedIds.size, 3);

    selectedList = prospects.filter((p) => selectedIds.has(getProspectId(p)));
    assert.equal(selectedList.length, 3);

    // Button label formatting check
    const formatLabel = (count) => `Generate Mail (${count})`;
    assert.equal(formatLabel(1), 'Generate Mail (1)');
    assert.equal(formatLabel(5), 'Generate Mail (5)');
  });
});

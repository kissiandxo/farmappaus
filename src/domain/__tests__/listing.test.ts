import { blankFarm, blankLicence, blankProduct, friendlyDbError, missingLicenceCategories, statusAdvice } from '../listing';
import { draftIssues } from '../validation';
import { makeFarm } from './fixtures';

describe('statusAdvice', () => {
  it('explains each status in plain words', () => {
    expect(statusAdvice('draft')).toMatch(/Only you can see this/);
    expect(statusAdvice('pending')).toMatch(/checking/);
    expect(statusAdvice('live')).toMatch(/Customers can see/);
  });

  it('includes the reviewer’s note when there is one', () => {
    expect(statusAdvice('draft', 'Please add a photo')).toBe('We asked for changes: Please add a photo');
    expect(statusAdvice('rejected', 'Not a farm')).toMatch(/not approved: Not a farm/);
    expect(statusAdvice('rejected')).toMatch(/not approved\./);
  });
});

describe('blank listing helpers', () => {
  it('starts as an invalid draft so nothing is submitted by accident', () => {
    const farm = blankFarm(new Date('2026-11-13T00:00:00Z'));
    expect(farm).toMatchObject({ status: 'draft', isSample: false, updatedOn: '2026-11-13', lat: 0, lng: 0 });
    const fields = draftIssues(farm).map((i) => i.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'story', 'location', 'products', 'contact']));
  });

  it('creates blank products and licences', () => {
    expect(blankProduct()).toMatchObject({ inStock: true, name: '' });
    expect(blankLicence('dairy')).toMatchObject({ category: 'dairy', status: 'self_declared' });
  });
});

describe('missingLicenceCategories', () => {
  it('lists categories needed by products and not yet held', () => {
    const farm = makeFarm({
      products: [
        { category: 'beef', name: 'b', inStock: true },
        { category: 'lamb', name: 'l', inStock: true },
        { category: 'eggs', name: 'e', inStock: true },
        { category: 'honey', name: 'h', inStock: true },
      ],
      licences: [{ category: 'eggs', regulator: 'R', licenceNumber: '1', status: 'self_declared' }],
    });
    expect(missingLicenceCategories(farm)).toEqual(['meat']);
  });
});

describe('friendlyDbError', () => {
  it('translates food-safety codes', () => {
    expect(friendlyDbError('Listing has food-safety issues: {licence_missing:meat}')).toBe(
      'This listing can’t go ahead yet: a meat licence is missing.',
    );
    expect(friendlyDbError('Cannot approve: {raw_milk_not_allowed,licence_expired:dairy}')).toMatch(
      /milk must be pasteurised.*a dairy licence has expired/,
    );
  });

  it('handles the other common failures', () => {
    expect(friendlyDbError('You have reached today\'s limit of 5 suggestions.')).toMatch(/limit of 5/);
    expect(friendlyDbError('duplicate key value violates unique constraint')).toBe('You’ve already done that.');
    expect(friendlyDbError('new row violates row-level security policy')).toMatch(/permission/);
    expect(friendlyDbError('TypeError: Network request failed')).toMatch(/No connection/);
    expect(friendlyDbError(undefined)).toBe('Something went wrong. Please try again.');
  });
});

import { normalizeDate } from '@/features/fuel/validation';

import { validateExpense, type ExpenseInput } from './validation';

const NOW = new Date(2026, 10, 5, 18).getTime();
const valid: ExpenseInput = {
  date: NOW,
  category: 'service',
  subtype: 'oil',
  amount: '3.250,50',
  odometerKm: '88.000',
  note: '  yağ   + filtre ',
};

describe('validateExpense', () => {
  it('geçerli bakım masrafı', () => {
    expect(validateExpense(valid, { now: NOW })).toEqual({
      ok: true,
      value: {
        date: normalizeDate(NOW),
        category: 'service',
        subtype: 'oil',
        amount: 3250.5,
        odometerKm: 88000,
        note: 'yağ + filtre',
      },
    });
  });

  it('km ve not isteğe bağlı', () => {
    const r = validateExpense(
      { ...valid, category: 'parking_toll', subtype: null, odometerKm: '', note: '' },
      { now: NOW },
    );
    expect(r).toMatchObject({ ok: true, value: { odometerKm: null, note: null, subtype: null } });
  });

  it('bakım dışı türde alt tür kaydedilmez', () => {
    expect(validateExpense({ ...valid, category: 'wash' }, { now: NOW })).toMatchObject({
      ok: true,
      value: { subtype: null },
    });
  });

  it('bakımda alt tür zorunlu', () => {
    expect(validateExpense({ ...valid, subtype: null }, { now: NOW })).toMatchObject({
      ok: false,
      errors: { subtype: 'expense.error.subtype' },
    });
  });

  it('tür seçilmeden kaydedilmez', () => {
    expect(validateExpense({ ...valid, category: null }, { now: NOW })).toMatchObject({
      ok: false,
      errors: { category: 'expense.error.category' },
    });
  });

  it.each([
    ['', 'fuel.error.required'],
    ['0', 'fuel.error.price'],
    ['-10', 'fuel.error.price'],
    ['abc', 'fuel.error.price'],
    ['20.000.000', 'fuel.error.price'],
  ])('tutar %p → %s', (amount, error) => {
    expect(validateExpense({ ...valid, amount }, { now: NOW })).toMatchObject({ ok: false, errors: { amount: error } });
  });

  it('geçersiz km ve gelecek tarih', () => {
    const r = validateExpense({ ...valid, odometerKm: '-5', date: NOW + 86_400_000 * 2 }, { now: NOW });
    expect(r).toMatchObject({
      ok: false,
      errors: { odometerKm: 'vehicle.error.odometer', date: 'fuel.error.dateFuture' },
    });
  });

  it('çok uzun not', () => {
    expect(validateExpense({ ...valid, note: 'x'.repeat(201) }, { now: NOW })).toMatchObject({
      ok: false,
      errors: { note: 'vehicle.error.tooLong' },
    });
  });
});

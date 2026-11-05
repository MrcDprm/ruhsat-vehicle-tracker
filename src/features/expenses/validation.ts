import { EXPENSE_CATEGORIES, SERVICE_SUBTYPES, type ExpenseCategory, type ServiceSubtype } from '@/db/schema';
import { normalizeDate } from '@/features/fuel/validation';
import { LIMITS as VEHICLE_LIMITS, parseNumber } from '@/features/vehicles/validation';

export type ExpenseInput = {
  date: number;
  category: ExpenseCategory | null;
  subtype: ServiceSubtype | null;
  amount: string;
  odometerKm: string;
  note: string;
};

export type ExpenseValues = {
  date: number;
  category: ExpenseCategory;
  subtype: ServiceSubtype | null;
  amount: number;
  odometerKm: number | null;
  note: string | null;
};

export type ExpenseErrors = Partial<Record<keyof ExpenseInput, string>>;

export const EXPENSE_LIMITS = { maxAmount: 10_000_000, noteMax: 200 } as const;

export function validateExpense(
  input: ExpenseInput,
  { now = Date.now() }: { now?: number } = {},
): { ok: true; value: ExpenseValues } | { ok: false; errors: ExpenseErrors } {
  const errors: ExpenseErrors = {};

  const date = normalizeDate(input.date);
  if (date > normalizeDate(now)) errors.date = 'fuel.error.dateFuture';

  const category = input.category && EXPENSE_CATEGORIES.includes(input.category) ? input.category : null;
  if (!category) errors.category = 'expense.error.category';

  // Alt tür yalnız bakımda; başka türde gelse de kaydedilmez.
  let subtype: ServiceSubtype | null = null;
  if (category === 'service') {
    subtype = input.subtype && SERVICE_SUBTYPES.includes(input.subtype) ? input.subtype : null;
    if (!subtype) errors.subtype = 'expense.error.subtype';
  }

  const amount = parseNumber(input.amount);
  if (amount === null) errors.amount = 'fuel.error.required';
  else if (Number.isNaN(amount) || amount <= 0 || amount > EXPENSE_LIMITS.maxAmount) errors.amount = 'fuel.error.price';

  const odometer = parseNumber(input.odometerKm);
  if (odometer !== null && (!Number.isInteger(odometer) || odometer < 0 || odometer > VEHICLE_LIMITS.maxOdometerKm)) {
    errors.odometerKm = 'vehicle.error.odometer';
  }

  const note = input.note.trim().replace(/\s+/g, ' ') || null;
  if (note && note.length > EXPENSE_LIMITS.noteMax) errors.note = 'vehicle.error.tooLong';

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      date,
      category: category as ExpenseCategory,
      subtype,
      amount: amount as number,
      odometerKm: odometer,
      note,
    },
  };
}

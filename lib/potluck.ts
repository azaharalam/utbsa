/**
 * Potluck categories, in the order a Bangladeshi table is actually laid out.
 * Shared between server and client — nothing server-only here.
 */

export const POTLUCK_CATEGORIES = [
  { key: 'rice',     label: 'Rice',        examples: 'Polao, biryani, khichuri, plain rice' },
  { key: 'meat',     label: 'Meat',        examples: 'Beef curry, mutton rezala, chicken roast' },
  { key: 'fish',     label: 'Fish',        examples: 'Ilish, rui, katla, shutki' },
  { key: 'veg',      label: 'Vegetable',   examples: 'Bhaji, labra, salad' },
  { key: 'vorta',    label: 'Vorta',       examples: 'Alu bhorta, begun bhorta, shutki bhorta' },
  { key: 'curry',    label: 'Curry',       examples: 'Mixed vegetable curry, egg curry, dal curry' },
  { key: 'dal',      label: 'Dal',         examples: 'Musur, moong, khichuri dal' },
  { key: 'starter',  label: 'Snacks',      examples: 'Shingara, samosa, piyaju, chop, haleem' },
  { key: 'bread',    label: 'Bread',       examples: 'Paratha, luchi, naan' },
  { key: 'dessert',  label: 'Dessert',     examples: 'Payesh, mishti, semai, firni, cake' },
  { key: 'drinks',   label: 'Drinks',      examples: 'Borhani, lachchi, soft drinks, water' },
  { key: 'supplies', label: 'Plates and supplies',
    examples: 'Plates, cups, cutlery, napkins, serving spoons, foil' },
] as const;

export const CATEGORY_LABEL: Record<string, string> =
  Object.fromEntries(POTLUCK_CATEGORIES.map((c) => [c.key, c.label]));

export function categoryOrder(key: string) {
  const i = POTLUCK_CATEGORIES.findIndex((c) => c.key === key);
  return i === -1 ? 99 : i;
}

/**
 * Children under three eat off a parent's plate. Counting them inflates the
 * food order and the chair count for no reason.
 */
export const CHILD_MIN_AGE = 3;

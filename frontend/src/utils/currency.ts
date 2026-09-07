/**
 * Currency Formatting Utility
 * Centralizes Indian Rupee (₹ / INR) formatting for Tamil Nadu and India localization.
 */

export const CURRENCY_SYMBOL = '₹';

export const formatCurrency = (amount: number | string | undefined | null): string => {
  if (amount === undefined || amount === null) return `${CURRENCY_SYMBOL}0.00`;
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${CURRENCY_SYMBOL}0.00`;

  return `${CURRENCY_SYMBOL}${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default formatCurrency;

// Currency conversion utilities using Frankfurter API
// https://frankfurter.dev - Free, open-source, no API key required

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}

// 40 most popular currencies (ISO 4217 codes)
export const CURRENCIES: CurrencyInfo[] = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CHF", name: "Swiss Franc", symbol: "Fr" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  { code: "DKK", name: "Danish Krone", symbol: "kr" },
  { code: "MXN", name: "Mexican Peso", symbol: "$" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "PLN", name: "Polish Złoty", symbol: "zł" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč" },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft" },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
  { code: "CLP", name: "Chilean Peso", symbol: "$" },
  { code: "COP", name: "Colombian Peso", symbol: "$" },
  { code: "PEN", name: "Peruvian Sol", symbol: "S/" },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨" },
  { code: "BGN", name: "Bulgarian Lev", symbol: "лв" },
  { code: "RON", name: "Romanian Leu", symbol: "lei" },
];

// Create a lookup map for quick access
export const CURRENCY_MAP = new Map(CURRENCIES.map((c) => [c.code, c]));

// Get currency info by code
export function getCurrencyInfo(code: string): CurrencyInfo | undefined {
  return CURRENCY_MAP.get(code);
}

// Frankfurter API response type
interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

/**
 * Fetch live exchange rate from Frankfurter API
 * @param from Source currency code (e.g., "USD")
 * @param to Target currency code (e.g., "EUR")
 * @returns Exchange rate (how many 'to' units per 1 'from' unit)
 */
export async function fetchExchangeRate(from: string, to: string): Promise<number> {
  // Handle same currency case
  if (from === to) { return 1; }

  try {
    const response = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=${from}&symbols=${to}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: FrankfurterResponse = await response.json();
    const rate = data.rates[to];

    if (rate === undefined) {
      throw new Error(`Rate not found for ${from} to ${to}`);
    }

    return rate;
  } catch (error) {
    console.error("Currency API Error:", error);
    throw error;
  }
}

/**
 * Format a currency amount with locale-aware display
 * @param amount The numeric amount
 * @param currencyCode ISO 4217 currency code
 * @returns Formatted string (e.g., "$1,234.56")
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback if currency code is invalid
    const currency = getCurrencyInfo(currencyCode);
    const symbol = currency?.symbol || currencyCode;
    return `${symbol}${amount.toFixed(2)}`;
  }
}

/**
 * Convert amount from one currency to another
 * @param amount Amount in source currency
 * @param rate Exchange rate (target/source)
 * @returns Converted amount
 */
export function convertAmount(amount: number, rate: number): number {
  return amount * rate;
}

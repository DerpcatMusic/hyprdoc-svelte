/**
 * Currency Exchange Service
 *
 * Provides live exchange rates from fawazahmed0/exchange-api.
 * Free, no rate limits, 200+ currencies, daily updates.
 */

// Currency data with codes, names, and symbols
export const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "CHF", name: "Swiss Franc", symbol: "Fr" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  { code: "DKK", name: "Danish Krone", symbol: "kr" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "MXN", name: "Mexican Peso", symbol: "$" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč" },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft" },
  { code: "CLP", name: "Chilean Peso", symbol: "$" },
  { code: "COP", name: "Colombian Peso", symbol: "$" },
  { code: "PEN", name: "Peruvian Sol", symbol: "S/" },
  { code: "ARS", name: "Argentine Peso", symbol: "$" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
  { code: "EGP", name: "Egyptian Pound", symbol: "£" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳" },
  { code: "UAH", name: "Ukrainian Hryvnia", symbol: "₴" },
  { code: "RON", name: "Romanian Leu", symbol: "lei" },
  { code: "BGN", name: "Bulgarian Lev", symbol: "лв" },
  { code: "HRK", name: "Croatian Kuna", symbol: "kn" },
  { code: "ISK", name: "Icelandic Krona", symbol: "kr" },
  { code: "TWD", name: "Taiwan Dollar", symbol: "NT$" },
  { code: "QAR", name: "Qatari Riyal", symbol: "﷼" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك" },
  { code: "BTC", name: "Bitcoin", symbol: "₿" },
  { code: "ETH", name: "Ethereum", symbol: "Ξ" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

// Cache for exchange rates
interface RateCache {
  rates: Record<string, number>;
  fetchedAt: number;
}

const rateCache = new Map<string, RateCache>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get symbol for a currency code
 */
export function getCurrencySymbol(code: string): string {
  const currency = CURRENCIES.find((c) => c.code === code.toUpperCase());
  return currency?.symbol ?? code;
}

/**
 * Get currency info by code
 */
export function getCurrencyInfo(code: string) {
  return CURRENCIES.find((c) => c.code === code.toUpperCase());
}

/**
 * Fetch exchange rates from API
 * Uses fawazahmed0/exchange-api - free, no rate limits
 */
async function fetchRates(baseCurrency: string): Promise<Record<string, number>> {
  const base = baseCurrency.toLowerCase();
  const cached = rateCache.get(base);

  // Return cached if still valid
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.rates;
  }

  try {
    // Primary endpoint
    const response = await fetch(
      `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base}.json`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch rates: ${response.status}`);
    }

    const data = await response.json();
    const rates = data[base] as Record<string, number>;

    // Cache the result
    rateCache.set(base, { rates, fetchedAt: Date.now() });

    return rates;
  } catch (error) {
    // Fallback endpoint
    try {
      const fallback = await fetch(
        `https://latest.currency-api.pages.dev/v1/currencies/${base}.json`
      );

      if (!fallback.ok) { throw error; }

      const data = await fallback.json();
      const rates = data[base] as Record<string, number>;

      rateCache.set(base, { rates, fetchedAt: Date.now() });
      return rates;
    } catch {
      // Return cached even if stale, or throw
      if (cached) { return cached.rates; }
      throw error;
    }
  }
}

/**
 * Get exchange rate between two currencies
 */
export async function getExchangeRate(
  from: string,
  to: string
): Promise<{ rate: number; timestamp: string }> {
  const fromLower = from.toLowerCase();
  const toLower = to.toLowerCase();

  if (fromLower === toLower) {
    return { rate: 1, timestamp: new Date().toISOString() };
  }

  const rates = await fetchRates(fromLower);
  const rate = rates[toLower];

  if (rate === undefined) {
    throw new Error(`Exchange rate not found: ${from} -> ${to}`);
  }

  return { rate, timestamp: new Date().toISOString() };
}

/**
 * Convert amount between currencies
 */
export async function convertCurrency(
  amount: number,
  from: string,
  to: string
): Promise<{ converted: number; rate: number; timestamp: string }> {
  const { rate, timestamp } = await getExchangeRate(from, to);
  return {
    converted: amount * rate,
    rate,
    timestamp,
  };
}

/**
 * Format currency amount with symbol
 */
export function formatCurrencyAmount(
  amount: number,
  currencyCode: string,
  options?: { decimals?: number; showSymbol?: boolean }
): string {
  const { decimals = 2, showSymbol = true } = options ?? {};
  const symbol = showSymbol ? getCurrencySymbol(currencyCode) : "";
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${symbol}${formatted}`;
}

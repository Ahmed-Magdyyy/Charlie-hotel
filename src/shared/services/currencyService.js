import { supportedCurrencies } from "../constants/enums.js";

const API_BASE_URL =
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies";

// ─── In-memory cache ────────────────────────────────────────

let ratesCache = {
  rates: null,
  baseCurrency: null,
  fetchedAt: null,
};

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Check if cached rates are still valid
 */
function isCacheValid(baseCurrency) {
  if (!ratesCache.rates || !ratesCache.fetchedAt) return false;
  if (ratesCache.baseCurrency !== baseCurrency) return false;

  const now = Date.now();
  return now - ratesCache.fetchedAt < CACHE_TTL_MS;
}

/**
 * Fetch exchange rates from the Currency API
 * @param {string} baseCurrency - The base currency (e.g., "SAR")
 * @returns {Promise<Object>} - Rates object keyed by currency code
 */
async function fetchRatesFromAPI(baseCurrency) {
  const currencyLower = baseCurrency.toLowerCase();
  const url = `${API_BASE_URL}/${currencyLower}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Currency API returned ${response.status}`);
    }

    const data = await response.json();
    // API returns { date: "2024-01-01", [currencyLower]: { usd: 1.0, eur: 0.92, ... } }
    return data[currencyLower];
  } catch (error) {
    console.error(`[CurrencyService] Failed to fetch exchange rates: ${error.message}`);
    throw error;
  }
}

/**
 * Get exchange rates for a given base currency (default SAR).
 * Uses 12-hour in-memory cache to minimize API calls.
 * @param {string} baseCurrency - The source currency
 * @returns {Promise<Object>} - Rates object
 */
export async function getExchangeRates(baseCurrency = "SAR") {
  const base = baseCurrency.toUpperCase();

  if (isCacheValid(base)) {
    return ratesCache.rates;
  }

  const rates = await fetchRatesFromAPI(base);

  // Update cache
  ratesCache = {
    rates,
    baseCurrency: base,
    fetchedAt: Date.now(),
  };

  return rates;
}

/**
 * Convert a single amount from SAR to the target currency.
 * @param {number} amount - The amount in SAR
 * @param {string} toCurrency - Target currency code (e.g., "USD")
 * @param {Object} rates - Exchange rates object (from getExchangeRates)
 * @returns {number} - Converted amount (rounded to nearest integer)
 */
export function convertAmount(amount, toCurrency, rates) {
  if (toCurrency.toUpperCase() === "SAR") {
    return Math.round(amount);
  }

  const targetRate = rates[toCurrency.toLowerCase()];
  if (!targetRate) {
    throw new Error(`Exchange rate not found for ${toCurrency}`);
  }

  return Math.round(amount * targetRate);
}

/**
 * Convert a price breakdown object from SAR to the requested currency.
 * Returns a new object with all price fields converted + currency metadata.
 *
 * @param {Object} breakdown - The price breakdown (from pricingEngine)
 * @param {string} currency - Target currency code
 * @returns {Promise<Object>} - Breakdown with converted prices + displayCurrency field
 */
export async function convertBreakdown(breakdown, currency) {
  const target = currency.toUpperCase();

  // No conversion needed
  if (target === "SAR") {
    return { ...breakdown, displayCurrency: "SAR" };
  }

  const rates = await getExchangeRates("SAR");
  const c = (amt) => convertAmount(amt, target, rates);

  return {
    ...breakdown,
    nightlyRates: breakdown.nightlyRates?.map((n) => ({
      ...n,
      basePrice: c(n.basePrice),
      modifiers: n.modifiers
        ? {
            reservation: c(n.reservation ?? n.modifiers?.reservation ?? 0),
            cancellation: c(n.cancellation ?? n.modifiers?.cancellation ?? 0),
            payment: c(n.payment ?? n.modifiers?.payment ?? 0),
          }
        : undefined,
      total: c(n.total),
      price: n.price !== undefined ? c(n.price) : undefined,
    })),
    subtotal: breakdown.subtotal !== undefined ? c(breakdown.subtotal) : undefined,
    loyaltyDiscount: breakdown.loyaltyDiscount !== undefined ? c(breakdown.loyaltyDiscount) : undefined,
    taxableAmount: breakdown.taxableAmount !== undefined ? c(breakdown.taxableAmount) : undefined,
    munTax: breakdown.munTax !== undefined ? c(breakdown.munTax) : undefined,
    vatAmount: breakdown.vatAmount !== undefined ? c(breakdown.vatAmount) : undefined,
    taxes: breakdown.taxes !== undefined ? c(breakdown.taxes) : undefined,
    grandTotal: breakdown.grandTotal !== undefined ? c(breakdown.grandTotal) : undefined,
    totalPrice: breakdown.totalPrice !== undefined ? c(breakdown.totalPrice) : undefined,
    displayCurrency: target,
  };
}

/**
 * Convert an array of search results (from room search) to the target currency.
 * @param {Array} results - Array of room search results
 * @param {string} currency - Target currency code
 * @returns {Promise<Array>} - Results with converted prices
 */
export async function convertSearchResults(results, currency) {
  const target = currency.toUpperCase();

  if (target === "SAR") {
    return results.map((r) => ({ ...r, displayCurrency: "SAR" }));
  }

  const rates = await getExchangeRates("SAR");
  const c = (amt) => convertAmount(amt, target, rates);

  return results.map((r) => ({
    ...r,
    nightlyRates: r.nightlyRates?.map((n) => ({
      ...n,
      price: c(n.price),
    })),
    totalPrice: c(r.totalPrice),
    displayCurrency: target,
  }));
}

/**
 * Validate that a currency code is supported.
 * @param {string} currency - The currency code to validate
 * @returns {boolean}
 */
export function isSupportedCurrency(currency) {
  return supportedCurrencies.includes(currency?.toUpperCase());
}

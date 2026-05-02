/**
 * AlinmaPay Payment Gateway Adapter
 *
 * Docs: AlinmaPay Payment Gateway API Specifications Version 3.1
 * Hosted-page flow with SHA256 signature + AES-256 encrypted callback.
 *
 * ENV vars required:
 *   ALINMAPAY_TERMINAL_ID       - Terminal ID provided by AlinmaPay
 *   ALINMAPAY_PASSWORD           - Terminal password
 *   ALINMAPAY_MERCHANT_KEY       - Merchant key for signature generation
 *   ALINMAPAY_SECRET_KEY         - Secret key for AES-256 callback decryption (hex string)
 *   ALINMAPAY_RESPONSE_URL       - Merchant callback URL for successful payments
 *   ALINMAPAY_ERROR_URL          - Merchant error URL for failed payments
 *   ALINMAPAY_BASE_URL           - (optional) defaults to sandbox
 */

import crypto from "crypto";

const SANDBOX_URL =
  "https://pgtest.alinmapay.com.sa/api/v2/payments/pay-request";
const PRODUCTION_URL =
  "https://pg.alinmapay.com.sa/api/v2/payments/pay-request";

// ─── Helpers ─────────────────────────────────────────────────

function getBaseUrl() {
  return (
    process.env.ALINMAPAY_BASE_URL ||
    (process.env.NODE_ENV === "production" ? PRODUCTION_URL : SANDBOX_URL)
  );
}

function getConfig() {
  const terminalId = process.env.ALINMAPAY_TERMINAL_ID;
  const password = process.env.ALINMAPAY_PASSWORD;
  const merchantKey = process.env.ALINMAPAY_MERCHANT_KEY;
  const responseUrl = process.env.ALINMAPAY_RESPONSE_URL;
  const errorUrl = process.env.ALINMAPAY_ERROR_URL;

  if (!terminalId) throw new Error("ALINMAPAY_TERMINAL_ID is not set");
  if (!password) throw new Error("ALINMAPAY_PASSWORD is not set");
  if (!merchantKey) throw new Error("ALINMAPAY_MERCHANT_KEY is not set");
  if (!responseUrl) throw new Error("ALINMAPAY_RESPONSE_URL is not set");
  if (!errorUrl) throw new Error("ALINMAPAY_ERROR_URL is not set");

  return { terminalId, password, merchantKey, responseUrl, errorUrl };
}

/**
 * Generate SHA256 request signature.
 * Format: trackId|terminalId|password|merchantKey|amount|currency
 */
function generateRequestHash(
  trackId,
  terminalId,
  password,
  merchantKey,
  amount,
  currency,
) {
  const raw = `${trackId}|${terminalId}|${password}|${merchantKey}|${amount}|${currency}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Verify SHA256 response signature.
 * Format: PaymentId|merchantKey|responseCode|amount
 */
function generateResponseHash(paymentId, merchantKey, responseCode, amount) {
  const raw = `${paymentId}|${merchantKey}|${responseCode}|${amount}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Decrypt AES-256 encrypted callback data from AlinmaPay.
 * The secret key is provided as a hex string — convert to byte array.
 * Data is Base64-encoded → decode → AES decrypt.
 */
function decryptCallbackData(encryptedData, secretKeyHex) {
  try {
    // Convert hex key to buffer
    const keyBuffer = Buffer.from(secretKeyHex, "hex");

    // Base64 decode the encrypted data
    const encryptedBuffer = Buffer.from(encryptedData, "base64");

    // AES-256-ECB (AlinmaPay spec doesn't mention IV, ECB mode assumed)
    // If CBC is used, the IV is typically prepended to the ciphertext
    let decrypted;

    if (encryptedBuffer.length > 16 && keyBuffer.length === 32) {
      // Try CBC first (IV = first 16 bytes)
      try {
        const iv = encryptedBuffer.subarray(0, 16);
        const ciphertext = encryptedBuffer.subarray(16);
        const decipher = crypto.createDecipheriv("aes-256-cbc", keyBuffer, iv);
        decrypted = Buffer.concat([
          decipher.update(ciphertext),
          decipher.final(),
        ]);
      } catch {
        // Fallback to ECB
        const decipher = crypto.createDecipheriv(
          "aes-256-ecb",
          keyBuffer,
          null,
        );
        decrypted = Buffer.concat([
          decipher.update(encryptedBuffer),
          decipher.final(),
        ]);
      }
    } else {
      const decipher = crypto.createDecipheriv("aes-256-ecb", keyBuffer, null);
      decrypted = Buffer.concat([
        decipher.update(encryptedBuffer),
        decipher.final(),
      ]);
    }

    return JSON.parse(decrypted.toString("utf8"));
  } catch (err) {
    console.error("[AlinmaPay] Failed to decrypt callback data:", err.message);
    throw new Error("Failed to decrypt AlinmaPay callback data");
  }
}

/**
 * Format amount as string with 2 decimal places (e.g. "10.00").
 */
function formatAmount(amount) {
  return Number(amount).toFixed(2);
}

// ─── Gateway Adapter ─────────────────────────────────────────

const alinmapayGateway = {
  name: "alinmapay",

  /**
   * Initiate a payment — creates a pay-request on AlinmaPay and returns
   * the hosted page URL for customer redirect.
   *
   * @param {Object} params
   * @param {number} params.amount        - Amount in SAR
   * @param {string} params.currency      - e.g. "SAR"
   * @param {string} params.description   - Payment description
   * @param {string} params.bookingId     - Internal booking ID (used as trackId/orderId)
   * @param {Object} [params.guestDetails] - Guest information from the booking
   * @returns {Promise<InitiateResult>}
   */
  async initiate({ amount, currency = "SAR", description, bookingId, guestDetails = {} }) {
    const config = getConfig();
    const baseUrl = getBaseUrl();
    const formattedAmount = formatAmount(amount);

    // Generate signature hash
    const hash = generateRequestHash(
      bookingId,
      config.terminalId,
      config.password,
      config.merchantKey,
      formattedAmount,
      currency,
    );

    const payload = {
      terminalId: config.terminalId,
      password: config.password,
      paymentType: "1", // 1 for Purchase
      amount: formattedAmount,
      currency,
      signature: hash,
      order: {
        orderId: bookingId,
        description: description,
      },
      customer: {
        customerEmail: guestDetails.email || "guest@charlie-hotel.com",
        billingAddressStreet: guestDetails.address || "N/A",
        billingAddressCity: guestDetails.city || "Riyadh",
        billingAddressState: guestDetails.state || "Riyadh",
        billingAddressPostalCode: guestDetails.postalCode || "00000",
        billingAddressCountry: (guestDetails.nationality || "SA").toUpperCase(),
      },
      additionalDetails: {
        userData: JSON.stringify({
          receiptUrl: config.responseUrl,
        })
      }
    };

    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseText = await res.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseErr) {
      // If response is HTML (e.g. 404 Not Found), throw a clear error
      const err = new Error(`AlinmaPay API returned an invalid response (not JSON). HTTP Status: ${res.status}. Check the ALINMAPAY_BASE_URL. \nResponse: ${responseText.substring(0, 150)}...`);
      err.status = res.status;
      err.raw = responseText;
      throw err;
    }

    if (!res.ok || !data.paymentLink?.linkUrl) {
      const msg =
        data?.responseDescription || data?.reason || data?.message || "AlinmaPay API error";
      const err = new Error(msg);
      err.status = res.status;
      err.raw = data;
      throw err;
    }

    return {
      gatewayPaymentId: data.paymentId || data.transactionId,
      checkoutUrl: data.paymentLink.linkUrl + (data.paymentId || data.transactionId),
      raw: data,
    };
  },

  /**
   * Verify a payment status by its gateway payment ID.
   * AlinmaPay uses the same pay-request endpoint with action=10 (inquiry).
   *
   * @param {string} gatewayPaymentId
   * @returns {Promise<VerifyResult>}
   */
  async verify(gatewayPaymentId) {
    const config = getConfig();
    const baseUrl = getBaseUrl();

    // Build inquiry request
    const hash = generateRequestHash(
      gatewayPaymentId,
      config.terminalId,
      config.password,
      config.merchantKey,
      "0.00",
      "SAR",
    );

    const payload = {
      terminalId: config.terminalId,
      password: config.password,
      action: 10, // Inquiry
      paymentId: gatewayPaymentId,
      hashDigest: hash,
    };

    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    const isPaid =
      data.responseCode === "000" ||
      data.responseCode === "001" ||
      data.status === "SUCCESS";

    return {
      paid: isPaid,
      gatewayPaymentId: data.paymentId || gatewayPaymentId,
      method: mapAlinmaMethod(
        data.cardDetails?.cardType || data.instrumentType,
      ),
      raw: data,
    };
  },

  /**
   * Parse an incoming callback (webhook) from AlinmaPay.
   *
   * AlinmaPay sends an encrypted POST with:
   *   - data: Base64-encoded AES-256 encrypted JSON
   *   - termId: Terminal ID
   *
   * @param {Object} reqBody
   * @returns {VerifyResult}
   */
  parseWebhook(reqBody) {
    const config = getConfig();

    // If the callback is encrypted (has `data` + `termId`)
    if (reqBody.data && reqBody.termId) {
      const decrypted = decryptCallbackData(reqBody.data, config.merchantKey);

      const isPaid =
        decrypted.responseCode === "000" ||
        decrypted.responseCode === "001" ||
        decrypted.status === "SUCCESS";

      // Verify response hash for integrity
      if (decrypted.hashDigest) {
        const expectedHash = generateResponseHash(
          decrypted.paymentId,
          config.merchantKey,
          decrypted.responseCode,
          decrypted.amount,
        );
        if (expectedHash !== decrypted.hashDigest) {
          console.warn(
            "[AlinmaPay] Response hash mismatch — possible tampering",
          );
        }
      }

      return {
        gatewayPaymentId: decrypted.paymentId || decrypted.transactionId,
        bookingId: decrypted.trackId || decrypted.order?.orderId || null,
        paid: isPaid,
        method: mapAlinmaMethod(
          decrypted.cardDetails?.cardType || decrypted.instrumentType,
        ),
        needsVerification: false, // Already have the result
        raw: decrypted,
      };
    }

    // Non-encrypted callback (fallback) — verify via API
    const gatewayPaymentId = reqBody.paymentId || reqBody.transactionId;
    const bookingId = reqBody.trackId || reqBody.order?.orderId || null;

    return {
      gatewayPaymentId,
      bookingId,
      needsVerification: true,
      raw: reqBody,
    };
  },

  /**
   * Refund a payment.
   * AlinmaPay uses action=2 for refunds.
   *
   * @param {string} gatewayPaymentId
   * @param {number} amount - Amount to refund in SAR
   * @returns {Promise<RefundResult>}
   */
  async refund(gatewayPaymentId, amount) {
    const config = getConfig();
    const baseUrl = getBaseUrl();
    const formattedAmount = formatAmount(amount);

    const hash = generateRequestHash(
      gatewayPaymentId,
      config.terminalId,
      config.password,
      config.merchantKey,
      formattedAmount,
      "SAR",
    );

    const payload = {
      terminalId: config.terminalId,
      password: config.password,
      action: 2, // Refund
      paymentId: gatewayPaymentId,
      amount: formattedAmount,
      currency: "SAR",
      hashDigest: hash,
    };

    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    const isSuccess =
      data.responseCode === "000" ||
      data.responseCode === "001" ||
      data.status === "SUCCESS";

    return {
      success: isSuccess,
      refundId: data.transactionId || data.paymentId,
      raw: data,
    };
  },
};

// ─── Method Mapper ───────────────────────────────────────────

function mapAlinmaMethod(type) {
  if (!type) return "credit_card";
  const normalized = type.toLowerCase();
  const map = {
    cci: "credit_card",
    dci: "mada",
    mada: "mada",
    visa: "credit_card",
    mastercard: "credit_card",
    applepay: "apple_pay",
    stcpay: "stc_pay",
    sadad: "credit_card",
  };
  return map[normalized] || "credit_card";
}

export default alinmapayGateway;

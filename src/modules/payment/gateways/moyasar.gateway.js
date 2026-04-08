/**
 * Moyasar Payment Gateway Adapter
 *
 * Docs: https://docs.moyasar.com/api
 * REST API with Basic Auth (secret key)
 *
 * ENV vars required:
 *   MOYASAR_SECRET_KEY      - API secret key
 *   MOYASAR_CALLBACK_URL    - Webhook/callback URL after payment
 *   MOYASAR_WEBHOOK_SECRET  - Webhook signing secret for HMAC verification
 *   MOYASAR_BASE_URL        - (optional) defaults to https://api.moyasar.com/v1
 */

import crypto from "crypto";

const BASE_URL = process.env.MOYASAR_BASE_URL || "https://api.moyasar.com/v1";

function getAuthHeader() {
  const key = process.env.MOYASAR_SECRET_KEY;
  if (!key) throw new Error("MOYASAR_SECRET_KEY is not set");
  return "Basic " + Buffer.from(key + ":").toString("base64");
}

async function moyasarFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data?.message || data?.errors?.[0]?.message || "Moyasar API error";
    const err = new Error(msg);
    err.status = res.status;
    err.raw = data;
    throw err;
  }
  return data;
}

const moyasarGateway = {
  name: "moyasar",

  /**
   * Create a payment and return a checkout URL.
   * @param {Object} params
   * @param {number} params.amount      - Amount in SAR (will be converted to halalah)
   * @param {string} params.currency    - e.g. "SAR"
   * @param {string} params.description - Payment description
   * @param {string} params.bookingId   - Our internal booking ID (stored as metadata)
   * @returns {Promise<InitiateResult>}
   */
  async initiate({ amount, currency = "SAR", description, bookingId }) {
    const callbackUrl = process.env.MOYASAR_CALLBACK_URL;
    if (!callbackUrl) throw new Error("MOYASAR_CALLBACK_URL is not set");

    // Use Invoice API — creates a hosted checkout page (no PCI requirement)
    const data = await moyasarFetch("/invoices", {
      method: "POST",
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Moyasar expects amount in halalah
        currency,
        description,
        callback_url: callbackUrl,
        metadata: { bookingId },
      }),
    });

    return {
      gatewayPaymentId: data.id,
      checkoutUrl: data.url,
      raw: data,
    };
  },

  /**
   * Verify a payment status by its gateway ID.
   * @param {string} gatewayPaymentId
   * @returns {Promise<VerifyResult>}
   */
  async verify(gatewayPaymentId) {
    // Try as invoice first, fallback to payment
    try {
      const data = await moyasarFetch(`/invoices/${gatewayPaymentId}`);
      const payment = data.payments?.[0];
      return {
        paid: data.status === "paid",
        gatewayPaymentId: data.id,
        method: payment ? mapMoyasarMethod(payment.source?.type) : "credit_card",
        raw: data,
      };
    } catch {
      // Fallback: try as a direct payment ID
      const data = await moyasarFetch(`/payments/${gatewayPaymentId}`);
      return {
        paid: data.status === "paid",
        gatewayPaymentId: data.id,
        method: mapMoyasarMethod(data.source?.type),
        raw: data,
      };
    }
  },

  /**
   * Parse and verify an incoming webhook from Moyasar.
   * Moyasar signs webhooks with HMAC-SHA256 using the webhook secret.
   * @param {Object} reqBody
   * @param {Object} reqHeaders
   * @param {string} rawBody - Raw request body string for signature verification
   * @returns {VerifyResult}
   * @throws {Error} if signature verification fails
   */
  parseWebhook(reqBody, reqHeaders, rawBody) {
    // Verify webhook signature
    const webhookSecret = process.env.MOYASAR_WEBHOOK_SECRET;
    const signature = reqHeaders["x-moyasar-signature"] || reqHeaders["x-signature"];

    if (webhookSecret) {
      if (!signature) {
        throw new Error("Missing webhook signature header");
      }

      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        throw new Error("Invalid webhook signature");
      }
    }

    const data = reqBody;

    return {
      paid: data.status === "paid",
      gatewayPaymentId: data.id,
      method: mapMoyasarMethod(data.source?.type),
      bookingId: data.metadata?.bookingId || null,
      raw: data,
    };
  },

  /**
   * Refund a payment.
   * @param {string} gatewayPaymentId
   * @param {number} amount - Amount to refund in SAR
   * @returns {Promise<RefundResult>}
   */
  async refund(gatewayPaymentId, amount) {
    const data = await moyasarFetch(`/payments/${gatewayPaymentId}/refund`, {
      method: "POST",
      body: JSON.stringify({
        amount: Math.round(amount * 100),
      }),
    });

    return {
      success: data.status === "refunded",
      refundId: data.id,
      raw: data,
    };
  },
};

function mapMoyasarMethod(sourceType) {
  const map = {
    creditcard: "credit_card",
    mada: "mada",
    applepay: "apple_pay",
    stcpay: "stc_pay",
  };
  return map[sourceType] || "credit_card";
}

export default moyasarGateway;

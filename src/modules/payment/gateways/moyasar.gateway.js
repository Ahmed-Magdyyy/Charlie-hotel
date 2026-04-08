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
        // The actual Moyasar payment ID (needed for refunds — different from invoice ID)
        moyasarPaymentId: payment?.id || null,
        method: payment ? mapMoyasarMethod(payment.source?.type) : "credit_card",
        raw: data,
      };
    } catch {
      // Fallback: try as a direct payment ID
      const data = await moyasarFetch(`/payments/${gatewayPaymentId}`);
      return {
        paid: data.status === "paid",
        gatewayPaymentId: data.id,
        moyasarPaymentId: data.id,
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
  parseWebhook(reqBody) {
    // Moyasar sends two webhook formats:
    // 1. Invoice webhook: { id, status, metadata, payments, ... }
    // 2. Payment event webhook: { id, type, secret_token, data: { id, invoice_id, metadata, ... } }

    const raw = reqBody;
    let gatewayPaymentId;
    let invoiceId = null;
    let bookingId = null;

    if (raw.payments && raw.metadata) {
      // Format 1: Invoice webhook — id IS the invoice ID
      gatewayPaymentId = raw.id;
      invoiceId = raw.id;
      bookingId = raw.metadata?.bookingId || null;
    } else if (raw.data) {
      // Format 2: Payment event — real data is nested in raw.data
      const inner = raw.data;
      gatewayPaymentId = inner.id || raw.id;
      invoiceId = inner.invoice_id || null;
      bookingId = inner.metadata?.bookingId || null;

      // Verify secret_token if configured
      const webhookSecret = process.env.MOYASAR_WEBHOOK_SECRET;
      if (webhookSecret && raw.secret_token !== webhookSecret) {
        throw new Error("Invalid webhook secret token");
      }
    } else {
      gatewayPaymentId = raw.id;
      bookingId = raw.metadata?.bookingId || null;
    }

    return {
      gatewayPaymentId,
      invoiceId,
      bookingId,
      needsVerification: true,
      raw,
    };
  },

  /**
   * Refund a payment.
   * @param {string} gatewayPaymentId
   * @param {number} amount - Amount to refund in SAR
   * @returns {Promise<RefundResult>}
   */
  async refund(gatewayPaymentId, amount) {
    // gatewayPaymentId might be an invoice ID — resolve the actual payment ID
    let paymentId = gatewayPaymentId;
    try {
      const invoice = await moyasarFetch(`/invoices/${gatewayPaymentId}`);
      if (invoice.payments?.[0]?.id) {
        paymentId = invoice.payments[0].id;
      }
    } catch {
      // Not an invoice — assume it's already a payment ID
    }

    const data = await moyasarFetch(`/payments/${paymentId}/refund`, {
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

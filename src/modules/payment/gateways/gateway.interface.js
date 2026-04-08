/**
 * Payment Gateway Adapter Interface
 *
 * Every gateway adapter must implement these methods.
 * To add a new gateway:
 *   1. Create a new file in this folder (e.g. tap.gateway.js)
 *   2. Export an object with the same shape as below
 *   3. Update gateway.factory.js to register it
 *
 * All methods are async and return standardized shapes
 * so the payment service never depends on gateway-specific responses.
 */

/**
 * @typedef {Object} InitiateResult
 * @property {string} gatewayPaymentId - The gateway's unique payment/session ID
 * @property {string} checkoutUrl      - URL to redirect the client to for payment
 * @property {Object} raw             - Full raw response from the gateway (stored for debugging)
 */

/**
 * @typedef {Object} VerifyResult
 * @property {boolean} paid           - Whether payment was successful
 * @property {string} gatewayPaymentId
 * @property {string} method          - Payment method used (credit_card, mada, apple_pay, etc.)
 * @property {Object} raw
 */

/**
 * @typedef {Object} RefundResult
 * @property {boolean} success
 * @property {string} refundId        - Gateway's refund ID
 * @property {Object} raw
 */

/**
 * Gateway adapter shape:
 *
 * {
 *   name: string,
 *   initiate(params) → InitiateResult,
 *   verify(gatewayPaymentId) → VerifyResult,
 *   parseWebhook(reqBody, reqHeaders) → VerifyResult,
 *   refund(gatewayPaymentId, amount) → RefundResult,
 * }
 */

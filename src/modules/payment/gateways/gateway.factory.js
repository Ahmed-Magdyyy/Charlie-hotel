import moyasarGateway from "./moyasar.gateway.js";

/**
 * Gateway registry.
 * To add a new gateway:
 *   1. Create the adapter file (e.g. tap.gateway.js)
 *   2. Import and register it here
 *   3. Set PAYMENT_GATEWAY=tap in .env
 */
const gateways = {
  moyasar: moyasarGateway,
  // tap: tapGateway,
  // hyperpay: hyperpayGateway,
};

/**
 * Returns the active payment gateway adapter.
 * Configured via PAYMENT_GATEWAY env var (default: "moyasar").
 */
export function getGateway() {
  const name = process.env.PAYMENT_GATEWAY || "moyasar";
  const gateway = gateways[name];
  if (!gateway) {
    throw new Error(`Payment gateway "${name}" is not registered. Available: ${Object.keys(gateways).join(", ")}`);
  }
  return gateway;
}

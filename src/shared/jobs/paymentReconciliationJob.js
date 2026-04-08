import cron from "node-cron";
import { PaymentModel } from "../../modules/payment/payment.model.js";
import { findBookingById } from "../../modules/booking/booking.repository.js";
import { getGateway } from "../../modules/payment/gateways/gateway.factory.js";
import { bookingStatus, bookingPaymentStatus } from "../constants/enums.js";

/**
 * Payment Reconciliation Job
 *
 * Finds payments stuck in "initiated" status for more than 20 minutes
 * and verifies their actual status with the payment gateway.
 *
 * Handles two cases:
 * 1. Payment actually succeeded but webhook was missed → confirm booking
 * 2. Payment never completed → mark as failed
 *
 * Runs every 10 minutes.
 */
async function reconcilePayments() {
  try {
    const cutoff = new Date(Date.now() - 20 * 60 * 1000); // 20 minutes ago

    const stalePayments = await PaymentModel.find({
      status: "initiated",
      createdAt: { $lt: cutoff },
      gateway: { $ne: "offline" },
    }).lean();

    if (stalePayments.length === 0) return;

    console.log(`[PaymentReconciliation] Found ${stalePayments.length} stale payment(s)`);

    const gateway = getGateway();

    for (const payment of stalePayments) {
      try {
        const result = await gateway.verify(payment.gatewayPaymentId);

        if (result.paid) {
          // Payment succeeded but webhook was missed
          const booking = await findBookingById(payment.booking);

          if (booking && booking.status === bookingStatus.PENDING) {
            // Confirm the booking
            booking.status = bookingStatus.CONFIRMED;
            booking.paymentStatus = bookingPaymentStatus.PAID;
            booking.statusHistory.push({
              status: bookingStatus.CONFIRMED,
              changedBy: null,
              note: "Payment confirmed via reconciliation job (missed webhook)",
            });
            await booking.save();

            await PaymentModel.findByIdAndUpdate(payment._id, {
              status: "paid",
              method: result.method,
              paidAt: new Date(),
              gatewayResponse: result.raw,
            });

            console.log(
              `[PaymentReconciliation] Confirmed missed payment for booking ${booking.bookingNumber}`,
            );
          } else if (
            booking &&
            (booking.status === bookingStatus.EXPIRED ||
              booking.status === bookingStatus.CANCELLED)
          ) {
            // Booking expired/cancelled but payment succeeded — auto-refund
            console.warn(
              `[PaymentReconciliation] Booking ${booking.bookingNumber} is ${booking.status} but payment succeeded. Auto-refunding.`,
            );

            await PaymentModel.findByIdAndUpdate(payment._id, {
              status: "paid",
              method: result.method,
              paidAt: new Date(),
              gatewayResponse: result.raw,
            });

            try {
              const refundResult = await gateway.refund(payment.gatewayPaymentId, payment.amount);
              await PaymentModel.findByIdAndUpdate(payment._id, {
                status: "refunded",
                refundId: refundResult.refundId,
                refundedAt: new Date(),
              });
              console.log(
                `[PaymentReconciliation] Auto-refund completed for booking ${booking.bookingNumber}`,
              );
            } catch (refundErr) {
              console.error(
                `[PaymentReconciliation] Auto-refund FAILED for ${booking.bookingNumber}:`,
                refundErr.message,
              );
            }
          }
        } else {
          // Payment never completed — mark as failed
          await PaymentModel.findByIdAndUpdate(payment._id, {
            status: "failed",
            gatewayResponse: result.raw,
          });

          console.log(
            `[PaymentReconciliation] Marked payment ${payment._id} as failed (never completed)`,
          );
        }
      } catch (err) {
        console.error(
          `[PaymentReconciliation] Failed to reconcile payment ${payment._id}:`,
          err.message,
        );
      }
    }
  } catch (err) {
    console.error("[PaymentReconciliation] Job failed:", err.message);
  }
}

/**
 * Start the payment reconciliation cron job.
 * Runs every 10 minutes.
 */
export function startPaymentReconciliationJob() {
  cron.schedule("*/10 * * * *", reconcilePayments);
  console.log("[PaymentReconciliation] Cron job started — runs every 10 minutes");
}

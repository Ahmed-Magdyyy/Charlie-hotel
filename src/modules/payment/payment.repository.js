import { PaymentModel } from "./payment.model.js";

export async function createPayment(data, session) {
  const [payment] = await PaymentModel.create([data], { session });
  return payment;
}

export async function findPaymentById(id, options = {}) {
  let query = PaymentModel.findById(id);
  if (options.populate) query = query.populate(options.populate);
  if (options.lean) query = query.lean();
  return query;
}

export async function findPaymentByGatewayId(gatewayPaymentId) {
  return PaymentModel.findOne({ gatewayPaymentId }).lean();
}

export async function findPaymentsByBooking(bookingId) {
  return PaymentModel.find({ booking: bookingId }).sort({ createdAt: -1 }).lean();
}

export async function findPayments(filter = {}, options = {}) {
  let query = PaymentModel.find(filter).sort(options.sort || { createdAt: -1 });
  if (options.skip) query = query.skip(options.skip);
  if (options.limit) query = query.limit(options.limit);
  if (options.populate) query = query.populate(options.populate);
  if (options.lean) query = query.lean();
  return query;
}

export async function countPayments(filter = {}) {
  return PaymentModel.countDocuments(filter);
}

export async function updatePaymentById(id, update) {
  return PaymentModel.findByIdAndUpdate(id, update, { new: true });
}

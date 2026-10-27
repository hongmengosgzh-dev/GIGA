// Internal state rules only. No public endpoint may mark an order paid.
export const currencyByMarket={US:'USD',JP:'JPY',UK:'GBP',DE:'EUR',CA:'CAD'};
export function verifyPayment(order,event) {
  // event must originate in a provider-specific, signature-verified server adapter.
  if(event.verified!==true || event.status!=='succeeded') throw new Error('Unverified payment');
  if(!currencyByMarket[order.market] || order.currency!==currencyByMarket[order.market]) throw new Error('Market mismatch');
  if(!Number.isSafeInteger(order.totalMinor)||order.totalMinor<=0 || event.amountMinor!==order.totalMinor || event.currency!==order.currency || event.orderId!==order.id) throw new Error('Payment mismatch');
  if(!event.provider || !event.paymentId) throw new Error('Missing payment identity');
  return {provider:event.provider,paymentId:event.paymentId};
}
export async function claimDispatch(db,id) {
  // One atomic compare-and-set across all workers; never reclaim an ambiguous send.
  const result=await db.prepare("UPDATE orders SET state='submitting',updated_at=? WHERE id=? AND state='paid'").bind(Date.now(),id).run();
  return result.meta.changes===1;
}
export async function finishDispatch(db,id,confirmed) {
  // Timeout, malformed response and rejection all require review, never blind retry.
  return db.prepare("UPDATE orders SET state=?,updated_at=? WHERE id=? AND state='submitting'").bind(confirmed?'submitted':'review',Date.now(),id).run();
}

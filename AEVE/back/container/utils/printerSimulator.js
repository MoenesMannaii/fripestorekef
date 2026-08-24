// A simple simulation: in real life, the tablet app calls printer directly.
// Here server prepares receipt payload and returns it to client.
function buildReceipt(order, items) {
  let lines = [];
  lines.push('---- OFFLINE POS ----');
  lines.push(`Order ID: ${order.id}`);
  lines.push(`Date: ${new Date(order.created_at).toLocaleString()}`);
  lines.push('----------------------');
  items.forEach(it => {
    const isDiscounted = it.remise_percentage && parseFloat(it.remise_percentage) > 0;
    if (isDiscounted) {
      lines.push(`${it.name} x${it.quantity}`);
      lines.push(`  Orig: ${parseFloat(it.original_unit_price || it.unit_price).toFixed(3)} -${it.remise_percentage}%`);
      lines.push(`  Net:  ${parseFloat(it.unit_price).toFixed(3)} DT  Tot: ${parseFloat(it.total).toFixed(3)}`);
    } else {
      lines.push(`${it.name} x${it.quantity}  ${parseFloat(it.unit_price).toFixed(3)} DT  Tot: ${parseFloat(it.total).toFixed(3)}`);
    }
  });
  lines.push('----------------------');
  lines.push(`TOTAL: ${parseFloat(order.total).toFixed(3)}`);
  if (order.points_discount && parseFloat(order.points_discount) > 0) {
    lines.push(`REMISE POINTS: -${parseFloat(order.points_discount).toFixed(3)}`);
    lines.push(`POINTS UTILISÉS: ${order.points_spent}`);
  }
  lines.push(`PAID: ${parseFloat(order.paid_amount).toFixed(3)}`);
  lines.push(`CHANGE: ${parseFloat(order.change_amount).toFixed(3)}`);
  lines.push('----------------------');
  lines.push('Merci!');
  return lines.join('\n');
}

module.exports = { buildReceipt };

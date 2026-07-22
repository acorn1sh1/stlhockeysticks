// One-shot backfill for Order.orderNumber.
//
// Run AFTER `prisma db push` adds the column, once per database (dev + prod):
//   node prisma/backfill-order-numbers.mjs
//   DATABASE_URL="<prod url>" node prisma/backfill-order-numbers.mjs
//
// Postgres assigns sequence values to existing rows when the column is added,
// but in physical row order — which is close to insertion order and not
// guaranteed to be it. This renumbers every existing order strictly by
// createdAt starting at 1000, then parks the sequence above the highest value
// so the next real order continues cleanly.
//
// Idempotent: re-running renumbers to the same values (assuming no new orders
// landed in between) and leaves the sequence in the same place.

import { PrismaClient } from "@prisma/client";

const START = 1000;
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }], // id breaks same-timestamp ties
    select: { id: true, orderNumber: true, createdAt: true },
  });

  if (orders.length === 0) {
    console.log("No orders to backfill.");
  } else {
    // Two passes. orderNumber is UNIQUE, so assigning final values directly
    // collides whenever a target value is still held by a row we haven't
    // moved yet. Parking everything in the negative range first sidesteps it
    // without dropping the constraint.
    await prisma.$transaction(
      orders.map((o, i) =>
        prisma.order.update({ where: { id: o.id }, data: { orderNumber: -(i + 1) } })
      )
    );
    await prisma.$transaction(
      orders.map((o, i) =>
        prisma.order.update({ where: { id: o.id }, data: { orderNumber: START + i } })
      )
    );

    const first = orders[0];
    const last = orders[orders.length - 1];
    console.log(
      `Renumbered ${orders.length} order(s): STL-${START} (${first.createdAt.toISOString().slice(0, 10)}) … STL-${START + orders.length - 1} (${last.createdAt.toISOString().slice(0, 10)})`
    );
  }

  // Park the sequence above the last assigned value. setval's third arg
  // false => the NEXT nextval() returns exactly this number.
  const next = START + orders.length;
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Order"', 'orderNumber'), ${next}, false)`
  );
  console.log(`Next order will be STL-${next}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

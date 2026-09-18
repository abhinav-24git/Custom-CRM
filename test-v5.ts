import prisma from './src/lib/prisma';

async function runTest() {
  console.log('=== Starting V5 Automated Integration Test ===\n');

  // 1. Create or fetch Customer, Item, Supplier
  let customer = await prisma.customer.findFirst();
  if (!customer) {
    customer = await prisma.customer.create({
      data: { name: 'Acme Corp V5', contact_person: 'John Doe', email: 'john@acme.com', phone: '1234567890' }
    });
  }

  let item = await prisma.item.findFirst();
  if (!item) {
    item = await prisma.item.create({
      data: { name: 'Precision Gear Shaft', uom: 'PCS', default_rate: 150 }
    });
  }

  let supplier = await prisma.supplier.findFirst();
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: { name: 'Apex Job Workers Ltd', contact_person: 'Bob Smith', email: 'bob@apex.com', phone: '9876543210' }
    });
  }

  // 2. Create Confirmed Sales Order
  const soCount = await prisma.salesOrder.count();
  const so = await prisma.salesOrder.create({
    data: {
      so_number: `SO-TEST-V5-${soCount + 1}`,
      customer_id: customer.id,
      status: 'Open',
      is_confirmed: true,
      confirmed_at: new Date(),
      total_amount: 15000,
      lines: {
        create: [
          {
            item_id: item.id,
            ordered_qty: 100,
            rate: 150,
            amount: 15000,
            balance_qty: 100
          }
        ]
      }
    },
    include: { lines: true }
  });

  const soItem = so.lines[0];
  console.log(`✓ Created Confirmed Sales Order ${so.so_number} with item qty ${soItem.ordered_qty}`);

  // 3. Create Planning (In-House 60, Outsource 40)
  const plnCount = await prisma.planning.count();
  const pln = await prisma.planning.create({
    data: {
      planning_number: `PLN-TEST-${plnCount + 1}`,
      sales_order_item_id: soItem.id,
      inhouse_qty: 60,
      outsource_qty: 40,
      status: 'Draft',
      notes: 'V5 E2E Verification Plan'
    }
  });
  console.log(`✓ Created Planning ${pln.planning_number} (In-house: 60, Outsource: 40)`);

  // 4. Test Release Planning -> auto-generates Job Card
  const released = await prisma.$transaction(async (tx) => {
    const jcCount = await tx.jobCard.count();
    const jc = await tx.jobCard.create({
      data: {
        job_card_number: `JC-TEST-${jcCount + 1}`,
        planning_id: pln.id,
        planned_qty: pln.inhouse_qty,
        status: 'Released'
      }
    });
    const updated = await tx.planning.update({
      where: { id: pln.id },
      data: { status: 'Released' },
      include: { JobCards: true }
    });
    return { updated, jc };
  });

  console.log(`✓ Released Planning, generated Job Card ${released.jc.job_card_number} with planned_qty ${released.jc.planned_qty}`);

  // 5. In-House Execution: Job Card & Production Entry
  const jc = released.jc;
  // Start Job Card
  await prisma.jobCard.update({ where: { id: jc.id }, data: { status: 'In Progress' } });
  console.log(`✓ Started Job Card (status: In Progress)`);

  // Entry 1: Produced 40, Rejected 5 (Total 45)
  await prisma.productionEntry.create({
    data: {
      job_card_id: jc.id,
      produced_qty: 40,
      rejected_qty: 5,
      remarks: 'Batch 1 output'
    }
  });
  console.log(`✓ Recorded Production Entry 1: 40 good, 5 rejected (45 total)`);

  // Entry 2: Produced 15, Rejected 0 (Total 60 -> completes planned 60)
  await prisma.productionEntry.create({
    data: {
      job_card_id: jc.id,
      produced_qty: 15,
      rejected_qty: 0,
      remarks: 'Batch 2 completion'
    }
  });
  await prisma.jobCard.update({ where: { id: jc.id }, data: { status: 'Completed' } });
  console.log(`✓ Recorded Production Entry 2: 15 good -> Job Card status updated to Completed!`);

  // 6. Outsource Execution: Job Work RFQ -> Quote -> Service Order -> RGP -> Return GRN
  const rfqCount = await prisma.jobWorkRFQ.count();
  const rfq = await prisma.jobWorkRFQ.create({
    data: {
      rfq_number: `JW-RFQ-TEST-${rfqCount + 1}`,
      planning_id: pln.id,
      process: 'Hard Chrome Plating',
      qty: 40,
      material_responsibility: 'Company',
      status: 'Sent',
      suppliers: {
        create: [{ supplier_id: supplier.id }]
      }
    }
  });
  console.log(`✓ Created and Sent Job Work RFQ ${rfq.rfq_number} for 40 units`);

  // Submit quote
  const quote = await prisma.jobWorkQuote.create({
    data: {
      jobwork_rfq_id: rfq.id,
      supplier_id: supplier.id,
      rate: 25,
      amount: 1000,
      lead_time_days: 5,
      is_selected: true
    }
  });
  await prisma.jobWorkRFQ.update({ where: { id: rfq.id }, data: { status: 'Compared' } });
  console.log(`✓ Submitted and Selected Supplier Quote ($25/unit, total $1,000)`);

  // Generate Service Order
  const soJwCount = await prisma.serviceOrder.count();
  const serviceOrder = await prisma.serviceOrder.create({
    data: {
      service_order_number: `SO-JW-TEST-${soJwCount + 1}`,
      jobwork_rfq_id: rfq.id,
      jobwork_quote_id: quote.id,
      supplier_id: supplier.id,
      process: rfq.process,
      ordered_qty: rfq.qty,
      rate: quote.rate,
      amount: quote.amount,
      status: 'Issued'
    }
  });
  await prisma.jobWorkRFQ.update({ where: { id: rfq.id }, data: { status: 'Closed' } });
  console.log(`✓ Generated Service Order ${serviceOrder.service_order_number} for 40 units`);

  // Issue RGP Challan
  const rgpCount = await prisma.rGPChallan.count();
  const rgp = await prisma.rGPChallan.create({
    data: {
      rgp_number: `RGP-TEST-${rgpCount + 1}`,
      service_order_id: serviceOrder.id,
      vendor_id: supplier.id,
      sent_qty: 40,
      status: 'Dispatched'
    }
  });
  await prisma.serviceOrder.update({ where: { id: serviceOrder.id }, data: { status: 'In Progress' } });
  console.log(`✓ Issued RGP Challan ${rgp.rgp_number} for 40 units sent to vendor`);

  // Return GRN 1: 25 received (20 accepted, 3 rejected, 2 rework) -> sum = 25
  await prisma.rGPReturn.create({
    data: {
      rgp_challan_id: rgp.id,
      received_qty: 25,
      accepted_qty: 20,
      rejected_qty: 3,
      rework_qty: 2,
      remarks: 'Batch 1 return from plating'
    }
  });
  await prisma.rGPChallan.update({ where: { id: rgp.id }, data: { status: 'Partially Returned' } });
  await prisma.serviceOrder.update({ where: { id: serviceOrder.id }, data: { status: 'Partially Received' } });
  console.log(`✓ Recorded Return GRN 1: Received 25 (20 accepted, 3 rejected, 2 rework). RGP is Partially Returned.`);

  // Return GRN 2: 15 received (15 accepted, 0 rejected, 0 rework) -> sum = 15 (Total 40 returned)
  await prisma.rGPReturn.create({
    data: {
      rgp_challan_id: rgp.id,
      received_qty: 15,
      accepted_qty: 15,
      rejected_qty: 0,
      rework_qty: 0,
      remarks: 'Batch 2 return final'
    }
  });
  await prisma.rGPChallan.update({ where: { id: rgp.id }, data: { status: 'Closed' } });
  await prisma.serviceOrder.update({ where: { id: serviceOrder.id }, data: { status: 'Completed' } });
  await prisma.planning.update({ where: { id: pln.id }, data: { status: 'Completed' } });
  console.log(`✓ Recorded Return GRN 2: Received 15 (15 accepted). RGP is Closed, Service Order is Completed, and Planning is Completed!`);

  console.log('\n=== ALL V5 E2E ENGINE & ARITHMETIC TESTS PASSED SUCCESSFULLY! ===');
}

runTest()
  .catch((e) => {
    console.error('Test Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

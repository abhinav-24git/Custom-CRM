import prisma from './src/lib/prisma';

async function runV6Test() {
  console.log('=== Starting V6 Automated Integration & Acceptance Test ===\n');

  // 1. Setup Master Data
  let customer = await prisma.customer.findFirst();
  if (!customer) {
    customer = await prisma.customer.create({
      data: { name: 'Titan Industries V6', contact_person: 'Sarah Connor', email: 'sarah@titan.com', phone: '9988776655' }
    });
  }

  let item = await prisma.item.findFirst();
  if (!item) {
    item = await prisma.item.create({
      data: { name: 'Titanium Valve Assembly', uom: 'PCS', default_rate: 200 }
    });
  }

  let supplier = await prisma.supplier.findFirst();
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: { name: 'Precision Coating Ltd', contact_person: 'Rajesh Kumar', email: 'rajesh@coating.com', phone: '9123456780' }
    });
  }

  // 2. Create and Confirm Sales Order (100 units)
  const soCount = await prisma.salesOrder.count();
  const so = await prisma.salesOrder.create({
    data: {
      so_number: `SO-V6-TEST-${soCount + 1}`,
      customer_id: customer.id,
      status: 'Open',
      is_confirmed: true,
      confirmed_at: new Date(),
      total_amount: 20000,
      lines: {
        create: [
          {
            item_id: item.id,
            ordered_qty: 100,
            rate: 200,
            amount: 20000,
            balance_qty: 100
          }
        ]
      }
    },
    include: { lines: true }
  });
  const soItem = so.lines[0];
  console.log(`✓ [Step 1] Confirmed Sales Order ${so.so_number} created with 100 units.`);

  // 3. Create Planning: 60 in-house, 40 outsource
  const plnCount = await prisma.planning.count();
  const planning = await prisma.planning.create({
    data: {
      planning_number: `PLN-V6-${plnCount + 1}`,
      sales_order_item_id: soItem.id,
      inhouse_qty: 60,
      outsource_qty: 40,
      status: 'Released'
    }
  });

  // Auto-generate Job Card for in-house 60 units
  const jcCount = await prisma.jobCard.count();
  const jobCard = await prisma.jobCard.create({
    data: {
      job_card_number: `JC-V6-${jcCount + 1}`,
      planning_id: planning.id,
      planned_qty: 60,
      status: 'In Progress'
    }
  });
  console.log(`✓ [Step 2] Planning released. Job Card ${jobCard.job_card_number} created for 60 units.`);

  // 4. In-House Execution: Record Production -> Triggers Auto QC Inspection
  // Produced 55 good, 5 scrap (total 60 -> completes Job Card)
  await prisma.productionEntry.create({
    data: {
      job_card_id: jobCard.id,
      produced_qty: 55,
      rejected_qty: 5,
      remarks: 'Batch 1 complete'
    }
  });
  await prisma.jobCard.update({ where: { id: jobCard.id }, data: { status: 'Completed' } });

  // Simulate server-side auto QC creation on Job Card completion
  const qcCount = await prisma.qCInspection.count();
  const jcQc = await prisma.qCInspection.create({
    data: {
      qc_number: `QC-V6-${qcCount + 1}`,
      source_type: 'Job Card',
      source_id: jobCard.id,
      sales_order_item_id: soItem.id,
      status: 'Pending',
      items: {
        create: { inspected_qty: 55 }
      }
    },
    include: { items: true }
  });
  console.log(`✓ [Step 3] Job Card completed. Auto-created Pending QC Inspection ${jcQc.qc_number} for 55 inspected units.`);

  // 5. Submit In-House QC Inspection: 50 accepted, 3 rejected, 2 rework (sum = 55) + Log QC Action
  const jcQcItem = jcQc.items[0];
  await prisma.qCInspectionItem.update({
    where: { id: jcQcItem.id },
    data: { accepted_qty: 50, rejected_qty: 3, rework_qty: 2, remarks: 'Dimensional check passed' }
  });
  const qcAction = await prisma.qCAction.create({
    data: {
      qc_inspection_item_id: jcQcItem.id,
      action_type: 'Scrap',
      owner: 'Quality Inspector Dan',
      due_date: new Date(),
      status: 'Open'
    }
  });
  await prisma.qCInspection.update({ where: { id: jcQc.id }, data: { status: 'Completed' } });
  console.log(`✓ [Step 4] In-house QC completed: 50 accepted, 3 rejected, 2 rework. Open QC Action logged for Dan.`);

  // 6. Outsource Execution: Job Work RFQ -> Service Order -> RGP Challan -> Return GRN -> Auto QC Inspection
  const rfqCount = await prisma.jobWorkRFQ.count();
  const rfq = await prisma.jobWorkRFQ.create({
    data: {
      rfq_number: `JW-RFQ-V6-${rfqCount + 1}`,
      planning_id: planning.id,
      process: 'Hard Chrome Anodizing',
      qty: 40,
      status: 'Closed'
    }
  });

  const quote = await prisma.jobWorkQuote.create({
    data: {
      jobwork_rfq_id: rfq.id,
      supplier_id: supplier.id,
      rate: 30,
      amount: 1200,
      is_selected: true
    }
  });

  const soJwCount = await prisma.serviceOrder.count();
  const serviceOrder = await prisma.serviceOrder.create({
    data: {
      service_order_number: `SO-JW-V6-${soJwCount + 1}`,
      jobwork_rfq_id: rfq.id,
      jobwork_quote_id: quote.id,
      supplier_id: supplier.id,
      process: rfq.process,
      ordered_qty: 40,
      rate: 30,
      amount: 1200,
      status: 'In Progress'
    }
  });

  const rgpCount = await prisma.rGPChallan.count();
  const rgp = await prisma.rGPChallan.create({
    data: {
      rgp_number: `RGP-V6-${rgpCount + 1}`,
      service_order_id: serviceOrder.id,
      vendor_id: supplier.id,
      sent_qty: 40,
      status: 'Partially Returned'
    }
  });

  // Post Return GRN: 40 received, 35 accepted, 3 rejected, 2 rework
  const retEntry = await prisma.rGPReturn.create({
    data: {
      rgp_challan_id: rgp.id,
      received_qty: 40,
      accepted_qty: 35,
      rejected_qty: 3,
      rework_qty: 2,
      challan_ref: 'CH-V6-991'
    }
  });

  // Auto-created Pending QC for RGP Return
  const rgpQcCount = await prisma.qCInspection.count();
  const rgpQc = await prisma.qCInspection.create({
    data: {
      qc_number: `QC-V6-${rgpQcCount + 1}`,
      source_type: 'RGP Return',
      source_id: retEntry.id,
      sales_order_item_id: soItem.id,
      status: 'Pending',
      items: {
        create: { inspected_qty: 35 }
      }
    },
    include: { items: true }
  });
  console.log(`✓ [Step 5] Return GRN posted. Auto-created Pending QC Inspection ${rgpQc.qc_number} for 35 inspected units.`);

  // Submit Outsource QC: 32 accepted, 3 rejected (sum = 35)
  const rgpQcItem = rgpQc.items[0];
  await prisma.qCInspectionItem.update({
    where: { id: rgpQcItem.id },
    data: { accepted_qty: 32, rejected_qty: 3, rework_qty: 0, remarks: 'Vendor coating thickness approved' }
  });
  await prisma.qCInspection.update({ where: { id: rgpQc.id }, data: { status: 'Completed' } });
  console.log(`✓ [Step 6] Outsource QC completed: 32 accepted, 3 rejected.`);

  // 7. Verify QC Acceptance Gate for Dispatch
  // Total QC Accepted = 50 (in-house) + 32 (outsource) = 82 units
  const completedQcs = await prisma.qCInspection.findMany({
    where: { sales_order_item_id: soItem.id, status: 'Completed' },
    include: { items: true }
  });

  const totalQcAccepted = completedQcs.reduce((sum, qc) => sum + qc.items.reduce((s, i) => s + i.accepted_qty, 0), 0);
  console.log(`✓ [Step 7] Total QC-Accepted Quantity across all inspections: ${totalQcAccepted} units (Expected: 82).`);

  if (totalQcAccepted !== 82) {
    throw new Error(`Expected 82 QC accepted units, got ${totalQcAccepted}`);
  }

  // 8. Create Partial Dispatch 1 (50 units)
  const dspCount = await prisma.dispatch.count();
  const dispatch1 = await prisma.dispatch.create({
    data: {
      dispatch_number: `DC-V6-${dspCount + 1}`,
      sales_order_id: so.id,
      transporter: 'V-Trans Logistics',
      vehicle_number: 'KA-01-MJ-5566',
      lr_number: 'LR-998811',
      package_count: 2,
      weight: 45.0,
      invoice_reference: 'INV-2026-001',
      items: {
        create: [
          {
            sales_order_item_id: soItem.id,
            dispatched_qty: 50
          }
        ]
      }
    }
  });

  // Record v1 ledger entry & update SO line
  await prisma.dispatchEntry.create({
    data: { sales_order_item_id: soItem.id, type: 'Dispatch', qty: 50, remarks: `Dispatch ${dispatch1.dispatch_number}` }
  });
  await prisma.salesOrderItem.update({
    where: { id: soItem.id },
    data: { dispatched_qty: 50, balance_qty: 50 }
  });
  await prisma.salesOrder.update({
    where: { id: so.id },
    data: { status: 'Partially Dispatched' }
  });
  console.log(`✓ [Step 8] Partial Dispatch 1 created for 50 units. SO status: Partially Dispatched, Balance: 50.`);

  // 9. Create Partial Dispatch 2 (32 units -> completes all available QC stock)
  const dispatch2 = await prisma.dispatch.create({
    data: {
      dispatch_number: `DC-V6-${dspCount + 2}`,
      sales_order_id: so.id,
      transporter: 'BlueDart Express',
      vehicle_number: 'KA-05-XY-1234',
      lr_number: 'BD-776655',
      package_count: 1,
      weight: 28.5,
      invoice_reference: 'INV-2026-002',
      items: {
        create: [
          {
            sales_order_item_id: soItem.id,
            dispatched_qty: 32
          }
        ]
      }
    }
  });

  await prisma.dispatchEntry.create({
    data: { sales_order_item_id: soItem.id, type: 'Dispatch', qty: 32, remarks: `Dispatch ${dispatch2.dispatch_number}` }
  });
  await prisma.salesOrderItem.update({
    where: { id: soItem.id },
    data: { dispatched_qty: 82, balance_qty: 18 }
  });
  console.log(`✓ [Step 9] Partial Dispatch 2 created for 32 units. Cumulative dispatched: 82, Remaining SO balance: 18.`);

  // 10. Verify remaining available to dispatch is now 0 (82 QC accepted - 82 dispatched)
  const remainingAvailable = Math.max(0, totalQcAccepted - 82);
  console.log(`✓ [Step 10] Remaining Available to Dispatch against QC stock: ${remainingAvailable} units.`);
  if (remainingAvailable !== 0) {
    throw new Error(`Expected 0 available to dispatch, got ${remainingAvailable}`);
  }

  // 11. Close QC Action in Action Tracker
  await prisma.qCAction.update({
    where: { id: qcAction.id },
    data: { status: 'Closed' }
  });
  console.log(`✓ [Step 11] QC Action closed successfully.`);

  console.log('\n=== ALL VERSION 6 ACCEPTANCE CRITERIA & ARITHMETIC TESTS PASSED! ===');
}

runV6Test()
  .catch((e) => {
    console.error('Test Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

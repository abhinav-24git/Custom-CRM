import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const pad = (n: number, w = 4) => String(n).padStart(w, "0");
const ALL_MODULES = [
  "enquiries", "quotations", "sales_orders", "material_requirements",
  "purchase_rfqs", "purchase_orders", "plannings", "job_cards",
  "jobwork_rfqs", "service_orders", "rgp_challans", "qc_inspections",
  "dispatches", "feedbacks", "reports", "admin"
];

async function main() {
  console.log("🇮🇳 Indian Tooling, CNC & VMC Precision Engineering Seed starting...");

  // Check if data already exists
  const existingCustomers = await prisma.customer.count();
  if (existingCustomers > 0) {
    console.log(`Database already contains ${existingCustomers} customers. Ensuring admin user and permissions exist...`);
  }

  // 1. ADMIN ROLE & SYSTEM USER (Upserted first so login always works)
  const adminRole = await prisma.role.upsert({
    where: { name: "Management/Admin" },
    update: {},
    create: {
      name: "Management/Admin",
      is_system_role: true,
      permissions: {
        create: ALL_MODULES.map(m => ({
          module: m,
          can_view: true,
          can_create: true,
          can_edit: true,
          can_approve: true,
          can_delete: true,
          can_export: true
        }))
      }
    }
  });

  const salesRole = await prisma.role.upsert({
    where: { name: "Sales & Marketing" },
    update: {},
    create: {
      name: "Sales & Marketing",
      is_system_role: false,
      permissions: {
        create: ALL_MODULES.map(m => ({
          module: m,
          can_view: ["enquiries", "quotations", "sales_orders", "reports", "feedbacks"].includes(m),
          can_create: ["enquiries", "quotations", "sales_orders"].includes(m),
          can_edit: ["enquiries", "quotations"].includes(m),
          can_approve: false,
          can_delete: false,
          can_export: true
        }))
      }
    }
  });

  const shopFloorRole = await prisma.role.upsert({
    where: { name: "Production & QC" },
    update: {},
    create: {
      name: "Production & QC",
      is_system_role: false,
      permissions: {
        create: ALL_MODULES.map(m => ({
          module: m,
          can_view: ["plannings", "job_cards", "qc_inspections", "service_orders", "rgp_challans", "dispatches"].includes(m),
          can_create: ["job_cards", "qc_inspections", "rgp_challans"].includes(m),
          can_edit: ["job_cards", "qc_inspections"].includes(m),
          can_approve: ["qc_inspections"].includes(m),
          can_delete: false,
          can_export: false
        }))
      }
    }
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@custom-crm.in" },
    update: {},
    create: {
      name: "Saurav Raj (Admin)",
      email: "admin@custom-crm.in",
      password_hash: "admin123",
      role_id: adminRole.id,
      is_active: true
    }
  });

  const salesUser = await prisma.user.upsert({
    where: { email: "rajesh.sales@custom-crm.in" },
    update: {},
    create: {
      name: "Rajesh Patil (Sales Head)",
      email: "rajesh.sales@custom-crm.in",
      password_hash: "sales123",
      role_id: salesRole.id,
      is_active: true
    }
  });

  const qcUser = await prisma.user.upsert({
    where: { email: "rohit.qc@custom-crm.in" },
    update: {},
    create: {
      name: "Rohit Shinde (QC Engineer)",
      email: "rohit.qc@custom-crm.in",
      password_hash: "qc123",
      role_id: shopFloorRole.id,
      is_active: true
    }
  });

  if (existingCustomers > 0) {
    console.log("Existing data preserved. Seed completed.");
    return;
  }

  // 2. INDIAN CUSTOMERS (Tooling / Auto OEMs / Engineering)
  const [cust1, cust2, cust3, cust4, cust5] = await Promise.all([
    prisma.customer.create({
      data: {
        name: "Tata Motors Auto Component Div (Pune)",
        contact_person: "Sanjay Deshmukh",
        phone: "+91 98220 12345",
        email: "sanjay.deshmukh@tatamotors-vendor.in"
      }
    }),
    prisma.customer.create({
      data: {
        name: "Mahindra Precision & Engine Systems (Chakan)",
        contact_person: "Amitabh Sen",
        phone: "+91 98221 54321",
        email: "amitabh.sen@mahindra-systems.in"
      }
    }),
    prisma.customer.create({
      data: {
        name: "Bharat Heavy Forgings & Tooling (Faridabad)",
        contact_person: "Vikas Aggarwal",
        phone: "+91 98110 87654",
        email: "vikas@bharattoolings.in"
      }
    }),
    prisma.customer.create({
      data: {
        name: "Kirloskar Oil Engines & Pump Systems (Kolhapur)",
        contact_person: "Rajeev Kulkarni",
        phone: "+91 98230 45678",
        email: "rajeev.kulkarni@kirloskar-vendor.in"
      }
    }),
    prisma.customer.create({
      data: {
        name: "Godrej Aerospace & Precision Tooling (Mumbai)",
        contact_person: "Pooja Iyer",
        phone: "+91 98200 99887",
        email: "pooja.iyer@godrej-precision.in"
      }
    })
  ]);

  // 3. MANUFACTURED ITEMS (Precision CNC / VMC / Toolings)
  const [itm1, itm2, itm3, itm4, itm5, itm6, itm7, itm8] = await Promise.all([
    prisma.item.create({ data: { name: "VMC Milled Bracket Flange (4-Axis)", uom: "Pcs", default_rate: 1850 } }),
    prisma.item.create({ data: { name: "CNC Turned Hardened Bushing (Ø45x80mm)", uom: "Pcs", default_rate: 650 } }),
    prisma.item.create({ data: { name: "Progressive Die Punch & Matrix Set", uom: "Set", default_rate: 45000 } }),
    prisma.item.create({ data: { name: "Fixture Base Plate - 600x400 (VMC Graded)", uom: "Pcs", default_rate: 8200 } }),
    prisma.item.create({ data: { name: "Hardened Spline Shaft 6-Key (Ø35mm)", uom: "Pcs", default_rate: 3400 } }),
    prisma.item.create({ data: { name: "Alloy Steel Guide Pin (Ø20x120mm - 58 HRC)", uom: "Pcs", default_rate: 420 } }),
    prisma.item.create({ data: { name: "Hydraulic Cylinder End Cap (CNC Bored)", uom: "Pcs", default_rate: 2750 } }),
    prisma.item.create({ data: { name: "Custom CNC Impeller Hub (Al 6061-T6)", uom: "Pcs", default_rate: 5800 } }),
  ]);

  // 4. RAW MATERIALS & INSERTS
  const [mat1, mat2, mat3, mat4, mat5, mat6] = await Promise.all([
    prisma.material.create({ data: { name: "EN8 Carbon Steel Round Bar (Ø60mm)", uom: "Kg", available_stock: 650 } }),
    prisma.material.create({ data: { name: "EN24 Alloy Steel Forged Block (150x150mm)", uom: "Kg", available_stock: 0 } }),
    prisma.material.create({ data: { name: "Aluminium 6061-T6 Aircraft Billet", uom: "Kg", available_stock: 280 } }),
    prisma.material.create({ data: { name: "HCHCr D2 Cold Work Die Steel (25mm Plate)", uom: "Kg", available_stock: 0 } }),
    prisma.material.create({ data: { name: "SS304 Precision Ground Rod (Ø25mm)", uom: "Kg", available_stock: 120 } }),
    prisma.material.create({ data: { name: "Carbide Indexable Inserts CNMG 120408", uom: "Pcs", available_stock: 45 } }),
  ]);

  // 5. SUPPLIERS & OUTSOURCE JOB WORK VENDORS (Indian Industrial Hubs)
  const [sup1, sup2, sup3, sup4] = await Promise.all([
    prisma.supplier.create({
      data: {
        name: "Apex Alloy Steels (Bhosari MIDC, Pune)",
        contact_person: "Manish Joshi",
        phone: "+91 98222 11001",
        email: "manish@apexalloys.in"
      }
    }),
    prisma.supplier.create({
      data: {
        name: "Jai Bharat Steel & Tooling Distributors (Navi Mumbai)",
        contact_person: "Nitin Sawant",
        phone: "+91 98205 22002",
        email: "nitin@jaibharatsteel.in"
      }
    }),
    prisma.supplier.create({
      data: {
        name: "Mahalaxmi Vacuum Heat Treaters & Hardening (Nashik)",
        contact_person: "Arun Kulkarni",
        phone: "+91 98235 33003",
        email: "arun@mahalaxmiheat.in"
      }
    }),
    prisma.supplier.create({
      data: {
        name: "Shree Balaji Surface Treatment & Hard Chrome (Peenya, Bengaluru)",
        contact_person: "S. Venkatesh",
        phone: "+91 98450 44004",
        email: "venkatesh@balajichrome.in"
      }
    })
  ]);

  console.log("Masters seeded successfully.");

  // 6. ENQUIRIES & QUOTATIONS WITH REVISIONS (₹)
  const enq1 = await prisma.enquiry.create({
    data: {
      enquiry_number: "ENQ-2026-001",
      customer_id: cust1.id,
      status: "New",
      source: "Direct RFQ / Email",
      notes: "Requirements for 4-axis VMC milled brackets for EV chassis pilot run.",
      items: {
        create: [
          { item_id: itm1.id, requested_qty: 120, target_date: new Date(Date.now() + 25 * 86400000) },
          { item_id: itm2.id, requested_qty: 200, target_date: new Date(Date.now() + 30 * 86400000) }
        ]
      }
    }
  });

  await prisma.followup.create({
    data: {
      enquiry_id: enq1.id,
      followup_date: new Date(),
      outcome: "Discussed drawing revision D with purchase lead. Tolerance ±0.015mm confirmed.",
      next_followup_date: new Date(Date.now() + 2 * 86400000)
    }
  });

  const enq2 = await prisma.enquiry.create({
    data: {
      enquiry_number: "ENQ-2026-002",
      customer_id: cust2.id,
      status: "Quotation Created",
      source: "Phone Call",
      notes: "Urgent batch of hardened spline shafts and hydraulic cylinder caps.",
      items: {
        create: [
          { item_id: itm5.id, requested_qty: 40 },
          { item_id: itm7.id, requested_qty: 30 }
        ]
      }
    }
  });

  // Quotation with Revision History
  const qt2_rev0 = await prisma.quotation.create({
    data: {
      quotation_number: "QT-2026-001",
      revision_number: 0,
      enquiry_id: enq2.id,
      customer_id: cust2.id,
      status: "Rejected",
      rejection_reason: "Customer requested 5% volume discount on spline shafts.",
      is_latest_revision: false,
      total_amount: 40 * 3600 + 30 * 2900,
      lines: {
        create: [
          { item_id: itm5.id, qty: 40, rate: 3600, discount: 0, amount: 144000 },
          { item_id: itm7.id, qty: 30, rate: 2900, discount: 0, amount: 87000 }
        ]
      }
    }
  });

  const qt2_rev1 = await prisma.quotation.create({
    data: {
      quotation_number: "QT-2026-001",
      revision_number: 1,
      enquiry_id: enq2.id,
      customer_id: cust2.id,
      status: "Accepted",
      is_latest_revision: true,
      total_amount: 40 * 3400 + 30 * 2750,
      lines: {
        create: [
          { item_id: itm5.id, qty: 40, rate: 3400, discount: 0, amount: 136000 },
          { item_id: itm7.id, qty: 30, rate: 2750, discount: 0, amount: 82500 }
        ]
      }
    },
    include: { lines: true }
  });

  // 7. CONFIRMED SALES ORDERS (SO)
  // SO 1: Live Order Converted from Quotation
  const so1 = await prisma.salesOrder.create({
    data: {
      so_number: "SO-2026-001",
      quotation_id: qt2_rev1.id,
      customer_id: cust2.id,
      total_amount: 218500,
      status: "In Planning",
      is_confirmed: true,
      confirmed_at: new Date(),
      customer_po_number: "PO/MM/2026/0491",
      delivery_commitment_date: new Date(Date.now() + 20 * 86400000),
      lines: {
        create: [
          { item_id: itm5.id, ordered_qty: 40, rate: 3400, amount: 136000, balance_qty: 40 },
          { item_id: itm7.id, ordered_qty: 30, rate: 2750, amount: 82500, balance_qty: 30 }
        ]
      }
    },
    include: { lines: true }
  });

  // SO 2: Progressive Tooling Die Order
  const so2 = await prisma.salesOrder.create({
    data: {
      so_number: "SO-2026-002",
      customer_id: cust3.id,
      total_amount: 2 * 45000 + 4 * 8200,
      status: "Open",
      is_confirmed: true,
      confirmed_at: new Date(),
      customer_po_number: "BH/TOOL/9902",
      delivery_commitment_date: new Date(Date.now() + 35 * 86400000),
      lines: {
        create: [
          { item_id: itm3.id, ordered_qty: 2, rate: 45000, amount: 90000, balance_qty: 2 },
          { item_id: itm4.id, ordered_qty: 4, rate: 8200, amount: 32800, balance_qty: 4 }
        ]
      }
    },
    include: { lines: true }
  });

  // SO 3: High Volume Bushings (Partially Dispatched)
  const so3_raw = await prisma.salesOrder.create({
    data: {
      so_number: "SO-2026-003",
      customer_id: cust1.id,
      total_amount: 150 * 650 + 80 * 1850,
      status: "Partially Dispatched",
      is_confirmed: true,
      confirmed_at: new Date(),
      customer_po_number: "TATA/PUNE/7821",
      delivery_commitment_date: new Date(Date.now() + 10 * 86400000),
      lines: {
        create: [
          { item_id: itm2.id, ordered_qty: 150, rate: 650, amount: 97500, dispatched_qty: 80, balance_qty: 70 },
          { item_id: itm1.id, ordered_qty: 80, rate: 1850, amount: 148000, dispatched_qty: 30, balance_qty: 50 }
        ]
      }
    },
    include: { lines: true }
  });

  await prisma.dispatchEntry.create({
    data: { sales_order_item_id: so3_raw.lines[0].id, type: "Dispatch", qty: 80, remarks: "Batch 1 dispatched via VRL" }
  });
  await prisma.dispatchEntry.create({
    data: { sales_order_item_id: so3_raw.lines[1].id, type: "Dispatch", qty: 30, remarks: "Batch 1 dispatched via VRL" }
  });

  // 8. MATERIAL REQUIREMENTS & PROCUREMENT
  const mr1 = await prisma.materialRequirement.create({
    data: {
      mr_number: "MR-2026-001",
      sales_order_id: so1.id,
      required_date: new Date(Date.now() + 12 * 86400000),
      status: "Checked",
      items: {
        create: [
          { material_id: mat1.id, required_qty: 180, available_qty: 650, shortage_qty: 0, notes: "In-stock EN8 bar" },
          { material_id: mat2.id, required_qty: 90, available_qty: 0, shortage_qty: 90, notes: "Shortage: Need EN24 forged block" }
        ]
      }
    },
    include: { items: true }
  });

  const mr_item_shortage = mr1.items.find(i => i.shortage_qty > 0)!;

  // Purchase RFQ & Comparison Matrix
  const rfq1 = await prisma.purchaseRFQ.create({
    data: {
      rfq_number: "PRFQ-2026-001",
      material_requirement_id: mr1.id,
      status: "Quotes Received",
      items: {
        create: [
          { material_id: mat2.id, required_qty: 90, material_requirement_item_id: mr_item_shortage.id }
        ]
      },
      suppliers: {
        create: [
          { supplier_id: sup1.id },
          { supplier_id: sup2.id }
        ]
      }
    },
    include: { items: true }
  });

  const sq1 = await prisma.supplierQuote.create({
    data: {
      purchase_rfq_id: rfq1.id,
      supplier_id: sup1.id,
      items: {
        create: [
          { purchase_rfq_item_id: rfq1.items[0].id, rate: 165, lead_time_days: 4, amount: 90 * 165, is_selected: true }
        ]
      }
    },
    include: { items: true }
  });

  await prisma.supplierQuote.create({
    data: {
      purchase_rfq_id: rfq1.id,
      supplier_id: sup2.id,
      items: {
        create: [
          { purchase_rfq_item_id: rfq1.items[0].id, rate: 178, lead_time_days: 6, amount: 90 * 178, is_selected: false }
        ]
      }
    }
  });

  // Purchase Order & GRN Receipt
  const po1 = await prisma.purchaseOrder.create({
    data: {
      po_number: "PO-2026-001",
      purchase_rfq_id: rfq1.id,
      supplier_id: sup1.id,
      status: "Partially Received",
      total_amount: 14850,
      lines: {
        create: [
          {
            material_id: mat2.id,
            supplier_quote_item_id: sq1.items[0].id,
            purchase_rfq_item_id: rfq1.items[0].id,
            ordered_qty: 90,
            rate: 165,
            amount: 14850,
            received_qty: 60,
            pending_qty: 30
          }
        ]
      }
    },
    include: { lines: true }
  });

  await prisma.gRN.create({
    data: {
      grn_number: "GRN-2026-001",
      purchase_order_id: po1.id,
      supplier_challan_ref: "APEX/CH/8821",
      items: {
        create: [
          {
            purchase_order_item_id: po1.lines[0].id,
            received_qty: 60,
            accepted_qty: 58,
            rejected_qty: 2,
            remarks: "58 Kg Accepted. 2 Kg rejected due to deep scale inclusions."
          }
        ]
      }
    }
  });
  await prisma.material.update({ where: { id: mat2.id }, data: { available_stock: 58 } });

  // 9. PLANNING & EXECUTION (IN-HOUSE VMC/CNC & OUTSOURCED JOB WORK)
  const plan1 = await prisma.planning.create({
    data: {
      planning_number: "PLN-2026-001",
      sales_order_item_id: so1.lines[0].id, // Spline shafts
      inhouse_qty: 25,
      outsource_qty: 15,
      target_start_date: new Date(),
      target_end_date: new Date(Date.now() + 8 * 86400000),
      status: "Released",
      notes: "25 Pcs on In-House CNC-Turn 1. 15 Pcs outsourced for specialized Wire-EDM & Spline Hobbing."
    }
  });

  // In-House Job Card on VMC/CNC Machine
  const jc1 = await prisma.jobCard.create({
    data: {
      job_card_number: "JC-2026-001",
      planning_id: plan1.id,
      planned_qty: 25,
      machine: "VMC-Jyoti VMC-850",
      process: "Rough Turning & Spline Milling",
      operator: "Santosh Yadav (Senior Machinist)",
      status: "In Progress",
      productionEntries: {
        create: [
          { produced_qty: 15, rejected_qty: 0, remarks: "Batch 1 setup and roughing completed within Ra 1.6" },
          { produced_qty: 8, rejected_qty: 1, remarks: "1 piece tool breakage scrap on spline key slot" }
        ]
      }
    }
  });

  // Outsourced Job Work RFQ & Service Order (Vacuum Heat Treatment & Hard Chrome)
  const jwrfq1 = await prisma.jobWorkRFQ.create({
    data: {
      rfq_number: "JWRFQ-2026-001",
      planning_id: plan1.id,
      process: "Vacuum Heat Treatment & Hard Chrome Plating",
      qty: 15,
      required_date: new Date(Date.now() + 7 * 86400000),
      material_responsibility: "Company",
      status: "Closed",
      suppliers: {
        create: [{ supplier_id: sup3.id }, { supplier_id: sup4.id }]
      },
      quotes: {
        create: [
          { supplier_id: sup3.id, rate: 380, lead_time_days: 4, amount: 15 * 380, is_selected: true },
          { supplier_id: sup4.id, rate: 410, lead_time_days: 5, amount: 15 * 410, is_selected: false }
        ]
      }
    },
    include: { quotes: true }
  });

  const winningJwQuote = jwrfq1.quotes.find(q => q.is_selected)!;

  const svc1 = await prisma.serviceOrder.create({
    data: {
      service_order_number: "SO-SVC-2026-001",
      jobwork_rfq_id: jwrfq1.id,
      jobwork_quote_id: winningJwQuote.id,
      supplier_id: sup3.id,
      process: "Vacuum Heat Treatment (58-62 HRC)",
      ordered_qty: 15,
      rate: 380,
      amount: 5700,
      expected_date: new Date(Date.now() + 5 * 86400000),
      status: "In Progress"
    }
  });

  // RGP Challan (Returnable Gate Pass to Vendor)
  const rgp1 = await prisma.rGPChallan.create({
    data: {
      rgp_number: "RGP-2026-001",
      service_order_id: svc1.id,
      vendor_id: sup3.id,
      sent_qty: 15,
      challan_date: new Date(),
      expected_return_date: new Date(Date.now() + 5 * 86400000),
      status: "Partially Returned",
      returns: {
        create: [
          {
            received_qty: 10,
            accepted_qty: 10,
            rejected_qty: 0,
            rework_qty: 0,
            remarks: "Received 10 pcs batch. Hardness test report attached (60.5 HRC OK)."
          }
        ]
      }
    }
  });

  // 10. QUALITY CONTROL (QC) INSPECTIONS
  const qc_jc = await prisma.qCInspection.create({
    data: {
      qc_number: "QC-2026-001",
      source_type: "Job Card",
      source_id: jc1.id,
      sales_order_item_id: so1.lines[0].id,
      status: "Completed",
      inspection_date: new Date(),
      items: {
        create: [
          {
            inspected_qty: 23,
            accepted_qty: 22,
            rejected_qty: 1,
            rework_qty: 0,
            remarks: "22 Pcs Pass dimensions. 1 Pc undersized bore.",
            actions: {
              create: [
                {
                  action_type: "Scrap",
                  owner: "Rohit Shinde (QC)",
                  due_date: new Date(Date.now() + 2 * 86400000),
                  status: "Closed"
                }
              ]
            }
          }
        ]
      }
    }
  });

  const qc_rgp = await prisma.qCInspection.create({
    data: {
      qc_number: "QC-2026-002",
      source_type: "RGP Return",
      source_id: rgp1.id,
      sales_order_item_id: so1.lines[0].id,
      status: "Completed",
      inspection_date: new Date(),
      items: {
        create: [
          {
            inspected_qty: 10,
            accepted_qty: 10,
            rejected_qty: 0,
            rework_qty: 0,
            remarks: "Hardness 60-62 HRC verified on Rockwell Tester. Ready for dispatch."
          }
        ]
      }
    }
  });

  // 11. DISPATCH & CHALLAN (Indian Transporters & Vehicle Nos)
  const disp1 = await prisma.dispatch.create({
    data: {
      dispatch_number: "DC-2026-001",
      sales_order_id: so3_raw.id,
      dispatch_date: new Date(),
      transporter: "VRL Logistics Ltd",
      vehicle_number: "MH-12-RN-4582",
      lr_number: "VRL/PUN/904421",
      package_count: 4,
      weight: 85.5,
      invoice_reference: "INV/2026/088",
      items: {
        create: [
          { sales_order_item_id: so3_raw.lines[0].id, dispatched_qty: 80 },
          { sales_order_item_id: so3_raw.lines[1].id, dispatched_qty: 30 }
        ]
      }
    }
  });

  // 12. CUSTOMER FEEDBACK & ACTION TICKET
  await prisma.feedback.create({
    data: {
      feedback_number: "FB-2026-001",
      dispatch_id: disp1.id,
      customer_id: cust1.id,
      received_at: new Date(),
      rating: 5,
      comments: "Excellent surface finish on CNC turned bushings. Delivered 2 days ahead of schedule.",
      status: "Received"
    }
  });

  // Audit Logs
  await prisma.auditLog.create({
    data: {
      user_id: adminUser.id,
      action: "create",
      module: "sales_orders",
      entity_id: so1.id,
      new_values: JSON.stringify({ so_number: so1.so_number, customer: cust2.name, total_amount: so1.total_amount })
    }
  });

  console.log("🇮🇳 Precision Engineering / Tooling Seed Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("SEED FAILED:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

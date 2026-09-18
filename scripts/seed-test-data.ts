import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const pad = (n: number, w = 4) => String(n).padStart(w, "0");
const ALL_MODULES = ["enquiries","quotations","sales_orders","material_requirements","purchase_rfqs","purchase_orders","plannings","job_cards","jobwork_rfqs","service_orders","rgp_challans","qc_inspections","dispatches","feedbacks","reports","admin"];

async function main() {
  console.log("CRM v1-v7 Seed starting...");

  // 1. MASTERS
  const [cust1,cust2,cust3,cust4,cust5] = await Promise.all([
    prisma.customer.create({data:{name:"TEST-Acme Industries",contact_person:"Rajesh Kumar",phone:"9100000001",email:"rajesh@acme-test.in"}}),
    prisma.customer.create({data:{name:"TEST-Bharat Precision",contact_person:"Priya Sharma",phone:"9100000002",email:"priya@bharat-test.in"}}),
    prisma.customer.create({data:{name:"TEST-Crest Engineering",contact_person:"Arun Menon",phone:"9100000003",email:"arun@crest-test.in"}}),
    prisma.customer.create({data:{name:"TEST-Delta Components",contact_person:"Sunita Patel",phone:"9100000004",email:"sunita@delta-test.in"}}),
    prisma.customer.create({data:{name:"TEST-Epsilon Fabricators",contact_person:"Vikram Singh",phone:"9100000005",email:"vikram@epsilon-test.in"}}),
  ]);

  const [itm1,itm2,itm3,itm4,itm5,itm6,itm7,itm8] = await Promise.all([
    prisma.item.create({data:{name:"TEST-Steel Shaft 50mm",uom:"Pcs",default_rate:1200}}),
    prisma.item.create({data:{name:"TEST-Brass Fitting M20",uom:"Pcs",default_rate:350}}),
    prisma.item.create({data:{name:"TEST-Aluminium Plate 10mm",uom:"Kg",default_rate:280}}),
    prisma.item.create({data:{name:"TEST-Bearing SKF 6204",uom:"Pcs",default_rate:450}}),
    prisma.item.create({data:{name:"TEST-Gasket Set L-type",uom:"Set",default_rate:175}}),
    prisma.item.create({data:{name:"TEST-Hydraulic Cylinder 100mm",uom:"Pcs",default_rate:8500}}),
    prisma.item.create({data:{name:"TEST-O-Ring Kit #32",uom:"Kit",default_rate:95}}),
    prisma.item.create({data:{name:"TEST-Gear Box Assembly",uom:"Pcs",default_rate:22000}}),
  ]);

  const [mat1,mat2,mat3,mat4,mat5,mat6] = await Promise.all([
    prisma.material.create({data:{name:"TEST-Raw Steel Bar 50mm",uom:"Kg",available_stock:500}}),
    prisma.material.create({data:{name:"TEST-Brass Rod M20 Grade",uom:"Kg",available_stock:0}}),
    prisma.material.create({data:{name:"TEST-Aluminium Sheet 10mm",uom:"Kg",available_stock:150}}),
    prisma.material.create({data:{name:"TEST-Bearing Steel 52100",uom:"Kg",available_stock:0}}),
    prisma.material.create({data:{name:"TEST-Rubber Compound NR-70",uom:"Kg",available_stock:80}}),
    prisma.material.create({data:{name:"TEST-Cast Iron Scrap",uom:"Kg",available_stock:1000}}),
  ]);

  const [sup1,sup2,sup3,sup4] = await Promise.all([
    prisma.supplier.create({data:{name:"TEST-AlphaForge Metals",contact_person:"Manish Joshi",phone:"9200000001",email:"manish@alphaforge-test.in"}}),
    prisma.supplier.create({data:{name:"TEST-BetaCast Components",contact_person:"Leela Nair",phone:"9200000002",email:"leela@betacast-test.in"}}),
    prisma.supplier.create({data:{name:"TEST-GammaTech Machining",contact_person:"Deepak Rao",phone:"9200000003",email:"deepak@gammatech-test.in"}}),
    prisma.supplier.create({data:{name:"TEST-DeltaPro Finishing",contact_person:"Anitha Reddy",phone:"9200000004",email:"anitha@deltapro-test.in"}}),
  ]);

  console.log("Masters done.");

  // 2. SALES ORDERS
  const soCount0 = await prisma.salesOrder.count();
  const soA = await prisma.salesOrder.create({data:{so_number:`TEST-SO-${pad(soCount0+1)}`,customer_id:cust1.id,total_amount:100*1200+50*350,status:"Open",lines:{create:[{item_id:itm1.id,ordered_qty:100,rate:1200,amount:120000,balance_qty:100},{item_id:itm2.id,ordered_qty:50,rate:350,amount:17500,balance_qty:50}]}},include:{lines:true}});
  const soB_raw = await prisma.salesOrder.create({data:{so_number:`TEST-SO-${pad(soCount0+2)}`,customer_id:cust2.id,total_amount:80*450+30*8500,status:"Open",lines:{create:[{item_id:itm4.id,ordered_qty:80,rate:450,amount:36000,balance_qty:80},{item_id:itm6.id,ordered_qty:30,rate:8500,amount:255000,balance_qty:30}]}},include:{lines:true}});
  await prisma.salesOrderItem.update({where:{id:soB_raw.lines[0].id},data:{dispatched_qty:30,balance_qty:50}});
  await prisma.dispatchEntry.create({data:{sales_order_item_id:soB_raw.lines[0].id,type:"Dispatch",qty:30,remarks:"TEST partial dispatch v1"}});
  const soB = await prisma.salesOrder.update({where:{id:soB_raw.id},data:{status:"Partially Dispatched"},include:{lines:true}});
  const soC_raw = await prisma.salesOrder.create({data:{so_number:`TEST-SO-${pad(soCount0+3)}`,customer_id:cust3.id,total_amount:60*280+200*95+40*175,status:"Open",lines:{create:[{item_id:itm3.id,ordered_qty:60,rate:280,amount:16800,balance_qty:60},{item_id:itm7.id,ordered_qty:200,rate:95,amount:19000,balance_qty:200},{item_id:itm5.id,ordered_qty:40,rate:175,amount:7000,balance_qty:40}]}},include:{lines:true}});
  await prisma.salesOrderItem.update({where:{id:soC_raw.lines[0].id},data:{dispatched_qty:40,cancelled_qty:15,balance_qty:5}});
  await prisma.dispatchEntry.create({data:{sales_order_item_id:soC_raw.lines[0].id,type:"Dispatch",qty:40,remarks:"TEST mixed dispatch"}});
  await prisma.dispatchEntry.create({data:{sales_order_item_id:soC_raw.lines[0].id,type:"Cancel",qty:15,remarks:"TEST cancellation"}});
  await prisma.salesOrder.update({where:{id:soC_raw.id},data:{status:"Partially Dispatched"}});
  const soC = await prisma.salesOrder.findUnique({where:{id:soC_raw.id},include:{lines:true}});
  const soD_raw = await prisma.salesOrder.create({data:{so_number:`TEST-SO-${pad(soCount0+4)}`,customer_id:cust4.id,total_amount:10*22000,status:"Open",lines:{create:[{item_id:itm8.id,ordered_qty:10,rate:22000,amount:220000,balance_qty:10}]}},include:{lines:true}});
  await prisma.salesOrderItem.update({where:{id:soD_raw.lines[0].id},data:{dispatched_qty:10,balance_qty:0}});
  await prisma.dispatchEntry.create({data:{sales_order_item_id:soD_raw.lines[0].id,type:"Dispatch",qty:10,remarks:"TEST full dispatch"}});
  const soD = await prisma.salesOrder.update({where:{id:soD_raw.id},data:{status:"Closed"},include:{lines:true}});
  const soE = await prisma.salesOrder.create({data:{so_number:`TEST-SO-${pad(soCount0+5)}`,customer_id:cust5.id,total_amount:25*1200+40*350+15*8500+100*95,status:"Open",lines:{create:[{item_id:itm1.id,ordered_qty:25,rate:1200,amount:30000,balance_qty:25},{item_id:itm2.id,ordered_qty:40,rate:350,amount:14000,balance_qty:40},{item_id:itm6.id,ordered_qty:15,rate:8500,amount:127500,balance_qty:15},{item_id:itm7.id,ordered_qty:100,rate:95,amount:9500,balance_qty:100}]}},include:{lines:true}});
  console.log("Sales Orders done:", soA.so_number, soB.so_number, soC!.so_number, soD.so_number, soE.so_number);

  // 3. ENQUIRY/QUOTATION
  const enqCount0 = await prisma.enquiry.count();
  const enq1 = await prisma.enquiry.create({data:{enquiry_number:`TEST-ENQ-${pad(enqCount0+1)}`,customer_id:cust1.id,status:"New",source:"Email",notes:"TEST enquiry New",items:{create:[{item_id:itm1.id,requested_qty:50,target_date:new Date(Date.now()+30*86400000)},{item_id:itm4.id,requested_qty:20}]}}});
  await prisma.followup.create({data:{enquiry_id:enq1.id,followup_date:new Date(),outcome:"TEST: Left voicemail",next_followup_date:new Date(Date.now()+2*86400000)}});
  const enq2 = await prisma.enquiry.create({data:{enquiry_number:`TEST-ENQ-${pad(enqCount0+2)}`,customer_id:cust2.id,status:"Contacted",source:"Phone",notes:"TEST enquiry Contacted",items:{create:[{item_id:itm6.id,requested_qty:5},{item_id:itm8.id,requested_qty:2}]}}});
  const enq3 = await prisma.enquiry.create({data:{enquiry_number:`TEST-ENQ-${pad(enqCount0+3)}`,customer_id:cust3.id,status:"Quotation Created",source:"Reference",notes:"TEST enquiry with revision history",items:{create:[{item_id:itm2.id,requested_qty:100},{item_id:itm5.id,requested_qty:60}]}}});
  const qtCount0 = await prisma.quotation.count();
  const qt3_rev0 = await prisma.quotation.create({data:{quotation_number:`TEST-QT-${pad(qtCount0+1)}`,revision_number:0,enquiry_id:enq3.id,customer_id:cust3.id,status:"Rejected",rejection_reason:"TEST: Rate too high rev0",is_latest_revision:false,total_amount:100*380+60*190,lines:{create:[{item_id:itm2.id,qty:100,rate:380,discount:0,amount:38000},{item_id:itm5.id,qty:60,rate:190,discount:0,amount:11400}]}}});
  const qt3_rev1 = await prisma.quotation.create({data:{quotation_number:`TEST-QT-${pad(qtCount0+1)}`,revision_number:1,enquiry_id:enq3.id,customer_id:cust3.id,status:"Accepted",is_latest_revision:true,total_amount:100*350+60*175,lines:{create:[{item_id:itm2.id,qty:100,rate:350,discount:0,amount:35000},{item_id:itm5.id,qty:60,rate:175,discount:0,amount:10500}]}}});
  const qt1_rejected = await prisma.quotation.create({data:{quotation_number:`TEST-QT-${pad(qtCount0+2)}`,revision_number:0,enquiry_id:enq1.id,customer_id:cust1.id,status:"Rejected",rejection_reason:"TEST: Customer found cheaper",is_latest_revision:true,total_amount:50*1250+20*460,lines:{create:[{item_id:itm1.id,qty:50,rate:1250,discount:0,amount:62500},{item_id:itm4.id,qty:20,rate:460,discount:0,amount:9200}]}}});
  const qt2_accepted = await prisma.quotation.create({data:{quotation_number:`TEST-QT-${pad(qtCount0+3)}`,revision_number:0,enquiry_id:enq2.id,customer_id:cust2.id,status:"Accepted",is_latest_revision:true,total_amount:5*8500+2*22000,lines:{create:[{item_id:itm6.id,qty:5,rate:8500,discount:0,amount:42500},{item_id:itm8.id,qty:2,rate:22000,discount:0,amount:44000}]}},include:{lines:true}});
  const soFCount = await prisma.salesOrder.count();
  const soF = await prisma.salesOrder.create({data:{so_number:`TEST-SO-${pad(soFCount+1)}`,quotation_id:qt2_accepted.id,customer_id:cust2.id,total_amount:qt2_accepted.total_amount,status:"Open",lines:{create:qt2_accepted.lines.map(l=>({item_id:l.item_id,ordered_qty:l.qty,rate:l.rate,amount:l.amount,balance_qty:l.qty}))}},include:{lines:true}});
  console.log("Enquiries/Quotations done.");

  // 4. CONFIRMATION + MR
  await prisma.salesOrder.update({where:{id:soA.id},data:{is_confirmed:true,confirmed_at:new Date()}});
  await prisma.salesOrder.update({where:{id:soF.id},data:{is_confirmed:true,confirmed_at:new Date()}});
  await prisma.salesOrder.update({where:{id:soE.id},data:{is_confirmed:true,confirmed_at:new Date()}});
  const mrCount0 = await prisma.materialRequirement.count();
  const mrA = await prisma.materialRequirement.create({data:{mr_number:`TEST-MR-${pad(mrCount0+1)}`,sales_order_id:soA.id,required_date:new Date(Date.now()+14*86400000),status:"Checked",items:{create:[{material_id:mat1.id,required_qty:80,available_qty:500,shortage_qty:0},{material_id:mat2.id,required_qty:60,available_qty:0,shortage_qty:60},{material_id:mat3.id,required_qty:200,available_qty:150,shortage_qty:50}]}},include:{items:true}});
  const mrF = await prisma.materialRequirement.create({data:{mr_number:`TEST-MR-${pad(mrCount0+2)}`,sales_order_id:soF.id,required_date:new Date(Date.now()+21*86400000),status:"Draft",items:{create:[{material_id:mat4.id,required_qty:40,available_qty:0,shortage_qty:40},{material_id:mat5.id,required_qty:30,available_qty:80,shortage_qty:0}]}},include:{items:true}});
  console.log("MRs done:", mrA.mr_number, mrF.mr_number);

  // 5. PROCUREMENT
  const rfqCount0 = await prisma.purchaseRFQ.count();
  const rfq1 = await prisma.purchaseRFQ.create({data:{rfq_number:`TEST-RFQ-${pad(rfqCount0+1)}`,material_requirement_id:mrA.id,status:"Quotes Received",items:{create:[{material_id:mat2.id,required_qty:60,material_requirement_item_id:mrA.items[1].id},{material_id:mat3.id,required_qty:50,material_requirement_item_id:mrA.items[2].id}]},suppliers:{create:[{supplier_id:sup1.id},{supplier_id:sup2.id}]}},include:{items:true}});
  await prisma.supplierQuote.create({data:{purchase_rfq_id:rfq1.id,supplier_id:sup1.id,items:{create:[{purchase_rfq_item_id:rfq1.items[0].id,rate:120,lead_time_days:7,amount:7200,is_selected:false},{purchase_rfq_item_id:rfq1.items[1].id,rate:95,lead_time_days:7,amount:4750,is_selected:false}]}}});
  await prisma.supplierQuote.create({data:{purchase_rfq_id:rfq1.id,supplier_id:sup2.id,items:{create:[{purchase_rfq_item_id:rfq1.items[0].id,rate:110,lead_time_days:10,amount:6600,is_selected:false},{purchase_rfq_item_id:rfq1.items[1].id,rate:105,lead_time_days:10,amount:5250,is_selected:false}]}}});
  const rfq2 = await prisma.purchaseRFQ.create({data:{rfq_number:`TEST-RFQ-${pad(rfqCount0+2)}`,material_requirement_id:mrA.id,status:"Closed",items:{create:[{material_id:mat2.id,required_qty:60,material_requirement_item_id:mrA.items[1].id}]},suppliers:{create:[{supplier_id:sup3.id}]}},include:{items:true}});
  const sq2 = await prisma.supplierQuote.create({data:{purchase_rfq_id:rfq2.id,supplier_id:sup3.id,items:{create:[{purchase_rfq_item_id:rfq2.items[0].id,rate:115,lead_time_days:5,amount:6900,is_selected:true}]}},include:{items:true}});
  const poCount0 = await prisma.purchaseOrder.count();
  const po1 = await prisma.purchaseOrder.create({data:{po_number:`TEST-PO-${pad(poCount0+1)}`,purchase_rfq_id:rfq2.id,supplier_id:sup3.id,status:"Partially Received",total_amount:6900,lines:{create:[{material_id:mat2.id,supplier_quote_item_id:sq2.items[0].id,purchase_rfq_item_id:rfq2.items[0].id,ordered_qty:60,rate:115,amount:6900,received_qty:40,pending_qty:20}]}},include:{lines:true}});
  const grnCount0 = await prisma.gRN.count();
  await prisma.gRN.create({data:{grn_number:`TEST-GRN-${pad(grnCount0+1)}`,purchase_order_id:po1.id,supplier_challan_ref:"TEST-CHALLAN-001",items:{create:[{purchase_order_item_id:po1.lines[0].id,received_qty:40,accepted_qty:38,rejected_qty:2,remarks:"TEST: 2 pieces rejected surface defect"}]}}});
  await prisma.material.update({where:{id:mat2.id},data:{available_stock:{increment:38}}});
  const rfq1_item1_for_po2 = rfq1.items[1];
  const sq1_for_po2 = await prisma.supplierQuote.findFirst({where:{purchase_rfq_id:rfq1.id,supplier_id:sup1.id},include:{items:true}});
  const sq1_item_for_mat3 = sq1_for_po2?.items?.find(i=>i.purchase_rfq_item_id===rfq1_item1_for_po2.id);
  const po2 = await prisma.purchaseOrder.create({data:{po_number:`TEST-PO-${pad(poCount0+2)}`,supplier_id:sup1.id,status:"Closed",total_amount:4750,lines:{create:[{material_id:mat3.id,supplier_quote_item_id:sq1_item_for_mat3!.id,purchase_rfq_item_id:rfq1_item1_for_po2.id,ordered_qty:50,rate:95,amount:4750,received_qty:50,pending_qty:0}]}},include:{lines:true}});
  await prisma.gRN.create({data:{grn_number:`TEST-GRN-${pad(grnCount0+2)}`,purchase_order_id:po2.id,supplier_challan_ref:"TEST-CHALLAN-002",items:{create:[{purchase_order_item_id:po2.lines[0].id,received_qty:50,accepted_qty:45,rejected_qty:5,remarks:"TEST: 5 pieces wrong dimension"}]}}});
  await prisma.material.update({where:{id:mat3.id},data:{available_stock:{increment:45}}});
  console.log("Procurement done:", po1.po_number, po2.po_number);

  // 6. EXECUTION (v5)
  const planCount0 = await prisma.planning.count();
  const plan1 = await prisma.planning.create({data:{planning_number:`TEST-PLN-${pad(planCount0+1)}`,sales_order_item_id:soE.lines[0].id,inhouse_qty:15,outsource_qty:10,target_start_date:new Date(),target_end_date:new Date(Date.now()+7*86400000),status:"Released",notes:"TEST split planning"}});
  const plan2 = await prisma.planning.create({data:{planning_number:`TEST-PLN-${pad(planCount0+2)}`,sales_order_item_id:soE.lines[0].id,inhouse_qty:10,outsource_qty:0,status:"Draft",notes:"TEST remaining inhouse"}});
  const jcCount0 = await prisma.jobCard.count();
  const jc1 = await prisma.jobCard.create({data:{job_card_number:`TEST-JC-${pad(jcCount0+1)}`,planning_id:plan1.id,planned_qty:15,machine:"TEST-CNC-1",process:"TEST Turning",operator:"TEST-Ramesh B",status:"In Progress",productionEntries:{create:[{produced_qty:5,rejected_qty:0,remarks:"TEST batch 1"},{produced_qty:3,rejected_qty:1,remarks:"TEST batch 2 one rejected"}]}}});
  const jc2 = await prisma.jobCard.create({data:{job_card_number:`TEST-JC-${pad(jcCount0+2)}`,planning_id:plan2.id,planned_qty:10,machine:"TEST-CNC-2",process:"TEST Milling",operator:"TEST-Suresh K",status:"Completed",productionEntries:{create:[{produced_qty:10,rejected_qty:0,remarks:"TEST completed"}]}}});
  const jwrfqCount0 = await prisma.jobWorkRFQ.count();
  const jwrfq1 = await prisma.jobWorkRFQ.create({data:{rfq_number:`TEST-JW-${pad(jwrfqCount0+1)}`,planning_id:plan1.id,process:"TEST Heat Treatment",qty:10,required_date:new Date(Date.now()+10*86400000),material_responsibility:"Company",status:"Closed",suppliers:{create:[{supplier_id:sup3.id},{supplier_id:sup4.id}]},quotes:{create:[{supplier_id:sup3.id,rate:180,lead_time_days:5,amount:1800,is_selected:false},{supplier_id:sup4.id,rate:165,lead_time_days:6,amount:1650,is_selected:true}]}},include:{quotes:true}});
  const svcCount0 = await prisma.serviceOrder.count();
  const svc1 = await prisma.serviceOrder.create({data:{service_order_number:`TEST-SVC-${pad(svcCount0+1)}`,jobwork_rfq_id:jwrfq1.id,jobwork_quote_id:jwrfq1.quotes.find(q=>q.is_selected)!.id,supplier_id:sup4.id,process:"TEST Heat Treatment",ordered_qty:10,rate:165,amount:1650,expected_date:new Date(Date.now()+6*86400000),status:"In Progress"}});
  const rgpCount0 = await prisma.rGPChallan.count();
  const rgp1 = await prisma.rGPChallan.create({data:{rgp_number:`TEST-RGP-${pad(rgpCount0+1)}`,service_order_id:svc1.id,vendor_id:sup4.id,sent_qty:10,challan_date:new Date(),expected_return_date:new Date(Date.now()+6*86400000),status:"Partially Returned",returns:{create:[{received_qty:6,accepted_qty:6,rejected_qty:0,rework_qty:0,remarks:"TEST partial return OK"}]}}});
  const rgp2 = await prisma.rGPChallan.create({data:{rgp_number:`TEST-RGP-${pad(rgpCount0+2)}`,service_order_id:svc1.id,vendor_id:sup4.id,sent_qty:5,challan_date:new Date(Date.now()-5*86400000),status:"Closed",returns:{create:[{received_qty:5,accepted_qty:4,rejected_qty:1,rework_qty:0,remarks:"TEST full return 1 rejected"}]}}});
  console.log("Execution done:", plan1.planning_number, jc1.job_card_number, svc1.service_order_number);

  // 7. QC + DISPATCH
  const qcCount0 = await prisma.qCInspection.count();
  const qc1 = await prisma.qCInspection.create({data:{qc_number:`TEST-QC-${pad(qcCount0+1)}`,source_type:"Job Card",source_id:jc1.id,sales_order_item_id:soE.lines[0].id,status:"Pending",inspection_date:new Date()}});
  const qc2 = await prisma.qCInspection.create({data:{qc_number:`TEST-QC-${pad(qcCount0+2)}`,source_type:"Job Card",source_id:jc2.id,sales_order_item_id:soE.lines[0].id,status:"Completed",inspection_date:new Date(),items:{create:[{inspected_qty:10,accepted_qty:10,rejected_qty:0,rework_qty:0,remarks:"TEST: All accepted"}]}}});
  const qc3 = await prisma.qCInspection.create({data:{qc_number:`TEST-QC-${pad(qcCount0+3)}`,source_type:"RGP Return",source_id:rgp1.id,sales_order_item_id:soE.lines[0].id,status:"Completed",inspection_date:new Date(),items:{create:[{inspected_qty:6,accepted_qty:4,rejected_qty:1,rework_qty:1,remarks:"TEST split inspection",actions:{create:[{action_type:"Scrap",owner:"TEST-QC Inspector",due_date:new Date(Date.now()+2*86400000),status:"Open"}]}}]}}});
  await prisma.salesOrderItem.update({where:{id:soE.lines[0].id},data:{dispatched_qty:7,balance_qty:18}});
  const dispCount0 = await prisma.dispatch.count();
  const disp1 = await prisma.dispatch.create({data:{dispatch_number:`TEST-DC-${pad(dispCount0+1)}`,sales_order_id:soE.id,dispatch_date:new Date(),transporter:"TEST-FastFreight",vehicle_number:"TEST-MH04AB1234",lr_number:"TEST-LR-001",package_count:3,weight:12.5,invoice_reference:"TEST-INV-2024-001",items:{create:[{sales_order_item_id:soE.lines[0].id,dispatched_qty:7}]}}});
  await prisma.dispatchEntry.create({data:{sales_order_item_id:soE.lines[0].id,type:"Dispatch",qty:7,remarks:`TEST Dispatch ${disp1.dispatch_number}`}});
  await prisma.salesOrder.update({where:{id:soE.id},data:{status:"Partially Dispatched"}});
  console.log("QC+Dispatch done:", qc1.qc_number, disp1.dispatch_number);

  // 8. FEEDBACK + ADMIN
  const existingAdmin = await prisma.role.findUnique({where:{name:"Management/Admin"}});
  let adminRole = existingAdmin;
  if(!adminRole){
    adminRole = await prisma.role.create({data:{name:"Management/Admin",is_system_role:true,permissions:{create:ALL_MODULES.map(m=>({module:m,can_view:true,can_create:true,can_edit:true,can_approve:true,can_delete:true,can_export:true}))}}});
    await prisma.user.create({data:{name:"System Administrator",email:"admin@antigravity.io",password_hash:"admin123",role_id:adminRole.id,is_active:true}});
  }
  const salesOnlyRole = await prisma.role.upsert({where:{name:"TEST-SalesOnly"},update:{},create:{name:"TEST-SalesOnly",is_system_role:false,permissions:{create:ALL_MODULES.map(m=>({module:m,can_view:["enquiries","quotations","sales_orders","reports","feedbacks"].includes(m),can_create:["enquiries","quotations","sales_orders"].includes(m),can_edit:["enquiries","quotations"].includes(m),can_approve:false,can_delete:false,can_export:false}))}}});
  const qcOnlyRole = await prisma.role.upsert({where:{name:"TEST-QCOnly"},update:{},create:{name:"TEST-QCOnly",is_system_role:false,permissions:{create:ALL_MODULES.map(m=>({module:m,can_view:["qc_inspections","job_cards","sales_orders"].includes(m),can_create:["qc_inspections"].includes(m),can_edit:["qc_inspections"].includes(m),can_approve:["qc_inspections"].includes(m),can_delete:false,can_export:false}))}}});
  const admin_u = await prisma.user.upsert({where:{email:"admin@antigravity.io"},update:{},create:{name:"System Administrator",email:"admin@antigravity.io",password_hash:"admin123",role_id:adminRole!.id,is_active:true}});
  const salesUser = await prisma.user.upsert({where:{email:"test-sales@crm-test.in"},update:{},create:{name:"TEST-Kavitha Sales",email:"test-sales@crm-test.in",password_hash:"sales123",role_id:salesOnlyRole.id,is_active:true}});
  const qcUser = await prisma.user.upsert({where:{email:"test-qc@crm-test.in"},update:{},create:{name:"TEST-Rohit QC",email:"test-qc@crm-test.in",password_hash:"qc123",role_id:qcOnlyRole.id,is_active:true}});
  const fbCount0 = await prisma.feedback.count();
  const fb1 = await prisma.feedback.create({data:{feedback_number:`TEST-FB-${pad(fbCount0+1)}`,dispatch_id:disp1.id,customer_id:cust5.id,status:"Requested"}});
  const disp2 = await prisma.dispatch.create({data:{dispatch_number:`TEST-DC-${pad(dispCount0+2)}`,sales_order_id:soD.id,dispatch_date:new Date(Date.now()-10*86400000),items:{create:[{sales_order_item_id:soD.lines[0].id,dispatched_qty:10}]}}});
  const fb2 = await prisma.feedback.create({data:{feedback_number:`TEST-FB-${pad(fbCount0+2)}`,dispatch_id:disp2.id,customer_id:cust4.id,received_at:new Date(Date.now()-5*86400000),rating:4,comments:"TEST: Good delivery quality.",status:"Received"}});
  const disp3 = await prisma.dispatch.create({data:{dispatch_number:`TEST-DC-${pad(dispCount0+3)}`,sales_order_id:soB.id,dispatch_date:new Date(Date.now()-15*86400000),items:{create:[{sales_order_item_id:soB.lines[0].id,dispatched_qty:5}]}}});
  await prisma.salesOrderItem.update({where:{id:soB.lines[0].id},data:{dispatched_qty:35,balance_qty:45}});
  const fb3 = await prisma.feedback.create({data:{feedback_number:`TEST-FB-${pad(fbCount0+3)}`,dispatch_id:disp3.id,customer_id:cust2.id,received_at:new Date(Date.now()-8*86400000),rating:2,comments:"TEST: Surface defects. Delayed 3 days.",status:"Action Open",actions:{create:[{owner:"TEST-CS Lead",due_date:new Date(Date.now()+5*86400000),action_notes:"TEST: Investigate root cause",status:"Open"}]}}});
  await prisma.auditLog.create({data:{user_id:admin_u.id,action:"create",module:"sales_orders",entity_id:soA.id,new_values:JSON.stringify({so_number:soA.so_number})}});
  await prisma.auditLog.create({data:{user_id:salesUser.id,action:"create",module:"enquiries",entity_id:enq1.id,new_values:JSON.stringify({enquiry_number:enq1.enquiry_number})}});
  await prisma.auditLog.create({data:{user_id:admin_u.id,action:"approve",module:"sales_orders",entity_id:soA.id,new_values:JSON.stringify({is_confirmed:true})}});
  console.log("Feedback+Admin done:", fb1.feedback_number, fb2.feedback_number, fb3.feedback_number);

  // 9. FULL E2E JOURNEY
  const e2e_enq = await prisma.enquiry.create({data:{enquiry_number:"TEST-E2E-ENQ-001",customer_id:cust1.id,status:"Quotation Created",source:"E2E Test",notes:"Full E2E for Section 10 integrity check",items:{create:[{item_id:itm3.id,requested_qty:20}]}}});
  const e2e_qt = await prisma.quotation.create({data:{quotation_number:"TEST-E2E-QT-001",revision_number:0,enquiry_id:e2e_enq.id,customer_id:cust1.id,status:"Accepted",is_latest_revision:true,total_amount:20*300,lines:{create:[{item_id:itm3.id,qty:20,rate:300,discount:0,amount:6000}]}},include:{lines:true}});
  const e2e_so = await prisma.salesOrder.create({data:{so_number:"TEST-E2E-SO-001",quotation_id:e2e_qt.id,customer_id:cust1.id,total_amount:6000,status:"Partially Dispatched",is_confirmed:true,confirmed_at:new Date(),customer_po_number:"TEST-CPO-001",delivery_commitment_date:new Date(Date.now()+30*86400000),lines:{create:[{item_id:itm3.id,ordered_qty:20,rate:300,amount:6000,balance_qty:8,dispatched_qty:12}]}},include:{lines:true}});
  const e2e_soLine = e2e_so.lines[0];
  const e2e_mr = await prisma.materialRequirement.create({data:{mr_number:"TEST-E2E-MR-001",sales_order_id:e2e_so.id,required_date:new Date(Date.now()+7*86400000),status:"Checked",items:{create:[{material_id:mat3.id,required_qty:40,available_qty:45,shortage_qty:0}]}},include:{items:true}});
  const e2e_rfq = await prisma.purchaseRFQ.create({data:{rfq_number:"TEST-E2E-RFQ-001",material_requirement_id:e2e_mr.id,status:"Closed",items:{create:[{material_id:mat3.id,required_qty:40,material_requirement_item_id:e2e_mr.items[0].id}]},suppliers:{create:[{supplier_id:sup2.id}]}},include:{items:true}});
  const e2e_sq = await prisma.supplierQuote.create({data:{purchase_rfq_id:e2e_rfq.id,supplier_id:sup2.id,items:{create:[{purchase_rfq_item_id:e2e_rfq.items[0].id,rate:90,lead_time_days:3,amount:3600,is_selected:true}]}},include:{items:true}});
  const e2e_po = await prisma.purchaseOrder.create({data:{po_number:"TEST-E2E-PO-001",purchase_rfq_id:e2e_rfq.id,supplier_id:sup2.id,status:"Closed",total_amount:3600,lines:{create:[{material_id:mat3.id,supplier_quote_item_id:e2e_sq.items[0].id,purchase_rfq_item_id:e2e_rfq.items[0].id,ordered_qty:40,rate:90,amount:3600,received_qty:40,pending_qty:0}]}},include:{lines:true}});
  await prisma.gRN.create({data:{grn_number:"TEST-E2E-GRN-001",purchase_order_id:e2e_po.id,supplier_challan_ref:"TEST-E2E-CHALLAN-001",items:{create:[{purchase_order_item_id:e2e_po.lines[0].id,received_qty:40,accepted_qty:40,rejected_qty:0,remarks:"TEST E2E all accepted"}]}}});
  const e2e_plan = await prisma.planning.create({data:{planning_number:"TEST-E2E-PLN-001",sales_order_item_id:e2e_soLine.id,inhouse_qty:15,outsource_qty:5,status:"Released",target_start_date:new Date(),target_end_date:new Date(Date.now()+10*86400000),notes:"TEST E2E planning"}});
  const e2e_jc = await prisma.jobCard.create({data:{job_card_number:"TEST-E2E-JC-001",planning_id:e2e_plan.id,planned_qty:15,machine:"TEST-VMC-3",process:"TEST E2E Machining",operator:"TEST-Operator",status:"Completed",productionEntries:{create:[{produced_qty:15,rejected_qty:0,remarks:"TEST E2E production"}]}}});
  const e2e_jwrfq = await prisma.jobWorkRFQ.create({data:{rfq_number:"TEST-E2E-JW-001",planning_id:e2e_plan.id,process:"TEST E2E Anodizing",qty:5,required_date:new Date(Date.now()+8*86400000),material_responsibility:"Company",status:"Closed",suppliers:{create:[{supplier_id:sup4.id}]},quotes:{create:[{supplier_id:sup4.id,rate:200,lead_time_days:5,amount:1000,is_selected:true}]}},include:{quotes:true}});
  const e2e_svc = await prisma.serviceOrder.create({data:{service_order_number:"TEST-E2E-SVC-001",jobwork_rfq_id:e2e_jwrfq.id,jobwork_quote_id:e2e_jwrfq.quotes[0].id,supplier_id:sup4.id,process:"TEST E2E Anodizing",ordered_qty:5,rate:200,amount:1000,expected_date:new Date(Date.now()+5*86400000),status:"Completed"}});
  const e2e_rgp = await prisma.rGPChallan.create({data:{rgp_number:"TEST-E2E-RGP-001",service_order_id:e2e_svc.id,vendor_id:sup4.id,sent_qty:5,challan_date:new Date(Date.now()-5*86400000),status:"Closed",returns:{create:[{received_qty:5,accepted_qty:5,rejected_qty:0,rework_qty:0,remarks:"TEST E2E full return OK"}]}}});
  const e2e_qc_jc = await prisma.qCInspection.create({data:{qc_number:"TEST-E2E-QC-001",source_type:"Job Card",source_id:e2e_jc.id,sales_order_item_id:e2e_soLine.id,status:"Completed",inspection_date:new Date(),items:{create:[{inspected_qty:15,accepted_qty:15,rejected_qty:0,rework_qty:0}]}}});
  const e2e_qc_rgp = await prisma.qCInspection.create({data:{qc_number:"TEST-E2E-QC-002",source_type:"RGP Return",source_id:e2e_rgp.id,sales_order_item_id:e2e_soLine.id,status:"Completed",inspection_date:new Date(),items:{create:[{inspected_qty:5,accepted_qty:5,rejected_qty:0,rework_qty:0}]}}});
  const e2e_disp = await prisma.dispatch.create({data:{dispatch_number:"TEST-E2E-DC-001",sales_order_id:e2e_so.id,dispatch_date:new Date(),transporter:"TEST-Express Logistics",vehicle_number:"TEST-GJ01CD5678",lr_number:"TEST-E2E-LR-001",package_count:2,weight:48.0,invoice_reference:"TEST-E2E-INV-001",items:{create:[{sales_order_item_id:e2e_soLine.id,dispatched_qty:12}]}}});
  await prisma.dispatchEntry.create({data:{sales_order_item_id:e2e_soLine.id,type:"Dispatch",qty:12,remarks:`TEST E2E Dispatch ${e2e_disp.dispatch_number}`}});
  const e2e_fb = await prisma.feedback.create({data:{feedback_number:"TEST-E2E-FB-001",dispatch_id:e2e_disp.id,customer_id:cust1.id,received_at:new Date(),rating:3,comments:"TEST E2E: Partial delivery OK",status:"Received"}});
  console.log("E2E Journey done:", e2e_so.so_number, e2e_disp.dispatch_number, e2e_fb.feedback_number);

  console.log("\n=== SEED MANIFEST ===");
  console.log(JSON.stringify({
    customers:{cust1:cust1.id,cust2:cust2.id,cust3:cust3.id,cust4:cust4.id,cust5:cust5.id},
    sales_orders:{soA_open:soA.so_number,soB_partial:soB.so_number,soC_mixed_near_limit:soC!.so_number,soD_closed:soD.so_number,soE_multiline:soE.so_number,soF_from_quotation:soF.so_number,E2E:e2e_so.so_number},
    enquiries:{enq1_new:enq1.enquiry_number,enq2_contacted:enq2.enquiry_number,enq3_revision:enq3.enquiry_number,e2e:e2e_enq.enquiry_number},
    quotations:{qt3_rev0:qt3_rev0.quotation_number+"_rev0",qt3_rev1:qt3_rev1.quotation_number+"_rev1",qt1_rejected:qt1_rejected.quotation_number,qt2_converted:qt2_accepted.quotation_number,e2e:e2e_qt.quotation_number},
    mrs:{mrA_mixed:mrA.mr_number,mrF_draft:mrF.mr_number,e2e:e2e_mr.mr_number},
    rfqs:{rfq1_unselected:rfq1.rfq_number,rfq2_po_done:rfq2.rfq_number,e2e:e2e_rfq.rfq_number},
    pos:{po1_partial_grn:po1.po_number,po2_closed:po2.po_number,e2e:e2e_po.po_number},
    plannings:{plan1_split:plan1.planning_number,plan2_draft:plan2.planning_number,e2e:e2e_plan.planning_number},
    job_cards:{jc1_in_progress:jc1.job_card_number,jc2_completed:jc2.job_card_number,e2e:e2e_jc.job_card_number},
    service_orders:{svc1:svc1.service_order_number,e2e:e2e_svc.service_order_number},
    rgps:{rgp1_partial:rgp1.rgp_number,rgp2_closed:rgp2.rgp_number,e2e:e2e_rgp.rgp_number},
    qc:{qc1_pending:qc1.qc_number,qc2_accepted:qc2.qc_number,qc3_split:qc3.qc_number,e2e_jc:e2e_qc_jc.qc_number,e2e_rgp:e2e_qc_rgp.qc_number},
    dispatches:{disp1:disp1.dispatch_number,e2e:e2e_disp.dispatch_number},
    feedbacks:{fb1_pending:fb1.feedback_number,fb2_high:fb2.feedback_number,fb3_low_action:fb3.feedback_number,e2e:e2e_fb.feedback_number},
    roles:{admin:"Management/Admin",sales_only:"TEST-SalesOnly",qc_only:"TEST-QCOnly"},
    users:{admin:admin_u.email,sales:salesUser.email,qc:qcUser.email}
  },null,2));
  console.log("=== SEED COMPLETE ===");
}

main().catch(e=>{console.error("SEED FAILED:",e);process.exit(1);}).finally(()=>prisma.$disconnect());

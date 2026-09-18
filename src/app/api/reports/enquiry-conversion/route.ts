import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const whereEnquiry: any = Object.keys(dateFilter).length > 0 ? { enquiry_date: dateFilter } : {};

    const enquiries = await prisma.enquiry.findMany({
      where: whereEnquiry,
      include: {
        customer: true,
        quotations: {
          include: {
            SalesOrders: true
          }
        }
      },
      orderBy: { enquiry_date: 'desc' }
    });

    const totalEnquiries = enquiries.length;
    let convertedToQuotation = 0;
    let convertedToSalesOrder = 0;

    const rows = enquiries.map(e => {
      const hasQuotation = e.quotations.length > 0;
      const hasSO = e.quotations.some(q => q.SalesOrders.length > 0);

      if (hasQuotation) convertedToQuotation++;
      if (hasSO) convertedToSalesOrder++;

      return {
        id: e.id,
        enquiry_number: e.enquiry_number,
        date: e.enquiry_date,
        customer_name: e.customer.name,
        source: e.source || 'Direct',
        status: e.status,
        quotations_count: e.quotations.length,
        has_sales_order: hasSO,
        conversion_stage: hasSO ? 'Sales Order' : hasQuotation ? 'Quotation' : 'Enquiry Only'
      };
    });

    const quoteConversionRate = totalEnquiries > 0 ? (convertedToQuotation / totalEnquiries) * 100 : 0;
    const soConversionRate = totalEnquiries > 0 ? (convertedToSalesOrder / totalEnquiries) * 100 : 0;

    return NextResponse.json({
      summary: {
        total_enquiries: totalEnquiries,
        quoted_count: convertedToQuotation,
        ordered_count: convertedToSalesOrder,
        quotation_conversion_pct: parseFloat(quoteConversionRate.toFixed(1)),
        order_conversion_pct: parseFloat(soConversionRate.toFixed(1))
      },
      rows
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate Enquiry Conversion report' }, { status: 500 });
  }
}

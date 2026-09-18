import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { report_name, headers, rows } = json;

    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: 'Rows array is required' }, { status: 400 });
    }

    const fieldKeys = Object.keys(headers || (rows[0] || {}));
    const fieldLabels = headers ? Object.values(headers) : fieldKeys;

    // Build CSV content
    const csvLines: string[] = [];
    csvLines.push(fieldLabels.map(l => `"${String(l).replace(/"/g, '""')}"`).join(','));

    rows.forEach((row: any) => {
      const line = fieldKeys.map(k => {
        const val = row[k] !== undefined && row[k] !== null ? row[k] : '';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvLines.push(line.join(','));
    });

    const csvContent = csvLines.join('\r\n');
    const filename = `${(report_name || 'report').toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to export report' }, { status: 500 });
  }
}

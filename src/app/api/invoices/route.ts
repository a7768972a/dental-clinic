import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const invoices = await db.invoice.findMany({
      include: {
        patient: true,
        items: {
          include: {
            service: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Error fetching invoices' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Generate invoice number
    const lastInvoice = await db.invoice.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    const invoiceNumber = `INV-${String((lastInvoice ? parseInt(lastInvoice.invoiceNumber.split('-')[1] || '0') + 1 : 1)).padStart(6, '0')}`;

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        patientId: body.patientId,
        status: 'pending',
        subtotal: body.subtotal || 0,
        discount: body.discount || 0,
        tax: body.tax || 0,
        total: body.total || 0,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        notes: body.notes || null,
        items: {
          create: body.items?.map((item: any) => ({
            serviceId: item.serviceId || null,
            description: item.description,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice,
            total: item.total || item.unitPrice * (item.quantity || 1),
          })) || [],
        },
      },
      include: {
        patient: true,
        items: true,
      },
    });

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Error creating invoice' }, { status: 500 });
  }
}

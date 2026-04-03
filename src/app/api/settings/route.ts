import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const settings = await db.setting.findMany();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Error fetching settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { settings } = body;

    for (const setting of settings) {
      await db.setting.upsert({
        where: { key: setting.key },
        create: {
          key: setting.key,
          value: setting.value,
        },
        update: {
          value: setting.value,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ error: 'Error saving settings' }, { status: 500 });
  }
}

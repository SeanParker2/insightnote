import { NextRequest, NextResponse } from 'next/server';
import { parsePDFBuffer, extractFinancialDataFromPDF, summarizePDF, summarizeFinancialExtraction } from '@/lib/pdf-parser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mode = formData.get('mode') as string || 'text';
    const extractFinancial = formData.get('extractFinancial') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (extractFinancial) {
      const result = await extractFinancialDataFromPDF(buffer);
      return NextResponse.json({
        success: true,
        data: {
          summary: summarizeFinancialExtraction(result),
          financialData: result.financialData,
          keyMetrics: result.keyMetrics,
          rawText: mode === 'full' ? result.rawText : undefined,
        },
      });
    }

    if (mode === 'summary') {
      const result = await parsePDFBuffer(buffer);
      return NextResponse.json({
        success: true,
        data: {
          summary: summarizePDF(result),
          info: result.info,
          metadata: result.metadata,
        },
      });
    }

    // Full text extraction
    const result = await parsePDFBuffer(buffer);
    return NextResponse.json({
      success: true,
      data: {
        text: result.text,
        pages: result.pages,
        info: result.info,
        metadata: result.metadata,
      },
    });
  } catch (error) {
    console.error('PDF parsing error:', error);
    return NextResponse.json(
      { error: 'Failed to parse PDF file' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};

import { NextRequest, NextResponse } from 'next/server';
import { parseText, extractKeyInformation, summarizeEntities } from '@/lib/nlp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, mode = 'full' } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (mode === 'entities') {
      const result = extractKeyInformation(text);
      return NextResponse.json({
        success: true,
        data: {
          entities: result.entities,
          summary: summarizeEntities(result.entities),
        },
      });
    }

    if (mode === 'sentiment') {
      const result = parseText(text);
      return NextResponse.json({
        success: true,
        data: {
          sentiment: result.summary.sentiment,
          mainSubjects: result.summary.mainSubjects,
          actions: result.summary.actions,
        },
      });
    }

    // Full analysis
    const result = extractKeyInformation(text);
    return NextResponse.json({
      success: true,
      data: {
        entities: result.entities,
        parse: result.parse,
        keyPhrases: result.keyPhrases,
        sentiment: result.sentiment,
        summary: summarizeEntities(result.entities),
      },
    });
  } catch (error) {
    console.error('NLP analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to perform NLP analysis' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const text = searchParams.get('text');
  const mode = searchParams.get('mode') || 'full';

  if (!text) {
    return NextResponse.json(
      { error: 'Text parameter is required' },
      { status: 400 }
    );
  }

  try {
    if (mode === 'entities') {
      const result = extractKeyInformation(text);
      return NextResponse.json({
        success: true,
        data: {
          entities: result.entities,
          summary: summarizeEntities(result.entities),
        },
      });
    }

    if (mode === 'sentiment') {
      const result = parseText(text);
      return NextResponse.json({
        success: true,
        data: {
          sentiment: result.summary.sentiment,
          mainSubjects: result.summary.mainSubjects,
          actions: result.summary.actions,
        },
      });
    }

    // Full analysis
    const result = extractKeyInformation(text);
    return NextResponse.json({
      success: true,
      data: {
        entities: result.entities,
        parse: result.parse,
        keyPhrases: result.keyPhrases,
        sentiment: result.sentiment,
        summary: summarizeEntities(result.entities),
      },
    });
  } catch (error) {
    console.error('NLP analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to perform NLP analysis' },
      { status: 500 }
    );
  }
}

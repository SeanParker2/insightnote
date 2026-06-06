import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseKnowledgeGraph } from '@/lib/knowledge-graph/supabase-graph';
import { buildGraphFromText, extractEntitiesFromText, extractRelations } from '@/lib/knowledge-graph';
import { queryWithRAG, insertDocumentIntoGraph } from '@/lib/knowledge-graph/rag';
import type { QueryMode } from '@/lib/knowledge-graph/rag';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action;

  try {
    const graph = createSupabaseKnowledgeGraph(supabase, userData.user.id);
    await graph.load();

    switch (action) {
      case 'query': {
        const query = body?.query;
        const mode = (body?.mode || 'mix') as QueryMode;
        if (!query) return NextResponse.json({ ok: false, error: 'missing_query' }, { status: 400 });
        
        const result = await queryWithRAG(graph, query, mode);
        return NextResponse.json({ ok: true, data: result });
      }

      case 'insert': {
        const documentId = body?.documentId;
        const text = body?.text;
        if (!documentId || !text) return NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 });
        
        const result = await insertDocumentIntoGraph(graph, documentId, text);
        return NextResponse.json({ ok: true, data: result });
      }

      case 'build': {
        const text = body?.text;
        if (!text) return NextResponse.json({ ok: false, error: 'missing_text' }, { status: 400 });
        await buildGraphFromText(graph, text, body?.sourceId);
        return NextResponse.json({ ok: true, data: { nodeCount: graph.nodes.size, edgeCount: graph.edges.size } });
      }

      case 'search': {
        const query = body?.query;
        if (!query) return NextResponse.json({ ok: false, error: 'missing_query' }, { status: 400 });
        const results = graph.search(query, body?.limit ?? 10);
        return NextResponse.json({ ok: true, data: results });
      }

      case 'causal': {
        const eventId = body?.eventId;
        if (!eventId) return NextResponse.json({ ok: false, error: 'missing_eventId' }, { status: 400 });
        const chains = graph.findCausalChains(eventId, body?.depth ?? 4);
        return NextResponse.json({ ok: true, data: chains });
      }

      case 'impact': {
        const eventId = body?.eventId;
        const symbols = body?.symbols;
        if (!eventId || !symbols) return NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 });
        const assessments = graph.assessImpact(eventId, symbols);
        return NextResponse.json({ ok: true, data: assessments });
      }

      case 'graph': {
        const nodes = Array.from(graph.nodes.values());
        const edges = Array.from(graph.edges.values());
        return NextResponse.json({ ok: true, data: { nodes, edges } });
      }

      case 'extract': {
        const text = body?.text;
        if (!text) return NextResponse.json({ ok: false, error: 'missing_text' }, { status: 400 });
        const entities = await extractEntitiesFromText(text);
        const relations = await extractRelations(text, entities);
        return NextResponse.json({ ok: true, data: { entities, relations } });
      }

      default:
        return NextResponse.json({ ok: false, error: 'unknown_action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Knowledge graph error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'internal_error' }, { status: 500 });
  }
}

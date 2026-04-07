'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';

const GOLD = '#c8a84b';
const GOLD_DIM = 'rgba(200,168,75,0.06)';
const GOLD_BORDER = 'rgba(200,168,75,0.2)';

interface Atom {
  id: string;
  ts: number;
  date: string;
  raw: string;
  type: string;
  tags: string[];
  signal: string;
  actionable: boolean;
  nextAction: string | null;
}

interface Cluster {
  id: string;
  name: string;
  insight: string;
  atom_ids: string[];
  confidence: number;
  status: 'ESTABLISHED' | 'FORMING' | 'FADING';
  time_spread: number;
}

interface Tension {
  name: string;
  atom_ids: string[];
  description: string;
}

interface ClustersData {
  generated: string | null;
  atomCount: number;
  clusters: Cluster[];
  emerging_signals: string[];
  tensions: Tension[];
  absences: string[];
}

const STATUS_COLORS: Record<string, string> = {
  ESTABLISHED: GOLD,
  FORMING: '#60a5fa',
  FADING: '#6b7280',
};

const NODE_RADIUS = (c: Cluster) => Math.max(28, Math.min(52, 18 + c.atom_ids.length * 3 + c.time_spread * 2));

interface SecondBrainProps {
  /** Base path for API routes. Defaults to '/api/second-brain'. Override if your dashboard uses a different prefix. */
  apiBase?: string;
}

export default function SecondBrain({ apiBase = '/api/second-brain' }: SecondBrainProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [clusters, setClusters] = useState<ClustersData | null>(null);
  const [atoms, setAtoms] = useState<Atom[]>([]);
  const [loading, setLoading] = useState(true);
  const [clustering, setClustering] = useState(false);
  const [selected, setSelected] = useState<Cluster | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${apiBase}/atoms`).then(r => r.json()),
      fetch(`${apiBase}/clusters`).then(r => r.json()),
    ]).then(([atomsData, clustersData]) => {
      setAtoms(atomsData.atoms ?? []);
      if (clustersData.clusters?.length) setClusters(clustersData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const atomMap = Object.fromEntries(atoms.map(a => [a.id, a]));

  // ── D3 graph ──────────────────────────────────────────────────────────────
  const handleNodeClick = useCallback((cluster: Cluster) => {
    setSelected(prev => prev?.id === cluster.id ? null : cluster);
    setInsight(null);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !clusters?.clusters?.length) return;

    const el = svgRef.current;
    const W = el.clientWidth || 800;
    const H = 380;
    el.setAttribute('height', String(H));

    d3.select(el).selectAll('*').remove();

    const nodes = clusters.clusters.map(c => ({ ...c, r: NODE_RADIUS(c) }));

    // Edges between clusters that share atoms
    const links: { source: string; target: string; weight: number }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const shared = nodes[i].atom_ids.filter(id => nodes[j].atom_ids.includes(id)).length;
        if (shared > 0) links.push({ source: nodes[i].id, target: nodes[j].id, weight: shared });
      }
    }

    const sim = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links as any).id((d: any) => d.id).distance(140).strength(0.3))
      .force('repulsion', d3.forceManyBody().strength(-320))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collide', d3.forceCollide().radius((d: any) => d.r + 18))
      .force('x', d3.forceX(W / 2).strength(0.04))
      .force('y', d3.forceY(H / 2).strength(0.06));

    const svg = d3.select(el);

    // Defs — glow filter
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'sbv-glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Links
    const link = svg.append('g').selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#2a2a2a')
      .attr('stroke-width', (d: any) => Math.max(1, d.weight * 0.8))
      .attr('stroke-dasharray', '4 6')
      .attr('opacity', 0.5);

    // Nodes
    const node = svg.append('g').selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<any, any>()
        .on('start', (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on('click', (_event, d) => handleNodeClick(d));

    // Glow ring
    node.append('circle')
      .attr('r', (d: any) => d.r + 8)
      .attr('fill', 'none')
      .attr('stroke', (d: any) => STATUS_COLORS[d.status] ?? GOLD)
      .attr('stroke-width', 1)
      .attr('opacity', 0.18)
      .attr('filter', 'url(#sbv-glow)');

    // Main circle
    node.append('circle')
      .attr('r', (d: any) => d.r)
      .attr('fill', (d: any) => {
        const c = STATUS_COLORS[d.status] ?? GOLD;
        return c + '18';
      })
      .attr('stroke', (d: any) => STATUS_COLORS[d.status] ?? GOLD)
      .attr('stroke-width', 1.5);

    // Confidence arc
    node.append('circle')
      .attr('r', (d: any) => d.r - 4)
      .attr('fill', 'none')
      .attr('stroke', (d: any) => STATUS_COLORS[d.status] ?? GOLD)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', (d: any) => {
        const circ = 2 * Math.PI * (d.r - 4);
        return `${circ * d.confidence} ${circ}`;
      })
      .attr('opacity', 0.4)
      .attr('transform', 'rotate(-90)');

    // Label — split name onto two lines if long
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.3em')
      .attr('fill', '#e0e0e0')
      .attr('font-size', (d: any) => d.r > 40 ? 11 : 10)
      .attr('font-family', 'system-ui, sans-serif')
      .attr('font-weight', '600')
      .attr('pointer-events', 'none')
      .each(function(d: any) {
        const words = d.name.split(' ');
        const mid = Math.ceil(words.length / 2);
        const line1 = words.slice(0, mid).join(' ');
        const line2 = words.slice(mid).join(' ');
        const el = d3.select(this);
        el.append('tspan').attr('x', 0).attr('dy', '0em').text(line1);
        if (line2) el.append('tspan').attr('x', 0).attr('dy', '1.2em').text(line2);
      });

    // Atom count below name
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d: any) => d.r > 40 ? '2.6em' : '2.2em')
      .attr('fill', (d: any) => STATUS_COLORS[d.status] ?? GOLD)
      .attr('font-size', 9)
      .attr('font-family', 'monospace')
      .attr('opacity', 0.7)
      .attr('pointer-events', 'none')
      .text((d: any) => `${d.atom_ids.length} atoms`);

    // In-graph legend — top left
    const legend = svg.append('g').attr('transform', 'translate(16, 16)');
    (['ESTABLISHED', 'FORMING', 'FADING'] as const).forEach((status, i) => {
      const g = legend.append('g').attr('transform', `translate(0, ${i * 18})`);
      g.append('circle').attr('r', 5).attr('cx', 5).attr('cy', 0)
        .attr('fill', STATUS_COLORS[status] + '30')
        .attr('stroke', STATUS_COLORS[status]).attr('stroke-width', 1.5);
      g.append('text').attr('x', 14).attr('y', 4)
        .attr('fill', STATUS_COLORS[status]).attr('font-size', 9)
        .attr('font-family', 'monospace').attr('letter-spacing', '0.08em')
        .text(status);
    });

    sim.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      node.attr('transform', (d: any) => `translate(${
        Math.max(d.r + 4, Math.min(W - d.r - 4, d.x))
      },${
        Math.max(d.r + 4, Math.min(H - d.r - 4, d.y))
      })`);
    });

    return () => { sim.stop(); };
  }, [clusters, handleNodeClick]);

  // ── Insight generator ────────────────────────────────────────────────────
  useEffect(() => {
    if (!selected) return;
    setInsight(null);
    setInsightLoading(true);

    const atom_texts = selected.atom_ids
      .map(id => atomMap[id])
      .filter(Boolean)
      .map(a => a.raw);

    fetch(`${apiBase}/insight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ atom_texts, cluster_name: selected.name }),
    })
      .then(r => r.json())
      .then(d => setInsight(d.insight ?? null))
      .catch(() => setInsight(null))
      .finally(() => setInsightLoading(false));
  }, [selected]);

  async function runClustering() {
    setClustering(true);
    setError(null);
    setSelected(null);
    try {
      const res = await fetch(`${apiBase}/clusters`, { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setClusters(data);
    } catch (e: any) {
      setError(e.message);
    }
    setClustering(false);
  }

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div style={{ background: '#0d0d0d', minHeight: '100%', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '20px 28px 0' }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555' }}>Second Brain</p>
          <p style={{ fontSize: 10, color: '#333', marginTop: 3 }}>
            {atoms.length} atoms · {clusters?.clusters?.length ?? 0} clusters
            {clusters?.generated && ` · clustered ${fmt(clusters.generated)}`}
          </p>
        </div>
        <button
          onClick={runClustering}
          disabled={clustering}
          style={{
            fontSize: 11, padding: '6px 16px', borderRadius: 6,
            background: clustering ? 'transparent' : GOLD_DIM,
            border: `1px solid ${GOLD_BORDER}`,
            color: clustering ? '#555' : GOLD,
            cursor: clustering ? 'not-allowed' : 'pointer',
          }}
        >
          {clustering ? 'Clustering…' : clusters?.clusters?.length ? '↻ Re-cluster' : 'Run Clustering'}
        </button>
      </div>

      {error && (
        <div style={{ margin: '12px 28px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#ef4444' }}>
          {error}
        </div>
      )}

      {loading && <p style={{ color: '#333', fontSize: 13, padding: '40px 28px' }}>Loading…</p>}

      {!loading && !clusters?.clusters?.length && !clustering && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ color: '#444', fontSize: 13, marginBottom: 8 }}>No clusters yet.</p>
          <p style={{ color: '#333', fontSize: 11 }}>Run clustering to analyze {atoms.length} atoms.</p>
        </div>
      )}

      {/* D3 Spider Graph */}
      {clusters?.clusters?.length ? (
        <div style={{ margin: '16px 0 0', borderBottom: '1px solid #1a1a1a' }}>
          <svg
            ref={svgRef}
            width="100%"
            height="380"
            style={{ display: 'block', background: '#0a0a0a' }}
          />
        </div>
      ) : null}

      {clusters?.clusters?.length ? (
        <div style={{ padding: '6px 28px', borderBottom: '1px solid #111' }}>
          <span style={{ fontSize: 9, color: '#2a2a2a', letterSpacing: '0.08em' }}>Node size = atoms × time spread · Click to explore</span>
        </div>
      ) : null}

      {/* Selected cluster detail */}
      {selected && (
        <div style={{ padding: '24px 28px', borderBottom: '1px solid #1a1a1a' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#e0e0e0', marginBottom: 4 }}>{selected.name}</p>
              <div style={{ display: 'flex', gap: 14 }}>
                <span style={{ fontSize: 10, color: STATUS_COLORS[selected.status] ?? GOLD, letterSpacing: '0.08em' }}>{selected.status}</span>
                <span style={{ fontSize: 10, color: '#444' }}>{selected.atom_ids.length} atoms</span>
                <span style={{ fontSize: 10, color: '#444' }}>{selected.time_spread}w spread</span>
                <span style={{ fontSize: 10, color: '#444' }}>{Math.round(selected.confidence * 100)}% confidence</span>
              </div>
            </div>
            <button onClick={() => { setSelected(null); setInsight(null); }} style={{ fontSize: 11, color: '#555', background: 'none', border: 'none', cursor: 'pointer' }}>✕ close</button>
          </div>

          {/* Cluster base insight */}
          <p style={{ fontSize: 12, color: '#666', lineHeight: 1.6, marginBottom: 16, fontStyle: 'italic' }}>{selected.insight}</p>

          {/* LLM-generated insight */}
          {insightLoading && (
            <div style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`, borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
              <p style={{ fontSize: 10, color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Generating insight…</p>
              <p style={{ fontSize: 12, color: '#444', fontStyle: 'italic' }}>Reading your atoms…</p>
            </div>
          )}
          {insight && !insightLoading && (
            <div style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`, borderRadius: 8, padding: '14px 16px', marginBottom: 20 }}>
              <p style={{ fontSize: 10, color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Insight</p>
              <p style={{ fontSize: 14, color: GOLD, lineHeight: 1.7, fontStyle: 'italic' }}>{insight}</p>
            </div>
          )}

          {/* Atoms */}
          <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', marginBottom: 12 }}>Atoms in this cluster</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selected.atom_ids.map(id => {
              const atom = atomMap[id];
              if (!atom) return null;
              return (
                <div key={id} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: '#333' }}>{atom.date?.slice(0, 10)}</span>
                    <span style={{ fontSize: 10, color: '#2a2a2a' }}>{atom.type}</span>
                    <span style={{ fontSize: 10, color: atom.signal === 'hot' ? GOLD : atom.signal === 'warm' ? '#60a5fa' : '#444' }}>● {atom.signal}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#d0d0d0', lineHeight: 1.6 }}>{atom.raw}</p>
                  {atom.nextAction && (
                    <p style={{ fontSize: 10, color: '#555', marginTop: 6, fontStyle: 'italic' }}>→ {atom.nextAction}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tensions */}
      {clusters?.tensions?.length ? (
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #111' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', marginBottom: 12 }}>Tensions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {clusters.tensions.map((t, i) => (
              <div key={i} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: '12px 14px' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 4 }}>{t.name}</p>
                <p style={{ fontSize: 11, color: '#555', lineHeight: 1.5 }}>{t.description}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Emerging signals */}
      {clusters?.emerging_signals?.length ? (
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #111' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', marginBottom: 12 }}>Emerging Signals</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {clusters.emerging_signals.map(id => {
              const atom = atomMap[id];
              if (!atom) return null;
              return (
                <div key={id} style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: '8px 12px', background: '#111', borderRadius: 6, border: '1px solid #1a1a1a' }}>
                  <span style={{ fontSize: 10, color: '#333', flexShrink: 0 }}>{atom.date?.slice(0, 10)}</span>
                  <p style={{ fontSize: 12, color: '#888' }}>{atom.raw}</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Absences */}
      {clusters?.absences?.length ? (
        <div style={{ padding: '20px 28px' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', marginBottom: 10 }}>Notable Absences</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {clusters.absences.map((a, i) => (
              <span key={i} style={{ fontSize: 11, color: '#444', background: '#111', border: '1px solid #1a1a1a', borderRadius: 4, padding: '4px 10px' }}>{a}</span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

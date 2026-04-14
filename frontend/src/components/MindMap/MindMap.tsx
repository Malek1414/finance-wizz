import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../../api/client';
import { FinanceNode } from '../../types';
import NodeEditor from './NodeEditor';
import { Plus, RefreshCw, Info } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  BALANCE: '#6366f1',
  INCOME: '#10b981',
  FIXED_COSTS: '#f43f5e',
  VARIABLE_SPENDING: '#f59e0b',
  SHOPPING: '#38bdf8'
};

const TYPE_GLOW: Record<string, string> = {
  BALANCE: 'rgba(99,102,241,0.5)',
  INCOME: 'rgba(16,185,129,0.5)',
  FIXED_COSTS: 'rgba(244,63,94,0.5)',
  VARIABLE_SPENDING: 'rgba(245,158,11,0.5)',
  SHOPPING: 'rgba(56,189,248,0.5)'
};

function flattenTree(node: FinanceNode, parent: d3.HierarchyNode<FinanceNode> | null = null): d3.HierarchyNode<FinanceNode>[] {
  const nodes: d3.HierarchyNode<FinanceNode>[] = [];
  const h = d3.hierarchy(node);
  h.each(n => nodes.push(n));
  return nodes;
}

function formatEuro(value: number): string {
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  }
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
}

interface EditState {
  id: string;
  name: string;
  value: number;
  type: string;
  parentId: string | null;
  x: number;
  y: number;
}

export default function MindMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [editState, setEditState] = useState<EditState | null>(null);
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [addParentType, setAddParentType] = useState<string>('INCOME');
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: FinanceNode } | null>(null);

  const { data: tree, isLoading, error } = useQuery({
    queryKey: ['finance-tree'],
    queryFn: financeApi.getTree,
    refetchInterval: 60_000
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, value }: { id: string; name: string; value: number }) =>
      financeApi.updateNode(id, { name, value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-tree'] });
      setEditState(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.deleteNode(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance-tree'] })
  });

  const addMutation = useMutation({
    mutationFn: ({ name, type, parentId }: { name: string; type: string; parentId: string }) =>
      financeApi.createNode({ name, type, parentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-tree'] });
      setAddParentId(null);
    }
  });

  const drawMindMap = useCallback(() => {
    if (!tree || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('width', width).attr('height', height);

    // Add defs for gradients and filters
    const defs = svg.append('defs');

    // Glow filter
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Strong glow for root
    const strongGlow = defs.append('filter').attr('id', 'strongGlow');
    strongGlow.append('feGaussianBlur').attr('stdDeviation', '8').attr('result', 'coloredBlur');
    const feMerge2 = strongGlow.append('feMerge');
    feMerge2.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge2.append('feMergeNode').attr('in', 'SourceGraphic');

    // Background gradient
    const bgGrad = defs.append('radialGradient').attr('id', 'bgGrad').attr('cx', '50%').attr('cy', '50%').attr('r', '70%');
    bgGrad.append('stop').attr('offset', '0%').attr('stop-color', '#1e293b').attr('stop-opacity', 0.3);
    bgGrad.append('stop').attr('offset', '100%').attr('stop-color', '#0f172a').attr('stop-opacity', 0);

    // Main group with zoom
    const g = svg.append('g').attr('class', 'zoom-group');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Build D3 hierarchy
    const root = d3.hierarchy(tree);

    // Use tree layout with radial coordinates
    const treeLayout = d3.tree<FinanceNode>()
      .size([2 * Math.PI, Math.min(width, height) * 0.38])
      .separation((a, b) => {
        if (a.depth === 0 || b.depth === 0) return 1;
        return (a.parent === b.parent ? 1 : 2) / a.depth;
      });

    const layoutRoot = treeLayout(root);

    // Convert polar to cartesian
    function polarToCartesian(angle: number, radius: number) {
      return {
        x: radius * Math.cos(angle - Math.PI / 2),
        y: radius * Math.sin(angle - Math.PI / 2)
      };
    }

    // Draw links
    const linkGroup = g.append('g').attr('class', 'links').attr('transform', `translate(${width / 2},${height / 2})`);

    const linkGenerator = d3.linkRadial<d3.HierarchyPointLink<FinanceNode>, d3.HierarchyPointNode<FinanceNode>>()
      .angle(d => d.x)
      .radius(d => d.y);

    linkGroup.selectAll('.link')
      .data(layoutRoot.links())
      .join('path')
      .attr('class', 'link')
      .attr('d', linkGenerator as any)
      .attr('stroke', d => {
        const childType = d.target.data.type;
        return TYPE_COLORS[childType] || '#475569';
      })
      .attr('stroke-width', d => d.target.depth === 1 ? 2.5 : 1.5)
      .attr('stroke-opacity', 0.4)
      .attr('fill', 'none')
      .attr('stroke-dasharray', d => d.target.depth > 1 ? '4,4' : 'none');

    // Draw nodes
    const nodeGroup = g.append('g').attr('class', 'nodes').attr('transform', `translate(${width / 2},${height / 2})`);

    const nodeEnter = nodeGroup.selectAll('.node')
      .data(layoutRoot.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => {
        const pos = polarToCartesian(d.x, d.y);
        return `translate(${pos.x},${pos.y})`;
      })
      .style('cursor', 'pointer');

    // Node circles
    nodeEnter.each(function(d) {
      const el = d3.select(this);
      const color = TYPE_COLORS[d.data.type] || '#475569';
      const isRoot = d.depth === 0;
      const isFirstLevel = d.depth === 1;
      const radius = isRoot ? 52 : isFirstLevel ? 36 : 24;

      // Outer glow ring for root
      if (isRoot) {
        el.append('circle')
          .attr('r', radius + 10)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 1.5)
          .attr('stroke-opacity', 0.3)
          .attr('stroke-dasharray', '6,4');
      }

      // Background circle
      el.append('circle')
        .attr('r', radius)
        .attr('fill', `${color}20`)
        .attr('stroke', color)
        .attr('stroke-width', isRoot ? 2.5 : isFirstLevel ? 2 : 1.5)
        .attr('filter', isRoot ? 'url(#strongGlow)' : isFirstLevel ? 'url(#glow)' : 'none')
        .attr('class', 'node-circle');

      // Inner fill for depth
      if (isRoot || isFirstLevel) {
        el.append('circle')
          .attr('r', radius - 8)
          .attr('fill', `${color}15`);
      }

      // Name text
      el.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', isRoot ? '-8px' : isFirstLevel ? '-6px' : '-4px')
        .attr('font-size', isRoot ? '12px' : isFirstLevel ? '11px' : '10px')
        .attr('font-weight', isRoot || isFirstLevel ? '600' : '400')
        .attr('fill', isRoot ? '#f1f5f9' : '#cbd5e1')
        .text(d.data.name.length > 14 ? d.data.name.substring(0, 12) + '…' : d.data.name);

      // Value text
      el.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', isRoot ? '10px' : isFirstLevel ? '8px' : '7px')
        .attr('font-size', isRoot ? '13px' : isFirstLevel ? '11px' : '9px')
        .attr('font-weight', '700')
        .attr('fill', color)
        .text(formatEuro(d.data.value));

      // Type badge for first-level
      if (isFirstLevel) {
        el.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '20px')
          .attr('font-size', '8px')
          .attr('fill', `${color}80`)
          .text(d.data.type.replace('_', ' '));
      }
    });

    // Hover interactions
    nodeEnter
      .on('mouseenter', function(event, d) {
        if (d.depth === 0) return;
        d3.select(this).select('.node-circle')
          .transition().duration(150)
          .attr('r', (d.depth === 1 ? 36 : 24) + 4)
          .attr('stroke-width', 3);

        const svgRect = svgRef.current!.getBoundingClientRect();
        setTooltip({
          x: event.clientX - svgRect.left,
          y: event.clientY - svgRect.top - 10,
          node: d.data
        });
      })
      .on('mouseleave', function(_event, d) {
        d3.select(this).select('.node-circle')
          .transition().duration(150)
          .attr('r', d.depth === 1 ? 36 : 24)
          .attr('stroke-width', d.depth === 1 ? 2 : 1.5);
        setTooltip(null);
      })
      .on('click', function(event, d) {
        event.stopPropagation();
        if (!d.data.isEditable) return;

        const svgRect = svgRef.current!.getBoundingClientRect();
        const pos = polarToCartesian(d.x, d.y);
        const transform = d3.zoomTransform(svgRef.current!);

        const screenX = transform.x + (width / 2 + pos.x) * transform.k;
        const screenY = transform.y + (height / 2 + pos.y) * transform.k;

        setEditState({
          id: d.data.id,
          name: d.data.name,
          value: d.data.value,
          type: d.data.type,
          parentId: d.data.parentId,
          x: Math.min(Math.max(screenX, 200), width - 200),
          y: Math.min(Math.max(screenY - 80, 10), height - 250)
        });
        setTooltip(null);
      });

    // Initial zoom to fit
    const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(1);
    svg.call(zoom.transform, d3.zoomIdentity);

    // Animate nodes in
    nodeGroup.selectAll('.node')
      .attr('opacity', 0)
      .transition()
      .duration(600)
      .delay((d: any) => d.depth * 100)
      .attr('opacity', 1);

  }, [tree]);

  useEffect(() => {
    drawMindMap();
  }, [drawMindMap]);

  useEffect(() => {
    const observer = new ResizeObserver(() => drawMindMap());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [drawMindMap]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-slate-400">Loading your finance map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="glass-card p-8 text-center max-w-md">
          <p className="text-rose-400 font-semibold mb-2">Failed to load finance data</p>
          <p className="text-slate-400 text-sm">Make sure the backend server is running on port 3001.</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['finance-tree'] })}
            className="btn-primary mt-4 flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-700/30">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Finance Map</h2>
          <p className="text-xs text-slate-500">Click nodes to edit • Scroll to zoom • Drag to pan</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['finance-tree'] })}
            className="btn-secondary flex items-center gap-2 text-sm py-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-6 z-10 glass-card px-3 py-2 flex items-center gap-4">
        {Object.entries(TYPE_COLORS).filter(([k]) => k !== 'BALANCE').map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-slate-400">{type.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      {/* Info tip */}
      <div className="absolute top-16 right-4 z-10 flex items-center gap-1.5 text-xs text-slate-500">
        <Info className="w-3.5 h-3.5" />
        <span>Click any node to edit</span>
      </div>

      {/* SVG Mind Map */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <svg ref={svgRef} className="w-full h-full" />

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none glass-card px-3 py-2 text-xs z-20 shadow-xl"
            style={{ left: tooltip.x + 12, top: tooltip.y }}
          >
            <div className="font-semibold text-slate-200 mb-1">{tooltip.node.name}</div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Value:</span>
              <span className="font-bold" style={{ color: TYPE_COLORS[tooltip.node.type] }}>
                {formatEuro(tooltip.node.value)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-slate-400">Type:</span>
              <span className="text-slate-300">{tooltip.node.type.replace('_', ' ')}</span>
            </div>
            {tooltip.node.children.length > 0 && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-slate-400">Sub-items:</span>
                <span className="text-slate-300">{tooltip.node.children.length}</span>
              </div>
            )}
            {tooltip.node.isEditable && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-700 text-slate-500 italic">
                Click to edit
              </div>
            )}
          </div>
        )}

        {/* Node Editor Popup */}
        {editState && (
          <NodeEditor
            nodeId={editState.id}
            initialName={editState.name}
            initialValue={editState.value}
            type={editState.type}
            parentId={editState.parentId}
            x={editState.x}
            y={editState.y}
            onSave={(name, value) => updateMutation.mutate({ id: editState.id, name, value })}
            onDelete={() => {
              if (window.confirm(`Delete "${editState.name}"? This will also delete all sub-items.`)) {
                deleteMutation.mutate(editState.id);
                setEditState(null);
              }
            }}
            onAddChild={() => {
              setAddParentId(editState.id);
              setAddParentType(editState.type);
              setEditState(null);
            }}
            onClose={() => setEditState(null)}
            isSaving={updateMutation.isPending}
          />
        )}

        {/* Add Node Modal */}
        {addParentId && (
          <div className="modal-overlay" onClick={() => setAddParentId(null)}>
            <div className="modal-content p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Add Sub-category</h3>
              <form onSubmit={e => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const name = (form.elements.namedItem('name') as HTMLInputElement).value;
                const value = parseFloat((form.elements.namedItem('value') as HTMLInputElement).value) || 0;
                if (name.trim()) {
                  addMutation.mutate({ name: name.trim(), type: addParentType, parentId: addParentId });
                }
              }}>
                <div className="mb-4">
                  <label className="label">Name</label>
                  <input name="name" type="text" className="input-field w-full" placeholder="e.g. Gym Membership" autoFocus required />
                </div>
                <div className="mb-6">
                  <label className="label">Initial Value (€)</label>
                  <input name="value" type="number" step="0.01" min="0" className="input-field w-full" placeholder="0.00" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="btn-primary flex items-center gap-2" disabled={addMutation.isPending}>
                    <Plus className="w-4 h-4" />
                    {addMutation.isPending ? 'Adding...' : 'Add Node'}
                  </button>
                  <button type="button" onClick={() => setAddParentId(null)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

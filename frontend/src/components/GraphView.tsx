import { useMemo, useCallback } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { GraphData } from '../api'

interface GraphViewProps {
  data: GraphData
}

const getStatusColor = (status: number | null) => {
  if (!status) return '#5a5e73'
  if (status < 300) return '#4ade80'
  if (status < 400) return '#fbbf24'
  if (status < 500) return '#f87171'
  return '#f87171'
}

const getStatusGlow = (status: number | null) => {
  if (!status) return 'transparent'
  if (status < 300) return 'rgba(74, 222, 128, 0.2)'
  if (status < 400) return 'rgba(251, 191, 36, 0.2)'
  return 'rgba(248, 113, 113, 0.2)'
}

export default function GraphView({ data }: GraphViewProps) {
  const initialNodes: Node[] = useMemo(() => {
    return data.nodes.map((node, index) => {
      const angle = (index / data.nodes.length) * 2 * Math.PI
      const radius = Math.min(350, data.nodes.length * 12)
      const color = getStatusColor(node.status_code)
      const glow = getStatusGlow(node.status_code)
      return {
        id: node.id,
        position: {
          x: 400 + radius * Math.cos(angle),
          y: 300 + radius * Math.sin(angle),
        },
        data: {
          label: (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(5, 5, 8, 0.85)',
                backdropFilter: 'blur(8px)',
                border: `1.5px solid ${color}`,
                boxShadow: `0 0 12px ${glow}, 0 4px 12px rgba(0,0,0,0.4)`,
                fontSize: '11px',
                maxWidth: '160px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: '#e0e0e6',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '3px', fontSize: '12px', color: '#fff' }}>
                {node.label.length > 22 ? node.label.slice(0, 22) + '...' : node.label}
              </div>
              <div style={{ color: '#5a5e73', fontSize: '10px', fontFamily: "'JetBrains Mono', monospace" }}>
                <span style={{ color }}>{node.status_code || 'N/A'}</span>
                {' '}&middot;{' '}d{node.depth}
              </div>
            </div>
          ),
        },
        style: {
          background: 'transparent',
          border: 'none',
          padding: 0,
        },
      }
    })
  }, [data.nodes])

  const initialEdges: Edge[] = useMemo(() => {
    return data.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: true,
      style: { stroke: 'rgba(108, 99, 255, 0.3)', strokeWidth: 1.5 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: 'rgba(108, 99, 255, 0.5)',
        width: 16,
        height: 16,
      },
    }))
  }, [data.edges])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(() => {}, [])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
      attributionPosition="bottom-left"
      proOptions={{ hideAttribution: true }}
    >
      <Background color="rgba(255,255,255,0.02)" gap={24} size={1} />
      <Controls
        showInteractive={false}
        style={{
          background: 'rgba(5, 5, 8, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '10px',
          overflow: 'hidden',
        }}
      />
      <MiniMap
        nodeColor={(node) => {
          const found = data.nodes.find((n) => n.id === node.id)
          return getStatusColor(found?.status_code ?? null)
        }}
        maskColor="rgba(5, 5, 8, 0.85)"
        style={{
          background: 'rgba(5, 5, 8, 0.6)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '10px',
        }}
      />
    </ReactFlow>
  )
}

import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { TriggerNode, ImpactNode, TickerNode } from './CustomNodes';

// Wrap components in ReactFlowProvider to avoid Zustand context errors
const renderWithProvider = (component: React.ReactNode) => {
  return render(<ReactFlowProvider>{component}</ReactFlowProvider>);
};

describe('Butterfly Map Nodes', () => {
  // Mock data
  const baseProps = {
    id: 'test-node',
    type: 'trigger',
    position: { x: 0, y: 0 },
    zIndex: 0,
    isConnectable: true,
    selected: false,
    dragging: false,
    xPos: 0,
    yPos: 0,
  };

  test('TriggerNode renders correctly', () => {
    const data = { label: 'Test Trigger' };
    // @ts-expect-error - Minimal props for testing
    renderWithProvider(<TriggerNode {...baseProps} data={data} />);
    
    expect(screen.getByText('事件触发')).toBeInTheDocument();
    expect(screen.getByText('Test Trigger')).toBeInTheDocument();
  });

  test('ImpactNode renders correctly', () => {
    const data = { label: 'Test Impact' };
    // @ts-expect-error - Minimal props for testing
    renderWithProvider(<ImpactNode {...baseProps} data={data} />);
    
    expect(screen.getByText('结果')).toBeInTheDocument();
    expect(screen.getByText('Test Impact')).toBeInTheDocument();
  });

  test('TickerNode renders positive change correctly', () => {
    const data = { 
      label: 'Test Company',
      ticker: 'TST',
      changePercent: 5.5
    };
    // @ts-expect-error - Minimal props for testing
    renderWithProvider(<TickerNode {...baseProps} data={data} />);
    
    expect(screen.getByText('代码')).toBeInTheDocument();
    expect(screen.getByText('TST')).toBeInTheDocument();
    expect(screen.getByText('+5.5%')).toHaveClass('text-green-500');
  });

  test('TickerNode renders negative change correctly', () => {
    const data = { 
      label: 'Test Company',
      ticker: 'TST',
      changePercent: -2.3
    };
    // @ts-expect-error - Minimal props for testing
    renderWithProvider(<TickerNode {...baseProps} data={data} />);
    
    expect(screen.getByText('-2.3%')).toHaveClass('text-red-500');
  });
});

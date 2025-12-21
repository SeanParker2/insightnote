import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeedbackForm } from './FeedbackForm';

describe('FeedbackForm', () => {
  test('submits feedback successfully', async () => {
    Object.defineProperty(navigator, 'sendBeacon', {
      value: jest.fn(() => true),
      writable: true,
    });

    const fetchMock = jest.fn(async (...args: any[]) => {
      const url = String(args[0]);
      if (url === '/api/feedback') {
        return new Response(JSON.stringify({ ok: true }), { status: 201 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 201 });
    });

    global.fetch = fetchMock as any;

    render(<FeedbackForm defaultPagePath="/posts/example" />);

    fireEvent.change(screen.getByPlaceholderText(/至少 5 个字/), { target: { value: '很好用，但还想要导出功能' } });
    fireEvent.click(screen.getByRole('button', { name: '提交反馈' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const feedbackCall = fetchMock.mock.calls.find((call) => String(call[0]) === '/api/feedback');
    expect(feedbackCall).toBeTruthy();

    const init = (feedbackCall?.[1] ?? undefined) as RequestInit | undefined;
    expect(init?.method).toBe('POST');
    expect(typeof init?.body).toBe('string');
    expect(init?.body).toContain('导出功能');
    expect(init?.body).toContain('/posts/example');
  });
});

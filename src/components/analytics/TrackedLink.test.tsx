import { render, screen, fireEvent } from '@testing-library/react';
import { TrackedLink } from './TrackedLink';

describe('TrackedLink', () => {
  test('fires event via sendBeacon on click', () => {
    const sendBeacon = jest.fn(() => true);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeacon,
      writable: true,
    });

    render(
      <TrackedLink href="/posts/demo" eventName="test_click" eventPayload={{ a: 1 }}>
        Go
      </TrackedLink>,
    );

    fireEvent.click(screen.getByText('Go'));
    expect(sendBeacon).toHaveBeenCalled();
  });
});


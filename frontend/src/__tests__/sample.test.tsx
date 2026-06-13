import { render, screen } from '@testing-library/react';

describe('Frontend Build', () => {
  test('should render without errors', () => {
    const TestComponent = () => <div>Test</div>;
    render(<TestComponent />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import App from './App';

test('renders identity prompt', () => {
  render(<App />);
  const promptElement = screen.getByText(/who are you\?/i);
  expect(promptElement).toBeInTheDocument();
});

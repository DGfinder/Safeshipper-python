import { render, screen } from '@testing-library/react';
import Home from './page';

describe('Home', () => {
  it('renders a welcome message', () => {
    render(<Home />);
    const welcomeMessage = screen.getByText(/Welcome to Safeshipper!/i);
    expect(welcomeMessage).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<Home />);
    const description = screen.getByText(/Your comprehensive logistics and dangerous goods management platform./i);
    expect(description).toBeInTheDocument();
  });
});

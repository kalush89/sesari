import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthLoadingState, AuthSpinner } from '../AuthLoadingState';

describe('AuthLoadingState', () => {
  it('should render loading message', () => {
    render(<AuthLoadingState message="Test loading..." />);
    
    expect(screen.getByText('Test loading...')).toBeInTheDocument();
  });

  it('should show progress bar when showProgress is true', () => {
    render(<AuthLoadingState showProgress={true} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('should call onTimeout when timeout is reached', async () => {
    const onTimeout = vi.fn();
    
    render(
      <AuthLoadingState 
        timeout={100} 
        onTimeout={onTimeout}
        showProgress={true}
      />
    );

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(onTimeout).toHaveBeenCalled();
  });
});

describe('AuthSpinner', () => {
  it('should render spinner with correct size', () => {
    render(<AuthSpinner size="lg" />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('h-6', 'w-6');
  });

  it('should have accessibility label', () => {
    render(<AuthSpinner />);
    
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });
});
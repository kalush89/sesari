import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { signOut } from 'next-auth/react';
import { SignOutButton } from '../SignOutButton';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
}));

// Mock workspace store
jest.mock('@/lib/stores/workspace-store', () => ({
  useWorkspaceStore: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('SignOutButton', () => {
  const mockClearWorkspaceContext = jest.fn();
  const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
  const mockUseWorkspaceStore = useWorkspaceStore as jest.MockedFunction<typeof useWorkspaceStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkspaceStore.mockReturnValue({
      clearWorkspaceContext: mockClearWorkspaceContext,
    } as any);
    
    // Mock localStorage and sessionStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        clear: jest.fn(),
      },
      writable: true,
    });
    
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        clear: jest.fn(),
      },
      writable: true,
    });
  });

  it('should render sign out button', () => {
    render(<SignOutButton />);
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('should handle successful sign out', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });
    
    mockSignOut.mockResolvedValueOnce(undefined);

    render(<SignOutButton />);
    
    const button = screen.getByText('Sign Out');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockClearWorkspaceContext).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledWith('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(localStorage.clear).toHaveBeenCalled();
      expect(sessionStorage.clear).toHaveBeenCalled();
      expect(mockSignOut).toHaveBeenCalledWith({
        callbackUrl: '/signin',
        redirect: true,
      });
    });
  });

  it('should show loading state during sign out', async () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<SignOutButton />);
    
    const button = screen.getByText('Sign Out');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Signing out...')).toBeInTheDocument();
    });
  });

  it('should handle sign out errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    mockSignOut.mockRejectedValueOnce(new Error('SignOut failed'));
    
    // Mock window.location.href
    delete (window as any).location;
    window.location = { href: '' } as any;

    render(<SignOutButton />);
    
    const button = screen.getByText('Sign Out');
    fireEvent.click(button);

    await waitFor(() => {
      expect(window.location.href).toBe('/signin');
    });
  });

  it('should accept custom className and children', () => {
    render(
      <SignOutButton className="custom-class">
        Custom Sign Out Text
      </SignOutButton>
    );
    
    const button = screen.getByText('Custom Sign Out Text');
    expect(button).toHaveClass('custom-class');
  });
});
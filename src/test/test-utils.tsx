import type { ReactElement, ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { render, type RenderOptions } from '@testing-library/react';
import { AuthProvider } from '@/app/providers/AuthProvider';

interface WrapperProps {
  children: ReactNode;
}

export function AllProviders({ children }: WrapperProps) {
  return (
    <BrowserRouter>
      <AuthProvider>{children}</AuthProvider>
    </BrowserRouter>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';

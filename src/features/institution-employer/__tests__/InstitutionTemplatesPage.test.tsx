import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InstitutionTemplatesPage from '@/features/institution-employer/pages/InstitutionTemplatesPage';
import { renderWithProviders } from '@/test/test-utils';

describe('InstitutionTemplatesPage', () => {
  it('previews a template instead of offering a dead editor', () => {
    renderWithProviders(<InstitutionTemplatesPage />);

    // The "Edit" button used to be permanently disabled with an
    // "Editing coming soon" tooltip — a visible stub on a routed page.
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /preview/i }).length).toBeGreaterThan(0);
  });

  it('points each template at the working issuance flow', () => {
    renderWithProviders(<InstitutionTemplatesPage />);

    const links = screen.getAllByRole('link', { name: /issue a credential/i });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/institution/issue');
    }
  });

  it('states plainly that the template builder is unavailable, and offers the CTA', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InstitutionTemplatesPage />);

    await user.click(screen.getByRole('button', { name: /create template/i }));

    expect(
      screen.getByText(/template builder is not available in this release/i),
    ).toBeInTheDocument();
    // No "coming soon" stub copy anywhere in the dialog.
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /issue a credential/i }));
    expect(
      screen.queryByText(/template builder is not available in this release/i),
    ).not.toBeInTheDocument();
  });
});

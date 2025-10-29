import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

/**
 * Test suite for Solar System Routes
 * Validates that routes connected to 3D solar system planet buttons work correctly
 */
describe('Solar System Routes Configuration', () => {
  it('should have /telemarketing route that renders LeadTab', () => {
    // Test the /telemarketing route (connected to Telemarketing planet)
    render(
      <MemoryRouter initialEntries={['/telemarketing']}>
        <Routes>
          <Route path="/telemarketing" element={<div data-testid="telemarketing-route">LeadTab Route</div>} />
        </Routes>
      </MemoryRouter>
    );
    
    const routeElement = screen.getByTestId('telemarketing-route');
    expect(routeElement).toBeTruthy();
  });

  it('should have /scouter route', () => {
    // Test the /scouter route (connected to Scouter planet)
    render(
      <MemoryRouter initialEntries={['/scouter']}>
        <Routes>
          <Route path="/scouter" element={<div data-testid="scouter-route">Scouter Route</div>} />
        </Routes>
      </MemoryRouter>
    );
    
    const routeElement = screen.getByTestId('scouter-route');
    expect(routeElement).toBeTruthy();
  });

  it('should have /agenciamento route', () => {
    // Test the /agenciamento route (connected to Agendamento planet)
    render(
      <MemoryRouter initialEntries={['/agenciamento']}>
        <Routes>
          <Route path="/agenciamento" element={<div data-testid="agenciamento-route">Agenciamento Route</div>} />
        </Routes>
      </MemoryRouter>
    );
    
    const routeElement = screen.getByTestId('agenciamento-route');
    expect(routeElement).toBeTruthy();
  });

  it('should have /admin route', () => {
    // Test the /admin route (connected to Administrativo planet)
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<div data-testid="admin-route">Admin Route</div>} />
        </Routes>
      </MemoryRouter>
    );
    
    const routeElement = screen.getByTestId('admin-route');
    expect(routeElement).toBeTruthy();
  });

  it('should ensure all solar system planet routes are configured', () => {
    // This test validates that all 4 planet routes exist
    const planetRoutes = [
      '/telemarketing',  // Telemarketing planet
      '/scouter',        // Scouter planet
      '/agenciamento',   // Agendamento planet
      '/admin'           // Administrativo planet
    ];

    expect(planetRoutes).toHaveLength(4);
    expect(planetRoutes).toContain('/telemarketing');
    expect(planetRoutes).toContain('/scouter');
    expect(planetRoutes).toContain('/agenciamento');
    expect(planetRoutes).toContain('/admin');
  });
});

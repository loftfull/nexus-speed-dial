import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GlassSurface } from './GlassSurface';

describe('GlassSurface', () => {
  it('exposes its semantic surface role', () => {
    render(<GlassSurface role="panel">Контент</GlassSurface>);
    expect(screen.getByText('Контент')).toHaveAttribute('data-glass-role', 'panel');
  });
});

// @vitest-environment jsdom
import type { DatabaseProperty, PropertyValue } from '@notiz/shared';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MultiChoiceCell, toggleOption } from './MultiChoiceCell';

const property: DatabaseProperty = {
  id: '9d6a1f1e-1b4e-4f3c-8a51-2f1d7a0c3b21',
  databaseId: '3c1f0e2d-5a4b-4c3d-9e8f-7a6b5c4d3e2f',
  name: 'Tags',
  type: 'multi_select',
  options: [
    { id: 'red', name: 'Red', color: 'red' },
    { id: 'blue', name: 'Blue', color: 'blue' },
  ],
  relationDatabaseId: null,
  sortOrder: 'a0',
};

describe('toggleOption', () => {
  it('adds in option order and clears the value when nothing is left', () => {
    expect(toggleOption(property, ['blue'], 'red')).toEqual(['red', 'blue']);
    expect(toggleOption(property, ['red', 'blue'], 'red')).toEqual(['blue']);
    expect(toggleOption(property, ['red'], 'red')).toBeNull();
  });
});

describe('MultiChoiceCell', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows the chosen pills and toggles options from the popover', () => {
    const onChange = vi.fn<(value: PropertyValue) => void>();
    render(<MultiChoiceCell property={property} value={['blue']} onChange={onChange} />);
    const button = screen.getByRole('button', { name: 'Blue' });
    fireEvent.click(button);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Red' }));
    expect(onChange).toHaveBeenCalledWith(['red', 'blue']);
  });

  it('shows Empty without a value', () => {
    render(<MultiChoiceCell property={property} value={null} onChange={vi.fn()} />);
    expect(screen.getByText('Empty')).toBeTruthy();
  });
});

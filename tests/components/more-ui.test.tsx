import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Spinner } from '../../src/components/ui/Spinner';
import { Progress } from '../../src/components/ui/Progress';
import { Checkbox } from '../../src/components/ui/Checkbox';
import { Label } from '../../src/components/ui/Label';
import { Separator } from '../../src/components/ui/Separator';
import React from 'react';

describe('Spinner Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders with different sizes', () => {
    const { container: smContainer } = render(<Spinner size="sm" />);
    const { container: defaultContainer } = render(<Spinner size="default" />);
    const { container: lgContainer } = render(<Spinner size="lg" />);

    expect(smContainer.querySelector('svg')).not.toBeNull();
    expect(defaultContainer.querySelector('svg')).not.toBeNull();
    expect(lgContainer.querySelector('svg')).not.toBeNull();
  });
});

describe('Progress Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<Progress value={50} />);
    expect(container.querySelector('[data-slot="progress"]')).not.toBeNull();
  });

  it('renders with value', () => {
    const { container } = render(<Progress value={75} />);
    expect(container.querySelector('[data-slot="progress"]')).not.toBeNull();
  });
});

describe('Checkbox Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<Checkbox />);
    expect(container.querySelector('button[type="button"]')).not.toBeNull();
  });

  it('renders checked', () => {
    const { container } = render(<Checkbox checked />);
    expect(container.querySelector('button[type="button"]')).not.toBeNull();
  });
});

describe('Label Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<Label>Label text</Label>);
    expect(container.querySelector('label')).not.toBeNull();
  });

  it('renders with children', () => {
    const { container } = render(<Label>Test Label</Label>);
    expect(container.textContent).toBe('Test Label');
  });
});

describe('Separator Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<Separator />);
    expect(container.querySelector('[data-slot="separator"]')).not.toBeNull();
  });

  it('renders with orientation', () => {
    const { container: horizontal } = render(<Separator orientation="horizontal" />);
    const { container: vertical } = render(<Separator orientation="vertical" />);

    expect(horizontal.querySelector('[data-slot="separator"]')).not.toBeNull();
    expect(vertical.querySelector('[data-slot="separator"]')).not.toBeNull();
  });
});

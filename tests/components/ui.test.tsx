import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Button } from '../../src/components/ui/Button';
import { Badge } from '../../src/components/ui/Badge';
import { Card } from '../../src/components/ui/Card';
import { Input } from '../../src/components/ui/Input';

describe('Button Component', () => {
  it('renders button without crashing', () => {
    const { container } = render(<Button>Click me</Button>);
    expect(container.querySelector('button')).not.toBeNull();
  });

  it('renders with different variants', () => {
    const { container: defaultContainer } = render(<Button>Default</Button>);
    const { container: outlineContainer } = render(<Button variant="outline">Outline</Button>);
    const { container: ghostContainer } = render(<Button variant="ghost">Ghost</Button>);

    expect(defaultContainer.querySelector('button')).not.toBeNull();
    expect(outlineContainer.querySelector('button')).not.toBeNull();
    expect(ghostContainer.querySelector('button')).not.toBeNull();
  });

  it('renders with different sizes', () => {
    const { container: smContainer } = render(<Button size="sm">Small</Button>);
    const { container: defaultContainer } = render(<Button size="default">Default</Button>);
    const { container: lgContainer } = render(<Button size="lg">Large</Button>);

    expect(smContainer.querySelector('button')).not.toBeNull();
    expect(defaultContainer.querySelector('button')).not.toBeNull();
    expect(lgContainer.querySelector('button')).not.toBeNull();
  });

  it('renders as disabled when disabled prop is true', () => {
    const { container } = render(<Button disabled={true}>Disabled</Button>);
    const button = container.querySelector('button');
    expect(button?.hasAttribute('disabled')).toBe(true);
  });

  it('handles click events', () => {
    let clicked = false;
    const { container } = render(<Button onClick={() => { clicked = true; }}>Click me</Button>);
    const button = container.querySelector('button');
    button?.click();
    expect(clicked).toBe(true);
  });
});

describe('Badge Component', () => {
  it('renders badge without crashing', () => {
    const { container } = render(<Badge>New</Badge>);
    // Badge renders as a div with data-slot="badge"
    expect(container.querySelector('[data-slot="badge"]')).not.toBeNull();
  });

  it('renders with different variants', () => {
    const { container: defaultContainer } = render(<Badge>Default</Badge>);
    const { container: secondaryContainer } = render(<Badge variant="secondary">Secondary</Badge>);

    expect(defaultContainer.querySelector('[data-slot="badge"]')).not.toBeNull();
    expect(secondaryContainer.querySelector('[data-slot="badge"]')).not.toBeNull();
  });
});

describe('Card Component', () => {
  it('renders card without crashing', () => {
    const { container } = render(<Card><div>Card content</div></Card>);
    expect(container.querySelector('div')).not.toBeNull();
  });
});

describe('Input Component', () => {
  it('renders input without crashing', () => {
    const { container } = render(<Input placeholder="Enter text" />);
    expect(container.querySelector('input')).not.toBeNull();
  });

  it('renders input with placeholder', () => {
    const { container } = render(<Input placeholder="Enter text" />);
    const input = container.querySelector('input');
    expect(input?.getAttribute('placeholder')).toBe('Enter text');
  });

  it('renders input with value', () => {
    const { container } = render(<Input value="Test value" readOnly={true} />);
    const input = container.querySelector('input');
    expect(input?.value).toBe('Test value');
  });
});

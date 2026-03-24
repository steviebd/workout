import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton, SkeletonCard, SkeletonButton, SkeletonInput, SkeletonList } from '../../src/components/ui/Skeleton';
import React from 'react';

describe('Skeleton Components', () => {
  describe('Skeleton', () => {
    it('renders without crashing', () => {
      const { container } = render(<Skeleton />);
      expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    });

    it('renders with custom className', () => {
      const { container } = render(<Skeleton className="custom-class" />);
      const skeleton = container.querySelector('[data-slot="skeleton"]');
      expect(skeleton?.getAttribute('class')).toContain('custom-class');
    });
  });

  describe('SkeletonCard', () => {
    it('renders without crashing', () => {
      const { container } = render(<SkeletonCard />);
      expect(container.querySelector('div')).not.toBeNull();
    });
  });

  describe('SkeletonButton', () => {
    it('renders without crashing', () => {
      const { container } = render(<SkeletonButton />);
      expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    });
  });

  describe('SkeletonInput', () => {
    it('renders without crashing', () => {
      const { container } = render(<SkeletonInput />);
      expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    });
  });

  describe('SkeletonList', () => {
    it('renders default count', () => {
      const { container } = render(<SkeletonList />);
      expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    });

    it('renders custom count', () => {
      const { container } = render(<SkeletonList count={5} />);
      expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    });
  });
});

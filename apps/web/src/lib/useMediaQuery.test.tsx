// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { breakpointForWidth, PHONE_QUERY } from './breakpoints';
import { installFakeMatchMedia } from './fakeMatchMedia';
import { useBreakpoint, useCoarsePointer, useMediaQuery } from './useMediaQuery';

describe('breakpointForWidth', () => {
  it('splits phone, tablet and desktop at 768 and 1024', () => {
    expect(breakpointForWidth(375)).toBe('phone');
    expect(breakpointForWidth(767)).toBe('phone');
    expect(breakpointForWidth(768)).toBe('tablet');
    expect(breakpointForWidth(1024)).toBe('tablet');
    expect(breakpointForWidth(1025)).toBe('desktop');
  });
});

describe('useMediaQuery', () => {
  afterEach(cleanup);

  it('follows the window when it crosses a breakpoint', () => {
    const screen = installFakeMatchMedia(1280);
    const { result } = renderHook(() => ({
      phone: useMediaQuery(PHONE_QUERY),
      breakpoint: useBreakpoint(),
    }));
    expect(result.current).toEqual({ phone: false, breakpoint: 'desktop' });

    act(() => screen.resize(900));
    expect(result.current).toEqual({ phone: false, breakpoint: 'tablet' });

    act(() => screen.resize(375));
    expect(result.current).toEqual({ phone: true, breakpoint: 'phone' });
  });

  it('reports a coarse pointer for touch screens', () => {
    installFakeMatchMedia(375, true);
    const { result } = renderHook(() => useCoarsePointer());
    expect(result.current).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { type PageContent, extractPlainText, pageContentSchema } from './content.js';

describe('extractPlainText', () => {
  it('returns an empty string for an empty document', () => {
    expect(extractPlainText([])).toBe('');
  });

  it('joins styled text and links within a block', () => {
    const blocks: PageContent = [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hello', styles: { bold: true } },
          { type: 'link', href: 'https://example.com', content: [{ type: 'text', text: 'world' }] },
        ],
      },
    ];
    expect(extractPlainText(blocks)).toBe('Hello world');
  });

  it('visits nested children and table cells', () => {
    const blocks: PageContent = [
      {
        type: 'bulletListItem',
        content: [{ type: 'text', text: 'Parent' }],
        children: [{ type: 'paragraph', content: [{ type: 'text', text: 'Child' }] }],
      },
      {
        type: 'table',
        content: {
          type: 'tableContent',
          rows: [{ cells: [[{ type: 'text', text: 'A1' }], [{ type: 'text', text: 'B1' }]] }],
        },
      },
    ];
    expect(extractPlainText(blocks)).toBe('Parent\nChild\nA1 B1');
  });

  it('includes file names and captions but not urls', () => {
    const blocks: PageContent = [
      {
        type: 'image',
        props: { url: '/api/attachments/x', name: 'plan.png', caption: 'Floor plan' },
      },
    ];
    expect(extractPlainText(blocks)).toBe('plan.png Floor plan');
  });
});

describe('pageContentSchema', () => {
  it('keeps unknown block fields', () => {
    const parsed = pageContentSchema.parse([{ id: 'b1', type: 'paragraph', props: {} }]);
    expect(parsed[0]).toMatchObject({ id: 'b1' });
  });

  it('rejects blocks without a type', () => {
    expect(pageContentSchema.safeParse([{ content: [] }]).success).toBe(false);
  });
});

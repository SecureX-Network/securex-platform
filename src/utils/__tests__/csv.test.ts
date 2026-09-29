import { describe, it, expect } from 'vitest';
import { toCsv, downloadCsv, csvFilename, type CsvColumn } from '../csv';

interface Row {
  id: string;
  note: string | null;
  count: number;
}

const COLUMNS: CsvColumn<Row>[] = [
  { header: 'ID', value: (r) => r.id },
  { header: 'Note', value: (r) => r.note },
  { header: 'Count', value: (r) => r.count },
];

describe('toCsv', () => {
  it('emits a header row and one line per row', () => {
    const csv = toCsv<Row>(
      [
        { id: 'a', note: 'first', count: 1 },
        { id: 'b', note: 'second', count: 2 },
      ],
      COLUMNS,
    );

    expect(csv).toBe('ID,Note,Count\r\na,first,1\r\nb,second,2');
  });

  it('renders null and undefined as empty cells', () => {
    const csv = toCsv<Row>([{ id: 'a', note: null, count: 0 }], COLUMNS);

    expect(csv).toBe('ID,Note,Count\r\na,,0');
  });

  it('quotes fields containing commas, quotes and newlines', () => {
    const csv = toCsv<Row>(
      [{ id: 'a,b', note: 'He said "hi"\nagain', count: 1 }],
      COLUMNS,
    );

    expect(csv).toBe('ID,Note,Count\r\n"a,b","He said ""hi""\r\nagain",1');
  });

  it('neutralises spreadsheet formula injection', () => {
    const csv = toCsv<Row>(
      [{ id: '=1+1', note: '@SUM(A1)', count: 1 }],
      COLUMNS,
    );

    expect(csv).toBe('ID,Note,Count\r\n\t=1+1,\t@SUM(A1),1');
  });

  it('emits only a header for an empty row set', () => {
    expect(toCsv<Row>([], COLUMNS)).toBe('ID,Note,Count');
  });
});

describe('csvFilename', () => {
  it('appends .csv and a date stamp', () => {
    expect(csvFilename('audit-log', new Date('2026-09-29T12:00:00Z'))).toBe(
      'audit-log-2026-09-29.csv',
    );
  });

  it('does not double up the extension', () => {
    expect(csvFilename('audit-log.csv', new Date('2026-09-29T12:00:00Z'))).toBe(
      'audit-log.csv-2026-09-29.csv',
    );
  });
});

describe('downloadCsv', () => {
  it('creates, clicks and cleans up a download link', () => {
    const created: HTMLAnchorElement[] = [];
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    const click = vi.fn();
    const createElement = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string) => {
        const el = document.createElementNS('http://www.w3.org/1999/xhtml', 'a') as HTMLAnchorElement;
        if (tag === 'a') {
          el.click = click;
          created.push(el);
        }
        return el;
      });

    expect(downloadCsv('audit-log', 'A,B\r\n1,2')).toBe(true);
    expect(createElement).toHaveBeenCalledWith('a');
    const link = created[0];
    expect(link).toBeDefined();
    expect(link!.download).toBe('audit-log.csv');
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    // The link must not be left behind in the document.
    expect(document.body.contains(link!)).toBe(false);

    createElement.mockRestore();
    vi.unstubAllGlobals();
  });
});

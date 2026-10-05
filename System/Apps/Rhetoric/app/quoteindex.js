/**
 * The Index group's ordering and grouping: turns the real quotes into groups of one-line entries
 * (first line, source, date) in the order Luke picks. Pure functions of data; view.js builds the
 * entries and render.js draws them. Text stays data here (JS-6): nothing is made into markup.
 */

import { stripInline } from './markup.js';

export const INDEX_ORDERS = [
  { key: 'first_line', label: 'First line', hint: "A to Z by the quote's opening words" },
  { key: 'source', label: 'Source', hint: 'A to Z by who said it, as the credit names them' },
  { key: 'date', label: 'Date', hint: 'Oldest first; quotes with no known date come last' },
];

export const UNKNOWN_DATE_HEADING = 'Date unknown';

const FIRST_LINE_MAX = 72; // characters; a verse line break ( / ) ends the line sooner
const SOURCE_SHORT_MAX = 48; // characters; a long title is cut so the first line keeps its room
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const LEADING_ARTICLE = /^(the|an|a)\s+/i;

// Ignoring punctuation lets a quote that opens with a quotation mark or an ellipsis file by its first word.
const collator = new Intl.Collator('en', { sensitivity: 'base', ignorePunctuation: true });
const compareText = (a, b) => collator.compare(a, b);

/** The quote's opening: up to the first verse break, or the first 72 characters cut at a word. */
export function firstLine(text) {
  const plain = stripInline(text).split(' / ')[0].trim();
  if (plain.length <= FIRST_LINE_MAX) return plain;
  const cut = plain.slice(0, FIRST_LINE_MAX);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 1)).replace(/[\s,;:.]+$/, '')}…`;
}

/** The name the source line opens with ("Churchill" in "Churchill, House of Commons speech, 4 June 1940"). */
export function creditedName(source) {
  return stripInline(source.split(',')[0]).trim();
}

const capitalised = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// An author written as a body ("Advisory Committee to the Surgeon General", "The Preacher") has no surname to put first.
const IS_BODY = /\s(to|of)\s|^the\s/i;

/**
 * How a quote is filed under Source: the author written surname first ("Lincoln, Abraham"), a body or a
 * single name as written, and for an unattributed quote the name its source line opens with.
 * The heading is also the sort key, so the quotes of one author stand together whoever the credit names
 * (Shakespeare's lines credited to "Lear" or "Jaques" all file under Shakespeare).
 */
export function sourceHeading(quote) {
  const { author } = quote;
  if (!author) return capitalised(creditedName(quote.source));
  if (IS_BODY.test(author)) return capitalised(author.replace(LEADING_ARTICLE, ''));
  const first = author.split(' and ')[0].trim();
  const words = first.split(/\s+/);
  if (words.length === 1) return author;
  const given = words.slice(0, -1).join(' ');
  return `${words.at(-1)}, ${given}${author.slice(first.length)}`;
}

/** The short source on an index line: the author's surname (or the credited name), plus the work's italic title when the source line gives one: "Shakespeare, As You Like It". Only the first clause (before a ";") is read for the title: what follows is a gloss or a note, such as "*bread* stands for all food" or a book that merely lists the quote. */
export function sourceShort(quote) {
  const name = quote.author ? sourceHeading(quote).split(',')[0] : creditedName(quote.source);
  const title = /\*([^*]+)\*/.exec(quote.source.split(';')[0])?.[1];
  const short = title && !name.includes(title) ? `${name}, ${title}` : name;
  return short.length <= SOURCE_SHORT_MAX ? short : `${short.slice(0, SOURCE_SHORT_MAX - 1).trimEnd()}…`;
}

/** A stored date's year as a signed number: '1678' is 1678, '0060' is 60, '-0935' (935 BC) is -935. */
export function yearNumber(date) {
  return date.startsWith('-') ? -Number(date.slice(1, 5)) : Number(date.slice(0, 4));
}

/** A year as it reads: 1678 is "1678", 60 is "AD 60", -935 is "935 BC". */
export function yearLabel(year) {
  if (year < 0) return `${-year} BC`;
  return year < 1000 ? `AD ${year}` : String(year);
}

/** '1940-06-04' reads "4 June 1940"; '1678' reads "1678"; '0060' reads "AD 60"; '-0935' reads "935 BC". */
export function formatDate(date) {
  if (!date) return '';
  const label = yearLabel(yearNumber(date));
  const [, month, day] = date.split('-');
  return month && !date.startsWith('-') ? `${Number(day)} ${MONTHS[Number(month) - 1]} ${label}` : label;
}

/** The decade heading for a year: 1830 is "1830s", 50 is "AD 50s", -935 is "930s BC". */
function decadeHeading(year) {
  if (year < 0) return `${Math.floor(-year / 10) * 10}s BC`;
  const decade = Math.floor(year / 10) * 10;
  return year < 1000 ? `AD ${decade}s` : `${decade}s`;
}

/** One index line for a quote and the device it illustrates. */
export function indexEntry(quote, device) {
  return {
    quote,
    device,
    firstLine: firstLine(quote.text),
    sourceShort: sourceShort(quote),
    year: quote.date ? yearLabel(yearNumber(quote.date)) : '',
    dateLabel: formatDate(quote.date),
  };
}

function letterOf(entry) {
  const letter = stripInline(entry.quote.text).normalize('NFD').match(/[A-Za-z0-9]/)?.[0] ?? '#';
  return /[0-9]/.test(letter) ? '#' : letter.toUpperCase();
}

const byFirstLine = (a, b) => compareText(stripInline(a.quote.text), stripInline(b.quote.text));

/** Collects consecutive entries sharing a heading into groups, keeping the order given. */
function grouped(entries, headingOf) {
  const groups = [];
  for (const entry of entries) {
    const heading = headingOf(entry);
    if (groups.at(-1)?.heading === heading) groups.at(-1).entries.push(entry);
    else groups.push({ heading, entries: [entry] });
  }
  return groups;
}

/**
 * `entries` as groups `{ heading, entries }` in the chosen order:
 * first_line: A to Z by opening words, a heading per letter;
 * source: A to Z by author (surname first), then by opening words;
 * date: oldest first (a year BC before any AD year) in a heading per decade, then the quotes with no known date, A to Z by opening words.
 */
export function groupEntries(entries, order) {
  if (order === 'source') {
    const sorted = [...entries].sort((a, b) => compareText(sourceHeading(a.quote), sourceHeading(b.quote)) || byFirstLine(a, b));
    return grouped(sorted, (entry) => sourceHeading(entry.quote));
  }
  if (order === 'date') {
    const dated = entries.filter((entry) => entry.quote.date)
      .sort((a, b) => yearNumber(a.quote.date) - yearNumber(b.quote.date)
        || (a.quote.date < b.quote.date ? -1 : a.quote.date > b.quote.date ? 1 : 0) || byFirstLine(a, b));
    const undated = entries.filter((entry) => !entry.quote.date).sort(byFirstLine);
    return [
      ...grouped(dated, (entry) => decadeHeading(yearNumber(entry.quote.date))),
      ...(undated.length > 0 ? [{ heading: UNKNOWN_DATE_HEADING, entries: undated }] : []),
    ];
  }
  return grouped([...entries].sort(byFirstLine), letterOf);
}

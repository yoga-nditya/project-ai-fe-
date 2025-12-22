function htmlToText(input: string): string {
  if (!input) return '';
  let s = String(input);

  const decodeOnce = (x: string) =>
    x
      // unicode escape yang sering muncul dari JSON
      .replace(/\\u003C/gi, '<')
      .replace(/\\u003E/gi, '>')
      .replace(/\\u002F/gi, '/')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '')
      .replace(/\\t/g, ' ')
      // backslash-escaped angle brackets: \<b\>
      .replace(/\\</g, '<')
      .replace(/\\>/g, '>')
      // HTML entities
      .replace(/&nbsp;/gi, ' ')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&#x27;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>');

  const normalizeBreaks = (x: string) =>
    x
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\/\s*p\s*>/gi, '\n')
      .replace(/<\s*p[^>]*>/gi, '')
      .replace(/<\/\s*div\s*>/gi, '\n')
      .replace(/<\s*div[^>]*>/gi, '')
      .replace(/<\/\s*li\s*>/gi, '\n')
      .replace(/<\s*li[^>]*>/gi, '• ');

  const stripTags = (x: string) => x.replace(/<[^>]*>/g, '');

  // loop biar kebersihan maksimal walau double/triple-escaped
  for (let i = 0; i < 5; i++) {
    const before = s;

    s = decodeOnce(s);
    s = normalizeBreaks(s);

    // hapus tag beneran
    s = stripTags(s);

    // hapus "tag" yang masih bentuk entity (jaga-jaga)
    s = s.replace(/&lt;[^&]*&gt;/gi, '');

    // rapikan
    s = s.replace(/\r/g, '');
    s = s.replace(/[ \t]+\n/g, '\n');
    s = s.replace(/\n{3,}/g, '\n\n');
    s = s.trim();

    if (s === before) break;
  }

  return s;
}

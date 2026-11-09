import { genreParamsSchema, normalizeGenre } from '../../src/movies/movie.schemas';

describe('normalizeGenre', () => {
  it.each([
    ['Science Fiction', 'science fiction'],
    ['SCIENCE FICTION', 'science fiction'],
    ['science-fiction', 'science fiction'],
    ['Science-Fiction', 'science fiction'],
    ['  drama  ', 'drama'],
    ['tv-movie', 'tv movie'],
    ['science   fiction', 'science fiction'],
    ['-drama-', 'drama'],
  ])('turns %p into %p', (raw, expected) => {
    expect(normalizeGenre(raw)).toBe(expected);
  });
});

describe('genreParamsSchema', () => {
  it('normalizes the genre while parsing', () => {
    expect(genreParamsSchema.parse({ genre: ' Science-Fiction ' })).toEqual({
      genre: 'science fiction',
    });
  });

  it.each(['', '   ', '---'])('rejects the blank genre %p', (genre) => {
    expect(genreParamsSchema.safeParse({ genre }).success).toBe(false);
  });
});

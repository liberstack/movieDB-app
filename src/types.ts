// ─── OMDb API Types ───────────────────────────────────────

export type OMDbMovie = {
  imdbID: string;
  Title:  string;
};

export type OMDbSearchResponse = {
  Search?:       OMDbMovie[];
  totalResults?: string;
  Response:      string;
  Error?:        string;
};

export type OMDbDetail = {
  Title:      string;
  Year:       string;
  Rated:      string;
  Runtime:    string;
  Genre:      string;
  Director:   string;
  Actors:     string;
  Plot:       string;
  Country:    string;
  Awards:     string;
  BoxOffice?: string;
  imdbRating: string;
  imdbID:     string;
  Poster?:    string;
  Ratings:    Array<{ Source: string; Value: string }>;
  Response:   string;
};

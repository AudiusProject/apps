import unicodedata

import regex as re

reserved_handles = {
    "discover",
    "account",
    "collection",
    "curated",
    "podcast",
    "library",
    "next",
    "suggested",
    "follow",
    "stats",
    "radio",
    "like",
    "repost",
    "share",
    "social",
    "artist",
    "options",
    "billing",
    "support",
    "genre",
    "mood",
    "collections",
    "podcasts",
    "libraries",
    "suggestions",
    "following",
    "stations",
    "likes",
    "reposts",
    "artists",
    "notification",
    "message",
    "inbox",
    "genres",
    "moods",
    "embed",
    "crypto",
    "payment",
    "error",
    "search",
    "api",
    "200",
    "204",
    "400",
    "404",
}


a_confusables = {
    "\u0410": "a",  # А Cyrillic
    "\u0430": "a",  # а Cyrillic
    "\u0391": "a",  # Α Greek
    "\u03b1": "a",  # α Greek
    "\u1d00": "a",  # ᴀ Latin small capital A
    "\u2c6f": "a",  # Ɐ turned A
    "\u023a": "a",  # Ⱥ A with stroke
}


def normalize_for_match(s: str) -> str:
    # 1) Compatibility normalize (fold math-bold, script, etc.)
    t = unicodedata.normalize("NFKC", s)
    # 2) Replace known A confusables
    t = "".join(a_confusables.get(ch, ch) for ch in t)
    # 3) Strip diacritics (Á, Â → A)
    t = unicodedata.normalize("NFD", t)
    t = re.sub(r"\p{M}+", "", t)
    # 4) Lowercase
    return t.lower()


handle_badwords = {
    "audius",
    "airdrop",
    "audlus",
    "auduis",
    "auddius",
    "avdius",
    "audus",
    "noticeagent",  # used by scambots
}

handle_badwords_lower = {x.lower() for x in handle_badwords}


def has_badwords(s: str) -> bool:
    f = normalize_for_match(s)
    return any(badword in f for badword in handle_badwords_lower)


genre_allowlist = {
    "Acoustic",
    "Alternative",
    "Ambient",
    "Audiobooks",
    "Blues",
    "Classical",
    "Comedy",
    "Country",
    "Dancehall",
    "Deep House",
    "Devotional",
    "Disco",
    "Downtempo",
    "Drum & Bass",
    "Dubstep",
    "Electro",
    "Electronic",
    "Experimental",
    "Folk",
    "Funk",
    "Future Bass",
    "Future House",
    "Glitch Hop",
    "Hardstyle",
    "Hip-Hop/Rap",
    "House",
    "Hyperpop",
    "Jazz",
    "Jersey Club",
    "Jungle",
    "Kids",
    "Latin",
    "Lo-Fi",
    "Metal",
    "Moombahton",
    "Podcasts",
    "Pop",
    "Progressive House",
    "Punk",
    "R&B/Soul",
    "Reggae",
    "Rock",
    "Soundtrack",
    "Spoken Word",
    "Tech House",
    "Techno",
    "Trance",
    "Trap",
    "Tropical House",
    "Vaporwave",
    "World",
}


moods = {
    "Peaceful",
    "Romantic",
    "Sentimental",
    "Tender",
    "Easygoing",
    "Yearning",
    "Sophisticated",
    "Sensual",
    "Cool",
    "Gritty",
    "Melancholy",
    "Serious",
    "Brooding",
    "Fiery",
    "Defiant",
    "Aggressive",
    "Rowdy",
    "Excited",
    "Energizing",
    "Empowering",
    "Stirring",
    "Upbeat",
    "Other",
}

reserved_handles_lower = {x.lower() for x in reserved_handles}
genres_lower = {x.lower() for x in genre_allowlist}
moods_lower = {x.lower() for x in moods}

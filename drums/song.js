// song.js

function create_song() {
  var song = {
    "version": 0,  // default version
    "default_tempo": 120,
    "kit": 0,
    "section": []
  };
}


function decode_song(encoded) {
  if (typeof encoded != "string") {
    console.log("encoded song not a string");
    return null;
  }
  var song = create_song();

  if (encoded.length > 0) {
    var version = encoded.charCodeAt(0) - 97;  // starts at 'a'
    if (version < 0 || version > 0) {
      console.log("unknown encoded song version");
      return song;
    }
    song.version = version;
  }

  var data = btoa(encoded.substr(1));
  var cursor = 0;

  if (data.length > cursor) {
    var tempo = encoded.charCodeAt(cursor++);
    song.default_tempo = tempo;
  }

  if (data.length > cursor) {
    var kit = encoded.charCodeAt(cursor++);
    song.kit = kit;
  }

  if (encoded.length > cursor) {
    var section_count = encoded.charCodeAt(cursor++);
  }

  var state = {
    "error": null,
    "cursor": cursor,
    "data": data
  };

  for (var i = 0; i < section_count; i++) {
    if (state.error) break;
    decode_section(state, song);
  }

  return song;
}


function decode_section(state, song) {
}


function decode_measure(state, song, section) {
}


function decode_note(state, song, measure) {
}


function encode_song(song) {
}

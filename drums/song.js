// song.js

function create_song() {
  var song = {
    "version": 0,  // default version
    "default_tempo": 120,
    "kit": 0,
    "section": [],
    "measure": []
  };
}


function create_test_song() {
  var song = {
    "version": 0,
    "default_tempo": 120,
    "kit": 0,
    "measure": [
      {
	"beats": 4,
	"dt": 0,
	"note": [
	  { "t":     0, "i": 3, "v": 200 },
	  { "t":     0, "i": 0, "v": 220 },

	  { "t":  2048, "i": 3, "v": 80 },

	  { "t":  4096, "i": 3, "v": 200 },
	  { "t":  4096, "i": 1, "v": 240 },

	  { "t":  6144, "i": 3, "v": 80 },

	  { "t":  8192, "i": 3, "v": 200 },
	  { "t":  8192, "i": 0, "v": 220 },

	  { "t": 10240, "i": 3, "v": 80 },

	  { "t": 12288, "i": 3, "v": 200 },
	  { "t": 12288, "i": 1, "v": 240 },

	  { "t": 14336, "i": 3, "v": 80 },
	]
      },
      {
	"beats": 4,
	"dt": 0,
	"note": [
	  { "t":     0, "i": 3, "v": 200 },
	  { "t":     0, "i": 0, "v": 220 },

	  { "t":  2048, "i": 3, "v": 80 },

	  { "t":  4096, "i": 3, "v": 200 },
	  { "t":  4096, "i": 1, "v": 240 },

	  { "t":  6144, "i": 3, "v": 80 },

	  { "t":  8192, "i": 3, "v": 200 },
	  { "t":  8192, "i": 0, "v": 220 },

	  { "t": 10240, "i": 3, "v": 80 },

	  { "t": 12288, "i": 4, "v": 200 },
	  { "t": 12288, "i": 1, "v": 230 },

	  { "t": 14336, "i": 4, "v": 80 },
	  { "t": 14336, "i": 0, "v": 220 },
	]
      },
      {
	"beats": 4,
	"dt": 0,
	"note": [
	  { "t":     0, "i": 3, "v": 200 },
	  { "t":     0, "i": 0, "v": 220 },

	  { "t":  2048, "i": 3, "v": 200 },

	  { "t":  4096, "i": 3, "v": 200 },
	  { "t":  4096, "i": 1, "v": 240 },

	  { "t":  6144, "i": 3, "v": 200 },

	  { "t":  8192, "i": 3, "v": 200 },
	  { "t":  8192, "i": 0, "v": 220 },

	  { "t": 10240, "i": 3, "v": 200 },

	  { "t": 12288, "i": 3, "v": 200 },
	  { "t": 12288, "i": 1, "v": 240 },

	  { "t": 14336, "i": 4, "v": 200 },
	  { "t": 14336, "i": 1, "v": 220 },
	]
      }
    ],
    "section": [
      { "measure": [ 0, 1, 0, 2, 0, 1, 0, 1 ] }
    ],
  };
  return song;
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

  var state = {
    "error": null,
    "cursor": 0,
    "data": btoa(encoded.substr(1))
  };

  song.default_tempo = read_byte(state);
  if (state.error) return null;

  song.kit = read_byte(state);
  if (state.error) return null;

  var measure_count = read_byte(state);
  if (state.error) return null;

  for (var i = 0; i < measure_count; i++) {
    song.measure.push(decode_measure(state, song));
    if (state.error) return null;
  }

  var section_count = read_byte(state);
  if (state.error) return null;

  for (var i = 0; i < section_count; i++) {
    song.section.push(decode_section(state, song));
    if (state.error) return null;
  }

  return song;
}


function decode_section(state, song) {
  var measure_count = read_byte(state);
  if (state.error) return;

  var section = {
    "measure": []  // these are just indices into the song.measure array
  };

  for (var i = 0; i < measure_count; i++) {
    section.measure.push(read_byte(state));
    if (state.error) return;
  }

  return section;
}


function decode_measure(state, song) {
  var measure = {
    "beats": 4,
    "dt": 0,    // delta tempo
    "note": []
  };

  // TODO beats & tempo_increment

  var note_count = read_byte(state);
  if (state.error) return measure;

  for (var i = 0; i < note_count; i++) {
    measure.note.push(decode_node(state, song));
    if (state.error) return measure;
  }

  return measure;
}


function decode_note(state, song) {
  var t = read_byte(state) + read_byte(state) * 256;
  var note = {
    "t": t,  // time offset, in 4.12 fixed-point beats from measure start
    "i": read_byte(state),  // instrument
    "v": read_byte(state)   // volume 0-255
  };
  return note;
}


function read_byte(state) {
  if (state.cursor >= state.data.length) {
    state.error = "read_byte: out of data, cursor = " + state.cursor;
    return 0;
  }
  return state.data.charCodeAt(state.cursor++);
}


function encode_song(song) {
}

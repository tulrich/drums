// song.js

function create_song() {
  var song = {
    "default_tempo": 120,
    "kit": 0,
    "section": [],
    "measure": [],
    "measure_reference": [],
  };
  return song;
}

function update_location(song) {
  // Push the encoding of the current song into the URL.
  var hash = encode_song_and_fx(song, get_fx_settings());
  window.location.hash = "s=" + hash;
}

function song_from_location() {
  var hash = window.location.hash;
  if (hash.substr(0, 2) == "s=") {
    var info = decode_song_and_fx(hash.substr(2));
    if (info && info.song && info.fx) { return info; }
  }
  return {
    "song": create_test_song(),
    "fx": create_default_fx()
  };
}

// Return the measure position (as a measure index with fractional
// part giving position within the measure), given a song and an
// absolute sample index.
function get_song_measure_position(song, t) {
  // TODO make this more efficient?
  var measure_t = 0;
  for (var i = 0; i < song.measure_reference.length; i++) {
    var measure_id = song.measure_reference[i];
    var measure = song.measure[measure_id];
    var measure_end_t = measure_t + 44100 * 60.0 * measure.beats / play_state.tempo;
    if (t >= measure_t && t < measure_end_t) {
      // Compute the result.
      var f = i + (t - measure_t) / (measure_end_t - measure_t);
      return f;
    }
    measure_t = measure_end_t;
  }
  return song.measure_reference.length;
}

function create_test_song() {
  var song = {
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
    "measure_reference": [ 0, 1, 0, 2, 0, 1, 0, 1 ],
  };
  return song;
}


function decode_song_and_fx(encoded) {
  if (typeof encoded != "string") {
    console.log("encoded song not a string");
    return null;
  }

  var version = 0;
  if (encoded.length > 0) {
    version = encoded.charCodeAt(0) - 97;  // starts at 'a'
    if (version < 0 || version > 0) {
      console.log("unknown encoded song version");
      return null;
    }
  }

  var data = atob(LZString.decompressFromBase64(encoded.substr(1)).replace(/_/g, "="));

  var state = {
    "version": version,
    "error": null,
    "cursor": 0,
    "data": data
  };

  var fx = decode_fx_settings(state);
  var song = decode_song(state);
  if (!fx || !song) { return null; }

  return {
    "fx": fx,
    "song": song
  };
}

function decode_fx_settings(state) {
  var fx = {};
  var fx_count = read_byte(state);
  if (state.error) { console.log(state); return null; }

  var last_i = 0;
  for (var i = 0; i < fx_count; i++) {
    var i = read_byte(state) + last_i;
    if (state.error) { console.log(state); return null; }
    var tick = read_byte(state);
    if (state.error) { console.log(state); return null; }

    last_i = i;
    fx[fx_index_to_id(i)] = tick;
  }
  return fx;
}

function decode_song(state) {
  var song = create_song();

  song.default_tempo = read_byte(state);
  if (state.error) { console.log(state); return null; }

  song.kit = read_byte(state);
  if (state.error) { console.log(state); return null; }

  var measure_count = read_byte(state);
  if (state.error) { console.log(state); return null; }

  for (var i = 0; i < measure_count; i++) {
    song.measure.push(decode_measure(state, song));
    if (state.error) { console.log(state); return null; }
  }

  var measure_reference_count = read_byte(state);
  if (state.error) { console.log(state); return null; }

  for (var i = 0; i < measure_reference_count; i++) {
    song.measure_reference.push(read_byte(state));
    if (state.error) { console.log(state); return null; }
  }

  return song;
}


function decode_measure(state, song) {
  var measure = {
    "beats": 4,
    "dt": 0,    // delta tempo
    "note": []
  };

  measure.beats = read_byte(state);

  // TODO tempo_increment
  measure.dt = 0;

  var note_count = read_byte(state);
  if (state.error) return measure;

  for (var i = 0; i < note_count; i++) {
    measure.note.push(decode_note(state, song));
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


function encode_song_and_fx(song, fx) {
  var version = 0;
  var s = '';
  s += String.fromCharCode(97 + version);

  var data = encode_fx_settings(fx) + encode_song(song);
  s += LZString.compressToBase64(data).replace(/=/g, "_");

  return s;
}

function encode_fx_settings(fx) {
  var d = "";
  var settings_count = 0;
  var last_i = 0;
  for (var i = 0; i < 256; i++) {
    var id = fx_index_to_id(i);
    if (id) {
      settings_count++;
      d += String.fromCharCode(i - last_i);
      last_i = i;
      var tick = fx[id]
      d += String.fromCharCode(tick);
    }
  }
  d = String.fromCharCode(settings_count) + d;
  return d;
}

function encode_song(song) {
  var data = '';
  data += String.fromCharCode(song.default_tempo);
  data += String.fromCharCode(song.kit);
  var measure_count = song.measure.length;
  data += String.fromCharCode(measure_count);
  for (var i = 0; i < measure_count; i++) {
    data += encode_measure(song, song.measure[i]);
  }

  var measure_reference_count = song.measure_reference.length;
  data += String.fromCharCode(measure_reference_count);
  for (var i = 0; i < measure_reference_count; i++) {
    data += String.fromCharCode(song.measure_reference[i]);
  }
  return data;
}

function encode_measure(song, measure) {
  var data = '';
  data += String.fromCharCode(measure.beats);
  // TODO tempo_increment
  data += String.fromCharCode(measure.note.length);
  for (var i = 0; i < measure.note.length; i++) {
    var n = measure.note[i];
    var t_hi = Math.floor(n.t / 256);
    var t_lo = n.t - t_hi * 256;
    data += String.fromCharCode(t_lo) + String.fromCharCode(t_hi);
    data += String.fromCharCode(n.i);
    data += String.fromCharCode(n.v);
  }
  return data;
}

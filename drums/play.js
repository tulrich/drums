// play.js

function create_play_state(song) {
  return {
    "t": 0,
    "tempo": song.default_tempo,
    "t0currentTime": context.currentTime + 0.100
  };
}

function queue_more(song, t0, t1, state) {
  for (var i = 0; i < song.section.length; i++) {
    // ...xxx
  }
}

function queue_song(song) {
  if (!song) { return; }

  var state = create_play_state(song);
  state.t0currentTime += 1.000;

  //queue_more(song, song_total_ticks(song), state);
  queue_more(song, 8192, state);//xxxxxx
}

function song_total_ticks(song) {
  var total_ticks = 0;
  for (var i = 0; i < song.measure_reference.length; i++) {
    var measure_id = song.measure_reference[i];
    if (measure_id < 0 || measure_id >= song.measure.length) {
      console.log("bad measure_id at i", measure_id, i);
    }
    total_ticks += song.measure[measure_id].beats * 4096;
  }
  return total_ticks;
}

function queue_more(song, dt, state) {
  var t0 = state.t;
  var t1 = t0 + dt;
  var measure_t = 0;
  for (var i = 0; i < song.measure_reference.length && measure_t < t1; i++) {
    var measure_id = song.measure_reference[i];
    if (measure_id < 0 || measure_id >= song.measure.length) {
      console.log("bad measure_id at i", measure_id, i);
    }
    var measure = song.measure[measure_id];
    queue_measure(measure, measure_t, t0, t1, state);
    measure_t += measure.beats * 4096;
  }
}

function queue_measure(measure, measure_t, t0, t1, state) {
  var time_increment = measure.beats * 4096;
  var t_offset = (state.t0currentTime - context.currentTime) * 4096.0;

  if (measure_t + time_increment >= t0) {
    for (var i = 0; i < measure.note.length; i++) {
      var n = measure.note[i];
      var abs_note_t = measure_t + n.t;
      if (abs_note_t >= t0 && abs_note_t < t1) {
        // Queue it.
        if (n.t >= time_increment) {
          console.log("bad note time", n.t, time_increment);
        } else {
          var t = (abs_note_t + t_offset) / (4096 * state.tempo);
	  console.log(n.i, n.v, n.t, measure_t, t, context.currentTime + t);//xxx
          play(n.i, n.v, context.currentTime + t);
        }
      }
    }
  }
}

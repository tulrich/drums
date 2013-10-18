// play.js

function create_play_state(song) {
  return {
    "playing": true,
    "song": song,
    "t": 0,  // song time, in (integral) samples, 44100 samples/sec
    "tempo": song.default_tempo,
    "t0currentTime": context.currentTime + 0.100,
    "loop_measure0": -1,
    "loop_length": 1
  };
}

function stop_song() {
  if (!play_state) { return; }
  play_state.playing = false;
}

function start_song(song) {
  if (!song) { return; }

  play_state = create_play_state(song);

  check_queue_more();
}

function reset_state_to_measure(song, measure_i, already_queued_t, state) {
  state.t = song_time_at_measure_start(song, measure_i);
  state.tempo = song.default_tempo;
  state.t0currentTime = context.currentTime - (state.t - already_queued_t) / 44100;
}

function song_time_at_measure_start(song, measure_i) {
  var t = 0;
  for (var i = 0; i < song.measure_reference.length; i++) {
    var measure = song.measure[song.measure_reference[i]];
    if (i == measure_i) {
      return t;
    }
    t += 44100 * 60.0 * measure.beats / state.tempo;
  }
  return t;
}

function check_queue_more() {
  if (!play_state.playing) {
    return;
  }

  var queued_through_sec = play_state.t0currentTime + play_state.t / 44100;
  var add_time_samples = Math.round((context.currentTime + 0.200 - queued_through_sec) * 44100);

  queue_more(song, add_time_samples, play_state);
  setTimeout(check_queue_more, 100);
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
    var measure_end_t = measure_t + 44100 * 60.0 * measure.beats / state.tempo;
    queue_measure(measure, measure_t, measure_end_t, t0, t1, state);
    measure_t = measure_end_t;

    // Check for looping.
    if (state.loop_measure0 >= 0) {
      if (i == state.loop_measure0 + state.loop_length - 1 &&
	  t1 >= measure_end_t) {
	// Loop now!
	var remaining_t = t1 - measure_end_t;
	var already_queued_t = measure_end_t - t0;
	reset_state_to_measure(song, state.loop_measure0, already_queued_t, state);
	// Finish queueing any remaining time.
	if (remaining_t > 0) {
	  queue_more(song, remaining_t, state);
	}
	return;
      }
    }
  }
  state.t = t1;
  update_timeline_view();
}

function queue_measure(measure, measure_t, measure_end_t, t0, t1, state) {
  if (t1 < measure_t || t0 >= measure_end_t) {
    return;
  }

  for (var i = 0; i < measure.note.length; i++) {
    var n = measure.note[i];
    if (n.t >= measure.beats * 4096) {
      console.log("bad note time", n.t, measure.beats * 4096);
      continue;
    }

    var note_t = Math.round(n.t / 4096 * 60.0 / state.tempo * 44100);
    var abs_note_t = measure_t + note_t;
    if (abs_note_t >= t0 && abs_note_t < t1) {
      // Queue it.
      play(n.i, n.v, state.t0currentTime + abs_note_t / 44100);
    }
  }
}

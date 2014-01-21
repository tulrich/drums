// play.js

function create_play_state(song) {
  return {
    "playing": true,
    "pause_time": 0,
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
  play_state.pause_time = context.currentTime;
}

function unpause() {
  if (!play_state) { return; }
  if (!play_state.playing) {
    play_state.playing = true;
    var jump_time = context.currentTime - play_state.pause_time;
    play_state.t0currentTime += jump_time;
    check_queue_more();
  }
}

function start_song(song) {
  if (!song) { return; }

  play_state = create_play_state(song);

  check_queue_more();
}

function loop_adjust(left_right, expand_shrink) {
  if (!song) { return; }
  if (!play_state) {
    play_state = create_play_state(song);
    stop_song();
  }

  if (play_state.loop_measure0 == -1) {
    if (expand_shrink > 0) {
      // No existing loop -- make a 1-measure loop, at the current
      // measure.
      play_state.loop_measure0 =
	  Math.floor(get_song_measure_position(song, play_state.t));
      play_state.loop_length = 1;
    }
  } else {
    // Adjust the existing loop.
    var m0 = play_state.loop_measure0;
    var m1 = play_state.loop_measure0 + play_state.loop_length;
    var nm = song.measure_reference.length;
    if (left_right == -1) {
      m0 -= expand_shrink;
    } else {
      m1 += expand_shrink;
    }
    m0 = Math.max(0, Math.min(m0, nm));
    m1 = Math.max(0, Math.min(m1, nm));
    if (m0 >= m1) {
      // Disable the loop.
      play_state.loop_measure0 = -1;
      play_state.loop_length = 0;
    } else {
      play_state.loop_measure0 = m0;
      play_state.loop_length = m1 - m0;

      // Force the play state into the loop.
      var m = get_song_measure_position(song, play_state.t);
      if (m < m0 || m >= m1) {
        m = Math.min(m0, Math.max(m, m1 - 1));
        reset_state_to_measure(song, m, play_state);
      }
    }
  }

  update_timeline_view();
}

function reset_state_to_measure(song, measure_i, state) {
  var t0 = state.t;
  state.t = song_time_at_measure_start(song, measure_i, state);
  state.tempo = song.default_tempo;
  if (state.playing) {
    var dt = state.t - t0;
    state.t0currentTime -= dt / 44100;
  }
}

function song_time_at_measure_start(song, measure_i, state) {
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

function nav_to_measure(song, measure_i) {
  if (!song) { return; }
  if (!play_state) {
    play_state = create_play_state(song);
    stop_song();
  }
  measure_i = Math.max(0, measure_i);
  measure_i = Math.min(measure_i, song.measure_reference.length - 1);
  var m = get_song_measure_position(song, play_state.t);
  if (measure_i != Math.floor(m)) {
    reset_state_to_measure(song, measure_i, play_state);
  }
}

function change_tempo(state, song, new_tempo) {
  if (state) {
    var t0 = state.t;
    var p0 = get_song_measure_position(song, state.t);
    state.tempo = new_tempo;
    var measure_i = Math.floor(p0);
    var frac = p0 - measure_i;
    var new_time = song_time_at_measure_start(song, measure_i, state);
    var beats = song.measure[song.measure_reference[measure_i]].beats;
    new_time += frac * beats * 44100 * 60.0 / state.tempo;

    console.log(t0, p0, new_tempo, measure_i, frac, new_time, beats);//xxxxx
    state.t = new_time;

    // fix t0currentTime
    var dt = state.t - t0;
    state.t0currentTime -= dt / 44100;
  }
  song.default_tempo = new_tempo;
}

function check_queue_more() {
  if (!play_state || !play_state.playing) {
    return;
  }

  var queued_through_sec = play_state.t0currentTime + play_state.t / 44100;
  var add_time_samples = Math.round((context.currentTime + 0.200 - queued_through_sec) * 44100);
  if (add_time_samples > 0) {
    queue_more(song, add_time_samples, play_state);
  }
  setTimeout(check_queue_more, 100);
}

function queue_more(song, dt, state) {
  var t0 = state.t;
  var t1 = t0 + dt;
  var measure_t = 0;
  var loop_measure0_t = 0;
  for (var i = 0; i < song.measure_reference.length && measure_t < t1; i++) {
    var measure_id = song.measure_reference[i];
    if (measure_id < 0 || measure_id >= song.measure.length) {
      console.log("bad measure_id at i", measure_id, i);
    }
    var measure = song.measure[measure_id];
    var measure_end_t = measure_t + 44100 * 60.0 * measure.beats / state.tempo;
    queue_measure(measure, measure_t, measure_end_t, t0, t1, state);

    // Check for looping.
    if (state.loop_measure0 >= 0) {
      if (i == state.loop_measure0) {
	loop_measure0_t = measure_t;
      }
      if (i == state.loop_measure0 + state.loop_length - 1 &&
	  t1 >= measure_end_t) {
	// Loop now!
	var remaining_t = t1 - measure_end_t;
	state.t = measure_end_t;
	reset_state_to_measure(song, state.loop_measure0, state);
	// Finish queueing any remaining time.
	if (remaining_t > 0) {
	  queue_more(song, remaining_t, state);
	}
	return;
      }
    }

    measure_t = measure_end_t;
  }
  // Song finished?
  if (i == song.measure_reference.length && t1 >= measure_t) {
    play_state = null;
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

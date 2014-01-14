// timeline.js

var MEASURE_WIDTH = 300;
var MEASURE_HEIGHT = 142;
var FOCUS_X0 = -250;
var FOCUS_Y0 = 56;
var timeline_context;
var timeline_overlay_context;
var last_measure0 = -1;
var last_loop_measure0 = -1;
var last_loop_length = 0;
var measure_position = 0;

function init_timeline() {
  var canvas = document.getElementById("timeline_canvas");
  timeline_context = canvas.getContext("2d");
  timeline_context.imageSmoothingEnabled = false;

  var overlay_canvas = document.getElementById("timeline_overlay_canvas");
  timeline_overlay_context = overlay_canvas.getContext("2d");

  update_timeline_view();
}

function update_measure_position() {
  if (!play_state || !song) {
    measure_position = 0;
    return;
  }
  measure_position = get_song_measure_position(song, play_state.t);
}

function update_timeline_view() {
  update_measure_position();
  var measure0 = Math.floor(measure_position);
  if (measure0 != last_measure0 ||
      (play_state &&
	  (play_state.loop_measure0 != last_loop_measure0 ||
	   play_state.loop_length != last_loop_length))) {
    measure0 = last_measure0;
    if (play_state) {
      last_loop_measure0 = play_state.loop_measure0;
      last_loop_length = play_state.loop_length;
    }
    show_song();
  }
  show_overlay();
}

var STRIP_MEASURE_HEIGHT = 50;
var STRIP_MEASURE_WIDTH = 50;

function show_song() {
  if (!song) return;
  var ctx = timeline_context;
  ctx.fillStyle = "#ccc";
  ctx.fillRect(0, 0, 400, 200);
  var measure0 = Math.floor(measure_position);
  var loop_measure0 = -1;
  var loop_length = 0;
  if (play_state) {
    loop_measure0 = play_state.loop_measure0;
    loop_length = play_state.loop_length;
  }

  // Strip view.
  show_measure_strip(ctx, -STRIP_MEASURE_WIDTH/2, 2,
		     STRIP_MEASURE_WIDTH, STRIP_MEASURE_HEIGHT,
		     measure0, loop_measure0, loop_length);

  // Focused view.
  show_measure_strip(ctx, FOCUS_X0, FOCUS_Y0, MEASURE_WIDTH, MEASURE_HEIGHT,
		     measure0, loop_measure0, loop_length);
}

// Start or end bar.
function show_bar(ctx, x, y, height) {
  ctx.strokeStyle = "#000";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + height);
  ctx.moveTo(x + 1, y);
  ctx.lineTo(x + 1, y + height);
  ctx.stroke();
}

function show_measure_strip(ctx, x0, y0, mwidth, mheight,
			    measure0, loop_measure0, loop_length) {
  for (var i = 0; i < 100; i++) {
    var mi = measure0 - 1 + i;
    if (mi >= song.measure_reference.length) {
      // Show end bar.
      show_bar(ctx, x0 + i * mwidth, y0, mheight);
      break;
    } else if (mi == 0) {
      show_bar(ctx, x0 + i * mwidth - 2, y0, mheight);
    }
    if (mi >= 0) {
      if (loop_measure0 > -1 &&
          mi >= loop_measure0 && mi < loop_measure0 + loop_length) {
        // Green background behind loop measure.
        ctx.fillStyle = "#dfd";
      } else {
	ctx.fillStyle = "#fff";
      }
      ctx.fillRect(x0 + i * mwidth, y0, mwidth, mheight);

      var measure = song.measure[song.measure_reference[mi]];
      show_measure(measure, ctx, x0 + i * mwidth, y0, mwidth, mheight);
    }
  }
}

function adjust_notes(inst, ticks, modifier, nav_x, nav_y) {
  var freq = 1 << (NOTES_NAV_Y - 1 - nav_y);
  var phase = nav_x;
  var phase_wrapped = (phase & ((1 << nav_y) - 1));

  var x = phase_wrapped;
  var interval = 16 / freq;

  var measure0 = Math.floor(measure_position);
  if (measure0 >= song.measure_reference.length) {
    return;  // no-op
  }

  var mi = song.measure_reference[measure0];
  var measure = song.measure[mi];

  for (var i = 0; i < freq; i++) {
    adjust_note(ticks, modifier, measure, inst, x * 1024);
    x += interval;
  }
  if (measure.viewdata) {
    measure.viewdata.dirty = true;
  }
  show_song();
}

function toggle_notes(inst, nav_x, nav_y) {
  var freq = 1 << (NOTES_NAV_Y - 1 - nav_y);
  var phase = nav_x;
  var phase_wrapped = (phase & ((1 << nav_y) - 1));

  var x = phase_wrapped;
  var interval = 16 / freq;

  var measure0 = Math.floor(measure_position);
  if (measure0 >= song.measure_reference.length) {
    return;  // no-op
  }

  var mi = song.measure_reference[measure0];
  var measure = song.measure[mi];

  var on_or_off = undefined;
  for (var i = 0; i < freq; i++) {
    on_or_off = toggle_note(on_or_off, measure, inst, x * 1024);
    x += interval;
  }
  if (measure.viewdata) {
    measure.viewdata.dirty = true;
  }
  show_song();
}

function toggle_note(on_or_off, measure, inst, t) {
  // Existing note?
  var new_note = null;
  for (var i = 0; i < measure.note.length; i++) {
    var n = measure.note[i];
    if (n.i == inst && n.t >= t - 512 && n.t < t + 512) {
      // Match!
      if (!on_or_off) {
	// Erase this note.
	measure.note.splice(i, 1);
	return false;
      } else {
	// Modify this note.
	n.t = t;
	n.v = 255;
	sort_notes_by_t(measure);
	return true;
      }
    }
  }
  if (on_or_off === undefined) {
    on_or_off = true;
  }

  if (on_or_off) {
    measure.note.push({
      "i": inst,
      "t": t,
      "v": 255
    });
    sort_notes_by_t(measure);
  }
  return on_or_off;
}

function adjust_note(ticks, modifier, measure, inst, t) {
  // Adjust existing notes.
  for (var i = 0; i < measure.note.length; i++) {
    var n = measure.note[i];
    if (n.i == inst && n.t >= t - 512 && n.t < t + 512) {
      // Match!

      // Modify this note.
      if (!modifier) {
	// Change the velocity.
	n.v = Math.max(15, Math.min(n.v + 16 * ticks, 255));
      } else {
	// Change the timing.
	n.t = Math.max(0, Math.min(n.t + 16 * ticks, measure.beats * 4096 - 1));
      }
      return true;
    }
  }
  return false;
}

function sort_notes_by_t(measure) {
  measure.note.sort(function(a, b) { if (a.t < b.t) return -1; else if (a.t > b.t) return 1; else return 0; });
}

function show_overlay() {
  update_measure_position();
  var ctx = timeline_overlay_context;
  ctx.clearRect(0, 0, 800, 200);
  var measure0 = Math.floor(measure_position);
  var f = measure_position - measure0;
  var x0 = FOCUS_X0 + 1 * MEASURE_WIDTH - 0.5;

  // Time cursor.
  ctx.beginPath();
  ctx.strokeStyle = "#000";  // xxxx dashed";
  var x = x0 + f * MEASURE_WIDTH;
  ctx.moveTo(x, FOCUS_Y0);
  ctx.lineTo(x, FOCUS_Y0 + MEASURE_HEIGHT);
  ctx.stroke();

  // Highlight selected notes.
  if (nav_y < NOTES_NAV_Y) {
    // The little tick for the horizontal position.
    ctx.beginPath();
    ctx.strokeStyle = "#00f";
    ctx.moveTo((MEASURE_WIDTH / 16) * nav_x + x0, FOCUS_Y0 - 2.5);
    ctx.lineTo((MEASURE_WIDTH / 16) * nav_x + x0 + 7, FOCUS_Y0 - 2.5);
    ctx.stroke();

    // The boxes around the selected notes.
    var freq = 1 << (NOTES_NAV_Y - 1 - nav_y);
    var phase = nav_x;
    var phase_wrapped = (phase & ((1 << nav_y) - 1));

    var x = (MEASURE_WIDTH / 16) * phase_wrapped + x0;
    var interval = MEASURE_WIDTH / freq;
    ctx.strokeStyle = "#00f";
    for (var i = 0; i < freq; i++) {
      ctx.beginPath();
      ctx.strokeRect(x, FOCUS_Y0, 7, MEASURE_HEIGHT);
      ctx.stroke();
      x += interval;
    }
  }

  // Highlight last instrument.
  ctx.strokeStyle = "#00f";
  ctx.beginPath();
  var y = FOCUS_Y0 + last_instrument * MEASURE_HEIGHT / INSTRUMENT_ROWS;
  var dy = MEASURE_HEIGHT / INSTRUMENT_ROWS;
  ctx.strokeRect(x0 - 1.5, y, MEASURE_WIDTH + 1.5, dy);
  ctx.stroke();
}

function show_measure(measure, ctx, x, y, w, h) {
  update_measure_view(measure);
  if (Math.abs(w - STRIP_MEASURE_WIDTH) < 10) {
    ctx.drawImage(measure.viewdata.canvas_small, x, y, w, h);
  } else {
    ctx.drawImage(measure.viewdata.canvas_large, x, y, w, h);
  }

  // Beat lines.
  var beat_width = w / measure.beats;
  ctx.strokeStyle = "#999";
  for (var i = 0; i < measure.beats; i++) {
    var lx = x + beat_width * i + 0.5;
    if (lx < x + w) {
      ctx.beginPath();
      ctx.moveTo(lx, y + 0.5);
      ctx.lineTo(lx, y + h - 0.5);
      ctx.stroke();
    }
    if (i == 0) {
      ctx.strokeStyle = "#ddd";
    }
  }

  // Top & bottom lines.
  ctx.strokeStyle = "#ddd";
  ctx.beginPath();
  ctx.moveTo(x, y + 0.5);
  ctx.lineTo(x + w, y + 0.5);
  ctx.moveTo(x, y + h - 0.5);
  ctx.lineTo(x + w, y + h - 0.5);
  ctx.stroke();
}

var INSTRUMENT_ROWS = 13;
var MEASURE_CANVAS_WIDTH = 32 * 8;
var MEASURE_CANVAS_HEIGHT = 10 * INSTRUMENT_ROWS;
var MEASURE_VERTICAL_STEP = 10;
var MEASURE_NOTE_WIDTH = 3.0;

function update_measure_view(measure) {
  if (!measure.viewdata) {
    measure.viewdata = {
      "canvas_small": document.createElement("canvas"),
      "canvas_large": document.createElement("canvas"),
      "dirty": true,
    };
    //measure.viewdata.canvas_small.imageSmoothingEnabled = false;
    measure.viewdata.canvas_small.width = STRIP_MEASURE_WIDTH;
    measure.viewdata.canvas_small.height = STRIP_MEASURE_HEIGHT;
    measure.viewdata.ctx_small = measure.viewdata.canvas_small.getContext("2d");

    //measure.viewdata.canvas_large.imageSmoothingEnabled = false;
    measure.viewdata.canvas_large.width = MEASURE_WIDTH;
    measure.viewdata.canvas_large.height = MEASURE_HEIGHT;
    measure.viewdata.ctx_large = measure.viewdata.canvas_large.getContext("2d");
  }

  if (!measure.viewdata.dirty) {
    return;
  }

  var func = function(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);

    var vertical_step = height / 13;
    var note_width = width / 60;
    if (width < 100) {
      // Fatter notes when displayed smaller.
      note_width = width / 35;
    }

    // Notes.
    var measure_ticks = 4096 * measure.beats;
    for (var i = 0; i < measure.note.length; i++) {
      var n = measure.note[i];
      var x = width * n.t / measure_ticks;
      var y = vertical_step * n.i;
      // TODO adjust width and color
      ctx.fillStyle = "#f0f";
      var note_height = (vertical_step - 1) * n.v / 255.0;
      ctx.fillRect(x, y, note_width, note_height);
    }
  };
  // Draw...
  func(measure.viewdata.ctx_small, STRIP_MEASURE_WIDTH, STRIP_MEASURE_HEIGHT);
  func(measure.viewdata.ctx_large, MEASURE_WIDTH, MEASURE_HEIGHT);
}

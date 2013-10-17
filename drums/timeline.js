// timeline.js

var MEASURE_WIDTH = 200;
var MEASURE_HEIGHT = 200;
var timeline_context;
var timeline_overlay_context;
var last_measure0 = -1;
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
  if (measure0 != last_measure0) {
    measure0 = last_measure0;
    show_song();
  }
  show_overlay();
}

function show_song() {
  if (!song) return;
  timeline_context.clearRect(0, 0, 800, 200);
  var x0 = -MEASURE_WIDTH / 2;
  var measure0 = Math.floor(measure_position);
  for (var i = 0; i < 5; i++) {
    var mi = measure0 - 1 + i;
    if (mi >= 0 && mi < song.measure_reference.length) {
      var measure = song.measure[song.measure_reference[mi]];
      show_measure(measure, timeline_context,
		   x0 + i * MEASURE_WIDTH, 0, MEASURE_WIDTH, MEASURE_HEIGHT);
    }
  }
}

function adjust_notes(ticks, nav_x, nav_y) {
}

function toggle_notes(inst, nav_x, nav_y) {
  var freq = 1 << (NOTES_NAV_Y - 1 - nav_y);
  var phase = nav_x;
  var phase_wrapped = (phase & ((1 << nav_y) - 1));

  var x = phase_wrapped;
  var interval = 8 / freq;

  var measure0 = Math.floor(measure_position);
  if (measure0 >= song.measure_reference.length) {
    return;  // no-op
  }

  var mi = song.measure_reference[measure0];
  var measure = song.measure[mi];

  var on_or_off = undefined;
  for (var i = 0; i < freq; i++) {
    on_or_off = toggle_note(on_or_off, measure, inst, x * 2048);
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
    if (n.i == inst && n.t >= t - 1024 && n.t < t + 1024) {
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

function sort_notes_by_t(measure) {
  measure.note.sort(function(a, b) { if (a.t < b.t) return -1; else if (a.t > b.t) return 1; else return 0; });
}

function show_overlay() {
  update_measure_position();
  var ctx = timeline_overlay_context;
  ctx.clearRect(0, 0, 800, 200);
  var measure0 = Math.floor(measure_position);
  var f = measure_position - measure0;
  var x0 = -MEASURE_WIDTH / 2 + 1 * MEASURE_WIDTH - 0.5;

  // Blue measure box.
//  ctx.beginPath();
//  ctx.strokeStyle = "#00f";
//  ctx.strokeRect(x0, 0.5, MEASURE_WIDTH, MEASURE_HEIGHT - 0.5);
//  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = "#000";  // xxxx dashed";
  var x = x0 + f * MEASURE_WIDTH;
  ctx.moveTo(x, 0);
  ctx.lineTo(x, MEASURE_HEIGHT);
  ctx.stroke();

  // Highlight relevant notes.
  if (nav_y < NOTES_NAV_Y) {
    var freq = 1 << (NOTES_NAV_Y - 1 - nav_y);
    var phase = nav_x;
    var phase_wrapped = (phase & ((1 << nav_y) - 1));

    var x = (MEASURE_WIDTH / 8) * phase_wrapped + x0;
    var interval = MEASURE_WIDTH / freq;
    ctx.strokeStyle = "#00f";
    for (var i = 0; i < freq; i++) {
      ctx.beginPath();
      ctx.strokeRect(x, 0, 7, MEASURE_HEIGHT);
      ctx.stroke();
      x += interval;
    }
  }
}

function show_measure(measure, context, x, y, w, h) {
  update_measure_view(measure);
  context.drawImage(measure.viewdata.canvas, x, y, w, h);
}

var MEASURE_CANVAS_WIDTH = 12 * 8;
var MEASURE_CANVAS_HEIGHT = 3 * 13;
var MEASURE_VERTICAL_STEP = 3;

function update_measure_view(measure) {
  if (!measure.viewdata) {
    measure.viewdata = {
      "canvas": document.createElement("canvas"),
      "dirty": true,
    };
    measure.viewdata.canvas.imageSmoothingEnabled = false;
    measure.viewdata.canvas.width = MEASURE_CANVAS_WIDTH;
    measure.viewdata.canvas.height = MEASURE_CANVAS_HEIGHT;
    measure.viewdata.ctx = measure.viewdata.canvas.getContext("2d");
  }

  if (!measure.viewdata.dirty) {
    return;
  }

  // Draw...
  var beat_width = 12 * 8 / measure.beats;

  // Beat lines.
  var ctx = measure.viewdata.ctx;
  ctx.clearRect(0, 0, MEASURE_CANVAS_WIDTH, MEASURE_CANVAS_HEIGHT);
  ctx.strokeStyle = "#999";
  for (var i = 0; i < measure.beats; i++) {
    ctx.beginPath();
    ctx.moveTo(beat_width * i + 0.5, 0.5);
    ctx.lineTo(beat_width * i + 0.5, MEASURE_CANVAS_HEIGHT + 0.5);
    ctx.stroke();
    if (i == 0) {
      ctx.strokeStyle = "#ddd";
    }
  }

  // Notes.
  var measure_ticks = 4096 * measure.beats;
  for (var i = 0; i < measure.note.length; i++) {
    var n = measure.note[i];
    var x = MEASURE_CANVAS_WIDTH * n.t / measure_ticks;
    var y = MEASURE_VERTICAL_STEP * n.i;
    // TODO adjust width and color
    ctx.fillStyle = "#f0f";
    var width = 2;
    var height = 2;
    ctx.fillRect(x, y, width, height);
  }
}

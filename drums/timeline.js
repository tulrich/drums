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

function show_overlay() {
  update_measure_position();
  timeline_overlay_context.clearRect(0, 0, 800, 200);
  var measure0 = Math.floor(measure_position);
  var f = measure_position - measure0;
  var x0 = -MEASURE_WIDTH / 2 + 1 * MEASURE_WIDTH - 0.5;

  timeline_overlay_context.beginPath();
  timeline_overlay_context.strokeStyle = "#00f";
  timeline_overlay_context.strokeRect(x0, 0.5, MEASURE_WIDTH, MEASURE_HEIGHT - 0.5);
  timeline_overlay_context.stroke();

  timeline_overlay_context.beginPath();
  timeline_overlay_context.strokeStyle = "#000";  // xxxx dashed";
  var x = x0 + f * MEASURE_WIDTH;
  timeline_overlay_context.moveTo(x, 0);
  timeline_overlay_context.lineTo(x, MEASURE_HEIGHT);
  timeline_overlay_context.stroke();
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

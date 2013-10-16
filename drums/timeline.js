// timeline.js

var timeline_context;
var timeline_overlay_context;
var measure0 = 0;

function init_timeline() {
  var canvas = document.getElementById("timeline_canvas");
  timeline_context = canvas.getContext("2d");
  timeline_context.imageSmoothingEnabled = false;

  var overlay_canvas = document.getElementById("timeline_overlay_canvas");
  timeline_overlay_context = overlay_canvas.getContext("2d");

  // Initial song view.
  for (var i = 0; i < 4; i++) {
    var mi = measure0 + i;
    if (mi < song.measure.length) {
      show_measure(song.measure[mi], timeline_context, i * 400, 0, 400, 200);
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
  ctx.strokeStyle = "#888";
  for (var i = 0; i < measure.beats; i++) {
    ctx.moveTo(beat_width * i + 0.5, 0.5);
    ctx.lineTo(beat_width * i + 0.5, MEASURE_CANVAS_HEIGHT + 0.5);
    if (i == 0) {
      ctx.strokeStyle = "#ddd";
    }
  }
  ctx.stroke();

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

// play.js


function queue_song(song) {
  if (!song) { return; }

  var state = {
    "t": 1024,
    "tempo": song.default_tempo
  };

  for (var i = 0; i < song.section.length; i++) {
    queue_section(song.section[i], state);
  }
}


function queue_section(section, state) {
  for (var i = 0; i < section.measure.length; i++) {
    var m = section.measure[i];
    if (m >= song.measure.length || m < 0) {
      console.log("bad measure id", m, song.measure.length);
    } else {
      queue_measure(song.measure[section.measure[i]], state);
    }
  }
}


function queue_measure(measure, state) {
  var time_increment = measure.beats * 4096;

  for (var i = 0; i < measure.note.length; i++) {
    var n = measure.note[i];
    if (n.t >= time_increment) {
      console.log("bad note time", n.t, time_increment);
    } else {
      var t = (state.t + n.t) * 60.0 / (4096 * state.tempo);
      play(n.i, n.v, t);
      console.log(kit[n.i], t, state.t, n.t, state.tempo);//xxxxxxx
    }
  }

  state.t += measure.beats * 4096;
}

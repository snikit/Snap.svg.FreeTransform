var s = Snap('#svgout');

const DIV_ID = 'svgout';

var bigCircle = s
  .polygon(50, 50, 70, 290, 500, 100)
  .attr({ fill: 'red', stroke: 'blue' });

var move = function(dx, dy) {
  this.attr({
    transform:
      this.data('origTransform') +
      (this.data('origTransform') ? 'T' : 't') +
      [dx, dy]
  });
};

var start = function() {
  this.data('origTransform', this.transform().local);
};
var stop = function() {
  console.log('finished dragging');
};

// bigCircle.drag(move, start, stop);

let num = 5;

var ft = s.freeTransform(
  bigCircle,
  {
    snap: { rotate: 2 },
    scale: ['axisX', 'axisY', 'bboxCorners']
  },
  function(data, events) {
    // console.log(data);
    console.log(events);
  }
);

// ft.attrs.rotate = 45;
// ft.attrs.scale.x = 1;
ft.apply();

// bigCircle.data('ftStatus', 1);

// mouse click events handling
bigCircle.click(function() {
  // ft.hideHandles();
  ft.showHandles();
});

s.click(function(e) {
  if (e.srcElement.id && e.srcElement.id == DIV_ID) {
    ft.hideHandles();
  }
});

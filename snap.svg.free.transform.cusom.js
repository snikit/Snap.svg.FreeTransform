'use strict';

Snap.plugin(function(Snap, Element, Paper, global, Fragment) {
  Element.prototype.show = function() {
    this.attr('display', '');
  };

  Element.prototype.hide = function() {
    this.attr('display', 'none');
  };

  Paper.prototype.freeTransform = function(subject, options, callback) {
    // Enable method chaining. tag3
    if (subject.freeTransform) {
      return subject.freeTransform;
    }

    // Add Array.map if the browser doesn't support it.
    if (!Array.prototype.hasOwnProperty('map')) {
      Array.prototype.map = function(callback, arg) {
        var i,
          mapped = [];
        for (i in this) {
          if (this.hasOwnProperty(i)) {
            mapped[i] = callback.call(arg, this[i], i, this);
          }
          return mapped;
        }
      };
    }

    // Add Array.indexOf if not builtin.
    if (!Array.prototype.hasOwnProperty('indexOf')) {
      Array.prototype.indexOf = function(obj, start) {
        for (var i = start || 0, j = this.length; i < j; i++) {
          if (this[i] === obj) {
            return i;
          }
        }
        return -1;
      };
    }

    var paper = this,
      bbox = subject.getBBox(true);

    var ft = (subject.freeTransform = {
      // Keep track of transformations.
      attrs: {
        x: bbox.x,
        y: bbox.y,
        size: {
          x: bbox.width,
          y: bbox.height
        },
        center: {
          x: bbox.x + bbox.width / 2,
          y: bbox.y + bbox.height / 2
        },
        rotate: 0,
        scale: {
          x: 1,
          y: 1
        },
        translate: {
          x: 0,
          y: 0
        },
        ratio: 1
      },
      axes: null,
      bbox: null,
      callback: null,
      items: [],
      handles: {
        center: null,
        x: null,
        y: null
      },
      offset: {
        rotate: 0,
        scale: {
          x: 1,
          y: 1
        },
        translate: {
          x: 0,
          y: 0
        }
      },
      opts: {
        attrs: {
          fill: '#fff',
          stroke: '#1e609d'
        },
        distance: 1.2,
        drag: true,
        draw: ['bbox'],
        keepRatio: false,
        range: {
          rotate: [-180, 180],
          scale: [-99999, 99999]
        },
        rotate: true,
        scale: true,
        snap: {
          rotate: 0,
          scale: 0,
          drag: 0
        },
        snapDist: {
          rotate: 0,
          scale: 0,
          drag: 7
        },
        size: 4
      },
      subject: subject
    });

    /**
     * Update handles based on the element's transformations.
     */
    ft.updateHandles = function() {
      if (ft.handles.bbox || ft.opts.rotate.indexOf('self') >= 0) {
        var corners = getBBox();
      }

      // Get the element's rotation.
      var rad = {
        x: Snap.rad(ft.attrs.rotate),
        y: Snap.rad(ft.attrs.rotate + 90)
      };

      var radius = {
        x: (ft.attrs.size.x / 2) * ft.attrs.scale.x,
        y: (ft.attrs.size.y / 2) * ft.attrs.scale.y
      };

      // If the rotation is disabled, hide the handle.
      if (ft.opts.rotate.length) {
        ft.axes.map(function(axis) {
          if (!ft.handles[axis]) {
            return;
          }
          var cx =
              ft.attrs.center.x +
              ft.attrs.translate.x +
              (radius[axis] + 25) * Math.cos(rad[axis]),
            cy =
              ft.attrs.center.y +
              ft.attrs.translate.y +
              (radius[axis] + 25) * Math.sin(rad[axis]);

          ft.handles[axis].disc.attr({
            cx: cx,
            cy: cy
          });

          var end_x =
              ft.attrs.center.x +
              ft.attrs.translate.x +
              radius[axis] * Math.cos(rad[axis]),
            end_y =
              ft.attrs.center.y +
              ft.attrs.translate.y +
              radius[axis] * Math.sin(rad[axis]);

          ft.handles[axis].line.attr({
            path: [['M', end_x, end_y], ['L', cx, cy]]
          });
        });
      }

      if (ft.bbox) {
        ft.bbox.attr({
          path: [
            ['M', corners[0].x, corners[0].y],
            ['L', corners[1].x, corners[1].y],
            ['L', corners[2].x, corners[2].y],
            ['L', corners[3].x, corners[3].y],
            ['L', corners[0].x, corners[0].y]
          ]
        });

        // Allowed x, y scaling directions for bbox handles.
        var bboxHandleDirection = [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0]
        ];

        if (ft.handles.bbox) {
          let addTextTipsFlag = true;

          ft.handles.bbox.map(function(handle, i) {
            var cx, cy, j, k;

            if (handle.isCorner) {
              cx = corners[i].x;
              cy = corners[i].y;
            } else {
              j = i % 4;
              k = (j + 1) % corners.length;
              cx = (corners[j].x + corners[k].x) / 2;
              cy = (corners[j].y + corners[k].y) / 2;
            }

            handle.element.attr({
              x:
                cx -
                (handle.isCorner
                  ? ft.opts.size.bboxCorners
                  : ft.opts.size.bboxSides),
              y:
                cy -
                (handle.isCorner
                  ? ft.opts.size.bboxCorners
                  : ft.opts.size.bboxSides),
              transform: 'R' + ft.attrs.rotate
            });
            handle.x = bboxHandleDirection[i][0];
            handle.y = bboxHandleDirection[i][1];

            // handling textTips dragging and scaling
            if (addTextTipsFlag) {
              addTextTipsFlag = !addTextTipsFlag;

              let length = 0;
              let width = 0;

              ft.textTips[0].attr({
                x:
                  (length = distanceBtwPoints(
                    corners[0].x,
                    corners[0].y,
                    corners[1].x,
                    corners[1].y
                  )) / 2
              });
              ft.textTips[0].textPath.node.innerHTML = length + '"';

              ft.textTips[1].attr({
                x:
                  2 * length +
                  1.5 *
                    (width = distanceBtwPoints(
                      corners[1].x,
                      corners[1].y,
                      corners[2].x,
                      corners[2].y
                    ))
              });

              ft.textTips[1].textPath.node.innerHTML = width + '"';
            }
          });
        }
      }

      if (ft.circle) {
        ft.circle.attr({
          cx: ft.attrs.center.x + ft.attrs.translate.x,
          cy: ft.attrs.center.y + ft.attrs.translate.y,
          r: Math.max(radius.x, radius.y) * ft.opts.distance
        });
      }

      if (ft.handles.center) {
        ft.handles.center.disc.attr({
          cx: ft.attrs.center.x + ft.attrs.translate.x,
          cy: ft.attrs.center.y + ft.attrs.translate.y
        });
      }

      return ft;
    };

    /**
     * Add handles.
     */
    ft.showHandles = function() {
      ft.hideHandles();

      ft.axes.map(function(axis) {
        ft.handles[axis] = {};
        ft.textTips = [];

        ft.handles[axis].line = paper
          .path([
            ['M', ft.attrs.center.x + ft.attrs.size.x / 2, ft.attrs.center.y]
          ])
          .attr({
            stroke: ft.opts.attrs.stroke,
            // 'stroke-dasharray': '4,3',
            opacity: 0.5
          });

        ft.handles[axis].disc = paper
          .circle(ft.attrs.center.x, ft.attrs.center.y, ft.opts.size.axes)
          .attr(ft.opts.attrs)
          .attr('cursor', 'crosshair');

        // If the rotation is disabled, hide the handle.
        if (!ft.opts.rotate.length) {
          ft.handles[axis].disc.hide();
        }
      });

      if (ft.opts.draw.indexOf('bbox') >= 0) {
        ft.bbox = paper.path('').attr({
          stroke: ft.opts.attrs.stroke,
          //   'stroke-dasharray': '4,3',
          fill: 'none',
          opacity: 0.5
        });

        // since we want it in .5 * length of x axis
        ft.textTips.push(
          paper.text(0, 0, ft.attrs.size.x + '"').attr({
            textpath: ft.bbox,
            transform: 'T 0 -3'
          })
        );

        // path will 2 * length of x axis + 1.5 length of y axis
        ft.textTips.push(
          paper.text(0, 0, ft.attrs.size.y + '"').attr({
            textpath: ft.bbox,
            transform: 'T -3'
          })
        );

        ft.handles.bbox = [];

        addDeleteButton(
          {
            axis: 'x',
            isCorner: true
          },
          ft,
          paper,
          1
        );
        fixCorners(
          {
            axis: 'y',
            isCorner: true
          },
          ft,
          paper,
          2
        );
        fixCorners(
          {
            axis: 'x',
            isCorner: true
          },
          ft,
          paper,
          3
        );

        // # fixing cornres for ICOVIA
        // var i, handle, cursor;
        // for (
        //   i = ft.opts.scale.indexOf('bboxCorners') >= 0 ? 0 : 4;
        //   i < (ft.opts.scale.indexOf('bboxSides') === -1 ? 4 : 8);
        //   i++
        // ) {
        //   handle = {
        //     axis: i % 2 ? 'x' : 'y',
        //     isCorner: i < 4
        //   };

        //   if (!handle.isCorner) {
        //     cursor = handle.axis == 'x' ? 'e-resize' : 'n-resize';
        //   } else {
        //     cursor = handle.axis == 'x' ? 'sw-resize' : 'nw-resize';
        //   }

        //   handle.element = paper
        //     .rect(
        //       ft.attrs.center.x,
        //       ft.attrs.center.y,
        //       ft.opts.size[handle.isCorner ? 'bboxCorners' : 'bboxSides'] * 2,
        //       ft.opts.size[handle.isCorner ? 'bboxCorners' : 'bboxSides'] * 2
        //     )
        //     .attr(ft.opts.attrs)
        //     .attr('cursor', cursor);

        //   ft.handles.bbox[i] = handle;
        // }
      }

      if (ft.opts.draw.indexOf('circle') !== -1) {
        ft.circle = paper.circle(0, 0, 0).attr({
          stroke: ft.opts.attrs.stroke,
          'stroke-dasharray': '4,3',
          opacity: 0.3
        });
      }

      if (ft.opts.drag.indexOf('center') !== -1) {
        ft.handles.center = {};

        ft.handles.center.disc = paper
          .circle(ft.attrs.center.x, ft.attrs.center.y, ft.opts.size.center)
          .attr(ft.opts.attrs);
      }

      // Drag x, y handles.
      ft.axes.map(function(axis) {
        if (!ft.handles[axis]) {
          return;
        }

        var rotate = ft.opts.rotate.indexOf('axis' + axis.toUpperCase()) !== -1,
          scale = ft.opts.scale.indexOf('axis' + axis.toUpperCase()) !== -1;

        ft.handles[axis].disc.drag(
          function(dx, dy) {
            var cx = dx + ft.handles[axis].disc.ox,
              cy = dy + ft.handles[axis].disc.oy;

            var mirrored = {
              x: ft.o.scale.x < 0,
              y: ft.o.scale.y < 0
            };

            if (rotate) {
              var rad = Math.atan2(
                cy - ft.o.center.y - ft.o.translate.y,
                cx - ft.o.center.x - ft.o.translate.x
              );

              ft.attrs.rotate = Snap.deg(rad) - (axis === 'y' ? 90 : 0);

              if (mirrored[axis]) {
                ft.attrs.rotate -= 180;
              }
            }

            var radius = Math.sqrt(
              Math.pow(cx - ft.o.center.x - ft.o.translate.x, 2) +
                Math.pow(cy - ft.o.center.y - ft.o.translate.y, 2)
            );

            applyLimits();

            // Maintain aspect ratio.
            if (ft.opts.keepRatio.indexOf('axis' + axis.toUpperCase()) !== -1) {
              keepRatio(axis);
            } else {
              ft.attrs.ratio = ft.attrs.scale.x / ft.attrs.scale.y;
            }

            if (ft.attrs.scale.x && ft.attrs.scale.y) {
              ft.apply();
            }

            asyncCallback([rotate ? 'rotate' : null, scale ? 'scale' : null]);
          },
          function() {
            // Offset values.
            ft.o = cloneObj(ft.attrs);

            ft.handles[axis].disc.ox = parseInt(this.attr('cx'));
            ft.handles[axis].disc.oy = parseInt(this.attr('cy'));

            asyncCallback([
              rotate ? 'rotate start' : null,
              scale ? 'scale start' : null
            ]);
          },
          function() {
            asyncCallback([
              rotate ? 'rotate end' : null,
              scale ? 'scale end' : null
            ]);
          }
        );
      });

      // Drag bbox handles.
      if (
        ft.opts.draw.indexOf('bbox') >= 0 &&
        (ft.opts.scale.indexOf('bboxCorners') !== -1 ||
          ft.opts.scale.indexOf('bboxSides') !== -1)
      ) {
        ft.handles.bbox.map(function(handle) {
          handle.element.drag(
            function(dx, dy) {
              var sin,
                cos,
                rx,
                ry,
                rdx,
                rdy,
                mx,
                my,
                sx,
                sy,
                previous = cloneObj(ft.attrs);

              sin = ft.o.rotate.sin;
              cos = ft.o.rotate.cos;

              // First rotate dx, dy to element alignment.
              rx = dx * cos - dy * sin;
              ry = dx * sin + dy * cos;

              rx *= Math.abs(handle.x);
              ry *= Math.abs(handle.y);

              // And finally rotate back to canvas alignment.
              rdx = rx * cos + ry * sin;
              rdy = rx * -sin + ry * cos;

              ft.attrs.translate = {
                x: ft.o.translate.x + rdx / 2,
                y: ft.o.translate.y + rdy / 2
              };

              // Mouse position, relative to element center after translation.
              mx =
                ft.o.handlePos.cx +
                dx -
                ft.attrs.center.x -
                ft.attrs.translate.x;
              my =
                ft.o.handlePos.cy +
                dy -
                ft.attrs.center.y -
                ft.attrs.translate.y;

              // Position rotated to align with element.
              rx = mx * cos - my * sin;
              ry = mx * sin + my * cos;

              // Maintain aspect ratio.
              if (
                handle.isCorner &&
                ft.opts.keepRatio.indexOf('bboxCorners') !== -1
              ) {
                var ratio =
                    (ft.attrs.size.x * ft.attrs.scale.x) /
                    (ft.attrs.size.y * ft.attrs.scale.y),
                  tdy = rx * handle.x * (1 / ratio),
                  tdx = ry * handle.y * ratio;

                if (tdx > tdy * ratio) {
                  rx = tdx * handle.x;
                } else {
                  ry = tdy * handle.y;
                }
              }

              // Scale element so that handle is at mouse position
              sx = (rx * 2 * handle.x) / ft.o.size.x;
              sy = (ry * 2 * handle.y) / ft.o.size.y;

              ft.attrs.scale = {
                x: sx || ft.attrs.scale.x,
                y: sy || ft.attrs.scale.y
              };

              // Check boundaries.
              if (!isWithinBoundaries().x || !isWithinBoundaries().y) {
                ft.attrs = previous;
              }

              applyLimits();

              // Maintain aspect ratio.
              if (
                (handle.isCorner &&
                  ft.opts.keepRatio.indexOf('bboxCorners') !== -1) ||
                (!handle.isCorner &&
                  ft.opts.keepRatio.indexOf('bboxSides') !== -1)
              ) {
                keepRatio(handle.axis);

                var trans = {
                  x: (ft.attrs.scale.x - ft.o.scale.x) * ft.o.size.x * handle.x,
                  y: (ft.attrs.scale.y - ft.o.scale.y) * ft.o.size.y * handle.y
                };

                rx = trans.x * cos + trans.y * sin;
                ry = -trans.x * sin + trans.y * cos;

                ft.attrs.translate.x = ft.o.translate.x + rx / 2;
                ft.attrs.translate.y = ft.o.translate.y + ry / 2;
              }

              ft.attrs.ratio = ft.attrs.scale.x / ft.attrs.scale.y;

              asyncCallback(['scale']);

              ft.apply();
            },
            function() {
              var rotate = Snap.rad((360 - ft.attrs.rotate) % 360),
                handlePos = {
                  x: parseInt(handle.element.attr('x')),
                  y: parseInt(handle.element.attr('y'))
                };

              // Offset values.
              ft.o = cloneObj(ft.attrs);

              ft.o.handlePos = {
                cx:
                  handlePos.x +
                  ft.opts.size[handle.isCorner ? 'bboxCorners' : 'bboxSides'],
                cy:
                  handlePos.y +
                  ft.opts.size[handle.isCorner ? 'bboxCorners' : 'bboxSides']
              };

              // Pre-compute rotation sin & cos for efficiency.
              ft.o.rotate = {
                sin: Math.sin(rotate),
                cos: Math.cos(rotate)
              };

              asyncCallback(['scale start']);
            },
            function() {
              asyncCallback(['scale end']);
            }
          );
        });
      }

      // Drag element and center handle.
      var draggables = [];

      if (
        ft.opts.drag.indexOf('self') >= 0 &&
        ft.opts.scale.indexOf('self') === -1 &&
        ft.opts.rotate.indexOf('self') === -1
      ) {
        draggables.push(subject);
      }

      if (ft.opts.drag.indexOf('center') >= 0) {
        draggables.push(ft.handles.center.disc);
      }

      ft.attachHandlers(draggables);

      var rotate = ft.opts.rotate.indexOf('self') >= 0,
        scale = ft.opts.scale.indexOf('self') >= 0;

      if (rotate || scale) {
        subject.drag(
          function(dx, dy, x, y) {
            if (rotate) {
              var rad = Math.atan2(
                y - ft.o.center.y - ft.o.translate.y,
                x - ft.o.center.x - ft.o.translate.x
              );
              ft.attrs.rotate = ft.o.rotate + Snap.deg(rad) - ft.o.deg;
            }

            var mirrored = {
              x: ft.o.scale.x < 0,
              y: ft.o.scale.y < 0
            };

            if (scale) {
              var radius = Math.sqrt(
                Math.pow(x - ft.o.center.x - ft.o.translate.x, 2) +
                  Math.pow(y - ft.o.center.y - ft.o.translate.y, 2)
              );

              ft.attrs.scale.x = ft.attrs.scale.y =
                (mirrored.x ? -1 : 1) * ft.o.scale.x +
                (radius - ft.o.radius) / (ft.o.size.x / 2);

              //   if (mirrored.x) {
              //     ft.attrs.scale.x *= -1;
              //   }
              //   if (mirrored.y) {
              //     t.attrs.scale.y *= -1;
              //   }
            }

            applyLimits();

            ft.apply();

            asyncCallback([rotate ? 'rotate' : null, scale ? 'scale' : null]);
          },
          function(x, y) {
            // Offset values
            ft.o = cloneObj(ft.attrs);

            ft.o.deg =
              (Math.atan2(
                y - ft.o.center.y - ft.o.translate.y,
                x - ft.o.center.x - ft.o.translate.x
              ) *
                180) /
              Math.PI;

            ft.o.radius = Math.sqrt(
              Math.pow(x - ft.o.center.x - ft.o.translate.x, 2) +
                Math.pow(y - ft.o.center.y - ft.o.translate.y, 2)
            );

            asyncCallback([
              rotate ? 'rotate start' : null,
              scale ? 'scale start' : null
            ]);
          },
          function() {
            asyncCallback([
              rotate ? 'rotate end' : null,
              scale ? 'scale end' : null
            ]);
          }
        );
      }

      ft.updateHandles();

      return ft;
    };

    /**
     * Remove handles.
     */
    ft.hideHandles = function(opts) {
      var opts = opts || {};

      if (opts.undrag === undefined) {
        opts.undrag = true;
      }

      if (opts.undrag) {
        ft.items.map(function(item) {
          item.el.undrag();
        });
      }

      if (ft.handles.center) {
        ft.handles.center.disc.remove();
        ft.handles.center = null;
      }

      ['x', 'y'].map(function(axis) {
        if (ft.handles[axis]) {
          ft.handles[axis].disc.remove();
          ft.handles[axis].line.remove();
          ft.handles[axis] = null;
        }
      });

      if (ft.bbox) {
        ft.bbox.remove();
        ft.bbox = null;

        if (ft.handles.bbox) {
          ft.handles.bbox.map(function(handle) {
            handle.element.remove();
          });
          ft.handles.bbox = null;
        }
      }

      if (ft.circle) {
        ft.circle.remove();
        ft.circle = null;
      }

      return ft;
    };

    ft.attachHandlers = function(draggables) {
      let draggable = paper.group(...draggables);

      //   draggables.map(function(draggable) {
      draggable.drag(
        function(dx, dy) {
          ft.attrs.translate.x = ft.o.translate.x + dx;
          ft.attrs.translate.y = ft.o.translate.y + dy;

          var bbox = cloneObj(ft.o.bbox);

          bbox.x += dx;
          bbox.y += dy;

          applyLimits(bbox);

          asyncCallback(['drag']);

          ft.apply();
        },
        function() {
          // Offset values.
          ft.o = cloneObj(ft.attrs);

          if (ft.opts.snap.drag) {
            ft.o.bbox = subject.getBBox();
          }

          ft.axes.map(function(axis) {
            if (ft.handles[axis]) {
              ft.handles[axis].disc.ox = parseInt(
                ft.handles[axis].disc.attr('cx')
              );
              ft.handles[axis].disc.oy = parseInt(
                ft.handles[axis].disc.attr('cy')
              );
            }
          });

          asyncCallback(['drag start']);
        },
        function() {
          asyncCallback(['drag end']);
        }
      );
      //   });
    };

    /**
     * Override defaults.
     */
    ft.setOpts = function(options, callback) {
      if (callback !== undefined) {
        ft.callback = typeof callback === 'function' ? callback : false;
      }

      var i, j;

      for (i in options) {
        if (options[i] && options[i].constructor === Object) {
          if (ft.opts[i] === false) {
            ft.opts[i] = {};
          }
          for (j in options[i]) {
            if (options[i].hasOwnProperty(j)) {
              ft.opts[i][j] = options[i][j];
            }
          }
        } else {
          ft.opts[i] = options[i];
        }
      }

      if (ft.opts.drag === true) {
        ft.opts.drag = ['self'];
      }
      if (ft.opts.keepRatio === true) {
        ft.opts.keepRatio = ['bboxCorners', 'bboxSides'];
      }
      if (ft.opts.rotate === true) {
        ft.opts.rotate = ['axisX', 'axisY'];
      }
      if (ft.opts.scale === true) {
        ft.opts.scale = ['axisX', 'axisY', 'bboxCorners', 'bboxSides'];
      }

      ['drag', 'draw', 'keepRatio', 'rotate', 'scale'].map(function(option) {
        if (ft.opts[option] === false) {
          ft.opts[option] = [];
        }
      });

      ft.axes = [];

      if (
        ft.opts.rotate.indexOf('axisX') >= 0 ||
        ft.opts.scale.indexOf('axisX') >= 0
      ) {
        ft.axes.push('x');
      }

      ['drag', 'rotate', 'scale'].map(function(option) {
        if (!ft.opts.snapDist[option]) {
          ft.opts.snapDist[option] = ft.opts.snap[option];
        }
      });

      // Force numbers.
      ft.opts.range = {
        rotate: [
          parseFloat(ft.opts.range.rotate[0]),
          parseFloat(ft.opts.range.rotate[1])
        ],
        scale: [
          parseFloat(ft.opts.range.scale[0]),
          parseFloat(ft.opts.range.scale[1])
        ]
      };

      ft.opts.snap = {
        drag: parseFloat(ft.opts.snap.drag),
        rotate: parseFloat(ft.opts.snap.rotate),
        scale: parseFloat(ft.opts.snap.scale)
      };

      ft.opts.snapDist = {
        drag: parseFloat(ft.opts.snapDist.drag),
        rotate: parseFloat(ft.opts.snapDist.rotate),
        scale: parseFloat(ft.opts.snapDist.scale)
      };

      if (typeof ft.opts.size === 'string') {
        ft.opts.size = parseFloat(ft.opts.size);
      }

      if (!isNaN(ft.opts.size)) {
        ft.opts.size = {
          axes: ft.opts.size,
          bboxCorners: ft.opts.size,
          bboxSides: ft.opts.size,
          center: ft.opts.size
        };
      }

      ft.showHandles();

      asyncCallback(['init']);

      return ft;
    };

    ft.setOpts(options, callback);

    /**
     * Apply transformations, optionally update attributes manually.
     */
    ft.apply = function() {
      ft.items.map(function(item, i) {
        // Take offset values into account.
        var center = {
            x: ft.attrs.center.x + ft.offset.translate.x,
            y: ft.attrs.center.y + ft.offset.translate.y
          },
          rotate = ft.attrs.rotate - ft.offset.rotate,
          scale = {
            x: ft.attrs.scale.x / ft.offset.scale.x,
            y: ft.attrs.scale.y / ft.offset.scale.y
          },
          translate = {
            x: ft.attrs.translate.x - ft.offset.translate.x,
            y: ft.attrs.translate.y - ft.offset.translate.y
          };

        item.el.transform(
          [
            'R' + rotate,
            center.x,
            center.y,
            'S' + scale.x,
            scale.y,
            center.x,
            center.y,
            'T' + translate.x,
            translate.y
          ].join()
        );

        asyncCallback(['apply']);

        ft.updateHandles();
      });

      return ft;
    };

    /**
     * Clean exit.
     */
    ft.unplug = function() {
      var attrs = ft.attrs;

      ft.hideHandles();

      delete subject.freeTransform;

      return attrs;
    };

    // Store attributes for each item
    function scan(subject) {
      (subject.type === 'set' ? subject.items : [subject]).map(function(item) {
        if (item.type === 'set') {
          scan(item);
        } else {
          ft.items.push({
            el: item,
            attrs: {
              rotate: 0,
              scale: { x: 1, y: 1 },
              translate: { x: 0, y: 0 }
            },
            transformString: item.transform().toString()
          });
        }
      });
    }

    ft.scanItems = function() {
      ft.items = [];
      scan(subject);

      // Get the current transform values for each item
      ft.items.map(function(item, i) {
        if (
          item.el._ &&
          item.el._.transform &&
          typeof item.el._.transform === 'object'
        ) {
          item.el._.transform.map(function(transform) {
            if (transform[0]) {
              switch (transform[0].toUpperCase()) {
                case 'T':
                  ft.items[i].attrs.translate.x += transform[1];
                  ft.items[i].attrs.translate.y += transform[2];
                  break;
                case 'S':
                  ft.items[i].attrs.scale.x *= transform[1];
                  ft.items[i].attrs.scale.y *= transform[2];
                  break;
                case 'R':
                  ft.items[i].attrs.rotate += transform[1];
                  break;
              }
            }
          });
        }
      });
    };

    ft.scanItems();

    // If subject is not of type set, the first item _is_ the subject
    if (subject.type !== 'set') {
      ft.attrs.rotate = ft.items[0].attrs.rotate;
      ft.attrs.scale = ft.items[0].attrs.scale;
      ft.attrs.translate = ft.items[0].attrs.translate;

      ft.items[0].attrs = {
        rotate: 0,
        scale: {
          x: 1,
          y: 1
        },
        translate: {
          x: 0,
          y: 0
        }
      };

      ft.items[0].transformString = '';
    }

    ft.attrs.ratio = ft.attrs.scale.x / ft.attrs.scale.y;

    /**
     * Get rotated bounding box
     */
    function getBBox() {
      var rad = {
        x: Snap.rad(ft.attrs.rotate),
        y: Snap.rad(ft.attrs.rotate + 90)
      };

      var radius = {
        x: (ft.attrs.size.x / 2) * ft.attrs.scale.x,
        y: (ft.attrs.size.y / 2) * ft.attrs.scale.y
      };

      var corners = [],
        signs = [
          { x: -1, y: -1 },
          { x: 1, y: -1 },
          { x: 1, y: 1 },
          { x: -1, y: 1 }
        ];

      signs.map(function(sign) {
        corners.push({
          x:
            ft.attrs.center.x +
            ft.attrs.translate.x +
            sign.x * radius.x * Math.cos(rad.x) +
            sign.y * radius.y * Math.cos(rad.y),
          y:
            ft.attrs.center.y +
            ft.attrs.translate.y +
            sign.x * radius.x * Math.sin(rad.x) +
            sign.y * radius.y * Math.sin(rad.y)
        });
      });

      return corners;
    }

    /**
     * Apply limits.
     */
    function applyLimits(bbox) {
      // Snap to grid
      if (bbox && ft.opts.snap.drag) {
        var x = bbox.x,
          y = bbox.y,
          dist = {
            x: 0,
            y: 0
          },
          snap = {
            x: 0,
            y: 0
          };

        [0, 1].map(function() {
          // Top and left sides first.
          dist.x = x - Math.round(x / ft.opts.snap.drag) * ft.opts.snap.drag;
          dist.y = y - Math.round(y / ft.opts.snap.drag) * ft.opts.snap.drag;

          if (Math.abs(dist.x) <= ft.opts.snapDist.drag) {
            snap.x = dist.x;
          }
          if (Math.abs(dist.y) <= ft.opts.snapDist.drag) {
            snap.y = dist.y;
          }

          // Repeat for bottom and right sides.
          x += bbox.width - snap.x;
          y += bbox.height - snap.y;
        });

        ft.attrs.translate.x -= snap.x;
        ft.attrs.translate.y -= snap.y;
      }

      // Snap to angle, rotate with increments.
      dist = Math.abs(ft.attrs.rotate % ft.opts.snap.rotate);
      dist = Math.min(dist, ft.opts.snap.rotate - dist);

      if (dist < ft.opts.snapDist.rotate) {
        ft.attrs.rotate =
          Math.round(ft.attrs.rotate / ft.opts.snap.rotate) *
          ft.opts.snap.rotate;
      }

      // Snap to scale, scale with increments.
      dist = {
        x: Math.abs((ft.attrs.scale.x * ft.attrs.size.x) % ft.opts.snap.scale),
        y: Math.abs((ft.attrs.scale.y * ft.attrs.size.x) % ft.opts.snap.scale)
      };

      dist = {
        x: Math.min(dist.x, ft.opts.snap.scale - dist.x),
        y: Math.min(dist.y, ft.opts.snap.scale - dist.y)
      };

      if (dist.x < ft.opts.snapDist.scale) {
        ft.attrs.scale.x =
          (Math.round(
            (ft.attrs.scale.x * ft.attrs.size.x) / ft.opts.snap.scale
          ) *
            ft.opts.snap.scale) /
          ft.attrs.size.x;
      }

      if (dist.y < ft.opts.snapDist.scale) {
        ft.attrs.scale.y =
          (Math.round(
            (ft.attrs.scale.y * ft.attrs.size.y) / ft.opts.snap.scale
          ) *
            ft.opts.snap.scale) /
          ft.attrs.size.y;
      }

      // Limit range of rotation.
      if (ft.opts.range.rotate) {
        var deg = (360 + ft.attrs.rotate) % 360;

        if (deg > 180) {
          deg -= 360;
        }

        if (deg < ft.opts.range.rotate[0]) {
          ft.attrs.rotate += ft.opts.range.rotate[0] - deg;
        }
        if (deg > ft.opts.range.rotate[1]) {
          ft.attrs.rotate += ft.opts.range.rotate[1] - deg;
        }
      }

      // Limit scale.
      if (ft.opts.range.scale) {
        if (ft.attrs.scale.x * ft.attrs.size.x < ft.opts.range.scale[0]) {
          ft.attrs.scale.x = ft.opts.range.scale[0] / ft.attrs.size.x;
        }

        if (ft.attrs.scale.y * ft.attrs.size.y < ft.opts.range.scale[0]) {
          ft.attrs.scale.y = ft.opts.range.scale[0] / ft.attrs.size.y;
        }

        if (ft.attrs.scale.x * ft.attrs.size.x > ft.opts.range.scale[1]) {
          ft.attrs.scale.x = ft.opts.range.scale[1] / ft.attrs.size.x;
        }

        if (ft.attrs.scale.y * ft.attrs.size.y > ft.opts.range.scale[1]) {
          ft.attrs.scale.y = ft.opts.range.scale[1] / ft.attrs.size.y;
        }
      }
    }

    function isWithinBoundaries() {
      return {
        x:
          ft.attrs.scale.x * ft.attrs.size.x >= ft.opts.range.scale[0] &&
          ft.attrs.scale.x * ft.attrs.size.x <= ft.opts.range.scale[1],
        y:
          ft.attrs.scale.y * ft.attrs.size.y >= ft.opts.range.scale[0] &&
          ft.attrs.scale.y * ft.attrs.size.y <= ft.opts.range.scale[1]
      };
    }

    function keepRatio(axis) {
      if (axis === 'x') {
        ft.attrs.scale.y = ft.attrs.scale.x / ft.attrs.ratio;
      } else {
        ft.attrs.scale.x = ft.attrs.scale.y * ft.attrs.ratio;
      }
    }

    /**
     * Recursive copy of object.
     */
    function cloneObj(obj) {
      var i,
        clone = {};
      for (i in obj) {
        clone[i] = typeof obj[i] === 'object' ? cloneObj(obj[i]) : obj[i];
      }
      return clone;
    }

    var timeout = false;

    /**
     * Call callback asynchronously for better performance
     */
    function asyncCallback(e) {
      if (!ft.callback) {
        return;
      }
      // Remove empty values
      var events = [];

      e.map(function(e, i) {
        if (e) {
          events.push(e);
        }
      });

      clearTimeout(timeout);

      timeout = setTimeout(function() {
        if (ft.callback) {
          ft.callback(ft, events);
        }
      }, 1);
    }

    function addDeleteButton(handle, ft, paper, index) {
      handle.element = paper
        .rect(
          ft.attrs.center.x,
          ft.attrs.center.y,
          ft.opts.size[handle.isCorner ? 'bboxCorners' : 'bboxSides'] * 3,
          ft.opts.size[handle.isCorner ? 'bboxCorners' : 'bboxSides'] * 3,
          50
        )
        .attr(ft.opts.attrs);

      ft.handles.bbox[index] = handle;
    }

    function distanceBtwPoints(x1, y1, x2, y2) {
      let xs = x2 - x1,
        ys = y2 - y1;
      return Math.round(Math.sqrt(xs * xs + ys * ys));
    }

    window.onkeydown = function(event) {
      if (event.keyCode < 37 && event.keyCode > 40) {
        return;
      }

      let dx = 0,
        dy = 0;

      switch (event.keyCode) {
        case 37:
          dx = -5;
          break;
        case 39:
          dx = 5;
          break;
        case 38:
          dy = -5;
          break;
        case 40:
          dy = 5;
          break;
      }

      ft.attrs.translate.x = ft.attrs.translate.x + dx;
      ft.attrs.translate.y = ft.attrs.translate.y + dy;

      //# may be this has an impact need to test
      // var bbox = cloneObj(ft.bbox);
      // bbox.x += dx;
      // bbox.y += dy;
      // applyLimits(bbox);

      asyncCallback(['key-drag']);

      ft.apply();

      event.preventDefault();
    };

    // fixing corners for ICOVIA
    // #optmize2
    function fixCorners(handle, ft, paper, index) {
      let cursor;

      if (!handle.isCorner) {
        cursor = handle.axis == 'x' ? 'e-resize' : 'n-resize';
      } else {
        cursor = handle.axis == 'x' ? 'sw-resize' : 'nw-resize';
      }

      handle.element = paper
        .rect(
          ft.attrs.center.x,
          ft.attrs.center.y,
          ft.opts.size[handle.isCorner ? 'bboxCorners' : 'bboxSides'] * 3,
          ft.opts.size[handle.isCorner ? 'bboxCorners' : 'bboxSides'] * 3,
          50
        )
        .attr(ft.opts.attrs)
        .attr('cursor', cursor);

      ft.handles.bbox[index] = handle;
    }

    ft.updateHandles();

    // Enable method chaining
    return ft;
  };
});

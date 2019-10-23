// Player component
var Player = {
	template: `
		<div>
			<div id="back" class="editor-goback" v-on:click="goBack()"></div>
			<img id="miniletter" class="editor-miniletter" v-bind:src="item.image" v-on:load="onLoad()"></img>
			<div id="area" class="editor-area">
				<canvas id="letter"></canvas>
			</div>
		</div>`,
	props: ['item'],
	data: function() {
		return {
			size: -1,
			zoom: -1,
			current: { start: -1, stroke: -1, strokes: [], index: -1 },
			mode: '',
			drawing: false
		}
	},
	methods: {
		computeSize: function() {
			// Compute optimal size for letter
			var vm = this;
			var body = document.getElementById("canvas") || document.getElementById("body");
			var body_height = body.offsetHeight-50;
			var body_width = body.offsetWidth-50;
			var size = { width: body_width, height: body_height };
			vm.size = Math.min(size.width, size.height);
			var letter = document.getElementById("letter");
			letter.width = vm.size;
			letter.height = vm.size;
			letter.style.marginLeft = (size.width-vm.size)/2-50 + "px";
			vm.zoom = vm.size/document.getElementById("miniletter").naturalWidth;

			// Draw
			this.draw();
		},

		initEvent: function() {
			// Register mouse/touch on letter event
			var vm = this;
			var downEvent = "mousedown";
			var moveEvent = "mousemove"
			var upEvent = "mouseup";
			var touchScreen = ("ontouchstart" in document.documentElement);
			if (touchScreen) {
				downEvent = "touchstart";
				moveEvent = "touchmove";
				upEvent = "touchend";
			}
			var letter = document.getElementById("letter");
			letter.addEventListener(downEvent, function(e) {
				vm.drawing = (vm.mode == 'input');
			});
			letter.addEventListener(upEvent, function(e) {
				vm.drawing = false;
			});
			letter.addEventListener(moveEvent, function(e) {
				if (vm.mode != 'input' || !vm.drawing) {
					return;
				}
				var x = Math.floor((e.clientX-letter.getBoundingClientRect().left)/vm.zoom);
				var y = Math.floor((e.clientY-letter.getBoundingClientRect().top)/vm.zoom);
				var target = (vm.item.starts[vm.current.start].path.length?vm.item.starts[vm.current.start].path[vm.current.index]:vm.item.starts[vm.current.start]);
				var distance = Math.sqrt(Math.pow(x-target.x,2)+Math.pow(y-target.y,2));
				if (distance < 2)
				{
					vm.current.strokes[vm.current.start].push({x: x, y: y});
					vm.drawStoke();
					vm.current.index++;
					if (vm.current.index >= vm.item.starts[vm.current.start].path.length) {
						vm.current.start++;
						vm.current.index = 0;
						if (vm.current.start >= vm.item.starts.length) {
							console.log("END");
							vm.mode = 'end';
						} else {
							var lines = [];
							lines.push({x: vm.item.starts[vm.current.start].x, y: vm.item.starts[vm.current.start].y});
							lines.push({x: vm.item.starts[vm.current.start].x, y: vm.item.starts[vm.current.start].y});
							vm.current.strokes.push(lines);
							vm.drawStoke();
						}
					}
				}
			});
		},

		draw: function() {
			// Draw board
			var vm = this;
			var letter = document.getElementById("letter");
			var context = letter.getContext('2d');
			context.clearRect(0, 0, vm.size, vm.size);
			var imageObj = new Image();
			imageObj.onload = function() {
				// Draw letter
				context.drawImage(imageObj, 0, 0, vm.size, vm.size);

				// Draw current drawing
				if (vm.mode == 'input' && vm.current.strokes.length) {
					vm.drawStoke();
				}
			};
			imageObj.src = vm.item.image;
		},

		drawStoke: function() {
			// Draw user stroke
			var vm = this;
			var letter = document.getElementById("letter");
			var context = letter.getContext('2d');
			context.strokeStyle = app.color.stroke;
			context.lineWidth = 10;
			context.lineCap = "round";
			context.lineJoin = "round";
			for (var i = 0 ; i < vm.current.strokes.length ; i++) {
				context.beginPath();
				context.moveTo(vm.zoom*vm.current.strokes[i].x, vm.zoom*vm.current.strokes[i].y);
				for (var j = 1 ; j < vm.current.strokes[i].length ; j++) {
					context.lineTo(vm.zoom*vm.current.strokes[i][j].x, vm.zoom*vm.current.strokes[i][j].y);
				}
				context.stroke();
			}
		},

		onLoad: function() {
			this.computeSize();
			this.initEvent();
		},

		goBack: function() {
			app.displayTemplateView();
		}
	},

	mounted: function() {
		var vm = this;
		var timeout = 70;
		vm.mode = 'show';
		var step = function() {
			// Draw a segment of path
			var line = vm.current.strokes[vm.current.start][vm.current.stroke];
			var letter = document.getElementById("letter");
			if (!letter) {
				return;
			}
			var context = letter.getContext('2d');
			context.beginPath();
			context.strokeStyle = app.color.stroke;
			context.lineWidth = 10;
			context.lineCap = "round";
			context.lineJoin = "round";
			context.moveTo(vm.zoom*line.x0, vm.zoom*line.y0);
			context.lineTo(vm.zoom*line.x1, vm.zoom*line.y1);
			context.stroke();
			vm.current.stroke++;
			if (vm.current.stroke >= vm.current.strokes[vm.current.start].length) {
				vm.current.start++;
				vm.current.stroke = 0;
				if (vm.current.start < vm.current.strokes.length) {
					setTimeout(step, timeout);
				} else {
					setTimeout(function() {
						// En of draw, start input mode
						vm.mode = 'input';
						vm.current.start = 0;
						vm.current.stroke = 0;
						vm.current.index = 0;
						vm.current.strokes = [];
						if (vm.item.starts && vm.item.starts.length) {
							var lines = [];
							lines.push({x: vm.item.starts[0].x, y: vm.item.starts[0].y});
							lines.push({x: vm.item.starts[0].x, y: vm.item.starts[0].y});
							vm.current.strokes.push(lines);
						}
						vm.draw();
					}, 500);
				}
			} else {
				setTimeout(step, timeout);
			}
		}
		if (vm.item.starts) {
			// Create lines set to draw letter
			vm.current.start = 0;
			vm.current.stroke = 0;
			vm.current.strokes = [];
			for (var i = 0 ; i < vm.item.starts.length ; i++) {
				if (!vm.item.starts[i].path) {
					continue;
				}
				var lines = [];
				var path = vm.item.starts[i].path;
				if (!vm.item.starts[i].path.length) {
					lines.push({x0: vm.item.starts[i].x, y0: vm.item.starts[i].y, x1: vm.item.starts[i].x, y1: vm.item.starts[i].y})
				} else {
					lines.push({x0: vm.item.starts[i].x, y0: vm.item.starts[i].y, x1: path[0].x, y1: path[0].y})
				}
				for (var j = 0 ; j < path.length ; j++) {
					if (j+1 < path.length) {
						lines.push({x0: path[j].x, y0: path[j].y, x1: path[j+1].x, y1: path[j+1].y});
					}
				}
				vm.current.strokes.push(lines);
			}
			setTimeout(step, timeout);
		}
	}
};
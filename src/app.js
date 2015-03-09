var canvas = document.querySelector("canvas");
var gfx = gfx_create_context(canvas, {alpha: false});
var map = null;
var renderer = null;
var dx = 0;
var dy = 0;
var scale = 1;
var mouse = {x: window.innerWidth/2, y: window.innerHeight/2};

if (window.location.hash.length > 1)
	load_map(window.location.hash.substr(1));
else
	load_map("ctf_Ash");

window.addEventListener("hashchange", function() {
	load_map(window.location.hash.substr(1));
});

window.addEventListener("resize", draw);
canvas.addEventListener("mousedown", mousedown);
window.addEventListener("mousemove", mousemove);
window.addEventListener("keydown", keydown);
canvas.addEventListener("wheel", wheel);
canvas.addEventListener("dblclick", dblclick);

document.querySelector(".view-options").addEventListener("mousedown", function(event) {
	event.preventDefault();
	event.stopPropagation();
});

document.querySelector(".view-options").addEventListener("change", function(event) {
	if (renderer)
	{
		renderer.config(event.target.id.split("-").pop(), event.target.checked);
		draw();
	}
});

function load_map(name)
{
	document.body.classList.add("loading");
	document.body.classList.remove("loaderror");

	http_get("data/maps/" + name + ".pms", on_load);
}

function on_load(buffer)
{
	dx = 0;
	dy = 0;
	scale = 1;

	document.querySelector("#cfg-background").checked = true;
	document.querySelector("#cfg-scenery_front").checked = true;
	document.querySelector("#cfg-scenery_middle").checked = true;
	document.querySelector("#cfg-scenery_back").checked = true;
	document.querySelector("#cfg-polygons").checked = true;
	document.querySelector("#cfg-texture").checked = true;
	document.querySelector("#cfg-wireframe").checked = false;

	if (!buffer)
	{
		document.body.classList.remove("loading");
		document.body.classList.add("loaderror");
		document.title = "Soldat Map Viewer";
		return;
	}

	map = Map.parse(buffer);

	renderer = new MapRenderer(gfx, map, function() {
		document.body.classList.remove("loading");
		document.title = map.name + " - Soldat Map Viewer";

		var v = [].concat.apply([], map.polygons.map(function(p) { return p.vertices; }));
		var x = v.map(function(v) { return v.x; });
		var y = v.map(function(v) { return v.y; });

		var xmin = Math.min.apply(null, x);
		var xmax = Math.max.apply(null, x);
		var ymin = Math.min.apply(null, y);
		var ymax = Math.max.apply(null, y);

		dx = xmin + (xmax - xmin) * 0.5;
		dy = ymin + (ymax - ymin) * 0.5;
		scale = 0.9 * Math.min(window.innerWidth / (xmax - xmin), window.innerHeight / (ymax - ymin));

		draw();
	});
}

function mousemove(event)
{
	mouse.x = event.clientX;
	mouse.y = event.clientY;
}

function dblclick(event)
{
	event.preventDefault();
	(scale = 1) && draw();
}

function wheel(event)
{
	var prev_scale = scale;
	var offsetx =  (mouse.x - window.innerWidth / 2);
	var offsety = -(mouse.y - window.innerHeight / 2);

	event.deltaY < 0 ? (scale *= 1.25) : (scale /= 1.25);

	dx += offsetx / scale - offsetx / prev_scale;
	dy += offsety / scale - offsety / prev_scale;

	draw();
}

function keydown(event)
{
	var prev_scale = scale;

	event.keyCode === 107 && (scale *= 1.25);
	event.keyCode === 109 && (scale /= 1.25);

	if (prev_scale !== scale)
	{
		var offsetx =  (mouse.x - window.innerWidth / 2);
		var offsety = -(mouse.y - window.innerHeight / 2);

		dx += offsetx / scale - offsetx / prev_scale;
		dy += offsety / scale - offsety / prev_scale;

		draw();
	}
}

function mousedown(event)
{
	event.preventDefault();

	var x = event.clientX;
	var y = event.clientY;

	function mousemove(event)
	{
		var offsetx = (event.clientX - x);
		var offsety = (y - event.clientY);

		x = event.clientX;
		y = event.clientY;

		dx += offsetx / scale;
		dy += offsety / scale;

		requestAnimationFrame(draw);
	}

	function mouseup()
	{
		window.removeEventListener("mouseup", mouseup);
		window.removeEventListener("mousemove", mousemove);
	}

	window.addEventListener("mouseup", mouseup);
	window.addEventListener("mousemove", mousemove);
}

function draw()
{
	if (!renderer)
		return;

	var w = canvas.width = canvas.offsetWidth;
	var h = canvas.height = canvas.offsetHeight;

	gfx.viewport(0, 0, w, h);
	gfx.projection(mat3ortho(0, w, 0, h, mat3()));
	gfx.blend(gfx.SrcAlpha, gfx.OneMinusSrcAlpha, gfx.SrcAlpha, gfx.OneMinusSrcAlpha);
	gfx.clear_color(0, 0, 0, 1);
	gfx.clear();

	renderer.draw(1/scale * w/2 + dx, 1/scale * h/2 + dy, scale);
}

function http_get(url, callback)
{
	var request = new XMLHttpRequest();
	request.open("GET", url);
	request.responseType = "arraybuffer";

	request.addEventListener("loadend", function() {
		callback(request.status === 200 ? request.response : null);
	});

	request.send();
}

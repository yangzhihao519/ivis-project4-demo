
function paintDiagram(data){
  var w = 1280,
  h = 800,
  r = 720,
  x = d3.scale.linear().range([0, r]),
  y = d3.scale.linear().range([0, r]),
  node,
  root;

  var pack = d3.layout.pack()
  .size([r, r])
  .value(function(d) { return d.size; })

  var vis = d3.select("body").insert("svg:svg", "h2")
  .attr("width", w)
  .attr("height", h)
  .append("svg:g")
  .attr("transform", "translate(" + (w - r) / 2 + "," + (h - r) / 2 + ")");

  //d3.json(json, function(data) {
    node = root = data;

    var nodes = pack.nodes(root);

    vis.selectAll("circle")
    .data(nodes)
    .enter().append("svg:circle")
    .attr("class", function(d) { return d.children ? "parent" : "child"; })
    .attr("cx", function(d) { return d.x; })
    .attr("cy", function(d) { return d.y; })
    .attr("r", function(d) { return d.r; })
    .on("click", function(d) { if(node == d){window.open("https://en.wikipedia.org/wiki/" + d.name);} return zoom(node == d ? root : d); });

    vis.selectAll("text")
    .data(nodes)
    .enter().append("svg:text")
    .attr("class", function(d) { return d.children ? "parent" : "child"; })
    .attr("x", function(d) { return d.x; })
    .attr("y", function(d) { return d.y; })
    .attr("dy", ".35em")
    .attr("text-anchor", "middle")
    .style("opacity", function(d) { return d.r > 20 ? 1 : 0; })
    .text(function(d) { return d.name; });

    d3.select(window).on("click", function() { zoom(root); });
  //});

function zoom(d, i) {
  var k = r / d.r / 2;
  x.domain([d.x - d.r, d.x + d.r]);
  y.domain([d.y - d.r, d.y + d.r]);

  var t = vis.transition()
  .duration(d3.event.altKey ? 7500 : 750);

  t.selectAll("circle")
  .attr("cx", function(d) { return x(d.x); })
  .attr("cy", function(d) { return y(d.y); })
  .attr("r", function(d) { return k * d.r; });

  t.selectAll("text")
  .attr("x", function(d) { return x(d.x); })
  .attr("y", function(d) { return y(d.y); })
  .style("opacity", function(d) { return k * d.r > 20 ? 1 : 0; });

  node = d;
  d3.event.stopPropagation();
}
}



function paintNetwork(json){

  var nodes = [{"name": json.name, "group": 1}];
  json.children.forEach(function(d){
    nodes.push({"name": d.name, "group": 2})
  });

  var links = json.children.map(function(d){
    return {"source": 0, "target": nodes.map(function(n){return n.name}).indexOf(d.name), "weight": 1};
  })




  var force = d3.layout.force()
  .gravity(.05)
  .distance(100)
  .charge(-100)
  .size([width, height]);


  force
  .nodes(nodes)
  .links(links)
  .start();

  var link = svg.selectAll(".link")
  .data(links)
  .enter().append("line")
  .attr("class", "link")
  .style("stroke-width", function(d) { return Math.sqrt(d.weight); })
  .style("stroke", "black");

  var node = svg.selectAll(".node")
  .data(nodes)
  .enter().append("g")
  .attr("class", "node")
  .call(force.drag);

  node.append("circle")
  .attr("r",10);

  node.append("text")
  .attr("dx", 12)
  .attr("dy", ".35em")
  .text(function(d) { return d.name });

  node.on("click", switchNode);

  force.on("tick", function() {
    link.attr("x1", function(d) { return d.source.x; })
    .attr("y1", function(d) { return d.source.y; })
    .attr("x2", function(d) { return d.target.x; })
    .attr("y2", function(d) { return d.target.y; });

    node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
  });
}

function switchNode(){
  console.log(this.parentNode);
  d3.selectAll(this.parentNode.children).remove();
  fetchData(d3.select(this).text());
}
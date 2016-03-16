// init 
var width = 750,
height = window.innerHeight;

var svg = d3.select("#displayGraph").append("svg")
.attr("width", width)
.attr("height", height);

var force = d3.layout.force()
              .gravity(.05)
              .distance(100)
              .charge(-100)
              .size([width, height]);

var sourceIndex = 0;
var sourceIndexArray = [0];
var nodes = [];
var links = [];
var linkedByIndex = {};

// functions
function makeGraph(){
  var text = document.getElementById("pageSearch").value;
  //console.log(text);

  if (text == "") {
    text = document.getElementById("homeSearch").value;
    document.getElementById("pageSearch").value = text;
  }

  console.log(text);
  var existedSvg = document.getElementsByTagName("svg");

  //console.log(existedSvg);
  //console.log(existedSvg[0].childNodes);

  d3.selectAll(existedSvg[0].childNodes).remove();
  
  force = d3.layout.force()
              .gravity(.05)
              .distance(100)
              .charge(-100)
              .size([width, height]);

  sourceIndex = 0;
  sourceIndexArray = [0];
  nodes = [];
  links = [];
  linkedByIndex = {};

  // get the search text and draw a new graph
  // var text = document.getElementById("pageSearch").value;
  fetchData(text, paintNetwork);
}

// call Wiki API to fetch data
function fetchData(text, callback) {
  // These are all the different things we can ask wikipedia about for the prop:
  // 'text|langlinks|categories|links|templates|images|
  //  externallinks|sections|revid|displaytitle|iwlinks|properties'
  //console.log("fetchData: "+text);
  
  var mwjs = new MediaWikiJS('https://en.wikipedia.org');

  mwjs.send({action: 'parse', page: text, section: "0", prop: 'text'},
    function (data) {
      'use strict';
      
      // Extract the text
      var rawText = data.parse.text['*']

      // Find position of first <p>
      var frontIndex = rawText.search("<p>");

      // Find position of last <p>
      var endIndex = rawText.lastIndexOf("</p>");
      
      // Remove all garble stuff before the first <p> and
      // remove all garble stuff after the first <!-- (including it)
      var trimmedText = rawText.slice(frontIndex, endIndex + 4);
      
      // Fix so all links redirect to wikipedia correctly
      trimmedText = trimmedText.replace(/href="/g,'href="https://en.wikipedia.org');
      
      // Replace this line with a call to a function that
      // updates the "introduction info"-window

      // Capitalise the first letter
      var displayText = text;
      displayText = displayText.charAt(0).toUpperCase() + displayText.slice(1);

      // show title
      document.getElementById("introTitle").innerHTML = displayText;

      // show introduction
      document.getElementById("introduction").innerHTML = trimmedText;
    }
  );
  
  mwjs.send({action: 'parse', page: text, prop: 'sections'},
    function (data) {
      'use strict';
      var title = 'null';           // Set default value
      var see_also_index = 'Not found';   // Set default value
      var see_also_byteoffset = 0;      // Set default value
      var pageid = 'null';          // Set default value
      
      
      var sections_array = data.parse.sections;

      // Extract the array and find the "See also" section number
      var i = 0, LENGTH = sections_array.length;
      while (i < LENGTH) {
        if (sections_array[i].line == 'See also') {
          title = data.parse.title;
          see_also_index = sections_array[i].index;
          see_also_byteoffset = sections_array[i].byteoffset;
          pageid = data.parse.pageid;
          break;
        }
        i += 1;
      }

      // If section do not exist, print error message
      if (see_also_index == 'Not found') {
        // document.getElementById("space").innerHTML = "\"" + text + "\"" + ' do not have a "See Also" section!';
        callback(null, text);
      }
      else {    // If section exists, do second data fetch
        mwjs.send({action: 'parse', page: text, section: see_also_index, prop: 'links'},
          function (data) {
            'use strict';
            
            // Clean all links and store in array
            var link_array = [];
            i = 0;
            LENGTH = data.parse.links.length;
            while (i < LENGTH) {
              link_array.push({"name":data.parse.links[i]['*'], "size":see_also_byteoffset/2});
              i += 1;
            }

            var newNodes = [{"name": title}];
            link_array.forEach(function(d){
              newNodes.push({"name": d.name})
            });

            callback(newNodes);            
          }
        );
      }
    }
  );
}

function redraw(newNodes, text){
  if(newNodes){
    var existedSvg = document.getElementsByTagName("svg");
    d3.selectAll(existedSvg[0].childNodes).remove();
    paintNetwork(newNodes);
  }else{
    console.log("redraw null");
    document.getElementById("space").innerHTML = "\"" + text + "\"" + ' do not have a "See Also" section!';
  }
}

// draw the network using new nodes
function paintNetwork(newNodes){
  console.log("paintNetwork: "+newNodes);

  var nodeLength = nodes.length;
  console.log("nodeLength"+nodeLength);

  var source = 0;
  if(nodeLength == 0){
    for(key in newNodes){
      nodes.push(newNodes[key]);
    }

    var newlinks = nodes.map(function(d){
      var targetIndex = nodes.map(function(n){return n.name}).indexOf(d.name);
      linkedByIndex[sourceIndex + "," + targetIndex] = true;
      return {"source": sourceIndex, "target": targetIndex, "weight": 1}
    });
    for(key in newlinks){
      links.push(newlinks[key]);
    }
    console.log(nodes);
    console.log(links);
    nodes[0].source = true;
  }else{
    // source = nodes.map(function(n){return n.name}).indexOf(newNodes[0].name);
    //source = sourceIndex;
    newNodes.shift();

    for(key in newNodes){
      nodes.push(newNodes[key]);
    }
    var newlinks = newNodes.map(function(d, i){
      var targetIndex = nodeLength + i;
      linkedByIndex[sourceIndex + "," + targetIndex] = true;
      return {"source": sourceIndex, "target": targetIndex, "weight": 1 }
    });

    for(key in newlinks){
      links.push(newlinks[key]);
    }
    nodes[source].source = true;
  }

  //console.log(nodes);

  force.nodes(nodes)
        .links(links)
        .start();

  var link = svg.selectAll(".link")
                .data(links)
                .enter().append("line")
                .attr("class", "link")
                // .style("stroke-width", function(d) { return Math.sqrt(d.weight); })
                .style("stroke-width", function(d) { return 5*Math.sqrt(d.weight); })
                .style("stroke", "#FFCF9E");

  var node = svg.selectAll(".node")
                .data(nodes)
                .enter().append("g")
                .attr("class", "node")
                .call(force.drag);

  node.append("circle")
      .attr("class", function(d){return d.source === true ? "source" : null})
      .attr("r",10);

  node.append("text")
      .attr("dx", 12)
      .attr("dy", ".35em")
      // .attr("color", "#5C2700")
      .attr("class","textColor")
      .attr("class", function(d){return d.source === true ? "sourceName" : null})
      .text(function(d) { return d.name });

  node.on("click", switchNode)
      .on("dblclick", function(d) { if(node == d){window.open("https://en.wikipedia.org/wiki/" + d.name);}})
      .on("mouseover", function(d) {setHighlight(d); })
      .on("mouseout", function(d) {exitHighlight(d); });

  force.on("tick", function() {
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
  });

  function setHighlight(d){
    //console.log("setHighlight");

    var t = svg.selectAll("text");
    t.style("font-weight", function(o) {
        return isConnected(d, o) ? "bold" : "normal";
    });

    var l = svg.selectAll(".link");
    l.style("stroke", function(o) {
      return o.source.index == d.index || o.target.index == d.index ? "#5C2700" : "#FF9814";
    })
    .style("stroke-width", function(o) { 
      // var weight = Math.sqrt(d.weight);
      // console.log("weight: "+weight);
      return o.source.index == d.index || o.target.index == d.index ? 5 : 1.5;
    });

    var c = svg.selectAll('circle');
    c.style("stroke", function(o) {
      return isConnected(d, o) ? "#5C2700" : "#FF9814";
    })
    .style("stroke-width", function(o) { 
      // var weight = Math.sqrt(d.weight);
      // console.log("weight: "+weight);
      return isConnected(d, o) ? 5 : 1.5;
    });
  }

  function exitHighlight(){
    console.log("exitHighlight");

    var t = svg.selectAll("text");
    t.style("font-weight", "normal");

    var l = svg.selectAll(".link");
    l.style("stroke", "#FFCF9E")
    .style("stroke-width", function(o) { return 5*Math.sqrt(o.weight); })

    var c = svg.selectAll('circle');
    c.style("stroke", "#FF9814")
    .style("stroke-width", 0);
  }

  // re-fetch data
  function switchNode(d){
    //this line prevents the click-event to occur if there already is a drag-event
    if (d3.event.defaultPrevented) return;

    // console.log(d.index);
    // console.log(sourceIndexArray);

    document.getElementById("pageSearch").value = "";

    if(sourceIndexArray.indexOf(d.index) != -1){
      // this node is one of the source nodes
      // do nothing
    }else{
      // fetch data only for lead node
      sourceIndex = d.index;
      sourceIndexArray.push(sourceIndex);
      
      // console.log("this.parentNode.children");
      // console.log(this);
      // console.log(this.parentNode);
      // console.log(this.parentNode.children);

      // d3.selectAll(this.parentNode.children).remove();
      fetchData(d3.select(this).text(), redraw);
    }
  }
}


function isConnected(a, b) {
  return linkedByIndex[a.index + "," + b.index] || linkedByIndex[b.index + "," + a.index] || a.index == b.index;
}


function library(){

var knitting = {"name": "Knitting", "size": 10};
var hello = {"name": "Hello", "size": 7};
var france = {"name": "France", "size": 1};

var bubble = {"name": "Category 1", "children": [knitting, hello, france]};

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

var vis = d3.select("#librarypg").insert("svg:svg", "h2")
.attr("width", w)
.attr("height", h)
.append("svg:g")
.attr("transform", "translate(" + (w - r) / 2 + "," + (h - r) / 2 + ")");


  node = root = bubble;

  var nodes = pack.nodes(root);

  vis.selectAll("circle")
  .data(nodes)
  .enter().append("svg:circle")
  .attr("class", function(d) { return d.children ? "parent" : "child"; })
  .attr("cx", function(d) { return d.x; })
  .attr("cy", function(d) { return d.y; })
  .attr("r", function(d) { return d.r; })
  .on("click", function(d) { return zoom(node == d ? root : d); });

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

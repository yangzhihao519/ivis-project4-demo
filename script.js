// init 
var width = 900,
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
  console.log("fetchData: "+text);
  
  var mwjs = new MediaWikiJS('https://en.wikipedia.org');
  
  mwjs.send({action: 'parse', page: text, prop: 'sections'},
    function (data) {
      'use strict';
      var title = 'null';           // Set default value
      var see_also_index = 'Not found';   // Set default value
      var see_also_byteoffset = 0;      // Set default value
      var pageid = 'null';          // Set default value
      
      // Extract the array and find the "See also" section number
      var sections_array = data.parse.sections;
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
                .style("stroke-width", function(d) { return Math.sqrt(d.weight); })
                .style("stroke", "black");

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
    console.log("setHighlight");

    var t = svg.selectAll("text");
    t.style("font-weight", function(o) {
        return isConnected(d, o) ? "bold" : "normal";
    });

    var l = svg.selectAll(".link");
    l.style("stroke", function(o) {
      return o.source.index == d.index || o.target.index == d.index ? "red" : "gray";
    })
    .style("stroke-width", function(o) { 
      // var weight = Math.sqrt(d.weight);
      // console.log("weight: "+weight);
      return o.source.index == d.index || o.target.index == d.index ? 2 : 0.5;
    });

    var c = svg.selectAll('circle');
    c.style("stroke", function(o) {
      return isConnected(d, o) ? "red" : "white";
    })
    .style("stroke-width", function(o) { 
      // var weight = Math.sqrt(d.weight);
      // console.log("weight: "+weight);
      return isConnected(d, o) ? 2 : 0.5;
    });
  }

  function exitHighlight(){
    console.log("exitHighlight");

    var t = svg.selectAll("text");
    t.style("font-weight", "normal");

    var l = svg.selectAll(".link");
    l.style("stroke", "black")
    .style("stroke-width", function(o) { return Math.sqrt(o.weight); })

    var c = svg.selectAll('circle');
    c.style("stroke", "black")
    .style("stroke-width", 0.5);
  }

  // re-fetch data
  function switchNode(d){
    //this line prevents the click-event to occur if there already is a drag-event
    if (d3.event.defaultPrevented) return;

    console.log(d.index);
    console.log(sourceIndexArray);

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
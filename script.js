
var width = 960,
height = 500;

var svg = d3.select("body").append("svg")
.attr("width", width)
.attr("height", height);

var bubbles = [];

function makeGraph(){
  var text = document.getElementById("Field").value;
  var bubble = fetchData(text, paintNetwork);
}

function fetchData(text, callback) {
  // These are all the different things we can ask wikipedia about for the prop:
  // 'text|langlinks|categories|links|templates|images|
  //  externallinks|sections|revid|displaytitle|iwlinks|properties'
  
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
      // document.getElementById("space").innerHTML = see_also_index;

      // If section do not exist, print error message
      if (see_also_index == 'Not found') {
        document.getElementById("space").innerHTML = "\"" + text + "\"" + ' do not have a "See Also" section!';
        return null;
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

            var newLinks = link_array.map(function(d){
              return {"source": 0, "target": newNodes.map(function(n){return n.name}).indexOf(d.name), "weight": 1}
            });

            var json = {"nodes": newNodes, "links": newLinks};


            callback(newNodes);            
          }
          );
      }
    }
    );
}


var force = d3.layout.force()
.gravity(.05)
.distance(100)
.charge(-100)
.size([width, height]);

var nodes = [];
var links = [];

function paintNetwork(newNodes){
  var nodeLength = nodes.length;
  var source = 0;
  if(nodeLength == 0){
    for(key in newNodes){
      nodes.push(newNodes[key]);
    }

    var newlinks = nodes.map(function(d){
      return {"source": 0, "target": nodes.map(function(n){return n.name}).indexOf(d.name), "weight": 1}
    });
    for(key in newlinks){
      links.push(newlinks[key]);
    }
    nodes[0].source = true;
  }else{
    source = nodes.map(function(n){return n.name}).indexOf(newNodes[0].name);


    newNodes.shift();

    for(key in newNodes){
      nodes.push(newNodes[key]);
    }
    var newlinks = newNodes.map(function(d, i){
      return {"source": source, "target": nodeLength + i, "weight": 1 }
    });

    for(key in newlinks){
      links.push(newlinks[key]);
    }
    nodes[source].source = true;
  }

  //console.log(nodes);

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
  .attr("class", function(d){return d.source === true ? "source" : null})
  .attr("r",10);

  node.append("text")
  .attr("dx", 12)
  .attr("dy", ".35em")
  .text(function(d) { return d.name });

  node.on("click", switchNode)
  .on("dblclick", function(d) { if(node == d){window.open("https://en.wikipedia.org/wiki/" + d.name);}});

  force.on("tick", function() {
    link.attr("x1", function(d) { return d.source.x; })
    .attr("y1", function(d) { return d.source.y; })
    .attr("x2", function(d) { return d.target.x; })
    .attr("y2", function(d) { return d.target.y; });

    node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
  });
}

function switchNode(){
  //this line prevents the click-event to occur if there already is a drag-event
  if (d3.event.defaultPrevented) return;

  d3.selectAll(this.parentNode.children).remove();
  fetchData(d3.select(this).text(), paintNetwork);
}
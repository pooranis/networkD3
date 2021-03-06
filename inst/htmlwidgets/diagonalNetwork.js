HTMLWidgets.widget({

  name: "diagonalNetwork",
  type: "output",

  initialize: function(el, width, height) {

    d3.select(el).append("svg")
      .style("width", "100%")
      .style("height", "100%")
      .append("g")
      .attr("transform", "translate(40,0)");
    return d3.layout.tree();

  },

  resize: function(el, width, height, tree) {
    // resize now handled by svg viewBox attribute
    /*
    var s = d3.select(el).selectAll("svg");
    s.attr("width", width).attr("height", height);

    var margin = {top: 20, right: 20, bottom: 20, left: 20};
    width = width - margin.right - margin.left;
    height = height - margin.top - margin.bottom;

    tree.size([height, width]);
    var svg = d3.select(el).selectAll("svg").select("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    */

  },

  renderValue: function(el, x, tree) {
    // x is a list with two elements, options and root; root must already be a
    // JSON array with the d3Tree root data

    var s = d3.select(el).selectAll("svg");

    // when re-rendering the svg, the viewBox attribute set in the code below, will
    // be affected by the previously set viewBox. This line ensures, that the
    // viewBox will always be calculated right.
    s.attr("viewBox", null);

    // margin handling
    //   set our default margin to be 20
    //   will override with x.options.margin if provided
    var margin = {top: 20, right: 20, bottom: 20, left: 20};
    //   go through each key of x.options.margin
    //   use this value if provided from the R side
    Object.keys(x.options.margin).map(function(ky){
      if(x.options.margin[ky] !== null) {
        margin[ky] = x.options.margin[ky];
      }
      // set the margin on the svg with css style
      // commenting this out since not correct
      // s.style(["margin",ky].join("-"), margin[ky]);
    });


    width = s.node().getBoundingClientRect().width - margin.right - margin.left;
    height = s.node().getBoundingClientRect().height - margin.top - margin.bottom;

    //added Math.max(1, ...) to avoid NaN values when dealing with nodes of depth 0.
    tree.size([height, width])
      .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / Math.max(1, a.depth); });


    // select the svg group element and remove existing children
    s.attr("pointer-events", "all").selectAll("*").remove();
    s.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var svg = d3.select(el).selectAll("g");

    var root = x.root;
    var nodes = tree.nodes(root),
      links = tree.links(nodes);

    var diagonal = d3.svg.diagonal()
      .projection(function(d) { return [d.y, d.x]; });

    // draw links
    var link = svg.append("g");

    link.selectAll(".link")
      .data(links)
      .enter().append("path")
        .style("fill", "none")
        .style("stroke", x.options.linkColour)
//        .style("opacity", x.options.opacity)
        .style("stroke-width", x.options.linkWidth + 'px')
        .attr("d", function (d,i) {
          if (x.options.linkType == "elbow") {
           return "M" + d.source.y + "," + d.source.x
             + "V" + d.target.x + "H" + d.target.y;
           } else {
             return diagonal(d);
           }
        });

    if (x.options.linkStyle == "double") {
      var linkseparator = svg.append("g");

      linkseparator.selectAll(".link")
        .data(links)
        .enter().append("path")
          .style("fill", "none")
          .style("stroke", "#fff")
//          .style("opacity", x.options.opacity)
          .style("stroke-width", (1/3)*x.options.linkWidth + 'px')
          .attr("d", function (d,i) {
            if (x.options.linkType == "elbow") {
             return "M" + d.source.y + "," + d.source.x
               + "V" + d.target.x + "H" + d.target.y;
             } else {
               return diagonal(d);
             }
          });
      }


    var ncolor;
    var scolor;

    if (x.options.group != "null") {
      ncolor = d3.scale.ordinal()
        .domain(x.options.group)
        .range(x.options.nodeColour);
      scolor = d3.scale.ordinal()
        .domain(x.options.group)
        .range(x.options.nodeStroke);
    }

    var nodesize = function (d) {
      if (d.nodesize != null) {
        return d.nodesize;
      } else {
          return x.options.nodeSize;
      }
    }

    var maxnodesize = function (d) {
      if (d.nodesize != null) {
        return d3.max([d.nodesize, 10]);
      } else {
          return x.options.nodeSize;
      }
    }

    // draw nodes
    var node = svg.selectAll(".node")
      .data(nodes)
      .enter().append("g")
      .attr("class", "node")
      .attr("transform", function(d) {
        return "translate(" + d.y + "," + d.x + ")";
      })
      .on("mouseover", mouseover)
      .on("mouseout", mouseout);

    // node circles
    node.append("circle")
        .attr("r", nodesize)
//        .style("opacity", x.options.opacity)
        .style("fill-opacity", x.options.fillopacity)
        .style("stroke", function(d) {
          if (x.options.group != "null") {
            return scolor(d.group);
          } else {
            return x.options.nodeStroke;
          }
       })
        .style("stroke-width", x.options.strokeWidth)
        .style("fill", function(d) {
          if (x.options.group != "null") {
            return ncolor(d.group);
          } else {
            return x.options.nodeColour;
          }
       });


    // node text
    node.append("text")
        .attr("dx", function(d) { return d.children ? -8 : 8; })
        .attr("dy", ".31em")
        .attr("text-anchor", function(d) {
          return d.children || d._children ? "end" : "start";
        })
        .attr("transform", "rotate(" + x.options.textRotate + ")")
        .style("font", x.options.fontSize + "px " + x.options.fontFamily)
        .style("opacity", x.options.opacity)
        .style("fill", x.options.textColour)
        .text(function(d) { return d.name; });

    // adjust viewBox to fit the bounds of our tree
    s.attr(
        "viewBox",
        [
          d3.min(
            s.selectAll('.node text')[0].map(function(d){
              return d.getBoundingClientRect().left
            })
          ) - s.node().getBoundingClientRect().left - margin.right,
          d3.min(
            s.selectAll('.node text')[0].map(function(d){
              return d.getBoundingClientRect().top
            })
          ) - s.node().getBoundingClientRect().top - margin.top,
          d3.max(
            s.selectAll('.node text')[0].map(function(d){
              return d.getBoundingClientRect().right
            })
          ) -
          d3.min(
            s.selectAll('.node text')[0].map(function(d){
              return d.getBoundingClientRect().left
            })
          ) + margin.left + margin.right,
          d3.max(
            s.selectAll('.node text')[0].map(function(d){
              return d.getBoundingClientRect().bottom
            })
          ) -
          d3.min(
            s.selectAll('.node text')[0].map(function(d){
              return d.getBoundingClientRect().top
            })
          ) + margin.top + margin.bottom
        ].join(",")
      );

    // mouseover event handler
    function mouseover() {
      d3.select(this).select("circle").transition()
        .duration(550)
        .style("fill-opacity", 1)
        .style("fill", function(d) {
          if (x.options.group != "null") {
            return scolor(d.group)
          } else {
            return x.options.nodeStroke
          }
        })
        .attr("r", maxnodesize);


      d3.select(this).select("text").transition()
        .duration(550)
        .style("stroke-width", ".5px")
        .style("font", x.options.maxfontSize + "px " + x.options.fontFamily)
        .style("opacity", 1);
    }

    // mouseout event handler
    function mouseout() {
      d3.select(this).select("circle").transition()
        .duration(550)
        .style("fill-opacity", x.options.fillopacity)
        .style("fill", function(d) {
          if (x.options.group != "null") {
            return ncolor(d.group)
          } else {
            return x.options.nodeColour
          }
        })
        .attr("r", nodesize);

      d3.select(this).select("text").transition()
        .duration(550)
        .style("font", x.options.fontSize + "px " + x.options.fontFamily)
        .style("opacity", x.options.opacity);
    }

  },
});

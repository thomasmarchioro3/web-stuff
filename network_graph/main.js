const width = window.innerWidth, height = window.innerHeight - 48;
const svg = d3.select("svg").attr("viewBox", [0, 0, width, height]);

// Data (editable)
let nodes = [
  { id: "192.168.1.1" },
  { id: "192.168.1.2" },
];
let links = [
  { source: "192.168.1.1", target: "192.168.1.2", src_if: "eth69", dst_if: "eth420" }
];

const gLinks = svg.append("g");
const gLabelsSource = svg.append("g");
const gLabelsTarget = svg.append("g");
const gNodes = svg.append("g");

// Simulation
const simulation = d3.forceSimulation(nodes)
  .force("link", d3.forceLink(links).id(d => d.id).distance(180))
  .force("charge", d3.forceManyBody().strength(-500))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .on("tick", ticked);

// Current selections
let linkSel = gLinks.selectAll("path");
let labelSrcSel = gLabelsSource.selectAll("text");
let labelTgtSel = gLabelsTarget.selectAll("text");
let nodeSel = gNodes.selectAll("g");

// --- Rendering / Update ---
function keyForLink(d) {
  // Works before & after forceLink resolves {source,target} to node objects
  const s = (d.source && d.source.id) ? d.source.id : d.source;
  const t = (d.target && d.target.id) ? d.target.id : d.target;
  return `${s}→${t}`;
}

function update() {
  // Update forces
  simulation.nodes(nodes);
  simulation.force("link").links(links);

  // LINKS
  linkSel = linkSel
    .data(links, keyForLink);
  linkSel.exit().remove();
  const linkEnter = linkSel.enter().append("path")
    .attr("class", "link")
    .attr("marker-end", "url(#arrow)");
  linkSel = linkEnter.merge(linkSel);

  labelSrcSel = labelSrcSel
    .data(links, keyForLink);
  labelSrcSel.exit().remove();
  const labelSrcEnter = labelSrcSel.enter().append("text")
    .attr("class", "label label-source")
    .text(d => d.src_if ?? "");
  labelSrcSel = labelSrcEnter.merge(labelSrcSel)
    .text(d => d.src_if ?? "");

  // LABELS near target end (show dst_if = text for direction source->target)
  labelTgtSel = labelTgtSel
    .data(links, keyForLink);
  labelTgtSel.exit().remove();
  const labelTgtEnter = labelTgtSel.enter().append("text")
    .attr("class", "label label-target")
    .text(d => d.dst_if ?? "");
  labelTgtSel = labelTgtEnter.merge(labelTgtSel)
    .text(d => d.dst_if ?? "");

  // NODES
  nodeSel = nodeSel
    .data(nodes, d => d.id);
  nodeSel.exit().remove();
  const nodeEnter = nodeSel.enter().append("g")
    .attr("class", "node")
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));

  nodeEnter.append("circle").attr("r", 10);
  nodeEnter.append("text")
    .attr("dy", -14)
    .attr("text-anchor", "middle")
    .text(d => d.id);

  nodeSel = nodeEnter.merge(nodeSel);
  nodeSel.select("text").text(d => d.id); // refresh labels if ids changed 

  // Restart sim for smooth re-layout
  simulation.alpha(0.5).restart();
}

function ticked() {
  linkSel.attr("d", d => `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`);

  // Place labels along the edge; tweak these factors to taste
  labelSrcSel
    .attr("x", d => d.source.x + (d.target.x - d.source.x) * 0.25)
    .attr("y", d => d.source.y + (d.target.y - d.source.y) * 0.25);

  labelTgtSel
    .attr("x", d => d.source.x + (d.target.x - d.source.x) * 0.75)
    .attr("y", d => d.source.y + (d.target.y - d.source.y) * 0.75);

  nodeSel.attr("transform", d => `translate(${d.x},${d.y})`);
}

// --- Drag handlers ---
function dragstarted(event, d) {
  if (!event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x; d.fy = d.y;
}
function dragged(event, d) {
  d.fx = event.x; d.fy = event.y;
}
function dragended(event, d) {
  if (!event.active) simulation.alphaTarget(0);
  d.fx = null; d.fy = null;
}

// --- API (exposes functions to modify graph data) ---
const graph = {

  // upsert = add or update
  upsertNode(id, props = {}) {
    const i = nodes.findIndex(n => n.id === id);
    if (i >= 0) nodes[i] = Object.assign(nodes[i], { id }, props);
    else nodes.push(Object.assign({ id }, props));
    update();
  },
  removeNode(id) {
    nodes = nodes.filter(n => n.id !== id);
    links = links.filter(l => {
      const s = (l.source && l.source.id) ? l.source.id : l.source;
      const t = (l.target && l.target.id) ? l.target.id : l.target;
      return s !== id && t !== id;
    });
    update();
  },
  upsertLink(sourceId, targetId, dst_if = "", src_if = "") {
    const idx = links.findIndex(l => {
      const s = (l.source && l.source.id) ? l.source.id : l.source;
      const t = (l.target && l.target.id) ? l.target.id : l.target;
      return s === sourceId && t === targetId;
    });
    if (idx >= 0) {
      links[idx].dst_if = dst_if;
      links[idx].src_if = src_if;
    } else {
      links.push({ source: sourceId, target: targetId, dst_if, src_if });
    }
    // Ensure nodes exist
    if (!nodes.find(n => n.id === sourceId)) nodes.push({ id: sourceId });
    if (!nodes.find(n => n.id === targetId)) nodes.push({ id: targetId });
    update();
  },
  setLinkLabels(sourceId, targetId, { dst_if, src_if }) {
    const l = links.find(l => {
      const s = (l.source && l.source.id) ? l.source.id : l.source;
      const t = (l.target && l.target.id) ? l.target.id : l.target;
      return s === sourceId && t === targetId;
    });
    if (l) { if (dst_if != null) l.dst_if = dst_if; if (src_if != null) l.src_if = src_if; update(); }
  },
  removeLink(sourceId, targetId) {
    links = links.filter(l => {
      const s = (l.source && l.source.id) ? l.source.id : l.source;
      const t = (l.target && l.target.id) ? l.target.id : l.target;
      return !(s === sourceId && t === targetId);
    });
    update();
  },
  setData(newNodes = [], newLinks = []) {
    nodes = newNodes.map(n => ({ ...n }));
    links = newLinks.map(l => ({ ...l }));
    update();
  },
  get data() { return { nodes, links }; }
};
window.graph = graph;

update();

// --- Demo buttons ---

document.getElementById("addNode").onclick = () => {
  let nodeId = nodes.length + 1;
  graph.upsertNode("192.168.1." + nodeId);
  graph.upsertLink("192.168.1." + nodeId, "192.168.1." + (nodeId - 1), "eth69", "eth420");
};

document.getElementById("removeNode").onclick = () => {
  let nodeId = nodes.length;
  graph.removeNode("192.168.1." + nodeId);
};


document.getElementById("reset").onclick = () => {
  nodes = [
    { id: "192.168.1.1" },
    { id: "192.168.1.2" },
  ];
  links = [
    { source: "192.168.1.1", target: "192.168.1.2", src_if: "eth69", dst_if: "eth420" }
  ];
  graph.setData(nodes, links);
};

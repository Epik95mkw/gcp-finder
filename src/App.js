import { useState } from 'react';
import './style.css';
import { testData } from "./testData";
import DesmosEmbed from "./DesmosEmbed";

const RED = '#c74440';
const BLUE = '#2d70b3';
const GREEN = '#388c46';
const PURPLE = '#6042a6';
const ORANGE = '#fa7e19';

const parseKMP = (buffer) => {
  let view = new DataView(buffer);
  const ckptPointer = view.getUint32(0x24) + 0x4C;
  const ckphPointer = view.getUint32(0x28) + 0x4C;
  const gobjPointer = view.getUint32(0x2C) + 0x4C;  // marks end of CKPH

  // parse CKPT
  view = new DataView(buffer, ckptPointer, ckphPointer - ckptPointer);
  let count = view.getUint16(0x04);
  let offset = ckptPointer + 0x08;
  let checkpoints = [];

  for (let i = 0; i < count; i++) {
    view = new DataView(buffer, offset, 0x14);
    checkpoints.push({
      id: i,
      x1: view.getFloat32(0x00),
      z1: view.getFloat32(0x04),
      x2: view.getFloat32(0x08),
      z2: view.getFloat32(0x0C),
      type: view.getUint8(0x11),
      prev: view.getUint8(0x12),
      next: view.getUint8(0x13),
    });
    offset += 0x14;
  }

  // parse CKPH
  view = new DataView(buffer, ckphPointer, gobjPointer - ckphPointer);
  count = view.getUint16(0x04);
  offset = ckphPointer + 0x08;
  let groups = [];

  for (let i = 0; i < count; i++) {
    view = new DataView(buffer, offset, 0x10);
    let prev = [];
    let next = [];
    for (let j = 0; j < 6; j++) {
      prev.push(view.getUint8(0x02 + j));
      next.push(view.getUint8(0x08 + j));
    }
    groups.push({
      id: i,
      start: view.getUint8(0x00),
      length: view.getUint8(0x01),
      prev,
      next,
    });
    offset += 0x10;
  }

  // pre-calculations
  let a_ = [];
  let b_ = [];
  let c_ = [];
  let d_ = [];
  let s1 = [];
  let s0 = [];
  let vneg = [];
  
  for (let cp of checkpoints) {
    let i = cp.id;
    a_.push(`a_{${i}}`);
    b_.push(`b_{${i}}`);
    c_.push(`c_{${i}}`);
    d_.push(`d_{${i}}`);
    s1.push(`\\frac{ (${a_[i]}-${c_[i]}) }{ ((${a_[i]}-${c_[i]})^{2}\\ + \\ (${d_[i]}-${b_[i]})^{2})^{0.5} }`);
    s0.push(`\\frac{ (${d_[i]}-${b_[i]}) }{ ((${a_[i]}-${c_[i]})^{2}\\ + \\ (${d_[i]}-${b_[i]})^{2})^{0.5} }`);
    vneg.push(`${s0[i]}(x-${c_[i]})+${s1[i]}(y-${d_[i]})`);
  }

  // create desmos equations
  let data = [];
  let currentGroup = 0;
  let drag = 'NONE';

  let fillquads = true;
  let splitpaths = false;

  for (let cp of checkpoints) {
    let i = cp.id
    let c = { 255: BLUE, 0: GREEN }[cp.type] || PURPLE;
    
    // calculate lists of backwards and forwards checkpoint links
    let prevs, nexts; 

    if (cp.prev === 255) {
      prevs = groups[currentGroup].prev
        .filter(index => index !== 255)
        .map(index => groups[index].start + groups[index].length - 1);
    } else {
      prevs = [cp.prev];
    }

    if (cp.next === 255) {
      nexts = groups[currentGroup++].next
        .filter(index => index !== 255)
        .map(index => groups[index].start);
    } else {
      nexts = [cp.next];
    }

    data.push(
      // points
      { latex: `${a_[i]}=${cp.x1 / 100}` },
      { latex: `${b_[i]}=${cp.z1 * -1 / 100}` },
      { latex: `${c_[i]}=${cp.x2 / 100}` },
      { latex: `${d_[i]}=${cp.z2 * -1 / 100}` },
      { latex: `(${a_[i]}, ${b_[i]})`, color: c },
      { latex: `(${c_[i]}, ${d_[i]})`, color: c },
      //midpoint with label
      { latex: `(0.5(${a_[i]}+${c_[i]}), 0.5(${b_[i]}+${d_[i]}))`, color: c, label: i, pointSize: 5, pointOpacity: 0.5, dragMode: drag },
      // checkpoint line
      { latex: `((1-t)${a_[i]}+t${c_[i]}, (1-t)${b_[i]}+t${d_[i]})`, color: c },
    );

    for (let nexti of nexts) {
      let vborder1 = `-(${b_[nexti]}-${b_[i]})(x-${a_[nexti]})+(${a_[nexti]}-${a_[i]})(y-${b_[nexti]})`;
      let vborder2 = `((${d_[nexti]}-${d_[i]})(x-${c_[i]})-(${c_[nexti]}-${c_[i]})(y-${d_[i]}))`;

      data.push(
        { latex: `B_{${i}t${nexti}}=(${vborder1}) * ${vborder2} + \\left|${vborder1}\\right| * -${vborder2}` },
        { latex: `F_{${i}t${nexti}}=\\frac{${vneg[i]}}{${vneg[i]} - (${s0[nexti]}(x-${a_[nexti]})+${s1[nexti]}(y-${b_[nexti]}))}` },
      );

      // quad shading
      if (fillquads)
        data.push({ latex: `B_{${i}t${nexti}} > 0 \\left\\{R_{${nexti}t${i}} > 0\\right\\} \\left\\{F_{${i}t${nexti}} > 0\\right\\}`, color: c });

      // beginning split path gcps
      if (splitpaths && nexts.length > 1) {
        let splits = nexts.filter(index => index !== nexti).map(index => `\\left\\{B_{${i}t${index}} > 0\\right\\}`);
        data.push({ latex: `B_{${nexti}t${nexti + 1}} > 0 ` + splits + `\\left\\{${vneg[i]} > 0\\right\\}`, color: ORANGE });
      }
    }

    for (let previ of prevs) {
      data.push({ latex: `R_{${i}t${previ}}=\\frac{${vneg[i]}}{${vneg[i]} - (${s0[previ]}(x-${a_[previ]})+${s1[previ]}(y-${b_[previ]}))}` });
      
      // ending split path gcps
      if (splitpaths && prevs.length > 1)
        data.push({ latex: `B_{${previ}t${i}} > 0 \\left\\{B_{${i}t${i + 1}} > 0\\right\\}\\left\\{${vneg[i]} < 0\\right\\}`, color: ORANGE });
    }

    // normal gcps
    for (let previ of prevs) {
      for (let nexti of nexts) {
        data.push({ latex: `B_{${previ}t${i}} > 0 \\left\\{B_{${i}t${nexti}} > 0\\right\\}\\left\\{R_{${i}t${previ}} < 0\\right\\} \\left\\{F_{${i}t${nexti}} < 0\\right\\}`, color: RED });
      }
    }
  }

  return data;
}

export default function App() {
  const [data, setData] = useState(null);

  const readFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = (ev) => setData(parseKMP(reader.result));
    reader.readAsArrayBuffer(file);
  }

  return (
    <div className="App">
      <div className="row">
        <h1>Ghost Checkpoint Viewer</h1>
      </div>
      <div className="row">
        <input id="upload" type="file" accept=".kmp" onChange={(ev) => readFile(ev.target.files[0])} />
      </div>
      <div className="row">
        <DesmosEmbed data={data}/>
      </div>
    </div>
  );
}

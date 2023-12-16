import { useState } from 'react';
import './style.css';
import { testData } from "./utils/testData";
import DesmosEmbed from "./components/DesmosEmbed";
import parseKMP from './utils/parseKMP';

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

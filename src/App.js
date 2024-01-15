import { useState } from 'react';
import './style.css';
import { testData } from "./utils/testData";
import DesmosEmbed from "./components/DesmosEmbed";
import kmpData from './utils/kmpData';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const readFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLoading(true);
    reader.onloadend = async (ev) => {
      const result = await kmpData.toDesmos(reader.result);
      setData(result.equations);
      setLoading(false);
      setError(result.error);
    }
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
        {error ? "Warning: Failed to calculate source checkpoints" : loading ? "Loading..." : <br/>}
      </div>
      <div className="row">
        <DesmosEmbed data={data} debug={false}/>
      </div>
    </div>
  );
}

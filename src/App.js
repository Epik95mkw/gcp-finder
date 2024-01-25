import { useState } from 'react';
import './style.css';
import DesmosEmbed from "./components/DesmosEmbed";
import kmpData from './utils/kmpData';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSplitPaths, setShowSplitPaths] = useState(false);
  const toggleSplitPaths = () => setShowSplitPaths(!showSplitPaths);

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
        <label>
          <input id="splitpaths" type="checkbox" checked={showSplitPaths} onChange={toggleSplitPaths} />
          Display Split Path GCPs
        </label>
      </div>
      <div className="row">
        {error ? "Warning: Failed to calculate source checkpoints" : loading ? "Loading..." : <br/>}
      </div>
      <div className="row">
        <DesmosEmbed data={data} debug={false} showSplitPaths={showSplitPaths}/>
      </div>
    </div>
  );
}

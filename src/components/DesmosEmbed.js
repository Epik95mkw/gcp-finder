import { useRef, useEffect } from "react";
import { Expression, GraphingCalculator } from "desmos-react";
import "../style.css"


export default function DesmosEmbed({ data }) {
  const calcRef = useRef(null);
  useEffect(() => {
    calcRef.current?.setMathBounds({ left: -200000, right: 200000, bottom: -100000, top: 100000 });
  }, []);

  const exprs = data?.map(
    (x, i) => <Expression {...x} id={i} key={i} />  // {window.Desmos.DragModes[x.dragMode]}
  );
  
  return (
    <GraphingCalculator
    ref={calcRef}
    attributes={{ className: 'calculator' }}
    expressions={false}
    showGrid={false}
    showXAxis={false}
    showYAxis={false}
    settingsMenu={true}
    >
      {exprs}
    </GraphingCalculator>
  );
}
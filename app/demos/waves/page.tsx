"use client";

import Demo from "@/src/demos/waves/demo";
import DemoTemplate from "@/src/components/demoTemplate";

const ResetButton = () => {
  return (
    <button
      onClick={() => {
        window.location.reload();
      }}
      className="bg-neutral-300 text-neutral-600 rounded absolute left-2 bottom-2 p-1"
    >
      Reset
    </button>
  );
};

export default function Flow() {
  return (
    <>
      <DemoTemplate demo={<Demo />}>
        <h1>Waves</h1>
        <p>Wave equation solver</p>
        <h3>Controls</h3>
        <p>Tap/click to create a pulse!</p>
      </DemoTemplate>
      <ResetButton />
    </>
  );
}

import React from "react";
import { MeshBackdrop } from "./MeshBackdrop";
import NowPlayingArt from "./NowPlayingArt";

export default function App() {
  return (
    <>
      {/* Foreground UI: album-art, zoom effects, etc. */}
      <NowPlayingArt />

      {/* 10× faster animation — adjust to taste (e.g. 5, 20, 50) */}
      <MeshBackdrop src={null} speed={10} />
    </>
  );
}

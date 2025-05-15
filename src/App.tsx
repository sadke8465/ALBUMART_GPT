import React from "react";
import { MeshBackdrop } from "./MeshBackdrop";
import NowPlayingArt from "./NowPlayingArt";

export default function App() {
  return (
    <>
      {/* Foreground UI: album-art, zoom effects, etc. */}
      <NowPlayingArt />

      {/* Background animated mesh gradient */}
      <MeshBackdrop />
    </>
  );
}

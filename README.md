#### Drop-in mesh gradient

```tsx
import { MeshBackdrop } from "@/components/MeshBackdrop";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      {/* Existing layout/UI */}
      <Component {...pageProps} />

      {/* One-liner mesh, zero side-effects */}
      <MeshBackdrop />
    </>
  );
}

import { useEffect, useRef, useState } from "react";

/** Decorative renderer; authentication never depends on WebGL or this chunk. */
export default function Emblem3D() {
  const host = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let dispose;
    const controller = new AbortController();
    import("./emblemScene.js")
      .then(({ createEmblemScene }) => createEmblemScene(host.current, {
        signal: controller.signal,
        onReady: () => { if (!cancelled) setReady(true); },
        onUnavailable: () => { if (!cancelled) setReady(false); },
      }))
      .then(cleanup => {
        if (cancelled) cleanup?.();
        else dispose = cleanup;
      })
      .catch(() => { /* The detailed still emblem stays visible if WebGL cannot load. */ });
    return () => {
      cancelled = true;
      controller.abort();
      dispose?.();
    };
  }, []);

  return (
    <div className={`gg-scene${ready ? " gg-scene-ready" : ""}`} aria-hidden="true">
      <div className="gg-halo" />
      <img className="gg-fallback" src="/gg-surface.webp" alt="" />
      <div className="gg-canvas" ref={host} />
      <div className="gg-reflection" />
    </div>
  );
}

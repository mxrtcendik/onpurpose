import type { ReactNode } from "react";

export function Figure({ code, children }: { code: string; children: ReactNode }) {
  return (
    <div className="figure">
      <div className="figure-demo">{children}</div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

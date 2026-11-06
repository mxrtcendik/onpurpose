export const usage = `import { HoldButton } from "onpurpose";

<HoldButton onConfirm={() => deleteProject()}>
  Hold to delete
</HoldButton>`;

export const install = "npm install onpurpose";

export const labelCode = `<HoldButton onConfirm={() => publish()}>
  {(state) => (state === "confirmed" ? "Published" : "Hold to publish")}
</HoldButton>`;

export const asyncCode = `<HoldButton onConfirm={() => archiveProject()}>
  {(state, { busy }) =>
    busy ? "Archiving…" : state === "confirmed" ? "Archived" : "Hold to archive"
  }
</HoldButton>`;

export const variablesCode = `.send {
  color: light-dark(#087443, #8dcfb0);
  --hold-fill: color-mix(in srgb, currentColor 28%, transparent);
  --hold-confirmed: light-dark(#087443, #8dcfb0);
}

<HoldButton className="send" onConfirm={() => send()}>
  Hold to send
</HoldButton>`;

export const tailwindCode = `<HoldButton
  className="rounded-full text-red-700 dark:text-red-300"
  onConfirm={() => revokeAccess()}>
  Hold to revoke
</HoldButton>`;

export const messagesCode = `<HoldButton
  messages={{
    hint: "Mantén pulsado para confirmar",
    confirmed: "Eliminado",
    again: "Actívalo otra vez para confirmar",
  }}
  onConfirm={() => deleteProject()}
>
  Mantén para eliminar
</HoldButton>`;

export const rowCode = `<div className="row" onClick={openProject}>
  <div>
    <p>Northwind</p>
    <p>12 files, shared with 4 people</p>
  </div>
  <HoldButton onConfirm={removeProject}>Remove Northwind</HoldButton>
</div>`;
